/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║                  console.apiwebsocket.link.js v1.0.0                      ║
 * ║              Terminal ↔ External Sites Integration Bridge                 ║
 * ║                                                                            ║
 * ║  Links the terminal BACKEND (ConsoleBridge + ConsoleWebSocket) with       ║
 * ║  external websites and applications.                                       ║
 * ║                                                                            ║
 * ║  What it does:                                                             ║
 * ║  - Registers external sites and generates API keys for them               ║
 * ║  - Wires ConsoleBridge (HTTP/REST) to all terminal modules                ║
 * ║  - Wires ConsoleWebSocket (real-time) to all terminal modules             ║
 * ║  - Exposes a simple API for external sites to call terminal commands      ║
 * ║  - Provides a WebSocket client helper for real-time communication         ║
 * ║  - Broadcasts terminal events to all connected external clients           ║
 * ║                                                                            ║
 * ║  Usage on the terminal page:                                               ║
 * ║    Load this file AFTER all other terminal scripts.                        ║
 * ║    window.TerminalLink.connect()                                           ║
 * ║                                                                            ║
 * ║  Usage on an external site:                                                ║
 * ║    const client = new TerminalClient('http://localhost:8000', apiKey);     ║
 * ║    await client.execute('help');                                           ║
 * ║    client.onOutput(line => console.log(line));                             ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 *
 * @version 1.0.0
 * @license MIT
 */

(() => {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────────
  // Logger
  // ─────────────────────────────────────────────────────────────────────────

  const _log = (level, msg, data) => {
    const styles = {
      info:    "color: #00aaff; font-weight: bold;",
      success: "color: #00ff00; font-weight: bold;",
      warn:    "color: #ffaa00; font-weight: bold;",
      error:   "color: #ff0000; font-weight: bold;",
    };
    const icons = { info: "ℹ", success: "✓", warn: "⚠", error: "✗" };
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(`%c[TerminalLink] ${icons[level]} ${msg}`, styles[level] || "", data || "");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TerminalLink — runs on the terminal page, wires everything together
  // ─────────────────────────────────────────────────────────────────────────

  class TerminalLink {
    constructor() {
      this._bridge    = null;
      this._ws        = null;
      this._engine    = null;
      this._database  = null;
      this._renderer  = null;
      this._settings  = null;
      this._keyboard  = null;
      this._table     = null;
      this._registry  = null;
      this._commands  = null;
      this._builtins  = null;
      this._connected = false;
      this._sites     = new Map(); // siteKey → { apiKey, token }
    }

    // ── Connect all modules ────────────────────────────────────────────────

    /**
     * Wires ConsoleBridge and ConsoleWebSocket to every available terminal module.
     * Call this once after all scripts have loaded.
     */
    connect() {
      this._bridge   = window.ConsoleBridge   || null;
      this._ws       = window.ConsoleWebSocket || null;
      this._engine   = window.ConsoleEngine   || null;
      this._database = window.ConsoleDatabase || null;
      this._renderer = window.ConsoleRenderer || null;
      this._settings = window.ConsoleSettings || null;
      this._keyboard = window.ConsoleKeyboard || null;
      this._table    = window.ConsoleTable    || null;
      this._registry = window.ConsoleRegistry || null;
      this._commands = window.ConsoleCommands || null;
      this._builtins = window.ConsoleBuiltins || null;

      const modules = {
        ConsoleSettings:  this._settings,
        ConsoleRenderer:  this._renderer,
        ConsoleKeyboard:  this._keyboard,
        ConsoleDatabase:  this._database,
        ConsoleTable:     this._table,
        ConsoleCommands:  this._commands,
        ConsoleRegistry:  this._registry,
        ConsoleBuiltins:  this._builtins,
        ConsoleEngine:    this._engine,
      };

      // Link ConsoleBridge
      if (this._bridge) {
        this._bridge.linkModules(modules);
        this._bridge.start();
        this._setupBridgeRoutes();
        _log("success", `ConsoleBridge started → ${this._bridge.getServerInfo().url}`);
      } else {
        _log("warn", "ConsoleBridge not found — HTTP API unavailable");
      }

      // Link ConsoleWebSocket
      if (this._ws) {
        this._ws.linkModules({
          ...modules,
          ConsoleBridge: this._bridge,
        });
        this._ws.start();
        this._setupWebSocketEvents();
        _log("success", `ConsoleWebSocket started → ${this._ws.getServerInfo().url}`);
      } else {
        _log("warn", "ConsoleWebSocket not found — real-time unavailable");
      }

      this._connected = true;
      _log("success", "TerminalLink connected — terminal is now accessible to external sites");

      return this;
    }

    // ── Register external site ─────────────────────────────────────────────

    /**
     * Register an external site and get its API key + token.
     *
     * @param {string} siteKey   - Unique identifier, e.g. "my-dashboard"
     * @param {object} config    - { name, url, permissions }
     * @returns {{ apiKey, token, expiresAt }}
     *
     * @example
     *   const creds = window.TerminalLink.registerSite('my-site', {
     *     name: 'My Dashboard',
     *     url:  'https://mydashboard.com',
     *     permissions: ['read', 'execute']
     *   });
     *   // Give creds.apiKey to the external site
     */
    registerSite(siteKey, config = {}) {
      if (!this._bridge) {
        _log("error", "ConsoleBridge not connected — call connect() first");
        return null;
      }

      const registered = this._bridge._authManager.registerSite(siteKey, config);
      if (!registered.success) {
        _log("error", `Failed to register site: ${registered.error}`);
        return null;
      }

      const tokenResult = this._bridge._authManager.generateToken(siteKey);

      this._sites.set(siteKey, {
        apiKey:    registered.apiKey,
        token:     tokenResult.token,
        expiresAt: tokenResult.expiresAt,
      });

      _log("success", `Site registered: ${siteKey}`, { apiKey: registered.apiKey });

      return {
        apiKey:    registered.apiKey,
        token:     tokenResult.token,
        expiresAt: tokenResult.expiresAt,
      };
    }

    // ── Extra Bridge routes for external sites ─────────────────────────────

    _setupBridgeRoutes() {
      if (!this._bridge) return;

      // GET /api/terminal/status — quick health check for external sites
      this._bridge.get("/api/terminal/status", () => ({
        online:    true,
        version:   this._engine?.version || "unknown",
        modules:   Object.keys(this._bridge.modules),
        timestamp: Date.now(),
      }));

      // POST /api/terminal/execute — run a terminal command from an external site
      this._bridge.post("/api/terminal/execute", (req) => {
        const { command } = req.body || {};
        if (!command) return { success: false, error: "command required" };

        if (!this._engine) return { success: false, error: "ConsoleEngine not available" };

        // Capture output by temporarily hooking the renderer
        const lines = [];
        const origPrint = this._renderer?.print?.bind(this._renderer);
        if (this._renderer) {
          this._renderer.print = (text, type) => {
            lines.push({ text, type });
            origPrint?.(text, type);
          };
        }

        this._engine.execute(command);

        if (this._renderer && origPrint) {
          this._renderer.print = origPrint;
        }

        return { success: true, command, output: lines };
      });

      // GET /api/terminal/tables — list all database tables
      this._bridge.get("/api/terminal/tables", () => {
        if (!this._database) return { success: false, error: "ConsoleDatabase not available" };
        return { success: true, tables: this._database.list() };
      });

      // POST /api/terminal/query — run a SQL-like query
      this._bridge.post("/api/terminal/query", (req) => {
        const { query } = req.body || {};
        if (!query) return { success: false, error: "query required" };
        if (!this._database) return { success: false, error: "ConsoleDatabase not available" };

        try {
          const ControllerClass = window.ConsoleDatabaseController;
          if (ControllerClass) {
            const controller = new ControllerClass();
            controller.linkDatabase(this._database);
            // Sync session if engine has an active one
            const token = this._database.getToken();
            if (token) controller._sessionToken = token;
            return { success: true, result: controller.query(query) };
          }
          return { success: false, error: "ConsoleDatabaseController not available" };
        } catch (e) {
          return { success: false, error: e.message };
        }
      });

      // GET /api/terminal/settings — read terminal settings
      this._bridge.get("/api/terminal/settings", () => {
        if (!this._settings) return { success: false, error: "ConsoleSettings not available" };
        return { success: true, settings: this._settings.getAll() };
      });

      // PUT /api/terminal/settings — update a setting
      this._bridge.put("/api/terminal/settings", (req) => {
        const { path, value } = req.body || {};
        if (!path) return { success: false, error: "path required" };
        if (!this._settings) return { success: false, error: "ConsoleSettings not available" };
        this._settings.set(path, value);
        return { success: true, path, value };
      });
    }

    // ── WebSocket event forwarding ─────────────────────────────────────────

    _setupWebSocketEvents() {
      if (!this._ws) return;

      // Forward terminal renderer output to all WS clients in real-time
      if (this._renderer) {
        const origPrint = this._renderer.print.bind(this._renderer);
        this._renderer.print = (text, type = "output") => {
          origPrint(text, type);
          this._ws.broadcastAll({
            type:      "terminal:output",
            text,
            outputType: type,
            timestamp: Date.now(),
          });
        };
      }

      // Forward engine command executions
      if (this._engine && typeof this._engine.on === "function") {
        this._engine.on("command:executed", (data) => {
          this._ws.broadcastAll({
            type:    "terminal:command",
            command: data.command,
            success: data.success,
            time:    data.executionTime,
          });
        });
      }

      // Forward database table events
      if (this._database && typeof this._database.on === "function") {
        this._database.on("table:created", (data) => {
          this._ws.broadcastAll({ type: "db:table_created", tableName: data.tableName });
        });
        this._database.on("table:deleted", (data) => {
          this._ws.broadcastAll({ type: "db:table_deleted", tableName: data.tableName });
        });
        this._database.on("row:inserted", (data) => {
          this._ws.broadcastAll({ type: "db:row_inserted", tableName: data.tableName });
        });
      }

      // Forward settings changes
      if (this._settings && typeof this._settings.on === "function") {
        this._settings.on("setting:changed", (data) => {
          this._ws.broadcastAll({ type: "settings:changed", path: data.path, value: data.newValue });
        });
        this._settings.on("theme:applied", (data) => {
          this._ws.broadcastAll({ type: "settings:theme", theme: data.theme });
        });
      }
    }

    // ── Info ───────────────────────────────────────────────────────────────

    getInfo() {
      return {
        connected:  this._connected,
        bridge:     this._bridge?.getServerInfo()  || null,
        websocket:  this._ws?.getServerInfo()      || null,
        sites:      Array.from(this._sites.keys()),
        modules: {
          engine:   !!this._engine,
          database: !!this._database,
          renderer: !!this._renderer,
          settings: !!this._settings,
          keyboard: !!this._keyboard,
          table:    !!this._table,
          registry: !!this._registry,
          commands: !!this._commands,
        },
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TerminalClient — runs on the EXTERNAL site, talks to the terminal
  // ─────────────────────────────────────────────────────────────────────────

  class TerminalClient {
    /**
     * @param {string} terminalOrigin  - e.g. "http://localhost:8000"
     * @param {string} apiKey          - key from TerminalLink.registerSite()
     */
    constructor(terminalOrigin, apiKey) {
      this._origin  = terminalOrigin.replace(/\/$/, "");
      this._apiKey  = apiKey;
      this._token   = null;
      this._ws      = null;
      this._handlers = {};
    }

    // ── Auth ───────────────────────────────────────────────────────────────

    async authenticate() {
      const res = await fetch(`${this._origin}/api/auth/token`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ apiKey: this._apiKey }),
      });
      const data = await res.json();
      if (data.success !== false && data.token) {
        this._token = data.token;
        return true;
      }
      throw new Error(`Auth failed: ${data.error || "unknown"}`);
    }

    // ── HTTP helpers ───────────────────────────────────────────────────────

    _headers() {
      const h = { "Content-Type": "application/json" };
      if (this._token) h["X-API-Token"] = this._token;
      else if (this._apiKey) h["X-API-Key"] = this._apiKey;
      return h;
    }

    async _get(path) {
      const res = await fetch(`${this._origin}${path}`, { headers: this._headers() });
      return res.json();
    }

    async _post(path, body) {
      const res = await fetch(`${this._origin}${path}`, {
        method:  "POST",
        headers: this._headers(),
        body:    JSON.stringify(body),
      });
      return res.json();
    }

    // ── Terminal API ───────────────────────────────────────────────────────

    /** Execute a terminal command. Returns { success, command, output[] } */
    execute(command) {
      return this._post("/api/terminal/execute", { command });
    }

    /** Run a SQL-like query. Returns { success, result } */
    query(queryString) {
      return this._post("/api/terminal/query", { query: queryString });
    }

    /** List all database tables. */
    getTables() {
      return this._get("/api/terminal/tables");
    }

    /** Get all terminal settings. */
    getSettings() {
      return this._get("/api/terminal/settings");
    }

    /** Update a terminal setting. */
    setSetting(path, value) {
      return this._post("/api/terminal/settings", { path, value });
    }

    /** Quick health check. */
    status() {
      return this._get("/api/terminal/status");
    }

    // ── WebSocket real-time ────────────────────────────────────────────────

    /**
     * Connect to the terminal WebSocket for real-time events.
     * @param {string} wsUrl  - e.g. "ws://localhost:9000"
     * @param {string} clientId
     */
    connectWebSocket(wsUrl, clientId = "external-" + Date.now()) {
      this._ws = new WebSocket(wsUrl);

      this._ws.onopen = () => {
        _log("success", `WebSocket connected to terminal: ${wsUrl}`);
        this._emit("connected", {});
      };

      this._ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this._emit(msg.type, msg);
          this._emit("*", msg);
        } catch {}
      };

      this._ws.onclose = () => {
        _log("warn", "WebSocket disconnected from terminal");
        this._emit("disconnected", {});
      };

      this._ws.onerror = (err) => {
        _log("error", "WebSocket error", err);
        this._emit("error", err);
      };
    }

    /** Listen for a specific event type from the terminal. */
    on(eventType, handler) {
      if (!this._handlers[eventType]) this._handlers[eventType] = [];
      this._handlers[eventType].push(handler);
      return this;
    }

    /** Shorthand: listen for terminal output lines. */
    onOutput(handler) { return this.on("terminal:output", handler); }

    /** Shorthand: listen for command executions. */
    onCommand(handler) { return this.on("terminal:command", handler); }

    /** Shorthand: listen for DB changes. */
    onDatabaseChange(handler) {
      this.on("db:table_created", handler);
      this.on("db:table_deleted", handler);
      this.on("db:row_inserted",  handler);
      return this;
    }

    /** Shorthand: listen for settings changes. */
    onSettingsChange(handler) { return this.on("settings:changed", handler); }

    _emit(type, data) {
      (this._handlers[type] || []).forEach(h => { try { h(data); } catch {} });
    }

    disconnectWebSocket() {
      this._ws?.close();
      this._ws = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Global Export
  // ─────────────────────────────────────────────────────────────────────────

  window.TerminalLink   = new TerminalLink();
  window.TerminalClient = TerminalClient;

  console.log(
    "%c[TerminalLink] %cv1.0.0 loaded — call window.TerminalLink.connect() to activate",
    "color: #00ffaa; font-weight: bold;",
    "color: #00ff00;",
  );
})();
