# ConsoleKeyboard v3.0.0 — Multi-Platform Input Handler

## 📋 Visão Geral

Módulo completo de captura de teclado com suporte nativo para **Windows**, **macOS** e **Linux** simultaneamente, sem conflitos. Fornece:

- ✅ Detecção automática da plataforma do usuário
- ✅ Keybindings específicos para cada SO (Ctrl no Windows/Linux, Cmd no macOS)
- ✅ Sistema de undo/redo completo
- ✅ Gerenciamento de buffer com suporte a posicionamento de cursor
- ✅ Sincronização em tempo real com ConsoleRenderer
- ✅ Detecção automática de módulos vinculados

## 🔗 Integração com Módulos

### Módulos Vinculados Diretos

```
ConsoleKeyboard (v3.0.0)
├── ConsoleRenderer (v3.0.0)         Via connect(renderer)
├── ConsoleBootstrap (v2.0.0)        Instanciado por Bootstrap
│   └── WebConsole class            Orquestrador central
├── ConsoleEngine (futuro)           Via events.on("commit", handler)
├── ConsoleTheme (opcional)          Via getInfo() detection
├── ConsoleTable (opcional)          Via getInfo() detection
├── ConsoleSettings (opcional)       Via getInfo() detection
├── ConsoleBridge (opcional)         Via getInfo() detection
├── ConsoleWebSocket (opcional)      Via getInfo() detection
└── ConsoleHistory (opcional)        Via getInfo() detection
```

### Contract de Eventos

```javascript
// Eventos emitidos por ConsoleKeyboard
keyboard.events.on("commit", (data) => {}); // { command: string }
keyboard.events.on("history", (data) => {}); // { direction: "up"|"down" }
keyboard.events.on("autocomplete", (data) => {}); // { partial: string }
keyboard.events.on("interrupt", (data) => {}); // { cancelledInput: string }
keyboard.events.on("clearScreen", (data) => {}); // {}
keyboard.events.on("update", (data) => {}); // { buffer, cursor, undoStackSize, redoStackSize }
```

### Métodos de Renderer Utilizados

```javascript
renderer.setInputText(text); // Sincroniza buffer
renderer.commitInputLine(command); // Congela linha e cria novo prompt
renderer.getRootElement(); // Para click-to-focus listener
renderer.setCursorPosition(pos); // Futuro: positioning visual
```

## 🌍 Suporte Multi-Plataforma

### Windows & Linux (Ctrl-based)

```
Ctrl+C       → Interrupt (Ctrl+C)
Ctrl+L       → Clear Screen
Ctrl+A       → Cursor Home
Ctrl+E       → Cursor End
Ctrl+U       → Clear Line (before cursor)
Ctrl+K       → Clear to End (after cursor)
Cmd+Z / Y    → Undo/Redo
```

### macOS (Cmd-based)

```
Cmd+C        → Interrupt
Cmd+L        → Clear Screen
Cmd+A        → Cursor Home
Cmd+E        → Cursor End
Cmd+U        → Clear Line (before cursor)
Cmd+K        → Clear to End (after cursor)
Cmd+Z / Y    → Undo/Redo
Cmd+Backspace → Clear Line
```

### Universal (Todas as Plataformas)

```
Enter        → Commit Command
Backspace    → Delete before cursor
Delete       → Delete after cursor
Arrow Up     → History up
Arrow Down   → History down
Arrow Left   → Cursor left
Arrow Right  → Cursor right
Home         → Cursor to start
End          → Cursor to end
Tab          → Autocomplete
```

## 🚀 Inicialização e Uso

### Via ConsoleBootstrap (Recomendado)

```javascript
// bootstrap.js já instancia e configura tudo
const terminal = new WebConsole({
  debug: true,
  platform: "auto", // detecta automaticamente
});

// Acesso ao keyboard
terminal.keyboard.setBuffer("comando inicial");
terminal.keyboard.focus();
```

### Standalone

```javascript
// Instanciar manualmente
const keyboard = new ConsoleKeyboard({ debug: true });

// Conectar ao renderer
keyboard.connect(renderer);

// Começar a escutar
keyboard.attachListener();

// Escutar eventos
keyboard.events.on("commit", (data) => {
  console.log("Comando:", data.command);
});
```

## 📊 Detecção de Plataforma

```javascript
// Acessar plataforma detectada
const keyboard = new ConsoleKeyboard();
console.log(keyboard._platform); // "windows" | "macos" | "linux" | "unknown"

// Acessar função de detecção
const platform = detectPlatform(); // Função global exportada

// Verificar módulos vinculados
const info = keyboard.getInfo();
console.log(info.hasSupportedModules);
// {
//   renderer: true,
//   consoleRenderer: true,
//   consoleBootstrap: true,
//   consoleEngine: false,
//   ...
// }
```

## 🔄 Sistema de Undo/Redo

Totalmente automático quando comandos são commitados:

```javascript
keyboard.setBuffer("comando 1");
keyboard.events.emit("commit", ...); // Adicionado ao undo stack

keyboard.setBuffer("comando 2");
keyboard.events.emit("commit", ...); // Adicionado ao undo stack

// _actionUndo() restaura último comando
// _actionRedo() re-aplica comando desfeito
```

## 🛠️ API Pública Completa

### Métodos Públicos

```javascript
// Conexão e Lifecycle
keyboard.connect(renderer); // Wireia ao renderer
keyboard.attachListener(); // Inicia captura de eventos
keyboard.detachListener(); // Para captura
keyboard.focus(); // Scroll to focus
keyboard.dispose(); // Cleanup completo

// Buffer Management
keyboard.setBuffer(text); // Substitui buffer todo
keyboard.getBuffer(); // Retorna buffer atual
keyboard.clearBuffer(); // Zera buffer e cursor
keyboard.getCursorPosition(); // Retorna posição cursor

// Introspection
keyboard.getInfo(); // Retorna metadata + módulos
keyboard.toString(); // String debug com estado
```

### Propriedades Privadas (Tracking)

```javascript
keyboard._buffer; // String: texto atual
keyboard._cursor; // Number: posição cursor
keyboard._undoStack; // Array: histórico undo
keyboard._redoStack; // Array: histórico redo
keyboard._platform; // String: plataforma detectada
keyboard._active; // Boolean: escutando eventos
keyboard._disposed; // Boolean: foi destruído
```

## 📦 Bindings Customizados

Passar keybindings customizados na inicialização:

```javascript
const keyboard = new ConsoleKeyboard({
  keyBindings: [
    { key: "b", ctrl: true, action: "myCustomAction" },
    { key: "n", cmd: true, action: "anotherAction" },
  ],
});

keyboard.events.on("update", (data) => {
  if (data.action === "myCustomAction") {
    // Handle custom action
  }
});
```

## 🔍 Logging e Debug

Ativar logs detalhados:

```javascript
const keyboard = new ConsoleKeyboard({ debug: true });

// Saída no console:
// [ConsoleKeyboard] Instantiated on windows.
// [ConsoleKeyboard] ℹ Connected to renderer.
// [ConsoleKeyboard] v3.0.0 registered on window.ConsoleKeyboard
//   ➜ Windows (Ctrl-based shortcuts) (27 key bindings loaded)
// [ConsoleKeyboard] Module links: ConsoleRenderer, ConsoleBootstrap, ...
```

## 📦 Arquivo Size & Modularidade

- **Tamanho**: ~650 linhas (comentado e bem estruturado)
- **Dependências**: Nenhuma (auto-contido)
- **Independência**: Pode ser carregado sem ConsoleRenderer (com funcionalidade limitada)
- **Export**: `window.ConsoleKeyboard`, `detectPlatform()`, `buildPlatformBindings()`

## ✨ Features Highlights

✅ **Verdadeiro Multi-OS**: Detecta e aplica keybindings corretos automaticamente  
✅ **Sem Conflitos**: Windows/Linux/macOS coexistem sem problemas  
✅ **Cursor Position**: Suporta navegação completa no buffer  
✅ **Undo/Redo**: Histórico automático de comandos  
✅ **Event-Driven**: Pub/sub para integração limpa  
✅ **Module Aware**: Detecta todos os módulos disponíveis  
✅ **Click-to-Focus**: Clica em qualquer lugar do terminal para focar  
✅ **Customizable**: Keybindings totalmente customizáveis

## 🔮 Future Enhancements

- [ ] Suporte a readline history via ConsoleHistory module
- [ ] Autocomplete suggestions popup
- [ ] Bracket matching visual feedback
- [ ] Multi-line command support
- [ ] Macro recording
- [ ] Search/replace in history

---

**Integração completa com**: ConsoleRenderer, ConsoleBootstrap, ConsoleEngine, ConsoleTheme, ConsoleTable, ConsoleSettings, ConsoleBridge, ConsoleWebSocket, ConsoleHistory

**Versão**: 3.0.0  
**License**: MIT  
**Plataformas**: Windows, macOS, Linux (auto-detectado)
