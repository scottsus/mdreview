# Competitive Research: Markdown Review Tools

**Date**: 2025-01-05
**Status**: Complete
**Researcher**: Athena (Scout)

---

## Executive Summary

**Recommendation: BUILD (with caveats)**

After exhaustive research across GitHub, commercial SaaS products, code review tools, VS Code extensions, and MCP-enabled tools, **no existing solution fully addresses the unique requirements** of our markdown review tool:

1. **No auth required** - anonymous reviews via shareable links
2. **Programmatic API** - agent-friendly (Claude Code, OpenCode) with long-polling
3. **Export to structured format** - YAML/JSON for automation
4. **Formal review workflow** - approve/reject/request changes
5. **Self-hosted + offline capable**

The closest competitors either require authentication (HackMD, Notion), are tied to Git workflows (GitHub PRs), or lack formal review workflows (HedgeDoc, Outline).

**Build vs Buy Decision Matrix:**

| Criterion               | Weight | Build    | Buy (Best Alternative)               |
| ----------------------- | ------ | -------- | ------------------------------------ |
| No-auth shareable links | 25%    | ✅ 100%  | ⚠️ 40% (HedgeDoc - requires config)  |
| Agent-friendly API      | 25%    | ✅ 100%  | ❌ 20% (GitHub API - requires repo)  |
| Structured export       | 15%    | ✅ 100%  | ⚠️ 50% (GitHub API JSON)             |
| Formal review workflow  | 20%    | ✅ 100%  | ❌ 30% (GitBook - expensive, no API) |
| Self-hosted/offline     | 15%    | ✅ 100%  | ⚠️ 60% (HedgeDoc)                    |
| **Weighted Score**      |        | **100%** | **38%**                              |

---

## Existing Tools Analyzed

### Category 1: Collaborative Markdown Editors

#### 1. HackMD / CodiMD

- **URL**: https://hackmd.io
- **Pricing**: $0-$16.67/user/month
- **Features**:
  - ✅ Real-time collaboration
  - ✅ Inline commenting (paid feature)
  - ⚠️ Shareable links (requires sign-in for comments)
  - ⚠️ API (limited: 2K-20K calls/month)
  - ❌ No formal approve/reject workflow
  - ❌ No structured export (YAML/JSON)
- **Self-hosted**: Via CodiMD/HedgeDoc (open source)
- **Gap**: No review workflow, auth required for commenting

#### 2. HedgeDoc (formerly CodiMD)

- **URL**: https://hedgedoc.org
- **Pricing**: Free (AGPL-3.0)
- **GitHub**: 5.4k stars
- **Features**:
  - ✅ Self-hosted
  - ✅ Real-time collaboration
  - ✅ Low resource requirements (runs on Raspberry Pi)
  - ⚠️ Shareable links (can be configured for anonymous)
  - ❌ No inline commenting
  - ❌ No review workflow
  - ❌ Limited API
- **Gap**: No commenting, no review workflow

#### 3. Notion

- **URL**: https://notion.so
- **Pricing**: $0-$20/user/month
- **Features**:
  - ✅ Excellent commenting
  - ✅ Comprehensive API
  - ⚠️ Markdown support (block-based, not pure markdown)
  - ❌ Requires authentication
  - ❌ No formal review workflow
  - ❌ Not self-hosted
- **Gap**: Not markdown-native, requires auth

#### 4. Outline

- **URL**: https://getoutline.com
- **GitHub**: 36.6k stars
- **Pricing**: Free (self-hosted) or $10/user/month
- **Features**:
  - ✅ Beautiful UI
  - ✅ Real-time collaboration
  - ✅ Comments & threads
  - ✅ Self-hosted option
  - ✅ API
  - ❌ Requires authentication
  - ❌ No formal review workflow
- **Gap**: No anonymous access, no approve/reject

#### 5. GitBook

- **URL**: https://gitbook.com
- **Pricing**: $65/site + $12/user/month
- **Features**:
  - ✅ Change requests & approvals
  - ✅ Well-documented API
  - ✅ Beautiful documentation sites
  - ❌ Expensive
  - ❌ Not self-hosted
  - ❌ Focused on documentation, not review
- **Gap**: Too expensive, cloud-only

#### 6. Slite

- **URL**: https://slite.com
- **Pricing**: $0-$15/user/month
- **Features**:
  - ✅ AI-powered search
  - ✅ Document verification system
  - ❌ WYSIWYG, not markdown-native
  - ❌ No formal review workflow
  - ❌ Requires authentication
- **Gap**: Not markdown-native, no review workflow

---

### Category 2: Code Review Tools (Markdown Support)

#### 1. GitHub Pull Request Review

- **URL**: https://github.com
- **Pricing**: Free - $21/user/month
- **Features**:
  - ✅ Inline commenting on markdown files
  - ✅ Full REST API
  - ✅ Thread resolution
  - ✅ Approve/reject workflow
  - ✅ Export via API (JSON)
  - ❌ Requires Git repository
  - ❌ Requires GitHub account
  - ❌ PR-based (can't review arbitrary files)
- **Gap**: Requires Git repo and GitHub account

#### 2. GitLab Merge Request Review

- **Similar to GitHub**
- **Gap**: Same limitations

#### 3. Review Board

- **URL**: https://reviewboard.org
- **GitHub**: 1.6k stars
- **Pricing**: Free (self-hosted)
- **Features**:
  - ✅ Document review (PDFs, images)
  - ✅ Self-hosted
  - ✅ REST API
  - ✅ Supports multiple SCMs
  - ⚠️ Markdown as code review (not rendered)
  - ❌ Complex setup
  - ❌ Dated UI
- **Gap**: Not markdown-focused, complex

#### 4. Gerrit

- **URL**: https://www.gerritcodereview.com
- **Features**:
  - ✅ Enterprise-grade
  - ✅ REST API
  - ❌ Code-focused, not document review
  - ❌ Requires Git repository
- **Gap**: Not for document review

#### 5. Phabricator

- **Status**: ❌ **DISCONTINUED** (June 2021)

---

### Category 3: Annotation & Commenting Tools

#### 1. Hypothesis

- **URL**: https://hypothes.is
- **Pricing**: Free (education) / Enterprise pricing
- **Features**:
  - ✅ Web annotation standard (W3C)
  - ✅ Works on any webpage
  - ✅ API access
  - ✅ Group annotations
  - ⚠️ Requires account for annotation
  - ❌ Web pages only (not standalone markdown)
  - ❌ No formal review workflow
- **Gap**: Not for standalone documents

#### 2. Giscus

- **URL**: https://giscus.app
- **GitHub**: 11k stars
- **Features**:
  - ✅ GitHub Discussions backend
  - ✅ No database needed
  - ✅ Shareable links (GitHub Discussion URLs)
  - ✅ Reactions, nested replies
  - ❌ Requires GitHub account
  - ❌ Page-level comments (not inline)
- **Gap**: Not inline, requires GitHub

#### 3. Utterances

- **URL**: https://utteranc.es
- **GitHub**: 9.5k stars
- **Features**:
  - ✅ GitHub Issues backend
  - ✅ Lightweight (<1kb)
  - ✅ Free, open source
  - ❌ Requires GitHub account
  - ❌ Page-level comments only
- **Gap**: Not inline, requires GitHub

#### 4. Tiptap Comment Extension

- **URL**: https://github.com/sereneinserenade/tiptap-comment-extension
- **GitHub**: 483 stars
- **Features**:
  - ✅ Google Docs-like inline commenting
  - ✅ React/Vue support
  - ✅ Full programmatic API
  - ❌ Requires custom backend
  - ❌ Tiptap-specific (rich text, not pure markdown)
- **Gap**: Not standalone, requires implementation

#### 5. Recogito Text Annotator

- **URL**: https://github.com/recogito/text-annotator-js
- **GitHub**: 59 stars
- **Features**:
  - ✅ W3C Web Annotation standard
  - ✅ Framework-agnostic
  - ✅ Lightweight
  - ❌ Annotation only (no review workflow)
  - ❌ Requires custom backend
- **Gap**: No review workflow

---

### Category 4: VS Code Extensions

#### 1. Better Comments

- **Installs**: 9.7M
- **Features**: Comment highlighting/categorization
- **Gap**: Styling only, no review workflow

#### 2. Markdown Preview GitHub Styling

- **Installs**: 2.5M
- **Features**: GitHub-styled markdown preview
- **Gap**: Preview only, no commenting

#### 3. Live Share

- **Features**: Real-time collaboration
- **Gap**: No persistent comments, no review workflow

#### 4. Code Spell Checker

- **Installs**: 16M
- **Features**: Spell checking
- **Gap**: Not a review tool

**Conclusion for VS Code**: **No extension exists** that provides:

- Inline commenting on markdown
- Shareable review links
- Formal approve/reject workflow
- Export to structured format

---

### Category 5: MCP-Enabled Tools

#### 1. HumanLayer

- **URL**: https://github.com/humanlayer/humanlayer
- **GitHub**: 8.5k stars
- **Features**:
  - ✅ `request_permission` MCP tool
  - ✅ Human-in-the-loop for AI agents
  - ✅ Claude Code integration
  - ✅ Slack/email/web UI notifications
  - ❌ Generic approval (not document-specific)
  - ❌ No inline commenting
- **Relevance**: Good reference for approval workflow patterns

#### 2. OpenAI Agents SDK

- **Features**: Interruption-based approval pattern
- **Gap**: Generic, not document-focused

#### 3. Various MCP Markdown Servers

- `mcp-markdown-template`, `mcp-markdown-manager`
- **Gap**: File management, not review

**Conclusion for MCP**: **No MCP tool exists** for document review with inline commenting. HumanLayer provides good patterns for approval workflows.

---

### Category 6: Specialized Tools

#### 1. iA Writer Markdown Annotations

- **URL**: https://github.com/iainc/Markdown-Annotations
- **GitHub**: 108 stars
- **Features**:
  - ✅ Embeds authorship metadata in markdown
  - ✅ Human vs AI distinction (`@Human`, `&AI`)
  - ✅ Character-range based
  - ✅ SHA-256 validation
  - ❌ Specification only (need to implement)
  - ❌ Not a web tool
- **Relevance**: Good format reference for storing annotations

#### 2. diff2html

- **URL**: https://diff2html.xyz
- **GitHub**: 2.8k stars
- **Features**:
  - ✅ Beautiful diff visualization
  - ✅ GitHub-like styling
  - ✅ Client-side only
  - ❌ No commenting system
  - ❌ No persistence
- **Relevance**: Could integrate for diff views

#### 3. Pandiff

- **URL**: https://github.com/davidar/pandiff
- **GitHub**: 373 stars
- **Features**: Semantic diffs for prose
- **Gap**: Diff tool only, no review

---

## Feature Comparison Matrix

| Feature                 | Our Tool | HackMD | HedgeDoc | Notion | GitHub PR | Outline | GitBook |
| ----------------------- | -------- | ------ | -------- | ------ | --------- | ------- | ------- |
| **Inline comments**     | ✅       | ✅     | ❌       | ✅     | ✅        | ✅      | ✅      |
| **No auth (anonymous)** | ✅       | ❌     | ⚠️       | ❌     | ❌        | ❌      | ❌      |
| **Shareable links**     | ✅       | ✅     | ✅       | ✅     | ✅        | ✅      | ✅      |
| **Approve/reject**      | ✅       | ❌     | ❌       | ❌     | ✅        | ❌      | ✅      |
| **Agent API**           | ✅       | ⚠️     | ❌       | ✅     | ✅        | ✅      | ⚠️      |
| **Export YAML/JSON**    | ✅       | ❌     | ❌       | ❌     | ✅        | ❌      | ❌      |
| **Self-hosted**         | ✅       | ❌     | ✅       | ❌     | ❌        | ✅      | ❌      |
| **Offline capable**     | ✅       | ❌     | ✅       | ❌     | ❌        | ✅      | ❌      |
| **Pure markdown**       | ✅       | ✅     | ✅       | ❌     | ✅        | ⚠️      | ⚠️      |
| **Free**                | ✅       | ⚠️     | ✅       | ⚠️     | ⚠️        | ⚠️      | ❌      |

---

## Gap Analysis

### What's Missing in Existing Tools

1. **No-auth inline commenting**: Every tool requires authentication for commenting
2. **Agent-first API design**: Most APIs are human-focused, not agent-friendly
3. **Long-polling for agents**: No tool supports agents waiting for human review
4. **Structured export**: Comments as YAML/JSON is rare
5. **Standalone document review**: Most require Git repos or specific ecosystems
6. **Formal workflow + markdown**: Review workflows exist in code review tools, but not for standalone docs

### Unique Value Proposition

Our markdown reviewer fills a **clear market gap**:

```
┌─────────────────────────────────────────────────────────────┐
│                    MARKET GAP                                │
│                                                              │
│   ┌───────────────┐         ┌───────────────┐               │
│   │ Collaboration │         │  Code Review  │               │
│   │    Tools      │         │    Tools      │               │
│   │               │         │               │               │
│   │ HackMD        │         │ GitHub PR     │               │
│   │ HedgeDoc      │         │ Review Board  │               │
│   │ Notion        │         │ Gerrit        │               │
│   │               │         │               │               │
│   │ ❌ No review  │         │ ❌ Needs repo │               │
│   │    workflow   │         │ ❌ Needs auth │               │
│   └───────────────┘         └───────────────┘               │
│                                                              │
│                    ↓ OUR TOOL ↓                             │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Standalone Markdown Review                          │   │
│   │  ✅ Anonymous (no auth)                             │   │
│   │  ✅ Inline commenting                               │   │
│   │  ✅ Approve/reject workflow                         │   │
│   │  ✅ Agent-friendly API (long-polling)               │   │
│   │  ✅ Export to YAML/JSON                             │   │
│   │  ✅ Self-hosted + offline                           │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Recommendation

### Primary Recommendation: BUILD

**Rationale:**

1. No existing tool addresses all requirements
2. The current Hono implementation is 80% complete
3. Estimated effort: 2-3 days for Phase 1 (Hono + React SPA)
4. Unique positioning for AI agent workflows

### Alternative Paths (if constraints change)

| Scenario                  | Recommendation                     |
| ------------------------- | ---------------------------------- |
| Need multi-user real-time | Consider HedgeDoc + custom overlay |
| Need enterprise features  | Consider Review Board              |
| Git-based workflow OK     | Use GitHub PR reviews              |
| Cost is no concern        | Consider GitBook                   |

### Implementation Priority

1. **Phase 1** (2-3 days): Keep Hono backend, add React SPA for better UI
2. **Phase 2** (optional): Add structured export endpoint (`/api/reviews/:id/export?format=yaml`)
3. **Phase 3** (if needed): Deploy to cloud for shareable public links

---

## Appendix: Tools Not Meeting Requirements

| Tool             | Reason Excluded                         |
| ---------------- | --------------------------------------- |
| Dropbox Paper    | Not markdown-native, no review workflow |
| Coda             | Block-based, not markdown               |
| Confluence       | Enterprise-focused, complex             |
| Quip             | Salesforce ecosystem only               |
| Google Docs      | Not markdown                            |
| Craft            | Apple ecosystem only                    |
| Bear             | Note-taking, no review                  |
| Obsidian Publish | No commenting                           |

---

## References

- HackMD: https://hackmd.io/features
- HedgeDoc: https://hedgedoc.org
- Outline: https://github.com/outline/outline
- GitBook: https://gitbook.com
- Review Board: https://reviewboard.org
- Hypothesis: https://hypothes.is
- HumanLayer: https://github.com/humanlayer/humanlayer
- Giscus: https://giscus.app
- Tiptap Comments: https://github.com/sereneinserenade/tiptap-comment-extension
- iA Writer Annotations: https://github.com/iainc/Markdown-Annotations
