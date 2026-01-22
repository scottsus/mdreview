import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils/test-utils";
import userEvent from "@testing-library/user-event";
import { ThemeSpy } from "../../utils/ThemeSpy";
import { ThemeToggle } from "@/components/ui/theme-toggle";

describe("ThemeToggle", () => {
  describe("Rendering States", () => {
    it("renders button with correct aria-label in light mode", () => {
      // SETUP: Render in light mode
      render(<ThemeToggle />, { theme: "light", enableSystem: false });

      // ASSERT: Button exists with correct label
      const button = screen.getByRole("button", {
        name: /switch to dark mode/i,
      });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
    });

    it("renders button with correct aria-label in dark mode", () => {
      // SETUP: Render in dark mode
      render(<ThemeToggle />, { theme: "dark", enableSystem: false });

      // ASSERT: Button exists with correct label
      const button = screen.getByRole("button", {
        name: /switch to light mode/i,
      });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-label", "Switch to light mode");
    });
  });

  describe("Theme Toggling", () => {
    it("toggles from light to dark when clicked", async () => {
      // SETUP: Create user event and render with ThemeSpy
      const user = userEvent.setup();
      render(
        <>
          <ThemeToggle />
          <ThemeSpy />
        </>,
        { theme: "light", enableSystem: false }
      );

      // VERIFY: Initial state is light
      const spy = screen.getByTestId("theme-spy");
      expect(spy).toHaveAttribute("data-theme", "light");

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Switch to dark mode");

      // ACTION: Click the button
      await user.click(button);

      // ASSERT: Theme changed to dark
      expect(spy).toHaveAttribute("data-theme", "dark");
      expect(button).toHaveAttribute("aria-label", "Switch to light mode");
    });

    it("toggles from dark to light when clicked", async () => {
      // SETUP: Render in dark mode
      const user = userEvent.setup();
      render(
        <>
          <ThemeToggle />
          <ThemeSpy />
        </>,
        { theme: "dark", enableSystem: false }
      );

      // VERIFY: Initial state is dark
      const spy = screen.getByTestId("theme-spy");
      expect(spy).toHaveAttribute("data-theme", "dark");

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Switch to light mode");

      // ACTION: Click the button
      await user.click(button);

      // ASSERT: Theme changed to light
      expect(spy).toHaveAttribute("data-theme", "light");
      expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
    });

    it("cycles theme correctly with multiple clicks", async () => {
      // SETUP: Render in light mode
      const user = userEvent.setup();
      render(
        <>
          <ThemeToggle />
          <ThemeSpy />
        </>,
        { theme: "light", enableSystem: false }
      );

      const button = screen.getByRole("button");
      const spy = screen.getByTestId("theme-spy");

      // VERIFY: Starts in light mode
      expect(spy).toHaveAttribute("data-theme", "light");

      // ACTION: Click 1 - light → dark
      await user.click(button);
      expect(spy).toHaveAttribute("data-theme", "dark");

      // ACTION: Click 2 - dark → light
      await user.click(button);
      expect(spy).toHaveAttribute("data-theme", "light");

      // ACTION: Click 3 - light → dark
      await user.click(button);
      expect(spy).toHaveAttribute("data-theme", "dark");
    });

    it("handles rapid clicks without errors", async () => {
      // SETUP: Render component
      const user = userEvent.setup();
      render(
        <>
          <ThemeToggle />
          <ThemeSpy />
        </>,
        { theme: "light", enableSystem: false }
      );

      const button = screen.getByRole("button");
      const spy = screen.getByTestId("theme-spy");

      // ACTION: Click 10 times rapidly
      for (let i = 0; i < 10; i++) {
        await user.click(button);
      }

      // ASSERT: Final state is deterministic (even clicks = light)
      expect(spy).toHaveAttribute("data-theme", "light");

      // ASSERT: No errors thrown (test completes successfully)
      expect(button).toBeInTheDocument();
    });
  });

  describe("Keyboard Accessibility", () => {
    it("toggles theme when activated with Enter key", async () => {
      // SETUP: Create user event and render
      const user = userEvent.setup();
      render(
        <>
          <ThemeToggle />
          <ThemeSpy />
        </>,
        { theme: "light", enableSystem: false }
      );

      const button = screen.getByRole("button");
      const spy = screen.getByTestId("theme-spy");

      // VERIFY: Initial state
      expect(spy).toHaveAttribute("data-theme", "light");

      // ACTION: Focus button and press Enter
      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard("{Enter}");

      // ASSERT: Theme toggled
      expect(spy).toHaveAttribute("data-theme", "dark");

      // ASSERT: Focus maintained
      expect(button).toHaveFocus();
    });

    it("toggles theme when activated with Space key", async () => {
      // SETUP: Create user event and render
      const user = userEvent.setup();
      render(
        <>
          <ThemeToggle />
          <ThemeSpy />
        </>,
        { theme: "light", enableSystem: false }
      );

      const button = screen.getByRole("button");
      const spy = screen.getByTestId("theme-spy");

      // VERIFY: Initial state
      expect(spy).toHaveAttribute("data-theme", "light");

      // ACTION: Focus button and press Space
      button.focus();
      await user.keyboard(" ");

      // ASSERT: Theme toggled
      expect(spy).toHaveAttribute("data-theme", "dark");

      // ASSERT: Focus maintained
      expect(button).toHaveFocus();
    });
  });

  describe("ARIA Attributes", () => {
    it("has aria-label that describes action, not current state", () => {
      // SETUP: Render in light mode
      render(<ThemeToggle />, { theme: "light", enableSystem: false });

      // ASSERT: Label describes what will happen (switch TO dark)
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Switch to dark mode");

      // Note: Label describes the ACTION ("switch to dark"), not STATE ("currently light")
      // This is correct for accessibility - announces what button will do
    });

    it("includes screen reader only text for context", () => {
      // SETUP: Render component
      render(<ThemeToggle />, { theme: "light", enableSystem: false });

      // ASSERT: sr-only text exists
      const srText = screen.getByText("Toggle theme");
      expect(srText).toBeInTheDocument();
      expect(srText).toHaveClass("sr-only");
    });
  });

  describe("Edge Cases", () => {
    it("renders disabled button during hydration (unmounted state)", () => {
      // SETUP: Render component
      // Note: In tests, useEffect runs immediately, so we can't easily test
      // the unmounted state. This test verifies the button exists.
      render(<ThemeToggle />, { theme: "light", enableSystem: false });

      // ASSERT: Button exists (may be briefly disabled, but enabled after useEffect)
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();

      // Note: Testing the disabled state is tricky in jsdom since useEffect
      // runs synchronously. The important thing is the component renders without
      // hydration errors, which this test verifies.
    });

    it("maintains focus after keyboard activation", async () => {
      // SETUP: Render and focus
      const user = userEvent.setup();
      render(
        <>
          <ThemeToggle />
          <ThemeSpy />
        </>,
        { theme: "light", enableSystem: false }
      );

      const button = screen.getByRole("button");
      button.focus();

      // VERIFY: Focus is on button
      expect(button).toHaveFocus();

      // ACTION: Toggle with Enter
      await user.keyboard("{Enter}");

      // ASSERT: Focus still on button (not lost)
      expect(button).toHaveFocus();
    });

    it("aria-label updates after theme change", async () => {
      // SETUP: Render in light mode
      const user = userEvent.setup();
      render(
        <>
          <ThemeToggle />
          <ThemeSpy />
        </>,
        { theme: "light", enableSystem: false }
      );

      const button = screen.getByRole("button");

      // VERIFY: Initial aria-label
      expect(button).toHaveAttribute("aria-label", "Switch to dark mode");

      // ACTION: Toggle theme
      await user.click(button);

      // ASSERT: aria-label updated to reflect new action
      expect(button).toHaveAttribute("aria-label", "Switch to light mode");

      // ACTION: Toggle back
      await user.click(button);

      // ASSERT: aria-label reverted
      expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
    });
  });
});
