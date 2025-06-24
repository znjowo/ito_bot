import { Collection, SlashCommandBuilder } from "discord.js";
import { CommandPack } from "~/interfaces/IDiscord";
import { Logger } from "~/lib/Logger";

export default class CommandManager {
    private commands: Collection<string, CommandPack> = new Collection();

    /**
     * コマンドを登録する
     * @param command コマンドパック
     */
    public registerCommand(command: CommandPack): void {
        const commandName = this.getCommandName(command);

        if (this.commands.has(commandName)) {
            Logger.warn(`コマンド "${commandName}" は既に登録されています`);
            return;
        }

        this.commands.set(commandName, command);
        Logger.info(`コマンド "${commandName}" を登録しました`);
    }

    /**
     * 複数のコマンドを登録する
     * @param commands コマンドパックの配列
     */
    public registerCommands(commands: CommandPack[]): void {
        commands.forEach(command => this.registerCommand(command));
    }

    /**
     * コマンドを取得する
     * @param name コマンド名
     * @returns コマンドパックまたはundefined
     */
    public getCommand(name: string): CommandPack | undefined {
        return this.commands.get(name);
    }

    /**
     * 全てのコマンドを取得する
     * @returns コマンドパックの配列
     */
    public getAllCommands(): CommandPack[] {
        return Array.from(this.commands.values());
    }

    /**
     * コマンドの存在確認
     * @param name コマンド名
     * @returns 存在するかどうか
     */
    public hasCommand(name: string): boolean {
        return this.commands.has(name);
    }

    /**
     * 登録されているコマンド数を取得
     * @returns コマンド数
     */
    public getCommandCount(): number {
        return this.commands.size;
    }

    /**
     * コマンド名を取得する
     * @param command コマンドパック
     * @returns コマンド名
     */
    private getCommandName(command: CommandPack): string {
        if (command.data instanceof SlashCommandBuilder) {
            return command.data.name;
        }
        return command.data.name;
    }
}
