/**
 * Style — Layout style properties for elements.
 *
 * Defines the IStyle interface and Style class with defaults,
 * plus unit resolution helpers for LayoutUnit values.
 *
 * SPEC: §4
 */

// ── Types ──

export type LayoutUnit = number | `${number}%` | "auto";

export interface IStyle {
  display: "manual" | "flex" | "anchor";

  // Flex container properties
  flexDirection: "row" | "column";
  justifyContent: "start" | "center" | "end" | "space-between" | "space-around";
  alignItems: "start" | "center" | "end" | "stretch";
  flexWrap: "nowrap" | "wrap";
  gap: number;

  // Flex child properties
  flexGrow: number;
  flexShrink: number;
  flexBasis: LayoutUnit;

  // Anchor properties
  top?: LayoutUnit;
  left?: LayoutUnit;
  right?: LayoutUnit;
  bottom?: LayoutUnit;

  // Size
  width: LayoutUnit;
  height: LayoutUnit;

  // Spacing
  padding: [number, number, number, number];
  margin: [number, number, number, number];

  // Constraints
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

// ── Default style factory ──

export function createDefaultStyle(): IStyle {
  return {
    display: "manual",
    flexDirection: "row",
    justifyContent: "start",
    alignItems: "start",
    flexWrap: "nowrap",
    gap: 0,
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: "auto",
    width: "auto",
    height: "auto",
    padding: [0, 0, 0, 0],
    margin: [0, 0, 0, 0],
  };
}

// ── Unit resolution helpers ──

/**
 * Resolve a LayoutUnit to a pixel value.
 * - number → returned as-is
 * - 'N%' → resolved as percentage of `referenceSize`
 * - 'auto' → returns `autoValue` (caller-provided fallback)
 */
export function resolveUnit(
  value: LayoutUnit | undefined,
  referenceSize: number,
  autoValue: number,
): number {
  if (value === undefined || value === "auto") return autoValue;
  if (typeof value === "number") return value;
  // Percentage string: e.g. '50%'
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return 0;
  return (parsed / 100) * referenceSize;
}

/**
 * Apply min/max constraints to a value.
 */
export function applyConstraints(
  value: number,
  min: number | undefined,
  max: number | undefined,
): number {
  let result = value;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
}
