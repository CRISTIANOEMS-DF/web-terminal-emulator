# 🔧 Diagnóstico do Erro 401 (Unauthorized)

## O Que Significa?

Status `401 Unauthorized` significa que o PHP **rejeitou as credenciais**.

## Possíveis Causas

### 1. ❌ Senha Incorreta

- Você está usando `admin / 12345678a`?
- A senha é **case-sensitive**
- Verifique se não há espaços

### 2. ❌ Hash Bcrypt Corrompido

- O hash armazenado em `database_export.php` pode estar inválido
- Solução: regenerar o hash

### 3. ❌ JSON não está sendo recebido

- O PHP pode não estar lendo o corpo JSON corretamente
- Solução: adicionar debug logs

### 4. ❌ PHP Session não iniciando

- `session_start()` pode falhar
- Solução: verificar se diretório de session tem permissões

---

## 🧪 Passo 1: Testar Hash Bcrypt

Execute no terminal:

```bash
php BACKEND/DATABASE/verify_hash.php
```

**Resultado esperado:**

```
password_verify() result: TRUE ✅
✅ HASH IS VALID - Password matches!
```

**Se falhar:**

```
❌ HASH IS INVALID - Password does NOT match!
Generating new hash for password '12345678a':
New hash: $2y$10$...somnewhash...
```

---

## 🧪 Passo 2: Debug Completo

Execute no terminal:

```bash
php BACKEND/DATABASE/debug_login.php
```

**Procure por esses pontos:**

1. **[1] Testing bcrypt hash verification**
   - Deve estar `✅ TRUE`
   - Se não, copie o novo hash gerado

2. **[2] Testing alias resolution**
   - `admin` deve ser `✅ alias`
   - `morgan` deve ser `✅ alias`

3. **[4] Simulating login process**
   - Deve estar `✅ LOGIN SUCCESS`
   - Se não, identifique o problema

---

## 🔧 Corrigir Hash Inválido

Se o teste mostrar hash inválido:

### Passo 1: Gerar novo hash

```bash
php -r "echo password_hash('12345678a', PASSWORD_BCRYPT);"
```

Cópia o resultado (algo como `$2y$10$...`)

### Passo 2: Atualizar `database_export.php`

Abrir arquivo e procurar:

```php
"password"           => '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
```

Substituir pelo novo hash:

```php
"password"           => '$2y$10$...seu_novo_hash...',
```

### Passo 3: Salvar e testar

```bash
# Reiniciar teste
php BACKEND/DATABASE/verify_hash.php

# Deve mostrar ✅ TRUE agora
```

---

## 📝 Teste Direto do PHP

Se os testes acima passarem, mas ainda recebe 401 no navegador:

### Passo 1: Testar via curl

```bash
curl -X POST "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"12345678a"}' \
  -v
```

**Procure por:**

- `< HTTP/1.1 200 OK` (sucesso)
- `< HTTP/1.1 401 Unauthorized` (falha)

### Passo 2: Adicionar Debug ao PHP

Abrir `database_export.php` e adicionar após `case 'login':`

```php
case 'login':
    // DEBUG
    error_log("DEBUG: Received request for login");
    error_log("DEBUG: _GET['action'] = " . json_encode($_GET['action'] ?? 'NOT SET'));
    error_log("DEBUG: Raw body = " . file_get_contents('php://input'));
    // FIM DEBUG

    // Rest of code...
```

Depois verificar `/tmp/php_errors.log` ou cofiguration do PHP.

---

## 🌐 Teste no Navegador

Abrir DevTools (F12) e colar no console:

```javascript
// Teste 1: Health check
fetch(
  "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=health",
)
  .then((r) => r.json())
  .then((d) => console.log("HEALTH:", d))
  .catch((e) => console.error("ERROR:", e));

// Teste 2: Login
setTimeout(() => {
  fetch(
    "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=login",
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "12345678a" }),
    },
  )
    .then((r) => r.json())
    .then((d) => console.log("LOGIN:", d))
    .catch((e) => console.error("ERROR:", e));
}, 1000);
```

---

## ✅ Checklist

- [ ] Ran `verify_hash.php` → resultado `✅ TRUE`
- [ ] Ran `debug_login.php` → resultado `✅ LOGIN SUCCESS`
- [ ] Testou via `curl` → status 200 OK
- [ ] Testou no navegador console → JSON response
- [ ] Comando `loginphp admin 12345678a` funciona no terminal

---

## 🎯 Se Ainda Não Funcionar

Crie um arquivo de diagnóstico com essa informação:

```bash
# 1. Testar e salvar resultado
php BACKEND/DATABASE/debug_login.php > debug_output.txt

# 2. Testar e salvar curl
curl -X POST "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"12345678a"}' \
  -v 2>&1 > curl_output.txt

# 3. Verificar PHP version
php --version > php_version.txt

# 4. Verificar extensões
php -m > php_modules.txt
```

Compartilhe esses arquivos para diagnóstico.

---

## 🛠️ Referência Rápida

| Problema             | Comando                    | Esperado                      |
| -------------------- | -------------------------- | ----------------------------- |
| Hash inválido        | `php verify_hash.php`      | `✅ TRUE`                     |
| Login falhando       | `php debug_login.php`      | `✅ LOGIN SUCCESS`            |
| Curl retorna erro    | `curl ... -v`              | `HTTP/1.1 200`                |
| Comando não funciona | `loginphp admin 12345678a` | `✓ PHP session authenticated` |

---

**Próxima ação:** Execute `php BACKEND/DATABASE/verify_hash.php` e nos diga o resultado!
