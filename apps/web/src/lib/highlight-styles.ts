export interface HighlightParams {
  showBlueHighlight: boolean;
  isSelecting: boolean;
  isHovered: boolean;
  hasThread: boolean;
  isActive: boolean;
}

export function getHighlightClasses(params: HighlightParams): string[] {
  const { showBlueHighlight, isSelecting, isHovered, hasThread, isActive } =
    params;

  const classes: string[] = [];

  // Selection/final selection highlight (blue)
  if (showBlueHighlight) {
    classes.push("bg-blue-100", "dark:bg-blue-900/40");
  }

  // Normal hover (only when not selecting, no final selection, no thread)
  if (!isSelecting && !showBlueHighlight && isHovered && !hasThread) {
    classes.push("bg-blue-50/50", "dark:bg-blue-900/10");
  }

  // Has thread - purple highlight (when not in selection)
  if (!showBlueHighlight && hasThread) {
    classes.push("bg-violet-50", "dark:bg-violet-900/20");
  }

  // Active thread - darker purple (when not in selection)
  if (!showBlueHighlight && isActive) {
    classes.push("bg-violet-100", "dark:bg-violet-900/40");
  }

  // Cursor style for thread
  if (hasThread) {
    classes.push("cursor-pointer");
  }

  return classes;
}
