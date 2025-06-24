// ANSIエスケープシーケンスの定数
const ANSI = {
    RESET: '\u001b[0m',
    START: '\u001b[',
    END: 'm',
} as const;

// スタイルの定義
const STYLE = {
    NORMAL: 0,
    BOLD: 1,
    DIM: 2,
    UNDERLINE: 4,
} as const;

// テキストカラーの定義
const TEXT_COLOR = {
    GRAY: 30,
    RED: 31,
    GREEN: 32,
    YELLOW: 33,
    BLUE: 34,
    PINK: 35,
    CYAN: 36,
    WHITE: 37,
} as const;

// 背景色の定義
const BG_COLOR = {
    DARKBLUE: 40,
    ORANGE: 41,
    GRAY: 42,
    LIGHTGRAY: 43,
    LIGHTERGRAY: 44,
    INDIGO: 45,
    GRAY2: 46,
    WHITE: 47,
} as const;

// 型定義
type Style = keyof typeof STYLE;
type TextColor = keyof typeof TEXT_COLOR;
type BgColor = keyof typeof BG_COLOR;

interface AnsiOptions {
    text: string;
    style?: Style;
    color?: TextColor;
    bg?: BgColor | null;
}

export default class AnsiColor {
    private static instance: AnsiColor;

    private constructor() {}

    /**
     * シングルトンインスタンスを取得する
     */
    public static getInstance(): AnsiColor {
        if (!AnsiColor.instance) {
            AnsiColor.instance = new AnsiColor();
        }
        return AnsiColor.instance;
    }

    /**
     * ANSIエスケープシーケンスでテキストを装飾する
     */
    public format({ text, style = 'NORMAL', color = 'WHITE', bg = null }: AnsiOptions): string {
        const styleCode = STYLE[style] ?? STYLE.NORMAL;
        const colorCode = TEXT_COLOR[color] ?? TEXT_COLOR.WHITE;
        const bgCode = bg ? (BG_COLOR[bg] ?? BG_COLOR.DARKBLUE) : null;

        const code = bgCode != null 
            ? `${styleCode};${colorCode};${bgCode}` 
            : `${styleCode};${colorCode}`;

        return `${ANSI.START}${code}${ANSI.END}${text}${ANSI.RESET}`;
    }

    /**
     * エラーメッセージ用の装飾
     */
    public error(text: string): string {
        return this.format({ text, style: 'BOLD', color: 'RED' });
    }

    /**
     * 警告メッセージ用の装飾
     */
    public warn(text: string): string {
        return this.format({ text, style: 'BOLD', color: 'YELLOW' });
    }

    /**
     * 情報メッセージ用の装飾
     */
    public info(text: string): string {
        return this.format({ text, style: 'NORMAL', color: 'CYAN' });
    }

    /**
     * 成功メッセージ用の装飾
     */
    public success(text: string): string {
        return this.format({ text, style: 'BOLD', color: 'GREEN' });
    }

    /**
     * デバッグメッセージ用の装飾
     */
    public debug(text: string): string {
        return this.format({ text, style: 'DIM', color: 'GRAY' });
    }

    /**
     * タイムスタンプ用の装飾
     */
    public timestamp(text: string): string {
        return this.format({ text, style: 'DIM', color: 'WHITE' });
    }

    /**
     * レベル表示用の装飾
     */
    public level(level: string): string {
        const colorMap: Record<string, TextColor> = {
            'ERROR': 'RED',
            'WARN': 'YELLOW',
            'INFO': 'CYAN',
            'DEBUG': 'GRAY',
            'SUCCESS': 'GREEN'
        };

        const color = colorMap[level] || 'WHITE';
        return this.format({ text: level, style: 'BOLD', color });
    }

    /**
     * 強調表示用の装飾
     */
    public highlight(text: string): string {
        return this.format({ text, style: 'BOLD', color: 'PINK' });
    }

    /**
     * コード表示用の装飾
     */
    public code(text: string): string {
        return this.format({ text, style: 'NORMAL', color: 'BLUE', bg: 'LIGHTGRAY' });
    }
} 