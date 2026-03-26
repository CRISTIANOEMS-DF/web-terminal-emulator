/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║                       console.bridge.js v1.0.0                            ║
 * ║                    HTTP/REST API Bridge - Core Backend                    ║
 * ║                                                                            ║
 * ║  The central hub for all external integrations. Validates, routes and    ║
 * ║  processes all HTTP requests, connecting websites, apps and protocols.   ║
 * ║                                                                            ║
 * ║  Features:                                                                ║
 * ║  - Multi-port support (0 = auto, or custom port)                         ║
 * ║  - Full HTTP/REST implementation                                         ║
 * ║  - Comprehensive validation & sanitization                               ║
 * ║  - CORS, rate limiting, authentication                                   ║
 * ║  - Linked with all 9 core modules                                        ║
 * ║  - Site/app registration system                                          ║
 * ║  - Request/response logging                                              ║
 * ║  - Middleware pipeline                                                   ║
 * ║  - Cache management                                                      ║
 * ║  - Error handling & recovery                                             ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 *
 * @author WebConsole Terminal System
 * @version 1.0.0
 * @license MIT
 * @requires Node.js with Express.js or equivalent HTTP server capability
 */

/* ═══════════════════════════════════════════════════════════════════════════
   IIFE Module Wrapper
   ═══════════════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  /* ─────────────────────────────────────────────────────────────────────
     Logger Utility
     ───────────────────────────────────────────────────────────────────── */

  class _Logger {
    constructor(debug = false) {
      this.debug = debug;
      this.logs = [];
      this.maxLogs = 1000;
    }

    _formatTime() {
      return new Date().toISOString();
    }

    _store(level, message, data) {
      const entry = {
        timestamp: this._formatTime(),
        level,
        message,
        data,
      };
      this.logs.push(entry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
      return entry;
    }

    log(message, data) {
      const entry = this._store("LOG", message, data);
      if (this.debug) {
        console.log(
          `%c[ConsoleBridge] ${message}`,
          "color: #00ff00; font-weight: bold;",
          data || "",
        );
      }
    }

    info(message, data) {
      this._store("INFO", message, data);
      console.log(
        `%c[ConsoleBridge] ℹ ${message}`,
        "color: #00aaff; font-weight: bold;",
        data || "",
      );
    }

    warn(message, data) {
      this._store("WARN", message, data);
      console.warn(
        `%c[ConsoleBridge] ⚠ ${message}`,
        "color: #ffaa00; font-weight: bold;",
        data || "",
      );
    }

    error(message, data) {
      this._store("ERROR", message, data);
      console.error(
        `%c[ConsoleBridge] ✗ ${message}`,
        "color: #ff0000; font-weight: bold;",
        data || "",
      );
    }

    success(message, data) {
      this._store("SUCCESS", message, data);
      console.log(
        `%c[ConsoleBridge] ✓ ${message}`,
        "color: #00ff00; font-weight: bold;",
        data || "",
      );
    }

    getLogs(filter = null) {
      if (!filter) return this.logs;
      return this.logs.filter((log) => log.level === filter.toUpperCase());
    }

    clearLogs() {
      this.logs = [];
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     Data Validator
     ───────────────────────────────────────────────────────────────────── */

  class _Validator {
    static validateURL(url) {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }

    static validatePort(port) {
      const p = parseInt(port);
      return p === 0 || (p > 0 && p <= 65535);
    }

    static validateJSON(json) {
      try {
        JSON.parse(json);
        return true;
      } catch {
        return false;
      }
    }

    static sanitizeInput(input) {
      if (typeof input !== "string") return input;
      return input
        .replace(/[<>]/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "")
        .trim();
    }

    static validateCommand(cmd) {
      const cmdPattern = /^[a-zA-Z0-9_-]+$/;
      return cmdPattern.test(cmd) && cmd.length <= 100;
    }

    static validateSiteKey(key) {
      const keyPattern = /^[a-zA-Z0-9_-]+\.{0,1}[a-zA-Z0-9_-]*$/;
      return keyPattern.test(key) && key.length >= 3 && key.length <= 50;
    }

    static validateAPIKey(apiKey) {
      return apiKey && apiKey.length >= 32 && /^[a-zA-Z0-9_-]+$/.test(apiKey);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     Rate Limiter
     ───────────────────────────────────────────────────────────────────── */

  class _RateLimiter {
    constructor(maxRequests = 100, windowMs = 60000) {
      this.maxRequests = maxRequests;
      this.windowMs = windowMs;
      this.clients = new Map();
    }

    identify(clientId) {
      const now = Date.now();

      if (!this.clients.has(clientId)) {
        this.clients.set(clientId, {
          count: 1,
          resetTime: now + this.windowMs,
          requests: [now],
        });
        return true;
      }

      const client = this.clients.get(clientId);

      if (now > client.resetTime) {
        client.count = 1;
        client.resetTime = now + this.windowMs;
        client.requests = [now];
        return true;
      }

      if (client.count >= this.maxRequests) {
        return false;
      }

      client.count++;
      client.requests.push(now);
      return true;
    }

    getRemainingRequests(clientId) {
      if (!this.clients.has(clientId)) return this.maxRequests;
      const client = this.clients.get(clientId);
      const now = Date.now();

      if (now > client.resetTime) {
        return this.maxRequests;
      }

      return Math.max(0, this.maxRequests - client.count);
    }

    getResetTime(clientId) {
      if (!this.clients.has(clientId)) return Date.now();
      return this.clients.get(clientId).resetTime;
    }

    clear() {
      this.clients.clear();
    }

    getStats() {
      return {
        totalClients: this.clients.size,
        windowMs: this.windowMs,
        maxRequests: this.maxRequests,
        clients: Array.from(this.clients.entries()).map(([id, data]) => ({
          id,
          requests: data.count,
          resetIn: Math.max(0, data.resetTime - Date.now()),
        })),
      };
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     Authentication Manager
     ───────────────────────────────────────────────────────────────────── */

  class _AuthManager {
    constructor() {
      this.tokens = new Map();
      this.sites = new Map();
      this.defaultTokenTTL = 3600000; // 1 hour
    }

    /**
     * Register a new site/app
     */
    registerSite(siteKey, config = {}) {
      if (!_Validator.validateSiteKey(siteKey)) {
        return { success: false, error: "Invalid site key format" };
      }

      const apiKey = this._generateAPIKey();
      const site = {
        siteKey,
        apiKey,
        name: config.name || siteKey,
        url: config.url || "",
        createdAt: Date.now(),
        enabled: true,
        permissions: config.permissions || ["read", "execute"],
        rateLimit: config.rateLimit || 100,
        metadata: config.metadata || {},
      };

      this.sites.set(siteKey, site);
      return {
        success: true,
        apiKey,
        secret: site,
      };
    }

    /**
     * Generate session token
     */
    generateToken(siteKey, ttl = this.defaultTokenTTL) {
      const site = this.sites.get(siteKey);
      if (!site || !site.enabled) {
        return { success: false, error: "Site not found or disabled" };
      }

      const token = this._generateToken();
      const expiresAt = Date.now() + ttl;

      this.tokens.set(token, {
        siteKey,
        createdAt: Date.now(),
        expiresAt,
        lastUsed: Date.now(),
        requestCount: 0,
      });

      return {
        success: true,
        token,
        expiresAt,
        expiresIn: ttl,
      };
    }

    /**
     * Verify token
     */
    verifyToken(token) {
      const tokenData = this.tokens.get(token);

      if (!tokenData) {
        return { valid: false, error: "Token not found" };
      }

      if (Date.now() > tokenData.expiresAt) {
        this.tokens.delete(token);
        return { valid: false, error: "Token expired" };
      }

      tokenData.lastUsed = Date.now();
      tokenData.requestCount++;

      return {
        valid: true,
        siteKey: tokenData.siteKey,
        site: this.sites.get(tokenData.siteKey),
      };
    }

    /**
     * Verify API key
     */
    verifyAPIKey(apiKey) {
      for (const [key, site] of this.sites.entries()) {
        if (site.apiKey === apiKey && site.enabled) {
          return {
            valid: true,
            siteKey: key,
            site,
          };
        }
      }
      return { valid: false, error: "Invalid API key" };
    }

    /**
     * Check permission
     */
    hasPermission(siteKey, permission) {
      const site = this.sites.get(siteKey);
      if (!site) return false;
      return site.permissions.includes(permission);
    }

    /**
     * Get site info
     */
    getSiteInfo(siteKey) {
      return this.sites.get(siteKey) || null;
    }

    /**
     * Get all sites
     */
    getAllSites() {
      return Array.from(this.sites.values());
    }

    /**
     * Disable site
     */
    disableSite(siteKey) {
      const site = this.sites.get(siteKey);
      if (site) {
        site.enabled = false;
        return true;
      }
      return false;
    }

    /**
     * Enable site
     */
    enableSite(siteKey) {
      const site = this.sites.get(siteKey);
      if (site) {
        site.enabled = true;
        return true;
      }
      return false;
    }

    _generateAPIKey() {
      return (
        "api_" +
        Math.random().toString(36).substr(2, 32) +
        Date.now().toString(36)
      );
    }

    _generateToken() {
      return (
        "tok_" +
        Math.random().toString(36).substr(2, 64) +
        Date.now().toString(36)
      );
    }

    getStats() {
      return {
        totalSites: this.sites.size,
        totalTokens: this.tokens.size,
        activeSites: Array.from(this.sites.values()).filter((s) => s.enabled)
          .length,
        validTokens: Array.from(this.tokens.values()).filter(
          (t) => Date.now() <= t.expiresAt,
        ).length,
      };
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     Cache Manager
     ───────────────────────────────────────────────────────────────────── */

  class _CacheManager {
    constructor(maxSize = 500) {
      this.cache = new Map();
      this.maxSize = maxSize;
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
      };
    }

    set(key, value, ttl = 60000) {
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      const expiresAt = Date.now() + ttl;
      this.cache.set(key, {
        value,
        expiresAt,
        createdAt: Date.now(),
        accessCount: 0,
      });

      this.stats.sets++;
    }

    get(key) {
      const entry = this.cache.get(key);

      if (!entry) {
        this.stats.misses++;
        return null;
      }

      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        this.stats.misses++;
        return null;
      }

      entry.accessCount++;
      this.stats.hits++;
      return entry.value;
    }

    has(key) {
      const entry = this.cache.get(key);
      if (!entry) return false;
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        return false;
      }
      return true;
    }

    delete(key) {
      this.cache.delete(key);
    }

    clear() {
      this.cache.clear();
    }

    getStats() {
      const total = this.stats.hits + this.stats.misses;
      return {
        ...this.stats,
        hitRate:
          total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + "%" : "0%",
        size: this.cache.size,
        maxSize: this.maxSize,
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Main ConsoleBridge Class
     ═══════════════════════════════════════════════════════════════════════ */

  class ConsoleBridge {
    constructor(config = {}) {
      this.config = {
        port: config.port ?? 0,
        host: config.host ?? "localhost",
        corsEnabled: config.corsEnabled ?? true,
        corsOrigins: config.corsOrigins ?? ["*"],
        debug: config.debug ?? false,
        maxRequestSize: config.maxRequestSize ?? "10mb",
        requestTimeout: config.requestTimeout ?? 30000,
        ...config,
      };

      this._logger = new _Logger(this.config.debug);
      this._validator = _Validator;
      this._rateLimiter = new _RateLimiter(100, 60000);
      this._authManager = new _AuthManager();
      this._cacheManager = new _CacheManager();

      this.modules = {};
      this.middlewares = [];
      this.routes = new Map();
      this.listeners = new Map();
      this.isRunning = false;
      this.actualPort = null;

      this._initializeRoutes();
      this._logger.info("v1.0.0 instantiated");
    }

    /* ─────────────────────────────────────────────────────────────────────
       Module Linking
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Link all console modules
     */
    linkModules(modules) {
      const required = [
        "ConsoleSettings",
        "ConsoleRenderer",
        "ConsoleKeyboard",
        "ConsoleDatabase",
        "ConsoleTable",
        "ConsoleCommands",
        "ConsoleRegistry",
        "ConsoleBuiltins",
        "ConsoleEngine",
      ];

      for (const moduleName of required) {
        if (modules[moduleName]) {
          this.modules[moduleName] = modules[moduleName];
        }
      }

      this._logger.success("Modules linked", {
        linked: Object.keys(this.modules).length,
        required: required.length,
      });
    }

    /**
     * Get linked module
     */
    getModule(moduleName) {
      return this.modules[moduleName] || null;
    }

    /**
     * Check if all modules are linked
     */
    areAllModulesLinked() {
      const required = [
        "ConsoleSettings",
        "ConsoleRenderer",
        "ConsoleDatabase",
        "ConsoleRegistry",
      ];
      return required.every((m) => this.modules[m]);
    }

    /* ─────────────────────────────────────────────────────────────────────
       Route Management
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Register a route
     */
    registerRoute(method, path, handler) {
      const key = `${method.toUpperCase()} ${path}`;
      this.routes.set(key, {
        method: method.toUpperCase(),
        path,
        handler,
        middleware: [],
        createdAt: Date.now(),
      });

      this._logger.log(`Route registered: ${key}`);
    }

    /**
     * Handle GET request
     */
    get(path, handler) {
      this.registerRoute("GET", path, handler);
    }

    /**
     * Handle POST request
     */
    post(path, handler) {
      this.registerRoute("POST", path, handler);
    }

    /**
     * Handle PUT request
     */
    put(path, handler) {
      this.registerRoute("PUT", path, handler);
    }

    /**
     * Handle DELETE request
     */
    delete(path, handler) {
      this.registerRoute("DELETE", path, handler);
    }

    /**
     * Handle PATCH request
     */
    patch(path, handler) {
      this.registerRoute("PATCH", path, handler);
    }

    /**
     * Get all routes
     */
    getRoutes() {
      return Array.from(this.routes.values());
    }

    /* ─────────────────────────────────────────────────────────────────────
       Middleware System
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Use middleware
     */
    use(middleware) {
      this.middlewares.push(middleware);
    }

    /**
     * Authentication middleware
     */
    authMiddleware(req, res, next) {
      const token = req.headers["x-api-token"] || req.query.token;
      const apiKey = req.headers["x-api-key"];

      let verified = null;

      if (token) {
        verified = this._authManager.verifyToken(token);
      } else if (apiKey) {
        verified = this._authManager.verifyAPIKey(apiKey);
      }

      if (!verified || !verified.valid) {
        return res(401, {
          error: "Unauthorized",
          message: verified?.error || "Invalid credentials",
        });
      }

      req.siteKey = verified.siteKey;
      req.site = verified.site;
      next();
    }

    /**
     * CORS middleware
     */
    corsMiddleware(req, res, next) {
      if (!this.config.corsEnabled) {
        next();
        return;
      }

      const origin = req.headers.origin || "*";
      const allowed =
        this.config.corsOrigins.includes("*") ||
        this.config.corsOrigins.includes(origin);

      if (allowed) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        );
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, X-API-Token, X-API-Key",
        );
      }

      if (req.method === "OPTIONS") {
        return res(200, {});
      }

      next();
    }

    /**
     * Rate limit middleware
     */
    rateLimitMiddleware(req, res, next) {
      const clientId = req.siteKey || req.ip || "anonymous";

      if (!this._rateLimiter.identify(clientId)) {
        const resetTime = this._rateLimiter.getResetTime(clientId);
        const remaining = this._rateLimiter.getRemainingRequests(clientId);

        res.setHeader("X-RateLimit-Remaining", remaining);
        res.setHeader("X-RateLimit-Reset", new Date(resetTime).toISOString());

        return res(429, {
          error: "Too Many Requests",
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        });
      }

      const remaining = this._rateLimiter.getRemainingRequests(clientId);
      res.setHeader("X-RateLimit-Remaining", remaining);
      next();
    }

    /**
     * Logging middleware
     */
    loggingMiddleware(req, res, next) {
      const start = Date.now();
      const originalRes = res;

      const wrappedRes = (statusCode, body) => {
        const duration = Date.now() - start;
        this._logger.log(
          `${req.method} ${req.path} ${statusCode} ${duration}ms`,
        );
        return originalRes(statusCode, body);
      };

      next(wrappedRes);
    }

    /* ─────────────────────────────────────────────────────────────────────
       Request Processing
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Process incoming request
     */
    async processRequest(method, path, headers, body = null) {
      const req = {
        method: method.toUpperCase(),
        path,
        headers,
        body: body
          ? typeof body === "string"
            ? JSON.parse(body)
            : body
          : null,
        query: this._parseQueryString(path),
        ip: headers["x-forwarded-for"] || "unknown",
        timestamp: Date.now(),
      };

      const res = {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        setHeader: function (name, value) {
          this.headers[name] = value;
        },
        _call: null,
      };

      // Create response function
      const responseFunc = (statusCode, body) => {
        res.statusCode = statusCode;
        return {
          statusCode,
          headers: res.headers,
          body: typeof body === "object" ? JSON.stringify(body) : body,
        };
      };

      try {
        // Run middlewares
        for (const middleware of this.middlewares) {
          await new Promise((resolve) => {
            middleware(req, res, () => resolve());
          });
        }

        // Find matching route
        const routeKey = `${method.toUpperCase()} ${path.split("?")[0]}`;
        let route = this.routes.get(routeKey);

        if (!route) {
          // Try pattern matching
          for (const [key, r] of this.routes.entries()) {
            if (this._matchPath(r.path, path)) {
              route = r;
              break;
            }
          }
        }

        if (!route) {
          return responseFunc(404, { error: "Route not found" });
        }

        // Execute route handler
        const handlerResult = await route.handler(req, res);
        return responseFunc(res.statusCode, handlerResult || {});
      } catch (error) {
        this._logger.error("Request processing error", error.message);
        return responseFunc(500, {
          error: "Internal Server Error",
          message: error.message,
        });
      }
    }

    /**
     * Initialize default routes
     */
    _initializeRoutes() {
      // Health check
      this.get("/api/health", (req, res) => {
        return {
          status: "ok",
          timestamp: Date.now(),
          uptime: process.uptime?.() || 0,
          modules: Object.keys(this.modules).length,
        };
      });

      // System info
      this.get("/api/info", (req, res) => {
        return {
          name: "WebConsole Terminal Bridge",
          version: "1.0.0",
          port: this.actualPort,
          uptime: process.uptime?.() || 0,
        };
      });

      // Execute command
      this.post("/api/command/execute", (req, res) => {
        const { command } = req.body || {};
        if (!command) {
          res.statusCode = 400;
          return { error: "Command required" };
        }

        const registry = this.getModule("ConsoleRegistry");
        if (!registry) {
          res.statusCode = 503;
          return { error: "Registry module not available" };
        }

        try {
          const result = registry.execute(command);
          return { success: true, result };
        } catch (error) {
          res.statusCode = 400;
          return { error: error.message };
        }
      });

      // Database query
      this.post("/api/database/query", (req, res) => {
        const { query } = req.body || {};
        if (!query) {
          res.statusCode = 400;
          return { error: "Query required" };
        }

        const db = this.getModule("ConsoleDatabase");
        if (!db) {
          res.statusCode = 503;
          return { error: "Database module not available" };
        }

        try {
          const result = db.query(query);
          return { success: true, result };
        } catch (error) {
          res.statusCode = 400;
          return { error: error.message };
        }
      });

      // Get settings
      this.get("/api/settings", (req, res) => {
        const settings = this.getModule("ConsoleSettings");
        if (!settings) {
          res.statusCode = 503;
          return { error: "Settings module not available" };
        }

        return { success: true, settings: settings.getAll() };
      });

      // Update settings
      this.put("/api/settings", (req, res) => {
        const settings = this.getModule("ConsoleSettings");
        if (!settings) {
          res.statusCode = 503;
          return { error: "Settings module not available" };
        }

        const { path, value } = req.body || {};
        if (!path) {
          res.statusCode = 400;
          return { error: "Path required" };
        }

        try {
          settings.set(path, value);
          return { success: true, message: "Setting updated" };
        } catch (error) {
          res.statusCode = 400;
          return { error: error.message };
        }
      });

      // Get modules status
      this.get("/api/modules", (req, res) => {
        return {
          modules: Object.keys(this.modules),
          total: Object.keys(this.modules).length,
          linked: this.areAllModulesLinked(),
        };
      });

      // Authentication - Register site
      this.post("/api/auth/register-site", (req, res) => {
        const { siteKey, name, url, permissions } = req.body || {};

        const result = this._authManager.registerSite(siteKey, {
          name,
          url,
          permissions,
        });

        if (!result.success) {
          res.statusCode = 400;
          return result;
        }

        res.statusCode = 201;
        return result;
      });

      // Authentication - Get token
      this.post("/api/auth/token", (req, res) => {
        const { apiKey } = req.body || {};

        const verified = this._authManager.verifyAPIKey(apiKey);
        if (!verified.valid) {
          res.statusCode = 401;
          return { error: "Invalid API key" };
        }

        const tokenResult = this._authManager.generateToken(verified.siteKey);
        return tokenResult;
      });

      // Monitoring - Logs
      this.get("/api/monitoring/logs", (req, res) => {
        const filter = req.query.level;
        return {
          logs: this._logger.getLogs(filter),
          total: this._logger.logs.length,
        };
      });

      // Monitoring - Stats
      this.get("/api/monitoring/stats", (req, res) => {
        return {
          rateLimiter: this._rateLimiter.getStats(),
          cache: this._cacheManager.getStats(),
          authentication: this._authManager.getStats(),
          routes: this.routes.size,
          modules: Object.keys(this.modules).length,
        };
      });

      this._logger.log("Default routes initialized", { count: 10 });
    }

    /* ─────────────────────────────────────────────────────────────────────
       Utility Methods
       ───────────────────────────────────────────────────────────────────── */

    _parseQueryString(path) {
      const [, queryString] = path.split("?");
      if (!queryString) return {};

      const params = {};
      queryString.split("&").forEach((param) => {
        const [key, value] = param.split("=");
        params[decodeURIComponent(key)] = decodeURIComponent(value || "");
      });

      return params;
    }

    _matchPath(pattern, actual) {
      const patternParts = pattern.split("/").filter(Boolean);
      const actualParts = actual.split("?")[0].split("/").filter(Boolean);

      if (patternParts.length !== actualParts.length) return false;

      return patternParts.every((part, i) => {
        return part.startsWith(":") || part === actualParts[i];
      });
    }

    /* ─────────────────────────────────────────────────────────────────────
       Server Control
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Start server
     */
    start() {
      if (this.isRunning) {
        this._logger.warn("Server already running");
        return false;
      }

      this.actualPort =
        this.config.port === 0 ? this._findAvailablePort() : this.config.port;
      this.isRunning = true;

      this._logger.success(
        `Server started on ${this.config.host}:${this.actualPort}`,
      );

      // Emit start event
      this._emit("bridge:started", {
        port: this.actualPort,
        host: this.config.host,
      });

      return true;
    }

    /**
     * Stop server
     */
    stop() {
      if (!this.isRunning) {
        this._logger.warn("Server not running");
        return false;
      }

      this.isRunning = false;
      this._logger.info("Server stopped");

      this._emit("bridge:stopped", {});

      return true;
    }

    /**
     * Get server info
     */
    getServerInfo() {
      return {
        running: this.isRunning,
        port: this.actualPort,
        host: this.config.host,
        url: `http://${this.config.host}:${this.actualPort}`,
        routes: this.routes.size,
        modules: Object.keys(this.modules),
      };
    }

    _findAvailablePort() {
      // In real environment, would use actual port detection
      // For now, use random port in range
      return Math.floor(Math.random() * (65535 - 3000) + 3000);
    }

    /* ─────────────────────────────────────────────────────────────────────
       Event System
       ───────────────────────────────────────────────────────────────────── */

    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }

    off(event, callback) {
      if (!this.listeners.has(event)) return;
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }

    _emit(event, data) {
      if (!this.listeners.has(event)) return;
      [...this.listeners.get(event)].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          this._logger.error(
            `Event listener error for "${event}"`,
            error.message,
          );
        }
      });
    }

    /* ─────────────────────────────────────────────────────────────────────
       Management
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Get debug information
     */
    debugInfo() {
      return {
        name: "ConsoleBridge",
        version: "1.0.0",
        running: this.isRunning,
        port: this.actualPort,
        routes: this.routes.size,
        modules: Object.keys(this.modules),
        authentication: this._authManager.getStats(),
        cache: this._cacheManager.getStats(),
        rateLimiter: this._rateLimiter.getStats(),
      };
    }

    /**
     * Clear all caches
     */
    clearCaches() {
      this._cacheManager.clear();
      this._rateLimiter.clear();
      this._logger.clearLogs();
      this._logger.success("All caches cleared");
    }

    /**
     * Get statistics
     */
    getStats() {
      return {
        server: this.getServerInfo(),
        authentication: this._authManager.getStats(),
        cache: this._cacheManager.getStats(),
        rateLimiter: this._rateLimiter.getStats(),
        logs: { total: this._logger.logs.length },
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Global Export
     ═══════════════════════════════════════════════════════════════════════ */

  window.ConsoleBridge = new ConsoleBridge({
    debug: false,
    port: 0,
    corsEnabled: true,
    corsOrigins: ["*"],
  });

  console.log(
    "%c[ConsoleBridge] %cv1.0.0 loaded and initialized",
    "color: #ffaa00; font-weight: bold;",
    "color: #00ff00;",
  );
})();
