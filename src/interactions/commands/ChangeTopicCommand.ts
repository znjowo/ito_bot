import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { CommandPack, instance } from "~/interfaces/IDiscord";
import { Logger } from "~/lib/Logger";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";
import GameManager from "~/managers/GameManager";
import TopicManager from "~/managers/TopicManager";

class ChangeTopicCommand extends BaseInteractionManager<ChatInputCommandInteraction> {
    protected async main(): Promise<void> {
        try {
            // チャンネルがテキストチャンネルかチェック
            if (!this.interaction.channel?.isTextBased()) {
                await this.interaction.reply({
                    content: "テキストチャンネルでのみ使用できます。",
                    ephemeral: true,
                });
                return;
            }

            // チャンネルのアクティブなゲームを取得
            const game = await GameManager.getActiveGameByChannel(
                this.interaction.channelId
            );
            if (!game) {
                await this.interaction.reply({
                    content:
                        "このチャンネルではアクティブなゲームが見つかりません。",
                    ephemeral: true,
                });
                return;
            }

            // ゲーム作成者かチェック
            if (game.createdBy !== this.interaction.user.id) {
                await this.interaction.reply({
                    content: "ゲーム作成者のみがお題を変更できます。",
                    ephemeral: true,
                });
                return;
            }

            // ゲームが進行中でない場合はエラー
            if (game.status !== "PLAYING") {
                await this.interaction.reply({
                    content: "ゲームが進行中ではありません。",
                    ephemeral: true,
                });
                return;
            }

            // ランダムなお題を取得
            const newTopic = await TopicManager.getRandomTopic();
            if (!newTopic) {
                await this.interaction.reply({
                    content: "利用可能なお題が見つかりません。",
                    ephemeral: true,
                });
                return;
            }

            // 現在のお題を取得（比較用）
            const currentGame = await GameManager.getGameWithRelations(game.id);
            const currentTopic = currentGame?.topic;

            // ゲームのお題をデータベースで更新
            await GameManager.updateGameTopic(game.id, newTopic.id);

            // 埋め込みメッセージを作成
            const embed = new EmbedBuilder()
                .setTitle("🔄 お題変更")
                .setDescription(`${this.interaction.user} がお題を変更しました`)
                .addFields({
                    name: "📝 新しいお題",
                    value: `**${newTopic.title}**\n${newTopic.description}`,
                    inline: false,
                })
                .setColor(0x00bfff)
                .setTimestamp();

            // お題が変更された場合のみ変更前のお題も表示
            if (currentTopic && currentTopic.id !== newTopic.id) {
                embed.addFields({
                    name: "📝 変更前のお題",
                    value: `**${currentTopic.title}**\n${currentTopic.description}`,
                    inline: false,
                });
            }

            await this.interaction.reply({
                embeds: [embed],
            });

            Logger.info(
                `お題を変更しました: ${game.id} - 変更前: ${currentTopic?.title || "なし"} -> 変更後: ${newTopic.title} by ${this.interaction.user.username}`
            );
        } catch (error) {
            Logger.error(`お題変更コマンドエラー: ${error}`);
            await this.interaction.reply({
                content: "お題の変更中にエラーが発生しました。",
                ephemeral: true,
            });
        }
    }
}

const changeTopicCommand: CommandPack = {
    data: new SlashCommandBuilder()
        .setName("changetopic")
        .setDescription("現在のゲームのお題をランダムで変更します"),
    instance: instance(ChangeTopicCommand),
};

export default changeTopicCommand;
