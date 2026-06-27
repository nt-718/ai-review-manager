interface BranchItem {
  name: string;
  count: number;
}

interface BranchSidebarProps {
  branches: BranchItem[];
  selected: string | null;
  onSelect: (branch: string | null) => void;
}

function BranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
    </svg>
  );
}

interface NavItemProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  mono?: boolean;
}

function NavItem({ label, count, active, onClick, mono }: NavItemProps) {
  return (
    <li className="relative">
      {active && (
        <span
          className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-[#f78166]"
          aria-hidden
        />
      )}
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center justify-between gap-2 rounded-md py-1.5 pl-4 pr-3 text-sm transition-colors ${
          active
            ? "font-semibold text-ink"
            : "text-ink-subtle hover:bg-surface-3 hover:text-ink"
        }`}
      >
        <span className={`truncate ${mono ? "font-mono text-xs" : ""}`}>{label}</span>
        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums ${
            active
              ? "bg-surface-3 text-ink"
              : "bg-surface-2 text-ink-faint"
          }`}
        >
          {count}
        </span>
      </button>
    </li>
  );
}

export function BranchSidebar({ branches, selected, onSelect }: BranchSidebarProps) {
  const total = branches.reduce((sum, b) => sum + b.count, 0);

  return (
    <aside className="w-52 shrink-0">
      <div className="sticky top-4 overflow-hidden rounded-md border border-line bg-surface">
        {/* Panel header */}
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
          <span className="text-ink-subtle">
            <BranchIcon />
          </span>
          <span className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">
            Branches
          </span>
        </div>

        {/* Nav items */}
        <nav className="p-2">
          <ul className="flex flex-col gap-0.5">
            <NavItem
              label="All branches"
              count={total}
              active={selected === null}
              onClick={() => onSelect(null)}
            />
            {branches.map((b) => (
              <NavItem
                key={b.name}
                label={b.name}
                count={b.count}
                active={selected === b.name}
                onClick={() => onSelect(b.name)}
                mono
              />
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
