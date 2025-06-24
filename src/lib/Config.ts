import Env from "./Env";

export default class Config {
    private static instance: Config;
    private config: Map<string, any> = new Map();

    private constructor() {
        this.initializeConfig();
    }

    /**
     * シングルトンインスタンスを取得する
     */
    public static getInstance(): Config {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }

    /**
     * 設定を初期化する
     */
    private initializeConfig(): void {
        // Discord設定
        this.config.set("discord.token", Env.token);
        this.config.set("discord.clientId", Env.clientId);
        this.config.set("discord.guildId", Env.guildId);
        this.config.set("discord.guildOnly", Env.guildOnly);

        // ログ設定
        this.config.set("logging.level", "info");
        this.config.set("logging.enableFileLogging", false);

        // ボット設定
        this.config.set("bot.prefix", "!");
        this.config.set("bot.defaultCooldown", 3000); // 3秒
        this.config.set("bot.maxRetries", 3);
    }

    /**
     * 設定値を取得する
     * @param key 設定キー（ドット区切り）
     * @param defaultValue デフォルト値
     * @returns 設定値
     */
    public get<T>(key: string, defaultValue?: T): T | undefined {
        return this.config.get(key) ?? defaultValue;
    }

    /**
     * 設定値を設定する
     * @param key 設定キー（ドット区切り）
     * @param value 設定値
     */
    public set<T>(key: string, value: T): void {
        this.config.set(key, value);
    }

    /**
     * 設定が存在するかチェックする
     * @param key 設定キー
     * @returns 存在するかどうか
     */
    public has(key: string): boolean {
        return this.config.has(key);
    }

    /**
     * Discordトークンを取得する
     */
    public getDiscordToken(): string {
        return this.get<string>("discord.token") || "";
    }

    /**
     * クライアントIDを取得する
     */
    public getClientId(): string {
        return this.get<string>("discord.clientId") || "";
    }

    /**
     * ギルドIDを取得する
     */
    public getGuildId(): string {
        return this.get<string>("discord.guildId") || "";
    }

    /**
     * ギルド限定モードかどうかを取得する
     */
    public isGuildOnly(): boolean {
        return this.get<boolean>("discord.guildOnly") || false;
    }

    /**
     * ログレベルを取得する
     */
    public getLogLevel(): string {
        return this.get<string>("logging.level") || "info";
    }

    /**
     * ファイルログが有効かどうかを取得する
     */
    public isFileLoggingEnabled(): boolean {
        return this.get<boolean>("logging.enableFileLogging") || false;
    }

    /**
     * ボットプレフィックスを取得する
     */
    public getBotPrefix(): string {
        return this.get<string>("bot.prefix") || "!";
    }

    /**
     * デフォルトクールダウン時間を取得する
     */
    public getDefaultCooldown(): number {
        return this.get<number>("bot.defaultCooldown") || 3000;
    }

    /**
     * 最大リトライ回数を取得する
     */
    public getMaxRetries(): number {
        return this.get<number>("bot.maxRetries") || 3;
    }
}
