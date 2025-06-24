import { GameStatus } from "@prisma/client";
import {
    ActionRowBuilder,
    ButtonInteraction,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import { ButtonPack, instance } from "~/interfaces/IDiscord";
import { CustomIds } from "~/interfaces/IEnum";
import { DIContainer } from "~/lib/DIContainer";
import { Logger } from "~/lib/Logger";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";

class ItoPlayButton extends BaseInteractionManager<ButtonInteraction> {
    private gameService = DIContainer.getInstance().getGameService();
    private cardService = DIContainer.getInstance().getCardService();

    protected async main(): Promise<void> {
        try {
            // カスタムIDからゲームIDを抽出
            const gameId = this.interaction.customId.replace(CustomIds.ItoPlay, "");
            
            // ゲーム情報を取得
            const game = await this.gameService.getGameById(gameId);
            if (!game) {
                await this.interaction.reply({
                    content: "ゲームが見つかりません。",
                    ephemeral: true,
                });
                return;
            }

            // ゲームが進行中でない場合はエラー
            if (!game.isPlaying()) {
                await this.interaction.reply({
                    content: "ゲームが進行中ではありません。",
                    ephemeral: true,
                });
                return;
            }

            // プレイヤーがゲームオーバーかチェック
            const playerRemainingCards = await this.cardService.getPlayerRemainingCardCount(
                gameId,
                this.interaction.user.id
            );

            if (playerRemainingCards === 0) {
                await this.interaction.reply({
                    content: "あなたはもうカードを持っていません。",
                    ephemeral: true,
                });
                return;
            }

            // モーダルを表示してカード番号を入力してもらう
            const modal = new ModalBuilder()
                .setCustomId(`card_input_${gameId}`)
                .setTitle("カード提示");

            const cardInput = new TextInputBuilder()
                .setCustomId("card_number")
                .setLabel("提示するカード番号を入力してください")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(10);

            const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(cardInput);
            modal.addComponents(firstActionRow);

            await this.interaction.showModal(modal);

            // モーダルの送信を待つ
            const submitted = await this.interaction.awaitModalSubmit({
                time: 60000,
                filter: i => i.user.id === this.interaction.user.id && i.customId === `card_input_${gameId}`,
            });

            const cardNumberStr = submitted.fields.getTextInputValue("card_number");
            const cardNumber = parseInt(cardNumberStr);

            if (isNaN(cardNumber)) {
                await submitted.reply({
                    content: "有効な数字を入力してください。",
                    ephemeral: true,
                });
                return;
            }

            // カードを提示
            const card = await this.cardService.playCard(gameId, this.interaction.user.id);
            if (!card) {
                await submitted.reply({
                    content: "提示できるカードがありません。",
                    ephemeral: true,
                });
                return;
            }

            // 入力された番号と実際のカード番号をチェック
            if (card.number !== cardNumber) {
                await submitted.reply({
                    content: `入力された番号 (${cardNumber}) と実際のカード番号 (${card.number}) が異なります。最小値のカード (${card.number}) が自動で提示されました。`,
                    ephemeral: true,
                });
            }

            // 他の参加者の残りカード数を取得
            const otherCards = await this.cardService.getRemainingCardCount(gameId);
            const isCorrect = await this.cardService.isCorrectCard(
                gameId,
                card.number,
                this.interaction.user.id
            );

            if (isCorrect) {
                await this.handleSuccess(gameId, card, game);
                await submitted.deferUpdate();
            } else {
                await this.handleFailure(gameId, card, game);
                await submitted.deferUpdate();
            }
        } catch (error) {
            Logger.error(`itoプレイボタンエラー: ${error}`);
            
            // エラーハンドリング - どのインタラクションが利用可能かチェック
            try {
                if (this.interaction.deferred || this.interaction.replied) {
                    await this.interaction.followUp({
                        content: "カード提示中にエラーが発生しました。",
                        ephemeral: true,
                    });
                } else {
                    await this.interaction.reply({
                        content: "カード提示中にエラーが発生しました。",
                        ephemeral: true,
                    });
                }
            } catch (replyError) {
                Logger.error(`エラーレスポンス送信失敗: ${replyError}`);
            }
        }
    }

    /**
     * カード提示成功時の処理
     */
    private async handleSuccess(
        gameId: string,
        card: any,
        game: any
    ): Promise<void> {
        try {
            // カードを場に追加
            await this.cardService.handleCardSuccess(gameId, card.number);

            // 更新されたゲーム情報を取得
            const updatedGame = await this.gameService.getGameById(gameId);
            if (!updatedGame) return;

            // 場のカードを取得
            const revealedCardsWithPlayers = await this.cardService.getRevealedCardsWithPlayers(gameId);

            // 場のカード表示を作成
            const fieldCards = revealedCardsWithPlayers.length > 0
                ? revealedCardsWithPlayers
                    .map(card => `**${card.playerName}**: ${card.number}`)
                    .join("\n")
                : "まだカードが出されていません";

            // 成功メッセージを作成
            const embed = new EmbedBuilder()
                .setTitle("✅ カード提示成功！")
                .setDescription(`${this.interaction.user} がカード **${card.number}** を提示しました！`)
                .addFields(
                    {
                        name: "📊 現在の状況",
                        value: `失敗回数: ${updatedGame.failureCount}/${updatedGame.hp}`,
                        inline: true,
                    },
                    {
                        name: "🃏 場のカード",
                        value: fieldCards,
                        inline: false,
                    }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            // ゲームクリアかチェック
            const isGameClear = await this.cardService.isGameClear(gameId);

            if (isGameClear) {
                embed
                    .setTitle("🎉 ゲームクリア！")
                    .setDescription("全員が手札を出し切りました！")
                    .setColor(0xffd700);

                // 全カードを開示
                const allCards = await this.cardService.revealAllCards(gameId);
                const playerCards = new Map<
                    string,
                    { username: string; cards: number[] }
                >();

                for (const cardData of allCards) {
                    const key = cardData.player.discordId;
                    if (!playerCards.has(key)) {
                        playerCards.set(key, {
                            username: cardData.player.username,
                            cards: [],
                        });
                    }
                    playerCards.get(key)!.cards.push(cardData.number);
                }

                for (const [discordId, playerData] of playerCards) {
                    const sortedCards = playerData.cards.sort((a, b) => a - b);
                    const cardList = sortedCards
                        .map(num => `**${num}**`)
                        .join(", ");

                    embed.addFields({
                        name: `👤 ${playerData.username}`,
                        value: `カード: ${cardList}`,
                        inline: false,
                    });
                }

                // ゲームを終了
                await this.gameService.endGame(gameId, GameStatus.FINISHED);
            }

            // ゲーム募集メッセージを編集
            await this.updateGameMessage(gameId, embed);
        } catch (error) {
            Logger.error(`カード成功処理エラー: ${error}`);
        }
    }

    /**
     * カード提示失敗時の処理
     */
    private async handleFailure(
        gameId: string,
        card: any,
        game: any
    ): Promise<void> {
        try {
            // 失敗処理を実行
            await this.cardService.handleCardFailure(
                gameId,
                this.interaction.user.id,
                card.number
            );

            // 更新されたゲーム情報を取得
            const updatedGame = await this.gameService.getGameById(gameId);
            if (!updatedGame) return;

            // 場のカードを取得
            const revealedCardsWithPlayers = await this.cardService.getRevealedCardsWithPlayers(gameId);

            // 場のカード表示を作成
            const fieldCards = revealedCardsWithPlayers.length > 0
                ? revealedCardsWithPlayers
                    .map(card => `**${card.playerName}**: ${card.number}`)
                    .join("\n")
                : "まだカードが出されていません";

            // 失敗メッセージを作成
            const embed = new EmbedBuilder()
                .setTitle("❌ カード提示失敗！")
                .setDescription(`${this.interaction.user} がカード **${card.number}** を提示しましたが、失敗しました。`)
                .addFields(
                    {
                        name: "📊 現在の状況",
                        value: `失敗回数: ${updatedGame.failureCount}/${updatedGame.hp}`,
                        inline: true,
                    },
                    {
                        name: "🃏 場のカード",
                        value: fieldCards,
                        inline: false,
                    }
                )
                .setColor(0xff0000)
                .setTimestamp();

            // ゲームオーバーかチェック
            const isGameOver = await this.cardService.isGameOver(gameId);

            if (isGameOver) {
                // ゲームオーバーの原因を判定
                const remainingCards = await this.cardService.getRemainingCardCount(gameId);

                if (remainingCards === 0) {
                    embed
                        .setTitle("💀 ゲームオーバー！")
                        .setDescription("カードが全部削除されました！")
                        .setColor(0x8b0000);
                } else {
                    embed
                        .setTitle("💀 ゲームオーバー！")
                        .setDescription("全体の失敗数が上限に達しました！")
                        .setColor(0x8b0000);
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
                await this.gameService.endGame(gameId, GameStatus.FINISHED);
            }

            // ゲーム募集メッセージを編集
            await this.updateGameMessage(gameId, embed);
        } catch (error) {
            Logger.error(`カード失敗処理エラー: ${error}`);
        }
    }

    /**
     * ゲームメッセージを更新
     */
    private async updateGameMessage(gameId: string, embed: EmbedBuilder): Promise<void> {
        try {
            const gameMessage = await this.gameService.getGameMessage(gameId);
            if (!gameMessage) return;

            const channel = await this.interaction.client.channels.fetch(gameMessage.channelId);
            if (!channel || !channel.isTextBased()) return;

            const message = await channel.messages.fetch(gameMessage.messageId);
            if (!message) return;

            await message.edit({
                embeds: [embed],
                components: message.components, // 既存のボタンを保持
            });
        } catch (error) {
            Logger.error(`ゲームメッセージ更新エラー: ${error}`);
        }
    }
}

const itoPlayButton: ButtonPack = {
    id: CustomIds.ItoPlay,
    instance: instance(ItoPlayButton),
};

export default itoPlayButton;
