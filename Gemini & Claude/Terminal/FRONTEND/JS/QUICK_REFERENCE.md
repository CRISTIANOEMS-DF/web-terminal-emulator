/**
 * QUICK REFERENCE - WebConsole Bootstrap
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. INSTALLATION ORDER (HTML Head)
// ─────────────────────────────────────────────────────────────────────────────

<link rel="stylesheet" href="./BACKEND/CSS/terminal.css">

<script src="./BACKEND/CSS/console.renderer.js"></script>      <!-- REQUIRED -->
<script src="./BACKEND/CORE/console.parser.js"></script>       <!-- Optional -->
<script src="./BACKEND/CSS/console.keyboard.js"></script>      <!-- Optional -->
<script src="./BACKEND/CORE/console.engine.js"></script>       <!-- Optional -->
<script src="./FRONTEND/JS/console.bootstrap.js"></script>     <!-- LAST -->


// ─────────────────────────────────────────────────────────────────────────────
// 2. INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

const terminal = new WebConsole({
  containerId:  "body",                    // Where to mount
  promptSymbol: "root@desktop:~$ ",        // Prompt text
  theme:        "dark",                    // Theme name
  maxHistory:   500,                       // History size
  locale:       "en-US",                   // Language
  motd:         true,                      // Welcome message
  debug:        false                      // Logging
});


// ─────────────────────────────────────────────────────────────────────────────
// 3. PUBLIC API - METHODS
// ─────────────────────────────────────────────────────────────────────────────

terminal.print(text, type)                 // Print to terminal
terminal.print("Hello", "output")          // Types: output|error|info|warn
terminal.print("Warning!", "warn")

terminal.clear()                           // Clear terminal content

terminal.setTheme("light")                 // Change theme at runtime

terminal.getInfo()                         // Get terminal metadata
// Returns: { version, ready, disposed, config, modules }

terminal.dispose()                         // Cleanup & release resources


// ─────────────────────────────────────────────────────────────────────────────
// 4. PUBLIC API - EVENT SYSTEM (EventBus)
// ─────────────────────────────────────────────────────────────────────────────

// Register listeners
terminal.events.on("ready", (data) => {})
terminal.events.on("error", (error) => {})
terminal.events.on("clear", () => {})
terminal.events.on("themeChange", (data) => {})
terminal.events.on("dispose", () => {})

// One-time listener
terminal.events.once("ready", (data) => {})

// Remove listener
terminal.events.off("ready", handler)

// Emit event (internal use)
terminal.events.emit("ready", payload)


// ─────────────────────────────────────────────────────────────────────────────
// 5. LIFECYCLE FLOW
// ─────────────────────────────────────────────────────────────────────────────

/*
  new WebConsole(options)
  ├─ Constructor
  │  ├─ _validateOptions()
  │  └─ _init()
  │     ├─ _checkRequiredModules()     ← Validates ConsoleRenderer
  │     ├─ _mountModules()             ← Creates module instances
  │     │  ├─ ConsoleRenderer (REQUIRED)
  │     │  ├─ ConsoleParser (optional)
  │     │  ├─ ConsoleKeyboard (optional)
  │     │  └─ ConsoleEngine (optional)
  │     ├─ _bindGlobalEvents()         ← Cleanup on page unload
  │     └─ emit("ready")               ← Terminal is ready
  │
  └─ Ready state: terminal._state.ready = true
  
  terminal.dispose()
  ├─ Cleanup all modules
  ├─ emit("dispose")
  └─ terminal._state.disposed = true
*/


// ─────────────────────────────────────────────────────────────────────────────
// 6. MODULE STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

WebConsole {
  config       // Frozen configuration object
  version      // "2.0.0"
  events       // EventBus instance
  
  renderer     // ConsoleRenderer (required) from BACKEND/CSS/
  parser       // ConsoleParser (optional) from BACKEND/CORE/
  keyboard     // ConsoleKeyboard (optional) from BACKEND/CSS/
  engine       // ConsoleEngine (optional) from BACKEND/CORE/
  
  _state       // { ready, disposed }
  
  // Public Methods
  print(text, type)
  clear()
  setTheme(theme)
  getInfo()
  dispose()
  
  // Private Methods
  _init()
  _checkRequiredModules()
  _mountModules()
  _bindGlobalEvents()
  _validateOptions(options)
  _assertReady(methodName)
  
  // toString & Symbol
  toString()
  [Symbol.toStringTag]
}


// ─────────────────────────────────────────────────────────────────────────────
// 7. ERROR TYPES & MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

// CRITICAL ERRORS (Thrown)
ReferenceError   // Required modules missing
TypeError        // Invalid option types
RangeError       // Invalid option values

// WARNINGS (Console)
⚠ Optional module not loaded
⚠ WebConsole already defined


// ─────────────────────────────────────────────────────────────────────────────
// 8. COMPLETE EXAMPLE
// ─────────────────────────────────────────────────────────────────────────────

// Create terminal
const terminal = new WebConsole({
  theme: 'dark',
  debug: true
});

// Listen for initialization
terminal.events.on('ready', (data) => {
  console.log('Terminal v' + data.version + ' initialized');
  terminal.print('Welcome!', 'info');
});

// Listen for errors
terminal.events.on('error', (error) => {
  console.error('Terminal error:', error);
});

// Print messages
terminal.print('System online', 'output');
terminal.print('Type commands here', 'info');

// Change theme
// terminal.setTheme('light');

// Get info
const info = terminal.getInfo();
console.log(info.modules); // { renderer, parser, keyboard, engine }

// Cleanup (automatic on page unload)
// terminal.dispose();


// ─────────────────────────────────────────────────────────────────────────────
// 9. MODULE FILES & CONNECTIONS
// ─────────────────────────────────────────────────────────────────────────────

REQUIRED:
├─ BACKEND/CSS/console.renderer.js
│  ├─ Methods: buildInterface(), print(), clear(), applyTheme()
│  └─ Dependencies: console.theme.js, console.table.js

OPTIONAL (conditionally loaded):
├─ BACKEND/CORE/console.parser.js
├─ BACKEND/CSS/console.keyboard.js
└─ BACKEND/CORE/console.engine.js (receives all other modules)

SUPPORTING:
├─ BACKEND/CORE/console.history.js    (via engine)
├─ BACKEND/CSS/console.theme.js       (via renderer)
├─ BACKEND/CSS/console.table.js       (via renderer)
└─ BACKEND/JS/COMMANDS/*.js           (via engine)


// ─────────────────────────────────────────────────────────────────────────────
// 10. COMMON PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

// Check if terminal is ready
if (terminal._state.ready && !terminal._state.disposed) {
  terminal.print('Ready to use', 'output');
}

// Get all loaded modules
const info = terminal.getInfo();
if (info.modules.engine) {
  console.log('Engine is loaded, commands available');
}

// Get current configuration
console.log(terminal.config);
// { containerId, promptSymbol, theme, maxHistory, locale, motd, debug }

// Handle multiple events
['ready', 'clear', 'dispose'].forEach(event => {
  terminal.events.on(event, () => {
    console.log('Event:', event);
  });
});

// Safely create new instance (hot-reload safe)
let terminal;
try {
  terminal = new WebConsole({ debug: false });
} catch (e) {
  console.error('Failed to initialize terminal:', e);
}


// ─────────────────────────────────────────────────────────────────────────────
// 11. DEBUG TIPS
// ─────────────────────────────────────────────────────────────────────────────

// Enable verbose logging
const terminal = new WebConsole({ debug: true });

// Access terminal from DevTools console
window.terminal = terminal;
terminal.getInfo()
terminal.print('test')

// Check module availability
console.log(typeof window.ConsoleRenderer);      // "function"
console.log(typeof window.ConsoleParser);        // "function" or "undefined"
console.log(typeof window.ConsoleKeyboard);      // "function" or "undefined"
console.log(typeof window.ConsoleEngine);        // "function" or "undefined"

// Monitor events
terminal.events.on('*', (payload) => {
  console.log('Event fired:', payload);
});


// ─────────────────────────────────────────────────────────────────────────────
// 12. CONFIGURATION DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

DEFAULTS = Object.freeze({
  containerId:  "body",
  promptSymbol: "root@desktop:~$ ",
  theme:        "dark",
  maxHistory:   500,
  locale:       "en-US",
  motd:         true,
  debug:        false,
});


// ─────────────────────────────────────────────────────────────────────════════
// REFERENCES
// ═════════════════════════════════════════════════════════════════════════════
//
// Full Documentation:  README.md
// Architecture Map:    ARCHITECTURE.md
// Usage Example:       FRONTEND/terminal.html
//
// Version: 2.0.0 (English)
// Status: Ready for Integration
// ═════════════════════════════════════════════════════════════════════════════
