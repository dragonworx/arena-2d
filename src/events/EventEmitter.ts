/**
 * Event emitter interface for pub/sub event handling.
 * @module Events
 */
export interface IEventEmitter {
  /**
   * Registers a handler for an event that fires every time the event occurs.
   * @param event - The event name.
   * @param handler - The handler function to invoke.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  on(event: string, handler: (e: any) => void): void;

  /**
   * Unregisters a handler from an event.
   * @param event - The event name.
   * @param handler - The handler function to remove.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  off(event: string, handler: (e: any) => void): void;

  /**
   * Registers a handler for an event that fires only once.
   * @param event - The event name.
   * @param handler - The handler function to invoke.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  once(event: string, handler: (e: any) => void): void;

  /**
   * Emits an event, invoking all registered handlers.
   * @param event - The event name.
   * @param e - The event data.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  emit(event: string, e: any): void;

  /**
   * Removes all event listeners.
   */
  removeAllListeners(): void;
}

/**
 * Concrete implementation of an event emitter.
 * Implements a simple pub/sub pattern for event-driven architecture.
 *
 * @example
 * ```typescript
 * const emitter = new EventEmitter();
 * emitter.on('click', (e) => console.log('clicked', e));
 * emitter.emit('click', { x: 10, y: 20 });
 * ```
 */
export class EventEmitter implements IEventEmitter {
  /** Map of event names to their registered handlers. */
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  private _events: Map<string, Array<((e: any) => void) | null>> = new Map();
  /** Track null entries count for periodic compaction */
  private _nullCounts: Map<string, number> = new Map();

  /** @inheritdoc */
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  on(event: string, handler: (e: any) => void): void {
    if (!this._events.has(event)) {
      this._events.set(event, []);
      this._nullCounts.set(event, 0);
    }
    this._events.get(event)?.push(handler);
  }

  /** @inheritdoc */
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  off(event: string, handler: (e: any) => void): void {
    const handlers = this._events.get(event);
    if (!handlers) return;
    const index = handlers.indexOf(handler);

    if (index !== -1) {
      // Mark as null instead of splicing to allow safe iteration
      handlers[index] = null;
      const nullCount = (this._nullCounts.get(event) || 0) + 1;
      this._nullCounts.set(event, nullCount);

      // Compact array if too many nulls (more than half the array)
      if (nullCount > handlers.length / 2) {
        const compacted = handlers.filter((h) => h !== null);
        if (compacted.length === 0) {
          this._events.delete(event);
          this._nullCounts.delete(event);
        } else {
          handlers.length = 0;
          for (const h of compacted) {
            handlers.push(h);
          }
          this._nullCounts.set(event, 0);
        }
      }
    }
  }

  /** @inheritdoc */
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  once(event: string, handler: (e: any) => void): void {
    // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
    const wrapper = (e: any) => {
      this.off(event, wrapper);
      handler(e);
    };
    this.on(event, wrapper);
  }

  /** @inheritdoc */
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  emit(event: string, e: any): void {
    const handlers = this._events.get(event);
    if (!handlers) return;

    // Capture the current length to avoid calling handlers added during emit
    const len = handlers.length;
    for (let i = 0; i < len; i++) {
      const handler = handlers[i];
      if (handler) {
        handler(e);
      }
    }
  }

  /** @inheritdoc */
  removeAllListeners(): void {
    this._events.clear();
    this._nullCounts.clear();
  }

  /**
   * Gets the count of listeners for a specific event.
   * @param event - The event name.
   * @returns The number of listeners.
   */
  listenerCount(event: string): number {
    return this._events.get(event)?.length || 0;
  }
}
