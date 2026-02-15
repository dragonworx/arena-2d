/**
 * Interaction Utils
 *
 * Helpers for normalizing pointer events and coordinate spaces.
 */

/**
 * Resolves a pointer event's position relative to the canvas internal coordinate system.
 * Handles CSS scaling (style width != internal width) and bounding rect offsets.
 *
 * @param event - The DOM MouseEvent or TouchEvent.
 * @param canvas - The target HTMLCanvasElement.
 * @returns {x, y} in the canvas's internal coordinate space.
 */
export function resolvePointerPosition(
  event: MouseEvent | TouchEvent,
  canvas: HTMLCanvasElement,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();

  // Calculate scaling factor between CSS pixels and internal canvas pixels
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // Extract client coordinates
  let clientX = 0;
  let clientY = 0;

  if (window.TouchEvent && event instanceof TouchEvent) {
    if (event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if (event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    }
  } else if (event instanceof MouseEvent) {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  // Map to internal coordinates
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}
