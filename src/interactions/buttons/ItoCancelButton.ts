import {
    ButtonInteraction,
    EmbedBuilder,
} from "discord.js";
import { ButtonPack, instance } from "~/interfaces/IDiscord";
import { CustomIds } from "~/interfaces/IEnum";
import { DIContainer } from "~/lib/DIContainer";
import { Logger } from "~/lib/Logger";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";

class ItoCancelButton extends BaseInteractionManager<ButtonInteraction> {
    private gameService = DIContainer.getInstance().getGameService();

    protected async main(): Promise<void> {
        try {
            // カスタムIDからゲームIDを抽出
            const gameId = this.interaction.customId.replace(CustomIds.ItoCancel, "");
            
            // ゲーム情報を取得
            const game = await this.gameService.getGameById(gameId);
            if (!game) {
                await this.interaction.reply({
                    content: "ゲームが見つかりません。",
                    ephemeral: true,
                });
                return;
            }

            // ゲーム作成者のみがキャンセルできる
            if (!game.isCreator(this.interaction.user.id)) {
                await this.interaction.reply({
                    content: "ゲーム作成者のみがゲームをキャンセルできます。",
                    ephemeral: true,
                });
                return;
            }

            // ゲームが募集状態でない場合はエラー
            if (!game.isWaiting()) {
                await this.interaction.reply({
                    content: "既に開始されたゲームはキャンセルできません。強制終了を使用してください。",
                    ephemeral: true,
                });
                return;
            }

            // ゲームを削除
            await this.gameService.deleteGame(gameId);

            // キャンセル完了メッセージに更新
            const embed = new EmbedBuilder()
                .setTitle("❌ ゲーム募集キャンセル")
                .setDescription(`<@${this.interaction.user.id}> がゲーム募集をキャンセルしました。`)
                .setColor(0xff6b6b)
                .setTimestamp();

            await this.interaction.update({
                embeds: [embed],
                components: [], // ボタンをすべて削除
            });

            Logger.info(`ゲーム募集がキャンセルされました: ${gameId} by ${this.interaction.user.username}`);

        } catch (error) {
            Logger.error(`itoキャンセルボタンエラー: ${error}`);
            await this.interaction.reply({
                content: "キャンセル処理中にエラーが発生しました。",
                ephemeral: true,
            });
        }
    }
}

const itoCancelButton: ButtonPack = {
    id: CustomIds.ItoCancel,
    instance: instance(ItoCancelButton),
};

export default itoCancelButton; 