# 🆘 Guia Rápido - Erro 401 No LoginPHP

## O Problema

```
❌ PHP login failed: Credenciais inválidas
Status: 401 Unauthorized
```

## A Solução Em 3 Passos

### ✅ Passo 1: Verificar PHP

```bash
cd "Gemini & Claude\Terminal"
php -S localhost:8000
```

**Esperado:**

```
Listening on http://localhost:8000
Press Ctrl-C to quit
```

---

### ✅ Passo 2: Testar Hash Bcrypt

```bash
# Em outro terminal:
php BACKEND/DATABASE/verify_hash.php
```

**Se retornar `✅ TRUE`:**  
→ Hash está OK, vá para Passo 3

**Se retornar `❌ FALSE`:**  
→ Hash está corrompido, siga a correção em baixo

---

### ✅ Passo 3: Testar Login

Abrir no navegador:

```
http://localhost:8000/test_simulator.php
```

Clicar em: `4️⃣ Test JavaScript Fetch`

**Se retornar `✓ PHP session authenticated`:**  
→ ✅ Sistema está funcionando!

**Se retornar `❌ PHP login failed`:**  
→ Siga a correção de hash em baixo

---

## 🔧 Corrigir Hash Inválido

Se o teste retornar `❌ FALSE`:

### Passo A: Gerar Novo Hash

```bash
php -r "echo password_hash('12345678a', PASSWORD_BCRYPT);"
```

Copie a saída (vai parecer: `$2y$10$...`)

### Passo B: Atualizar database_export.php

Abrir arquivo:

```
BACKEND/DATABASE/database_export.php
```

Encontrar (linha ~59):

```php
"password" => '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
```

Substituir pelo novo hash:

```php
"password" => '$2y$10$...seu_novo_hash...',
```

### Passo C: Testar Novamente

```bash
php BACKEND/DATABASE/verify_hash.php
```

Deve retornar `✅ TRUE` agora.

---

## 📝 Teste Completo (IPC)

Execute tudo de uma vez:

```bash
# Terminal 1: Iniciar PHP
cd "Gemini & Claude\Terminal"
php -S localhost:8000

# Terminal 2: Rodar testes
php BACKEND/DATABASE/debug_login.php
```

**Procure por:**

```
[1] Testing bcrypt hash verification
    ✅ TRUE

[2] Testing alias resolution
    ✅ alias

[4] Simulating login process
    ✅ LOGIN SUCCESS
```

Se tudo está `✅`, o sistema funciona!

---

## 🌐 Teste no Navegador

1. Abrir: `http://localhost:8000/test_simulator.php`
2. Clicar: `▶️ Run All Tests`
3. Procurar por: `✅ Login successful!`

---

## 📋 Checklist

- [ ] PHP está rodando em `localhost:8000`
- [ ] `verify_hash.php` retorna `✅ TRUE`
- [ ] `debug_login.php` retorna `✅ LOGIN SUCCESS`
- [ ] `test_simulator.php` retorna `✓ PHP session authenticated`
- [ ] No terminal: `loginphp admin 12345678a` mostra sucesso

---

## ⚡ TL;DR (Very Quick)

```bash
# 1. Terminal 1
cd "Gemini & Claude\Terminal"
php -S localhost:8000

# 2. Terminal 2
php BACKEND/DATABASE/verify_hash.php

# Se ❌ FALSE:
php -r "echo password_hash('12345678a', PASSWORD_BCRYPT);"
# Copiar resultado e atualizar database_export.php linha ~59

# 3. Testar novamente
php BACKEND/DATABASE/verify_hash.php
# Deve retornar ✅ TRUE

# 4. No navegador
http://localhost:8000/test_simulator.php
# Clicar: 4️⃣ Test JavaScript Fetch
```

---

## 🆘 Última Tentativa

Se ainda não funcionar, colete diagnósticos:

```bash
php BACKEND/DATABASE/debug_login.php > /tmp/debug.txt
php --version > /tmp/version.txt
curl "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=health" > /tmp/health.txt
```

Compartilhe os arquivos em `/tmp/` para análise.

---

**Próximo:** Rode `php verify_hash.php` e nos diga o resultado!
