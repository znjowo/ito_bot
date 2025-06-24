import { Game, GameStatus, Topic } from "@prisma/client";
import { Logger } from "~/lib/Logger";
import TopicManager from "~/managers/TopicManager";
import { CreateGameOptions, GameModel } from "~/models/Game";
import { ICardRepository } from "~/repositories/CardRepository";
import { IGameRepository } from "~/repositories/GameRepository";
import { IPlayerRepository } from "~/repositories/PlayerRepository";

export interface GameMessageInfo {
    gameId: string;
    messageId: string;
    channelId: string;
}

export interface IGameService {
    createGame(options: CreateGameOptions): Promise<GameModel>;
    joinGame(gameId: string, discordId: string, username: string): Promise<void>;
    leaveGame(gameId: string, discordId: string): Promise<void>;
    startGame(gameId: string): Promise<GameModel>;
    endGame(gameId: string, status?: GameStatus): Promise<void>;
    deleteGame(gameId: string): Promise<void>;
    updateTopic(gameId: string, topicId: string): Promise<void>;
    getGameById(gameId: string): Promise<GameModel | null>;
    getActiveGameByChannel(channelId: string): Promise<Game | null>;
    saveGameMessage(gameId: string, messageId: string, channelId: string): Promise<void>;
    getGameMessage(gameId: string): Promise<GameMessageInfo | null>;
    removeGameMessage(gameId: string): Promise<void>;
}

export class GameService implements IGameService {
    private gameMessages = new Map<string, GameMessageInfo>();

    constructor(
        private gameRepository: IGameRepository,
        private playerRepository: IPlayerRepository,
        private cardRepository: ICardRepository
    ) {}

    async createGame(options: CreateGameOptions): Promise<GameModel> {
        try {
            const game = await this.gameRepository.create(options);
            const gameWithRelations = await this.gameRepository.findById(game.id);
            
            if (!gameWithRelations) {
                throw new Error("作成されたゲームの取得に失敗しました");
            }

            Logger.info(`ゲームを作成しました: ${game.id}`);
            return new GameModel(gameWithRelations);
        } catch (error) {
            Logger.error(`ゲーム作成エラー: ${error}`);
            throw error;
        }
    }

    async joinGame(gameId: string, discordId: string, username: string): Promise<void> {
        try {
            // プレイヤーを作成または更新
            const player = await this.playerRepository.createOrUpdate(discordId, username);
            
            // ゲームに参加済みかチェック
            const existingPlayer = await this.playerRepository.findGamePlayers(gameId);
            const isAlreadyJoined = existingPlayer.some(p => p.player.discordId === discordId);
            
            if (isAlreadyJoined) {
                throw new Error("既にゲームに参加しています");
            }

            // ゲームに参加
            await this.playerRepository.joinGame(gameId, player.id);
            
            Logger.info(`プレイヤーがゲームに参加しました: ${discordId} (${gameId})`);
        } catch (error) {
            Logger.error(`ゲーム参加エラー: ${error}`);
            throw error;
        }
    }

    async leaveGame(gameId: string, discordId: string): Promise<void> {
        try {
            const player = await this.playerRepository.findByDiscordId(discordId);
            if (!player) {
                throw new Error("プレイヤーが見つかりません");
            }

            await this.playerRepository.leaveGame(gameId, player.id);
            
            Logger.info(`プレイヤーがゲームから退出しました: ${discordId} (${gameId})`);
        } catch (error) {
            Logger.error(`ゲーム退出エラー: ${error}`);
            throw error;
        }
    }

    async startGame(gameId: string): Promise<GameModel> {
        try {
            const gameData = await this.gameRepository.findById(gameId);
            if (!gameData) {
                throw new Error("ゲームが見つかりません");
            }

            const game = new GameModel(gameData);

            if (!game.isWaiting()) {
                throw new Error("ゲームは既に開始されています");
            }

            if (!game.canStart()) {
                throw new Error("ゲーム開始条件を満たしていません");
            }

            // ランダムなお題を選択
            const topic = await this.getRandomTopic();
            if (!topic) {
                throw new Error("利用可能なお題が見つかりません");
            }

            // 古いカードを削除
            await this.cardRepository.deleteByGame(gameId);

            // ゲームを開始状態に更新
            await this.gameRepository.update(gameId, {
                status: GameStatus.PLAYING,
                startedAt: new Date(),
                topicId: topic.id,
                failureCount: 0,
                revealedCards: "[]",
            });

            // カードを配布
            await this.distributeCards(game);

            // 更新されたゲーム情報を取得
            const updatedGameData = await this.gameRepository.findById(gameId);
            if (!updatedGameData) {
                throw new Error("更新されたゲーム情報の取得に失敗しました");
            }

            Logger.info(`ゲームを開始しました: ${gameId}`);
            return new GameModel(updatedGameData);
        } catch (error) {
            Logger.error(`ゲーム開始エラー: ${error}`);
            throw error;
        }
    }

    async endGame(gameId: string, status: GameStatus = GameStatus.FINISHED): Promise<void> {
        try {
            // カードを削除
            await this.cardRepository.deleteByGame(gameId);

            // ゲームを終了状態に更新
            await this.gameRepository.update(gameId, {
                status,
                endedAt: new Date(),
            });

            // ゲームメッセージ情報を削除
            await this.removeGameMessage(gameId);

            Logger.info(`ゲームを終了しました: ${gameId} (${status})`);
        } catch (error) {
            Logger.error(`ゲーム終了エラー: ${error}`);
            throw error;
        }
    }

    async deleteGame(gameId: string): Promise<void> {
        try {
            await this.gameRepository.delete(gameId);
            await this.removeGameMessage(gameId);
            
            Logger.info(`ゲームが削除されました: ${gameId}`);
        } catch (error) {
            Logger.error(`ゲーム削除エラー: ${error}`);
            throw error;
        }
    }

    async updateTopic(gameId: string, topicId: string): Promise<void> {
        try {
            const beforeGame = await this.gameRepository.findById(gameId);
            if (!beforeGame) {
                throw new Error(`ゲームが見つかりません: ${gameId}`);
            }

            await this.gameRepository.updateTopic(gameId, topicId);
            
            const afterGame = await this.gameRepository.findById(gameId);
            
            Logger.info(
                `ゲームのお題を更新しました: ${gameId} - 変更前: ${beforeGame.topic?.title || "なし"} -> 変更後: ${afterGame?.topic?.title || "なし"}`
            );
        } catch (error) {
            Logger.error(`ゲームお題更新エラー: ${error}`);
            throw error;
        }
    }

    async getGameById(gameId: string): Promise<GameModel | null> {
        try {
            const gameData = await this.gameRepository.findById(gameId);
            if (!gameData) return null;
            
            return new GameModel(gameData);
        } catch (error) {
            Logger.error(`ゲーム取得エラー: ${error}`);
            throw error;
        }
    }

    async getActiveGameByChannel(channelId: string): Promise<Game | null> {
        try {
            return await this.gameRepository.findByChannel(channelId);
        } catch (error) {
            Logger.error(`アクティブゲーム取得エラー: ${error}`);
            throw error;
        }
    }

    async saveGameMessage(gameId: string, messageId: string, channelId: string): Promise<void> {
        this.gameMessages.set(gameId, { gameId, messageId, channelId });
    }

    async getGameMessage(gameId: string): Promise<GameMessageInfo | null> {
        return this.gameMessages.get(gameId) || null;
    }

    async removeGameMessage(gameId: string): Promise<void> {
        this.gameMessages.delete(gameId);
    }

    private async getRandomTopic(): Promise<Topic | null> {
        try {
            return await TopicManager.getRandomTopic();
        } catch (error) {
            Logger.error(`お題取得エラー: ${error}`);
            throw error;
        }
    }

    private async distributeCards(game: GameModel): Promise<void> {
        try {
            const totalCards = game.players.length * game.cardCount;

            if (!game.isCardDistributionPossible()) {
                const { totalCardsNeeded, availableNumbers } = game.getCardDistributionInfo();
                throw new Error(
                    `カード配布不可能: 必要カード数(${totalCardsNeeded}枚) > 利用可能数字(${availableNumbers}個, ${game.minNumber}-${game.maxNumber})`
                );
            }

            // ランダムな数字を生成
            const numbers = game.generateRandomNumbers(totalCards);

            // 各プレイヤーにカードを配布
            const cards: { gameId: string; playerId: string; number: number }[] = [];
            
            for (let i = 0; i < game.players.length; i++) {
                const player = game.players[i];
                
                for (let j = 0; j < game.cardCount; j++) {
                    const cardIndex = i * game.cardCount + j;
                    const cardNumber = numbers[cardIndex];
                    
                    cards.push({
                        gameId: game.id,
                        playerId: player.playerId,
                        number: cardNumber,
                    });
                }
            }

            await this.cardRepository.createMany(cards);

            Logger.info(`カードを配布しました: ${game.id} (${totalCards}枚)`);
        } catch (error) {
            Logger.error(`カード配布エラー: ${error}`);
            throw error;
        }
    }
} 