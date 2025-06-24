import {
    ColorResolvable,
    Colors,
    EmbedBuilder,
    WebhookClient,
    codeBlock,
} from "discord.js";
import AnsiColor from "./AnsiColor";
import Env from "./Env";

export class Logger {
    /* === Private 変数 === */
    private static _webhook = new WebhookClient({ url: Env.logWebhookUrl });
    private static _messageBuffer: Array<{ content: string; color: ColorResolvable; level: string }> = [];
    private static _bufferTimer: NodeJS.Timeout | null = null;
    private static readonly MAX_EMBED_LENGTH = 4000;
    private static readonly BUFFER_FLUSH_INTERVAL = 10000; // 10秒
    private static readonly MAX_BUFFER_SIZE = 5; // 5件でフラッシュ
    private static _ansi = AnsiColor.getInstance();

    /* === Public 関数 === */

    public static error(content: string) {
        this.log(content, Colors.Red, "ERROR");
    }

    public static warn(content: string) {
        this.log(content, Colors.Yellow, "WARN");
    }

    public static info(content: string) {
        this.log(content, Colors.Blue, "INFO");
    }

    public static debug(content: string) {
        this.log(content, Colors.Grey, "DEBUG");
    }

    public static success(content: string) {
        this.log(content, Colors.Green, "SUCCESS");
    }

    public static flushBuffer(): void {
        this.flushMessageBuffer();
    }

    /* === Private 関数 === */

    private static log(content: string, color: ColorResolvable, level: string) {
        // コンソール出力（カラー付き）
        const timestamp = new Date().toLocaleTimeString();
        const coloredTimestamp = this._ansi.timestamp(`[${timestamp}]`);
        const coloredLevel = this._ansi.level(level);
        const coloredContent = this.colorizeContent(content, level);
        
        console.log(`${coloredTimestamp} ${coloredLevel}: ${coloredContent}`);

        // Webhook用にバッファに追加
        this._messageBuffer.push({ content, color, level });

        if (this._messageBuffer.length >= this.MAX_BUFFER_SIZE) {
            this.flushMessageBuffer();
        } else {
            this.scheduleBufferFlush();
        }
    }

    private static colorizeContent(content: string, level: string): string {
        // エラーメッセージの色付け
        if (level === 'ERROR') {
            return this._ansi.error(content);
        }
        
        // 警告メッセージの色付け
        if (level === 'WARN') {
            return this._ansi.warn(content);
        }
        
        // 成功メッセージの色付け
        if (level === 'SUCCESS') {
            return this._ansi.success(content);
        }
        
        // 情報メッセージの色付け
        if (level === 'INFO') {
            return this._ansi.info(content);
        }
        
        // デバッグメッセージの色付け
        if (level === 'DEBUG') {
            return this._ansi.debug(content);
        }
        
        return content;
    }

    private static scheduleBufferFlush(): void {
        if (this._bufferTimer) {
            clearTimeout(this._bufferTimer);
        }
        this._bufferTimer = setTimeout(() => {
            this.flushMessageBuffer();
        }, this.BUFFER_FLUSH_INTERVAL);
    }

    private static flushMessageBuffer(): void {
        if (this._messageBuffer.length === 0) return;

        try {
            // 同じ色のメッセージをグループ化
            const groups = this.groupMessagesByColor();
            
            for (const group of groups) {
                this.sendGroupedMessages(group);
            }

            this._messageBuffer = [];
            
            if (this._bufferTimer) {
                clearTimeout(this._bufferTimer);
                this._bufferTimer = null;
            }
        } catch (error) {
            console.error('Webhook送信エラー:', error);
        }
    }

    private static groupMessagesByColor(): Array<{ color: ColorResolvable; messages: Array<{ content: string; level: string }> }> {
        const groups: Map<string, { color: ColorResolvable; messages: Array<{ content: string; level: string }> }> = new Map();

        for (const item of this._messageBuffer) {
            const key = item.color.toString();
            if (!groups.has(key)) {
                groups.set(key, { color: item.color, messages: [] });
            }
            groups.get(key)!.messages.push({ content: item.content, level: item.level });
        }

        return Array.from(groups.values());
    }

    private static sendGroupedMessages(group: { color: ColorResolvable; messages: Array<{ content: string; level: string }> }): void {
        const { color, messages } = group;
        
        // メッセージをANSIエスケープシーケンス付きでフォーマット
        const formattedMessages = messages.map(msg => {
            const timestamp = new Date().toLocaleTimeString();
            const coloredTimestamp = this._ansi.timestamp(`[${timestamp}]`);
            const coloredLevel = this._ansi.level(msg.level);
            const coloredContent = this.colorizeContent(msg.content, msg.level);
            
            return `${coloredTimestamp} ${coloredLevel}: ${coloredContent}`;
        });
        
        const combinedContent = formattedMessages.join('\n');
        
        // 長すぎる場合は分割
        const finalMessages = this.splitMessage(combinedContent);
        
        for (const message of finalMessages) {
        const embed = new EmbedBuilder()
                .setDescription(codeBlock('ansi', message))
            .setTimestamp()
            .setColor(color);

        this._webhook?.send({
                embeds: [embed],
                username: "Bot Logger",
            }).catch(() => {
                // エラーは無視（コンソールには既に出力済み）
        });
        }
    }

    private static splitMessage(content: string): string[] {
        if (content.length <= this.MAX_EMBED_LENGTH) {
            return [content];
        }

        const messages: string[] = [];
        let currentMessage = '';
        const lines = content.split('\n');

        for (const line of lines) {
            if ((currentMessage + line).length > this.MAX_EMBED_LENGTH) {
                if (currentMessage) {
                    messages.push(currentMessage.trim());
                    currentMessage = line + '\n';
                } else {
                    // 行自体が長すぎる場合は強制分割
                    const chunks = this.chunkString(line, this.MAX_EMBED_LENGTH);
                    messages.push(...chunks);
                }
            } else {
                currentMessage += line + '\n';
            }
        }

        if (currentMessage.trim()) {
            messages.push(currentMessage.trim());
        }

        return messages;
    }

    private static chunkString(str: string, size: number): string[] {
        const chunks: string[] = [];
        for (let i = 0; i < str.length; i += size) {
            chunks.push(str.slice(i, i + size));
        }
        return chunks;
    }
}
