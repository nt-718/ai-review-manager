#!/usr/bin/env node
import { startServer } from "./server.mjs";
import { runValidate } from "./validate.mjs";
import { runStatus } from "./status.mjs";
import { runCollect } from "./collect-reviews.mjs";
import { runInit } from "./init.mjs";
import { resolveSources } from "./api.mjs";

const HELP = `reviewops — ReviewOps

Usage:
  reviewops init                            Install skills + schema, register on the global board
  reviewops serve [--port <n>] [--open]   Start dashboard + API server
  reviewops status                          Show finding summary in terminal
  reviewops validate                        Validate review JSON files
  reviewops collect [<path>...]             Copy reviews for static hosting
  reviewops help                            Show this help

Options for serve:
  --port <n>   Port to listen on (default: 4517)
  --open       Open the dashboard in the default browser after starting

Examples:
  reviewops serve --open
  reviewops validate
  reviewops collect ../other-repo
`;

function parseArgs(argv) {
  const args = {
    command: argv[0] ?? "serve",
    port: 4517,
    open: false,
    extra: [],
  };

  let i = 1;
  while (i < argv.length) {
    if (argv[i] === "--port" && argv[i + 1]) {
      args.port = Number.parseInt(argv[i + 1], 10);
      i += 2;
    } else if (argv[i] === "--open") {
      args.open = true;
      i += 1;
    } else {
      args.extra.push(argv[i]);
      i += 1;
    }
  }

  return args;
}

const { command, port, open, extra } = parseArgs(process.argv.slice(2));

async function main() {
  switch (command) {
    case "init":
      await runInit();
      break;

    case "serve":
      startServer({ port, open });
      break;

    case "status":
      await runStatus();
      break;

    case "validate": {
      const sources = await resolveSources();
      process.stdout.write("ReviewOps — validate\n\n");
      await runValidate(sources);
      break;
    }

    case "collect":
      await runCollect(extra);
      break;

    case "help":
    case "--help":
    case "-h":
      process.stdout.write(HELP);
      break;

    default:
      process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
      process.exit(1);
  }
}

main().catch((e) => {
  process.stderr.write(`${e.message}\n`);
  process.exit(1);
});
