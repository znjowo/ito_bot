import { Card } from "@prisma/client";
import { Logger } from "~/lib/Logger";
import { CardWithPlayer, ICardRepository } from "~/repositories/CardRepository";
import { IGameRepository } from "~/repositories/GameRepository";
import { IPlayerRepository } from "~/repositories/PlayerRepository";

export interface ICardService {
    getPlayerCards(gameId: string, discordId: string): Promise<Card[]>;
    playCard(gameId: string, discordId: string): Promise<Card | null>;
    handleCardSuccess(gameId: string, cardNumber: number): Promise<void>;
    handleCardFailure(
        gameId: string,
        discordId: string,
        revealedNumber: number
    ): Promise<void>;
    isCorrectCard(
        gameId: string,
        cardNumber: number,
        discordId?: string
    ): Promise<boolean>;
    getRevealedCards(gameId: string): Promise<number[]>;
    getRevealedCardsWithPlayers(
        gameId: string
    ): Promise<{ number: number; playerName: string }[]>;
    revealAllCards(gameId: string): Promise<CardWithPlayer[]>;
    isGameClear(gameId: string): Promise<boolean>;
    isGameOver(gameId: string): Promise<boolean>;
    getRemainingCardCount(gameId: string): Promise<number>;
    getPlayerRemainingCardCount(
        gameId: string,
        discordId: string
    ): Promise<number>;
}

export class CardService implements ICardService {
    constructor(
        private cardRepository: ICardRepository,
        private playerRepository: IPlayerRepository,
        private gameRepository: IGameRepository
    ) {}

    async getPlayerCards(gameId: string, discordId: string): Promise<Card[]> {
        try {
            const player =
                await this.playerRepository.findByDiscordId(discordId);
            if (!player) return [];

            return await this.cardRepository.findActiveByPlayer(
                gameId,
                player.id
            );
        } catch (error) {
            Logger.error(`プレイヤー手札取得エラー: ${error}`);
            throw error;
        }
    }

    async playCard(gameId: string, discordId: string): Promise<Card | null> {
        try {
            const player =
                await this.playerRepository.findByDiscordId(discordId);
            if (!player) {
                throw new Error("プレイヤーが見つかりません");
            }

            // 最小値のカードを取得
            const card = await this.cardRepository.findSmallestUnrevealed(
                gameId,
                player.id
            );
            if (!card) return null;

            // カードを提示状態に更新
            const updatedCard = await this.cardRepository.reveal(card.id);

            Logger.info(
                `カードを提示しました: ${discordId} -> ${card.number} (${gameId})`
            );
            return updatedCard;
        } catch (error) {
            Logger.error(`カード提示エラー: ${error}`);
            throw error;
        }
    }

    async handleCardSuccess(gameId: string, cardNumber: number): Promise<void> {
        try {
            const revealedCards = await this.getRevealedCards(gameId);
            const newRevealedCards = [...revealedCards, cardNumber];
            newRevealedCards.sort((a, b) => a - b);

            await this.gameRepository.updateRevealedCards(
                gameId,
                newRevealedCards
            );

            Logger.info(
                `カード成功処理: ${gameId} - カード${cardNumber}を場に追加`
            );
        } catch (error) {
            Logger.error(`カード成功処理エラー: ${error}`);
            throw error;
        }
    }

    async handleCardFailure(
        gameId: string,
        discordId: string,
        revealedNumber: number
    ): Promise<void> {
        try {
            // 全体の失敗数を増加
            await this.gameRepository.incrementFailureCount(gameId);

            // 場に出ているカードを取得
            const revealedCards = await this.getRevealedCards(gameId);

            // 削除対象のカードを特定（revealedNumber以下で場に出ていないカード）
            const numbersToEliminate = Array.from(
                { length: revealedNumber },
                (_, i) => i + 1
            ).filter(num => num <= revealedNumber);

            // 削除対象のカードを削除状態に設定
            const eliminatedCards =
                await this.cardRepository.eliminateByNumbers(
                    gameId,
                    numbersToEliminate,
                    revealedCards
                );

            // 削除されたカードを場に追加
            const eliminatedNumbers = eliminatedCards.map(card => card.number);
            const newRevealedCards = [...revealedCards, ...eliminatedNumbers];
            newRevealedCards.sort((a, b) => a - b);

            await this.gameRepository.updateRevealedCards(
                gameId,
                newRevealedCards
            );

            Logger.info(
                `カード失敗処理: ${discordId} (${gameId}) - ${revealedNumber}以下の手札カードを削除し場に追加: [${eliminatedNumbers.join(", ")}]`
            );
        } catch (error) {
            Logger.error(`カード失敗処理エラー: ${error}`);
            throw error;
        }
    }

    async isCorrectCard(
        gameId: string,
        cardNumber: number,
        discordId?: string
    ): Promise<boolean> {
        try {
            // ゲーム内にその数字のカードが存在するかチェック
            const gameCards = await this.cardRepository.findByGame(gameId);
            const cardExists = gameCards.some(
                card => card.number === cardNumber
            );

            if (!cardExists) return false;

            // プレイヤーが指定されている場合、そのプレイヤーが持っているかチェック
            if (discordId) {
                const player =
                    await this.playerRepository.findByDiscordId(discordId);
                if (!player) return false;

                const playerCards =
                    await this.cardRepository.findActiveByPlayer(
                        gameId,
                        player.id
                    );
                const hasCard = playerCards.some(
                    card => card.number === cardNumber
                );
                if (!hasCard) return false;
            }

            // そのカードが最小値かチェック（提示中のカードを除外して判定）
            return await this.isSmallestCard(gameId, cardNumber);
        } catch (error) {
            Logger.error(`カード正解チェックエラー: ${error}`);
            return false;
        }
    }

    async getRevealedCards(gameId: string): Promise<number[]> {
        try {
            const game = await this.gameRepository.findById(gameId);
            if (!game) return [];

            try {
                return JSON.parse(game.revealedCards);
            } catch {
                return [];
            }
        } catch (error) {
            Logger.error(`場のカード取得エラー: ${error}`);
            return [];
        }
    }

    async getRevealedCardsWithPlayers(
        gameId: string
    ): Promise<{ number: number; playerName: string }[]> {
        try {
            const revealedCards = await this.getRevealedCards(gameId);
            const cardsWithPlayers: { number: number; playerName: string }[] =
                [];

            for (const cardNumber of revealedCards) {
                const allCards = await this.cardRepository.findByGame(gameId);
                const card = allCards.find(c => c.number === cardNumber);

                if (card) {
                    const cardWithPlayer =
                        await this.cardRepository.findAllWithPlayers(gameId);
                    const cardInfo = cardWithPlayer.find(c => c.id === card.id);

                    if (cardInfo) {
                        cardsWithPlayers.push({
                            number: cardNumber,
                            playerName: cardInfo.player.username,
                        });
                    }
                }
            }

            return cardsWithPlayers;
        } catch (error) {
            Logger.error(`場のカード（プレイヤー付き）取得エラー: ${error}`);
            return [];
        }
    }

    async revealAllCards(gameId: string): Promise<CardWithPlayer[]> {
        try {
            const cards = await this.cardRepository.findAllWithPlayers(gameId);
            Logger.info(
                `全カードを開示しました: ${gameId} (${cards.length}枚)`
            );
            return cards;
        } catch (error) {
            Logger.error(`全カード開示エラー: ${error}`);
            throw error;
        }
    }

    async isGameClear(gameId: string): Promise<boolean> {
        try {
            const remainingCount =
                await this.cardRepository.countRemaining(gameId);
            return remainingCount === 0;
        } catch (error) {
            Logger.error(`ゲームクリアチェックエラー: ${error}`);
            return false;
        }
    }

    async isGameOver(gameId: string): Promise<boolean> {
        try {
            const game = await this.gameRepository.findById(gameId);
            if (!game) return true;

            // 失敗数が上限に達した場合のみゲームオーバー
            if (game.failureCount >= game.hp) {
                Logger.info(
                    `ゲームオーバー: 失敗数上限到達 (${gameId}) - 失敗数:${game.failureCount}/${game.hp}`
                );
                return true;
            }

            return false;
        } catch (error) {
            Logger.error(`ゲームオーバーチェックエラー: ${error}`);
            return true;
        }
    }

    async getRemainingCardCount(gameId: string): Promise<number> {
        try {
            return await this.cardRepository.countRemaining(gameId);
        } catch (error) {
            Logger.error(`残りカード数取得エラー: ${error}`);
            return 0;
        }
    }

    async getPlayerRemainingCardCount(
        gameId: string,
        discordId: string
    ): Promise<number> {
        try {
            const player =
                await this.playerRepository.findByDiscordId(discordId);
            if (!player) return 0;

            return await this.cardRepository.countRemainingByPlayer(
                gameId,
                player.id
            );
        } catch (error) {
            Logger.error(`プレイヤー残りカード数取得エラー: ${error}`);
            return 0;
        }
    }

    private async isSmallestCard(
        gameId: string,
        cardNumber: number
    ): Promise<boolean> {
        try {
            const allCards = await this.cardRepository.findByGame(gameId);
            // 手札にあるカード：削除されておらず、場に出ていないカード
            // ただし、現在提示中のカードは含める（まだ場に出る前の判定のため）
            const handCards = allCards.filter(
                card =>
                    !card.isEliminated &&
                    (!card.isRevealed || card.number === cardNumber)
            );

            if (handCards.length === 0) return false;

            const smallestNumber = Math.min(
                ...handCards.map(card => card.number)
            );
            return cardNumber === smallestNumber;
        } catch (error) {
            Logger.error(`最小カードチェックエラー: ${error}`);
            return false;
        }
    }
}
