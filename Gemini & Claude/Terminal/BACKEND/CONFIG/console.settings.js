/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║                       console.settings.js v1.0.0                          ║
 * ║                    Configuration & Preferences Manager                     ║
 * ║                                                                            ║
 * ║  Integrated with: All modules (Renderer, Database, Table, Commands, etc)  ║
 * ║  Manages: Themes, Fonts, Behavior, Persistence                            ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 *
 * FEATURES:
 *  ✓ Application settings management
 *  ✓ LocalStorage persistence
 *  ✓ Theme switching and customization
 *  ✓ User preferences (fonts, colors, behavior)
 *  ✓ Default configurations
 *  ✓ Settings export/import
 *  ✓ Event emission on settings change
 *  ✓ Module detection and integration
 *
 * @author Console Terminal System
 * @version 1.0.0
 * @license MIT
 */

/* ═══════════════════════════════════════════════════════════════════════════
   IIFE Module Wrapper
   ═══════════════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  /* ─────────────────────────────────────────────────────────────────────
     Logger for Debug Output
     ───────────────────────────────────────────────────────────────────── */

  class _Logger {
    constructor(debug = false) {
      this.debug = debug;
    }

    log(message, data) {
      if (this.debug) {
        console.log(
          `%c[ConsoleSettings] ${message}`,
          "color: #ff00ff; font-weight: bold;",
          data || "",
        );
      }
    }

    info(message, data) {
      console.log(
        `%c[ConsoleSettings] ℹ ${message}`,
        "color: #00ff00; font-weight: bold;",
        data || "",
      );
    }

    warn(message, data) {
      console.warn(
        `%c[ConsoleSettings] ⚠ ${message}`,
        "color: #ffaa00; font-weight: bold;",
        data || "",
      );
    }

    error(message, data) {
      console.error(
        `%c[ConsoleSettings] ✗ ${message}`,
        "color: #ff0000; font-weight: bold;",
        data || "",
      );
    }

    success(message, data) {
      console.log(
        `%c[ConsoleSettings] ✓ ${message}`,
        "color: #00ff00; font-weight: bold;",
        data || "",
      );
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     Event Bus for Settings Changes
     ───────────────────────────────────────────────────────────────────── */

  class _EventBus {
    constructor() {
      this._listeners = new Map();
    }

    on(event, callback) {
      if (!this._listeners.has(event)) {
        this._listeners.set(event, []);
      }
      this._listeners.get(event).push(callback);
    }

    off(event, callback) {
      if (!this._listeners.has(event)) return;
      const callbacks = this._listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }

    emit(event, data) {
      if (!this._listeners.has(event)) return;
      [...this._listeners.get(event)].forEach((callback) => {
        try {
          callback(data);
        } catch (e) {
          console.error(`Settings event listener error for "${event}":`, e);
        }
      });
    }

    clearAll() {
      this._listeners.clear();
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Main ConsoleSettings Class
     ═══════════════════════════════════════════════════════════════════════ */

  class ConsoleSettings {
    constructor(config = {}) {
      this.config = {
        debug: config.debug ?? false,
        persistToLocalStorage: config.persistToLocalStorage ?? true,
        storagePrefix: config.storagePrefix ?? "console_settings_",
        ...config,
      };

      this._settings = this._initializeDefaults();
      this._eventBus = new _EventBus();
      this._logger = new _Logger(this.config.debug);
      this._initialized = false;

      this._initialize();
    }

    /* ─────────────────────────────────────────────────────────────────────
       Initialization
       ───────────────────────────────────────────────────────────────────── */

    _initialize() {
      // Load from localStorage if available
      if (this.config.persistToLocalStorage) {
        this._loadFromLocalStorage();
      }

      this._initialized = true;
      this._logger.info("v1.0.0 instantiated");
    }

    _initializeDefaults() {
      return {
        // Display Settings
        display: {
          theme: "dracula",
          fontSize: 14,
          fontFamily: "'Courier New', monospace",
          lineHeight: 1.6,
          charset: "UTF-8",
          responsive: true,
          width: "100%",
          height: "100%",
        },

        // Color Scheme
        colors: {
          background: "#0a0e27",
          text: "#00ff00",
          prompt: "#00aaff",
          error: "#ff0000",
          warning: "#ffaa00",
          success: "#00ff00",
          info: "#00aaff",
          cursor: "#00ff00",
          selection: "rgba(0, 255, 0, 0.3)",
        },

        // Behavior
        behavior: {
          autoComplete: true,
          commandHistory: true,
          maxHistorySize: 100,
          undoRedoEnabled: true,
          maxUndoStack: 50,
          clearOnStartup: false,
          enablePersistence: true,
          enableSounds: false,
        },

        // Keyboard
        keyboard: {
          tabCompletion: true,
          multilineCommands: true,
          autoFocus: true,
          detectPlatform: true,
          enableShortcuts: true,
        },

        // Performance
        performance: {
          maxTableRows: 1000,
          maxBufferSize: 10000,
          debounceDelay: 100,
          enableVirtualScroll: false,
          cacheResults: true,
        },

        // Database
        database: {
          persistence: true,
          autoBackup: true,
          maxTableSize: 10000,
          storagePrefix: "console_db_",
        },

        // Theme Specific
        themes: {
          dark: {
            bg: "#0a0e27",
            surface: "#1a1f3a",
            text: "#00ff00",
            muted: "#666666",
          },
          light: {
            bg: "#ffffff",
            surface: "#f5f5f5",
            text: "#000000",
            muted: "#999999",
          },
          matrix: {
            bg: "#000000",
            surface: "#003300",
            text: "#00ff00",
            muted: "#00aa00",
          },
          solarized: {
            bg: "#fdf6e3",
            surface: "#eee8d5",
            text: "#657b83",
            muted: "#93a1a1",
          },
          dracula: {
            bg: "#282a36",
            surface: "#44475a",
            text: "#f8f8f2",
            muted: "#6272a4",
          },
        },

        // User Preferences
        user: {
          language: "en",
          timezone: "UTC",
          dateFormat: "YYYY-MM-DD",
          timeFormat: "HH:mm:ss",
          notifications: true,
        },

        // Advanced
        advanced: {
          enableDebugMode: false,
          enableLogging: true,
          logLevel: "info",
          enableMetrics: false,
          enableProfiling: false,
        },
      };
    }

    /* ─────────────────────────────────────────────────────────────────────
       Persistence
       ───────────────────────────────────────────────────────────────────── */

    _loadFromLocalStorage() {
      try {
        const key = this.config.storagePrefix + "all";
        const stored = localStorage.getItem(key);

        if (stored) {
          const parsed = JSON.parse(stored);
          this._settings = { ...this._settings, ...parsed };
          this._logger.log("Loaded settings from localStorage");
        }
      } catch (e) {
        this._logger.warn(
          "Failed to load settings from localStorage",
          e.message,
        );
      }
    }

    _saveToLocalStorage() {
      if (!this.config.persistToLocalStorage) return;

      try {
        const key = this.config.storagePrefix + "all";
        localStorage.setItem(key, JSON.stringify(this._settings));
        this._logger.log("Saved settings to localStorage");
      } catch (e) {
        this._logger.warn("Failed to save settings to localStorage", e.message);
      }
    }

    /* ─────────────────────────────────────────────────────────────────────
       Settings Access
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Get a setting value
     * @param {string} path - Setting path (dot notation: "display.theme")
     * @param {any} defaultValue - Default value if not found
     * @returns {any} Setting value
     */
    get(path, defaultValue = null) {
      const parts = path.split(".");
      let value = this._settings;

      for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
          value = value[part];
        } else {
          return defaultValue;
        }
      }

      this._logger.log(`get("${path}")`, value);
      return value;
    }

    /**
     * Set a setting value
     * @param {string} path - Setting path
     * @param {any} value - Setting value
     * @returns {boolean} Success status
     */
    set(path, value) {
      const parts = path.split(".");
      const lastKey = parts.pop();
      let current = this._settings;

      // Navigate to parent object
      for (const part of parts) {
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part];
      }

      // Set value
      const oldValue = current[lastKey];
      current[lastKey] = value;

      // Save to localStorage
      this._saveToLocalStorage();

      // Emit event
      this._eventBus.emit("setting:changed", {
        path,
        oldValue,
        newValue: value,
      });

      this._logger.log(`set("${path}", ${value})`);
      return true;
    }

    /**
     * Get all settings
     * @returns {Object} All settings
     */
    getAll() {
      return JSON.parse(JSON.stringify(this._settings));
    }

    /**
     * Reset settings to defaults
     * @returns {boolean} Success status
     */
    resetToDefaults() {
      this._settings = this._initializeDefaults();
      this._saveToLocalStorage();
      this._eventBus.emit("settings:reset", null);
      this._logger.success("Settings reset to defaults");
      return true;
    }

    /* ─────────────────────────────────────────────────────────────────────
       Theme Management
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Get available themes
     * @returns {Array} Theme names
     */
    getAvailableThemes() {
      return Object.keys(this._settings.themes);
    }

    /**
     * Get theme configuration
     * @param {string} themeName - Theme name
     * @returns {Object|null} Theme configuration
     */
    getTheme(themeName = null) {
      const theme = themeName || this.get("display.theme");
      return this._settings.themes[theme] || null;
    }

    /**
     * Apply theme
     * @param {string} themeName - Theme name
     * @returns {boolean} Success status
     */
    applyTheme(themeName) {
      if (!this._settings.themes[themeName]) {
        this._logger.warn(`Theme not found: ${themeName}`);
        return false;
      }

      this.set("display.theme", themeName);
      this._eventBus.emit("theme:applied", { theme: themeName });

      // Apply to renderer if available
      if (
        typeof window.ConsoleRenderer !== "undefined" &&
        window.ConsoleRenderer.applyTheme
      ) {
        window.ConsoleRenderer.applyTheme(themeName);
      }

      this._logger.success(`Theme applied: ${themeName}`);
      return true;
    }

    /**
     * Add custom theme
     * @param {string} name - Theme name
     * @param {Object} colors - Theme colors
     * @returns {boolean} Success status
     */
    addTheme(name, colors) {
      if (this._settings.themes[name]) {
        this._logger.warn(`Theme already exists: ${name}`);
        return false;
      }

      this._settings.themes[name] = colors;
      this._saveToLocalStorage();
      this._eventBus.emit("theme:added", { name, colors });

      this._logger.success(`Custom theme added: ${name}`);
      return true;
    }

    /* ─────────────────────────────────────────────────────────────────────
       Import/Export
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Export settings as JSON
     * @returns {string} JSON settings
     */
    exportAsJSON() {
      const json = JSON.stringify(this._settings, null, 2);
      this._logger.log("Settings exported as JSON");
      return json;
    }

    /**
     * Import settings from JSON
     * @param {string} json - JSON settings
     * @returns {boolean} Success status
     */
    importFromJSON(json) {
      try {
        const imported = JSON.parse(json);
        this._settings = { ...this._settings, ...imported };
        this._saveToLocalStorage();
        this._eventBus.emit("settings:imported", null);
        this._logger.success("Settings imported from JSON");
        return true;
      } catch (e) {
        this._logger.error("Failed to import settings", e.message);
        return false;
      }
    }

    /**
     * Export settings as file (download)
     * @param {string} filename - Filename
     */
    downloadSettings(filename = "console_settings") {
      const json = this.exportAsJSON();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${filename}.json`;
      link.click();

      URL.revokeObjectURL(url);
      this._logger.success(`Settings downloaded: ${filename}.json`);
    }

    /**
     * Cleanup resources
     */
    dispose() {
      this._eventBus?.clearAll();
      this._eventBus = null;
      this._settings = {};
      this._logger.log("Disposed");
    }

    /* ─────────────────────────────────────────────────────────────────────
       Event Handling
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Subscribe to settings changes
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
      this._eventBus.on(event, callback);
    }

    /**
     * Unsubscribe from settings changes
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
      this._eventBus.off(event, callback);
    }

    /* ─────────────────────────────────────────────────────────────────────
       Shortcuts & Quick Access
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Get display settings
     * @returns {Object} Display configuration
     */
    getDisplaySettings() {
      return this.get("display");
    }

    /**
     * Get color settings
     * @returns {Object} Color configuration
     */
    getColors() {
      return this.get("colors");
    }

    /**
     * Get behavior settings
     * @returns {Object} Behavior configuration
     */
    getBehavior() {
      return this.get("behavior");
    }

    /**
     * Get keyboard settings
     * @returns {Object} Keyboard configuration
     */
    getKeyboard() {
      return this.get("keyboard");
    }

    /**
     * Set fontSize
     * @param {number} size - Font size in pixels
     */
    setFontSize(size) {
      this.set("display.fontSize", size);

      // Apply to document if possible
      if (document.documentElement) {
        document.documentElement.style.fontSize = `${size}px`;
      }
    }

    /**
     * Set theme
     * @param {string} theme - Theme name
     */
    setTheme(theme) {
      this.applyTheme(theme);
    }

    /**
     * Enable/disable debug mode
     * @param {boolean} enabled - Debug mode status
     */
    setDebugMode(enabled) {
      this.set("advanced.enableDebugMode", enabled);

      if (typeof window.ConsoleRegistry !== "undefined") {
        window.ConsoleRegistry._logger.debug = enabled;
      }
      if (typeof window.ConsoleCommands !== "undefined") {
        window.ConsoleCommands._logger.debug = enabled;
      }
    }

    /* ─────────────────────────────────────────────────────────────────────
       Module Information
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Get information about this module and linked modules
     * @returns {Object} Module information
     */
    getInfo() {
      return {
        moduleName: "ConsoleSettings",
        version: "1.0.0",
        initialized: this._initialized,
        currentTheme: this.get("display.theme"),
        fontSize: this.get("display.fontSize"),
        isPersistent: this.config.persistToLocalStorage,
        hasSupportedModules: {
          consoleRenderer: typeof window.ConsoleRenderer !== "undefined",
          consoleDatabase: typeof window.ConsoleDatabase !== "undefined",
          consoleTable: typeof window.ConsoleTable !== "undefined",
          consoleCommands: typeof window.ConsoleCommands !== "undefined",
          consoleRegistry: typeof window.ConsoleRegistry !== "undefined",
          consoleKeyboard: typeof window.ConsoleKeyboard !== "undefined",
          consoleBuiltins: typeof window.ConsoleBuiltins !== "undefined",
          consoleBridge: typeof window.ConsoleBridge !== "undefined",
          webConsole: typeof window.WebConsole !== "undefined",
        },
      };
    }

    /**
     * Get detailed debug information
     * @returns {Object} Debug information
     */
    debugInfo() {
      const info = this.getInfo();
      info.allSettings = this.getAll();
      info.availableThemes = this.getAvailableThemes();
      return info;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Global Export
     ═══════════════════════════════════════════════════════════════════════ */

  window.ConsoleSettings = new ConsoleSettings({
    debug: false,
    persistToLocalStorage: true,
  });

  // Log that module is loaded
  console.log(
    "%c[ConsoleSettings] %cv1.0.0 loaded and initialized",
    "color: #ff00ff; font-weight: bold;",
    "color: #00ff00;",
  );
})();
