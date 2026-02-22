/**
 * GeometryElement — An Element that wraps a Geometry for rendering and interaction.
 *
 * Bridges the pure-math geometry layer with the Element scene graph. The geometry
 * provides `containsPoint()` for hit-testing, and `drawGeometry()` for rendering.
 * The Element's world matrix is synced into the geometry each frame.
 *
 * @module Elements
 * @example
 * ```typescript
 * import { GeometryElement, Circle } from 'arena-2d';
 *
 * const geo = new Circle(0, 0, 50);
 * const el = new GeometryElement(geo, 'my-circle');
 * el.fill = '#ff0000';
 * el.x = 100;
 * el.y = 100;
 * layer.addChild(el);
 * ```
 */

import { ShapeElement } from "./ShapeElement";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import type { Geometry } from "../geometry/Geometry";
import { transformPoint } from "../math/matrix";
import type { IRect } from "../math/aabb";

/**
 * Generic Element that wraps any Geometry subclass.
 *
 * Handles:
 * - **Rendering**: Delegates to `ctx.drawGeometry()` with the element's fill/stroke/lineWidth
 * - **Hit-testing**: Delegates to the geometry's `containsPoint()` in world space
 * - **Transform sync**: Pushes the Element's world matrix into the geometry each frame
 *
 * @typeParam G - The concrete Geometry type (e.g. `Circle`, `Rectangle`, `Polygon`)
 */
export class GeometryElement<G extends Geometry = Geometry> extends ShapeElement {
  /** The underlying geometry instance. */
  readonly geometry: G;

  /**
   * Creates a GeometryElement wrapping the given geometry.
   * @param geometry - The geometry primitive to wrap.
   * @param id - Optional element ID.
   */
  constructor(geometry: G, id?: string) {
    super(id);
    this.geometry = geometry;
  }

  /**
   * Syncs the Element's world matrix into the geometry so that
   * spatial queries on the geometry reflect the element's position in the scene.
   */
  override update(dt: number): void {
    super.update(dt);
    // Sync our world matrix into the geometry
    this.geometry.updateWorldMatrix(this.worldMatrix);
  }

  /**
   * Delegates hit-testing to the geometry's `containsPoint()`.
   * Converts the local-space point (from Element's coordinate system)
   * to world space before querying the geometry.
   */
  override containsPoint(localX: number, localY: number): boolean {
    const world = transformPoint(this.worldMatrix, localX, localY);
    return this.geometry.containsPoint(world.x, world.y);
  }

  /**
   * Returns the local bounds of the underlying geometry.
   */
  override get localBounds(): IRect {
    return this.geometry.getLocalBounds();
  }

  /**
   * Renders the geometry using the element's fill/stroke/lineWidth.
   */
  /**
   * Renders the geometry using the element's fill/stroke/lineWidth.
   */
  override paint(ctx: IArena2DContext): void {
    const raw = ctx.raw;
    raw.save();
    
    // Apply geometry's local transform
    const m = this.geometry.localMatrix;
    raw.transform(m[0], m[1], m[2], m[3], m[4], m[5]);

    ctx.drawGeometry(this.geometry, {
      fillColor: this._fill,
      strokeColor: this._stroke,
      lineWidth: this._lineWidth,
    });

    raw.restore();
  }
}
