/**
 * DragManager — Handles drag and drop interactions.
 *
 * SPEC: §9.1 (Drag & Drop System)
 */

import type { IElement } from "../core/Element";
import { computeAABB } from "../math/aabb";
import { doPolygonsIntersect, getGlobalQuad } from "../math/collision";
import { multiply } from "../math/matrix";
import type { InteractionManager } from "./InteractionManager"; // Circular dep potentially, use loose type or interface?
import type { IPointerEvent } from "./InteractionManager";

export interface IDragEvent {
  type:
    | "dragstart"
    | "dragmove"
    | "dragend"
    | "dragenter"
    | "dragleave"
    | "drop";
  target: IElement;
  currentItem: IElement; // The element being dragged
  relatedTarget?: IElement; // The drop target or dragged element depending on context
  sceneX: number;
  sceneY: number;
  dx: number;
  dy: number;
  originalEvent: IPointerEvent;
}

/**
 * Manages drag and drop interactions for elements.
 * Detects draggable elements, tracks pointer movement, and emits drag events
 * with proper target and drop target tracking.
 */
export class DragManager {
  /** Reference to the interaction manager. */
  // biome-ignore lint/suspicious/noExplicitAny: avoid circular dependency in type for now
  private _interactionManager: any;
  /** The element currently being dragged. */
  private _dragTarget: IElement | null = null;
  /** Whether a drag operation is currently active. */
  private _isDragging = false;
  /** X coordinate where the drag started. */
  private _dragStartX = 0;
  /** Y coordinate where the drag started. */
  private _dragStartY = 0;
  /** Last recorded scene X coordinate. */
  private _lastSceneX = 0;
  /** Last recorded scene Y coordinate. */
  private _lastSceneY = 0;
  /** The current drop target element. */
  private _dropTarget: IElement | null = null;

  /** Minimum distance in pixels to initiate a drag. */
  private static readonly DRAG_THRESHOLD = 5;

  /**
   * Creates a new DragManager.
   * @param interactionManager - The interaction manager instance.
   */
  constructor(interactionManager: any) {
    this._interactionManager = interactionManager;
  }

  /**
   * Handles pointer down event, identifying potential drag target.
   * @param event - The pointer event.
   * @returns True if a draggable element was identified.
   */
  handlePointerDown(event: IPointerEvent): boolean {
    let current: IElement | null = event.target;
    while (current) {
      if (current.draggable && current.interactive) {
        this._dragTarget = current;
        this._dragStartX = event.sceneX;
        this._dragStartY = event.sceneY;
        this._lastSceneX = event.sceneX;
        this._lastSceneY = event.sceneY;
        this._isDragging = false;
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Handles pointer move event, tracking drag movement.
   * @param event - The pointer event.
   */
  handlePointerMove(event: IPointerEvent): void {
    if (!this._dragTarget) return;

    if (!this._isDragging) {
      const dx = event.sceneX - this._dragStartX;
      const dy = event.sceneY - this._dragStartY;
      if (Math.hypot(dx, dy) > DragManager.DRAG_THRESHOLD) {
        this._startDrag(event);
      }
    }

    if (this._isDragging) {
      this._updateDrag(event);
    }
  }

  /**
   * Handles pointer up event, completing the drag operation.
   * @param event - The pointer event.
   */
  handlePointerUp(event: IPointerEvent): void {
    if (this._isDragging) {
      this._endDrag(event);
    }
    this._cleanup();
  }

  /**
   * Initiates a drag operation.
   * @private
   */
  private _startDrag(event: IPointerEvent): void {
    if (!this._dragTarget) return;

    this._isDragging = true;

    // Emit dragstart
    this._emit(this._dragTarget, "dragstart", event);
  }

  /**
   * Updates drag movement and checks for drop target.
   * @private
   */
  private _updateDrag(event: IPointerEvent): void {
    if (!this._dragTarget) return;

    const dx = event.sceneX - this._lastSceneX;
    const dy = event.sceneY - this._lastSceneY;

    this._lastSceneX = event.sceneX;
    this._lastSceneY = event.sceneY;

    let moveX = dx;
    let moveY = dy;

    // Constraints
    if (this._dragTarget.dragConstraint === "x") {
      moveY = 0;
    } else if (this._dragTarget.dragConstraint === "y") {
      moveX = 0;
    }

    // Move the element
    // Note: We simply add the delta.
    if (this._dragTarget.parent) {
      this._dragTarget.x += moveX;
      this._dragTarget.y += moveY;
    }

    this._emit(this._dragTarget, "dragmove", event, moveX, moveY);

    // Drop target detection
    this._checkDropTarget(event);
  }

  /**
   * Detects and updates the current drop target.
   * @private
   */
  private _checkDropTarget(event: IPointerEvent): void {
    if (!this._dragTarget) return;

    // Constraint check handled above

    // Force update of the dragged element's matrices so AABB is accurate for this frame
    this._dragTarget.updateLocalMatrix();

    if (this._dragTarget.parent && "worldMatrix" in this._dragTarget.parent) {
      // We assume parent's worldMatrix is up-to-date from the last update pass
      // or hasn't changed. If parent moves *during* the drag (e.g. auto-scroll),
      // we might need to update parent too. For now, just update self relative to parent.
      // biome-ignore lint/suspicious/noExplicitAny: loose typing for now
      const parent = this._dragTarget.parent as any;
      this._dragTarget.worldMatrix = multiply(
        parent.worldMatrix,
        this._dragTarget.localMatrix,
      );
    } else {
      this._dragTarget.worldMatrix = new Float32Array(
        this._dragTarget.localMatrix,
      );
    }

    // Use AABB intersection for drag target detection
    // Calculate current world AABB of the dragged element
    const aabb = computeAABB(
      {
        x: 0,
        y: 0,
        width: this._dragTarget.width,
        height: this._dragTarget.height,
      },
      this._dragTarget.worldMatrix,
    );

    const hit = this._interactionManager.hitTestAABB(
      aabb,
      this._dragTarget,
      (el: IElement) => {
        // Filter: element must be a potential drop target
        // i.e., it must listen for 'dragenter' or 'drop'
        // biome-ignore lint/suspicious/noExplicitAny: need access to listenerCount
        const emitter = el as any;
        const isTarget =
          emitter.listenerCount &&
          (emitter.listenerCount("dragenter") > 0 ||
            emitter.listenerCount("drop") > 0);

        if (!isTarget) return false;

        // If using Quad mode, perform precise check
        if (this._dragTarget?.dragHitTestMode === "quad") {
          // Get quads for both elements
          const dragQuad = getGlobalQuad(
            {
              x: 0,
              y: 0,
              width: this._dragTarget.width,
              height: this._dragTarget.height,
            },
            this._dragTarget.worldMatrix,
          );

          const targetQuad = getGlobalQuad(
            { x: 0, y: 0, width: el.width, height: el.height },
            el.worldMatrix,
          );

          return doPolygonsIntersect(dragQuad, targetQuad);
        }

        return true;
      },
    );

    if (hit !== this._dropTarget) {
      if (this._dropTarget && this._dragTarget) {
        this._emit(
          this._dropTarget,
          "dragleave",
          event,
          0,
          0,
          this._dragTarget,
        );
      }
      this._dropTarget = hit;
      if (this._dropTarget && this._dragTarget) {
        this._emit(
          this._dropTarget,
          "dragenter",
          event,
          0,
          0,
          this._dragTarget,
        );
      }
    }
  }

  /**
   * Ends the drag operation and emits final events.
   * @private
   */
  private _endDrag(event: IPointerEvent): void {
    if (!this._dragTarget) return;

    this._emit(this._dragTarget, "dragend", event);

    if (this._dropTarget) {
      this._emit(this._dropTarget, "drop", event, 0, 0, this._dragTarget);
      // Also emit 'drop' on the dragged element? SPEC says "Releasing a drag over a drop target fires `drop`."
      // usually drop event is on the drop target.
    }
  }

  /**
   * Cleans up drag state after operation completes.
   * @private
   */
  private _cleanup(): void {
    this._dragTarget = null;
    this._isDragging = false;
    this._dropTarget = null;
  }

  /**
   * Emits a drag event to the target element.
   * @private
   * @param target - The element to emit the event on.
   * @param type - The event type (dragstart, dragmove, etc.).
   * @param pointerEvent - The original pointer event.
   * @param dx - Horizontal movement delta.
   * @param dy - Vertical movement delta.
   * @param relatedTarget - Optional related element (drop target or dragged item).
   */
  private _emit(
    target: IElement,
    type: string,
    pointerEvent: IPointerEvent,
    dx = 0,
    dy = 0,
    relatedTarget?: IElement,
  ): void {
    if (!this._dragTarget) return;

    const event: IDragEvent = {
      // biome-ignore lint/suspicious/noExplicitAny: convenient cast
      type: type as any,
      target,
      currentItem: this._dragTarget,
      relatedTarget,
      sceneX: pointerEvent.sceneX,
      sceneY: pointerEvent.sceneY,
      dx,
      dy,
      originalEvent: pointerEvent,
    };

    if ("emit" in target) {
      // biome-ignore lint/suspicious/noExplicitAny: generic emitter
      (target as any).emit(type, event);
    }
  }
}
