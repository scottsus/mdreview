"use client";

import { getHighlightClasses } from "@/lib/highlight-styles";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import React, { useState } from "react";

interface CommentableBlockProps {
  blockIndex: number;
  startLine: number;
  endLine: number;
  hasThread: boolean;
  isActive: boolean;
  isInSelectionRange: boolean;
  isSelecting: boolean;
  isInFinalSelection: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onAddComment: () => void;
  onClick: () => void;
  children: React.ReactNode;
}

export function CommentableBlock({
  blockIndex,
  startLine,
  endLine,
  hasThread,
  isActive,
  isInSelectionRange,
  isSelecting,
  isInFinalSelection,
  onPointerDown,
  onAddComment,
  onClick,
  children,
}: CommentableBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

  const showBlueHighlight = isInSelectionRange || isInFinalSelection;

  const highlightClasses = getHighlightClasses({
    showBlueHighlight,
    isSelecting,
    isHovered,
    hasThread,
    isActive,
    activeThreadHighlightVariant: "yellow",
  });

  return (
    <div
      className={cn(
        "relative transition-colors select-none scroll-mt-24",
        ...highlightClasses,
      )}
      data-block-index={blockIndex}
      data-start-line={startLine}
      data-end-line={endLine}
      onPointerDown={onPointerDown}
      onMouseEnter={() => !isSelecting && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={hasThread ? onClick : undefined}
    >
      {/* Hover controls - positioned to the left */}
      {isHovered && !isSelecting && (
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground select-none">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddComment();
            }}
            className="p-0.5 rounded hover:bg-primary/10 text-primary"
            title="Add comment"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {children}
    </div>
  );
}
