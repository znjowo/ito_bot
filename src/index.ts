import { Client, GatewayIntentBits } from "discord.js";
import buttons from "./interactions/buttons";
import commands from "./interactions/commands";
import modals from "./interactions/modals";
import Config from "./lib/Config";
import ErrorHandler from "./lib/ErrorHandler";
import { Logger } from "./lib/Logger";
import BotManager from "./managers/BotManager";
import CommandDeployer from "./managers/CommandDeployer";
import Registry from "./managers/Registry";

let botManager: BotManager;
let isShuttingDown = false;

// クライアントの作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.guilds.cache.forEach(async guild => {
    await guild.leave();
});

// エラーハンドラーの設定
const errorHandler = ErrorHandler.getInstance();

async function main(): Promise<void> {
    try {
        const config = Config.getInstance();
        botManager = new BotManager();
        const commandDeployer = new CommandDeployer();

        // レジストリの初期化
        const registry = new Registry(
            botManager.getCommandManager(),
            botManager.getInteractionManager()
        );

        registry.registerAll(commands, buttons, modals);
        registry.showRegistryStatus();

        await commandDeployer.deployCommands(commands);
        await botManager.login(config.getDiscordToken());

        Logger.success("ボットが正常に起動しました！");
    } catch (error) {
        Logger.error(`ボット起動エラー: ${error}`);
        process.exit(1);
    }
}

async function cleanup(): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    try {
        Logger.info("クリーンアップを開始...");

        if (botManager) {
            await botManager.destroy();
        }

        // ログバッファをフラッシュ
        Logger.flushBuffer();

        Logger.info("クリーンアップ完了");
        process.exit(0);
    } catch (error) {
        Logger.error(`クリーンアップエラー: ${error}`);
        process.exit(1);
    }
}

process.on("SIGINT", async () => {
    Logger.info("シャットダウンシグナルを受信しました...");
    await cleanup();
});

process.on("SIGTERM", async () => {
    Logger.info("終了シグナルを受信しました...");
    await cleanup();
});

process.on("uncaughtException", async error => {
    Logger.error(`未処理の例外: ${error.message}`);
    Logger.error(`スタックトレース: ${error.stack}`);
    if (!isShuttingDown) {
        await cleanup();
    }
});

process.on("unhandledRejection", async (reason, promise) => {
    Logger.error(`未処理のPromise拒否: ${reason}`);
    Logger.error(`Promise: ${promise}`);
    if (!isShuttingDown) {
        await cleanup();
    }
});

// ボットを起動
main();
