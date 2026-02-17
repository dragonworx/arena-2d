/**
 * LayoutResolver — Two-pass layout engine (Flex & Anchor).
 *
 * Pass 1 — Measure (bottom-up): compute desired sizes for each element.
 * Pass 2 — Arrange (top-down): distribute space, resolve positions.
 *
 * SPEC: §4
 */

import type { IElement } from "../core/Element";
import {
  type IStyle,
  type LayoutUnit,
  applyConstraints,
  resolveUnit,
} from "./Style";

// ── Layout data attached to elements during resolution ──

export interface LayoutData {
  /** Measured desired width (from measure pass) */
  desiredWidth: number;
  /** Measured desired height (from measure pass) */
  desiredHeight: number;
  /** Final computed x position (relative to parent content area) */
  computedX: number;
  /** Final computed y position (relative to parent content area) */
  computedY: number;
  /** Final computed width */
  computedWidth: number;
  /** Final computed height */
  computedHeight: number;
}

/** Weak map for attaching layout data to elements without modifying them */
const layoutDataMap = new WeakMap<IElement, LayoutData>();

export function getLayoutData(el: IElement): LayoutData {
  let data = layoutDataMap.get(el);
  if (!data) {
    data = {
      desiredWidth: 0,
      desiredHeight: 0,
      computedX: 0,
      computedY: 0,
      computedWidth: 0,
      computedHeight: 0,
    };
    layoutDataMap.set(el, data);
  }
  return data;
}

// ── Helpers ──

interface ElementWithLayout extends IElement {
  style: IStyle;
  children?: ReadonlyArray<IElement>;
  /** Intrinsic content size for leaf elements (e.g., Text, Image) */
  getIntrinsicSize?: () => { width: number; height: number };
}

function hasChildren(
  el: ElementWithLayout,
): el is ElementWithLayout & { children: ReadonlyArray<IElement> } {
  return Array.isArray((el as ElementWithLayout).children);
}

function getStyle(el: IElement): IStyle {
  return (el as ElementWithLayout).style;
}

function getFlexChildren(el: ElementWithLayout): ElementWithLayout[] {
  if (!hasChildren(el)) return [];
  return (el.children as ElementWithLayout[]).filter((c) => {
    if (!c.visible) return false;
    const d = getStyle(c).display;
    return d !== "manual" && d !== "anchor";
  });
}

function getAllChildren(el: ElementWithLayout): ElementWithLayout[] {
  if (!hasChildren(el)) return [];
  return el.children as ElementWithLayout[];
}

function paddingH(style: IStyle): number {
  return style.padding[1] + style.padding[3]; // right + left
}

function paddingV(style: IStyle): number {
  return style.padding[0] + style.padding[2]; // top + bottom
}

function marginH(style: IStyle): number {
  return style.margin[1] + style.margin[3]; // right + left
}

function marginV(style: IStyle): number {
  return style.margin[0] + style.margin[2]; // top + bottom
}

// ── Entry point ──

/**
 * Resolve layout for a subtree rooted at `root`.
 * The root element must have a known width and height (set from Scene or user).
 */
export function resolveLayout(root: IElement): void {
  const el = root as ElementWithLayout;
  const style = getStyle(root);
  if (style.display === "manual" && !hasChildren(el)) return;

  // Pass 1: Measure (bottom-up)
  measure(el, root.width, root.height);

  // Pass 2: Arrange (top-down)
  // Root gets positioned at its current x, y with its known size
  const ld = getLayoutData(root);
  ld.computedX = root.x;
  ld.computedY = root.y;
  ld.computedWidth = root.width;
  ld.computedHeight = root.height;

  arrange(el, root.width, root.height);
}

// ── Pass 1: Measure (bottom-up) ──

function measure(
  el: ElementWithLayout,
  availableWidth: number,
  availableHeight: number,
): void {
  const style = getStyle(el);
  const ld = getLayoutData(el);

  // Resolve content area for children
  const contentW = availableWidth - paddingH(style);
  const contentH = availableHeight - paddingV(style);

  // Measure children first (bottom-up)
  if (hasChildren(el)) {
    for (const child of el.children) {
      if (!child.visible) continue;
      const childEl = child as ElementWithLayout;
      const childStyle = getStyle(child);
      if (childStyle.display === "manual") continue;

      // Estimate available space for child measurement
      const childAvailW = contentW - marginH(childStyle);
      const childAvailH = contentH - marginV(childStyle);
      measure(childEl, Math.max(0, childAvailW), Math.max(0, childAvailH));
    }
  }

  // Compute desired size for this element
  if (style.display === "flex" && hasChildren(el)) {
    measureFlex(el, style, contentW, contentH, ld);
  } else if (el.getIntrinsicSize) {
    const intrinsic = el.getIntrinsicSize();
    ld.desiredWidth = intrinsic.width + paddingH(style);
    ld.desiredHeight = intrinsic.height + paddingV(style);
  } else {
    // Manual or no-content: use explicit size or 0
    ld.desiredWidth =
      typeof style.width === "number" ? style.width : availableWidth;
    ld.desiredHeight =
      typeof style.height === "number" ? style.height : availableHeight;
  }
}

function measureFlex(
  el: ElementWithLayout,
  style: IStyle,
  contentW: number,
  contentH: number,
  ld: LayoutData,
): void {
  const isRow = style.flexDirection === "row";
  const children = getFlexChildren(el);

  let mainTotal = 0;
  let crossMax = 0;

  for (const child of children) {
    const childStyle = getStyle(child);
    const childLd = getLayoutData(child);
    const childMainMargin = isRow ? marginH(childStyle) : marginV(childStyle);
    const childCrossMargin = isRow ? marginV(childStyle) : marginH(childStyle);
    const childMain = isRow ? childLd.desiredWidth : childLd.desiredHeight;
    const childCross = isRow ? childLd.desiredHeight : childLd.desiredWidth;

    mainTotal += childMain + childMainMargin;
    crossMax = Math.max(crossMax, childCross + childCrossMargin);
  }

  // Add gaps
  if (children.length > 1) {
    mainTotal += style.gap * (children.length - 1);
  }

  const desiredMain = mainTotal + (isRow ? paddingH(style) : paddingV(style));
  const desiredCross = crossMax + (isRow ? paddingV(style) : paddingH(style));

  if (isRow) {
    ld.desiredWidth = desiredMain;
    ld.desiredHeight = desiredCross;
  } else {
    ld.desiredWidth = desiredCross;
    ld.desiredHeight = desiredMain;
  }
}

// ── Pass 2: Arrange (top-down) ──

function arrange(el: ElementWithLayout, width: number, height: number): void {
  const style = getStyle(el);
  if (!hasChildren(el)) return;

  const contentX = style.padding[3]; // left padding
  const contentY = style.padding[0]; // top padding
  const contentW = width - paddingH(style);
  const contentH = height - paddingV(style);

  const allChildren = getAllChildren(el);

  for (const child of allChildren) {
    if (!child.visible) continue; // Skip invisible elements
    const childStyle = getStyle(child);

    if (childStyle.display === "anchor") {
      arrangeAnchor(child, childStyle, contentX, contentY, contentW, contentH);
    }
  }

  if (style.display === "flex") {
    arrangeFlex(el, style, contentX, contentY, contentW, contentH);
  }

  // Recurse: arrange children's children
  for (const child of allChildren) {
    if (!child.visible) continue; // Skip invisible elements
    const childStyle = getStyle(child);
    if (childStyle.display === "manual") continue;

    const childLd = getLayoutData(child);
    // Apply computed layout to element
    applyLayout(child, childLd, el);

    // Recurse
    arrange(child, childLd.computedWidth, childLd.computedHeight);
  }
}

function arrangeFlex(
  el: ElementWithLayout,
  style: IStyle,
  contentX: number,
  contentY: number,
  contentW: number,
  contentH: number,
): void {
  const isRow = style.flexDirection === "row";
  const children = getFlexChildren(el);
  if (children.length === 0) return;

  const mainSize = isRow ? contentW : contentH;
  const crossSize = isRow ? contentH : contentW;

  if (style.flexWrap === "wrap") {
    arrangeFlexWrap(
      children,
      style,
      contentX,
      contentY,
      mainSize,
      crossSize,
      isRow,
    );
  } else {
    arrangeFlexLine(
      children,
      style,
      contentX,
      contentY,
      mainSize,
      crossSize,
      isRow,
    );
  }
}

// ── Flex line layout (no wrap) ──

interface FlexItem {
  child: ElementWithLayout;
  style: IStyle;
  ld: LayoutData;
  basis: number;
  mainMargin: number;
  crossMargin: number;
  marginStart: number;
  marginEnd: number;
  crossMarginStart: number;
  crossMarginEnd: number;
  grow: number;
  shrink: number;
  frozen: boolean;
  mainSize: number;
  crossSize: number;
}

function buildFlexItems(
  children: ElementWithLayout[],
  isRow: boolean,
  containerMainSize: number,
  containerCrossSize: number,
): FlexItem[] {
  return children.map((child) => {
    const childStyle = getStyle(child);
    const childLd = getLayoutData(child);
    const mainMarginStart = isRow ? childStyle.margin[3] : childStyle.margin[0];
    const mainMarginEnd = isRow ? childStyle.margin[1] : childStyle.margin[2];
    const crossMarginStart = isRow
      ? childStyle.margin[0]
      : childStyle.margin[3];
    const crossMarginEnd = isRow ? childStyle.margin[2] : childStyle.margin[1];

    // Resolve flex-basis
    let basis: number;
    if (childStyle.flexBasis === "auto") {
      // Use explicit width/height or desired size
      const sizeValue = isRow ? childStyle.width : childStyle.height;
      if (sizeValue === "auto") {
        basis = isRow ? childLd.desiredWidth : childLd.desiredHeight;
      } else {
        basis = resolveUnit(
          sizeValue,
          containerMainSize,
          isRow ? childLd.desiredWidth : childLd.desiredHeight,
        );
      }
    } else {
      basis = resolveUnit(
        childStyle.flexBasis,
        containerMainSize,
        isRow ? childLd.desiredWidth : childLd.desiredHeight,
      );
    }

    // Resolve explicit cross size
    const crossSizeValue = isRow ? childStyle.height : childStyle.width;
    let crossSize = resolveUnit(
      crossSizeValue,
      containerCrossSize,
      isRow ? childLd.desiredHeight : childLd.desiredWidth,
    );

    // Apply cross constraints
    const crossMin = isRow ? childStyle.minHeight : childStyle.minWidth;
    const crossMax = isRow ? childStyle.maxHeight : childStyle.maxWidth;
    crossSize = applyConstraints(crossSize, crossMin, crossMax);

    return {
      child,
      style: childStyle,
      ld: childLd,
      basis,
      mainMargin: mainMarginStart + mainMarginEnd,
      crossMargin: crossMarginStart + crossMarginEnd,
      marginStart: mainMarginStart,
      marginEnd: mainMarginEnd,
      crossMarginStart,
      crossMarginEnd,
      grow: childStyle.flexGrow,
      shrink: childStyle.flexShrink,
      frozen: false,
      mainSize: basis,
      crossSize,
    };
  });
}

function resolveFlexLineWithAxis(
  items: FlexItem[],
  mainSize: number,
  gap: number,
  isRow: boolean,
): void {
  const totalGaps = items.length > 1 ? gap * (items.length - 1) : 0;

  // Calculate used space
  let usedMain = totalGaps;
  for (const item of items) {
    usedMain += item.basis + item.mainMargin;
  }

  const freeSpace = mainSize - usedMain;

  if (freeSpace > 0) {
    // Grow phase
    const totalGrow = items.reduce((sum, item) => sum + item.grow, 0);
    if (totalGrow > 0) {
      for (const item of items) {
        const growShare = (item.grow / totalGrow) * freeSpace;
        let newSize = item.basis + growShare;
        const minC = isRow ? item.style.minWidth : item.style.minHeight;
        const maxC = isRow ? item.style.maxWidth : item.style.maxHeight;
        newSize = applyConstraints(newSize, minC, maxC);
        item.mainSize = newSize;
      }
    } else {
      for (const item of items) {
        item.mainSize = item.basis;
      }
    }
  } else if (freeSpace < 0) {
    // Shrink phase
    const totalShrinkScaled = items.reduce(
      (sum, item) => sum + item.shrink * item.basis,
      0,
    );
    if (totalShrinkScaled > 0) {
      for (const item of items) {
        const shrinkRatio = (item.shrink * item.basis) / totalShrinkScaled;
        let newSize = item.basis + shrinkRatio * freeSpace;
        if (newSize < 0) newSize = 0;
        const minC = isRow ? item.style.minWidth : item.style.minHeight;
        const maxC = isRow ? item.style.maxWidth : item.style.maxHeight;
        newSize = applyConstraints(newSize, minC, maxC);
        item.mainSize = newSize;
      }
    } else {
      for (const item of items) {
        item.mainSize = item.basis;
      }
    }
  } else {
    for (const item of items) {
      item.mainSize = item.basis;
    }
  }
}

function arrangeFlexLine(
  children: ElementWithLayout[],
  style: IStyle,
  contentX: number,
  contentY: number,
  mainSize: number,
  crossSize: number,
  isRow: boolean,
): void {
  const items = buildFlexItems(children, isRow, mainSize, crossSize);
  resolveFlexLineWithAxis(items, mainSize, style.gap, isRow);

  // Position items along main axis
  const totalGaps = items.length > 1 ? style.gap * (items.length - 1) : 0;
  let totalUsed = totalGaps;
  for (const item of items) {
    totalUsed += item.mainSize + item.mainMargin;
  }

  const remainingSpace = mainSize - totalUsed;
  let mainPos = 0;

  switch (style.justifyContent) {
    case "center":
      mainPos = remainingSpace / 2;
      break;
    case "end":
      mainPos = remainingSpace;
      break;
    case "space-between":
      mainPos = 0;
      break;
    case "space-around":
      mainPos = items.length > 0 ? remainingSpace / (items.length * 2) : 0;
      break;
    default: // 'start'
      mainPos = 0;
      break;
  }

  const spaceBetween =
    style.justifyContent === "space-between" && items.length > 1
      ? remainingSpace / (items.length - 1)
      : 0;
  const spaceAround =
    style.justifyContent === "space-around" && items.length > 0
      ? remainingSpace / items.length
      : 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const ld = item.ld;

    // Main axis position
    mainPos += item.marginStart;
    const itemMainPos = mainPos;
    mainPos += item.mainSize + item.marginEnd + style.gap;

    if (style.justifyContent === "space-between" && i < items.length - 1) {
      mainPos += spaceBetween;
    } else if (style.justifyContent === "space-around") {
      mainPos += spaceAround;
    }

    // Cross axis position
    let crossPos: number;
    const itemCrossSize = resolveItemCross(item, style, crossSize, isRow);

    switch (style.alignItems) {
      case "center":
        crossPos =
          (crossSize - itemCrossSize - item.crossMargin) / 2 +
          item.crossMarginStart;
        break;
      case "end":
        crossPos = crossSize - itemCrossSize - item.crossMarginEnd;
        break;
      case "stretch":
        crossPos = item.crossMarginStart;
        break;
      default: // 'start'
        crossPos = item.crossMarginStart;
        break;
    }

    if (isRow) {
      ld.computedX = contentX + itemMainPos;
      ld.computedY = contentY + crossPos;
      ld.computedWidth = item.mainSize;
      ld.computedHeight = itemCrossSize;
    } else {
      ld.computedX = contentX + crossPos;
      ld.computedY = contentY + itemMainPos;
      ld.computedWidth = itemCrossSize;
      ld.computedHeight = item.mainSize;
    }

    // Apply main-axis constraints
    if (isRow) {
      ld.computedWidth = applyConstraints(
        ld.computedWidth,
        item.style.minWidth,
        item.style.maxWidth,
      );
      ld.computedHeight = applyConstraints(
        ld.computedHeight,
        item.style.minHeight,
        item.style.maxHeight,
      );
    } else {
      ld.computedWidth = applyConstraints(
        ld.computedWidth,
        item.style.minWidth,
        item.style.maxWidth,
      );
      ld.computedHeight = applyConstraints(
        ld.computedHeight,
        item.style.minHeight,
        item.style.maxHeight,
      );
    }

    // Integer snapping for pixel-perfect rendering
    ld.computedX = Math.round(ld.computedX);
    ld.computedY = Math.round(ld.computedY);
    ld.computedWidth = Math.round(ld.computedWidth);
    ld.computedHeight = Math.round(ld.computedHeight);
  }
}

function resolveItemCross(
  item: FlexItem,
  parentStyle: IStyle,
  crossSize: number,
  isRow: boolean,
): number {
  if (parentStyle.alignItems === "stretch") {
    const stretchedSize = crossSize - item.crossMargin;
    const crossMin = isRow ? item.style.minHeight : item.style.minWidth;
    const crossMax = isRow ? item.style.maxHeight : item.style.maxWidth;
    return applyConstraints(stretchedSize, crossMin, crossMax);
  }
  return item.crossSize;
}

// ── Flex wrap layout ──

function arrangeFlexWrap(
  children: ElementWithLayout[],
  style: IStyle,
  contentX: number,
  contentY: number,
  mainSize: number,
  crossSize: number,
  isRow: boolean,
): void {
  // Split children into lines
  const lines: ElementWithLayout[][] = [];
  let currentLine: ElementWithLayout[] = [];
  let lineMainUsed = 0;

  for (const child of children) {
    const childStyle = getStyle(child);
    const childLd = getLayoutData(child);
    const childMainSize = isRow ? childLd.desiredWidth : childLd.desiredHeight;
    const childMainMargin = isRow ? marginH(childStyle) : marginV(childStyle);
    const itemMain = childMainSize + childMainMargin;

    const gapExtra = currentLine.length > 0 ? style.gap : 0;

    if (
      currentLine.length > 0 &&
      lineMainUsed + gapExtra + itemMain > mainSize
    ) {
      lines.push(currentLine);
      currentLine = [child];
      lineMainUsed = itemMain;
    } else {
      currentLine.push(child);
      lineMainUsed += gapExtra + itemMain;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // Arrange each line
  let crossOffset = 0;
  const lineCrossSize = lines.length > 0 ? crossSize / lines.length : crossSize;

  for (const line of lines) {
    arrangeFlexLine(
      line,
      style,
      isRow ? contentX : contentX + crossOffset,
      isRow ? contentY + crossOffset : contentY,
      mainSize,
      lineCrossSize,
      isRow,
    );
    crossOffset += lineCrossSize;
  }
}

// ── Anchor layout ──

function arrangeAnchor(
  child: ElementWithLayout,
  style: IStyle,
  contentX: number,
  contentY: number,
  contentW: number,
  contentH: number,
): void {
  const ld = getLayoutData(child);

  const marginTop = style.margin[0];
  const marginRight = style.margin[1];
  const marginBottom = style.margin[2];
  const marginLeft = style.margin[3];

  // Resolve anchor values
  const hasTop = style.top !== undefined;
  const hasBottom = style.bottom !== undefined;
  const hasLeft = style.left !== undefined;
  const hasRight = style.right !== undefined;

  const topVal = hasTop ? resolveUnit(style.top, contentH, 0) + marginTop : 0;
  const bottomVal = hasBottom
    ? resolveUnit(style.bottom, contentH, 0) + marginBottom
    : 0;
  const leftVal = hasLeft
    ? resolveUnit(style.left, contentW, 0) + marginLeft
    : 0;
  const rightVal = hasRight
    ? resolveUnit(style.right, contentW, 0) + marginRight
    : 0;

  // Horizontal
  if (hasLeft && hasRight) {
    // Stretch
    ld.computedX = contentX + leftVal;
    ld.computedWidth = contentW - leftVal - rightVal;
  } else if (hasLeft) {
    ld.computedX = contentX + leftVal;
    ld.computedWidth = resolveUnit(style.width, contentW, ld.desiredWidth);
  } else if (hasRight) {
    ld.computedWidth = resolveUnit(style.width, contentW, ld.desiredWidth);
    ld.computedX = contentX + contentW - rightVal - ld.computedWidth;
  } else {
    ld.computedX = contentX;
    ld.computedWidth = resolveUnit(style.width, contentW, ld.desiredWidth);
  }

  // Vertical
  if (hasTop && hasBottom) {
    // Stretch
    ld.computedY = contentY + topVal;
    ld.computedHeight = contentH - topVal - bottomVal;
  } else if (hasTop) {
    ld.computedY = contentY + topVal;
    ld.computedHeight = resolveUnit(style.height, contentH, ld.desiredHeight);
  } else if (hasBottom) {
    ld.computedHeight = resolveUnit(style.height, contentH, ld.desiredHeight);
    ld.computedY = contentY + contentH - bottomVal - ld.computedHeight;
  } else {
    ld.computedY = contentY;
    ld.computedHeight = resolveUnit(style.height, contentH, ld.desiredHeight);
  }

  // Apply constraints
  ld.computedWidth = applyConstraints(
    ld.computedWidth,
    style.minWidth,
    style.maxWidth,
  );
  ld.computedHeight = applyConstraints(
    ld.computedHeight,
    style.minHeight,
    style.maxHeight,
  );

  // Integer snapping
  ld.computedX = Math.round(ld.computedX);
  ld.computedY = Math.round(ld.computedY);
  ld.computedWidth = Math.round(ld.computedWidth);
  ld.computedHeight = Math.round(ld.computedHeight);
}

// ── Apply layout data to element ──

function applyLayout(
  child: ElementWithLayout,
  ld: LayoutData,
  _parent: ElementWithLayout,
): void {
  child.x = ld.computedX;
  child.y = ld.computedY;
  child.width = ld.computedWidth;
  child.height = ld.computedHeight;
}
