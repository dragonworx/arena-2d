import { GeometryElement } from "./GeometryElement";
import { Rectangle } from "../geometry/Rectangle";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { DirtyFlags } from "../core/DirtyFlags";

/**
 * Rect element — A rectangle shape element backed by a Rectangle geometry.
 *
 * Supports optional rounded corners. Uses the Rectangle geometry for
 * hit-testing and spatial queries.
 */
export class Rect extends GeometryElement<Rectangle> {
  private _radius: number | [number, number, number, number] = 0;

  constructor(id?: string) {
    super(new Rectangle(0, 0, 1, 1), id);
    this.fill = "#ffffff";
  }

  get radius(): number | [number, number, number, number] { return this._radius; }
  set radius(value: number | [number, number, number, number]) {
    if (this._radius !== value) {
      this._radius = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  /** Sync width/height changes into the underlying Rectangle geometry. */
  override set width(value: number) {
    super.width = value;
    this.geometry.width = Math.max(value, Number.EPSILON);
  }
  override get width(): number { return super.width; }

  /** Sync width/height changes into the underlying Rectangle geometry. */
  override set height(value: number) {
    super.height = value;
    this.geometry.height = Math.max(value, Number.EPSILON);
  }
  override get height(): number { return super.height; }

  override paint(ctx: IArena2DContext): void {
    const style = { fillColor: this._fill, strokeColor: this._stroke, lineWidth: this._lineWidth };

    if (this._radius === 0 || (Array.isArray(this._radius) && this._radius.every(r => r === 0))) {
      ctx.drawRect(0, 0, this.width, this.height, style);
    } else {
      ctx.drawRoundedRect(0, 0, this.width, this.height, this._radius, style);
    }
  }
}
