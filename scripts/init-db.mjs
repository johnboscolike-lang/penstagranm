import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { applySchema } from "./db-schema.mjs";

const databaseDirectory = resolve(process.cwd(), "prisma");
const databasePath = resolve(databaseDirectory, "dev.db");

/**
 * Creates the SQLite schema used by the local Prisma client.
 */
function initialiseDatabase() {
  mkdirSync(databaseDirectory, { recursive: true });

  const database = new DatabaseSync(databasePath);
  applySchema(database);
  database.close();
}

initialiseDatabase();
process.stdout.write(`${databasePath}\n`);
