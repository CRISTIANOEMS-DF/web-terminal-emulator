# Console Settings - Quick Reference

## 🎯 One-Liners

```javascript
// Get/Set
window.ConsoleSettings.get("display.theme"); // 'dracula'
window.ConsoleSettings.set("display.fontSize", 16); // Save + emit event

// Get Sections
window.ConsoleSettings.getDisplaySettings(); // All display config
window.ConsoleSettings.getColors(); // All colors
window.ConsoleSettings.getBehavior(); // All behavior config
window.ConsoleSettings.getKeyboard(); // All keyboard config

// Theme
window.ConsoleSettings.applyTheme("matrix"); // Switch theme
window.ConsoleSettings.setTheme("dracula"); // Short method
window.ConsoleSettings.getAvailableThemes(); // ['dark', 'light', ...]
window.ConsoleSettings.getTheme(); // Current theme colors

// Font & Display
window.ConsoleSettings.setFontSize(18); // Also sets on document

// Reset & Import/Export
window.ConsoleSettings.resetToDefaults(); // Back to defaults
window.ConsoleSettings.exportAsJSON(); // JSON string
window.ConsoleSettings.importFromJSON(jsonString); // Load from JSON
window.ConsoleSettings.downloadSettings("backup"); // Download file

// Info
window.ConsoleSettings.getInfo(); // Module info
window.ConsoleSettings.debugInfo(); // Full debug details

// Events
window.ConsoleSettings.on("setting:changed", callback); // Listen for changes
window.ConsoleSettings.off("setting:changed", callback); // Unsubscribe
```

---

## 🎨 Themes

| Theme       | Style                       | Use Case            |
| ----------- | --------------------------- | ------------------- |
| `dark`      | Dark with green text        | Default safe choice |
| `light`     | Light background, dark text | Day mode, reading   |
| `matrix`    | Green on black              | Hacker aesthetic    |
| `solarized` | Professional colors         | Long sessions       |
| `dracula`   | Popular dark theme          | Modern, comfortable |

```javascript
window.ConsoleSettings.applyTheme("matrix");

// Create custom theme
window.ConsoleSettings.addTheme("myTheme", {
  bg: "#1e1e1e",
  surface: "#2d2d2d",
  text: "#e0e0e0",
  muted: "#808080",
});
```

---

## 📊 Common Settings Paths

### Display

- `display.theme` → Current theme name
- `display.fontSize` → Font size in pixels (default: 14)
- `display.fontFamily` → Font stack
- `display.lineHeight` → Line height multiplier (default: 1.6)
- `display.responsive` → Responsive layout (default: true)

### Colors

- `colors.background` → Background color
- `colors.text` → Text color
- `colors.prompt` → Command prompt color
- `colors.error` → Error message color
- `colors.warning` → Warning color
- `colors.success` → Success color

### Behavior

- `behavior.autoComplete` → Tab completion (default: true)
- `behavior.commandHistory` → Track history (default: true)
- `behavior.maxHistorySize` → Max commands to remember (default: 100)
- `behavior.undoRedoEnabled` → Enable undo/redo (default: true)
- `behavior.maxUndoStack` → Max undo operations (default: 50)

### Keyboard

- `keyboard.tabCompletion` → Tab autocomplete (default: true)
- `keyboard.multilineCommands` → Support multi-line (default: true)
- `keyboard.autoFocus` → Auto-focus input (default: true)
- `keyboard.detectPlatform` → Auto-detect OS (default: true)

### Database

- `database.persistence` → Save data (default: true)
- `database.autoBackup` → Automatic backups (default: true)
- `database.maxTableSize` → Max data rows (default: 10000)

### Performance

- `performance.maxTableRows` → Max visible rows (default: 1000)
- `performance.debounceDelay` → Input debounce (default: 100ms)
- `performance.enableVirtualScroll` → Virtual scrolling (default: false)
- `performance.cacheResults` → Cache queries (default: true)

---

## 🔔 Events

```javascript
// Setting changed (any setting)
window.ConsoleSettings.on("setting:changed", (data) => {
  console.log(data.path); // e.g., 'display.fontSize'
  console.log(data.oldValue); // e.g., 14
  console.log(data.newValue); // e.g., 16
});

// Theme applied
window.ConsoleSettings.on("theme:applied", (data) => {
  console.log(data.theme); // e.g., 'dracula'
});

// Custom theme added
window.ConsoleSettings.on("theme:added", (data) => {
  console.log(data.name); // Custom theme name
  console.log(data.colors); // Theme colors object
});

// Settings reset to defaults
window.ConsoleSettings.on("settings:reset", () => {
  console.log("All reset!");
});

// Settings imported
window.ConsoleSettings.on("settings:imported", () => {
  console.log("Import complete!");
});
```

---

## 💾 LocalStorage

Settings automatically persist to localStorage with prefix `console_settings_`

```javascript
// Stored key
localStorage.getItem("console_settings_all");

// Manual persistence control
window.ConsoleSettings.config.persistToLocalStorage = false; // Disable
window.ConsoleSettings._saveToLocalStorage(); // Manual save
```

---

## 🔗 Integration Quick Reference

### With ConsoleRenderer

```javascript
const theme = window.ConsoleSettings.get("display.theme");
window.ConsoleRenderer.applyTheme(theme);
```

### With ConsoleKeyboard

```javascript
const keyboard = window.ConsoleSettings.getKeyboard();
// Use keyboard.detectPlatform, tabCompletion, etc.
```

### With ConsoleDatabase

```javascript
const dbConfig = window.ConsoleSettings.get("database");
window.ConsoleDatabase.configure(dbConfig);
```

### With ConsoleTable

```javascript
const perf = window.ConsoleSettings.get("performance");
window.ConsoleTable.setMaxRows(perf.maxTableRows);
```

### With ConsoleCommands

```javascript
const history = window.ConsoleSettings.get("behavior.maxHistorySize");
window.ConsoleCommands.setHistoryLimit(history);
```

---

## 🚀 Typical Usage Workflow

```javascript
// 1️⃣ Check if loaded
if (!window.ConsoleSettings) alert("Settings not loaded!");

// 2️⃣ Get current setting
const current = window.ConsoleSettings.get("display.fontSize");

// 3️⃣ Modify it
window.ConsoleSettings.set("display.fontSize", current + 2);

// 4️⃣ Listen for changes
window.ConsoleSettings.on("setting:changed", (data) => {
  if (data.path === "display.fontSize") {
    updateUIFont(data.newValue);
  }
});

// 5️⃣ Persist (automatic)
// localStorage updated automatically

// 6️⃣ Reload next time (automatic)
// Previous value restored on page load
```

---

## 🎯 Real-World Scenarios

### Scenario 1: User Preferences Panel

```javascript
// Show current values
document.getElementById("theme-select").value =
  window.ConsoleSettings.get("display.theme");

document.getElementById("font-size").value =
  window.ConsoleSettings.get("display.fontSize");

// Handle changes
document.getElementById("theme-select").onchange = (e) => {
  window.ConsoleSettings.applyTheme(e.target.value);
};

document.getElementById("font-size").onchange = (e) => {
  window.ConsoleSettings.setFontSize(parseInt(e.target.value));
};
```

### Scenario 2: Backup User Config

```javascript
const backup = window.ConsoleSettings.exportAsJSON();
localStorage.setItem("backup_" + Date.now(), backup);

// Later, restore
const restored = localStorage.getItem("backup_1234567890");
window.ConsoleSettings.importFromJSON(restored);
```

### Scenario 3: Auto-Save Every Minute

```javascript
setInterval(() => {
  const config = window.ConsoleSettings.exportAsJSON();
  sessionStorage.setItem("auto_backup", config);
  console.log("Auto-saved");
}, 60000); // Every minute
```

### Scenario 4: Profile Switching

```javascript
const profiles = {
  work: { theme: "solarized", fontSize: 14 },
  gaming: { theme: "matrix", fontSize: 18 },
  accessibility: { theme: "light", fontSize: 20 },
};

function loadProfile(profileName) {
  const profile = profiles[profileName];
  window.ConsoleSettings.importFromJSON(JSON.stringify(profile));
}

// loadProfile('gaming');
```

### Scenario 5: Debug Session

```javascript
window.ConsoleSettings.setDebugMode(true);
const info = window.ConsoleSettings.debugInfo();

console.table({
  "Current Theme": info.currentTheme,
  "Font Size": info.fontSize,
  "Modules Loaded": Object.values(info.hasSupportedModules).filter(Boolean)
    .length,
  "All Settings": Object.keys(info.allSettings),
});
```

---

## ⚡ Performance Tips

```javascript
// ✅ Efficient: Listen to specific events
window.ConsoleSettings.on("theme:applied", handler);

// ❌ Inefficient: Polling
setInterval(() => checkTheme(), 100);

// ✅ Efficient: Batch updates
window.ConsoleSettings.set("display.fontSize", 18);
window.ConsoleSettings.set("display.lineHeight", 1.8);
window.ConsoleSettings.set("colors.text", "#00ff00");

// ✅ Cache references
const fontSize = window.ConsoleSettings.get("display.fontSize");
// Use fontSize multiple times instead of calling get() repeatedly
```

---

## 🐛 Troubleshooting

| Problem                 | Solution                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| Settings not persisting | Check: `localStorage` disabled? Try: `window.ConsoleSettings.config.persistToLocalStorage`                    |
| Theme not applying      | Verify: ConsoleRenderer loaded? Check: `window.ConsoleSettings.getInfo().hasSupportedModules.consoleRenderer` |
| Changes not visible     | Check: Event listener working? Try: `window.ConsoleSettings.on('setting:changed', console.log)`               |
| Import fails            | Verify: Valid JSON format? Try: `JSON.parse(jsonString)` in console first                                     |
| Module not linked       | Check: Load order correct? Verify: `window.ConsoleSettings.getInfo().hasSupportedModules`                     |

---

## 📦 Module Information

```javascript
window.ConsoleSettings.getInfo();
// {
//   moduleName: 'ConsoleSettings',
//   version: '1.0.0',
//   initialized: true,
//   currentTheme: 'dracula',
//   fontSize: 14,
//   isPersistent: true,
//   hasSupportedModules: {
//     consoleRenderer: true,
//     consoleDatabase: true,
//     consoleTable: true,
//     consoleCommands: true,
//     consoleRegistry: true,
//     consoleKeyboard: true,
//     consoleBuiltins: true,
//     consoleBridge: false,
//     webConsole: true
//   }
// }
```

---

## 📚 All Available Methods

| Method                       | Returns | Notes                       |
| ---------------------------- | ------- | --------------------------- |
| `get(path, default)`         | any     | Get setting by path         |
| `set(path, value)`           | boolean | Set setting (saves + emits) |
| `getAll()`                   | object  | Get all settings            |
| `resetToDefaults()`          | boolean | Reset all settings          |
| `getDisplaySettings()`       | object  | Get display config          |
| `getColors()`                | object  | Get colors config           |
| `getBehavior()`              | object  | Get behavior config         |
| `getKeyboard()`              | object  | Get keyboard config         |
| `setFontSize(size)`          | void    | Change font size            |
| `setTheme(name)`             | void    | Change theme                |
| `setDebugMode(enabled)`      | void    | Toggle debug logging        |
| `getAvailableThemes()`       | array   | List theme names            |
| `getTheme(name)`             | object  | Get theme colors            |
| `applyTheme(name)`           | boolean | Switch theme                |
| `addTheme(name, colors)`     | boolean | Add custom theme            |
| `exportAsJSON()`             | string  | Export settings as JSON     |
| `importFromJSON(json)`       | boolean | Import from JSON            |
| `downloadSettings(filename)` | void    | Download settings file      |
| `on(event, callback)`        | void    | Listen for event            |
| `off(event, callback)`       | void    | Stop listening              |
| `getInfo()`                  | object  | Module info                 |
| `debugInfo()`                | object  | Detailed debug info         |

---

## 🔗 File Locations

| File                  | Location                             |
| --------------------- | ------------------------------------ |
| **Main Module**       | `BACKEND/CONFIG/console.settings.js` |
| **Engine**            | `BACKEND/CORE/console.engine.js`     |
| **Integration Guide** | `CONSOLE_SETTINGS_INTEGRATION.md`    |
| **Examples**          | `CONSOLE_SETTINGS_EXAMPLES.js`       |
| **Quick Reference**   | This file                            |

---

## ✨ Version Info

- **Version**: 1.0.0
- **Status**: Production Ready ✓
- **Auto-Save**: Enabled ✓
- **Event System**: Full ✓
- **Module Linking**: Complete ✓
- **localStorage Persistence**: Enabled ✓
- **Themes**: 5 built-in + custom support ✓

---

**Last Updated**: Phase 7 - Complete Settings Implementation
