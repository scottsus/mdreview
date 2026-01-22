import React from "react";
import { useTheme } from "next-themes";

/**
 * Helper component for testing theme state in tests.
 * 
 * Renders theme state as testable DOM content via data attributes.
 * Necessary because useTheme() can only be called inside ThemeProvider.
 * 
 * Usage:
 *   render(<><MyComponent /><ThemeSpy /></>)
 *   const spy = screen.getByTestId("theme-spy")
 *   expect(spy).toHaveAttribute("data-theme", "dark")
 */
export const ThemeSpy: React.FC = () => {
  const { theme, resolvedTheme, systemTheme } = useTheme();
  return (
    <span
      data-testid="theme-spy"
      data-theme={theme}
      data-resolved={resolvedTheme}
      data-system={systemTheme}
    >
      {theme}
    </span>
  );
};
