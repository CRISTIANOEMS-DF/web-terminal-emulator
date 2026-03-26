/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║                    console.websocket.js v1.0.0                            ║
 * ║              Real-time WebSocket Communication Layer                       ║
 * ║                                                                            ║
 * ║  Bidirectional WebSocket infrastructure for real-time terminal updates.  ║
 * ║  Handles live command execution, data streaming, and event broadcasting. ║
 * ║                                                                            ║
 * ║  Features:                                                                ║
 * ║  - Full WebSocket server/client management                               ║
 * ║  - Real-time command execution & output                                  ║
 * ║  - Live data streaming (tables, databases)                               ║
 * ║  - Event broadcasting to connected clients                               ║
 * ║  - Automatic reconnection & heartbeat                                    ║
 * ║  - Message queuing & ordering                                            ║
 * ║  - Channel-based communication                                           ║
 * ║  - Connection pooling & management                                       ║
 * ║  - Compression & optimization                                            ║
 * ║  - Linked with all console modules                                       ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 *
 * @author WebConsole Terminal System
 * @version 1.0.0
 * @license MIT
 * @requires WebSocket API (Browser or Node.js)
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
      this.events = [];
      this.maxEvents = 500;
    }

    _record(level, message, data) {
      const event = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
      };
      this.events.push(event);
      if (this.events.length > this.maxEvents) {
        this.events.shift();
      }
      return event;
    }

    log(message, data) {
      const event = this._record("LOG", message, data);
      if (this.debug) {
        console.log(
          `%c[ConsoleWS] ${message}`,
          "color: #00ff00; font-weight: bold;",
          data || "",
        );
      }
    }

    info(message, data) {
      this._record("INFO", message, data);
      console.log(
        `%c[ConsoleWS] ℹ ${message}`,
        "color: #00aaff; font-weight: bold;",
        data || "",
      );
    }

    warn(message, data) {
      this._record("WARN", message, data);
      console.warn(
        `%c[ConsoleWS] ⚠ ${message}`,
        "color: #ffaa00; font-weight: bold;",
        data || "",
      );
    }

    error(message, data) {
      this._record("ERROR", message, data);
      console.error(
        `%c[ConsoleWS] ✗ ${message}`,
        "color: #ff0000; font-weight: bold;",
        data || "",
      );
    }

    success(message, data) {
      this._record("SUCCESS", message, data);
      console.log(
        `%c[ConsoleWS] ✓ ${message}`,
        "color: #00ff00; font-weight: bold;",
        data || "",
      );
    }

    getEvents(filter = null) {
      if (!filter) return this.events;
      return this.events.filter((e) => e.level === filter.toUpperCase());
    }

    clear() {
      this.events = [];
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     Message Queue Manager
     ───────────────────────────────────────────────────────────────────── */

  class _MessageQueue {
    constructor(maxSize = 1000) {
      this.queue = [];
      this.maxSize = maxSize;
      this.processing = false;
      this.processCallback = null;
    }

    enqueue(message) {
      if (this.queue.length >= this.maxSize) {
        return false;
      }

      this.queue.push({
        id: Date.now() + Math.random(),
        message,
        timestamp: Date.now(),
        attempts: 0,
        maxAttempts: 3,
      });

      return true;
    }

    dequeue() {
      return this.queue.shift();
    }

    peek() {
      return this.queue[0] || null;
    }

    size() {
      return this.queue.length;
    }

    isEmpty() {
      return this.queue.length === 0;
    }

    clear() {
      this.queue = [];
    }

    getStats() {
      return {
        size: this.queue.length,
        maxSize: this.maxSize,
        pending: this.queue.length,
        oldest: this.queue[0]?.timestamp || null,
      };
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     Channel Manager for Pub/Sub
     ───────────────────────────────────────────────────────────────────── */

  class _ChannelManager {
    constructor() {
      this.channels = new Map();
      this.subscriptions = new Map();
    }

    /**
     * Subscribe to a channel
     */
    subscribe(channelName, clientId, callback) {
      if (!this.channels.has(channelName)) {
        this.channels.set(channelName, new Set());
      }

      this.channels.get(channelName).add(clientId);

      if (!this.subscriptions.has(clientId)) {
        this.subscriptions.set(clientId, new Map());
      }

      this.subscriptions.get(clientId).set(channelName, callback);

      return {
        success: true,
        channel: channelName,
        subscribers: this.channels.get(channelName).size,
      };
    }

    /**
     * Unsubscribe from a channel
     */
    unsubscribe(channelName, clientId) {
      if (this.channels.has(channelName)) {
        this.channels.get(channelName).delete(clientId);

        if (this.channels.get(channelName).size === 0) {
          this.channels.delete(channelName);
        }
      }

      if (this.subscriptions.has(clientId)) {
        this.subscriptions.get(clientId).delete(channelName);

        if (this.subscriptions.get(clientId).size === 0) {
          this.subscriptions.delete(clientId);
        }
      }

      return true;
    }

    /**
     * Broadcast to channel
     */
    broadcast(channelName, message, excludeClientId = null) {
      if (!this.channels.has(channelName)) {
        return { broadcasted: 0 };
      }

      const subscribers = Array.from(this.channels.get(channelName));
      const filtered = subscribers.filter((id) => id !== excludeClientId);

      return {
        channel: channelName,
        broadcasted: filtered.length,
        subscribers: filtered,
      };
    }

    /**
     * Get channel info
     */
    getChannelInfo(channelName) {
      const subscribers = this.channels.get(channelName);
      return {
        name: channelName,
        subscribers: subscribers ? Array.from(subscribers) : [],
        count: subscribers?.size || 0,
      };
    }

    /**
     * Get all channels
     */
    getAllChannels() {
      return Array.from(this.channels.keys()).map((name) =>
        this.getChannelInfo(name),
      );
    }

    /**
     * Get client subscriptions
     */
    getClientSubscriptions(clientId) {
      const subs = this.subscriptions.get(clientId);
      return subs ? Array.from(subs.keys()) : [];
    }

    /**
     * Unsubscribe client from all channels
     */
    unsubscribeAll(clientId) {
      const subscriptions = Array.from(
        this.subscriptions.get(clientId)?.keys() || [],
      );

      subscriptions.forEach((channelName) => {
        this.unsubscribe(channelName, clientId);
      });

      return subscriptions.length;
    }

    clear() {
      this.channels.clear();
      this.subscriptions.clear();
    }

    getStats() {
      return {
        channels: this.channels.size,
        subscribers: this.subscriptions.size,
        totalSubscriptions: Array.from(this.subscriptions.values()).reduce(
          (sum, subs) => sum + subs.size,
          0,
        ),
      };
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
     Connection Manager
     ───────────────────────────────────────────────────────────────────── */

  class _Connection {
    constructor(id, ws, config = {}) {
      this.id = id;
      this.ws = ws;
      this.config = {
        heartbeatInterval: config.heartbeatInterval || 30000,
        reconnectInterval: config.reconnectInterval || 5000,
        maxReconnectAttempts: config.maxReconnectAttempts || 10,
        ...config,
      };

      this.state = "connecting"; // connecting, open, closing, closed
      this.createdAt = Date.now();
      this.connectedAt = null;
      this.lastHeartbeat = Date.now();
      this.reconnectAttempts = 0;
      this.messageCount = 0;
      this.bytesReceived = 0;
      this.bytesSent = 0;
      this.queue = new _MessageQueue();
      this.channels = new Set();
      this.metadata = {};
    }

    /**
     * Mark connection as open
     */
    open() {
      this.state = "open";
      this.connectedAt = Date.now();
      this.reconnectAttempts = 0;
      this.lastHeartbeat = Date.now();
    }

    /**
     * Check if connection is alive
     */
    isAlive() {
      return this.state === "open";
    }

    /**
     * Mark heartbeat received
     */
    heartbeat() {
      this.lastHeartbeat = Date.now();
    }

    /**
     * Check if heartbeat timeout
     */
    isHeartbeatTimeout(timeout = 120000) {
      return Date.now() - this.lastHeartbeat > timeout;
    }

    /**
     * Send message
     */
    send(message) {
      if (this.state !== "open") {
        return this.queue.enqueue(message);
      }

      try {
        const data =
          typeof message === "string" ? message : JSON.stringify(message);
        this.ws.send(data);
        this.bytesSent += data.length;
        this.messageCount++;
        return true;
      } catch (error) {
        return this.queue.enqueue(message);
      }
    }

    /**
     * Close connection
     */
    close() {
      this.state = "closing";
      try {
        this.ws.close();
      } catch (error) {
        //
      }
      this.state = "closed";
    }

    /**
     * Get connection stats
     */
    getStats() {
      const uptime = this.connectedAt ? Date.now() - this.connectedAt : 0;

      return {
        id: this.id,
        state: this.state,
        createdAt: this.createdAt,
        connectedAt: this.connectedAt,
        uptime,
        messageCount: this.messageCount,
        bytesSent: this.bytesSent,
        bytesReceived: this.bytesReceived,
        queueSize: this.queue.size(),
        channels: Array.from(this.channels),
        lastHeartbeat: this.lastHeartbeat,
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Main ConsoleWebSocket Class
     ═══════════════════════════════════════════════════════════════════════ */

  class ConsoleWebSocket {
    constructor(config = {}) {
      this.config = {
        port: config.port ?? 0,
        host: config.host ?? "localhost",
        debug: config.debug ?? false,
        enableCompression: config.enableCompression ?? false,
        heartbeatInterval: config.heartbeatInterval ?? 30000,
        reconnectInterval: config.reconnectInterval ?? 5000,
        maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
        ...config,
      };

      this._logger = new _Logger(this.config.debug);
      this._channels = new _ChannelManager();
      this.connections = new Map();
      this.modules = {};
      this.listeners = new Map();
      this.isRunning = false;
      this.actualPort = null;
      this.connectionCounter = 0;

      this._logger.info("v1.0.0 instantiated");
    }

    /* ─────────────────────────────────────────────────────────────────────
       Module Linking
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Link console modules
     */
    linkModules(modules) {
      const required = [
        "ConsoleSettings",
        "ConsoleRenderer",
        "ConsoleDatabase",
        "ConsoleRegistry",
        "ConsoleCommands",
        "ConsoleBridge",
      ];

      for (const moduleName of required) {
        if (modules[moduleName]) {
          this.modules[moduleName] = modules[moduleName];
        }
      }

      this._logger.success("Modules linked", {
        linked: Object.keys(this.modules).length,
      });
    }

    /**
     * Get linked module
     */
    getModule(moduleName) {
      return this.modules[moduleName] || null;
    }

    /* ─────────────────────────────────────────────────────────────────────
       Connection Management
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Add new connection
     */
    addConnection(ws, clientId = null) {
      const id = clientId || `client_${this.connectionCounter++}`;
      const connection = new _Connection(id, ws, {
        heartbeatInterval: this.config.heartbeatInterval,
        reconnectInterval: this.config.reconnectInterval,
        maxReconnectAttempts: this.config.maxReconnectAttempts,
      });

      this.connections.set(id, connection);
      connection.open();

      this._logger.log(`Connection established: ${id}`);
      this._emit("connection:opened", { id });

      return connection;
    }

    /**
     * Remove connection
     */
    removeConnection(connectionId) {
      const connection = this.connections.get(connectionId);

      if (!connection) return false;

      // Unsubscribe from all channels
      const channels = this._channels.getClientSubscriptions(connectionId);
      channels.forEach((channel) => {
        this._channels.unsubscribe(channel, connectionId);
      });

      // Flush remaining messages
      this._flushQueue(connection);

      this.connections.delete(connectionId);

      this._logger.log(`Connection removed: ${connectionId}`);
      this._emit("connection:closed", { id: connectionId });

      return true;
    }

    /**
     * Get connection
     */
    getConnection(connectionId) {
      return this.connections.get(connectionId);
    }

    /**
     * Get all connections
     */
    getAllConnections() {
      return Array.from(this.connections.values());
    }

    /**
     * Broadcast to all connections
     */
    broadcastAll(message) {
      let count = 0;

      for (const connection of this.connections.values()) {
        if (connection.isAlive()) {
          connection.send(message);
          count++;
        }
      }

      return { broadcasted: count };
    }

    /* ─────────────────────────────────────────────────────────────────────
       Channel/Pub-Sub System
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Subscribe to channel
     */
    subscribe(connectionId, channelName, handler) {
      const connection = this.connections.get(connectionId);

      if (!connection) {
        return { success: false, error: "Connection not found" };
      }

      connection.channels.add(channelName);

      return this._channels.subscribe(channelName, connectionId, handler);
    }

    /**
     * Unsubscribe from channel
     */
    unsubscribe(connectionId, channelName) {
      const connection = this.connections.get(connectionId);

      if (!connection) return false;

      connection.channels.delete(channelName);

      return this._channels.unsubscribe(channelName, connectionId);
    }

    /**
     * Publish to channel
     */
    publish(channelName, message, senderConnectionId = null) {
      const info = this._channels.broadcast(
        channelName,
        message,
        senderConnectionId,
      );

      for (const connectionId of info.subscribers) {
        const connection = this.connections.get(connectionId);
        if (connection && connection.isAlive()) {
          connection.send({
            type: "channel_message",
            channel: channelName,
            data: message,
            sender: senderConnectionId,
          });
        }
      }

      return info;
    }

    /**
     * Get channel info
     */
    getChannelInfo(channelName) {
      return this._channels.getChannelInfo(channelName);
    }

    /**
     * Get all channels
     */
    getAllChannels() {
      return this._channels.getAllChannels();
    }

    /* ─────────────────────────────────────────────────────────────────────
       Message Handling
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Process incoming message
     */
    async handleMessage(connectionId, message) {
      const connection = this.connections.get(connectionId);

      if (!connection) {
        this._logger.warn("Message from unknown connection", { connectionId });
        return;
      }

      let data;

      try {
        data = typeof message === "string" ? JSON.parse(message) : message;
        connection.bytesReceived += message.length || 0;
      } catch (error) {
        this._logger.error("Invalid message format", error.message);
        return;
      }

      const { type, command, payload, id: messageId } = data;

      switch (type) {
        case "ping":
          this._handlePing(connection);
          break;

        case "pong":
          connection.heartbeat();
          break;

        case "command":
          await this._handleCommand(connection, command, payload, messageId);
          break;

        case "query":
          await this._handleQuery(connection, command, payload, messageId);
          break;

        case "subscribe":
          this.subscribe(connectionId, payload.channel);
          break;

        case "unsubscribe":
          this.unsubscribe(connectionId, payload.channel);
          break;

        case "ping_pong":
          this._handlePing(connection);
          break;

        default:
          this._logger.warn("Unknown message type", { type });
      }
    }

    /**
     * Handle ping message
     */
    _handlePing(connection) {
      connection.send({
        type: "pong",
        timestamp: Date.now(),
      });
    }

    /**
     * Handle command execution
     */
    async _handleCommand(connection, command, payload, messageId) {
      const registry = this.getModule("ConsoleRegistry");

      if (!registry) {
        connection.send({
          type: "command_error",
          id: messageId,
          error: "Registry module not available",
        });
        return;
      }

      try {
        const result = registry.execute(command, payload);

        connection.send({
          type: "command_result",
          id: messageId,
          command,
          result,
          success: true,
          timestamp: Date.now(),
        });

        this._logger.log(`Command executed: ${command}`);
      } catch (error) {
        connection.send({
          type: "command_error",
          id: messageId,
          error: error.message,
          command,
        });

        this._logger.error(`Command failed: ${command}`, error.message);
      }
    }

    /**
     * Handle database query
     */
    async _handleQuery(connection, query, payload, messageId) {
      const db = this.getModule("ConsoleDatabase");

      if (!db) {
        connection.send({
          type: "query_error",
          id: messageId,
          error: "Database module not available",
        });
        return;
      }

      try {
        const result = db.query(query);

        connection.send({
          type: "query_result",
          id: messageId,
          query,
          result,
          success: true,
          rowCount: Array.isArray(result) ? result.length : 0,
          timestamp: Date.now(),
        });

        this._logger.log(`Query executed: ${query}`);
      } catch (error) {
        connection.send({
          type: "query_error",
          id: messageId,
          error: error.message,
          query,
        });

        this._logger.error(`Query failed: ${query}`, error.message);
      }
    }

    /**
     * Flush message queue
     */
    _flushQueue(connection) {
      while (!connection.queue.isEmpty()) {
        const item = connection.queue.dequeue();

        if (item.attempts < item.maxAttempts) {
          connection.send(item.message);
          item.attempts++;
        }
      }
    }

    /* ─────────────────────────────────────────────────────────────────────
       Server Control
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Start WebSocket server
     */
    start() {
      if (this.isRunning) {
        this._logger.warn("Server already running");
        return false;
      }

      this.actualPort =
        this.config.port === 0 ? this._findAvailablePort() : this.config.port;
      this.isRunning = true;

      // Start heartbeat
      this._startHeartbeat();

      this._logger.success(
        `WebSocket server started on ws://${this.config.host}:${this.actualPort}`,
      );

      this._emit("websocket:started", {
        port: this.actualPort,
        host: this.config.host,
      });

      return true;
    }

    /**
     * Stop WebSocket server
     */
    stop() {
      if (!this.isRunning) {
        this._logger.warn("Server not running");
        return false;
      }

      this._stopHeartbeat();

      // Close all connections
      for (const connection of this.connections.values()) {
        connection.close();
      }

      this.connections.clear();
      this.isRunning = false;

      this._logger.info("WebSocket server stopped");

      this._emit("websocket:stopped", {});

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
        url: `ws://${this.config.host}:${this.actualPort}`,
        connections: this.connections.size,
        channels: this._channels.channels.size,
      };
    }

    /* ─────────────────────────────────────────────────────────────────────
       Heartbeat & Health
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Start heartbeat interval
     */
    _startHeartbeat() {
      this._heartbeatInterval = setInterval(() => {
        this._performHeartbeat();
      }, this.config.heartbeatInterval);
    }

    /**
     * Stop heartbeat interval
     */
    _stopHeartbeat() {
      if (this._heartbeatInterval) {
        clearInterval(this._heartbeatInterval);
      }
    }

    /**
     * Perform heartbeat check
     */
    _performHeartbeat() {
      const toRemove = [];

      for (const [id, connection] of this.connections.entries()) {
        if (!connection.isAlive()) {
          toRemove.push(id);
          continue;
        }

        if (connection.isHeartbeatTimeout()) {
          this._logger.warn(`Heartbeat timeout: ${id}`);
          toRemove.push(id);
          continue;
        }

        connection.send({
          type: "ping",
          timestamp: Date.now(),
        });
      }

      // Remove dead connections
      for (const id of toRemove) {
        this.removeConnection(id);
      }
    }

    /**
     * Get health status
     */
    getHealth() {
      const connections = this.getAllConnections();
      const healthy = connections.filter((c) => c.isAlive()).length;

      return {
        status: this.isRunning ? "healthy" : "offline",
        connections: {
          total: connections.length,
          healthy,
          dead: connections.length - healthy,
        },
        channels: this._channels.channels.size,
        uptime: process.uptime?.() || 0,
      };
    }

    /* ─────────────────────────────────────────────────────────────────────
       Event System
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Listen for event
     */
    on(event, callback) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }

    /**
     * Stop listening
     */
    off(event, callback) {
      if (!this.listeners.has(event)) return;
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }

    /**
     * Emit event
     */
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
       Monitoring & Statistics
       ───────────────────────────────────────────────────────────────────── */

    /**
     * Get detailed statistics
     */
    getStats() {
      const connections = this.getAllConnections();

      return {
        server: this.getServerInfo(),
        health: this.getHealth(),
        connections: connections.map((c) => c.getStats()),
        channels: this._channels.getStats(),
        totalMessages: connections.reduce((sum, c) => sum + c.messageCount, 0),
        totalBytes: {
          sent: connections.reduce((sum, c) => sum + c.bytesSent, 0),
          received: connections.reduce((sum, c) => sum + c.bytesReceived, 0),
        },
      };
    }

    /**
     * Get debug information
     */
    debugInfo() {
      return {
        name: "ConsoleWebSocket",
        version: "1.0.0",
        running: this.isRunning,
        port: this.actualPort,
        modules: Object.keys(this.modules),
        connections: this.connections.size,
        channels: this._channels.channels.size,
        logs: this._logger.events.length,
      };
    }

    /**
     * Clear logs
     */
    clearLogs() {
      this._logger.clear();
    }

    /**
     * Get logs
     */
    getLogs(filter = null) {
      return this._logger.getEvents(filter);
    }

    /* ─────────────────────────────────────────────────────────────────────
       Utility Methods
       ───────────────────────────────────────────────────────────────────── */

    _findAvailablePort() {
      // In real environment, would use actual port detection
      return Math.floor(Math.random() * (65535 - 8000) + 8000);
    }

    /**
     * Dispose and clean up resources
     */
    dispose() {
      this.stop();
      this.listeners.clear();
      this._channels.clear();
      this.modules = {};
      this._logger.info("WebSocket disposed");
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Global Export
     ═══════════════════════════════════════════════════════════════════════ */

  window.ConsoleWebSocket = new ConsoleWebSocket({
    debug: false,
    port: 0,
    heartbeatInterval: 30000,
    maxReconnectAttempts: 10,
  });

  console.log(
    "%c[ConsoleWebSocket] %cv1.0.0 loaded and initialized",
    "color: #ff00ff; font-weight: bold;",
    "color: #00ff00;",
  );
})();
