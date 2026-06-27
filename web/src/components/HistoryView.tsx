import { useState } from "react";
import { SEVERITY_ORDER, SEVERITY_LABEL } from "../types/review";
import type { FindingWithContext } from "../lib/reviews";
import { SEVERITY_STYLE, basename, formatLine } from "../lib/style";

interface HistoryViewProps {
  findings: FindingWithContext[];
  onFindingClick: (f: FindingWithContext) => void;
}

interface ReviewEntry {
  id: string;
  createdAt: string;
  tool: string;
  repo: string;
  branch: string | null;
  findings: FindingWithContext[];
}

function isActive(f: FindingWithContext) {
  return f.disposition !== "done" && f.disposition !== "wontfix";
}

function BranchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
      className={`shrink-0 transition-transform text-ink-faint ${open ? "rotate-180" : ""}`}
    >
      <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
    </svg>
  );
}

export function HistoryView({ findings, onFindingClick }: HistoryViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      branch: fs[0].branch ?? null,
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
        const isExpanded = expanded.has(review.id);

        return (
          <div key={review.id} className="flex gap-4">
            {/* Timeline column */}
            <div className="flex w-10 shrink-0 flex-col items-center gap-0 pt-4">
              <div className="z-10 h-3 w-3 rounded-full bg-success-fg ring-2 ring-canvas" />
              {i < reviews.length - 1 && (
                <div className="mt-1 w-px flex-1 bg-line" />
              )}
            </div>

            {/* Content card */}
            <div className="mb-4 flex-1 rounded-md border border-line bg-surface overflow-hidden">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-ink shrink-0">{review.tool}</span>
                  {review.branch && (
                    <>
                      <span className="text-ink-faint shrink-0">·</span>
                      <span className="flex items-center gap-1 font-mono text-xs text-ink-subtle truncate">
                        <BranchIcon />
                        {review.branch}
                      </span>
                    </>
                  )}
                </div>
                <time className="text-xs text-ink-subtle shrink-0">
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
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="text-success-fg">
                      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
                    </svg>
                    <span className="font-semibold text-ink">{open}</span> open
                  </span>
                  <span className="flex items-center gap-1.5 text-ink-subtle">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="text-done">
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
                        className="h-full rounded-full bg-success-fg"
                        style={{ width: `${Math.round((closed / review.findings.length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-subtle">
                      {Math.round((closed / review.findings.length) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Expand toggle */}
              <button
                type="button"
                onClick={() => toggleExpand(review.id)}
                className="flex w-full items-center gap-1.5 border-t border-line px-4 py-2 text-xs text-ink-subtle hover:bg-surface-2 hover:text-ink transition-colors"
              >
                <ChevronIcon open={isExpanded} />
                {isExpanded ? "Hide" : "Show"} {review.findings.length} finding{review.findings.length !== 1 ? "s" : ""}
              </button>

              {/* Expanded findings list */}
              {isExpanded && (
                <ul className="divide-y divide-line border-t border-line">
                  {review.findings
                    .slice()
                    .sort((a, b) => {
                      const si = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
                      return si !== 0 ? si : a.file.localeCompare(b.file);
                    })
                    .map((f) => (
                      <li key={f.fingerprint}>
                        <button
                          type="button"
                          onClick={() => onFindingClick(f)}
                          className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2"
                        >
                          <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-xs ${SEVERITY_STYLE[f.severity].badge}`}>
                            {SEVERITY_LABEL[f.severity]}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-ink">{f.message}</p>
                            <p className="mt-0.5 truncate font-mono text-xs text-ink-faint">
                              {basename(f.file)}{formatLine(f.line?.start, f.line?.end)}
                            </p>
                          </div>
                          <span
                            className={`mt-0.5 shrink-0 text-xs ${
                              isActive(f) ? "text-success-fg" : "text-done"
                            }`}
                          >
                            {isActive(f) ? "open" : "closed"}
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
