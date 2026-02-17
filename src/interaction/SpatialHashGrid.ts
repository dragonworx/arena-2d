/**
 * SpatialHashGrid — 2D spatial partitioning for broad-phase hit-testing.
 *
 * Elements are registered in every cell their world AABB overlaps.
 * Querying a point returns all elements in the cell at that position.
 *
 * SPEC: §5.2 (SpatialHashGrid)
 */

import type { IRect } from "../math/aabb";

export interface ISpatialEntry {
  readonly id: string;
  aabb: IRect;
}

/**
 * Encode a cell key from grid coordinates.
 */
function cellKey(cx: number, cy: number): number {
  // Use a Cantor-pairing-like encoding that handles negative coordinates
  // Shift coordinates to be positive by using a large offset
  const a = cx + 0x7fff;
  const b = cy + 0x7fff;
  return (a << 16) | (b & 0xffff);
}

export class SpatialHashGrid {
  private _cellSize: number;
  private _inverseCellSize: number;
  private _cells = new Map<number, Set<ISpatialEntry>>();
  private _entryToCells = new Map<ISpatialEntry, number[]>();

  constructor(cellSize = 128) {
    this._cellSize = cellSize;
    this._inverseCellSize = 1 / cellSize;
  }

  get cellSize(): number {
    return this._cellSize;
  }

  /**
   * Insert an entry into all cells its AABB overlaps.
   */
  insert(entry: ISpatialEntry): void {
    // Remove first if already present (re-insert)
    if (this._entryToCells.has(entry)) {
      this.remove(entry);
    }

    const { x, y, width, height } = entry.aabb;
    const minCX = Math.floor(x * this._inverseCellSize);
    const minCY = Math.floor(y * this._inverseCellSize);
    const maxCX = Math.floor((x + width) * this._inverseCellSize);
    const maxCY = Math.floor((y + height) * this._inverseCellSize);

    const keys: number[] = [];

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const key = cellKey(cx, cy);
        keys.push(key);

        let cell = this._cells.get(key);
        if (!cell) {
          cell = new Set();
          this._cells.set(key, cell);
        }
        cell.add(entry);
      }
    }

    this._entryToCells.set(entry, keys);
  }

  /**
   * Remove an entry from all cells.
   */
  remove(entry: ISpatialEntry): void {
    const keys = this._entryToCells.get(entry);
    if (!keys) return;

    for (const key of keys) {
      const cell = this._cells.get(key);
      if (cell) {
        cell.delete(entry);
        if (cell.size === 0) {
          this._cells.delete(key);
        }
      }
    }

    this._entryToCells.delete(entry);
  }

  /**
   * Query all entries whose cells contain the given point.
   */
  query(px: number, py: number): ISpatialEntry[] {
    const cx = Math.floor(px * this._inverseCellSize);
    const cy = Math.floor(py * this._inverseCellSize);
    const key = cellKey(cx, cy);

    const cell = this._cells.get(key);
    if (!cell) return [];

    return Array.from(cell);
  }

  /**
   * Query all entries whose cells overlap the given AABB.
   */
  queryAABB(aabb: IRect): ISpatialEntry[] {
    const { x, y, width, height } = aabb;
    const minCX = Math.floor(x * this._inverseCellSize);
    const minCY = Math.floor(y * this._inverseCellSize);
    const maxCX = Math.floor((x + width) * this._inverseCellSize);
    const maxCY = Math.floor((y + height) * this._inverseCellSize);

    const result = new Set<ISpatialEntry>();

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const key = cellKey(cx, cy);
        const cell = this._cells.get(key);
        if (cell) {
          for (const entry of cell) {
            result.add(entry);
          }
        }
      }
    }

    return Array.from(result);
  }

  /**
   * Clear all entries from the grid.
   */
  clear(): void {
    this._cells.clear();
    this._entryToCells.clear();
  }

  /**
   * Returns true if the entry is currently tracked.
   */
  has(entry: ISpatialEntry): boolean {
    return this._entryToCells.has(entry);
  }

  /**
   * Returns the total number of tracked entries.
   */
  get size(): number {
    return this._entryToCells.size;
  }
}
