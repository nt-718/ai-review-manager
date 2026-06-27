import { useState } from "react";
import {
  SEVERITY_ORDER,
  SEVERITY_LABEL,
  CATEGORY_ORDER,
  CATEGORY_LABEL,
  type Severity,
  type Category,
} from "../types/review";
import { SEVERITY_STYLE, CATEGORY_STYLE } from "../lib/style";
import type { Filters } from "./FilterBar";
import type { FindingWithContext } from "../lib/reviews";

interface FilterSidebarProps {
  deduped: FindingWithContext[];
  filters: Filters;
  onChange: (filters: Filters) => void;
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

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-line last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle hover:text-ink transition-colors"
      >
        {title}
        <ChevronIcon open={open} />
      </button>
      {open && <div className="px-2 pb-2">{children}</div>}
    </div>
  );
}

interface FilterItemProps {
  label: string;
  count: number;
  active: boolean;
  dot: string;
  onClick: () => void;
}

function FilterItem({ label, count, active, dot, onClick }: FilterItemProps) {
  return (
    <li className="relative">
      {active && (
        <span className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-coral" aria-hidden />
      )}
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-md py-1.5 pl-4 pr-3 text-sm transition-colors ${
          active
            ? "font-semibold text-ink"
            : "text-ink-subtle hover:bg-surface-3 hover:text-ink"
        }`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums ${
            active ? "bg-surface-3 text-ink" : "bg-surface-2 text-ink-faint"
          }`}
        >
          {count}
        </span>
      </button>
    </li>
  );
}

export function FilterSidebar({ deduped, filters, onChange }: FilterSidebarProps) {
  const severityCounts = Object.fromEntries(
    SEVERITY_ORDER.map((s) => [s, deduped.filter((f) => f.severity === s).length]),
  );

  const categoryCounts = Object.fromEntries(
    CATEGORY_ORDER.map((c) => [c, deduped.filter((f) => f.category === c).length]),
  );

  const toolMap = new Map<string, number>();
  for (const f of deduped) {
    toolMap.set(f.tool, (toolMap.get(f.tool) ?? 0) + 1);
  }
  const tools = [...toolMap.entries()].sort((a, b) => b[1] - a[1]);

  const toggle = <K extends string>(key: "severity" | "category" | "tool", value: K) => {
    onChange({ ...filters, [key]: filters[key] === value ? "all" : value });
  };

  return (
    <aside className="w-52 shrink-0">
      <div className="sticky top-4 overflow-hidden rounded-md border border-line bg-surface">
        {/* Severity */}
        <Section title="Severity">
          <ul className="flex flex-col gap-0.5">
            {SEVERITY_ORDER.map((s) => {
              const count = severityCounts[s];
              if (count === 0) return null;
              return (
                <FilterItem
                  key={s}
                  label={SEVERITY_LABEL[s]}
                  count={count}
                  active={filters.severity === s}
                  dot={SEVERITY_STYLE[s].stripe}
                  onClick={() => toggle("severity", s as Severity)}
                />
              );
            })}
          </ul>
        </Section>

        {/* Category */}
        <Section title="Category">
          <ul className="flex flex-col gap-0.5">
            {CATEGORY_ORDER.map((c) => {
              const count = categoryCounts[c];
              if (count === 0) return null;
              return (
                <FilterItem
                  key={c}
                  label={CATEGORY_LABEL[c]}
                  count={count}
                  active={filters.category === c}
                  dot={CATEGORY_STYLE[c].dot}
                  onClick={() => toggle("category", c as Category)}
                />
              );
            })}
          </ul>
        </Section>

        {/* Tool */}
        {tools.length > 0 && (
          <Section title="Tool">
            <ul className="flex flex-col gap-0.5">
              {tools.map(([tool, count]) => (
                <FilterItem
                  key={tool}
                  label={tool}
                  count={count}
                  active={filters.tool === tool}
                  dot="bg-ink-faint"
                  onClick={() => toggle("tool", tool)}
                />
              ))}
            </ul>
          </Section>
        )}
      </div>
    </aside>
  );
}
