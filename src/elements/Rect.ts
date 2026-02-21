import { Element } from "../core/Element";
import type { IArena2DContext, FillStyle } from "../rendering/Arena2DContext";
import { DirtyFlags } from "../core/DirtyFlags";

/**
 * Rect element — A standard rectangle shape element.
 * 
 * Provides a high-level way to add rectangles to a scene without
 * writing custom paint() methods.
 */
export class Rect extends Element {
  private _fill: FillStyle | undefined;
  private _stroke: FillStyle | undefined;
  private _lineWidth: number = 1;
  private _radius: number | [number, number, number, number] = 0;

  constructor(id?: string) {
    super(id);
    this._fill = "#ffffff";
  }

  get fill(): FillStyle | undefined { return this._fill; }
  set fill(value: FillStyle | undefined) {
    if (this._fill !== value) {
      this._fill = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get stroke(): FillStyle | undefined { return this._stroke; }
  set stroke(value: FillStyle | undefined) {
    if (this._stroke !== value) {
      this._stroke = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get lineWidth(): number { return this._lineWidth; }
  set lineWidth(value: number) {
    if (this._lineWidth !== value) {
      this._lineWidth = value;
      this.invalidate(DirtyFlags.Visual);
    }
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
