import { Card } from "@prisma/client";
import Database from "../lib/Database";
import { Logger } from "../lib/Logger";

interface CardWithPlayer extends Card {
    player: {
        discordId: string;
        username: string;
    };
}

export default class CardManager {
    private static prisma = Database.getInstance();

    /**
     * プレイヤーの手札を取得
     */
    public static async getPlayerCards(
        gameId: string,
        discordId: string
    ): Promise<Card[]> {
        try {
            const player = await this.prisma.player.findUnique({
                where: { discordId },
            });

            if (!player) {
                return [];
            }

            return await this.prisma.card.findMany({
                where: {
                    gameId,
                    playerId: player.id,
                    isEliminated: false,
                },
                orderBy: {
                    number: "asc",
                },
            });
        } catch (error) {
            Logger.error(`プレイヤー手札取得エラー: ${error}`);
            throw error;
        }
    }

    /**
     * カードを提示（最小値のカードを自動選択）
     */
    public static async playCard(
        gameId: string,
        discordId: string
    ): Promise<Card | null> {
        try {
            const player = await this.prisma.player.findUnique({
                where: { discordId },
            });

            if (!player) {
                throw new Error("プレイヤーが見つかりません");
            }

            // 最小値のカードを取得
            const card = await this.prisma.card.findFirst({
                where: {
                    gameId,
                    playerId: player.id,
                    isEliminated: false,
                    isRevealed: false,
                },
                orderBy: {
                    number: "asc",
                },
            });

            if (!card) {
                return null;
            }

            // カードを提示状態に更新
            const updatedCard = await this.prisma.card.update({
                where: { id: card.id },
                data: { isRevealed: true },
            });

            Logger.info(
                `カードを提示しました: ${discordId} -> ${card.number} (${gameId})`
            );
            return updatedCard;
        } catch (error) {
            Logger.error(`カード提示エラー: ${error}`);
            throw error;
        }
    }

    /**
     * カードの失敗処理（全体の失敗数カウントとカード削除）
     */
    public static async handleCardFailure(
        gameId: string,
        discordId: string,
        revealedNumber: number
    ): Promise<void> {
        try {
            const player = await this.prisma.player.findUnique({
                where: { discordId },
            });

            if (!player) {
                throw new Error("プレイヤーが見つかりません");
            }

            // ゲーム情報を取得
            const game = await this.prisma.game.findUnique({
                where: { id: gameId },
            });

            if (!game) {
                throw new Error("ゲームが見つかりません");
            }

            // 全体の失敗数を増加
            const newFailureCount = game.failureCount + 1;
            await this.prisma.game.update({
                where: { id: gameId },
                data: {
                    failureCount: newFailureCount,
                },
            });

            // 場に出ているカードを取得
            const revealedCards = await this.getRevealedCards(gameId);

            // 削除対象のカードを取得（場に出ているカードは除く）
            const cardsToEliminate = await this.prisma.card.findMany({
                where: {
                    gameId,
                    isEliminated: false,
                    AND: [
                        {
                            number: {
                                lte: revealedNumber,
                            },
                        },
                        {
                            number: {
                                notIn: revealedCards,
                            },
                        },
                    ],
                },
                select: { number: true },
            });

            // 削除対象のカードを削除状態に設定
            if (cardsToEliminate.length > 0) {
                await this.prisma.card.updateMany({
                    where: {
                        gameId,
                        isEliminated: false,
                        AND: [
                            {
                                number: {
                                    lte: revealedNumber,
                                },
                            },
                            {
                                number: {
                                    notIn: revealedCards,
                                },
                            },
                        ],
                    },
                    data: { isEliminated: true },
                });
            }

            // 削除されたカードを場に追加
            const eliminatedNumbers = cardsToEliminate.map(card => card.number);
            const newRevealedCards = [...revealedCards, ...eliminatedNumbers];
            newRevealedCards.sort((a, b) => a - b); // 数字順にソート

            // 場のカードを更新
            await this.prisma.game.update({
                where: { id: gameId },
                data: { revealedCards: JSON.stringify(newRevealedCards) },
            });

            Logger.info(
                `カード失敗処理: ${discordId} 失敗数: ${game.failureCount} -> ${newFailureCount} (${gameId}) - ${revealedNumber}以下の手札カードを削除し場に追加: [${eliminatedNumbers.join(", ")}]`
            );
        } catch (error) {
            Logger.error(`カード失敗処理エラー: ${error}`);
            throw error;
        }
    }

    /**
     * カードの成功処理（場にカードを追加）
     */
    public static async handleCardSuccess(
        gameId: string,
        cardNumber: number
    ): Promise<void> {
        try {
            // ゲーム情報を取得
            const game = await this.prisma.game.findUnique({
                where: { id: gameId },
            });

            if (!game) {
                throw new Error("ゲームが見つかりません");
            }

            // 成功したカードを削除状態に設定
            await this.prisma.card.updateMany({
                where: {
                    gameId,
                    number: cardNumber,
                    isEliminated: false,
                },
                data: { isEliminated: true },
            });

            // 場のカードを取得
            const revealedCards = JSON.parse(game.revealedCards || "[]");
            revealedCards.push(cardNumber);
            revealedCards.sort((a: number, b: number) => a - b); // 数字順にソート

            // 場のカードを更新
            await this.prisma.game.update({
                where: { id: gameId },
                data: { revealedCards: JSON.stringify(revealedCards) },
            });

            Logger.info(
                `カード成功処理: 場のカードに ${cardNumber} を追加し、カードを削除状態に設定 (${gameId})`
            );
        } catch (error) {
            Logger.error(`カード成功処理エラー: ${error}`);
            throw error;
        }
    }

    /**
     * 場に出ているカードを取得
     */
    public static async getRevealedCards(gameId: string): Promise<number[]> {
        try {
            const game = await this.prisma.game.findUnique({
                where: { id: gameId },
            });

            if (!game) {
                return [];
            }

            return JSON.parse(game.revealedCards || "[]");
        } catch (error) {
            Logger.error(`場のカード取得エラー: ${error}`);
            return [];
        }
    }

    /**
     * 場に出ているカードをプレイヤー情報付きで取得
     */
    public static async getRevealedCardsWithPlayers(
        gameId: string
    ): Promise<{ number: number; playerName: string }[]> {
        try {
            const revealedCards = await this.getRevealedCards(gameId);
            const cardsWithPlayers: { number: number; playerName: string }[] =
                [];

            for (const cardNumber of revealedCards) {
                // その数字のカードを持つプレイヤーを検索
                const card = await this.prisma.card.findFirst({
                    where: {
                        gameId,
                        number: cardNumber,
                    },
                    include: {
                        player: {
                            select: {
                                username: true,
                            },
                        },
                    },
                });

                if (card) {
                    cardsWithPlayers.push({
                        number: cardNumber,
                        playerName: card.player.username,
                    });
                }
            }

            return cardsWithPlayers;
        } catch (error) {
            Logger.error(`場のカード（プレイヤー付き）取得エラー: ${error}`);
            return [];
        }
    }

    /**
     * 提示されたカードが正解かチェック（場のカードの次に小さい数字のみ正解）
     */
    public static async isCorrectCard(
        gameId: string,
        cardNumber: number,
        discordId?: string
    ): Promise<boolean> {
        try {
            const revealedCards = await this.getRevealedCards(gameId);

            // 場にカードがない場合、最小値が正解
            if (revealedCards.length === 0) {
                return await this.isSmallestCard(gameId, cardNumber);
            }

            // 場のカードより大きい未提示カードの中で最小値を取得
            const allUnrevealed = await this.prisma.card.findMany({
                where: {
                    gameId,
                    isEliminated: false,
                },
                select: { number: true },
            });
            const maxRevealed = Math.max(...revealedCards);
            const candidates = allUnrevealed
                .map(c => c.number)
                .filter(num => num > maxRevealed);
            const nextExpected = Math.min(...candidates);

            // その数字しか正解にしない
            return cardNumber === nextExpected;
        } catch (error) {
            Logger.error(`正解カードチェックエラー: ${error}`);
            return false;
        }
    }

    /**
     * 指定された数字がゲーム内に存在するかチェック
     */
    private static async doesNumberExistInGame(
        gameId: string,
        number: number
    ): Promise<boolean> {
        try {
            const card = await this.prisma.card.findFirst({
                where: {
                    gameId,
                    number,
                    isEliminated: false,
                },
            });

            return card !== null;
        } catch (error) {
            Logger.error(`数字存在チェックエラー: ${error}`);
            return false;
        }
    }

    /**
     * 全カードの中で最小値かチェック
     */
    private static async isSmallestCard(
        gameId: string,
        cardNumber: number
    ): Promise<boolean> {
        try {
            const allCards = await this.prisma.card.findMany({
                where: {
                    gameId,
                    isEliminated: false,
                },
                select: { number: true },
            });

            if (allCards.length === 0) return true;

            const minNumber = Math.min(...allCards.map(card => card.number));
            return cardNumber === minNumber;
        } catch (error) {
            Logger.error(`最小値チェックエラー: ${error}`);
            return false;
        }
    }

    /**
     * ゲームの全カードを開示
     */
    public static async revealAllCards(
        gameId: string
    ): Promise<CardWithPlayer[]> {
        try {
            const cards = await this.prisma.card.findMany({
                where: { gameId },
                include: {
                    player: {
                        select: {
                            discordId: true,
                            username: true,
                        },
                    },
                },
                orderBy: [{ player: { username: "asc" } }, { number: "asc" }],
            });

            Logger.info(
                `全カードを開示しました: ${gameId} (${cards.length}枚)`
            );
            return cards;
        } catch (error) {
            Logger.error(`全カード開示エラー: ${error}`);
            throw error;
        }
    }

    /**
     * ゲームオーバーかチェック（全体の失敗数ベースまたはカードが全部なくなった場合）
     */
    public static async isGameOver(gameId: string): Promise<boolean> {
        try {
            const game = await this.prisma.game.findUnique({
                where: { id: gameId },
            });

            if (!game) {
                return true;
            }

            // 全体の失敗数がHPに達した場合
            if (game.failureCount >= game.hp) {
                Logger.info(
                    `ゲームオーバー: 失敗数上限到達 (${gameId}) - 失敗数:${game.failureCount}/${game.hp}`
                );
                return true;
            }

            // カードが全部なくなった場合
            const remainingCards = await this.prisma.card.count({
                where: {
                    gameId,
                    isEliminated: false,
                },
            });

            if (remainingCards === 0) {
                Logger.info(`ゲームオーバー: カード全部削除 (${gameId})`);
                return true;
            }

            return false;
        } catch (error) {
            Logger.error(`ゲームオーバーチェックエラー: ${error}`);
            return true;
        }
    }

    /**
     * プレイヤーがゲームオーバーかチェック（手札がない場合のみ）
     */
    public static async isPlayerGameOver(
        gameId: string,
        discordId: string
    ): Promise<boolean> {
        try {
            const player = await this.prisma.player.findUnique({
                where: { discordId },
            });

            if (!player) {
                return true;
            }

            // 手札がない場合のみゲームオーバー
            const remainingCards = await this.prisma.card.count({
                where: {
                    gameId,
                    playerId: player.id,
                    isEliminated: false,
                },
            });

            return remainingCards === 0;
        } catch (error) {
            Logger.error(`プレイヤーゲームオーバーチェックエラー: ${error}`);
            throw error;
        }
    }

    /**
     * ゲームクリアかチェック（全員が手札を出し切ったか）
     */
    public static async isGameClear(gameId: string): Promise<boolean> {
        try {
            const remainingCards = await this.prisma.card.count({
                where: {
                    gameId,
                    isEliminated: false,
                },
            });

            const totalCards = await this.prisma.card.count({
                where: { gameId },
            });

            const eliminatedCards = await this.prisma.card.count({
                where: {
                    gameId,
                    isEliminated: true,
                },
            });

            return remainingCards === 0;
        } catch (error) {
            Logger.error(`ゲームクリアチェックエラー: ${error}`);
            return false;
        }
    }

    /**
     * ゲームの残りカード数を取得
     */
    public static async getRemainingCardCount(gameId: string): Promise<number> {
        try {
            return await this.prisma.card.count({
                where: {
                    gameId,
                    isEliminated: false,
                },
            });
        } catch (error) {
            Logger.error(`残りカード数取得エラー: ${error}`);
            throw error;
        }
    }

    /**
     * プレイヤーの残りカード数を取得
     */
    public static async getPlayerRemainingCardCount(
        gameId: string,
        discordId: string
    ): Promise<number> {
        try {
            const player = await this.prisma.player.findUnique({
                where: { discordId },
            });

            if (!player) {
                return 0;
            }

            return await this.prisma.card.count({
                where: {
                    gameId,
                    playerId: player.id,
                    isEliminated: false,
                },
            });
        } catch (error) {
            Logger.error(`プレイヤー残りカード数取得エラー: ${error}`);
            throw error;
        }
    }
}
