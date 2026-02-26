/**
 * Global configuration and state for the Arena-2D library.
 */
export const Arena2D = {
  /**
   * Enables debug mode.
   * When true:
   * - Performance warnings are logged to the console (e.g., high child counts without caching).
   * - State validation warnings are logged (e.g., NaN properties, alpha out of bounds).
   * - Memory leak detection via FinalizationRegistry is activated.
   */
  debug: false,

  /**
   * Internal configuration constants.
   */
  config: {
    /**
     * Threshold for child count in a container before a performance warning is issued
     * if cacheAsBitmap is not enabled.
     */
    perfWarningChildThreshold: 500,
  },
};
