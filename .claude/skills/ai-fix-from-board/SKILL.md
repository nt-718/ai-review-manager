---
name: ai-fix-from-board
description: Read the ai-fix queue from .ai-review/review-state.json and apply code fixes. Use when the user asks to "fix the board", "run ai-fix", "apply the ai-fix queue", or "implement the board changes".
---

# AI Fix From Board

Apply code fixes for all findings whose `disposition` is `"ai-fix"` in `.ai-review/review-state.json`, following each finding's `instruction` (or `suggestion` if no instruction was given).

## When to use

- User says "ai-fixレーンを実行して" / "run the ai-fix queue" / "fix the board items".
- User wants to batch-apply the fixes they queued on the dashboard.

## Workflow

```
- [ ] 1. Read .ai-review/review-state.json — collect all entries where disposition == "ai-fix" (structure: entries[repo][fingerprint])
- [ ] 2. For each entry, find the matching finding in .ai-review/*.json by fingerprint
- [ ] 3. Read the source file at finding.file (and surrounding context at finding.line)
- [ ] 4. Determine fix target: use entry.instruction if non-empty, otherwise fall back to finding.suggestion
- [ ] 5. Apply the fix to the source file
- [ ] 6. After all fixes, run type checks / tests if available to verify nothing is broken
- [ ] 7. Update each fixed entry's disposition to "done" and add a decidedBy: "ai" note in review-state.json
- [ ] 8. Report every file changed and a one-line summary of what was done
```

## Input sources

| Source | Path | Mutable |
|--------|------|---------|
| State + instructions | `.ai-review/review-state.json` → `entries[repo][fingerprint]` | Yes |
| Finding (immutable) | `.ai-review/<id>.json` → `findings[]` | No |
| Source code | paths referenced by `finding.file` | Yes |

### review-state entry shape

```json
{
  "entries": {
    "my-repo": {
      "e64e69554a80": {
        "disposition": "ai-fix",
        "instruction": "Promise.allSettled で部分表示にし、失敗件数をまとめて通知して",
        "note": ""
      }
    }
  }
}
```

When `instruction` is present, follow it exactly.
When `instruction` is empty, use the finding's `suggestion` as the fix guideline.

## Rules

1. **Only process `ai-fix` entries.** Skip `triage`, `manual`, `wontfix`, `done`.
2. `instruction` takes precedence over `suggestion`. Never invent a fix with no basis in either.
3. Apply fixes conservatively — match the style of the surrounding code.
4. **Do not modify** review JSON files (`.ai-review/<id>.json`). They are immutable.
5. After fixing, set `disposition` to `"done"` and `decidedBy` to `"ai"` in review-state.json.
6. If a fix would break other code or requires human judgment, skip it and report why (leave as `ai-fix`).
7. If no `ai-fix` entries exist, report "Nothing to fix" and stop.

## Updating review-state.json after a fix

For each fixed entry:

```json
{
  "disposition": "done",
  "instruction": "<original instruction, unchanged>",
  "note": "<original note, unchanged>",
  "decidedAt": "<ISO8601 timestamp>",
  "decidedBy": "ai"
}
```

## Validation

After writing review-state.json, confirm it conforms to the schema:

```bash
npx --yes --package=ajv-cli@5 --package=ajv-formats@2 -- ajv validate \
  -s schema/review-state.schema.json -d ".ai-review/review-state.json" -c ajv-formats --spec=draft2020
```

## Output report (write to terminal, not to a file)

```
AI Fix From Board — N finding(s) processed

  ✓  e64e69554a80  web/src/lib/reviews.ts      Promise.allSettled で部分表示に変更
  ✓  d7fab49e807b  web/src/App.tsx              findingKey を共通モジュールに抽出
  ✗  f205bdf45096  (skipped — requires new dependency: focus-trap-react)

Done. Run `reviewops validate` to check review files are still valid.
```
