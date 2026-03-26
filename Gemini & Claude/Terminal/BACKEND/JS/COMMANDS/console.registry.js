/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║                       console.registry.js v1.0.0                          ║
 * ║                   Command Registry & Plugin Manager                        ║
 * ║                                                                            ║
 * ║  Manages: Command registration, aliases, help, plugin loading             ║
 * ║  Integrated with: ConsoleCommands, ConsoleBuiltins, WebConsole            ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 *
 * FEATURES:
 *  ✓ Command registration and management
 *  ✓ Alias system for commands
 *  ✓ Help documentation generation
 *  ✓ Plugin loading and management
 *  ✓ Command discovery and listing
 *  ✓ Categorized command organization
 *  ✓ Module detection and validation
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
          `%c[ConsoleRegistry] ${message}`,
          "color: #00aaff; font-weight: bold;",
          data || "",
        );
      }
    }

    info(message, data) {
      console.log(
        `%c[ConsoleRegistry] ℹ ${message}`,
        "color: #00ff00; font-weight: bold;",
        data || "",
      );
    }

    warn(message, data) {
      console.warn(
        `%c[ConsoleRegistry] ⚠ ${message}`,
        "color: #ffaa00; font-weight: bold;",
        data || "",
      );
    }

    error(message, data) {
      console.error(
        `%c[ConsoleRegistry] ✗ ${message}`,
        "color: #ff0000; font-weight: bold;",
        data || "",
      );
    }

    success(message, data) {
      console.log(
        `%c[ConsoleRegistry] ✓ ${message}`,
        "color: #00ff00; font-weight: bold;",
        data || "",
      );
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Main ConsoleRegistry Class
     ═══════════════════════════════════════════════════════════════════════ */

  class ConsoleRegistry {
    constructor(config = {}) {
      this.config = {
        debug: config.debug ?? false,
        maxAliases: config.maxAliases ?? 100,
        ...config,
      };

      this._commands = new Map(); // name -> commandObject
      this._aliases = new Map(); // alias -> commandName
      this._plugins = new Map(); // pluginName -> pluginObject
      this._categories = new Map(); // category -> [commandNames]
      this._logger = new _Logger(this.config.debug);
      this._initialized = false;

      this._initialize();
    }

    /* ─────────────────────────────────────────────────────────────────────
       Initialization
       ───────────────────────────────────────────────────────────────────── */

    _initialize() {
      this._initialized = true;
      this._logger.info("v1.0.0 instantiated");
    }

    /* ─────────────────────────────────────────────────────────────────────
       Command Registration
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Register a command
     * @param {string} name - Command name
     * @param {Object} command - Command object
     * @returns {boolean} Success status
     */
    registerCommand(name, command) {
      if (!name || typeof name !== "string") {
        this._logger.error("Invalid command name");
        return false;
      }

      if (!command || typeof command.execute !== "function") {
        this._logger.error(`Command "${name}" must have an execute function`);
        return false;
      }

      if (this._commands.has(name)) {
        this._logger.warn(`Command already registered: ${name}`);
        return false;
      }

      const commandObj = {
        name,
        description: command.description || "",
        usage: command.usage || `${name} [options]`,
        category: command.category || "general",
        aliases: command.aliases || [],
        execute: command.execute,
        validate: command.validate || (() => true),
        help: command.help || command.description || "",
      };

      this._commands.set(name, commandObj);

      // Register aliases
      if (Array.isArray(command.aliases)) {
        command.aliases.forEach((alias) => {
          this.registerAlias(alias, name);
        });
      }

      // Register category
      if (!this._categories.has(commandObj.category)) {
        this._categories.set(commandObj.category, []);
      }
      this._categories.get(commandObj.category).push(name);

      this._logger.log(`Registered command: ${name}`, commandObj.description);
      return true;
    }

    /**
     * Unregister a command
     * @param {string} name - Command name
     * @returns {boolean} Success status
     */
    unregisterCommand(name) {
      if (!this._commands.has(name)) {
        this._logger.warn(`Command not found: ${name}`);
        return false;
      }

      const command = this._commands.get(name);

      // Remove aliases
      command.aliases.forEach((alias) => {
        this._aliases.delete(alias);
      });

      // Remove from category
      const category = this._categories.get(command.category);
      if (category) {
        const index = category.indexOf(name);
        if (index !== -1) {
          category.splice(index, 1);
        }
      }

      this._commands.delete(name);
      this._logger.success(`Command unregistered: ${name}`);
      return true;
    }

    /**
     * Get a command by name or alias
     * @param {string} nameOrAlias - Command name or alias
     * @returns {Object|null} Command object or null
     */
    getCommand(nameOrAlias) {
      // Check if it's an alias
      if (this._aliases.has(nameOrAlias)) {
        const actualName = this._aliases.get(nameOrAlias);
        return this._commands.get(actualName);
      }

      // Check if it's a command name
      if (this._commands.has(nameOrAlias)) {
        return this._commands.get(nameOrAlias);
      }

      return null;
    }

    /**
     * Check if command exists
     * @param {string} nameOrAlias - Command name or alias
     * @returns {boolean} Exists status
     */
    hasCommand(nameOrAlias) {
      return this._commands.has(nameOrAlias) || this._aliases.has(nameOrAlias);
    }

    /**
     * List all commands
     * @param {string} category - Filter by category (optional)
     * @returns {Array} Commands list
     */
    listCommands(category = null) {
      const commands = Array.from(this._commands.values());

      if (category) {
        return commands.filter((cmd) => cmd.category === category);
      }

      return commands;
    }

    /**
     * Get commands by category
     * @returns {Object} Categorized commands
     */
    getCommandsByCategory() {
      const result = {};

      for (const [category, names] of this._categories) {
        result[category] = names.map((name) => this._commands.get(name));
      }

      return result;
    }

    /**
     * List all categories
     * @returns {Array} Categories list
     */
    listCategories() {
      return Array.from(this._categories.keys());
    }

    /* ─────────────────────────────────────────────────────────────────────
       Alias Management
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Register a command alias
     * @param {string} alias - Alias name
     * @param {string} commandName - Target command name
     * @returns {boolean} Success status
     */
    registerAlias(alias, commandName) {
      if (!this._commands.has(commandName)) {
        this._logger.error(`Target command not found: ${commandName}`);
        return false;
      }

      if (this._aliases.size >= this.config.maxAliases) {
        this._logger.warn("Max aliases reached");
        return false;
      }

      if (this._aliases.has(alias) || this._commands.has(alias)) {
        this._logger.warn(`Alias already exists: ${alias}`);
        return false;
      }

      this._aliases.set(alias, commandName);
      this._logger.log(`Registered alias: ${alias} → ${commandName}`);
      return true;
    }

    /**
     * Unregister an alias
     * @param {string} alias - Alias name
     * @returns {boolean} Success status
     */
    unregisterAlias(alias) {
      if (!this._aliases.has(alias)) {
        this._logger.warn(`Alias not found: ${alias}`);
        return false;
      }

      const target = this._aliases.get(alias);
      this._aliases.delete(alias);
      this._logger.success(`Alias unregistered: ${alias} (was ${target})`);
      return true;
    }

    /**
     * Get aliases for a command
     * @param {string} commandName - Command name
     * @returns {Array} Aliases list
     */
    getAliases(commandName) {
      const command = this._commands.get(commandName);
      if (!command) return [];
      return command.aliases || [];
    }

    /**
     * List all aliases
     * @returns {Object} All aliases
     */
    listAliases() {
      const result = {};
      for (const [alias, target] of this._aliases) {
        result[alias] = target;
      }
      return result;
    }

    /* ─────────────────────────────────────────────────────────────────────
       Help & Documentation
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Get help for a command
     * @param {string} commandName - Command name
     * @returns {string} Help text
     */
    getHelp(commandName) {
      const command = this.getCommand(commandName);
      if (!command) {
        return `Command not found: ${commandName}`;
      }

      let help = "";
      help += `\n╔════════════════════════════════════════╗\n`;
      help += `║  Command: ${command.name.padEnd(32)} ║\n`;
      help += `╚════════════════════════════════════════╝\n\n`;

      help += `📋 Description:\n  ${command.description}\n\n`;
      help += `💻 Usage:\n  ${command.usage}\n\n`;

      if (command.aliases.length > 0) {
        help += `📌 Aliases: ${command.aliases.join(", ")}\n\n`;
      }

      if (command.help) {
        help += `📖 Help:\n  ${command.help}\n\n`;
      }

      help += `📂 Category: ${command.category}\n`;

      return help;
    }

    /**
     * Get general help for all commands
     * @returns {string} General help text
     */
    getGeneralHelp() {
      let help = "\n╔════════════════════════════════════════╗\n";
      help += "║         Available Commands             ║\n";
      help += "╚════════════════════════════════════════╝\n\n";

      const categories = this.getCommandsByCategory();

      for (const [category, commands] of Object.entries(categories)) {
        help += `\n📂 ${category.toUpperCase()}\n`;
        help += "─".repeat(40) + "\n";

        for (const cmd of commands) {
          help += `  ${cmd.name.padEnd(15)} ${cmd.description}\n`;
          if (cmd.aliases.length > 0) {
            help += `    Aliases: ${cmd.aliases.join(", ")}\n`;
          }
        }
      }

      help += '\n\nℹ️  Use "help <command>" for detailed help\n';

      return help;
    }

    /* ─────────────────────────────────────────────────────────────────────
       Plugin Management
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Load a plugin
     * @param {string} pluginName - Plugin name
     * @param {Object} plugin - Plugin object
     * @returns {boolean} Success status
     */
    loadPlugin(pluginName, plugin) {
      if (this._plugins.has(pluginName)) {
        this._logger.warn(`Plugin already loaded: ${pluginName}`);
        return false;
      }

      if (typeof plugin.onLoad !== "function") {
        this._logger.error(`Plugin must have onLoad function: ${pluginName}`);
        return false;
      }

      try {
        plugin.onLoad(this);
        this._plugins.set(pluginName, plugin);
        this._logger.success(`Plugin loaded: ${pluginName}`);
        return true;
      } catch (e) {
        this._logger.error(`Failed to load plugin: ${pluginName}`, e.message);
        return false;
      }
    }

    /**
     * Unload a plugin
     * @param {string} pluginName - Plugin name
     * @returns {boolean} Success status
     */
    unloadPlugin(pluginName) {
      if (!this._plugins.has(pluginName)) {
        this._logger.warn(`Plugin not found: ${pluginName}`);
        return false;
      }

      const plugin = this._plugins.get(pluginName);

      if (typeof plugin.onUnload === "function") {
        try {
          plugin.onUnload(this);
        } catch (e) {
          this._logger.error(
            `Failed to unload plugin: ${pluginName}`,
            e.message,
          );
        }
      }

      this._plugins.delete(pluginName);
      this._logger.success(`Plugin unloaded: ${pluginName}`);
      return true;
    }

    /**
     * List loaded plugins
     * @returns {Array} Plugins list
     */
    listPlugins() {
      return Array.from(this._plugins.keys());
    }

    /**
     * Get plugin info
     * @param {string} pluginName - Plugin name
     * @returns {Object|null} Plugin info
     */
    getPluginInfo(pluginName) {
      return this._plugins.get(pluginName) || null;
    }

    /* ─────────────────────────────────────────────────────────────────────
       Statistics & Info
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Get registry statistics
     * @returns {Object} Statistics
     */
    getStats() {
      return {
        commandCount: this._commands.size,
        aliasCount: this._aliases.size,
        categoryCount: this._categories.size,
        pluginCount: this._plugins.size,
        categories: this.listCategories(),
        plugins: this.listPlugins(),
      };
    }

    /**
     * Get information about this module and linked modules
     * @returns {Object} Module information
     */
    getInfo() {
      return {
        moduleName: "ConsoleRegistry",
        version: "1.0.0",
        initialized: this._initialized,
        stats: this.getStats(),
        hasSupportedModules: {
          consoleCommands: typeof window.ConsoleCommands !== "undefined",
          consoleBuiltins: typeof window.ConsoleBuiltins !== "undefined",
          consoleDatabase: typeof window.ConsoleDatabase !== "undefined",
          consoleTable: typeof window.ConsoleTable !== "undefined",
          consoleRenderer: typeof window.ConsoleRenderer !== "undefined",
          consoleKeyboard: typeof window.ConsoleKeyboard !== "undefined",
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
      info.commands = Array.from(this._commands.values()).map((cmd) => ({
        name: cmd.name,
        description: cmd.description,
        category: cmd.category,
        aliases: cmd.aliases,
      }));
      info.aliases = this.listAliases();
      return info;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Global Export
     ═══════════════════════════════════════════════════════════════════════ */

  window.ConsoleRegistry = new ConsoleRegistry({
    debug: false,
  });

  // Log that module is loaded
  console.log(
    "%c[ConsoleRegistry] %cv1.0.0 loaded and initialized",
    "color: #00aaff; font-weight: bold;",
    "color: #00ff00;",
  );
})();
