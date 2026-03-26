# ConsoleDatabase PHP Export

Sistema completo de export PHP do ConsoleDatabase com autenticação de usuários e monitoramento constante da database.

## 📋 Características

- ✅ **Usuário Admin**: ID fixo `7`, username `admin`, senha `12345678a`
- ✅ **Usuário Morgan**: Username `Morgan`, senha `12345678a`
- ✅ **Sistema sempre olha pela database**: Monitoramento constante de status
- ✅ **Autenticação segura**: Password hashing com bcrypt
- ✅ **Controle de sessão**: Gerenciamento automático de login/logout
- ✅ **Conexão MySQL**: PDO com prepared statements
- ✅ **Login Interativo**: Pede username primeiro, depois password
- ✅ **Carregamento sob demanda**: PHP só é lido quando solicitado

## 🚀 Como Usar

### 1. Login no Sistema

#### Login Interativo (Recomendado)

```bash
login
# Sistema pede: Username:
admin
# Sistema pede: Password:
12345678a
# Resultado: ✓ Login successful as admin
#           🔑 Admin privileges granted
```

#### Login Direto

```bash
login admin 12345678a
# Resultado: ✓ Login successful as admin
```

### 2. Carregar Dados PHP (Sob Demanda)

```bash
loadphp
# Carrega dados do PHP apenas quando necessário
# Resultado: ✓ PHP data loaded successfully
#           📊 Users: 2
#           ⚙️ Version: 3.5.0
```

### 3. Configuração do Banco de Dados

Edite as configurações de database no arquivo `database_export.php`:

```php
$config = array(
    "database" => array(
        "host" => "localhost",
        "user" => "seu_usuario",
        "password" => "sua_senha",
        "name" => "console_database",
        "charset" => "utf8mb4"
    )
);
```

### 4. Executar o Sistema

```bash
php database_export.php
```

Ou acesse via navegador web se hospedado em um servidor.

## 👥 Usuários Padrão

| Username | Password  | Role  | ID   |
| -------- | --------- | ----- | ---- |
| admin    | 12345678a | admin | 7    |
| Morgan   | 12345678a | user  | auto |

## 🔧 Funcionalidades

### Classe ConsoleDatabasePHP

- `login($username, $password)`: Autentica usuário
- `logout()`: Encerra sessão
- `isLoggedIn()`: Verifica se há usuário logado
- `isAdmin()`: Verifica se usuário atual é admin
- `getCurrentUser()`: Retorna dados do usuário atual
- `getAllUsers()`: Lista todos os usuários (admin only)
- `exportData()`: Exporta dados do sistema (admin only)
- `monitorDatabase()`: Verifica status da database

### Monitoramento Constante

O sistema sempre verifica:

- Status da conexão com MySQL
- Número total de usuários
- Logins recentes (última hora)
- Usuário atualmente logado

### Login Interativo

- Comando `login` sem argumentos inicia modo interativo
- Pede username primeiro
- Depois pede password
- Trata erros adequadamente

### Carregamento PHP Sob Demanda

- Comando `loadphp` carrega dados apenas quando necessário
- Usa fetch API para carregar dados JSON
- Não carrega automaticamente em cada comando
- Dados ficam armazenados no engine para uso posterior

## 🔑 Sistema de Autenticação

### Fluxo de Login

1. **Interativo**: `login` → Username → Password
2. **Direto**: `login username password`
3. **Compatibilidade**: Mantém suporte ao método antigo

### Verificação de Permissões

- Comandos admin-only verificam `isAdmin()`
- Tokens de sessão gerenciados automaticamente
- Logout limpa sessão completamente

## 📊 API Endpoints PHP

O arquivo PHP suporta endpoints API:

```
GET /database_export.php?api=1&action=load     # Carrega todos os dados
GET /database_export.php?api=1&action=users   # Apenas usuários
GET /database_export.php?api=1&action=config  # Apenas configuração
```

## 📁 Estrutura dos Arquivos

```
database_export.php    # Sistema PHP completo
test_system.php        # Teste independente
README.md             # Esta documentação
```

## ⚠️ Notas Importantes

- O ID do admin é **sempre 7** conforme solicitado
- Ambos os usuários têm a mesma senha "12345678a"
- O sistema tenta conectar ao MySQL, mas tem fallback para modo offline
- O PHP **não é carregado automaticamente** - use `loadphp` quando necessário
- Todas as operações são logged e monitoradas
- Login interativo trata entrada vazia e estados inválidos

## 🧪 Teste do Sistema

Execute o teste independente:

```bash
php test_system.php
```

Este teste funciona mesmo sem MySQL instalado.

## 🔄 Integração com JavaScript

O sistema PHP pode ser integrado com o ConsoleDatabase JavaScript através de APIs REST ou chamadas AJAX.

## 📊 Dados Exportados

O arquivo contém:

- Configurações completas do sistema
- Dados dos usuários (admin e Morgan)
- Status da database
- Metadados de exportação

## ⚙️ Configuração Avançada

### Timeout de Sessão

```php
"session_timeout" => 3600, // 1 hora
```

### Tentativas de Login

```php
"max_login_attempts" => 5,
"lockout_time" => 900 // 15 minutos
```

### Monitoramento

```php
// Verifica status a cada execução
$status = $consoleDB->monitorDatabase();
```

## 🆘 Troubleshooting

### Erro: "could not find driver"

- Instale a extensão PDO MySQL no PHP
- No Windows: habilite `extension=pdo_mysql` no php.ini

### Erro de conexão

- Verifique credenciais do MySQL
- Certifique-se que o MySQL está rodando
- Verifique permissões do usuário

### Login não funciona

- Verifique se username e password estão corretos
- Use modo interativo: apenas `login`
- Verifique se a database está conectada

### PHP não carrega

- Use comando `loadphp` para carregar sob demanda
- Verifique se arquivo PHP está acessível
- Certifique-se que web server está rodando
