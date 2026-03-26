# 🔗 CORE-API-CONFIG Integration Guide

## 📋 Overview

**Phase 8 (API Backend Integration)** completes the terminal system by linking the CORE layer (console.engine.js, console.history.js, console.parser.js) with the API layer (console.bridge.js, console.websocket.js) and CONFIG layer (console.settings.js).

**Three New CORE Modules:**

- ✅ **console.engine.js** (v3.0.0) - Command execution engine with full API/CONFIG linkage
- ✅ **console.history.js** (v3.0.0) - Advanced history management with search & analytics
- ✅ **console.parser.js** (v3.0.0) - Lexical/syntactic analyzer with AST generation

**Integration Points:**

- CORE ↔ API (HTTP/WebSocket)
- CORE ↔ CONFIG (Settings & Preferences)
- CORE ↔ CORE (Engine ↔ History ↔ Parser)

---

## 🔄 Module Architecture

```
┌─────────────────────────────────────────────────────┐
│         FRONTEND (terminal.html, console.bootstrap) │
│              ↓         ↑                             │
├──────────────┼─────────┼──────────────────────────┤
│    KEYBOARD  │ RENDERER│                           │
│              ↓         ↑                           │
│    ConsoleKeyboard   ConsoleRenderer              │
└──────────────┬─────────┬──────────────────────────┘
               ↓         ↑
┌──────────────────────────────────────────────────────┐
│             CORE LAYER (Command Execution)           │
│  ┌────────────────────────────────────────────────┐  │
│  │  ConsoleEngine (v3.0.0) - Command Router      │  │
│  │  - Executes commands via registered handlers  │  │
│  │  - Integrates with History & Parser           │  │
│  │  - Links with API (Bridge & WebSocket)        │  │
│  │  - Reads settings from CONFIG                 │  │
│  └────────────────────────────────────────────────┘  │
│          ↓              ↓              ↓              │
│  ┌──────────────┐ ┌────────────┐ ┌──────────────┐   │
│  │ConsoleParser │ │ConsoleHist │ │ConsoleEngine │   │
│  │(v3.0.0)      │ │ory (v3.0.0)│ │  (v3.0.0)    │   │
│  │              │ │            │ │              │   │
│  │AdvancedParse │ │Management  │ │CommandRouter │   │
│  │ +AST Gen +   │ │ +Analytics │ │  +Events +  │   │
│  │ Variables    │ │ +Search    │ │ Stats       │   │
│  └──────────────┘ └────────────┘ └──────────────┘   │
│          ↑              ↑              ↑              │
├──────────┼──────────────┼──────────────┼────────────┤
│   CONFIG LAYER (Settings & Preferences)             │
│              ConsoleSettings (v1.0.0)               │
│     - Provides configuration to CORE modules        │
│     - Terminal behavior settings                    │
│     - Theme & appearance preferences                │
└────────────┬──────────────┬────────────┬────────────┘
             ↑              ↑            ↑
┌────────────┴──────────────┴────────────┴────────────┐
│          API LAYER (External Access)                │
│  ┌────────────────────────────────────────────────┐ │
│  │ConsoleBridge (v1.0.0) - HTTP/REST API         │ │
│  │- REST endpoints for all operations             │ │
│  │- Request validation & sanitization             │ │
│  │- Rate limiting & authentication                │ │
│  │- CORS & middleware pipeline                    │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ConsoleWebSocket (v1.0.0) - Real-Time Comms    │ │
│  │- Bidirectional WebSocket connections           │ │
│  │- Channel-based pub/sub system                  │ │
│  │- Real-time command execution                   │ │
│  │- Heartbeat & connection management             │ │
│  └────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────┘
```

---

## 🔌 Module Linking Setup

### Complete Initialization Example

```javascript
// 1. Create all modules
const engine = new ConsoleEngine({ debug: true });
const history = new ConsoleHistory({ persistent: true });
const parser = new ConsoleParser({ debug: false });
const settings = new ConsoleSettings();
const bridge = new ConsoleBridge({ port: 0 });
const websocket = new ConsoleWebSocket({ port: 0 });

// 2. Connect UI to Engine
engine.connect({
  renderer: window.ConsoleRenderer,
  keyboard: window.ConsoleKeyboard,
});

// 3. Link CORE modules together
engine.linkModules({
  ConsoleParser: parser,
  ConsoleHistory: history,
  ConsoleSettings: settings,
  ConsoleBridge: bridge,
  ConsoleWebSocket: websocket,
});

// 4. Link API modules to CONFIG & CORE
bridge.linkModules({
  ConsoleSettings: settings,
  ConsoleEngine: engine,
  ConsoleHistory: history,
  ConsoleParser: parser,
  ConsoleWebSocket: websocket,
  // ... other modules
});

websocket.linkModules({
  ConsoleSettings: settings,
  ConsoleEngine: engine,
  ConsoleHistory: history,
  ConsoleParser: parser,
  ConsoleBridge: bridge,
  // ... other modules
});

// 5. Start servers
engine._logger.info("Starting servers...");
bridge.start(); // HTTP API on auto-assigned port
websocket.start(); // WebSocket on auto-assigned port

console.log("Bridge running at:", bridge.getServerInfo().url);
console.log("WebSocket running at:", websocket.getServerInfo().url);

// 6. Verify all linkage
if (engine.areAllModulesLinked()) {
  console.log("✓ All modules linked successfully");
} else {
  console.warn("⚠ Some modules not linked");
}
```

---

## 📡 Data Flow

### Command Execution Flow

```
User Input (Keyboard)
         ↓
    Engine.execute()
         ↓
ConsoleParser.parse()
  - Tokenize
  - Parse AST
  - Variable expansion
  - Validation
         ↓
Engine._commands.get(cmdName)
         ↓
Command Handler
  - Access Settings via engine._settings
  - Add to History via engine._history
  - Render output via engine._renderer
         ↓
_syncWithAPI()
  - Publish via WebSocket
  - Real-time updates to connected clients
         ↓
emit('command:executed')
  - Event for external listeners
```

### History Management

```
Engine.execute(input)
         ↓
_addToHistory(input)
  - Local backup to _consoleHistoryArray
         ↓
ConsoleHistory.add(input)
  - Storage via ConsoleHistory module
  - Index updates
         ↓
ConsoleHistory._storage.save()
  - LocalStorage persistence
```

### API Request Processing

```
HTTP POST /api/engine/execute
         ↓
ConsoleBridge (middleware pipeline)
  - CORS Middleware
  - Auth Middleware
  - Rate Limit Middleware
  - Logging Middleware
         ↓
Engine.execute(command)
         ↓
Result formatting
         ↓
Response with stats
         ↓
WebSocket publish
  - Connected clients notified in real-time
```

---

## 🔧 ConsoleEngine API Reference

### Core Methods

```javascript
// Execution
engine.execute(command);
// Returns: { success, command, executionTime, error?, suggestions? }

// Module Registration
engine.linkModules(modules);
engine.areAllModulesLinked();

// Command Registry
engine.registerCommand(name, description, actionCallback);
engine.getCommands();

// Event System
engine.on(event, callback);
engine.off(event, callback);
engine.emit(event, data);

// Statistics & Info
engine.getStats();
engine.debugInfo();
engine.getLogs(level);
engine.clearLogs();

// Cleanup
engine.dispose();
```

### Events

```javascript
// Command execution
engine.on("command:executed", (data) => {
  console.log(`Executed: ${data.command}`);
});

// Command registration
engine.on("command:registered", (data) => {
  console.log(`Registered: ${data.name}`);
});

// Module linking
engine.on("modules:linked", (data) => {
  console.log(`Linked: ${data.modules.join(", ")}`);
});

// Engine connected
engine.on("engine:connected", (data) => {
  console.log(`Connected to UI modules`);
});
```

---

## 🔧 ConsoleHistory API Reference

### Core Methods

```javascript
// Add command
const entry = history.add(command, metadata);

// Retrieval
const all = history.getAll();
const latest = history.getLatest(10);
const entry = history.get(entryId);

// Navigation
history.navigate("up"); // Like arrow up key
history.navigate("down"); // Like arrow down key

// Search & Filter
history.search(query, limit);
history.filter(predicate);
history.findByTag(tag);
history.getFavorites();
history.getByTimeRange(start, end);

// Tagging
history.addTag(entryId, tag);
history.removeTag(entryId, tag);
history.toggleFavorite(entryId);

// Analytics
history.getStats();
history.getCommandFrequency();
history.getExecutionTimeStats();
history.getTimeline(bucketSize);

// Import/Export
history.export(format); // 'json' | 'csv' | 'text'
history.import(data, format);
history.backup();
history.restore(backup);

// Module Linking
history.linkModules(modules);
history.registerAPIRoutes(bridge);

// Events
history.on(event, callback);
history.off(event, callback);
```

---

## 🔧 ConsoleParser API Reference

### Core Methods

```javascript
// Parsing
const result = parser.parse(input);
// Returns: { ast, errors, success }

// Validation
const validation = parser.validate(input);
// Returns: { success, errors, suggestions }

// Commands
parser.registerCommand(name);
parser.getRegisteredCommands();

// Variables
parser.setVariable(name, value);
parser.getVariable(name);
parser.getVariables();

// Hooks (Pre/Post-processing)
parser.beforeParse(callback);
parser.afterParse(callback);
parser.unregisterHook(name, callback);

// Module Linking
parser.linkModules(modules);
parser.areAllModulesLinked();
parser.registerAPIRoutes(bridge);

// Events
parser.on(event, callback);
parser.off(event, callback);
parser.emit(event, data);

// Info
parser.debugInfo();
parser.getLogs(level);
parser.clearLogs();
```

---

## 🌐 API Endpoints (HTTP/REST)

### Engine Endpoints

| Method | Path                 | Purpose                  |
| ------ | -------------------- | ------------------------ |
| POST   | /api/engine/execute  | Execute a command        |
| GET    | /api/engine/commands | List registered commands |
| GET    | /api/engine/stats    | Get execution statistics |
| GET    | /api/engine/debug    | Get debug information    |

### History Endpoints

| Method | Path                   | Purpose            |
| ------ | ---------------------- | ------------------ |
| GET    | /api/history           | Get all history    |
| GET    | /api/history/latest    | Get latest entries |
| GET    | /api/history/search    | Search history     |
| GET    | /api/history/stats     | Get statistics     |
| GET    | /api/history/favorites | Get favorites      |
| POST   | /api/history/import    | Import history     |
| GET    | /api/history/export    | Export history     |
| GET    | /api/history/backup    | Create backup      |

### Parser Endpoints

| Method | Path                  | Purpose          |
| ------ | --------------------- | ---------------- |
| POST   | /api/parser/parse     | Parse command    |
| POST   | /api/parser/validate  | Validate command |
| GET    | /api/parser/commands  | Get commands     |
| GET    | /api/parser/stats     | Get statistics   |
| POST   | /api/parser/variable  | Set variable     |
| GET    | /api/parser/variables | Get variables    |

---

## 🔌 WebSocket Events

### Engine Channel

```javascript
// Command executed
{
  type: 'command_executed',
  command: 'help',
  result: { success: true, ... },
  timestamp: Date.now()
}
```

### History Channel

```javascript
// History updated
{
  type: 'history_update',
  entry: { id, command, timestamp, ... },
  timestamp: Date.now()
}
```

### Parser Channel

```javascript
// Parse result
{
  type: 'parse_result',
  input: 'command arg1 arg2',
  ast: { type: 'COMMAND', name: 'command', ... },
  errors: [],
  success: true,
  timestamp: Date.now()
}
```

---

## 📊 Complete Integration Example

```javascript
// ═══════════════════════════════════════════════════════════════════════
// Full Terminal System Setup with CORE + API + CONFIG
// ═══════════════════════════════════════════════════════════════════════

class TerminalSystem {
  constructor() {
    this.components = {};
  }

  async initialize() {
    // 1. Create CORE modules
    this.components.engine = new ConsoleEngine({ debug: false });
    this.components.history = new ConsoleHistory({ persistent: true });
    this.components.parser = new ConsoleParser({ debug: false });

    // 2. Create CONFIG module
    this.components.settings = new ConsoleSettings();
    this.components.settings.setSetting('terminal.enableSuggestions', true);

    // 3. Create API modules
    this.components.bridge = new ConsoleBridge({ port: 0 });
    this.components.websocket = new ConsoleWebSocket({ port: 0 });

    // 4. Wire CORE together
    this.components.engine.link Modules({
      ConsoleParser: this.components.parser,
      ConsoleHistory: this.components.history,
      ConsoleSettings: this.components.settings,
      ConsoleBridge: this.components.bridge,
      ConsoleWebSocket: this.components.websocket,
    });

    // 5. Wire API modules
    this.components.bridge.linkModules({
      ConsoleSettings: this.components.settings,
      ConsoleEngine: this.components.engine,
      ConsoleHistory: this.components.history,
      ConsoleParser: this.components.parser,
      ConsoleWebSocket: this.components.websocket,
      // ... 9 original modules
    });

    this.components.websocket.linkModules({
      ConsoleSettings: this.components.settings,
      ConsoleEngine: this.components.engine,
      ConsoleHistory: this.components.history,
      ConsoleParser: this.components.parser,
      ConsoleBridge: this.components.bridge,
      // ... 9 original modules
    });

    // 6. Connect UI
    this.components.engine.connect({
      renderer: window.ConsoleRenderer,
      keyboard: window.ConsoleKeyboard,
    });

    // 7. Start servers
    this.components.bridge.start();
    this.components.websocket.start();

    // 8. Setup event listeners
    this.setupEventListeners();

    return true;
  }

  setupEventListeners() {
    // Engine events
    this.components.engine.on('command:executed', (data) => {
      console.log(`✓ Executed: ${data.command} (${data.executionTime}ms)`);
    });

    // History events
    this.components.history.on('history:added', (data) => {
      console.log(`📝 Added to history: ${data.entry.command}`);
    });

    // Parser events
    this.components.parser.on('parse:complete', (data) => {
      if (!data.result.success) {
        console.warn(`Parse error: ${data.result.errors[0]}`);
      }
    });
  }

  getInfo() {
    return {
      engine: this.components.engine.debugInfo(),
      history: this.components.history.debugInfo(),
      parser: this.components.parser.debugInfo(),
      bridge: this.components.bridge.getServerInfo(),
      websocket: this.components.websocket.getServerInfo(),
    };
  }

  async shutdown() {
    this.components.engine.dispose();
    this.components.history.dispose();
    this.components.parser.dispose();
    this.components.bridge.stop();
    this.components.websocket.stop();
  }
}

// Usage
const system = new TerminalSystem();
await system.initialize();
console.log(system.getInfo());

// Execute command via Engine (internal)
system.components.engine.execute('help');

// Execute command via API (external)
await fetch('http://localhost:3000/api/engine/execute', {
  method: 'POST',
  headers: { 'X-API-Token': token },
  body: JSON.stringify({ command: 'help' })
});
```

---

## 🔐 Security Considerations

1. **Module Validation**: Verify all modules are linked before starting
2. **Command Validation**: Parser validates all commands before execution
3. **API Tokens**: ConsoleBridge requires authentication for external access
4. **Rate Limiting**: API throttles requests per client
5. **Input Sanitization**: All user input is escaped and validated
6. **CORS**: Configurable cross-origin restrictions

---

## 📊 Performance Optimization

| Component | Optimization    | Benefit           |
| --------- | --------------- | ----------------- |
| Parser    | Lexical caching | Faster parsing    |
| History   | Search indexing | O(1) search       |
| Settings  | Lazy loading    | Reduced memory    |
| API       | Request caching | Lower latency     |
| WebSocket | Message queuing | Reliable delivery |

---

## 🎯 Integration Checklist

- [ ] Create ConsoleEngine instance
- [ ] Create ConsoleHistory instance
- [ ] Create ConsoleParser instance
- [ ] Create ConsoleSettings instance
- [ ] Create ConsoleBridge instance
- [ ] Create ConsoleWebSocket instance
- [ ] Link CORE modules together: `engine.linkModules(...)`
- [ ] Link API modules: `bridge.linkModules(...)`, `websocket.linkModules(...)`
- [ ] Connect UI: `engine.connect(...)`
- [ ] Start servers: `bridge.start()`, `websocket.start()`
- [ ] Verify linkage: `engine.areAllModulesLinked()`
- [ ] Setup event listeners
- [ ] Test commands via UI
- [ ] Test API endpoints
- [ ] Test WebSocket connections
- [ ] Verify real-time updates
- [ ] Monitor performance & stats

---

## 📚 Related Documentation

- [API_BRIDGE_INTEGRATION.md](API_BRIDGE_INTEGRATION.md) - HTTP/REST API details
- [WEBSOCKET_INTEGRATION.md](WEBSOCKET_INTEGRATION.md) - WebSocket details
- [CONSOLE_SETTINGS_QUICK_REFERENCE.md](CONSOLE_SETTINGS_QUICK_REFERENCE.md) - Settings guide

---

**Version**: 1.0.0 (Phase 8 - API Backend)
**Status**: Production Ready ✅
**Integration**: Complete (11 modules linked)
**API**: Fully operational (HTTP + WebSocket)
