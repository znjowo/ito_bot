import { ButtonPack, CommandPack, ModalPack } from "~/interfaces/IDiscord";
import { Logger } from "~/lib/Logger";
import CommandManager from "./CommandManager";
import InteractionManager from "./InteractionManager";

export default class Registry {
    private commandManager: CommandManager;
    private interactionManager: InteractionManager;

    constructor(
        commandManager: CommandManager,
        interactionManager: InteractionManager
    ) {
        this.commandManager = commandManager;
        this.interactionManager = interactionManager;
    }

    /**
     * 全てのコマンドとインタラクションを登録する
     * @param commands コマンドの配列
     * @param buttons ボタンの配列
     * @param modals モーダルの配列
     */
    public registerAll(
        commands: CommandPack[],
        buttons: ButtonPack[],
        modals: ModalPack[]
    ): void {
        this.commandManager.registerCommands(commands);
        this.interactionManager.registerButtons(buttons);
        this.interactionManager.registerModals(modals);

        Logger.info(`登録完了: コマンド${commands.length}個, ボタン${buttons.length}個, モーダル${modals.length}個`);
    }

    /**
     * 登録状況を表示する
     */
    public showRegistryStatus(): void {
        Logger.info(`登録状況: コマンド${this.commandManager.getCommandCount()}個, ボタン${this.interactionManager.getButtonCount()}個, モーダル${this.interactionManager.getModalCount()}個`);
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
}
