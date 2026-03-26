/**
 * @file        css.linkage.js
 * @description CSS Integration Layer — Connects all modules with terminal.css
 *
 * This file provides:
 * - Dynamic CSS variable injection from ConsoleTheme
 * - Automatic theme synchronization across all components
 * - Module initialization with CSS integration
 * - Real-time CSS updates via WebSocket
 * - DOM element styling coordination
 *
 * Modules integrated:
 * - console.theme.js (CSS Theme Management)
 * - console.renderer.js (Text Rendering)
 * - console.keyboard.js (Keyboard UI)
 * - console.table.js (Table Display)
 * - console.bootstrap.js (Initialization)
 * - ConsoleSettings (Configuration)
 * - ConsoleBridge (HTTP API)
 * - ConsoleWebSocket (Real-time Updates)
 *
 * @version 2.0.0
 * @license MIT
 */

(function (global) {
  "use strict";

  if (typeof global.CSSLinkage !== "undefined") {
    console.warn("[CSSLinkage] Already registered — skipping re-definition.");
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Logger Utility
  // ═══════════════════════════════════════════════════════════════════════════

  class _Logger {
    constructor(debug = false) {
      this.debug = debug;
    }

    log(message, data) {
      if (this.debug)
        console.log(`%c[CSSLinkage] ${message}`, "color: #00cc00", data || "");
    }

    error(message, data) {
      console.error(
        `%c[CSSLinkage] ✗ ${message}`,
        "color: #ff0000",
        data || ""
      );
    }

    warn(message, data) {
      console.warn(`%c[CSSLinkage] ⚠ ${message}`, "color: #ffaa00", data || "");
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CSS Manager
  // ═══════════════════════════════════════════════════════════════════════════

  class CSSLinkage {
    constructor(config = {}) {
      this.config = config;
      this.debug = config.debug || false;
      this.version = "2.0.0";
      this._logger = new _Logger(this.debug);

      // Module references
      this._theme = null;
      this._renderer = null;
      this._keyboard = null;
      this._table = null;
      this._settings = null;
      this._bridge = null;
      this._websocket = null;

      // CSS state
      this._styleElement = null;
      this._currentTheme = "dark";
      this._cssVariables = {};
      this._isDOMReady = false;

      // Initialize
      this._init();

      this._logger.log("Instantiated (v2.0.0)");
    }

    // ── Initialization ──────────────────────────────────────────────────

    _init() {
      // Wait for DOM ready
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () =>
          this._onDOMReady()
        );
      } else {
        this._onDOMReady();
      }
    }

    _onDOMReady() {
      this._isDOMReady = true;
      this._logger.log("DOM ready — initializing CSS integration");

      // Create style element for CSS variables
      this._createStyleElement();

      // Initialize CSS variables from theme
      this._initializeTheme();

      // Setup event listeners
      this._setupEventListeners();

      // Store bound listeners for later removal
      this._boundOnThemeChanged = (data) => this._onThemeChanged(data);

      // Apply initial styles to body
      this._applyBodyStyles();
    }

    // ── Style Element Management ────────────────────────────────────────

    _createStyleElement() {
      // Check if style element already exists
      let styleEl = document.getElementById("console-css-variables");

      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "console-css-variables";
        styleEl.type = "text/css";
        document.head.appendChild(styleEl);
      }

      this._styleElement = styleEl;
      this._logger.log("Style element created/found");
    }

    _updateStyleElement() {
      if (!this._styleElement) {
        this._createStyleElement();
      }

      const css = this._generateCSSString();
      this._styleElement.textContent = css;
      this._logger.log("Style element updated");
    }

    _generateCSSString() {
      const vars = Object.entries(this._cssVariables)
        .map(([key, value]) => `  ${key}: ${value};`)
        .join("\n");

      return `:root {\n${vars}\n}`;
    }

    // ── Theme Initialization ────────────────────────────────────────────

    _initializeTheme() {
      if (!this._theme) {
        this._logger.warn(
          "ConsoleTheme not linked yet — CSS variables will be initialized when linked"
        );
        return;
      }

      const cssVars = this._theme.getCSSVariables();
      this._cssVariables = { ...cssVars };
      this._currentTheme = this._theme.getCurrent();

      this._updateStyleElement();
      this._logger.log(
        `Theme initialized: ${this._currentTheme}`,
        this._cssVariables
      );
    }

    // ── Body Styling ────────────────────────────────────────────────────

    _applyBodyStyles() {
      if (!document.body) return;

      document.body.setAttribute("data-theme", this._currentTheme);
      document.body.style.backgroundColor = this._cssVariables[
        "--console-bg"
      ] || "#0d0d0d";
      document.body.style.color = this._cssVariables["--console-text"] ||
        "#c8c8c8";
    }

    // ── Event Listeners ────────────────────────────────────────────────

    _setupEventListeners() {
      // Theme change event from ConsoleTheme
      if (this._theme) {
        this._theme.on("theme:changed", this._boundOnThemeChanged);

        this._theme.on("theme:overridden", (data) => {
          this._onThemeOverridden(data);
        });
      }

      // WebSocket theme changes
      if (this._websocket) {
        this._websocket.subscribe("theme_channel", null, (message) => {
          if (message.type === "theme_changed") {
            this._logger.log("WebSocket theme change detected", message);
            this._onThemeChanged({
              from: message.from,
              to: message.to,
              theme: message.theme,
            });
          }
        });
      }

      this._logger.log("Event listeners setup complete");
    }

    // ── Theme Change Handlers ──────────────────────────────────────────

    _onThemeChanged(data) {
      this._logger.log(`Theme changed: ${data.from} → ${data.to}`);

      this._currentTheme = data.to;
      this._cssVariables = this._theme.getCSSVariables();
      this._updateStyleElement();
      this._applyBodyStyles();

      // Notify all integrated components
      this._notifyComponentsThemeChanged(data);
    }

    _onThemeOverridden(data) {
      this._logger.log(`Color override: ${data.field} = ${data.value}`);

      const cssVarName = this._fieldToCSSVar(data.field);
      this._cssVariables[cssVarName] = data.value;
      this._updateStyleElement();

      // Notify components
      this._notifyComponentsThemeOverridden(data);
    }

    _fieldToCSSVar(field) {
      const mapping = {
        bg: "--console-bg",
        surface: "--console-surface",
        border: "--console-border",
        text: "--console-text",
        prompt: "--console-prompt",
        cursor: "--console-cursor",
        output: "--console-output",
        info: "--console-info",
        warn: "--console-warn",
        error: "--console-error",
        success: "--console-success",
        muted: "--console-muted",
        selection: "--console-selection",
        scrollbar: "--console-scrollbar",
        font: "--console-font",
        fontSize: "--console-font-size",
        lineHeight: "--console-line-height",
      };

      return mapping[field] || `--console-${field}`;
    }

    // ── Component Notifications ────────────────────────────────────────

    _notifyComponentsThemeChanged(data) {
      // Notify Renderer
      if (this._renderer && typeof this._renderer.onThemeChanged === "function") {
        try {
          this._renderer.onThemeChanged(data);
        } catch (error) {
          this._logger.error("Error notifying Renderer of theme change", error);
        }
      }

      // Notify Keyboard
      if (this._keyboard && typeof this._keyboard.onThemeChanged === "function") {
        try {
          this._keyboard.onThemeChanged(data);
        } catch (error) {
          this._logger.error("Error notifying Keyboard of theme change", error);
        }
      }

      // Notify Table
      if (this._table && typeof this._table.onThemeChanged === "function") {
        try {
          this._table.onThemeChanged(data);
        } catch (error) {
          this._logger.error("Error notifying Table of theme change", error);
        }
      }

      // Notify Settings
      if (this._settings) {
        try {
          this._settings.setSetting("terminal.theme", data.to);
        } catch (error) {
          this._logger.error("Error updating Settings theme", error);
        }
      }

      this._logger.log("All components notified of theme change");
    }

    _notifyComponentsThemeOverridden(data) {
      // Notify Renderer
      if (
        this._renderer &&
        typeof this._renderer.onThemeOverridden === "function"
      ) {
        try {
          this._renderer.onThemeOverridden(data);
        } catch (error) {
          this._logger.error("Error notifying Renderer of override", error);
        }
      }

      // Notify Keyboard
      if (
        this._keyboard &&
        typeof this._keyboard.onThemeOverridden === "function"
      ) {
        try {
          this._keyboard.onThemeOverridden(data);
        } catch (error) {
          this._logger.error("Error notifying Keyboard of override", error);
        }
      }

      // Notify Table
      if (this._table && typeof this._table.onThemeOverridden === "function") {
        try {
          this._table.onThemeOverridden(data);
        } catch (error) {
          this._logger.error("Error notifying Table of override", error);
        }
      }

      this._logger.log("All components notified of theme override");
    }

    // ── Module Linking ────────────────────────────────────────────────

    /**
     * Link with modules
     */
    linkModules(modules = {}) {
      this._theme = modules.ConsoleTheme || this._theme;
      this._renderer = modules.ConsoleRenderer || this._renderer;
      this._keyboard = modules.ConsoleKeyboard || this._keyboard;
      this._table = modules.ConsoleTable || this._table;
      this._settings = modules.ConsoleSettings || this._settings;
      this._bridge = modules.ConsoleBridge || this._bridge;
      this._websocket = modules.ConsoleWebSocket || this._websocket;

      const linked = [];
      if (this._theme) linked.push("ConsoleTheme");
      if (this._renderer) linked.push("ConsoleRenderer");
      if (this._keyboard) linked.push("ConsoleKeyboard");
      if (this._table) linked.push("ConsoleTable");
      if (this._settings) linked.push("ConsoleSettings");
      if (this._bridge) linked.push("ConsoleBridge");
      if (this._websocket) linked.push("ConsoleWebSocket");

      if (linked.length > 0) {
        this._logger.log(`Modules linked: ${linked.join(", ")}`);
        this._setupEventListeners();
        this._initializeTheme();
      }

      return linked.length > 0;
    }

    // ── Public API ──────────────────────────────────────────────────────

    /**
     * Get current CSS variables
     */
    getCSSVariables() {
      return { ...this._cssVariables };
    }

    /**
     * Set a CSS variable
     */
    setCSSVariable(name, value) {
      this._cssVariables[name] = value;
      this._updateStyleElement();
      this._logger.log(`CSS variable set: ${name} = ${value}`);
    }

    /**
     * Get current theme name
     */
    getCurrentTheme() {
      return this._currentTheme;
    }

    /**
     * Inject CSS variables into a specific element
     */
    injectToElement(element, variables = null) {
      if (!element) {
        this._logger.error("Element not provided");
        return false;
      }

      const vars = variables || this._cssVariables;

      try {
        Object.entries(vars).forEach(([key, value]) => {
          element.style.setProperty(key, value);
        });

        this._logger.log("CSS variables injected into element", variables);
        return true;
      } catch (error) {
        this._logger.error("Error injecting CSS variables", error);
        return false;
      }
    }

    /**
     * Get computed CSS variable value from DOM
     */
    getComputedVariable(varName) {
      try {
        return getComputedStyle(document.documentElement).getPropertyValue(
          varName
        );
      } catch (error) {
        this._logger.error(`Error getting computed variable ${varName}`, error);
        return null;
      }
    }

    /**
     * Apply theme to all terminal elements
     */
    applyThemeToAllElements() {
      const selectors = [
        ".console-terminal",
        ".console-input-field",
        ".console-output-line",
        ".console-keyboard",
        ".console-table",
        ".console-renderer",
      ];

      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          this.injectToElement(el);
        });
      });

      this._logger.log("Theme applied to all terminal elements");
    }

    /**
     * Export current CSS as string
     */
    exportCSS() {
      return this._generateCSSString();
    }

    /**
     * Verify CSS integration
     */
    verify() {
      const verification = {
        domReady: this._isDOMReady,
        styleElementCreated: !!this._styleElement,
        cssVariables: Object.keys(this._cssVariables).length,
        currentTheme: this._currentTheme,
        modulesLinked: {
          theme: !!this._theme,
          renderer: !!this._renderer,
          keyboard: !!this._keyboard,
          table: !!this._table,
          settings: !!this._settings,
          bridge: !!this._bridge,
          websocket: !!this._websocket,
        },
      };

      this._logger.log("Verification complete", verification);
      return verification;
    }

    /**
     * Get debug info
     */
    debugInfo() {
      return {
        version: this.version,
        isDOMReady: this._isDOMReady,
        styleElement: this._styleElement ? "present" : "missing",
        currentTheme: this._currentTheme,
        cssVariables: this._cssVariables,
        modulesLinked: {
          ConsoleTheme: !!this._theme,
          ConsoleRenderer: !!this._renderer,
          ConsoleKeyboard: !!this._keyboard,
          ConsoleTable: !!this._table,
          ConsoleSettings: !!this._settings,
          ConsoleBridge: !!this._bridge,
          ConsoleWebSocket: !!this._websocket,
        },
      };
    }

    /**
     * Dispose and clean up resources
     */
    dispose() {
      // Remove event listeners
      if (this._theme && this._boundOnThemeChanged) {
        this._theme.off("theme:changed", this._boundOnThemeChanged);
      }
      // Add cleanup for websocket listeners if any

      // Remove style element
      this._styleElement?.remove();

      // Clear references
      this._theme = null;
      this._renderer = null;

      this._logger.log("Disposed");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Global Exposure
  // ─────────────────────────────────────────────────────────────────────────
  global.CSSLinkage = CSSLinkage;
})(typeof globalThis !== "undefined" ? globalThis : window);
