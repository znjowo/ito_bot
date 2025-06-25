import {
    ActivityType,
    Client,
    Events,
    IntentsBitField,
    Partials,
} from "discord.js";
import Database from "~/lib/Database";
import { Logger } from "~/lib/Logger";
import CommandManager from "./CommandManager";
import InteractionManager from "./InteractionManager";

export default class BotManager {
    private client: Client;
    private commandManager: CommandManager;
    private interactionManager: InteractionManager;
    private presenceUpdateInterval?: NodeJS.Timeout;

    constructor() {
        this.client = new Client({
            intents: [
                IntentsBitField.Flags.MessageContent,
                IntentsBitField.Flags.Guilds,
                IntentsBitField.Flags.GuildMembers,
                IntentsBitField.Flags.GuildMessages,
                IntentsBitField.Flags.GuildMessageReactions,
            ],
            partials: [Partials.Message, Partials.Channel, Partials.Reaction],
        });

        this.commandManager = new CommandManager();
        this.interactionManager = new InteractionManager();

        this.setupEventHandlers();
    }

    /**
     * イベントハンドラーを設定する
     */
    private setupEventHandlers(): void {
        this.client.once(Events.ClientReady, this.onClientReady.bind(this));
        this.client.on(
            Events.InteractionCreate,
            this.onInteractionCreate.bind(this)
        );

        // クライアントの切断イベント
        this.client.on("disconnect", () => {
            Logger.warn("Discord切断");
        });

        this.client.on("reconnecting", () => {
            Logger.info("Discord再接続中");
        });

        this.client.on("resume", () => {
            Logger.info("Discord再接続完了");
        });

        process.on("unhandledRejection", this.onUnhandledRejection.bind(this));
        process.on("uncaughtException", this.onUncaughtException.bind(this));

        // プロセス終了時のクリーンアップ
        process.on("SIGINT", this.onProcessExit.bind(this));
        process.on("SIGTERM", this.onProcessExit.bind(this));
    }

    /**
     * クライアント準備完了時の処理
     */
    private async onClientReady(): Promise<void> {
        try {
            // データベースに接続
            await Database.connect();

            // プレゼンスを初期設定
            await this.updatePresence();

            // プレゼンスの定期更新を開始（5分ごと）
            this.presenceUpdateInterval = setInterval(
                async () => {
                    await this.updatePresence();
                },
                24 * 60 * 60 * 1000
            ); // 24時間 = 86,400,000ms

            Logger.info(`ボット準備完了: ${this.client.user?.tag}`);
        } catch (error) {
            Logger.error(`データベース接続エラー: ${error}`);
            process.exit(1);
        }
    }

    /**
     * インタラクション作成時の処理
     */
    private async onInteractionCreate(interaction: any): Promise<void> {
        if (!interaction.inCachedGuild() || !interaction.guild) return;

        try {
            if (interaction.isCommand()) {
                const command = this.commandManager.getCommand(
                    interaction.commandName
                );
                if (command) {
                    await command.instance(interaction).execute();
                } else {
                    Logger.warn(`未登録コマンド: ${interaction.commandName}`);
                }
                return;
            }

            if (interaction.isButton() || interaction.isModalSubmit()) {
                const customId = interaction.customId as any;
                const interactionObject = interaction.isButton()
                    ? this.interactionManager.getButton(customId)
                    : this.interactionManager.getModal(customId);

                if (interactionObject) {
                    await interactionObject.instance(interaction).execute();
                } else {
                    Logger.warn(`未登録インタラクション: ${customId}`);
                }
            }
        } catch (error) {
            Logger.error(`インタラクションエラー: ${error}`);
        }
    }

    /**
     * 未処理のPromise拒否時の処理
     */
    private onUnhandledRejection(reason: any): void {
        Logger.error(`未処理のPromise拒否: ${reason}`);
    }

    /**
     * 未処理の例外時の処理
     */
    private onUncaughtException(error: Error): void {
        Logger.error(`未処理の例外: ${error.message}`);
        Logger.error(error.stack || "");
        process.exit(1);
    }

    /**
     * プロセス終了時の処理
     */
    private async onProcessExit(): Promise<void> {
        Logger.info("プロセス終了処理を開始します...");

        try {
            // データベース接続を切断
            await Database.disconnect();

            // ボットを終了
            await this.destroy();

            Logger.info("プロセス終了処理が完了しました");
            process.exit(0);
        } catch (error) {
            Logger.error(`プロセス終了処理エラー: ${error}`);
            process.exit(1);
        }
    }

    /**
     * ボットをログインする
     * @param token Discordボットトークン
     */
    public async login(token: string): Promise<void> {
        try {
            await this.client.login(token);
            Logger.info("ログイン完了");
        } catch (error) {
            Logger.error(`ログイン失敗: ${error}`);
            throw error;
        }
    }

    /**
     * ボットを適切に終了する
     */
    public async destroy(): Promise<void> {
        try {
            // プレゼンス更新インターバルをクリア
            if (this.presenceUpdateInterval) {
                clearInterval(this.presenceUpdateInterval);
                this.presenceUpdateInterval = undefined;
            }

            if (this.client && this.client.isReady()) {
                // 全てのイベントリスナーを削除
                this.client.removeAllListeners();

                // クライアントを切断
                this.client.destroy();

                Logger.info("Discord切断完了");
            }
        } catch (error) {
            Logger.error(`切断エラー: ${error}`);
        }
    }

    /**
     * プレゼンス（プレイ中表記）を更新する
     */
    private async updatePresence(): Promise<void> {
        try {
            if (!this.client.isReady()) return;

            const guildCount = this.client.guilds.cache.size;
            const activityName = `/ito | ${guildCount}servers`;

            await this.client.user?.setPresence({
                activities: [
                    {
                        name: activityName,
                        type: ActivityType.Playing,
                    },
                ],
                status: "online",
            });

            Logger.info(`プレゼンス更新: ${activityName}`);
        } catch (error) {
            Logger.error(`プレゼンス更新エラー: ${error}`);
        }
    }

    /**
     * コマンドマネージャーを取得する
     */
    public getCommandManager(): CommandManager {
        return this.commandManager;
    }

    /**
     * インタラクションマネージャーを取得する
     */
    public getInteractionManager(): InteractionManager {
        return this.interactionManager;
    }

    /**
     * Discordクライアントを取得する
     */
    public getClient(): Client {
        return this.client;
    }
}
