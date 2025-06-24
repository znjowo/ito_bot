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
import GameManager from "~/managers/GameManager";

class ItoJoinButton extends BaseInteractionManager<ButtonInteraction> {
    protected async main(): Promise<void> {
        try {
            // カスタムIDからゲームIDを抽出
            const gameId = this.interaction.customId.replace(CustomIds.ItoJoin, "");
            
            // ゲーム情報を取得
            const game = await GameManager.getGameWithRelations(gameId);
            if (!game) {
                await this.interaction.reply({
                    content: "ゲームが見つかりません。",
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

            // 既に参加しているかチェック
            const isAlreadyJoined = game.players.some(
                player => player.player.discordId === this.interaction.user.id
            );

            if (isAlreadyJoined) {
                await this.interaction.reply({
                    content: "既に参加しています。",
                    ephemeral: true,
                });
                return;
            }

            // ゲームに参加
            await GameManager.joinGame(
                gameId,
                this.interaction.user.id,
                this.interaction.user.username
            );

            // 更新されたゲーム情報を取得
            const updatedGame = await GameManager.getGameWithRelations(gameId);
            if (!updatedGame) {
                await this.interaction.reply({
                    content: "ゲーム情報の更新に失敗しました。",
                    ephemeral: true,
                });
                return;
            }

            // 参加者リストを作成
            const playerList = updatedGame.players
                .map(player => `• ${player.player.username}`)
                .join("\n");

            // 埋め込みメッセージを更新
            const embed = new EmbedBuilder()
                .setTitle("🎮 itoゲーム募集")
                .setDescription(`${updatedGame.createdBy === this.interaction.user.id ? this.interaction.user : `<@${updatedGame.createdBy}>`} がitoゲームを開始しました！`)
                .addFields(
                    { 
                        name: "📊 設定", 
                        value: `数字範囲: ${updatedGame.minNumber}-${updatedGame.maxNumber}\nカード枚数: ${updatedGame.cardCount}枚\nライフ: ${updatedGame.hp}`, 
                        inline: true 
                    },
                    { 
                        name: "👥 参加者", 
                        value: `${updatedGame.players.length}人`, 
                        inline: true 
                    },
                    { 
                        name: "📋 参加者リスト", 
                        value: playerList, 
                        inline: false 
                    }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            // ボタンを更新（最低2人で開始可能）
            const canStart = updatedGame.players.length >= 2;
            const joinButton = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${CustomIds.ItoJoin}${gameId}`)
                        .setLabel("参加する")
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji("🎯"),
                    new ButtonBuilder()
                        .setCustomId(`${CustomIds.ItoStart}${gameId}`)
                        .setLabel("ゲーム開始")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji("▶️")
                        .setDisabled(!canStart)
                );

            await this.interaction.update({
                embeds: [embed],
                components: [joinButton],
            });

            Logger.info(`プレイヤーが参加しました: ${this.interaction.user.username} (${gameId})`);

        } catch (error) {
            Logger.error(`ito参加ボタンエラー: ${error}`);
            await this.interaction.reply({
                content: "参加処理中にエラーが発生しました。",
                ephemeral: true,
            });
        }
    }
}

const itoJoinButton: ButtonPack = {
    id: CustomIds.ItoJoin,
    instance: instance(ItoJoinButton),
};

export default itoJoinButton; 