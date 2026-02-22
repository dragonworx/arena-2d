import { ShapeElement } from "./ShapeElement";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { DirtyFlags } from "../core/DirtyFlags";

/**
 * Rect element — A standard rectangle shape element.
 *
 * Provides a high-level way to add rectangles to a scene without
 * writing custom paint() methods.
 */
export class Rect extends ShapeElement {
  private _radius: number | [number, number, number, number] = 0;

  constructor(id?: string) {
    super(id);
    this.fill = "#ffffff";
  }

  get radius(): number | [number, number, number, number] { return this._radius; }
  set radius(value: number | [number, number, number, number]) {
    if (this._radius !== value) {
      this._radius = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  override paint(ctx: IArena2DContext): void {
    if (this._lineWidth !== 1) {
      ctx.setLineWidth(this._lineWidth);
    }
    
    if (this._radius === 0 || (Array.isArray(this._radius) && this._radius.every(r => r === 0))) {
      ctx.drawRect(0, 0, this.width, this.height, this._fill, this._stroke);
    } else {
      ctx.drawRoundedRect(0, 0, this.width, this.height, this._radius, this._fill, this._stroke);
    }
  }
}
