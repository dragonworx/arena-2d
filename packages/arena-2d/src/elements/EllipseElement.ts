import { GeometryElement } from "./GeometryElement";
import { Ellipse } from "../geometry/Ellipse";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { DirtyFlags } from "../core/DirtyFlags";

/**
 * Ellipse element — An ellipse shape element backed by an Ellipse geometry.
 *
 * Uses the Ellipse geometry for hit-testing and spatial queries.
 * The ellipse is centered at (0, 0) in local space by default.
 */
export class EllipseElement extends GeometryElement<Ellipse> {
  constructor(id?: string) {
    super(new Ellipse(0, 0, 1, 1), id);
    this.fill = "#ffffff";
  }

  get rx(): number { return this.geometry.rx; }
  set rx(value: number) {
    if (this.geometry.rx !== value) {
      this.geometry.rx = Math.max(value, Number.EPSILON);
      this.width = value * 2;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get ry(): number { return this.geometry.ry; }
  set ry(value: number) {
    if (this.geometry.ry !== value) {
      this.geometry.ry = Math.max(value, Number.EPSILON);
      this.height = value * 2;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  override paint(ctx: IArena2DContext): void {
    ctx.drawEllipse(this.geometry.cx, this.geometry.cy, this.geometry.rx, this.geometry.ry,
      { fillColor: this._fill, strokeColor: this._stroke, lineWidth: this._lineWidth });
  }
}
