"use client";

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

  const lineLabel =
    startLine === endLine ? `L${startLine}` : `L${startLine}-${endLine}`;

  // Show blue highlight during drag OR when in final selection (form is open)
  const showBlueHighlight = isInSelectionRange || isInFinalSelection;

  return (
    <div
      className={cn(
        "relative transition-colors select-none",
        // Selection/final selection highlight (blue)
        showBlueHighlight && "bg-blue-100 dark:bg-blue-900/40",
        // Normal hover (only when not selecting, no final selection, no thread)
        !isSelecting &&
          !showBlueHighlight &&
          isHovered &&
          !hasThread &&
          "bg-blue-50/50 dark:bg-blue-900/10",
        // Has thread - purple highlight (when not in selection)
        !showBlueHighlight &&
          hasThread &&
          "bg-violet-50 dark:bg-violet-900/20",
        // Active thread - darker purple (when not in selection)
        !showBlueHighlight && isActive && "bg-violet-100 dark:bg-violet-900/40",
        hasThread && "cursor-pointer"
      )}
      data-block-index={blockIndex}
      data-start-line={startLine}
      data-end-line={endLine}
      suppressHydrationWarning
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
