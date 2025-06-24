import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { CommandPack, instance } from "~/interfaces/IDiscord";
import { CustomIds } from "~/interfaces/IEnum";
import { Logger } from "~/lib/Logger";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";
import GameManager from "~/managers/GameManager";

class ItoCommand extends BaseInteractionManager<ChatInputCommandInteraction> {
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

            // 既存のアクティブなゲームをチェック
            const existingGame = await GameManager.getActiveGameByChannel(this.interaction.channelId);
            if (existingGame) {
                await this.interaction.reply({
                    content: "このチャンネルでは既にゲームが進行中です。",
                    ephemeral: true,
                });
                return;
            }

            // オプションを取得
            const min = this.interaction.options.getInteger("min") ?? 1;
            const max = this.interaction.options.getInteger("max") ?? 100;
            const cardCount = this.interaction.options.getInteger("cards") ?? 1;
            const hp = this.interaction.options.getInteger("life") ?? 5;

            // 値の検証
            if (min >= max) {
                await this.interaction.reply({
                    content: "最小値は最大値より小さくする必要があります。",
                    ephemeral: true,
                });
                return;
            }

            // ゲームを作成
            const game = await GameManager.createGame({
                channelId: this.interaction.channelId,
                guildId: this.interaction.guildId!,
                createdBy: this.interaction.user.id,
                minNumber: min,
                maxNumber: max,
                cardCount: cardCount,
                hp: hp,
            });

            // 作成者を最初の参加者として追加
            await GameManager.joinGame(
                game.id,
                this.interaction.user.id,
                this.interaction.user.username
            );

            // 埋め込みメッセージを作成
            const embed = new EmbedBuilder()
                .setTitle("🎮 itoゲーム募集")
                .setDescription(`${this.interaction.user} がitoゲームを開始しました！`)
                .addFields(
                    { name: "📊 設定", value: `数字範囲: ${min}-${max}\nカード枚数: ${cardCount}枚\nライフ: ${hp}`, inline: true },
                    { name: "👥 参加者", value: "1人", inline: true },
                    { name: "📋 参加者リスト", value: `• ${this.interaction.user.username}`, inline: false }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            // 参加ボタンを作成
            const joinButton = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${CustomIds.ItoJoin}${game.id}`)
                        .setLabel("参加する")
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji("🎯"),
                    new ButtonBuilder()
                        .setCustomId(`${CustomIds.ItoStart}${game.id}`)
                        .setLabel("ゲーム開始")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji("▶️")
                        .setDisabled(true) // 最低2人必要
                );

            await this.interaction.reply({
                embeds: [embed],
                components: [joinButton],
            });

            // メッセージIDを保存
            const reply = await this.interaction.fetchReply();
            await GameManager.saveGameMessage(game.id, reply.id, this.interaction.channelId);

            Logger.info(`itoゲームを作成しました: ${game.id} by ${this.interaction.user.username}`);

        } catch (error) {
            Logger.error(`itoコマンドエラー: ${error}`);
            await this.interaction.reply({
                content: "ゲームの作成中にエラーが発生しました。",
                ephemeral: true,
            });
        }
    }
}

const itoCommand: CommandPack = {
    data: new SlashCommandBuilder()
        .setName("ito")
        .setDescription("itoゲームを作成します")
        .addIntegerOption(option =>
            option
                .setName("min")
                .setDescription("最小値 (1-100)")
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName("max")
                .setDescription("最大値 (1-100)")
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName("cards")
                .setDescription("配布するカードの枚数 (1-5)")
                .setMinValue(1)
                .setMaxValue(5)
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName("life")
                .setDescription("ライフ (1-5)")
                .setMinValue(1)
                .setMaxValue(5)
                .setRequired(false)
        ) as SlashCommandBuilder,
    instance: instance(ItoCommand),
};

export default itoCommand; 