# ReviewOps

> A normalized contract for AI code reviews — plus a board to **operate** them.

**English** | [日本語](./README.ja.md)

ReviewOps turns ad-hoc AI code reviews into a **normalized, machine-readable
format** that any editor (Claude Code, Cursor, …) can produce. More importantly, the
dashboard is not just a viewer — it is a **control surface that turns human decisions
into instructions for the AI**.

Humans don't fix; they **triage**. The AI executes what was triaged. The board state
(the *disposition* of each finding) becomes the AI's work queue.

It is built around three independent layers:

| Layer | Path | Role |
| --- | --- | --- |
| **Skill** | [`.claude/skills/ai-code-review/`](./.claude/skills/ai-code-review/) · [`.cursor/skills/ai-code-review/`](./.cursor/skills/ai-code-review/) | The contract. Tells any AI editor to emit a review JSON conforming to the schema. |
| **Schema** | [`schema/`](./schema) | The source of truth for reviews (immutable) and decisions (mutable) — JSON Schema, draft 2020-12. |
| **ReviewOps** | [`scripts/`](./scripts) + [`web/`](./web) | A CLI + local server that serves the dashboard, reads `.ai-review/`, and writes back human decisions. |

## How it works (the control loop)

```
  AI editor (Claude Code / Cursor)
        │  follows .claude/skills/ or .cursor/skills/ai-code-review/SKILL.md
        ▼
  .ai-review/<id>.json      ← immutable: what the AI FOUND (review.schema.json)
        │
        ▼
  reviewops serve     ← merges findings (immutable) with review-state (mutable) by fingerprint
        │
        ▼
  Dashboard = control board   ← humans sort findings into 5 "disposition" lanes and write fix instructions
        │  writes state back
        ▼
  .ai-review/review-state.json ← mutable: what the human DECIDED / INSTRUCTED (review-state.schema.json)
        │  the AI reads this
        ▼
  AI works the "In Progress" lane per the instruction → re-reviews → confirms resolution → "Done"
```

### Disposition lanes

| UI label | `disposition` value | Meaning |
| --- | --- | --- |
| **New** | `triage` | Unsorted finding, awaiting a human decision (default). |
| **In Progress** | `ai-fix` | **The AI's work queue** — the AI only acts on this lane. |
| **In Review** | `manual` | Awaiting human review; the AI must not touch it. |
| **Won't Fix** | `wontfix` | Dismissed with a reason; do not report again. |
| **Done** | `done` | Verified resolved by re-review. |

Human decisions and fix instructions live in `.ai-review/review-state.json` (the
mutable layer), keyed by each finding's `fingerprint` — not in the immutable review
JSON. The manager joins the two, so state persists across re-reviews.

## Quick start

```bash
# 1. Install dashboard dependencies and build (first time / on updates)
npm run build

# 2. Start the control board (http://localhost:4517)
npm run serve
#   or: node scripts/cli.mjs serve
```

For development with hot reload (the API is bundled into the Vite dev server):

```bash
cd web && npm run dev
```

ReviewOps reads each repository's `.ai-review/` live from `review-sources.json`, so
no pre-aggregation is needed (use `npm run collect` only for static CI hosting).

## Generating a review (the skill)

The `ai-code-review` skill defines the output contract. Point your AI editor at it
and ask for a review; it will write a single JSON file to `.ai-review/<id>.json`
in the reviewed repository.

- **File name**: `<YYYY-MM-DD>_<shortCommit>.json` (e.g. `2026-06-27_abc1234.json`).
- **One file per run** — previous reviews are never overwritten.
- The skill enforces fixed enums for `category`, `severity`, `confidence`, and `status`
  so that results stay consistent and comparable across tools.

To reuse the skill in another repository, copy the
`.claude/skills/ai-code-review/` directory (for Claude Code) or
`.cursor/skills/ai-code-review/` directory (for Cursor) — and `schema/review.schema.json` — into
that repository.

## Multiple repositories

`review-sources.json` lists the repositories to read (paths are resolved relative to
the project root). ReviewOps reads and writes each source's `.ai-review/` directly.
Copy `review-sources.example.json` to `review-sources.json` and edit it:

```json
{
  "sources": [".", "../other-repo"]
}
```

`review-sources.json` is gitignored — each user keeps their own local copy.

State is written back to **each source repository's** `.ai-review/review-state.json`,
so it travels with the repository and the AI running there can read it locally.

## How the AI reads the board

`.ai-review/review-state.json` records human decisions and fix instructions keyed by
`fingerprint` (conforming to
[`schema/review-state.schema.json`](./schema/review-state.schema.json)):

```json
{
  "version": "1.0",
  "entries": {
    "e64e69554a80": {
      "disposition": "ai-fix",
      "instruction": "Use Promise.allSettled and show partial results.",
      "decidedBy": "user"
    }
  }
}
```

An AI agent reads this file, acts only on findings whose `disposition` is `ai-fix`, and
fixes them according to `instruction`. After fixing and re-reviewing, resolved findings
can be reconciled to `done` by `fingerprint` match (automating this loop is Phase 2 on
the roadmap).

## Review schema

The normalized format is defined in
[`schema/review.schema.json`](./schema/review.schema.json). A minimal example:

```json
{
  "schemaVersion": "1.0",
  "id": "2026-06-27_abc1234",
  "createdAt": "2026-06-27T00:00:00Z",
  "reviewer": { "tool": "claude-code", "model": "claude-sonnet-4-6" },
  "target": { "repo": "my-repo", "branch": "main", "commit": "abc1234" },
  "summary": { "score": 80, "text": "Overall summary in 1–2 sentences." },
  "findings": [
    {
      "id": "f1",
      "fingerprint": "e64e69554a80",
      "file": "src/auth.ts",
      "line": { "start": 20, "end": 24 },
      "severity": "critical",
      "category": "security",
      "confidence": "high",
      "message": "What is wrong, in one sentence.",
      "suggestion": "Concrete fix direction.",
      "status": "open"
    }
  ]
}
```

Validate review files against the schema with [ajv](https://ajv.js.org/):

```bash
npx --yes --package=ajv-cli@5 --package=ajv-formats@2 -- ajv validate \
  -s schema/review.schema.json -d ".ai-review/*.json" -c ajv-formats --spec=draft2020
```

### Enums

- **category**: `security`, `bug`, `performance`, `maintainability`, `test`, `docs`, `other`
- **severity**: `critical`, `high`, `medium`, `low`, `info`
- **confidence**: `high`, `medium`, `low`
- **status**: `open`, `acknowledged`, `resolved`, `dismissed`

## Project structure

```
.
├── .ai-review/                  # Review JSON for THIS repo + review-state.json (gitignored)
├── .claude/skills/              # ai-code-review skill for Claude Code
├── .cursor/skills/              # ai-code-review skill for Cursor
├── schema/
│   ├── review.schema.json       # Normalized review schema (immutable layer)
│   └── review-state.schema.json # Disposition + instruction schema (mutable layer)
├── scripts/
│   ├── cli.mjs                  # reviewops entry point
│   ├── server.mjs               # Local server (API + static dist)
│   ├── api.mjs                  # Shared API handler (findings / state)
│   └── collect-reviews.mjs      # Static-hosting aggregation (optional)
├── review-sources.example.json  # Template — copy to review-sources.json and edit
└── web/                         # React + Vite dashboard (the control board)
```

## Roadmap

- **Phase 1 (done)**: CLI + server, the disposition control board, fix-instruction
  input, write-back to `review-state.json`.
- **Phase 2**: an `ai-fix-from-board` skill that works the `ai-fix` lane per its
  `instruction`, plus re-review reconciliation (auto `done`, dedup by fingerprint,
  suppress `wontfix`).
- **Phase 3**: traceability to fix commits, score trends over time, cross-AI
  agreement on findings.
- Distribute the skill and the control board as a standalone package / reusable
  visualization library.

## License

MIT
