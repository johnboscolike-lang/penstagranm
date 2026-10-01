/**
 * SQLite 스키마를 만든다. 로컬 실행 스크립트(init-db.mjs)와 저장소 테스트가 같이 쓴다.
 * 이미 만들어진 DB에도 안전하게 다시 실행할 수 있다.
 */
export function applySchema(database) {
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS "Team" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "emblem" TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Team_name_key" ON "Team" ("name");
    CREATE TABLE IF NOT EXISTS "Student" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "hairKey" TEXT NOT NULL,
      "isMe" BOOLEAN NOT NULL DEFAULT false,
      "joinedOn" TEXT NOT NULL DEFAULT '2000-01-01',
      "teamId" TEXT NOT NULL,
      CONSTRAINT "Student_teamId_fkey"
        FOREIGN KEY ("teamId") REFERENCES "Team" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE TABLE IF NOT EXISTS "Quest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "note" TEXT NOT NULL DEFAULT '',
      "unitKind" TEXT NOT NULL,
      "unitStart" INTEGER NOT NULL DEFAULT 1,
      "unitCount" INTEGER NOT NULL,
      "advance" BOOLEAN NOT NULL DEFAULT false,
      "weekdays" TEXT NOT NULL DEFAULT '12345',
      "startDate" TEXT NOT NULL,
      "endDate" TEXT,
      "requireProof" BOOLEAN NOT NULL DEFAULT false,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdBy" TEXT NOT NULL DEFAULT '선생님',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Quest_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "Quest_studentId_idx" ON "Quest" ("studentId");
    CREATE TABLE IF NOT EXISTS "DailyPromise" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "dateKey" TEXT NOT NULL,
      "slotIndex" INTEGER NOT NULL,
      "subject" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "unitKind" TEXT NOT NULL,
      "unitStart" INTEGER NOT NULL,
      "unitCount" INTEGER NOT NULL,
      "scope" TEXT NOT NULL DEFAULT 'DAY',
      "questId" TEXT,
      "requireProof" BOOLEAN NOT NULL DEFAULT false,
      "reviewStatus" TEXT NOT NULL DEFAULT 'NONE',
      "feedback" TEXT NOT NULL DEFAULT '',
      "submittedAt" DATETIME,
      "reviewedAt" DATETIME,
      "reviewedBy" TEXT NOT NULL DEFAULT '',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DailyPromise_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "DailyPromise_questId_fkey"
        FOREIGN KEY ("questId") REFERENCES "Quest" ("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "DailyPromise_studentId_dateKey_slotIndex_key"
      ON "DailyPromise" ("studentId", "dateKey", "slotIndex");
    CREATE INDEX IF NOT EXISTS "DailyPromise_dateKey_idx" ON "DailyPromise" ("dateKey");
    CREATE TABLE IF NOT EXISTS "PromiseUnit" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "promiseId" TEXT NOT NULL,
      "unitNo" INTEGER NOT NULL,
      "confirmedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PromiseUnit_promiseId_fkey"
        FOREIGN KEY ("promiseId") REFERENCES "DailyPromise" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "PromiseUnit_promiseId_unitNo_key"
      ON "PromiseUnit" ("promiseId", "unitNo");
    CREATE TABLE IF NOT EXISTS "QuestProof" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "promiseId" TEXT NOT NULL,
      "imageUrl" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "QuestProof_promiseId_fkey"
        FOREIGN KEY ("promiseId") REFERENCES "DailyPromise" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "QuestProof_promiseId_idx" ON "QuestProof" ("promiseId");
    CREATE TABLE IF NOT EXISTS "UploadedFile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "mime" TEXT NOT NULL,
      "size" INTEGER NOT NULL,
      "data" BLOB NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "Purchase" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "itemKey" TEXT NOT NULL,
      "cost" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Purchase_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_studentId_itemKey_key"
      ON "Purchase" ("studentId", "itemKey");
    CREATE TABLE IF NOT EXISTS "Duel" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "challengerId" TEXT NOT NULL,
      "opponentId" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "questions" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'CHALLENGER_TURN',
      "dateKey" TEXT NOT NULL,
      "challengerAnswers" TEXT,
      "challengerCorrect" INTEGER,
      "challengerScore" INTEGER,
      "challengerMs" INTEGER,
      "opponentStartedAt" DATETIME,
      "opponentAnswers" TEXT,
      "opponentCorrect" INTEGER,
      "opponentScore" INTEGER,
      "opponentMs" INTEGER,
      "outcome" TEXT,
      "ratingDelta" INTEGER NOT NULL DEFAULT 0,
      "challengerRatingAfter" INTEGER,
      "opponentRatingAfter" INTEGER,
      "challengerXp" INTEGER NOT NULL DEFAULT 0,
      "challengerCoins" INTEGER NOT NULL DEFAULT 0,
      "opponentXp" INTEGER NOT NULL DEFAULT 0,
      "opponentCoins" INTEGER NOT NULL DEFAULT 0,
      "finishedKey" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "finishedAt" DATETIME,
      CONSTRAINT "Duel_challengerId_fkey"
        FOREIGN KEY ("challengerId") REFERENCES "Student" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Duel_opponentId_fkey"
        FOREIGN KEY ("opponentId") REFERENCES "Student" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX IF NOT EXISTS "Duel_challengerId_idx" ON "Duel" ("challengerId");
    CREATE INDEX IF NOT EXISTS "Duel_opponentId_idx" ON "Duel" ("opponentId");
    CREATE INDEX IF NOT EXISTS "Duel_status_idx" ON "Duel" ("status");
    CREATE INDEX IF NOT EXISTS "Duel_finishedKey_idx" ON "Duel" ("finishedKey");
    CREATE TABLE IF NOT EXISTS "BossReward" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "studentId" TEXT NOT NULL,
      "weekKey" TEXT NOT NULL,
      "xp" INTEGER NOT NULL,
      "coins" INTEGER NOT NULL,
      "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BossReward_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "BossReward_studentId_weekKey_key"
      ON "BossReward" ("studentId", "weekKey");
    CREATE TABLE IF NOT EXISTS "ClassSetting" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL
    );
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

  // 이전 버전 DB에 없던 컬럼은 한 번만 추가한다.
  addMissingColumns(database, "Post", [
    ["studentId", 'TEXT REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE'],
  ]);
  addMissingColumns(database, "Student", [
    ["rating", "INTEGER NOT NULL DEFAULT 1000"],
    ["hatKey", "TEXT"],
    ["petKey", "TEXT"],
  ]);
  addMissingColumns(database, "DailyPromise", [
    ["scope", "TEXT NOT NULL DEFAULT 'DAY'"],
    ["questId", 'TEXT REFERENCES "Quest" ("id") ON DELETE SET NULL ON UPDATE CASCADE'],
    ["requireProof", "BOOLEAN NOT NULL DEFAULT false"],
    ["reviewStatus", "TEXT NOT NULL DEFAULT 'NONE'"],
    ["feedback", "TEXT NOT NULL DEFAULT ''"],
    ["submittedAt", "DATETIME"],
    ["reviewedAt", "DATETIME"],
    ["reviewedBy", "TEXT NOT NULL DEFAULT ''"],
  ]);
}

/**
 * 테이블에 아직 없는 컬럼만 ALTER TABLE 로 추가한다.
 */
function addMissingColumns(database, table, columns) {
  const existing = new Set(database.prepare(`PRAGMA table_info("${table}")`).all().map((column) => column.name));

  for (const [name, definition] of columns) {
    if (!existing.has(name)) {
      database.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${definition}`);
    }
  }
}
