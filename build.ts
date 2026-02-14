export {};

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  naming: "canvasui.js",
  format: "esm",
  target: "browser",
  minify: false,
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("✓ Built dist/canvasui.js");
