import { sql } from "drizzle-orm";
import { text, integer, real, sqliteTable, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  // When enabled, the LLM receives anonymized transaction descriptions only.
  privacyMode: integer("privacy_mode").notNull().default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["checking","savings","credit","investment","cash"] }).notNull().default("checking"),
  balance: real("balance").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  color: text("color").notNull().default("#6366f1"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (t) => ({ userIdx: index("accounts_user_idx").on(t.userId) }));

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("📦"),
  color: text("color").notNull().default("#6366f1"),
  type: text("type", { enum: ["income","expense","both"] }).notNull().default("both"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (t) => ({ userIdx: index("categories_user_idx").on(t.userId) }));

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  amount: real("amount").notNull(),
  type: text("type", { enum: ["income","expense","transfer"] }).notNull(),
  description: text("description").notNull(),
  notes: text("notes"),
  date: text("date").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (t) => ({
  userIdx: index("transactions_user_idx").on(t.userId),
  dateIdx: index("transactions_date_idx").on(t.date),
}));

// ─── Anomaly feedback (Phase 2) ─────────────────────────────────────────────
export const anomalyFeedback = sqliteTable("anomaly_feedback", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  transactionId: text("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  userVerdict: text("user_verdict").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (t) => ({
  txIdx: index("anomaly_feedback_tx_idx").on(t.transactionId),
}));

export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  period: text("period", { enum: ["monthly","weekly","yearly"] }).notNull().default("monthly"),
  startDate: text("start_date").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (t) => ({ userIdx: index("budgets_user_idx").on(t.userId) }));

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type AnomalyFeedback = typeof anomalyFeedback.$inferSelect;
export type Budget = typeof budgets.$inferSelect;

// ─── AI Memory ────────────────────────────────────────────────────────────────
export const aiMemory = sqliteTable("ai_memory", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
}, (t) => ({
  userKeyIdx: index("ai_memory_user_key_idx").on(t.userId, t.key),
}));

// ─── Chat History ─────────────────────────────────────────────────────────────
export const chatHistory = sqliteTable("chat_history", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
}, (t) => ({
  userIdx: index("chat_history_user_idx").on(t.userId),
}));

export type AiMemory = typeof aiMemory.$inferSelect;
export type ChatHistory = typeof chatHistory.$inferSelect;