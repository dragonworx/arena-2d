import { GeometryElement } from "./GeometryElement";
import { Path } from "../geometry/Path";
import type { IArena2DContext } from "../rendering/Arena2DContext";

/**
 * Path element — A path shape element backed by a Path geometry.
 *
 * Uses the Path geometry for hit-testing and spatial queries.
 * Supports complex shapes built from moveTo, lineTo, curves, arcs, and closePath segments.
 */
export class PathElement extends GeometryElement<Path> {
  constructor(id?: string) {
    super(new Path(), id);
    this.stroke = "#ffffff";
  }

  override paint(ctx: IArena2DContext): void {
    const raw = ctx.raw;
    const segments = this.geometry.segments;
    if (segments.length === 0) return;

    if (this._lineWidth !== undefined) raw.lineWidth = this._lineWidth;
    raw.beginPath();

    for (const seg of segments) {
      if (seg.type === "moveTo") raw.moveTo(seg.x, seg.y);
      else if (seg.type === "lineTo") raw.lineTo(seg.x, seg.y);
      else if (seg.type === "quadraticCurveTo") raw.quadraticCurveTo(seg.cpx, seg.cpy, seg.x, seg.y);
      else if (seg.type === "bezierCurveTo") raw.bezierCurveTo(seg.cp1x, seg.cp1y, seg.cp2x, seg.cp2y, seg.x, seg.y);
      else if (seg.type === "arc") raw.arc(seg.cx, seg.cy, seg.radius, seg.startAngle, seg.endAngle, seg.counterclockwise);
      else if (seg.type === "closePath") raw.closePath();
    }

    // Only fill if the path contains a closePath segment
    const isClosed = segments.some(s => s.type === "closePath");
    if (isClosed && this._fill !== undefined) {
      raw.fillStyle = this._fill as string;
      raw.fill();
    }
    if (this._stroke !== undefined) {
      raw.strokeStyle = this._stroke as string;
      raw.stroke();
    }
  }
}
