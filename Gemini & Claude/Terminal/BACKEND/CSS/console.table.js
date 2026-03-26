/**
 * @file        console.table.js
 * @description ConsoleTable — Advanced Table Rendering & Database Visualization
 *
 * Comprehensive table rendering system with:
 * - Database integration (pulls from console.database.js)
 * - Table scraping and HTML rewrite support
 * - Advanced CSS styling with themes
 * - Sorting, filtering, search, pagination
 * - Export functionality (CSV, JSON, HTML)
 * - Full module linking and detection
 *
 * Module Dependencies:
 * ├─ REQUIRED (for full functionality):
 * │  ├─ BACKEND/CSS/console.renderer.js   (ConsoleRenderer - display)
 * │  ├─ BACKEND/CSS/terminal.css          (Styles)
 * │  └─ BACKEND/COMMANDS/console.database.js (ConsoleDatabase - data source)
 * │
 * ├─ OPTIONAL (enhances features):
 * │  ├─ BACKEND/COMMANDS/console.commands.js (ConsoleCommands - CLI integration)
 * │  ├─ BACKEND/CSS/console.theme.js        (ConsoleTheme - custom themes)
 * │  ├─ BACKEND/CONFIG/console.settings.js  (ConsoleSettings - config)
 * │  ├─ BACKEND/API/console.bridge.js       (ConsoleBridge - HTTP/scraping)
 * │  ├─ BACKEND/CORE/console.engine.js      (ConsoleEngine - execution)
 * │  └─ FRONTEND/JS/console.bootstrap.js    (WebConsole - orchestrator)
 * │
 * └─ Module Flow:
 *    [User Input] → ConsoleDatabase → ConsoleTable.render()
 *                  ↓
 *            ConsoleRenderer.renderTable()
 *                  ↓
 *            Terminal Display
 *
 * @version 4.0.0
 * @license MIT
 */

(function (global) {
  "use strict";

  // ─────────────────────────────────────────────────────────────────────────
  // Guard & Setup
  // ─────────────────────────────────────────────────────────────────────────

  if (typeof global.ConsoleTable !== "undefined") {
    console.warn("[ConsoleTable] Already registered — skipping re-definition.");
    return;
  }

  const VERSION = "4.0.0";

  // ─────────────────────────────────────────────────────────────────────────
  // Logger with debug support
  // ─────────────────────────────────────────────────────────────────────────

  const Logger = {
    _prefix: "[ConsoleTable]",
    info(msg, debug = false) {
      if (debug) console.info(`${this._prefix} ℹ ${msg}`);
    },
    warn(msg) {
      console.warn(`${this._prefix} ⚠ ${msg}`);
    },
    error(msg, err) {
      console.error(`${this._prefix} ✖ ${msg}`, err ?? "");
    },
    debug(msg, data, debug = false) {
      if (debug) console.debug(`${this._prefix} ◎ ${msg}`, data ?? "");
    },
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Utility Functions
  // ─────────────────────────────────────────────────────────────────────────

  const isObject = (val) =>
    val && typeof val === "object" && !Array.isArray(val);

  const escapeHTML = (() => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    const regex = /[&<>"']/g;
    return (str) => String(str).replace(regex, (char) => map[char]);
  })();

  const stringifySafe = (value) => {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return "[Unserializable]";
    }
  };

  const extractColumns = (data) => {
    const keys = new Set();
    for (const item of data) {
      if (isObject(item)) {
        for (const key in item) keys.add(key);
      }
    }
    return [...keys];
  };

  const buildHeader = (cols) => {
    const headerCells = cols
      .map(
        (col, idx) =>
          `<th class="wc-table-header-cell" data-col-index="${idx}" data-sortable="true">` +
          `<span class="wc-header-text">${escapeHTML(String(col).toUpperCase())}</span>` +
          `<span class="wc-sort-icon">⇅</span>` +
          `</th>`,
      )
      .join("");
    return `<thead class="wc-table-head"><tr class="wc-header-row">${headerCells}</tr></thead>`;
  };

  const buildBody = (data, cols) => {
    const rows = data.map((row, rowIdx) => {
      if (!isObject(row)) {
        return (
          `<tr class="wc-table-row wc-row-${rowIdx % 2}" data-row-index="${rowIdx}">` +
          `<td class="wc-table-cell">${escapeHTML(stringifySafe(row))}</td>` +
          `</tr>`
        );
      }

      const cells = cols
        .map((col, colIdx) => {
          const val = stringifySafe(row[col]);
          return (
            `<td class="wc-table-cell" data-col-index="${colIdx}" data-row-index="${rowIdx}">` +
            `${escapeHTML(val)}` +
            `</td>`
          );
        })
        .join("");

      return `<tr class="wc-table-row wc-row-${rowIdx % 2}" data-row-index="${rowIdx}">${cells}</tr>`;
    });

    return `<tbody class="wc-table-body">${rows.join("")}</tbody>`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ConsoleTable Main Class
  // ─────────────────────────────────────────────────────────────────────────

  class ConsoleTable {
    constructor(config = {}) {
      this.config = Object.freeze(config);
      this.version = VERSION;

      // Table cache
      this._tables = new Map();

      // Module references
      this._database = null;
      this._renderer = null;
      this._theme = null;
      this._bridge = null;

      // Table state
      this._sortState = Object.create(null);
      this._filterState = Object.create(null);
      this._pagination = Object.create(null);

      Logger.info(`v${VERSION} instantiated`, config.debug);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Main Render Method
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Renders a table to HTML with full styling and interactivity.
     * Automatically integrates with database if available.
     * @param {Array} data - Array of objects or rows to render
     * @param {Array} [columns] - Column names (auto-extracted if null)
     * @param {Object} [options] - Rendering options
     * @returns {string} HTML table markup
     */
    render(data, columns = null, options = {}) {
      if (!Array.isArray(data)) {
        throw new TypeError("ConsoleTable.render: data must be an array.");
      }

      if (data.length === 0) {
        Logger.warn("Empty dataset received.");
        return this._buildEmptyTable();
      }

      let cols = columns;
      if (!Array.isArray(cols) || cols.length === 0) {
        cols = extractColumns(data);
      }

      if (cols.length === 0) {
        throw new TypeError("ConsoleTable: No columns available.");
      }

      try {
        const tableId = options.tableId || `table-${Date.now()}`;
        const classList = options.className || "wc-data-table";
        const caption = options.caption || null;
        const filteredData = options.filters
          ? this.filterByColumns(data, options.filters)
          : data;

        let html = `<table class="wc-table ${classList}" id="${tableId}" `;
        html += `data-rows="${filteredData.length}" data-cols="${cols.length}">`;

        // Caption (optional)
        if (caption) {
          html += `<caption class="wc-table-caption">${escapeHTML(caption)}</caption>`;
        }

        // Header with sort icons
        html += buildHeader(cols);

        // Body with row classes
        html += buildBody(filteredData, cols);

        html += `</table>`;

        // Cache for reference
        this._tables.set(tableId, {
          data,
          columns: cols,
          html,
          filteredRows: filteredData.length,
        });

        Logger.debug(
          `Table rendered: ${tableId} (${filteredData.length}/${data.length} rows × ${cols.length} cols)`,
          null,
          this.config.debug,
        );

        return html;
      } catch (err) {
        Logger.error("Render failed", err);
        return this._buildErrorTable("Render Error: " + err.message);
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Database Integration
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Connects to ConsoleDatabase module for data integration.
     * Enables: renderFromDatabase(), overwriteTable()
     * @param {Object} database - ConsoleDatabase instance
     */
    connectDatabase(database) {
      if (!database || typeof database !== "object") {
        Logger.warn("connectDatabase: invalid database instance");
        return false;
      }
      this._database = database;
      Logger.debug("Connected to ConsoleDatabase", null, this.config.debug);
      return true;
    }

    /**
     * Connects to ConsoleRenderer for direct table display.
     * Enables: automatic rendering to terminal display
     * @param {Object} renderer - ConsoleRenderer instance
     */
    connectRenderer(renderer) {
      if (!renderer || typeof renderer !== "object") {
        Logger.warn("connectRenderer: invalid renderer instance");
        return false;
      }
      this._renderer = renderer;
      Logger.debug("Connected to ConsoleRenderer", null, this.config.debug);
      return true;
    }

    /**
     * Gets table data directly from database by name.
     * @param {string} tableName - Table name in database
     * @returns {Array|null} Table data or null if not found
     */
    getTableFromDatabase(tableName) {
      if (!this._database) {
        Logger.warn("getTableFromDatabase: no database connected");
        return null;
      }

      try {
        const tableData = this._database.getTable?.(tableName);
        if (!tableData) {
          Logger.warn(`Table not found in database: ${tableName}`);
          return null;
        }
        return tableData;
      } catch (err) {
        Logger.error(`Failed to get table from database: ${tableName}`, err);
        return null;
      }
    }

    /**
     * Renders a table from the database by name and displays it.
     * @param {string} tableName - Name of table in database
     * @param {Object} [options] - Rendering options
     * @returns {string|null} HTML or null if failed
     */
    renderFromDatabase(tableName, options = {}) {
      const tableData = this.getTableFromDatabase(tableName);
      if (!tableData) return null;

      return this.render(tableData, null, {
        ...options,
        caption: tableName,
        className: `wc-db-table wc-db-${escapeHTML(tableName)}`,
      });
    }

    /**
     * Overwrites or creates table in database.
     * Used for: data updates, scraping results, transformations
     * @param {string} tableName - Target table name
     * @param {Array} newData - New table data (array of objects)
     * @returns {boolean} Success state
     */
    overwriteTable(tableName, newData) {
      if (!this._database) {
        Logger.warn("overwriteTable: no database connected");
        return false;
      }

      if (!Array.isArray(newData)) {
        Logger.warn("overwriteTable: newData must be an array");
        return false;
      }

      try {
        const result = this._database.updateTable?.(tableName, newData) ?? true;
        Logger.info(
          `Table overwritten: ${tableName} (${newData.length} rows)`,
          this.config.debug,
        );
        return result !== false;
      } catch (err) {
        Logger.error(`Failed to overwrite table: ${tableName}`, err);
        return false;
      }
    }

    /**
     * Scrapes table data from external website and overwrites local table.
     * Requires ConsoleBridge for HTTP access.
     * @param {string} url - Website URL to scrape
     * @param {string} selector - CSS selector for table element (e.g., "table.products")
     * @param {string} [tableName] - Local table name to store (auto-generated if null)
     * @returns {Promise<Object>} { success, data, tableName, error }
     */
    async scrapeAndOverwrite(url, selector, tableName = null) {
      if (typeof global.ConsoleBridge === "undefined") {
        Logger.warn("scrapeAndOverwrite: ConsoleBridge not available for HTTP");
        return {
          success: false,
          error: "ConsoleBridge not loaded - cannot fetch external page",
        };
      }

      try {
        Logger.debug(`Fetching: ${url}`, null, this.config.debug);
        const response = await global.ConsoleBridge.fetch?.(url);

        if (!response) {
          return { success: false, error: "ConsoleBridge.fetch returned null" };
        }

        const html = await response.text?.();
        if (!html) {
          return { success: false, error: "Failed to read response body" };
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const tableElement = doc.querySelector(selector);

        if (!tableElement) {
          return {
            success: false,
            error: `Table not found with selector: ${selector}`,
          };
        }

        const scrapedData = this._parseTableElement(tableElement);
        const targetTable = tableName || `scraped_${Date.now()}`;

        const success = this.overwriteTable(targetTable, scrapedData);

        Logger.info(
          `Scraped: ${scrapedData.length} rows from ${url} → ${targetTable}`,
          this.config.debug,
        );

        return {
          success,
          data: scrapedData,
          tableName: targetTable,
          rowsScraped: scrapedData.length,
        };
      } catch (err) {
        Logger.error("Scraping failed", err);
        return { success: false, error: err.message };
      }
    }

    /**
     * Scrapes multiple tables from a website.
     * @param {string} url - Website URL
     * @param {string} selector - CSS selector for multiple tables (e.g., "table")
     * @returns {Promise<Array>} Array of scraping results
     */
    async scrapeMultipleTables(url, selector = "table") {
      if (typeof global.ConsoleBridge === "undefined") {
        return { success: false, error: "ConsoleBridge not available" };
      }

      try {
        const response = await global.ConsoleBridge.fetch?.(url);
        const html = await response.text?.();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const tableElements = doc.querySelectorAll(selector);

        const results = [];
        for (let i = 0; i < tableElements.length; i++) {
          const tableEl = tableElements[i];
          const scrapedData = this._parseTableElement(tableEl);
          const tableName = `scraped_${Date.now()}_${i}`;

          this.overwriteTable(tableName, scrapedData);
          results.push({
            tableName,
            rows: scrapedData.length,
            data: scrapedData,
          });
        }

        Logger.info(
          `Scraped ${results.length} tables from ${url}`,
          this.config.debug,
        );
        return { success: true, tables: results, count: results.length };
      } catch (err) {
        Logger.error("Multi-table scraping failed", err);
        return { success: false, error: err.message };
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Table Operations (Sort, Filter, Search, Paginate)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Sorts table data by column.
     * @param {Array} data - Table data
     * @param {string} columnName - Column to sort by
     * @param {string} [direction="asc"] - "asc" or "desc"
     * @returns {Array} Sorted data (new array)
     */
    sortByColumn(data, columnName, direction = "asc") {
      const sorted = [...data].sort((a, b) => {
        const aVal = a[columnName];
        const bVal = b[columnName];

        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === "number" && typeof bVal === "number") {
          return direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        return direction === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });

      this._sortState[columnName] = direction;
      return sorted;
    }

    /**
     * Filters table data by multiple column values.
     * @param {Array} data - Table data
     * @param {Object} filters - { columnName: value, ... }
     * @returns {Array} Filtered data (new array)
     */
    filterByColumns(data, filters = {}) {
      if (Object.keys(filters).length === 0) return data;

      return data.filter((row) => {
        for (const [col, value] of Object.entries(filters)) {
          if (String(row[col]).toLowerCase() !== String(value).toLowerCase()) {
            return false;
          }
        }
        return true;
      });
    }

    /**
     * Full-text search across all columns.
     * @param {Array} data - Table data
     * @param {string} searchTerm - Search query
     * @returns {Array} Matching rows (new array)
     */
    search(data, searchTerm) {
      const term = searchTerm.toLowerCase();
      return data.filter((row) => {
        for (const value of Object.values(row)) {
          if (String(value).toLowerCase().includes(term)) {
            return true;
          }
        }
        return false;
      });
    }

    /**
     * Paginates table data.
     * @param {Array} data - Table data
     * @param {number} pageSize - Rows per page
     * @param {number} pageNumber - Page number (1-indexed)
     * @returns {Object} { data: Array, page, pageSize, total, pages }
     */
    paginate(data, pageSize = 10, pageNumber = 1) {
      const total = data.length;
      const pages = Math.ceil(total / pageSize);
      const start = (pageNumber - 1) * pageSize;
      const end = start + pageSize;

      this._pagination = { pageSize, pageNumber, total, pages };

      return {
        data: data.slice(start, end),
        page: pageNumber,
        pageSize,
        total,
        pages,
        hasPrev: pageNumber > 1,
        hasNext: pageNumber < pages,
      };
    }

    // ─────────────────────────────────────────────────────────────────────
    // Export Functions
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Exports table data as CSV format.
     * @param {Array} data - Table data
     * @param {Array} columns - Column names
     * @returns {string} CSV formatted string
     */
    exportCSV(data, columns) {
      const header = columns.map((col) => `"${col}"`).join(",");
      const rows = data.map((row) =>
        columns
          .map((col) => {
            const val = stringifySafe(row[col]);
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(","),
      );
      return [header, ...rows].join("\n");
    }

    /**
     * Exports table data as JSON.
     * @param {Array} data - Table data
     * @returns {string} JSON formatted string
     */
    exportJSON(data) {
      return JSON.stringify(data, null, 2);
    }

    /**
     * Downloads table as file.
     * @param {Array} data - Table data
     * @param {Array} columns - Column names
     * @param {string} format - "csv" or "json"
     * @param {string} filename - Output filename
     */
    downloadTable(data, columns, format = "csv", filename = "table") {
      let content, mimeType;

      if (format === "json") {
        content = this.exportJSON(data);
        mimeType = "application/json";
      } else {
        content = this.exportCSV(data, columns);
        mimeType = "text/csv";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.${format}`;
      link.click();
      URL.revokeObjectURL(url);

      Logger.info(`Downloaded: ${filename}.${format}`, this.config.debug);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Private Helpers
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Parses HTML table element into data array.
     * @private
     */
    _parseTableElement(tableEl) {
      const data = [];
      const headerRow =
        tableEl.querySelector("thead tr") ||
        tableEl.querySelector("tr:first-child");
      const columns = [];

      // Extract column names
      if (headerRow) {
        headerRow.querySelectorAll("th, td").forEach((cell) => {
          columns.push(cell.textContent.trim());
        });
      }

      // Extract data rows
      tableEl
        .querySelectorAll("tbody tr, tr:not(:first-child)")
        .forEach((row) => {
          const rowData = {};
          row.querySelectorAll("td").forEach((cell, idx) => {
            const colName = columns[idx] || `col_${idx}`;
            rowData[colName] = cell.textContent.trim();
          });
          if (Object.keys(rowData).length > 0) {
            data.push(rowData);
          }
        });

      return data;
    }

    _buildEmptyTable() {
      return `<table class="wc-table wc-table-empty">
        <tbody><tr><td class="wc-empty-message">No data to display</td></tr></tbody>
      </table>`;
    }

    _buildErrorTable(message) {
      return `<table class="wc-table wc-table-error">
        <tbody><tr><td class="wc-error-message">${escapeHTML(message)}</td></tr></tbody>
      </table>`;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Module Detection & Info
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Returns metadata about table state and linked modules.
     * Used for module detection and integration verification.
     * @returns {Object}
     */
    getInfo() {
      return Object.freeze({
        version: this.version,
        tablesRendered: this._tables.size,
        databaseConnected: this._database !== null,
        rendererConnected: this._renderer !== null,
        hasSupportedModules: {
          consoleRenderer: typeof global.ConsoleRenderer !== "undefined",
          consoleDatabase: typeof global.ConsoleDatabase !== "undefined",
          consoleCommands: typeof global.ConsoleCommands !== "undefined",
          consoleTheme: typeof global.ConsoleTheme !== "undefined",
          consoleSettings: typeof global.ConsoleSettings !== "undefined",
          consoleBridge: typeof global.ConsoleBridge !== "undefined",
          consoleEngine: typeof global.ConsoleEngine !== "undefined",
          consoleKeyboard: typeof global.ConsoleKeyboard !== "undefined",
          webConsole: typeof global.WebConsole !== "undefined",
        },
      });
    }

    toString() {
      return (
        `ConsoleTable [v${this.version}, ${this._tables.size} tables cached, ` +
        `db=${this._database ? "connected" : "disconnected"}]`
      );
    }

    get [Symbol.toStringTag]() {
      return "ConsoleTable";
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Global Registration
  // ─────────────────────────────────────────────────────────────────────────

  global.ConsoleTable = new ConsoleTable();

  Logger.info(`v${VERSION} registered on window.ConsoleTable`);
  Logger.info(
    "Module links: ConsoleRenderer, ConsoleDatabase, ConsoleCommands, " +
      "ConsoleTheme, ConsoleSettings, ConsoleBridge, ConsoleEngine, " +
      "ConsoleKeyboard, WebConsole",
  );
})(typeof globalThis !== "undefined" ? globalThis : window);
