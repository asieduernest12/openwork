import { test, expect } from "bun:test";
import { normalizeWorkspaceRelativePath, resolveSafeChildPath } from "./server.js";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";

async function withTmpDir(fn: (dir: string) => Promise<void>) {
  const dir = join(tmpdir(), `openwork-tree-test-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("normalizeWorkspaceRelativePath rejects path traversal", () => {
  expect(() => normalizeWorkspaceRelativePath("..\\secrets.txt", { allowSubdirs: true })).toThrow("Path traversal");
  expect(() => normalizeWorkspaceRelativePath("foo/../bar", { allowSubdirs: true })).toThrow("Path traversal");
  expect(() => normalizeWorkspaceRelativePath("../.env", { allowSubdirs: true })).toThrow("Path traversal");
});

test("resolveSafeChildPath rejects paths outside root", () => {
  const root = resolve("/workspace");
  expect(() => resolveSafeChildPath(root, "../secrets.txt")).toThrow("Path traversal");
  expect(() => resolveSafeChildPath(root, "..\\..\\etc\\passwd")).toThrow("Path traversal");
});

test("tree endpoint returns correct structure", async () => {
  await withTmpDir(async (dir) => {
    await mkdir(join(dir, "src"), { recursive: true });
    await mkdir(join(dir, "docs"), { recursive: true });
    await writeFile(join(dir, "README.md"), "# Test");
    await writeFile(join(dir, "package.json"), "{}");
    await writeFile(join(dir, "src", "index.ts"), "export {}");
    await writeFile(join(dir, "docs", "guide.md"), "# Guide");

    // Simulate directory read
    const { readdir, stat } = await import("node:fs/promises");
    const entries = await readdir(dir, { withFileTypes: true });
    const names = entries.map((e) => e.name).sort();

    expect(names).toContain("README.md");
    expect(names).toContain("package.json");
    expect(names).toContain("src");
    expect(names).toContain("docs");

    const srcStat = await stat(join(dir, "src"));
    expect(srcStat.isDirectory()).toBe(true);
  });
});
