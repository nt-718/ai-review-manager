import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import {
  PACKAGE_ROOT,
  getGlobalClaudeSkillsDir,
  getGlobalSourcesConfig,
  getProjectRoot,
} from "./paths.mjs";

const COPY_TARGETS = [
  ".claude/skills",
  ".cursor/skills",
  "schema",
];

async function copyTarget(relPath, projectRoot) {
  const src = join(PACKAGE_ROOT, relPath);
  const dest = join(projectRoot, relPath);
  if (!existsSync(src)) return;
  await cp(src, dest, {
    recursive: true,
    force: false,
    errorOnExist: false,
  });
}

async function installGlobalClaudeSkills() {
  const src = join(PACKAGE_ROOT, ".claude", "skills");
  const dest = getGlobalClaudeSkillsDir();
  if (!existsSync(src)) return false;
  await mkdir(dest, { recursive: true });
  await cp(src, dest, { recursive: true, force: true });
  return true;
}

async function registerInGlobalConfig(projectRoot) {
  const configPath = getGlobalSourcesConfig();
  await mkdir(dirname(configPath), { recursive: true });

  let config = { sources: [] };
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(await readFile(configPath, "utf8"));
    } catch {
      config = { sources: [] };
    }
  }

  const sources = Array.isArray(config.sources) ? config.sources : [];
  const added = !sources.some((p) => resolve(p) === projectRoot);
  if (added) sources.push(projectRoot);
  config.sources = sources;

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return { configPath, sources, added };
}

export async function runInit() {
  const projectRoot = getProjectRoot();
  const out = process.stdout.write.bind(process.stdout);

  out("ReviewOps — init\n\n");

  if (projectRoot === PACKAGE_ROOT) {
    out("  Already inside the ReviewOps package; nothing to copy.\n\n");
    return;
  }

  await mkdir(join(projectRoot, ".ai-review"), { recursive: true });

  for (const relPath of COPY_TARGETS) {
    await copyTarget(relPath, projectRoot);
    out(`  ✓  ${relPath}\n`);
  }

  await installGlobalClaudeSkills();
  out(`  ✓  ~/.claude/skills  (global — available in all projects)\n`);

  const { configPath, sources, added } = await registerInGlobalConfig(
    projectRoot,
  );
  out(
    added
      ? `  ✓  registered on the global board\n`
      : `  •  already on the global board\n`,
  );

  out(`\n  Project      : ${relative(process.cwd(), projectRoot) || "."}\n`);
  out(`  Global config: ${configPath}\n`);
  out(`  Repositories : ${sources.length}\n\n`);
  out("  Next:\n");
  out("    1. Ask your AI editor for a review (writes .ai-review/<id>.json)\n");
  out("    2. reviewops serve --open   (from anywhere — shows all repos)\n\n");
}
