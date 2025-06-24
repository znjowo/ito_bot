import { Collection } from "discord.js";
import { ButtonPack, ModalPack } from "~/interfaces/IDiscord";
import { CustomIds } from "~/interfaces/IEnum";

export default class InteractionManager {
    private buttons: Collection<CustomIds, ButtonPack> = new Collection();
    private modals: Collection<CustomIds, ModalPack> = new Collection();

    /**
     * ボタンを登録
     */
    public registerButton(button: ButtonPack): void {
        this.buttons.set(button.id, button);
    }

    /**
     * 複数のボタンを登録する
     * @param buttons ボタンパックの配列
     */
    public registerButtons(buttons: ButtonPack[]): void {
        buttons.forEach(button => this.registerButton(button));
    }

    /**
     * モーダルを登録
     */
    public registerModal(modal: ModalPack): void {
        this.modals.set(modal.id, modal);
    }

    /**
     * 複数のモーダルを登録する
     * @param modals モーダルパックの配列
     */
    public registerModals(modals: ModalPack[]): void {
        modals.forEach(modal => this.registerModal(modal));
    }

    /**
     * ボタンを取得する（プレフィックス検索対応）
     * @param customId カスタムID
     * @returns ボタンパックまたはundefined
     */
    public getButton(customId: string): ButtonPack | undefined {
        // 完全一致を先に試す
        const exactMatch = this.buttons.get(customId as CustomIds);
        if (exactMatch) {
            return exactMatch;
        }

        // プレフィックス検索
        for (const [id, button] of this.buttons) {
            if (customId.startsWith(id)) {
                return button;
            }
        }

        return undefined;
    }

    /**
     * モーダルを取得する（プレフィックス検索対応）
     * @param customId カスタムID
     * @returns モーダルパックまたはundefined
     */
    public getModal(customId: string): ModalPack | undefined {
        // 完全一致を先に試す
        const exactMatch = this.modals.get(customId as CustomIds);
        if (exactMatch) {
            return exactMatch;
        }

        // プレフィックス検索
        for (const [id, modal] of this.modals) {
            if (customId.startsWith(id)) {
                return modal;
            }
        }

        return undefined;
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
     * ボタンの存在確認（プレフィックス検索対応）
     * @param customId カスタムID
     * @returns 存在するかどうか
     */
    public hasButton(customId: string): boolean {
        return this.getButton(customId) !== undefined;
    }

    /**
     * モーダルの存在確認（プレフィックス検索対応）
     * @param customId カスタムID
     * @returns 存在するかどうか
     */
    public hasModal(customId: string): boolean {
        return this.getModal(customId) !== undefined;
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
