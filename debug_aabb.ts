import { Element } from "./src/core/Element";
import { computeAABB } from "./src/math/aabb";
import { multiply } from "./src/math/matrix";

console.log("--- Matrix & AABB Debug ---");

const el = new Element("test");
el.x = 100;
el.y = 100;
el.width = 100;
el.height = 100;
el.rotation = Math.PI / 4; // 45 degrees

// Manually trigger update to ensure matrices are computed
el.update(0.016);

console.log("Rotation:", el.rotation);
console.log("Local Matrix:", el.localMatrix);
console.log("World Matrix:", el.worldMatrix);

// Validate Matrix Content
// 45 deg rotation: cos=0.707, sin=0.707
// Matrix: [0.707, 0.707, -0.707, 0.707, 100, 100]
const m = el.worldMatrix;
console.log(`Matrix check: a=${m[0].toFixed(3)}, b=${m[1].toFixed(3)}, c=${m[2].toFixed(3)}, d=${m[3].toFixed(3)}, tx=${m[4]}, ty=${m[5]}`);

// Compute AABB
const aabb = computeAABB(
    { x: 0, y: 0, width: el.width, height: el.height },
    el.worldMatrix
);

console.log("AABB:", aabb);

// Expected AABB for 100x100 square rotated 45deg at 100,100 (top-left pivot, which is default? No, Element default pivot is 0,0)
// Element origin is (0,0) in local space.
// Rotation is around (0,0) (pivot).
// Top-Left corner (0,0) -> (100, 100) global.
// Top-Right (100,0) -> local (70.7, 70.7) + (100,100) -> (170.7, 170.7).
// Bottom-Left (0,100) -> local (-70.7, 70.7) + (100,100) -> (29.3, 170.7).
// Bottom-Right (100,100) -> local (0, 141.4) + (100,100) -> (100, 241.4).

// MinX: 29.3. MaxX: 170.7. Width: 141.4.
// MinY: 100. MaxY: 241.4. Height: 141.4.

console.log("Expected Width ~141.4");
