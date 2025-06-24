import { Collection } from "discord.js";
import { ButtonPack, ModalPack } from "~/interfaces/IDiscord";
import { CustomIds } from "~/interfaces/IEnum";
import { Logger } from "~/lib/Logger";

export default class InteractionManager {
    private buttons: Collection<CustomIds, ButtonPack> = new Collection();
    private modals: Collection<CustomIds, ModalPack> = new Collection();

    /**
     * ボタンを登録する
     * @param button ボタンパック
     */
    public registerButton(button: ButtonPack): void {
        if (this.buttons.has(button.id)) {
            Logger.warn(`ボタン "${button.id}" は既に登録されています`);
            return;
        }

        this.buttons.set(button.id, button);
        Logger.info(`ボタン "${button.id}" を登録しました`);
    }

    /**
     * 複数のボタンを登録する
     * @param buttons ボタンパックの配列
     */
    public registerButtons(buttons: ButtonPack[]): void {
        buttons.forEach(button => this.registerButton(button));
    }

    /**
     * モーダルを登録する
     * @param modal モーダルパック
     */
    public registerModal(modal: ModalPack): void {
        if (this.modals.has(modal.id)) {
            Logger.warn(`モーダル "${modal.id}" は既に登録されています`);
            return;
        }

        this.modals.set(modal.id, modal);
        Logger.info(`モーダル "${modal.id}" を登録しました`);
    }

    /**
     * 複数のモーダルを登録する
     * @param modals モーダルパックの配列
     */
    public registerModals(modals: ModalPack[]): void {
        modals.forEach(modal => this.registerModal(modal));
    }

    /**
     * ボタンを取得する
     * @param id ボタンID
     * @returns ボタンパックまたはundefined
     */
    public getButton(id: CustomIds): ButtonPack | undefined {
        return this.buttons.get(id);
    }

    /**
     * モーダルを取得する
     * @param id モーダルID
     * @returns モーダルパックまたはundefined
     */
    public getModal(id: CustomIds): ModalPack | undefined {
        return this.modals.get(id);
    }

    /**
     * 全てのボタンを取得する
     * @returns ボタンパックの配列
     */
    public getAllButtons(): ButtonPack[] {
        return Array.from(this.buttons.values());
    }

    /**
     * 全てのモーダルを取得する
     * @returns モーダルパックの配列
     */
    public getAllModals(): ModalPack[] {
        return Array.from(this.modals.values());
    }

    /**
     * ボタンの存在確認
     * @param id ボタンID
     * @returns 存在するかどうか
     */
    public hasButton(id: CustomIds): boolean {
        return this.buttons.has(id);
    }

    /**
     * モーダルの存在確認
     * @param id モーダルID
     * @returns 存在するかどうか
     */
    public hasModal(id: CustomIds): boolean {
        return this.modals.has(id);
    }

    /**
     * 登録されているボタン数を取得
     * @returns ボタン数
     */
    public getButtonCount(): number {
        return this.buttons.size;
    }

    /**
     * 登録されているモーダル数を取得
     * @returns モーダル数
     */
    public getModalCount(): number {
        return this.modals.size;
    }
}
