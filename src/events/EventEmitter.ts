export interface IEventEmitter {
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  on(event: string, handler: (e: any) => void): void;
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  off(event: string, handler: (e: any) => void): void;
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  once(event: string, handler: (e: any) => void): void;
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  emit(event: string, e: any): void;
}

export class EventEmitter implements IEventEmitter {
  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  private _events: Map<string, Array<(e: any) => void>> = new Map();

  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  on(event: string, handler: (e: any) => void): void {
    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    this._events.get(event)?.push(handler);
  }

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

  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  once(event: string, handler: (e: any) => void): void {
    // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
    const wrapper = (e: any) => {
      this.off(event, wrapper);
      handler(e);
    };
    this.on(event, wrapper);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Payload is generic
  emit(event: string, e: any): void {
    const handlers = this._events.get(event);
    if (!handlers) return;

    // Create a copy to ensure safety
    for (const handler of [...handlers]) {
      handler(e);
    }
  }
}
