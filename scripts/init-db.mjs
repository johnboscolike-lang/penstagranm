import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databaseDirectory = resolve(process.cwd(), "prisma");
const databasePath = resolve(databaseDirectory, "dev.db");

/**
 * Creates the SQLite schema used by the local Prisma client.
 */
function initialiseDatabase() {
  mkdirSync(databaseDirectory, { recursive: true });

  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS "Post" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "authorName" TEXT NOT NULL,
      "authorRole" TEXT NOT NULL,
      "avatarUrl" TEXT,
      "lessonTitle" TEXT NOT NULL,
      "caption" TEXT NOT NULL,
      "transcript" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "PostPhoto" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "postId" TEXT NOT NULL,
      "slot" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "imageUrl" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PostPhoto_postId_fkey"
        FOREIGN KEY ("postId") REFERENCES "Post" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "PostPhoto_postId_slot_key" ON "PostPhoto" ("postId", "slot");
    CREATE TABLE IF NOT EXISTS "Comment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "postId" TEXT NOT NULL,
      "authorName" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Comment_postId_fkey"
        FOREIGN KEY ("postId") REFERENCES "Post" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE TABLE IF NOT EXISTS "ScheduleItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "notes" TEXT,
      "scheduledFor" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  database.close();
}

initialiseDatabase();
process.stdout.write(`${databasePath}\n`);
