/\*\*

- GETTING STARTED - WebConsole Bootstrap v2.0.0 (English)
- ═════════════════════════════════════════════════════════════════════════════
-
- Quick start guide for WebConsole Terminal System
- Complete documentation available in documentation files
  \*/

// ─────────────────────────────────────────────────────────────────────────────
// 1. FILE LOCATIONS & WHAT EACH DOES
// ─────────────────────────────────────────────────────────────────────────────

📁 FRONTEND/JS/console.bootstrap.js
→ MAIN FILE (Translated to English)
→ Orchestrates terminal initialization and management
→ Your entry point for using the terminal

📁 README.md
→ Complete usage guide with all examples
→ Start here if you want full documentation

📁 QUICK_REFERENCE.md
→ Copy-paste ready code snippets
→ Fast API reference

📁 ARCHITECTURE.md
→ Module dependency mapping
→ How modules connect together

📁 terminal.html
→ Working example file
→ Shows proper module loading order

📁 MANIFEST.md
→ Technical translation details
→ Module connection matrix

// ─────────────────────────────────────────────────────────────────────────────
// 2. MINIMUM SETUP (5 steps)
// ─────────────────────────────────────────────────────────────────────────────

Step 1: Create HTML file with all required scripts
└─ Copy from: terminal.html

Step 2: Load CSS
└─ <link rel="stylesheet" href="./BACKEND/CSS/terminal.css">

Step 3: Load Renderer (REQUIRED)
└─ <script src="./BACKEND/CSS/console.renderer.js"></script>

Step 4: Load Bootstrap (LAST)
└─ <script src="./FRONTEND/JS/console.bootstrap.js"></script>

Step 5: Initialize
└─ const terminal = new WebConsole({ theme: 'dark' });

// ─────────────────────────────────────────────────────────────────────────────
// 3. BASIC EXAMPLE (Copy & Paste)
// ─────────────────────────────────────────────────────────────────────────────

<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="./BACKEND/CSS/terminal.css">
</head>
<body id="terminal">
  <!-- REQUIRED -->
  <script src="./BACKEND/CSS/console.renderer.js"></script>
  
  <!-- Optional -->
  <script src="./BACKEND/CORE/console.parser.js"></script>
  <script src="./BACKEND/CSS/console.keyboard.js"></script>
  <script src="./BACKEND/CORE/console.engine.js"></script>
  
  <!-- Bootstrap LAST -->
  <script src="./FRONTEND/JS/console.bootstrap.js"></script>
  
  <script>
    // Create terminal
    const terminal = new WebConsole({
      containerId: 'terminal',
      theme: 'dark',
      debug: false
    });
    
    // Listen for ready
    terminal.events.on('ready', () => {
      terminal.print('Terminal initialized!', 'info');
    });
    
    // Use API
    terminal.print('Welcome to WebConsole', 'output');
  </script>
</body>
</html>

// ─────────────────────────────────────────────────────────────────────────────
// 4. API CHEAT SHEET
// ─────────────────────────────────────────────────────────────────────────────

// Print text
terminal.print("Hello", "output"); // Types: output | error | info | warn
terminal.print("Error!", "error");
terminal.print("Info", "info");

// Clear display
terminal.clear();

// Change theme
terminal.setTheme("light");

// Get info
terminal.getInfo(); // Returns metadata

// Listen for events
terminal.events.on("ready", (data) => {});
terminal.events.on("error", (err) => {});
terminal.events.on("clear", () => {});

// Cleanup
terminal.dispose();

// ─────────────────────────────────────────────────────────────────────────────
// 5. TROUBLESHOOTING
// ─────────────────────────────────────────────────────────────────────────────

❌ "Required module(s) not found: ConsoleRenderer"
✓ Load BACKEND/CSS/console.renderer.js BEFORE console.bootstrap.js

❌ "Optional module 'ConsoleEngine' not loaded"
✓ This is just a warning - terminal still works
✓ Load BACKEND/CORE/console.engine.js if you need it

❌ "terminal has been disposed"
✓ Create new instance: terminal = new WebConsole()

❌ Styles not showing
✓ Load BACKEND/CSS/terminal.css in <head>

// ─────────────────────────────────────────────────────────────────────────────
// 6. MODULE DEPENDENCIES
// ─────────────────────────────────────────────────────────────────────────────

REQUIRED:
└─ BACKEND/CSS/console.renderer.js
└─ Must declare: window.ConsoleRenderer
└─ Must load BEFORE bootstrap.js

OPTIONAL (Choose what you need):
├─ BACKEND/CORE/console.parser.js
│ └─ For command parsing
├─ BACKEND/CSS/console.keyboard.js
│ └─ For keyboard input
└─ BACKEND/CORE/console.engine.js
└─ For command execution
└─ Receives all other modules

SUPPORTING (Loaded by main modules):
├─ BACKEND/CORE/console.history.js (via Engine)
├─ BACKEND/CSS/console.theme.js (via Renderer)
├─ BACKEND/CSS/console.table.js (via Renderer)
└─ BACKEND/JS/COMMANDS/\*.js (via Engine)

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONFIGURATION OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

new WebConsole({
containerId: "body", // Where to mount (default: "body")
promptSymbol: "user@host:~$ ", // Prompt text (default: "root@desktop:~$ ")
theme: "dark", // Theme (default: "dark")
maxHistory: 500, // History size (default: 500)
locale: "en-US", // Language (default: "en-US")
motd: true, // Show welcome (default: true)
debug: false // Enable logging (default: false)
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. UNDERSTANDING THE FLOW
// ─────────────────────────────────────────────────────────────────────────────

HTML loads
↓
ConsoleRenderer loaded to window.ConsoleRenderer
↓
Optional modules loaded (if available)
↓
console.bootstrap.js loaded
↓
new WebConsole() called
↓
Constructor runs \_init()
↓
\_checkRequiredModules() verifies ConsoleRenderer exists
↓
\_mountModules() creates all module instances
↓
\_bindGlobalEvents() for cleanup
↓
Events emit "ready"
↓
Terminal ready to use!

// ─────────────────────────────────────────────────────────────────────────────
// 9. EVENT SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

// Setup listeners
terminal.events.on("ready", (data) => {
console.log("Terminal v" + data.version + " ready");
});

terminal.events.on("error", (error) => {
console.error("Terminal error:", error);
});

terminal.events.on("clear", () => {
console.log("Terminal cleared");
});

terminal.events.on("themeChange", (data) => {
console.log("Theme changed to: " + data.theme);
});

terminal.events.on("dispose", () => {
console.log("Terminal shutting down");
});

// One-time listener
terminal.events.once("ready", (data) => {
console.log("First ready only");
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. NEXT STEPS
// ─────────────────────────────────────────────────────────────────────────────

1. Read README.md for full documentation
   → Complete API reference
   → All features explained
   → Error handling guide

2. Check terminal.html for working example
   → Copy-paste ready
   → Shows all features
   → Good starting point

3. Use QUICK_REFERENCE.md for fast lookups
   → Code snippets
   → Common patterns
   → Debug tips

4. Implement backend modules
   → BACKEND/CSS/console.renderer.js
   → BACKEND/CORE/console.parser.js
   → BACKEND/CSS/console.keyboard.js
   → BACKEND/CORE/console.engine.js
   → See ARCHITECTURE.md for module specs

5. Refer to MANIFEST.md for technical details
   → Module connections
   → Loading order
   → Validation checklist

// ─────────────────────────────────────────────────────────────────────────────
// 11. KEY FEATURES
// ─────────────────────────────────────────────────────────────────────────────

✅ Modular Architecture

- Load only what you need
- Optional modules don't break system

✅ Event-Driven

- Listen for lifecycle events
- React to state changes

✅ Robust Error Handling

- Clear error messages
- Validation of all options
- Graceful degradation

✅ Hot-Reload Safe

- Won't overwrite existing instances
- Good for development

✅ English Documentation

- All code in English
- Comments in English
- Messages in English

// ─────────────────────────────────────────────────────────────────────────────
// 12. SUPPORT RESOURCES
// ─────────────────────────────────────────────────────────────────────────────

📖 Documentation Files:

- README.md ..................... Full guide
- ARCHITECTURE.md ............... Module design
- QUICK_REFERENCE.md ............ API reference
- terminal.html ................. Working example
- MANIFEST.md ................... Technical details

🔍 In the Code:

- JSDoc comments in console.bootstrap.js
- Error messages with file path hints
- Module references in comments

💡 Examples:

- terminal.html ................. Complete working setup
- QUICK_REFERENCE.md ............ Code snippets

❓ Troubleshooting:

- MANIFEST.md validation section
- Error types and solutions
- Debug mode (debug: true)

// ─────────────────────────────────────────────────────────────────────────────
// VERSION & CREDITS
// ─────────────────────────────────────────────────────────────────────────────

Version: 2.0.0
Language: English (Translated from Portuguese)
Status: Ready for Integration
Last Updated: 2026-03-25

Project: WebConsole Terminal System
Type: Web-based Terminal Emulator
Focus: Modular, English, Event-driven Architecture

// ═════════════════════════════════════════════════════════════════════════════
// READY TO START? → Open terminal.html or continue with README.md
// ═════════════════════════════════════════════════════════════════════════════
