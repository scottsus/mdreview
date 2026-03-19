"use client";

import mermaid from "mermaid";
import { useTheme } from "next-themes";
import React, { useEffect, useId, useRef, useState } from "react";

import { CommentableBlock } from "./commentable-block";
import { InlineCommentForm } from "./inline-comment-form";

interface MermaidBlockProps {
  code: string;
  blockIndex: number;
  startLine: number;
  endLine: number;

  selectedRange: { start: number; end: number } | null;
  isSelecting: boolean;
  finalSelection: {
    startBlockIndex: number;
    endBlockIndex: number;
    startLine: number;
    endLine: number;
    blockContent: string;
  } | null;

  getThreadsForRange: (start: number, end: number) => string[];
  activeThreadId: string | null;

  onPointerDown: (blockIndex: number, e: React.PointerEvent) => void;
  onAddComment: (
    blockIndex: number,
    startLine: number,
    endLine: number,
    content: string,
  ) => void;
  onThreadClick: (threadId: string) => void;

  onCommentSubmit: (body: string) => Promise<void>;
  onCommentCancel: () => void;
}

type RenderState =
  | { status: "loading" }
  | { status: "success"; svg: string }
  | { status: "error"; message: string };

export default function MermaidBlock({
  code,
  blockIndex,
  startLine,
  endLine,
  selectedRange,
  isSelecting,
  finalSelection,
  getThreadsForRange,
  activeThreadId,
  onPointerDown,
  onAddComment,
  onThreadClick,
  onCommentSubmit,
  onCommentCancel,
}: MermaidBlockProps) {
  const uniqueId = useId();
  const renderIdRef = useRef(0);
  const { resolvedTheme } = useTheme();
  const [renderState, setRenderState] = useState<RenderState>({ status: "loading" });

  useEffect(() => {
    if (!code.trim()) {
      setRenderState({ status: "error", message: "Empty diagram" });
      return;
    }

    const currentRenderId = ++renderIdRef.current;
    const mermaidTheme = resolvedTheme === "dark" ? "dark" : "default";

    const renderDiagram = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: mermaidTheme,
          securityLevel: "strict",
          fontFamily: "inherit",
        });

        await mermaid.parse(code);

        const elementId = `mermaid-${uniqueId.replace(/:/g, "")}-${currentRenderId}`;
        const { svg } = await mermaid.render(elementId, code);

        if (currentRenderId !== renderIdRef.current) return;

        setRenderState({ status: "success", svg });
      } catch (err) {
        if (currentRenderId !== renderIdRef.current) return;

        const message = err instanceof Error ? err.message : "Unknown error rendering diagram";
        setRenderState({ status: "error", message });
      }
    };

    renderDiagram();
  }, [code, resolvedTheme, uniqueId, blockIndex]);

  const threadIds = getThreadsForRange(startLine, endLine);
  const hasThread = threadIds.length > 0;
  const isActive = activeThreadId !== null && threadIds.includes(activeThreadId);

  const isInSelectionRange =
    selectedRange !== null &&
    blockIndex >= selectedRange.start &&
    blockIndex <= selectedRange.end;

  const isInFinalSelection =
    finalSelection !== null &&
    blockIndex >= finalSelection.startBlockIndex &&
    blockIndex <= finalSelection.endBlockIndex;

  const showInlineForm =
    finalSelection !== null && blockIndex === finalSelection.endBlockIndex;

  return (
    <>
      <CommentableBlock
        blockIndex={blockIndex}
        startLine={startLine}
        endLine={endLine}
        hasThread={hasThread}
        isActive={isActive}
        isInSelectionRange={isInSelectionRange}
        isSelecting={isSelecting}
        isInFinalSelection={isInFinalSelection}
        onPointerDown={(e) => onPointerDown(blockIndex, e)}
        onAddComment={() =>
          onAddComment(blockIndex, startLine, endLine, `[mermaid diagram]`)
        }
        onClick={() => {
          if (threadIds[0]) {
            onThreadClick(threadIds[0]);
          }
        }}
      >
        <MermaidContent renderState={renderState} code={code} />
      </CommentableBlock>
      {showInlineForm && finalSelection && (
        <InlineCommentForm
          lineSelection={{
            startLine: finalSelection.startLine,
            endLine: finalSelection.endLine,
            blockContent: finalSelection.blockContent,
          }}
          onSubmit={onCommentSubmit}
          onCancel={onCommentCancel}
        />
      )}
    </>
  );
}

function MermaidContent({
  renderState,
  code,
}: {
  renderState: RenderState;
  code: string;
}) {
  if (renderState.status === "loading") {
    return <MermaidSkeleton />;
  }

  if (renderState.status === "error") {
    return <MermaidError message={renderState.message} code={code} />;
  }

  return (
    <div
      className="flex justify-center overflow-x-auto rounded-md bg-zinc-50 p-4 dark:bg-zinc-900 [&>svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: renderState.svg }}
    />
  );
}

function MermaidSkeleton() {
  return (
    <div className="flex items-center justify-center rounded-md bg-zinc-50 p-8 dark:bg-zinc-900">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-sm">Loading diagram...</span>
      </div>
    </div>
  );
}

function MermaidError({ message, code }: { message: string; code: string }) {
  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
      <p className="mb-2 text-sm text-destructive">Unable to render mermaid diagram</p>
      <p className="mb-2 text-xs text-muted-foreground">{message}</p>
      <pre className="overflow-x-auto text-xs text-muted-foreground">{code}</pre>
    </div>
  );
}
