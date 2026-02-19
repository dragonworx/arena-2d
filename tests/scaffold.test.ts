import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ROOT = join(import.meta.dir, "..");
const DIST_DIR = join(PROJECT_ROOT, "dist");
const BUNDLE_PATH = join(DIST_DIR, "arena-2d.js");

describe("Layer 0 — Project Scaffold", () => {
  beforeAll(async () => {
    // Clean dist/ and rebuild
    if (existsSync(DIST_DIR)) {
      rmSync(DIST_DIR, { recursive: true });
    }

    const result = await Bun.build({
      entrypoints: [join(PROJECT_ROOT, "src", "index.ts")],
      outdir: DIST_DIR,
      naming: "arena-2d.js",
      format: "esm",
      target: "browser",
      minify: false,
    });

    if (!result.success) {
      throw new Error(`Build failed: ${result.logs.map(String).join("\n")}`);
    }
  });

  test("bun build produces dist/arena-2d.js", () => {
    expect(existsSync(BUNDLE_PATH)).toBe(true);
  });

  test("bundle is valid ESM that can be imported", async () => {
    const mod = await import(BUNDLE_PATH);
    expect(mod).toBeDefined();
  });

  test("bundle exports VERSION constant", async () => {
    const mod = await import(BUNDLE_PATH);
    expect(mod.VERSION).toBe("0.0.1");
  });

  test("bundle is non-empty", async () => {
    const file = Bun.file(BUNDLE_PATH);
    const size = file.size;
    expect(size).toBeGreaterThan(0);
  });
});
