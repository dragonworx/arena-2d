/**
 * CanvasUI — High-Performance TypeScript Canvas UI Library
 */
export const VERSION = "0.0.1";

// --- Layer 1: Core Math & Transformation Engine ---
export type { MatrixArray } from "./math/matrix";
export {
  identity,
  multiply,
  translate,
  rotate,
  scale,
  skew,
  invert,
  transformPoint,
} from "./math/matrix";

export type { IRect } from "./math/aabb";
export { computeAABB } from "./math/aabb";

export type { ITransform } from "./math/Transform";
export { Transform } from "./math/Transform";

// --- Layer 2: Event Emitter ---
export type { IEventEmitter } from "./events/EventEmitter";
export { EventEmitter } from "./events/EventEmitter";
