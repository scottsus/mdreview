import { z } from "zod";

export const createReviewSchema = z.object({
  content: z.string().min(1, "Content is required"),
  title: z.string().max(255).optional(),
  source: z.enum(["manual", "agent"]).default("manual"),
  agentId: z.string().max(100).optional(),
});

export const createThreadSchema = z.object({
  startLine: z.number().int().min(1),
  endLine: z.number().int().min(1),
  selectedText: z.string().min(1),
  body: z.string().min(1),
  authorType: z.enum(["human", "agent"]).default("human"),
  authorName: z.string().max(100).optional(),
});

export const updateThreadSchema = z.object({
  resolved: z.boolean(),
});

export const createReplySchema = z.object({
  body: z.string().min(1),
  authorType: z.enum(["human", "agent"]).default("human"),
  authorName: z.string().max(100).optional(),
});

export const exportFormatSchema = z.enum(["yaml", "json"]).default("yaml");

export interface ReviewResponse {
  id: string;
  slug: string;
  url: string;
  content: string;
  title: string | null;
  status: string;
  decisionMessage: string | null;
  decidedAt: string | null;
  source: string;
  threads: ThreadResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ThreadResponse {
  id: string;
  startLine: number;
  endLine: number;
  selectedText: string;
  resolved: boolean;
  resolvedAt: string | null;
  comments: CommentResponse[];
  createdAt: string;
}

export interface CommentResponse {
  id: string;
  body: string;
  authorType: string;
  authorName: string | null;
  createdAt: string;
}

export interface ApiError {
  error: string;
  message: string;
  issues?: z.ZodIssue[];
}

export interface BlockSelection {
  startLine: number;
  endLine: number;
  blockContent: string;
}

export type LineSelection = BlockSelection;
