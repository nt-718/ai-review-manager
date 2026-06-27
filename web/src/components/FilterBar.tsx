import type { Category, Severity } from "../types/review";

export interface Filters {
  severity: Severity | "all";
  category: Category | "all";
  tool: string | "all";
}
