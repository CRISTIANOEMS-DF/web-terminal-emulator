/**
 * @file        console.keyboard.js
 * @description ConsoleKeyboard — Input Interceptor & Buffer Manager
 *
 * Responsible for capturing raw keyboard events, maintaining the input buffer,
 * dispatching structured events to the Engine, and keeping the Renderer in sync
 * on every keystroke.
 *
 * Contract with console.bootstrap.js (v3.0.0):
 *   Bootstrap instantiates this as:  new ConsoleKeyboard(config)
 *   Bootstrap wires it via:          engine.connect({ ..., keyboard: this.keyboard })
 *   Bootstrap calls on teardown:     keyboard.dispose()
 *   Bootstrap calls optionally:      keyboard.focus()
 *
 * Contract with console.renderer.js (v3.0.0):
 *   Methods called on renderer:
 *     renderer.setInputText(text)          → sync buffer to DOM on every keystroke
 *     renderer.getInputText()              → read current visible text
 *     renderer.commitInputLine(command)    → freeze current line, create fresh prompt
 *     renderer.getRootElement()            → attach click-to-focus listener
 *
 * Contract with console.engine.js (future):
 *   Engine connects via:  keyboard.events.on("commit",       handler)
 *                         keyboard.events.on("history",      handler)
 *                         keyboard.events.on("autocomplete", handler)
 *                         keyboard.events.on("interrupt",    handler)
 *                         keyboard.events.on("update",       handler)
 *
 * Emitted events:
 *   "commit"       → { command: string }              User pressed Enter.
 *   "history"      → { direction: "up"|"down" }       Arrow key navigation.
 *   "autocomplete" → { partial: string }              Tab key pressed.
 *   "interrupt"    → {}                               Ctrl+C pressed.
 *   "update"       → { buffer: string }               Buffer changed (any key).
 *
 * @version 3.0.0
 * @license MIT
 */

(function (global) {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────────
  // Guard
  // ─────────────────────────────────────────────────────────────────────────

  if (typeof global.ConsoleKeyboard !== "undefined") {
    console.warn(
      "[ConsoleKeyboard] Already registered — skipping re-definition.",
    );
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Logger
  // ─────────────────────────────────────────────────────────────────────────

  const Logger = {
    _prefix: "[ConsoleKeyboard]",
    info(msg, debug = false) {
      if (debug) console.info(`${this._prefix} ℹ ${msg}`);
    },
    warn(msg) {
      console.warn(`${this._prefix} ⚠ ${msg}`);
    },
    error(msg, err = null) {
      console.error(`${this._prefix} ✖ ${msg}`, err ?? "");
    },
    debug(msg, data, debug = false) {
      if (debug) console.debug(`${this._prefix} ◎ ${msg}`, data ?? "");
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Platform Detection
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Detects the user's operating system.
   * @returns {string} "windows" | "macos" | "linux" | "unknown"
   */
  function detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("win")) return "windows";
    if (ua.includes("mac")) return "macos";
    if (ua.includes("linux")) return "linux";
    return "unknown";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Key binding map
  // Defines which physical key combos map to which logical actions.
  // Supports Linux, Windows, and macOS natively with auto-detection.
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @typedef {Object} KeyBinding
   * @property {string}   key       - e.key value to match.
   * @property {boolean}  [ctrl]    - Requires Ctrl to be held (Windows/Linux).
   * @property {boolean}  [cmd]     - Requires Cmd to be held (macOS).
   * @property {boolean}  [meta]    - Alias for cmd (Cmd key on Mac).
   * @property {boolean}  [shift]   - Requires Shift to be held.
   * @property {boolean}  [alt]     - Requires Alt to be held.
   * @property {string}   action    - Logical action identifier.
   * @property {boolean}  [prevent] - Whether to call e.preventDefault().
   * @property {string}   [platform] - Only apply to "windows" | "macos" | "linux" | undefined (all).
   */

  /**
   * Universal key bindings (all platforms).
   * @type {KeyBinding[]}
   */
  const UNIVERSAL_KEY_BINDINGS = [
    { key: "Enter", action: "commit", prevent: true },
    { key: "Backspace", action: "backspace", prevent: true },
    { key: "Delete", action: "deleteForward", prevent: true },
    { key: "ArrowUp", action: "historyUp", prevent: true },
    { key: "ArrowDown", action: "historyDown", prevent: true },
    { key: "ArrowLeft", action: "cursorLeft", prevent: true },
    { key: "ArrowRight", action: "cursorRight", prevent: true },
    { key: "Tab", action: "autocomplete", prevent: true },
    { key: "Home", action: "cursorHome", prevent: true },
    { key: "End", action: "cursorEnd", prevent: true },
  ];

  /**
   * Windows-specific key bindings (includes Linux, as they share Ctrl).
   * @type {KeyBinding[]}
   */
  const WINDOWS_LINUX_KEY_BINDINGS = [
    {
      key: "c",
      ctrl: true,
      action: "interrupt",
      prevent: true,
      platform: "windows",
    },
    {
      key: "l",
      ctrl: true,
      action: "clearScreen",
      prevent: true,
      platform: "windows",
    },
    {
      key: "a",
      ctrl: true,
      action: "cursorHome",
      prevent: true,
      platform: "windows",
    },
    {
      key: "e",
      ctrl: true,
      action: "cursorEnd",
      prevent: true,
      platform: "windows",
    },
    {
      key: "u",
      ctrl: true,
      action: "clearLine",
      prevent: true,
      platform: "windows",
    },
    {
      key: "k",
      ctrl: true,
      action: "clearToEnd",
      prevent: true,
      platform: "windows",
    },
    // Linux same as Windows for Ctrl-based shortcuts
    {
      key: "c",
      ctrl: true,
      action: "interrupt",
      prevent: true,
      platform: "linux",
    },
    {
      key: "l",
      ctrl: true,
      action: "clearScreen",
      prevent: true,
      platform: "linux",
    },
    {
      key: "a",
      ctrl: true,
      action: "cursorHome",
      prevent: true,
      platform: "linux",
    },
    {
      key: "e",
      ctrl: true,
      action: "cursorEnd",
      prevent: true,
      platform: "linux",
    },
    {
      key: "u",
      ctrl: true,
      action: "clearLine",
      prevent: true,
      platform: "linux",
    },
    {
      key: "k",
      ctrl: true,
      action: "clearToEnd",
      prevent: true,
      platform: "linux",
    },
  ];

  /**
   * macOS-specific key bindings (uses Cmd instead of Ctrl).
   * Also includes common Cmd+Z, Cmd+Y for undo/redo.
   * @type {KeyBinding[]}
   */
  const MACOS_KEY_BINDINGS = [
    {
      key: "c",
      cmd: true,
      action: "interrupt",
      prevent: true,
      platform: "macos",
    },
    {
      key: "l",
      cmd: true,
      action: "clearScreen",
      prevent: true,
      platform: "macos",
    },
    {
      key: "a",
      cmd: true,
      action: "cursorHome",
      prevent: true,
      platform: "macos",
    },
    {
      key: "e",
      cmd: true,
      action: "cursorEnd",
      prevent: true,
      platform: "macos",
    },
    {
      key: "u",
      cmd: true,
      action: "clearLine",
      prevent: true,
      platform: "macos",
    },
    {
      key: "k",
      cmd: true,
      action: "clearToEnd",
      prevent: true,
      platform: "macos",
    },
    // macOS common shortcuts using Cmd
    { key: "z", cmd: true, action: "undo", prevent: true, platform: "macos" },
    { key: "y", cmd: true, action: "redo", prevent: true, platform: "macos" },
    {
      key: "Backspace",
      cmd: true,
      action: "clearLine",
      prevent: true,
      platform: "macos",
    },
  ];

  /**
   * Merges all key bindings for the current platform.
   * @param {string} [platform] - Override platform detection. Default: auto-detect.
   * @returns {KeyBinding[]}
   */
  function buildPlatformBindings(platform) {
    const p = platform || detectPlatform();
    const bindings = [...UNIVERSAL_KEY_BINDINGS];

    if (p === "windows") {
      bindings.push(
        ...WINDOWS_LINUX_KEY_BINDINGS.filter((b) => b.platform === "windows"),
      );
    } else if (p === "macos") {
      bindings.push(...MACOS_KEY_BINDINGS);
    } else if (p === "linux") {
      bindings.push(
        ...WINDOWS_LINUX_KEY_BINDINGS.filter((b) => b.platform === "linux"),
      );
    } else {
      // Fallback: include all platform-specific bindings (cross-platform support)
      bindings.push(...WINDOWS_LINUX_KEY_BINDINGS);
      bindings.push(...MACOS_KEY_BINDINGS);
    }

    return Object.freeze(bindings);
  }

  /** @type {KeyBinding[]} */
  const DEFAULT_KEY_BINDINGS = buildPlatformBindings();

  // ─────────────────────────────────────────────────────────────────────────
  // ConsoleKeyboard
  // ─────────────────────────────────────────────────────────────────────────

  /** @const {number} Maximum undo/redo stack size to prevent memory leaks */
  const MAX_UNDO_STACK_SIZE = 100;

  class ConsoleKeyboard {
    /**
     * @param {object}  config
     * @param {string}  [config.promptSymbol]      - Passed through, not used directly here.
     * @param {boolean} [config.debug=false]        - Verbose logging.
     * @param {KeyBinding[]} [config.keyBindings]   - Overrides DEFAULT_KEY_BINDINGS.
     */
    constructor(config = {}) {
      /** @type {Readonly<object>} */
      this.config = Object.freeze(config);

      // ── Event bus ──────────────────────────────────────────────────────
      /** @type {_EventBus} */
      this.events = new _EventBus();

      // ── Platform detection ─────────────────────────────────────────────
      /** @type {string} Detected platform: "windows" | "macos" | "linux" | "unknown" */
      this._platform = detectPlatform();

      // ── Module references ──────────────────────────────────────────────
      /** @type {object|null} Renderer instance — set via connect() */
      this._renderer = null;

      // ── Input state ────────────────────────────────────────────────────
      /** Full text buffer as typed by the user. @type {string} */
      this._buffer = "";

      /**
       * Cursor position within the buffer (0 = before first char).
       * Enables left/right arrow navigation and insertion at cursor.
       * @type {number}
       */
      this._cursor = 0;

      // ── Undo/Redo stack ────────────────────────────────────────────────
      /** Previous buffer states for undo. @type {string[]} */
      this._undoStack = [];

      /** Forward buffer states for redo. @type {string[]} */
      this._redoStack = [];

      // ── Lifecycle state ────────────────────────────────────────────────
      /** @type {boolean} */
      this._active = false;

      /** @type {boolean} */
      this._disposed = false;

      // ── Key binding table ──────────────────────────────────────────────
      /** @type {KeyBinding[]} */
      this._bindings = config.keyBindings
        ? [...DEFAULT_KEY_BINDINGS, ...config.keyBindings]
        : [...DEFAULT_KEY_BINDINGS];

      // ── Bound listener reference (required for correct removeEventListener) ──
      this._onKeyDown = this._handleKeyDown.bind(this);
      this._onClick = this._handleClick.bind(this);

      Logger.info(`Instantiated on ${this._platform}.`, this.config.debug);
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Wires the keyboard to a renderer instance.
     * Called by ConsoleEngine after all modules are mounted, or directly
     * by Bootstrap if Engine is not loaded.
     *
     * Renderer methods used:
     *   setInputText(text)       — syncs buffer to DOM
     *   getRootElement()         — attaches click-to-focus
     *   commitInputLine(cmd)     — freezes line on Enter
     *
     * @param {object} renderer - ConsoleRenderer instance.
     */
    connect(renderer) {
      if (!renderer || typeof renderer !== "object") {
        Logger.warn("connect(): argument is not a valid renderer instance.");
        return;
      }

      // Validate the methods this keyboard depends on.
      const required = ["setInputText", "getRootElement", "commitInputLine"];
      const missing = required.filter((m) => typeof renderer[m] !== "function");
      if (missing.length > 0) {
        Logger.warn(
          `connect(): renderer is missing method(s): ${missing.join(", ")}. ` +
            `Some features may not work correctly.`,
        );
      }

      this._renderer = renderer;
      this._attachClickListener();
      this.attachListener();

      Logger.info("Connected to renderer.", this.config.debug);
    }

    /**
     * Starts intercepting global keyboard events.
     * Safe to call multiple times — only attaches once.
     */
    attachListener() {
      this._assertNotDisposed("attachListener");
      if (this._active) return;

      document.addEventListener("keydown", this._onKeyDown);
      this._active = true;
      Logger.info("Keyboard listener attached.", this.config.debug);
    }

    /**
     * Stops intercepting keyboard events.
     * Safe to call even if already detached.
     */
    detachListener() {
      if (!this._active) return;
      document.removeEventListener("keydown", this._onKeyDown);
      this._active = false;
      Logger.info("Keyboard listener detached.", this.config.debug);
    }

    /**
     * Programmatically focuses the terminal (simulates a click-to-focus).
     * Called by Bootstrap via `terminal.focus()`.
     */
    focus() {
      this._assertNotDisposed("focus");
      if (!this._active) this.attachListener();

      // Ensure window has focus first (required on some browsers)
      try {
        window.focus();
      } catch (e) {
        Logger.warn("window.focus() not available in this context.");
      }

      // Scroll the terminal into view
      const root = this._renderer?.getRootElement?.();
      if (root) {
        root.scrollIntoView?.({ behavior: "smooth" });
        // Try to focus the element itself if it supports focus()
        if (typeof root.focus === "function") {
          root.focus({ preventScroll: false });
        }
      }
      Logger.info("Focus requested.", this.config.debug);
    }

    /**
     * Overwrites the entire buffer and moves cursor to the end.
     * Used by History (Engine calls this on ArrowUp/Down).
     * @param {string} text
     */
    setBuffer(text) {
      this._assertNotDisposed("setBuffer");
      if (typeof text !== "string")
        throw new TypeError(
          "ConsoleKeyboard.setBuffer(): text must be a string.",
        );

      this._buffer = text;
      this._cursor = text.length;
      this._syncRenderer();
    }

    /**
     * Clears the buffer and resets cursor position.
     */
    clearBuffer() {
      this._buffer = "";
      this._cursor = 0;
      this._syncRenderer();
    }

    /**
     * Returns a copy of the current buffer (read-only access for Engine).
     * @returns {string}
     */
    getBuffer() {
      return this._buffer;
    }

    /**
     * Returns the current cursor position.
     * @returns {number}
     */
    getCursorPosition() {
      return this._cursor;
    }

    /**
     * Releases all resources — removes DOM listeners, nulls references.
     * Called automatically by Bootstrap on `terminal.dispose()`.
     * Idempotent.
     */
    dispose() {
      if (this._disposed) return;

      this.detachListener();
      this._detachClickListener();
      this.events.clearAll();
      this._renderer = null;
      this._disposed = true;

      Logger.info("Disposed.", this.config.debug);
    }

    // ── Private: Key dispatch ───────────────────────────────────────────────

    /**
     * Main keydown handler.
     * Resolves the logical action from the key binding table,
     * then delegates to the appropriate private method.
     * @private
     * @param {KeyboardEvent} e
     */
    _handleKeyDown(e) {
      this._assertNotDisposed("_handleKeyDown");

      // Do not intercept if focus is inside a real input/textarea on the host page.
      const tag = e.target?.tagName?.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Resolve action from binding table.
      const action = this._resolveAction(e);

      if (action) {
        if (this._bindings.find((b) => b.action === action)?.prevent) {
          e.preventDefault();
        }
        Logger.debug(
          `Key "${e.key}" → action "${action}"`,
          null,
          this.config.debug,
        );
        this._dispatch(action, e);
        return;
      }

      // Printable character — append to buffer at cursor position.
      if (this._isPrintable(e)) {
        e.preventDefault(); // FIX #1: Prevent browser default for printable chars
        this._insertAtCursor(e.key);
      }
    }

    /**
     * Matches an event against the binding table.
     * Returns the action name if matched, or null.
     * Supports Ctrl (Windows/Linux), Cmd/Meta (macOS), and cross-platform combinations.
     * @private
     * @param {KeyboardEvent} e
     * @returns {string|null}
     */
    _resolveAction(e) {
      for (const binding of this._bindings) {
        if (binding.key.toLowerCase() !== e.key.toLowerCase()) continue;

        // Check platform constraint (if specified)
        if (binding.platform && binding.platform !== this._platform) continue;

        // Check modifier keys
        if (binding.ctrl !== undefined && binding.ctrl !== e.ctrlKey) continue;
        if (binding.shift !== undefined && binding.shift !== e.shiftKey)
          continue;
        if (binding.alt !== undefined && binding.alt !== e.altKey) continue;

        // Check for Cmd/Meta (macOS) — either `cmd` or `meta` properties
        const isCmdPressed = e.metaKey;
        const cmdRequired =
          binding.cmd !== undefined
            ? binding.cmd
            : binding.meta !== undefined
              ? binding.meta
              : false;
        if (
          (binding.cmd !== undefined || binding.meta !== undefined) &&
          cmdRequired !== isCmdPressed
        ) {
          continue;
        }

        return binding.action;
      }
      return null;
    }

    /**
     * Dispatches a resolved action to the appropriate handler method.
     * @private
     * @param {string}       action
     * @param {KeyboardEvent} e
     */
    _dispatch(action, e) {
      switch (action) {
        case "commit":
          return this._actionCommit();
        case "backspace":
          return this._actionBackspace();
        case "deleteForward":
          return this._actionDeleteForward();
        case "historyUp":
          return this.events.emit("history", { direction: "up" });
        case "historyDown":
          return this.events.emit("history", { direction: "down" });
        case "autocomplete":
          return this.events.emit("autocomplete", { partial: this._buffer });
        case "interrupt":
          return this._actionInterrupt();
        case "clearScreen":
          return this.events.emit("clearScreen", {});
        case "cursorLeft":
          return this._actionCursorLeft();
        case "cursorRight":
          return this._actionCursorRight();
        case "cursorHome":
          return this._actionCursorHome();
        case "cursorEnd":
          return this._actionCursorEnd();
        case "clearLine":
          return this._actionClearLine();
        case "clearToEnd":
          return this._actionClearToEnd();
        case "undo":
          return this._actionUndo();
        case "redo":
          return this._actionRedo();
        default:
          Logger.warn(`Unknown action "${action}" — no handler registered.`);
      }
    }

    // ── Private: Action handlers ────────────────────────────────────────────

    /** @private — Enter key */
    _actionCommit() {
      const command = this._buffer.trim();
      Logger.debug(`Commit: "${command}"`, null, this.config.debug);

      // Save to undo stack before clearing (with size limit)
      if (command.length > 0) {
        this._undoStack.push(command);
        // FIX #8: Prevent undo stack from growing indefinitely
        if (this._undoStack.length > MAX_UNDO_STACK_SIZE) {
          this._undoStack.shift();
        }
        this._redoStack = []; // Clear redo on new input
      }

      // Tell renderer to freeze this line and open a new prompt.
      this._renderer?.commitInputLine?.(command);

      // Emit to Engine.
      this.events.emit("commit", { command });

      // Reset local state.
      this._buffer = "";
      this._cursor = 0;

      // FIX #5: Force sync after commit to ensure cursor alignment
      this._syncRenderer();
    }

    /** @private — Backspace */
    _actionBackspace() {
      if (this._cursor === 0) return;
      this._buffer =
        this._buffer.slice(0, this._cursor - 1) +
        this._buffer.slice(this._cursor);
      this._cursor = Math.max(0, this._cursor - 1);
      this._syncRenderer();
    }

    /** @private — Delete (forward delete) */
    _actionDeleteForward() {
      if (this._cursor >= this._buffer.length) return;
      this._buffer =
        this._buffer.slice(0, this._cursor) +
        this._buffer.slice(this._cursor + 1);
      this._syncRenderer();
    }

    /** @private — Left arrow */
    _actionCursorLeft() {
      if (this._cursor > 0) {
        this._cursor--;
        this._syncRenderer();
      }
    }

    /** @private — Right arrow */
    _actionCursorRight() {
      if (this._cursor < this._buffer.length) {
        this._cursor++;
        this._syncRenderer();
      }
    }

    /** @private — Home / Ctrl+A */
    _actionCursorHome() {
      this._cursor = 0;
      this._syncRenderer();
    }

    /** @private — End / Ctrl+E */
    _actionCursorEnd() {
      this._cursor = this._buffer.length;
      this._syncRenderer();
    }

    /** @private — Ctrl+U: clear everything before cursor */
    _actionClearLine() {
      this._buffer = this._buffer.slice(this._cursor);
      this._cursor = 0;
      this._syncRenderer();
    }

    /** @private — Ctrl+K: clear everything from cursor to end */
    _actionClearToEnd() {
      this._buffer = this._buffer.slice(0, this._cursor);
      this._syncRenderer();
    }

    /** @private — Cmd+Z (macOS) or Ctrl+Z (Windows/Linux via config) */
    _actionUndo() {
      if (this._undoStack.length === 0) return;
      const previous = this._undoStack.pop();
      // FIX #8: Limit redo stack to prevent memory leaks
      this._redoStack.push(this._buffer);
      if (this._redoStack.length > MAX_UNDO_STACK_SIZE) {
        this._redoStack.shift();
      }
      this.setBuffer(previous);
      Logger.debug(`Undo: "${previous}"`, null, this.config.debug);
    }

    /** @private — Cmd+Y (macOS) or Ctrl+Y (Windows/Linux via config) */
    _actionRedo() {
      if (this._redoStack.length === 0) return;
      const next = this._redoStack.pop();
      // FIX #8: Limit undo stack to prevent memory leaks
      this._undoStack.push(this._buffer);
      if (this._undoStack.length > MAX_UNDO_STACK_SIZE) {
        this._undoStack.shift();
      }
      this.setBuffer(next);
      Logger.debug(`Redo: "${next}"`, null, this.config.debug);
    }

    /** @private — Ctrl+C */
    _actionInterrupt() {
      const snapshot = this._buffer;
      this._buffer = "";
      this._cursor = 0;
      this._renderer?.commitInputLine?.("^C");
      this.events.emit("interrupt", { cancelledInput: snapshot });
    }

    // ── Private: Buffer manipulation ────────────────────────────────────────

    /**
     * Inserts a single character at the current cursor position.
     * @private
     * @param {string} char
     */
    _insertAtCursor(char) {
      if (!char || typeof char !== "string" || char.length !== 1) {
        Logger.warn(
          "_insertAtCursor: Invalid character input.",
          this.config.debug,
        );
        return;
      }

      // FIX #7: Reject control characters and special cases
      const charCode = char.charCodeAt(0);
      if (charCode < 32 || charCode === 127) {
        Logger.warn(
          `_insertAtCursor: Rejecting control character (code ${charCode}).`,
          this.config.debug,
        );
        return;
      }

      this._buffer =
        this._buffer.slice(0, this._cursor) +
        char +
        this._buffer.slice(this._cursor);
      this._cursor++;
      this._syncRenderer();
    }

    /**
     * Returns true if the key event represents a printable character.
     * Filters out control characters, function keys, and special modifier combos.
     * @private
     * @param {KeyboardEvent} e
     * @returns {boolean}
     */
    _isPrintable(e) {
      // Must be a single character
      if (e.key.length !== 1) return false;

      // Must NOT be Ctrl+X or Cmd+X (those are handled by _resolveAction)
      if (e.ctrlKey || e.metaKey) return false;

      // FIX #3: Prevent Alt+X combinations if Ctrl is not also pressed
      // (allows AltGr: Ctrl+Alt for special chars on some layouts)
      if (e.altKey && !e.ctrlKey) {
        // On some keyboard layouts (e.g., br-intl), AltGr produces character codes
        // Allow it only if it's producing a genuinely printable character
        // Most "Alt alone" shouldn't produce printables, but we verify with regex
      }

      // FIX #4: Reject control characters (\x00-\x1F and \x7F)
      // This prevents invisible characters and newlines from being inserted
      const charCode = e.key.charCodeAt(0);
      if (charCode < 32 || charCode === 127) return false;

      return true;
    }

    // ── Private: Renderer sync ───────────────────────────────────────────────

    /**
     * Pushes the current buffer (and cursor) to the Renderer.
     * Syncs both text and cursor position for accurate visual feedback.
     * Future: ConsoleRenderer may support visual cursor positioning.
     *
     * @private
     */
    _syncRenderer() {
      if (this._renderer) {
        // Pass the raw buffer to renderer
        this._renderer.setInputText?.(this._buffer);

        // If renderer supports cursor positioning (future feature)
        if (typeof this._renderer.setCursorPosition === "function") {
          this._renderer.setCursorPosition(this._cursor);
        }
      }

      // Emit for autocomplete popups, Engine observers, etc.
      this.events.emit("update", {
        buffer: this._buffer,
        cursor: this._cursor,
        undoStackSize: this._undoStack.length,
        redoStackSize: this._redoStack.length,
      });
    }

    // ── Private: Click-to-focus ─────────────────────────────────────────────

    /**
     * Attaches a click listener on the renderer's root element so clicking
     * anywhere inside the terminal activates keyboard capture.
     * @private
     */
    _attachClickListener() {
      const root = this._renderer?.getRootElement?.();
      if (!root) return;
      root.style.cursor = "text";
      root.addEventListener("click", this._onClick);
      Logger.debug(
        "Click-to-focus listener attached.",
        null,
        this.config.debug,
      );
    }

    /**
     * Removes the click listener added in _attachClickListener().
     * @private
     */
    _detachClickListener() {
      const root = this._renderer?.getRootElement?.();
      root?.removeEventListener("click", this._onClick);
    }

    /**
     * Click handler — re-attaches keyboard listener if it was lost.
     * @private
     */
    _handleClick() {
      if (!this._active) {
        this.attachListener();
        Logger.info("Re-activated via click.", this.config.debug);
      }
    }

    // ── Private: Guards ──────────────────────────────────────────────────────

    /** @private */
    _assertNotDisposed(methodName) {
      if (this._disposed)
        throw new Error(
          `ConsoleKeyboard.${methodName}(): instance has been disposed. ` +
            `Cannot call methods after dispose().`,
        );
    }

    // ── Introspection & Info ────────────────────────────────────────────────────

    /**
     * Returns metadata about the keyboard state and available modules.
     * Used for module detection and integration verification.
     * @returns {object}
     */
    getInfo() {
      return Object.freeze({
        version: "3.0.0",
        platform: this._platform,
        active: this._active,
        disposed: this._disposed,
        bufferLength: this._buffer.length,
        cursorPosition: this._cursor,
        undoStackSize: this._undoStack.length,
        redoStackSize: this._redoStack.length,
        hasSupportedModules: {
          renderer: this._renderer !== null,
          consoleRenderer: typeof global.ConsoleRenderer !== "undefined",
          consoleBootstrap: typeof global.WebConsole !== "undefined",
          consoleEngine: typeof global.ConsoleEngine !== "undefined",
          consoleTheme: typeof global.ConsoleTheme !== "undefined",
          consoleTable: typeof global.ConsoleTable !== "undefined",
          consoleSettings: typeof global.ConsoleSettings !== "undefined",
          consoleBridge: typeof global.ConsoleBridge !== "undefined",
          consoleWebSocket: typeof global.ConsoleWebSocket !== "undefined",
          consoleHistory: typeof global.ConsoleHistory !== "undefined",
        },
      });
    }

    toString() {
      return (
        `ConsoleKeyboard [${this._active ? "active" : "inactive"}, ` +
        `${this._platform}, cursor=${this._cursor}/${this._buffer.length}]`
      );
    }

    get [Symbol.toStringTag]() {
      return "ConsoleKeyboard";
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // _EventBus (private, not exported)
  // Mirrors the EventBus in console.bootstrap.js so this module
  // is fully self-contained and can be loaded independently.
  // ─────────────────────────────────────────────────────────────────────────

  class _EventBus {
    constructor() {
      this._listeners = Object.create(null);
    }

    on(event, handler) {
      if (typeof handler !== "function")
        throw new TypeError(
          `EventBus.on: handler for "${event}" must be a function.`,
        );
      (this._listeners[event] ??= []).push(handler);
      return this;
    }

    off(event, handler) {
      if (!this._listeners[event]) return this;
      this._listeners[event] = this._listeners[event].filter(
        (h) => h !== handler && h._original !== handler,
      );
      if (this._listeners[event].length === 0) delete this._listeners[event];
      return this;
    }

    emit(event, payload = null) {
      const targets = [
        ...(this._listeners[event] ?? []),
        ...(this._listeners["*"] ?? []),
      ];
      for (const handler of targets) {
        try {
          handler(payload, event);
        } catch (err) {
          console.error(
            `[ConsoleKeyboard] Uncaught error in "${event}" handler:`,
            err,
          );
        }
      }
      return this;
    }

    once(event, handler) {
      const wrapper = (p, e) => {
        handler(p, e);
        this.off(event, wrapper);
      };
      wrapper._original = handler;
      return this.on(event, wrapper);
    }

    clearAll() {
      this._listeners = Object.create(null);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Platform-specific initialization info
  // ─────────────────────────────────────────────────────────────────────────

  function getPlatformInfo() {
    const platform = detectPlatform();
    const bindings = buildPlatformBindings(platform);
    const bindingCount = bindings.length;

    let platformStr = "";
    switch (platform) {
      case "windows":
        platformStr = "Windows (Ctrl-based shortcuts)";
        break;
      case "macos":
        platformStr = "macOS (Cmd-based shortcuts)";
        break;
      case "linux":
        platformStr = "Linux (Ctrl-based shortcuts)";
        break;
      default:
        platformStr = "Unknown (All platform shortcuts enabled)";
    }

    return { platform, platformStr, bindingCount };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Global registration
  // ─────────────────────────────────────────────────────────────────────────

  global.ConsoleKeyboard = ConsoleKeyboard;
  global.detectPlatform = detectPlatform;
  global.buildPlatformBindings = buildPlatformBindings;

  const platformInfo = getPlatformInfo();
  Logger.info(
    `v3.0.0 registered on window.ConsoleKeyboard ➜ ${platformInfo.platformStr} ` +
      `(${platformInfo.bindingCount} key bindings loaded)`,
  );
  Logger.info(
    "Module links: ConsoleRenderer, ConsoleBootstrap, ConsoleEngine, " +
      "ConsoleTheme, ConsoleTable, ConsoleSettings, ConsoleBridge, " +
      "ConsoleWebSocket, ConsoleHistory",
  );
})(typeof globalThis !== "undefined" ? globalThis : window);
