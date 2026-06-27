import { useEffect, useRef, useState } from "react";
import { DISPOSITION_LABEL } from "../types/review";
import type { FindingState, FindingWithContext } from "../lib/reviews";
import { basename, formatLine } from "../lib/style";
import { BulbIcon } from "./BulbIcon";
import { CategoryBadge } from "./CategoryBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { SeverityBadge } from "./SeverityBadge";

interface DetailPanelProps {
  finding: FindingWithContext | null;
  readOnly?: boolean;
  onClose: () => void;
  onStateChange: (
    finding: FindingWithContext,
    patch: Partial<FindingState>,
  ) => void;
  onThreadMessage: (finding: FindingWithContext, text: string) => Promise<void>;
}

const DISPOSITION_COLOR: Record<string, string> = {
  triage: "bg-[#6e7681]/15 text-[#8b949e] ring-1 ring-inset ring-[#6e7681]/30",
  "ai-fix": "bg-[#388bfd]/15 text-[#58a6ff] ring-1 ring-inset ring-[#388bfd]/30",
  manual: "bg-[#a371f7]/15 text-[#d2a8ff] ring-1 ring-inset ring-[#a371f7]/30",
  wontfix: "bg-[#6e7681]/10 text-[#6e7681] ring-1 ring-inset ring-[#484f58]/40",
  done: "bg-[#238636]/15 text-[#3fb950] ring-1 ring-inset ring-[#238636]/40",
};

export function DetailPanel({
  finding,
  readOnly,
  onClose,
  onStateChange,
  onThreadMessage,
}: DetailPanelProps) {
  const open = finding !== null;
  const [note, setNote] = useState("");
  const [instruction, setInstruction] = useState("");
  const [question, setQuestion] = useState("");
  const [posting, setPosting] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNote(finding?.note ?? "");
    setInstruction(finding?.instruction ?? "");
    setQuestion("");
  }, [finding]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (finding?.thread.length) {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [finding?.thread.length, finding?.fingerprint]);

  const noteDirty = finding ? note !== finding.note : false;
  const instructionDirty = finding ? instruction !== finding.instruction : false;

  function handleBlurSave() {
    if (!finding || readOnly) return;
    if (noteDirty || instructionDirty) {
      onStateChange(finding, { note, instruction });
    }
  }

  async function handleAsk() {
    if (!finding || !question.trim() || posting) return;
    setPosting(true);
    try {
      await onThreadMessage(finding, question.trim());
      setQuestion("");
    } finally {
      setPosting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Slide-in panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[560px] flex-col border-l border-line bg-canvas shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {finding && (
          <>
            {/* Header — GitHub file header style */}
            <div className="border-b border-line bg-surface">
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SeverityBadge severity={finding.severity} />
                    <CategoryBadge category={finding.category} />
                    {finding.confidence && (
                      <ConfidenceBadge confidence={finding.confidence} />
                    )}
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        DISPOSITION_COLOR[finding.disposition] ?? DISPOSITION_COLOR.triage
                      }`}
                    >
                      {DISPOSITION_LABEL[finding.disposition]}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-ink-subtle">
                    {finding.file}
                    {formatLine(finding.line?.start, finding.line?.end)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-md p-1.5 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Close"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-0 overflow-y-auto">
              {/* Message */}
              <div className="border-b border-line px-4 py-4">
                <p className="text-sm leading-relaxed text-ink">
                  {finding.message}
                </p>
              </div>

              {/* Code snippet — GitHub diff style */}
              {finding.codeSnippet && (
                <div className="border-b border-line">
                  <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="text-ink-subtle">
                      <path d="M4 1.75C4 .784 4.784 0 5.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0 1 14.25 15h-9a1.75 1.75 0 0 1-1.75-1.75Zm1.75-.25a.25.25 0 0 0-.25.25v11.5c0 .138.112.25.25.25h9a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 10 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688Z" />
                    </svg>
                    <span className="font-mono text-xs text-ink-subtle">
                      {basename(finding.file)}
                      {formatLine(finding.line?.start, finding.line?.end)}
                    </span>
                  </div>
                  <pre className="overflow-x-auto bg-canvas px-4 py-3 font-mono text-xs leading-relaxed text-ink-muted">
                    <code>{finding.codeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* Suggestion */}
              {finding.suggestion && (
                <div className="border-b border-line bg-[#388bfd]/5 px-4 py-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[#58a6ff]">
                    <BulbIcon size="md" />
                    <span className="text-xs font-semibold">Suggested fix</span>
                  </div>
                  <p className="text-sm leading-relaxed text-ink-muted">
                    {finding.suggestion}
                  </p>
                </div>
              )}

              {/* Investigation thread — GitHub PR comment style */}
              <div className="border-b border-line px-4 py-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="text-ink-subtle">
                    <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
                  </svg>
                  Investigation
                </h3>

                {finding.thread.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {finding.thread.map((message, index) => (
                      <div
                        key={`${message.at}-${index}`}
                        className={`rounded-md border text-sm ${
                          message.role === "user"
                            ? "border-line bg-surface-2"
                            : "border-[#388bfd]/20 bg-[#388bfd]/5"
                        }`}
                      >
                        {/* Comment header */}
                        <div
                          className={`flex items-center gap-2 border-b px-3 py-1.5 text-xs ${
                            message.role === "user"
                              ? "border-line bg-surface-3 text-ink-subtle"
                              : "border-[#388bfd]/20 bg-[#388bfd]/5 text-[#58a6ff]"
                          }`}
                        >
                          <span className="font-semibold">
                            {message.role === "user" ? "You" : "AI"}
                          </span>
                          <span className="text-ink-faint">
                            commented{" "}
                            {new Date(message.at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap px-3 py-2.5 text-ink-muted">
                          {message.text}
                        </p>
                      </div>
                    ))}
                    <div ref={threadEndRef} />
                  </div>
                ) : (
                  <p className="text-xs text-ink-faint">
                    Ask a question to dig deeper into this finding.
                  </p>
                )}

                {!readOnly && (
                  <div className="mt-3 flex flex-col gap-2">
                    <textarea
                      value={question}
                      disabled={posting}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          void handleAsk();
                        }
                      }}
                      placeholder="Leave a comment…"
                      rows={2}
                      className="w-full resize-y rounded-md border border-line bg-surface-2 px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-[#388bfd] focus:outline-none focus:ring-1 focus:ring-[#388bfd]/50 disabled:opacity-50"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-ink-faint">
                        Run{" "}
                        <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-ink-subtle">
                          ai-investigate-finding
                        </code>{" "}
                        for an AI answer.
                      </p>
                      <button
                        type="button"
                        disabled={!question.trim() || posting}
                        onClick={() => void handleAsk()}
                        className="shrink-0 rounded-md bg-[#238636] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {posting ? "Saving…" : "Comment"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Fix instruction + Note */}
              <div className="px-4 py-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                      Fix instruction
                    </label>
                    <textarea
                      value={instruction}
                      disabled={readOnly}
                      onChange={(e) => setInstruction(e.target.value)}
                      onBlur={handleBlurSave}
                      placeholder="Tell the AI how to fix this. Findings in the AI Fix column are eligible."
                      rows={3}
                      className="w-full resize-y rounded-md border border-line bg-surface-2 px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-[#388bfd] focus:outline-none focus:ring-1 focus:ring-[#388bfd]/50 disabled:opacity-50"
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        disabled={!instructionDirty}
                        onClick={() => onStateChange(finding, { instruction })}
                        className="self-end rounded-md bg-[#1f6feb] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#388bfd] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Save
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                      Note
                    </label>
                    <textarea
                      value={note}
                      disabled={readOnly}
                      onChange={(e) => setNote(e.target.value)}
                      onBlur={handleBlurSave}
                      placeholder="Rationale or notes (optional)"
                      rows={2}
                      className="w-full resize-y rounded-md border border-line bg-surface-2 px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus:border-[#388bfd] focus:outline-none focus:ring-1 focus:ring-[#388bfd]/50 disabled:opacity-50"
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        disabled={!noteDirty}
                        onClick={() => onStateChange(finding, { note })}
                        className="self-end rounded-md border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-line-strong hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Save
                      </button>
                    )}
                  </div>

                  {!readOnly && (
                    <p className="text-xs text-ink-faint">
                      Drag cards on the board to move between columns
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-line bg-surface px-4 py-2.5">
              <p className="font-mono text-xs text-ink-faint">
                {finding.repo}
                {" · "}
                {new Date(finding.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
