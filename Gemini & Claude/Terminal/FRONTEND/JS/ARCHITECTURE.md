/**
 * ARCHITECTURE & MODULE DEPENDENCIES
 * 
 * WebConsole Terminal System - Module Interconnection Map
 * ======================================================
 * 
 * FILE LOADING ORDER (Critical):
 * 1. BACKEND/CSS/console.renderer.js      → Declares global.ConsoleRenderer
 * 2. BACKEND/CORE/console.parser.js       → Declares global.ConsoleParser (optional)
 * 3. BACKEND/CSS/console.keyboard.js      → Declares global.ConsoleKeyboard (optional)
 * 4. BACKEND/CORE/console.engine.js       → Declares global.ConsoleEngine (optional)
 * 5. FRONTEND/JS/console.bootstrap.js     → Initializes and orchestrates modules
 * 
 * 
 * REQUIRED MODULES
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * ConsoleRenderer (BACKEND/CSS/console.renderer.js)
 * ─────────────────────────────────────────────────
 * Purpose:     Handles all DOM manipulation and rendering of terminal output
 * Provides:    - buildInterface()          - Creates terminal DOM structure
 *              - print(text, type)         - Outputs text to terminal
 *              - clear()                   - Clears all terminal content
 *              - applyTheme(theme)         - Applies visual theme
 *              - printWelcomeMessage()     - Displays startup message
 * Dependencies: - BACKEND/CSS/console.theme.js      (theme system)
 *               - BACKEND/CSS/console.table.js      (table formatting)
 *               - BACKEND/CSS/terminal.css          (styling)
 * 
 * Used by:     bootstrap.js (required initialization)
 * 
 * 
 * OPTIONAL MODULES
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * ConsoleParser (BACKEND/CORE/console.parser.js)
 * ────────────────────────────────────────────────
 * Purpose:     Parses user input and interprets command strings
 * Provides:    - parse(input)              - Tokenizes and validates input
 *              - tokenize(input)           - Breaks input into tokens
 *              - validate(tokens)          - Validates command syntax
 * Provides:    Command parsing and validation utilities
 * Used by:     ConsoleEngine for command processing
 * Dependencies: None specified
 * 
 * 
 * ConsoleKeyboard (BACKEND/CSS/console.keyboard.js)
 * ───────────────────────────────────────────────────
 * Purpose:     Handles keyboard events and input mechanisms
 * Provides:    - attachListener()          - Binds keyboard events
 *              - captureInput()            - Captures user keystrokes
 *              - handleNavigation()        - Manages history navigation
 * Used by:     ConsoleEngine for user input handling
 * Dependencies: None specified
 * 
 * 
 * ConsoleEngine (BACKEND/CORE/console.engine.js)
 * ────────────────────────────────────────────────
 * Purpose:     Main command execution engine and workflow orchestrator
 * Receives:    { renderer, parser, keyboard } - Other module instances
 * Provides:    - execute(command)          - Executes parsed commands
 *              - processInput()            - Handles complete input
 * Dependencies: - BACKEND/CORE/console.history.js   (command history)
 *               - BACKEND/JS/COMMANDS/console.builtins.js
 *               - BACKEND/JS/COMMANDS/console.commands.js
 *               - BACKEND/JS/COMMANDS/console.database.js
 *               - BACKEND/JS/COMMANDS/console.registry.js
 * Used by:     bootstrap.js as main orchestrator
 * 
 * 
 * SUPPORTING MODULES (Accessed through main modules)
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * ConsoleHistory (BACKEND/CORE/console.history.js)
 * ────────────────────────────────────────────────
 * Role:        Manages command history and navigation
 * Accessed by: ConsoleEngine
 * 
 * ConsoleTheme (BACKEND/CSS/console.theme.js)
 * ────────────────────────────────────────────
 * Role:        Provides theme configuration and styles
 * Accessed by: ConsoleRenderer via applyTheme()
 * 
 * ConsoleTable (BACKEND/CSS/console.table.js)
 * ───────────────────────────────────────────
 * Role:        Renders data tables in terminal format
 * Accessed by: ConsoleRenderer
 * 
 * Command Handlers (BACKEND/JS/COMMANDS/*.js)
 * ────────────────────────────────────────────
 * - console.builtins.js    - Built-in shell commands
 * - console.commands.js    - User-defined commands
 * - console.database.js    - Database operations
 * - console.registry.js    - Command registry management
 * Accessed by: ConsoleEngine for command execution
 * 
 * Styling (BACKEND/CSS/terminal.css)
 * ──────────────────────────────────
 * Role:        CSS styling for terminal interface
 * Loaded by:   HTML file (FRONTEND/terminal.html)
 * 
 * 
 * INITIALIZATION FLOW
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * 1. new WebConsole(options)
 *    ├─ _validateOptions()           - Validates configuration
 *    └─ _init()
 *       ├─ _checkRequiredModules()    ✓ Verifies ConsoleRenderer exists
 *       ├─ _mountModules()            - Instantiates modules
 *       │  ├─ ConsoleRenderer()       - REQUIRED
 *       │  ├─ ConsoleParser()         - Optional
 *       │  ├─ ConsoleKeyboard()       - Optional
 *       │  └─ ConsoleEngine()         - Optional (receives all modules)
 *       ├─ _bindGlobalEvents()        - Setup lifecycle handlers
 *       └─ emit("ready")              - Signal startup complete
 * 
 * 
 * PUBLIC API
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * terminal = new WebConsole({ debug: true })
 * 
 * terminal.print(text, type)         - Print to terminal
 * terminal.clear()                   - Clear terminal
 * terminal.setTheme(theme)           - Change theme runtime
 * terminal.getInfo()                 - Get terminal status
 * terminal.dispose()                 - Cleanup resources
 * 
 * terminal.events.on("ready", ...)   - Listen for lifecycle events
 * terminal.events.emit("clear", ...) - Emit events
 * 
 * 
 * ENVIRONMENT EXPECTATIONS
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * HTML Global Scope:
 * - window.ConsoleRenderer    (REQUIRED)
 * - window.ConsoleParser      (optional)
 * - window.ConsoleKeyboard    (optional)
 * - window.ConsoleEngine      (optional)
 * - window.WebConsole         (after bootstrap.js loads)
 * 
 * Configuration:
 * - containerId               Default: "body"
 * - promptSymbol              Default: "root@desktop:~$ "
 * - theme                     Default: "dark"
 * - maxHistory                Default: 500
 * - locale                    Default: "en-US"
 * - motd                       Default: true
 * - debug                     Default: false
 * 
 * 
 * ERROR HANDLING & WARNINGS
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Critical Errors (Throw):
 * - ReferenceError: Required modules not in global scope
 * - TypeError: Invalid option types
 * - RangeError: Invalid option values (e.g., maxHistory < 1)
 * 
 * Warnings (Console):
 * - Missing optional modules (Parser, Keyboard, Engine)
 * - Event handler errors logged with context
 * - Duplicate WebConsole instance detection
 * 
 * 
 * VERSION HISTORY
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * v2.0.0
 * - Complete English rewrite
 * - Enhanced module linking documentation
 * - Improved error messages with file path hints
 * - Optional module loading with graceful degradation
 * - EventBus for lifecycle management
 * - Hot-reload safety (no overwrite of existing instances)
 */
