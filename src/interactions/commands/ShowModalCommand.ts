import { SlashCommandBuilder } from "discord.js";
import { CommandPack, instance } from "~/interfaces/IDiscord";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";

class ShowModalCommand extends BaseInteractionManager<any> {
    protected async main(): Promise<void> {
        await this.showTestModal();
    }
}

const showModalCommand: CommandPack = {
    data: new SlashCommandBuilder()
        .setName("modal")
        .setDescription("テストモーダルを表示します"),
    instance: instance(ShowModalCommand),
};

export default showModalCommand;
