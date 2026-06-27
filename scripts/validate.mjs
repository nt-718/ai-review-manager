import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const VALID_SEVERITY = new Set(["critical", "high", "medium", "low", "info"]);
const VALID_CATEGORY = new Set([
  "security", "bug", "performance", "maintainability", "test", "docs", "other",
]);
const VALID_STATUS = new Set(["open", "acknowledged", "resolved", "dismissed"]);
const VALID_CONFIDENCE = new Set(["high", "medium", "low"]);
const STATE_FILE = "review-state.json";

function validateReview(review) {
  const errors = [];

  if (review.schemaVersion !== "1.0")
    errors.push(`schemaVersion: expected "1.0", got ${JSON.stringify(review.schemaVersion)}`);
  if (!review.id || typeof review.id !== "string")
    errors.push("id: required string");
  if (!review.createdAt || typeof review.createdAt !== "string")
    errors.push("createdAt: required ISO 8601 string");
  if (!review.reviewer?.tool)
    errors.push("reviewer.tool: required");
  if (!review.target?.repo)
    errors.push("target.repo: required");
  if (!Array.isArray(review.findings)) {
    errors.push("findings: must be an array");
    return errors;
  }

  for (const [i, f] of review.findings.entries()) {
    const p = `findings[${i}]`;
    if (!f.id) errors.push(`${p}.id: required`);
    if (!f.file) errors.push(`${p}.file: required`);
    if (!f.message) errors.push(`${p}.message: required`);
    if (!VALID_SEVERITY.has(f.severity))
      errors.push(`${p}.severity: invalid value "${f.severity}"`);
    if (!VALID_CATEGORY.has(f.category))
      errors.push(`${p}.category: invalid value "${f.category}"`);
    if (f.status != null && !VALID_STATUS.has(f.status))
      errors.push(`${p}.status: invalid value "${f.status}"`);
    if (f.confidence != null && !VALID_CONFIDENCE.has(f.confidence))
      errors.push(`${p}.confidence: invalid value "${f.confidence}"`);
  }

  return errors;
}

export async function runValidate(sourcePaths) {
  let totalFiles = 0;
  let totalErrors = 0;

  for (const sourcePath of sourcePaths) {
    const reviewDir = join(sourcePath, ".ai-review");
    if (!existsSync(reviewDir)) continue;

    const entries = (await readdir(reviewDir)).filter(
      (e) => e.endsWith(".json") && e !== STATE_FILE,
    );

    for (const entry of entries) {
      const filePath = join(reviewDir, entry);
      totalFiles += 1;
      let review;
      try {
        review = JSON.parse(await readFile(filePath, "utf8"));
      } catch (e) {
        process.stdout.write(`  ✗  ${entry}\n       JSON parse error: ${e.message}\n`);
        totalErrors += 1;
        continue;
      }
      const errors = validateReview(review);
      if (errors.length === 0) {
        process.stdout.write(`  ✓  ${entry}\n`);
      } else {
        process.stdout.write(`  ✗  ${entry}\n`);
        for (const err of errors) process.stdout.write(`       ${err}\n`);
        totalErrors += errors.length;
      }
    }
  }

  process.stdout.write("\n");
  if (totalFiles === 0) {
    process.stdout.write("No review files found.\n");
    return;
  }
  if (totalErrors === 0) {
    process.stdout.write(`${totalFiles} file(s) valid\n`);
  } else {
    process.stderr.write(`${totalFiles} file(s) checked — ${totalErrors} error(s) found\n`);
    process.exit(1);
  }
}
