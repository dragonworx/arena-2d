import { GeometryElement } from "./GeometryElement";
import { QuadraticCurve } from "../geometry/QuadraticCurve";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { DirtyFlags } from "../core/DirtyFlags";

/**
 * QuadraticCurve element — A quadratic Bezier curve element backed by a QuadraticCurve geometry.
 *
 * Uses the QuadraticCurve geometry for hit-testing and spatial queries.
 * Defined by start point (x0, y0), control point (cpx, cpy), and end point (x1, y1).
 */
export class QuadraticCurveElement extends GeometryElement<QuadraticCurve> {
  constructor(id?: string) {
    super(new QuadraticCurve(0, 0, 50, -80, 100, 0), id);
    this.stroke = "#ffffff";
  }

  get x0(): number { return this.geometry.x0; }
  set x0(value: number) {
    if (this.geometry.x0 !== value) {
      this.geometry.x0 = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get y0(): number { return this.geometry.y0; }
  set y0(value: number) {
    if (this.geometry.y0 !== value) {
      this.geometry.y0 = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get cpx(): number { return this.geometry.cpx; }
  set cpx(value: number) {
    if (this.geometry.cpx !== value) {
      this.geometry.cpx = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get cpy(): number { return this.geometry.cpy; }
  set cpy(value: number) {
    if (this.geometry.cpy !== value) {
      this.geometry.cpy = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get x1(): number { return this.geometry.x1; }
  set x1(value: number) {
    if (this.geometry.x1 !== value) {
      this.geometry.x1 = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get y1(): number { return this.geometry.y1; }
  set y1(value: number) {
    if (this.geometry.y1 !== value) {
      this.geometry.y1 = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  override paint(ctx: IArena2DContext): void {
    const raw = ctx.raw;
    if (this._lineWidth !== undefined) raw.lineWidth = this._lineWidth;
    raw.beginPath();
    raw.moveTo(this.geometry.x0, this.geometry.y0);
    raw.quadraticCurveTo(this.geometry.cpx, this.geometry.cpy, this.geometry.x1, this.geometry.y1);
    // Open curve — stroke only, no fill
    if (this._stroke !== undefined) {
      raw.strokeStyle = this._stroke as string;
      raw.stroke();
    }
  }
}
