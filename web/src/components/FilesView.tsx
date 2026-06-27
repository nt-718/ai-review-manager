import { useState } from "react";
import { SEVERITY_ORDER, SEVERITY_LABEL } from "../types/review";
import type { FindingWithContext } from "../lib/reviews";
import { SEVERITY_STYLE, formatLine } from "../lib/style";
import { SeverityBadge } from "./SeverityBadge";
import { CategoryBadge } from "./CategoryBadge";

interface FilesViewProps {
  findings: FindingWithContext[];
  onFindingClick: (finding: FindingWithContext) => void;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
      className={`shrink-0 text-ink-subtle transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
      className="shrink-0 text-ink-subtle"
    >
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 8.75 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688Z" />
    </svg>
  );
}

export function FilesView({ findings, onFindingClick }: FilesViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const byFile = new Map<string, FindingWithContext[]>();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }

  const files = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);

  const toggle = (file: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  if (files.length === 0) {
    return (
      <div className="rounded-md border border-line bg-surface p-12 text-center text-ink-subtle">
        No findings match the current filters
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
        <span className="text-sm font-semibold text-ink">
          {files.length} file{files.length !== 1 ? "s" : ""} with findings
        </span>
        <div className="flex gap-3">
          {SEVERITY_ORDER.map((s) => {
            const count = findings.filter((f) => f.severity === s).length;
            if (count === 0) return null;
            return (
              <span key={s} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${SEVERITY_STYLE[s].stripe}`} />
                <span className="text-xs text-ink-subtle">
                  {count} {SEVERITY_LABEL[s]}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* File rows */}
      {files.map(([file, fileFindings]) => {
        const isOpen = expanded.has(file);
        return (
          <div key={file} className="border-b border-line last:border-0">
            {/* File header row */}
            <button
              type="button"
              onClick={() => toggle(file)}
              className="flex w-full items-center gap-2 bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
            >
              <ChevronIcon open={isOpen} />
              <FileIcon />
              <span className="flex-1 truncate font-mono text-sm text-ink-muted">
                {file}
              </span>

              {/* Severity mini-bars */}
              <div className="flex shrink-0 items-center gap-1.5">
                {SEVERITY_ORDER.map((s) => {
                  const cnt = fileFindings.filter((f) => f.severity === s).length;
                  if (cnt === 0) return null;
                  return (
                    <span
                      key={s}
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${SEVERITY_STYLE[s].badge}`}
                    >
                      {cnt}
                    </span>
                  );
                })}
              </div>

              <span className="ml-2 shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-ink-subtle">
                {fileFindings.length}
              </span>
            </button>

            {/* Expanded: finding rows */}
            {isOpen && (
              <div className="border-t border-line bg-canvas">
                {fileFindings.map((finding, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onFindingClick(finding)}
                    className="flex w-full items-start gap-3 border-b border-line/50 px-6 py-2.5 text-left last:border-0 hover:bg-surface"
                  >
                    <span className="mt-0.5 font-mono text-xs text-ink-faint">
                      {formatLine(finding.line?.start, finding.line?.end) || "–"}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="text-sm text-ink line-clamp-2">{finding.message}</p>
                      <div className="flex items-center gap-1.5">
                        <SeverityBadge severity={finding.severity} />
                        <CategoryBadge category={finding.category} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
