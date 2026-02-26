import { GeometryElement } from "./GeometryElement";
import { Polygon } from "../geometry/Polygon";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { DirtyFlags } from "../core/DirtyFlags";

/**
 * Polygon element — A polygon/polyline shape element backed by a Polygon geometry.
 *
 * Uses the Polygon geometry for hit-testing and spatial queries.
 * Supports both closed polygons and open polylines.
 */
export class PolygonElement extends GeometryElement<Polygon> {
  constructor(points: Array<{ x: number; y: number }> = [], closed: boolean = true, id?: string) {
    super(new Polygon(points, closed), id);
    this.fill = "#ffffff";
  }

  get points(): Array<{ x: number; y: number }> { return this.geometry.points; }
  set points(value: Array<{ x: number; y: number }>) {
    this.geometry.points = value.slice();
    this.invalidate(DirtyFlags.Visual);
  }

  get closed(): boolean { return this.geometry.closed; }
  set closed(value: boolean) {
    if (this.geometry.closed !== value) {
      this.geometry.closed = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  override paint(ctx: IArena2DContext): void {
    // Only fill closed polygons; open polylines render stroke only
    ctx.drawPolygon(this.geometry.points, {
      fillColor: this.geometry.closed ? this._fill : undefined,
      strokeColor: this._stroke,
      lineWidth: this._lineWidth,
    }, this.geometry.closed);
  }
}
