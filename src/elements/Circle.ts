import { GeometryElement } from "./GeometryElement";
import { Circle as CircleGeometry } from "../geometry/Circle";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { DirtyFlags } from "../core/DirtyFlags";

/**
 * Circle element — A circle shape element backed by a Circle geometry.
 *
 * Uses the Circle geometry for hit-testing and spatial queries.
 * The circle is centered at (radius, radius) in local space so the
 * element's origin is at the top-left of its bounding box.
 */
export class Circle extends GeometryElement<CircleGeometry> {
  constructor(id?: string) {
    super(new CircleGeometry(0, 0, 1), id);
    this.fill = "#ffffff";
  }

  get radius(): number { return this.geometry.radius; }
  set radius(value: number) {
    if (this.geometry.radius !== value) {
      this.geometry.radius = value;
      this.geometry.cx = value;
      this.geometry.cy = value;
      // Also update width/height to fit the circle by default
      this.width = value * 2;
      this.height = value * 2;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  override paint(ctx: IArena2DContext): void {
    ctx.drawCircle(this.geometry.cx, this.geometry.cy, this.geometry.radius,
      { fillColor: this._fill, strokeColor: this._stroke, lineWidth: this._lineWidth });
  }
}
