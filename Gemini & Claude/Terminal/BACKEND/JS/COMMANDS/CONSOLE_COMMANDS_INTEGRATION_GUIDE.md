# Console Commands Integration Guide v1.0.0

## 📋 Overview

O sistema de comandos é composto por 3 módulos principais:

1. **ConsoleRegistry** (v1.0.0) - Registro e gerenciamento de comandos
2. **ConsoleCommands** (v1.0.0) - Parser e executor de comandos
3. **ConsoleBuiltins** (v1.0.0) - Comandos padrão do sistema

## 🔗 Architecture

```
User Input (Terminal)
    ↓
ConsoleKeyboard (capture input)
    ↓
ConsoleCommands.execute(input)
    ↓
_CommandParser.parse(input) → { commandName, args, options }
    ↓
ConsoleRegistry.getCommand(commandName) → command object
    ↓
command.validate(args) → boolean
    ↓
command.execute(context) → Promise
    ↓
ConsoleRenderer.print(output)
    ↓
Terminal Display
```

## ⚙️ Setup & Initialization

### 1. Load Scripts in Order

```html
<!-- Core modules FIRST -->
<script src="console.bootstrap.js"></script>
<script src="console.renderer.js"></script>
<script src="console.keyboard.js"></script>

<!-- Database & Table modules -->
<script src="console.database.js"></script>
<script src="console.table.js"></script>

<!-- Commands modules LAST -->
<script src="console.registry.js"></script>
<script src="console.commands.js"></script>
<script src="console.builtins.js"></script>
```

### 2. Setup Commands System

```javascript
// Get module instances
const registry = window.ConsoleRegistry;
const commands = window.ConsoleCommands;
const builtins = window.ConsoleBuiltins;
const renderer = window.ConsoleRenderer;
const database = window.ConsoleDatabase;
const table = window.ConsoleTable;

// Connect modules
commands.connectRegistry(registry);
commands.connectRenderer(renderer);
commands.connectDatabase(database);
commands.connectTable(table);

// Register built-in commands
builtins.register(registry);

// Now you can execute commands!
```

### 3. Execute Commands

```javascript
// Execute a command
const result = await commands.execute("help");

// Execute with arguments
const result = await commands.execute("select users --limit 10");

// Execute with options
const result = await commands.execute(
  "export users --format csv --file myusers",
);
```

## 📊 ConsoleRegistry API

### Register Command

```javascript
registry.registerCommand("mycommand", {
  description: "My custom command",
  usage: "mycommand <arg> [options]",
  category: "custom",
  aliases: ["mc", "mine"],
  help: "This is my custom command",
  validate: (args, options) => args.length > 0,
  execute: async (ctx) => {
    const { args, options, renderer } = ctx;
    renderer.print(`Hello from mycommand with ${args[0]}`);
    return { success: true };
  },
});
```

### Register Alias

```javascript
registry.registerAlias("sel", "select"); // 'sel' now runs 'select'
```

### Get Command Info

```javascript
const cmd = registry.getCommand("select");
console.log(cmd.description); // "Query database tables"

const help = registry.getHelp("select");
console.log(help); // Formatted help text

const general = registry.getGeneralHelp();
console.log(general); // All commands with descriptions
```

### List Commands

```javascript
// All commands
const all = registry.listCommands();

// By category
const db = registry.listCommands("database");

// By category object
const byCategory = registry.getCommandsByCategory();
```

### Plugin System

```javascript
// Load plugin
const plugin = {
  name: "my-plugin",
  onLoad: (registry) => {
    // Register commands
    registry.registerCommand("plugcmd", {
      /* ... */
    });
  },
  onUnload: (registry) => {
    // Cleanup
  },
};

registry.loadPlugin("my-plugin", plugin);
registry.unloadPlugin("my-plugin");
```

## 💻 ConsoleCommands API

### Connect Modules

```javascript
commands.connectRegistry(registry);
commands.connectRenderer(renderer);
commands.connectDatabase(database);
commands.connectTable(table);
commands.connectKeyboard(keyboard);
```

### Execute Commands

```javascript
// Basic execution
const result = await commands.execute("echo hello");

// Result structure
if (result.success) {
  console.log("Command succeeded");
  console.log(result.result); // Command result
  console.log(result.duration); // Execution time
} else {
  console.log("Command failed");
  console.log(result.error); // Error message
}
```

### History Management

```javascript
// Get history
const history = commands.getHistory();

// Navigate history
const prev = commands.getPreviousCommand(); // ↑ key
const next = commands.getNextCommand(); // ↓ key

// Clear history
commands.clearHistory();
```

### Undo/Redo

```javascript
// Push undo action
commands.pushUndo({
  undo: () => {
    /* restore state */
  },
  redo: () => {
    /* apply state */
  },
});

// Undo
commands.undo();

// Redo
commands.redo();
```

### Execution Status

```javascript
// Check if running
if (commands.isRunning()) {
  commands.stopExecution();
}

// Get current execution info
const info = commands.getExecutionInfo();
```

## 📚 Built-in Commands Reference

### System Commands

```bash
# Help
help                    # General help
help select            # Specific command help

# Clear screen
clear

# Print text
echo "Hello World"

# Version info
version

# System info
info
info registry

# Time
time
```

### Database Commands

```bash
# Select query
select users
select users --limit 10
select users --where status=active

# Insert row
insert users --name=Alice --email=alice@test.com

# Describe table
describe users

# List tables
list
list --detailed
```

### Table Commands

```bash
# Render table
render users
render users --cols id,name,email

# Export data
export users --format csv --file myusers
export products --format json
```

### Utility Commands

```bash
# Command history
history
history --limit 20

# Undo/Redo
undo
redo

# Memory info
meminfo
```

## 🔄 Command Execution Flow

### Example: `select users --limit 5`

1. **Input Capture**: Keyboard captures "select users --limit 5"
2. **Parsing**:
   - commandName: "select"
   - args: ["users"]
   - options: { limit: "5" }
3. **Registry Lookup**: Gets select command object
4. **Validation**: Checks args.length > 0 ✓
5. **Execution**:
   - Fetches table from database
   - Applies limit
   - Renders with ConsoleTable
   - Prints output
6. **Return**: { success: true, rowCount: 5, data: [...] }

## 🗂️ Command Context Object

Cada comando recebe um objeto de contexto com:

```javascript
{
  args: [],           // Positional arguments
  options: {},        // Named options (--key=value)
  input: string,      // Original input string
  commands: obj,      // ConsoleCommands instance
  renderer: obj,      // ConsoleRenderer instance
  database: obj,      // ConsoleDatabase instance
  table: obj,         // ConsoleTable instance
  registry: obj       // ConsoleRegistry instance
}
```

## 📝 Examples

### Create Custom Command

```javascript
registry.registerCommand("dbstats", {
  description: "Show database statistics",
  usage: "dbstats [--detailed]",
  category: "database",
  aliases: ["dbstat", "stats"],
  help: "Display statistics about all database tables",
  validate: (args) => true,
  execute: async (ctx) => {
    const { database, renderer, options } = ctx;

    const tables = database.listTables();
    let output = "Database Statistics:\n";
    output += "─".repeat(40) + "\n";

    for (const tableName of tables) {
      const stats = database.getTableStats(tableName);
      output += `${tableName}: ${stats.rowCount} rows\n`;

      if (options.detailed) {
        output += `  Columns: ${stats.columns.join(", ")}\n`;
        output += `  Size: ${stats.memorySize} bytes\n`;
      }
    }

    renderer.print(output);
    return { success: true, tableCount: tables.length };
  },
});
```

### Execute Command with Options

```javascript
// Export users to CSV
await commands.execute("export users --format csv --file employees");

// Render products table with specific columns
await commands.execute("render products --cols id,name,price,stock");

// Query with filters
await commands.execute("select orders --where status=completed --limit 20");
```

### Command Chaining (Manual)

```javascript
// Run multiple commands
const cmd1 = await commands.execute(
  "insert users --name=Bob --email=bob@test.com",
);
const cmd2 = await commands.execute("select users");
const cmd3 = await commands.execute("export users --format csv");
```

## 🎨 Integration with Other Modules

### ConsoleKeyboard Integration

Quando o usuário pressiona Enter:

```javascript
// keyboard.js detecta Enter e chama:
keyboard.on("enter", async (input) => {
  const result = await commands.execute(input);
  // Result exibido no renderer
});
```

### ConsoleDatabase Integration

```javascript
// Commands podem executar queries
const data = await database.query("SELECT * FROM users WHERE active = 1");

// Ou trabalhar com tables
const stats = database.getTableStats("users");
```

### ConsoleTable Integration

```javascript
// Commands usam table para render avançado
table.render(data, ["id", "name", "email"]);
table.export(data, "csv");
```

### ConsoleRenderer Integration

```javascript
// Output é exibido via renderer
renderer.print("Command output", "success");
renderer.renderTable(data, columns);
```

## 🐛 Debugging

### Enable Debug Logging

```javascript
// Registry
registry._logger.debug = true;

// Commands
commands._logger.debug = true;
```

### Get Module Info

```javascript
const registryInfo = registry.getInfo();
const commandsInfo = commands.getInfo();
const builtinsInfo = ConsoleBuiltins.getInfo();

console.log(registryInfo);
console.log(commandsInfo);
console.log(builtinsInfo);
```

### Get Debug Info

```javascript
const debug = registry.debugInfo();
const debug = commands.debugInfo();

console.log(debug.commands); // All registered commands
console.log(debug.aliases); // All aliases
console.log(debug.history); // Recent history
```

## 🚀 Performance Tips

1. **Use pagination** for large table queries
2. **Index frequently queried columns**
3. **Limit result sets** with --limit option
4. **Cache frequently accessed tables**
5. **Use specific column selection** with --cols

## 📦 File Locations

- **Registry**: `BACKEND/JS/COMMANDS/console.registry.js`
- **Commands**: `BACKEND/JS/COMMANDS/console.commands.js`
- **Builtins**: `BACKEND/JS/COMMANDS/console.builtins.js`
- **Guide**: `BACKEND/JS/COMMANDS/CONSOLE_COMMANDS_INTEGRATION_GUIDE.md`

## 🔗 Dependencies

```
ConsoleBuiltins
    ↓
ConsoleCommands ← → ConsoleRegistry
    ↓                   ↑
ConsoleRenderer    ConsoleDatabase
    ↑                   ↑
ConsoleKeyboard    ConsoleTable
    ↓
User Input
```

## ✅ Validation

Todos os commands possuem validação:

```javascript
// Registry valida
registry.registerCommand("cmd", {
  validate: (args, options) => {
    if (args.length === 0) return false;
    if (!options.required) return false;
    return true;
  },
  execute: async (ctx) => {
    /* ... */
  },
});

// Commands executa validação antes
if (!command.validate(args, options)) {
  // Retorna erro
  return { success: false, error: "Invalid arguments" };
}
```

---

**Version**: 1.0.0  
**License**: MIT  
**Author**: Console Terminal System
