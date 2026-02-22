/**
 * TextInput — Editable text element with cursor, selection, clipboard, and IME support.
 *
 * Extends Text with editing capabilities per SPEC §6.3–6.4.
 * Uses a hidden 1×1 <textarea> for IME bridge and clipboard delegation.
 *
 * SPEC: §6 (ITextInput, IME bridge)
 */

import { DirtyFlags } from "../core/DirtyFlags";
import type { IKeyboardEvent } from "../interaction/InteractionManager";
import type { IArena2DContext } from "../rendering/Arena2DContext";
import { Text } from "./Text";

// ── Constants ──

const CARET_BLINK_MS = 500;
const PASSWORD_CHAR = "\u2022"; // bullet

// ── TextInput Class ──

export class TextInput extends Text {
  private _selectionStart = 0;
  private _selectionEnd = 0;
  private _isPassword = false;
  private _placeholder = "";
  private _readOnly = false;
  private _maxLength = Number.POSITIVE_INFINITY;
  private _multiline = false;
  private _filter: RegExp | ((val: string) => boolean | string) | null = null;

  // Caret blink state
  private _caretVisible = true;
  private _caretTimer: ReturnType<typeof setInterval> | null = null;

  // IME bridge
  private _textarea: HTMLTextAreaElement | null = null;
  private _isFocused = false;

  // Bound handlers for cleanup
  private _boundOnInput: ((e: Event) => void) | null = null;
  private _boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _boundOnCopy: ((e: ClipboardEvent) => void) | null = null;
  private _boundOnCut: ((e: ClipboardEvent) => void) | null = null;
  private _boundOnPaste: ((e: ClipboardEvent) => void) | null = null;
  private _boundOnCompositionStart: (() => void) | null = null;
  private _boundOnCompositionEnd: ((e: CompositionEvent) => void) | null = null;
  private _isComposing = false;
  private _isDragging = false;
  private _hasDragged = false;

  constructor(id?: string) {
    super(id);
    this.focusable = true;
    this.cursor = "text";

    // Listen for focus/blur from InteractionManager
    this.on("focus", () => this._onFocus());
    this.on("blur", () => this._onBlur());
    this.on("click", (e: { localX: number; localY: number }) =>
      this._onPointerClick(e),
    );
    this.on("dblclick", (e: { localX: number; localY: number }) =>
      this._onDoubleClick(e),
    );
    this.on("pointerdown", (e: { localX: number; localY: number }) =>
      this._onPointerDownSelection(e),
    );
    this.on("pointermove", (e: { localX: number; localY: number }) =>
      this._onPointerMoveSelection(e),
    );
    this.on("pointerup", () => this._onPointerUpSelection());
    this.on("keydown", (e: IKeyboardEvent) => this._onKeyDown(e));
  }

  // ── Properties ──

  get selectionStart(): number {
    return this._selectionStart;
  }

  set selectionStart(value: number) {
    const clamped = Math.max(0, Math.min(value, this._getTextLength()));
    if (this._selectionStart !== clamped) {
      this._selectionStart = clamped;
      this._resetCaretBlink();
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get selectionEnd(): number {
    return this._selectionEnd;
  }

  set selectionEnd(value: number) {
    const clamped = Math.max(0, Math.min(value, this._getTextLength()));
    if (this._selectionEnd !== clamped) {
      this._selectionEnd = clamped;
      this._resetCaretBlink();
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get isPassword(): boolean {
    return this._isPassword;
  }

  set isPassword(value: boolean) {
    if (this._isPassword !== value) {
      this._isPassword = value;
      this.invalidate(DirtyFlags.Layout | DirtyFlags.Visual);
    }
  }

  get placeholder(): string {
    return this._placeholder;
  }

  set placeholder(value: string) {
    if (this._placeholder !== value) {
      this._placeholder = value;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  get readOnly(): boolean {
    return this._readOnly;
  }

  set readOnly(value: boolean) {
    this._readOnly = value;
  }

  get maxLength(): number {
    return this._maxLength;
  }

  set maxLength(value: number) {
    this._maxLength = value;
  }

  get multiline(): boolean {
    return this._multiline;
  }

  set multiline(value: boolean) {
    this._multiline = value;
  }

  get filter(): RegExp | ((val: string) => boolean | string) | null {
    return this._filter;
  }

  set filter(value: RegExp | ((val: string) => boolean | string) | null) {
    this._filter = value;
  }

  // ── Selection helpers ──

  get hasSelection(): boolean {
    return this._selectionStart !== this._selectionEnd;
  }

  get selectedText(): string {
    const start = Math.min(this._selectionStart, this._selectionEnd);
    const end = Math.max(this._selectionStart, this._selectionEnd);
    return this.text.substring(start, end);
  }

  selectAll(): void {
    this._selectionStart = 0;
    this._selectionEnd = this._getTextLength();
    this.invalidate(DirtyFlags.Visual);
  }

  // ── Text override (display text for password mode) ──

  private _getDisplayText(): string {
    if (this._isPassword) {
      return PASSWORD_CHAR.repeat(this.text.length);
    }
    return this.text;
  }

  protected override _recomputeLayout(): void {
    if (this._isPassword) {
      const style = this.textStyle;
      // Use a fixed width for dots for precise caret alignment
      // 0.6 is a common rough width ratio for dots in many fonts
      const charWidth = Math.ceil(style.fontSize * 0.6);
      const text = this._getDisplayText();
      const advancements: number[] = [];
      for (let i = 0; i < text.length; i++) {
        advancements.push(i * charWidth);
      }

      this._textLayout = {
        lines: [
          {
            text,
            width: text.length * charWidth,
            advancements,
          },
        ],
        totalHeight: style.lineHeight,
      };
      this._layoutDirty = false;
    } else {
      super._recomputeLayout();
    }
  }

  private _getTextLength(): number {
    return this.text.length;
  }

  // ── Cursor position from click ──

  private _onPointerClick(e: { localX: number; localY: number }): void {
    if (this._hasDragged) return;

    const pos = this._charIndexFromLocal(e.localX, e.localY);
    this._selectionStart = pos;
    this._selectionEnd = pos;
    this._resetCaretBlink();
    this.invalidate(DirtyFlags.Visual);
  }

  private _onDoubleClick(e: { localX: number; localY: number }): void {
    const pos = this._charIndexFromLocal(e.localX, e.localY);
    const start = this._getWordBoundaryLeft(pos);
    const end = this._getWordBoundaryRight(pos);
    this._selectionStart = start;
    this._selectionEnd = end;
    this._resetCaretBlink();
    this.invalidate(DirtyFlags.Visual);
  }

  private _onPointerDownSelection(e: { localX: number; localY: number }): void {
    this._isDragging = true;
    this._hasDragged = false;
    const pos = this._charIndexFromLocal(e.localX, e.localY);
    this._selectionStart = pos;
    this._selectionEnd = pos;
    this.invalidate(DirtyFlags.Visual);
  }

  private _onPointerMoveSelection(e: { localX: number; localY: number }): void {
    if (this._isDragging) {
      this._hasDragged = true;
      const pos = this._charIndexFromLocal(e.localX, e.localY);
      this._selectionEnd = pos;
      this.invalidate(DirtyFlags.Visual);
    }
  }

  private _onPointerUpSelection(): void {
    this._isDragging = false;
  }

  /**
   * Map local coordinates to a character index in the text.
   */
  _charIndexFromLocal(localX: number, localY: number): number {
    const layout = this.textLayout;
    const style = this.textStyle;
    const lineHeight = style.lineHeight;

    // Determine which line was clicked
    let lineIdx = Math.floor(localY / lineHeight);
    lineIdx = Math.max(0, Math.min(lineIdx, layout.lines.length - 1));

    // Get the character offset at the start of this line
    let charOffset = 0;
    for (let i = 0; i < lineIdx; i++) {
      charOffset += layout.lines[i].text.length;
      // Account for the newline/space that caused the wrap
      // In the original text, line breaks mean different chars
      if (i < layout.lines.length - 1) {
        // Check if there was a newline or space between this line and next
        const origText = this._isPassword
          ? PASSWORD_CHAR.repeat(this.text.length)
          : this.text;
        const lineEndPos = charOffset;
        if (origText[lineEndPos] === "\n") {
          charOffset += 1; // skip the newline
        } else if (origText[lineEndPos] === " ") {
          charOffset += 1; // skip the space (word-wrap separator)
        }
      }
    }

    const line = layout.lines[lineIdx];
    const adv = line.advancements;

    // Compute alignment offset
    const alignOffsetX = this._alignOffsetX(
      style.textAlign,
      this.width,
      line.width,
    );

    const adjustedX = localX - alignOffsetX;

    if (adv.length === 0) return charOffset;

    // Find closest character boundary
    for (let i = 0; i < adv.length; i++) {
      const charLeft = adv[i];
      const charRight = i + 1 < adv.length ? adv[i + 1] : line.width;
      const mid = (charLeft + charRight) / 2;
      if (adjustedX < mid) {
        return charOffset + i;
      }
    }

    return charOffset + line.text.length;
  }

  // ── Focus / Blur ──

  private _onFocus(): void {
    this._isFocused = true;
    this._startCaretBlink();
    this._createTextarea();
    this.invalidate(DirtyFlags.Visual);
  }

  private _onBlur(): void {
    this._isFocused = false;
    this._stopCaretBlink();
    this._destroyTextarea();
    this.invalidate(DirtyFlags.Visual);
  }

  // ── Caret blink ──

  private _startCaretBlink(): void {
    this._stopCaretBlink();
    this._caretVisible = true;
    this.invalidate(DirtyFlags.Visual);
    this._caretTimer = setInterval(() => {
      this._caretVisible = !this._caretVisible;
      this.invalidate(DirtyFlags.Visual);
    }, CARET_BLINK_MS);
  }

  private _stopCaretBlink(): void {
    if (this._caretTimer !== null) {
      clearInterval(this._caretTimer);
      this._caretTimer = null;
    }
    this._caretVisible = false;
  }

  private _resetCaretBlink(): void {
    if (this._isFocused) {
      this._startCaretBlink();
    }
  }

  // ── IME Bridge (hidden textarea) ──

  private _createTextarea(): void {
    if (this._textarea) return;

    const ta = document.createElement("textarea");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.opacity = "0";
    ta.style.padding = "0";
    ta.style.border = "none";
    ta.style.outline = "none";
    ta.style.resize = "none";
    ta.style.overflow = "hidden";
    ta.style.whiteSpace = "pre";
    ta.setAttribute("autocomplete", "off");
    ta.setAttribute("autocorrect", "off");
    ta.setAttribute("autocapitalize", "off");
    ta.setAttribute("spellcheck", "false");

    document.body.appendChild(ta);
    ta.value = this.text;
    ta.focus();

    this._boundOnInput = (e: Event) => this._onTextareaInput(e);
    this._boundOnKeyDown = (e: KeyboardEvent) => this._onTextareaKeyDown(e);
    this._boundOnCopy = (e: ClipboardEvent) => this._onCopy(e);
    this._boundOnCut = (e: ClipboardEvent) => this._onCut(e);
    this._boundOnPaste = (e: ClipboardEvent) => this._onPaste(e);
    this._boundOnCompositionStart = () => {
      this._isComposing = true;
    };
    this._boundOnCompositionEnd = (e: CompositionEvent) => {
      this._isComposing = false;
      this._handleCompositionEnd(e);
    };

    ta.addEventListener("input", this._boundOnInput);
    ta.addEventListener("keydown", this._boundOnKeyDown);
    ta.addEventListener("copy", this._boundOnCopy);
    ta.addEventListener("cut", this._boundOnCut);
    ta.addEventListener("paste", this._boundOnPaste);
    ta.addEventListener("compositionstart", this._boundOnCompositionStart);
    ta.addEventListener("compositionend", this._boundOnCompositionEnd);

    this._textarea = ta;
  }

  private _destroyTextarea(): void {
    if (!this._textarea) return;

    const ta = this._textarea;
    if (this._boundOnInput) ta.removeEventListener("input", this._boundOnInput);
    if (this._boundOnKeyDown)
      ta.removeEventListener("keydown", this._boundOnKeyDown);
    if (this._boundOnCopy) ta.removeEventListener("copy", this._boundOnCopy);
    if (this._boundOnCut) ta.removeEventListener("cut", this._boundOnCut);
    if (this._boundOnPaste) ta.removeEventListener("paste", this._boundOnPaste);
    if (this._boundOnCompositionStart)
      ta.removeEventListener("compositionstart", this._boundOnCompositionStart);
    if (this._boundOnCompositionEnd)
      ta.removeEventListener("compositionend", this._boundOnCompositionEnd);

    ta.remove();
    this._textarea = null;
    this._boundOnInput = null;
    this._boundOnKeyDown = null;
    this._boundOnCopy = null;
    this._boundOnCut = null;
    this._boundOnPaste = null;
    this._boundOnCompositionStart = null;
    this._boundOnCompositionEnd = null;
  }

  // ── Textarea event handlers ──

  private _onTextareaInput(_e: Event): void {
    if (this._isComposing) return;
    // The textarea already handled the input via keydown;
    // sync textarea value back to our text
    this._syncTextareaValue();
  }

  private _onTextareaKeyDown(e: KeyboardEvent): void {
    if (this._isComposing) return;

    // Intercept Cmd/Ctrl+Arrow navigation to prevent browser defaults
    if (e.metaKey || e.ctrlKey) {
      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        e.preventDefault();
      }
    }

    // Intercept Alt+Arrow for word jumps
    if (e.altKey) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
      }
    }
  }

  private _handleCompositionEnd(_e: CompositionEvent): void {
    if (!this._textarea) return;
    // Accept composed text from IME
    this._syncFromTextarea();
  }

  private _syncTextareaValue(): void {
    if (!this._textarea) return;
    const ta = this._textarea;
    ta.value = this.text;
    ta.selectionStart = Math.min(this._selectionStart, this._selectionEnd);
    ta.selectionEnd = Math.max(this._selectionStart, this._selectionEnd);
  }

  private _syncFromTextarea(): void {
    if (!this._textarea) return;
    const newText = this._textarea.value;
    if (newText !== this.text) {
      this._setText(newText);
    }
    this._selectionStart = this._textarea.selectionStart ?? 0;
    this._selectionEnd = this._textarea.selectionEnd ?? 0;
    this.invalidate(DirtyFlags.Visual);
  }

  // ── Clipboard handlers ──

  private _onCopy(e: ClipboardEvent): void {
    if (!this.hasSelection) return;
    e.preventDefault();
    const textToCopy = this._isPassword
      ? PASSWORD_CHAR.repeat(this.selectedText.length)
      : this.selectedText;
    e.clipboardData?.setData("text/plain", textToCopy);
  }

  private _onCut(e: ClipboardEvent): void {
    if (!this.hasSelection || this._readOnly) return;
    e.preventDefault();
    const textToCopy = this._isPassword
      ? PASSWORD_CHAR.repeat(this.selectedText.length)
      : this.selectedText;
    e.clipboardData?.setData("text/plain", textToCopy);
    this._deleteSelection();
  }

  private _onPaste(e: ClipboardEvent): void {
    if (this._readOnly) return;
    e.preventDefault();
    const pasteText = e.clipboardData?.getData("text/plain") ?? "";
    if (pasteText) {
      this._insertText(pasteText);
    }
  }

  // ── Keyboard handling (from InteractionManager keydown) ──

  private _onKeyDown(e: IKeyboardEvent): void {
    const { key, shiftKey, metaKey, altKey } = e;

    // Intercept browser defaults for navigation shortcuts
    if (metaKey || altKey) {
      if (
        key === "ArrowLeft" ||
        key === "ArrowRight" ||
        key === "ArrowUp" ||
        key === "ArrowDown"
      ) {
        e.preventDefault();
      }
    }

    // Navigation keys
    if (key === "ArrowLeft") {
      if (metaKey) {
        this._moveTo(this._getLineStart(this._selectionEnd), shiftKey);
      } else if (altKey) {
        this._moveTo(this._getWordBoundaryLeft(this._selectionEnd), shiftKey);
      } else {
        this._moveLeft(shiftKey);
      }
      return;
    }

    if (key === "ArrowRight") {
      if (metaKey) {
        this._moveTo(this._getLineEnd(this._selectionEnd), shiftKey);
      } else if (altKey) {
        this._moveTo(this._getWordBoundaryRight(this._selectionEnd), shiftKey);
      } else {
        this._moveRight(shiftKey);
      }
      return;
    }

    if (key === "ArrowUp") {
      if (metaKey) {
        this._moveTo(0, shiftKey);
      } else if (this._multiline) {
        this._moveUp(shiftKey);
      }
      return;
    }

    if (key === "ArrowDown") {
      if (metaKey) {
        this._moveTo(this._getTextLength(), shiftKey);
      } else if (this._multiline) {
        this._moveDown(shiftKey);
      }
      return;
    }

    if (key === "Home") {
      this._moveTo(this._getLineStart(this._selectionEnd), shiftKey);
      return;
    }

    if (key === "End") {
      this._moveTo(this._getLineEnd(this._selectionEnd), shiftKey);
      return;
    }

    // Select all
    if ((metaKey || e.ctrlKey) && key === "a") {
      e.preventDefault();
      this.selectAll();
      return;
    }

    // Copy/Cut/Paste via keyboard (these also go through textarea clipboard events)
    if ((metaKey || e.ctrlKey) && key === "c") {
      // Let the textarea handle it naturally
      this._syncTextareaValue();
      this._textarea?.focus();
      return;
    }

    if ((metaKey || e.ctrlKey) && key === "x") {
      if (this._readOnly) return;
      this._syncTextareaValue();
      this._textarea?.focus();
      return;
    }

    if ((metaKey || e.ctrlKey) && key === "v") {
      if (this._readOnly) return;
      this._textarea?.focus();
      return;
    }

    // Editing keys
    if (this._readOnly) return;

    if (key === "Backspace") {
      e.preventDefault();
      this._handleBackspace(altKey, metaKey);
      return;
    }

    if (key === "Delete") {
      e.preventDefault();
      this._handleDelete(altKey, metaKey);
      return;
    }

    if (key === "Enter") {
      e.preventDefault();
      if (this._multiline) {
        this._insertText("\n");
      } else {
        this.emit("submit", { value: this.text });
      }
      return;
    }

    // Printable characters
    if (key.length === 1 && !metaKey && !e.ctrlKey) {
      e.preventDefault();
      this._insertText(key);
      return;
    }
  }

  // ── Text editing operations ──

  private _setText(newText: string): void {
    // Apply filter
    const filtered = this._applyFilter(newText);
    if (filtered === null) {
      // If rejected, sync back the current text to textarea if it exists
      this._syncTextareaValue();
      return;
    }

    // Enforce maxLength
    const truncated =
      filtered.length > this._maxLength
        ? filtered.substring(0, this._maxLength)
        : filtered;

    // Enforce single-line if not multiline
    const sanitized = this._multiline
      ? truncated
      : truncated.replace(/\n/g, "");

    if (this.text !== sanitized) {
      this.text = sanitized;
      this.emit("change", { value: this.text });
    }
  }

  private _applyFilter(newText: string): string | null {
    if (!this._filter) return newText;

    if (this._filter instanceof RegExp) {
      return this._filter.test(newText) ? newText : null;
    }
    if (typeof this._filter === "function") {
      const result = this._filter(newText);
      if (result === false) return null;
      if (typeof result === "string") return result;
      return newText;
    }
    return newText;
  }

  _insertText(str: string): void {
    if (this._readOnly) return;

    const start = Math.min(this._selectionStart, this._selectionEnd);
    const end = Math.max(this._selectionStart, this._selectionEnd);
    const before = this.text.substring(0, start);
    const after = this.text.substring(end);
    let newText = before + str + after;

    // Enforce maxLength
    if (newText.length > this._maxLength) {
      const allowedChars = this._maxLength - (before.length + after.length);
      if (allowedChars <= 0) return;
      newText = before + str.substring(0, allowedChars) + after;
    }

    // Enforce single-line
    if (!this._multiline) {
      newText = newText.replace(/\n/g, "");
    }

    const newPos =
      start +
      Math.min(str.length, newText.length - before.length - after.length);

    // Apply filter
    const filtered = this._applyFilter(newText);
    if (filtered === null) {
      this._syncTextareaValue();
      return;
    }

    this.text = filtered;
    this._selectionStart = newPos;
    this._selectionEnd = newPos;
    this._resetCaretBlink();
    this.emit("change", { value: this.text });
    this.invalidate(DirtyFlags.Visual);
    this._syncTextareaValue();
  }

  private _deleteSelection(): void {
    if (!this.hasSelection) return;
    const start = Math.min(this._selectionStart, this._selectionEnd);
    const end = Math.max(this._selectionStart, this._selectionEnd);
    const newText = this.text.substring(0, start) + this.text.substring(end);
    this.text = newText;
    this._selectionStart = start;
    this._selectionEnd = start;
    this._resetCaretBlink();
    this.emit("change", { value: this.text });
    this.invalidate(DirtyFlags.Visual);
    this._syncTextareaValue();
  }

  private _handleBackspace(altKey: boolean, metaKey: boolean): void {
    if (this.hasSelection) {
      this._deleteSelection();
      return;
    }

    const pos = this._selectionEnd;
    if (pos === 0) return;

    let deleteFrom: number;
    if (metaKey) {
      deleteFrom = this._getLineStart(pos);
    } else if (altKey) {
      deleteFrom = this._getWordBoundaryLeft(pos);
    } else {
      deleteFrom = pos - 1;
    }

    const newText =
      this.text.substring(0, deleteFrom) + this.text.substring(pos);
    this.text = newText;
    this._selectionStart = deleteFrom;
    this._selectionEnd = deleteFrom;
    this._resetCaretBlink();
    this.emit("change", { value: this.text });
    this.invalidate(DirtyFlags.Visual);
    this._syncTextareaValue();
  }

  private _handleDelete(altKey: boolean, metaKey: boolean): void {
    if (this.hasSelection) {
      this._deleteSelection();
      return;
    }

    const pos = this._selectionEnd;
    if (pos >= this._getTextLength()) return;

    let deleteTo: number;
    if (metaKey) {
      deleteTo = this._getLineEnd(pos);
    } else if (altKey) {
      deleteTo = this._getWordBoundaryRight(pos);
    } else {
      deleteTo = pos + 1;
    }

    const newText = this.text.substring(0, pos) + this.text.substring(deleteTo);
    this.text = newText;
    this._selectionStart = pos;
    this._selectionEnd = pos;
    this._resetCaretBlink();
    this.emit("change", { value: this.text });
    this.invalidate(DirtyFlags.Visual);
    this._syncTextareaValue();
  }

  // ── Cursor movement ──

  private _moveLeft(extend: boolean): void {
    if (!extend && this.hasSelection) {
      // Collapse to start of selection
      const pos = Math.min(this._selectionStart, this._selectionEnd);
      this._selectionStart = pos;
      this._selectionEnd = pos;
    } else {
      const newPos = Math.max(0, this._selectionEnd - 1);
      this._moveTo(newPos, extend);
    }
    this._resetCaretBlink();
    this.invalidate(DirtyFlags.Visual);
  }

  private _moveRight(extend: boolean): void {
    if (!extend && this.hasSelection) {
      // Collapse to end of selection
      const pos = Math.max(this._selectionStart, this._selectionEnd);
      this._selectionStart = pos;
      this._selectionEnd = pos;
    } else {
      const newPos = Math.min(this._getTextLength(), this._selectionEnd + 1);
      this._moveTo(newPos, extend);
    }
    this._resetCaretBlink();
    this.invalidate(DirtyFlags.Visual);
  }

  private _moveUp(extend: boolean): void {
    const { lineIdx, colIdx } = this._getLineAndCol(this._selectionEnd);
    if (lineIdx === 0) {
      this._moveTo(0, extend);
    } else {
      const prevLine = this.textLayout.lines[lineIdx - 1];
      const newCol = Math.min(colIdx, prevLine.text.length);
      const newPos = this._getCharOffset(lineIdx - 1) + newCol;
      this._moveTo(newPos, extend);
    }
    this._resetCaretBlink();
    this.invalidate(DirtyFlags.Visual);
  }

  private _moveDown(extend: boolean): void {
    const layout = this.textLayout;
    const { lineIdx, colIdx } = this._getLineAndCol(this._selectionEnd);
    if (lineIdx >= layout.lines.length - 1) {
      this._moveTo(this._getTextLength(), extend);
    } else {
      const nextLine = layout.lines[lineIdx + 1];
      const newCol = Math.min(colIdx, nextLine.text.length);
      const newPos = this._getCharOffset(lineIdx + 1) + newCol;
      this._moveTo(newPos, extend);
    }
    this._resetCaretBlink();
    this.invalidate(DirtyFlags.Visual);
  }

  private _moveTo(pos: number, extend: boolean): void {
    const clamped = Math.max(0, Math.min(pos, this._getTextLength()));
    if (extend) {
      this._selectionEnd = clamped;
    } else {
      this._selectionStart = clamped;
      this._selectionEnd = clamped;
    }
    this._resetCaretBlink();
    this.invalidate(DirtyFlags.Visual);
    this._syncTextareaValue();
  }

  // ── Word/Line boundary helpers ──

  private _getCat(ch: string): "space" | "word" | "punct" {
    if (/\s/.test(ch)) return "space";
    if (/[a-zA-Z0-9]/.test(ch)) return "word";
    return "punct";
  }

  _getWordBoundaryLeft(pos: number): number {
    const t = this.text;
    if (pos <= 0) return 0;

    let i = pos - 1;

    // If starting in whitespace, skip it first
    while (i >= 0 && this._getCat(t[i]) === "space") i--;

    if (i < 0) return 0;

    // Start of the segment we are jumping over
    const cat = this._getCat(t[i]);
    while (i > 0 && this._getCat(t[i - 1]) === cat) i--;

    return i;
  }

  _getWordBoundaryRight(pos: number): number {
    const t = this.text;
    const len = t.length;
    if (pos >= len) return len;

    let i = pos;

    // If starting in whitespace, skip it first
    while (i < len && this._getCat(t[i]) === "space") i++;

    if (i >= len) return len;

    // End of the segment we are jumping over
    const cat = this._getCat(t[i]);
    while (i < len && this._getCat(t[i]) === cat) i++;

    return i;
  }

  _getLineStart(pos: number): number {
    const { lineIdx } = this._getLineAndCol(pos);
    return this._getCharOffset(lineIdx);
  }

  _getLineEnd(pos: number): number {
    const { lineIdx } = this._getLineAndCol(pos);
    return (
      this._getCharOffset(lineIdx) + this.textLayout.lines[lineIdx].text.length
    );
  }

  /**
   * Get the line index and column index for a given character position.
   */
  _getLineAndCol(pos: number): { lineIdx: number; colIdx: number } {
    const layout = this.textLayout;
    let offset = 0;

    for (let i = 0; i < layout.lines.length; i++) {
      const lineLen = layout.lines[i].text.length;
      const nextOffset = offset + lineLen;

      // Account for separator characters between lines
      let separatorLen = 0;
      if (i < layout.lines.length - 1) {
        const origChar = this.text[nextOffset];
        if (origChar === "\n" || origChar === " ") {
          separatorLen = 1;
        }
      }

      if (pos <= nextOffset || i === layout.lines.length - 1) {
        return { lineIdx: i, colIdx: pos - offset };
      }

      offset = nextOffset + separatorLen;
    }

    return {
      lineIdx: layout.lines.length - 1,
      colIdx: layout.lines[layout.lines.length - 1].text.length,
    };
  }

  /**
   * Get the character offset at the start of a given line.
   */
  _getCharOffset(lineIdx: number): number {
    const layout = this.textLayout;
    let offset = 0;

    for (let i = 0; i < lineIdx && i < layout.lines.length; i++) {
      offset += layout.lines[i].text.length;
      // Account for separator between lines
      if (i < layout.lines.length - 1) {
        const origChar = this.text[offset];
        if (origChar === "\n" || origChar === " ") {
          offset += 1;
        }
      }
    }

    return offset;
  }

  // ── Rendering ──

  override paint(ctx: IArena2DContext): void {
    const style = this.textStyle;
    const lineHeight = style.lineHeight;
    const elementWidth = this.width;

    // Set font
    const weight = style.fontWeight;
    const fontStyle = style.fontStyle;
    ctx.setFont({ fontSize: style.fontSize, fontFamily: style.fontFamily, fontWeight: weight, fontStyle });
    ctx.setTextBaseline("top");

    // Get display text (password masking)
    const displayText = this._getDisplayText();
    const showPlaceholder =
      displayText.length === 0 && this._placeholder.length > 0;

    // Use a separate layout for display text if in password mode
    const layout = this.textLayout;

    // Draw selection background
    if (this._isFocused && this.hasSelection) {
      this._paintSelection(ctx, layout, lineHeight, elementWidth, style);
    }

    // Draw text or placeholder
    if (showPlaceholder) {
      ctx.setFillStyle(style.placeholderColor || "rgba(255, 255, 255, 0.3)");
      ctx.fillText(this._placeholder, 0, 0);
    } else {
      // Render text (masked or normal) using advancements for precision
      ctx.setFillStyle(style.color);
      for (let i = 0; i < layout.lines.length; i++) {
        const line = layout.lines[i];
        const y = i * lineHeight;
        let x = 0;
        if (style.textAlign === "center") {
          x = (elementWidth - line.width) / 2;
        } else if (style.textAlign === "right") {
          x = elementWidth - line.width;
        }

        if (this._isPassword) {
          // Draw bullets individually at precise advancement positions
          for (let j = 0; j < line.text.length; j++) {
            const charX =
              j < line.advancements.length ? line.advancements[j] : line.width;
            ctx.fillText(PASSWORD_CHAR, x + charX, y);
          }
        } else {
          ctx.fillText(line.text, x, y);
        }
      }
    }
    // Draw caret
    if (this._isFocused && !this.hasSelection && this._caretVisible) {
      this._paintCaret(ctx, layout, lineHeight, elementWidth, style);
    }
  }

  private _paintSelection(
    ctx: IArena2DContext,
    layout: {
      lines: { text: string; width: number; advancements: number[] }[];
    },
    lineHeight: number,
    elementWidth: number,
    style: { textAlign: string; selectionColor: string },
  ): void {
    const selStart = Math.min(this._selectionStart, this._selectionEnd);
    const selEnd = Math.max(this._selectionStart, this._selectionEnd);

    ctx.setFillStyle(style.selectionColor);

    let charOffset = 0;
    for (let i = 0; i < layout.lines.length; i++) {
      const line = layout.lines[i];
      const lineStart = charOffset;
      const lineEnd = charOffset + line.text.length;

      // Check if this line intersects the selection
      if (selEnd > lineStart && selStart < lineEnd) {
        const localSelStart = Math.max(0, selStart - lineStart);
        const localSelEnd = Math.min(line.text.length, selEnd - lineStart);

        // Compute alignment offset
        const alignOffsetX = this._alignOffsetX(
          style.textAlign,
          elementWidth,
          line.width,
        );

        const startX =
          localSelStart < line.advancements.length
            ? line.advancements[localSelStart]
            : line.width;
        const endX =
          localSelEnd < line.advancements.length
            ? line.advancements[localSelEnd]
            : line.width;

        const y = i * lineHeight;
        ctx.fillRect(alignOffsetX + startX, y, endX - startX, lineHeight);
      }

      charOffset += line.text.length;
      // Account for separator
      if (i < layout.lines.length - 1) {
        const origChar = this.text[charOffset];
        if (origChar === "\n" || origChar === " ") {
          charOffset += 1;
        }
      }
    }
  }

  private _paintCaret(
    ctx: IArena2DContext,
    layout: {
      lines: { text: string; width: number; advancements: number[] }[];
    },
    lineHeight: number,
    elementWidth: number,
    style: { textAlign: string; color: string },
  ): void {
    const pos = this._selectionEnd;
    const { lineIdx, colIdx } = this._getLineAndCol(pos);
    const line = layout.lines[lineIdx];

    const alignOffsetX = this._alignOffsetX(
      style.textAlign,
      elementWidth,
      line.width,
    );

    const caretX =
      colIdx < line.advancements.length
        ? line.advancements[colIdx]
        : line.width;

    const y = lineIdx * lineHeight;

    ctx.setFillStyle(style.color);
    ctx.fillRect(alignOffsetX + caretX, y, 1.5, lineHeight);
  }

  // ── Cleanup ──

  override destroy(): void {
    this._stopCaretBlink();
    this._destroyTextarea();
    super.destroy();
  }
}
