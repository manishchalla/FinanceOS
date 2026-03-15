import { sql } from "drizzle-orm";
import { text, integer, real, sqliteTable, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
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
export type Budget = typeof budgets.$inferSelect;
