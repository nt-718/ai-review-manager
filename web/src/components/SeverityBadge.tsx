import { SEVERITY_HINT, SEVERITY_LABEL, type Severity } from "../types/review";
import { SEVERITY_STYLE } from "../lib/style";

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className = "" }: SeverityBadgeProps) {
  const style = SEVERITY_STYLE[severity];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${style.badge} ${className}`}
      title={SEVERITY_HINT[severity]}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
