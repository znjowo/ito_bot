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
     * 全てのコンポーネントを登録
     */
    public registerAll(commands: CommandPack[], buttons: ButtonPack[], modals: ModalPack[]): void {
        // コマンドを登録
        commands.forEach(command => {
            this.commandManager.registerCommand(command);
        });

        // ボタンを登録
        buttons.forEach(button => {
            this.interactionManager.registerButton(button);
        });

        // モーダルを登録
        modals.forEach(modal => {
            this.interactionManager.registerModal(modal);
        });
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
 