"use client";

import { cn } from "@/lib/utils";
import { BlockSelection, ThreadResponse } from "@/types";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { Components, ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

import { CodeBlockWithLines } from "./code-block-with-lines";
import { CommentableBlock } from "./commentable-block";
import { InlineCommentForm } from "./inline-comment-form";

interface MarkdownViewerProps {
  content: string;
  threads: ThreadResponse[];
  activeThreadId: string | null;
  onThreadClick: (threadId: string) => void;
  onCreateThread: (selection: BlockSelection, body: string) => Promise<void>;
}

interface SelectionState {
  isSelecting: boolean;
  anchorBlockIndex: number | null;
  focusBlockIndex: number | null;
  // Final selection (after mouse up)
  finalSelection: {
    startBlockIndex: number;
    endBlockIndex: number;
    startLine: number;
    endLine: number;
    blockContent: string;
  } | null;
}

type BlockTag =
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "pre"
  | "table"
  | "ul"
  | "ol"
  | "blockquote"
  | "hr";

interface BlockComponentProps extends ExtraProps {
  children?: React.ReactNode;
}

export function MarkdownViewer({
  content,
  threads,
  activeThreadId,
  onThreadClick,
  onCreateThread,
}: MarkdownViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track blocks by position ID for stable indices (deterministic based on line numbers)
  const blocksMapRef = useRef<Map<string, { index: number; startLine: number; endLine: number }>>(new Map());
  const blockCounterRef = useRef(0);

  const [selectionState, setSelectionState] = useState<SelectionState>({
    isSelecting: false,
    anchorBlockIndex: null,
    focusBlockIndex: null,
    finalSelection: null,
  });

  // Reset block tracking on each render (this is fine because we're building a deterministic map)
  blocksMapRef.current = new Map();
  blockCounterRef.current = 0;

  // Helper to register a block and get its index - deterministic based on position
  const registerBlock = useCallback((startLine: number, endLine: number): number => {
    const blockId = `L${startLine}-${endLine}`;
    const existing = blocksMapRef.current.get(blockId);
    if (existing) {
      return existing.index;
    }
    const index = blockCounterRef.current++;
    blocksMapRef.current.set(blockId, { index, startLine, endLine });
    return index;
  }, []);

  // Helper to get block info by index
  const getBlockByIndex = useCallback((index: number) => {
    for (const block of blocksMapRef.current.values()) {
      if (block.index === index) return block;
    }
    return null;
  }, []);

  const selectedRange = useMemo(() => {
    const { anchorBlockIndex, focusBlockIndex } = selectionState;
    if (anchorBlockIndex === null || focusBlockIndex === null) return null;

    return {
      start: Math.min(anchorBlockIndex, focusBlockIndex),
      end: Math.max(anchorBlockIndex, focusBlockIndex),
    };
  }, [selectionState.anchorBlockIndex, selectionState.focusBlockIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectionState({
          isSelecting: false,
          anchorBlockIndex: null,
          focusBlockIndex: null,
          finalSelection: null,
        });
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (!selectionState.finalSelection) return;
      
      const target = e.target as HTMLElement;
      // Check if click is inside the inline comment form
      const isInsideForm = target.closest('[data-comment-form]');
      // Check if click is inside the selected blocks
      const isInsideSelectedBlock = target.closest('[data-block-index]');
      
      if (!isInsideForm && !isInsideSelectedBlock) {
        setSelectionState({
          isSelecting: false,
          anchorBlockIndex: null,
          focusBlockIndex: null,
          finalSelection: null,
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectionState.finalSelection]);

  const handleBlockPointerDown = useCallback(
    (blockIndex: number, e: React.PointerEvent) => {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setSelectionState({
        isSelecting: true,
        anchorBlockIndex: blockIndex,
        focusBlockIndex: blockIndex,
        finalSelection: null,
      });
    },
    []
  );

  const handleContainerPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!selectionState.isSelecting) return;

      const element = document.elementFromPoint(e.clientX, e.clientY);
      const blockEl = element?.closest("[data-block-index]") as HTMLElement | null;

      if (blockEl) {
        const index = parseInt(blockEl.dataset.blockIndex || "-1", 10);
        if (index >= 0 && index !== selectionState.focusBlockIndex) {
          setSelectionState((prev) => ({ ...prev, focusBlockIndex: index }));
        }
      }
    },
    [selectionState.isSelecting, selectionState.focusBlockIndex]
  );

  const handleContainerPointerUp = useCallback(() => {
    if (!selectionState.isSelecting) return;

    if (selectedRange) {
      const startBlock = getBlockByIndex(selectedRange.start);
      const endBlock = getBlockByIndex(selectedRange.end);

      if (startBlock && endBlock) {
        const blockContents: string[] = [];
        for (let i = selectedRange.start; i <= selectedRange.end; i++) {
          const blockEl = containerRef.current?.querySelector(
            `[data-block-index="${i}"]`
          );
          if (blockEl) {
            blockContents.push(blockEl.textContent?.slice(0, 100) || "");
          }
        }

        // Set final selection to show inline form
        setSelectionState({
          isSelecting: false,
          anchorBlockIndex: null,
          focusBlockIndex: null,
          finalSelection: {
            startBlockIndex: selectedRange.start,
            endBlockIndex: selectedRange.end,
            startLine: startBlock.startLine,
            endLine: endBlock.endLine,
            blockContent: blockContents.join("\n").slice(0, 200),
          },
        });
        return;
      }
    }

    setSelectionState({
      isSelecting: false,
      anchorBlockIndex: null,
      focusBlockIndex: null,
      finalSelection: null,
    });
  }, [selectionState.isSelecting, selectedRange, getBlockByIndex]);

  const handleCommentSubmit = useCallback(
    async (body: string) => {
      if (!selectionState.finalSelection) return;

      await onCreateThread(
        {
          startLine: selectionState.finalSelection.startLine,
          endLine: selectionState.finalSelection.endLine,
          blockContent: selectionState.finalSelection.blockContent,
        },
        body
      );

      setSelectionState((prev) => ({ ...prev, finalSelection: null }));
    },
    [selectionState.finalSelection, onCreateThread]
  );

  const handleCommentCancel = useCallback(() => {
    setSelectionState((prev) => ({ ...prev, finalSelection: null }));
  }, []);

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

  const getTextContent = useCallback((node: unknown): string => {
    if (typeof node === "string") return node;
    if (
      node &&
      typeof node === "object" &&
      "props" in node &&
      node.props &&
      typeof node.props === "object" &&
      "children" in node.props
    ) {
      const children = node.props.children;
      if (typeof children === "string") return children;
      if (Array.isArray(children))
        return children.map(getTextContent).join("");
    }
    if (Array.isArray(node)) return node.map(getTextContent).join("");
    return "";
  }, []);

  const createBlockComponent = useCallback(
    (Tag: BlockTag) => {
      const BlockComponent: React.FC<BlockComponentProps> = ({
        node,
        children,
        ...rest
      }) => {
        const position = node?.position;
        const startLine = position?.start?.line;
        const endLine = position?.end?.line;

        if (!startLine || !endLine) {
          return <Tag {...rest}>{children}</Tag>;
        }

        const blockIndex = registerBlock(startLine, endLine);

        const threadIds = getThreadsForRange(startLine, endLine);
        const hasThread = threadIds.length > 0;
        const isActive =
          activeThreadId !== null && threadIds.includes(activeThreadId);

        const isInSelectionRange =
          selectedRange !== null &&
          blockIndex >= selectedRange.start &&
          blockIndex <= selectedRange.end;

        // Check if this block is in the final selection (for keeping highlight while form is open)
        const isInFinalSelection =
          selectionState.finalSelection !== null &&
          blockIndex >= selectionState.finalSelection.startBlockIndex &&
          blockIndex <= selectionState.finalSelection.endBlockIndex;

        const blockContent = getTextContent(children);

        // Check if inline form should appear after this block
        const showInlineForm =
          selectionState.finalSelection !== null &&
          blockIndex === selectionState.finalSelection.endBlockIndex;

        return (
          <>
            <CommentableBlock
              blockIndex={blockIndex}
              startLine={startLine}
              endLine={endLine}
              hasThread={hasThread}
              isActive={isActive}
              isInSelectionRange={isInSelectionRange}
              isSelecting={selectionState.isSelecting}
              isInFinalSelection={isInFinalSelection}
              onPointerDown={(e) => handleBlockPointerDown(blockIndex, e)}
              onAddComment={() => {
                setSelectionState({
                  isSelecting: false,
                  anchorBlockIndex: null,
                  focusBlockIndex: null,
                  finalSelection: {
                    startBlockIndex: blockIndex,
                    endBlockIndex: blockIndex,
                    startLine,
                    endLine,
                    blockContent: blockContent.slice(0, 200),
                  },
                });
              }}
              onClick={() => {
                if (threadIds[0]) {
                  onThreadClick(threadIds[0]);
                }
              }}
            >
              <Tag {...rest}>{children}</Tag>
            </CommentableBlock>
            {showInlineForm && selectionState.finalSelection && (
              <InlineCommentForm
                lineSelection={{
                  startLine: selectionState.finalSelection.startLine,
                  endLine: selectionState.finalSelection.endLine,
                  blockContent: selectionState.finalSelection.blockContent,
                }}
                onSubmit={handleCommentSubmit}
                onCancel={handleCommentCancel}
              />
            )}
          </>
        );
      };
      BlockComponent.displayName = `Block${Tag}`;
      return BlockComponent;
    },
    [
      activeThreadId,
      getTextContent,
      getThreadsForRange,
      handleBlockPointerDown,
      handleCommentSubmit,
      handleCommentCancel,
      onThreadClick,
      registerBlock,
      selectedRange,
      selectionState.isSelecting,
      selectionState.finalSelection,
    ]
  );

  const PreComponent: React.FC<BlockComponentProps> = useCallback(
    ({ node, children, ...rest }) => {
      const childArray = React.Children.toArray(children);
      const codeElement = childArray.find(
        (child): child is React.ReactElement =>
          React.isValidElement(child) && child.type === "code"
      );

      if (!codeElement) {
        const position = node?.position;
        const startLine = position?.start?.line ?? 1;
        const endLine = position?.end?.line ?? 1;
        const blockIndex = registerBlock(startLine, endLine);

        return (
          <CommentableBlock
            blockIndex={blockIndex}
            startLine={startLine}
            endLine={endLine}
            hasThread={false}
            isActive={false}
            isInSelectionRange={false}
            isSelecting={selectionState.isSelecting}
            isInFinalSelection={false}
            onPointerDown={(e) => handleBlockPointerDown(blockIndex, e)}
            onAddComment={() => {}}
            onClick={() => {}}
          >
            <pre {...rest}>{children}</pre>
          </CommentableBlock>
        );
      }

      const className =
        (codeElement.props as { className?: string }).className || "";
      const languageMatch = /language-(\w+)/.exec(className);
      const language = languageMatch?.[1] ?? "text";
      const codeContent = String(
        (codeElement.props as { children?: React.ReactNode }).children || ""
      ).replace(/\n$/, "");

      const position = node?.position;
      const sourceStartLine = (position?.start?.line ?? 0) + 1;

      return (
        <CodeBlockWithLines
          code={codeContent}
          language={language}
          sourceStartLine={sourceStartLine}
          getBlockIndex={(sourceLine: number) => registerBlock(sourceLine, sourceLine)}
          selectedRange={selectedRange}
          isSelecting={selectionState.isSelecting}
          finalSelection={selectionState.finalSelection}
          getThreadsForLine={getThreadsForLine}
          activeThreadId={activeThreadId}
          onPointerDown={handleBlockPointerDown}
          onAddComment={(blockIndex, startLine, endLine, content) => {
            setSelectionState({
              isSelecting: false,
              anchorBlockIndex: null,
              focusBlockIndex: null,
              finalSelection: {
                startBlockIndex: blockIndex,
                endBlockIndex: blockIndex,
                startLine,
                endLine,
                blockContent: content,
              },
            });
          }}
          onThreadClick={onThreadClick}
          renderInlineForm={(show) =>
            show && selectionState.finalSelection ? (
              <InlineCommentForm
                lineSelection={{
                  startLine: selectionState.finalSelection.startLine,
                  endLine: selectionState.finalSelection.endLine,
                  blockContent: selectionState.finalSelection.blockContent,
                }}
                onSubmit={handleCommentSubmit}
                onCancel={handleCommentCancel}
              />
            ) : null
          }
        />
      );
    },
    [
      activeThreadId,
      getThreadsForLine,
      handleBlockPointerDown,
      handleCommentSubmit,
      handleCommentCancel,
      onThreadClick,
      registerBlock,
      selectedRange,
      selectionState.isSelecting,
      selectionState.finalSelection,
    ]
  );

  const components: Components = useMemo(
    () => ({
      p: createBlockComponent("p") as Components["p"],
      h1: createBlockComponent("h1") as Components["h1"],
      h2: createBlockComponent("h2") as Components["h2"],
      h3: createBlockComponent("h3") as Components["h3"],
      h4: createBlockComponent("h4") as Components["h4"],
      h5: createBlockComponent("h5") as Components["h5"],
      h6: createBlockComponent("h6") as Components["h6"],
      pre: PreComponent as Components["pre"],
      table: createBlockComponent("table") as Components["table"],
      ul: createBlockComponent("ul") as Components["ul"],
      ol: createBlockComponent("ol") as Components["ol"],
      blockquote: createBlockComponent("blockquote") as Components["blockquote"],
      hr: createBlockComponent("hr") as Components["hr"],
    }),
    [createBlockComponent, PreComponent]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "markdown-viewer relative",
        selectionState.isSelecting && "select-none"
      )}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
    >
      <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-mt-20 pl-8 prose-p:my-2 prose-headings:my-3 prose-hr:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:my-2 prose-blockquote:my-2 prose-table:my-2 [&_code:not(pre_code)]:bg-zinc-100 [&_code:not(pre_code)]:dark:bg-zinc-800 [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:rounded [&_code:not(pre_code)]:text-sm [&_code:not(pre_code)]:font-normal [&_code:not(pre_code)]:before:content-none [&_code:not(pre_code)]:after:content-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
