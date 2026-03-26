# 📚 Índice Completo - Ferramentas de Diagnóstico

## 🚀 Início Rápido

1. **Iniciar PHP:**

   ```bash
   cd "Gemini & Claude\Terminal"
   php -S localhost:8000
   ```

2. **Abrir Terminal Web:**

   ```
   http://localhost:8000/FRONTEND/terminal.html
   ```

3. **Testar Login:**
   ```bash
   loginphp admin 12345678a
   ```

---

## 📁 Arquivos de Diagnóstico

### 🔧 Ferramentas de Teste

| Arquivo                                             | Descrição                             | Usar Quando               |
| --------------------------------------------------- | ------------------------------------- | ------------------------- |
| [verify_hash.php](BACKEND/DATABASE/verify_hash.php) | Valida se o hash bcrypt está correto  | Recebe 401 no login       |
| [debug_login.php](BACKEND/DATABASE/debug_login.php) | Testa o fluxo completo de login (CLI) | Quer debug detalhado      |
| [test_simulator.php](test_simulator.php)            | Interface web interativa para testes  | Quer UI visual            |
| [test_login.php](BACKEND/DATABASE/test_login.php)   | Testa via curl (CLI)                  | Quer testes automatizados |
| [test_api.js](BACKEND/DATABASE/test_api.js)         | Exemplos de requests (referência)     | Quer aprender a API       |

### 📖 Guias de Troubleshooting

| Arquivo                                                               | Conteúdo                      | Para Quem                  |
| --------------------------------------------------------------------- | ----------------------------- | -------------------------- |
| [FIX_401_ERROR.md](FIX_401_ERROR.md)                                  | Solução rápida em 3 passos    | Pressa, erro 401           |
| [DIAGNOSE_401_ERROR.md](DIAGNOSE_401_ERROR.md)                        | Diagnóstico detalhado         | Quer entender problema     |
| [PHP_INTEGRATION_GUIDE.md](BACKEND/DATABASE/PHP_INTEGRATION_GUIDE.md) | Documentação completa da API  | Documentação formal        |
| [README_FIXES.md](README_FIXES.md)                                    | Resumo de todas as correções  | Quer saber o que foi feito |
| [FIXES_SUMMARY.md](FIXES_SUMMARY.md)                                  | Mudanças técnicas e correções | Análise técnica            |
| [QUICK_START.md](QUICK_START.md)                                      | Guia de início rápido         | Comece em 5 minutos        |

---

## 🎯 Fluxo de Troubleshooting

### Cenário 1: "401 Unauthorized"

```mermaid
Started with 401 error?
├─ Run: php verify_hash.php
├─ Returns TRUE?
│  └─ Run: php debug_login.php
│     ├─ Returns SUCCESS?
│     │  └─ ✅ System works! Test in browser
│     └─ Returns FAILED?
│        └─ Check PHP error logs
└─ Returns FALSE?
   ├─ Generate new hash: php -r "echo password_hash('12345678a', PASSWORD_BCRYPT);"
   ├─ Update database_export.php line ~59
   └─ Test again with verify_hash.php
```

### Cenário 2: "PHP server unreachable"

```
Check:
├─ PHP rodando? php -S localhost:8000
├─ Port 8000 livre? lsof -i :8000
├─ CORS headers corretos? curl -v
└─ Browser console errors? F12 → Console
```

### Cenário 3: "Credenciais inválidas"

```
Check:
├─ Username correto? "admin" ou "morgan"
├─ Password correto? "12345678a"
├─ Case sensitive? YES - password é case-sensitive
├─ Hash bcrypt OK? php verify_hash.php
└─ JSON enviado? curl -v com -d flag
```

---

## 🧪 Executar Testes

### Via Terminal (CLI)

```bash
# Teste 1: Validar Hash
php BACKEND/DATABASE/verify_hash.php

# Teste 2: Debug Completo
php BACKEND/DATABASE/debug_login.php

# Teste 3: Curl Request
curl -X POST "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"12345678a"}' -v

# Teste 4: PHP Testing
php BACKEND/DATABASE/test_login.php
```

### Via Browser

```
http://localhost:8000/test_simulator.php
```

Opções:

- `1️⃣ Test Hash Verification` - Valida hash
- `2️⃣ Test Alias Resolution` - Testa aliases
- `3️⃣ Test HTTP Fetch` - Testa POST
- `4️⃣ Test JavaScript Fetch` - Testa fetch real
- `▶️ Run All Tests` - Executa tudo

### Via Terminal web

```bash
# No terminal da web:
loginphp admin 12345678a
```

---

## 📊 Resultados Esperados

### ✅ Hash OK

```
password_verify() result: TRUE ✅
✅ HASH IS VALID - Password matches!
```

### ✅ Login OK

```
✅ LOGIN SUCCESS
   Status: 200 OK
   Response:
   {
     "success": true,
     "user": {"id": 1, "username": "morgan", "role": "admin"},
     "message": "Login realizado (modo offline)"
   }
```

### ✅ Simulator OK

```
✓ PHP session authenticated as morgan
🔑 Admin privileges granted
```

### ✅ Terminal OK

```
✓ PHP session authenticated as morgan
🔑 Admin privileges granted
```

---

## 🔍 Dados Técnicos

### Credenciais Padrão

- **Username:** `admin` (aliases: morgan, Morgan, ADMIN, MORGAN)
- **Password:** `12345678a` (case-sensitive)
- **Hash:** `$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`
- **Algoritmo:** bcrypt (PASSWORD_BCRYPT)

### Endpoints

- **Health:** `GET ?api=1&action=health`
- **Login:** `POST ?api=1&action=login` (JSON body)
- **Load:** `GET ?api=1&action=load` (auth required)
- **Users:** `GET ?api=1&action=users` (auth required)
- **Logout:** `POST ?api=1&action=logout`

### HTTP Status Codes

- `200 OK` - Sucesso
- `400 Bad Request` - Dados inválidos
- `401 Unauthorized` - Credenciais inválidas ou não autenticado

---

## 🛠️ Correções Aplicadas

### console.engine.js

```javascript
// ✅ Renomeado debug → debugMode
// ✅ Adicionado _loginState
// ✅ Adicionado _phpSessionActive
// ✅ Refatorados comandos de DB
// ✅ Corrigido comando loginphp
```

### database_export.php

```php
// ✅ Lê action de: query string → POST → JSON body
// ✅ Decodifica JSON com fallback
// ✅ Valida entrada robustamente
// ✅ HTTP status codes corretos
// ✅ Modo offline funcional
// ✅ Aliases funcionam (admin → morgan)
```

---

## 📝 Próximas Etapas (Opcional)

- [ ] Implementar tokens JWT
- [ ] Adicionar rate limiting
- [ ] Criar API docs (Swagger)
- [ ] Implementar 2FA
- [ ] Deploy em produção com HTTPS

---

## 📞 Referência Rápida

| Problema           | Comando                              | Esperado        |
| ------------------ | ------------------------------------ | --------------- |
| Hash inválido      | `php verify_hash.php`                | `✅ TRUE`       |
| Login não funciona | `php debug_login.php`                | `✅ SUCCESS`    |
| CORS error         | `curl -v <url>`                      | `HTTP/1.1 200`  |
| Quer testar web    | URL: `test_simulator.php`            | UI funcional    |
| Quer fazer login   | Terminal: `loginphp admin 12345678a` | ✓ authenticated |

---

## ✨ Resumo

| Arquivo               | Tipo      | Status       |
| --------------------- | --------- | ------------ |
| console.engine.js     | Code      | ✅ Corrigido |
| database_export.php   | Code      | ✅ Corrigido |
| verify_hash.php       | Tool      | ✨ Novo      |
| debug_login.php       | Tool      | ✨ Novo      |
| test_simulator.php    | Tool      | ✨ Novo      |
| FIX_401_ERROR.md      | Guide     | ✨ Novo      |
| DIAGNOSE_401_ERROR.md | Guide     | ✨ Novo      |
| test_api.js           | Reference | ✨ Novo      |

**Total:** 2 corrigidos + 8 novos = 10 arquivos de suporte

---

**Data:** 26 de março de 2026  
**Status:** ✅ Pronto para diagnóstico e correção  
**Última atualização:** Adicionados 5 arquivos de teste e diagnóstico
