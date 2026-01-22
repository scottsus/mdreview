import React, { ReactElement } from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";

interface CustomRenderOptions extends RenderOptions {
  theme?: "light" | "dark" | "system";
  enableSystem?: boolean;
}

const ThemeWrapper = ({
  children,
  theme = "light",
  enableSystem = false,
}: CustomRenderOptions & { children: React.ReactNode }) => (
  <ThemeProvider
    attribute="class"
    defaultTheme={theme}
    enableSystem={enableSystem}
  >
    {children}
  </ThemeProvider>
);

export const renderWithTheme = (
  ui: ReactElement,
  { theme, enableSystem, ...options }: CustomRenderOptions = {}
): RenderResult =>
  render(ui, {
    wrapper: (props) => (
      <ThemeWrapper {...props} theme={theme} enableSystem={enableSystem} />
    ),
    ...options,
  });

// Re-export everything from React Testing Library
export * from "@testing-library/react";

// Override render to use our custom version by default
export { renderWithTheme as render };
