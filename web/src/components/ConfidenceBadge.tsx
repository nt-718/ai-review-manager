import {
  CONFIDENCE_HINT,
  CONFIDENCE_LABEL,
  type Confidence,
} from "../types/review";
import { CONFIDENCE_STYLE } from "../lib/style";

interface ConfidenceBadgeProps {
  confidence: Confidence;
  className?: string;
}

export function ConfidenceBadge({ confidence, className = "" }: ConfidenceBadgeProps) {
  const style = CONFIDENCE_STYLE[confidence];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${style.badge} ${className}`}
      title={CONFIDENCE_HINT[confidence]}
    >
      {CONFIDENCE_LABEL[confidence]}
    </span>
  );
}
