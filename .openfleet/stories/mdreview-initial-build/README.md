# Story: MDReview Initial Build

**Created**: 2025-01-05
**Status**: implementation-complete (pending deployment)

## Summary

Built MDReview - a standalone SaaS for markdown document review with:

- Anonymous reviews via shareable URLs (no auth required)
- Inline commenting with text selection
- Formal approve/reject/changes-requested workflow
- MCP tools for AI agent integration
- Export to YAML/JSON

## Architecture

```
mdreview/ (monorepo)
├── apps/web/         # Next.js 15 web app → Vercel
└── packages/mcp/     # MCP server → npm @mdreview/mcp
```

## Completed Tasks

- [x] Scout: Competitive research (no existing tool meets requirements)
- [x] Plan: HLD - architecture, data model, API design
- [x] Plan: LLD - detailed implementation guide
- [x] Act: Phase 1 - Repo setup + database schema
- [x] Act: Phase 2 - Core API routes
- [x] Act: Phase 3 - Basic UI (landing, review pages)
- [x] Act: Phase 4 - Inline commenting
- [x] Act: Phase 5 - Review workflow + export
- [x] Act: Phase 6 - MCP server

## Pending Tasks

- [ ] Deploy: Set up Neon/Supabase PostgreSQL
- [ ] Deploy: Push to Vercel
- [ ] Deploy: Publish MCP to npm (`@mdreview/mcp`)
- [ ] Review: Code review
- [ ] Reflect: Capture learnings

## Key Features

| Feature                        | Status |
| ------------------------------ | ------ |
| Upload markdown                | ✅     |
| Shareable review URLs          | ✅     |
| Inline text selection          | ✅     |
| Comment threads                | ✅     |
| Thread highlights              | ✅     |
| Approve/Reject/Request Changes | ✅     |
| Export YAML/JSON               | ✅     |
| MCP: request_review            | ✅     |
| MCP: wait_for_review           | ✅     |
| MCP: get_review_status         | ✅     |
| MCP: add_comment               | ✅     |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL + Drizzle ORM
- **Monorepo**: Turborepo + pnpm
- **MCP**: @modelcontextprotocol/sdk

## Artifacts

- `research.md` - Initial feasibility research
- `competitive-research.md` - Market analysis
- `hld.md` - High-level design
- `lld.md` - Low-level design (detailed implementation guide)

## Local Development

```bash
# Set up database
echo 'DATABASE_URL="postgresql://..."' > apps/web/.env.local
pnpm db:push

# Start dev server
pnpm dev

# Open http://localhost:3000
```
