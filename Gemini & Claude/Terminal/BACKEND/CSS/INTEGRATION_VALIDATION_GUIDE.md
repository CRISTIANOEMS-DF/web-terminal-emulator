# Guia de Validação de Integração - Console Terminal

## 🔗 Verificação de Contratos entre Módulos

Este guia valida se todos os componentes estão implementando corretamente seus contratos com `console.keyboard.js`.

---

## 1️⃣ Validação com `console.renderer.js`

### Contrato Esperado

```javascript
// keyboard.connect(renderer) espera estes métodos:
renderer.setInputText(text); // string → atualiza DOM
renderer.getRootElement(); // → Element (para foco)
renderer.commitInputLine(command); // string → congela linha
renderer.setCursorPosition(cursor); // (OPCIONAL) number → posição visual
```

### Checklist

- [ ] `setInputText()` atualiza o DOM em tempo real
- [ ] `getRootElement()` retorna o elemento root do terminal
- [ ] `commitInputLine()` congela a linha anterior e cria nova prompt
- [ ] `setCursorPosition()` (se implementado) posiciona cursor visualmente

### Script de Validação

```javascript
// No navegador console:
const renderer = window.terminal.renderer;
const kb = window.terminal.keyboard;

// Teste 1: setInputText
renderer.setInputText("teste 123");
console.assert(
  renderer.getInputText?.() === "teste 123",
  "setInputText falhou",
);

// Teste 2: getRootElement
const root = renderer.getRootElement();
console.assert(
  root instanceof HTMLElement,
  "getRootElement não retorna HTMLElement",
);

// Teste 3: commitInputLine
renderer.commitInputLine("echo hello");
// Visualmente, a linha deve estar congelada e uma nova prompt limpa deve aparecer
```

---

## 2️⃣ Validação com `console.engine.js`

### Contratos de Eventos

```javascript
// Keyboard emite (via keyboard.events):
keyboard.events.on("commit", (payload) => {
  payload.command; // string - comando digitado pelo usuário
});

keyboard.events.on("history", (payload) => {
  payload.direction; // "up" | "down"
});

keyboard.events.on("autocomplete", (payload) => {
  payload.partial; // string - texto até o cursor
});

keyboard.events.on("interrupt", (payload) => {
  payload.cancelledInput; // string - input que foi cancelado (Ctrl+C)
});

keyboard.events.on("update", (payload) => {
  payload.buffer; // string - buffer atual
  payload.cursor; // number - posição do cursor
  payload.undoStackSize; // number
  payload.redoStackSize; // number
});

keyboard.events.on("clearScreen", (payload) => {
  // vazio
});
```

### Checklist

- [ ] Engine está registrando handlers: `keyboard.events.on(...)`
- [ ] Handlers processam `payload` corretamente
- [ ] Engine emite respostas (ex: `keyboard.setBuffer()` em history)
- [ ] Todos os 6 eventos estão sendo ouvidos

### Script de Validação

```javascript
const kb = window.terminal.keyboard;
const events = kb.events;

// Verificar listeners registrados
console.log("Listeners:", Object.keys(events._listeners));

// Simular eventos:
kb.events.emit("commit", { command: "echo test" });
kb.events.emit("update", { buffer: "test", cursor: 4 });

// Logs devem aparecer sem erros
```

---

## 3️⃣ Validação com `console.bootstrap.js`

### Ciclo de Vida Esperado

```javascript
// 1. Instanciação
const keyboard = new ConsoleKeyboard({ debug: true, keyBindings: [...] });

// 2. Conexão com Renderer
keyboard.connect(renderer);

// 3. Wiring to Engine
engine.connect({ ..., keyboard });

// 4. Ativação
keyboard.focus();

// 5. Desativação (no dispose global)
keyboard.dispose();
```

### Checklist

- [ ] `new ConsoleKeyboard(config)` cria instância sem erros
- [ ] `keyboard.connect(renderer)` valida methods do renderer
- [ ] `engine.connect({ ..., keyboard })` wira events
- [ ] `keyboard.focus()` ativa listeners e chama window.focus()
- [ ] `keyboard.dispose()` remove todos os listeners

### Script de Validação

```javascript
const currentInfo = window.terminal.keyboard.getInfo();
console.table(currentInfo);

// Deve mostrar:
// {
//   version: "3.0.0",
//   platform: "windows|macos|linux|unknown",
//   active: true,
//   disposed: false,
//   bufferLength: 0,
//   cursorPosition: 0,
//   undoStackSize: 0,
//   redoStackSize: 0,
//   hasSupportedModules: { renderer: true, engine: true, ... }
// }
```

---

## 4️⃣ Bugs Padrão para Procurar

### Bug: "Teclas não aparecem"

```javascript
// Diagnóstico:
const info = window.terminal.keyboard.getInfo();
console.log("Active?", info.active); // Deve ser true
console.log("Renderer?", info.hasSupportedModules.renderer); // Deve ser true

// Se ambos false:
// → Chamar keyboard.connect(renderer) e keyboard.attach

Listener();
```

### Bug: "Caracteres especiais quebram"

```javascript
// Diagnóstico:
window.terminal.keyboard.events.on("update", (p) => {
  console.log(
    "Buffer code points:",
    [...p.buffer].map((c) => c.charCodeAt(0)),
  );
});
// Deve mostrar apenas valores >= 32 (exceto \x7F)
```

### Bug: "Cursor desalinhado"

```javascript
// Diagnóstico:
const info = window.terminal.keyboard.getInfo();
console.log(
  "Cursor:",
  info.cursorPosition,
  "Buffer length:",
  info.bufferLength,
);
// Deve ser cursorPosition <= bufferLength
```

### Bug: "Performance degrada"

```javascript
// Diagnóstico:
const info = window.terminal.keyboard.getInfo();
console.log("Undo stack:", info.undoStackSize); // Deve ser <= 100
console.log("Redo stack:", info.redoStackSize); // Deve ser <= 100
// Se > 100, MAX_UNDO_STACK_SIZE não está sendo respeitado
```

---

## 5️⃣ Matriz de Compatibilidade Plataforma

### Windows

| Atalho | Ação        | Status          |
| ------ | ----------- | --------------- |
| Ctrl+C | interrupt   | ✅              |
| Ctrl+L | clearScreen | ✅              |
| Ctrl+A | cursorHome  | ✅              |
| Ctrl+E | cursorEnd   | ✅              |
| Ctrl+U | clearLine   | ✅              |
| Ctrl+K | clearToEnd  | ✅              |
| Ctrl+Z | undo        | ⚠️ (via config) |
| Ctrl+Y | redo        | ⚠️ (via config) |

### macOS

| Atalho        | Ação        | Status |
| ------------- | ----------- | ------ |
| Cmd+C         | interrupt   | ✅     |
| Cmd+L         | clearScreen | ✅     |
| Cmd+A         | cursorHome  | ✅     |
| Cmd+E         | cursorEnd   | ✅     |
| Cmd+U         | clearLine   | ✅     |
| Cmd+K         | clearToEnd  | ✅     |
| Cmd+Z         | undo        | ✅     |
| Cmd+Y         | redo        | ✅     |
| Cmd+Backspace | clearLine   | ✅     |

### Linux

| Atalho | Ação        | Status |
| ------ | ----------- | ------ |
| Ctrl+C | interrupt   | ✅     |
| Ctrl+L | clearScreen | ✅     |
| Ctrl+A | cursorHome  | ✅     |
| Ctrl+E | cursorEnd   | ✅     |
| Ctrl+U | clearLine   | ✅     |
| Ctrl+K | clearToEnd  | ✅     |

---

## 6️⃣ Testes de Teclado Especiais

### Layout br-intl (Brasil)

```javascript
// Teste acentuação
// Deve permitir: á, é, í, ó, ú, ã, õ, ç
// Deve bloquear: Ctrl+Alt+C (que seria um atalho grave)
```

### Layout AZERTY (França)

```javascript
// Os números aparecem com Shift
// Testes visuais: verificar se dígitos são capturados
```

### Layout Dvorak

```javascript
// Testes: Ctrl+A ainda é cursorHome (por key code, não char)
// Testes: Digitar normalmente ("aoeuidhtns...")
```

---

## 7️⃣ Procedimento de Integração Full-Stack

### Passo 1: Verificar Bootstrap

```javascript
// terminal.html
<script src="console.bootstrap.js"></script>
// Deve instanciar window.WebConsole
// Deve criar window.terminal
// Deve chamar keyboard.connect(renderer)
```

### Passo 2: Verificar Renderer

```javascript
// Em console.renderer.js
class ConsoleRenderer {
  setInputText(text) {
    // DOM update logic
  }

  getRootElement() {
    return this._rootElement; // HTMLElement
  }

  commitInputLine(command) {
    // Freeze current line
    // Create new prompt line
  }
}
```

### Passo 3: Verificar Engine

```javascript
// Em console.engine.js
class ConsoleEngine {
  connect(config) {
    this.keyboard = config.keyboard;

    this.keyboard.events.on("commit", (p) => this._onCommand(p.command));
    this.keyboard.events.on("history", (p) => this._onHistory(p.direction));
    // ... outros eventos
  }

  _onCommand(command) {
    // Executar comando
    // Possivelmente chamar keyboard.setBuffer(newPrompt)
  }
}
```

### Passo 4: Teste Full-Stack

```javascript
// No console do navegador
const term = window.terminal;
const kb = term.keyboard;
const rend = term.renderer;
const eng = term.engine;

// Teste visual: digitar algo
// Deve aparecer em tempo real

// Teste de evento: Enter
// Deve executar o comando

// Teste de seta: ArrowUp
// Deve carregar histórico anterior
```

---

## 8️⃣ Debugging Avançado

### Ativar Logs Detalhados

```javascript
// Reinicializar com debug=true
const kb = new ConsoleKeyboard({ debug: true });
kb.connect(renderer);

// Agora todos os eventos vão registrar no console
// [ConsoleKeyboard] ℹ ...
// [ConsoleKeyboard] ⚠ ...
// [ConsoleKeyboard] ✖ ...
// [ConsoleKeyboard] ◎ ...
```

### Monitorar Eventos em Tempo Real

```javascript
// Capturar TODOS os eventos
kb.events.on("*", (payload, event) => {
  console.group(`Event: ${event}`);
  console.table(payload);
  console.groupEnd();
});
```

### Inspecionar State Interno

```javascript
// Acessar propriedades privadas (para debug)
// ⚠️ Não fazer isso em produção!

console.log("Buffer interno:", kb._buffer);
console.log("Cursor pos:", kb._cursor);
console.log("Undo stack:", kb._undoStack);
console.log("Platform:", kb._platform);
console.log("Active listeners:", kb._active);
```

---

## 9️⃣ Checklist Final de Rollout

- [ ] Todos os eventos emitidos em console.keyboard.js
- [ ] Todos os listeners registrados em console.engine.js
- [ ] Renderer implementou os 3 métodos obrigatórios
- [ ] Bootstrap chama `keyboard.connect(renderer)`
- [ ] Terminal foca corretamente ao clicar
- [ ] Caracteres aparecem em tempo real
- [ ] Ctrl+C para interrupt
- [ ] ArrowUp/Down navegam histórico
- [ ] Undo/Redo estão limitados a 100 itens
- [ ] Cross-browser: Chrome, Firefox, Safari, Edge
- [ ] Cross-platform: Windows, macOS, Linux
- [ ] Testes em DevTools com breakpoints sem problema

---

## 📞 Contatos & Referências

- **Arquivo Principal:** `console.keyboard.js` v3.0.1
- **Documentação de Bugs:** `KEYBOARD_BUGS_FIXED.md`
- **Changelog:** Veja seção "6 bugs corrigidos" acima
- **Data:** 25 de março de 2026
