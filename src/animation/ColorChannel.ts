import { Channel } from "./Channel";

/**
 * Channel for color values.
 * Interpolates between color strings (hex, rgb, rgba).
 */
export class ColorChannel extends Channel<string> {
  // Cache parsed values to avoid repeated parsing during interpolation
  // Keyframe.value is the string, we need a way to store the parsed version.
  // We'll parse on the fly and rely on the browser/engine to be fast enough for now,
  // or we could extend Keyframe<T> to hold auxiliary data.
  // For this tasks scope, simple parsing in interpolate is sufficient,
  // but a production version would pre-parse.

  // Optimization: use a small cache for the last parsed value?
  // Let's implement the requirements: "Cache parsed color values per keyframe".
  // To do this cleanly without changing the base Channel class too much,
  // we can maintain a parallel cache or parsing map.
  // Given we control addKeyframe, we can just parse there.

  private _parsedMap = new Map<string, [number, number, number, number]>();

  /*
   * Override addKeyframe to pre-parse.
   */
  addKeyframe(time: number, value: string, ease?: (t: number) => number): void {
    super.addKeyframe(time, value, ease);
    if (!this._parsedMap.has(value)) {
      this._parsedMap.set(value, this.parseColor(value));
    }
  }

  addKeyframes(
    frames: { time: number; value: string; ease?: (t: number) => number }[],
  ): void {
    super.addKeyframes(frames);
    for (const frame of frames) {
      if (!this._parsedMap.has(frame.value)) {
        this._parsedMap.set(frame.value, this.parseColor(frame.value));
      }
    }
  }

  protected interpolate(v1: string, v2: string, t: number): string {
    const c1 = this._parsedMap.get(v1) || this.parseColor(v1);
    const c2 = this._parsedMap.get(v2) || this.parseColor(v2);

    const result: [number, number, number, number] = [
      c1[0] + (c2[0] - c1[0]) * t,
      c1[1] + (c2[1] - c1[1]) * t,
      c1[2] + (c2[2] - c1[2]) * t,
      c1[3] + (c2[3] - c1[3]) * t,
    ];

    return this.colorToString(result);
  }

  /**
   * Parse a color string into [r, g, b, a].
   * Supports: #RGB, #RRGGBB, #RRGGBBAA, rgb(r,g,b), rgba(r,g,b,a)
   */
  parseColor(color: string): [number, number, number, number] {
    const c = color.trim().toLowerCase();

    // Hex
    if (c.startsWith("#")) {
      const hex = c.substring(1);
      if (hex.length === 3) {
        // #RGB
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        return [r, g, b, 1];
      }
      if (hex.length === 4) {
        // #RGBA
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        const a = parseInt(hex[3] + hex[3], 16) / 255;
        return [r, g, b, a];
      }
      if (hex.length === 6) {
        // #RRGGBB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return [r, g, b, 1];
      }
      if (hex.length === 8) {
        // #RRGGBBAA
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const a = parseInt(hex.substring(6, 8), 16) / 255;
        return [r, g, b, a];
      }
    }

    // rgb / rgba
    if (c.startsWith("rgb")) {
      const parts = c.match(/[\d.]+/g);
      if (parts) {
        const r = parseFloat(parts[0]);
        const g = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        const a = parts[3] ? parseFloat(parts[3]) : 1;
        return [r, g, b, a];
      }
    }

    // Fallback black
    return [0, 0, 0, 1];
  }

  /**
   * Convert [r, g, b, a] to "rgba(r, g, b, a)" string.
   */
  colorToString(rgba: [number, number, number, number]): string {
    const r = Math.round(rgba[0]);
    const g = Math.round(rgba[1]);
    const b = Math.round(rgba[2]);
    // Allow float alpha, clamp to 0-1
    const a = Math.max(0, Math.min(1, rgba[3]));
    // Compact representation if a=1 ? No, standard rgba is fine
    // Using string interpolation
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}
