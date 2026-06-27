import { collectFindings, resolveSources } from "./api.mjs";

const DISPOSITIONS = ["triage", "ai-fix", "manual", "wontfix", "done"];
const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];
const ACTIVE = new Set(["triage", "ai-fix", "manual"]);

const SEV_LABEL = { critical: "must", high: "should", medium: "imo", low: "nit", info: "fyi" };

function bar(n, max, width = 20) {
  const filled = max === 0 ? 0 : Math.round((n / max) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

export async function runStatus() {
  const [{ findings }, sources] = await Promise.all([
    collectFindings(),
    resolveSources(),
  ]);

  // deduplicate by sourceId:fingerprint (mirrors App.tsx logic)
  const byKey = new Map();
  for (const f of findings) {
    const key = `${f.sourceId}:${f.fingerprint}`;
    const existing = byKey.get(key);
    if (!existing || f.createdAt > existing.createdAt) byKey.set(key, f);
  }
  const deduped = [...byKey.values()];

  const dispCounts = Object.fromEntries(DISPOSITIONS.map((d) => [d, 0]));
  for (const f of deduped) dispCounts[f.disposition] = (dispCounts[f.disposition] ?? 0) + 1;
  const maxDisp = Math.max(...Object.values(dispCounts), 1);

  const active = deduped.filter((f) => ACTIVE.has(f.disposition));
  const sevCounts = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0]));
  for (const f of active) sevCounts[f.severity] = (sevCounts[f.severity] ?? 0) + 1;

  const out = process.stdout.write.bind(process.stdout);

  out("ReviewOps — status\n\n");
  out(`  Sources : ${sources.length}\n`);
  out(`  Findings: ${deduped.length} unique (${findings.length} total across all reviews)\n\n`);

  out("  Disposition\n");
  for (const d of DISPOSITIONS) {
    const n = dispCounts[d];
    out(`    ${d.padEnd(10)} ${String(n).padStart(3)}  ${bar(n, maxDisp)}\n`);
  }

  out("\n  Active by severity (triage + ai-fix + manual)\n");
  for (const s of SEVERITY_ORDER) {
    const n = sevCounts[s];
    if (n === 0) continue;
    out(`    ${SEV_LABEL[s].padEnd(8)} ${String(n).padStart(3)}  ${s}\n`);
  }
  if (active.length === 0) out("    (none)\n");

  out("\n");
}
