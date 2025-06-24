import Database from "../lib/Database";
import { Logger } from "../lib/Logger";
import TopicManager from "../managers/TopicManager";

async function initDatabase() {
    try {
        Logger.info("データベース初期化を開始します...");

        // データベースに接続
        await Database.connect();

        // サンプルお題を作成
        Logger.info("サンプルお題を作成中...");
        await TopicManager.createSampleTopics();

        Logger.info("データベース初期化が完了しました！");
    } catch (error) {
        Logger.error(`データベース初期化エラー: ${error}`);
        process.exit(1);
    } finally {
        await Database.disconnect();
    }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
    initDatabase();
}

export default initDatabase;
