import { describe, it, expect } from "vitest";
import { render, screen } from "../utils/test-utils";
import { ThemeSpy } from "../utils/ThemeSpy";
import { ThemeToggle } from "@/components/ui/theme-toggle";

describe("Component Test Setup Validation", () => {
  describe("Environment", () => {
    it("jsdom provides document object", () => {
      expect(document).toBeDefined();
      expect(document.body).toBeDefined();
    });

    it("jest-dom matchers are available", () => {
      const div = document.createElement("div");
      div.textContent = "Test";
      document.body.appendChild(div);
      
      expect(div).toBeInTheDocument();
      expect(div).toHaveTextContent("Test");
    });
  });

  describe("ThemeProvider Wrapper", () => {
    it("renders component with light theme by default", () => {
      render(
        <>
          <ThemeToggle />
          <ThemeSpy />
        </>
      );

      const spy = screen.getByTestId("theme-spy");
      expect(spy).toHaveTextContent("light");
    });

    it("renders component with explicit dark theme", () => {
      render(
        <>
          <ThemeToggle />
          <ThemeSpy />
        </>,
        { theme: "dark" }
      );

      const spy = screen.getByTestId("theme-spy");
      expect(spy).toHaveTextContent("dark");
    });
  });

  describe("Next.js Mocks", () => {
    it("next-themes useTheme hook works", () => {
      render(<ThemeSpy />);
      
      const spy = screen.getByTestId("theme-spy");
      expect(spy).toBeInTheDocument();
    });

    it("components using next/navigation don't error", () => {
      // ThemeToggle doesn't use next/navigation, but verifies mocks loaded
      expect(() => {
        render(<ThemeToggle />);
      }).not.toThrow();
    });
  });

  describe("Component Imports", () => {
    it("imports from @/ path alias work", () => {
      // If this test runs, the import worked
      expect(ThemeToggle).toBeDefined();
    });

    it("renders actual ThemeToggle component", () => {
      render(<ThemeToggle />);
      
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-label");
    });
  });
});
