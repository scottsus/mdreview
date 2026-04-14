# MDReview Skill

Use this skill to interact with MDReview — a collaborative markdown document review service.
No client installation required. All interactions use plain `curl`.

## Base URL

```
https://markdown-review.vercel.app
```

---

## Authentication

All write operations and reads on private reviews require an API key.

Generate one from the MDReview dashboard, then export it as an environment variable:

```bash
export MDREVIEW_API_KEY="mdr_<your-key>"
```

Include it as a Bearer token in every request that requires auth:

```bash
curl -H "Authorization: Bearer $MDREVIEW_API_KEY" ...
```

> **Note:** Without an API key, `POST /api/reviews` still succeeds but creates a public/ownerless review (`userId: null`). All four write operations will return `401` on private reviews if the key is absent.

---

## Workflow

The typical agent workflow is:

1. **Create a review** — upload markdown content, get back a `slug` and shareable URL
2. **Share the URL** — send it to the human reviewer
3. **Poll for feedback** — fetch the review by slug to read threads and comments
4. **Reply to threads** — add follow-up comments to existing threads
5. **Resolve threads** — mark threads as resolved once addressed
6. **Export** — download the full review as YAML or JSON if needed

---

## API Reference

### 1. Create a Review

`POST /api/reviews`

Upload markdown content to create a new review. Returns a shareable URL.

```bash
curl -s -X POST https://markdown-review.vercel.app/api/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MDREVIEW_API_KEY" \
  -d '{
    "content": "# My Document\n\nThis is the content to review.",
    "title": "Optional title",
    "source": "agent",
    "agentId": "my-agent"
  }'
```

**Request fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | ✅ | Markdown content to review |
| `title` | string | ❌ | Optional display title (max 255 chars) |
| `source` | `"manual"` \| `"agent"` | ❌ | Defaults to `"manual"` |
| `agentId` | string | ❌ | Identifier for the submitting agent (max 100 chars) |

**Response:**
```json
{
  "id": "uuid",
  "slug": "abc123",
  "url": "https://markdown-review.vercel.app/review/abc123",
  "status": "pending",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

> Save the `slug` — you'll need it to fetch the review later.

---

### 2. Get a Review (with all threads & comments)

`GET /api/reviews/:slug`

Fetch the full review including all comment threads and replies.

```bash
# Public review (no auth required)
curl -s https://markdown-review.vercel.app/api/reviews/<slug>

# Private review (auth required)
curl -s https://markdown-review.vercel.app/api/reviews/<slug> \
  -H "Authorization: Bearer $MDREVIEW_API_KEY"
```

**Response:**
```json
{
  "id": "uuid",
  "slug": "abc123",
  "url": "https://markdown-review.vercel.app/review/abc123",
  "content": "# My Document\n\n...",
  "title": "Optional title",
  "status": "pending",
  "decisionMessage": null,
  "decidedAt": null,
  "source": "agent",
  "threads": [
    {
      "id": "thread-uuid",
      "startLine": 3,
      "endLine": 3,
      "selectedText": "This is the content to review.",
      "resolved": false,
      "resolvedAt": null,
      "comments": [
        {
          "id": "comment-uuid",
          "body": "Can you expand on this?",
          "authorType": "human",
          "authorName": "Alice",
          "createdAt": "2026-01-01T00:01:00.000Z"
        }
      ],
      "createdAt": "2026-01-01T00:01:00.000Z"
    }
  ],
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:01:00.000Z"
}
```

---

### 3. Create a Thread (with opening comment)

`POST /api/reviews/:slug/threads`

Open a new comment thread on a specific line range of the document.

```bash
curl -s -X POST https://markdown-review.vercel.app/api/reviews/<slug>/threads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MDREVIEW_API_KEY" \
  -d '{
    "startLine": 3,
    "endLine": 3,
    "selectedText": "This is the content to review.",
    "body": "Can you expand on this section?",
    "authorType": "agent",
    "authorName": "My Agent"
  }'
```

**Request fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startLine` | integer | ✅ | First line of the selection (1-indexed) |
| `endLine` | integer | ✅ | Last line of the selection (1-indexed) |
| `selectedText` | string | ✅ | The text that was selected |
| `body` | string | ✅ | Opening comment body |
| `authorType` | `"human"` \| `"agent"` | ❌ | Defaults to `"human"` |
| `authorName` | string | ❌ | Display name (max 100 chars) |

**Response:**
```json
{
  "id": "thread-uuid",
  "reviewId": "review-uuid",
  "startLine": 3,
  "endLine": 3,
  "selectedText": "This is the content to review.",
  "resolved": false,
  "comments": [...],
  "createdAt": "2026-01-01T00:01:00.000Z"
}
```

---

### 4. Reply to a Thread

`POST /api/threads/:threadId/replies`

Add a reply to an existing comment thread.

```bash
curl -s -X POST https://markdown-review.vercel.app/api/threads/<threadId>/replies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MDREVIEW_API_KEY" \
  -d '{
    "body": "Thanks for the feedback, I will update this section.",
    "authorType": "agent",
    "authorName": "My Agent"
  }'
```

**Request fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `body` | string | ✅ | Comment text |
| `authorType` | `"human"` \| `"agent"` | ❌ | Defaults to `"human"` |
| `authorName` | string | ❌ | Display name (max 100 chars) |

**Response:**
```json
{
  "id": "comment-uuid",
  "threadId": "thread-uuid",
  "body": "Thanks for the feedback, I will update this section.",
  "authorType": "agent",
  "authorName": "My Agent",
  "createdAt": "2026-01-01T00:02:00.000Z"
}
```

---

### 5. Resolve a Thread

`PATCH /api/threads/:threadId`

Mark a thread as resolved once the feedback has been addressed.

```bash
curl -s -X PATCH https://markdown-review.vercel.app/api/threads/<threadId> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MDREVIEW_API_KEY" \
  -d '{"resolved": true}'
```

To reopen a thread:
```bash
curl -s -X PATCH https://markdown-review.vercel.app/api/threads/<threadId> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MDREVIEW_API_KEY" \
  -d '{"resolved": false}'
```

**Response:**
```json
{
  "id": "thread-uuid",
  "resolved": true,
  "resolvedAt": "2026-01-01T00:03:00.000Z"
}
```

---

### 6. Export a Review

`GET /api/reviews/:slug/export?format=yaml|json`

Download the full review and all comments as YAML (default) or JSON.

```bash
# YAML (default) — add -H "Authorization: Bearer $MDREVIEW_API_KEY" for private reviews
curl -s "https://markdown-review.vercel.app/api/reviews/<slug>/export"

# JSON
curl -s "https://markdown-review.vercel.app/api/reviews/<slug>/export?format=json"
```

**Response (YAML):**
```yaml
review:
  id: uuid
  title: Optional title
  status: pending
  decisionMessage: null
  decidedAt: null
threads:
  - id: thread-uuid
    selectedText: This is the content to review.
    resolved: false
    comments:
      - body: Can you expand on this?
        authorType: human
        authorName: Alice
        createdAt: "2026-01-01T00:01:00.000Z"
```

---

## Tips

- Use `| jq .` to pretty-print JSON responses: `curl -s ... | jq .`
- The `slug` in the URL and in API paths is the same value returned as `slug` from `POST /api/reviews`
- Line numbers are 1-indexed and correspond to lines in the raw markdown source
- Set `source: "agent"` and `authorType: "agent"` so human reviewers can distinguish agent activity
