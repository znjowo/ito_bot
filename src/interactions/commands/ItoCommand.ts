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
import { DIContainer } from "~/lib/DIContainer";
import { Logger } from "~/lib/Logger";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";

class ItoCommand extends BaseInteractionManager<ChatInputCommandInteraction> {
    private gameService = DIContainer.getInstance().getGameService();

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
            const existingGame = await this.gameService.getActiveGameByChannel(
                this.interaction.channelId
            );
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

            // 基本的なカード配布可能性チェック（最大参加者数を仮定）
            const availableNumbers = max - min + 1;
            const maxPlayersEstimate = 10; // 想定最大参加者数
            const worstCaseCards = maxPlayersEstimate * cardCount;

            if (availableNumbers < worstCaseCards) {
                await this.interaction.reply({
                    content: `警告: 設定された範囲が狭すぎる可能性があります。\n利用可能数字: ${availableNumbers}個 (${min}-${max})\n想定最大必要カード数: ${worstCaseCards}枚 (${maxPlayersEstimate}人 × ${cardCount}枚)\n\n多くの参加者が予想される場合は、数字範囲を広げるかカード枚数を減らしてください。`,
                    ephemeral: true,
                });
                return;
            }

            // ゲームを作成
            const game = await this.gameService.createGame({
                channelId: this.interaction.channelId,
                guildId: this.interaction.guildId!,
                createdBy: this.interaction.user.id,
                minNumber: min,
                maxNumber: max,
                cardCount: cardCount,
                hp: hp,
            });

            // 作成者を最初の参加者として追加
            await this.gameService.joinGame(
                game.id,
                this.interaction.user.id,
                this.interaction.user.username
            );

            // 更新されたゲーム情報を取得
            const updatedGame = await this.gameService.getGameById(game.id);
            if (!updatedGame) {
                await this.interaction.reply({
                    content: "ゲーム情報の取得に失敗しました。",
                    ephemeral: true,
                });
                return;
            }

            // 埋め込みメッセージを作成
            const embed = new EmbedBuilder()
                .setTitle("🎮 itoゲーム募集")
                .setDescription(
                    `${this.interaction.user} がitoゲームを開始しました！`
                )
                .addFields(
                    {
                        name: "📊 設定",
                        value: `数字範囲: ${min}-${max}\nカード枚数: ${cardCount}枚\nライフ: ${hp}`,
                        inline: true,
                    },
                    { name: "👥 参加者", value: "1人", inline: true },
                    {
                        name: "📋 参加者リスト",
                        value: `• ${this.interaction.user.username}`,
                        inline: false,
                    }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            // 参加ボタンを作成
            const joinRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${CustomIds.ItoJoin}${game.id}`)
                        .setLabel("参加する")
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji("🎯"),
                    new ButtonBuilder()
                        .setCustomId(`${CustomIds.ItoLeave}${game.id}`)
                        .setLabel("退出する")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("🚪"),
                    new ButtonBuilder()
                        .setCustomId(`${CustomIds.ItoStart}${game.id}`)
                        .setLabel("ゲーム開始")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji("▶️")
                        .setDisabled(true) // 最低2人必要
                );
            
            const controlRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${CustomIds.ItoCancel}${game.id}`)
                        .setLabel("募集キャンセル")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji("❌")
                );

            const message = await this.interaction.reply({
                embeds: [embed],
                components: [joinRow, controlRow],
                fetchReply: true,
            });

            // メッセージ情報を保存
            await this.gameService.saveGameMessage(
                game.id,
                message.id,
                this.interaction.channelId
            );

            Logger.info(
                `itoゲームを作成しました: ${game.id} by ${this.interaction.user.username}`
            );
        } catch (error) {
            Logger.error(`itoコマンドエラー: ${error}`);
            await this.interaction.reply({
                content: "ゲーム作成中にエラーが発生しました。",
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
