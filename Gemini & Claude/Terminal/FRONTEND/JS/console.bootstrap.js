/**
 * @file        console.bootstrap.js
 * @description WebConsole — Bootstrap & Orchestrator
 *
 * Responsible for initializing, orchestrating, and exposing
 * the web terminal to the external environment.
 *
 * Load order (HTML):
 *   1. BACKEND/CSS/terminal.css                        [stylesheet]
 *   2. BACKEND/CSS/console.renderer.js                 [REQUIRED]
 *   3. BACKEND/CORE/console.parser.js                  [optional]
 *   4. BACKEND/CSS/console.keyboard.js                 [optional]
 *   5. BACKEND/CORE/console.engine.js                  [optional]
 *   6. FRONTEND/JS/console.bootstrap.js                [this file — LAST]
 *
 * Supporting modules (loaded automatically by their parent):
 *   - BACKEND/CORE/console.history.js    via ConsoleEngine
 *   - BACKEND/CSS/console.theme.js       via ConsoleRenderer
 *   - BACKEND/CSS/console.table.js       via ConsoleRenderer
 *   - BACKEND/JS/COMMANDS/console.*.js   via ConsoleEngine
 *
 * @version 3.0.0
 * @license MIT
 */

(function (global) {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────────
  // Guards — prevent double-registration on hot-reload
  // ─────────────────────────────────────────────────────────────────────────

  if (typeof global.__WC_BOOTSTRAP_LOADED__ !== "undefined") {
    console.warn(
      "[WebConsole] Bootstrap already loaded — skipping re-execution.",
    );
    return;
  }
  global.__WC_BOOTSTRAP_LOADED__ = true;

  // ─────────────────────────────────────────────────────────────────────────
  // Constants
  // ─────────────────────────────────────────────────────────────────────────

  const VERSION = "3.0.0";
  const BOOT_TIME = Date.now();

  /**
   * Default configuration.
   * All user-supplied options are merged on top of this object.
   */
  const DEFAULTS = Object.freeze({
    containerId: "body",
    promptSymbol: "root@desktop:~$ ",
    theme: "dark",
    maxHistory: 500,
    locale: "en-US",
    motd: true,
    debug: false,
    /** @type {"throw"|"warn"} How to surface non-critical init errors. */
    errorMode: "warn",
  });

  /**
   * Module registry — single source of truth for all module descriptors.
   * Adding a new module here is the only change required to integrate it.
   *
   * @type {ReadonlyArray<{
   *   key:      string,   // global constructor name
   *   property: string,   // slot on the WebConsole instance
   *   path:     string,   // expected file path (for error messages)
   *   required: boolean,
   * }>}
   */
  const MODULE_REGISTRY = Object.freeze([
    {
      key: "ConsoleRenderer",
      property: "renderer",
      path: "BACKEND/CSS/console.renderer.js",
      required: true,
    },
    {
      key: "ConsoleParser",
      property: "parser",
      path: "BACKEND/CORE/console.parser.js",
      required: false,
    },
    {
      key: "ConsoleKeyboard",
      property: "keyboard",
      path: "BACKEND/CSS/console.keyboard.js",
      required: false,
    },
    {
      key: "ConsoleDatabase",
      property: "database",
      path: "BACKEND/JS/COMMANDS/console.database.js",
      required: false,
    },
    {
      key: "ConsoleEngine",
      property: "engine",
      path: "BACKEND/CORE/console.engine.js",
      required: false,
    },
  ]);

  /**
   * Option validation schema.
   * Each entry describes how to validate one option key.
   *
   * @type {Array<{
   *   key:    string,
   *   type:   string,
   *   guard?: (v: any) => boolean,
   *   msg:    string,
   * }>}
   */
  const OPTION_SCHEMA = [
    {
      key: "containerId",
      type: "string",
      guard: (v) => v.trim().length > 0,
      msg: "containerId must be a non-empty string.",
    },
    {
      key: "promptSymbol",
      type: "string",
      msg: "promptSymbol must be a string.",
    },
    {
      key: "theme",
      type: "string",
      msg: "theme must be a string.",
    },
    {
      key: "maxHistory",
      type: "number",
      guard: (v) => Number.isInteger(v) && v >= 1,
      msg: "maxHistory must be a positive integer.",
    },
    {
      key: "locale",
      type: "string",
      msg: "locale must be a string.",
    },
    {
      key: "motd",
      type: "boolean",
      msg: "motd must be a boolean.",
    },
    {
      key: "debug",
      type: "boolean",
      msg: "debug must be a boolean.",
    },
    {
      key: "errorMode",
      type: "string",
      guard: (v) => v === "throw" || v === "warn",
      msg: 'errorMode must be "throw" or "warn".',
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Logger
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Thin structured logger.
   * Verbose output (info/debug) is gated behind the `debug` flag.
   * Warn and error always emit to the console.
   */
  const Logger = (() => {
    const PREFIX = "[WebConsole]";
    const stamp = () => `+${String(Date.now() - BOOT_TIME).padStart(5, "0")}ms`;

    return {
      info(msg, debug = false) {
        if (debug) console.info(`${PREFIX} ℹ ${stamp()} ${msg}`);
      },
      warn(msg) {
        console.warn(`${PREFIX} ⚠ ${msg}`);
      },
      error(msg, err = null) {
        console.error(`${PREFIX} ✖ ${msg}`, err ?? "");
      },
      debug(msg, data, isDebug = false) {
        if (isDebug) console.debug(`${PREFIX} ◎ ${stamp()} ${msg}`, data ?? "");
      },
      group(label, debug = false) {
        if (debug && console.group) console.group(`${PREFIX} ${label}`);
      },
      groupEnd(debug = false) {
        if (debug && console.groupEnd) console.groupEnd();
      },
    };
  })();

  // ─────────────────────────────────────────────────────────────────────────
  // EventBus
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Lightweight publish/subscribe event bus.
   *
   * Improvements over v2:
   *   - Wildcard listener via `on("*", handler)` — receives every event.
   *   - `listenerCount(event)` and `eventNames()` for diagnostics.
   *   - `clearAll()` for full teardown.
   *   - Handler errors are isolated; one bad handler never blocks the others.
   *   - `once()` stores `_original` to support off() on the underlying handler.
   */
  class EventBus {
    constructor() {
      /** @type {Object.<string, Function[]>} */
      this._listeners = Object.create(null);
    }

    /**
     * Subscribe to an event.
     * Use `"*"` to listen to all events.
     * @param {string}   event
     * @param {Function} handler - Called with `(payload, eventName)`.
     * @returns {this}
     */
    on(event, handler) {
      if (typeof event !== "string" || !event.trim())
        throw new TypeError("EventBus.on: event must be a non-empty string.");
      if (typeof handler !== "function")
        throw new TypeError(
          `EventBus.on: handler for "${event}" must be a function.`,
        );

      (this._listeners[event] ??= []).push(handler);
      return this;
    }

    /**
     * Unsubscribe a specific handler from an event.
     * @param {string}   event
     * @param {Function} handler
     * @returns {this}
     */
    off(event, handler) {
      if (!this._listeners[event]) return this;
      this._listeners[event] = this._listeners[event].filter(
        (h) => h !== handler && h._original !== handler,
      );
      if (this._listeners[event].length === 0) delete this._listeners[event];
      return this;
    }

    /**
     * Emit an event — all direct subscribers and `"*"` wildcards are called.
     * @param {string} event
     * @param {*}      [payload]
     * @returns {this}
     */
    emit(event, payload = null) {
      const targets = [
        ...(this._listeners[event] ?? []),
        ...(this._listeners["*"] ?? []),
      ];

      for (const handler of targets) {
        try {
          handler(payload, event);
        } catch (err) {
          Logger.error(`Uncaught error in "${event}" handler:`, err);
        }
      }
      return this;
    }

    /**
     * Subscribe to an event exactly once.
     * @param {string}   event
     * @param {Function} handler
     * @returns {this}
     */
    once(event, handler) {
      const wrapper = (payload, evtName) => {
        handler(payload, evtName);
        this.off(event, wrapper);
      };
      wrapper._original = handler;
      return this.on(event, wrapper);
    }

    /**
     * Number of active listeners for a given event.
     * @param {string} event
     * @returns {number}
     */
    listenerCount(event) {
      return (this._listeners[event] ?? []).length;
    }

    /**
     * All event names that have at least one listener.
     * @returns {string[]}
     */
    eventNames() {
      return Object.keys(this._listeners);
    }

    /**
     * Remove every listener from every event.
     * Called during terminal teardown.
     */
    clearAll() {
      this._listeners = Object.create(null);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PluginManager
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Manages third-party plugins that extend WebConsole behaviour.
   *
   * A plugin is a plain object:
   * ```js
   * {
   *   name:    "my-plugin",
   *   install(terminal) { terminal.events.on("ready", () => { ... }); }
   * }
   * ```
   *
   * Register plugins before creating the terminal, or before `_init()` runs.
   * They are installed automatically after all core modules are mounted.
   */
  class PluginManager {
    constructor() {
      /** @type {Map<string, { name: string, install: Function }>} */
      this._plugins = new Map();
    }

    /**
     * Register a plugin.
     * @param {{ name: string, install: (terminal: WebConsole) => void }} plugin
     * @throws {TypeError}  For invalid shape.
     * @throws {RangeError} For duplicate names.
     */
    register(plugin) {
      if (!plugin || typeof plugin !== "object")
        throw new TypeError("Plugin must be a plain object.");
      if (typeof plugin.name !== "string" || !plugin.name.trim())
        throw new TypeError("Plugin must have a non-empty string `name`.");
      if (typeof plugin.install !== "function")
        throw new TypeError(
          `Plugin "${plugin.name}" must export an install(terminal) function.`,
        );
      if (this._plugins.has(plugin.name))
        throw new RangeError(`Plugin "${plugin.name}" is already registered.`);

      this._plugins.set(plugin.name, plugin);
    }

    /**
     * Install all registered plugins onto the terminal instance.
     * Individual plugin errors are isolated and logged.
     * @param {WebConsole} terminal
     * @param {boolean}    debug
     */
    installAll(terminal, debug) {
      for (const [name, plugin] of this._plugins) {
        try {
          plugin.install(terminal);
          Logger.info(`Plugin "${name}" installed.`, debug);
        } catch (err) {
          Logger.error(`Plugin "${name}" failed to install:`, err);
        }
      }
    }

    /**
     * Names of all registered plugins.
     * @returns {string[]}
     */
    list() {
      return [...this._plugins.keys()];
    }

    /**
     * @param {string} name
     * @returns {boolean}
     */
    has(name) {
      return this._plugins.has(name);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WebConsole
  // ─────────────────────────────────────────────────────────────────────────

  class WebConsole {
    /**
     * @param {object}  [options]
     * @param {string}  [options.containerId="body"]              Element ID to mount into.
     * @param {string}  [options.promptSymbol="root@desktop:~$ "] Prompt prefix.
     * @param {string}  [options.theme="dark"]                    Theme identifier.
     * @param {number}  [options.maxHistory=500]                  Max history entries.
     * @param {string}  [options.locale="en-US"]                  BCP-47 locale tag.
     * @param {boolean} [options.motd=true]                       Show welcome message.
     * @param {boolean} [options.debug=false]                     Verbose logging.
     * @param {string}  [options.errorMode="warn"]                "throw" | "warn".
     */
    constructor(options = {}) {
      // 1. Validate & freeze config
      this._validateOptions(options);

      /** @type {Readonly<typeof DEFAULTS>} */
      this.config = Object.freeze({ ...DEFAULTS, ...options });

      // 2. Core properties
      /** @type {string} */ this.version = VERSION;
      /** @type {EventBus} */ this.events = new EventBus();
      /** @type {PluginManager} */ this.plugins = new PluginManager();

      // Module slots (populated in _mountModules)
      /** @type {object|null} */ this.renderer = null;
      /** @type {object|null} */ this.parser = null;
      /** @type {object|null} */ this.keyboard = null;
      /** @type {object|null} */ this.engine = null;

      /** @private */
      this._state = {
        ready: false,
        disposed: false,
        initStarted: false,
        startedAt: null,
        readyAt: null,
      };

      /** @private — stored to allow clean removeEventListener on dispose */
      this._unloadHandler = null;

      /** @private — runtime mutable theme (config is frozen) */
      this._currentTheme = options.theme ?? DEFAULTS.theme;

      // 3. Boot
      this._init();
    }

    // ── Initialization ────────────────────────────────────────────────────

    /** @private */
    _init() {
      if (this._state.initStarted) {
        Logger.warn("_init() called more than once — ignoring.");
        return;
      }
      this._state.initStarted = true;
      this._state.startedAt = Date.now();

      Logger.group(`v${this.version} boot sequence`, this.config.debug);
      Logger.info(`v${this.version} initializing...`, this.config.debug);

      try {
        this._checkModules();
        this._mountModules();
        this._bindGlobalEvents();
        this.plugins.installAll(this, this.config.debug);

        this._state.ready = true;
        this._state.readyAt = Date.now();

        const bootMs = this._state.readyAt - this._state.startedAt;
        Logger.info(
          `Terminal ready. Boot time: ${bootMs}ms.`,
          this.config.debug,
        );
        Logger.groupEnd(this.config.debug);

        this.events.emit("ready", {
          version: this.version,
          config: this.config,
          bootMs,
        });
      } catch (err) {
        Logger.groupEnd(this.config.debug);
        Logger.error("Critical initialization failure.", err);
        this.events.emit("error", { phase: "init", error: err });
        if (this.config.errorMode === "throw") throw err;
      }
    }

    /**
     * Validates that required modules are available and warns about missing optionals.
     * @private
     * @throws {ReferenceError}
     */
    _checkModules() {
      const missing = MODULE_REGISTRY.filter(
        ({ key, required }) => required && typeof global[key] === "undefined",
      ).map(({ key, path }) => `${key}  →  ${path}`);

      if (missing.length > 0) {
        throw new ReferenceError(
          `Required module(s) not found:\n  • ${missing.join("\n  • ")}\n` +
            `Load these scripts before console.bootstrap.js.`,
        );
      }

      for (const { key, path, required } of MODULE_REGISTRY) {
        if (!required && typeof global[key] === "undefined") {
          Logger.warn(
            `Optional module "${key}" not loaded — features disabled. (${path})`,
          );
        }
      }
    }

    /**
     * Instantiates every available module in dependency order,
     * then wires the engine to the other modules.
     * @private
     */
    _mountModules() {
      for (const { key, property, required } of MODULE_REGISTRY) {
        if (typeof global[key] === "undefined") continue;

        try {
          // Special handling for ConsoleDatabase which doesn't accept config
          const instanceConfig = key === "ConsoleDatabase" ? null : this.config;
          this[property] = new global[key](instanceConfig);
          Logger.info(
            `Module "${key}" mounted → this.${property}.`,
            this.config.debug,
          );
        } catch (err) {
          if (required) throw err;
          Logger.error(`Optional module "${key}" failed to instantiate:`, err);
          // For ConsoleDatabase, try to provide more debug info
          if (key === "ConsoleDatabase") {
            Logger.error("ConsoleDatabase instantiation details:", {
              globalHasConsoleDatabase:
                typeof global.ConsoleDatabase !== "undefined",
              errorMessage: err.message,
              errorStack: err.stack,
            });
          }
        }
      }

      // Wire engine to sibling modules once all are mounted.
      // Prefer a connect() method; fall back to constructor injection for v1 engines.
      if (this.engine) {
        if (typeof this.engine.connect === "function") {
          this.engine.connect({
            renderer: this.renderer,
            parser: this.parser,
            keyboard: this.keyboard,
          });
        }
        // Link additional modules (ConsoleDatabase, etc)
        if (typeof this.engine.linkModules === "function") {
          try {
            this.engine.linkModules({
              ConsoleDatabase: this.database,
            });
          } catch (err) {
            Logger.error("Engine linkModules failed:", err);
          }
        }
      }

      // Renderer bootstraps the DOM and optionally shows the MOTD.
      this.renderer.buildInterface();
      if (this.config.motd) this.renderer.printWelcomeMessage();
    }

    /**
     * Registers a `beforeunload` listener for automatic cleanup.
     * Stores the reference so it can be removed on dispose().
     * @private
     */
    _bindGlobalEvents() {
      this._unloadHandler = () => this.dispose();
      global.addEventListener?.("beforeunload", this._unloadHandler);
    }

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Prints a line to the terminal output.
     * @param {string} text
     * @param {"output"|"error"|"info"|"warn"} [type="output"]
     * @returns {this}
     */
    print(text, type = "output") {
      this._assertReady("print");
      if (typeof text !== "string")
        throw new TypeError(
          `print(): text must be a string, got "${typeof text}".`,
        );

      this.renderer.print(text, type);
      this.events.emit("print", { text, type });
      return this;
    }

    /**
     * Clears all terminal output.
     * @returns {this}
     */
    clear() {
      this._assertReady("clear");
      this.renderer.clear();
      this.events.emit("clear");
      return this;
    }

    /**
     * Changes the active theme at runtime.
     * Delegates to `ConsoleRenderer.applyTheme()` if available.
     * @param {string} theme
     * @returns {this}
     * @throws {TypeError}
     */
    setTheme(theme) {
      this._assertReady("setTheme");
      if (typeof theme !== "string" || !theme.trim())
        throw new TypeError("setTheme(): theme must be a non-empty string.");

      const previous = this._currentTheme;
      this._currentTheme = theme;

      this.renderer.applyTheme?.(theme);
      this.events.emit("themeChange", { theme, previous });
      Logger.info(`Theme: "${previous}" → "${theme}".`, this.config.debug);
      return this;
    }

    /**
     * Programmatically executes a command string as if typed by the user.
     * Requires `ConsoleEngine` to be loaded.
     * @param {string} command
     * @returns {this}
     * @throws {Error} If ConsoleEngine is not loaded.
     */
    exec(command) {
      this._assertReady("exec");
      if (typeof command !== "string")
        throw new TypeError(
          `exec(): command must be a string, got "${typeof command}".`,
        );
      if (!this.engine)
        throw new Error(
          "exec(): ConsoleEngine is not loaded. " +
            "Load BACKEND/CORE/console.engine.js before calling exec().",
        );

      this.engine.execute(command);
      this.events.emit("exec", { command });
      return this;
    }

    /**
     * Focuses the terminal input field.
     * Requires `ConsoleKeyboard` to be loaded.
     * @returns {this}
     */
    focus() {
      this._assertReady("focus");
      this.keyboard?.focus?.();
      this.events.emit("focus");
      return this;
    }

    /**
     * Returns a frozen snapshot of terminal state and metadata.
     *
     * @returns {{
     *   version:  string,
     *   ready:    boolean,
     *   disposed: boolean,
     *   uptime:   number,
     *   theme:    string,
     *   config:   object,
     *   modules:  { renderer: boolean, parser: boolean, keyboard: boolean, engine: boolean },
     *   plugins:  string[],
     *   events:   { names: string[], counts: Record<string,number> },
     * }}
     */
    getInfo() {
      return Object.freeze({
        version: this.version,
        ready: this._state.ready,
        disposed: this._state.disposed,
        uptime: this._state.readyAt ? Date.now() - this._state.readyAt : 0,
        theme: this._currentTheme,
        config: this.config,
        modules: Object.freeze({
          renderer: !!this.renderer,
          parser: !!this.parser,
          keyboard: !!this.keyboard,
          engine: !!this.engine,
        }),
        plugins: this.plugins.list(),
        events: Object.freeze({
          names: this.events.eventNames(),
          counts: Object.fromEntries(
            this.events
              .eventNames()
              .map((e) => [e, this.events.listenerCount(e)]),
          ),
        }),
      });
    }

    /**
     * Releases all resources, removes event listeners, and marks the terminal
     * as disposed. Subsequent API calls will throw.
     *
     * This method is idempotent — multiple calls are safe.
     */
    dispose() {
      if (this._state.disposed) return;

      Logger.info("Shutting down — releasing resources...", this.config.debug);

      // Remove the global beforeunload listener first.
      if (this._unloadHandler) {
        global.removeEventListener?.("beforeunload", this._unloadHandler);
        this._unloadHandler = null;
      }

      // Tear down in reverse dependency order.
      this.engine?.dispose?.();
      this.keyboard?.dispose?.();
      this.parser?.dispose?.();
      this.renderer?.dispose?.();

      const uptime = this._state.readyAt ? Date.now() - this._state.readyAt : 0;
      this.events.emit("dispose", { uptime });
      this.events.clearAll();

      this._state.ready = false;
      this._state.disposed = true;

      Logger.info("Terminal shutdown complete.", this.config.debug);
    }

    // ── Private helpers ────────────────────────────────────────────────────

    /**
     * Validates user-supplied options against OPTION_SCHEMA.
     * Also warns about unrecognised keys.
     * @private
     * @throws {TypeError|RangeError}
     */
    _validateOptions(options) {
      if (
        typeof options !== "object" ||
        options === null ||
        Array.isArray(options)
      )
        throw new TypeError("WebConsole: options must be a plain object.");

      for (const { key, type, guard, msg } of OPTION_SCHEMA) {
        const value = options[key];
        if (value === undefined) continue;

        if (typeof value !== type) {
          throw new TypeError(`WebConsole: ${msg}`);
        }
        if (guard && !guard(value)) {
          const Err = type === "number" ? RangeError : TypeError;
          throw new Err(`WebConsole: ${msg}`);
        }
      }

      // Warn about unknown keys — most likely typos.
      const known = new Set(OPTION_SCHEMA.map((r) => r.key));
      for (const key of Object.keys(options)) {
        if (!known.has(key))
          Logger.warn(`Unknown option "${key}" will be ignored.`);
      }
    }

    /**
     * Asserts the terminal is in a usable state before an API call.
     * @private
     * @param {string} methodName
     * @throws {Error}
     */
    _assertReady(methodName) {
      if (this._state.disposed)
        throw new Error(
          `WebConsole.${methodName}(): terminal has been disposed. ` +
            `Create a new WebConsole instance to continue.`,
        );
      if (!this._state.ready)
        throw new Error(
          `WebConsole.${methodName}(): terminal is not yet ready. ` +
            `Wait for the "ready" event before calling API methods.`,
        );
    }

    // ── Introspection ──────────────────────────────────────────────────────

    toString() {
      const status = this._state.disposed
        ? "disposed"
        : this._state.ready
          ? "ready"
          : "initializing";
      return `WebConsole v${this.version} [${status}]`;
    }

    get [Symbol.toStringTag]() {
      return "WebConsole";
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Static helpers (on the class, not instances)
  // ─────────────────────────────────────────────────────────────────────────

  /** Bootstrap version, accessible without creating an instance. */
  WebConsole.version = VERSION;

  /**
   * Returns whether a module constructor is currently available globally.
   * @param {string} moduleName - e.g. "ConsoleRenderer"
   * @returns {boolean}
   */
  WebConsole.isModuleAvailable = (moduleName) =>
    typeof global[moduleName] !== "undefined";

  /**
   * Returns a shallow copy of the module registry for tooling / diagnostics.
   * @returns {object[]}
   */
  WebConsole.getModuleRegistry = () =>
    MODULE_REGISTRY.map((entry) => ({ ...entry }));

  // ─────────────────────────────────────────────────────────────────────────
  // Global exposure
  // ─────────────────────────────────────────────────────────────────────────

  if (typeof global.WebConsole !== "undefined") {
    Logger.warn(
      "window.WebConsole is already defined — registration skipped. " +
        "Remove duplicate script tags if this is unintentional.",
    );
  } else {
    global.WebConsole = WebConsole;
    Logger.info(`v${VERSION} registered on window.WebConsole.`);
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
