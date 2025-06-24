import { SlashCommandBuilder } from "discord.js";
import { CommandPack, instance } from "~/interfaces/IDiscord";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";

class TestCommand extends BaseInteractionManager<any> {
    protected async main(): Promise<void> {
        await this.sendTestMessage("テストコマンドが実行されました！");
    }
}

const testCommand: CommandPack = {
    data: new SlashCommandBuilder()
        .setName("test")
        .setDescription("テストコマンド"),
    instance: instance(TestCommand),
};

export default testCommand;
