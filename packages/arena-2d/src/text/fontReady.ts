/**
 * fontReady — Utility for checking font availability.
 *
 * Uses the document.fonts API to check if a font is loaded and ready
 * for use. Provides both synchronous check and async wait.
 *
 * SPEC: §6.2 — Font Handling
 */

/**
 * Check if a font is currently available for rendering.
 *
 * @param fontFamily - The font family name (e.g., "Roboto", "Arial")
 * @param fontSize - Font size in pixels (default: 16)
 * @returns true if the font is loaded and ready
 */
export function isFontReady(fontFamily: string, fontSize = 16): boolean {
  if (typeof document === "undefined" || !document.fonts) {
    // No font API available (e.g., Node/Bun test environment)
    return false;
  }
  return document.fonts.check(`${fontSize}px ${fontFamily}`);
}

/**
 * Wait for a font to become available.
 *
 * @param fontFamily - The font family name
 * @param fontSize - Font size in pixels (default: 16)
 * @param timeout - Maximum wait time in ms (default: 3000)
 * @returns Promise that resolves to true when the font is ready, or false on timeout
 */
export async function waitForFont(
  fontFamily: string,
  fontSize = 16,
  timeout = 3000,
): Promise<boolean> {
  if (typeof document === "undefined" || !document.fonts) {
    return false;
  }

  // Already loaded?
  if (document.fonts.check(`${fontSize}px ${fontFamily}`)) {
    return true;
  }

  // Wait for font load with timeout
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), timeout);

    document.fonts.ready.then(() => {
      clearTimeout(timer);
      resolve(document.fonts.check(`${fontSize}px ${fontFamily}`));
    });
  });
}
