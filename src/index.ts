/**
 * Arena2D — High-Performance TypeScript Canvas UX Library
 */
export const VERSION = "0.0.1";

export { Arena2D } from "./Arena2D";

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

// --- Layer 1.1: Geometry Primitives ---
export * from "./geometry";

// --- Layer 2: Event Emitter ---
export type { IEventEmitter } from "./events/EventEmitter";
export { EventEmitter } from "./events/EventEmitter";

// --- Layer 3: Element Base & Dirty Flagging ---
export { DirtyFlags } from "./core/DirtyFlags";
export type { IElement } from "./core/Element";
export { Element } from "./core/Element";
export { ShapeElement } from "./elements/ShapeElement";
export { GeometryElement } from "./elements/GeometryElement";

// --- Layer 4: Container & Child Management ---
export type { IContainer } from "./core/Container";
export { Container } from "./core/Container";

// --- Layer 5: Ticker (Frame Loop) ---
export type { ITicker } from "./core/Ticker";
export { Ticker } from "./core/Ticker";

// --- Layer 6: Rendering Wrapper (Arena2DContext) ---
export type {
  FillStyle,
  IArena2DContext,
  IRenderTextStyle,
} from "./rendering/Arena2DContext";
export { Arena2DContext, buildFontString } from "./rendering/Arena2DContext";

// --- Layer 7: Scene & Layering System ---
export type { IScene } from "./core/Scene";
export { Scene } from "./core/Scene";
export type { ILayer } from "./core/Layer";
export { Layer } from "./core/Layer";

// --- View (Multi-view, Pan/Zoom, Projections) ---
export type {
  IView,
  IProjection,
  ViewAlignment,
  LookAtOptions,
  ViewOptions,
  PanTrigger,
} from "./core/View";
export { View } from "./core/View";

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

// --- Layer 10: Text & Text Layout ---
export type { ITextStyle as IElementTextStyle } from "./elements/Text";
export { Text, createDefaultTextStyle } from "./elements/Text";
export type {
  ITextLine,
  ITextLayout,
  ILayoutTextStyle,
  ITextMeasureContext,
} from "./text/TextLayout";
export {
  computeTextLayout,
  computeMinContentWidth,
  computeMaxContentWidth,
  clearLayoutCache,
  setMeasureContext,
} from "./text/TextLayout";
export { isFontReady, waitForFont } from "./text/fontReady";

// --- Layer 11: Text Input & IME ---
export { TextInput } from "./elements/TextInput";

// --- Layer 12: Image & Nine-Slice ---
export { Image } from "./elements/Image";
export { Rect } from "./elements/Rect";
export { Circle as CircleElement } from "./elements/Circle";
export { LineElement } from "./elements/LineElement";
export { EllipseElement } from "./elements/EllipseElement";
export { PolygonElement } from "./elements/PolygonElement";
export { ArcElement } from "./elements/ArcElement";
export { QuadraticCurveElement } from "./elements/QuadraticCurveElement";
export { BezierCurveElement } from "./elements/BezierCurveElement";
export { PathElement } from "./elements/PathElement";

// --- Layer 13: Scroll Containers ---
export type { IScrollContainer } from "./elements/ScrollContainer";
export { ScrollContainer } from "./elements/ScrollContainer";

// --- Animation: Tween System ---
export type {
  EasingFunction,
  EasingName,
  IKeyframe,
  ITweenConfig,
  TweenState,
  ITween,
  TweenProperties,
  Interpolator,
  IManagedTween,
} from "./animation";
export {
  Easing,
  resolveEasing,
  createInterpolator,
  parseHex,
  parseRgb,
  parseHsl,
  hslToRgb,
  TweenManager,
  Tween,
} from "./animation";
