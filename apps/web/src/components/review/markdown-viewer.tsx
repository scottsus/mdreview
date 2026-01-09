"use client";

import { useBlockRegistry } from "@/hooks/use-block-registry";
import { useBlockSelection } from "@/hooks/use-block-selection";
import { useThreadHighlighting } from "@/hooks/use-thread-highlighting";
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

  const { registerBlock, getBlockByIndex, resetRegistry } = useBlockRegistry();
  const {
    selectionState,
    selectedRange,
    handleBlockPointerDown,
    handleContainerPointerMove,
    handleContainerPointerUp,
    setFinalSelection,
  } = useBlockSelection({ containerRef, getBlockByIndex });
  const { getThreadsForRange, getThreadsForLine } = useThreadHighlighting({ threads });

  const [pendingClear, setPendingClear] = useState<{
    startLine: number;
    endLine: number;
  } | null>(null);

  useEffect(() => {
    if (!pendingClear) return;

    const threadExists = threads.some(
      (t) =>
        t.startLine === pendingClear.startLine &&
        t.endLine === pendingClear.endLine
    );

    if (threadExists) {
      setFinalSelection(null);
      setPendingClear(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      setFinalSelection(null);
      setPendingClear(null);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [threads, pendingClear, setFinalSelection]);

  // Reset block registry on each render (deterministic based on content)
  resetRegistry();

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

  const handleCommentSubmit = useCallback(
    async (body: string) => {
      if (!selectionState.finalSelection) return;

      const { startLine, endLine } = selectionState.finalSelection;

      await onCreateThread(
        {
          startLine,
          endLine,
          blockContent: selectionState.finalSelection.blockContent,
        },
        body
      );

      setPendingClear({ startLine, endLine });
    },
    [selectionState.finalSelection, onCreateThread]
  );

  const handleCommentCancel = useCallback(() => {
    setFinalSelection(null);
  }, [setFinalSelection]);

  const handleAddComment = useCallback(
    (blockIndex: number, startLine: number, endLine: number, blockContent: string) => {
      setFinalSelection({
        startBlockIndex: blockIndex,
        endBlockIndex: blockIndex,
        startLine,
        endLine,
        blockContent: blockContent.slice(0, 200),
      });
    },
    [setFinalSelection]
  );

  const handleBlockPointerDownWithClear = useCallback(
    (blockIndex: number, e: React.PointerEvent) => {
      if (pendingClear) {
        setPendingClear(null);
      }
      handleBlockPointerDown(blockIndex, e);
    },
    [pendingClear, handleBlockPointerDown]
  );

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
        const isActive = activeThreadId !== null && threadIds.includes(activeThreadId);

        const isInSelectionRange =
          selectedRange !== null &&
          blockIndex >= selectedRange.start &&
          blockIndex <= selectedRange.end;

        const isInFinalSelection =
          selectionState.finalSelection !== null &&
          blockIndex >= selectionState.finalSelection.startBlockIndex &&
          blockIndex <= selectionState.finalSelection.endBlockIndex;

        const blockContent = getTextContent(children);

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
              onPointerDown={(e) => handleBlockPointerDownWithClear(blockIndex, e)}
              onAddComment={() => handleAddComment(blockIndex, startLine, endLine, blockContent)}
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
      handleBlockPointerDownWithClear,
      handleCommentSubmit,
      handleCommentCancel,
      handleAddComment,
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
            onPointerDown={(e) => handleBlockPointerDownWithClear(blockIndex, e)}
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
          onPointerDown={handleBlockPointerDownWithClear}
          onAddComment={handleAddComment}
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
      handleBlockPointerDownWithClear,
      handleCommentSubmit,
      handleCommentCancel,
      handleAddComment,
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
      <div className="prose prose-zinc dark:prose-invert max-w-none prose-headings:scroll-mt-20 pl-8 prose-p:my-2 prose-headings:my-3 prose-hr:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:my-2 prose-blockquote:my-2 prose-table:my-2 [&_code:not(pre_code)]:bg-zinc-200 [&_code:not(pre_code)]:dark:bg-zinc-700 [&_code:not(pre_code)]:text-blue-700 [&_code:not(pre_code)]:dark:text-blue-300 [&_code:not(pre_code)]:px-1.5 [&_code:not(pre_code)]:py-0.5 [&_code:not(pre_code)]:!rounded-[3px] [&_code:not(pre_code)]:text-sm [&_code:not(pre_code)]:font-normal [&_code:not(pre_code)]:before:content-none [&_code:not(pre_code)]:after:content-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
