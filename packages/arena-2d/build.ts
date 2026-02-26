export {};

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  naming: "arena-2d.js",
  format: "esm",
  target: "browser",
  minify: true,
  sourcemap: "external",
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("✓ Built dist/arena-2d.js");
