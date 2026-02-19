/**
 * Defines how an animation value is applied to a property.
 */
export enum AnimationBlendMode {
  /**
   * The animation value replaces the current value.
   * New animations with this mode cancel previous animations on the same property.
   */
  Override = "override",

  /**
   * The animation value is added to the base value.
   * Multiple additive animations can run simultaneously.
   */
  Additive = "additive",
}
