import { Element } from "../core/Element";
import { DirtyFlags } from "../core/DirtyFlags";
import type { FillStyle } from "../rendering/Arena2DContext";

/**
 * ShapeElement — Base class for shape elements with fill, stroke, and lineWidth.
 *
 * Extends Element to provide common rendering properties used by shapes like
 * Rect and Circle. Subclasses should override paint() to define their rendering logic.
 */
export abstract class ShapeElement extends Element {
  protected _fill: FillStyle | undefined;
  protected _stroke: FillStyle | undefined;
  protected _lineWidth: number = 1;

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
}
