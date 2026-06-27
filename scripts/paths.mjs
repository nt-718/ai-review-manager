import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const DIST_DIR = join(PACKAGE_ROOT, "web", "dist");
export const SCHEMA_DIR = join(PACKAGE_ROOT, "schema");
export const STATIC_REVIEWS_DIR = join(PACKAGE_ROOT, "web", "public", "reviews");

export const SOURCES_FILE = "review-sources.json";

export function getProjectRoot() {
  const override = process.env.REVIEWOPS_PROJECT_ROOT;
  return override ? resolve(override) : process.cwd();
}

export function getSourcesConfig() {
  return join(getProjectRoot(), SOURCES_FILE);
}

export function getGlobalConfigDir() {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg ? resolve(xdg) : join(homedir(), ".config");
  return join(base, "reviewops");
}

export function getGlobalSourcesConfig() {
  return join(getGlobalConfigDir(), SOURCES_FILE);
}
