import { PrismaClient } from "@prisma/client";
import { Logger } from "./Logger";

class Database {
    private static instance: PrismaClient;

    public static getInstance(): PrismaClient {
        if (!Database.instance) {
            Database.instance = new PrismaClient();
        }

        return Database.instance;
    }

    public static async connect(): Promise<void> {
        try {
            const prisma = Database.getInstance();
            await prisma.$connect();
            Logger.info("データベースに接続しました");
        } catch (error) {
            Logger.error(`データベース接続エラー: ${error}`);
            throw error;
        }
    }

    public static async disconnect(): Promise<void> {
        try {
            const prisma = Database.getInstance();
            await prisma.$disconnect();
            Logger.info("データベース接続を切断しました");
        } catch (error) {
            Logger.error(`データベース切断エラー: ${error}`);
            throw error;
        }
    }
}

export default Database;
