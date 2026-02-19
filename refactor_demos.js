import fs from "fs";
import path from "path";

const panelsDir = "./demo/panels";
const files = fs
  .readdirSync(panelsDir)
  .filter(
    (f) =>
      f.endsWith(".js") &&
      f !== "loader.js" &&
      f !== "layer1.js" &&
      f !== "layer1.1.js",
  );

files.forEach((file) => {
  const filePath = path.join(panelsDir, file);
  const content = fs.readFileSync(filePath, "utf8");

  // Pattern 1: import("../../dist/arena-2d.js").then(async (Arena2D) => { ... });
  const pattern1 =
    /import\("\.\.\/\.\.\/dist\/arena-2d\.js"\)\.then\(async\s*\(Arena2D\)\s*=>\s*\{([\s\S]*)\}\);/m;

  // Pattern 2: (async () => { ... })();
  const pattern2 = /\(async\s*\(\)\s*=>\s*\{([\s\S]*)\}\)\(\);/m;

  let innerContent = "";
  if (pattern1.test(content)) {
    innerContent = content.match(pattern1)[1];
  } else if (pattern2.test(content)) {
    innerContent = content.match(pattern2)[1];
  } else {
    console.log(`Skipping ${file}: No matching pattern found.`);
    return;
  }

  // Remove HTML loading boilerplate
  innerContent = innerContent.replace(
    /\/\/ Load panel HTML[\s\S]*?document\.getElementById\(.*?\)\.innerHTML = await response\.text\(\);/g,
    "",
  );
  innerContent = innerContent.replace(
    /const response = await fetch\(.*?\);[\s\S]*?document\.getElementById\(.*?\)\.innerHTML = await response\.text\(\);/g,
    "",
  );

  const newContent = `export default async function(Arena2D) {
${innerContent.trim()}
}`;

  fs.writeFileSync(filePath, newContent);
  console.log(`Refactored ${file}`);
});
