/**
 * @file        console.parser.js
 * @description ConsoleParser — Advanced Command Parser & Lexical Analyzer
 *
 * Comprehensive command-line parsing and analysis engine:
 * - Lexical analysis (tokenization)
 * - Syntactic analysis (AST generation)
 * - Command validation and verification
 * - Pipe and redirection handling
 * - Variable expansion and substitution
 * - Escape sequence processing
 * - Comment handling
 * - Error recovery and diagnostics
 * - Plugin/hook system
 * - Integration with ConsoleSettings (CONFIG)
 * - Real-time sync with API (Bridge & WebSocket)
 *
 * Integrates with:
 * - console.engine.js (CORE - receives parsed tokens)
 * - console.settings.js (CONFIG - syntax rules, plugins)
 * - console.bridge.js (API - HTTP parsing endpoints)
 * - console.websocket.js (API - real-time parse results)
 * - console.history.js (CORE - command history)
 *
 * @version 3.0.0
 * @license MIT
 */

(function (global) {
  "use strict";

  if (typeof global.ConsoleParser !== "undefined") {
    console.warn(
      "[ConsoleParser] Already registered — skipping re-definition.",
    );
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
        console.log(`%c[ConsoleParser] ${message}`, "color: #00ff00", data);
    }

    info(message, data) {
      this._store("INFO", message, data);
      console.log(
        `%c[ConsoleParser] ℹ ${message}`,
        "color: #00aaff",
        data || "",
      );
    }

    warn(message, data) {
      this._store("WARN", message, data);
      console.warn(
        `%c[ConsoleParser] ⚠ ${message}`,
        "color: #ffaa00",
        data || "",
      );
    }

    error(message, data) {
      this._store("ERROR", message, data);
      console.error(`%c[ConsoleParser] ✗ ${message}`, "color: #ff0000", data);
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
  // Token Classes
  // ═══════════════════════════════════════════════════════════════════════════

  class _Token {
    constructor(type, value, position = 0, line = 1, column = 0) {
      this.type = type;
      this.value = value;
      this.position = position;
      this.line = line;
      this.column = column;
      this.raw = value;
    }

    toString() {
      return `Token(${this.type}, "${this.value}")`;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Lexer - Tokenization
  // ═══════════════════════════════════════════════════════════════════════════

  class _Lexer {
    constructor(input = "") {
      this.input = input;
      this.position = 0;
      this.line = 1;
      this.column = 0;
      this.tokens = [];
    }

    _peek(offset = 0) {
      const pos = this.position + offset;
      return pos < this.input.length ? this.input[pos] : null;
    }

    _advance() {
      const char = this.input[this.position];
      this.position++;
      if (char === "\n") {
        this.line++;
        this.column = 0;
      } else {
        this.column++;
      }
      return char;
    }

    _skipWhitespace() {
      while (this.position < this.input.length) {
        const char = this._peek();
        if (char === " " || char === "\t" || char === "\r" || char === "\n") {
          this._advance();
        } else {
          break;
        }
      }
    }

    _readString(quote) {
      let value = "";
      this._advance(); // Skip opening quote
      while (this.position < this.input.length) {
        const char = this._peek();
        if (char === quote) {
          this._advance(); // Skip closing quote
          break;
        } else if (char === "\\") {
          this._advance();
          const escaped = this._advance();
          // Handle escape sequences
          switch (escaped) {
            case "n":
              value += "\n";
              break;
            case "t":
              value += "\t";
              break;
            case "r":
              value += "\r";
              break;
            case "\\":
              value += "\\";
              break;
            case quote:
              value += quote;
              break;
            default:
              value += escaped;
          }
        } else {
          value += this._advance();
        }
      }
      return value;
    }

    _readWord() {
      let value = "";
      while (this.position < this.input.length) {
        const char = this._peek();
        if (/[a-zA-Z0-9_\-./]/.test(char)) {
          value += this._advance();
        } else if (char === "$") {
          // Variable reference
          value += this._advance();
          while (this.position < this.input.length) {
            const nextChar = this._peek();
            if (/[a-zA-Z0-9_]/.test(nextChar)) {
              value += this._advance();
            } else {
              break;
            }
          }
        } else {
          break;
        }
      }
      return value;
    }

    _readNumber() {
      let value = "";
      while (this.position < this.input.length) {
        const char = this._peek();
        if (/[0-9.]/.test(char)) {
          value += this._advance();
        } else {
          break;
        }
      }
      return value;
    }

    tokenize() {
      this.tokens = [];

      while (this.position < this.input.length) {
        this._skipWhitespace();

        if (this.position >= this.input.length) break;

        const char = this._peek();
        const startPos = this.position;
        const startLine = this.line;
        const startCol = this.column;

        // Comments
        if (char === "#") {
          while (this._peek() && this._peek() !== "\n") {
            this._advance();
          }
          continue;
        }

        // Strings
        if (char === '"' || char === "'") {
          const value = this._readString(char);
          this.tokens.push(
            new _Token("STRING", value, startPos, startLine, startCol),
          );
          continue;
        }

        // Pipes
        if (char === "|") {
          this._advance();
          if (this._peek() === "|") {
            this._advance();
            this.tokens.push(
              new _Token("OR", "||", startPos, startLine, startCol),
            );
          } else {
            this.tokens.push(
              new _Token("PIPE", "|", startPos, startLine, startCol),
            );
          }
          continue;
        }

        // Redirections
        if (char === ">") {
          this._advance();
          if (this._peek() === ">") {
            this._advance();
            this.tokens.push(
              new _Token("APPEND", ">>", startPos, startLine, startCol),
            );
          } else {
            this.tokens.push(
              new _Token("REDIRECT", ">", startPos, startLine, startCol),
            );
          }
          continue;
        }

        if (char === "<") {
          this._advance();
          this.tokens.push(
            new _Token("INPUT", "<", startPos, startLine, startCol),
          );
          continue;
        }

        // Ampersand (background process)
        if (char === "&") {
          this._advance();
          if (this._peek() === "&") {
            this._advance();
            this.tokens.push(
              new _Token("AND", "&&", startPos, startLine, startCol),
            );
          } else {
            this.tokens.push(
              new _Token("BACKGROUND", "&", startPos, startLine, startCol),
            );
          }
          continue;
        }

        // Semicolon (command separator)
        if (char === ";") {
          this._advance();
          this.tokens.push(
            new _Token("SEMICOLON", ";", startPos, startLine, startCol),
          );
          continue;
        }

        // Parentheses (grouping)
        if (char === "(" || char === ")") {
          const value = this._advance();
          const type = value === "(" ? "LPAREN" : "RPAREN";
          this.tokens.push(
            new _Token(type, value, startPos, startLine, startCol),
          );
          continue;
        }

        // Dollar sign (variables)
        if (char === "$") {
          const value = this._readWord();
          this.tokens.push(
            new _Token("VARIABLE", value, startPos, startLine, startCol),
          );
          continue;
        }

        // Numbers
        if (/[0-9]/.test(char)) {
          const value = this._readNumber();
          this.tokens.push(
            new _Token("NUMBER", value, startPos, startLine, startCol),
          );
          continue;
        }

        // Words and identifiers
        if (/[a-zA-Z_]/.test(char)) {
          const value = this._readWord();
          this.tokens.push(
            new _Token("WORD", value, startPos, startLine, startCol),
          );
          continue;
        }

        // Unknown character
        this._advance();
      }

      // End of input
      this.tokens.push(
        new _Token("EOF", "", this.position, this.line, this.column),
      );

      return this.tokens;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AST Nodes
  // ═══════════════════════════════════════════════════════════════════════════

  class ASTNode {
    constructor(type) {
      this.type = type;
      this.position = 0;
    }
  }

  class CommandNode extends ASTNode {
    constructor() {
      super("COMMAND");
      this.name = null;
      this.args = [];
      this.flags = {};
      this.options = {};
    }
  }

  class PipelineNode extends ASTNode {
    constructor() {
      super("PIPELINE");
      this.commands = [];
    }
  }

  class RedirectionNode extends ASTNode {
    constructor() {
      super("REDIRECTION");
      this.command = null;
      this.type = null; // ">" | ">>" | "<"
      this.target = null;
    }
  }

  class ConditionalNode extends ASTNode {
    constructor() {
      super("CONDITIONAL");
      this.type = null; // "&&" | "||"
      this.left = null;
      this.right = null;
    }
  }

  class VariableNode extends ASTNode {
    constructor() {
      super("VARIABLE");
      this.name = null;
    }
  }

  class StringNode extends ASTNode {
    constructor() {
      super("STRING");
      this.value = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Parser - Syntax Analysis
  // ═══════════════════════════════════════════════════════════════════════════

  class _Parser {
    constructor(tokens = []) {
      this.tokens = tokens;
      this.position = 0;
      this.errors = [];
    }

    _peek(offset = 0) {
      const pos = this.position + offset;
      return pos < this.tokens.length
        ? this.tokens[pos]
        : this.tokens[this.tokens.length - 1];
    }

    _advance() {
      return this.tokens[this.position++];
    }

    _expect(type) {
      const token = this._peek();
      if (token.type !== type && token.type !== "EOF") {
        this.errors.push(
          `Expected ${type} but got ${token.type} at line ${token.line}`,
        );
      }
      return this._advance();
    }

    parse() {
      try {
        const ast = this._parseStatement();
        return {
          ast,
          errors: this.errors,
          success: this.errors.length === 0,
        };
      } catch (error) {
        this.errors.push(error.message);
        return {
          ast: null,
          errors: this.errors,
          success: false,
        };
      }
    }

    _parseStatement() {
      // Parse pipeline or conditional
      return this._parseConditional();
    }

    _parseConditional() {
      let left = this._parsePipeline();

      while (this._peek().type === "AND" || this._peek().type === "OR") {
        const op = this._advance();
        const right = this._parsePipeline();

        const conditional = new ConditionalNode();
        conditional.type = op.value;
        conditional.left = left;
        conditional.right = right;
        left = conditional;
      }

      return left;
    }

    _parsePipeline() {
      const commands = [this._parseCommand()];

      while (this._peek().type === "PIPE") {
        this._advance(); // consume pipe
        commands.push(this._parseCommand());
      }

      if (commands.length === 1) {
        return this._parseRedirection(commands[0]);
      }

      const pipeline = new PipelineNode();
      pipeline.commands = commands;
      return pipeline;
    }

    _parseCommand() {
      const command = new CommandNode();

      // Get command name
      const nameToken = this._peek();
      if (nameToken.type === "WORD" || nameToken.type === "STRING") {
        const name = this._advance();
        command.name = name.value;
        command.position = name.position;

        // Parse arguments
        while (
          this._peek().type !== "EOF" &&
          this._peek().type !== "PIPE" &&
          this._peek().type !== "REDIRECT" &&
          this._peek().type !== "APPEND" &&
          this._peek().type !== "INPUT" &&
          this._peek().type !== "AND" &&
          this._peek().type !== "OR" &&
          this._peek().type !== "SEMICOLON" &&
          this._peek().type !== "BACKGROUND"
        ) {
          const arg = this._parseArgument();
          if (arg.type === "flag") {
            command.flags[arg.value] = true;
            if (
              this._peek().type === "WORD" ||
              this._peek().type === "STRING"
            ) {
              const nextToken = this._peek();
              if (!nextToken.value.startsWith("-")) {
                command.flags[arg.value] = this._advance().value;
              }
            }
          } else if (arg.type === "option") {
            const value = this._advance();
            command.options[arg.value] = value.value;
          } else {
            command.args.push(arg);
          }
        }
      }

      return command;
    }

    _parseArgument() {
      const token = this._peek();

      if (token.type === "WORD" && token.value.startsWith("--")) {
        this._advance();
        const key = token.value.substring(2);
        return { type: "option", value: key };
      } else if (token.type === "WORD" && token.value.startsWith("-")) {
        this._advance();
        const flags = token.value.substring(1);
        return { type: "flag", value: flags };
      } else if (token.type === "STRING") {
        const str = this._advance();
        return { type: "string", value: str.value };
      } else if (token.type === "VARIABLE") {
        const variable = this._advance();
        return { type: "variable", value: variable.value };
      } else if (token.type === "NUMBER") {
        const num = this._advance();
        return { type: "number", value: num.value };
      } else if (token.type === "WORD") {
        const word = this._advance();
        return { type: "word", value: word.value };
      }

      this._advance();
      return { type: "unknown", value: token.value };
    }

    _parseRedirection(command) {
      const redirects = [];

      while (
        this._peek().type === "REDIRECT" ||
        this._peek().type === "APPEND" ||
        this._peek().type === "INPUT"
      ) {
        const op = this._advance();
        const target = this._advance();

        const redirect = new RedirectionNode();
        redirect.command = command;
        redirect.type = op.value;
        redirect.target = target.value;
        redirects.push(redirect);
      }

      if (redirects.length === 0) {
        return command;
      }

      if (redirects.length === 1) {
        return redirects[0];
      }

      // Multiple redirections
      let result = redirects[0];
      for (let i = 1; i < redirects.length; i++) {
        result.command = redirects[i];
      }
      return result;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Validator
  // ═══════════════════════════════════════════════════════════════════════════

  class _Validator {
    static validateCommand(commandName, registeredCommands = []) {
      if (!commandName || typeof commandName !== "string") {
        return {
          valid: false,
          error: "Command name must be a non-empty string",
        };
      }

      if (registeredCommands.length > 0) {
        if (!registeredCommands.includes(commandName)) {
          return {
            valid: false,
            error: `Unknown command: ${commandName}`,
            suggestions: this._findSuggestions(commandName, registeredCommands),
          };
        }
      }

      return { valid: true };
    }

    static validateArguments(args) {
      if (!Array.isArray(args)) {
        return {
          valid: false,
          error: "Arguments must be an array",
        };
      }

      return { valid: true };
    }

    static validatePipeline(commands) {
      if (!Array.isArray(commands) || commands.length < 2) {
        return {
          valid: false,
          error: "Pipeline must have at least 2 commands",
        };
      }

      // First command should be able to produce output
      // Last command should be able to receive input
      return { valid: true };
    }

    static validateRedirection(type, target) {
      // Validate redirection target
      if (!target || typeof target !== "string") {
        return {
          valid: false,
          error: "Redirection target must be a non-empty string",
        };
      }

      if (!["<", ">", ">>"].includes(type)) {
        return {
          valid: false,
          error: `Invalid redirection type: ${type}`,
        };
      }

      return { valid: true };
    }

    static _findSuggestions(input, options, maxSuggestions = 3) {
      const suggestions = options
        .filter(
          (opt) =>
            opt.startsWith(input.substring(0, 2)) ||
            this._levenshteinDistance(input, opt) <= 2,
        )
        .slice(0, maxSuggestions);

      return suggestions;
    }

    static _levenshteinDistance(a, b) {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1,
            );
          }
        }
      }
      return matrix[b.length][a.length];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Variable Expander
  // ═══════════════════════════════════════════════════════════════════════════

  class _VariableExpander {
    constructor(variables = {}, environment = {}) {
      this.variables = variables;
      this.environment = environment;
    }

    expand(value) {
      if (typeof value !== "string") return value;

      let result = value;

      // Replace environment variables $VAR
      result = result.replace(/\$([a-zA-Z_]\w*)/g, (match, varName) => {
        return this.getVariable(varName) || match;
      });

      // Replace special variables
      result = result.replace(/\$\?/g, "$?"); // Exit code - handled by runtime
      result = result.replace(/\$\$/g, "$$"); // Process ID - handled by runtime

      return result;
    }

    getVariable(name) {
      // Check user-defined variables
      if (this.variables.hasOwnProperty(name)) {
        return this.variables[name];
      }

      // Check environment variables
      if (this.environment.hasOwnProperty(name)) {
        return this.environment[name];
      }

      return null;
    }

    setVariable(name, value) {
      this.variables[name] = value;
    }

    expandCommand(command) {
      command.args = command.args.map((arg) => {
        if (typeof arg.value === "string") {
          arg.value = this.expand(arg.value);
        }
        return arg;
      });

      Object.keys(command.flags).forEach((flag) => {
        if (typeof command.flags[flag] === "string") {
          command.flags[flag] = this.expand(command.flags[flag]);
        }
      });

      Object.keys(command.options).forEach((option) => {
        if (typeof command.options[option] === "string") {
          command.options[option] = this.expand(command.options[option]);
        }
      });

      return command;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Hook System
  // ═══════════════════════════════════════════════════════════════════════════

  class _HookSystem {
    constructor() {
      this.hooks = new Map();
    }

    register(name, callback, priority = 10) {
      if (!this.hooks.has(name)) {
        this.hooks.set(name, []);
      }

      this.hooks.get(name).push({
        callback,
        priority,
      });

      // Sort by priority (higher first)
      this.hooks.get(name).sort((a, b) => b.priority - a.priority);
    }

    unregister(name, callback) {
      if (!this.hooks.has(name)) return;

      const hooks = this.hooks.get(name);
      const index = hooks.findIndex((h) => h.callback === callback);
      if (index !== -1) {
        hooks.splice(index, 1);
      }
    }

    execute(name, data) {
      if (!this.hooks.has(name)) return data;

      const hooks = this.hooks.get(name);
      let result = data;

      for (const hook of hooks) {
        try {
          result = hook.callback(result);
        } catch (error) {
          console.error(`[ConsoleParser] Hook error in ${name}:`, error);
        }
      }

      return result;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Event System
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
          console.error("[ConsoleParser] Event error:", error);
        }
      });
    }

    clearAll() {
      this._listeners.clear();
    }

    once(event, callback) {
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Main ConsoleParser Class
  // ═══════════════════════════════════════════════════════════════════════════

  class ConsoleParser {
    constructor(config = {}) {
      this.config = Object.freeze(config);
      this.version = "3.0.0";

      // Components
      this._logger = new _Logger(config.debug);
      this._hooks = new _HookSystem();
      this._events = new _EventEmitter();
      this._variables = new Map();

      // Module references
      this._settings = null;
      this._bridge = null;
      this._websocket = null;
      this._engine = null;
      this._history = null;

      // Registered commands
      this._registeredCommands = [];

      // Performance stats
      this._stats = {
        totalParsed: 0,
        totalErrors: 0,
        avgParseTime: 0,
      };

      this._disposed = false;

      this._logger.info("Instantiated (v3.0.0)");
    }

    // ── Public API: Core Parsing ─────────────────────────────────────────

    /**
     * Parse a command string into an AST
     */
    parse(input) {
      if (this._disposed) return null;
      if (typeof input !== "string" || input.trim() === "") return null;

      const startTime = performance.now();

      try {
        // Pre-parse hooks
        let processedInput = this._hooks.execute("pre_parse", input);

        // Lexical analysis
        const lexer = new _Lexer(processedInput);
        const tokens = lexer.tokenize();

        // Syntactic analysis
        const parser = new _Parser(tokens);
        const result = parser.parse();

        // Variable expansion if needed
        if (result.ast && result.ast.type === "COMMAND") {
          const expander = new _VariableExpander(
            Object.fromEntries(this._variables),
            this.config.environment || {},
          );
          result.ast = expander.expandCommand(result.ast);
        }

        // Post-parse hooks
        result.ast = this._hooks.execute("post_parse", result.ast);

        // Update stats
        const endTime = performance.now();
        this._updateStats(result.success, endTime - startTime);

        // Emit event
        this._events.emit("parse:complete", {
          input,
          result,
          parseTime: endTime - startTime,
        });

        // Sync with API if available
        if (this._bridge) {
          this._syncWithAPI(input, result);
        }

        return result;
      } catch (error) {
        this._logger.error("Parse error", error);
        this._stats.totalErrors++;
        return {
          ast: null,
          errors: [error.message],
          success: false,
        };
      }
    }

    /**
     * Validate a command
     */
    validate(input) {
      const result = this.parse(input);
      if (!result.success) {
        return result;
      }

      // Validate against registered commands
      if (result.ast && result.ast.type === "COMMAND") {
        const validation = _Validator.validateCommand(
          result.ast.name,
          this._registeredCommands,
        );

        if (!validation.valid) {
          return {
            ...result,
            success: false,
            errors: [validation.error],
            suggestions: validation.suggestions,
          };
        }
      }

      return result;
    }

    /**
     * Register a command
     */
    registerCommand(name) {
      if (!this._registeredCommands.includes(name)) {
        this._registeredCommands.push(name);
      }
    }

    /**
     * Get registered commands
     */
    getRegisteredCommands() {
      return [...this._registeredCommands];
    }

    // ── Variable Management ──────────────────────────────────────────────

    /**
     * Set a variable
     */
    setVariable(name, value) {
      this._variables.set(name, value);
    }

    /**
     * Get a variable
     */
    getVariable(name) {
      return this._variables.get(name);
    }

    /**
     * Get all variables
     */
    getVariables() {
      return Object.fromEntries(this._variables);
    }

    // ── Hook System ──────────────────────────────────────────────────────

    /**
     * Register a pre-parse hook
     */
    beforeParse(callback) {
      this._hooks.register("pre_parse", callback);
    }

    /**
     * Register a post-parse hook
     */
    afterParse(callback) {
      this._hooks.register("post_parse", callback);
    }

    /**
     * Unregister a hook
     */
    unregisterHook(name, callback) {
      this._hooks.unregister(name, callback);
    }

    // ── Module Linking ───────────────────────────────────────────────────

    /**
     * Link with other modules
     */
    linkModules(modules = {}) {
      if (modules.ConsoleSettings) this._settings = modules.ConsoleSettings;
      if (modules.ConsoleBridge) this._bridge = modules.ConsoleBridge;
      if (modules.ConsoleWebSocket) this._websocket = modules.ConsoleWebSocket;
      if (modules.ConsoleEngine) this._engine = modules.ConsoleEngine;
      if (modules.ConsoleHistory) this._history = modules.ConsoleHistory;

      const linked = [];
      if (this._settings) linked.push("ConsoleSettings");
      if (this._bridge) linked.push("ConsoleBridge");
      if (this._websocket) linked.push("ConsoleWebSocket");
      if (this._engine) linked.push("ConsoleEngine");
      if (this._history) linked.push("ConsoleHistory");

      this._logger.info(`Linked modules: ${linked.join(", ")}`);
      this._events.emit("modules:linked", { modules: linked });
    }

    /**
     * Check if all required modules are linked
     */
    areAllModulesLinked() {
      return (
        this._settings !== null &&
        this._bridge !== null &&
        this._websocket !== null &&
        this._engine !== null &&
        this._history !== null
      );
    }

    // ── API Integration ──────────────────────────────────────────────────

    _syncWithAPI(input, result) {
      if (!this._bridge) return;

      try {
        const data = {
          type: "parse_result",
          input,
          ast: result.ast,
          errors: result.errors,
          success: result.success,
          timestamp: Date.now(),
        };

        // Publish via WebSocket if available
        if (this._websocket) {
          this._websocket.publish("parser_channel", data);
        }
      } catch (error) {
        this._logger.error("API sync failed", error);
      }
    }

    /**
     * Register API routes (called by ConsoleBridge)
     */
    registerAPIRoutes(bridge) {
      if (!bridge) return;

      // POST /api/parser/parse - Parse a command
      bridge.post("/api/parser/parse", (req) => {
        const { input } = req.body || {};
        if (!input) {
          return { success: false, error: "No input provided" };
        }

        const result = this.parse(input);
        return {
          success: result.success,
          ast: result.ast,
          errors: result.errors,
        };
      });

      // POST /api/parser/validate - Validate a command
      bridge.post("/api/parser/validate", (req) => {
        const { input } = req.body || {};
        if (!input) {
          return { success: false, error: "No input provided" };
        }

        const result = this.validate(input);
        return {
          success: result.success,
          errors: result.errors,
          suggestions: result.suggestions,
        };
      });

      // GET /api/parser/commands - Get registered commands
      bridge.get("/api/parser/commands", (req) => {
        return {
          success: true,
          commands: this.getRegisteredCommands(),
          count: this._registeredCommands.length,
        };
      });

      // GET /api/parser/stats - Get statistics
      bridge.get("/api/parser/stats", (req) => {
        return {
          success: true,
          stats: this._stats,
        };
      });

      // POST /api/parser/variable - Set a variable
      bridge.post("/api/parser/variable", (req) => {
        const { name, value } = req.body || {};
        if (!name) {
          return { success: false, error: "Variable name required" };
        }

        this.setVariable(name, value);
        return {
          success: true,
          name,
          value,
        };
      });

      // GET /api/parser/variables - Get all variables
      bridge.get("/api/parser/variables", (req) => {
        return {
          success: true,
          variables: this.getVariables(),
        };
      });

      this._logger.info("API routes registered");
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

    _updateStats(success, parseTime) {
      this._stats.totalParsed++;
      if (!success) this._stats.totalErrors++;

      // Update average parse time
      const oldAvg = this._stats.avgParseTime;
      this._stats.avgParseTime =
        (oldAvg * (this._stats.totalParsed - 1) + parseTime) /
        this._stats.totalParsed;
    }

    /**
     * Get debug info
     */
    debugInfo() {
      return {
        name: "ConsoleParser",
        version: this.version,
        registeredCommands: this._registeredCommands.length,
        variables: this._variables.size,
        stats: this._stats,
        modulesLinked: this.areAllModulesLinked(),
      };
    }

    /**
     * Get all logs
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
      this._disposed = true;
      this._variables.clear();
      this._registeredCommands = [];
      this._hooks = null;
      this._events?.clearAll();
      this._events = null;
      this._settings = null;
      this._bridge = null;
      this._websocket = null;
      this._engine = null;
      this._history = null;
      this._logger.info("Disposed");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Global Exposure
  // ─────────────────────────────────────────────────────────────────────────
  global.ConsoleParser = ConsoleParser;
})(typeof globalThis !== "undefined" ? globalThis : window);
