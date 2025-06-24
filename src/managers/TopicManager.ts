import { Topic } from "@prisma/client";
import Database from "../lib/Database";
import { Logger } from "../lib/Logger";

interface CreateTopicOptions {
    title: string;
    description: string;
    category: string;
}

export default class TopicManager {
    private static prisma = Database.getInstance();

    /**
     * 新しいお題を作成
     */
    public static async createTopic(
        options: CreateTopicOptions
    ): Promise<Topic> {
        try {
            const topic = await this.prisma.topic.create({
                data: {
                    title: options.title,
                    description: options.description,
                    category: options.category,
                    isActive: true,
                },
            });

            Logger.info(`お題を作成しました: ${topic.title} (${topic.id})`);
            return topic;
        } catch (error) {
            Logger.error(`お題作成エラー: ${error}`);
            throw error;
        }
    }

    /**
     * ランダムなお題を取得
     */
    public static async getRandomTopic(): Promise<Topic | null> {
        try {
            const topics = await this.prisma.topic.findMany({
                where: { isActive: true },
            });

            if (topics.length === 0) {
                return null;
            }

            const randomIndex = Math.floor(Math.random() * topics.length);
            return topics[randomIndex];
        } catch (error) {
            Logger.error(`ランダムお題取得エラー: ${error}`);
            throw error;
        }
    }

    /**
     * カテゴリ別にお題を取得
     */
    public static async getTopicsByCategory(
        category: string
    ): Promise<Topic[]> {
        try {
            return await this.prisma.topic.findMany({
                where: {
                    category,
                    isActive: true,
                },
                orderBy: {
                    title: "asc",
                },
            });
        } catch (error) {
            Logger.error(`カテゴリ別お題取得エラー: ${error}`);
            throw error;
        }
    }

    /**
     * 全お題を取得
     */
    public static async getAllTopics(): Promise<Topic[]> {
        try {
            return await this.prisma.topic.findMany({
                where: { isActive: true },
                orderBy: [{ category: "asc" }, { title: "asc" }],
            });
        } catch (error) {
            Logger.error(`全お題取得エラー: ${error}`);
            throw error;
        }
    }

    /**
     * お題を更新
     */
    public static async updateTopic(
        id: string,
        options: Partial<CreateTopicOptions>
    ): Promise<Topic> {
        try {
            const topic = await this.prisma.topic.update({
                where: { id },
                data: options,
            });

            Logger.info(`お題を更新しました: ${topic.title} (${id})`);
            return topic;
        } catch (error) {
            Logger.error(`お題更新エラー: ${error}`);
            throw error;
        }
    }

    /**
     * お題を無効化
     */
    public static async deactivateTopic(id: string): Promise<void> {
        try {
            await this.prisma.topic.update({
                where: { id },
                data: { isActive: false },
            });

            Logger.info(`お題を無効化しました: ${id}`);
        } catch (error) {
            Logger.error(`お題無効化エラー: ${error}`);
            throw error;
        }
    }

    /**
     * お題を削除
     */
    public static async deleteTopic(id: string): Promise<void> {
        try {
            await this.prisma.topic.delete({
                where: { id },
            });

            Logger.info(`お題を削除しました: ${id}`);
        } catch (error) {
            Logger.error(`お題削除エラー: ${error}`);
            throw error;
        }
    }

    /**
     * サンプルお題を一括作成
     */
    public static async createSampleTopics(): Promise<void> {
        try {
            const sampleTopics = [
                // エンターテイメント
                {
                    title: "コンビニの商品の人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "100円ショップの商品の人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "飲食店の人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "駅の人気",
                    description: "人気ない - 人気ある",
                    category: "生活",
                },
                {
                    title: "中華料理の人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "学校給食の人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "有名人の人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "子供に人気なもの",
                    description: "人気ない - 人気ある",
                    category: "生活",
                },
                {
                    title: "アニメ・漫画のキャラの人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "ゲームキャラの人気（モンスター含む）",
                    description: "人気ない - 人気ある",
                    category: "ゲーム",
                },
                {
                    title: "キャラクターの人気（ゆるキャラ含む）",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "プレゼント・お土産の人気",
                    description: "人気ない - 人気ある",
                    category: "生活",
                },
                {
                    title: "建物の人気",
                    description: "人気ない - 人気ある",
                    category: "生活",
                },
                {
                    title: "住みたい国や場所の人気",
                    description: "人気ない - 人気ある",
                    category: "旅行",
                },
                {
                    title: "アプリ・ウェブサービスの人気",
                    description: "人気ない - 人気ある",
                    category: "テクノロジー",
                },
                {
                    title: "乗り物の人気",
                    description: "人気ない - 人気ある",
                    category: "生活",
                },
                {
                    title: "俳優の人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "悪役の人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "食べ物の人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "飲み物の人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "生き物の人気",
                    description: "人気ない - 人気ある",
                    category: "自然",
                },
                {
                    title: "おもちゃの人気",
                    description: "人気ない - 人気ある",
                    category: "生活",
                },
                {
                    title: "電化製品の人気",
                    description: "人気ない - 人気ある",
                    category: "テクノロジー",
                },
                {
                    title: "映画の人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "ミュージシャンの人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "お菓子・スイーツ・アイスの人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "ペットの人気",
                    description: "人気ない - 人気ある",
                    category: "自然",
                },
                {
                    title: "職業の人気",
                    description: "人気ない - 人気ある",
                    category: "社会",
                },
                {
                    title: "おにぎりの具の人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "パンの種類の人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "趣味の人気",
                    description: "人気ない - 人気ある",
                    category: "生活",
                },
                {
                    title: "メーカー（ブランド）の人気",
                    description: "人気ない - 人気ある",
                    category: "社会",
                },
                {
                    title: "アニメ・漫画の人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "ゲームの人気",
                    description: "人気ない - 人気ある",
                    category: "ゲーム",
                },
                {
                    title: "和食料理の人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "洋食料理の人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "歴史上の人物の人気",
                    description: "人気ない - 人気ある",
                    category: "社会",
                },
                {
                    title: "声優の人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "童話の人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "歌・曲の人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "映画の登場人物の人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "アスリートの人気",
                    description: "人気ない - 人気ある",
                    category: "スポーツ",
                },
                {
                    title: "スポーツの人気",
                    description: "人気ない - 人気ある",
                    category: "スポーツ",
                },
                {
                    title: "テレビ番組の人気",
                    description: "人気ない - 人気ある",
                    category: "エンターテイメント",
                },
                {
                    title: "恋人にしたい職業の人気",
                    description: "人気ない - 人気ある",
                    category: "恋愛",
                },
                {
                    title: "デートスポットの人気",
                    description: "人気ない - 人気ある",
                    category: "恋愛",
                },
                {
                    title: "ハネムーンで行きたい場所の人気",
                    description: "人気ない - 人気ある",
                    category: "恋愛",
                },
                {
                    title: "酒のつまみ・居酒屋メニューの人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "化粧品の人気",
                    description: "人気ない - 人気ある",
                    category: "生活",
                },
                {
                    title: "ボードゲームの人気",
                    description: "人気ない - 人気ある",
                    category: "ゲーム",
                },
                {
                    title: "資格・免許の人気",
                    description: "人気ない - 人気ある",
                    category: "社会",
                },
                {
                    title: "旅行したい国や場所の人気",
                    description: "人気ない - 人気ある",
                    category: "旅行",
                },
                {
                    title: "旅行先に持っていきたいもの",
                    description: "いらない - 持っていきたい",
                    category: "旅行",
                },
                {
                    title: "ゾンビと戦うときに持っていきたいもの",
                    description: "いらない - 持っていたい",
                    category: "ファンタジー",
                },
                {
                    title: "無人島に持っていきたいもの",
                    description: "いらない - 持っていきたい",
                    category: "ファンタジー",
                },
                {
                    title: "一人暮らしに必要なもの",
                    description: "いらない - 必須",
                    category: "生活",
                },
                {
                    title: "美しいもの",
                    description: "美しくない - 美しい",
                    category: "特性・性質",
                },
                {
                    title: "こわいもの",
                    description: "こわくない - こわい",
                    category: "特性・性質",
                },
                {
                    title: "楽しいこと",
                    description: "楽しくない - 楽しい",
                    category: "感情",
                },
                {
                    title: "嬉しいこと",
                    description: "嬉しくない - 嬉しい",
                    category: "感情",
                },
                {
                    title: "カバンに入っていたら嬉しいもの",
                    description: "嬉しくない - 嬉しい",
                    category: "生活",
                },
                {
                    title: "言われて嬉しい言葉",
                    description: "どうでもいい - 嬉しい",
                    category: "感情",
                },
                {
                    title: "なりたい生き物",
                    description: "なりたくない - なりたい",
                    category: "ファンタジー",
                },
                {
                    title: "なりたい歴史上の人物",
                    description: "なりたくない - なりたい",
                    category: "ファンタジー",
                },
                {
                    title: "なりたい有名人",
                    description: "なりたくない - なりたい",
                    category: "ファンタジー",
                },
                {
                    title: "なりたいキャラ（アニメ・漫画・ゲーム）",
                    description: "なりたくない - なりたい",
                    category: "ファンタジー",
                },
                {
                    title: "生き物の大きさ",
                    description: "小さい - 大きい",
                    category: "特性・性質",
                },
                {
                    title: "学校にあるものの大きさ",
                    description: "小さい - 大きい",
                    category: "特性・性質",
                },
                {
                    title: "歴史上の人物の強さ",
                    description: "弱い - 強い",
                    category: "特性・性質",
                },
                {
                    title: "映画の登場人物の強さ",
                    description: "弱い - 強い",
                    category: "特性・性質",
                },
                {
                    title: "生き物の強さ",
                    description: "弱い - 強い",
                    category: "特性・性質",
                },
                {
                    title: "アニメ・漫画のキャラの強さ",
                    description: "弱い - 強い",
                    category: "特性・性質",
                },
                {
                    title: "ゲームキャラの強さ（モンスター含む）",
                    description: "弱い - 強い",
                    category: "特性・性質",
                },
                {
                    title: "強そうな言葉（漢字、熟語など）",
                    description: "弱そう - 強そう",
                    category: "特性・性質",
                },
                {
                    title: "強そうな効果音（創作OK）",
                    description: "弱そう - 強そう",
                    category: "特性・性質",
                },
                {
                    title: "有名人の年収・資産",
                    description: "貧乏 - 金持ち",
                    category: "社会",
                },
                {
                    title: "重そうなもの",
                    description: "軽い - 重い",
                    category: "特性・性質",
                },
                {
                    title: "ボードゲームの（物理的な）重さ",
                    description: "軽い - 重い",
                    category: "特性・性質",
                },
                {
                    title: "食べ物のカロリー",
                    description: "低カロリー - 高カロリー",
                    category: "グルメ",
                },
                {
                    title: "モテる条件・特技",
                    description: "モテない - モテる",
                    category: "恋愛",
                },
                {
                    title: "やわらかそうなもの",
                    description: "かたい - やわらかい",
                    category: "特性・性質",
                },
                {
                    title: "カッコいいもの",
                    description: "カッコ悪い - カッコいい",
                    category: "特性・性質",
                },
                {
                    title: "カッコいいセリフ",
                    description: "カッコ悪い - カッコいい",
                    category: "特性・性質",
                },
                {
                    title: "カッコいい苗字・名前",
                    description: "平凡 - カッコいい",
                    category: "特性・性質",
                },
                {
                    title: "かわいいもの",
                    description: "かわいくない - かわいい",
                    category: "特性・性質",
                },
                {
                    title: "小学生が好きな言葉",
                    description: "好きじゃない - 好き",
                    category: "感情",
                },
                {
                    title: "中高生が好きな言葉",
                    description: "好きじゃない - 好き",
                    category: "感情",
                },
                {
                    title: "人生で大切なもの・こと",
                    description: "どうでもいい - 大切",
                    category: "人生",
                },
                {
                    title: "雪山で遭難したときにもっていたいもの",
                    description: "いらない - 持っていたい",
                    category: "ファンタジー",
                },
                {
                    title: "地球観光に来た宇宙人にあげたいお土産",
                    description: "あげたくない - あげたい",
                    category: "ファンタジー",
                },
                {
                    title: "テンションが上がるもの・こと",
                    description: "上がらない - 上がる",
                    category: "感情",
                },
                {
                    title: "時代遅れの言葉",
                    description: "そうでもない - 時代遅れ",
                    category: "社会",
                },
                {
                    title: "オタクが喜ぶセリフ・設定",
                    description: "喜ばない - 喜ぶ",
                    category: "エンターテイメント",
                },
                {
                    title: "グッとくる仕草・行動",
                    description: "グッとこない - グッとくる",
                    category: "感情",
                },
                {
                    title: "結婚したい有名人",
                    description: "結婚したくない - 結婚したい",
                    category: "恋愛",
                },
                {
                    title: "結婚したいキャラ（アニメ・漫画・ゲーム）",
                    description: "結婚したくない - 結婚したい",
                    category: "恋愛",
                },
                {
                    title: "親になってほしいキャラ（アニメ・漫画・ゲーム）",
                    description: "なってほしくない - なってほしい",
                    category: "恋愛",
                },
                {
                    title: "ほしい特殊能力・武器（必殺技・道具）",
                    description: "いらない - ほしい",
                    category: "ファンタジー",
                },
                {
                    title: "便利なもの",
                    description: "不便 - 便利",
                    category: "生活",
                },
                {
                    title: "されたいプロポーズ（セリフ・シチュエーション）",
                    description: "されたくない - されたい",
                    category: "恋愛",
                },
                {
                    title: "旅先ですることの人気",
                    description: "人気ない - 人気ある",
                    category: "旅行",
                },
                {
                    title: "白米に合いそうなもの",
                    description: "合わない - 合う",
                    category: "グルメ",
                },
                {
                    title: "中学生になって考えよう カッコいいもの・こと",
                    description: "カッコわるい - カッコいい",
                    category: "特性・性質",
                },
                {
                    title: "鳥肌が立つこと",
                    description: "少し立つ - 超立つ",
                    category: "感情",
                },
                {
                    title: "1000円くらいまででできる楽しいこと",
                    description: "そこそこ - 楽しい",
                    category: "生活",
                },
                {
                    title: "桃太郎になって考えよう 頼りになる家来",
                    description: "頼りにならない - 頼りになる",
                    category: "ファンタジー",
                },
                {
                    title: "動物園にいる動物の人気",
                    description: "人気ない - 人気ある",
                    category: "自然",
                },
                {
                    title: "男女がそれぞれ好きそうなもの",
                    description: "男が好きなもの - 女が好きなもの",
                    category: "恋愛",
                },
                {
                    title: "祖父母になって考えよう 孫に言われたら嬉しい言葉",
                    description: "嬉しくない - 嬉しい",
                    category: "感情",
                },
                {
                    title: "ふだん聞く言葉の頻度",
                    description: "あまり聞かない - よく聞く",
                    category: "社会",
                },
                {
                    title: "破壊力のある言葉（パワーワード）",
                    description: "破壊力ない - 破壊力ある",
                    category: "特性・性質",
                },
                {
                    title: "冷蔵庫になって考えよう 入れてほしいもの",
                    description: "入れてほしくない - 入れてほしい",
                    category: "ファンタジー",
                },
                {
                    title: "行事の人気",
                    description: "人気ない - 人気ある",
                    category: "社会",
                },
                {
                    title: "宝箱をあけて入ってたら嬉しいもの",
                    description: "嬉しくない - 嬉しい",
                    category: "ファンタジー",
                },
                {
                    title: "幼稚園児になって考えよう テンションが上がるとき",
                    description: "上がらない - 上がる",
                    category: "感情",
                },
                {
                    title: "上に乗ってみたい動物",
                    description: "乗りたくない - 乗りたい",
                    category: "ファンタジー",
                },
                {
                    title: "商店街のくじの景品でランクが高いもの",
                    description: "低い - 高い",
                    category: "生活",
                },
                {
                    title: "SNSを活用するにあたって大切なもの・こと",
                    description: "むしろダメ - 大切",
                    category: "テクノロジー",
                },
                {
                    title: "夏に行きたい場所や国の人気",
                    description: "人気ない - 人気ある",
                    category: "旅行",
                },
                {
                    title: "「一生これしか食べられない」なら選びたい食べもの",
                    description: "選びたくない - 選びたい",
                    category: "グルメ",
                },
                {
                    title: "猫になって考えよう 心地のいい場所",
                    description: "心地わるい - 心地いい",
                    category: "ファンタジー",
                },
                {
                    title: "いい匂いのもの",
                    description: "わるい - いい",
                    category: "特性・性質",
                },
                {
                    title: "強そうな5文字",
                    description: "弱そう - 強そう",
                    category: "特性・性質",
                },
                {
                    title: "芸人になって考えよう ヤバい罰ゲーム",
                    description: "ヤバくない - ヤバい",
                    category: "エンターテイメント",
                },
                {
                    title: "コンビニで買える食べ物の人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "公園の石をどかしたとき、あったらビックリするもの",
                    description: "少しビックリ - 超ビックリ",
                    category: "ファンタジー",
                },
                {
                    title: "小学生になって考えよう 嬉しいこと",
                    description: "嬉しくない - 嬉しい",
                    category: "感情",
                },
                {
                    title: "明るいもの",
                    description: "明るくない - 明るい",
                    category: "特性・性質",
                },
                {
                    title: "言われたら嬉しいプロポーズの言葉",
                    description: "嬉しくない - 嬉しい",
                    category: "恋愛",
                },
                {
                    title: "探検家になって考えよう ワクワクする場所",
                    description: "ワクワクしない - ワクワクする",
                    category: "ファンタジー",
                },
                {
                    title: "寿司ネタの人気",
                    description: "人気ない - 人気ある",
                    category: "グルメ",
                },
                {
                    title: "動物の特徴でほしいもの",
                    description: "ほしくない - ほしい",
                    category: "ファンタジー",
                },
                {
                    title: "お嬢様になって考えよう 優秀な執事",
                    description: "ポンコツ - 優秀",
                    category: "ファンタジー",
                },
                {
                    title: "人からごちそうされたい食べ物",
                    description: "嬉しくない - 嬉しい",
                    category: "グルメ",
                },
                {
                    title: "桃太郎の場面（お話のどのあたりか）",
                    description: "むかしむかし - めでたしめでたし",
                    category: "エンターテイメント",
                },
                {
                    title: "能力者になって考えよう ハデに使えそうな脳力",
                    description: "地味 - ハデ",
                    category: "ファンタジー",
                },
                {
                    title: "海の生き物の人気",
                    description: "人気ない - 人気ある",
                    category: "自然",
                },
                {
                    title: "冷蔵庫の中にあったらテンションが上がるもの",
                    description: "上がらない - 上がる",
                    category: "感情",
                },
                {
                    title: "高校生になって考えよう 授業中、起きたら大変なこと",
                    description: "大変じゃない - 大変",
                    category: "社会",
                },
                {
                    title: "写真を撮りたくなるもの",
                    description: "そうでもない - 撮りたくなる",
                    category: "生活",
                },
                {
                    title: "どうしてもこれだけは許せないということ",
                    description: "許せなくはない - 許せない",
                    category: "感情",
                },
                {
                    title: "幸せを感じること",
                    description: "感じない - 感じる",
                    category: "感情",
                },
                {
                    title: "新婚旅行先の人気",
                    description: "行きたくない - 行きたい",
                    category: "恋愛",
                },
                {
                    title: "学校の先生に怒られそうなこと",
                    description: "怒られない - 怒られる",
                    category: "社会",
                },
                {
                    title: "犬になって考えよう 嬉しいこと",
                    description: "嬉しくない - 嬉しい",
                    category: "ファンタジー",
                },
                {
                    title: "よく行く場所",
                    description: "あまり行かない - よく行く",
                    category: "生活",
                },
                {
                    title: "思わず見てしまうメールのタイトル",
                    description: "見ない - 見てしまう",
                    category: "生活",
                },
                {
                    title: "ボディビルダーになって考えよう 言われたいかけ声",
                    description: "言われたくない - 言われたい",
                    category: "ファンタジー",
                },
                {
                    title: "生まれ変わったらなりたい動物",
                    description: "なりたくない - なりたい",
                    category: "ファンタジー",
                },
                {
                    title: "大人っぽい言動",
                    description: "子供っぽい - 大人っぽい",
                    category: "特性・性質",
                },
                {
                    title: "動画配信者にとって必要な能力・資質",
                    description: "あっちゃダメ - 必要",
                    category: "社会",
                },
                {
                    title: "家族にしてもらったら嬉しいこと",
                    description: "嬉しくない - 嬉しい",
                    category: "感情",
                },
                {
                    title: "ショックを受けた好きな人のクセ",
                    description: "少しショック - 超ショック",
                    category: "感情",
                },
                {
                    title: "侍になって考えよう 尽くしたいタイプの人",
                    description: "尽くしたくない - 尽くしたい",
                    category: "ファンタジー",
                },
                {
                    title: "食べ物のやわらかさ",
                    description: "かたい - やわらかい",
                    category: "グルメ",
                },
                {
                    title: "突然の一日オフ。最高の過ごし方は？",
                    description: "最悪 - 最高",
                    category: "生活",
                },
                {
                    title: "先生になって考えよう 卒業式に言われて嬉しい言葉",
                    description: "嬉しくない - 嬉しい",
                    category: "感情",
                },
                {
                    title: "幼いころにほしかったもの",
                    description: "そうでもない - ほしかった",
                    category: "感情",
                },
                {
                    title: "宇宙にいるときにやってみたい行動",
                    description: "やりたくない - やってみたい",
                    category: "ファンタジー",
                },
                {
                    title: "お笑い芸人にとって必要な能力・資質",
                    description: "あっちゃダメ - 必要",
                    category: "社会",
                },
                {
                    title: "寝起きにしたいこと",
                    description: "したくない - したい",
                    category: "生活",
                },
                {
                    title: "変顔の度合い（実際にやる）",
                    description: "ふつう顔 - 変顔",
                    category: "生活",
                },
                {
                    title: "修学旅行生になって考えよう 行きたい旅行先",
                    description: "行きたくない - 行きたい",
                    category: "旅行",
                },
                {
                    title: "部屋の中にある大切なもの",
                    description: "大切ではない - 大切",
                    category: "生活",
                },
                {
                    title: "痛い思い出（物理・精神どちらでも）",
                    description: "痛くない - 痛い",
                    category: "感情",
                },
                {
                    title: "生きる上で大切なもの・こと",
                    description: "むしろダメ - 大切",
                    category: "人生",
                },
                {
                    title: "食べ物の辛さ",
                    description: "辛くない - 辛い",
                    category: "グルメ",
                },
                {
                    title: "カッコいいと思うエピソード",
                    description: "カッコわるい - カッコいい",
                    category: "特性・性質",
                },
                {
                    title: "就活中の大学生になって考えよう 働きたい職場",
                    description: "働きたくない - 働きたい",
                    category: "社会",
                },
                {
                    title: "聞こえてきたら嬉しい音",
                    description: "嬉しくない - 嬉しい",
                    category: "感情",
                },
                {
                    title: "厳しく無口な父に言われたら嬉しい言葉",
                    description: "嬉しくない - 嬉しい",
                    category: "感情",
                },
                {
                    title: "アイドル業にとって必要な能力・資質",
                    description: "あっちゃダメ - 必要",
                    category: "社会",
                },
                {
                    title: "黒いもの",
                    description: "黒くない - 黒い",
                    category: "特性・性質",
                },
                {
                    title: "卒業式で流したら感動する音楽や効果音",
                    description: "ぶち壊し - 感動する",
                    category: "感情",
                },
                {
                    title: "魔法使いになって考えよう 使ってみたい魔法",
                    description: "使いたくない - 使ってみたい",
                    category: "ファンタジー",
                },
                {
                    title: "日常に起こるいいこと",
                    description: "よくない - いい",
                    category: "生活",
                },
                {
                    title: "片思い中の好きな人に言われたら嬉しい言葉",
                    description: "嬉しくない - 嬉しい",
                    category: "恋愛",
                },
                {
                    title: "仕事をする上で必要な能力・資質",
                    description: "あっちゃダメ - 必要",
                    category: "社会",
                },
                {
                    title: "眠くなるもの",
                    description: "目が覚める - 眠くなる",
                    category: "生活",
                },
                {
                    title: "見た目が子供に戻ったならしたいこと",
                    description: "したくない - したい",
                    category: "ファンタジー",
                },
                {
                    title: "馬主になって考えよう 速そうな馬の名前",
                    description: "速くなさそう - 速そう",
                    category: "ファンタジー",
                },
                {
                    title: "投げたいもの",
                    description: "投げたくない - 投げたい",
                    category: "生活",
                },
                {
                    title: "勇気ある行動",
                    description: "勇気ない - 勇気ある",
                    category: "特性・性質",
                },
                {
                    title: "芸能事務所の社長になって考えよう 所属芸能人が起こしたら大変な事件",
                    description: "大変じゃない - 大変",
                    category: "社会",
                },
                {
                    title: "包まれたいもの",
                    description: "包まれたくない - 包まれたい",
                    category: "感情",
                },
                {
                    title: "砂漠で遭難したときにほしいもの",
                    description: "いらない - ほしい",
                    category: "ファンタジー",
                },
                {
                    title: "超能力になって考えよう 友人の脳内を読んだらショックだった考え",
                    description: "少しショック - 超ショック",
                    category: "ファンタジー",
                },
                {
                    title: "ずっと見ていられるもの",
                    description: "見ていられない - 見ていられる",
                    category: "生活",
                },
                {
                    title: "死ぬまでにしたいこと",
                    description: "しなくてもいい - したい",
                    category: "人生",
                },
                {
                    title: "ヒーローになって演じよう カッコいいポーズ（実際にやる）",
                    description: "カッコわるい - カッコいい",
                    category: "ファンタジー",
                },
                {
                    title: "なつかしさを感じるもの・こと",
                    description: "感じない - 感じる",
                    category: "感情",
                },
                {
                    title: "テストでその点を取ったときの反応",
                    description: "1点 - 100点",
                    category: "社会",
                },
                {
                    title: "母になって考えよう 子供が寝言で言っていたら嬉しいこと",
                    description: "嬉しくない - 嬉しい",
                    category: "感情",
                },
                {
                    title: "便利なスマホアプリ",
                    description: "不要 - 便利",
                    category: "テクノロジー",
                },
                {
                    title: "叫ぶと必殺技っぽい言葉（創作OK）",
                    description: "ぽくない - ぽい",
                    category: "ファンタジー",
                },
                {
                    title: "芸能人になって考えよう 「これドッキリじゃね？」と疑うできごと",
                    description: "考えすぎ - ドッキリっぽい",
                    category: "エンターテイメント",
                },
                {
                    title: "足の速い動物",
                    description: "遅い - 速い",
                    category: "特性・性質",
                },
                {
                    title: "これは恋か愛か",
                    description: "恋 - 愛",
                    category: "恋愛",
                },
                {
                    title: "人間関係で必要な能力・資質",
                    description: "あっちゃダメ - 必要",
                    category: "社会",
                },
                {
                    title: "おみやげにもらったら嬉しいもの",
                    description: "嬉しくない - 嬉しい",
                    category: "生活",
                },
                {
                    title: "奇跡の体験",
                    description: "少し奇跡 - 超奇跡",
                    category: "ファンタジー",
                },
                {
                    title: "タイムトラベラーになって考えよう 過去から持って帰りたいもの",
                    description: "いらない - 持って帰りたい",
                    category: "ファンタジー",
                },
                {
                    title: "朝ごはんに食べたいもの",
                    description: "食べたくない - 食べたい",
                    category: "グルメ",
                },
                {
                    title: "お尻から出てきたらビックリするもの",
                    description: "少しビックリ - 超ビックリ",
                    category: "ファンタジー",
                },
                {
                    title: "科学者になって考えよう 発明したい薬",
                    description: "したくない - したい",
                    category: "ファンタジー",
                },
                {
                    title: "踏んだら痛そうなもの",
                    description: "痛くない - 痛い",
                    category: "特性・性質",
                },
                {
                    title: "SNSでめちゃくちゃいいねされそうな投稿",
                    description: "いいねされなさそう - いいねされそう",
                    category: "テクノロジー",
                },
                {
                    title: "人物やキャラクターのイメージ",
                    description: "クール - パッション",
                    category: "特性・性質",
                },
                {
                    title: "疲れたときにしたいこと",
                    description: "したくない - したい",
                    category: "生活",
                },
                {
                    title: "あったらおいしそうなアイスクリームの味",
                    description: "おいしくなさそう - おいしそう",
                    category: "グルメ",
                },
                {
                    title: "赤ちゃんになって考えよう 最高の瞬間",
                    description: "最悪 - 最高",
                    category: "ファンタジー",
                },
                {
                    title: "家にある便利なもの",
                    description: "便利じゃない - 便利",
                    category: "生活",
                },
                {
                    title: "5歳児が言ったらビックリする言葉",
                    description: "少しビックリ - 超ビックリ",
                    category: "社会",
                },
                {
                    title: "魔王になって考えよう こんな勇者はイヤだ",
                    description: "余裕 - イヤだ",
                    category: "ファンタジー",
                },
                {
                    title: "大学生が反応する言葉",
                    description: "反応しない - 反応する",
                    category: "社会",
                },
                {
                    title: "機嫌がいいときにしそうな行動",
                    description: "しなさそう - しそう",
                    category: "生活",
                },
                {
                    title: "リーダーにとって必要な能力・資質",
                    description: "あっちゃダメ - 必要",
                    category: "社会",
                },
                {
                    title: "友達になりたい人の特徴",
                    description: "なりたくない - なりたい",
                    category: "社会",
                },
                {
                    title: "人生の中で、やる回数が多いこと",
                    description: "少ない - 多い",
                    category: "生活",
                },
                {
                    title: "愛されていると思うこと",
                    description: "愛されていない - 愛されている",
                    category: "感情",
                },
                {
                    title: "武器にしたら強そうな日用品",
                    description: "弱そう - 強そう",
                    category: "ファンタジー",
                },
                {
                    title: "うっかり信じてしまいそうなウソ",
                    description: "少し信じそう - 超信じそう",
                    category: "社会",
                },
                {
                    title: "ガマンするのが難しいこと",
                    description: "少し難しい - 超難しい",
                    category: "特性・性質",
                },
                {
                    title: "記念日のプレゼントの人気",
                    description: "人気ない - 人気ある",
                    category: "恋愛",
                },
                {
                    title: "1人でやるにはハードルが高いこと",
                    description: "低い - 高い",
                    category: "特性・性質",
                },
                {
                    title: "恋人がしてくれたら嬉しいこと",
                    description: "嬉しくない - 嬉しい",
                    category: "恋愛",
                },
                {
                    title: "地球最後の日に頼りになりそうなもの",
                    description: "少し頼りになる - 超頼りになる",
                    category: "ファンタジー",
                },
                {
                    title: "もしあったら参加してみたいお祭りの特徴",
                    description: "少し参加したい - 超参加したい",
                    category: "社会",
                },
                {
                    title: "タイムマシンで行ってみたい時代と場所",
                    description: "少し行きたい - 超行きたい",
                    category: "ファンタジー",
                },
                {
                    title: "見かけたら気になってしまう本のタイトル",
                    description: "少し気になる - 超気になる",
                    category: "生活",
                },
                {
                    title: "学校の先生に言ったらビックリされそうなこと",
                    description: "少しビックリ - 超ビックリ",
                    category: "社会",
                },
                {
                    title: "入ってみたい漫画や小説の世界",
                    description: "入りたくない - 入ってみたい",
                    category: "ファンタジー",
                },
                {
                    title: "自分の分身ができたらやってほしいこと",
                    description: "やってほしくない - やってほしい",
                    category: "ファンタジー",
                },
            ];

            for (const topic of sampleTopics) {
                await this.createTopic(topic);
            }

            Logger.info("サンプルお題を作成しました");
        } catch (error) {
            Logger.error(`サンプルお題作成エラー: ${error}`);
            throw error;
        }
    }

    /**
     * カテゴリ一覧を取得
     */
    public static async getCategories(): Promise<string[]> {
        try {
            const categories = await this.prisma.topic.findMany({
                where: { isActive: true },
                select: { category: true },
                distinct: ["category"],
            });

            return categories.map(c => c.category).sort();
        } catch (error) {
            Logger.error(`カテゴリ一覧取得エラー: ${error}`);
            throw error;
        }
    }
}
