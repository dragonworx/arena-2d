import { watch } from "node:fs";
import { extname, join } from "node:path";

const PORT = parseInt(process.env.PORT || "3000", 10);
const PROJECT_ROOT = join(import.meta.dir, "..");
const DEMO_DIR = import.meta.dir;
const SRC_DIR = join(PROJECT_ROOT, "src");

// --- MIME types ---
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

// --- WebSocket clients ---
// biome-ignore lint/suspicious/noExplicitAny: Bun ServerWebSocket generic type
const wsClients = new Set<any>();

// --- Builder ---
async function buildBundle() {
  try {
    const result = await Bun.build({
      entrypoints: [join(SRC_DIR, "index.ts")],
      outdir: join(PROJECT_ROOT, "dist"),
      naming: "arena-2d.js",
      format: "esm",
      target: "browser",
      minify: true,
      sourcemap: "external",
    });
    if (result.success) {
      return true;
    }
    console.error("  ✖ Build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
  } catch (err) {
    console.error("  ✖ Build error:", err);
  }
  return false;
}

// --- File watcher ---
function startWatcher(dir: string, label: string) {
  try {
    watch(dir, { recursive: true }, async (_event, filename) => {
      if (
        !filename ||
        filename.includes("node_modules") ||
        filename.includes("dist")
      )
        return;
      console.log(`[${label}] changed: ${filename}`);

      // Rebuild bundle
      if (await buildBundle()) {
        console.log("  ✓ Rebuilt dist/arena-2d.js");
      }

      // Notify all connected clients to reload
      for (const ws of wsClients) {
        try {
          ws.send("reload");
        } catch {
          wsClients.delete(ws);
        }
      }
    });
    console.log(`  Watching ${label}/`);
  } catch {
    console.warn(`  Could not watch ${label}/`);
  }
}

// --- Server ---
const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Upgrade WebSocket
    if (pathname === "/__livereload") {
      const upgraded = server.upgrade(req);
      // biome-ignore lint/suspicious/noExplicitAny: Bun websocket upgrade returns void
      if (upgraded) return undefined as any;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Default to index.html
    if (pathname === "/") pathname = "/index.html";

    // Serve the built bundle
    if (pathname === "/dist/arena-2d.js") {
      const file = Bun.file(join(PROJECT_ROOT, "dist", "arena-2d.js"));
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "application/javascript" },
        });
      }
      return new Response("Bundle not built yet. Run: bun run build", {
        status: 404,
      });
    }

    // Serve demo files
    const filePath = join(DEMO_DIR, pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      return new Response(file, {
        headers: { "Content-Type": contentType },
      });
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open(ws) {
      wsClients.add(ws);
    },
    close(ws) {
      wsClients.delete(ws);
    },
    message() {
      // No incoming messages expected
    },
  },
});

console.log("\n  Arena-2D Dev Server");
console.log("  ───────────────────");

// Initial build
process.stdout.write("  Building library... ");
if (await buildBundle()) {
  console.log("✓ dist/arena-2d.js");
} else {
  console.log("✖ Build failed. Check errors above.");
}

console.log(`  → http://localhost:${PORT}`);
console.log("");

startWatcher(SRC_DIR, "src");
startWatcher(DEMO_DIR, "demo");

console.log("");
console.log("  Ready. Waiting for changes...\n");
