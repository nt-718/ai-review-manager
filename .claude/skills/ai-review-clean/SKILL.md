---
name: ai-review-clean
description: Clean up .ai-review/review-state.json by removing orphaned entries (fingerprints that no longer exist in any review file). Use when the user asks to "clean up reviews", "clean the review state", or "remove stale entries".
---

# AI Review Clean

Remove stale entries from `.ai-review/review-state.json` — fingerprints that no longer match any finding in the current review files.

## When to use

- Old `.ai-review/<id>.json` files were deleted or replaced.
- Review fingerprints changed after a rebase or schema migration.
- User says "review stateをクリーンして" / "clean up stale reviews" / "remove orphaned entries".

## Workflow

```
- [ ] 1. Read .ai-review/review-state.json — collect all fingerprint keys across all repos (structure: entries[repo][fingerprint])
- [ ] 2. Read every .ai-review/<id>.json (excluding review-state.json)
- [ ] 3. Compute the set of live fingerprints from all review findings
         (use the fingerprint field if present; otherwise compute sha1(repo+"\0"+file+"\0"+category+"\0"+normalizedMessage).slice(0,12))
- [ ] 4. Identify orphaned keys = keys in review-state.json not in the live set
- [ ] 5. If no orphaned keys, report "Nothing to clean" and stop
- [ ] 6. Remove orphaned keys from review-state.json and write it back
- [ ] 7. Report what was removed
```

## Fingerprint computation (if not present in finding JSON)

```
normalizedMessage = message.trim().toLowerCase().replace(/\s+/g, " ")
basis = repo + "\0" + file + "\0" + category + "\0" + normalizedMessage
fingerprint = sha1(basis).hex().slice(0, 12)
```

`repo` is `review.target.repo` from the review file.

## Rules

1. **Only remove** entries whose fingerprint has no match in any current review file.
2. **Never modify** review JSON files (`.ai-review/<id>.json`). They are immutable.
3. **Preserve** all fields of remaining entries (disposition, instruction, note, thread, etc.).
4. If `done` or `wontfix` entries are orphaned, remove them too — they're no longer needed.
5. Do a dry-run summary first, then write. (No separate confirmation step needed for orphaned entries.)

## Output report

```
AI Review Clean — summary

  Live fingerprints : 19
  State entries     : 21

  Orphaned (to remove):
    abc123def456  (not found in any review file)
    999aaa111bbb  (not found in any review file)

  Removed 2 orphaned entry/entries from review-state.json
```

If nothing to clean:

```
AI Review Clean — nothing to clean (14 entries, all have matching findings)
```

## Validation

After writing review-state.json, confirm it conforms to the schema:

```bash
npx --yes --package=ajv-cli@5 --package=ajv-formats@2 -- ajv validate \
  -s schema/review-state.schema.json -d ".ai-review/review-state.json" -c ajv-formats --spec=draft2020
```
