import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  type Category,
} from "../types/review";
import type { FindingWithContext } from "../lib/reviews";
import { CATEGORY_STYLE } from "../lib/style";

interface PerspectiveSummaryProps {
  findings: FindingWithContext[];
}

function isActive(finding: FindingWithContext): boolean {
  return finding.disposition !== "done" && finding.disposition !== "wontfix";
}

function worstPriorityLabel(findings: FindingWithContext[]): string | null {
  for (const severity of SEVERITY_ORDER) {
    if (findings.some((f) => f.severity === severity)) {
      return SEVERITY_LABEL[severity];
    }
  }
  return null;
}

export function PerspectiveSummary({ findings }: PerspectiveSummaryProps) {
  const categories = CATEGORY_ORDER.filter((c) =>
    findings.some((f) => f.category === c),
  );

  const totalOpen = findings.filter(isActive).length;
  const totalDone = findings.filter((f) => !isActive(f)).length;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {/* GitHub-style open/closed counts */}
      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          className="flex items-center gap-1.5 font-semibold text-ink hover:text-accent-fg"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden
            className="text-success-fg"
          >
            <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
          </svg>
          {totalOpen} Open
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 text-ink-subtle hover:text-ink"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden
            className="text-done"
          >
            <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z" />
          </svg>
          {totalDone} Closed
        </button>
      </div>

      {/* Divider */}
      {categories.length > 0 && (
        <span className="h-4 w-px bg-line" aria-hidden />
      )}

      {/* Category breakdown — GitHub label pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {categories.map((category: Category) => {
          const inCategory = findings.filter((f) => f.category === category);
          const open = inCategory.filter(isActive);
          const worst = worstPriorityLabel(open);
          const catStyle = CATEGORY_STYLE[category];

          return (
            <div
              key={category}
              className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs"
            >
              <span
                className={`h-2 w-2 rounded-full ${catStyle.dot}`}
                aria-hidden
              />
              <span className="font-medium text-ink-muted">
                {CATEGORY_LABEL[category]}
              </span>
              <span className="font-semibold text-ink">{open.length}</span>
              {worst && open.length > 0 && (
                <span className="text-ink-faint">· {worst}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
