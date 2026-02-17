// import { Container } from "../src/core/Container";
// import { Element } from "../src/core/Element";
// import { resolveLayout, getLayoutData } from "../src/layout/LayoutResolver";
import {
  Container,
  Element,
  getLayoutData,
  resolveLayout,
  // @ts-ignore
} from "../dist/canvasui.js";

function runTest() {
  console.log("Starting Layout Reproduction Test (Corrected)");

  const root = new Container("root");
  root.width = 500;
  root.height = 300;
  root.updateStyle({
    display: "flex",
    flexDirection: "row",
    width: 500,
    height: 300,
  });

  const child1 = new Element("c1");
  child1.updateStyle({
    display: "flex", // Must be flex (or not manual) to be measured in flex container?
    width: 100,
    height: 50,
  });
  root.addChild(child1);

  const child2 = new Element("c2");
  child2.updateStyle({
    display: "flex",
    width: 100,
    height: 50,
  });
  root.addChild(child2);

  // Test ROW
  console.log("--- ROW ---");
  resolveLayout(root);
  let d1 = getLayoutData(child1);
  let d2 = getLayoutData(child2);
  console.log(
    `C1: ${d1.computedX},${d1.computedY} ${d1.computedWidth}x${d1.computedHeight}`,
  );
  console.log(
    `C2: ${d2.computedX},${d2.computedY} ${d2.computedWidth}x${d2.computedHeight}`,
  );

  if (d1.computedX === 0 && d2.computedX >= 100) {
    console.log("PASS ROW: Tiled horizontally.");
  } else {
    console.log("FAIL ROW: Not tiled horizontal.");
  }

  // Test COLUMN
  console.log("--- COLUMN ---");
  root.updateStyle({ flexDirection: "column" });
  resolveLayout(root); // Logic check: isRow = false

  d1 = getLayoutData(child1);
  d2 = getLayoutData(child2);
  console.log(
    `C1: ${d1.computedX},${d1.computedY} ${d1.computedWidth}x${d1.computedHeight}`,
  );
  console.log(
    `C2: ${d2.computedX},${d2.computedY} ${d2.computedWidth}x${d2.computedHeight}`,
  );

  if (d1.computedY === 0 && d2.computedY >= 50) {
    console.log("PASS COLUMN: Tiled vertically.");
  } else {
    console.log("FAIL COLUMN: Not tiled vertical.");
  }
}

runTest();
