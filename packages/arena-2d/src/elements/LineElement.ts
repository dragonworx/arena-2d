import { GeometryElement } from "./GeometryElement";
import { Line } from "../geometry/Line";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { DirtyFlags } from "../core/DirtyFlags";

/**
 * Line element — A line segment shape element backed by a Line geometry.
 *
 * Uses the Line geometry for hit-testing and spatial queries.
 * The line connects two points (x1, y1) and (x2, y2) in local space.
 */
export class LineElement extends GeometryElement<Line> {
  constructor(id?: string) {
    super(new Line(0, 0, 100, 0), id);
    this.stroke = "#ffffff";
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

  get x2(): number { return this.geometry.x2; }
  set x2(value: number) {
    if (this.geometry.x2 !== value) {
      this.geometry.x2 = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get y2(): number { return this.geometry.y2; }
  set y2(value: number) {
    if (this.geometry.y2 !== value) {
      this.geometry.y2 = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  override paint(ctx: IArena2DContext): void {
    ctx.drawLine(this.geometry.x1, this.geometry.y1, this.geometry.x2, this.geometry.y2,
      { strokeColor: this._stroke, lineWidth: this._lineWidth });
  }
}
