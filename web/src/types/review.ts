export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Category =
  | "security"
  | "bug"
  | "performance"
  | "maintainability"
  | "test"
  | "docs"
  | "other";

export type FindingStatus = "open" | "acknowledged" | "resolved" | "dismissed";

export type Disposition = "triage" | "ai-fix" | "manual" | "wontfix" | "done";

export type Confidence = "high" | "medium" | "low";

export type ThreadRole = "user" | "assistant";

export interface ThreadMessage {
  role: ThreadRole;
  text: string;
  at: string;
}

export interface HistoryEntry {
  from: Disposition;
  to: Disposition;
  at: string;
  by: string;
}

export interface LineRange {
  start: number;
  end?: number;
}

export interface Finding {
  id: string;
  fingerprint?: string;
  file: string;
  line?: LineRange;
  severity: Severity;
  category: Category;
  message: string;
  suggestion?: string;
  status?: FindingStatus;
  confidence?: Confidence;
  codeSnippet?: string;
}

export interface Reviewer {
  tool: string;
  model?: string;
}

export interface Target {
  repo: string;
  branch?: string;
  commit?: string;
  pr?: number;
}

export interface ReviewSummary {
  score?: number;
  text?: string;
}

export interface Review {
  schemaVersion: "1.0";
  id: string;
  createdAt: string;
  reviewer: Reviewer;
  target: Target;
  summary?: ReviewSummary;
  findings: Finding[];
}

export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "must",
  high: "should",
  medium: "imo",
  low: "nit",
  info: "fyi",
};

export const SEVERITY_HINT: Record<Severity, string> = {
  critical: "Must fix — blocking issue",
  high: "Should fix — strongly recommended",
  medium: "IMO — subjective suggestion",
  low: "Nit — minor or stylistic",
  info: "FYI — informational",
};

export const CATEGORY_ORDER: Category[] = [
  "security",
  "bug",
  "performance",
  "maintainability",
  "test",
  "docs",
  "other",
];

export const CATEGORY_LABEL: Record<Category, string> = {
  security: "Security",
  bug: "Bug",
  performance: "Performance",
  maintainability: "Maintainability",
  test: "Testing",
  docs: "Documentation",
  other: "Other",
};

export const DISPOSITION_ORDER: Disposition[] = [
  "triage",
  "ai-fix",
  "manual",
  "wontfix",
  "done",
];

export const DISPOSITION_LABEL: Record<Disposition, string> = {
  triage: "New",
  "ai-fix": "In Progress",
  manual: "In Review",
  wontfix: "Won't Fix",
  done: "Done",
};

export const DISPOSITION_HINT: Record<Disposition, string> = {
  triage: "Unsorted findings",
  "ai-fix": "Actively being worked on",
  manual: "Awaiting review",
  wontfix: "Findings to skip",
  done: "Verified resolved findings",
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "high",
  medium: "medium",
  low: "low",
};

export const CONFIDENCE_HINT: Record<Confidence, string> = {
  high: "High confidence — direct evidence in code",
  medium: "Medium confidence — strong indication, incomplete proof",
  low: "Low confidence — speculative, confirm before acting",
};
