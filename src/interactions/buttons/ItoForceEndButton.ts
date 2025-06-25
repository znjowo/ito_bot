import { GameStatus } from "@prisma/client";
import { ButtonInteraction, ComponentType, EmbedBuilder } from "discord.js";
import { ButtonPack, instance } from "~/interfaces/IDiscord";
import { CustomIds } from "~/interfaces/IEnum";
import { DIContainer } from "~/lib/DIContainer";
import { Logger } from "~/lib/Logger";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";

class ItoForceEndButton extends BaseInteractionManager<ButtonInteraction> {
    private gameService = DIContainer.getInstance().getGameService();
    private cardService = DIContainer.getInstance().getCardService();

    protected async main(): Promise<void> {
        try {
            // 現在のメッセージからゲームIDを探す
            let gameId: string | null = null;

            // メッセージのボタンからゲームIDを抽出
            for (const actionRow of this.interaction.message.components) {
                if (actionRow.type === ComponentType.ActionRow) {
                    for (const component of actionRow.components) {
                        if (
                            component.type === ComponentType.Button &&
                            component.customId?.includes(CustomIds.ItoPlay)
                        ) {
                            gameId = component.customId.replace(
                                CustomIds.ItoPlay,
                                ""
                            );
                            break;
                        }
                    }
                    if (gameId) break;
                }
            }

            if (!gameId) {
                await this.interaction.reply({
                    content: "ゲームIDが見つかりません。",
                    ephemeral: true,
                });
                return;
            }

            // ゲーム情報を取得
            const game = await this.gameService.getGameById(gameId);
            if (!game) {
                await this.interaction.reply({
                    content: "ゲームが見つかりません。",
                    ephemeral: true,
                });
                return;
            }

            // 管理者チェック（ゲーム作成者のみが強制終了可能）
            if (!game.isCreator(this.interaction.user.id)) {
                await this.interaction.reply({
                    content: "ゲーム作成者のみが強制終了できます。",
                    ephemeral: true,
                });
                return;
            }

            // 全カードを開示
            const allCards = await this.cardService.revealAllCards(gameId);
            const playerCards = new Map<
                string,
                { username: string; cards: number[]; eliminatedCards: number[] }
            >();

            for (const cardData of allCards) {
                const key = cardData.player.discordId;
                if (!playerCards.has(key)) {
                    playerCards.set(key, {
                        username: cardData.player.username,
                        cards: [],
                        eliminatedCards: [],
                    });
                }

                if (cardData.isEliminated) {
                    playerCards.get(key)!.eliminatedCards.push(cardData.number);
                } else {
                    playerCards.get(key)!.cards.push(cardData.number);
                }
            }

            // 強制終了メッセージを作成
            const embed = new EmbedBuilder()
                .setTitle("⏹️ ゲーム強制終了")
                .setDescription(
                    `${this.interaction.user} により強制終了されました。`
                )
                .setColor(0x808080)
                .setTimestamp();

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

            // ゲームを終了
            await this.gameService.endGame(gameId, GameStatus.CANCELLED);

            // メッセージを更新（ボタンを削除）
            await this.interaction.update({
                embeds: [embed],
                components: [],
            });

            Logger.info(
                `ゲームが強制終了されました: ${gameId} by ${this.interaction.user.username}`
            );
        } catch (error) {
            Logger.error(`ito強制終了ボタンエラー: ${error}`);
            await this.interaction.reply({
                content: "強制終了処理中にエラーが発生しました。",
                ephemeral: true,
            });
        }
    }
}

const itoForceEndButton: ButtonPack = {
    id: CustomIds.ItoForceEnd,
    instance: instance(ItoForceEndButton),
};

export default itoForceEndButton;
