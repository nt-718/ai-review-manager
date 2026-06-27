import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  DISPOSITION_LABEL,
  DISPOSITION_ORDER,
  SEVERITY_LABEL,
  SEVERITY_ORDER,
} from "../types/review";
import type { FindingWithContext } from "../lib/reviews";
import { CATEGORY_STYLE, DISPOSITION_ACCENT, SEVERITY_STYLE, basename } from "../lib/style";

interface InsightsViewProps {
  findings: FindingWithContext[];
}

function isActive(f: FindingWithContext) {
  return f.disposition !== "done" && f.disposition !== "wontfix";
}

interface BarRowProps {
  label: string;
  count: number;
  total: number;
  barClass: string;
  extra?: React.ReactNode;
}

function BarRow({ label, count, total, barClass, extra }: BarRowProps) {
  const pct = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-36 shrink-0 text-right text-xs text-ink-subtle">{label}</div>
      <div className="flex-1 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full transition-all ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-semibold text-ink">{count}</span>
      {extra && <div className="w-10 shrink-0">{extra}</div>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface overflow-hidden">
      <div className="border-b border-line bg-surface-2 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-line bg-surface px-4 py-3">
      <span className="text-xs text-ink-subtle">{label}</span>
      <span className={`text-2xl font-bold ${color ?? "text-ink"}`}>{value}</span>
      {sub && <span className="text-xs text-ink-faint">{sub}</span>}
    </div>
  );
}

export function InsightsView({ findings }: InsightsViewProps) {
  const total = findings.length;
  const open = findings.filter(isActive).length;
  const closed = total - open;
  const resolutionRate = total === 0 ? 0 : Math.round((closed / total) * 100);

  const critical = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  const reviewCount = new Set(findings.map((f) => f.reviewId)).size;
  const avgPerReview = reviewCount > 0 ? Math.round(total / reviewCount) : 0;

  // Top files by finding count
  const fileMap = new Map<string, number>();
  for (const f of findings) {
    fileMap.set(f.file, (fileMap.get(f.file) ?? 0) + 1);
  }
  const topFiles = [...fileMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Tool breakdown
  const toolMap = new Map<string, number>();
  for (const f of findings) {
    toolMap.set(f.tool, (toolMap.get(f.tool) ?? 0) + 1);
  }
  const tools = [...toolMap.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total findings"
          value={total}
          sub={`${avgPerReview} avg per review`}
        />
        <StatCard
          label="Open"
          value={open}
          sub={`${closed} resolved`}
          color="text-success-fg"
        />
        <StatCard
          label="Resolution rate"
          value={`${resolutionRate}%`}
          sub="done + won't fix"
          color={resolutionRate >= 50 ? "text-success-fg" : "text-attention-fg"}
        />
        <StatCard
          label="Reviews"
          value={reviewCount}
          sub={`${critical > 0 ? `${critical} critical` : high > 0 ? `${high} high` : "no critical/high"}`}
          color={critical > 0 ? "text-danger-fg" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Severity breakdown */}
        <SectionCard title="By severity">
          <div>
            {SEVERITY_ORDER.map((s) => {
              const count = findings.filter((f) => f.severity === s).length;
              return (
                <BarRow
                  key={s}
                  label={SEVERITY_LABEL[s]}
                  count={count}
                  total={total}
                  barClass={SEVERITY_STYLE[s].stripe}
                />
              );
            })}
          </div>
        </SectionCard>

        {/* Category breakdown */}
        <SectionCard title="By category">
          <div>
            {CATEGORY_ORDER.map((c) => {
              const count = findings.filter((f) => f.category === c).length;
              if (count === 0) return null;
              return (
                <BarRow
                  key={c}
                  label={CATEGORY_LABEL[c]}
                  count={count}
                  total={total}
                  barClass={CATEGORY_STYLE[c].dot}
                />
              );
            })}
          </div>
        </SectionCard>

        {/* Disposition breakdown */}
        <SectionCard title="By column">
          <div>
            {DISPOSITION_ORDER.map((d) => {
              const count = findings.filter((f) => f.disposition === d).length;
              return (
                <BarRow
                  key={d}
                  label={DISPOSITION_LABEL[d]}
                  count={count}
                  total={total}
                  barClass={DISPOSITION_ACCENT[d]}
                />
              );
            })}
          </div>
        </SectionCard>

        {/* Resolution progress */}
        <SectionCard title="Resolution progress">
          <div className="flex flex-col gap-4">
            {/* Big progress bar */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-ink-subtle">
                <span>{open} open</span>
                <span>{closed} closed</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-success-fg transition-all"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-xs text-ink-subtle">
                {resolutionRate}% resolved
              </p>
            </div>

            {/* Breakdown of closed */}
            {closed > 0 && (
              <div className="flex flex-col gap-1 border-t border-line pt-3">
                <p className="mb-1 text-xs font-medium text-ink-subtle">Closed breakdown</p>
                {(["done", "wontfix"] as const).map((d) => {
                  const count = findings.filter((f) => f.disposition === d).length;
                  if (count === 0) return null;
                  return (
                    <BarRow
                      key={d}
                      label={DISPOSITION_LABEL[d]}
                      count={count}
                      total={closed}
                      barClass={DISPOSITION_ACCENT[d]}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Top files */}
        {topFiles.length > 0 && (
          <SectionCard title="Top files by finding count">
            <div>
              {topFiles.map(([file, count]) => (
                <BarRow
                  key={file}
                  label={basename(file)}
                  count={count}
                  total={topFiles[0][1]}
                  barClass="bg-accent-fg"
                />
              ))}
            </div>
          </SectionCard>
        )}

        {/* Tool breakdown (only when multiple tools) */}
        {tools.length > 1 && (
          <SectionCard title="By tool">
            <div>
              {tools.map(([tool, count]) => (
                <BarRow
                  key={tool}
                  label={tool}
                  count={count}
                  total={total}
                  barClass="bg-done"
                />
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
