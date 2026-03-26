/**
 * @file        console.controler.database.js
 * @description ConsoleDatabaseController — High-level interface & query parser
 *
 * Acts as an intermediary between ConsoleDatabase and external modules (like
 * ConsoleBridge or ConsoleEngine). It manages the session token, provides
 * a SQL-like string query parser, and encapsulates direct DB calls.
 */
(function (global) {
  "use strict";

  class _Logger {
    constructor(debug = false) {
      this.debug = debug;
    }
    info(msg) {
      console.info(
        `%c[DB Controller] ℹ ${msg}`,
        "color: #00aaff; font-weight:bold;",
      );
    }
    warn(msg) {
      console.warn(
        `%c[DB Controller] ⚠ ${msg}`,
        "color: #ffaa00; font-weight:bold;",
      );
    }
    error(msg, err) {
      console.error(
        `%c[DB Controller] ✖ ${msg}`,
        "color: #ff0000; font-weight:bold;",
        err || "",
      );
    }
  }

  class ConsoleDatabaseController {
    constructor(config = {}) {
      this.config = config;
      this._logger = new _Logger(config.debug);
      this._db = null;
      this._sessionToken = null;
      this.version = "1.0.0";

      this._logger.info("v1.0.0 instantiated");
    }

    /**
     * Links the underlying ConsoleDatabase module
     */
    linkDatabase(databaseInstance) {
      this._db = databaseInstance;
      this._logger.info("Successfully linked to ConsoleDatabase");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Session & Auth Management
    // ─────────────────────────────────────────────────────────────────────────

    login(username, password = null) {
      this._assertDb();

      // Se só passou username, assume que é o método antigo (password)
      if (password === null) {
        // Método antigo: login(password) - manter compatibilidade
        const result = this._db.authenticate(username); // username é na verdade password
        if (result.success) {
          this._sessionToken = result.token;
        }
        return result;
      }

      // Novo método: login(username, password)
      const result = this._db.authenticate(username, password);
      if (result.success) {
        this._sessionToken = result.token;
      }
      return result;
    }

    logout() {
      this._assertDb();
      if (!this._sessionToken)
        return { success: false, message: "No active session." };
      this._db.revokeToken(this._sessionToken);
      this._sessionToken = null;
      return { success: true, message: "Logged out successfully." };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Core Proxy Methods (Auto-injects Session Token)
    // ─────────────────────────────────────────────────────────────────────────

    createTable(tableName, columns) {
      this._assertDb();
      return this._db.createTable(tableName, columns, this._sessionToken);
    }

    dropTable(tableName) {
      this._assertDb();
      return this._db.deleteTable(tableName, this._sessionToken);
    }

    insert(tableName, data) {
      this._assertDb();
      return this._db.insert(tableName, data, this._sessionToken);
    }

    select(tableName, filter = null, limit = 1000) {
      this._assertDb();
      // Select is a public operation in ConsoleDatabase, token is optional
      return this._db.select(tableName, filter, limit);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SQL-Like String Parser
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Parses and routes string queries to the underlying DB methods.
     * Used directly by ConsoleBridge `/api/database/query` route.
     * @param {string} queryString e.g., "SELECT * FROM users"
     */
    query(queryString) {
      this._assertDb();
      if (!queryString || typeof queryString !== "string") {
        throw new Error("Invalid query string");
      }

      const tokens = queryString.trim().split(/\s+/);
      const command = tokens[0].toUpperCase();

      try {
        switch (command) {
          case "SELECT":
            return this._handleSelect(tokens);
          case "CREATE":
            return this._handleCreate(tokens);
          case "DROP":
            return this._handleDrop(tokens);
          default:
            throw new Error(`Unsupported SQL command: ${command}`);
        }
      } catch (err) {
        this._logger.error("Query execution failed", err);
        throw err;
      }
    }

    _handleSelect(tokens) {
      const fromIndex = tokens.findIndex((t) => t.toUpperCase() === "FROM");
      if (fromIndex === -1 || !tokens[fromIndex + 1])
        throw new Error("Syntax error: Missing FROM <table_name>");

      const tableName = tokens[fromIndex + 1].replace(/;$/, "");
      return this.select(tableName);
    }

    _handleCreate(tokens) {
      if (tokens[1]?.toUpperCase() !== "TABLE" || !tokens[2])
        throw new Error("Syntax error: Expected CREATE TABLE <table_name>");

      const tableName = tokens[2];
      const columns = tokens
        .slice(3)
        .map((c) => c.replace(/[,;()]/g, ""))
        .filter(Boolean);

      const result = this.createTable(tableName, columns);
      if (!result.success) throw new Error(result.message);

      return result;
    }

    _handleDrop(tokens) {
      if (tokens[1]?.toUpperCase() !== "TABLE" || !tokens[2])
        throw new Error("Syntax error: Expected DROP TABLE <table_name>");

      const tableName = tokens[2].replace(/;$/, "");
      const result = this.dropTable(tableName);

      if (!result.success) throw new Error(result.message);
      return result;
    }

    _assertDb() {
      if (!this._db) {
        throw new Error("ConsoleDatabase is not linked to the Controller.");
      }
    }
  }

  global.ConsoleDatabaseController = ConsoleDatabaseController;
})(typeof globalThis !== "undefined" ? globalThis : window);
