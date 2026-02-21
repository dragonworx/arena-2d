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
  private _events: Map<string, Array<(e: any) => void>> = new Map();

  /** @inheritdoc */
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  on(event: string, handler: (e: any) => void): void {
    if (!this._events.has(event)) {
      this._events.set(event, []);
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
      handlers.splice(index, 1);
      if (handlers.length === 0) {
        this._events.delete(event);
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

    // Create a copy to ensure safety
    for (const handler of [...handlers]) {
      handler(e);
    }
  }

  /** @inheritdoc */
  removeAllListeners(): void {
    this._events.clear();
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
