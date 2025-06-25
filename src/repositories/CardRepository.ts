import { Card } from "@prisma/client";
import Database from "~/lib/Database";

export interface CardWithPlayer extends Card {
    player: {
        discordId: string;
        username: string;
    };
}

export interface ICardRepository {
    create(gameId: string, playerId: string, number: number): Promise<Card>;
    createMany(
        cards: { gameId: string; playerId: string; number: number }[]
    ): Promise<void>;
    findByGame(gameId: string): Promise<Card[]>;
    findByPlayer(gameId: string, playerId: string): Promise<Card[]>;
    findActiveByPlayer(gameId: string, playerId: string): Promise<Card[]>;
    findSmallestUnrevealed(
        gameId: string,
        playerId: string
    ): Promise<Card | null>;
    reveal(id: string): Promise<Card>;
    eliminate(id: string): Promise<Card>;
    eliminateByNumbers(
        gameId: string,
        numbers: number[],
        excludeNumbers: number[]
    ): Promise<Card[]>;
    findAllWithPlayers(gameId: string): Promise<CardWithPlayer[]>;
    countRemaining(gameId: string): Promise<number>;
    countRemainingByPlayer(gameId: string, playerId: string): Promise<number>;
    deleteByGame(gameId: string): Promise<void>;
}

export class CardRepository implements ICardRepository {
    private prisma = Database.getInstance();

    async create(
        gameId: string,
        playerId: string,
        number: number
    ): Promise<Card> {
        return await this.prisma.card.create({
            data: {
                gameId,
                playerId,
                number,
            },
        });
    }

    async createMany(
        cards: { gameId: string; playerId: string; number: number }[]
    ): Promise<void> {
        await this.prisma.card.createMany({
            data: cards,
        });
    }

    async findByGame(gameId: string): Promise<Card[]> {
        return await this.prisma.card.findMany({
            where: { gameId },
            orderBy: { number: "asc" },
        });
    }

    async findByPlayer(gameId: string, playerId: string): Promise<Card[]> {
        return await this.prisma.card.findMany({
            where: {
                gameId,
                playerId,
            },
            orderBy: { number: "asc" },
        });
    }

    async findActiveByPlayer(
        gameId: string,
        playerId: string
    ): Promise<Card[]> {
        return await this.prisma.card.findMany({
            where: {
                gameId,
                playerId,
                isEliminated: false,
            },
            orderBy: { number: "asc" },
        });
    }

    async findSmallestUnrevealed(
        gameId: string,
        playerId: string
    ): Promise<Card | null> {
        return await this.prisma.card.findFirst({
            where: {
                gameId,
                playerId,
                isEliminated: false,
                isRevealed: false,
            },
            orderBy: { number: "asc" },
        });
    }

    async reveal(id: string): Promise<Card> {
        return await this.prisma.card.update({
            where: { id },
            data: { isRevealed: true },
        });
    }

    async eliminate(id: string): Promise<Card> {
        return await this.prisma.card.update({
            where: { id },
            data: { isEliminated: true },
        });
    }

    async eliminateByNumbers(
        gameId: string,
        numbers: number[],
        excludeNumbers: number[]
    ): Promise<Card[]> {
        const cardsToEliminate = await this.prisma.card.findMany({
            where: {
                gameId,
                isEliminated: false,
                number: {
                    in: numbers,
                    notIn: excludeNumbers,
                },
            },
        });

        if (cardsToEliminate.length > 0) {
            await this.prisma.card.updateMany({
                where: {
                    id: {
                        in: cardsToEliminate.map(card => card.id),
                    },
                },
                data: { isEliminated: true },
            });
        }

        return cardsToEliminate;
    }

    async findAllWithPlayers(gameId: string): Promise<CardWithPlayer[]> {
        return await this.prisma.card.findMany({
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
    }

    async countRemaining(gameId: string): Promise<number> {
        return await this.prisma.card.count({
            where: {
                gameId,
                isEliminated: false,
                isRevealed: false,
            },
        });
    }

    async countRemainingByPlayer(
        gameId: string,
        playerId: string
    ): Promise<number> {
        return await this.prisma.card.count({
            where: {
                gameId,
                playerId,
                isEliminated: false,
                isRevealed: false,
            },
        });
    }

    async deleteByGame(gameId: string): Promise<void> {
        await this.prisma.card.deleteMany({
            where: { gameId },
        });
    }
}
