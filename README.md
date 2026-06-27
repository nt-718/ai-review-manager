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
| **Skills** | [`.claude/skills/`](./.claude/skills/) · [`.cursor/skills/`](./.cursor/skills/) | The contract. Tells any AI editor to produce reviews, apply fixes, investigate findings, or clean up state. |
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
# 1. Clone and link globally (one-time setup)
git clone <this-repo> reviewops
cd reviewops
npm run build   # build the dashboard
npm link        # make `reviewops` available as a global command

# 2. In any project you want to review:
cd ~/projects/my-app
reviewops init         # copy skills + schema, register in global board

# 3. Start the control board (http://localhost:4517)
reviewops serve --open
```

For development with hot reload (the API is bundled into the Vite dev server):

```bash
cd web && npm run dev
```

ReviewOps reads each repository's `.ai-review/` live from the global config, so
no pre-aggregation is needed (use `npm run collect` only for static CI hosting).

## CLI reference

```
reviewops init                          Copy skills + schema into the project, register in global board
reviewops serve [--port <n>] [--open]  Start dashboard + API server (default port: 4517)
reviewops status                        Show finding summary in terminal
reviewops validate                      Validate review JSON files against the schema
reviewops collect [<path>...]           Copy reviews for static hosting
```

### `reviewops init`

Run inside any repository you want to review. It:

1. Creates `.ai-review/` in the current directory.
2. Copies `.claude/skills/`, `.cursor/skills/`, and `schema/` into the project.
3. Installs all four skills into **`~/.claude/skills/`** so they are available in
   every project without per-project copying.
4. Registers the project in the global config
   (`~/.config/reviewops/review-sources.json`) so the dashboard picks it up from
   anywhere.

```bash
cd ~/projects/my-app
npx reviewops init
reviewops serve --open   # open the global board — my-app is now listed
```

### `reviewops status`

Prints a finding summary in the terminal — useful in CI or as a quick health check:

```
ReviewOps — status

  Sources : 2
  Findings: 14 unique (17 total across all reviews)

  Disposition
    triage        5  ████░░░░░░░░░░░░░░░░
    ai-fix        3  ████████████░░░░░░░░
    manual        2  ████████░░░░░░░░░░░░
    wontfix       1  ████░░░░░░░░░░░░░░░░
    done          3  ████████████░░░░░░░░

  Active by severity (triage + ai-fix + manual)
    must       2  critical
    should     4  high
    imo        4  medium
```

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
that repository. Or run `reviewops init` to do it automatically.

## Available skills

Four skills ship with ReviewOps (under `.claude/skills/` and `.cursor/skills/`):

| Skill | Trigger phrase | What it does |
| --- | --- | --- |
| **`ai-code-review`** | "review this code" | Generates a normalized JSON review and writes it to `.ai-review/`. |
| **`ai-fix-from-board`** | "fix the board" / "run ai-fix" | Reads `.ai-review/review-state.json`, applies fixes for every `ai-fix` finding per its `instruction`, then marks them `done`. |
| **`ai-investigate-finding`** | "investigate this finding" | Reads the Q&A thread on a finding, inspects the source code, and appends an `assistant` reply to the thread. |
| **`ai-review-clean`** | "clean up reviews" / "remove stale entries" | Removes orphaned fingerprints from `review-state.json` (findings that no longer exist in any review file). |

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

**Global config**: `reviewops init` also writes to
`~/.config/reviewops/review-sources.json` (or `$XDG_CONFIG_HOME/reviewops/review-sources.json`).
ReviewOps checks the project-level config first; if absent it falls back to the global
config. This means you can run `reviewops serve` from the ReviewOps package directory
and still see all projects you have `init`ed.

State is written back to **each source repository's** `.ai-review/review-state.json`,
so it travels with the repository and the AI running there can read it locally.

## Dashboard

`reviewops serve` opens the board at `http://localhost:4517`. When multiple
repositories are configured, a **repo picker** is shown first; selecting one opens its
board. The URL hash (`#my-org/my-repo`) can be bookmarked.

### Views

| Tab | Contents |
| --- | --- |
| **Board** | Kanban with 5 disposition lanes. Drag cards or click to update disposition, instruction, and note. |
| **Files** | All findings grouped by file path — a quick view of which files have the most issues. |
| **History** | All review runs in chronological order, with score and finding count per run. |
| **Insights** | Severity and category breakdowns across all active findings. |

A **branch sidebar** lets you filter findings by branch. A **filter sidebar** filters
by severity, category, and reviewer tool. A theme toggle (☀ / ☾) switches between
light and dark mode.

### Detail panel & Investigation thread

Clicking a finding card opens a detail panel with the full finding, the current
disposition controls, and an **Investigation** thread. Any member of the team can post
a question; the `ai-investigate-finding` skill reads the thread and appends an AI
answer directly to `review-state.json`.

## How the AI reads the board

`.ai-review/review-state.json` records human decisions and fix instructions keyed by
`fingerprint` (conforming to
[`schema/review-state.schema.json`](./schema/review-state.schema.json)):

```json
{
  "version": "1.0",
  "entries": {
    "my-repo": {
      "e64e69554a80": {
        "disposition": "ai-fix",
        "instruction": "Use Promise.allSettled and show partial results.",
        "note": "",
        "thread": [
          { "role": "user",      "text": "Does this also affect the retry path?", "at": "2026-06-27T10:00:00Z" },
          { "role": "assistant", "text": "Yes — src/retry.ts:42 has the same pattern.", "at": "2026-06-27T10:01:00Z" }
        ],
        "history": [
          { "from": "triage", "to": "ai-fix", "at": "2026-06-27T09:55:00Z", "by": "user" }
        ],
        "decidedAt": "2026-06-27T09:55:00Z",
        "decidedBy": "user"
      }
    }
  }
}
```

An AI agent reads this file, acts only on findings whose `disposition` is `ai-fix`, and
fixes them according to `instruction`. The `ai-fix-from-board` skill automates this
loop and marks resolved findings `done`.

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
├── .claude/skills/              # Skills for Claude Code
│   ├── ai-code-review/          #   Generate a review
│   ├── ai-fix-from-board/       #   Apply fixes from the ai-fix lane
│   ├── ai-investigate-finding/  #   Answer Q&A threads on findings
│   └── ai-review-clean/         #   Remove orphaned state entries
├── .cursor/skills/              # Same four skills for Cursor
├── schema/
│   ├── review.schema.json       # Normalized review schema (immutable layer)
│   └── review-state.schema.json # Disposition + instruction schema (mutable layer)
├── scripts/
│   ├── cli.mjs                  # reviewops entry point
│   ├── server.mjs               # Local server (API + static dist)
│   ├── api.mjs                  # Shared API handler (findings / state / thread)
│   ├── init.mjs                 # reviewops init logic
│   ├── status.mjs               # reviewops status logic
│   └── collect-reviews.mjs      # Static-hosting aggregation (optional)
├── review-sources.example.json  # Template — copy to review-sources.json and edit
└── web/                         # React + Vite dashboard (the control board)
```

## License

MIT
