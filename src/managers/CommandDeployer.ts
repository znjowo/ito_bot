import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { CommandPack } from "~/interfaces/IDiscord";
import Config from "~/lib/Config";
import { Logger } from "~/lib/Logger";

export default class CommandDeployer {
    private rest: REST;
    private config: Config;

    constructor() {
        this.config = Config.getInstance();
        this.rest = new REST({ version: "10" }).setToken(
            this.config.getDiscordToken()
        );
    }

    /**
     * コマンドを登録する
     * @param commands コマンドの配列
     */
    public async deployCommands(commands: CommandPack[]): Promise<void> {
        try {
            const commandData = commands.map(command => {
                if (command.data instanceof SlashCommandBuilder) {
                    return command.data.toJSON();
                }
                return command.data;
            });

            if (this.config.isGuildOnly()) {
                // ギルド限定で登録
                await this.deployToGuild(commandData);
            } else {
                // グローバルで登録
                await this.deployGlobally(commandData);
            }

            Logger.info(`${commands.length}個のコマンドを登録しました`);
        } catch (error) {
            Logger.error(`コマンドの登録に失敗しました: ${error}`);
            throw error;
        }
    }

    /**
     * ギルド限定でコマンドを登録する
     * @param commandData コマンドデータ
     */
    private async deployToGuild(commandData: any[]): Promise<void> {
        const guildId = this.config.getGuildId();
        if (!guildId) {
            throw new Error(
                "ギルド限定モードですが、GUILD_IDが設定されていません"
            );
        }

        await this.rest.put(
            Routes.applicationGuildCommands(this.config.getClientId(), guildId),
            { body: commandData }
        );

        Logger.info(
            `ギルド限定でコマンドを登録しました (Guild ID: ${guildId})`
        );
    }

    /**
     * グローバルでコマンドを登録する
     * @param commandData コマンドデータ
     */
    private async deployGlobally(commandData: any[]): Promise<void> {
        await this.rest.put(
            Routes.applicationCommands(this.config.getClientId()),
            { body: commandData }
        );

        Logger.info("グローバルでコマンドを登録しました");
    }

    /**
     * 全てのコマンドを削除する
     */
    public async deleteAllCommands(): Promise<void> {
        try {
            if (this.config.isGuildOnly()) {
                await this.deleteGuildCommands();
            } else {
                await this.deleteGlobalCommands();
            }

            Logger.info("全てのコマンドを削除しました");
        } catch (error) {
            Logger.error(`コマンドの削除に失敗しました: ${error}`);
            throw error;
        }
    }

    /**
     * ギルドのコマンドを削除する
     */
    private async deleteGuildCommands(): Promise<void> {
        const guildId = this.config.getGuildId();
        if (!guildId) {
            throw new Error(
                "ギルド限定モードですが、GUILD_IDが設定されていません"
            );
        }

        await this.rest.put(
            Routes.applicationGuildCommands(this.config.getClientId(), guildId),
            { body: [] }
        );

        Logger.info(`ギルドのコマンドを削除しました (Guild ID: ${guildId})`);
    }

    /**
     * グローバルコマンドを削除する
     */
    private async deleteGlobalCommands(): Promise<void> {
        await this.rest.put(
            Routes.applicationCommands(this.config.getClientId()),
            { body: [] }
        );

        Logger.info("グローバルコマンドを削除しました");
    }

    /**
     * 特定のコマンドを削除する
     * @param commandName 削除するコマンド名
     */
    public async deleteCommand(commandName: string): Promise<void> {
        try {
            if (this.config.isGuildOnly()) {
                await this.deleteGuildCommand(commandName);
            } else {
                await this.deleteGlobalCommand(commandName);
            }

            Logger.info(`コマンド "${commandName}" を削除しました`);
        } catch (error) {
            Logger.error(
                `コマンド "${commandName}" の削除に失敗しました: ${error}`
            );
            throw error;
        }
    }

    /**
     * ギルドの特定コマンドを削除する
     * @param commandName 削除するコマンド名
     */
    private async deleteGuildCommand(commandName: string): Promise<void> {
        const guildId = this.config.getGuildId();
        if (!guildId) {
            throw new Error(
                "ギルド限定モードですが、GUILD_IDが設定されていません"
            );
        }

        // まず既存のコマンドを取得
        const commands = (await this.rest.get(
            Routes.applicationGuildCommands(this.config.getClientId(), guildId)
        )) as any[];

        // 指定されたコマンドを除外
        const filteredCommands = commands.filter(
            cmd => cmd.name !== commandName
        );

        // 更新されたコマンドリストを登録
        await this.rest.put(
            Routes.applicationGuildCommands(this.config.getClientId(), guildId),
            { body: filteredCommands }
        );
    }

    /**
     * グローバルの特定コマンドを削除する
     * @param commandName 削除するコマンド名
     */
    private async deleteGlobalCommand(commandName: string): Promise<void> {
        // まず既存のコマンドを取得
        const commands = (await this.rest.get(
            Routes.applicationCommands(this.config.getClientId())
        )) as any[];

        // 指定されたコマンドを除外
        const filteredCommands = commands.filter(
            cmd => cmd.name !== commandName
        );

        // 更新されたコマンドリストを登録
        await this.rest.put(
            Routes.applicationCommands(this.config.getClientId()),
            { body: filteredCommands }
        );
    }

    /**
     * 現在登録されているコマンドを取得する
     */
    public async getRegisteredCommands(): Promise<any[]> {
        try {
            if (this.config.isGuildOnly()) {
                return await this.getGuildCommands();
            } else {
                return await this.getGlobalCommands();
            }
        } catch (error) {
            Logger.error(`コマンドの取得に失敗しました: ${error}`);
            throw error;
        }
    }

    /**
     * ギルドのコマンドを取得する
     */
    private async getGuildCommands(): Promise<any[]> {
        const guildId = this.config.getGuildId();
        if (!guildId) {
            throw new Error(
                "ギルド限定モードですが、GUILD_IDが設定されていません"
            );
        }

        return (await this.rest.get(
            Routes.applicationGuildCommands(this.config.getClientId(), guildId)
        )) as any[];
    }

    /**
     * グローバルコマンドを取得する
     */
    private async getGlobalCommands(): Promise<any[]> {
        return (await this.rest.get(
            Routes.applicationCommands(this.config.getClientId())
        )) as any[];
    }
}
