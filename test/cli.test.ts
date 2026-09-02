import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { run, createStaticHandler } from "../src/cli.js";
import type { IncomingMessage, ServerResponse } from "node:http";

let root: string;
let docsDir: string;
let outDir: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "docatlas-cli-"));
  docsDir = join(root, "docs");
  outDir = join(root, "site");
  mkdirSync(docsDir, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function withCapturedConsole<T>(fn: () => T): { result: T; logs: string[]; errors: string[] } {
  const logs: string[] = [];
  const errors: string[] = [];
  const logSpy = vi.spyOn(console, "log").mockImplementation((msg: unknown) => {
    logs.push(String(msg));
  });
  const errSpy = vi.spyOn(console, "error").mockImplementation((msg: unknown) => {
    errors.push(String(msg));
  });
  try {
    const result = fn();
    return { result, logs, errors };
  } finally {
    logSpy.mockRestore();
    errSpy.mockRestore();
  }
}

describe("cli run()", () => {
  it("prints usage and exits 1 when given no command", () => {
    const { result, logs } = withCapturedConsole(() => run([]));
    expect(result).toBe(1);
    expect(logs.join("\n")).toContain("Usage:");
  });

  it("prints usage and exits 0 for --help", () => {
    const { result, logs } = withCapturedConsole(() => run(["--help"]));
    expect(result).toBe(0);
    expect(logs.join("\n")).toContain("Usage:");
  });

  it("prints the package version for --version", () => {
    const { result, logs } = withCapturedConsole(() => run(["--version"]));
    expect(result).toBe(0);
    expect(logs[0]).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("fails build without a docsDir argument", () => {
    const { result, errors } = withCapturedConsole(() => run(["build"]));
    expect(result).toBe(1);
    expect(errors[0]).toContain("requires <docsDir>");
  });

  it("builds a valid docs tree and exits 0", () => {
    writeFileSync(join(docsDir, "index.md"), "# Home\n\nHello.\n");
    const { result, logs } = withCapturedConsole(() =>
      run(["build", docsDir, "--out", outDir, "--title", "My Docs"]),
    );
    expect(result).toBe(0);
    expect(logs.join("\n")).toContain("built 1 page(s)");
  });

  it("exits 1 and reports a dead link on build", () => {
    writeFileSync(join(docsDir, "index.md"), "# Home\n\n[dead](./nope.md)\n");
    const { result, errors } = withCapturedConsole(() => run(["build", docsDir, "--out", outDir]));
    expect(result).toBe(1);
    expect(errors.some((e) => e.includes("link error"))).toBe(true);
  });

  it("--allow-broken-links downgrades link errors to warnings without failing", () => {
    writeFileSync(join(docsDir, "index.md"), "# Home\n\n[dead](./nope.md)\n");
    const { result } = withCapturedConsole(() =>
      run(["build", docsDir, "--out", outDir, "--allow-broken-links"]),
    );
    expect(result).toBe(0);
  });

  it("check passes for a valid docs tree without writing a persistent output directory", () => {
    writeFileSync(join(docsDir, "index.md"), "# Home\n\nfine.\n");
    const { result, logs } = withCapturedConsole(() => run(["check", docsDir]));
    expect(result).toBe(0);
    expect(logs.join("\n")).toContain("check passed");
  });

  it("check fails for a docs tree with a broken link", () => {
    writeFileSync(join(docsDir, "index.md"), "# Home\n\n[dead](./nope.md)\n");
    const { result, errors } = withCapturedConsole(() => run(["check", docsDir]));
    expect(result).toBe(1);
    expect(errors.some((e) => e.includes("link error"))).toBe(true);
  });

  it("fails check without a docsDir argument", () => {
    const { result } = withCapturedConsole(() => run(["check"]));
    expect(result).toBe(1);
  });

  it("search reports 'no results' for a query with no matches", () => {
    writeFileSync(join(docsDir, "index.md"), "# Home\n\nAbout widgets.\n");
    withCapturedConsole(() => run(["build", docsDir, "--out", outDir]));
    const { result, logs } = withCapturedConsole(() =>
      run(["search", join(outDir, "assets", "search-index.json"), "xylophone"]),
    );
    expect(result).toBe(0);
    expect(logs).toContain("no results");
  });

  it("search returns ranked hits for a matching query", () => {
    writeFileSync(join(docsDir, "index.md"), "# Home\n\nAll about widgets and gadgets.\n");
    withCapturedConsole(() => run(["build", docsDir, "--out", outDir]));
    const { result, logs } = withCapturedConsole(() =>
      run(["search", join(outDir, "assets", "search-index.json"), "widget"]),
    );
    expect(result).toBe(0);
    expect(logs.some((l) => l.includes("index.html"))).toBe(true);
  });

  it("fails search without both an index path and a query", () => {
    const { result } = withCapturedConsole(() => run(["search", "index.json"]));
    expect(result).toBe(1);
  });

  it("serve fails when the output directory does not exist", () => {
    const { result, errors } = withCapturedConsole(() => run(["serve", join(root, "nope")]));
    expect(result).toBe(1);
    expect(errors[0]).toContain("does not exist");
  });

  it("reports an error and usage for an unknown command", () => {
    const { result, errors } = withCapturedConsole(() => run(["frobnicate"]));
    expect(result).toBe(1);
    expect(errors[0]).toContain('unknown command "frobnicate"');
  });
});

describe("createStaticHandler", () => {
  function fakeReqRes(url: string): {
    req: IncomingMessage;
    res: ServerResponse;
    done: Promise<{ status: number; body: string }>;
  } {
    let resolveDone!: (v: { status: number; body: string }) => void;
    const done = new Promise<{ status: number; body: string }>((resolve) => {
      resolveDone = resolve;
    });
    const chunks: Buffer[] = [];
    let status = 0;
    const res = {
      writeHead: (code: number) => {
        status = code;
        return res;
      },
      end: (data?: Buffer | string) => {
        if (data) chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
        resolveDone({ status, body: Buffer.concat(chunks).toString("utf8") });
      },
    } as unknown as ServerResponse;
    const req = { url } as IncomingMessage;
    return { req, res, done };
  }

  it("serves index.html for the root path", async () => {
    writeFileSync(join(docsDir, "index.md"), "# Home\n\nWelcome.\n");
    withCapturedConsole(() => run(["build", docsDir, "--out", outDir]));
    const handler = createStaticHandler(outDir);
    const { req, res, done } = fakeReqRes("/");
    handler(req, res);
    const { status, body } = await done;
    expect(status).toBe(200);
    expect(body).toContain("Welcome");
  });

  it("serves a nested asset file", async () => {
    writeFileSync(join(docsDir, "index.md"), "# Home\n");
    withCapturedConsole(() => run(["build", docsDir, "--out", outDir]));
    const handler = createStaticHandler(outDir);
    const { req, res, done } = fakeReqRes("/assets/style.css");
    handler(req, res);
    const { status } = await done;
    expect(status).toBe(200);
  });

  it("returns 404 for a path that does not exist", async () => {
    writeFileSync(join(docsDir, "index.md"), "# Home\n");
    withCapturedConsole(() => run(["build", docsDir, "--out", outDir]));
    const handler = createStaticHandler(outDir);
    const { req, res, done } = fakeReqRes("/nope.html");
    handler(req, res);
    const { status } = await done;
    expect(status).toBe(404);
  });

  it("returns 403 for a path-traversal attempt outside the served root", async () => {
    writeFileSync(join(docsDir, "index.md"), "# Home\n");
    withCapturedConsole(() => run(["build", docsDir, "--out", outDir]));
    const handler = createStaticHandler(outDir);
    const { req, res, done } = fakeReqRes("/../../../../etc/passwd");
    handler(req, res);
    const { status } = await done;
    expect(status).toBe(403);
  });
});
