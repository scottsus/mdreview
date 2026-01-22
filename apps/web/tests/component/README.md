# Component Tests

Component testing infrastructure using React Testing Library + Vitest.

## Overview

Tests Next.js 15 Client Components in jsdom environment to verify:
- Component rendering
- User interactions
- Theme switching
- Accessibility
- Props handling

## Quick Start

```bash
# Run all tests
pnpm test:component

# Watch mode (for TDD)
pnpm test:component:watch

# UI mode (for debugging)
pnpm test:component:ui

# Coverage report
pnpm test:component:coverage
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "../utils/test-utils";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "@/components/my-component";

describe("MyComponent", () => {
  it("renders with default props", () => {
    render(<MyComponent />);
    
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("handles user interaction", async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    await user.click(screen.getByRole("button"));
    
    expect(screen.getByText("Clicked!")).toBeInTheDocument();
  });
});
```

### Testing with Themes

```typescript
import { ThemeSpy } from "../utils/ThemeSpy";

it("renders in dark mode", () => {
  render(
    <>
      <MyComponent />
      <ThemeSpy />
    </>,
    { theme: "dark" }
  );

  const spy = screen.getByTestId("theme-spy");
  expect(spy).toHaveTextContent("dark");
});
```

## File Organization

```
src/
├── components/           # Test files for components
│   ├── ThemeToggle.test.tsx
│   └── CodeBlockWithLines.test.tsx
└── utils/               # Test utilities
    ├── test-utils.tsx   # Custom render with ThemeProvider
    └── ThemeSpy.tsx     # Helper for theme state inspection
```

## Available Utilities

### Custom Render

```typescript
import { render } from "../utils/test-utils";

// Automatic ThemeProvider wrapping
render(<MyComponent />);

// Explicit theme
render(<MyComponent />, { theme: "dark" });

// Disable system theme detection (recommended)
render(<MyComponent />, { enableSystem: false });
```

### Theme Spy

```typescript
import { ThemeSpy } from "../utils/ThemeSpy";

render(
  <>
    <ThemeToggle />
    <ThemeSpy />
  </>
);

const spy = screen.getByTestId("theme-spy");
expect(spy).toHaveAttribute("data-theme", "dark");
```

## Common Patterns

### Testing User Interactions

```typescript
import userEvent from "@testing-library/user-event";

it("handles click", async () => {
  const user = userEvent.setup();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  await user.click(screen.getByRole("button"));
  
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Testing Async Components

```typescript
import { waitFor } from "@testing-library/react";

it("loads data", async () => {
  render(<AsyncComponent />);
  
  await waitFor(() => {
    expect(screen.getByText("Loaded!")).toBeInTheDocument();
  });
});
```

### Testing Accessibility

```typescript
it("has accessible label", () => {
  render(<Button />);
  
  const button = screen.getByRole("button");
  expect(button).toHaveAttribute("aria-label", "Toggle theme");
});
```

## Next.js Mocks

The following Next.js modules are automatically mocked:

- **next/navigation**: useRouter, usePathname, useSearchParams, useParams
- **next/image**: Replaced with simple `<img>` tag
- **window.matchMedia**: For system theme detection
- **Element.prototype.scrollIntoView**: For scroll behavior

See `vitest.setup.ts` for implementation details.

## Troubleshooting

### Import errors for @/ paths

Make sure path aliases are configured in `vitest.config.ts`:
```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "../../src"),
  },
}
```

### Theme detection is flaky

Always use explicit theme in tests:
```typescript
// ✅ Good
render(<Component />, { theme: "dark", enableSystem: false });

// ❌ Bad (unpredictable)
render(<Component />, { enableSystem: true });
```

### Tests timeout

Increase timeout in `vitest.config.ts`:
```typescript
test: {
  testTimeout: 10000, // 10 seconds
}
```

### Coverage not generated

Install coverage provider:
```bash
pnpm add -D @vitest/coverage-v8
```

## Related Documentation

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Docs](https://vitest.dev/)
