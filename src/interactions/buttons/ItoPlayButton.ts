import { GameStatus } from "@prisma/client";
import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { ButtonPack, instance } from "~/interfaces/IDiscord";
import { CustomIds } from "~/interfaces/IEnum";
import { Logger } from "~/lib/Logger";
import BaseInteractionManager from "~/managers/bases/BaseInteractionManager";
import CardManager from "~/managers/CardManager";
import GameManager from "~/managers/GameManager";

class ItoPlayButton extends BaseInteractionManager<ButtonInteraction> {
    protected async main(): Promise<void> {
        try {
            // カスタムIDからゲームIDを抽出
            const gameId = this.interaction.customId.replace(CustomIds.ItoPlay, "");
            
            // ゲーム情報を取得
            const game = await GameManager.getGameWithRelations(gameId);
            if (!game) {
                await this.interaction.reply({
                    content: "ゲームが見つかりません。",
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

            // プレイヤーがゲームオーバーかチェック
            const isGameOver = await CardManager.isPlayerGameOver(gameId, this.interaction.user.id);
            if (isGameOver) {
                await this.interaction.reply({
                    content: "あなたは既にゲームオーバーです。",
                    ephemeral: true,
                });
                return;
            }

            // カードを提示
            const card = await CardManager.playCard(gameId, this.interaction.user.id);
            if (!card) {
                await this.interaction.reply({
                    content: "提示できるカードがありません。",
                    ephemeral: true,
                });
                return;
            }

            // 他のプレイヤーのカードと比較
            const otherCards = await CardManager.getRemainingCardCount(gameId);
            const isCorrect = await CardManager.isCorrectCard(gameId, card.number, this.interaction.user.id);

            // 結果を判定
            if (isCorrect) {
                // 正解の場合、成功処理
                await this.handleSuccess(gameId, card, game);
            } else {
                // 不正解の場合、失敗処理
                await this.handleFailure(gameId, card, game);
            }

        } catch (error) {
            Logger.error(`itoカード提示ボタンエラー: ${error}`);
            await this.interaction.reply({
                content: "カード提示中にエラーが発生しました。",
                ephemeral: true,
            });
        }
    }

    /**
     * ゲーム募集メッセージを更新
     */
    private async updateGameMessage(gameId: string, embed: EmbedBuilder): Promise<void> {
        try {
            const gameMessage = await GameManager.getGameMessage(gameId);
            if (!gameMessage) {
                // メッセージ情報が見つからない場合は通常の返信
                await this.interaction.reply({
                    embeds: [embed],
                });
                return;
            }

            // チャンネルを取得
            const channel = await this.interaction.client.channels.fetch(gameMessage.channelId);
            if (!channel?.isTextBased()) {
                await this.interaction.reply({
                    content: "チャンネルが見つかりません。",
                    ephemeral: true,
                });
                return;
            }

            // メッセージを編集
            await channel.messages.edit(gameMessage.messageId, {
                embeds: [embed],
            });

            // ボタン操作を確認
            await this.interaction.deferUpdate();
        } catch (error) {
            Logger.error(`ゲームメッセージ更新エラー: ${error}`);
            // エラーの場合は通常の返信
            await this.interaction.reply({
                embeds: [embed],
            });
        }
    }

    /**
     * 成功時の処理
     */
    private async handleSuccess(gameId: string, card: any, game: any): Promise<void> {
        // 成功処理（場にカードを追加）
        await CardManager.handleCardSuccess(gameId, card.number);

        // 更新されたゲーム情報を取得
        const updatedGame = await GameManager.getGameWithRelations(gameId);
        if (!updatedGame) return;

        // 場のカードを取得
        const revealedCards = await CardManager.getRevealedCardsWithPlayers(gameId);
        const revealedCardsText = revealedCards.length > 0 
            ? revealedCards.map(card => `**${card.playerName}**: ${card.number}`).join("\n")
            : "なし";

        const embed = new EmbedBuilder()
            .setTitle("✅ カード提示成功！")
            .setDescription(`${this.interaction.user} が **${card.number}** を提示しました`)
            .addFields(
                { name: "🎯 結果", value: "正解でした！場にカードを追加", inline: true },
                { name: "👤 プレイヤー", value: this.interaction.user.username, inline: true },
                { name: "💔 失敗数", value: `${updatedGame.failureCount}/${updatedGame.hp}`, inline: true },
                { name: "🃏 場のカード", value: revealedCardsText, inline: false }
            )
            .setColor(0x00ff00)
            .setTimestamp()
            .setFooter({ text: `Game ID: ${gameId}` });

        // ゲームクリアかチェック
        const isGameClear = await CardManager.isGameClear(gameId);
        if (isGameClear) {
            embed.setTitle("🎉 ゲームクリア！")
                .setDescription("全員が手札を出し切りました！")
                .setColor(0xffd700);

            // 全カードを開示
            const allCards = await CardManager.revealAllCards(gameId);
            const playerCards = new Map<string, { username: string; cards: number[] }>();
            
            for (const cardData of allCards) {
                const key = cardData.player.discordId;
                if (!playerCards.has(key)) {
                    playerCards.set(key, {
                        username: cardData.player.username,
                        cards: []
                    });
                }
                playerCards.get(key)!.cards.push(cardData.number);
            }

            for (const [discordId, playerData] of playerCards) {
                const sortedCards = playerData.cards.sort((a, b) => a - b);
                const cardList = sortedCards.map(num => `**${num}**`).join(", ");
                
                embed.addFields({
                    name: `👤 ${playerData.username}`,
                    value: `カード: ${cardList}`,
                    inline: false
                });
            }

            // ゲームを終了
            await GameManager.endGame(gameId, GameStatus.FINISHED);
        }

        // ゲーム募集メッセージを編集
        await this.updateGameMessage(gameId, embed);
    }

    /**
     * 失敗時の処理
     */
    private async handleFailure(gameId: string, card: any, game: any): Promise<void> {
        // 失敗処理（全体の失敗数カウントとカード削除）
        await CardManager.handleCardFailure(gameId, this.interaction.user.id, card.number);

        // 更新されたゲーム情報を取得
        const updatedGame = await GameManager.getGameWithRelations(gameId);
        if (!updatedGame) return;

        // 全体のゲームオーバーかチェック
        const isGameOver = await CardManager.isGameOver(gameId);

        // 場のカードを取得
        const revealedCards = await CardManager.getRevealedCardsWithPlayers(gameId);
        const revealedCardsText = revealedCards.length > 0 
            ? revealedCards.map(card => `**${card.playerName}**: ${card.number}`).join("\n")
            : "なし";

        const embed = new EmbedBuilder()
            .setTitle("❌ カード提示失敗！")
            .setDescription(`${this.interaction.user} が **${card.number}** を提示しました`)
            .addFields(
                { name: "🎯 結果", value: "不正解でした", inline: true },
                { name: "👤 プレイヤー", value: this.interaction.user.username, inline: true },
                { name: "💔 失敗数", value: `${updatedGame.failureCount}/${updatedGame.hp}`, inline: true },
                { name: "🃏 場のカード", value: revealedCardsText, inline: false }
            )
            .setColor(0xff0000)
            .setTimestamp()
            .setFooter({ text: `Game ID: ${gameId}` });

        if (isGameOver) {
            // ゲームオーバーの原因を判定
            const remainingCards = await CardManager.getRemainingCardCount(gameId);
            
            if (remainingCards === 0) {
                embed.setTitle("💀 ゲームオーバー！")
                    .setDescription("カードが全部削除されました！")
                    .setColor(0x8b0000);
            } else {
                embed.setTitle("💀 ゲームオーバー！")
                    .setDescription("全体の失敗数が上限に達しました！")
                    .setColor(0x8b0000);
            }

            // 全カードを開示
            const allCards = await CardManager.revealAllCards(gameId);
            const playerCards = new Map<string, { username: string; cards: number[]; eliminatedCards: number[] }>();
            
            for (const cardData of allCards) {
                const key = cardData.player.discordId;
                if (!playerCards.has(key)) {
                    playerCards.set(key, {
                        username: cardData.player.username,
                        cards: [],
                        eliminatedCards: []
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
                    .join(', ');
                
                const eliminatedCards = playerData.eliminatedCards
                    .sort((a, b) => a - b)
                    .map(num => `~~${num}~~`)
                    .join(', ');
                
                let cardDisplay = '';
                if (activeCards) {
                    cardDisplay += `**手札**: ${activeCards}`;
                }
                if (eliminatedCards) {
                    if (cardDisplay) cardDisplay += '\n';
                    cardDisplay += `**削除済み**: ${eliminatedCards}`;
                }
                if (!cardDisplay) {
                    cardDisplay = 'カードなし';
                }
                
                embed.addFields({
                    name: `👤 ${playerData.username}`,
                    value: cardDisplay,
                    inline: false
                });
            }

            // ゲームを終了
            await GameManager.endGame(gameId, GameStatus.FINISHED);
        }

        // ゲーム募集メッセージを編集
        await this.updateGameMessage(gameId, embed);
    }
}

const itoPlayButton: ButtonPack = {
    id: CustomIds.ItoPlay,
    instance: instance(ItoPlayButton),
};

export default itoPlayButton; 