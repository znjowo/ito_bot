import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    EmbedBuilder,
} from "discord.js";
import { ButtonPack, instance } from "~/interfaces/IDiscord";
import { CustomIds } from "~/interfaces/IEnum";
import { Logger } from "~/lib/Logger";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";
import CardManager from "~/managers/CardManager";
import GameManager from "~/managers/GameManager";

class ItoStartButton extends BaseInteractionManager<ButtonInteraction> {
    protected async main(): Promise<void> {
        try {
            // カスタムIDからゲームIDを抽出
            const gameId = this.interaction.customId.replace(CustomIds.ItoStart, "");
            
            // ゲーム情報を取得
            const game = await GameManager.getGameWithRelations(gameId);
            if (!game) {
                await this.interaction.reply({
                    content: "ゲームが見つかりません。",
                    ephemeral: true,
                });
                return;
            }

            // ゲーム作成者かチェック
            if (game.createdBy !== this.interaction.user.id) {
                await this.interaction.reply({
                    content: "ゲーム作成者のみが開始できます。",
                    ephemeral: true,
                });
                return;
            }

            // ゲームが募集状態でない場合はエラー
            if (game.status !== "WAITING") {
                await this.interaction.reply({
                    content: "このゲームは既に開始されています。",
                    ephemeral: true,
                });
                return;
            }

            // 参加者数チェック
            if (game.players.length < 2) {
                await this.interaction.reply({
                    content: "最低2人必要です。",
                    ephemeral: true,
                });
                return;
            }

            // ゲームを開始
            const startedGame = await GameManager.startGame(gameId);

            // お題情報を取得
            const topic = startedGame.topic;
            if (!topic) {
                await this.interaction.reply({
                    content: "お題の取得に失敗しました。",
                    ephemeral: true,
                });
                return;
            }

            // 各プレイヤーの手札を取得
            const playerCards = new Map<string, { username: string; cardCount: number }>();
            
            for (const player of startedGame.players) {
                const cards = await CardManager.getPlayerCards(gameId, player.player.discordId);
                playerCards.set(player.player.discordId, {
                    username: player.player.username,
                    cardCount: cards.length
                });
            }

            // 参加者リストを作成
            const playerList = Array.from(playerCards.values())
                .map(player => `• ${player.username} (${player.cardCount}枚)`)
                .join("\n");

            // 埋め込みメッセージを作成
            const embed = new EmbedBuilder()
                .setTitle("🎮 itoゲーム開始！")
                .setDescription("ゲームが開始されました！")
                .addFields(
                    { 
                        name: "📝 お題", 
                        value: `**${topic.title}**\n${topic.description}`, 
                        inline: false 
                    },
                    { 
                        name: "📊 設定", 
                        value: `数字範囲: ${startedGame.minNumber}-${startedGame.maxNumber}\nカード枚数: ${startedGame.cardCount}枚\n全体失敗数上限: ${startedGame.hp}`, 
                        inline: true 
                    },
                    { 
                        name: "👥 参加者", 
                        value: `${startedGame.players.length}人`, 
                        inline: true 
                    },
                    { 
                        name: "📋 参加者リスト", 
                        value: playerList, 
                        inline: false 
                    }
                )
                .setColor(0xff6b6b)
                .setTimestamp()
                .setFooter({ text: `Game ID: ${gameId}` });

            // カード提示ボタンと強制終了ボタンを作成
            const playButton = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${CustomIds.ItoPlay}${gameId}`)
                        .setLabel("カードを提示")
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji("🃏"),
                    new ButtonBuilder()
                        .setCustomId(CustomIds.ItoForceEnd)
                        .setLabel("強制終了")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("⏹️")
                );

            await this.interaction.update({
                embeds: [embed],
                components: [playButton],
            });

            // 各参加者に手札をDMで送信
            await this.sendPlayerCards(gameId, startedGame, topic);

            Logger.info(`itoゲームを開始しました: ${gameId} by ${this.interaction.user.username}`);

        } catch (error) {
            Logger.error(`ito開始ボタンエラー: ${error}`);
            await this.interaction.reply({
                content: "ゲーム開始中にエラーが発生しました。",
                ephemeral: true,
            });
        }
    }

    /**
     * 各参加者に手札をDMで送信
     */
    private async sendPlayerCards(gameId: string, game: any, topic: any): Promise<void> {
        try {
            for (const player of game.players) {
                const cards = await CardManager.getPlayerCards(gameId, player.player.discordId);
                
                if (cards.length === 0) continue;

                // カードを数字順にソート
                const sortedCards = cards.sort((a, b) => a.number - b.number);
                const cardList = sortedCards.map(card => `**${card.number}**`).join(", ");

                // 手札用の埋め込みメッセージを作成
                const handEmbed = new EmbedBuilder()
                    .setTitle("🃏 あなたの手札")
                    .setDescription("ゲーム開始！あなたの手札をお知らせします。")
                    .addFields(
                        { 
                            name: "📝 お題", 
                            value: `**${topic.title}**\n${topic.description}`, 
                            inline: false 
                        },
                        { 
                            name: "🃏 手札", 
                            value: cardList, 
                            inline: false 
                        },
                        { 
                            name: "📊 設定", 
                            value: `数字範囲: ${game.minNumber}-${game.maxNumber}\nカード枚数: ${game.cardCount}枚\n全体失敗数上限: ${game.hp}`, 
                            inline: true 
                        },
                        { 
                            name: "👥 参加者", 
                            value: `${game.players.length}人`, 
                            inline: true 
                        }
                    )
                    .setColor(0x00ff00)
                    .setTimestamp();

                // 各参加者にDMで手札を送信
                try {
                    const user = await this.interaction.client.users.fetch(player.player.discordId);
                    await user.send({
                        content: `🎮 **itoゲーム開始！**\nチャンネル: <#${game.channelId}>`,
                        embeds: [handEmbed],
                    });
                } catch (sendError) {
                    Logger.error(`手札送信エラー (${player.player.discordId}): ${sendError}`);
                    // DMが送信できない場合は、チャンネルにメンションで通知
                    await this.interaction.followUp({
                        content: `<@${player.player.discordId}> 手札の送信に失敗しました。DMの設定を確認してください。`,
                        ephemeral: false,
                    });
                }
            }

            Logger.info(`全参加者に手札を送信しました: ${gameId}`);
        } catch (error) {
            Logger.error(`手札送信処理エラー: ${error}`);
        }
    }
}

const itoStartButton: ButtonPack = {
    id: CustomIds.ItoStart,
    instance: instance(ItoStartButton),
};

export default itoStartButton; 