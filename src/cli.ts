#!/usr/bin/env node
import * as path from "node:path";
import * as os from "node:os";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { buildSite } from "./site/build.js";
import type { buildIndex } from "./search/index.js";
import { search } from "./search/bm25.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function parseFlags(argv: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          flags[arg.slice(2)] = next;
          i += 1;
        } else {
          flags[arg.slice(2)] = "true";
        }
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function readPackageVersion(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const pkgPath = path.join(here, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
  return pkg.version;
}

/**
 * Builds a plain static-file HTTP handler rooted at `outDir`, used by
 * `docatlas serve`. Exported (rather than only inlined into `createServer`)
 * so its routing and path-traversal guard can be exercised directly in
 * tests, without binding a real socket.
 */
export function createStaticHandler(
  outDir: string,
): (req: IncomingMessage, res: ServerResponse) => void {
  const root = path.resolve(outDir);
  return (req, res) => {
    const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
    let filePath = path.resolve(root, "." + (urlPath === "/" ? "/index.html" : urlPath));

    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { "content-type": MIME[ext] ?? "application/octet-stream" });
      res.end(data);
    });
  };
}

function printUsage(): void {
  console.log(`docatlas - a documentation site engine with cross-references that cannot go stale

Usage:
  docatlas build <docsDir> --source <sourceDir> --out <outDir> [--title <title>] [--allow-broken-links]
  docatlas check <docsDir> --source <sourceDir> [--title <title>]
  docatlas serve <outDir> [--port <port>]
  docatlas search <indexJsonPath> <query>
  docatlas --version
  docatlas --help
`);
}

export function run(argv: string[]): number {
  const { positional, flags } = parseFlags(argv);
  const command = positional[0];

  if (flags["version"] || command === "--version") {
    console.log(readPackageVersion());
    return 0;
  }

  if (!command || flags["help"] || command === "--help") {
    printUsage();
    return command || flags["help"] ? 0 : 1;
  }

  if (command === "build") {
    const docsDir = positional[1];
    if (!docsDir) {
      console.error("error: docatlas build requires <docsDir>");
      return 1;
    }
    const sourceDir = flags["source"] ?? ".";
    const outDir = flags["out"] ?? "site";
    const title = flags["title"] ?? "Documentation";
    const allowBrokenLinks = flags["allow-broken-links"] === "true";

    const result = buildSite({ docsDir, sourceDir, outDir, siteTitle: title });

    console.log(`built ${result.pages.length} page(s) -> ${result.outDir}`);

    let hasErrors = false;
    for (const err of result.snippetErrors) {
      hasErrors = true;
      console.error(`snippet error: ${err.page}:${err.line} [${err.file}] ${err.reason}`);
    }
    for (const err of result.linkErrors) {
      console.error(`link error: ${err.page}:${err.line} "${err.href}" - ${err.reason}`);
      if (!allowBrokenLinks) hasErrors = true;
    }

    if (hasErrors) {
      console.error(
        `docatlas build failed: ${result.snippetErrors.length} snippet error(s), ${result.linkErrors.length} link error(s)`,
      );
      return 1;
    }
    return 0;
  }

  if (command === "check") {
    const docsDir = positional[1];
    if (!docsDir) {
      console.error("error: docatlas check requires <docsDir>");
      return 1;
    }
    const sourceDir = flags["source"] ?? ".";
    const title = flags["title"] ?? "Documentation";

    const tmpOut = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "docatlas-check-"));
    try {
      const result = buildSite({ docsDir, sourceDir, outDir: tmpOut, siteTitle: title });
      for (const err of result.snippetErrors) {
        console.error(`snippet error: ${err.page}:${err.line} [${err.file}] ${err.reason}`);
      }
      for (const err of result.linkErrors) {
        console.error(`link error: ${err.page}:${err.line} "${err.href}" - ${err.reason}`);
      }
      const total = result.snippetErrors.length + result.linkErrors.length;
      if (total > 0) {
        console.error(`docatlas check failed: ${total} issue(s) across ${result.pages.length} page(s)`);
        return 1;
      }
      console.log(`docatlas check passed: ${result.pages.length} page(s), 0 issues`);
      return 0;
    } finally {
      fs.rmSync(tmpOut, { recursive: true, force: true });
    }
  }

  if (command === "serve") {
    const outDir = positional[1] ?? "site";
    const port = Number(flags["port"] ?? "4173");
    if (!fs.existsSync(outDir)) {
      console.error(`error: output directory "${outDir}" does not exist -- run "docatlas build" first`);
      return 1;
    }

    const server = createServer(createStaticHandler(outDir));
    server.listen(port, () => {
      console.log(`docatlas serve: http://localhost:${port}`);
    });
    return 0;
  }

  if (command === "search") {
    const indexPath = positional[1];
    const query = positional.slice(2).join(" ");
    if (!indexPath || !query) {
      console.error("error: docatlas search requires <indexJsonPath> <query>");
      return 1;
    }
    const index = JSON.parse(readFileSync(indexPath, "utf8")) as ReturnType<typeof buildIndex>;
    const results = search(index, query, Number(flags["top"] ?? "10"));
    if (results.length === 0) {
      console.log("no results");
      return 0;
    }
    for (const r of results) {
      console.log(`${r.score.toFixed(3)}  ${r.title}  (${r.url})`);
    }
    return 0;
  }

  console.error(`error: unknown command "${command}"`);
  printUsage();
  return 1;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  process.exitCode = run(process.argv.slice(2));
}
