import { SEVERITY_ORDER, SEVERITY_LABEL } from "../types/review";
import type { FindingWithContext } from "../lib/reviews";
import { SEVERITY_STYLE } from "../lib/style";

interface HistoryViewProps {
  findings: FindingWithContext[];
}

interface ReviewEntry {
  id: string;
  createdAt: string;
  tool: string;
  repo: string;
  findings: FindingWithContext[];
}

function isActive(f: FindingWithContext) {
  return f.disposition !== "done" && f.disposition !== "wontfix";
}

export function HistoryView({ findings }: HistoryViewProps) {
  const byReview = new Map<string, FindingWithContext[]>();
  for (const f of findings) {
    if (!byReview.has(f.reviewId)) byReview.set(f.reviewId, []);
    byReview.get(f.reviewId)!.push(f);
  }

  const reviews: ReviewEntry[] = [...byReview.entries()]
    .map(([id, fs]) => ({
      id,
      findings: fs,
      createdAt: fs[0].createdAt,
      tool: fs[0].tool,
      repo: fs[0].repo,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (reviews.length === 0) {
    return (
      <div className="rounded-md border border-line bg-surface p-12 text-center text-ink-subtle">
        No review history
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {reviews.map((review, i) => {
        const open = review.findings.filter(isActive).length;
        const closed = review.findings.length - open;
        const date = new Date(review.createdAt);

        return (
          <div key={review.id} className="flex gap-4">
            {/* Timeline column */}
            <div className="flex w-10 shrink-0 flex-col items-center gap-0 pt-4">
              <div className="z-10 h-3 w-3 rounded-full bg-[#3fb950] ring-2 ring-canvas" />
              {i < reviews.length - 1 && (
                <div className="mt-1 w-px flex-1 bg-line" />
              )}
            </div>

            {/* Content card */}
            <div className="mb-4 flex-1 rounded-md border border-line bg-surface overflow-hidden">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{review.tool}</span>
                  <span className="text-ink-faint">·</span>
                  <span className="font-mono text-xs text-ink-subtle">{review.repo}</span>
                </div>
                <time className="text-xs text-ink-subtle">
                  {date.toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 px-4 py-3">
                {/* Open/closed */}
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5 text-ink-muted">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="text-[#3fb950]">
                      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
                    </svg>
                    <span className="font-semibold text-ink">{open}</span> open
                  </span>
                  <span className="flex items-center gap-1.5 text-ink-subtle">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="text-[#a371f7]">
                      <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
                      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z" />
                    </svg>
                    <span className="font-semibold">{closed}</span> closed
                  </span>
                </div>

                <span className="h-4 w-px bg-line" />

                {/* Severity breakdown */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {SEVERITY_ORDER.map((s) => {
                    const count = review.findings.filter((f) => f.severity === s).length;
                    if (count === 0) return null;
                    return (
                      <span
                        key={s}
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${SEVERITY_STYLE[s].badge}`}
                      >
                        {count} {SEVERITY_LABEL[s]}
                      </span>
                    );
                  })}
                </div>

                {/* Resolution bar */}
                {review.findings.length > 0 && (
                  <div className="ml-auto flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-[#3fb950]"
                        style={{ width: `${Math.round((closed / review.findings.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-subtle">
                      {Math.round((closed / review.findings.length) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
