import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { ButtonPack, instance } from "../../interfaces/IDiscord";
import { CustomIds } from "../../interfaces/IEnum";
import { Logger } from "../../lib/Logger";
import BaseInteractionManager from "../../managers/bases/BaseInteractionManager";
import CardManager from "../../managers/CardManager";
import GameManager from "../../managers/GameManager";

class ItoForceEndButton extends BaseInteractionManager<ButtonInteraction> {
    public static readonly customId = "ito_force_end";
    public static readonly id = CustomIds.ItoForceEnd;

    protected async main(): Promise<void> {
        try {
            await this.interaction.deferUpdate();

            const gameId =
                this.interaction.message.embeds[0]?.footer?.text?.split(
                    ": "
                )[1];
            if (!gameId) {
                await this.interaction.followUp({
                    content: "❌ ゲーム情報が見つかりません",
                    ephemeral: true,
                });
                return;
            }

            // ゲーム情報を取得
            const game = await GameManager.getGameWithRelations(gameId);
            if (!game) {
                await this.interaction.followUp({
                    content: "❌ ゲームが見つかりません",
                    ephemeral: true,
                });
                return;
            }

            // ゲーム作成者かチェック
            if (game.createdBy !== this.interaction.user.id) {
                await this.interaction.followUp({
                    content: "❌ ゲーム作成者のみが強制終了できます",
                    ephemeral: true,
                });
                return;
            }

            // ゲーム終了前に全プレイヤーのカードを取得（削除されたカードも含む）
            const allCards = await CardManager.revealAllCards(gameId);

            // プレイヤーごとにカードをグループ化
            const playerCards = new Map<
                string,
                { username: string; cards: number[]; eliminatedCards: number[] }
            >();

            for (const card of allCards) {
                const discordId = card.player.discordId;
                if (!playerCards.has(discordId)) {
                    playerCards.set(discordId, {
                        username: card.player.username,
                        cards: [],
                        eliminatedCards: [],
                    });
                }

                if (card.isEliminated) {
                    playerCards
                        .get(discordId)!
                        .eliminatedCards.push(card.number);
                } else {
                    playerCards.get(discordId)!.cards.push(card.number);
                }
            }

            // ゲーム統計情報を計算（ゲーム終了前）
            const totalCards = allCards.length;
            const remainingCards = allCards.filter(
                card => !card.isEliminated
            ).length;
            const eliminatedCards = allCards.filter(
                card => card.isEliminated
            ).length;

            // ゲームを強制終了
            await GameManager.endGame(gameId);

            // 結果メッセージを作成
            const embed = new EmbedBuilder()
                .setTitle("🎮 itoゲーム 強制終了")
                .setColor("#ff6b6b")
                .setDescription(
                    "ゲームが強制終了されました。全プレイヤーのカードを表示します。"
                )
                .setTimestamp();

            // 各プレイヤーのカードを表示
            for (const [discordId, playerData] of playerCards) {
                const activeCards = playerData.cards
                    .sort((a, b) => a - b)
                    .map(num => `**${num}**`)
                    .join(", ");

                const eliminatedCards = playerData.eliminatedCards
                    .sort((a, b) => a - b)
                    .map(num => `~~${num}~~`)
                    .join(", ");

                let cardDisplay = "";
                if (activeCards) {
                    cardDisplay += `**手札**: ${activeCards}`;
                }
                if (eliminatedCards) {
                    if (cardDisplay) cardDisplay += "\n";
                    cardDisplay += `**削除済み**: ${eliminatedCards}`;
                }
                if (!cardDisplay) {
                    cardDisplay = "カードなし";
                }

                embed.addFields({
                    name: `👤 ${playerData.username}`,
                    value: cardDisplay,
                    inline: false,
                });
            }

            // ゲーム統計情報を追加
            embed.addFields({
                name: "📊 ゲーム統計",
                value: `失敗回数: **${game.failureCount}**回\n総カード数: **${totalCards}**枚\n残りカード: **${remainingCards}**枚\n削除済み: **${eliminatedCards}**枚`,
                inline: false,
            });

            // ゲーム募集メッセージを編集
            await this.updateGameMessage(gameId, embed);

            Logger.info(
                `itoゲーム強制終了: ${gameId} by ${this.interaction.user.tag}`
            );
        } catch (error) {
            Logger.error(`強制終了ボタンエラー: ${error}`);
            await this.interaction.followUp({
                content: "❌ 強制終了処理中にエラーが発生しました",
                ephemeral: true,
            });
        }
    }

    /**
     * ゲーム募集メッセージを更新
     */
    private async updateGameMessage(
        gameId: string,
        embed: EmbedBuilder
    ): Promise<void> {
        try {
            const gameMessage = await GameManager.getGameMessage(gameId);
            if (!gameMessage) {
                // メッセージ情報が見つからない場合は通常の返信
                await this.interaction.followUp({
                    embeds: [embed],
                });
                return;
            }

            // チャンネルを取得
            const channel = await this.interaction.client.channels.fetch(
                gameMessage.channelId
            );
            if (!channel?.isTextBased()) {
                await this.interaction.followUp({
                    content: "チャンネルが見つかりません。",
                    ephemeral: true,
                });
                return;
            }

            // メッセージを編集
            await channel.messages.edit(gameMessage.messageId, {
                embeds: [embed],
                components: [], // ボタンを削除
            });

            // ボタン操作を確認
            await this.interaction.deferUpdate();
        } catch (error) {
            Logger.error(`ゲームメッセージ更新エラー: ${error}`);
            // エラーの場合は通常の返信
            await this.interaction.followUp({
                embeds: [embed],
            });
        }
    }
}

const itoForceEndButton: ButtonPack = {
    id: CustomIds.ItoForceEnd,
    instance: instance(ItoForceEndButton),
};

export default itoForceEndButton;
