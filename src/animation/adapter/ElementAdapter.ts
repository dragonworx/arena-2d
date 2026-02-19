import type { IElement } from "../../core/Element";
import type { IAdapter } from "./IAdapter";

/**
 * Adapter for animating IElement properties.
 * Maps string property names to element properties.
 */
export class ElementAdapter implements IAdapter {
  constructor(private element: IElement) {}

  // biome-ignore lint/suspicious/noExplicitAny: Value type unknown at runtime
  setValue(property: string, value: any): void {
    // Direct property set.
    // In a more complex system, this might handle 'scale' -> scaleX/scaleY mapping,
    // or 'color' parsing. For now, direct mapping is sufficient for the PRD.
    // biome-ignore lint/suspicious/noExplicitAny: Element is loosely typed here for dynamic access
    (this.element as any)[property] = value;
  }
  // biome-ignore lint/suspicious/noExplicitAny: Value type unknown at runtime
  getValue(property: string): any {
    // biome-ignore lint/suspicious/noExplicitAny: Element is loosely typed here for dynamic access
    return (this.element as any)[property];
  }
}
