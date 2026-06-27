import { CATEGORY_LABEL, type Category } from "../types/review";
import { CATEGORY_STYLE } from "../lib/style";

interface CategoryBadgeProps {
  category: Category;
  className?: string;
}

export function CategoryBadge({ category, className = "" }: CategoryBadgeProps) {
  const style = CATEGORY_STYLE[category];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${style.badge} ${className}`}
    >
      {CATEGORY_LABEL[category]}
    </span>
  );
}
