import { GeometryElement } from "./GeometryElement";
import { Arc } from "../geometry/Arc";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { DirtyFlags } from "../core/DirtyFlags";

/**
 * Arc element — A circular arc shape element backed by an Arc geometry.
 *
 * Uses the Arc geometry for hit-testing and spatial queries.
 * Defined by center, radius, start/end angles, and direction.
 */
export class ArcElement extends GeometryElement<Arc> {
  constructor(id?: string) {
    super(new Arc(0, 0, 50, 0, Math.PI * 2), id);
    this.stroke = "#ffffff";
  }

  get radius(): number { return this.geometry.radius; }
  set radius(value: number) {
    if (this.geometry.radius !== value) {
      this.geometry.radius = Math.max(value, Number.EPSILON);
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get startAngle(): number { return this.geometry.startAngle; }
  set startAngle(value: number) {
    if (this.geometry.startAngle !== value) {
      this.geometry.startAngle = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get endAngle(): number { return this.geometry.endAngle; }
  set endAngle(value: number) {
    if (this.geometry.endAngle !== value) {
      this.geometry.endAngle = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get counterclockwise(): boolean { return this.geometry.counterclockwise; }
  set counterclockwise(value: boolean) {
    if (this.geometry.counterclockwise !== value) {
      this.geometry.counterclockwise = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  override paint(ctx: IArena2DContext): void {
    const raw = ctx.raw;
    if (this._lineWidth !== undefined) raw.lineWidth = this._lineWidth;
    raw.beginPath();
    raw.arc(this.geometry.cx, this.geometry.cy, this.geometry.radius,
      this.geometry.startAngle, this.geometry.endAngle, this.geometry.counterclockwise);
    // Arc is an open curve — stroke only, no fill
    if (this._stroke !== undefined) {
      raw.strokeStyle = this._stroke as string;
      raw.stroke();
    }
  }
}
