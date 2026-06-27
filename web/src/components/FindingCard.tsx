import type { FindingWithContext } from "../lib/reviews";
import { formatLine } from "../lib/style";
import { CategoryBadge } from "./CategoryBadge";
import { SeverityBadge } from "./SeverityBadge";

interface FindingCardProps {
  finding: FindingWithContext;
  showRepo?: boolean;
  draggable?: boolean;
  dragging?: boolean;
  onClick: (finding: FindingWithContext) => void;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}

function OpenIssueIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
      className="shrink-0 mt-0.5 text-success-fg"
    >
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
    </svg>
  );
}

function DoneIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
      className="shrink-0 mt-0.5 text-done"
    >
      <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z" />
    </svg>
  );
}

export function FindingCard({
  finding,
  showRepo,
  draggable,
  dragging,
  onClick,
  onDragStart,
  onDragEnd,
}: FindingCardProps) {
  const isDone = finding.disposition === "done" || finding.disposition === "wontfix";

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group relative overflow-hidden rounded-md border border-line bg-surface-2 transition-colors hover:border-line-strong hover:bg-surface-3 ${
        dragging ? "opacity-40" : ""
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <button
        type="button"
        onClick={() => onClick(finding)}
        className="flex w-full min-w-0 items-start gap-2.5 px-3 py-2.5 text-left"
      >
        {isDone ? <DoneIcon /> : <OpenIssueIcon />}

        <div className="min-w-0 flex-1">
          {/* Labels row */}
          <div className="mb-1 flex flex-wrap items-center gap-1">
            <SeverityBadge severity={finding.severity} />
            <CategoryBadge category={finding.category} />
          </div>

          {/* Title */}
          <p className="line-clamp-2 text-sm font-medium leading-snug text-ink group-hover:text-accent-fg">
            {finding.message}
          </p>

          {/* Meta: file path + thread count */}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-subtle">
            <span className="truncate font-mono">
              {finding.file}
              {formatLine(finding.line?.start, finding.line?.end)}
            </span>

            {finding.thread.length > 0 && (
              <span className="ml-auto flex shrink-0 items-center gap-1">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
                </svg>
                {finding.thread.length}
              </span>
            )}
          </div>

          {/* Instruction badge */}
          {(finding.instruction || showRepo) && (
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              {finding.instruction && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent-fg ring-1 ring-inset ring-accent/30">
                  → AI fix queued
                </span>
              )}
              {showRepo && (
                <span className="ml-auto truncate text-ink-faint">
                  {finding.repo}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
