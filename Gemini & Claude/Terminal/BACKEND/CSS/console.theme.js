/**
 * @file        console.theme.js
 * @description ConsoleTheme — Advanced Dynamic Theme Manager
 *
 * Comprehensive theme management system with:
 * - 20+ pre-defined color palettes
 * - Custom theme registration and validation
 * - Theme persistence (LocalStorage)
 * - Export/Import functionality
 * - Real-time theme switching
 * - Integration with API (Bridge + WebSocket)
 * - Integration with CONFIG (ConsoleSettings)
 * - Event system for theme changes
 * - Advanced customization and overrides
 *
 * Used by ConsoleRenderer to apply CSS variables dynamically.
 * Integrates with: ConsoleSettings (CONFIG), ConsoleBridge (API), ConsoleWebSocket (API)
 *
 * @version 3.0.0
 * @license MIT
 */

(function (global) {
  "use strict";

  if (typeof global.ConsoleTheme !== "undefined") {
    console.warn("[ConsoleTheme] Already registered — skipping re-definition.");
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Logger Utility
  // ═══════════════════════════════════════════════════════════════════════════

  class _Logger {
    constructor(debug = false) {
      this.debug = debug;
      this.logs = [];
      this.maxLogs = 500;
    }

    _format() {
      return new Date().toISOString();
    }

    _store(level, message, data) {
      const entry = {
        timestamp: this._format(),
        level,
        message,
        data,
      };
      this.logs.push(entry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
    }

    log(message, data) {
      this._store("LOG", message, data);
      if (this.debug)
        console.log(`%c[ConsoleTheme] ${message}`, "color: #00ff00", data);
    }

    info(message, data) {
      this._store("INFO", message, data);
      console.log(
        `%c[ConsoleTheme] ℹ ${message}`,
        "color: #00aaff",
        data || "",
      );
    }

    warn(message, data) {
      this._store("WARN", message, data);
      console.warn(
        `%c[ConsoleTheme] ⚠ ${message}`,
        "color: #ffaa00",
        data || "",
      );
    }

    error(message, data) {
      this._store("ERROR", message, data);
      console.error(`%c[ConsoleTheme] ✗ ${message}`, "color: #ff0000", data);
    }

    getLogs(level) {
      if (level) {
        return this.logs.filter((log) => log.level === level);
      }
      return this.logs;
    }

    clearLogs() {
      this.logs = [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Theme Validator
  // ═══════════════════════════════════════════════════════════════════════════

  class _ThemeValidator {
    static REQUIRED_FIELDS = [
      "bg",
      "surface",
      "border",
      "text",
      "prompt",
      "cursor",
      "output",
      "info",
      "warn",
      "error",
      "success",
      "muted",
      "selection",
      "scrollbar",
      "font",
      "fontSize",
      "lineHeight",
    ];

    static isValidColor(color) {
      // Hex color
      if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})$/.test(color)) {
        return true;
      }
      // rgb/rgba
      if (/^rgba?\(.*\)$/.test(color)) {
        return true;
      }
      // Named color (basic validation)
      const namedColors = ["black", "white", "red", "green", "blue", "yellow"];
      if (namedColors.includes(color.toLowerCase())) {
        return true;
      }
      return false;
    }

    static validatePalette(palette) {
      if (!palette || typeof palette !== "object") {
        return {
          valid: false,
          error: "Palette must be an object",
        };
      }

      const errors = [];
      const warnings = [];

      // Check required fields
      for (const field of this.REQUIRED_FIELDS) {
        if (!palette.hasOwnProperty(field)) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      // Validate color fields
      const colorFields = [
        "bg",
        "surface",
        "border",
        "text",
        "prompt",
        "cursor",
        "output",
        "info",
        "warn",
        "error",
        "success",
        "muted",
        "selection",
        "scrollbar",
      ];

      for (const field of colorFields) {
        if (
          palette.hasOwnProperty(field) &&
          !this.isValidColor(palette[field])
        ) {
          errors.push(`Invalid color format for ${field}: ${palette[field]}`);
        }
      }

      // Validate font
      if (palette.font && typeof palette.font !== "string") {
        errors.push("Font must be a string");
      }

      // Validate fontSize
      if (palette.fontSize && typeof palette.fontSize !== "string") {
        errors.push("fontSize must be a string (e.g., '14px')");
      }

      // Validate lineHeight
      if (palette.lineHeight && typeof palette.lineHeight !== "string") {
        errors.push("lineHeight must be a string (e.g., '1.5')");
      }

      // Check for extra fields (warning only)
      const allowedFields = new Set(this.REQUIRED_FIELDS);
      for (const field of Object.keys(palette)) {
        if (!allowedFields.has(field)) {
          warnings.push(`Unknown field: ${field}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    }

    static validateName(name) {
      if (!name || typeof name !== "string") {
        return false;
      }
      // Allow alphanumeric, hyphens, underscores
      return /^[a-zA-Z0-9_-]+$/.test(name);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Event Emitter
  // ═══════════════════════════════════════════════════════════════════════════

  class _EventEmitter {
    constructor() {
      this._listeners = new Map();
    }

    on(event, callback) {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, []);
      }
      this._listeners.get(event).push(callback);
      return () => this.off(event, callback);
    }

    off(event, callback) {
      if (!this._listeners.has(event)) return;
      const listeners = this._listeners.get(event);
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }

    emit(event, data) {
      if (!this._listeners.has(event)) return;
      [...this._listeners.get(event)].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("[ConsoleTheme] Event callback error:", error);
        }
      });
    }

    once(event, callback) {
      const wrapper = (data) => {
        callback(data);
        this.off(event, wrapper);
      };
      return this.on(event, wrapper);
    }

    clearAll() {
      this._listeners.clear();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Storage Manager
  // ═══════════════════════════════════════════════════════════════════════════

  class _StorageManager {
    constructor() {
      this.key = "console_themes_custom";
      this.useLocalStorage = this._checkLocalStorage();
    }

    _checkLocalStorage() {
      try {
        const test = "__storage_test__";
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    }

    save(themes) {
      if (!this.useLocalStorage) return false;

      try {
        localStorage.setItem(this.key, JSON.stringify(themes));
        return true;
      } catch (error) {
        console.error("[ConsoleTheme] Storage save failed:", error);
        return false;
      }
    }

    load() {
      if (!this.useLocalStorage) return {};

      try {
        const data = localStorage.getItem(this.key);
        return data ? JSON.parse(data) : {};
      } catch (error) {
        console.error("[ConsoleTheme] Storage load failed:", error);
        return {};
      }
    }

    clear() {
      if (this.useLocalStorage) {
        localStorage.removeItem(this.key);
      }
    }

    getStats() {
      return {
        available: this.useLocalStorage,
        key: this.key,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Theme Palettes (20+ built-in themes)
  // ═══════════════════════════════════════════════════════════════════════════

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
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    matrix: {
      bg: "#000000",
      surface: "#001100",
      border: "#003300",
      text: "#00cc00",
      prompt: "#00ff41",
      cursor: "#00ff41",
      output: "#00cc00",
      info: "#00ff41",
      warn: "#88ff00",
      error: "#ff0040",
      success: "#00ff41",
      muted: "#004400",
      selection: "#00ff4144",
      scrollbar: "#002200",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
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
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    light: {
      bg: "#ffffff",
      surface: "#f0f0f0",
      border: "#cccccc",
      text: "#333333",
      prompt: "#005f00",
      cursor: "#005f00",
      output: "#333333",
      info: "#0055aa",
      warn: "#aa5500",
      error: "#cc0000",
      success: "#008800",
      muted: "#999999",
      selection: "#005f0033",
      scrollbar: "#dddddd",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    nord: {
      bg: "#2e3440",
      surface: "#3b4252",
      border: "#434c5e",
      text: "#eceff4",
      prompt: "#a3be8c",
      cursor: "#eceff4",
      output: "#eceff4",
      info: "#81a1c1",
      warn: "#ebcb8b",
      error: "#bf616a",
      success: "#a3be8c",
      muted: "#4c566a",
      selection: "#434c5e",
      scrollbar: "#3b4252",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    monokai: {
      bg: "#272822",
      surface: "#3e3d32",
      border: "#49483e",
      text: "#f8f8f2",
      prompt: "#a6e22e",
      cursor: "#f8f8f0",
      output: "#f8f8f2",
      info: "#66d9ef",
      warn: "#e6db74",
      error: "#f92672",
      success: "#a6e22e",
      muted: "#75715e",
      selection: "#49483e",
      scrollbar: "#3e3d32",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    solarized_dark: {
      bg: "#002b36",
      surface: "#073642",
      border: "#586e75",
      text: "#839496",
      prompt: "#2aa198",
      cursor: "#839496",
      output: "#839496",
      info: "#268bd2",
      warn: "#b58900",
      error: "#dc322f",
      success: "#859900",
      muted: "#586e75",
      selection: "#073642",
      scrollbar: "#073642",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    solarized_light: {
      bg: "#fdf6e3",
      surface: "#eee8d5",
      border: "#d6d0c8",
      text: "#657b83",
      prompt: "#2aa198",
      cursor: "#657b83",
      output: "#657b83",
      info: "#268bd2",
      warn: "#b58900",
      error: "#dc322f",
      success: "#859900",
      muted: "#93a1a1",
      selection: "#eee8d5",
      scrollbar: "#eee8d5",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    one_dark: {
      bg: "#282c34",
      surface: "#353b45",
      border: "#3e4451",
      text: "#abb2bf",
      prompt: "#98c379",
      cursor: "#abb2bf",
      output: "#abb2bf",
      info: "#61afef",
      warn: "#e5c07b",
      error: "#e06c75",
      success: "#98c379",
      muted: "#5c6370",
      selection: "#3e4451",
      scrollbar: "#353b45",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    cyberpunk: {
      bg: "#0a0e27",
      surface: "#16213e",
      border: "#e94560",
      text: "#0ff0fc",
      prompt: "#0ff0fc",
      cursor: "#e94560",
      output: "#0ff0fc",
      info: "#0ff0fc",
      warn: "#ff006e",
      error: "#e94560",
      success: "#0ff0fc",
      muted: "#6c5b7b",
      selection: "#16213e",
      scrollbar: "#16213e",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    retro: {
      bg: "#1e1b2e",
      surface: "#2d2436",
      border: "#605e4f",
      text: "#f1d007",
      prompt: "#50e7c1",
      cursor: "#f1d007",
      output: "#f1d007",
      info: "#50e7c1",
      warn: "#f1d007",
      error: "#ff0055",
      success: "#50e7c1",
      muted: "#605e4f",
      selection: "#2d2436",
      scrollbar: "#2d2436",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    github_dark: {
      bg: "#0d1117",
      surface: "#161b22",
      border: "#30363d",
      text: "#c9d1d9",
      prompt: "#3fb950",
      cursor: "#c9d1d9",
      output: "#c9d1d9",
      info: "#58a6ff",
      warn: "#d29922",
      error: "#f85149",
      success: "#3fb950",
      muted: "#6e7681",
      selection: "#30363d",
      scrollbar: "#21262d",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    github_light: {
      bg: "#ffffff",
      surface: "#f6f8fa",
      border: "#e1e4e8",
      text: "#24292f",
      prompt: "#0969da",
      cursor: "#24292f",
      output: "#24292f",
      info: "#0969da",
      warn: "#9e6a03",
      error: "#cf222e",
      success: "#1a7f0f",
      muted: "#656d76",
      selection: "#e1e4e8",
      scrollbar: "#e1e4e8",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    gruvbox_dark: {
      bg: "#282828",
      surface: "#3c3836",
      border: "#504945",
      text: "#ebdbb2",
      prompt: "#b8bb26",
      cursor: "#ebdbb2",
      output: "#ebdbb2",
      info: "#83a598",
      warn: "#fabd2f",
      error: "#fb4934",
      success: "#b8bb26",
      muted: "#a89984",
      selection: "#504945",
      scrollbar: "#3c3836",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    gruvbox_light: {
      bg: "#fbf1c7",
      surface: "#f3f1d8",
      border: "#d5c4a1",
      text: "#3c3836",
      prompt: "#79740e",
      cursor: "#3c3836",
      output: "#3c3836",
      info: "#076678",
      warn: "#b57614",
      error: "#9d0006",
      success: "#79740e",
      muted: "#8f8f8f",
      selection: "#f3f1d8",
      scrollbar: "#f3f1d8",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    ocean: {
      bg: "#0f2847",
      surface: "#1a3a52",
      border: "#2e5f8a",
      text: "#b8d4e8",
      prompt: "#4dd0e1",
      cursor: "#b8d4e8",
      output: "#b8d4e8",
      info: "#4dd0e1",
      warn: "#ffb74d",
      error: "#e57373",
      success: "#81c784",
      muted: "#5a7a92",
      selection: "#2e5f8a",
      scrollbar: "#1a3a52",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    sunset: {
      bg: "#2b2520",
      surface: "#3d3530",
      border: "#8b5a3c",
      text: "#f4e8d0",
      prompt: "#e8995d",
      cursor: "#f4e8d0",
      output: "#f4e8d0",
      info: "#e8995d",
      warn: "#f7b45d",
      error: "#d85c54",
      success: "#8fb66b",
      muted: "#705039",
      selection: "#3d3530",
      scrollbar: "#3d3530",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    forest: {
      bg: "#1a2923",
      surface: "#2a4a3a",
      border: "#3a6a5a",
      text: "#c1e8d0",
      prompt: "#6fd39f",
      cursor: "#c1e8d0",
      output: "#c1e8d0",
      info: "#6fd39f",
      warn: "#d8b84e",
      error: "#d85c54",
      success: "#6fd39f",
      muted: "#5a7a6a",
      selection: "#3a6a5a",
      scrollbar: "#2a4a3a",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    lavender: {
      bg: "#2a2440",
      surface: "#3a3454",
      border: "#6b5b95",
      text: "#e8d5f2",
      prompt: "#b19cd9",
      cursor: "#e8d5f2",
      output: "#e8d5f2",
      info: "#b19cd9",
      warn: "#ffd480",
      error: "#f08080",
      success: "#98d8c8",
      muted: "#7a6a95",
      selection: "#3a3454",
      scrollbar: "#3a3454",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
    minimal: {
      bg: "#fafafa",
      surface: "#f5f5f5",
      border: "#e0e0e0",
      text: "#212121",
      prompt: "#0277bd",
      cursor: "#212121",
      output: "#212121",
      info: "#0277bd",
      warn: "#f57c00",
      error: "#d32f2f",
      success: "#388e3c",
      muted: "#757575",
      selection: "#e0e0e0",
      scrollbar: "#e0e0e0",
      font: '"Courier New", monospace',
      fontSize: "14px",
      lineHeight: "1.5",
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Main ConsoleTheme Class
  // ═══════════════════════════════════════════════════════════════════════════

  class ConsoleTheme {
    constructor(config = {}) {
      this.config = Object.freeze(config);
      this.version = "3.0.0";

      // Components
      this._logger = new _Logger(config.debug);
      this._validator = new _ThemeValidator();
      this._storage = new _StorageManager();
      this._events = new _EventEmitter();

      // Module references
      this._settings = null;
      this._bridge = null;
      this._websocket = null;

      // Current theme state
      this._currentTheme = "dark";
      this._themes = { ...BUILT_IN_THEMES };
      this._customThemes = {};
      this._themeOverrides = {};

      // CSS variables cache
      this._cssVariablesCache = null;

      // Load custom themes from storage
      this._loadCustomThemes();

      this._logger.info("Instantiated (v3.0.0)");
    }

    // ── Public API: Theme Selection ──────────────────────────────────────

    /**
     * Get a theme by name
     */
    get(name) {
      const themeName = (name || this._currentTheme).toLowerCase();

      // Check custom themes first
      if (this._customThemes.hasOwnProperty(themeName)) {
        return this._customThemes[themeName];
      }

      // Check built-in themes
      if (this._themes.hasOwnProperty(themeName)) {
        return this._themes[themeName];
      }

      // Fallback to dark
      return this._themes.dark;
    }

    /**
     * Set current theme
     */
    set(name) {
      if (!_ThemeValidator.validateName(name)) {
        this._logger.error(`Invalid theme name: ${name}`);
        return false;
      }

      const theme = this.get(name);
      if (!theme) {
        this._logger.warn(`Theme not found: ${name}`);
        return false;
      }

      const oldTheme = this._currentTheme;
      this._currentTheme = name;
      this._cssVariablesCache = null;

      // Apply overrides
      const finalTheme = this._applyOverrides(theme);

      this._logger.info(`Theme changed: ${oldTheme} → ${name}`);
      this._events.emit("theme:changed", {
        from: oldTheme,
        to: name,
        theme: finalTheme,
      });

      // Sync with API
      if (this._bridge) {
        this._syncWithAPI("theme:changed", { from: oldTheme, to: name });
      }

      // Sync with WebSocket
      if (this._websocket) {
        this._websocket.publish("theme_channel", {
          type: "theme_changed",
          from: oldTheme,
          to: name,
          timestamp: Date.now(),
        });
      }

      return true;
    }

    /**
     * Get current theme
     */
    getCurrent() {
      return this._currentTheme;
    }

    /**
     * List all available themes
     */
    list() {
      const builtin = Object.keys(this._themes);
      const custom = Object.keys(this._customThemes);
      return [...new Set([...builtin, ...custom])];
    }

    /**
     * List only built-in themes
     */
    listBuiltIn() {
      return Object.keys(this._themes);
    }

    /**
     * List only custom themes
     */
    listCustom() {
      return Object.keys(this._customThemes);
    }

    // ── Public API: Custom Theme Management ──────────────────────────────

    /**
     * Register a custom theme
     */
    register(name, palette) {
      if (!_ThemeValidator.validateName(name)) {
        this._logger.error(`Invalid theme name: ${name}`);
        return false;
      }

      // Merge with default palette if not complete
      const merged = { ...BUILT_IN_THEMES.dark, ...palette };

      // Validate
      const validation = _ThemeValidator.validatePalette(merged);
      if (!validation.valid) {
        this._logger.error(
          `Theme validation failed: ${validation.errors.join(", ")}`,
        );
        return false;
      }

      if (validation.warnings.length > 0) {
        this._logger.warn(
          `Theme registered with warnings: ${validation.warnings.join(", ")}`,
        );
      }

      this._customThemes[name.toLowerCase()] = merged;
      this._storage.save(this._customThemes);

      this._logger.info(`Custom theme registered: ${name}`);
      this._events.emit("theme:registered", { name, palette: merged });

      return true;
    }

    /**
     * Unregister a custom theme
     */
    unregister(name) {
      const themeName = name.toLowerCase();

      if (!this._customThemes.hasOwnProperty(themeName)) {
        this._logger.warn(`Custom theme not found: ${name}`);
        return false;
      }

      delete this._customThemes[themeName];
      this._storage.save(this._customThemes);

      this._logger.info(`Custom theme unregistered: ${name}`);
      this._events.emit("theme:unregistered", { name });

      return true;
    }

    /**
     * Update a custom theme
     */
    update(name, updates) {
      const themeName = name.toLowerCase();
      const existing = this._customThemes[themeName];

      if (!existing) {
        this._logger.warn(`Custom theme not found: ${name}`);
        return false;
      }

      const updated = { ...existing, ...updates };
      const validation = _ThemeValidator.validatePalette(updated);

      if (!validation.valid) {
        this._logger.error(
          `Theme validation failed: ${validation.errors.join(", ")}`,
        );
        return false;
      }

      this._customThemes[themeName] = updated;
      this._storage.save(this._customThemes);

      this._logger.info(`Custom theme updated: ${name}`);
      this._events.emit("theme:updated", { name, updates });

      // If this is the current theme, update it
      if (this._currentTheme === themeName) {
        this._cssVariablesCache = null;
        this._events.emit("theme:changed", {
          from: themeName,
          to: themeName,
          theme: updated,
        });
      }

      return true;
    }

    // ── Public API: Theme Overrides ──────────────────────────────────────

    /**
     * Set theme override (temporary, not persisted)
     */
    override(field, value) {
      if (
        !_ThemeValidator.isValidColor(value) &&
        !["font", "fontSize", "lineHeight"].includes(field)
      ) {
        this._logger.error(`Invalid color value: ${value}`);
        return false;
      }

      this._themeOverrides[field] = value;
      this._cssVariablesCache = null;

      this._logger.log(`Theme override: ${field} = ${value}`);
      this._events.emit("theme:overridden", { field, value });

      return true;
    }

    /**
     * Remove theme override
     */
    removeOverride(field) {
      delete this._themeOverrides[field];
      this._cssVariablesCache = null;
      return true;
    }

    /**
     * Clear all overrides
     */
    clearOverrides() {
      this._themeOverrides = {};
      this._cssVariablesCache = null;
    }

    /**
     * Get current overrides
     */
    getOverrides() {
      return { ...this._themeOverrides };
    }

    // ── Public API: Import/Export ────────────────────────────────────────

    /**
     * Export theme as JSON
     */
    export(name) {
      const theme = this.get(name);
      return JSON.stringify(theme, null, 2);
    }

    /**
     * Import theme from JSON
     */
    import(name, jsonString) {
      try {
        const palette = JSON.parse(jsonString);
        return this.register(name, palette);
      } catch (error) {
        this._logger.error(`Import failed: ${error.message}`);
        return false;
      }
    }

    /**
     * Export all custom themes
     */
    exportAll() {
      return JSON.stringify(this._customThemes, null, 2);
    }

    /**
     * Import all themes from JSON
     */
    importAll(jsonString) {
      try {
        const themes = JSON.parse(jsonString);
        for (const [name, palette] of Object.entries(themes)) {
          this.register(name, palette);
        }
        return true;
      } catch (error) {
        this._logger.error(`Import failed: ${error.message}`);
        return false;
      }
    }

    // ── Module Linking ───────────────────────────────────────────────────

    /**
     * Link with other modules
     */
    linkModules(modules = {}) {
      if (modules.ConsoleSettings) this._settings = modules.ConsoleSettings;
      if (modules.ConsoleBridge) this._bridge = modules.ConsoleBridge;
      if (modules.ConsoleWebSocket) this._websocket = modules.ConsoleWebSocket;

      const linked = [];
      if (this._settings) linked.push("ConsoleSettings");
      if (this._bridge) linked.push("ConsoleBridge");
      if (this._websocket) linked.push("ConsoleWebSocket");

      if (linked.length > 0) {
        this._logger.info(`Linked modules: ${linked.join(", ")}`);
        this._events.emit("modules:linked", { modules: linked });

        // Register API routes
        if (this._bridge) {
          this.registerAPIRoutes(this._bridge);
        }
      }

      return true;
    }

    // ── API Integration ──────────────────────────────────────────────────

    /**
     * Register API routes
     */
    registerAPIRoutes(bridge) {
      if (!bridge) return;

      // GET /api/theme/current
      bridge.get("/api/theme/current", (req) => {
        return {
          success: true,
          theme: this._currentTheme,
          palette: this.get(),
        };
      });

      // GET /api/theme/list
      bridge.get("/api/theme/list", (req) => {
        return {
          success: true,
          themes: this.list(),
          builtin: this.listBuiltIn(),
          custom: this.listCustom(),
          current: this._currentTheme,
        };
      });

      // GET /api/theme/:name
      bridge.get("/api/theme/:name", (req) => {
        const name = req.params?.name;
        if (!name) {
          return { success: false, error: "Theme name required" };
        }
        return {
          success: true,
          name,
          palette: this.get(name),
        };
      });

      // POST /api/theme/set
      bridge.post("/api/theme/set", (req) => {
        const { name } = req.body || {};
        if (!name) {
          return { success: false, error: "Theme name required" };
        }
        const success = this.set(name);
        return {
          success,
          current: this._currentTheme,
        };
      });

      // POST /api/theme/register
      bridge.post("/api/theme/register", (req) => {
        const { name, palette } = req.body || {};
        if (!name || !palette) {
          return { success: false, error: "Name and palette required" };
        }
        const success = this.register(name, palette);
        return { success };
      });

      // DELETE /api/theme/:name
      bridge.delete("/api/theme/:name", (req) => {
        const name = req.params?.name;
        if (!name) {
          return { success: false, error: "Theme name required" };
        }
        const success = this.unregister(name);
        return { success };
      });

      // GET /api/theme/export/:name
      bridge.get("/api/theme/export/:name", (req) => {
        const name = req.params?.name;
        if (!name) {
          return { success: false, error: "Theme name required" };
        }
        return {
          success: true,
          name,
          json: this.export(name),
        };
      });

      // GET /api/theme/export-all
      bridge.get("/api/theme/export-all", (req) => {
        return {
          success: true,
          json: this.exportAll(),
        };
      });

      this._logger.info("API routes registered");
    }

    /**
     * Sync with API
     */
    _syncWithAPI(event, data) {
      if (!this._bridge) return;
      try {
        // API sync logic here if needed
      } catch (error) {
        this._logger.error("API sync failed", error);
      }
    }

    // ── CSS Generation ───────────────────────────────────────────────────

    /**
     * Get CSS variables for current theme
     */
    getCSSVariables() {
      if (this._cssVariablesCache) {
        return this._cssVariablesCache;
      }

      const theme = this.get();
      const finalTheme = this._applyOverrides(theme);

      const css = {
        "--console-bg": finalTheme.bg,
        "--console-surface": finalTheme.surface,
        "--console-border": finalTheme.border,
        "--console-text": finalTheme.text,
        "--console-prompt": finalTheme.prompt,
        "--console-cursor": finalTheme.cursor,
        "--console-output": finalTheme.output,
        "--console-info": finalTheme.info,
        "--console-warn": finalTheme.warn,
        "--console-error": finalTheme.error,
        "--console-success": finalTheme.success,
        "--console-muted": finalTheme.muted,
        "--console-selection": finalTheme.selection,
        "--console-scrollbar": finalTheme.scrollbar,
        "--console-font": finalTheme.font,
        "--console-font-size": finalTheme.fontSize,
        "--console-line-height": finalTheme.lineHeight,
      };

      this._cssVariablesCache = css;
      return css;
    }

    /**
     * Get CSS string for injection
     */
    getCSSString() {
      const vars = this.getCSSVariables();
      const css = ":root {\n";
      const varLines = Object.entries(vars)
        .map(([key, value]) => `  ${key}: ${value};`)
        .join("\n");
      return css + varLines + "\n}";
    }

    // ── Private Methods ──────────────────────────────────────────────────

    /**
     * Apply overrides to theme
     */
    _applyOverrides(theme) {
      return { ...theme, ...this._themeOverrides };
    }

    /**
     * Load custom themes from storage
     */
    _loadCustomThemes() {
      this._customThemes = this._storage.load();
      this._logger.info(
        `Loaded ${Object.keys(this._customThemes).length} custom themes from storage`,
      );
    }

    // ── Event System ─────────────────────────────────────────────────────

    /**
     * Listen for events
     */
    on(event, callback) {
      return this._events.on(event, callback);
    }

    /**
     * Stop listening for events
     */
    off(event, callback) {
      this._events.off(event, callback);
    }

    /**
     * Emit an event
     */
    emit(event, data) {
      this._events.emit(event, data);
    }

    // ── Utilities ────────────────────────────────────────────────────────

    /**
     * Get debug info
     */
    debugInfo() {
      return {
        name: "ConsoleTheme",
        version: this.version,
        currentTheme: this._currentTheme,
        builtinThemes: Object.keys(this._themes).length,
        customThemes: Object.keys(this._customThemes).length,
        overrides: Object.keys(this._themeOverrides).length,
        storage: this._storage.getStats(),
        modulesLinked: {
          settings: this._settings !== null,
          bridge: this._bridge !== null,
          websocket: this._websocket !== null,
        },
      };
    }

    /**
     * Get logs
     */
    getLogs(level) {
      return this._logger.getLogs(level);
    }

    /**
     * Clear logs
     */
    clearLogs() {
      this._logger.clearLogs();
    }

    /**
     * Cleanup
     */
    dispose() {
      this._themes = null;
      this._customThemes = null;
      this._themeOverrides = null;
      this._cssVariablesCache = null;
      this._settings = null;
      this._bridge = null;
      this._websocket = null;
      this._events?.clearAll();
      this._events = null;
      this._logger.info("Disposed");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Global Exposure
  // ─────────────────────────────────────────────────────────────────────────
  global.ConsoleTheme = ConsoleTheme;
})(typeof globalThis !== "undefined" ? globalThis : window);
