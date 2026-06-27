import type { IncomingMessage, ServerResponse } from "node:http";

export interface CollectedFinding {
  id: string;
  fingerprint: string;
  sourceId: string;
  reviewId: string;
  repo: string;
  tool: string;
  createdAt: string;
  disposition: "triage" | "ai-fix" | "manual" | "wontfix" | "done";
  instruction: string;
  note: string;
  thread: Array<{ role: string; text: string; at: string }>;
  [key: string]: unknown;
}

export function collectFindings(): Promise<{
  findings: CollectedFinding[];
  generatedAt: string;
}>;

export function applyState(payload: {
  sourceId: string;
  fingerprint: string;
  disposition: string;
  instruction?: string;
  note?: string;
}): Promise<{
  fingerprint: string;
  disposition: string;
  instruction: string;
  note: string;
  thread: Array<{ role: string; text: string; at: string }>;
}>;

export function appendThreadMessage(payload: {
  sourceId: string;
  fingerprint: string;
  role?: "user" | "assistant";
  text: string;
}): Promise<{
  fingerprint: string;
  thread: Array<{ role: string; text: string; at: string }>;
}>;

export function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean>;
