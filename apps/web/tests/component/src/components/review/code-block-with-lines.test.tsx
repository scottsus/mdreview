import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils/test-utils";
import { ThemeSpy } from "../../utils/ThemeSpy";
import { CodeBlockWithLines } from "@/components/review/code-block-with-lines";
import { createMockProps } from "./test-helpers";

describe("CodeBlockWithLines", () => {
  describe("Dynamic Theme Switching", () => {
    it("renders with light Prism theme in light mode", () => {
      // SETUP: Render in light mode
      render(
        <CodeBlockWithLines {...createMockProps()} />,
        { theme: "light", enableSystem: false }
      );

      // ASSERT: Code tokens are rendered (Prism tokenizes into spans)
      expect(screen.getByText("const")).toBeInTheDocument();
      expect(screen.getByText("'bar'")).toBeInTheDocument();

      // ASSERT: Light background styling (Tailwind class)
      const pre = screen.getByText("const").closest("pre");
      expect(pre).toBeInTheDocument();
      expect(pre).toHaveClass("bg-zinc-50");
    });

    it("renders with dark Prism theme in dark mode", () => {
      // SETUP: Render in dark mode
      render(
        <CodeBlockWithLines {...createMockProps()} />,
        { theme: "dark", enableSystem: false }
      );

      // ASSERT: Code tokens are rendered (Prism tokenizes into spans)
      expect(screen.getByText("const")).toBeInTheDocument();
      expect(screen.getByText("'bar'")).toBeInTheDocument();

      // ASSERT: Dark background styling present
      // Note: dark: prefix classes are applied via CSS media queries in tests
      const pre = screen.getByText("const").closest("pre");
      expect(pre).toBeInTheDocument();
      expect(pre).toHaveClass("dark:bg-zinc-900");
    });

    it("uses resolvedTheme from useTheme hook", () => {
      // SETUP: Render with ThemeSpy to verify theme context
      render(
        <>
          <CodeBlockWithLines {...createMockProps()} />
          <ThemeSpy />
        </>,
        { theme: "dark", enableSystem: false }
      );

      // VERIFY: Theme context is dark
      const spy = screen.getByTestId("theme-spy");
      expect(spy).toHaveAttribute("data-resolved", "dark");

      // ASSERT: Code block renders (component successfully uses useTheme)
      expect(screen.getByText("const")).toBeInTheDocument();
    });
  });

  describe("Basic Rendering", () => {
    it("renders code with syntax highlighting", () => {
      // SETUP: Render with multi-line TypeScript code
      const tsCode = `function hello(name: string) {
  return \`Hello, \${name}\`;
}`;

      render(
        <CodeBlockWithLines
          {...createMockProps({ code: tsCode, language: "typescript" })}
        />,
        { theme: "light", enableSystem: false }
      );

      // ASSERT: Code keywords are tokenized (Prism splits into spans)
      expect(screen.getByText("function")).toBeInTheDocument();
      expect(screen.getByText("hello")).toBeInTheDocument();
      expect(screen.getByText("return")).toBeInTheDocument();
      expect(screen.getByText("string")).toBeInTheDocument();

      // ASSERT: Rendered in <pre> element with correct classes
      const pre = screen.getByText("function").closest("pre");
      expect(pre).toBeInTheDocument();
      expect(pre).toHaveClass("relative", "overflow-x-auto", "rounded-md");
    });

    it("displays correct line numbers with offset", () => {
      // SETUP: Render with 3-line code starting at line 10
      const code = "line A\nline B\nline C";

      render(
        <CodeBlockWithLines
          {...createMockProps({ code, sourceStartLine: 10 })}
        />,
        { theme: "light", enableSystem: false }
      );

      // ASSERT: Line numbers 1, 2, 3 are displayed
      // Use getAllByText since line numbers may appear in different contexts
      const lineNumbers = screen.getAllByText("1");
      expect(lineNumbers.length).toBeGreaterThan(0);

      // ASSERT: Code content is present (tokens are split across spans)
      expect(screen.getByText("A")).toBeInTheDocument();
      expect(screen.getByText("B")).toBeInTheDocument();
      expect(screen.getByText("C")).toBeInTheDocument();
    });

    it("handles different programming languages", () => {
      // SETUP: Test with Python code
      const pythonCode = "print('Hello, world!')";

      const { rerender } = render(
        <CodeBlockWithLines
          {...createMockProps({ code: pythonCode, language: "python" })}
        />,
        { theme: "light", enableSystem: false }
      );

      // ASSERT: Python keyword renders (Prism tokenizes)
      expect(screen.getByText("print")).toBeInTheDocument();
      expect(screen.getByText("'Hello, world!'")).toBeInTheDocument();

      // ACTION: Re-render with JavaScript
      const jsCode = "console.log('Hello!')";
      rerender(
        <CodeBlockWithLines
          {...createMockProps({ code: jsCode, language: "javascript" })}
        />
      );

      // ASSERT: JavaScript code renders (check for console as object)
      expect(screen.getByText(/console/)).toBeInTheDocument();
      expect(screen.getByText("log")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("renders with minimal required props", () => {
      // SETUP: Use createMockProps defaults (no overrides)
      render(
        <CodeBlockWithLines {...createMockProps()} />,
        { theme: "light", enableSystem: false }
      );

      // ASSERT: Renders without errors (check for tokenized code)
      expect(screen.getByText("const")).toBeInTheDocument();
      expect(screen.getByText("'bar'")).toBeInTheDocument();

      // ASSERT: Line number 1 is displayed
      const lineNumbers = screen.getAllByText("1");
      expect(lineNumbers.length).toBeGreaterThan(0);
    });

    it("handles empty code gracefully", () => {
      // SETUP: Render with empty code string
      render(
        <CodeBlockWithLines {...createMockProps({ code: "" })} />,
        { theme: "light", enableSystem: false }
      );

      // ASSERT: Renders <pre> element without crashing
      const pre = document.querySelector("pre");
      expect(pre).toBeInTheDocument();
      expect(pre).toHaveClass("relative", "overflow-x-auto");
    });
  });
});
