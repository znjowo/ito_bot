import dotenv from "dotenv";
dotenv.config();

export default class Env {
    /* === Public 変数 === */

    public static get token(): string {
        return this._getEnv("TOKEN"); // DiscordのBotトークン
    }

    public static get clientId(): string {
        return this._getEnv("CLIENT_ID"); // DiscordのクライアントID
    }

    public static get guildId(): string {
        return this._getEnv("GUILD_ID"); // DiscordのギルドID
    }

    public static get guildOnly(): boolean {
        const value = process.env.GUILD_ONLY;
        return value === "true" || value === "1";
    }

    public static get logWebhookUrl(): string {
        return this._getEnv("LOG_WEBHOOK_URL"); // ログ出力用のWebhookURL
    }

    public static get databaseUrl(): string {
        return this._getEnv("DATABASE_URL"); // データベース接続URL
    }

    /* === Private 変数 === */

    private static _getEnv(value: string): string {
        const getValue = process.env[value]; // 環境変数を取得する
        if (!getValue) {
            throw new Error(`- **※.envにて${value}が設定されておりません**`);
        }
        return getValue;
    }
}
