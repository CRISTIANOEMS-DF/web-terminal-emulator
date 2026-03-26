# Console Settings Integration Guide

## 📋 Overview

O **console.settings.js v1.0.0** é o gerenciador centralizado de configurações para todo o sistema de terminal. Ele gerencia:

- **Temas** (5 temas pré-definidos + temas customizados)
- **Aparência** (fontSize, fontFamily, colors)
- **Comportamento** (autoComplete, commandHistory, persistência)
- **Teclado** (detecção de plataforma, atalhos)
- **Performance** (cache, virtual scroll, buffer size)
- **Database** (persistência, backup automático)
- **Persistência** via LocalStorage

---

## 🔗 Integração Com Módulos

### 1️⃣ Integração com ConsoleRenderer

```javascript
// Aplicar tema
window.ConsoleSettings.setTheme("dracula");

// Obter cores
const colors = window.ConsoleSettings.getColors();

// Listen para mudanças de tema
window.ConsoleSettings.on("theme:applied", (data) => {
  console.log("Theme changed to:", data.theme);
  // Renderer automaticamente atualiza
});
```

**Temas Disponíveis:**

- `dark` - Tema escuro padrão
- `light` - Tema claro
- `matrix` - Estilo Matrix (verde no preto)
- `solarized` - Tema profissional
- `dracula` - Popular dark theme

### 2️⃣ Integração com ConsoleKeyboard

```javascript
// Obter configurações de teclado
const keyboardConfig = window.ConsoleSettings.getKeyboard();

// Verificar detecção de plataforma
if (keyboardConfig.detectPlatform) {
  // Windows, macOS, Linux keybindings detectados automaticamente
}

// Controlar tab completion
console.log(window.ConsoleSettings.get("keyboard.tabCompletion")); // true
```

### 3️⃣ Integração com ConsoleDatabase

```javascript
// Obter configurações de database
const dbConfig = window.ConsoleSettings.get("database");

// Configurar persistência
window.ConsoleSettings.set("database.persistence", true);
window.ConsoleSettings.set("database.autoBackup", true);
window.ConsoleSettings.set("database.maxTableSize", 10000);

// Listen para mudanças
window.ConsoleSettings.on("setting:changed", (data) => {
  if (data.path.startsWith("database")) {
    console.log("Database settings changed:", data);
  }
});
```

### 4️⃣ Integração com ConsoleTable

```javascript
// Configurar performance da tabela
window.ConsoleSettings.set("performance.maxTableRows", 1000);
window.ConsoleSettings.set("performance.enableVirtualScroll", false);

// Obter todas configurações
const perfConfig = window.ConsoleSettings.get("performance");
```

### 5️⃣ Integração com ConsoleCommands/ConsoleRegistry

```javascript
// Configurar histórico de comandos
window.ConsoleSettings.set("behavior.maxHistorySize", 100);

// Undo/Redo settings
window.ConsoleSettings.set("behavior.undoRedoEnabled", true);
window.ConsoleSettings.set("behavior.maxUndoStack", 50);
```

### 6️⃣ Integração com ConsoleBootstrap

O bootstrap automaticamente carrega as configurações no startup:

```javascript
// bootstrap.js fará:
window.ConsoleSettings.getAll(); // Carrega todas as configs

// Aplica automaticamente o tema
const theme = window.ConsoleSettings.get("display.theme");
window.ConsoleRenderer.applyTheme(theme);
```

---

## 🎨 Gerenciamento de Temas

### Obter Temas Disponíveis

```javascript
const themes = window.ConsoleSettings.getAvailableThemes();
// ['dark', 'light', 'matrix', 'solarized', 'dracula']
```

### Aplicar Tema

```javascript
// Aplicar tema pré-definido
window.ConsoleSettings.applyTheme("dracula");

// Ou usar setTheme() (short version)
window.ConsoleSettings.setTheme("matrix");
```

### Adicionar Tema Customizado

```javascript
const customTheme = {
  bg: "#1e1e1e",
  surface: "#2d2d2d",
  text: "#e0e0e0",
  muted: "#808080",
};

window.ConsoleSettings.addTheme("myTheme", customTheme);

// Agora você pode usar
window.ConsoleSettings.applyTheme("myTheme");
```

### Obter Configuração de Tema

```javascript
// Obter tema atual
const currentTheme = window.ConsoleSettings.getTheme();

// Obter tema específico
const dracula = window.ConsoleSettings.getTheme("dracula");
```

---

## ⚙️ Acesso a Configurações

### Get - Obter Valor

```javascript
// Notação de ponto
const theme = window.ConsoleSettings.get("display.theme");
const fontSize = window.ConsoleSettings.get("display.fontSize");

// Com valor padrão
const custom = window.ConsoleSettings.get("custom.value", "default");
```

### Set - Definir Valor

```javascript
// Definir configuração
window.ConsoleSettings.set("display.fontSize", 16);
window.ConsoleSettings.set("behavior.autoComplete", true);

// Autosalva em LocalStorage
```

### GetAll - Obter Tudo

```javascript
const allSettings = window.ConsoleSettings.getAll();
console.log(allSettings); // {} com todas as configs
```

### Reset - Resetar

```javascript
window.ConsoleSettings.resetToDefaults();
// Volta a todas as configurações padrão
```

---

## 💾 Import/Export

### Exportar Configurações

```javascript
// Como JSON string
const json = window.ConsoleSettings.exportAsJSON();
console.log(json); // String JSON formatada

// Fazer download
window.ConsoleSettings.downloadSettings("my_console_config");
// Cria arquivo: my_console_config.json
```

### Importar Configurações

```javascript
// De uma string JSON
const jsonConfig = '{"display":{"fontSize":18,...}}';
window.ConsoleSettings.importFromJSON(jsonConfig);

// Carrega do arquivo e faz:
// 1. Parse JSON
// 2. Merge com defaults
// 3. Salva em LocalStorage
// 4. Emite evento 'settings:imported'
```

---

## 📡 Event System

### Eventos Disponíveis

```javascript
// Quando qualquer setting muda
window.ConsoleSettings.on("setting:changed", (data) => {
  console.log(data);
  // {
  //   path: 'display.fontSize',
  //   oldValue: 14,
  //   newValue: 16
  // }
});

// Quando tema é aplicado
window.ConsoleSettings.on("theme:applied", (data) => {
  console.log("Theme:", data.theme);
});

// Quando tema customizado é adicionado
window.ConsoleSettings.on("theme:added", (data) => {
  console.log("Added theme:", data.name);
});

// Quando configurações são resetadas
window.ConsoleSettings.on("settings:reset", () => {
  console.log("Settings reset to defaults");
});

// Quando configurações são importadas
window.ConsoleSettings.on("settings:imported", () => {
  console.log("Settings imported successfully");
});
```

### Unsubscribe de Eventos

```javascript
function myHandler(data) {
  console.log("Settings changed:", data);
}

window.ConsoleSettings.on("setting:changed", myHandler);

// Depois, remover
window.ConsoleSettings.off("setting:changed", myHandler);
```

---

## 🔥 Quick Access Methods

### Display Settings

```javascript
const display = window.ConsoleSettings.getDisplaySettings();
// { theme, fontSize, fontFamily, lineHeight, ... }
```

### Color Settings

```javascript
const colors = window.ConsoleSettings.getColors();
// { background, text, prompt, error, warning, success, ... }
```

### Behavior Settings

```javascript
const behavior = window.ConsoleSettings.getBehavior();
// { autoComplete, commandHistory, maxHistorySize, ... }
```

### Keyboard Settings

```javascript
const keyboard = window.ConsoleSettings.getKeyboard();
// { tabCompletion, multilineCommands, autoFocus, detectPlatform, ... }
```

### Set Font Size

```javascript
window.ConsoleSettings.setFontSize(18);
// Também aplica ao document.documentElement.style.fontSize
```

### Set Theme (Short Method)

```javascript
window.ConsoleSettings.setTheme("matrix");
// Equivalente a: applyTheme('matrix')
```

### Debug Mode

```javascript
window.ConsoleSettings.setDebugMode(true);
// Ativa logging em todos os módulos linkados
```

---

## ℹ️ Informações de Módulo

### Module Info

```javascript
const info = window.ConsoleSettings.getInfo();
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

### Debug Info

```javascript
const debug = window.ConsoleSettings.debugInfo();
// Retorna getInfo() + todas as settings + temas disponíveis
```

---

## 📁 Structure

```
console.settings.js v1.0.0
├── _Logger (Debug output)
├── _EventBus (Event system)
├── ConsoleSettings (Main class)
│   ├── Initialization
│   ├── Persistence (LocalStorage)
│   ├── Settings Access (get, set, getAll, resetToDefaults)
│   ├── Theme Management
│   ├── Import/Export
│   ├── Event Handling (on, off)
│   ├── Quick Access Methods
│   └── Module Information
└── Global Export (window.ConsoleSettings)
```

---

## 🚀 Typical Usage Flow

```javascript
// 1. System loads
// ConsoleSettings v1.0.0 instantiated

// 2. Bootstrap initializes
if (window.ConsoleSettings.getInfo().hasSupportedModules.consoleRenderer) {
  const theme = window.ConsoleSettings.get("display.theme");
  window.ConsoleRenderer.applyTheme(theme);
}

// 3. User changes theme
window.ConsoleSettings.applyTheme("matrix");

// 4. Listen para mudança
window.ConsoleSettings.on("theme:applied", (data) => {
  console.log("UI updated to:", data.theme);
});

// 5. Salva automaticamente em localStorage
// Próxima vez que carregar, theme será 'matrix'
```

---

## 💡 Best Practices

1. **Always check module availability** antes de usar integração específica:

   ```javascript
   if (window.ConsoleSettings.getInfo().hasSupportedModules.consoleDatabase) {
     // Database settings safe to use
   }
   ```

2. **Use event listeners** em vez de polling:

   ```javascript
   // ✅ BOM
   window.ConsoleSettings.on("setting:changed", handler);

   // ❌ RUIM
   setInterval(() => checkSettings(), 100);
   ```

3. **Export settings** periodicamente para backup:

   ```javascript
   setInterval(() => {
     window.ConsoleSettings.downloadSettings("backup");
   }, 3600000); // 1 hora
   ```

4. **Validate values** antes de set:

   ```javascript
   const size = Math.max(10, Math.min(24, userInput));
   window.ConsoleSettings.setFontSize(size);
   ```

5. **Use dot notation** para paths aninhados:
   ```javascript
   window.ConsoleSettings.get("display.font.size"); // ✅
   window.ConsoleSettings.get("displayFontSize"); // ❌
   ```

---

## 🔍 Default Configuration

```javascript
{
  display: {
    theme: 'dracula',
    fontSize: 14,
    fontFamily: "'Courier New', monospace",
    lineHeight: 1.6,
    charset: 'UTF-8',
    responsive: true,
    width: '100%',
    height: '100%'
  },
  colors: {
    background: '#0a0e27',
    text: '#00ff00',
    prompt: '#00aaff',
    error: '#ff0000',
    warning: '#ffaa00',
    success: '#00ff00',
    info: '#00aaff',
    cursor: '#00ff00',
    selection: 'rgba(0, 255, 0, 0.3)'
  },
  behavior: {
    autoComplete: true,
    commandHistory: true,
    maxHistorySize: 100,
    undoRedoEnabled: true,
    maxUndoStack: 50,
    clearOnStartup: false,
    enablePersistence: true,
    enableSounds: false
  },
  keyboard: {
    tabCompletion: true,
    multilineCommands: true,
    autoFocus: true,
    detectPlatform: true,
    enableShortcuts: true
  },
  performance: {
    maxTableRows: 1000,
    maxBufferSize: 10000,
    debounceDelay: 100,
    enableVirtualScroll: false,
    cacheResults: true
  },
  database: {
    persistence: true,
    autoBackup: true,
    maxTableSize: 10000,
    storagePrefix: 'console_db_'
  },
  user: {
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss',
    notifications: true
  },
  advanced: {
    enableDebugMode: false,
    enableLogging: true,
    logLevel: 'info',
    enableMetrics: false,
    enableProfiling: false
  }
}
```

---

## ✅ Loading Order (Bootstrap Sequence)

```
1. console.settings.js (v1.0.0) - FIRST
   └─ Initializes settings, loads from localStorage

2. console.renderer.js (v3.0.0)
   └─ Gets theme from settings

3. console.keyboard.js (v3.0.0)
   └─ Gets keyboard config from settings

4. console.database.js (v1.0.0)
   └─ Gets database config from settings

5. console.table.js (v4.0.0)
   └─ Gets performance config from settings

6. console.commands.js (v1.0.0)
   └─ Gets behavior config from settings

7. console.registry.js (v1.0.0)
   └─ Ready for command registration

8. console.builtins.js (v1.0.0)
   └─ Registers default commands

9. console.bootstrap.js (v2.0.0)
   └─ Orchestrates everything
```

---

## 📞 Support

- **Version**: 1.0.0
- **Status**: Production Ready
- **Module File**: `BACKEND/CONFIG/console.settings.js`
- **Linked Modules**: 9 (All core modules)
- **Persistence**: LocalStorage with `console_settings_` prefix
- **Auto-save**: Enabled
- **Event System**: Full implementation

---

**Last Updated**: Phase 7 - Settings Configuration
**Compatibility**: Works with all 9 core modules
