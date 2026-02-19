/**
 * Interface for an adapter that applies animation values to a target object.
 * Decouples the animation system from the object type (Element, plain object, etc).
 */
export interface IAdapter {
  // biome-ignore lint/suspicious/noExplicitAny: Value can be any supported channel type
  setValue(property: string, value: any): void;
  // biome-ignore lint/suspicious/noExplicitAny: Value can be any supported channel type
  getValue(property: string): any;
}
