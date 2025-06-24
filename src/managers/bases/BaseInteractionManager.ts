import {
    ActionRowBuilder,
    BaseInteraction,
    ButtonBuilder,
    ButtonStyle,
    InteractionReplyOptions,
    InteractionUpdateOptions,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { CustomIds } from "~/interfaces/IEnum";
import BaseManager from "./BaseManager";

export default class BaseInteractionManager<
    T extends BaseInteraction,
> extends BaseManager {
    /* === Protected 変数 === */
    protected guildId: string; // サーバーID
    protected channelId: string; // チャンネルID
    protected userId: string; // ユーザーID
    protected options?: any; // オプション（型をanyに変更）

    constructor(protected interaction: T) {
        super();

        this.guildId = interaction.guildId ?? "";
        this.channelId = interaction.channelId ?? "";
        this.userId = interaction.user.id;

        // CommandInteractionの場合はoptionsを設定
        if ("options" in interaction) {
            this.options = (interaction as any).options;
        }
    }

    /* === Public 関数 === */

    /**
     * インタラクションを実行する
     */
    public async execute(): Promise<void> {
        try {
            await this.main();
        } catch (error) {
            console.error(
                "インタラクション実行中にエラーが発生しました:",
                error
            );
            await this.messageUpdate({
                content: "エラーが発生しました。",
                ephemeral: true,
            });
        }
    }

    /* === Protected 関数 === */

    // メイン処理
    protected async main(..._: any[]) {}

    // メッセージ送信 (返信済みの場合は更新)
    protected async messageUpdate(
        options: InteractionReplyOptions,
        i?: BaseInteraction
    ) {
        if (i?.isAnySelectMenu() || i?.isButton()) {
            await i.update(options as InteractionUpdateOptions).catch(() => {});
            return;
        }

        // 型ガードでインタラクションの種類をチェック
        if ('replied' in this.interaction && 'deferred' in this.interaction) {
            const interaction = this.interaction as any;
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(options as any).catch(() => {});
            return;
            }
            await interaction.reply(options).catch(() => {});
        }
    }

    // テストメッセージ送信
    protected async sendTestMessage(content: string) {
        const testSendMessageButton = new ButtonBuilder()
            .setCustomId(CustomIds.ButtonTestSendMessage) // カスタムID
            .setLabel("Send Message") // ラベル
            .setStyle(ButtonStyle.Secondary); // スタイル

        const testShowModalButton = new ButtonBuilder()
            .setCustomId(CustomIds.ButtonTestShowModal) // カスタムID
            .setLabel("Show Modal") // ラベル
            .setStyle(ButtonStyle.Secondary); // スタイル

        await this.messageUpdate({
            components: [
                new ActionRowBuilder<ButtonBuilder>().setComponents([
                    testSendMessageButton,
                    testShowModalButton,
                ]),
            ], // ボタン
            content, // コンテンツ
        });
    }

    // テストモーダル表示
    protected async showTestModal() {
        if (this.interaction.isModalSubmit()) return;

        // フォーム作成
        const testInput = new TextInputBuilder()
            .setCustomId(CustomIds.ModalInputTest) // カスタムID
            .setLabel("テストラベル") // ラベル
            .setRequired(true) // 必須項目
            .setStyle(TextInputStyle.Short); // スタイル

        const modal = new ModalBuilder()
            .setCustomId(CustomIds.ModalTest) // カスタムID
            .setTitle("テストモーダル") // タイトル
            .setComponents([
                new ActionRowBuilder<TextInputBuilder>().setComponents([
                    testInput,
                ]),
            ]); // フォーム

        // 型ガードでshowModalメソッドの存在をチェック
        if ('showModal' in this.interaction) {
            await (this.interaction as any).showModal(modal);
        }
    }
}
