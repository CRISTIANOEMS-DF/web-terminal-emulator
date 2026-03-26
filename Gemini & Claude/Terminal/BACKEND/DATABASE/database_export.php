<?php
/**
 * ConsoleDatabase PHP Export
 * ════════════════════════════════════════════════════════════════
 *
 * Sistema completo de export PHP do ConsoleDatabase
 * Inclui usuários, autenticação e conexão com database
 *
 * @version 3.5.0
 * @exported 2026-03-26T18:24:49.088Z
 */

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DO SISTEMA
// ──────────────────────────────────────────────────────────────────────────────

$config = array(
    "version" => "3.5.0",
    "exportedAt" => "2026-03-26T18:24:49.088Z",
    "database" => array(
        "host" => "localhost",
        "user" => "root",
        "password" => "",
        "name" => "console_database",
        "charset" => "utf8mb4"
    ),
    "security" => array(
        "session_timeout" => 3600, // 1 hora
        "max_login_attempts" => 5,
        "lockout_time" => 900 // 15 minutos
    )
);

// ──────────────────────────────────────────────────────────────────────────────
// CLASSE DE CONEXÃO COM DATABASE
// ──────────────────────────────────────────────────────────────────────────────

class DatabaseConnection {
    private $conn;
    private $config;

    public function __construct($config) {
        $this->config = $config;
        $this->connect();
    }

    private function connect() {
        try {
            $dsn = "mysql:host={$this->config['host']};dbname={$this->config['name']};charset={$this->config['charset']}";
            $this->conn = new PDO($dsn, $this->config['user'], $this->config['password']);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            die("Erro de conexão: " . $e->getMessage());
        }
    }

    public function getConnection() {
        return $this->conn;
    }

    public function query($sql, $params = []) {
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch(PDOException $e) {
            die("Erro na query: " . $e->getMessage());
        }
    }

    public function select($table, $conditions = [], $params = []) {
        $sql = "SELECT * FROM {$table}";
        if (!empty($conditions)) {
            $sql .= " WHERE " . implode(" AND ", $conditions);
        }
        return $this->query($sql, $params)->fetchAll();
    }

    public function insert($table, $data) {
        $columns = implode(", ", array_keys($data));
        $placeholders = ":" . implode(", :", array_keys($data));
        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        $this->query($sql, $data);
        return $this->conn->lastInsertId();
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// CLASSE DE AUTENTICAÇÃO DE USUÁRIOS
// ──────────────────────────────────────────────────────────────────────────────

class UserManager {
    private $db;
    private $config;

    public function __construct($db, $config) {
        $this->db = $db;
        $this->config = $config;
        $this->initializeUsersTable();
    }

    private function initializeUsersTable() {
        // Criar tabela de usuários se não existir
        $sql = "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('user', 'admin') DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP NULL,
            is_active BOOLEAN DEFAULT TRUE
        )";
        $this->db->query($sql);

        // Inserir usuários padrão se não existirem
        $this->ensureDefaultUsers();
    }

    private function ensureDefaultUsers() {
        // Morgan é o único admin do servidor (case-insensitive: morgan/Morgan)
        $morganExists = $this->db->select("users", ["LOWER(username) = ?"], ["morgan"]);
        if (empty($morganExists)) {
            $this->db->insert("users", [
                "username" => "morgan",
                "password" => password_hash("12345678a", PASSWORD_DEFAULT),
                "role" => "admin"
            ]);
        }
    }

    public function authenticate($username, $password) {
        $users = $this->db->select("users", ["LOWER(username) = ?", "is_active = ?"], [strtolower($username), true]);

        if (empty($users)) {
            return ["success" => false, "message" => "Usuário não encontrado"];
        }

        $user = $users[0];

        if (!password_verify($password, $user['password'])) {
            return ["success" => false, "message" => "Senha incorreta"];
        }

        // Atualizar último login
        $this->db->query("UPDATE users SET last_login = NOW() WHERE id = ?", [$user['id']]);

        return [
            "success" => true,
            "user" => [
                "id" => $user['id'],
                "username" => $user['username'],
                "role" => $user['role']
            ],
            "message" => "Login realizado com sucesso"
        ];
    }

    public function isAdmin($userId = null) {
        if ($userId === null) {
            return false; // Sem usuário logado
        }

        $users = $this->db->select("users", ["id = ?", "role = ?"], [$userId, "admin"]);
        return !empty($users);
    }

    public function getAllUsers() {
        return $this->db->select("users", [], []);
    }

    public function getUserById($id) {
        $users = $this->db->select("users", ["id = ?"], [$id]);
        return empty($users) ? null : $users[0];
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// SISTEMA PRINCIPAL - SEMPRE OLHA PELA DATABASE
// ──────────────────────────────────────────────────────────────────────────────

class ConsoleDatabasePHP {
    private $db;
    private $userManager;
    private $config;
    private $currentUser = null;

    public function __construct($config) {
        $this->config = $config;
        $this->db = new DatabaseConnection($config['database']);
        $this->userManager = new UserManager($this->db, $config);
        $this->initializeSession();
    }

    private function initializeSession() {
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }

        // Verificar se usuário está logado
        if (isset($_SESSION['user_id'])) {
            $this->currentUser = $this->userManager->getUserById($_SESSION['user_id']);
        }
    }

    public function login($username, $password) {
        $result = $this->userManager->authenticate($username, $password);

        if ($result['success']) {
            $_SESSION['user_id'] = $result['user']['id'];
            $this->currentUser = $result['user'];
        }

        return $result;
    }

    public function logout() {
        session_destroy();
        $this->currentUser = null;
        return ["success" => true, "message" => "Logout realizado"];
    }

    public function isLoggedIn() {
        return $this->currentUser !== null;
    }

    public function isAdmin() {
        return $this->currentUser && $this->userManager->isAdmin($this->currentUser['id']);
    }

    public function getCurrentUser() {
        return $this->currentUser;
    }

    public function getAllUsers() {
        if (!$this->isAdmin()) {
            return ["error" => "Acesso negado - apenas admin"];
        }
        return $this->userManager->getAllUsers();
    }

    public function exportData() {
        if (!$this->isAdmin()) {
            return ["error" => "Acesso negado - apenas admin"];
        }

        return [
            "users" => $this->userManager->getAllUsers(),
            "config" => $this->config,
            "exported_at" => date('c')
        ];
    }

    // Método para verificar constantemente a database
    public function checkDatabaseHealth() {
        try {
            $this->db->query("SELECT 1");
            return ["status" => "healthy", "message" => "Database conectada"];
        } catch (Exception $e) {
            return ["status" => "error", "message" => "Erro na database: " . $e->getMessage()];
        }
    }

    // Método que sempre olha pela database
    public function monitorDatabase() {
        $health = $this->checkDatabaseHealth();

        if ($health['status'] === 'healthy') {
            // Verificar usuários ativos
            $activeUsers = $this->db->select("users", ["is_active = ?"], [true]);
            $totalUsers = count($activeUsers);

            // Verificar último login
            $recentLogins = $this->db->select("users", ["last_login > ?"], [date('Y-m-d H:i:s', strtotime('-1 hour'))]);

            return [
                "database_status" => "OK",
                "total_users" => $totalUsers,
                "recent_logins" => count($recentLogins),
                "current_user" => $this->currentUser ? $this->currentUser['username'] : "Nenhum",
                "timestamp" => date('c')
            ];
        }

        return $health;
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// INICIALIZAÇÃO DO SISTEMA (COM FALLBACK PARA TESTE)
// ──────────────────────────────────────────────────────────────────────────────

// Tentar inicializar sistema, com fallback se não houver MySQL
try {
    $consoleDB = new ConsoleDatabasePHP($config);
    $databaseStatus = $consoleDB->monitorDatabase();
    $systemInitialized = true;
} catch (Exception $e) {
    // Fallback para modo offline/teste
    $consoleDB = null;
    $databaseStatus = [
        "database_status" => "OFFLINE",
        "error" => "MySQL não disponível: " . $e->getMessage(),
        "total_users" => 2,
        "recent_logins" => 0,
        "current_user" => "Nenhum",
        "timestamp" => date('c')
    ];
    $systemInitialized = false;
}

// ──────────────────────────────────────────────────────────────────────────────
// DADOS EXPORTADOS (ESTRUTURA ORIGINAL)
// ──────────────────────────────────────────────────────────────────────────────

$exportedData = array(
    "users" => array(
        array(
            "id" => null, // Será auto-incrementado
            "username" => "morgan",
            "password" => password_hash("12345678a", PASSWORD_DEFAULT),
            "role" => "admin",
            "created_at" => "2026-03-26T18:24:49.088Z"
        )
    ),
    "config" => $config,
    "database_status" => $databaseStatus
);

// ──────────────────────────────────────────────────────────────────────────────
// FUNÇÕES DE UTILITÁRIO
// ──────────────────────────────────────────────────────────────────────────────

function displayDatabaseStatus($status) {
    echo "<h3>Status da Database</h3>";
    echo "<pre>" . json_encode($status, JSON_PRETTY_PRINT) . "</pre>";
}

function displayUsers($users) {
    echo "<h3>Usuários do Sistema</h3>";
    echo "<table border='1'>";
    echo "<tr><th>ID</th><th>Username</th><th>Role</th><th>Created At</th><th>Last Login</th></tr>";

    foreach ($users as $user) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($user['id']) . "</td>";
        echo "<td>" . htmlspecialchars($user['username']) . "</td>";
        echo "<td>" . htmlspecialchars($user['role']) . "</td>";
        echo "<td>" . htmlspecialchars($user['created_at'] ?? 'N/A') . "</td>";
        echo "<td>" . htmlspecialchars($user['last_login'] ?? 'Nunca') . "</td>";
        echo "</tr>";
    }

    echo "</table>";
}

// ──────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PARA CARREGAR DADOS PHP QUANDO SOLICITADO
// ──────────────────────────────────────────────────────────────────────────────

function loadPHPData() {
    global $exportedData, $config, $databaseStatus;
    return [
        'data' => $exportedData,
        'config' => $config,
        'status' => $databaseStatus,
        'loaded_at' => date('c')
    ];
}

function getPHPUsers() {
    global $exportedData;
    return $exportedData['users'];
}

function getPHPConfig() {
    global $config;
    return $config;
}

// ──────────────────────────────────────────────────────────────────────────────
// API ENDPOINT PARA JAVASCRIPT
// ──────────────────────────────────────────────────────────────────────────────

// Verificar se é uma requisição AJAX/API
if (isset($_GET['api']) || isset($_POST['api'])) {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST');
    header('Access-Control-Allow-Headers: Content-Type');

    $action = $_GET['action'] ?? $_POST['action'] ?? 'load';

    switch ($action) {
        case 'load':
            echo json_encode(loadPHPData());
            break;
        case 'users':
            echo json_encode(getPHPUsers());
            break;
        case 'config':
            echo json_encode(getPHPConfig());
            break;
        default:
            echo json_encode(['error' => 'Invalid action']);
    }
    exit;
}

// ──────────────────────────────────────────────────────────────────────────────
// TESTE DO SISTEMA (EXECUTADO APENAS QUANDO ACESSADO DIRETAMENTE)
// ──────────────────────────────────────────────────────────────────────────────

if (basename(__FILE__) == basename($_SERVER['PHP_SELF'])) {
    echo "<h1>ConsoleDatabase PHP Export - Sistema Completo</h1>";
    echo "<p>Versão: {$config['version']}</p>";
    echo "<p>Exportado em: {$config['exportedAt']}</p>";

    // Mostrar status da database
    displayDatabaseStatus($databaseStatus);

    // Tentar login como admin
    echo "<h2>Teste de Login</h2>";
    $loginResult = $consoleDB->login("morgan", "12345678a");
    echo "<pre>Login admin: " . json_encode($loginResult, JSON_PRETTY_PRINT) . "</pre>";

    if ($consoleDB->isLoggedIn()) {
        echo "<p>✅ Usuário logado: " . $consoleDB->getCurrentUser()['username'] . "</p>";
        echo "<p>✅ É admin: " . ($consoleDB->isAdmin() ? "Sim" : "Não") . "</p>";

        // Mostrar todos os usuários
        $allUsers = $consoleDB->getAllUsers();
        if (!isset($allUsers['error'])) {
            displayUsers($allUsers);
        } else {
            echo "<p>❌ Erro ao obter usuários: " . $allUsers['error'] . "</p>";
        }
    }

    // Logout
    $logoutResult = $consoleDB->logout();
    echo "<pre>Logout: " . json_encode($logoutResult, JSON_PRETTY_PRINT) . "</pre>";
}

?>