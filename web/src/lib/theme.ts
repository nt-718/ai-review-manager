import { useCallback, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "reviewops-theme";

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function resolveInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      root.classList.remove("theme-switching");
    });
  });
}

function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* localStorage unavailable — fall back to in-memory state only */
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const current = document.documentElement.dataset.theme;
    return isTheme(current) ? current : resolveInitialTheme();
  });

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      storeTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
