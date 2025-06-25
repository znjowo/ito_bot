import {
    Card,
    GamePlayer,
    GameStatus,
    Player,
    Game as PrismaGame,
    Topic,
} from "@prisma/client";

export interface GameWithRelations extends PrismaGame {
    topic: Topic | null;
    players: (GamePlayer & { player: Player })[];
    cards: Card[];
}

export interface CreateGameOptions {
    channelId: string;
    guildId: string;
    createdBy: string;
    minNumber?: number;
    maxNumber?: number;
    cardCount?: number;
    hp?: number;
}

export class GameModel {
    private data: GameWithRelations;

    constructor(data: GameWithRelations) {
        this.data = data;
    }

    // ゲッター
    get id(): string {
        return this.data.id;
    }

    get channelId(): string {
        return this.data.channelId;
    }

    get guildId(): string {
        return this.data.guildId;
    }

    get createdBy(): string {
        return this.data.createdBy;
    }

    get status(): GameStatus {
        return this.data.status;
    }

    get minNumber(): number {
        return this.data.minNumber;
    }

    get maxNumber(): number {
        return this.data.maxNumber;
    }

    get cardCount(): number {
        return this.data.cardCount;
    }

    get hp(): number {
        return this.data.hp;
    }

    get failureCount(): number {
        return this.data.failureCount;
    }

    get players(): (GamePlayer & { player: Player })[] {
        return this.data.players;
    }

    get cards(): Card[] {
        return this.data.cards;
    }

    get topic(): Topic | null {
        return this.data.topic;
    }

    get revealedCards(): number[] {
        try {
            return JSON.parse(this.data.revealedCards);
        } catch {
            return [];
        }
    }

    // ビジネスロジック
    public canStart(): boolean {
        return this.players.length >= 2 && this.isCardDistributionPossible();
    }

    public isCardDistributionPossible(): boolean {
        const totalCardsNeeded = this.players.length * this.cardCount;
        const availableNumbers = this.maxNumber - this.minNumber + 1;
        return availableNumbers >= totalCardsNeeded;
    }

    public getCardDistributionInfo(): {
        totalCardsNeeded: number;
        availableNumbers: number;
        isPossible: boolean;
    } {
        const totalCardsNeeded = this.players.length * this.cardCount;
        const availableNumbers = this.maxNumber - this.minNumber + 1;
        return {
            totalCardsNeeded,
            availableNumbers,
            isPossible: availableNumbers >= totalCardsNeeded,
        };
    }

    public isPlayerJoined(discordId: string): boolean {
        return this.players.some(
            player => player.player.discordId === discordId
        );
    }

    public isCreator(discordId: string): boolean {
        return this.createdBy === discordId;
    }

    public isWaiting(): boolean {
        return this.status === GameStatus.WAITING;
    }

    public isPlaying(): boolean {
        return this.status === GameStatus.PLAYING;
    }

    public isFinished(): boolean {
        return this.status === GameStatus.FINISHED;
    }

    public isGameOver(): boolean {
        return this.failureCount >= this.hp;
    }

    public getRemainingCards(): Card[] {
        return this.cards.filter(card => !card.isEliminated);
    }

    public getEliminatedCards(): Card[] {
        return this.cards.filter(card => card.isEliminated);
    }

    public getPlayerCards(discordId: string): Card[] {
        const player = this.players.find(p => p.player.discordId === discordId);
        if (!player) return [];

        return this.cards.filter(
            card => card.playerId === player.playerId && !card.isEliminated
        );
    }

    public generateRandomNumbers(count: number): number[] {
        const numbers: number[] = [];
        const availableNumbers = Array.from(
            { length: this.maxNumber - this.minNumber + 1 },
            (_, i) => this.minNumber + i
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

    public toJSON(): GameWithRelations {
        return this.data;
    }

    public updateData(data: Partial<GameWithRelations>): void {
        this.data = { ...this.data, ...data };
    }
}
