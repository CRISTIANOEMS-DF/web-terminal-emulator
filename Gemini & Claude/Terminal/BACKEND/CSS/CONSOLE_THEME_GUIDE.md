# 🎨 Console Theme Manager - Complete Guide

## 📋 Overview

**console.theme.js v3.0.0** is a comprehensive theme management system for the terminal with:

- 20+ pre-built color palettes (dark, light, nordmatrix, dracula, etc.)
- Custom theme creation and management
- Real-time theme switching with live preview
- LocalStorage persistence for custom themes
- Complete import/export functionality
- API integration (HTTP + WebSocket)
- Advanced color overrides
- Full validation and error handling

**Status**: ✅ Production Ready
**Lines**: 1300+
**Integration**: CONFIG + API layers

---

## 🎯 Quick Start

```javascript
// Create and initialize
const theme = new ConsoleTheme({ debug: false });

// Link with other modules
theme.linkModules({
  ConsoleSettings: window.ConsoleSettings,
  ConsoleBridge: window.ConsoleBridge,
  ConsoleWebSocket: window.ConsoleWebSocket,
});

// Switch theme
theme.set("matrix");

// Get CSS variables
const css = theme.getCSSVariables();
// {
//   "--console-bg": "#000000",
//   "--console-text": "#00cc00",
//   ...
// }

// Inject into DOM
const style = document.createElement("style");
style.textContent = theme.getCSSString();
document.head.appendChild(style);
```

---

## 🎨 Available Themes (20+)

| Theme             | Style                       | Best For                  |
| ----------------- | --------------------------- | ------------------------- |
| `dark`            | Dark background, green text | Default, classic terminal |
| `matrix`          | Deep black, bright green    | Hacker aesthetic          |
| `dracula`         | Purple tones, organized     | Dark theme lovers         |
| `light`           | White background, dark text | Bright environments       |
| `nord`            | Arctic blue palette         | Professional look         |
| `monokai`         | Dark with vibrant colors    | Code editors              |
| `solarized_dark`  | Warm dark tones             | Reading-focused           |
| `solarized_light` | Warm light tones            | Daytime use               |
| `one_dark`        | Deep dark, atom-inspired    | Modern development        |
| `cyberpunk`       | Neon cyan & magenta         | Sci-fi aesthetic          |
| `retro`           | Vintage amber & cyan        | Retro 80s look            |
| `github_dark`     | GitHub's dark theme         | GitHub consistency        |
| `github_light`    | GitHub's light theme        | GitHub consistency        |
| `gruvbox_dark`    | Warm retro groove           | Comfortable dark          |
| `gruvbox_light`   | Warm retro groove light     | Comfortable light         |
| `ocean`           | Cool ocean blues            | Calm atmosphere           |
| `sunset`          | Warm sunset oranges         | Relaxing feel             |
| `forest`          | Natural green tones         | Nature-inspired           |
| `lavender`        | Soft lavender tones         | Gentle aesthetic          |
| `minimal`         | Clean minimalist            | Distraction-free          |

---

## 🎨 Theme Structure

Each theme is a palette object with these properties:

```javascript
{
  // Colors (all must be valid hex, rgb, rgba, or CSS color names)
  bg: "#0d0d0d",              // Background
  surface: "#141414",         // Card/surface background
  border: "#1f1f1f",         // Border color
  text: "#c8c8c8",           // Default text
  prompt: "#00e676",         // Command prompt color
  cursor: "#00e676",         // Text cursor
  output: "#c8c8c8",         // Command output
  info: "#40c4ff",           // Info messages
  warn: "#ffd740",           // Warning messages
  error: "#ff5252",          // Error messages
  success: "#69ff47",        // Success messages
  muted: "#4a4a4a",          // Muted/secondary text
  selection: "#00e67633",    // Text selection (with alpha)
  scrollbar: "#2a2a2a",      // Scrollbar color

  // Typography
  font: '"Courier New", monospace',  // Font family
  fontSize: "14px",                  // Font size
  lineHeight: "1.5"                  // Line height
}
```

---

## 📖 API Reference

### Core Methods

```javascript
// Get current theme
const current = theme.getCurrent();
// Returns: "matrix"

// Set theme
theme.set("dracula");
// Returns: boolean (success)

// Get theme palette
const palette = theme.get("nord");
// Returns: { bg, surface, border, text, ... }

// List all available themes
const all = theme.list();
// Returns: ["dark", "matrix", "custom_brand", ...]

// List built-in themes only
const builtin = theme.listBuiltIn();
// Returns: ["dark", "matrix", "dracula", ...]

// List custom themes only
const custom = theme.listCustom();
// Returns: ["custom_brand", "client_theme", ...]
```

### Custom Theme Management

```javascript
// Register custom theme
theme.register("my_brand", {
  bg: "#1a1a1a",
  text: "#e0e0e0",
  prompt: "#00d9ff",
  // ... other properties (defaults filled from 'dark')
});
// Returns: boolean (success)

// Update existing custom theme
theme.update("my_brand", {
  prompt: "#ff00ff", // Only update specific colors
});
// Returns: boolean (success)

// Unregister custom theme
theme.unregister("my_brand");
// Returns: boolean (success)
```

### Color Overrides

```javascript
// Override a single color (temporary, not persisted)
theme.override("prompt", "#ff0000");
// Returns: boolean (success)

// Remove override
theme.removeOverride("prompt");

// Clear all overrides
theme.clearOverrides();

// Get current overrides
const overrides = theme.getOverrides();
// Returns: { prompt: '#ff0000', ... }
```

### CSS Generation

```javascript
// Get CSS variables as object
const vars = theme.getCSSVariables();
// {
//   "--console-bg": "#0d0d0d",
//   "--console-text": "#c8c8c8",
//   "--console-prompt": "#00e676",
//   ...
// }

// Get CSS string (ready to inject)
const css = theme.getCSSString();
// ":root { --console-bg: #0d0d0d; ... }"

// Apply to DOM
const style = document.createElement("style");
style.textContent = theme.getCSSString();
document.head.appendChild(style);
```

### Import/Export

```javascript
// Export single theme as JSON
const json = theme.export("dracula");
// Returns: JSON string

// Import theme from JSON
theme.import("restored_theme", json);
// Returns: boolean (success)

// Export all custom themes
const allJson = theme.exportAll();
// Returns: JSON string with all custom themes

// Import all themes from JSON
theme.importAll(allJson);
// Returns: boolean (success)
```

### Module Linking

```javascript
// Link with other modules (CONFIG & API)
theme.linkModules({
  ConsoleSettings: window.ConsoleSettings,
  ConsoleBridge: window.ConsoleBridge,
  ConsoleWebSocket: window.ConsoleWebSocket,
});
// Returns: boolean (success)
```

---

## 🌐 API Endpoints (HTTP/REST)

### Theme Selection

```javascript
// GET /api/theme/current
// Get current theme
fetch("http://localhost:3000/api/theme/current", {
  headers: { "X-API-Token": token },
});
// Response: { success: true, theme: "matrix", palette: {...} }

// GET /api/theme/list
// List all themes
fetch("http://localhost:3000/api/theme/list", {
  headers: { "X-API-Token": token },
});
// Response: { success: true, themes: [...], builtin: [...], custom: [...] }

// GET /api/theme/:name
// Get specific theme
fetch("http://localhost:3000/api/theme/nord", {
  headers: { "X-API-Token": token },
});
// Response: { success: true, name: "nord", palette: {...} }

// POST /api/theme/set
// Set current theme
fetch("http://localhost:3000/api/theme/set", {
  method: "POST",
  headers: { "X-API-Token": token },
  body: JSON.stringify({ name: "dracula" }),
});
// Response: { success: true, current: "dracula" }
```

### Custom Theme Management

```javascript
// POST /api/theme/register
// Register custom theme
fetch("http://localhost:3000/api/theme/register", {
  method: "POST",
  headers: { "X-API-Token": token },
  body: JSON.stringify({
    name: "custom_brand",
    palette: {
      bg: "#1a1a1a",
      text: "#e0e0e0",
      // ...
    },
  }),
});
// Response: { success: true }

// DELETE /api/theme/:name
// Remove custom theme
fetch("http://localhost:3000/api/theme/custom_brand", {
  method: "DELETE",
  headers: { "X-API-Token": token },
});
// Response: { success: true }
```

### Import/Export

```javascript
// GET /api/theme/export/:name
// Export single theme
fetch("http://localhost:3000/api/theme/export/dracula", {
  headers: { "X-API-Token": token },
});
// Response: { success: true, name: "dracula", json: "..." }

// GET /api/theme/export-all
// Export all custom themes
fetch("http://localhost:3000/api/theme/export-all", {
  headers: { "X-API-Token": token },
});
// Response: { success: true, json: "..." }
```

---

## 🔌 WebSocket Events

### Theme Change Events

```javascript
// Listen for theme changes
websocket.subscribe('theme_channel', clientId, (message) => {
  if (message.type === 'theme_changed') {
    console.log(`Theme changed: ${message.from} → ${message.to}`);
    // Update UI
  }
});

// Server publishes when theme changes
{
  type: 'theme_changed',
  from: 'matrix',
  to: 'dracula',
  timestamp: Date.now()
}
```

---

## 🎯 Event System

```javascript
// Theme changed
theme.on("theme:changed", (data) => {
  console.log(`Changed from ${data.from} to ${data.to}`);
  console.log("New palette:", data.theme);
});

// Theme registered
theme.on("theme:registered", (data) => {
  console.log(`Registered: ${data.name}`);
});

// Theme updated
theme.on("theme:updated", (data) => {
  console.log(`Updated: ${data.name}`);
});

// Color override applied
theme.on("theme:overridden", (data) => {
  console.log(`Override: ${data.field} = ${data.value}`);
});

// Modules linked
theme.on("modules:linked", (data) => {
  console.log(`Linked: ${data.modules.join(", ")}`);
});
```

---

## 💾 Custom Theme Example

```javascript
// Create brand theme
const brandTheme = {
  bg: "#1a1a2e", // Company dark color
  surface: "#16213e", // Company secondary
  border: "#0f3460", // Company accents
  text: "#e94560", // Company brand color
  prompt: "#e94560", // Brand color for prompts
  cursor: "#e94560", // Brand cursor
  output: "#f8f8f2", // Light text for output
  info: "#00d4ff", // Info in cyan
  warn: "#ffaa00", // Warnings in orange
  error: "#e94560", // Errors in brand color
  success: "#00d4ff", // Success in cyan
  muted: "#7a8aa2", // Muted text
  selection: "#0f346066", // Selection with alpha
  scrollbar: "#16213e", // Border color for scrollbar
  font: '"Fira Code", monospace', // Brand font
  fontSize: "15px",
  lineHeight: "1.6",
};

// Register it
theme.register("my_company", brandTheme);

// Use it
theme.set("my_company");

// Export for distribution
const json = theme.export("my_company");
console.log(json); // Share with team

// Other team members import it
const theme2 = new ConsoleTheme();
theme2.import("my_company", json);
theme2.set("my_company");
```

---

## 🔐 Validation

### Color Validation

Supported color formats:

- Hex: `#ff0000`, `#f00`, `#ff0000cc`
- RGB: `rgb(255, 0, 0)`
- RGBA: `rgba(255, 0, 0, 0.5)`
- Named: `black`, `white`, `red`, `green`, `blue`, `yellow`

### Theme Validation

```javascript
// Validation automatically runs on register/import
// Returns validation object
const result = theme.register("bad_theme", {
  bg: "invalid-color", // ❌ Invalid color
});

// Validation errors:
// - Missing required fields
// - Invalid color formats
// - Invalid font/fontSize/lineHeight
```

---

## 🔄 Integration Example

```javascript
// ═══════════════════════════════════════════════════════
// Complete theme system setup
// ═══════════════════════════════════════════════════════

const theme = new ConsoleTheme({ debug: false });

// Link with CONFIG
const settings = new ConsoleSettings();
settings.setSetting("terminal.theme", "dark");

// Link with API
const bridge = new ConsoleBridge({ port: 0 });
const websocket = new ConsoleWebSocket({ port: 0 });

theme.linkModules({
  ConsoleSettings: settings,
  ConsoleBridge: bridge,
  ConsoleWebSocket: websocket,
});

// Setup event listeners
theme.on("theme:changed", (data) => {
  // Update settings
  settings.setSetting("terminal.theme", data.to);

  // Update UI
  document.documentElement.style.cssText = Object.entries(
    theme.getCSSVariables(),
  )
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
});

theme.on("theme:registered", (data) => {
  console.log(`✓ Custom theme available: ${data.name}`);
});

// Start servers
bridge.start();
websocket.start();

// API is now ready: /api/theme/*
// WebSocket is now ready: ws://localhost:port
```

---

## 🎨 CSS Variables in Use

Once applied to DOM, these variables are available in CSS:

```css
:root {
  --console-bg: #0d0d0d;
  --console-surface: #141414;
  --console-border: #1f1f1f;
  --console-text: #c8c8c8;
  --console-prompt: #00e676;
  --console-cursor: #00e676;
  --console-output: #c8c8c8;
  --console-info: #40c4ff;
  --console-warn: #ffd740;
  --console-error: #ff5252;
  --console-success: #69ff47;
  --console-muted: #4a4a4a;
  --console-selection: #00e67633;
  --console-scrollbar: #2a2a2a;
  --console-font: "Courier New", monospace;
  --console-font-size: 14px;
  --console-line-height: 1.5;
}

/* Usage in CSS */
.console-terminal {
  background-color: var(--console-bg);
  color: var(--console-text);
  font-family: var(--console-font);
  font-size: var(--console-font-size);
  line-height: var(--console-line-height);
}

.console-prompt {
  color: var(--console-prompt);
}

.console-error {
  color: var(--console-error);
}
```

---

## 📊 Debug Information

```javascript
const debug = theme.debugInfo();
// {
//   name: 'ConsoleTheme',
//   version: '3.0.0',
//   currentTheme: 'matrix',
//   builtinThemes: 20,
//   customThemes: 3,
//   overrides: 2,
//   storage: { available: true, key: '...' },
//   modulesLinked: { settings: true, bridge: true, websocket: true }
// }
```

---

## 🎯 Use Cases

### 1. **Brand Customization**

```javascript
// Create branded theme
theme.register("acme_corp", {
  bg: "#0a0e1a",
  text: "#00d9ff",
  prompt: "#ff00ff",
  success: "#00ff00",
  error: "#ff0000",
});
```

### 2. **Time-based Themes**

```javascript
// Dark in evening, light during day
const hour = new Date().getHours();
const themeName = hour < 6 || hour > 18 ? "dark" : "light";
theme.set(themeName);
```

### 3. **Accessibility**

```javascript
// High contrast theme for users with visual impairments
theme.register("high_contrast", {
  bg: "#000000",
  text: "#ffffff",
  prompt: "#ffff00",
  error: "#ff0000",
});
```

### 4. **Multi-tenant SaaS**

```javascript
// Each customer gets their own theme
const customerTheme = getCustomerBranding(customerId);
theme.register(`tenant_${customerId}`, customerTheme);
theme.set(`tenant_${customerId}`);
```

---

## 📈 Performance

- **CSS Variables Cache**: Avoids recalculation
- **LocalStorage Optimization**: Custom themes auto-persisted
- **Minimal Re-renders**: Event-based updates
- **Efficient Color Validation**: Regex-based with caching

---

**Version**: 3.0.0 (CSS Module)
**Status**: Production Ready ✅
**Integration**: CONFIG + API layers complete
**Built-in Themes**: 20+
**Custom Themes**: Unlimited with validation
