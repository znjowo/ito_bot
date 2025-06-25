import { CardRepository, ICardRepository } from "~/repositories/CardRepository";
import { GameRepository, IGameRepository } from "~/repositories/GameRepository";
import {
    IPlayerRepository,
    PlayerRepository,
} from "~/repositories/PlayerRepository";
import { CardService, ICardService } from "~/services/CardService";
import { GameService, IGameService } from "~/services/GameService";

export class DIContainer {
    private static instance: DIContainer;

    // Repositories
    private gameRepository: IGameRepository;
    private playerRepository: IPlayerRepository;
    private cardRepository: ICardRepository;

    // Services
    private gameService: IGameService;
    private cardService: ICardService;

    private constructor() {
        // Initialize repositories
        this.gameRepository = new GameRepository();
        this.playerRepository = new PlayerRepository();
        this.cardRepository = new CardRepository();

        // Initialize services with dependencies
        this.gameService = new GameService(
            this.gameRepository,
            this.playerRepository,
            this.cardRepository
        );

        this.cardService = new CardService(
            this.cardRepository,
            this.playerRepository,
            this.gameRepository
        );
    }

    public static getInstance(): DIContainer {
        if (!DIContainer.instance) {
            DIContainer.instance = new DIContainer();
        }
        return DIContainer.instance;
    }

    // Repository getters
    public getGameRepository(): IGameRepository {
        return this.gameRepository;
    }

    public getPlayerRepository(): IPlayerRepository {
        return this.playerRepository;
    }

    public getCardRepository(): ICardRepository {
        return this.cardRepository;
    }

    // Service getters
    public getGameService(): IGameService {
        return this.gameService;
    }

    public getCardService(): ICardService {
        return this.cardService;
    }

    // For testing - allow injection of mock services
    public setGameService(service: IGameService): void {
        this.gameService = service;
    }

    public setCardService(service: ICardService): void {
        this.cardService = service;
    }
}
