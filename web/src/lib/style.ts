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
    stripe: "bg-[#f85149]",
    badge: "rounded-full bg-[#da3633]/15 text-[#ff7b72] ring-1 ring-inset ring-[#da3633]/40",
  },
  high: {
    stripe: "bg-[#d29922]",
    badge: "rounded-full bg-[#d29922]/15 text-[#e3b341] ring-1 ring-inset ring-[#d29922]/40",
  },
  medium: {
    stripe: "bg-[#a371f7]",
    badge: "rounded-full bg-[#a371f7]/15 text-[#d2a8ff] ring-1 ring-inset ring-[#a371f7]/30",
  },
  low: {
    stripe: "bg-[#58a6ff]",
    badge: "rounded-full bg-[#58a6ff]/15 text-[#79c0ff] ring-1 ring-inset ring-[#58a6ff]/30",
  },
  info: {
    stripe: "bg-[#6e7681]",
    badge: "rounded-full bg-[#6e7681]/15 text-[#8b949e] ring-1 ring-inset ring-[#6e7681]/30",
  },
};

/* ------------------------------------------------------------------ */
/* Confidence — GitHub neutral scale                                   */
/* ------------------------------------------------------------------ */

export const CONFIDENCE_STYLE: Record<Confidence, { badge: string }> = {
  high: {
    badge: "rounded-full bg-[#3fb950]/10 text-[#3fb950] ring-1 ring-inset ring-[#3fb950]/25",
  },
  medium: {
    badge: "rounded-full bg-[#6e7681]/12 text-[#8b949e] ring-1 ring-inset ring-[#6e7681]/25",
  },
  low: {
    badge: "rounded-full bg-transparent text-[#6e7681] ring-1 ring-inset ring-[#6e7681]/30",
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
    dot: "bg-[#f85149]",
    badge: "rounded-full bg-[#da3633]/15 text-[#ff7b72] ring-1 ring-inset ring-[#da3633]/25",
  },
  bug: {
    dot: "bg-[#a371f7]",
    badge: "rounded-full bg-[#a371f7]/15 text-[#d2a8ff] ring-1 ring-inset ring-[#a371f7]/25",
  },
  performance: {
    dot: "bg-[#39d353]",
    badge: "rounded-full bg-[#39d353]/10 text-[#56d364] ring-1 ring-inset ring-[#39d353]/25",
  },
  maintainability: {
    dot: "bg-[#58a6ff]",
    badge: "rounded-full bg-[#58a6ff]/10 text-[#79c0ff] ring-1 ring-inset ring-[#58a6ff]/25",
  },
  test: {
    dot: "bg-[#3fb950]",
    badge: "rounded-full bg-[#3fb950]/10 text-[#56d364] ring-1 ring-inset ring-[#3fb950]/25",
  },
  docs: {
    dot: "bg-[#d29922]",
    badge: "rounded-full bg-[#d29922]/10 text-[#e3b341] ring-1 ring-inset ring-[#d29922]/25",
  },
  other: {
    dot: "bg-[#6e7681]",
    badge: "rounded-full bg-[#6e7681]/10 text-[#8b949e] ring-1 ring-inset ring-[#6e7681]/20",
  },
};

/* ------------------------------------------------------------------ */
/* Disposition — GitHub semantic colors                                */
/* ------------------------------------------------------------------ */

export const DISPOSITION_ACCENT: Record<Disposition, string> = {
  triage: "bg-[#6e7681]",
  "ai-fix": "bg-[#388bfd]",
  manual: "bg-[#a371f7]",
  wontfix: "bg-[#484f58]",
  done: "bg-[#3fb950]",
};

export function formatLine(start?: number, end?: number): string {
  if (start == null) return "";
  if (end == null || end === start) return `:${start}`;
  return `:${start}-${end}`;
}

export function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}
