import { fileURLToPath } from "node:url";
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handleApiRequest } from "../scripts/api.mjs";

process.env.REVIEWOPS_PROJECT_ROOT ??= fileURLToPath(new URL("..", import.meta.url));

function reviewApi(): PluginOption {
  return {
    name: "reviewops-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/")) {
          next();
          return;
        }
        handleApiRequest(req, res).then((handled) => {
          if (!handled) next();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), reviewApi()],
});
