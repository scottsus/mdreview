import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 12 }).unique().notNull(),
    content: text("content").notNull(),
    title: varchar("title", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    decisionMessage: text("decision_message"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    source: varchar("source", { length: 20 }).notNull().default("manual"),
    agentId: varchar("agent_id", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    slugIdx: index("reviews_slug_idx").on(table.slug),
    statusIdx: index("reviews_status_idx").on(table.status),
    createdAtIdx: index("reviews_created_at_idx").on(table.createdAt),
  }),
);

export const reviewsRelations = relations(reviews, ({ many }) => ({
  threads: many(threads),
}));

export const threads = pgTable(
  "threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    startLine: integer("start_line").notNull(),
    endLine: integer("end_line").notNull(),
    selectedText: text("selected_text").notNull(),
    resolved: boolean("resolved").notNull().default(false),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    reviewIdIdx: index("threads_review_id_idx").on(table.reviewId),
    createdAtIdx: index("threads_created_at_idx").on(table.createdAt),
  }),
);

export const threadsRelations = relations(threads, ({ one, many }) => ({
  review: one(reviews, {
    fields: [threads.reviewId],
    references: [reviews.id],
  }),
  comments: many(comments),
}));

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    authorType: varchar("author_type", { length: 20 })
      .notNull()
      .default("human"),
    authorName: varchar("author_name", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    threadIdIdx: index("comments_thread_id_idx").on(table.threadId),
    createdAtIdx: index("comments_created_at_idx").on(table.createdAt),
  }),
);

export const commentsRelations = relations(comments, ({ one }) => ({
  thread: one(threads, {
    fields: [comments.threadId],
    references: [threads.id],
  }),
}));

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type ReviewStatus =
  | "pending"
  | "approved"
  | "changes_requested"
  | "rejected";

// ─── Auth.js / NextAuth v5 tables ──────────────────────────────────────────
// Required by @auth/drizzle-adapter. Table names match Auth.js conventions.
// userId columns use text (not uuid) to match adapter's default TypeScript types,
// even though the rest of the schema uses uuid PKs. text stores UUIDs fine.

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
})

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compositePk: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
)

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compositePk: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
)

// Auth table inferred types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Account = typeof accounts.$inferSelect
export type Session = typeof sessions.$inferSelect

// ─── API Keys ───────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  "api_key",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: varchar("key_prefix", { length: 10 }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    apiKeysUserIdIdx: index("api_keys_user_id_idx").on(table.userId),
    apiKeysKeyHashIdx: index("api_keys_key_hash_idx").on(table.keyHash),
  }),
)

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
}))

export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert
