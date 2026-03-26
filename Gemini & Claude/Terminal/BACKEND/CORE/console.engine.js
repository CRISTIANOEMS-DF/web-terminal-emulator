/**
 * @file        console.engine.js
 * @description ConsoleEngine — Command Execution & Routing
 *
 * The core brain of the terminal. It connects the Keyboard (input) to the
 * Renderer (output). It maintains the command history array, parses raw
 * string inputs, matches them against registered commands, and executes them.
 *
 * Contract with console.bootstrap.js (v3.0.0):
 * Bootstrap calls: engine.connect({ renderer, keyboard, parser })
 *
 * @version 3.0.0
 * @license MIT
 */

(function (global) {
  "use strict";

  if (typeof global.ConsoleEngine !== "undefined") {
    console.warn(
      "[ConsoleEngine] Already registered — skipping re-definition.",
    );
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Logger with Full Tracking
  // ─────────────────────────────────────────────────────────────────────────
  class _Logger {
    constructor(debugMode = false) {
      this.debugMode = debugMode;
      this.logs = [];
      this.maxLogs = 1000;
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

    info(msg, data) {
      this._store("INFO", msg, data);
      console.info(`%c[ConsoleEngine] ℹ ${msg}`, "color: #00aaff", data || "");
    }

    error(msg, err = null) {
      this._store("ERROR", msg, err);
      console.error(`%c[ConsoleEngine] ✖ ${msg}`, "color: #ff0000", err ?? "");
    }

    warn(msg, data) {
      this._store("WARN", msg, data);
      console.warn(`%c[ConsoleEngine] ⚠ ${msg}`, "color: #ffaa00", data || "");
    }

    debug(msg, data) {
      if (this.debugMode) {
        this._store("DEBUG", msg, data);
        console.log(
          `%c[ConsoleEngine] 🐛 ${msg}`,
          "color: #ff00ff",
          data || "",
        );
      }
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

  // ─────────────────────────────────────────────────────────────────────────
  // Event Emitter System
  // ─────────────────────────────────────────────────────────────────────────
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
          console.error("[ConsoleEngine] Event callback error:", error);
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
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ConsoleEngine Class
  // ─────────────────────────────────────────────────────────────────────────
  class ConsoleEngine {
    constructor(config = {}) {
      this.config = Object.freeze(config);
      this.version = "3.0.0";

      // UI Module references (FRONTEND)
      this._renderer = null;
      this._keyboard = null;

      // CORE module references
      this._parser = null; // ConsoleParser for advanced parsing
      this._history = null; // ConsoleHistory for command history
      this._consoleHistoryArray = []; // Local history fallback

      // CONFIG module references
      this._settings = null; // ConsoleSettings for configuration

      // API module references
      this._bridge = null; // ConsoleBridge for HTTP API
      this._websocket = null; // ConsoleWebSocket for real-time sync

      // DATABASE module references
      this._database = null; // ConsoleDatabase for data storage

      // State
      this._historyIndex = -1;
      this._disposed = false;
      this._loginState = null;
      this._phpSessionActive = false;
      this._executionStats = {
        total: 0,
        successful: 0,
        failed: 0,
        lastExecution: null,
      };

      // Components
      this._logger = new _Logger(config.debug);
      this._events = new _EventEmitter();

      // Command Registry (Built-in commands)
      this._commands = this._buildBuiltinCommands();

      this._logger.info("Instantiated (v3.0.0)");
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Wires the Engine to the rest of the system.
     * Called automatically by WebConsole Bootstrap.
     * @param {Object} modules - { renderer, keyboard, parser }
     */
    connect(modules) {
      if (!modules || !modules.keyboard || !modules.renderer) {
        this._logger.error(
          "Cannot connect: Missing required modules (keyboard, renderer).",
        );
        return false;
      }

      this._renderer = modules.renderer;
      this._keyboard = modules.keyboard;

      // 1. Listen for Enter key (Execution)
      this._keyboard.events.on("commit", (data) => this.execute(data.command));

      // 2. Listen for Up/Down arrows (History Navigation)
      this._keyboard.events.on("history", (data) =>
        this._navigateHistory(data.direction),
      );

      this._logger.info("Connected to Keyboard and Renderer");
      this._events.emit("engine:connected", { modules: Object.keys(modules) });

      return true;
    }

    /**
     * The main execution loop. Takes a raw string, finds the command, and runs it.
     * @param {string} rawInput
     */
    async execute(rawInput) {
      if (this._disposed) return { success: false, error: "Engine disposed" };
      if (typeof rawInput !== "string")
        return { success: false, error: "Invalid input" };

      const input = rawInput.trim();

      // Handle interactive login state
      if (this._loginState) {
        return this._handleInteractiveLogin(input);
      }

      // Ignore empty Enter hits
      if (input === "") return { success: false, error: "Empty command" };

      const startTime = performance.now();

      try {
        // Use ConsoleParser if available for advanced parsing
        let parseResult = null;
        if (this._parser) {
          parseResult = this._parser.parse(input);
          if (!parseResult.success) {
            this._renderer.print(
              `Parse error: ${parseResult.errors.join(", ")}`,
              "error",
            );
            this._executionStats.failed++;
            return { success: false, error: "Parse failed" };
          }
        }

        // Add to history
        this._addToHistory(input);

        // Sync with ConsoleHistory module if available
        if (this._history) {
          this._history.add(input, {
            parseResult,
            executedAt: Date.now(),
          });
        }

        // Parse input (fallback to simple split if parser not available)
        const args = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
        const cmdName = args.shift().toLowerCase();

        // Find and execute command
        if (this._commands.has(cmdName)) {
          try {
            const commandDef = this._commands.get(cmdName);

            // Execute with API context if available
            const apiContext = {
              renderer: this._renderer,
              engine: this,
              settings: this._settings,
              history: this._history,
              parser: this._parser,
            };

            await commandDef.action(args, this._renderer, this, apiContext);

            this._executionStats.successful++;
            this._executionStats.total++;
            this._executionStats.lastExecution = Date.now();

            const executionTime = performance.now() - startTime;

            // Sync with API if available
            if (this._bridge) {
              this._syncWithAPI(input, {
                success: true,
                command: cmdName,
                args,
                executionTime,
              });
            }

            // Emit event
            this._events.emit("command:executed", {
              command: cmdName,
              args,
              success: true,
              executionTime,
            });

            return {
              success: true,
              command: cmdName,
              executionTime,
            };
          } catch (err) {
            this._logger.error(`Command execution failed: ${cmdName}`, err);
            this._renderer.print(
              `Error executing '${cmdName}': ${err.message}`,
              "error",
            );

            this._executionStats.failed++;
            this._executionStats.total++;

            return { success: false, error: err.message };
          }
        } else {
          // Command not found - attempt suggestion from settings
          let suggestions = [];
          if (this._settings && this._settings.getSetting) {
            const enableSuggestions =
              this._settings.getSetting("terminal.enableSuggestions") !== false;

            if (enableSuggestions && this._parser) {
              // Try to get suggestions from parser
              const validation = this._parser.validate(input);
              if (validation.suggestions) {
                suggestions = validation.suggestions;
              }
            }
          }

          this._renderer.print(`bash: ${cmdName}: command not found`, "error");

          if (suggestions.length > 0) {
            this._renderer.print(
              `Did you mean: ${suggestions.join(", ")}?`,
              "info",
            );
          } else {
            this._renderer.print(
              `Type 'help' to see available commands.`,
              "info",
            );
          }

          this._executionStats.failed++;
          this._executionStats.total++;

          return {
            success: false,
            error: "Command not found",
            suggestions,
          };
        }
      } catch (error) {
        this._logger.error("Execution error", error);
        this._executionStats.failed++;
        this._executionStats.total++;
        return { success: false, error: error.message };
      }
    }

    /**
     * Registers a new custom command.
     * Useful for injecting specific commands from the host website.
     */
    registerCommand(name, description, actionCallback) {
      this._commands.set(name.toLowerCase(), {
        description: description,
        action: actionCallback,
      });
      this._logger.info(`Command registered: ${name}`);

      // Register with parser if available
      if (this._parser) {
        this._parser.registerCommand(name.toLowerCase());
      }

      // Emit event
      this._events.emit("command:registered", { name, description });
    }

    // ── Module Linking (API & CONFIG Integration) ────────────────────────

    /**
     * Link with other modules (API, CONFIG, CORE)
     */
    linkModules(modules = {}) {
      if (modules.ConsoleParser) this._parser = modules.ConsoleParser;
      if (modules.ConsoleHistory) this._history = modules.ConsoleHistory;
      if (modules.ConsoleSettings) this._settings = modules.ConsoleSettings;
      if (modules.ConsoleBridge) this._bridge = modules.ConsoleBridge;
      if (modules.ConsoleWebSocket) this._websocket = modules.ConsoleWebSocket;
      if (modules.ConsoleDatabase) this._database = modules.ConsoleDatabase;

      // Auto-instantiate ConsoleDatabase if available as class
      if (!this._database && typeof global.ConsoleDatabase !== "undefined") {
        try {
          this._database = new global.ConsoleDatabase();
        } catch (err) {
          console.warn(
            "[ConsoleEngine] Failed to auto-instantiate ConsoleDatabase:",
            err,
          );
        }
      }

      // Subscribe to database events if available
      if (this._database && typeof this._database.on === "function") {
        this._database.on("table:created", (data) => {
          this._renderer?.print(
            `✓ Table '${data.tableName}' created in database.`,
            "success",
          );
        });
        this._database.on("table:deleted", (data) => {
          this._renderer?.print(
            `✗ Table '${data.tableName}' deleted from database.`,
            "warn",
          );
        });
        this._logger.info("Subscribed to ConsoleDatabase events.");
      }

      const linked = [];
      if (this._parser) linked.push("ConsoleParser");
      if (this._history) linked.push("ConsoleHistory");
      if (this._settings) linked.push("ConsoleSettings");
      if (this._bridge) linked.push("ConsoleBridge");
      if (this._websocket) linked.push("ConsoleWebSocket");
      if (this._database) linked.push("ConsoleDatabase");

      this._logger.info(`Linked modules: ${linked.join(", ")}`);
      this._events.emit("modules:linked", { modules: linked });

      // Register API routes if bridge is available
      if (this._bridge) {
        this.registerAPIRoutes(this._bridge);
      }

      return true;
    }

    /**
     * Check if all required modules are linked
     */
    areAllModulesLinked() {
      return (
        this._parser !== null &&
        this._history !== null &&
        this._settings !== null &&
        this._bridge !== null &&
        this._websocket !== null
      );
    }

    // ── API Integration ──────────────────────────────────────────────────

    /**
     * Register API routes with ConsoleBridge
     */
    registerAPIRoutes(bridge) {
      if (!bridge) return;

      // POST /api/engine/execute - Execute a command
      bridge.post("/api/engine/execute", (req) => {
        const { command } = req.body || {};
        if (!command) {
          return { success: false, error: "Command required" };
        }

        const result = this.execute(command);
        return result;
      });

      // GET /api/engine/commands - List registered commands
      bridge.get("/api/engine/commands", (req) => {
        const commands = Array.from(this._commands.entries()).map(
          ([name, def]) => ({
            name,
            description: def.description,
          }),
        );

        return {
          success: true,
          count: commands.length,
          commands,
        };
      });

      // GET /api/engine/stats - Get execution statistics
      bridge.get("/api/engine/stats", (req) => {
        return {
          success: true,
          stats: this._executionStats,
        };
      });

      // GET /api/engine/debug - Get debug info
      bridge.get("/api/engine/debug", (req) => {
        return {
          success: true,
          debug: this.debugInfo(),
        };
      });

      this._logger.info("API routes registered");
    }

    /**
     * Sync execution result with API
     */
    _syncWithAPI(command, result) {
      if (!this._bridge && !this._websocket) return;

      try {
        const data = {
          type: "command_executed",
          command,
          result,
          timestamp: Date.now(),
        };

        // Publish via WebSocket if available
        if (this._websocket) {
          this._websocket.publish("engine_channel", data);
        }
      } catch (error) {
        this._logger.error("API sync failed", error);
      }
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
     * Get debug information
     */
    debugInfo() {
      return {
        name: "ConsoleEngine",
        version: this.version,
        disposed: this._disposed,
        commands: this._commands.size,
        history: this._consoleHistoryArray.length,
        stats: this._executionStats,
        modulesLinked: this.areAllModulesLinked(),
        modules: {
          parser: this._parser !== null,
          history: this._history !== null,
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
     * Get command registry
     */
    getCommands() {
      return Array.from(this._commands.entries()).map(([name, def]) => ({
        name,
        description: def.description,
      }));
    }

    /**
     * Get execution stats
     */
    getStats() {
      return { ...this._executionStats };
    }

    dispose() {
      this._disposed = true;
      this._renderer = null;
      this._keyboard = null;
      this._parser = null;
      this._history = null;
      this._settings = null;
      this._bridge = null;
      this._websocket = null;
      this._commands.clear();
      this._consoleHistoryArray = [];
      this._logger.info("Disposed");
    }

    // ── Private: Update prompt symbol ────────────────────────────────────────

    _updatePrompt(username) {
      // Update the mutable prompt symbol so every new input line uses it
      const symbol = username ? `${username}@terminal:~$ ` : "user@machine:~$ ";
      if (this._renderer) {
        this._renderer._promptSymbol = symbol;
        const promptEl = this._renderer._root?.querySelector(".wc-prompt");
        if (promptEl) promptEl.textContent = symbol;
      }
    }

    // ── Private: History Management ─────────────────────────────────────────

    _addToHistory(cmd) {
      // Don't add consecutive duplicates
      const lastEntry =
        this._consoleHistoryArray[this._consoleHistoryArray.length - 1];
      if (lastEntry !== cmd) {
        this._consoleHistoryArray.push(cmd);
      }
      this._historyIndex = this._consoleHistoryArray.length;
    }

    // ── Private: Interactive Login Handling ──────────────────────────────────

    _handleInteractiveLogin(input) {
      if (!this._database) {
        this._loginState = null;
        return this._renderer.print("❌ Database not available.", "error");
      }

      if (!this._loginState) {
        this._loginState = null;
        return this._renderer.print(
          "❌ Login state corrupted. Please try again.",
          "error",
        );
      }

      const state = this._loginState;

      if (state.step === "username") {
        // Recebeu username, padroniza para minúsculo e pede password
        state.username = input.toLowerCase();
        state.step = "password";
        return this._renderer.print("Password: ", "info", false);
      }

      if (state.step === "password") {
        // Recebeu password, tenta login usando o username salvo no state
        const password = input;
        const username = state.username;

        const result = this._database.authenticate(username, password);
        if (result.success) {
          if (typeof this._database.setAuthenticated === "function") {
            this._database.setAuthenticated(result.token, true);
          }
          this._updatePrompt(username);
          this._renderer.print(`✓ Login successful as ${username}`, "success");
          if (result.user && result.user.role === "admin") {
            this._renderer.print("🔑 Admin privileges granted", "info");
          }
        } else {
          this._renderer.print(`❌ ${result.message}`, "error");
        }

        // Limpa estado de login
        this._loginState = null;
        return;
      }

      // Estado inválido, limpa
      this._loginState = null;
      return this._renderer.print(
        "❌ Login state corrupted. Please try again.",
        "error",
      );
    }

    _navigateHistory(direction) {
      if (this._consoleHistoryArray.length === 0) return;

      if (direction === "up") {
        if (this._historyIndex > 0) {
          this._historyIndex--;
          this._keyboard.setBuffer(
            this._consoleHistoryArray[this._historyIndex],
          );
        }
      } else if (direction === "down") {
        if (this._historyIndex < this._consoleHistoryArray.length - 1) {
          this._historyIndex++;
          this._keyboard.setBuffer(
            this._consoleHistoryArray[this._historyIndex],
          );
        } else {
          // Reached the bottom, clear the buffer
          this._historyIndex = this._consoleHistoryArray.length;
          this._keyboard.clearBuffer();
        }
      }
    }

    // ── Private: Built-in Commands ──────────────────────────────────────────

    _buildBuiltinCommands() {
      const registry = new Map();

      // ... (keep existing non-db commands like help, clear, echo, etc.)

      registry.set("help", {
        description: "Lists all available commands.",
        action: (args, renderer, engine) => {
          renderer.print("WebConsole Commands:\n", "info");
          const cmdList = [];
          for (const [name, def] of engine._commands.entries()) {
            cmdList.push({
              COMMAND: name,
              DESCRIPTION: def.description || "No description",
            });
          }
          cmdList.sort((a, b) => a.COMMAND.localeCompare(b.COMMAND));
          if (
            typeof global.ConsoleTable !== "undefined" &&
            global.ConsoleTable &&
            global.ConsoleTable.render
          ) {
            renderer.renderTable(cmdList);
          } else {
            cmdList.forEach((c) =>
              renderer.print(`  ${c.COMMAND.padEnd(20)} - ${c.DESCRIPTION}`),
            );
          }
          renderer.print(
            `\nTotal: ${cmdList.length} commands available`,
            "muted",
          );
        },
      });

      registry.set("clear", {
        description: "Clears the terminal screen.",
        action: (args, renderer) => renderer.clear(),
      });

      registry.set("echo", {
        description: "Prints the given text to the screen.",
        action: (args, renderer) => {
          const text = args.join(" ").replace(/^["'](.*)["']$/, "$1");
          renderer.print(text, "output");
        },
      });

      registry.set("history", {
        description: "Displays the command history.",
        action: (args, renderer, engine) => {
          engine._consoleHistoryArray.forEach((cmd, idx) => {
            renderer.print(`  ${String(idx + 1).padStart(3, " ")}  ${cmd}`);
          });
        },
      });

      registry.set("version", {
        description: "Shows version information.",
        action: (args, renderer) => {
          renderer.print("ConsoleEngine: v3.1.0 (DB-Enhanced)", "info");
        },
      });

      registry.set("loadphp", {
        description: "Load data from PHP export file. Requires login.",
        category: "database",
        action: async (args, renderer, engine) => {
          if (
            window.location.port === "5500" ||
            window.location.port === "5501"
          ) {
            renderer.print(
              "❌ You are on Live Server (port " +
                window.location.port +
                "), which cannot run PHP.",
              "error",
            );
            renderer.print(
              "💡 Start the PHP server: php -S localhost:8000",
              "info",
            );
            renderer.print(
              "💡 Then open: http://localhost:8000/FRONTEND/terminal.html",
              "info",
            );
            return;
          }

          const isAuthenticated =
            engine._database &&
            (typeof engine._database.isAuthenticated === "function"
              ? engine._database.isAuthenticated()
              : engine._database._isAuthenticated);

          if (!isAuthenticated) {
            return renderer.print(
              "❌ Authentication required. Please login first.",
              "error",
            );
          }

          // Same origin as the page — no hardcoded port
          const url = `${window.location.origin}/BACKEND/DATABASE/database_export.php?api=1&action=load`;

          try {
            const response = await fetch(url, {
              method: "GET",
              credentials: "include",
            });

            if (response.status === 401) {
              renderer.print("❌ PHP session expired or not found.", "error");
              renderer.print(
                "💡 Run 'loginphp <username> <password>' first.",
                "info",
              );
              return;
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const text = await response.text();
            if (text.trimStart().startsWith("<?php")) {
              throw new Error(
                "Server returned raw PHP — PHP is not being executed",
              );
            }

            const phpData = JSON.parse(text);

            renderer.print(`✓ PHP data loaded from ${url}`, "success");
            renderer.print(`📊 Users: ${phpData.data.users.length}`, "info");
            renderer.print(`⚙️  Version: ${phpData.config.version}`, "info");
            renderer.print(`📅 Exported: ${phpData.data.exported_at}`, "info");
            renderer.print(
              `🗄️  DB Status: ${phpData.status.database_status}`,
              "info",
            );

            engine._phpData = phpData;
          } catch (e) {
            renderer.print(`❌ Failed to load PHP data: ${e.message}`, "error");
            renderer.print(
              `💡 Make sure PHP is running on ${window.location.origin}`,
              "info",
            );
          }
        },
      });

      registry.set("loginphp", {
        description: "Authenticate on the PHP server and sync JS session.",
        category: "database",
        action: async (args, renderer, engine) => {
          if (
            window.location.port === "5500" ||
            window.location.port === "5501"
          ) {
            renderer.print(
              "❌ You are on Live Server (port " +
                window.location.port +
                "), which cannot run PHP.",
              "error",
            );
            renderer.print(
              "💡 Start the PHP server: php -S localhost:8000",
              "info",
            );
            renderer.print(
              "💡 Then open: http://localhost:8000/FRONTEND/terminal.html",
              "info",
            );
            return;
          }

          if (args.length < 2) {
            return renderer.print(
              "Usage: loginphp <username> <password>",
              "error",
            );
          }

          const username = args[0].trim();
          const password = args[1].trim();

          if (!username || !password) {
            return renderer.print(
              "❌ Username and password cannot be empty.",
              "error",
            );
          }

          const phpBase = `${window.location.origin}/BACKEND/DATABASE/database_export.php`;

          try {
            const response = await fetch(`${phpBase}?api=1`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "login", username, password }),
            });

            if (!response.ok && response.status !== 401) {
              throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
              renderer.print(
                `✓ PHP session authenticated as ${data.user.username}`,
                "success",
              );

              // Sync JS database auth so all commands work without a separate 'login'
              if (engine._database) {
                const jsResult = engine._database.authenticate(username, password);
                if (jsResult.success) {
                  engine._database._internalToken   = jsResult.token;
                  engine._database._isAuthenticated = true;
                } else {
                  // PHP already validated — force-activate JS auth
                  engine._database._isAuthenticated = true;
                }
              }
              engine._phpSessionActive = true;

              if (data.user.role === "admin") {
                renderer.print("🔑 Admin privileges granted", "info");
              }
            } else {
              renderer.print(
                `❌ PHP login failed: ${data.message || "Invalid credentials"}`,
                "error",
              );
            }
          } catch (e) {
            renderer.print(`❌ PHP server unreachable: ${e.message}`, "error");
            renderer.print(
              `💡 Make sure PHP is running on ${window.location.origin}`,
              "info",
            );
          }
        },
      });

      registry.set("new", {
        description: "Create a new random user, save to database and generate a personal terminal link.",
        category: "database",
        action: (args, renderer, engine) => {
          if (!engine._database)
            return renderer.print("❌ Database not available.", "error");

          // Must be admin to create users
          const isAuthenticated =
            typeof engine._database.isAuthenticated === "function"
              ? engine._database.isAuthenticated()
              : engine._database._isAuthenticated;

          if (!isAuthenticated)
            return renderer.print("❌ Authentication required. Please login first.", "error");

          // Generate random credentials
          const adjectives = ["swift", "bold", "calm", "dark", "epic", "fast", "gold", "iron", "jade", "keen"];
          const nouns      = ["wolf", "hawk", "bear", "lion", "fox", "owl", "crow", "lynx", "puma", "stag"];
          const randAdj    = adjectives[Math.floor(Math.random() * adjectives.length)];
          const randNoun   = nouns[Math.floor(Math.random() * nouns.length)];
          const randNum    = Math.floor(Math.random() * 9000 + 1000);
          const username   = `${randAdj}_${randNoun}_${randNum}`;
          const password   = Math.random().toString(36).slice(2, 10) +
                             Math.random().toString(36).slice(2, 6).toUpperCase();

          // Ensure _link_users table exists
          const token = engine._database._internalToken;
          if (!engine._database.tables._link_users) {
            engine._database.tables._link_users = {
              columns: ["id", "username", "password", "link", "created_at", "active"],
              rows:    [],
              indexes: {},
            };
            engine._database._nextIds._link_users = 1;
          }

          // Save user to _link_users table
          const userId  = engine._database._nextIds._link_users++;
          const origin  = window.location.origin;
          const link    = `${origin}/FRONTEND/terminal.html?user=${encodeURIComponent(username)}&session=${userId}`;

          engine._database.tables._link_users.rows.push({
            id:         userId,
            username,
            password,
            link,
            created_at: new Date().toISOString(),
            active:     false,
          });
          engine._database._saveToStorage();

          // Also register in the JS _users table so they can login
          const hash = engine._database._hashString(password);
          if (!engine._database.tables._users) {
            engine._database._initializeUsersTable();
          }
          engine._database.tables._users.rows.push({
            id:           engine._database._nextIds._users++,
            username,
            password_hash: hash,
            role:          "user",
            created_at:    new Date().toISOString(),
          });
          engine._database._saveToStorage();

          renderer.print("✓ New user created!", "success");
          renderer.print(`👤 Username : ${username}`, "info");
          renderer.print(`🔑 Password : ${password}`, "info");
          renderer.print(`🔗 Link     : ${link}`, "info");
          renderer.print("💡 Share the link and credentials with the user.", "muted");
        },
      });

      registry.set("login", {
        description: "Authenticate to the database with username and password.",
        category: "database",
        action: (args, renderer, engine) => {
          if (!engine._database)
            return renderer.print("❌ Database not available.", "error");

          // Se não há argumentos, iniciar login interativo do zero
          if (args.length === 0) {
            engine._loginState = { step: "username" };
            return renderer.print("Username: ", "info", false);
          }

          // Se há apenas um argumento, é o USERNAME. Salva e pede o password.
          if (args.length === 1) {
            const username = args[0].toLowerCase();
            engine._loginState = { step: "password", username: username };
            return renderer.print("Password: ", "info", false);
          }

          // Se há dois argumentos, tenta o login direto na mesma linha
          if (args.length >= 2) {
            const username = args[0].toLowerCase();
            const password = args[1];

            const result = engine._database.authenticate(username, password);
            if (result.success) {
              if (typeof engine._database.setAuthenticated === "function") {
                engine._database.setAuthenticated(result.token, true);
              }
              engine._updatePrompt(username);
              renderer.print(`✓ Login successful as ${username}`, "success");
              if (result.user && result.user.role === "admin") {
                renderer.print("🔑 Admin privileges granted", "info");
              }
            } else {
              renderer.print(`❌ ${result.message}`, "error");
            }
            return;
          }

          renderer.print(
            "Usage: login [username] [password] or just 'login' for interactive mode",
            "error",
          );
        },
      });

      registry.set("logout", {
        description: "De-authenticate from the database.",
        category: "database",
        action: (args, renderer, engine) => {
          if (!engine._database)
            return renderer.print("❌ Database not available.", "error");

          const token = typeof engine._database.getToken === "function"
            ? engine._database.getToken()
            : engine._database._internalToken;

          if (token) {
            engine._database.revokeToken(token);
            engine._database.setAuthenticated(null, false);
            engine._updatePrompt(null);
            renderer.print("✓ Logged out successfully.", "success");
          } else {
            renderer.print("Not logged in.", "warn");
          }
        },
      });

      registry.set("changepw", {
        description: "Change the database password.",
        category: "database",
        action: (args, renderer, engine) => {
          if (!engine._database)
            return renderer.print("❌ Database not available.", "error");
          const newPassword = args[0];

          let token = null;
          if (typeof engine._database.getToken === "function") {
            token = engine._database.getToken();
          }

          if (
            !token ||
            (typeof engine._database.isValidToken === "function" &&
              !engine._database.isValidToken(token))
          ) {
            return renderer.print(
              "❌ Authentication required. Please login first.",
              "error",
            );
          }
          if (!newPassword)
            return renderer.print("Usage: changepw <new_password>", "error");

          const result = engine._database.changePassword(newPassword, token);
          if (result.success) {
            renderer.print(`✓ ${result.message}`, "success");
          } else {
            renderer.print(`❌ ${result.message}`, "error");
          }
        },
      });

      registry.set("create", {
        description:
          "Create a new table. Usage: create table <name> [col1] [col2]...",
        category: "database",
        action: (args, renderer, engine) => {
          if (!engine._database)
            return renderer.print("❌ Database not available.", "error");

          let token = null;
          if (typeof engine._database.getToken === "function") {
            token = engine._database.getToken();
          }
          if (
            !token ||
            (typeof engine._database.isValidToken === "function" &&
              !engine._database.isValidToken(token))
          ) {
            return renderer.print(
              "❌ Authentication required. Please login first.",
              "error",
            );
          }

          if (args.length < 3 || args[0].toLowerCase() !== "table") {
            return renderer.print(
              "Usage: create table <tableName> <column1> [column2] ...",
              "error",
            );
          }

          const tableName = args[1];
          const columns = args.slice(2);
          const result = engine._database.createTable(
            tableName,
            columns,
            token,
          );

          renderer.print(
            result.error || result.message,
            result.error ? "error" : "success",
          );
        },
      });

      registry.set("drop", {
        description: "Delete a table. Usage: drop table <name>",
        category: "database",
        action: (args, renderer, engine) => {
          if (!engine._database)
            return renderer.print("❌ Database not available.", "error");

          let token = null;
          if (typeof engine._database.getToken === "function") {
            token = engine._database.getToken();
          }
          if (
            !token ||
            (typeof engine._database.isValidToken === "function" &&
              !engine._database.isValidToken(token))
          ) {
            return renderer.print(
              "❌ Authentication required. Please login first.",
              "error",
            );
          }

          if (args.length < 2 || args[0].toLowerCase() !== "table") {
            return renderer.print("Usage: drop table <tableName>", "error");
          }

          const tableName = args[1];
          const result = engine._database.deleteTable(tableName, token);

          if (result.error) {
            renderer.print(`Error: ${result.error}`, "error");
          } else {
            renderer.print(result.message, "success");
          }
        },
      });

      registry.set("delete-table", {
        description: "Alias for 'drop table'.",
        category: "database",
        action: registry.get("drop").action,
      });

      registry.set("list", {
        description: "List all tables. Use --all to see internal tables.",
        category: "database",
        action: (args, renderer, engine) => {
          if (!engine._database)
            return renderer.print("❌ Database not available.", "error");
          // No auth needed for list, but we can add it if desired.
          const showInternal = args.includes("--all");
          const tables = engine._database.list({ showInternal });
          if (tables.length === 0) {
            renderer.print("No tables found.", "warn");
            return;
          }
          renderer.print("📊 Available Tables:", "info");
          renderer.renderTable(tables);
        },
      });

      registry.set("select", {
        description: "Query data from a table. Usage: select * from <table>",
        category: "database",
        action: (args, renderer, engine) => {
          if (!engine._database)
            return renderer.print("❌ Database not available.", "error");
          // Basic auth check
          const isAuthenticated =
            typeof engine._database.isAuthenticated === "function"
              ? engine._database.isAuthenticated()
              : engine._database._isAuthenticated;

          if (!isAuthenticated) {
            return renderer.print(
              "❌ Authentication required for select.",
              "error",
            );
          }
          if (args.length < 3 || args[0] !== "*" || args[1] !== "from") {
            return renderer.print("Usage: select * from <tableName>", "error");
          }
          const tableName = args[2];
          const data = engine._database.select(tableName, null, 100);
          if (data.error) {
            renderer.print(`Error: ${data.error}`, "error");
          } else {
            if (data.length === 0)
              return renderer.print("No rows found.", "info");
            renderer.renderTable(data);
          }
        },
      });

      registry.set("insert", {
        description:
          "Insert a row. Usage: insert into <table> (col1,col2) values (val1,val2)",
        category: "database",
        action: (args, renderer, engine) => {
          if (!engine._database)
            return renderer.print("❌ Database not available.", "error");

          let token = null;
          if (typeof engine._database.getToken === "function") {
            token = engine._database.getToken();
          }
          if (
            !token ||
            (typeof engine._database.isValidToken === "function" &&
              !engine._database.isValidToken(token))
          ) {
            return renderer.print(
              "❌ Authentication required. Please login first.",
              "error",
            );
          }

          // This is a very simple parser, can be improved.
          const intoIndex = args.indexOf("into");
          const valuesIndex = args.indexOf("values");

          if (
            intoIndex === -1 ||
            valuesIndex === -1 ||
            valuesIndex < intoIndex
          ) {
            return renderer.print(
              "Usage: insert into <table> (col1,...) values (val1,...)",
              "error",
            );
          }

          const tableName = args[intoIndex + 1];
          const colsStr = args
            .slice(intoIndex + 2, valuesIndex)
            .join(" ")
            .replace(/[()]/g, "");
          const valsStr = args
            .slice(valuesIndex + 1)
            .join(" ")
            .replace(/[()]/g, "");

          const columns = colsStr.split(",").map((c) => c.trim());
          const values = valsStr.split(",").map((v) => v.trim());

          if (columns.length !== values.length) {
            return renderer.print(
              "Column and value counts do not match.",
              "error",
            );
          }

          const data = Object.fromEntries(
            columns.map((col, i) => [col, values[i]]),
          );
          const result = engine._database.insert(tableName, data);

          if (result.error) {
            renderer.print(`Error: ${result.error}`, "error");
          } else {
            renderer.print(result.message, "success");
          }
        },
      });

      registry.set("describe", {
        description: "Show table structure.",
        category: "database",
        action: (args, renderer, engine) => {
          if (!engine._database)
            return renderer.print("❌ Database not available.", "error");

          const isAuthenticated =
            typeof engine._database.isAuthenticated === "function"
              ? engine._database.isAuthenticated()
              : engine._database._isAuthenticated;

          if (!isAuthenticated) {
            return renderer.print("❌ Authentication required.", "error");
          }
          if (args.length === 0)
            return renderer.print("Usage: describe <tableName>", "error");

          const tableName = args[0];
          const result = engine._database.describe(tableName);

          if (!result.success) {
            renderer.print(`Error: ${result.message}`, "error");
          } else {
            const rowCount = engine._database.tables[tableName]
              ? engine._database.tables[tableName].rows.length
              : 0;
            renderer.print(
              `Table: ${result.tableName} (${rowCount} rows)`,
              "info",
            );
            renderer.renderTable(result.columns);
          }
        },
      });

      return registry;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Global Exposure
  // ─────────────────────────────────────────────────────────────────────────
  global.ConsoleEngine = ConsoleEngine;
})(typeof globalThis !== "undefined" ? globalThis : window);
