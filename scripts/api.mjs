import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES_CONFIG = join(REPO_ROOT, "review-sources.json");
const STATE_FILE = "review-state.json";
const VALID_DISPOSITIONS = ["triage", "ai-fix", "manual", "wontfix", "done"];
const VALID_THREAD_ROLES = ["user", "assistant"];
const DEFAULT_DISPOSITION = "triage";

export async function resolveSources() {
  if (existsSync(SOURCES_CONFIG)) {
    const config = JSON.parse(await readFile(SOURCES_CONFIG, "utf8"));
    return (config.sources ?? []).map((p) => resolve(REPO_ROOT, p));
  }
  return [REPO_ROOT];
}

function computeFingerprint(repo, finding) {
  if (finding.fingerprint) return finding.fingerprint;
  const normalizedMessage = (finding.message ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const basis = [repo, finding.file, finding.category, normalizedMessage].join(
    "\u0000",
  );
  return createHash("sha1").update(basis).digest("hex").slice(0, 12);
}

async function readReviewFiles(sourcePath) {
  const reviewDir = join(sourcePath, ".ai-review");
  if (!existsSync(reviewDir)) return [];

  const entries = await readdir(reviewDir);
  const reviews = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json") || entry === STATE_FILE) continue;
    const filePath = join(reviewDir, entry);
    try {
      const review = JSON.parse(await readFile(filePath, "utf8"));
      if (!review.id || !review.target?.repo) continue;
      reviews.push(review);
    } catch {
      // skip malformed review files
    }
  }
  return reviews;
}

async function readState(sourcePath) {
  const filePath = join(sourcePath, ".ai-review", STATE_FILE);
  if (!existsSync(filePath)) return {};
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    return parsed.entries ?? {};
  } catch {
    return {};
  }
}

async function writeState(sourcePath, entries) {
  const filePath = join(sourcePath, ".ai-review", STATE_FILE);
  const payload = { version: "1.0", entries };
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function getRepoEntries(allEntries, repo) {
  return allEntries[repo] ?? {};
}

function setRepoEntries(allEntries, repo, repoEntries) {
  if (Object.keys(repoEntries).length > 0) {
    allEntries[repo] = repoEntries;
  } else {
    delete allEntries[repo];
  }
}

function resolveSourcePath(sourceId) {
  return resolveSources().then((sources) => {
    const index = Number.parseInt(String(sourceId).replace(/^s/, ""), 10);
    const sourcePath = sources[index];
    if (!sourcePath) throw new Error(`Unknown sourceId: ${sourceId}`);
    return sourcePath;
  });
}

function buildStateEntry(existing, { disposition, instruction, note, thread }) {
  const trimmedNote = (note ?? "").trim();
  const trimmedInstruction = (instruction ?? "").trim();
  const threadMessages = thread ?? existing?.thread ?? [];
  const nextDisposition = disposition ?? existing?.disposition ?? DEFAULT_DISPOSITION;

  const isEmpty =
    nextDisposition === DEFAULT_DISPOSITION &&
    trimmedNote === "" &&
    trimmedInstruction === "" &&
    threadMessages.length === 0;

  if (isEmpty) return null;

  return {
    disposition: nextDisposition,
    ...(trimmedInstruction ? { instruction: trimmedInstruction } : {}),
    ...(trimmedNote ? { note: trimmedNote } : {}),
    ...(threadMessages.length > 0 ? { thread: threadMessages } : {}),
    decidedAt: new Date().toISOString(),
    decidedBy: "user",
  };
}

export async function collectFindings() {
  const sources = await resolveSources();
  const findings = [];

  for (let index = 0; index < sources.length; index += 1) {
    const sourcePath = sources[index];
    const sourceId = `s${index}`;
    const [reviews, state] = await Promise.all([
      readReviewFiles(sourcePath),
      readState(sourcePath),
    ]);

    for (const review of reviews) {
      const repo = review.target.repo;
      for (const finding of review.findings ?? []) {
        const fingerprint = computeFingerprint(repo, finding);
        const entry = (state[repo] ?? {})[fingerprint];
        findings.push({
          ...finding,
          fingerprint,
          sourceId,
          reviewId: review.id,
          repo,
          branch: review.target?.branch ?? null,
          tool: review.reviewer?.tool ?? "unknown",
          createdAt: review.createdAt,
          disposition: entry?.disposition ?? DEFAULT_DISPOSITION,
          instruction: entry?.instruction ?? "",
          note: entry?.note ?? "",
          thread: entry?.thread ?? [],
        });
      }
    }
  }

  return { findings, generatedAt: new Date().toISOString() };
}

export async function applyState({
  sourceId,
  fingerprint,
  repo,
  disposition,
  instruction,
  note,
}) {
  if (!fingerprint) throw new Error("fingerprint is required");
  if (!repo) throw new Error("repo is required");
  if (!VALID_DISPOSITIONS.includes(disposition)) {
    throw new Error(`Invalid disposition: ${disposition}`);
  }

  const sourcePath = await resolveSourcePath(sourceId);
  const allEntries = await readState(sourcePath);
  const repoEntries = getRepoEntries(allEntries, repo);
  const existing = repoEntries[fingerprint];
  const nextEntry = buildStateEntry(existing, {
    disposition,
    instruction,
    note,
    thread: existing?.thread,
  });

  if (nextEntry) {
    repoEntries[fingerprint] = nextEntry;
  } else {
    delete repoEntries[fingerprint];
  }
  setRepoEntries(allEntries, repo, repoEntries);

  await writeState(sourcePath, allEntries);
  return {
    fingerprint,
    disposition,
    instruction: (instruction ?? "").trim(),
    note: (note ?? "").trim(),
    thread: existing?.thread ?? [],
  };
}

export async function appendThreadMessage({
  sourceId,
  fingerprint,
  repo,
  role,
  text,
}) {
  if (!fingerprint) throw new Error("fingerprint is required");
  if (!repo) throw new Error("repo is required");
  if (!VALID_THREAD_ROLES.includes(role)) {
    throw new Error(`Invalid thread role: ${role}`);
  }

  const trimmed = (text ?? "").trim();
  if (!trimmed) throw new Error("text is required");

  const sourcePath = await resolveSourcePath(sourceId);
  const allEntries = await readState(sourcePath);
  const repoEntries = getRepoEntries(allEntries, repo);
  const existing = repoEntries[fingerprint] ?? {};
  const thread = [
    ...(existing.thread ?? []),
    { role, text: trimmed, at: new Date().toISOString() },
  ];

  repoEntries[fingerprint] = buildStateEntry(existing, {
    disposition: existing.disposition ?? DEFAULT_DISPOSITION,
    instruction: existing.instruction ?? "",
    note: existing.note ?? "",
    thread,
  });
  setRepoEntries(allEntries, repo, repoEntries);

  await writeState(sourcePath, allEntries);
  return { fingerprint, thread };
}

function readBody(req) {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolvePromise(Buffer.concat(chunks).toString("utf8")));
    req.on("error", rejectPromise);
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

export async function handleApiRequest(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/findings" && req.method === "GET") {
    try {
      sendJson(res, 200, await collectFindings());
    } catch (e) {
      sendJson(res, 500, { error: e.message });
    }
    return true;
  }

  if (url.pathname === "/api/state" && req.method === "POST") {
    try {
      const payload = JSON.parse((await readBody(req)) || "{}");
      sendJson(res, 200, await applyState(payload));
    } catch (e) {
      sendJson(res, 400, { error: e.message });
    }
    return true;
  }

  if (url.pathname === "/api/thread" && req.method === "POST") {
    try {
      const payload = JSON.parse((await readBody(req)) || "{}");
      sendJson(
        res,
        200,
        await appendThreadMessage({
          ...payload,
          role: payload.role ?? "user",
        }),
      );
    } catch (e) {
      sendJson(res, 400, { error: e.message });
    }
    return true;
  }

  return false;
}
