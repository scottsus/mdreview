"use client";

import { useCallback, useRef } from "react";

export interface BlockInfo {
  index: number;
  startLine: number;
  endLine: number;
}

export interface UseBlockRegistryReturn {
  registerBlock: (startLine: number, endLine: number) => number;
  getBlockByIndex: (index: number) => BlockInfo | null;
  resetRegistry: () => void;
}

export function useBlockRegistry(): UseBlockRegistryReturn {
  const blocksMapRef = useRef<Map<string, BlockInfo>>(new Map());
  const blockCounterRef = useRef(0);

  const resetRegistry = useCallback(() => {
    blocksMapRef.current = new Map();
    blockCounterRef.current = 0;
  }, []);

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

  const getBlockByIndex = useCallback((index: number): BlockInfo | null => {
    for (const block of blocksMapRef.current.values()) {
      if (block.index === index) return block;
    }
    return null;
  }, []);

  return {
    registerBlock,
    getBlockByIndex,
    resetRegistry,
  };
}
