import { PrismaClient } from "@prisma/client";

// 로컬 SQLite 데모는 별도 설정 없이도 실행되도록 기본 경로를 채운다.
process.env.DATABASE_URL ??= "file:./dev.db";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

/**
 * Shares a single Prisma client across hot reloads during development.
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
