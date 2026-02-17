/**
 * DragManager — Handles drag and drop interactions.
 *
 * SPEC: §9.1 (Drag & Drop System)
 */

import type { IElement } from "../core/Element";
import { computeAABB } from "../math/aabb";
import type { InteractionManager } from "./InteractionManager"; // Circular dep potentially, use loose type or interface?
import type { IPointerEvent } from "./InteractionManager";
import { multiply } from "../math/matrix";

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

export class DragManager {
  // biome-ignore lint/suspicious/noExplicitAny: avoid circular dependency in type for now
  private _interactionManager: any;
  private _dragTarget: IElement | null = null;
  private _isDragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _lastSceneX = 0;
  private _lastSceneY = 0;
  private _dropTarget: IElement | null = null;

  // Threshold to start dragging (pixels)
  private static readonly DRAG_THRESHOLD = 5;

  // biome-ignore lint/suspicious/noExplicitAny: avoid circular dependency in type for now
  constructor(interactionManager: any) {
    this._interactionManager = interactionManager;
  }

  /**
   * Called by InteractionManager when a pointer down occurs.
   * Returns true if we successfully identified a potential drag target.
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

  handlePointerUp(event: IPointerEvent): void {
    if (this._isDragging) {
      this._endDrag(event);
    }
    this._cleanup();
  }

  private _startDrag(event: IPointerEvent): void {
    if (!this._dragTarget) return;

    this._isDragging = true;

    // Emit dragstart
    this._emit(this._dragTarget, "dragstart", event);
  }

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
      this._dragTarget.worldMatrix = new Float32Array(this._dragTarget.localMatrix);
    }

    // Use AABB intersection for drag target detection
    // Calculate current world AABB of the dragged element
    const aabb = computeAABB(
      { x: 0, y: 0, width: this._dragTarget.width, height: this._dragTarget.height },
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
        return (
          emitter.listenerCount &&
          (emitter.listenerCount("dragenter") > 0 ||
            emitter.listenerCount("drop") > 0)
        );
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

  private _endDrag(event: IPointerEvent): void {
    if (!this._dragTarget) return;

    this._emit(this._dragTarget, "dragend", event);

    if (this._dropTarget) {
      this._emit(this._dropTarget, "drop", event, 0, 0, this._dragTarget);
      // Also emit 'drop' on the dragged element? SPEC says "Releasing a drag over a drop target fires `drop`."
      // usually drop event is on the drop target.
    }
  }

  private _cleanup(): void {
    this._dragTarget = null;
    this._isDragging = false;
    this._dropTarget = null;
  }

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
