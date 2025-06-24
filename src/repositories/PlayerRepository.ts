import { GamePlayer, Player } from "@prisma/client";
import Database from "~/lib/Database";
import { PlayerWithCards } from "~/models/Player";

export interface IPlayerRepository {
    findByDiscordId(discordId: string): Promise<Player | null>;
    createOrUpdate(discordId: string, username: string): Promise<Player>;
    findWithCards(discordId: string, gameId?: string): Promise<PlayerWithCards | null>;
    joinGame(gameId: string, playerId: string): Promise<GamePlayer>;
    leaveGame(gameId: string, playerId: string): Promise<void>;
    findGamePlayers(gameId: string): Promise<(GamePlayer & { player: Player })[]>;
}

export class PlayerRepository implements IPlayerRepository {
    private prisma = Database.getInstance();

    async findByDiscordId(discordId: string): Promise<Player | null> {
        return await this.prisma.player.findUnique({
            where: { discordId },
        });
    }

    async createOrUpdate(discordId: string, username: string): Promise<Player> {
        return await this.prisma.player.upsert({
            where: { discordId },
            update: { username },
            create: { discordId, username },
        });
    }

    async findWithCards(discordId: string, gameId?: string): Promise<PlayerWithCards | null> {
        const whereClause: any = { discordId };
        
        return await this.prisma.player.findUnique({
            where: whereClause,
            include: {
                cards: gameId ? { where: { gameId } } : true,
            },
        });
    }

    async joinGame(gameId: string, playerId: string): Promise<GamePlayer> {
        return await this.prisma.gamePlayer.create({
            data: {
                gameId,
                playerId,
            },
        });
    }

    async leaveGame(gameId: string, playerId: string): Promise<void> {
        await this.prisma.gamePlayer.deleteMany({
            where: {
                gameId,
                playerId,
            },
        });
    }

    async findGamePlayers(gameId: string): Promise<(GamePlayer & { player: Player })[]> {
        return await this.prisma.gamePlayer.findMany({
            where: { gameId },
            include: { player: true },
        });
    }
} 