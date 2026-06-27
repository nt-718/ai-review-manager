import type { Category, Severity } from "../types/review";

export interface Filters {
  severity: Severity[];
  category: Category[];
  tool: string[];
}
