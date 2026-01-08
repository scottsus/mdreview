"use client";

import { ThreadResponse } from "@/types";
import { useCallback, useMemo } from "react";

export interface UseThreadHighlightingOptions {
  threads: ThreadResponse[];
}

export interface UseThreadHighlightingReturn {
  getThreadsForRange: (startLine: number, endLine: number) => string[];
  getThreadsForLine: (line: number) => string[];
}

export function useThreadHighlighting({
  threads,
}: UseThreadHighlightingOptions): UseThreadHighlightingReturn {
  const threadsByLine = useMemo(() => {
    const map = new Map<number, string[]>();
    threads.forEach((thread) => {
      for (let line = thread.startLine; line <= thread.endLine; line++) {
        const existing = map.get(line) || [];
        existing.push(thread.id);
        map.set(line, existing);
      }
    });
    return map;
  }, [threads]);

  const getThreadsForRange = useCallback(
    (startLine: number, endLine: number): string[] => {
      const threadIds = new Set<string>();
      for (let line = startLine; line <= endLine; line++) {
        const ids = threadsByLine.get(line) || [];
        ids.forEach((id) => threadIds.add(id));
      }
      return Array.from(threadIds);
    },
    [threadsByLine]
  );

  const getThreadsForLine = useCallback(
    (line: number): string[] => {
      return threadsByLine.get(line) || [];
    },
    [threadsByLine]
  );

  return {
    getThreadsForRange,
    getThreadsForLine,
  };
}
