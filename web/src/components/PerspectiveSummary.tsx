import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
  type Category,
  type Severity,
} from "../types/review";
import type { FindingWithContext } from "../lib/reviews";
import { CATEGORY_STYLE, SEVERITY_STYLE } from "../lib/style";
import type { Filters } from "./FilterBar";

interface PerspectiveSummaryProps {
  findings: FindingWithContext[];
  allFindings: FindingWithContext[];
  filters: Filters;
  onChange: (f: Filters) => void;
}

function isActive(f: FindingWithContext) {
  return f.disposition !== "done" && f.disposition !== "wontfix";
}

export function PerspectiveSummary({ findings, allFindings, filters, onChange }: PerspectiveSummaryProps) {
  const totalOpen = findings.filter(isActive).length;
  const totalClosed = findings.filter((f) => !isActive(f)).length;

  const severityCounts = Object.fromEntries(
    SEVERITY_ORDER.map((s) => [s, allFindings.filter((f) => f.severity === s).length]),
  ) as Record<Severity, number>;

  const categoryCounts = Object.fromEntries(
    CATEGORY_ORDER.map((c) => [c, allFindings.filter((f) => f.category === c).length]),
  ) as Record<Category, number>;

  const toolMap = new Map<string, number>();
  for (const f of allFindings) {
    toolMap.set(f.tool, (toolMap.get(f.tool) ?? 0) + 1);
  }
  const tools = [...toolMap.entries()].sort((a, b) => b[1] - a[1]);

  const hasFilter =
    filters.severity.length > 0 || filters.category.length > 0 || filters.tool.length > 0;

  function toggleValue<T extends string>(current: T[], value: T): T[] {
    return current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* Open / Closed counts */}
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-ink">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="text-success-fg">
            <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
          </svg>
          {totalOpen} Open
        </span>
        <span className="flex items-center gap-1.5 text-ink-subtle">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="text-done">
            <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z" />
          </svg>
          {totalClosed} Closed
        </span>
      </div>

      <span className="h-4 w-px bg-line" aria-hidden />

      {/* Severity filter chips */}
      <div className="flex flex-wrap items-center gap-1">
        {SEVERITY_ORDER.map((s) => {
          const count = severityCounts[s];
          if (count === 0) return null;
          const active = filters.severity.includes(s);
          const style = SEVERITY_STYLE[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ ...filters, severity: toggleValue(filters.severity, s) })}
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium transition-colors ${
                active
                  ? style.badge
                  : "rounded-full bg-surface-2 text-ink-subtle hover:bg-surface-3 hover:text-ink"
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.stripe}`} aria-hidden />
              {SEVERITY_LABEL[s]}
              <span className="tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      <span className="h-4 w-px bg-line" aria-hidden />

      {/* Category filter chips */}
      <div className="flex flex-wrap items-center gap-1">
        {CATEGORY_ORDER.map((c) => {
          const count = categoryCounts[c];
          if (count === 0) return null;
          const active = filters.category.includes(c);
          const catStyle = CATEGORY_STYLE[c];
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...filters, category: toggleValue(filters.category, c) })}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium transition-colors ${
                active
                  ? catStyle.badge
                  : "rounded-full bg-surface-2 text-ink-subtle hover:bg-surface-3 hover:text-ink"
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${catStyle.dot}`} aria-hidden />
              {CATEGORY_LABEL[c]}
              <span className="tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Tool filter chips (only when multiple tools) */}
      {tools.length > 1 && (
        <>
          <span className="h-4 w-px bg-line" aria-hidden />
          <div className="flex flex-wrap items-center gap-1">
            {tools.map(([tool, count]) => {
              const active = filters.tool.includes(tool);
              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => onChange({ ...filters, tool: toggleValue(filters.tool, tool) })}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-surface-3 text-ink ring-1 ring-inset ring-line-strong"
                      : "bg-surface-2 text-ink-subtle hover:bg-surface-3 hover:text-ink"
                  }`}
                >
                  {tool}
                  <span className="tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Clear filters */}
      {hasFilter && (
        <button
          type="button"
          onClick={() => onChange({ severity: [], category: [], tool: [] })}
          className="ml-auto text-xs text-ink-subtle hover:text-danger-fg transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
