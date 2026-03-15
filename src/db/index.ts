import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

// DATABASE_URL is just the filename e.g. "finance.db"
const dbFile = process.env.DATABASE_URL ?? "finance.db";
const dbPath = path.resolve(process.cwd(), dbFile);

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
export * from "./schema";
