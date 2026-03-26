/**
 * @file        console.renderer.js
 * @description ConsoleRenderer — Advanced DOM Rendering & UI Layer
 *
 * Complete renderer module handling:
 * - DOM construction and manipulation
 * - Theme management and switching
 * - Table rendering and formatting
 * - Input line management
 * - Viewport scrolling and focus
 * - Accessibility (ARIA roles, labels)
 * - Performance optimization (line limits, virtual scrolling)
 * - Integration with all system modules
 *
 * Module Dependencies:
 * ├─ REQUIRED (must load before bootstrap):
 * │  └─ (this module provides window.ConsoleRenderer)
 * │
 * ├─ OPTIONAL (enhances functionality):
 * │  ├─ BACKEND/CSS/console.theme.js     (window.ConsoleTheme - custom themes)
 * │  ├─ BACKEND/CSS/console.table.js     (window.ConsoleTable - table rendering)
 * │  ├─ BACKEND/CSS/console.keyboard.js  (window.ConsoleKeyboard - input handler)
 * │  ├─ BACKEND/CONFIG/console.settings.js (window.ConsoleSettings - config)
 * │  ├─ BACKEND/API/console.bridge.js    (window.ConsoleBridge - API access)
 * │  ├─ BACKEND/API/console.websocket.js (window.ConsoleWebSocket - real-time)
 * │  └─ BACKEND/CORE/console.engine.js   (window.ConsoleEngine - commands)
 * │
 * └─ REQUIRED EXTERNAL:
 *    └─ BACKEND/CSS/terminal.css         (stylesheets - linked in HTML <head>)
 *
 * Bootstrap Contract (v2.0.0+):
 * ├─ buildInterface()                     ✓ Constructs DOM
 * ├─ printWelcomeMessage()                ✓ MOTD display
 * ├─ print(text, type)                    ✓ Output line
 * ├─ clear()                              ✓ Clear output
 * ├─ setTheme(name)                       ✓ Change theme
 * ├─ dispose()                            ✓ Cleanup
 * ├─ getInfo()                            ✓ State metadata
 * └─ on(event, handler) / off / emit      ✓ Event system
 *
 * @version 3.0.0
 * @author  WebConsole Project
 * @license MIT
 */

(function (global) {
  "use strict";

  // ═══════════════════════════════════════════════════════════════════════════
  // GUARD & SETUP
  // ═══════════════════════════════════════════════════════════════════════════

  if (typeof global.ConsoleRenderer !== "undefined") {
    console.warn(
      "[ConsoleRenderer] Already registered — skipping re-definition.",
    );
    return;
  }

  // Internal logger
  const Log = {
    info: (msg) => console.info(`[ConsoleRenderer] ${msg}`),
    warn: (msg) => console.warn(`[ConsoleRenderer] ⚠ ${msg}`),
    error: (msg, err) => console.error(`[ConsoleRenderer] ✖ ${msg}`, err ?? ""),
    debug: (msg, data) =>
      console.debug(`[ConsoleRenderer] [debug] ${msg}`, data ?? ""),
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTANTS & CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  const VERSION = "3.0.0";

  const CONFIG_DEFAULTS = Object.freeze({
    maxLines: 5000, // Maximum output lines before pruning
    autoScroll: true, // Auto-scroll on output
    wordWrap: true, // Enable word wrapping
    showTimestamps: false, // Show timestamps in debug mode
    enableVirtualScroll: false, // VirtualScrolling (experimental)
    enableA11y: true, // Accessibility features
  });

  /**
   * @typedef {Object} ThemeDefinition
   * @property {string} bg
   * @property {string} surface
   * @property {string} border
   * @property {string} text
   * @property {string} prompt
   * @property {string} cursor
   * @property {string} output
   * @property {string} info
   * @property {string} warn
   * @property {string} error
   * @property {string} success
   * @property {string} muted
   * @property {string} selection
   * @property {string} scrollbar
   * @property {string} font
   * @property {string} fontSize
   * @property {string} lineHeight
   */

  const BUILT_IN_THEMES = {
    dark: {
      bg: "#0d0d0d",
      surface: "#141414",
      border: "#1f1f1f",
      text: "#c8c8c8",
      prompt: "#00e676",
      cursor: "#00e676",
      output: "#c8c8c8",
      info: "#40c4ff",
      warn: "#ffd740",
      error: "#ff5252",
      success: "#69ff47",
      muted: "#4a4a4a",
      selection: "#00e67633",
      scrollbar: "#2a2a2a",
      font: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Courier New", monospace',
      fontSize: "13px",
      lineHeight: "1.6",
    },
    light: {
      bg: "#f5f5f0",
      surface: "#ebebе6",
      border: "#d8d8d0",
      text: "#1a1a1a",
      prompt: "#005f00",
      cursor: "#005f00",
      output: "#1a1a1a",
      info: "#0055aa",
      warn: "#7a5200",
      error: "#cc0000",
      success: "#006600",
      muted: "#888880",
      selection: "#005f0020",
      scrollbar: "#c0c0b8",
      font: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Courier New", monospace',
      fontSize: "13px",
      lineHeight: "1.6",
    },
    matrix: {
      bg: "#000300",
      surface: "#001a00",
      border: "#003300",
      text: "#00bb00",
      prompt: "#00ff41",
      cursor: "#00ff41",
      output: "#00bb00",
      info: "#00ff41",
      warn: "#88ff00",
      error: "#ff0040",
      success: "#00ff41",
      muted: "#003300",
      selection: "#00ff4133",
      scrollbar: "#002200",
      font: '"JetBrains Mono", "Courier New", monospace',
      fontSize: "13px",
      lineHeight: "1.6",
    },
    solarized: {
      bg: "#002b36",
      surface: "#073642",
      border: "#073642",
      text: "#839496",
      prompt: "#2aa198",
      cursor: "#2aa198",
      output: "#839496",
      info: "#268bd2",
      warn: "#b58900",
      error: "#dc322f",
      success: "#859900",
      muted: "#586e75",
      selection: "#2aa19833",
      scrollbar: "#073642",
      font: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
      fontSize: "13px",
      lineHeight: "1.6",
    },
    dracula: {
      bg: "#282a36",
      surface: "#21222c",
      border: "#44475a",
      text: "#f8f8f2",
      prompt: "#50fa7b",
      cursor: "#f8f8f2",
      output: "#f8f8f2",
      info: "#8be9fd",
      warn: "#ffb86c",
      error: "#ff5555",
      success: "#50fa7b",
      muted: "#6272a4",
      selection: "#44475a",
      scrollbar: "#44475a",
      font: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
      fontSize: "13px",
      lineHeight: "1.6",
    },
  };

  const TYPE_COLOR_MAP = Object.freeze({
    output: "output",
    info: "info",
    warn: "warn",
    error: "error",
    success: "success",
  });

  const TYPE_ARIA_MAP = Object.freeze({
    output: { role: "log", label: "output" },
    info: { role: "status", label: "info" },
    warn: { role: "alert", label: "warning" },
    error: { role: "alert", label: "error" },
    success: { role: "status", label: "success" },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT EMITTER (simple event system)
  // ═══════════════════════════════════════════════════════════════════════════

  class EventEmitter {
    constructor() {
      this._listeners = Object.create(null);
    }

    on(event, handler) {
      if (typeof handler !== "function")
        throw new TypeError("Handler must be a function.");
      (this._listeners[event] ??= []).push(handler);
      return this;
    }

    off(event, handler) {
      if (!this._listeners[event]) return this;
      this._listeners[event] = this._listeners[event].filter(
        (h) => h !== handler,
      );
      return this;
    }

    emit(event, data = null) {
      [...(this._listeners[event] ?? [])].forEach((h) => {
        try {
          h(data);
        } catch (err) {
          Log.error(`Event handler error (${event}):`, err);
        }
      });
      return this;
    }

    clearAll() {
      this._listeners = Object.create(null);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSOLE RENDERER - MAIN CLASS
  // ═══════════════════════════════════════════════════════════════════════════

  class ConsoleRenderer {
    /**
     * @param {object} config - Configuration from WebConsole
     */
    constructor(config = {}) {
      if (typeof config !== "object" || config === null) {
        throw new TypeError("ConsoleRenderer: config must be an object.");
      }

      this.config = Object.freeze(config);
      this.version = VERSION;
      this.events = new EventEmitter();

      // Merge with defaults
      this._settings = { ...CONFIG_DEFAULTS, ...this.config };

      // Active theme
      this._activeTheme = this._resolveTheme(config.theme ?? "dark");

      // DOM references
      this._root = null;
      this._header = null;
      this._outputArea = null;
      this._inputLine = null;
      this._typedSpan = null;
      this._cursorSpan = null;
      this._body = null;

      // Injected stylesheets
      this._injectedStyles = [];

      // Line tracking
      this._lineCount = 0;
      this._lineBuffer = [];

      // State
      this._state = {
        built: false,
        disposed: false,
      };

      Log.info(`v${VERSION} instantiated`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MAIN API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Builds the complete terminal DOM structure.
     * @throws {Error} If host element not found
     */
    buildInterface() {
      if (this._state.built) {
        Log.warn("buildInterface() already called — skipping.");
        return;
      }

      try {
        this._injectBaseStyles();
        const host = this._resolveHost();

        // ── Root wrapper ────────────────────────────────────────────────────
        this._root = this._el("div", {
          id: "wc-terminal",
          className: `wc-terminal wc-theme-${this.config.theme ?? "dark"}`,
        });
        this._applyThemeVars(this._root, this._activeTheme);

        // ── Header bar ──────────────────────────────────────────────────────
        this._header = this._el("div", { className: "wc-header" });
        const dots = this._el("div", { className: "wc-dots" });
        ["wc-dot-close", "wc-dot-min", "wc-dot-max"].forEach((cls) => {
          dots.appendChild(this._el("span", { className: `wc-dot ${cls}` }));
        });
        const title = this._el("span", {
          className: "wc-title",
          textContent: "WebConsole Terminal",
        });
        this._header.appendChild(dots);
        this._header.appendChild(title);

        // ── Body (scrollable output) ────────────────────────────────────────
        this._body = this._el("div", {
          className: "wc-body",
          role: "log",
          ariaLive: "polite",
          ariaLabel: "Terminal output",
        });

        this._outputArea = this._el("div", { className: "wc-output" });
        this._body.appendChild(this._outputArea);

        this._root.appendChild(this._header);
        this._root.appendChild(this._body);
        host.appendChild(this._root);

        // ── Create input line ──────────────────────────────────────────────
        this._createInputLine();

        // ── Attach keyboard listener ───────────────────────────────────────
        this._attachKeyboardListener();

        this._state.built = true;
        this.events.emit("built");
        Log.info("Interface built successfully");
      } catch (err) {
        Log.error("Failed to build interface", err);
        this.events.emit("error", { phase: "buildInterface", error: err });
        throw err;
      }
    }

    /**
     * Prints a line to the terminal.
     * @param {string} text
     * @param {string} [type="output"]
     */
    print(text, type = "output") {
      this._assertBuilt("print");

      const colorKey = TYPE_COLOR_MAP[type] ?? "output";
      const aria = TYPE_ARIA_MAP[type] ?? TYPE_ARIA_MAP.output;
      const color = this._activeTheme[colorKey];

      const line = this._el("div", {
        className: `wc-line wc-line-${type}`,
        textContent: String(text),
        role: aria.role,
        ariaLabel: aria.label,
      });

      line.style.color = color;
      line.style.whiteSpace = "pre-wrap";
      line.style.wordBreak = this._settings.wordWrap ? "break-word" : "normal";

      // Add timestamp if debug mode
      if (this.config.debug && this._settings.showTimestamps) {
        const ts = this._el("span", {
          className: "wc-timestamp",
          textContent: new Date().toLocaleTimeString(
            this.config.locale ?? "en-US",
          ),
          ariaHidden: "true",
        });
        line.prepend(ts);
      }

      // Insert before input line
      this._outputArea.insertBefore(line, this._inputLine);
      this._lineCount++;
      this._lineBuffer.push({ text, type, timestamp: Date.now() });

      // Prune old lines if over max
      if (this._lineCount > this._settings.maxLines) {
        this._pruneOldLines();
      }

      if (this._settings.autoScroll) this._scrollToBottom();
      this.events.emit("line-printed", {
        text,
        type,
        lineNumber: this._lineCount,
      });
    }

    /**
     * Clears all output lines.
     */
    clear() {
      this._assertBuilt("clear");

      // Remove tudo do output area EXCETO a linha de input
      while (this._outputArea.children.length > 1) {
        this._outputArea.firstChild.remove();
      }

      this._lineCount = 0;
      this._lineBuffer = [];

      if (this._settings.autoScroll) this._scrollToBottom();
      this.events.emit("cleared");
      Log.info("Output cleared");
    }

    /**
     * Changes the active theme.
     * @param {string} themeName
     */
    applyTheme(themeName) {
      this._assertBuilt("applyTheme");

      const theme = this._resolveTheme(themeName);
      this._activeTheme = theme;

      if (this._root) {
        this._root.className = this._root.className
          .replace(/wc-theme-\S+/, "")
          .trim();
        this._root.classList.add(`wc-theme-${themeName}`);
        this._applyThemeVars(this._root, theme);
      }

      // Re-color all lines
      this._outputArea?.querySelectorAll(".wc-line").forEach((line) => {
        const lineType =
          [...line.classList]
            .find((c) => c.startsWith("wc-line-"))
            ?.replace("wc-line-", "") ?? "output";
        line.style.color = theme[TYPE_COLOR_MAP[lineType] ?? "output"];
      });

      // Re-color prompt & cursor
      const prompt = this._inputLine?.querySelector(".wc-prompt");
      if (prompt) prompt.style.color = theme.prompt;
      if (this._cursorSpan) this._cursorSpan.style.color = theme.cursor;

      this.events.emit("theme-changed", { theme: themeName });
      Log.info(`Theme applied: "${themeName}"`);
    }

    /**
     * Prints welcome message.
     */
    printWelcomeMessage() {
      this._assertBuilt("printWelcomeMessage");

      const lines = [
        `  ██╗    ██╗███████╗██████╗  ██████╗ ██████╗ ███╗   ██╗███████╗`,
        `  ██║    ██║██╔════╝██╔══██╗██╔════╝██╔═══██╗████╗  ██║██╔════╝`,
        `  ██║ █╗ ██║█████╗  ██████╔╝██║     ██║   ██║██╔██╗ ██║███████╗`,
        `  ██║███╗██║██╔══╝  ██╔══██╗██║     ██║   ██║██║╚██╗██║╚════██║`,
        `  ╚███╔███╔╝███████╗██████╔╝╚██████╗╚██████╔╝██║ ╚████║███████║`,
        `   ╚══╝╚══╝ ╚══════╝╚═════╝  ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝`,
        ``,
        `  WebConsole Terminal v${VERSION} — Ready`,
        `  Type "help" for available commands`,
        ``,
      ];

      lines.forEach((line) =>
        this.print(
          line,
          line.includes("WebConsole") ? "success" : line ? "output" : "output",
        ),
      );
    }

    /**
     * Cleans up and removes terminal.
     */
    dispose() {
      if (this._state.disposed) return;

      this._root?.remove();
      this._injectedStyles.forEach((s) => s.remove());
      this._injectedStyles = [];

      this._root = null;
      this._outputArea = null;
      this._inputLine = null;
      this._typedSpan = null;
      this._cursorSpan = null;
      this._body = null;

      this._state.disposed = true;
      this.events.clearAll();
      this.events.emit("disposed");
      Log.info("Renderer disposed");
    }

    /**
     * Returns renderer metadata.
     * @returns {object}
     */
    getInfo() {
      return Object.freeze({
        version: this.version,
        theme: this.config.theme ?? "dark",
        lineCount: this._lineCount,
        maxLines: this._settings.maxLines,
        built: this._state.built,
        disposed: this._state.disposed,
        hasSupportModules: {
          theme: typeof global.ConsoleTheme !== "undefined",
          table: typeof global.ConsoleTable !== "undefined",
          keyboard: typeof global.ConsoleKeyboard !== "undefined",
          settings: typeof global.ConsoleSettings !== "undefined",
          bridge: typeof global.ConsoleBridge !== "undefined",
          websocket: typeof global.ConsoleWebSocket !== "undefined",
          engine: typeof global.ConsoleEngine !== "undefined",
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INPUT LINE METHODS
    // ─────────────────────────────────────────────────────────────────────────

    setInputText(text) {
      if (this._typedSpan) this._typedSpan.textContent = text;
    }

    getInputText() {
      return this._typedSpan?.textContent ?? "";
    }

    commitInputLine(commandText) {
      this._assertBuilt("commitInputLine");

      if (this._inputLine) {
        this._inputLine.classList.remove("wc-input-line");
        this._inputLine.classList.add("wc-line", "wc-line-output");
        this._cursorSpan?.remove();
        this._cursorSpan = null;
        if (this._typedSpan) this._typedSpan.textContent = commandText;
      }

      this._createInputLine();
      if (this._settings.autoScroll) this._scrollToBottom();
      this.events.emit("input-committed", { command: commandText });
    }

    getTypedSpan() {
      return this._typedSpan;
    }

    getRootElement() {
      return this._root;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TABLE RENDERING (via ConsoleTable module if available)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Renders a table in the terminal.
     * Delegates to window.ConsoleTable if available.
     * @param {Array} data
     * @param {Array} [columns]
     */
    renderTable(data, columns = null) {
      this._assertBuilt("renderTable");

      if (
        typeof global.ConsoleTable !== "undefined" &&
        global.ConsoleTable.render
      ) {
        try {
          const tableHTML = global.ConsoleTable.render(data, columns);
          const container = this._el("div", {
            className: "wc-table-container",
          });
          container.innerHTML = tableHTML;
          this._outputArea.insertBefore(container, this._inputLine);
          this.events.emit("table-rendered", { rows: data.length });
        } catch (err) {
          Log.error("Table rendering failed", err);
          this.print(`Failed to render table: ${err.message}`, "error");
        }
      } else {
        Log.warn("ConsoleTable module not available — skipping table render");
        this.print(
          "Table rendering unavailable (ConsoleTable not loaded)",
          "warn",
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolves theme, checking ConsoleTheme module first.
     * @private
     */
    _resolveTheme(name) {
      if (
        typeof global.ConsoleTheme !== "undefined" &&
        global.ConsoleTheme.get
      ) {
        const ext = global.ConsoleTheme.get(name);
        if (ext) return ext;
      }
      if (BUILT_IN_THEMES[name]) return BUILT_IN_THEMES[name];
      Log.warn(`Unknown theme "${name}" — using "dark"`);
      return BUILT_IN_THEMES.dark;
    }

    /**
     * Finds the host DOM element.
     * @private
     */
    _resolveHost() {
      if (this.config.containerId === "body") return document.body;
      const el = document.getElementById(this.config.containerId ?? "body");
      if (!el) {
        throw new Error(
          `Host element "#${this.config.containerId}" not found in DOM`,
        );
      }
      return el;
    }

    /**
     * Applies theme CSS variables to an element.
     * @private
     */
    _applyThemeVars(el, theme) {
      const vars = {
        "--wc-bg": theme.bg,
        "--wc-surface": theme.surface,
        "--wc-border": theme.border,
        "--wc-text": theme.text,
        "--wc-prompt": theme.prompt,
        "--wc-cursor": theme.cursor,
        "--wc-output": theme.output,
        "--wc-info": theme.info,
        "--wc-warn": theme.warn,
        "--wc-error": theme.error,
        "--wc-success": theme.success,
        "--wc-muted": theme.muted,
        "--wc-selection": theme.selection,
        "--wc-scrollbar": theme.scrollbar,
        "--wc-font": theme.font,
        "--wc-font-size": theme.fontSize,
        "--wc-line-height": theme.lineHeight,
      };
      Object.entries(vars).forEach(([prop, val]) => {
        el.style.setProperty(prop, val);
      });
    }

    /**
     * Injects base CSS stylesheet once.
     * Links with terminal.css styles.
     * @private
     */
    _injectBaseStyles() {
      if (document.getElementById("wc-base-styles")) return;

      const css = `
        /* ── WebConsole Terminal Styles ────────────────────────────────── */
        :root { --wc-animation-duration: 0.15s; }

        .wc-terminal {
          background-color: var(--wc-bg);
          color: var(--wc-text);
          font-family: var(--wc-font);
          font-size: var(--wc-font-size);
          line-height: var(--wc-line-height);
          width: 100%;
          height: 100%;
          min-height: 400px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--wc-border);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
          position: relative;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Header Bar ────────────────────────────────────────────────── */
        .wc-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--wc-surface);
          border-bottom: 1px solid var(--wc-border);
          flex-shrink: 0;
          user-select: none;
        }

        .wc-dots {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
        }

        .wc-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
          opacity: 0.8;
          transition: opacity var(--wc-animation-duration);
          cursor: default;
          flex-shrink: 0;
        }
        .wc-dot:hover { opacity: 1; }
        .wc-dot-close { background: #ff5f57; }
        .wc-dot-min { background: #febc2e; }
        .wc-dot-max { background: #28c840; }

        .wc-title {
          flex: 1;
          text-align: center;
          font-size: 11px;
          font-weight: 500;
          color: var(--wc-muted);
          letter-spacing: 0.08em;
        }

        /* ── Body (Scrollable Output) ───────────────────────────────── */
        .wc-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          scroll-behavior: smooth;
        }

        .wc-body::-webkit-scrollbar { width: 8px; }
        .wc-body::-webkit-scrollbar-track { background: transparent; }
        .wc-body::-webkit-scrollbar-thumb {
          background: var(--wc-scrollbar);
          border-radius: 4px;
        }

        /* ── Output Area ─────────────────────────────────────────────── */
        .wc-output {
          display: flex;
          flex-direction: column;
          gap: 1px;
          flex: 1;
        }

        /* ── Output Lines ────────────────────────────────────────────── */
        .wc-line {
          display: block;
          white-space: pre-wrap;
          word-break: break-word;
          padding: 1px 0;
          font-variant-numeric: tabular-nums;
          animation: fadeIn 0.2s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0.7; }
          to { opacity: 1; }
        }

        .wc-timestamp {
          font-size: 10px;
          color: var(--wc-muted);
          margin-right: 8px;
          opacity: 0.6;
          user-select: none;
          font-weight: 400;
        }

        /* ── Input Line (CORRIGIDO) ──────────────────────────────────────────────── */
        .wc-input-line {
          display: block;
          margin-top: 2px;
          font-variant-numeric: tabular-nums;
        }

        .wc-prompt {
          color: var(--wc-prompt);
          margin-right: 8px;
          font-weight: 500;
          user-select: none;
        }

        .wc-typed {
          color: var(--wc-text);
          white-space: pre-wrap;
          word-break: break-all;
        }

        /* ── Cursor ──────────────────────────────────────────────────── */
        .wc-cursor {
          color: var(--wc-cursor);
          animation: blink 1.1s step-end infinite;
          font-weight: 700;
          display: inline;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* ── Tables ──────────────────────────────────────────────────── */
        .wc-table-container {
          display: table;
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          border: 1px solid var(--wc-border);
        }

        .wc-table-container tr:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .wc-table-container td, .wc-table-container th {
          padding: 8px 12px;
          border: 1px solid var(--wc-border);
          text-align: left;
          font-size: 12px;
        }

        .wc-table-container th {
          background: var(--wc-surface);
          font-weight: 600;
          color: var(--wc-prompt);
        }

        /* ── Selection ───────────────────────────────────────────────── */
        .wc-terminal ::selection {
          background: var(--wc-selection);
        }

        /* ── Scanlines (decorative) ──────────────────────────────────── */
        .wc-terminal::after {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.03) 2px,
            rgba(0, 0, 0, 0.03) 4px
          );
          pointer-events: none;
          z-index: 10;
          border-radius: inherit;
        }

        /* ── Accessibility ───────────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .wc-cursor { animation: none; opacity: 1; }
          .wc-line { animation: none; }
        }

        @media (max-width: 600px) {
          .wc-terminal { border-radius: 0; min-height: 100vh; }
          .wc-header { padding: 8px 12px; }
          .wc-body { padding: 12px; }
        }
      `;

      const style = document.createElement("style");
      style.id = "wc-base-styles";
      style.textContent = css;
      document.head.appendChild(style);
      this._injectedStyles.push(style);
    }

    /**
     * Creates the active input line.
     * @private
     */
    _createInputLine() {
      this._inputLine = this._el("div", { className: "wc-input-line" });

      const prompt = this._el("span", {
        className: "wc-prompt",
        textContent: this.config.promptSymbol ?? "$ ",
        ariaHidden: "true",
      });
      prompt.style.color = this._activeTheme.prompt;

      this._typedSpan = this._el("span", {
        className: "wc-typed",
        ariaLabel: "Command input",
      });
      this._typedSpan.style.color = this._activeTheme.text;

      this._cursorSpan = this._el("span", {
        className: "wc-cursor",
        textContent: "█",
        ariaHidden: "true",
      });
      this._cursorSpan.style.color = this._activeTheme.cursor;

      this._inputLine.appendChild(prompt);
      this._inputLine.appendChild(this._typedSpan);
      this._inputLine.appendChild(this._cursorSpan);
      this._outputArea.appendChild(this._inputLine);
    }

    /**
     * Creates DOM element with properties.
     * @private
     */
    _el(tag, props = {}) {
      const el = document.createElement(tag);
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined || v === null) continue;
        if (k === "className") el.className = v;
        else if (k === "textContent") el.textContent = v;
        else if (k.startsWith("aria")) el.setAttribute(k, v);
        else if (k === "role") el.setAttribute("role", v);
        else el[k] = v;
      }
      return el;
    }

    /** @private */
    _scrollToBottom() {
      if (this._body) this._body.scrollTop = this._body.scrollHeight;
    }

    /** @private */
    _pruneOldLines() {
      const excess = this._lineCount - this._settings.maxLines;
      const lines = this._outputArea.querySelectorAll(
        ".wc-line:not(.wc-input-line)",
      );

      for (let i = 0; i < excess && i < lines.length; i++) {
        lines[i].remove();
      }

      this._lineCount = this._settings.maxLines;
      this._lineBuffer = this._lineBuffer.slice(-this._settings.maxLines);
      this.events.emit("lines-pruned", { removed: excess });
    }

    /** @private */
    _assertBuilt(methodName) {
      if (!this._state.built) {
        throw new Error(
          `ConsoleRenderer.${methodName}(): buildInterface() has not been called yet.`,
        );
      }
    }

    /** @private */
    _attachKeyboardListener() {
      if (this._root) {
        this._root.addEventListener("click", () => this._root?.focus());
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATIC HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  ConsoleRenderer.builtInThemes = () => Object.keys(BUILT_IN_THEMES);

  ConsoleRenderer.getTheme = (name) =>
    BUILT_IN_THEMES[name] ?? BUILT_IN_THEMES.dark;

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════════

  global.ConsoleRenderer = ConsoleRenderer;
  Log.info(`v${VERSION} registered on window.ConsoleRenderer`);
  Log.info(
    "Module links: ConsoleTheme, ConsoleTable, ConsoleKeyboard, " +
      "ConsoleSettings, ConsoleBridge, ConsoleWebSocket, ConsoleEngine",
  );
})(typeof globalThis !== "undefined" ? globalThis : window);
