# Radix Collapsible guardrails

## Context

While implementing resolved thread collapse using shadcn's Collapsible (Radix primitive), initially all threads became collapsible. Unresolved threads should never collapse—users must see active feedback.

## Insight

`CollapsibleTrigger` always toggles state when clicked, regardless of your component's intent. For conditional collapsibility:

1. **Control the `open` state** - Don't allow unintended closed states
2. **Disable or hide the trigger** - Prevent accidental toggling
3. **Force open when active** - Business logic overrides UI state

## Application

Pattern for conditional collapsibility:

```tsx
const canCollapse = thread.resolved && !isActive;

<Collapsible
  open={canCollapse ? isOpen : true}
  onOpenChange={(open) => canCollapse && setIsOpen(open)}
>
  <CollapsibleTrigger disabled={!canCollapse} asChild>
    <Button variant="ghost" className={!canCollapse ? "pointer-events-none" : ""}>
      <ChevronIcon />
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent>
    {/* content */}
  </CollapsibleContent>
</Collapsible>
```

Key points:
- `disabled` prevents keyboard/screen reader toggling
- `pointer-events-none` prevents mouse clicks
- Controlled `open` ensures state stays valid even if triggered

## Related

- [Radix Collapsible docs](https://www.radix-ui.com/primitives/docs/components/collapsible)
- [shadcn Collapsible](https://ui.shadcn.com/docs/components/collapsible)
