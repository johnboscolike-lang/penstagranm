import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(process.cwd(), "prisma", "schema.prisma");
const target = resolve(process.cwd(), "prisma", "schema.postgres.prisma");

/**
 * 로컬 개발은 SQLite 스키마(prisma/schema.prisma)를 그대로 쓰고,
 * 서버리스 배포에서는 같은 모델을 PostgreSQL 공급자로 바꾼 사본을 만들어 쓴다.
 */
function preparePostgresSchema() {
  const schema = readFileSync(source, "utf8");
  if (!schema.includes('provider = "sqlite"')) {
    throw new Error('prisma/schema.prisma 에서 provider = "sqlite" 를 찾지 못했습니다.');
  }

  writeFileSync(target, schema.replace('provider = "sqlite"', 'provider = "postgresql"'));
  process.stdout.write(`${target}\n`);
}

preparePostgresSchema();
