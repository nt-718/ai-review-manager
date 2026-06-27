---
name: ai-investigate-finding
description: Answer investigation questions on a review finding. Reads the finding from .ai-review/, the Q&A thread from review-state.json, inspects source code, and appends an assistant reply to the thread. Use when the user asks to investigate or deep-dive a finding, or to answer questions posted on the dashboard.
---

# AI Investigate Finding (Q&A Thread)

Answer human questions about a specific review finding and persist the reply in `.ai-review/review-state.json` under the finding's `fingerprint`.

## When to use

- The user posted a question via the dashboard **Investigation** section (`POST /api/thread` writes `role: "user"` messages).
- The user asks to investigate, deep-dive, or explain a specific finding.
- The last message in the thread is from `user` and has no `assistant` reply yet.

## Workflow

```
- [ ] 1. Read `.ai-review/review-state.json` and locate the target fingerprint (structure: entries[repo][fingerprint])
- [ ] 2. Load the finding from the latest matching `.ai-review/<id>.json` (by fingerprint or user hint)
- [ ] 3. Read the source file (and surrounding context) referenced by the finding
- [ ] 4. Read the full thread; answer the latest unanswered user question(s)
- [ ] 5. Append `{ "role": "assistant", "text": "...", "at": "<ISO8601>" }` to the thread
- [ ] 6. Write back review-state.json (preserve disposition, instruction, note)
```

## Input sources

| Source | Path | Mutable |
|--------|------|---------|
| Finding (immutable) | `.ai-review/<id>.json` → `findings[]` | No |
| State + thread | `.ai-review/review-state.json` → `entries[repo][fingerprint]` | Yes |

### review-state entry shape (relevant fields)

```json
{
  "entries": {
    "my-repo": {
      "e64e69554a80": {
        "disposition": "triage",
        "instruction": "",
        "note": "",
        "thread": [
          { "role": "user", "text": "Does this happen in production?", "at": "2026-06-27T12:00:00Z" }
        ]
      }
    }
  }
}
```

## Rules

1. **Do not modify** review JSON files (immutable layer).
2. **Do not change** `disposition`, `instruction`, or `note` unless the user explicitly asks.
3. Base answers on **code evidence**. State uncertainty when inferring.
4. Reply in the **same language as the user's question** (Japanese questions → Japanese answers).
5. One `assistant` message per run covering all unanswered user messages since the last assistant reply.
6. If the finding's `confidence` is `low`, mention caveats explicitly in the answer.
7. Do not duplicate the finding's `message`/`suggestion` verbatim — add new analysis.

## Answer quality

- Explain **why** the finding matters for this codebase.
- Reference specific files, functions, or call paths.
- Distinguish facts (from code) from hypotheses.
- If the finding appears invalid, say so with evidence and suggest moving to Won't Fix.

## Writing the assistant message

Append to `entries[repo][fingerprint].thread`:

```json
{
  "role": "assistant",
  "text": "Concise answer with evidence. Use paragraphs or bullets for clarity.",
  "at": "2026-06-27T12:05:00Z"
}
```

Ensure the repo key and entry both exist (create with `"disposition": "triage"` if missing).

## Validation

After writing, confirm `review-state.json` conforms to `schema/review-state.schema.json`.

```bash
npx --yes --package=ajv-cli@5 --package=ajv-formats@2 -- ajv validate \
  -s schema/review-state.schema.json -d ".ai-review/review-state.json" -c ajv-formats --spec=draft2020
```
