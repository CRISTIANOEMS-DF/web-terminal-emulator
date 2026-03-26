/**
 * @file        console.history.js
 * @description ConsoleHistory — Advanced Command History Management System
 *
 * Manages the complete lifecycle of command history:
 * - In-memory storage with efficient querying
 * - LocalStorage persistence
 * - Search and filtering capabilities
 * - Statistics and analytics
 * - Integration with ConsoleSettings (CONFIG)
 * - Real-time sync with API (Bridge & WebSocket)
 * - Versioning and timestamping
 * - Import/Export functionality
 *
 * Integrates with:
 * - console.engine.js (receives executed commands)
 * - console.settings.js (CONFIG - persistence settings)
 * - console.bridge.js (API - HTTP endpoint)
 * - console.websocket.js (API - real-time sync)
 *
 * @version 3.0.0
 * @license MIT
 */

(function (global) {
  "use strict";

  if (typeof global.ConsoleHistory !== "undefined") {
    console.warn(
      "[ConsoleHistory] Already registered — skipping re-definition.",
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
        console.log(`%c[ConsoleHistory] ${message}`, "color: #00ff00", data);
    }

    info(message, data) {
      this._store("INFO", message, data);
      console.log(
        `%c[ConsoleHistory] ℹ ${message}`,
        "color: #00aaff",
        data || "",
      );
    }

    warn(message, data) {
      this._store("WARN", message, data);
      console.warn(
        `%c[ConsoleHistory] ⚠ ${message}`,
        "color: #ffaa00",
        data || "",
      );
    }

    error(message, data) {
      this._store("ERROR", message, data);
      console.error(`%c[ConsoleHistory] ✗ ${message}`, "color: #ff0000", data);
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
  // History Entry Class
  // ═══════════════════════════════════════════════════════════════════════════

  class _HistoryEntry {
    constructor(command, index) {
      this.id = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.command = command;
      this.index = index;
      this.timestamp = Date.now();
      this.executed = true;
      this.executionTime = 0;
      this.resultSize = 0;
      this.resultType = null;
      this.metadata = {};
      this.tags = [];
      this.favorite = false;
      this.notes = "";
    }

    toJSON() {
      return {
        id: this.id,
        command: this.command,
        index: this.index,
        timestamp: this.timestamp,
        executed: this.executed,
        executionTime: this.executionTime,
        resultSize: this.resultSize,
        resultType: this.resultType,
        metadata: this.metadata,
        tags: this.tags,
        favorite: this.favorite,
        notes: this.notes,
      };
    }

    static fromJSON(data) {
      const entry = new _HistoryEntry(data.command, data.index);
      entry.id = data.id;
      entry.timestamp = data.timestamp;
      entry.executed = data.executed;
      entry.executionTime = data.executionTime;
      entry.resultSize = data.resultSize;
      entry.resultType = data.resultType;
      entry.metadata = data.metadata || {};
      entry.tags = data.tags || [];
      entry.favorite = data.favorite || false;
      entry.notes = data.notes || "";
      return entry;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // History Storage Manager
  // ═══════════════════════════════════════════════════════════════════════════

  class _StorageManager {
    constructor(config = {}) {
      this.config = config;
      this.key = config.storageKey || "console_history";
      this.maxEntries = config.maxEntries || 1000;
      this.persistent = config.persistent !== false;
      this.useLocalStorage = this._checkLocalStorage();
    }

    _checkLocalStorage() {
      try {
        const test = "__storage_test__";
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch {
        return false;
      }
    }

    save(entries) {
      if (!this.persistent || !this.useLocalStorage) return false;

      try {
        const data = entries.map((e) => e.toJSON());
        const json = JSON.stringify(data);
        localStorage.setItem(this.key, json);
        return true;
      } catch (error) {
        console.error("[ConsoleHistory] Storage save failed:", error);
        return false;
      }
    }

    load() {
      if (!this.useLocalStorage) return [];

      try {
        const json = localStorage.getItem(this.key);
        if (!json) return [];
        const data = JSON.parse(json);
        return data.map((d) => _HistoryEntry.fromJSON(d));
      } catch (error) {
        console.error("[ConsoleHistory] Storage load failed:", error);
        return [];
      }
    }

    clear() {
      if (this.useLocalStorage) {
        localStorage.removeItem(this.key);
      }
    }

    getStats() {
      return {
        persistent: this.persistent,
        available: this.useLocalStorage,
        key: this.key,
        maxEntries: this.maxEntries,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // History Search Engine
  // ═══════════════════════════════════════════════════════════════════════════

  class _SearchEngine {
    constructor(entries = []) {
      this.entries = entries;
      this.index = new Map();
      this._buildIndex();
    }

    _buildIndex() {
      this.index.clear();
      this.entries.forEach((entry, idx) => {
        const tokens = this._tokenize(entry.command);
        tokens.forEach((token) => {
          if (!this.index.has(token)) {
            this.index.set(token, []);
          }
          this.index.get(token).push(idx);
        });
      });
    }

    _tokenize(command) {
      return command
        .toLowerCase()
        .split(/[\s\-_\|]+/)
        .filter((t) => t.length > 0);
    }

    search(query, limit = 50) {
      const queryTokens = this._tokenize(query);
      if (queryTokens.length === 0) return [];

      let resultIndexes = null;

      for (const token of queryTokens) {
        const matches = this.index.get(token) || [];
        if (resultIndexes === null) {
          resultIndexes = new Set(matches);
        } else {
          resultIndexes = new Set(
            [...resultIndexes].filter((i) => matches.includes(i)),
          );
        }
      }

      if (resultIndexes === null) return [];

      return Array.from(resultIndexes)
        .map((idx) => ({
          entry: this.entries[idx],
          score: this._calculateScore(this.entries[idx].command, query),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((r) => r.entry);
    }

    _calculateScore(command, query) {
      let score = 0;
      const lowerCommand = command.toLowerCase();
      const lowerQuery = query.toLowerCase();

      if (lowerCommand === lowerQuery) score += 100;
      if (lowerCommand.startsWith(lowerQuery)) score += 50;
      if (lowerCommand.includes(lowerQuery)) score += 25;

      const exactTokens = this._tokenize(lowerCommand).filter((t) =>
        this._tokenize(lowerQuery).includes(t),
      );
      score += exactTokens.length * 10;

      return score;
    }

    filter(predicate) {
      return this.entries.filter(predicate);
    }

    update(entries) {
      this.entries = entries;
      this._buildIndex();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // History Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  class _Analytics {
    constructor(entries = []) {
      this.entries = entries;
    }

    getStats() {
      if (this.entries.length === 0) {
        return {
          total: 0,
          unique: 0,
          executionTime: { avg: 0, max: 0, min: 0 },
          resultSize: { avg: 0, max: 0, min: 0 },
          mostUsed: [],
          timeRange: { oldest: null, newest: null },
        };
      }

      const commands = this.entries.map((e) => e.command);
      const uniqueCommands = new Set(commands);

      const executionTimes = this.entries
        .map((e) => e.executionTime)
        .filter((t) => t > 0);
      const sizes = this.entries.map((e) => e.resultSize).filter((s) => s > 0);

      const commandFreq = new Map();
      commands.forEach((cmd) => {
        commandFreq.set(cmd, (commandFreq.get(cmd) || 0) + 1);
      });

      const mostUsed = Array.from(commandFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([cmd, count]) => ({ command: cmd, count }));

      return {
        total: this.entries.length,
        unique: uniqueCommands.size,
        executionTime: {
          avg:
            executionTimes.length > 0
              ? executionTimes.reduce((a, b) => a + b) / executionTimes.length
              : 0,
          max: executionTimes.length > 0 ? Math.max(...executionTimes) : 0,
          min: executionTimes.length > 0 ? Math.min(...executionTimes) : 0,
        },
        resultSize: {
          avg:
            sizes.length > 0 ? sizes.reduce((a, b) => a + b) / sizes.length : 0,
          max: sizes.length > 0 ? Math.max(...sizes) : 0,
          min: sizes.length > 0 ? Math.min(...sizes) : 0,
        },
        mostUsed,
        timeRange: {
          oldest:
            this.entries.length > 0
              ? new Date(this.entries[0].timestamp)
              : null,
          newest:
            this.entries.length > 0
              ? new Date(this.entries[this.entries.length - 1].timestamp)
              : null,
        },
      };
    }

    getCommandFrequency() {
      const freq = new Map();
      this.entries.forEach((entry) => {
        const cmd = entry.command.split(" ")[0];
        freq.set(cmd, (freq.get(cmd) || 0) + 1);
      });
      return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
    }

    getExecutionTimeStats() {
      const times = this.entries.map((e) => ({
        command: e.command,
        time: e.executionTime,
        timestamp: e.timestamp,
      }));
      return times.sort((a, b) => b.time - a.time);
    }

    getTimelineData(bucketSize = 3600000) {
      const buckets = new Map();
      this.entries.forEach((entry) => {
        const bucket = Math.floor(entry.timestamp / bucketSize) * bucketSize;
        if (!buckets.has(bucket)) {
          buckets.set(bucket, []);
        }
        buckets.get(bucket).push(entry);
      });

      return Array.from(buckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([timestamp, entries]) => ({
          timestamp,
          count: entries.length,
          uniqueCommands: new Set(entries.map((e) => e.command)).size,
        }));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Import/Export Manager
  // ═══════════════════════════════════════════════════════════════════════════

  class _ImportExportManager {
    static export(entries, format = "json") {
      if (format === "json") {
        return JSON.stringify(
          entries.map((e) => e.toJSON()),
          null,
          2,
        );
      } else if (format === "csv") {
        let csv = "ID,Timestamp,Command,ExecutionTime,Tags,Notes\n";
        entries.forEach((entry) => {
          const tags = entry.tags.join("|");
          const notes = (entry.notes || "").replace(/"/g, '""');
          csv += `"${entry.id}","${new Date(entry.timestamp).toISOString()}","${entry.command.replace(/"/g, '""')}","${entry.executionTime}","${tags}","${notes}"\n`;
        });
        return csv;
      } else if (format === "text") {
        return entries.map((e) => e.command).join("\n");
      }
      return "";
    }

    static import(data, format = "json") {
      try {
        if (format === "json") {
          const parsed = JSON.parse(data);
          return Array.isArray(parsed)
            ? parsed.map((d) => _HistoryEntry.fromJSON(d))
            : [];
        } else if (format === "text") {
          const lines = data.split("\n").filter((l) => l.trim());
          return lines.map((cmd, idx) => new _HistoryEntry(cmd.trim(), idx));
        }
      } catch (error) {
        console.error("[ConsoleHistory] Import failed:", error);
      }
      return [];
    }

    static backup(entries) {
      const timestamp = new Date().toISOString();
      return {
        version: "3.0.0",
        timestamp,
        count: entries.length,
        data: entries.map((e) => e.toJSON()),
      };
    }

    static restore(backup) {
      if (
        !backup ||
        !backup.data ||
        !Array.isArray(backup.data) ||
        backup.version !== "3.0.0"
      ) {
        return [];
      }
      return backup.data.map((d) => _HistoryEntry.fromJSON(d));
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
          console.error("[ConsoleHistory] Event callback error:", error);
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
  // Main ConsoleHistory Class
  // ═══════════════════════════════════════════════════════════════════════════

  class ConsoleHistory {
    constructor(config = {}) {
      this.config = Object.freeze(config);
      this.version = "3.0.0";

      // Core storage
      this._entries = [];
      this._currentIndex = -1;
      this._disposed = false;

      // Components
      this._logger = new _Logger(config.debug);
      this._storage = new _StorageManager(config);
      this._search = new _SearchEngine([]);
      this._analytics = new _Analytics([]);
      this._events = new _EventEmitter();

      // Module references
      this._settings = null;
      this._bridge = null;
      this._websocket = null;
      this._engine = null;

      // Load initial history
      this._loadHistory();

      this._logger.info("Instantiated (v3.0.0)");
    }

    // ── Public API: Core Operations ──────────────────────────────────────

    /**
     * Add a command to history
     */
    add(command, metadata = {}) {
      if (this._disposed) return null;
      if (typeof command !== "string" || command.trim() === "") return null;

      const entry = new _HistoryEntry(command, this._entries.length);
      entry.metadata = metadata;

      this._entries.push(entry);
      this._currentIndex = this._entries.length;

      // Limit history size
      if (this._entries.length > this._storage.maxEntries) {
        this._entries.shift();
      }

      this._search.update(this._entries);
      this._analytics = new _Analytics(this._entries);

      // Persist
      this._storage.save(this._entries);

      // Emit event
      this._events.emit("history:added", {
        entry,
        total: this._entries.length,
      });

      // Sync with API if available
      if (this._bridge) {
        this._syncWithAPI(entry);
      }

      return entry;
    }

    /**
     * Get entry by ID
     */
    get(id) {
      return this._entries.find((e) => e.id === id);
    }

    /**
     * Get all entries
     */
    getAll() {
      return [...this._entries];
    }

    /**
     * Get latest N entries
     */
    getLatest(n = 10) {
      return this._entries.slice(-n);
    }

    /**
     * Navigate history (like arrow keys)
     */
    navigate(direction) {
      if (this._entries.length === 0) return null;

      if (direction === "up") {
        if (this._currentIndex > 0) {
          this._currentIndex--;
          return this._entries[this._currentIndex];
        }
      } else if (direction === "down") {
        if (this._currentIndex < this._entries.length - 1) {
          this._currentIndex++;
          return this._entries[this._currentIndex];
        } else if (this._currentIndex === this._entries.length - 1) {
          this._currentIndex = this._entries.length;
          return null;
        }
      }

      return null;
    }

    /**
     * Clear all history
     */
    clear() {
      this._entries = [];
      this._currentIndex = -1;
      this._search.update([]);
      this._analytics = new _Analytics([]);
      this._storage.clear();
      this._events.emit("history:cleared", {});
      this._logger.info("History cleared");
    }

    // ── Public API: Search & Filter ──────────────────────────────────────

    /**
     * Search history by query
     */
    search(query, limit = 50) {
      return this._search.search(query, limit);
    }

    /**
     * Filter history by predicate
     */
    filter(predicate) {
      return this._search.filter(predicate);
    }

    /**
     * Find by tag
     */
    findByTag(tag) {
      return this._entries.filter((e) => e.tags.includes(tag));
    }

    /**
     * Find favorites
     */
    getFavorites() {
      return this._entries.filter((e) => e.favorite);
    }

    /**
     * Search by time range
     */
    getByTimeRange(startTime, endTime) {
      return this._entries.filter(
        (e) => e.timestamp >= startTime && e.timestamp <= endTime,
      );
    }

    // ── Public API: Tagging & Annotations ────────────────────────────────

    /**
     * Add tag to entry
     */
    addTag(entryId, tag) {
      const entry = this.get(entryId);
      if (!entry) return false;

      if (!entry.tags.includes(tag)) {
        entry.tags.push(tag);
        this._storage.save(this._entries);
        this._events.emit("history:tagged", { entryId, tag });
        return true;
      }
      return false;
    }

    /**
     * Remove tag from entry
     */
    removeTag(entryId, tag) {
      const entry = this.get(entryId);
      if (!entry) return false;

      const index = entry.tags.indexOf(tag);
      if (index !== -1) {
        entry.tags.splice(index, 1);
        this._storage.save(this._entries);
        return true;
      }
      return false;
    }

    /**
     * Toggle favorite
     */
    toggleFavorite(entryId) {
      const entry = this.get(entryId);
      if (!entry) return false;

      entry.favorite = !entry.favorite;
      this._storage.save(this._entries);
      this._events.emit("history:favoriteToggled", {
        entryId,
        favorite: entry.favorite,
      });
      return entry.favorite;
    }

    /**
     * Add notes to entry
     */
    addNotes(entryId, notes) {
      const entry = this.get(entryId);
      if (!entry) return false;

      entry.notes = notes;
      this._storage.save(this._entries);
      return true;
    }

    // ── Public API: Analytics ────────────────────────────────────────────

    /**
     * Get statistics
     */
    getStats() {
      return this._analytics.getStats();
    }

    /**
     * Get command frequency
     */
    getCommandFrequency() {
      return this._analytics.getCommandFrequency();
    }

    /**
     * Get execution time stats
     */
    getExecutionTimeStats() {
      return this._analytics.getExecutionTimeStats();
    }

    /**
     * Get timeline data
     */
    getTimeline(bucketSize) {
      return this._analytics.getTimelineData(bucketSize);
    }

    // ── Public API: Import/Export ────────────────────────────────────────

    /**
     * Export history
     */
    export(format = "json") {
      return _ImportExportManager.export(this._entries, format);
    }

    /**
     * Import history
     */
    import(data, format = "json") {
      const imported = _ImportExportManager.import(data, format);
      this._entries.push(...imported);
      this._search.update(this._entries);
      this._analytics = new _Analytics(this._entries);
      this._storage.save(this._entries);
      this._events.emit("history:imported", { count: imported.length });
      return imported;
    }

    /**
     * Backup history
     */
    backup() {
      return _ImportExportManager.backup(this._entries);
    }

    /**
     * Restore history from backup
     */
    restore(backup) {
      const restored = _ImportExportManager.restore(backup);
      this._entries = restored;
      this._search.update(this._entries);
      this._analytics = new _Analytics(this._entries);
      this._storage.save(this._entries);
      this._events.emit("history:restored", { count: restored.length });
      return restored.length;
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

      const linked = [];
      if (this._settings) linked.push("ConsoleSettings");
      if (this._bridge) linked.push("ConsoleBridge");
      if (this._websocket) linked.push("ConsoleWebSocket");
      if (this._engine) linked.push("ConsoleEngine");

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
        this._engine !== null
      );
    }

    // ── API Integration ──────────────────────────────────────────────────

    _syncWithAPI(entry) {
      if (!this._bridge) return;

      try {
        // Prepare history data for API
        const data = {
          type: "history_update",
          entry: entry.toJSON(),
          timestamp: Date.now(),
        };

        // Emit via WebSocket if available
        if (this._websocket) {
          this._websocket.publish("history_channel", data);
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

      // GET /api/history - Get all history
      bridge.get("/api/history", (req) => {
        return {
          success: true,
          count: this._entries.length,
          entries: this._entries.map((e) => e.toJSON()),
        };
      });

      // GET /api/history/latest - Get latest entries
      bridge.get("/api/history/latest", (req) => {
        const n = parseInt(req.query?.n) || 10;
        return {
          success: true,
          entries: this.getLatest(n),
        };
      });

      // GET /api/history/search - Search history
      bridge.get("/api/history/search", (req) => {
        const query = req.query?.q || "";
        const limit = parseInt(req.query?.limit) || 50;
        const results = this.search(query, limit);
        return {
          success: true,
          query,
          count: results.length,
          results,
        };
      });

      // GET /api/history/stats - Get statistics
      bridge.get("/api/history/stats", (req) => {
        return {
          success: true,
          stats: this.getStats(),
        };
      });

      // GET /api/history/favorites - Get favorites
      bridge.get("/api/history/favorites", (req) => {
        return {
          success: true,
          count: this.getFavorites().length,
          entries: this.getFavorites(),
        };
      });

      // POST /api/history/import - Import history
      bridge.post("/api/history/import", (req) => {
        const { data, format } = req.body || {};
        if (!data) {
          return { success: false, error: "No data provided" };
        }
        const imported = this.import(data, format || "json");
        return {
          success: true,
          imported: imported.length,
        };
      });

      // GET /api/history/export - Export history
      bridge.get("/api/history/export", (req) => {
        const format = req.query?.format || "json";
        const exported = this.export(format);
        return {
          success: true,
          format,
          data: exported,
        };
      });

      // GET /api/history/backup - Create backup
      bridge.get("/api/history/backup", (req) => {
        const backup = this.backup();
        return {
          success: true,
          backup,
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
     * Listen once
     */
    once(event, callback) {
      return this._events.once(event, callback);
    }

    // ── Utilities ────────────────────────────────────────────────────────

    /**
     * Load history from storage
     */
    _loadHistory() {
      this._entries = this._storage.load();
      this._currentIndex = this._entries.length;
      this._search.update(this._entries);
      this._analytics = new _Analytics(this._entries);
      this._logger.info(`Loaded ${this._entries.length} entries from storage`);
    }

    /**
     * Get debug info
     */
    debugInfo() {
      return {
        name: "ConsoleHistory",
        version: this.version,
        entries: this._entries.length,
        currentIndex: this._currentIndex,
        storage: this._storage.getStats(),
        logs: this._logger.logs.length,
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
      this._entries = [];
      this._search = null;
      this._analytics = null;
      this._storage = null;
      this._settings = null;
      this._bridge = null;
      this._websocket = null;
      this._engine = null;
      this._events?.clearAll();
      this._events = null;
      this._logger.info("Disposed");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Global Exposure
  // ─────────────────────────────────────────────────────────────────────────
  global.ConsoleHistory = ConsoleHistory;
})(typeof globalThis !== "undefined" ? globalThis : window);
