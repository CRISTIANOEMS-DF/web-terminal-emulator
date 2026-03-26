# 🔗 Guia de Integração - console.database.js como Hub Central de Auditoria

**Data:** 25 de março de 2026  
**Versão:** 3.1.0  
**Status:** 🆕 NOVO - Hub Central de Auditoria de Arquivo

---

## 📋 Visão Geral

O `console.database.js` agora funciona como **hub centralizado** para controlar, validar e auditar **TODAS as operações de arquivo** do backend (criar, deletar, listar, modificar).

```
┌─────────────────────────────────────────────────────────────┐
│                    console.database.js                       │
│                 (Central Audit Hub v3.1.0)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ✅ file_operations          (Log de operações)              │
│  ✅ file_audit_trail         (Trilha detalhada)              │
│  ✅ file_statistics          (Estatísticas)                  │
│  ✅ file_validation_log      (Validações)                    │
│  ✅ blocked_operations       (Operações bloqueadas)          │
│                                                               │
│  Métodos Principais:                                          │
│  → validateOperation()    (Validar antes executar)           │
│  → logFileOperation()     (Registrar operação)               │
│  → blockOperation()       (Bloquear inválida)                │
│  → getFileHistory()       (Recuperar histórico)              │
│  → getAuditReport()       (Relatório completo)               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 Integração com Módulos Principais

### 1. Integração com `console.commands.js`

**Arquivo:** `/BACKEND/JS/COMMANDS/console.commands.js`

```javascript
// ✅ NO INÍCIO DO ARQUIVO - Importar database
const db = new ConsoleDatabase();

// ✅ ANTES DE EXECUTAR QUALQUER COMANDO COM ARQUIVO
async function executeCommand(command) {
  // Extrair parâmetros
  const { operation, filePath, size } = parseCommand(command);

  // 🔴 PASSO 1: VALIDAR operação
  const validation = db.validateOperation(operation, filePath, {
    user: getCurrentUser(),
    size,
    extension: getFileExtension(filePath),
  });

  if (!validation.valid) {
    // Bloquear operação
    db.blockOperation(
      operation,
      filePath,
      `Validation failed: ${validation.issues.join(", ")}`,
      { user: getCurrentUser() },
    );
    return { error: validation.issues[0] };
  }

  // 🟢 PASSO 2: EXECUTAR comando (agora é seguro)
  const result = await executeFileOperation(operation, filePath);

  // 🔵 PASSO 3: REGISTRAR operação
  if (result.success) {
    db.logFileOperation(operation, filePath, {
      user: getCurrentUser(),
      status: "success",
      details: result.metadata,
      size: result.size,
      hash: result.hash,
    });
  } else {
    db.logFileOperation(operation, filePath, {
      user: getCurrentUser(),
      status: "failed",
      details: { error: result.error },
    });
  }

  return result;
}
```

### 2. Integração com `console.keyboard.js`

**Arquivo:** `/BACKEND/CSS/console.keyboard.js`

```javascript
// ✅ NO CONSTRUCTOR - Conectar ao database
constructor(config = {}) {
  // ... código existente ...

  // 🔗 Conectar ao database
  this.database = config.database || new ConsoleDatabase();
}

// ✅ ANTES DE PROCESSAR COMANDO
_actionCommit() {
  const command = this._buffer.trim();

  // 🔴 Validar comando ANTES de pasar para engine
  const validation = this.database.validateOperation(
    'execute_command',
    `cmd:${command}`,
    {
      user: 'user',
      commandLength: command.length
    }
  );

  if (!validation.valid) {
    this.events.emit("error", { message: validation.issues[0] });
    return;
  }

  // 🟢 Agora pode processar
  this._buffer = "";
  this._cursor = 0;
  this.events.emit("commit", { command });

  // 🔵 Registrar no audit
  this.database.logFileOperation('execute_command', `cmd:${command}`, {
    user: 'user',
    commandLength: command.length
  });

  this._syncRenderer();
}
```

### 3. Integração com `console.engine.js`

**Arquivo:** `/BACKEND/CORE/console.engine.js`

```javascript
// ✅ NO CONSTRUCTOR
this.database = database || new ConsoleDatabase();

// ✅ ANTES DE PROCESSAR QUALQUER OPERAÇÃO
async executeCommand(command) {
  // 🔴 Validar
  const validation = this.database.validateOperation('command',
    `${this.workingDir}/${command}`,
    { user: this.currentUser }
  );

  if (!validation.valid) {
    // 📍 Bloquear
    this.database.blockOperation('command',
      `${this.workingDir}/${command}`,
      validation.issues.join('; '),
      { user: this.currentUser }
    );

    return {
      success: false,
      output: `Command blocked: ${validation.issues[0]}`
    };
  }

  // 🟢 Executar
  const result = await this._executeCommand(command);

  // 🔵 Registrar
  this.database.logFileOperation('command',
    `${this.workingDir}/${command}`,
    {
      user: this.currentUser,
      status: result.success ? 'success' : 'failed',
      details: { output: result.output }
    }
  );

  return result;
}
```

### 4. Integração com `console.renderer.js`

**Arquivo:** `/BACKEND/CSS/console.renderer.js`

```javascript
// ✅ Renderizar histórico de auditoria
renderAuditHistory(filePath) {
  const history = this.database.getFileHistory(filePath, 50);

  let html = `<div class="audit-history">
    <h3>File Audit Trail: ${filePath}</h3>
    <table>
      <tr>
        <th>Operation</th>
        <th>User</th>
        <th>Timestamp</th>
        <th>Status</th>
      </tr>`;

  history.forEach(op => {
    html += `
      <tr>
        <td>${op.operation}</td>
        <td>${op.user}</td>
        <td>${op.timestamp}</td>
        <td class="status-${op.status}">${op.status}</td>
      </tr>`;
  });

  html += `</table></div>`;
  return html;
}

// ✅ Exibir operações bloqueadas
renderBlockedOperations() {
  const blocked = this.database.getBlockedOperations();

  let html = `<div class="blocked-operations">
    <h3>Blocked Operations</h3>
    <table>
      <tr>
        <th>Operation</th>
        <th>Path</th>
        <th>Reason</th>
        <th>User</th>
        <th>Timestamp</th>
      </tr>`;

  blocked.forEach(op => {
    html += `
      <tr class="blocked">
        <td>${op.operation}</td>
        <td>${op.path}</td>
        <td>${op.reason}</td>
        <td>${op.user}</td>
        <td>${op.timestamp}</td>
      </tr>`;
  });

  html += `</table></div>`;
  return html;
}
```

---

## 📊 Fluxo de Operação Segura

```
USER INPUT
    ↓
console.keyboard.js
    ↓
[VALIDAR] db.validateOperation()
    ↓
    ├─ ✅ VÁLIDO → [AUTORIZAR]
    │    ↓
    │  console.engine.js → execute()
    │    ↓
    │  [REGISTRAR] db.logFileOperation()
    │    ↓
    │  console.renderer.js → renderOutput()
    │    ↓
    │  USER (resultado + audit trail)
    │
    └─ ❌ INVÁLIDO → [BLOQUEAR]
         ↓
       [REGISTRAR] db.blockOperation()
         ↓
       USER (motivo do bloqueio)
```

---

## 🔐 Regras de Validação

### Arquivo: `console.database.js` Linha ~150-180

```javascript
_initializeValidationRules() {
  return {
    'create': {
      requiresApproval: false,
      checkExtension: true,   // ✅ Bloquear .exe, .bat, .ps1
      checkSize: true         // ✅ Máximo 100MB
    },
    'delete': {
      requiresApproval: true, // ⚠️  Requer confirmação
      checkExtension: false,
      checkSize: false
    },
    'modify': {
      requiresApproval: false,
      checkExtension: true,   // ✅ Verificar tipo
      checkSize: true         // ✅ Não ultrapassar limite
    },
    'read': {
      requiresApproval: false,
      checkExtension: false,
      checkSize: false
    },
    'list': {
      requiresApproval: false,
      checkExtension: false,
      checkSize: false
    }
  };
}
```

### Extensões Bloqueadas

```javascript
blockedExtensions: [
  ".exe", // Executáveis Windows
  ".bat", // Batch Windows
  ".cmd", // Comando Windows
  ".ps1", // PowerShell
  ".sh", // Shell script
  ".dll", // Biblioteca dinâmica
  ".so", // Shared object Linux
  ".sys", // Sistema
];
```

---

## 📈 Tabelas de Auditoria

### Tabela: `file_operations`

Logs de TODAS as operações de arquivo:

```sql
CREATE TABLE file_operations (
  id INTEGER PRIMARY KEY,
  operation VARCHAR(50),        -- 'create', 'delete', 'modify', 'read', 'list'
  path VARCHAR(500),
  user VARCHAR(100),
  timestamp DATETIME,
  status VARCHAR(20),           -- 'success', 'failed', 'blocked'
  details JSON,                 -- Metadados adicionais
  hash VARCHAR(64)              -- SHA256 do arquivo
);
```

**Exemplo:**

```javascript
{
  id: 1,
  operation: 'create',
  path: '/files/document.txt',
  user: 'admin',
  timestamp: '2026-03-25T14:30:45.123Z',
  status: 'success',
  details: '{"size": 1024, "extension": ".txt"}',
  hash: 'abc123...'
}
```

### Tabela: `blocked_operations`

Operações que foram bloqueadas por validação:

```sql
CREATE TABLE blocked_operations (
  id INTEGER PRIMARY KEY,
  operation VARCHAR(50),
  path VARCHAR(500),
  reason VARCHAR(500),
  user VARCHAR(100),
  timestamp DATETIME,
  details JSON
);
```

**Exemplo:**

```javascript
{
  id: 1,
  operation: 'create',
  path: '/malware.exe',
  reason: 'Blocked extension: .exe',
  user: 'user',
  timestamp: '2026-03-25T14:30:40.000Z',
  details: '{}'
}
```

### Tabela: `file_statistics`

Estatísticas agregadas por arquivo:

```javascript
{
  id: 1,
  path: '/files/document.txt',
  total_operations: 42,
  create_count: 1,
  delete_count: 0,
  modify_count: 35,
  read_count: 6,
  list_count: 0,
  last_operation: '2026-03-25T15:45:30.000Z',
  last_user: 'admin'
}
```

---

## 🎯 Exemplo Completo de Uso

### Cenário: Usuário tenta deletar arquivo

```javascript
// 1. USER digita no terminal
keyboard.buffer = 'delete /important/document.txt'
keyboard._actionCommit();

// 2. KEYBOARD valida antes de passar para engine
const validation = db.validateOperation('delete', '/important/document.txt', {
  user: 'user'
});

// 3. DATABASE valida
- ✅ path is valid
- ✅ operation is allowed
- ⚠️  Delete requires approval? YES → Pedir confirmação

// 4. SE APROVADO → ENGINE executa
// 5. ENGINE registra no audit
db.logFileOperation('delete', '/important/document.txt', {
  user: 'user',
  status: 'success',
  details: { deletedSize: 2048 }
});

// 6. RENDERER exibe resultado com audit trail
// 7. DATABASE atualiza estatísticas automaticamente
```

---

## 📊 Consultas Úteis

### Recuperar histórico de um arquivo

```javascript
const history = db.getFileHistory("/files/document.txt", 100);
console.table(history);
```

### Gerar relatório de auditoria

```javascript
const report = db.getAuditReport({
  startDate: "2026-03-01",
  endDate: "2026-03-31",
  user: "admin",
});
console.log(report);
```

### Exportar auditoria completa

```javascript
const jsonExport = db.exportAuditToJSON();
fs.writeFileSync("audit-export.json", jsonExport);
```

### Listar operações bloqueadas

```javascript
const blocked = db.getBlockedOperations();
blocked.forEach((op) => {
  console.log(`${op.operation} ${op.path}: ${op.reason}`);
});
```

### Limpar registros antigos

```javascript
db.purgeOldAuditRecords(30); // Manter últimos 30 dias
```

---

## 🔔 Eventos de Auditoria

### Eventos Emitidos

- `file:created` - Arquivo criado
- `file:deleted` - Arquivo deletado
- `file:modified` - Arquivo modificado
- `file:read` - Arquivo lido
- `file:listed` - Diretório listado
- `validation:failed` - Validação falhou
- `operation:blocked` - Operação bloqueada

### Ouvir eventos

```javascript
db.on("file:created", (data) => {
  console.log(`File created: ${data.path} by ${data.user}`);
});

db.on("operation:blocked", (data) => {
  console.log(`Operation blocked: ${data.operation} ${data.path}`);
  console.log(`Reason: ${data.reason}`);
});
```

---

## ✅ Checklist de Integração

- [ ] `console.database.js` importado em `console.commands.js`
- [ ] `console.database.js` importado em `console.engine.js`
- [ ] Validação adicionada ANTES de executar operações
- [ ] Logging adicionado APÓS operações
- [ ] Bloqueio de extensões testado
- [ ] Tab de auditoria renderizada em `console.renderer.js`
- [ ] Eventos de auditoria conectados
- [ ] Relatórios geram sem erros
- [ ] Testes de integração passando
- [ ] Documentação atualizada

---

## 🚀 Status Final

**Versão:** 3.1.0  
**Data:** 25 de março de 2026  
**Status:** 🆕 NOVO - Hub Central de Auditoria Implementado

**Próximos Passos:**

1. Integrar com `console.commands.js`
2. Adicionar UI de auditoria em `console.renderer.js`
3. Testar bloqueio de operações
4. Gerar relatórios de auditoria
5. Implementar aprovações para operações críticas

---
