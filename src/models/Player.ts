import { Card, Player as PrismaPlayer } from "@prisma/client";

export interface PlayerWithCards extends PrismaPlayer {
    cards: Card[];
}

export class PlayerModel {
    private data: PlayerWithCards;

    constructor(data: PlayerWithCards) {
        this.data = data;
    }

    // ゲッター
    get id(): string {
        return this.data.id;
    }

    get discordId(): string {
        return this.data.discordId;
    }

    get username(): string {
        return this.data.username;
    }

    get cards(): Card[] {
        return this.data.cards;
    }

    // ビジネスロジック
    public getActiveCards(): Card[] {
        return this.cards.filter(card => !card.isEliminated);
    }

    public getEliminatedCards(): Card[] {
        return this.cards.filter(card => card.isEliminated);
    }

    public getRevealedCards(): Card[] {
        return this.cards.filter(card => card.isRevealed);
    }

    public getUnrevealedCards(): Card[] {
        return this.cards.filter(card => !card.isRevealed && !card.isEliminated);
    }

    public getSmallestCard(): Card | null {
        const unrevealedCards = this.getUnrevealedCards();
        if (unrevealedCards.length === 0) return null;
        
        return unrevealedCards.reduce((min, card) => 
            card.number < min.number ? card : min
        );
    }

    public hasCards(): boolean {
        return this.getActiveCards().length > 0;
    }

    public hasUnrevealedCards(): boolean {
        return this.getUnrevealedCards().length > 0;
    }

    public getCardCount(): number {
        return this.getActiveCards().length;
    }

    public getSortedCards(): Card[] {
        return this.getActiveCards().sort((a, b) => a.number - b.number);
    }

    public toJSON(): PlayerWithCards {
        return this.data;
    }

    public updateData(data: Partial<PlayerWithCards>): void {
        this.data = { ...this.data, ...data };
    }
} 