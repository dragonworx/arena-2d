
/**
 * Registry to track active animations and handle conflicts.
 * When a new animation starts on a property, it cancels any existing animation
 * on the same property for the same adapter.
 *
 * SPEC: §13.3 Conflict Resolution
 */
import { AnimationBlendMode } from "./AnimationBlendMode";
import type { IAdapter } from "./adapter/IAdapter";
import type { Animator } from "./Animator";

interface PropertyTrack {
  baseValue: number;
  override: number | null;
  additive: number;
  dirty: boolean;
}

/**
 * Registry to track active animations, handle conflicts, and blend values.
 *
 * It acts as the central mixer for animations:
 * 1. Restores base values at the start of the frame.
 * 2. Accumulates values from all active animators during the update phase.
 * 3. Flushes the final blended values to the adapters at the end of the update phase.
 *
 * SPEC: §13.3 Conflict Resolution & Additive Animation
 */
export class AnimationRegistry {
  // adapter -> (property -> Track)
  private _tracks: Map<IAdapter, Map<string, PropertyTrack>> = new Map();

  // adapter -> (property -> Set<Animator>)
  // Used for conflict resolution (Override mode cancels others)
  private _activeAnimators: Map<IAdapter, Map<string, Set<Animator>>> =
    new Map();

  /**
   * Register an animator.
   * Handles conflict resolution: if mode is Override, cancels existing Override animators.
   */
  register(
    adapter: IAdapter,
    properties: string[],
    animator: Animator,
    mode: AnimationBlendMode,
  ): void {
    let adapterMap = this._activeAnimators.get(adapter);
    if (!adapterMap) {
      adapterMap = new Map();
      this._activeAnimators.set(adapter, adapterMap);
    }

    for (const prop of properties) {
      let animators = adapterMap.get(prop);
      if (!animators) {
        animators = new Set();
        adapterMap.set(prop, animators);
      }

      // If this is an Override animation, it cancels other Override animations
      // Additive animations can coexist with anything.
      if (mode === AnimationBlendMode.Override) {
        // Cancel other Override animators
        for (const existing of animators) {
          if (existing !== animator && existing.blendMode === AnimationBlendMode.Override) {
             existing.cancel();
          }
        }
      }

      animators.add(animator);
    }
  }

  unregister(
    adapter: IAdapter,
    properties: string[],
    animator: Animator,
  ): void {
    const adapterMap = this._activeAnimators.get(adapter);
    if (!adapterMap) return;

    for (const prop of properties) {
      const animators = adapterMap.get(prop);
      if (animators) {
        animators.delete(animator);
        if (animators.size === 0) {
          adapterMap.delete(prop);
        }
      }
    }

    if (adapterMap.size === 0) {
      this._activeAnimators.delete(adapter);
    }
  }

  /**
   * Accumulate a value for a property.
   * Called by Animator during the update phase.
   */
  accumulate(
    adapter: IAdapter,
    prop: string,
    value: number | string,
    mode: AnimationBlendMode,
  ): void {
    // Only numeric values support true additive blending for now.
    // Strings/Colors treat Additive as Override (last one wins) effectively,
    // or we could implement specific adders later.
    const isNumber = typeof value === "number";

    let adapterTracks = this._tracks.get(adapter);
    if (!adapterTracks) {
      adapterTracks = new Map();
      this._tracks.set(adapter, adapterTracks);
    }

    let track = adapterTracks.get(prop);
    if (!track) {
      // First time we touch this property this frame.
      // Capture the BASE value from the adapter.
      // NOTE: This assumes restore() was called at start of frame,
      // so adapter.getValue() returns the "clean" state (user set value).
      track = {
        baseValue: 0, // Placeholder, will set below
        override: null,
        additive: 0,
        dirty: true,
      };

      const current = adapter.getValue(prop);
       // We only support additive math on numbers.
       // For non-numbers, baseValue is stored but unused for additive math.
      if (typeof current === "number") {
          track.baseValue = current;
      }
      
      adapterTracks.set(prop, track);
    }

    if (mode === AnimationBlendMode.Override) {
      // For override, we just overwrite.
      // If multiple overrides run in one frame, the last one wins.
      track.override = value as number; // Cast for now, non-numbers handled by direct override logic?
      // Actually, for strings/colors, we can't easily use this Record<number> structure.
      // Let's generalize 'override' to any type.
    } else if (mode === AnimationBlendMode.Additive && isNumber) {
      track.additive += value as number;
    }
    
    // Hack: We need to store non-numeric override values too.
    // The Track interface above was typed as `number`. Let's fix it implicitly by using `any`.
    // Ideally we'd have separate tracks or generic types.
    if (mode === AnimationBlendMode.Override) {
        (track as any).override = value;
    }
  }

  /**
   * Restore all modified properties to their base values.
   * Called at the START of the frame (before Timeline update).
   */
  restore(): void {
    for (const [adapter, adapterTracks] of this._tracks) {
      for (const [prop, track] of adapterTracks) {
        // We restore the 'baseValue' we captured last frame.
        // This ensures that when we call getValue() next, we get the
        // user's set value, not the animated value from last frame.
        
        // Optimization: Check if we actually need to write?
        // Yes, always write to clear the animation effects.
        adapter.setValue(prop, track.baseValue);
      }
      // Clear tracks for the next frame
      adapterTracks.clear();
    }
    // We don't clear the _activeAnimators map, that's persistent.
    // We expect accumulate() to re-populate _tracks in the upcoming update loop.
  }

  /**
   * Apply final blended values to adapters.
   * Called at the END of the frame (after Timeline update).
   */
  flush(): void {
    for (const [adapter, adapterTracks] of this._tracks) {
      for (const [prop, track] of adapterTracks) {
        let finalValue: any = track.baseValue;

        if (track.override !== null && track.override !== undefined) {
          finalValue = track.override;
        }

        // Apply additive (only if final is number)
        if (track.additive !== 0 && typeof finalValue === "number") {
          finalValue += track.additive;
        }

        adapter.setValue(prop, finalValue);
      }
    }
  }

  clear(): void {
    this._tracks.clear();
    this._activeAnimators.clear();
  }
}
