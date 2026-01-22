"use client";

import { getHighlightClasses } from "@/lib/highlight-styles";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { Highlight, themes } from "prism-react-renderer";
import React, { useState } from "react";

interface CodeBlockWithLinesProps {
  code: string;
  language: string;
  sourceStartLine: number;

  getBlockIndex: (sourceLine: number) => number;

  selectedRange: { start: number; end: number } | null;
  isSelecting: boolean;
  finalSelection: {
    startBlockIndex: number;
    endBlockIndex: number;
    startLine: number;
    endLine: number;
    blockContent: string;
  } | null;

  getThreadsForLine: (line: number) => string[];
  activeThreadId: string | null;

  onPointerDown: (blockIndex: number, e: React.PointerEvent) => void;
  onAddComment: (
    blockIndex: number,
    startLine: number,
    endLine: number,
    content: string
  ) => void;
  onThreadClick: (threadId: string) => void;
  
  renderInlineForm: (show: boolean) => React.ReactNode;
}

export function CodeBlockWithLines({
  code,
  language,
  sourceStartLine,
  getBlockIndex,
  selectedRange,
  isSelecting,
  finalSelection,
  getThreadsForLine,
  activeThreadId,
  onPointerDown,
  onAddComment,
  onThreadClick,
  renderInlineForm,
}: CodeBlockWithLinesProps) {
  const { resolvedTheme } = useTheme();
  const prismTheme = resolvedTheme === "dark" ? themes.vsDark : themes.github;

  return (
    <Highlight code={code} language={language} theme={prismTheme}>
      {({ tokens, getLineProps, getTokenProps }) => {
        const elements: React.ReactNode[] = [];

        tokens.forEach((line, lineIndex) => {
          const sourceLine = sourceStartLine + lineIndex;
          const blockIndex = getBlockIndex(sourceLine);

          // Add the code line
          elements.push(
            <CodeLine
              key={`line-${lineIndex}`}
              blockIndex={blockIndex}
              sourceLine={sourceLine}
              lineNumber={lineIndex + 1}
              selectedRange={selectedRange}
              isSelecting={isSelecting}
              finalSelection={finalSelection}
              getThreadsForLine={getThreadsForLine}
              activeThreadId={activeThreadId}
              onPointerDown={onPointerDown}
              onAddComment={onAddComment}
              onThreadClick={onThreadClick}
              lineProps={getLineProps({ line })}
            >
              {line.map((token, tokenIndex) => (
                <span key={tokenIndex} {...getTokenProps({ token })} />
              ))}
            </CodeLine>
          );

          // Check if inline form should appear after this line
          const showFormAfterThisLine =
            finalSelection !== null &&
            blockIndex === finalSelection.endBlockIndex;

          if (showFormAfterThisLine) {
            elements.push(
              <div key={`form-${lineIndex}`} className="my-2">
                {renderInlineForm(true)}
              </div>
            );
          }
        });

        return (
          <pre className="relative overflow-x-auto rounded-md bg-zinc-50 dark:bg-zinc-900 p-4 text-sm">
            {elements}
          </pre>
        );
      }}
    </Highlight>
  );
}

interface CodeLineProps {
  blockIndex: number;
  sourceLine: number;
  lineNumber: number;
  selectedRange: { start: number; end: number } | null;
  isSelecting: boolean;
  finalSelection: {
    startBlockIndex: number;
    endBlockIndex: number;
    startLine: number;
    endLine: number;
    blockContent: string;
  } | null;
  getThreadsForLine: (line: number) => string[];
  activeThreadId: string | null;
  onPointerDown: (blockIndex: number, e: React.PointerEvent) => void;
  onAddComment: (
    blockIndex: number,
    startLine: number,
    endLine: number,
    content: string
  ) => void;
  onThreadClick: (threadId: string) => void;
  lineProps: React.HTMLAttributes<HTMLDivElement>;
  children: React.ReactNode;
}

function CodeLine({
  blockIndex,
  sourceLine,
  lineNumber,
  selectedRange,
  isSelecting,
  finalSelection,
  getThreadsForLine,
  activeThreadId,
  onPointerDown,
  onAddComment,
  onThreadClick,
  lineProps,
  children,
}: CodeLineProps) {
  const [isHovered, setIsHovered] = useState(false);

  const threadIds = getThreadsForLine(sourceLine);
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

  const showBlueHighlight = isInSelectionRange || isInFinalSelection;

  const highlightClasses = getHighlightClasses({
    showBlueHighlight,
    isSelecting,
    isHovered,
    hasThread,
    isActive,
    activeThreadHighlightVariant: "yellow",
  });

  const { className: lineClassName, ...restLineProps } = lineProps;

  return (
    <div
      {...restLineProps}
      className={cn(
        lineClassName,
        "flex relative transition-colors select-none scroll-mt-24",
        ...highlightClasses,
      )}
      data-block-index={blockIndex}
      data-source-line={sourceLine}
      onPointerDown={(e) => onPointerDown(blockIndex, e)}
      onMouseEnter={() => !isSelecting && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={
        hasThread && threadIds[0]
          ? () => {
              const firstThread = threadIds[0];
              if (firstThread) onThreadClick(firstThread);
            }
          : undefined
      }
    >
      {isHovered && !isSelecting && !hasThread && (
        <button
          className="absolute -left-6 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-primary/10 text-primary"
          onClick={(e) => {
            e.stopPropagation();
            const lineContent =
              e.currentTarget.parentElement?.textContent?.slice(0, 100) || "";
            onAddComment(blockIndex, sourceLine, sourceLine, lineContent);
          }}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}

      <span className="select-none text-muted-foreground text-right w-8 pr-4 shrink-0">
        {lineNumber}
      </span>

      <span className="flex-1">{children}</span>
    </div>
  );
}
