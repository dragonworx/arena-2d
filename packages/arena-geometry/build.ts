const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  naming: "arena-geometry.js",
  format: "esm",
  target: "browser",
  minify: false,
  sourcemap: "external",
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

console.log("✓ Built dist/arena-geometry.js");
