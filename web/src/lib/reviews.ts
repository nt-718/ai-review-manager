import type { Disposition, Finding, Review, ThreadMessage } from "../types/review";

export interface FindingWithContext extends Finding {
  fingerprint: string;
  sourceId: string;
  reviewId: string;
  repo: string;
  branch: string | null;
  tool: string;
  createdAt: string;
  disposition: Disposition;
  instruction: string;
  note: string;
  thread: ThreadMessage[];
}

export interface FindingState {
  disposition: Disposition;
  instruction: string;
  note: string;
  thread?: ThreadMessage[];
}

export interface FindingsResult {
  findings: FindingWithContext[];
  readOnly: boolean;
  notice?: string;
}

const DATA_BASE = `${import.meta.env.BASE_URL}reviews`;

interface ReviewIndex {
  reviews: string[];
}

// api.mjs computeFingerprint と同一アルゴリズム: sha1(repo + NUL + file + NUL + category + NUL + normalizedMessage)
async function fallbackFingerprint(repo: string, finding: Finding): Promise<string> {
  const normalizedMessage = (finding.message ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const nul = String.fromCharCode(0);
  const basis = [repo, finding.file, finding.category, normalizedMessage].join(nul);
  const encoded = new TextEncoder().encode(basis);
  const hashBuffer = await crypto.subtle.digest("SHA-1", encoded);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex.slice(0, 12);
}

async function flattenStatic(reviews: Review[]): Promise<FindingWithContext[]> {
  return Promise.all(
    reviews.flatMap((review) =>
      review.findings.map(async (finding) => ({
        ...finding,
        fingerprint:
          finding.fingerprint ?? (await fallbackFingerprint(review.target.repo, finding)),
        sourceId: "static",
        reviewId: review.id,
        repo: review.target.repo,
        branch: review.target.branch ?? null,
        tool: review.reviewer.tool,
        createdAt: review.createdAt,
        disposition: "triage" as Disposition,
        instruction: "",
        note: "",
        thread: [],
      })),
    ),
  );
}

// 静的モードは読み取り専用。review-state.json は参照しないため
// 全カードの disposition は "triage" になり、過去の処分は反映されない。
async function loadStaticReviews(): Promise<{ findings: FindingWithContext[]; notice?: string }> {
  const indexRes = await fetch(`${DATA_BASE}/index.json`);
  if (!indexRes.ok) {
    throw new Error(`Failed to load review index (${indexRes.status})`);
  }
  const index = (await indexRes.json()) as ReviewIndex;

  const results = await Promise.allSettled(
    index.reviews.map(async (file) => {
      const res = await fetch(`${DATA_BASE}/${file}`);
      if (!res.ok) throw new Error(`Failed to load review: ${file} (${res.status})`);
      return (await res.json()) as Review;
    }),
  );

  const reviews: Review[] = [];
  let failCount = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      reviews.push(result.value);
    } else {
      failCount += 1;
      console.warn(result.reason);
    }
  }

  const notice =
    failCount > 0 ? `${failCount} 件のレビューファイルの読み込みに失敗しました。` : undefined;

  return { findings: await flattenStatic(reviews), notice };
}

export function findingKey(finding: FindingWithContext): string {
  return `${finding.sourceId}:${finding.fingerprint}`;
}

export async function loadFindings(): Promise<FindingsResult> {
  try {
    const res = await fetch("/api/findings");
    if (res.ok) {
      const data = (await res.json()) as { findings: FindingWithContext[] };
      return { findings: data.findings, readOnly: false };
    }
  } catch {
    // API offline — fall back to static files
  }
  const { findings, notice } = await loadStaticReviews();
  return { findings, readOnly: true, notice };
}

export async function updateState(
  finding: FindingWithContext,
  state: FindingState,
): Promise<void> {
  const res = await fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceId: finding.sourceId,
      fingerprint: finding.fingerprint,
      repo: finding.repo,
      disposition: state.disposition,
      instruction: state.instruction,
      note: state.note,
    }),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `Failed to update state (${res.status})`);
  }
}

export async function appendThreadMessage(
  finding: FindingWithContext,
  text: string,
): Promise<ThreadMessage[]> {
  const res = await fetch("/api/thread", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceId: finding.sourceId,
      fingerprint: finding.fingerprint,
      repo: finding.repo,
      role: "user",
      text,
    }),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `Failed to post message (${res.status})`);
  }
  const data = (await res.json()) as { thread: ThreadMessage[] };
  return data.thread;
}
