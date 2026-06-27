import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSources } from "./api.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = join(REPO_ROOT, "web", "public", "reviews");

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function readReviewsFrom(sourcePath) {
  const reviewDir = join(sourcePath, ".ai-review");
  if (!existsSync(reviewDir)) return [];

  const entries = await readdir(reviewDir);
  const reviews = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json") || entry === "review-state.json") continue;
    const filePath = join(reviewDir, entry);
    try {
      const review = JSON.parse(await readFile(filePath, "utf8"));
      if (!review.id || !review.target?.repo) {
        console.warn(`Skipped (missing required fields): ${filePath}`);
        continue;
      }
      reviews.push(review);
    } catch (e) {
      console.warn(`Skipped (JSON parse error): ${filePath} - ${e.message}`);
    }
  }
  return reviews;
}

export async function runCollect(extraPaths = []) {
  const sources = extraPaths.length > 0
    ? extraPaths.map((p) => resolve(process.cwd(), p))
    : await resolveSources();
  console.log(`Sources: ${sources.length}`);

  const collected = [];
  for (const source of sources) {
    const reviews = await readReviewsFrom(source);
    collected.push(...reviews);
  }

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const fileNames = [];
  for (const review of collected) {
    const fileName = `${sanitize(review.target.repo)}__${sanitize(review.id)}.json`;
    await writeFile(
      join(OUTPUT_DIR, fileName),
      JSON.stringify(review, null, 2),
      "utf8",
    );
    fileNames.push(fileName);
  }

  await writeFile(
    join(OUTPUT_DIR, "index.json"),
    JSON.stringify({ reviews: fileNames }, null, 2),
    "utf8",
  );

  console.log(`Collected ${fileNames.length} review(s) into ${OUTPUT_DIR}`);
}

// Run directly when invoked as a script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCollect(process.argv.slice(2)).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
