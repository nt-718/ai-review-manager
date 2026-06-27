import { useMemo } from "react";
import type { FindingWithContext } from "../lib/reviews";
import { SEVERITY_ORDER, SEVERITY_LABEL } from "../types/review";
import { SEVERITY_STYLE } from "../lib/style";

interface RepoPickerPageProps {
  findings: FindingWithContext[];
  onSelect: (repo: string) => void;
}

function isActive(f: FindingWithContext) {
  return f.disposition !== "done" && f.disposition !== "wontfix";
}

function RepoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="shrink-0 text-ink-subtle">
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="shrink-0 text-ink-faint">
      <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

export function RepoPickerPage({ findings, onSelect }: RepoPickerPageProps) {
  const repos = useMemo(() => {
    const map = new Map<string, FindingWithContext[]>();
    for (const f of findings) {
      if (!map.has(f.repo)) map.set(f.repo, []);
      map.get(f.repo)!.push(f);
    }
    return [...map.entries()]
      .map(([repo, fs]) => {
        const open = fs.filter(isActive).length;
        const closed = fs.length - open;
        const pct = fs.length > 0 ? Math.round((closed / fs.length) * 100) : 0;
        const lastReviewed = fs.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt;
        const reviewCount = new Set(fs.map((f) => f.reviewId)).size;
        const slash = repo.indexOf("/");
        const owner = slash >= 0 ? repo.slice(0, slash) : null;
        const name = slash >= 0 ? repo.slice(slash + 1) : repo;
        return { repo, owner, name, findings: fs, open, closed, pct, lastReviewed, reviewCount };
      })
      .sort((a, b) => b.open - a.open);
  }, [findings]);

  return (
    <div className="mx-auto max-w-[56rem] px-4 py-8">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Repositories</h2>
        <span className="text-sm text-ink-subtle">
          {repos.length} {repos.length === 1 ? "repository" : "repositories"}
        </span>
      </div>

      <div className="overflow-hidden rounded-md border border-line">
        {repos.map(({ repo, owner, name, findings: fs, open, closed, pct, lastReviewed, reviewCount }, idx) => (
          <button
            key={repo}
            type="button"
            onClick={() => onSelect(repo)}
            className={`flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-surface-2 ${
              idx > 0 ? "border-t border-line" : ""
            }`}
          >
            <div className="shrink-0">
              <RepoIcon />
            </div>

            <div className="min-w-0 flex-1">
              {/* Repo name */}
              <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                {owner && (
                  <>
                    <span className="text-sm font-medium text-ink-subtle">{owner}</span>
                    <span className="text-ink-faint">/</span>
                  </>
                )}
                <span className="text-sm font-semibold text-accent-fg">{name}</span>
                <span className="ml-1 rounded-full border border-line px-2 py-0.5 text-xs text-ink-subtle">
                  {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                </span>
              </div>

              {/* Stats row */}
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-subtle">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-success-fg" aria-hidden />
                  {open} open
                </span>
                <span>{closed} closed</span>
                <span aria-hidden>·</span>
                <span>
                  Updated{" "}
                  {new Date(lastReviewed).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span aria-hidden>·</span>
                {/* Resolution bar inline */}
                <span className="flex items-center gap-1.5">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-success-fg transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-medium text-ink">{pct}%</span>
                </span>
              </div>

              {/* Severity badges */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {SEVERITY_ORDER.map((s) => {
                  const count = fs.filter((f) => f.severity === s).length;
                  if (count === 0) return null;
                  return (
                    <span key={s} className={`rounded-full px-2 py-0.5 text-xs ${SEVERITY_STYLE[s].badge}`}>
                      {count} {SEVERITY_LABEL[s]}
                    </span>
                  );
                })}
              </div>
            </div>

            <ChevronRightIcon />
          </button>
        ))}
      </div>
    </div>
  );
}
