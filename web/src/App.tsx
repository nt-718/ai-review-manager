import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadFindings,
  updateState,
  appendThreadMessage,
  findingKey,
  type FindingState,
  type FindingWithContext,
} from "./lib/reviews";
import { type Filters } from "./components/FilterBar";
import { PerspectiveSummary } from "./components/PerspectiveSummary";
import { KanbanBoard } from "./components/KanbanBoard";
import { FilesView } from "./components/FilesView";
import { HistoryView } from "./components/HistoryView";
import { InsightsView } from "./components/InsightsView";
import { DetailPanel } from "./components/DetailPanel";
import { RepoPickerPage } from "./components/RepoPickerPage";
import { BranchSidebar } from "./components/BranchSidebar";
import { FilterSidebar } from "./components/FilterSidebar";
import { useTheme } from "./lib/theme";

const INITIAL_FILTERS: Filters = {
  severity: "all",
  category: "all",
  tool: "all",
};

type Tab = "board" | "files" | "history" | "insights";

interface TabDef {
  id: Tab;
  label: string;
  icon: React.ReactNode;
}

function ReviewOpsLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#0d1117"/>
      <g stroke="#388bfd" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.5 9.5L7 16L12.5 22.5"/>
        <path d="M19.5 9.5L25 16L19.5 22.5"/>
        <path d="M13.6 16.4L15.4 18.2L18.7 13.6"/>
      </g>
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25ZM6.5 6.5v8h7.75a.25.25 0 0 0 .25-.25V6.5Zm8-1.5V1.75a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25V5Zm-13 1.5v8.25c0 .138.112.25.25.25H5v-8.5Z" />
    </svg>
  );
}

function FilesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M.75 3a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5ZM.75 7.5a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5ZM.75 12a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5Z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="m.427 1.927 1.215 1.215a8.002 8.002 0 1 1-1.6 5.685.75.75 0 1 1 1.493-.154 6.5 6.5 0 1 0 1.18-4.458l1.358 1.358A.25.25 0 0 1 3.896 6H.25A.25.25 0 0 1 0 5.75V2.104a.25.25 0 0 1 .427-.177ZM7.75 4a.75.75 0 0 1 .75.75v2.992l2.028.812a.75.75 0 0 1-.557 1.392l-2.5-1A.751.751 0 0 1 7 8.25v-3.5A.75.75 0 0 1 7.75 4Z" />
    </svg>
  );
}

function InsightsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L9 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm5.657-8.157a.75.75 0 0 1 0 1.061l-1.061 1.06a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.06-1.06a.75.75 0 0 1 1.06 0Zm-9.193 9.193a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0ZM3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8Zm13 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8ZM8 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13ZM2.343 2.343a.75.75 0 0 1 1.061 0l1.06 1.061a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-1.06-1.06a.75.75 0 0 1 0-1.06Zm9.193 9.193a.75.75 0 0 1 1.061 0l1.06 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061Z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.499 5.499 0 1 0 7.678-7.678Z" />
    </svg>
  );
}

const TABS: TabDef[] = [
  { id: "board", label: "Board", icon: <BoardIcon /> },
  { id: "files", label: "Files", icon: <FilesIcon /> },
  { id: "history", label: "History", icon: <HistoryIcon /> },
  { id: "insights", label: "Insights", icon: <InsightsIcon /> },
];

function repoFromHash(): string | null {
  const hash = window.location.hash.slice(1);
  return hash ? decodeURIComponent(hash) : null;
}

function App() {
  const [findings, setFindings] = useState<FindingWithContext[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [selected, setSelected] = useState<FindingWithContext | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("board");
  const [selectedRepo, setSelectedRepo] = useState<string | null>(() => repoFromHash());
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();

  const reload = useCallback(() => {
    setLoading(true);
    loadFindings()
      .then((result) => {
        setFindings(result.findings);
        setReadOnly(result.readOnly);
        setError(null);
        if (result.notice) setNotice(result.notice);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load findings"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Sync selectedRepo ↔ URL hash on browser back/forward
  useEffect(() => {
    const onHashChange = () => {
      setSelectedRepo(repoFromHash());
      setFilters(INITIAL_FILTERS);
      setSelected(null);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const allDeduped = useMemo(() => {
    const byKey = new Map<string, FindingWithContext>();
    for (const finding of findings) {
      const key = findingKey(finding);
      const existing = byKey.get(key);
      if (!existing || finding.createdAt > existing.createdAt) {
        byKey.set(key, finding);
      }
    }
    return [...byKey.values()];
  }, [findings]);

  const repos = useMemo(
    () => [...new Set(allDeduped.map((f) => f.repo))].sort(),
    [allDeduped],
  );

  // Validate hash repo against loaded data (clear stale hash)
  useEffect(() => {
    if (loading) return;
    if (selectedRepo !== null && repos.length > 0 && !repos.includes(selectedRepo)) {
      window.location.hash = "";
      setSelectedRepo(null);
    }
  }, [loading, repos, selectedRepo]);

  const deduped = useMemo(
    () => (selectedRepo ? allDeduped.filter((f) => f.repo === selectedRepo) : allDeduped),
    [allDeduped, selectedRepo],
  );

  const branches = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of deduped) {
      const b = f.branch ?? "(untagged)";
      map.set(b, (map.get(b) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [deduped]);

  const filtered = useMemo(
    () =>
      deduped.filter((f) => {
        if (selectedBranch !== null) {
          const b = f.branch ?? "(untagged)";
          if (b !== selectedBranch) return false;
        }
        if (filters.severity !== "all" && f.severity !== filters.severity) return false;
        if (filters.category !== "all" && f.category !== filters.category) return false;
        if (filters.tool !== "all" && f.tool !== filters.tool) return false;
        return true;
      }),
    [deduped, filters, selectedBranch],
  );

  const handleSelectRepo = useCallback((repo: string) => {
    window.location.hash = encodeURIComponent(repo);
    setSelectedRepo(repo);
    setFilters(INITIAL_FILTERS);
    setSelected(null);
    setActiveTab("board");
    setSelectedBranch(null);
  }, []);

  const handleBackToRepos = useCallback(() => {
    window.location.hash = "";
    setSelectedRepo(null);
    setFilters(INITIAL_FILTERS);
    setSelected(null);
    setSelectedBranch(null);
  }, []);

  const handleStateChange = useCallback(
    async (finding: FindingWithContext, patch: Partial<FindingState>) => {
      const next: FindingState = {
        disposition: patch.disposition ?? finding.disposition,
        instruction: patch.instruction ?? finding.instruction,
        note: patch.note ?? finding.note,
        thread: patch.thread ?? finding.thread,
      };
      const key = findingKey(finding);
      setFindings((prev) =>
        prev.map((f) => (findingKey(f) === key ? { ...f, ...next } : f)),
      );
      setSelected((prev) =>
        prev && findingKey(prev) === key ? { ...prev, ...next } : prev,
      );
      try {
        await updateState(finding, next);
        setNotice(null);
      } catch (e) {
        setNotice(
          e instanceof Error ? e.message : "Failed to save state. Reloading…",
        );
        reload();
      }
    },
    [reload],
  );

  const handleThreadMessage = useCallback(
    async (finding: FindingWithContext, text: string) => {
      const key = findingKey(finding);
      const thread = await appendThreadMessage(finding, text);
      setFindings((prev) =>
        prev.map((f) => (findingKey(f) === key ? { ...f, thread } : f)),
      );
      setSelected((prev) =>
        prev && findingKey(prev) === key ? { ...prev, thread } : prev,
      );
      setNotice(null);
    },
    [],
  );

  // Counts for tab badges
  const tabCounts: Partial<Record<Tab, number>> = useMemo(() => ({
    board: filtered.length,
    files: new Set(filtered.map((f) => f.file)).size,
    history: new Set(deduped.map((f) => f.reviewId)).size,
  }), [filtered, deduped]);

  // Repo breadcrumb parts
  const repoParts = useMemo(() => {
    if (!selectedRepo) return null;
    const slash = selectedRepo.indexOf("/");
    if (slash < 0) return { owner: null, name: selectedRepo };
    return { owner: selectedRepo.slice(0, slash), name: selectedRepo.slice(slash + 1) };
  }, [selectedRepo]);

  const showRepoList = !loading && !error && selectedRepo === null;
  const showBoard = !loading && !error && selectedRepo !== null;

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* GitHub-style top nav bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        {/* Top: breadcrumb */}
        <div className="flex h-12 items-center gap-3 px-4">
          <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
            {repoParts ? (
              <>
                <button
                  type="button"
                  onClick={handleBackToRepos}
                  className="flex items-center gap-1.5 font-medium text-ink-subtle hover:text-accent-fg cursor-pointer"
                >
                  <ReviewOpsLogo />
                  ReviewOps
                </button>
                <span className="px-0.5 text-ink-faint">/</span>
                {repoParts.owner && (
                  <>
                    <span className="font-medium text-ink-subtle">{repoParts.owner}</span>
                    <span className="px-0.5 text-ink-faint">/</span>
                  </>
                )}
                <span className="font-semibold text-accent-fg">{repoParts.name}</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <ReviewOpsLogo />
                ReviewOps
              </span>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {readOnly && (
              <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-subtle">
                Read-only
              </span>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md p-1.5 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink cursor-pointer"
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>

        {/* Tab nav — only when a repo is selected */}
        {selectedRepo !== null && (
          <div className="px-4 flex items-end justify-between">
            <nav className="flex items-end gap-0 -mb-px overflow-x-auto" aria-label="Views">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                const count = tabCounts[tab.id];
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-1.5 px-3 pb-2.5 pt-2 text-sm transition-colors ${
                      active
                        ? "border-b-2 border-coral font-semibold text-ink"
                        : "font-medium text-ink-subtle hover:text-ink"
                    }`}
                  >
                    <span className={active ? "text-ink-subtle" : "text-ink-faint"}>
                      {tab.icon}
                    </span>
                    {tab.label}
                    {!loading && count != null && (
                      <span
                        className={`ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                          active
                            ? "bg-surface-2 text-ink-subtle"
                            : "bg-surface-2 text-ink-faint"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

          </div>
        )}
      </header>

      {/* Loading / Error */}
      {loading && (
        <div className="px-4 py-4">
          <div className="rounded-md border border-line bg-surface p-12 text-center text-ink-subtle">
            Loading…
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-4">
          <div className="rounded-md border border-danger/40 bg-danger/10 p-6 text-center text-danger-fg">
            {error}
          </div>
        </div>
      )}

      {/* Repo picker — shown when no repo is selected */}
      {showRepoList && (
        <RepoPickerPage findings={allDeduped} onSelect={handleSelectRepo} />
      )}

      {/* Board — shown when a repo is selected */}
      {showBoard && (
        <main className="flex gap-4 px-4 py-4">
          <BranchSidebar
            branches={branches}
            selected={selectedBranch}
            onSelect={setSelectedBranch}
          />

          <div className="min-w-0 flex-1 flex flex-col gap-4">
            {notice && (
              <div className="rounded-md border border-attention/40 bg-attention/10 px-4 py-2.5 text-sm text-attention-emphasis">
                {notice}
              </div>
            )}

            {/* Summary bar */}
            <section className="rounded-md border border-line bg-surface px-4 py-3">
              <PerspectiveSummary findings={filtered} />
            </section>

            {activeTab === "board" && (
              <KanbanBoard
                findings={filtered}
                showRepo={false}
                readOnly={readOnly}
                onCardClick={setSelected}
                onStateChange={handleStateChange}
              />
            )}

            {activeTab === "files" && (
              <FilesView
                findings={filtered}
                onFindingClick={(f) => {
                  setSelected(f);
                  setActiveTab("board");
                }}
              />
            )}

            {activeTab === "history" && <HistoryView findings={filtered} />}

            {activeTab === "insights" && <InsightsView findings={deduped} />}
          </div>

          <FilterSidebar
            deduped={deduped}
            filters={filters}
            onChange={setFilters}
          />
        </main>
      )}

      <DetailPanel
        finding={selected}
        readOnly={readOnly}
        onClose={() => setSelected(null)}
        onStateChange={handleStateChange}
        onThreadMessage={handleThreadMessage}
      />
    </div>
  );
}

export default App;
