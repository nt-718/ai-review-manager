import { createServer } from "node:http";
import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { handleApiRequest } from "./api.mjs";
import { DIST_DIR } from "./paths.mjs";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

async function serveStatic(req, res) {
  if (!existsSync(DIST_DIR)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(
      "Dashboard is not built. Run `npm run build` (or reinstall to trigger the prepare step).",
    );
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const requestedPath = normalize(decodeURIComponent(url.pathname)).replace(
    /^(\.\.[/\\])+/,
    "",
  );
  let filePath = join(DIST_DIR, requestedPath);

  if (!filePath.startsWith(DIST_DIR) || requestedPath === "/") {
    filePath = join(DIST_DIR, "index.html");
  }
  if (!existsSync(filePath)) {
    filePath = join(DIST_DIR, "index.html");
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream",
    });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

export function startServer({ port = 4517, open = false } = {}) {
  const server = createServer(async (req, res) => {
    if (await handleApiRequest(req, res)) return;
    await serveStatic(req, res);
  });

  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`ReviewOps → ${url}`);
    if (open) {
      const opener =
        process.platform === "darwin" ? "open"
        : process.platform === "win32" ? "start"
        : "xdg-open";
      exec(`${opener} ${url}`);
    }
  });

  return server;
}
