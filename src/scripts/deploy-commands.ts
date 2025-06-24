import commands from "../interactions/commands";
import { Logger } from "../lib/Logger";
import CommandDeployer from "../managers/CommandDeployer";

const commandDeployer = new CommandDeployer();

async function deployCommands(): Promise<void> {
    try {
        Logger.info("コマンドの登録を開始します...");
        await commandDeployer.deployCommands(commands);
        Logger.info("コマンドの登録が完了しました");
        process.exit(0);
    } catch (error) {
        Logger.error(`コマンドの登録に失敗しました: ${error}`);
        process.exit(1);
    }
}

async function deleteAllCommands(): Promise<void> {
    try {
        Logger.info("全てのコマンドを削除します...");
        await commandDeployer.deleteAllCommands();
        Logger.info("全てのコマンドを削除しました");
        process.exit(0);
    } catch (error) {
        Logger.error(`コマンドの削除に失敗しました: ${error}`);
        process.exit(1);
    }
}

async function deleteCommand(commandName: string): Promise<void> {
    try {
        Logger.info(`コマンド "${commandName}" を削除します...`);
        await commandDeployer.deleteCommand(commandName);
        Logger.info(`コマンド "${commandName}" を削除しました`);
        process.exit(0);
    } catch (error) {
        Logger.error(`コマンド "${commandName}" の削除に失敗しました: ${error}`);
        process.exit(1);
    }
}

async function listCommands(): Promise<void> {
    try {
        Logger.info("登録されているコマンドを取得します...");
        const registeredCommands = await commandDeployer.getRegisteredCommands();
        
        if (registeredCommands.length === 0) {
            Logger.info("登録されているコマンドはありません");
        } else {
            Logger.info("登録されているコマンド:");
            registeredCommands.forEach(cmd => {
                Logger.info(`- ${cmd.name}: ${cmd.description}`);
            });
        }
        process.exit(0);
    } catch (error) {
        Logger.error(`コマンドの取得に失敗しました: ${error}`);
        process.exit(1);
    }
}

// コマンドライン引数を処理
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case "deploy":
        deployCommands();
        break;
    case "delete-all":
        deleteAllCommands();
        break;
    case "delete":
        const commandName = args[1];
        if (!commandName) {
            Logger.error("削除するコマンド名を指定してください");
            process.exit(1);
        }
        deleteCommand(commandName);
        break;
    case "list":
        listCommands();
        break;
    default:
        Logger.info("使用方法:");
        Logger.info("  npm run deploy-commands deploy     - コマンドを登録");
        Logger.info("  npm run deploy-commands delete-all - 全てのコマンドを削除");
        Logger.info("  npm run deploy-commands delete <name> - 特定のコマンドを削除");
        Logger.info("  npm run deploy-commands list       - 登録されているコマンドを表示");
        process.exit(0);
} 