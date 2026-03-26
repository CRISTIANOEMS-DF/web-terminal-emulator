/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║                       console.commands.js v1.0.0                          ║
 * ║                   Command Parser & Execution Engine                        ║
 * ║                                                                            ║
 * ║  Manages: Command parsing, tokenization, validation, execution            ║
 * ║  Integrated with: ConsoleRegistry, ConsoleBuiltins, WebConsole            ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 *
 * FEATURES:
 *  ✓ Advanced command parsing and tokenization
 *  ✓ Argument and option parsing
 *  ✓ Command execution with error handling
 *  ✓ History tracking
 *  ✓ Undo/redo support for reversible commands
 *  ✓ Output capture and formatting
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
          `%c[ConsoleCommands] ${message}`,
          "color: #0066ff; font-weight: bold;",
          data || "",
        );
      }
    }

    info(message, data) {
      console.log(
        `%c[ConsoleCommands] ℹ ${message}`,
        "color: #00ff00; font-weight: bold;",
        data || "",
      );
    }

    warn(message, data) {
      console.warn(
        `%c[ConsoleCommands] ⚠ ${message}`,
        "color: #ffaa00; font-weight: bold;",
        data || "",
      );
    }

    error(message, data) {
      console.error(
        `%c[ConsoleCommands] ✗ ${message}`,
        "color: #ff0000; font-weight: bold;",
        data || "",
      );
    }

    success(message, data) {
      console.log(
        `%c[ConsoleCommands] ✓ ${message}`,
        "color: #00ff00; font-weight: bold;",
        data || "",
      );
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     Command Parser & Tokenizer
     ───────────────────────────────────────────────────────────────────── */

  class _CommandParser {
    static parse(input) {
      const tokens = this._tokenize(input);
      if (tokens.length === 0) return null;

      const commandName = tokens[0];
      const args = tokens.slice(1);

      return {
        commandName,
        args,
        options: this._parseOptions(args),
        tokens,
      };
    }

    static _tokenize(input) {
      const tokens = [];
      let current = "";
      let inQuotes = false;
      let quoteChar = "";

      for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if ((char === '"' || char === "'") && !inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar && inQuotes) {
          inQuotes = false;
          quoteChar = "";
        } else if (char === " " && !inQuotes) {
          if (current.length > 0) {
            tokens.push(current);
            current = "";
          }
        } else {
          current += char;
        }
      }

      if (current.length > 0) {
        tokens.push(current);
      }

      return tokens;
    }

    static _parseOptions(args) {
      const options = {};
      let i = 0;

      while (i < args.length) {
        const arg = args[i];

        if (arg.startsWith("--")) {
          const key = arg.substring(2);
          const eqIndex = key.indexOf("=");

          if (eqIndex > -1) {
            options[key.substring(0, eqIndex)] = key.substring(eqIndex + 1);
          } else {
            options[key] = true;
            if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
              options[key] = args[i + 1];
              i++;
            }
          }
        } else if (arg.startsWith("-")) {
          const key = arg.substring(1);
          options[key] = true;
          if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
            options[key] = args[i + 1];
            i++;
          }
        }

        i++;
      }

      return options;
    }

    static isValid(input) {
      return input && typeof input === "string" && input.trim().length > 0;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Main ConsoleCommands Class
     ═══════════════════════════════════════════════════════════════════════ */

  class ConsoleCommands {
    constructor(config = {}) {
      this.config = {
        debug: config.debug ?? false,
        maxHistory: config.maxHistory ?? 100,
        maxUndo: config.maxUndo ?? 50,
        ...config,
      };

      this._registry = null;
      this._renderer = null;
      this._database = null;
      this._table = null;
      this._keyboard = null;

      this._history = [];
      this._historyIndex = -1;
      this._undoStack = [];
      this._redoStack = [];
      this._logger = new _Logger(this.config.debug);
      this._execution = {
        current: null,
        running: false,
      };
      this._initialized = false;

      this._initialize();
    }

    /* ─────────────────────────────────────────────────────────────────────
       Initialization & Setup
       ───────────────────────────────────────────────────────────────────── */

    _initialize() {
      this._initialized = true;
      this._logger.info("v1.0.0 instantiated");
    }

    /**
     * Connect to ConsoleRegistry
     * @param {Object} registry - ConsoleRegistry instance
     */
    connectRegistry(registry) {
      if (!registry || typeof registry.getCommand !== "function") {
        this._logger.error("Invalid registry provided");
        return false;
      }

      this._registry = registry;
      this._logger.log("Connected to ConsoleRegistry");
      return true;
    }

    /**
     * Connect to ConsoleRenderer
     * @param {Object} renderer - ConsoleRenderer instance
     */
    connectRenderer(renderer) {
      if (!renderer || typeof renderer.print !== "function") {
        this._logger.error("Invalid renderer provided");
        return false;
      }

      this._renderer = renderer;
      this._logger.log("Connected to ConsoleRenderer");
      return true;
    }

    /**
     * Connect to ConsoleDatabase
     * @param {Object} database - ConsoleDatabase instance
     */
    connectDatabase(database) {
      if (!database || typeof database.query !== "function") {
        this._logger.error("Invalid database provided");
        return false;
      }

      this._database = database;
      this._logger.log("Connected to ConsoleDatabase");
      return true;
    }

    /**
     * Connect to ConsoleTable
     * @param {Object} table - ConsoleTable instance
     */
    connectTable(table) {
      if (!table || typeof table.render !== "function") {
        this._logger.error("Invalid table provided");
        return false;
      }

      this._table = table;
      this._logger.log("Connected to ConsoleTable");
      return true;
    }

    /**
     * Connect to ConsoleKeyboard
     * @param {Object} keyboard - ConsoleKeyboard instance
     */
    connectKeyboard(keyboard) {
      if (!keyboard || typeof keyboard.attachListener !== "function") {
        this._logger.error("Invalid keyboard provided");
        return false;
      }

      this._keyboard = keyboard;
      this._logger.log("Connected to ConsoleKeyboard");
      return true;
    }

    /* ─────────────────────────────────────────────────────────────────────
       Command Execution
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Execute a command from user input
     * @param {string} input - Command input string
     * @returns {Promise} Execution result
     */
    async execute(input) {
      if (!_CommandParser.isValid(input)) {
        return {
          success: false,
          error: "Invalid command input",
          output: "",
        };
      }

      // Add to history
      this._addToHistory(input);

      // Parse command
      const parsed = _CommandParser.parse(input);
      if (!parsed) {
        return {
          success: false,
          error: "Failed to parse command",
          output: "",
        };
      }

      // Get command from registry
      if (!this._registry) {
        return {
          success: false,
          error: "Registry not connected",
          output: "",
        };
      }

      const command = this._registry.getCommand(parsed.commandName);
      if (!command) {
        return {
          success: false,
          error: `Command not found: ${parsed.commandName}`,
          output: "",
        };
      }

      // Validate command
      if (!command.validate(parsed.args, parsed.options)) {
        return {
          success: false,
          error: `Invalid arguments for ${parsed.commandName}`,
          output: `Usage: ${command.usage}`,
        };
      }

      // Execute command
      try {
        this._execution.current = {
          command: parsed.commandName,
          input,
          startTime: Date.now(),
        };
        this._execution.running = true;

        const result = await command.execute({
          args: parsed.args,
          options: parsed.options,
          input,
          commands: this,
          renderer: this._renderer,
          database: this._database,
          table: this._table,
          registry: this._registry,
        });

        const endTime = Date.now();
        const duration = endTime - this._execution.current.startTime;

        this._logger.log(`Executed: ${parsed.commandName}`, `${duration}ms`);

        return {
          success: true,
          command: parsed.commandName,
          result,
          duration,
          output: result?.output || "",
        };
      } catch (error) {
        this._logger.error(
          `Execution failed: ${parsed.commandName}`,
          error.message,
        );

        return {
          success: false,
          error: error.message,
          command: parsed.commandName,
          output: `Error: ${error.message}`,
        };
      } finally {
        this._execution.running = false;
        this._execution.current = null;
      }
    }

    /* ─────────────────────────────────────────────────────────────────────
       History Management
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Add command to history
     * @param {string} command - Command string
     */
    _addToHistory(command) {
      // Remove redo stack if new command is executed
      if (this._historyIndex + 1 < this._history.length) {
        this._history = this._history.slice(0, this._historyIndex + 1);
      }

      this._history.push(command);
      this._historyIndex = this._history.length - 1;

      // Limit history size
      if (this._history.length > this.config.maxHistory) {
        this._history.shift();
        this._historyIndex--;
      }

      this._logger.log("Added to history", command);
    }

    /**
     * Get previous command from history
     * @returns {string|null} Previous command
     */
    getPreviousCommand() {
      if (this._historyIndex > 0) {
        this._historyIndex--;
      }
      return this._history[this._historyIndex] || null;
    }

    /**
     * Get next command from history
     * @returns {string|null} Next command
     */
    getNextCommand() {
      if (this._historyIndex < this._history.length - 1) {
        this._historyIndex++;
      }
      return this._history[this._historyIndex] || null;
    }

    /**
     * Get complete history
     * @returns {Array} Command history
     */
    getHistory() {
      return [...this._history];
    }

    /**
     * Clear history
     */
    clearHistory() {
      this._history = [];
      this._historyIndex = -1;
      this._logger.success("History cleared");
    }

    /* ─────────────────────────────────────────────────────────────────────
       Undo/Redo Support
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Push undo action
     * @param {Object} action - Undo action
     */
    pushUndo(action) {
      if (this._undoStack.length >= this.config.maxUndo) {
        this._undoStack.shift();
      }

      this._undoStack.push(action);
      this._redoStack = []; // Clear redo when new action occurs
      this._logger.log("Undo action pushed");
    }

    /**
     * Perform undo
     * @returns {boolean} Undo success
     */
    undo() {
      if (this._undoStack.length === 0) {
        this._logger.warn("Nothing to undo");
        return false;
      }

      const action = this._undoStack.pop();
      this._redoStack.push(action);

      if (typeof action.undo === "function") {
        try {
          action.undo();
          this._logger.success("Undo executed");
          return true;
        } catch (e) {
          this._logger.error("Undo failed", e.message);
          return false;
        }
      }

      return true;
    }

    /**
     * Perform redo
     * @returns {boolean} Redo success
     */
    redo() {
      if (this._redoStack.length === 0) {
        this._logger.warn("Nothing to redo");
        return false;
      }

      const action = this._redoStack.pop();
      this._undoStack.push(action);

      if (typeof action.redo === "function") {
        try {
          action.redo();
          this._logger.success("Redo executed");
          return true;
        } catch (e) {
          this._logger.error("Redo failed", e.message);
          return false;
        }
      }

      return true;
    }

    /* ─────────────────────────────────────────────────────────────────────
       Execution Status
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Check if a command is currently running
     * @returns {boolean} Execution status
     */
    isRunning() {
      return this._execution.running;
    }

    /**
     * Stop current execution
     * @returns {boolean} Stop success
     */
    stopExecution() {
      if (this._execution.running && this._execution.current) {
        this._logger.warn(`Stopped: ${this._execution.current.command}`);
        this._execution.running = false;
        return true;
      }
      return false;
    }

    /**
     * Get current execution info
     * @returns {Object|null} Execution info
     */
    getExecutionInfo() {
      return this._execution.current ? { ...this._execution.current } : null;
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
        moduleName: "ConsoleCommands",
        version: "1.0.0",
        initialized: this._initialized,
        running: this._execution.running,
        historyCount: this._history.length,
        undoAvailable: this._undoStack.length > 0,
        redoAvailable: this._redoStack.length > 0,
        hasSupportedModules: {
          consoleRegistry: this._registry !== null,
          consoleRenderer: this._renderer !== null,
          consoleDatabase: this._database !== null,
          consoleTable: this._table !== null,
          consoleKeyboard: this._keyboard !== null,
          consoleBuiltins: typeof window.ConsoleBuiltins !== "undefined",
          consoleTheme: typeof window.ConsoleTheme !== "undefined",
          consoleSettings: typeof window.ConsoleSettings !== "undefined",
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
      info.history = this.getHistory().slice(-10);
      info.currentExecution = this.getExecutionInfo();
      return info;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Global Export
     ═══════════════════════════════════════════════════════════════════════ */

  window.ConsoleCommands = new ConsoleCommands({
    debug: false,
  });

  // Log that module is loaded
  console.log(
    "%c[ConsoleCommands] %cv1.0.0 loaded and initialized",
    "color: #0066ff; font-weight: bold;",
    "color: #00ff00;",
  );
})();
