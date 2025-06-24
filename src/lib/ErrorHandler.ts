import Config from "./Config";
import { Logger } from "./Logger";

export default class ErrorHandler {
    private static instance: ErrorHandler;
    private config: Config;

    private constructor() {
        this.config = Config.getInstance();
    }

    /**
     * シングルトンインスタンスを取得する
     */
    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * エラーを処理する
     * @param error エラーオブジェクト
     * @param context エラーが発生したコンテキスト
     */
    public handleError(error: Error | string, context?: string): void {
        const errorMessage = typeof error === "string" ? error : error.message;
        const errorStack = error instanceof Error ? error.stack : undefined;
        const contextInfo = context ? `[${context}] ` : "";

        Logger.error(`${contextInfo}エラーが発生しました: ${errorMessage}`);

        if (errorStack) {
            Logger.error(`スタックトレース:\n${errorStack}`);
        }
    }

    /**
     * 非同期処理のエラーを処理する
     * @param promise Promise
     * @param context エラーが発生したコンテキスト
     */
    public async handleAsyncError<T>(
        promise: Promise<T>,
        context?: string
    ): Promise<T | null> {
        try {
            return await promise;
        } catch (error) {
            this.handleError(error as Error, context);
            return null;
        }
    }

    /**
     * 関数の実行をエラーハンドリングでラップする
     * @param fn 実行する関数
     * @param context エラーが発生したコンテキスト
     * @returns 実行結果またはnull
     */
    public async wrapFunction<T>(
        fn: () => Promise<T>,
        context?: string
    ): Promise<T | null> {
        try {
            return await fn();
        } catch (error) {
            this.handleError(error as Error, context);
            return null;
        }
    }

    /**
     * 同期的な関数の実行をエラーハンドリングでラップする
     * @param fn 実行する関数
     * @param context エラーが発生したコンテキスト
     * @returns 実行結果またはnull
     */
    public wrapSyncFunction<T>(fn: () => T, context?: string): T | null {
        try {
            return fn();
        } catch (error) {
            this.handleError(error as Error, context);
            return null;
        }
    }

    /**
     * 致命的なエラーを処理する
     * @param error エラーオブジェクト
     * @param context エラーが発生したコンテキスト
     */
    public handleFatalError(error: Error | string, context?: string): void {
        this.handleError(error, context);
        Logger.error(
            "致命的なエラーが発生しました。アプリケーションを終了します。"
        );
        process.exit(1);
    }
}
