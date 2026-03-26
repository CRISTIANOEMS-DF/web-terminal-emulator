/**
 * ConsoleDatabase - Central Backend Database & File Audit System
 * ════════════════════════════════════════════════════════════════════════════
 *
 * PROPÓSITO PRINCIPAL:
 * Hub centralizado para controlar, validar e auditar TODAS as operações
 * de arquivo do backend (criar, deletar, listar, modificar).
 *
 * ARQUITETURA:
 *  ✅ Sem tabelas de auditoria pré-criadas (dinâmicas)
 *  ✅ Sistema de autenticação com senha (controlador da database)
 *  ✅ Controle de acesso: read-only vs authenticated
 *  ✅ Integração de evento para auditoria automática
 *  ✅ Todas operações de arquivo passam por validação
 *
 * CONTRATOS DE INTEGRAÇÃO:
 *  - console.keyboard.js: Emite eventos "keyboard:*" que disparam audit
 *  - console.engine.js: Todas operações passam por db.validateOperation()
 *  - console.commands.js: Cada comando valida via db antes executar
 *  - console.renderer.js: Renderiza dados de auditoria em tempo real
 *
 * EVENTOS CAPTURADOS:
 *  - file:created {path, size, timestamp, user}
 *  - file:deleted {path, timestamp, user}
 *  - file:modified {path, changes, timestamp, user}
 *  - file:listed {path, count, timestamp, user}
 *  - file:validated {path, result, issues, timestamp}
 *  - operation:blocked {reason, path, timestamp}
 *
 * USAGE:
 *   const db = new ConsoleDatabase();
 *
 *   // 1. Autenticar (primeira vez define a senha)
 *   const auth1 = db.authenticate("minha_senha_segura");
 *   const token = auth1.token;
 *
 *   // 2. Criar tabelas (dados persistidos automaticamente)
 *   db.createTable("users", ["id", "name", "email"], token);
 *
 *   // 3. Fazer operações (IDs únicos com crypto.randomUUID)
 *   db.insert("users", {name: "João", email: "joao@email.com"}, token);
 *
 *   // 4. Ler dados (qualquer um pode ler)
 *   const users = db.select("users");
 *
 *   // Dados persistem entre sessões via localStorage
 *   // Tokens expirados são limpos automaticamente a cada 5 minutos
 *
 * @version 3.5.0 (com autenticação de usuários, admin e export PHP)
 * @license MIT
 */

(function (global) {
  "use strict";

  const VERSION = "3.5.0";

  // ═══════════════════════════════════════════════════════════════════════════
  // Centralized Logger (v3.1.0)
  // ═══════════════════════════════════════════════════════════════════════════

  const Logger = {
    _prefix: "[ConsoleDatabase]",
    _logHistory: [],
    _maxHistory: 1000,

    info(msg) {
      const entry = `${this._prefix} ℹ ${msg}`;
      console.info(entry);
      this._addToHistory(entry, "info");
    },

    warn(msg) {
      const entry = `${this._prefix} ⚠ ${msg}`;
      console.warn(entry);
      this._addToHistory(entry, "warn");
    },

    error(msg, err = null) {
      const entry = `${this._prefix} ✖ ${msg}${err ? ": " + err.message : ""}`;
      console.error(entry);
      this._addToHistory(entry, "error");
    },

    debug(msg, data = null) {
      const entry = `${this._prefix} ◎ ${msg}${data ? ": " + JSON.stringify(data) : ""}`;
      console.debug(entry);
      this._addToHistory(entry, "debug");
    },

    _addToHistory(entry, level) {
      this._logHistory.push({
        timestamp: new Date().toISOString(),
        level,
        message: entry,
      });
      if (this._logHistory.length > this._maxHistory) {
        this._logHistory.shift();
      }
    },

    getHistory(limit = 100) {
      return this._logHistory.slice(-limit);
    },

    clearHistory() {
      this._logHistory = [];
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Event Emitter System
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
          console.error("[ConsoleDatabase] Event callback error:", error);
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
  // Main ConsoleDatabase Class
  // ═══════════════════════════════════════════════════════════════════════════

  class ConsoleDatabase {
    constructor(databasePassword = null) {
      this.version = VERSION;
      this.tables = {};
      this.transactions = [];
      this.lastQuery = null;
      this.queryHistory = [];
      this._nextIds = {};
      this._events = new _EventEmitter();
      this._disposed = false;

      // ────────────────────────────────────────────────────────────────────
      // Authentication System (v3.3.0)
      // └─ Controla acesso a operações críticas
      // └─ Sem tabelas de auditoria pré-criadas
      // ────────────────────────────────────────────────────────────────────
      this._databasePassword = databasePassword || null;
      this._isAuthenticated = false;
      this._authTokens = [];
      this._failedAttempts = 0;
      this._maxFailedAttempts = 5;
      this._blockedUntil = null;

      // ────────────────────────────────────────────────────────────────────
      // File Audit System (v3.3.0)
      // └─ NÃO cria tabelas automaticamente na inicialização
      // └─ Tabelas de auditoria são criadas dinamicamente conforme necessário
      // ────────────────────────────────────────────────────────────────────
      this._auditConfig = {
        enableAudit: true,
        logAllOperations: true,
        maxAuditEntries: 10000,
        requireApproval: false,
        blockedExtensions: [".exe", ".bat", ".cmd", ".ps1", ".sh"],
        maxFileSize: 104857600, // 100MB
      };
      this._validationRules = this._initializeValidationRules();

      Logger.info(
        `[ConsoleDatabase] v${this.version} initialized (no pre-built tables)`,
      );
      Logger.info(
        `[ConsoleDatabase] Use db.authenticate() to set password and get started.`,
      );

      // Load persisted data
      this._loadFromStorage();

      // Start periodic token cleanup
      this._startTokenCleanup();

      // Initialize users table and admin user
      this._initializeUsersTable();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PERSISTENCE & UTILITY METHODS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Load data from localStorage
     * @private
     */
    _loadFromStorage() {
      try {
        if (typeof localStorage === "undefined") {
          Logger.warn("[STORAGE] localStorage not available, skipping load");
          return;
        }
        const stored = localStorage.getItem("ConsoleDatabase_Data");
        if (stored) {
          const data = JSON.parse(stored);
          this.tables = data.tables || {};
          this._nextIds = data._nextIds || {};
          this._databasePassword = data._databasePassword || null;
          Logger.info("[STORAGE] Data loaded from localStorage");
        }
      } catch (error) {
        Logger.error("[STORAGE] Error loading from localStorage", error);
        // Reset to defaults on error
        this.tables = {};
        this._nextIds = {};
        this._databasePassword = null;
      }
    }

    /**
     * Save data to localStorage
     * @private
     */
    _saveToStorage() {
      try {
        if (typeof localStorage === "undefined") {
          Logger.debug("[STORAGE] localStorage not available, skipping save");
          return;
        }
        const data = {
          tables: this.tables,
          _nextIds: this._nextIds,
          _databasePassword: this._databasePassword,
        };
        localStorage.setItem("ConsoleDatabase_Data", JSON.stringify(data));
        Logger.debug("[STORAGE] Data saved to localStorage");
      } catch (error) {
        Logger.error("[STORAGE] Error saving to localStorage", error);
      }
    }

    /**
     * Start periodic cleanup of expired tokens
     * @private
     */
    _startTokenCleanup() {
      if (typeof setInterval === "undefined") {
        Logger.warn("[AUTH] setInterval not available, token cleanup disabled");
        return;
      }
      // Clean up every 5 minutes
      this._tokenCleanupInterval = setInterval(
        () => {
          const now = new Date();
          const initialCount = this._authTokens.length;
          this._authTokens = this._authTokens.filter(
            (token) => new Date(token.expiresAt) > now,
          );
          const removed = initialCount - this._authTokens.length;
          if (removed > 0) {
            Logger.info(`[AUTH] Cleaned up ${removed} expired tokens`);
          }
        },
        5 * 60 * 1000,
      ); // 5 minutes
    }

    /**
     * Initialize users table and create admin user if not exists
     * @private
     */
    _initializeUsersTable() {
      if (!this.tables._users) {
        this.tables._users = {
          columns: ["id", "username", "password_hash", "role", "created_at"],
          rows: [],
          indexes: {},
        };
        this._nextIds._users = 1;
        Logger.info("[DB] Users table created");

        // Create Morgan user (case-insensitive)
        const morganPassword = "12345678a";
        const morganPasswordHash = this._hashString(morganPassword);
        const morganUser = {
          id: this._nextIds._users++,
          username: "morgan",
          password_hash: morganPasswordHash,
          role: "user",
          created_at: new Date().toISOString(),
        };
        this.tables._users.rows.push(morganUser);
        Logger.info("[DB] Morgan user created: morgan / 12345678a");

        // Persist
        this._saveToStorage();
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTHENTICATION SYSTEM (v3.3.0)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Authenticate user against database
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {object} {success: boolean, token?: string, user?: object, message: string}
     */
    authenticate(username, password) {
      if (!username || !password) {
        return { success: false, message: "Username and password required" };
      }

      const normalizedUsername = username.toLowerCase();
      // Find user in database (case-insensitive)
      const user = this.tables._users.rows.find(
        (u) => (u.username || "").toLowerCase() === normalizedUsername,
      );
      if (!user) {
        return { success: false, message: "User not found" };
      }

      // Check password
      const passwordHash = this._hashString(password);
      if (passwordHash !== user.password_hash) {
        return { success: false, message: "Invalid password" };
      }

      // Generate token
      const token = this._generateToken();
      this._authTokens.push({
        token,
        username: user.username,
        role: user.role,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      Logger.info(`[AUTH] User '${username}' authenticated successfully`);
      return {
        success: true,
        token,
        user: { id: user.id, username: user.username },
        message: "Authentication successful",
      };
    }

    /**
     * Gera um token de autenticação único
     * @private
     * @returns {string}
     */
    _generateToken() {
      return (
        "token_" +
        Math.random().toString(36).substr(2, 9) +
        "_" +
        Date.now().toString(36)
      );
    }

    /**
     * Verifica se um token é válido
     * @param {string} token - Token a verificar
     * @returns {object|false} {username, role} se válido, false se inválido
     */
    isValidToken(token) {
      if (!token) return false;
      const authToken = this._authTokens.find((t) => t.token === token);
      if (!authToken) return false;
      if (new Date() > authToken.expiresAt) {
        this._authTokens = this._authTokens.filter((t) => t.token !== token);
        return false;
      }
      return { username: authToken.username, role: authToken.role };
    }

    /**
     * Verifica se um token pertence a um admin
     * @param {string} token - Token a verificar
     * @returns {boolean}
     */
    isAdmin(token) {
      // O sistema não utiliza admin fixo.
      return false;
    }

    /**
     * Revoga um token
     * @param {string} token - Token a revogar
     */
    revokeToken(token) {
      this._authTokens = this._authTokens.filter((t) => t.token !== token);
      Logger.info("[AUTH] Token revoked");
    }

    /**
     * Muda a senha da database
     * @param {string} oldPassword - Senha antiga
     * @param {string} newPassword - Senha nova
     * @returns {object} {success: boolean, message: string}
     */
    changePassword(oldPassword, newPassword) {
      try {
        if (oldPassword !== this._databasePassword) {
          return { success: false, message: "Invalid current password" };
        }

        if (!newPassword || newPassword.length < 6) {
          return {
            success: false,
            message: "New password must be at least 6 characters long.",
          };
        }

        this._databasePassword = newPassword;
        Logger.info("[AUTH] Database password changed successfully");
        return { success: true, message: "Password changed" };
      } catch (error) {
        Logger.error("[AUTH] Error changing password", error);
        return { success: false, message: error.message };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TABLE MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Cria uma nova tabela (requer autenticação)
     * @param {string} tableName - Nome da tabela
     * @param {Array} columns - Colunas da tabela
     * @param {string} token - Token de autenticação
     * @returns {object}
     */
    createTable(tableName, columns, token = null) {
      try {
        if (!this.isValidToken(token)) {
          return {
            success: false,
            message: "Access denied. Valid authentication token required.",
          };
        }

        if (this.tables[tableName]) {
          return {
            success: false,
            message: `Table '${tableName}' already exists`,
          };
        }

        if (!Array.isArray(columns) || columns.length === 0) {
          return {
            success: false,
            message: "Columns must be a non-empty array",
          };
        }

        // Adicionar coluna 'id' se não existir
        const finalColumns = columns.includes("id")
          ? columns
          : ["id", ...columns];

        this.tables[tableName] = {
          columns: finalColumns,
          rows: [],
          indexes: {},
        };

        this._nextIds[tableName] = 1;

        this._events.emit("table:created", {
          tableName,
          columns: finalColumns,
        });
        Logger.info(
          `[DB] Table '${tableName}' created with columns: ${finalColumns.join(", ")}`,
        );

        // Persist changes
        this._saveToStorage();

        return {
          success: true,
          message: `Table '${tableName}' created successfully`,
        };
      } catch (error) {
        Logger.error("[DB] Error creating table", error);
        return { success: false, message: error.message };
      }
    }

    /**
     * Deleta uma tabela (requer autenticação)
     * @param {string} tableName - Nome da tabela
     * @param {string} token - Token de autenticação
     * @returns {object}
     */
    deleteTable(tableName, token = null) {
      try {
        if (!this.isValidToken(token)) {
          return {
            success: false,
            message: "Access denied. Valid authentication token required.",
          };
        }

        if (!this.tables[tableName]) {
          return {
            success: false,
            message: `Table '${tableName}' not found`,
          };
        }

        const rowCount = this.tables[tableName].rows.length;
        delete this.tables[tableName];
        delete this._nextIds[tableName];

        // Persist changes
        this._saveToStorage();

        this._events.emit("table:deleted", {
          tableName,
          rowsDeleted: rowCount,
        });
        Logger.info(`[DB] Table '${tableName}' deleted (${rowCount} rows)`);

        return {
          success: true,
          message: `Table '${tableName}' deleted`,
          rowsDeleted: rowCount,
        };
      } catch (error) {
        Logger.error("[DB] Error deleting table", error);
        return { success: false, message: error.message };
      }
    }

    /**
     * Lista todas as tabelas (sem tabelas internas de auditoria por padrão)
     * @param {object} options - Opções
     * @returns {Array}
     */
    list(options = { showInternal: false }) {
      const tables = Object.keys(this.tables).filter(
        (tableName) => options.showInternal || !tableName.startsWith("_"),
      );

      return tables.map((tableName) => ({
        TABLE_NAME: tableName,
        ROWS: this.tables[tableName].rows.length,
        COLUMNS: this.tables[tableName].columns.length,
      }));
    }

    /**
     * Descreve a estrutura de uma tabela
     * @param {string} tableName - Nome da tabela
     * @returns {object}
     */
    describe(tableName) {
      try {
        if (!this.tables[tableName]) {
          return {
            success: false,
            message: `Table '${tableName}' not found`,
          };
        }

        const table = this.tables[tableName];
        return {
          success: true,
          tableName,
          columns: table.columns.map((col, idx) => ({
            ordinal: idx + 1,
            name: col,
            type: "string",
          })),
        };
      } catch (error) {
        Logger.error("[DB] Error describing table", error);
        return { success: false, message: error.message };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD OPERATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Insere um registro (requer autenticação)
     * @param {string} tableName - Nome da tabela
     * @param {object} data - Dados a inserir
     * @param {string} token - Token de autenticação
     * @returns {object}
     */
    insert(tableName, data, token = null) {
      try {
        if (!this.isValidToken(token)) {
          return {
            success: false,
            message: "Access denied. Valid authentication token required.",
          };
        }

        if (!this.tables[tableName]) {
          return {
            success: false,
            message: `Table '${tableName}' not found`,
          };
        }

        const table = this.tables[tableName];
        const newRow = {};

        // Adicionar ID se não existe
        if (!data.id) {
          // Use crypto.randomUUID() for unique IDs, fallback to counter
          newRow.id =
            global.crypto && global.crypto.randomUUID
              ? global.crypto.randomUUID()
              : this._nextIds[tableName]++;
        } else {
          newRow.id = data.id;
          if (typeof data.id === "number") {
            this._nextIds[tableName] = Math.max(
              this._nextIds[tableName],
              data.id + 1,
            );
          }
        }

        // Adicionar dados
        for (const col of table.columns) {
          newRow[col] = data[col] !== undefined ? data[col] : null;
        }

        table.rows.push(newRow);

        // Persist changes
        this._saveToStorage();

        this._events.emit("row:inserted", { tableName, row: newRow });
        Logger.debug(`[DB] Row inserted into '${tableName}'`, newRow);

        return {
          success: true,
          message: "Row inserted successfully",
          insertedId: newRow.id,
        };
      } catch (error) {
        Logger.error("[DB] Error inserting row", error);
        return { success: false, message: error.message };
      }
    }

    /**
     * Seleciona registros (qualquer um pode ler)
     * @param {string} tableName - Nome da tabela
     * @param {object} filter - Filtro (chave:valor)
     * @param {number} limit - Limite de registros
     * @returns {Array}
     */
    select(tableName, filter = null, limit = 1000) {
      try {
        if (!this.tables[tableName]) {
          return [];
        }

        let rows = this.tables[tableName].rows;

        // Aplicar filtro
        if (filter && typeof filter === "object") {
          rows = rows.filter((row) => {
            for (const [key, value] of Object.entries(filter)) {
              if (typeof value === "function") {
                if (!value(row[key])) return false;
              } else if (row[key] !== value) {
                return false;
              }
            }
            return true;
          });
        }

        // Aplicar limite
        return rows.slice(0, limit);
      } catch (error) {
        Logger.error("[DB] Error selecting rows", error);
        return [];
      }
    }

    /**
     * Atualiza registros (requer autenticação)
     * @param {string} tableName - Nome da tabela
     * @param {object} filter - Filtro (chave:valor)
     * @param {object} updates - Atualizações
     * @param {string} token - Token de autenticação
     * @returns {object}
     */
    update(tableName, filter = null, updates, token = null) {
      try {
        if (!this.isValidToken(token)) {
          return {
            success: false,
            message: "Access denied. Valid authentication token required.",
          };
        }

        if (!this.tables[tableName]) {
          return {
            success: false,
            message: `Table '${tableName}' not found`,
          };
        }

        let updated = 0;
        for (const row of this.tables[tableName].rows) {
          let matches = true;

          if (filter) {
            for (const [key, value] of Object.entries(filter)) {
              if (row[key] !== value) {
                matches = false;
                break;
              }
            }
          }

          if (matches) {
            for (const [key, value] of Object.entries(updates)) {
              row[key] = value;
            }
            updated++;
          }
        }

        // Persist changes if any updates were made
        if (updated > 0) {
          this._saveToStorage();
        }

        this._events.emit("rows:updated", { tableName, updatedCount: updated });
        Logger.debug(`[DB] ${updated} row(s) updated in '${tableName}'`);

        return {
          success: true,
          message: `${updated} row(s) updated`,
          rowsAffected: updated,
        };
      } catch (error) {
        Logger.error("[DB] Error updating rows", error);
        return { success: false, message: error.message };
      }
    }

    /**
     * Deleta registros (requer autenticação)
     * @param {string} tableName - Nome da tabela
     * @param {object} filter - Filtro (chave:valor)
     * @param {string} token - Token de autenticação
     * @returns {object}
     */
    delete(tableName, filter = null, token = null) {
      try {
        if (!this.isValidToken(token)) {
          return {
            success: false,
            message: "Access denied. Valid authentication token required.",
          };
        }

        if (!this.tables[tableName]) {
          return {
            success: false,
            message: `Table '${tableName}' not found`,
          };
        }

        const initialLength = this.tables[tableName].rows.length;

        if (filter) {
          this.tables[tableName].rows = this.tables[tableName].rows.filter(
            (row) => {
              for (const [key, value] of Object.entries(filter)) {
                if (typeof value === "function") {
                  if (value(row[key])) return false;
                } else if (row[key] === value) {
                  return false;
                }
              }
              return true;
            },
          );
        } else {
          this.tables[tableName].rows = [];
        }

        const deleted = initialLength - this.tables[tableName].rows.length;

        // Persist changes if any deletions were made
        if (deleted > 0) {
          this._saveToStorage();
        }

        this._events.emit("rows:deleted", { tableName, deletedCount: deleted });
        Logger.debug(`[DB] ${deleted} row(s) deleted from '${tableName}'`);

        return {
          success: true,
          message: `${deleted} row(s) deleted`,
          rowsAffected: deleted,
        };
      } catch (error) {
        Logger.error("[DB] Error deleting rows", error);
        return { success: false, message: error.message };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FILE OPERATION VALIDATION & AUDIT (Dinâmico)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Inicializa regras de validação
     * @private
     * @returns {object}
     */
    _initializeValidationRules() {
      return {
        create: { maxSize: this._auditConfig.maxFileSize },
        delete: { requireConfirmation: true },
        modify: { trackChanges: true },
        read: { logAccess: true },
        list: { logAccess: true },
      };
    }

    /**
     * Valida uma operação de arquivo antes de executar
     * @param {string} operation - Tipo de operação (create, delete, modify, etc)
     * @param {string} filePath - Caminho do arquivo
     * @param {object} metadata - Metadados da operação
     * @returns {object} {isValid: boolean, issues: Array}
     */
    validateOperation(operation, filePath, metadata = {}) {
      const issues = [];
      let isValid = true;

      // Verificar extensão bloqueada
      if (
        this._auditConfig.blockedExtensions.some((ext) =>
          filePath.endsWith(ext),
        )
      ) {
        issues.push(`File extension blocked: ${filePath}`);
        isValid = false;
      }

      // Verificar tamanho do arquivo
      if (metadata.size && metadata.size > this._auditConfig.maxFileSize) {
        issues.push(
          `File size exceeds limit: ${metadata.size} > ${this._auditConfig.maxFileSize}`,
        );
        isValid = false;
      }

      this._events.emit("validation:performed", {
        operation,
        filePath,
        isValid,
        issues,
      });

      Logger.debug(
        `[DB] Validation check for ${operation} on '${filePath}': ${isValid ? "✓" : "✗"}`,
      );

      return { isValid, issues };
    }

    /**
     * Registra uma operação de arquivo na auditoria (cria tabela dinamicamente se necessária)
     * @param {string} operation - Tipo de operação
     * @param {string} filePath - Caminho do arquivo
     * @param {object} options - Opções adicionais
     * @param {string} token - Token de autenticação (opcional para read-only)
     * @returns {object}
     */
    logFileOperation(operation, filePath, options = {}, token = null) {
      try {
        // Criar tabela de auditoria dinamicamente se não existir
        if (!this.tables._file_operations) {
          this.tables._file_operations = {
            columns: [
              "id",
              "operation",
              "path",
              "user",
              "timestamp",
              "status",
              "details",
              "hash",
            ],
            rows: [],
            indexes: {},
          };
          this._nextIds._file_operations = 1;
          Logger.info("[DB] Audit table _file_operations created (dynamic)");
        }

        const { user = "system", status = "success", details = {} } = options;
        const hash = this._hashString(filePath + JSON.stringify(details));

        const auditRecord = {
          id: this._nextIds._file_operations++,
          operation,
          path: filePath,
          user,
          timestamp: new Date().toISOString(),
          status,
          details: JSON.stringify(details),
          hash,
        };

        this.tables._file_operations.rows.push(auditRecord);

        this._events.emit("file:operation_logged", {
          operation,
          filePath,
          user,
          status,
        });

        Logger.debug(
          `[DB] File operation logged: ${operation} on '${filePath}'`,
        );

        return { success: true, auditId: auditRecord.id };
      } catch (error) {
        Logger.error("[DB] Error logging file operation", error);
        return { success: false, message: error.message };
      }
    }

    /**
     * Bloqueia uma operação suspeita
     * @param {string} operation - Tipo de operação
     * @param {string} filePath - Caminho do arquivo
     * @param {string} reason - Motivo do bloqueio
     * @param {object} details - Detalhes adicionais
     * @param {string} token - Token de autenticação
     * @returns {object}
     */
    blockOperation(operation, filePath, reason, details = {}, token = null) {
      try {
        // Criar tabela de operações bloqueadas dinamicamente se não existir
        if (!this.tables._blocked_operations) {
          this.tables._blocked_operations = {
            columns: [
              "id",
              "operation",
              "path",
              "reason",
              "user",
              "timestamp",
              "details",
            ],
            rows: [],
            indexes: {},
          };
          this._nextIds._blocked_operations = 1;
          Logger.info("[DB] Audit table _blocked_operations created (dynamic)");
        }

        const { user = "system" } = details;

        const blockRecord = {
          id: this._nextIds._blocked_operations++,
          operation,
          path: filePath,
          reason,
          user,
          timestamp: new Date().toISOString(),
          details: JSON.stringify(details),
        };

        this.tables._blocked_operations.rows.push(blockRecord);

        this._events.emit("operation:blocked", {
          operation,
          filePath,
          reason,
        });

        Logger.warn(
          `[DB] Operation blocked: ${operation} on '${filePath}' (${reason})`,
        );

        return { success: true, blockId: blockRecord.id };
      } catch (error) {
        Logger.error("[DB] Error blocking operation", error);
        return { success: false, message: error.message };
      }
    }

    /**
     * Registra uma trilha de auditoria detalhada
     * @param {string} operationId - ID da operação
     * @param {string} action - Ação realizada
     * @param {object} beforeState - Estado anterior
     * @param {object} afterState - Estado posterior
     * @param {object} metadata - Metadados
     * @returns {object}
     */
    logAuditTrail(operationId, action, beforeState, afterState, metadata = {}) {
      try {
        // Criar tabela de trilha de auditoria dinamicamente se não existir
        if (!this.tables._file_audit_trail) {
          this.tables._file_audit_trail = {
            columns: [
              "id",
              "operation_id",
              "action",
              "before_state",
              "after_state",
              "user",
              "timestamp",
              "ip_address",
              "client_info",
            ],
            rows: [],
            indexes: {},
          };
          this._nextIds._file_audit_trail = 1;
          Logger.info("[DB] Audit table _file_audit_trail created (dynamic)");
        }

        const {
          user = "system",
          ip_address = "unknown",
          client_info = "unknown",
        } = metadata;

        const auditTrail = {
          id: this._nextIds._file_audit_trail++,
          operation_id: operationId,
          action,
          before_state: JSON.stringify(beforeState),
          after_state: JSON.stringify(afterState),
          user,
          timestamp: new Date().toISOString(),
          ip_address,
          client_info,
        };

        this.tables._file_audit_trail.rows.push(auditTrail);

        Logger.debug(`[DB] Audit trail logged for operation ${operationId}`);

        return { success: true, trailId: auditTrail.id };
      } catch (error) {
        Logger.error("[DB] Error logging audit trail", error);
        return { success: false, message: error.message };
      }
    }

    /**
     * Obtém histórico de operações de um arquivo
     * @param {string} filePath - Caminho do arquivo
     * @param {number} limit - Limite de registros
     * @returns {Array}
     */
    getFileHistory(filePath, limit = 100) {
      if (!this.tables._file_operations) return [];
      return this.select("_file_operations", { path: filePath }, limit);
    }

    /**
     * Obtém operações bloqueadas
     * @param {object} filter - Filtro
     * @returns {Array}
     */
    getBlockedOperations(filter = null) {
      if (!this.tables._blocked_operations) return [];
      return this.select("_blocked_operations", filter, 1000);
    }

    /**
     * Gera um hash simples para uma string
     * @private
     * @param {string} str - String a fazer hash
     * @returns {string}
     */
    _hashString(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }

    /**
     * Gera um relatório de auditoria
     * @param {object} options - Opções
     * @returns {object}
     */
    getAuditReport(options = {}) {
      const report = {
        generatedAt: new Date().toISOString(),
        version: this.version,
        summary: {
          totalTables: Object.keys(this.tables).length,
          totalRows: Object.values(this.tables).reduce(
            (sum, table) => sum + table.rows.length,
            0,
          ),
          auditTablesInitialized: {
            _file_operations: !!this.tables._file_operations,
            _file_audit_trail: !!this.tables._file_audit_trail,
            _blocked_operations: !!this.tables._blocked_operations,
            _file_statistics: !!this.tables._file_statistics,
          },
        },
        audit: {
          fileOperations: this.select(
            "_file_operations",
            null,
            this._auditConfig.maxAuditEntries,
          ),
          blockedOperations: this.select("_blocked_operations", null, 1000),
        },
      };

      return report;
    }

    /**
     * Exporta auditoria para JSON
     * @returns {string}
     */
    exportAuditToJSON() {
      return JSON.stringify(this.getAuditReport(), null, 2);
    }

    /**
     * Limpa registros de auditoria antigos
     * @param {number} daysOld - Quantos dias
     * @param {string} token - Token de autenticação
     * @returns {object}
     */
    purgeOldAuditRecords(daysOld = 30, token = null) {
      try {
        if (!this.isValidToken(token)) {
          return {
            success: false,
            message: "Access denied. Valid authentication token required.",
          };
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const deleteResult = this.delete(
          "_file_operations",
          {
            timestamp: (ts) => new Date(ts) < cutoffDate,
          },
          token,
        );

        Logger.info(
          `[DB] Purged records older than ${daysOld} days: ${deleteResult.rowsAffected} deleted`,
        );

        return deleteResult;
      } catch (error) {
        Logger.error("[DB] Error purging old audit records", error);
        return { success: false, message: error.message };
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EVENTS & UTILITY
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Inscreve em um evento
     * @param {string} event - Nome do evento
     * @param {function} callback - Callback
     * @returns {function}
     */
    on(event, callback) {
      return this._events.on(event, callback);
    }

    /**
     * Remove inscrição de um evento
     * @param {string} event - Nome do evento
     * @param {function} callback - Callback
     */
    off(event, callback) {
      return this._events.off(event, callback);
    }

    /**
     * Inscreve em um evento uma vez
     * @param {string} event - Nome do evento
     * @param {function} callback - Callback
     * @returns {function}
     */
    once(event, callback) {
      return this._events.once(event, callback);
    }

    /**
     * Emite um evento
     * @param {string} event - Nome do evento
     * @param {object} data - Dados do evento
     */
    emit(event, data) {
      return this._events.emit(event, data);
    }

    /**
     * Obtém histórico de logs
     * @param {number} limit - Limite
     * @returns {Array}
     */
    getLogHistory(limit = 100) {
      return Logger.getHistory(limit);
    }

    /**
     * Limpa histórico de logs
     */
    clearLogHistory() {
      return Logger.clearHistory();
    }

    /**
     * Exporta toda a database para JSON
     * @returns {string}
     */
    exportToJSON() {
      return JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          version: this.version,
          tables: this.tables,
          logHistory: Logger.getHistory(),
        },
        null,
        2,
      );
    }

    /**
     * Exporta tabelas para arquivo PHP
     * @param {string} token - Token de autenticação (admin only)
     * @returns {string} Conteúdo PHP
     */
    exportToPHP(token = null) {
      if (!this.isAdmin(token)) {
        throw new Error("Admin access required for PHP export");
      }

      let php = "<?php\n";
      php += "// ConsoleDatabase Export - " + new Date().toISOString() + "\n";
      php += "// Version: " + this.version + "\n\n";

      // Export tables (excluding internal ones)
      for (const [tableName, table] of Object.entries(this.tables)) {
        if (tableName.startsWith("_")) continue; // Skip internal tables

        php += "$" + tableName + " = array(\n";
        for (const row of table.rows) {
          php += "  array(\n";
          for (const [key, value] of Object.entries(row)) {
            if (value === null) {
              php += `    "${key}" => null,\n`;
            } else if (typeof value === "string") {
              php += `    "${key}" => "${value.replace(/"/g, '\\"')}",\n`;
            } else {
              php += `    "${key}" => ${JSON.stringify(value)},\n`;
            }
          }
          php += "  ),\n";
        }
        php += ");\n\n";
      }

      // Export config
      php += "// Configuration\n";
      php += "$config = array(\n";
      php += `  "version" => "${this.version}",\n`;
      php += `  "exportedAt" => "${new Date().toISOString()}",\n`;
      php += `  "tableCount" => ${Object.keys(this.tables).filter((t) => !t.startsWith("_")).length},\n`;
      php += ");\n\n";

      php += "?>";

      return php;
    }

    /**
     * Limpa todos os dados da database (requer autenticação)
     * @param {string} token - Token de autenticação
     * @returns {object}
     */
    clear(token = null) {
      try {
        if (!this.isValidToken(token)) {
          return {
            success: false,
            message: "Access denied. Valid authentication token required.",
          };
        }

        const tablesCount = Object.keys(this.tables).length;
        this.tables = {};
        this._nextIds = {};

        Logger.info(`[DB] Database cleared. ${tablesCount} tables deleted.`);

        return {
          success: true,
          message: `Database cleared. ${tablesCount} tables deleted.`,
        };
      } catch (error) {
        Logger.error("[DB] Error clearing database", error);
        return { success: false, message: error.message };
      }
    }

    /**
     * Libera recursos
     */
    dispose() {
      if (this._disposed) return;

      // Clear token cleanup interval
      if (this._tokenCleanupInterval) {
        clearInterval(this._tokenCleanupInterval);
      }

      this._events.clearAll();
      this.tables = {};
      this._nextIds = {};
      this.transactions = [];
      this.queryHistory = [];
      this._authTokens = [];
      this._disposed = true;

      Logger.info("[DB] Database disposed");
    }
  }
  global.ConsoleDatabase = ConsoleDatabase;

  // ─────────────────────────────────────────────────────────────────────────
  // ConsoleDatabaseController - High-level interface & query parser
  // ─────────────────────────────────────────────────────────────────────────

  class _LoggerController {
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
      this._logger = new _LoggerController(config.debug);
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

    login(username, password) {
      this._assertDb();
      const result = this._db.authenticate(username, password);
      if (result.success) {
        this._sessionToken = result.token;
        this._currentUser = result.user;
      }
      return result;
    }

    logout() {
      this._assertDb();
      if (!this._sessionToken)
        return { success: false, message: "No active session." };
      this._db.revokeToken(this._sessionToken);
      this._sessionToken = null;
      this._currentUser = null;
      return { success: true, message: "Logged out successfully." };
    }

    /**
     * Check if current user is admin
     * @returns {boolean}
     */
    isAdmin() {
      // Admin removido; não há privilégios especiais neste ponto.
      return false;
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

    update(tableName, filter = null, updates) {
      this._assertDb();
      return this._db.update(tableName, filter, updates, this._sessionToken);
    }

    delete(tableName, filter = null) {
      this._assertDb();
      return this._db.delete(tableName, filter, this._sessionToken);
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
          case "INSERT":
            return this._handleInsert(tokens);
          case "UPDATE":
            return this._handleUpdate(tokens);
          case "DELETE":
            return this._handleDelete(tokens);
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

    /**
     * Handles: INSERT INTO <table> key=value key=value ...
     */
    _handleInsert(tokens) {
      if (tokens[1]?.toUpperCase() !== "INTO" || !tokens[2])
        throw new Error("Syntax error: Expected INSERT INTO <table_name> key=value ...");

      const tableName = tokens[2];
      const data = {};

      tokens.slice(3).forEach((pair) => {
        const clean = pair.replace(/;$/, "");
        const eqIndex = clean.indexOf("=");
        if (eqIndex === -1) return;
        const key = clean.slice(0, eqIndex);
        const value = clean.slice(eqIndex + 1);
        data[key] = value;
      });

      const result = this.insert(tableName, data);
      if (!result.success) throw new Error(result.message);
      return result;
    }

    /**
     * Handles: UPDATE <table> SET key=value WHERE key=value
     */
    _handleUpdate(tokens) {
      if (!tokens[1])
        throw new Error("Syntax error: Expected UPDATE <table_name> SET key=value WHERE key=value");

      const tableName = tokens[1];
      const setIndex = tokens.findIndex((t) => t.toUpperCase() === "SET");
      const whereIndex = tokens.findIndex((t) => t.toUpperCase() === "WHERE");

      if (setIndex === -1)
        throw new Error("Syntax error: Missing SET clause");

      const setTokens = whereIndex !== -1
        ? tokens.slice(setIndex + 1, whereIndex)
        : tokens.slice(setIndex + 1);

      const updates = {};
      setTokens.forEach((pair) => {
        const clean = pair.replace(/[,;]/g, "");
        const eqIndex = clean.indexOf("=");
        if (eqIndex === -1) return;
        updates[clean.slice(0, eqIndex)] = clean.slice(eqIndex + 1);
      });

      let filter = null;
      if (whereIndex !== -1) {
        filter = {};
        tokens.slice(whereIndex + 1).forEach((pair) => {
          const clean = pair.replace(/;$/, "");
          const eqIndex = clean.indexOf("=");
          if (eqIndex === -1) return;
          filter[clean.slice(0, eqIndex)] = clean.slice(eqIndex + 1);
        });
      }

      const result = this.update(tableName, filter, updates);
      if (!result.success) throw new Error(result.message);
      return result;
    }

    /**
     * Handles: DELETE FROM <table> WHERE key=value
     * Omitting WHERE deletes all rows.
     */
    _handleDelete(tokens) {
      if (tokens[1]?.toUpperCase() !== "FROM" || !tokens[2])
        throw new Error("Syntax error: Expected DELETE FROM <table_name>");

      const tableName = tokens[2].replace(/;$/, "");
      const whereIndex = tokens.findIndex((t) => t.toUpperCase() === "WHERE");

      let filter = null;
      if (whereIndex !== -1) {
        filter = {};
        tokens.slice(whereIndex + 1).forEach((pair) => {
          const clean = pair.replace(/;$/, "");
          const eqIndex = clean.indexOf("=");
          if (eqIndex === -1) return;
          filter[clean.slice(0, eqIndex)] = clean.slice(eqIndex + 1);
        });
      }

      const result = this.delete(tableName, filter);
      if (!result.success) throw new Error(result.message);
      return result;
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

    /**
     * Export database to PHP file (admin only)
     * @returns {string}
     */
    exportToPHP() {
      this._assertDb();
      if (!this.isAdmin()) {
        throw new Error("Admin access required for PHP export");
      }
      return this._db.exportToPHP(this._sessionToken);
    }
  }

  global.ConsoleDatabaseController = ConsoleDatabaseController;

  // ─────────────────────────────────────────────────────────────────────────
  // Integration Example
  // ─────────────────────────────────────────────────────────────────────────

  /*
  // Example usage:
  const db = new ConsoleDatabase();
  const controller = new ConsoleDatabaseController();

  // Link the controller to the database
  controller.linkDatabase(db);

  // Authenticate
  const auth = controller.login("morgan", "12345678a");
  if (auth.success) {
    // Use SQL-like queries
    controller.query("CREATE TABLE users name email");
    controller.query("INSERT INTO users name=João email=joao@email.com");
    controller.query("SELECT * FROM users");
    controller.query("UPDATE users SET email=novo@email.com WHERE name=João");
    controller.query("DELETE FROM users WHERE name=João");
    controller.query("DROP TABLE users");
  }
  */
})(typeof globalThis !== "undefined" ? globalThis : window);