/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║                       console.builtins.js v1.0.0                          ║
 * ║                    Built-in Command Library                                ║
 * ║                                                                            ║
 * ║  Provides: System, database, table, and utility commands                  ║
 * ║  Integrated with: ConsoleRegistry, ConsoleCommands, ConsoleDatabase       ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 *
 * COMMANDS:
 *  System: help, clear, echo, exit, version, info, ls, pwd
 *  Database: select, insert, update, delete, describe,
 *            list, create, table, query
 *  Table: render, export, find, sort
 *  Utility: history, undo, redo, time, meminfo
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
          `%c[ConsoleBuiltins] ${message}`,
          "color: #ff6600; font-weight: bold;",
          data || "",
        );
      }
    }

    info(message, data) {
      console.log(
        `%c[ConsoleBuiltins] ℹ ${message}`,
        "color: #00ff00; font-weight: bold;",
        data || "",
      );
    }

    success(message, data) {
      console.log(
        `%c[ConsoleBuiltins] ✓ ${message}`,
        "color: #00ff00; font-weight: bold;",
        data || "",
      );
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Utility Functions
     ═══════════════════════════════════════════════════════════════════════ */

  function escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Built-in Commands
     ═══════════════════════════════════════════════════════════════════════ */

  const BUILTINS = {
    // ─────────────────────────────────────────────────────────────────────
    // SYSTEM COMMANDS
    // ─────────────────────────────────────────────────────────────────────

    help: {
      name: "help",
      description: "Display help information",
      usage: "help [command]",
      category: "system",
      aliases: ["h", "?"],
      help: "Shows available commands or detailed help for a specific command",
      validate: (args) => true,
      execute: async (ctx) => {
        const { args, renderer, engine } = ctx;

        if (args.length === 0) {
          // Sem argumentos: mostra TODOS os comandos em tabela
          renderer.print("\n📚 WebConsole Commands:\n", "info");

          const cmdList = [];
          if (engine && engine._commands) {
            for (const [name, def] of engine._commands.entries()) {
              cmdList.push({
                COMMAND: name,
                DESCRIPTION: def.description || "No description",
              });
            }
          }

          // Ordena alfabeticamente
          cmdList.sort((a, b) => a.COMMAND.localeCompare(b.COMMAND));

          if (cmdList.length > 0) {
            if (
              typeof global.ConsoleTable !== "undefined" &&
              global.ConsoleTable &&
              global.ConsoleTable.render
            ) {
              renderer.renderTable(cmdList);
            } else {
              cmdList.forEach((c) =>
                renderer.print(
                  `  ${c.COMMAND.padEnd(20)} - ${c.DESCRIPTION}`,
                  "output",
                ),
              );
            }
            renderer.print(
              `\nTotal: ${cmdList.length} commands available\n`,
              "muted",
            );
          } else {
            renderer.print(
              "No commands available. Type a command to execute.",
              "warn",
            );
          }

          return { success: true, message: "Help displayed" };
        } else {
          // Com argumentos: mostra help para um comando específico
          const cmdName = args[0].toLowerCase();
          const cmd = engine._commands.get(cmdName);

          if (cmd) {
            let helpText = `\n╔════════════════════════════════════════╗\n`;
            helpText += `║  Command: ${cmdName.padEnd(28)} ║\n`;
            helpText += `╚════════════════════════════════════════╝\n\n`;
            helpText += `📖 Description:\n  ${cmd.description || "No description"}\n\n`;

            if (cmd.usage) {
              helpText += `💻 Usage:\n  ${cmd.usage}\n\n`;
            }

            renderer.print(helpText, "info");
            return { success: true, message: "Command help displayed" };
          } else {
            renderer.print(
              `Command not found: ${cmdName}\nType 'help' to see all commands.`,
              "error",
            );
            return { success: false, error: "Command not found" };
          }
        }
      },
    },

    clear: {
      name: "clear",
      description: "Clear terminal screen",
      usage: "clear",
      category: "system",
      aliases: ["cls"],
      help: "Clears all output from the terminal",
      validate: (args) => true,
      execute: async (ctx) => {
        const { renderer } = ctx;
        renderer.clear();
        return { success: true, message: "Terminal cleared" };
      },
    },

    echo: {
      name: "echo",
      description: "Print text to terminal",
      usage: "echo <text>",
      category: "system",
      aliases: ["print"],
      help: "Outputs text to the terminal",
      validate: (args) => args.length > 0,
      execute: async (ctx) => {
        const { args, renderer } = ctx;
        const text = args.join(" ");
        renderer.print(text);
        return { success: true, message: text };
      },
    },

    version: {
      name: "version",
      description: "Show system version info",
      usage: "version",
      category: "system",
      aliases: ["ver"],
      help: "Displays version information for all modules",
      validate: (args) => true,
      execute: async (ctx) => {
        const { renderer, registry, commands } = ctx;

        const modules = {
          ConsoleRegistry: registry.getInfo(),
          ConsoleCommands: commands.getInfo(),
          ConsoleBuiltins: { version: "1.0.0" },
        };

        let output = "\n╔════════════════════════════════════════╗\n";
        output += "║         System Version Info             ║\n";
        output += "╚════════════════════════════════════════╝\n\n";

        for (const [name, info] of Object.entries(modules)) {
          output += `${name}: v${info.version || "1.0.0"}\n`;
        }

        renderer.print(output, "info");
        return { success: true, message: "Version info displayed" };
      },
    },

    info: {
      name: "info",
      description: "Display system information",
      usage: "info [module]",
      category: "system",
      aliases: ["sysinfo"],
      help: "Shows detailed information about loaded modules",
      validate: (args) => true,
      execute: async (ctx) => {
        const { args, renderer, registry, commands } = ctx;

        if (args.length > 0) {
          // Specific module info
          const moduleName = args[0];
          let info = null;

          if (typeoflookup === "Registry" || moduleName === "registry") {
            info = registry.getInfo();
          } else if (moduleName === "commands") {
            info = commands.getInfo();
          }

          if (info) {
            renderer.print(`\n${JSON.stringify(info, null, 2)}`, "info");
          } else {
            renderer.print(`Module not found: ${moduleName}`, "error");
          }
        } else {
          // All modules info
          const registryInfo = registry.getInfo();
          const commandsInfo = commands.getInfo();

          let output = "\n╔════════════════════════════════════════╗\n";
          output += "║       System Information                ║\n";
          output += "╚════════════════════════════════════════╝\n\n";

          output += `📦 Registry: ${registryInfo.stats.commandCount} commands loaded\n`;
          output += `   Aliases: ${registryInfo.stats.aliasCount}\n`;
          output += `   Categories: ${registryInfo.stats.categoryCount}\n\n`;

          output += `⚙️  Commands: ${commandsInfo.historyCount} in history\n`;
          output += `   Undo available: ${commandsInfo.undoAvailable}\n`;
          output += `   Redo available: ${commandsInfo.redoAvailable}\n\n`;

          renderer.print(output, "info");
        }

        return { success: true, message: "System info displayed" };
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // DATABASE COMMANDS
    // ─────────────────────────────────────────────────────────────────────

    select: {
      name: "select",
      description: "Query database tables",
      usage: "select <table> [--where condition] [--limit n]",
      category: "database",
      aliases: ["query", "select"],
      help: "Execute SELECT query on database\nExample: select users --limit 10",
      validate: (args) => args.length > 0,
      execute: async (ctx) => {
        const { args, options, database, renderer, table } = ctx;

        if (!database) {
          return { success: false, error: "Database not connected" };
        }

        const tableName = args[0];
        let data = database.getTable(tableName);

        if (!data) {
          renderer.print(`Table not found: ${tableName}`, "error");
          return { success: false, error: "Table not found" };
        }

        // Apply filters if provided
        if (options.where) {
          // Simple filter pattern: "col=value"
          const parts = options.where.split("=");
          if (parts.length === 2) {
            const [col, val] = parts;
            data = data.filter((row) => String(row[col]) === val);
          }
        }

        // Apply limit
        if (options.limit) {
          data = data.slice(0, parseInt(options.limit));
        }

        if (data.length === 0) {
          renderer.print("No results found", "warn");
        } else {
          if (table) {
            table.render(data);
          }
          renderer.renderTable(data);
          renderer.print(`Found ${data.length} rows`, "success");
        }

        return { success: true, rowCount: data.length, data };
      },
    },

    insert: {
      name: "insert",
      description: "Insert row into database",
      usage: "insert <table> --col1=val1 --col2=val2",
      category: "database",
      aliases: [],
      help: "Insert a new row into specified table\nExample: insert users --name=Alice --email=alice@test.com",
      validate: (args, options) =>
        args.length > 0 && Object.keys(options).length > 0,
      execute: async (ctx) => {
        const { args, options, database, renderer } = ctx;

        if (!database) {
          return { success: false, error: "Database not connected" };
        }

        const tableName = args[0];
        const table = database.getTable(tableName);

        if (!table) {
          renderer.print(`Table not found: ${tableName}`, "error");
          return { success: false, error: "Table not found" };
        }

        const row = { ...options };
        const success = database.insertRow(tableName, row);

        if (success) {
          renderer.print(`✓ Row inserted into ${tableName}`, "success");
          return { success: true, row };
        } else {
          renderer.print("Failed to insert row", "error");
          return { success: false, error: "Insertion failed" };
        }
      },
    },

    describe: {
      name: "describe",
      description: "Show table structure",
      usage: "describe <table>",
      category: "database",
      aliases: ["desc", "schema"],
      help: "Display table schema and statistics\nExample: describe users",
      validate: (args) => args.length > 0,
      execute: async (ctx) => {
        const { args, database, renderer } = ctx;

        if (!database) {
          return { success: false, error: "Database not connected" };
        }

        const tableName = args[0];
        const stats = database.getTableStats(tableName);

        if (!stats) {
          renderer.print(`Table not found: ${tableName}`, "error");
          return { success: false, error: "Table not found" };
        }

        let output = "\n╔════════════════════════════════════════╗\n";
        output += `║  Table: ${tableName.padEnd(30)} ║\n`;
        output += "╚════════════════════════════════════════╝\n\n";

        output += `📊 Rows: ${stats.rowCount}\n`;
        output += `📋 Columns: ${stats.columnCount}\n`;
        output += `💾 Size: ${formatBytes(stats.memorySize)}\n\n`;

        output += `Columns:\n`;
        stats.columns.forEach((col, i) => {
          output += `  ${i + 1}. ${col}\n`;
        });

        renderer.print(output, "info");
        return { success: true, stats };
      },
    },

    list: {
      name: "list",
      description: "List all tables in database",
      usage: "list [--detailed]",
      category: "database",
      aliases: ["tables", "ls"],
      help: "Show all tables or detailed table information",
      validate: (args) => true,
      execute: async (ctx) => {
        const { options, database, renderer } = ctx;

        if (!database) {
          return { success: false, error: "Database not connected" };
        }

        const tables = database.listTables();

        if (tables.length === 0) {
          renderer.print("No tables found", "warn");
          return { success: true, count: 0, tables: [] };
        }

        let output = "\n📊 Database Tables:\n";
        output += "─".repeat(40) + "\n";

        if (options.detailed) {
          tables.forEach((tableName) => {
            const stats = database.getTableStats(tableName);
            output += `\n${tableName}\n`;
            output += `  Rows: ${stats.rowCount} | Columns: ${stats.columnCount} | Size: ${formatBytes(stats.memorySize)}\n`;
          });
        } else {
          tables.forEach((tableName, i) => {
            output += `  ${i + 1}. ${tableName}\n`;
          });
        }

        renderer.print(output, "info");
        return { success: true, count: tables.length, tables };
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // TABLE COMMANDS
    // ─────────────────────────────────────────────────────────────────────

    render: {
      name: "render",
      description: "Render table from database",
      usage: "render <table> [--cols col1,col2]",
      category: "table",
      aliases: ["show", "display"],
      help: "Render a table from database\nExample: render users --cols id,name,email",
      validate: (args) => args.length > 0,
      execute: async (ctx) => {
        const { args, options, database, renderer, table } = ctx;

        if (!database || !table || !renderer) {
          return { success: false, error: "Required modules not connected" };
        }

        const tableName = args[0];
        const data = database.getTable(tableName);

        if (!data) {
          renderer.print(`Table not found: ${tableName}`, "error");
          return { success: false, error: "Table not found" };
        }

        const columns = options.cols
          ? options.cols.split(",").map((c) => c.trim())
          : null;

        const html = table.render(data, columns);
        renderer.renderTable(data, columns);

        renderer.print(`✓ Rendered ${data.length} rows`, "success");
        return { success: true, rowCount: data.length };
      },
    },

    export: {
      name: "export",
      description: "Export table data",
      usage: "export <table> [--format csv|json] [--file filename]",
      category: "table",
      aliases: ["download"],
      help: "Export table to CSV or JSON\nExample: export users --format csv --file myusers",
      validate: (args) => args.length > 0,
      execute: async (ctx) => {
        const { args, options, database, table, renderer } = ctx;

        if (!database || !table) {
          return { success: false, error: "Required modules not connected" };
        }

        const tableName = args[0];
        const format = options.format || "csv";
        const filename = options.file || tableName;

        const data = database.getTable(tableName);
        if (!data) {
          renderer.print(`Table not found: ${tableName}`, "error");
          return { success: false, error: "Table not found" };
        }

        try {
          table.downloadTable(data, null, format, filename);
          renderer.print(`✓ Downloaded: ${filename}.${format}`, "success");
          return { success: true, format, filename };
        } catch (e) {
          renderer.print(`Export failed: ${e.message}`, "error");
          return { success: false, error: e.message };
        }
      },
    },

    // ─────────────────────────────────────────────────────────────────────
    // UTILITY COMMANDS
    // ─────────────────────────────────────────────────────────────────────

    history: {
      name: "history",
      description: "Show command history",
      usage: "history [--limit n]",
      category: "utility",
      aliases: ["hist"],
      help: "Display recent commands\nExample: history --limit 20",
      validate: (args) => true,
      execute: async (ctx) => {
        const { options, commands, renderer } = ctx;

        const hist = commands.getHistory();
        const limit = parseInt(options.limit) || 10;
        const recent = hist.slice(-limit);

        let output = "\n📜 Command History:\n";
        output += "─".repeat(40) + "\n";

        recent.forEach((cmd, i) => {
          output += `  ${i + 1}. ${cmd}\n`;
        });

        renderer.print(output, "info");
        return { success: true, count: recent.length };
      },
    },

    undo: {
      name: "undo",
      description: "Undo last reversible action",
      usage: "undo",
      category: "utility",
      aliases: ["u"],
      help: "Undo the last reversible command",
      validate: (args) => true,
      execute: async (ctx) => {
        const { commands, renderer } = ctx;

        const success = commands.undo();

        if (success) {
          renderer.print("✓ Action undone", "success");
          return { success: true };
        } else {
          renderer.print("Nothing to undo", "warn");
          return { success: false, error: "Nothing to undo" };
        }
      },
    },

    redo: {
      name: "redo",
      description: "Redo last undone action",
      usage: "redo",
      category: "utility",
      aliases: ["r"],
      help: "Redo the last undone command",
      validate: (args) => true,
      execute: async (ctx) => {
        const { commands, renderer } = ctx;

        const success = commands.redo();

        if (success) {
          renderer.print("✓ Action redone", "success");
          return { success: true };
        } else {
          renderer.print("Nothing to redo", "warn");
          return { success: false, error: "Nothing to redo" };
        }
      },
    },

    time: {
      name: "time",
      description: "Show current time",
      usage: "time",
      category: "utility",
      aliases: [],
      help: "Display current date and time",
      validate: (args) => true,
      execute: async (ctx) => {
        const { renderer } = ctx;

        const now = new Date();
        const formatted = now.toLocaleString();

        renderer.print(`⏰ ${formatted}`, "info");
        return { success: true, timestamp: now.toISOString() };
      },
    },

    meminfo: {
      name: "meminfo",
      description: "Show memory information",
      usage: "meminfo",
      category: "utility",
      aliases: [],
      help: "Display memory usage information",
      validate: (args) => true,
      execute: async (ctx) => {
        const { renderer, database } = ctx;

        let output = "\n💾 Memory Information:\n";
        output += "─".repeat(40) + "\n";

        if (database) {
          const tables = database.listTables();
          let totalSize = 0;

          for (const tableName of tables) {
            const stats = database.getTableStats(tableName);
            totalSize += stats.memorySize;
            output += `${tableName}: ${formatBytes(stats.memorySize)}\n`;
          }

          output += `\nTotal: ${formatBytes(totalSize)}\n`;
        }

        if (performance.memory) {
          output += `\nJS Heap (approx):\n`;
          output += `  Used: ${formatBytes(performance.memory.usedJSHeapSize)}\n`;
          output += `  Limit: ${formatBytes(performance.memory.jsHeapSizeLimit)}\n`;
        }

        renderer.print(output, "info");
        return { success: true };
      },
    },
  };

  /* ═══════════════════════════════════════════════════════════════════════
     Module Initialization
     ═══════════════════════════════════════════════════════════════════════ */

  class ConsoleBuiltins {
    static register(registry) {
      if (!registry || typeof registry.registerCommand !== "function") {
        console.error("[ConsoleBuiltins] Invalid registry provided");
        return false;
      }

      let registered = 0;
      for (const [name, command] of Object.entries(BUILTINS)) {
        if (registry.registerCommand(name, command)) {
          registered++;
        }
      }

      console.log(
        `%c[ConsoleBuiltins] ✓ Registered ${registered} built-in commands`,
        "color: #ff6600; font-weight: bold;",
      );

      return registered === Object.keys(BUILTINS).length;
    }

    static getInfo() {
      return {
        moduleName: "ConsoleBuiltins",
        version: "1.0.0",
        commandCount: Object.keys(BUILTINS).length,
        commands: Object.keys(BUILTINS),
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Global Export
     ═══════════════════════════════════════════════════════════════════════ */

  window.ConsoleBuiltins = ConsoleBuiltins;

  // Log that module is loaded
  console.log(
    "%c[ConsoleBuiltins] %cv1.0.0 loaded",
    "color: #ff6600; font-weight: bold;",
    "color: #ffaa00;",
  );
})();
