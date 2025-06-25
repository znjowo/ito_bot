import {
    Card,
    Game,
    GamePlayer,
    GameStatus,
    Player,
    Topic,
} from "@prisma/client";
import Database from "../lib/Database";
import { Logger } from "../lib/Logger";

interface CreateGameOptions {
    channelId: string;
    guildId: string;
    createdBy: string;
    minNumber?: number;
    maxNumber?: number;
    cardCount?: number;
    hp?: number;
}

interface GameWithRelations extends Game {
    topic: Topic | null;
    players: (GamePlayer & { player: Player })[];
    cards: Card[];
}

interface GameMessageInfo {
    gameId: string;
    messageId: string;
    channelId: string;
}

export default class GameManager {
    private static prisma = Database.getInstance();
    private static gameMessages = new Map<string, GameMessageInfo>();

    /**
     * ゲームメッセージ情報を保存
     */
    public static async saveGameMessage(
        gameId: string,
        messageId: string,
        channelId: string
    ): Promise<void> {
        this.gameMessages.set(gameId, { gameId, messageId, channelId });
    }

    /**
     * ゲームメッセージ情報を取得
     */
    public static async getGameMessage(
        gameId: string
    ): Promise<GameMessageInfo | null> {
        return this.gameMessages.get(gameId) || null;
    }

    /**
     * ゲームメッセージ情報を削除
     */
    public static async removeGameMessage(gameId: string): Promise<void> {
        this.gameMessages.delete(gameId);
    }

    /**
     * 新しいゲームを作成
     */
    public static async createGame(options: CreateGameOptions): Promise<Game> {
        try {
            const game = await this.prisma.game.create({
                data: {
                    channelId: options.channelId,
                    guildId: options.guildId,
                    createdBy: options.createdBy,
                    minNumber: options.minNumber ?? 1,
                    maxNumber: options.maxNumber ?? 100,
                    cardCount: options.cardCount ?? 1,
                    hp: options.hp ?? 5,
                    status: GameStatus.WAITING,
                },
            });

            Logger.info(`ゲームを作成しました: ${game.id}`);
            return game;
        } catch (error) {
            Logger.error(`ゲーム作成エラー: ${error}`);
            throw error;
        }
    }

    /**
     * ゲームに参加者を追加
     */
    public static async joinGame(
        gameId: string,
        discordId: string,
        username: string
    ): Promise<GamePlayer> {
        try {
            // プレイヤーを取得または作成
            let player = await this.prisma.player.findUnique({
                where: { discordId },
            });

            if (!player) {
                player = await this.prisma.player.create({
                    data: { discordId, username },
                });
            }

            // ゲームに参加
            const gamePlayer = await this.prisma.gamePlayer.create({
                data: {
                    gameId,
                    playerId: player.id,
                },
                include: {
                    player: true,
                },
            });

            Logger.info(
                `プレイヤーがゲームに参加しました: ${username} (${gameId})`
            );
            return gamePlayer;
        } catch (error) {
            Logger.error(`ゲーム参加エラー: ${error}`);
            throw error;
        }
    }

    /**
     * ゲームから退出
     */
    public static async leaveGame(
        gameId: string,
        userId: string
    ): Promise<void> {
        try {
            // 参加しているかチェック
            const existingPlayer = await this.prisma.gamePlayer.findFirst({
                where: {
                    gameId: gameId,
                    player: {
                        discordId: userId,
                    },
                },
            });

            if (!existingPlayer) {
                throw new Error("このゲームに参加していません");
            }

            // GamePlayerレコードを削除
            await this.prisma.gamePlayer.delete({
                where: {
                    id: existingPlayer.id,
                },
            });

            Logger.info(
                `プレイヤーがゲームから退出しました: ${userId} from ${gameId}`
            );
        } catch (error) {
            Logger.error(`ゲーム退出エラー: ${error}`);
            throw error;
        }
    }

    /**
     * ゲームを開始
     */
    public static async startGame(gameId: string): Promise<GameWithRelations> {
        try {
            // ゲーム情報を取得
            const game = await this.getGameWithRelations(gameId);
            if (!game) {
                throw new Error("ゲームが見つかりません");
            }

            if (game.status !== GameStatus.WAITING) {
                throw new Error("ゲームは既に開始されています");
            }

            // 参加者数をチェック
            if (game.players.length < 2) {
                throw new Error("参加者が不足しています（最低2人必要）");
            }

            // ランダムなお題を選択
            const topic = await this.getRandomTopic();
            if (!topic) {
                throw new Error("利用可能なお題が見つかりません");
            }

            // 古いカードを削除（新しいゲームの準備）
            await this.prisma.card.deleteMany({
                where: { gameId },
            });

            // ゲームを開始状態に更新
            const updatedGame = await this.prisma.game.update({
                where: { id: gameId },
                data: {
                    status: GameStatus.PLAYING,
                    startedAt: new Date(),
                    topicId: topic.id,
                    failureCount: 0, // 失敗数をリセット
                    revealedCards: "[]", // 場のカードをリセット
                },
            });

            // カードを配布
            await this.distributeCards(gameId);

            Logger.info(`ゲームを開始しました: ${gameId}`);
            return (await this.getGameWithRelations(
                gameId
            )) as GameWithRelations;
        } catch (error) {
            Logger.error(`ゲーム開始エラー: ${error}`);
            throw error;
        }
    }

    /**
     * カードを配布
     */
    private static async distributeCards(gameId: string): Promise<void> {
        try {
            const game = await this.prisma.game.findUnique({
                where: { id: gameId },
                include: { players: true },
            });

            if (!game) {
                throw new Error("ゲームが見つかりません");
            }

            const { minNumber, maxNumber, cardCount } = game;
            const playerCount = game.players.length;
            const totalCards = playerCount * cardCount;

            Logger.info(
                `カード配布開始: ${gameId} - プレイヤー:${playerCount}人, カード:${cardCount}枚/人`
            );

            // 利用可能な数字の範囲をチェック
            if (maxNumber - minNumber + 1 < totalCards) {
                const availableNumbers = maxNumber - minNumber + 1;
                throw new Error(
                    `カード配布不可能: 必要カード数(${totalCards}枚) > 利用可能数字(${availableNumbers}個, ${minNumber}-${maxNumber})`
                );
            }

            // ランダムな数字を生成（重複なし）
            const numbers = this.generateRandomNumbers(
                minNumber,
                maxNumber,
                totalCards
            );

            // 各プレイヤーにカードを配布
            for (let i = 0; i < playerCount; i++) {
                const player = game.players[i];
                const playerCards: number[] = [];

                for (let j = 0; j < cardCount; j++) {
                    const cardIndex = i * cardCount + j;
                    const cardNumber = numbers[cardIndex];
                    playerCards.push(cardNumber);

                    await this.prisma.card.create({
                        data: {
                            gameId,
                            playerId: player.playerId,
                            number: cardNumber,
                        },
                    });
                }
            }

            Logger.info(`カードを配布しました: ${gameId} (${totalCards}枚)`);
        } catch (error) {
            Logger.error(`カード配布エラー: ${error}`);
            throw error;
        }
    }

    /**
     * ランダムな数字を生成（重複なし）
     */
    private static generateRandomNumbers(
        min: number,
        max: number,
        count: number
    ): number[] {
        const numbers: number[] = [];
        const availableNumbers = Array.from(
            { length: max - min + 1 },
            (_, i) => min + i
        );

        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(
                Math.random() * availableNumbers.length
            );
            const selectedNumber = availableNumbers[randomIndex];
            numbers.push(selectedNumber);
            availableNumbers.splice(randomIndex, 1);
        }

        return numbers;
    }

    /**
     * ランダムなお題を取得
     */
    private static async getRandomTopic(): Promise<Topic | null> {
        try {
            const topics = await this.prisma.topic.findMany({
                where: { isActive: true },
            });

            if (topics.length === 0) {
                return null;
            }

            const randomIndex = Math.floor(Math.random() * topics.length);
            return topics[randomIndex];
        } catch (error) {
            Logger.error(`お題取得エラー: ${error}`);
            throw error;
        }
    }

    /**
     * ゲーム情報を取得（リレーション込み）
     */
    public static async getGameWithRelations(
        gameId: string
    ): Promise<GameWithRelations | null> {
        try {
            return await this.prisma.game.findUnique({
                where: { id: gameId },
                include: {
                    topic: true,
                    players: {
                        include: {
                            player: true,
                        },
                    },
                    cards: true,
                },
            });
        } catch (error) {
            Logger.error(`ゲーム取得エラー: ${error}`);
            throw error;
        }
    }

    /**
     * チャンネルのアクティブなゲームを取得
     */
    public static async getActiveGameByChannel(
        channelId: string
    ): Promise<Game | null> {
        try {
            return await this.prisma.game.findFirst({
                where: {
                    channelId,
                    status: {
                        in: [GameStatus.WAITING, GameStatus.PLAYING],
                    },
                },
            });
        } catch (error) {
            Logger.error(`アクティブゲーム取得エラー: ${error}`);
            throw error;
        }
    }

    /**
     * ゲームを終了
     */
    public static async endGame(
        gameId: string,
        status: GameStatus = GameStatus.FINISHED
    ): Promise<void> {
        try {
            // ゲームに関連するカードを削除
            await this.prisma.card.deleteMany({
                where: { gameId },
            });

            // ゲームを終了状態に更新
            await this.prisma.game.update({
                where: { id: gameId },
                data: {
                    status,
                    endedAt: new Date(),
                },
            });

            // ゲームメッセージ情報を削除
            await this.removeGameMessage(gameId);

            Logger.info(
                `ゲームを終了しました: ${gameId} (${status}) - カードも削除`
            );
        } catch (error) {
            Logger.error(`ゲーム終了エラー: ${error}`);
            throw error;
        }
    }

    /**
     * ゲームのお題を更新
     */
    public static async updateGameTopic(
        gameId: string,
        topicId: string
    ): Promise<void> {
        try {
            // 更新前のゲーム情報を取得
            const beforeGame = await this.prisma.game.findUnique({
                where: { id: gameId },
                include: { topic: true },
            });

            if (!beforeGame) {
                throw new Error(`ゲームが見つかりません: ${gameId}`);
            }

            // 新しいお題の存在確認
            const newTopic = await this.prisma.topic.findUnique({
                where: { id: topicId },
            });

            if (!newTopic) {
                throw new Error(`お題が見つかりません: ${topicId}`);
            }

            // ゲームのお題を更新
            const updatedGame = await this.prisma.game.update({
                where: { id: gameId },
                data: { topicId },
                include: { topic: true },
            });

            Logger.info(
                `ゲームのお題を更新しました: ${gameId} - 変更前: ${beforeGame.topic?.title || "なし"} -> 変更後: ${updatedGame.topic?.title || "なし"}`
            );
        } catch (error) {
            Logger.error(`ゲームお題更新エラー: ${error}`);
            throw error;
        }
    }

    /**
     * ゲームを削除
     */
    public static async deleteGame(gameId: string): Promise<void> {
        try {
            // ゲームに関連するすべてのデータを削除
            // 1. カードを削除
            await this.prisma.card.deleteMany({
                where: { gameId: gameId },
            });

            // 2. ゲームプレイヤーを削除
            await this.prisma.gamePlayer.deleteMany({
                where: { gameId: gameId },
            });

            // 3. ゲーム自体を削除
            await this.prisma.game.delete({
                where: { id: gameId },
            });

            Logger.info(`ゲームが削除されました: ${gameId}`);
        } catch (error) {
            Logger.error(`ゲーム削除エラー: ${error}`);
            throw error;
        }
    }
}
