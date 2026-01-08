"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BlockInfo } from "./use-block-registry";

export interface SelectionState {
  isSelecting: boolean;
  anchorBlockIndex: number | null;
  focusBlockIndex: number | null;
  finalSelection: FinalSelection | null;
}

export interface FinalSelection {
  startBlockIndex: number;
  endBlockIndex: number;
  startLine: number;
  endLine: number;
  blockContent: string;
}

export interface SelectedRange {
  start: number;
  end: number;
}

export interface UseBlockSelectionOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  getBlockByIndex: (index: number) => BlockInfo | null;
}

export interface UseBlockSelectionReturn {
  selectionState: SelectionState;
  selectedRange: SelectedRange | null;
  handleBlockPointerDown: (blockIndex: number, e: React.PointerEvent) => void;
  handleContainerPointerMove: (e: React.PointerEvent) => void;
  handleContainerPointerUp: () => void;
  setFinalSelection: (selection: FinalSelection | null) => void;
  clearSelection: () => void;
}

const initialSelectionState: SelectionState = {
  isSelecting: false,
  anchorBlockIndex: null,
  focusBlockIndex: null,
  finalSelection: null,
};

export function useBlockSelection({
  containerRef,
  getBlockByIndex,
}: UseBlockSelectionOptions): UseBlockSelectionReturn {
  const [selectionState, setSelectionState] = useState<SelectionState>(initialSelectionState);

  const selectedRange = useMemo((): SelectedRange | null => {
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
        setSelectionState(initialSelectionState);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (!selectionState.finalSelection) return;

      const target = e.target as HTMLElement;
      const isInsideForm = target.closest("[data-comment-form]");
      const isInsideSelectedBlock = target.closest("[data-block-index]");

      if (!isInsideForm && !isInsideSelectedBlock) {
        setSelectionState(initialSelectionState);
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

    setSelectionState(initialSelectionState);
  }, [selectionState.isSelecting, selectedRange, getBlockByIndex, containerRef]);

  const setFinalSelection = useCallback((selection: FinalSelection | null) => {
    setSelectionState((prev) => ({ ...prev, finalSelection: selection }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionState(initialSelectionState);
  }, []);

  return {
    selectionState,
    selectedRange,
    handleBlockPointerDown,
    handleContainerPointerMove,
    handleContainerPointerUp,
    setFinalSelection,
    clearSelection,
  };
}
