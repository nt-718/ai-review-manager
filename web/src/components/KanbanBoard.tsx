import { useState } from "react";
import {
  DISPOSITION_HINT,
  DISPOSITION_LABEL,
  DISPOSITION_ORDER,
  type Disposition,
} from "../types/review";
import { DISPOSITION_ACCENT } from "../lib/style";
import { findingKey, type FindingState, type FindingWithContext } from "../lib/reviews";
import { FindingCard } from "./FindingCard";

interface KanbanBoardProps {
  findings: FindingWithContext[];
  showRepo?: boolean;
  readOnly?: boolean;
  onCardClick: (finding: FindingWithContext) => void;
  onStateChange: (
    finding: FindingWithContext,
    patch: Partial<FindingState>,
  ) => void;
}

export function KanbanBoard({
  findings,
  showRepo,
  readOnly,
  onCardClick,
  onStateChange,
}: KanbanBoardProps) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Disposition | null>(null);

  if (findings.length === 0) {
    return (
      <div className="rounded-md border border-line bg-surface p-12 text-center text-ink-subtle">
        No findings match the current filters
      </div>
    );
  }

  const handleDragStart =
    (finding: FindingWithContext) =>
    (event: React.DragEvent<HTMLDivElement>) => {
      setDraggingKey(findingKey(finding));
      event.dataTransfer.setData("text/plain", findingKey(finding));
      event.dataTransfer.effectAllowed = "move";
    };

  const handleDragOver =
    (disposition: Disposition) => (event: React.DragEvent<HTMLDivElement>) => {
      if (readOnly) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTarget(disposition);
    };

  const handleDrop =
    (disposition: Disposition) => (event: React.DragEvent<HTMLDivElement>) => {
      if (readOnly) return;
      event.preventDefault();
      const key = event.dataTransfer.getData("text/plain");
      const finding = findings.find((f) => findingKey(f) === key);
      if (finding && finding.disposition !== disposition) {
        onStateChange(finding, { disposition });
      }
      setDraggingKey(null);
      setDropTarget(null);
    };

  const handleDragEnd = () => {
    setDraggingKey(null);
    setDropTarget(null);
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
      {DISPOSITION_ORDER.map((disposition: Disposition) => {
        const column = findings.filter((f) => f.disposition === disposition);
        const isDropTarget = !readOnly && dropTarget === disposition;

        return (
          <div
            key={disposition}
            className={`flex min-w-0 flex-col rounded-md border transition-colors ${
              isDropTarget
                ? "border-[#388bfd]/60 bg-[#388bfd]/5 ring-1 ring-[#388bfd]/30"
                : "border-line bg-surface"
            }`}
            onDragOver={handleDragOver(disposition)}
            onDragLeave={() => setDropTarget(null)}
            onDrop={handleDrop(disposition)}
          >
            {/* Column header — GitHub Projects style */}
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <span
                className={`h-2 w-2 rounded-full ${DISPOSITION_ACCENT[disposition]}`}
                aria-hidden
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                {DISPOSITION_LABEL[disposition]}
              </span>
              <span className="ml-auto rounded-full bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-ink-faint">
                {column.length}
              </span>
            </div>

            <div className="flex min-h-20 flex-col gap-1.5 p-1.5">
              {column.length === 0 ? (
                <p className="px-2 py-3 text-xs text-ink-faint">
                  {readOnly ? DISPOSITION_HINT[disposition] : "Drop here"}
                </p>
              ) : (
                column.map((finding) => {
                  const key = findingKey(finding);
                  return (
                    <FindingCard
                      key={key}
                      finding={finding}
                      showRepo={showRepo}
                      draggable={!readOnly}
                      dragging={draggingKey === key}
                      onClick={onCardClick}
                      onDragStart={handleDragStart(finding)}
                      onDragEnd={handleDragEnd}
                    />
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
