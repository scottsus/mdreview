import { vi } from "vitest";

export interface CodeBlockWithLinesProps {
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

/**
 * Creates mock props for CodeBlockWithLines component with sensible defaults.
 *
 * Provides minimal required props for basic rendering tests. Defaults all
 * interaction handlers to vi.fn() and state props to null/empty.
 *
 * Example:
 *   const props = createMockProps()
 *   const props = createMockProps({ language: "python" })
 */
export const createMockProps = (
  overrides?: Partial<CodeBlockWithLinesProps>
): CodeBlockWithLinesProps => ({
  // Basic rendering props
  code: "const foo = 'bar';",
  language: "typescript",
  sourceStartLine: 1,

  // Helper function - mock: line 1 → block 0
  getBlockIndex: (line) => line - 1,

  // Selection state - null for basic tests
  selectedRange: null,
  isSelecting: false,
  finalSelection: null,

  // Threading state - empty for basic tests
  getThreadsForLine: () => [],
  activeThreadId: null,

  // Event handlers - no-op mocks
  onPointerDown: vi.fn(),
  onAddComment: vi.fn(),
  onThreadClick: vi.fn(),
  renderInlineForm: () => null,

  // Apply overrides
  ...overrides,
});
