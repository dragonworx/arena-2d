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

// --- Layer 3: Element Base & Dirty Flagging ---
export { DirtyFlags } from "./core/DirtyFlags";
export type { IElement } from "./core/Element";
export { Element } from "./core/Element";

// --- Layer 4: Container & Child Management ---
export type { IContainer } from "./core/Container";
export { Container } from "./core/Container";

// --- Layer 5: Ticker (Frame Loop) ---
export type { ITicker } from "./core/Ticker";
export { Ticker } from "./core/Ticker";

// --- Layer 6: Rendering Wrapper (CanvasUIContext) ---
export type {
  FillStyle,
  ITextStyle,
  IArenaContext,
} from "./rendering/ArenaContext";
export { ArenaContext, buildFontString } from "./rendering/ArenaContext";

// --- Layer 7: Scene & Layering System ---
export type { IScene } from "./core/Scene";
export { Scene } from "./core/Scene";
export type { ILayer } from "./core/Layer";
export { Layer } from "./core/Layer";

// --- Layer 8: Layout Engine (Flex & Anchor) ---
export type { LayoutUnit, IStyle } from "./layout/Style";
export {
  createDefaultStyle,
  resolveUnit,
  applyConstraints,
} from "./layout/Style";
export type { LayoutData } from "./layout/LayoutResolver";
export { resolveLayout, getLayoutData } from "./layout/LayoutResolver";

// --- Interaction (Helpers for Layer 4+, full system in Layer 5/7) ---
export { resolvePointerPosition } from "./core/Interaction";

// --- Layer 9: Interaction & Focus System ---
export type {
  IPointerEvent,
  IKeyboardEvent,
  IInteractionManager,
} from "./interaction/InteractionManager";
export { InteractionManager } from "./interaction/InteractionManager";
export type { ISpatialEntry } from "./interaction/SpatialHashGrid";
export { SpatialHashGrid } from "./interaction/SpatialHashGrid";
