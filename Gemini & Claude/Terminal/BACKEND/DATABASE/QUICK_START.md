# 🎯 GUIA RÁPIDO - PHP & Database Integração

## 1️⃣ INICIAR SERVIDOR

```powershell
# Abrir PowerShell em: C:\Users\Desktop\OneDrive\Área de Trabalho\test-InteligenceArtificial\Gemini & Claude\Terminal

cd "Gemini & Claude\Terminal"

php -S localhost:8000
```

**Esperado:**

```
Development Server (http://localhost:8000)
Listening on http://localhost:8000
Press Ctrl-C to quit
```

---

## 2️⃣ ABRIR TERMINAL WEB

Navegador → `http://localhost:8000/FRONTEND/terminal.html`

---

## 3️⃣ COMANDOS DISPONÍVEIS

### Login & Autenticação

```bash
# Login local (database interna)
login admin 12345678a

# Login via PHP (session)
loginphp admin 12345678a

# Logout
logout

# Mudar senha
changepw novasenha123
```

### Database (após login)

```bash
# Listar tabelas
list

# Descrever tabela
describe users

# Criar tabela
create table products id name price

# Inserir dado
insert into products (id,name,price) values (1,"Produto",99.90)

# Consultar dados
select * from products

# Deletar tabela
drop table products
```

### PHP Integration

```bash
# Carregar dados do PHP (requer loginphp)
loadphp

# Mostra histórico de comandos
history

# Limpar tela
clear

# Ver versão
version

# Ver ajuda
help
```

---

## 4️⃣ CREDENCIAIS

| Campo        | Valor                                             |
| ------------ | ------------------------------------------------- |
| **Username** | `admin` _(aliases: morgan, Morgan, Admin, ADMIN)_ |
| **Password** | `12345678a`                                       |

---

## 5️⃣ FLUXO TÍPICO

```markdown
1. Terminal abre
   ↓
2. loginphp admin 12345678a
   ✓ PHP session authenticated as morgan
   🔑 Admin privileges granted
   ↓
3. loadphp
   ✓ PHP data loaded
   📊 Users: 1
   ↓
4. list
   📊 Available Tables:
   [mostra tabelas]
   ↓
5. select \* from users
   [mostra usuários]
```

---

## 6️⃣ TESTES RÁPIDOS (Terminal)

### Teste 1: Health Check

```bash
curl http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=health
```

### Teste 2: Login

```bash
curl -X POST "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"12345678a"}'
```

### Teste 3: Script PHP

```bash
php BACKEND/DATABASE/test_login.php
```

---

## 7️⃣ O QUE FOI CORRIGIDO

✅ **console.engine.js**

- Renomeado `debug` → `debugMode`
- Adicionado `_loginState`
- Refatorado todos os comandos de database
- Corrigido comando `loginphp`

✅ **database_export.php**

- Agora lê action da query string
- JSON body é decodificado corretamente
- Validação robusta de entrada
- HTTP status codes corretos (200, 400, 401)
- Mensagens de erro descritivas
- Modo offline funciona

✅ **Novos Arquivos**

- `BACKEND/DATABASE/test_login.php` - testa API
- `BACKEND/DATABASE/test_api.js` - exemplos
- `BACKEND/DATABASE/PHP_INTEGRATION_GUIDE.md` - documentação
- `README_FIXES.md` - guia completo
- Este arquivo - guia rápido

---

## 8️⃣ ESTRUTURA

```
BACKEND/
├── CORE/
│   └── console.engine.js ✅ (CORRIGIDO)
├── DATABASE/
│   ├── database_export.php ✅ (CORRIGIDO)
│   ├── console.controler.database.js
│   ├── test_login.php ✨ (NOVO)
│   ├── test_api.js ✨ (NOVO)
│   └── PHP_INTEGRATION_GUIDE.md ✨ (NOVO)

FRONTEND/
└── terminal.html

README_FIXES.md ✨ (NOVO)
FIXES_SUMMARY.md ✨ (NOVO)
```

---

## 9️⃣ TROUBLESHOOTING

| Erro                     | Solução                                      |
| ------------------------ | -------------------------------------------- |
| "PHP server unreachable" | Execute: `php -S localhost:8000`             |
| "You are on Live Server" | Use `localhost:8000` ao invés de Live Server |
| "Credenciais inválidas"  | Use: `admin` / `12345678a`                   |
| "CORS error"             | Acesse de `localhost`, não `127.0.0.1`       |
| "Cannot reach PHP API"   | Certifique que PHP está rodando              |

---

## 🔟 TUDO PRONTO!

```
✅ PHP funciona
✅ JavaScript funciona
✅ Database funciona
✅ Integração completa
✅ Erros corrigidos
✅ Testes passando

🎉 SISTEMA OPERACIONAL!
```

---

**Dúvidas?** Veja `README_FIXES.md` ou `PHP_INTEGRATION_GUIDE.md`

**Testando API?** Veja exemplos em `test_api.js`

**Última atualização:** 26 de março de 2026
