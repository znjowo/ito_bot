import { Game, GameStatus, Prisma } from "@prisma/client";
import Database from "~/lib/Database";
import { GameWithRelations, CreateGameOptions } from "~/models/Game";

export interface IGameRepository {
    create(options: CreateGameOptions): Promise<Game>;
    findById(id: string): Promise<GameWithRelations | null>;
    findByChannel(channelId: string, statuses?: GameStatus[]): Promise<Game | null>;
    update(id: string, data: Partial<Game>): Promise<Game>;
    delete(id: string): Promise<void>;
    updateTopic(id: string, topicId: string): Promise<Game>;
    incrementFailureCount(id: string): Promise<Game>;
    updateRevealedCards(id: string, cards: number[]): Promise<Game>;
}

export class GameRepository implements IGameRepository {
    private prisma = Database.getInstance();

    async create(options: CreateGameOptions): Promise<Game> {
        const {
            channelId,
            guildId,
            createdBy,
            minNumber = 1,
            maxNumber = 100,
            cardCount = 1,
            hp = 5,
        } = options;

        return await this.prisma.game.create({
            data: {
                channelId,
                guildId,
                createdBy,
                minNumber,
                maxNumber,
                cardCount,
                hp,
                status: GameStatus.WAITING,
                failureCount: 0,
                revealedCards: "[]",
            },
        });
    }

    async findById(id: string): Promise<GameWithRelations | null> {
        return await this.prisma.game.findUnique({
            where: { id },
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
    }

    async findByChannel(
        channelId: string, 
        statuses: GameStatus[] = [GameStatus.WAITING, GameStatus.PLAYING]
    ): Promise<Game | null> {
        return await this.prisma.game.findFirst({
            where: {
                channelId,
                status: {
                    in: statuses,
                },
            },
        });
    }

    async update(id: string, data: Partial<Game>): Promise<Game> {
        return await this.prisma.game.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<void> {
        // カードを削除
        await this.prisma.card.deleteMany({
            where: { gameId: id },
        });

        // ゲームプレイヤーを削除
        await this.prisma.gamePlayer.deleteMany({
            where: { gameId: id },
        });

        // ゲーム自体を削除
        await this.prisma.game.delete({
            where: { id },
        });
    }

    async updateTopic(id: string, topicId: string): Promise<Game> {
        return await this.prisma.game.update({
            where: { id },
            data: { topicId },
        });
    }

    async incrementFailureCount(id: string): Promise<Game> {
        return await this.prisma.game.update({
            where: { id },
            data: {
                failureCount: {
                    increment: 1,
                },
            },
        });
    }

    async updateRevealedCards(id: string, cards: number[]): Promise<Game> {
        return await this.prisma.game.update({
            where: { id },
            data: {
                revealedCards: JSON.stringify(cards),
            },
        });
    }
} 