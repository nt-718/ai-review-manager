interface BulbIconProps {
  className?: string;
  size?: "sm" | "md";
}

const SIZE_CLASS = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
} as const;

export function BulbIcon({ className = "", size = "sm" }: BulbIconProps) {
  return (
    <svg
      className={`${SIZE_CLASS[size]} shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z" />
    </svg>
  );
}
