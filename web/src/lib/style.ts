import type { Category, Confidence, Disposition, Severity } from "../types/review";

/* ------------------------------------------------------------------ */
/* Severity — GitHub danger/attention/done/accent/neutral palette      */
/* ------------------------------------------------------------------ */

interface SeverityStyle {
  stripe: string;
  badge: string;
}

export const SEVERITY_STYLE: Record<Severity, SeverityStyle> = {
  critical: {
    stripe: "bg-danger-fg",
    badge: "rounded-full bg-danger/15 text-danger-emphasis ring-1 ring-inset ring-danger/40",
  },
  high: {
    stripe: "bg-attention-fg",
    badge: "rounded-full bg-attention-fg/15 text-attention-emphasis ring-1 ring-inset ring-attention-fg/40",
  },
  medium: {
    stripe: "bg-done",
    badge: "rounded-full bg-done/15 text-done-emphasis ring-1 ring-inset ring-done/30",
  },
  low: {
    stripe: "bg-accent-fg",
    badge: "rounded-full bg-accent-fg/15 text-accent-emphasis ring-1 ring-inset ring-accent-fg/30",
  },
  info: {
    stripe: "bg-ink-faint",
    badge: "rounded-full bg-ink-faint/15 text-ink-subtle ring-1 ring-inset ring-ink-faint/30",
  },
};

/* ------------------------------------------------------------------ */
/* Confidence — GitHub neutral scale                                   */
/* ------------------------------------------------------------------ */

export const CONFIDENCE_STYLE: Record<Confidence, { badge: string }> = {
  high: {
    badge: "rounded-full bg-success-fg/10 text-success-fg ring-1 ring-inset ring-success-fg/25",
  },
  medium: {
    badge: "rounded-full bg-ink-faint/12 text-ink-subtle ring-1 ring-inset ring-ink-faint/25",
  },
  low: {
    badge: "rounded-full bg-transparent text-ink-faint ring-1 ring-inset ring-ink-faint/30",
  },
};

/* ------------------------------------------------------------------ */
/* Category — GitHub label colors                                      */
/* ------------------------------------------------------------------ */

interface CategoryStyle {
  dot: string;
  badge: string;
}

export const CATEGORY_STYLE: Record<Category, CategoryStyle> = {
  security: {
    dot: "bg-danger-fg",
    badge: "rounded-full bg-danger/15 text-danger-emphasis ring-1 ring-inset ring-danger/25",
  },
  bug: {
    dot: "bg-done",
    badge: "rounded-full bg-done/15 text-done-emphasis ring-1 ring-inset ring-done/25",
  },
  performance: {
    dot: "bg-success-fg",
    badge: "rounded-full bg-success-fg/10 text-success-emphasis ring-1 ring-inset ring-success-fg/25",
  },
  maintainability: {
    dot: "bg-accent-fg",
    badge: "rounded-full bg-accent-fg/10 text-accent-emphasis ring-1 ring-inset ring-accent-fg/25",
  },
  test: {
    dot: "bg-success-fg",
    badge: "rounded-full bg-success-fg/10 text-success-emphasis ring-1 ring-inset ring-success-fg/25",
  },
  docs: {
    dot: "bg-attention-fg",
    badge: "rounded-full bg-attention-fg/10 text-attention-emphasis ring-1 ring-inset ring-attention-fg/25",
  },
  other: {
    dot: "bg-ink-faint",
    badge: "rounded-full bg-ink-faint/10 text-ink-subtle ring-1 ring-inset ring-ink-faint/20",
  },
};

/* ------------------------------------------------------------------ */
/* Disposition — GitHub semantic colors                                */
/* ------------------------------------------------------------------ */

export const DISPOSITION_ACCENT: Record<Disposition, string> = {
  triage: "bg-ink-faint",
  "ai-fix": "bg-accent-hover",
  manual: "bg-done",
  wontfix: "bg-line-strong",
  done: "bg-success-fg",
};

export function formatLine(start?: number, end?: number): string {
  if (start == null) return "";
  if (end == null || end === start) return `:${start}`;
  return `:${start}-${end}`;
}

export function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}
