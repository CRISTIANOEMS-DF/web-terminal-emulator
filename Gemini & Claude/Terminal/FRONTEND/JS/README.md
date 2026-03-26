# WebConsole Bootstrap - English Version

## Overview

`console.bootstrap.js` is the main orchestrator for the WebConsole Terminal system. It initializes, configures, and exposes the terminal interface to the browser environment.

## Features

- ✅ **Modular Architecture**: Supports optional and required module loading
- ✅ **EventBus System**: Full event-driven lifecycle management
- ✅ **Error Handling**: Comprehensive validation and graceful error handling
- ✅ **Hot-Reload Safe**: Prevents duplicate instance overwriting
- ✅ **Type Validation**: All options are validated before initialization
- ✅ **English Documentation**: Complete English codebase with inline comments

## Module Dependencies

### Required Modules
- **ConsoleRenderer** (`BACKEND/CSS/console.renderer.js`)
  - Must be loaded before bootstrap
  - Handles all DOM rendering and UI display

### Optional Modules
- **ConsoleParser** (`BACKEND/CORE/console.parser.js`) - Command parsing
- **ConsoleKeyboard** (`BACKEND/CSS/console.keyboard.js`) - Input handling
- **ConsoleEngine** (`BACKEND/CORE/console.engine.js`) - Command execution

### Supporting Modules
- **ConsoleHistory** - History management
- **ConsoleTheme** - Theme system
- **ConsoleTable** - Table formatting
- **Command Handlers** - Built-in commands, database, registry

## File Structure

```
Terminal/
├── FRONTEND/
│   ├── terminal.html              ← Main HTML file (example usage)
│   └── JS/
│       └── console.bootstrap.js   ← Bootstrap orchestrator (ENGLISH)
│
├── BACKEND/
│   ├── API/
│   │   ├── console.bridge.js
│   │   └── console.websocket.js
│   │
│   ├── CONFIG/
│   │   └── console.settings.js
│   │
│   ├── CORE/
│   │   ├── console.engine.js      ← Command execution engine
│   │   ├── console.history.js     ← History management
│   │   └── console.parser.js      ← Input parser
│   │
│   ├── CSS/
│   │   ├── console.keyboard.js    ← Keyboard handler
│   │   ├── console.renderer.js    ← DOM renderer (REQUIRED)
│   │   ├── console.table.js       ← Table renderer
│   │   ├── console.theme.js       ← Theme manager
│   │   └── terminal.css           ← Styling
│   │
│   └── JS/
│       └── COMMANDS/
│           ├── console.builtins.js
│           ├── console.commands.js
│           ├── console.database.js
│           └── console.registry.js
│
└── ARCHITECTURE.md                ← Module interconnection map
```

## Usage

### Basic Setup

```html
<!-- 1. Load required modules FIRST -->
<script src="./BACKEND/CSS/console.renderer.js"></script>

<!-- 2. Load optional modules -->
<script src="./BACKEND/CORE/console.parser.js"></script>
<script src="./BACKEND/CSS/console.keyboard.js"></script>
<script src="./BACKEND/CORE/console.engine.js"></script>

<!-- 3. Load bootstrap LAST -->
<script src="./FRONTEND/JS/console.bootstrap.js"></script>

<!-- 4. Initialize terminal -->
<script>
  const terminal = new WebConsole({
    containerId: 'body',
    theme: 'dark',
    debug: false
  });
</script>
```

### Configuration Options

```javascript
const terminal = new WebConsole({
  containerId: 'body',           // Element ID for mounting (default: "body")
  promptSymbol: 'root@host:~$ ',  // Prompt text (default: "root@desktop:~$ ")
  theme: 'dark',                  // Visual theme (default: "dark")
  maxHistory: 500,                // Max history lines (default: 500)
  locale: 'en-US',                // Language locale (default: "en-US")
  motd: true,                     // Show welcome message (default: true)
  debug: false                    // Enable logging (default: false)
});
```

## Public API

### Methods

```javascript
// Print text to terminal
terminal.print('Hello, World!', 'output');
terminal.print('Error occurred!', 'error');
terminal.print('Information', 'info');

// Clear terminal
terminal.clear();

// Change theme at runtime
terminal.setTheme('light');

// Get terminal metadata
const info = terminal.getInfo();
// Returns: { version, ready, disposed, config, modules }

// Release resources
terminal.dispose();
```

### Event System

```javascript
// Listen for ready event
terminal.events.on('ready', (data) => {
  console.log('Terminal initialized:', data.version);
});

// Listen for errors
terminal.events.on('error', (error) => {
  console.error('Terminal error:', error);
});

// Listen for theme changes
terminal.events.on('themeChange', (data) => {
  console.log('Theme changed to:', data.theme);
});

// Listen for clear events
terminal.events.on('clear', () => {
  console.log('Terminal cleared');
});

// Listen for disposal
terminal.events.on('dispose', () => {
  console.log('Terminal shutting down');
});

// One-time listener
terminal.events.once('ready', (data) => {
  console.log('First time ready only');
});

// Remove listener
const handler = () => { /* ... */ };
terminal.events.on('ready', handler);
terminal.events.off('ready', handler);
```

## Module Lifecycle

### 1. Constructor
```javascript
new WebConsole(options)
```
- Validates options
- Initializes state
- Triggers `_init()`

### 2. Initialization (_init)
- Checks required modules
- Mounts all available modules
- Binds global events
- Emits 'ready' event

### 3. Module Mounting (_mountModules)
- **ConsoleRenderer** → Required, creates DOM interface
- **ConsoleParser** → Optional, validates available
- **ConsoleKeyboard** → Optional, validates available
- **ConsoleEngine** → Optional, receives other modules

### 4. Shutdown (dispose)
- Calls dispose on all modules
- Emits 'dispose' event
- Marks terminal as disposed
- Prevents further operations

## Error Handling

### Critical Errors (Throws)
```javascript
// Missing required ConsoleRenderer module
ReferenceError: Required module(s) not found: ConsoleRenderer. 
Expected from BACKEND/CSS/console.renderer.js. 
Ensure files are loaded before console.bootstrap.js.

// Invalid options
TypeError: WebConsole: options must be a plain object.
TypeError: WebConsole: theme must be a string.
RangeError: WebConsole: maxHistory must be a positive integer.

// Operations on disposed terminal
Error: WebConsole: cannot call "print" — terminal has been disposed.
Error: WebConsole: cannot call "print" — terminal is not yet ready.
```

### Warnings (Console)
```javascript
// Missing optional modules
⚠ Optional module "ConsoleParser" not loaded — 
related features will be disabled. 
Check: BACKEND/CORE/ or BACKEND/CSS/ for the module.

// Duplicate instance
⚠ window.WebConsole is already defined. 
The existing version will not be overwritten. 
Remove duplicate declarations if this is unexpected.
```

## Example: Complete Integration

See [FRONTEND/terminal.html](./FRONTEND/terminal.html) for a complete working example including:
- Proper module loading order
- Terminal initialization
- Event listener setup
- Example API usage
- Debug console integration

## Translation Notes

- All code comments are in **English**
- All error messages are in **English**
- All variable names follow **English conventions**
- All documentation uses **English terminology**

## Version Information

- **Current Version**: 2.0.0
- **Language**: English (translated from Portuguese)
- **Last Updated**: 2026-03-25

## Module Connection Matrix

| Module | Location | Type | Required | Provides |
|--------|----------|------|----------|----------|
| ConsoleRenderer | BACKEND/CSS/ | DOM | ✅ Yes | UI rendering |
| ConsoleParser | BACKEND/CORE/ | Logic | ⚪ No | Input parsing |
| ConsoleKeyboard | BACKEND/CSS/ | Input | ⚪ No | Keyboard events |
| ConsoleEngine | BACKEND/CORE/ | Logic | ⚪ No | Command exec |
| ConsoleHistory | BACKEND/CORE/ | Data | ⚪ No | History mgmt |
| ConsoleTheme | BACKEND/CSS/ | Style | ⚪ No | Themes |
| ConsoleTable | BACKEND/CSS/ | Render | ⚪ No | Table format |

## Troubleshooting

### "Required module(s) not found: ConsoleRenderer"
- Load `BACKEND/CSS/console.renderer.js` **before** `console.bootstrap.js`
- Check file paths are correct
- Ensure the module declares `window.ConsoleRenderer`

### "Optional module 'ConsoleEngine' not loaded"
- This is a warning, not an error
- Terminal will work without optional modules
- Load `BACKEND/CORE/console.engine.js` if you need command execution

### "terminal has been disposed"
- Terminal was already shut down
- Create a new WebConsole instance: `terminal = new WebConsole()`
- Or call `terminal.dispose()` before creating new instance

### Debug Mode
```javascript
const terminal = new WebConsole({ debug: true });
// Now all initialization steps will be logged to console
```

## License & Credits

- **Project**: WebConsole Terminal
- **Version**: 2.0.0
- **Language**: English
- **Status**: Active Development
