import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

interface SqliteDatabase {
  close(): void;
}

/**
 * Creates a throwaway SQLite database with the app schema and points DATABASE_URL at it.
 * Call this before importing any module that uses Prisma, then import those modules dynamically.
 */
export async function createTempDatabase(): Promise<{ dispose(): Promise<void> }> {
  // 배포용 PostgreSQL 경로를 검증할 때(TEST_DATABASE_URL)는 이미 만들어 둔 스키마를 비우고 그대로 쓴다.
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const { prisma } = await import("@/utils/prisma");
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "Duel","BossReward","Achievement","WordCard","MiniGameRun","ClassSetting","PromiseUnit","QuestProof","Purchase","DailyPromise","Quest","Comment","PostPhoto","Post","Student","Team","ScheduleItem","UploadedFile" CASCADE',
    );

    return {
      async dispose() {
        await prisma.$disconnect();
      },
    };
  }

  const directory = mkdtempSync(path.join(tmpdir(), "penstagram-test-"));
  const databasePath = path.join(directory, "test.db");
  process.env.DATABASE_URL = `file:${databasePath}`;

  // node:sqlite 의 타입은 @types/node 22.5 부터 들어 있어서, 지정자를 변수로 두고 불러온다.
  const sqliteSpecifier = "node:sqlite";
  const { DatabaseSync } = (await import(/* @vite-ignore */ sqliteSpecifier)) as {
    DatabaseSync: new (file: string) => SqliteDatabase;
  };
  const { applySchema } = await import("../../../scripts/db-schema.mjs");
  const database = new DatabaseSync(databasePath);
  applySchema(database);
  database.close();

  return {
    async dispose() {
      const { prisma } = await import("@/utils/prisma");
      await prisma.$disconnect();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
