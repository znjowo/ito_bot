import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
} from "discord.js";
import { ButtonPack, instance } from "~/interfaces/IDiscord";
import { CustomIds } from "~/interfaces/IEnum";
import { DIContainer } from "~/lib/DIContainer";
import { Logger } from "~/lib/Logger";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";

class ItoLeaveButton extends BaseInteractionManager<ButtonInteraction> {
    private gameService = DIContainer.getInstance().getGameService();

    protected async main(): Promise<void> {
        try {
            // カスタムIDからゲームIDを抽出
            const gameId = this.interaction.customId.replace(
                CustomIds.ItoLeave,
                ""
            );

            // ゲーム情報を取得
            const game = await this.gameService.getGameById(gameId);
            if (!game) {
                await this.interaction.reply({
                    content: "ゲームが見つかりません。",
                    ephemeral: true,
                });
                return;
            }

            // ゲームが募集状態でない場合はエラー
            if (!game.isWaiting()) {
                await this.interaction.reply({
                    content:
                        "このゲームは既に開始されているため退出できません。",
                    ephemeral: true,
                });
                return;
            }

            // 参加しているかチェック
            if (!game.isPlayerJoined(this.interaction.user.id)) {
                await this.interaction.reply({
                    content: "このゲームに参加していません。",
                    ephemeral: true,
                });
                return;
            }

            // ゲーム作成者の場合は退出できない
            if (game.isCreator(this.interaction.user.id)) {
                await this.interaction.reply({
                    content:
                        "ゲーム作成者は退出できません。ゲームを削除するには強制終了を使用してください。",
                    ephemeral: true,
                });
                return;
            }

            // ゲームから退出
            await this.gameService.leaveGame(gameId, this.interaction.user.id);

            // 更新されたゲーム情報を取得
            const updatedGame = await this.gameService.getGameById(gameId);
            if (!updatedGame) {
                await this.interaction.reply({
                    content: "ゲーム情報の更新に失敗しました。",
                    ephemeral: true,
                });
                return;
            }

            // 参加者リストを作成
            const playerList =
                updatedGame.players.length > 0
                    ? updatedGame.players
                          .map(player => `• ${player.player.username}`)
                          .join("\n")
                    : "参加者がいません";

            // カード配布可能性チェック
            const distributionInfo = updatedGame.getCardDistributionInfo();

            // 埋め込みメッセージを更新
            const embed = new EmbedBuilder()
                .setTitle("🎮 itoゲーム募集")
                .setDescription(
                    `<@${updatedGame.createdBy}> がitoゲームを開始しました！`
                )
                .addFields(
                    {
                        name: "📊 設定",
                        value: `数字範囲: ${updatedGame.minNumber}-${updatedGame.maxNumber}\nカード枚数: ${updatedGame.cardCount}枚\nライフ: ${updatedGame.hp}`,
                        inline: true,
                    },
                    {
                        name: "👥 参加者",
                        value: `${updatedGame.players.length}人`,
                        inline: true,
                    },
                    {
                        name: "📋 参加者リスト",
                        value: playerList,
                        inline: false,
                    }
                )
                .setColor(distributionInfo.isPossible ? 0x00ff00 : 0xffa500)
                .setTimestamp();

            // カード配布不可能な場合は警告を追加
            if (
                !distributionInfo.isPossible &&
                updatedGame.players.length > 0
            ) {
                embed.addFields({
                    name: "⚠️ 警告",
                    value: `現在の参加者数では開始できません。\n必要カード数: ${distributionInfo.totalCardsNeeded}枚\n利用可能数字: ${distributionInfo.availableNumbers}個\n\n数字範囲を広げるか、カード枚数を減らしてください。`,
                    inline: false,
                });
            }

            // ボタンを更新（最低2人で開始可能）
            const canStart = updatedGame.canStart();
            const joinRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId(`${CustomIds.ItoJoin}${gameId}`)
                    .setLabel("参加する")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("🎯"),
                new ButtonBuilder()
                    .setCustomId(`${CustomIds.ItoLeave}${gameId}`)
                    .setLabel("退出する")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🚪"),
                new ButtonBuilder()
                    .setCustomId(`${CustomIds.ItoStart}${gameId}`)
                    .setLabel("ゲーム開始")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("▶️")
                    .setDisabled(!canStart)
            );

            const controlRow =
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${CustomIds.ItoCancel}${gameId}`)
                        .setLabel("募集キャンセル")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji("❌")
                );

            await this.interaction.update({
                embeds: [embed],
                components: [joinRow, controlRow],
            });

            Logger.info(
                `プレイヤーが退出しました: ${this.interaction.user.username} (${gameId})`
            );
        } catch (error) {
            Logger.error(`ito退出ボタンエラー: ${error}`);
            await this.interaction.reply({
                content: "退出処理中にエラーが発生しました。",
                ephemeral: true,
            });
        }
    }
}

const itoLeaveButton: ButtonPack = {
    id: CustomIds.ItoLeave,
    instance: instance(ItoLeaveButton),
};

export default itoLeaveButton;
