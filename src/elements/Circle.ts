import { ShapeElement } from "./ShapeElement";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { DirtyFlags } from "../core/DirtyFlags";

/**
 * Circle element — A standard circle shape element.
 *
 * Provides a high-level way to add circles to a scene.
 * The circle is centered within the element's width/height if not specified,
 * but by default uses (radius, radius) as the center in local space.
 */
export class Circle extends ShapeElement {
  private _radius: number = 0;

  constructor(id?: string) {
    super(id);
    this.fill = "#ffffff";
  }

  get radius(): number { return this._radius; }
  set radius(value: number) {
    if (this._radius !== value) {
      this._radius = value;
      // Also update width/height to fit the circle by default
      this.width = value * 2;
      this.height = value * 2;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  override paint(ctx: IArena2DContext): void {
    if (this._lineWidth !== 1) {
      ctx.setLineWidth(this._lineWidth);
    }
    ctx.drawCircle(this._radius, this._radius, this._radius, this._fill, this._stroke);
  }
}
