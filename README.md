# MDReview

> This project was generated entirely using AI

![alt text](assets/screenshot.png)

A standalone SaaS for collaborative markdown document review with inline commenting.

MDReview allows you to upload markdown content, share a unique review URL, and collect structured feedback from reviewers. It supports both block-level and line-level commenting, making it ideal for everything from blog posts to technical documentation.

## Features

- **No Auth Required**: Create and participate in reviews anonymously via shareable URLs.
- **Block-level Commenting**: Add comments to any rendered markdown element (paragraphs, headers, tables, etc.).
- **Line-level Code Review**: Comment on specific lines within fenced code blocks.
- **Multi-selection**: Click and drag to select multiple blocks or lines for a single comment thread.
- **Threaded Discussions**: Reply to comments to discuss feedback in context.
- **Review Workflow**: Formal Approve, Reject, or Request Changes decisions.
- **Data Export**: Export completed reviews to YAML or JSON for integration with other tools.
- **AI-Ready**: Built-in MCP server for seamless integration with AI agents like Claude or Cursor.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL with Drizzle ORM
- **Monorepo**: Turborepo + pnpm
- **Content**: React Markdown + Prism (for code highlighting)
- **MCP**: @modelcontextprotocol/sdk

## Project Structure

```
mdreview/
├── apps/
│   └── web/           # Next.js 15 application & API
├── packages/
│   ├── mcp/           # Model Context Protocol server
│   └── typescript-config/ # Shared TypeScript configurations
└── .openfleet/        # Project management & agent context
```

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL database

### Installation

1. Clone the repository and install dependencies:

   ```bash
   pnpm install
   ```

2. Set up the environment variables:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   # Edit apps/web/.env.local and add your DATABASE_URL
   ```

3. Initialize the database:

   ```bash
   pnpm db:push
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

The web app will be available at `http://localhost:3000`.

## MCP Integration

MDReview includes a Model Context Protocol (MCP) server, allowing AI agents to interact with the review process.

### Tools

- `request_review`: Create a new markdown review and get a shareable URL.
- `wait_for_review`: Block until a reviewer makes a decision (approved/rejected/changes requested).
- `get_review_status`: Check the current status and comment count of a review.
- `add_comment`: Add a reply to an existing comment thread.

### Usage with Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mdreview": {
      "command": "node",
      "args": ["/path/to/mdreview/packages/mcp/dist/index.js"],
      "env": {
        "MDREVIEW_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

## License

MIT
