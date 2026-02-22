import { GeometryElement } from "./GeometryElement";
import { BezierCurve } from "../geometry/BezierCurve";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { DirtyFlags } from "../core/DirtyFlags";

/**
 * BezierCurve element — A Bezier curve element backed by a BezierCurve geometry.
 *
 * Uses the BezierCurve geometry for hit-testing and spatial queries.
 * Supports curves of any degree (quadratic, cubic, quartic, etc.)
 * defined by an array of control points.
 */
export class BezierCurveElement extends GeometryElement<BezierCurve> {
  constructor(controlPoints?: Array<{ x: number; y: number }>, id?: string) {
    super(new BezierCurve(controlPoints ?? [
      { x: 0, y: 0 }, { x: 30, y: -80 }, { x: 70, y: -80 }, { x: 100, y: 0 },
    ]), id);
    this.stroke = "#ffffff";
  }

  get controlPoints(): Array<{ x: number; y: number }> { return this.geometry.controlPoints; }
  set controlPoints(value: Array<{ x: number; y: number }>) {
    this.geometry.controlPoints = value.slice();
    this.invalidate(DirtyFlags.Visual);
  }

  override paint(ctx: IArena2DContext): void {
    const raw = ctx.raw;
    const cp = this.geometry.controlPoints;
    if (cp.length < 2) return;

    if (cp.length === 4) {
      // Cubic bezier — optimized direct canvas call
      if (this._lineWidth !== undefined) raw.lineWidth = this._lineWidth;
      raw.beginPath();
      raw.moveTo(cp[0].x, cp[0].y);
      raw.bezierCurveTo(cp[1].x, cp[1].y, cp[2].x, cp[2].y, cp[3].x, cp[3].y);
      if (this._stroke !== undefined) {
        raw.strokeStyle = this._stroke as string;
        raw.stroke();
      }
    } else {
      // Higher-order — delegate to drawGeometry which handles sampling
      ctx.drawGeometry(this.geometry, {
        strokeColor: this._stroke,
        lineWidth: this._lineWidth,
      });
    }
  }
}
