/**
 * Bitmask flags for tracking what needs to be recalculated on an element.
 *
 * Multiple invalidations within a single frame are coalesced via bitwise OR.
 */
export enum DirtyFlags {
  /** No flags set — element is fully up-to-date. */
  None = 0,
  /** Transform properties changed — recompute localMatrix / worldMatrix / AABB. */
  Transform = 1 << 0,
  /** Visual properties changed — repaint required. */
  Visual = 1 << 1,
  /** Layout properties changed — re-run layout resolver. */
  Layout = 1 << 2,
  /** Spatial bounds changed — re-insert into SpatialHashGrid. */
  Spatial = 1 << 3,
  /** All flags set. */
  All = 0b1111,
}
