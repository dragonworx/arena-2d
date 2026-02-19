import type { Channel } from "./Channel";

/**
 * A Clip acts as a container for multiple property channels.
 * It represents a reusable animation definition (e.g. "WalkCycle").
 */
export class Clip {
  /** Map of property name -> Channel */
  // biome-ignore lint/suspicious/noExplicitAny: Channels can be of any type
  readonly channels: Map<string, Channel<any>> = new Map();

  constructor(public name: string) {}

  // biome-ignore lint/suspicious/noExplicitAny: Channels can be of any type
  addChannel(property: string, channel: Channel<any>): void {
    this.channels.set(property, channel);
  }

  get duration(): number {
    let max = 0;
    for (const channel of this.channels.values()) {
      max = Math.max(max, channel.duration);
    }
    return max;
  }

  /**
   * Evaluate all channels at a given time and return a property bag.
   * Useful for debugging or immediate sampling.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Returns keyed object
  sample(time: number): Record<string, any> {
    // biome-ignore lint/suspicious/noExplicitAny: Result object
    const result: Record<string, any> = {};
    for (const [prop, channel] of this.channels) {
      result[prop] = channel.evaluate(time);
    }
    return result;
  }
}
