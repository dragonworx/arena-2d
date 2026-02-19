import type { ITickable } from "../core/Ticker";

export type { ITickable };

/**
 * A Timeline manages time flow for a set of children (Animators or sub-Timelines).
 * It supports time scaling and pausing.
 */
export class Timeline implements ITickable {
  /** Current time of the timeline in seconds. */
  time = 0;

  /** Speed multiplier. 1 = normal, 0.5 = half speed, 0 = paused (technically). */
  timeScale = 1;

  /** if true, update() will not advance time. */
  paused = false;

  private _children: ITickable[] = [];

  add(child: ITickable): void {
    this._children.push(child);
  }

  remove(child: ITickable): void {
    const idx = this._children.indexOf(child);
    if (idx !== -1) {
      this._children.splice(idx, 1);
    }
  }

  update(dt: number): void {
    if (this.paused) return;

    // Apply local time scale
    const localDt = dt * this.timeScale;
    this.time += localDt;

    // Update all children with the scaled delta
    // Iterate backwards to allow safe removal during update
    for (let i = this._children.length - 1; i >= 0; i--) {
      this._children[i].update(localDt);
    }
  }

  /**
   * Clear all children.
   * Note: This orphans any Animators that reference this timeline.
   * They will fail gracefully if they try to detach later.
   */
  clear(): void {
    this._children = [];
  }
}
