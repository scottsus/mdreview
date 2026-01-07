import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
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
