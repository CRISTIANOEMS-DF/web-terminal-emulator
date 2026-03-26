<?php
/**
 * ConsoleDatabase PHP Export
 * ════════════════════════════════════════════════════════════════
 * @version 3.5.2
 */

// ──────────────────────────────────────────────────────────────────────────────
// CORS — Accept any origin, any method
// ──────────────────────────────────────────────────────────────────────────────

$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
// Reflect the exact requesting origin so credentials work on any port
if (preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/', $origin)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DO SISTEMA
// ──────────────────────────────────────────────────────────────────────────────

$config = array(
    "version"    => "3.5.1",
    "exportedAt" => "2026-03-26T18:24:49.088Z",

    // Credenciais do admin único — morgan e admin são o mesmo usuário
    "admin" => array(
        "canonical_username" => "morgan",           // nome canônico armazenado no DB
        "aliases"            => ["morgan", "admin", "Morgan", "Admin", "MORGAN", "ADMIN"],
        "password"           => '$2y$10$fPL7rZ.P4/a/cXCsmVGlg.0giM0qyYsgjgB0slxq1xTkt1p8CmqOm', // Hash de '12345678a' - REGENERADO 26/03/2026
        "role"               => "admin"
    ),

    "database" => array(
        "host"    => "localhost",
        "user"    => "root",
        "password" => "",
        "name"    => "console_database",
        "charset" => "utf8mb4"
    ),

    "security" => array(
        "session_timeout"    => 3600,   // 1 hora
        "max_login_attempts" => 5,
        "lockout_time"       => 900     // 15 minutos
    ),

    // Todas as actions disponíveis na API
    "api" => array(
        // Actions públicas: qualquer um pode chamar
        "public_actions"    => ["login", "health"],
        // Actions protegidas: exigem sessão autenticada
        "protected_actions" => ["load", "users", "config", "status", "logout"],
        "methods"           => ["GET", "POST"],
        "cors"              => "*"
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
        } catch (PDOException $e) {
            // Throw so the caller can catch and fall back gracefully
            throw new Exception("MySQL connection failed: " . $e->getMessage());
        }
    }

    public function getConnection() { return $this->conn; }

    public function query($sql, $params = []) {
        try {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            throw new Exception("Query failed: " . $e->getMessage());
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
        $columns      = implode(", ", array_keys($data));
        $placeholders = ":" . implode(", :", array_keys($data));
        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        $this->query($sql, $data);
        return $this->conn->lastInsertId();
    }

    public function upsert($table, $data, $conflictColumn) {
        $existing = $this->select($table, ["LOWER({$conflictColumn}) = ?"], [strtolower($data[$conflictColumn])]);
        if (empty($existing)) {
            return $this->insert($table, $data);
        }
        // Atualizar campos existentes
        $sets   = implode(", ", array_map(fn($k) => "{$k} = :{$k}", array_keys($data)));
        $sql    = "UPDATE {$table} SET {$sets} WHERE LOWER({$conflictColumn}) = :__conflict";
        $params = array_merge($data, ["__conflict" => strtolower($data[$conflictColumn])]);
        $this->query($sql, $params);
        return $existing[0]['id'];
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// CLASSE DE AUTENTICAÇÃO DE USUÁRIOS
// ──────────────────────────────────────────────────────────────────────────────

class UserManager {
    private $db;
    private $config;

    // Aliases aceitos para o admin (morgan = admin = Morgan = Admin ...)
    private $adminAliases;

    public function __construct($db, $config) {
        $this->db           = $db;
        $this->config       = $config;
        $this->adminAliases = array_map('strtolower', $config['admin']['aliases']);
        $this->initializeUsersTable();
    }

    private function initializeUsersTable() {
        $this->db->query("CREATE TABLE IF NOT EXISTS users (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            username   VARCHAR(50) UNIQUE NOT NULL,
            password   VARCHAR(255) NOT NULL,
            role       ENUM('user', 'admin') DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP NULL,
            is_active  BOOLEAN DEFAULT TRUE
        )");

        $this->ensureAdminUser();
    }

    // Garante que morgan (canonical) existe e é admin — cria ou corrige
    private function ensureAdminUser() {
        $canonical = $this->config['admin']['canonical_username']; // "morgan"
        $hash      = $this->config['admin']['password'];

        $existing = $this->db->select("users", ["LOWER(username) = ?"], [strtolower($canonical)]);

        if (empty($existing)) {
            $this->db->insert("users", [
                "username"  => strtolower($canonical),
                "password"  => $hash,
                "role"      => "admin",
                "is_active" => true
            ]);
        } else {
            $this->db->query(
                "UPDATE users SET role = 'admin', password = ?, is_active = 1 WHERE LOWER(username) = ?",
                [$hash, strtolower($canonical)]
            );
        }
    }

    // Resolve alias → canonical username (admin → morgan, Morgan → morgan, etc.)
    private function resolveUsername($input) {
        $lower = strtolower($input);
        if (in_array($lower, $this->adminAliases)) {
            return $this->config['admin']['canonical_username'];
        }
        return $input;
    }

    public function authenticate($username, $password) {
        $resolved = $this->resolveUsername($username);

        $users = $this->db->select(
            "users",
            ["LOWER(username) = ?", "is_active = ?"],
            [strtolower($resolved), true]
        );

        if (empty($users)) {
            return ["success" => false, "message" => "Usuário não encontrado"];
        }

        $user = $users[0];

        if (!password_verify($password, $user['password'])) {
            return ["success" => false, "message" => "Senha incorreta"];
        }

        $this->db->query("UPDATE users SET last_login = NOW() WHERE id = ?", [$user['id']]);

        return [
            "success" => true,
            "user"    => [
                "id"       => $user['id'],
                "username" => $user['username'],
                "role"     => $user['role']
            ],
            "message" => "Login realizado com sucesso"
        ];
    }

    public function isAdmin($userId = null) {
        if ($userId === null) return false;
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
// SISTEMA PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────

class ConsoleDatabasePHP {
    private $db;
    private $userManager;
    private $config;
    private $currentUser = null;

    public function __construct($config) {
        $this->config      = $config;
        $this->db          = new DatabaseConnection($config['database']);
        $this->userManager = new UserManager($this->db, $config);
        $this->initializeSession();
    }

    private function initializeSession() {
        if (session_status() == PHP_SESSION_NONE) session_start();
        if (isset($_SESSION['user_id'])) {
            $this->currentUser = $this->userManager->getUserById($_SESSION['user_id']);
        }
    }

    public function login($username, $password) {
        $result = $this->userManager->authenticate($username, $password);
        if ($result['success']) {
            $_SESSION['user_id'] = $result['user']['id'];
            $this->currentUser   = $result['user'];
        }
        return $result;
    }

    public function logout() {
        session_destroy();
        $this->currentUser = null;
        return ["success" => true, "message" => "Logout realizado"];
    }

    public function isLoggedIn() { return $this->currentUser !== null; }

    public function isAdmin() {
        return $this->currentUser && $this->userManager->isAdmin($this->currentUser['id']);
    }

    public function getCurrentUser() { return $this->currentUser; }

    public function getAllUsers() {
        if (!$this->isAdmin()) return ["error" => "Acesso negado - apenas admin"];
        return $this->userManager->getAllUsers();
    }

    // Returns users without requiring admin session (safe for loadphp)
    public function getAllUsersPublic() {
        return array_map(function($u) {
            unset($u['password']);
            return $u;
        }, $this->userManager->getAllUsers());
    }

    public function checkDatabaseHealth() {
        try {
            $this->db->query("SELECT 1");
            return ["status" => "healthy", "message" => "Database conectada"];
        } catch (Exception $e) {
            return ["status" => "error", "message" => "Erro na database: " . $e->getMessage()];
        }
    }

    public function monitorDatabase() {
        $health = $this->checkDatabaseHealth();
        if ($health['status'] !== 'healthy') return $health;

        $activeUsers  = $this->db->select("users", ["is_active = ?"], [true]);
        $recentLogins = $this->db->select("users", ["last_login > ?"], [date('Y-m-d H:i:s', strtotime('-1 hour'))]);

        return [
            "database_status" => "OK",
            "total_users"     => count($activeUsers),
            "recent_logins"   => count($recentLogins),
            "current_user"    => $this->currentUser ? $this->currentUser['username'] : "Nenhum",
            "admin_aliases"   => $this->config['admin']['aliases'],
            "timestamp"       => date('c')
        ];
    }

    public function exportData() {
        if (!$this->isAdmin()) return ["error" => "Acesso negado - apenas admin"];
        return [
            "users"       => $this->userManager->getAllUsers(),
            "config"      => $this->config,
            "exported_at" => date('c')
        ];
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// INICIALIZAÇÃO (COM FALLBACK OFFLINE)
// ──────────────────────────────────────────────────────────────────────────────

try {
    $consoleDB        = new ConsoleDatabasePHP($config);
    $databaseStatus   = $consoleDB->monitorDatabase();
    $systemInitialized = true;
} catch (Exception $e) {
    $consoleDB        = null;
    $databaseStatus   = [
        "database_status" => "OFFLINE",
        "error"           => "MySQL não disponível: " . $e->getMessage(),
        "total_users"     => 1,
        "recent_logins"   => 0,
        "current_user"    => "Nenhum",
        "admin_aliases"   => $config['admin']['aliases'],
        "timestamp"       => date('c')
    ];
    $systemInitialized = false;
}

// ──────────────────────────────────────────────────────────────────────────────
// DADOS EXPORTADOS
// ──────────────────────────────────────────────────────────────────────────────

// Quando MySQL está offline, usa dados estáticos do config
$offlineUsers = [
    [
        "id"         => 1,
        "username"   => $config['admin']['canonical_username'],
        "aliases"    => $config['admin']['aliases'],
        "password"   => "[PROTECTED]",
        "role"       => $config['admin']['role'],
        "created_at" => $config['exportedAt'],
        "is_active"  => true
    ]
];

$exportedData = [
    "users"           => $systemInitialized ? ($consoleDB ? $consoleDB->getAllUsersPublic() : $offlineUsers) : $offlineUsers,
    "config"          => array_merge($config, ["admin" => array_merge($config['admin'], ["password" => "[PROTECTED]"])]),
    "database_status" => $databaseStatus,
    "exported_at"     => date('c')
];

// ──────────────────────────────────────────────────────────────────────────────
// FUNÇÕES DE UTILITÁRIO
// ──────────────────────────────────────────────────────────────────────────────

function loadPHPData() {
    global $exportedData, $config, $databaseStatus;
    return [
        'data'      => [
            'users'       => $exportedData['users'],
            'exported_at' => $exportedData['exported_at']
        ],
        'config'    => $exportedData['config'],
        'status'    => $databaseStatus,
        'loaded_at' => date('c')
    ];
}

function getPHPUsers()  { global $exportedData; return $exportedData['users']; }
function getPHPConfig() { global $config;        return $config; }
function getPHPStatus() { global $databaseStatus; return $databaseStatus; }

// ──────────────────────────────────────────────────────────────────────────────
// API ENDPOINT
// ──────────────────────────────────────────────────────────────────────────────

if (isset($_GET['api']) || isset($_POST['api'])) {
    if (session_status() == PHP_SESSION_NONE) session_start();
    header('Content-Type: application/json');

    // Read action from query string, POST body, or JSON body
    $rawBody  = file_get_contents('php://input');
    $jsonBody = json_decode($rawBody, true);

    // Priority: query string > POST body > JSON body
    $action      = $_GET['action'] ?? $_POST['action'] ?? $jsonBody['action'] ?? null;
    $allActions  = array_merge($config['api']['public_actions'], $config['api']['protected_actions']);
    $isProtected = in_array($action, $config['api']['protected_actions']);
    $isLoggedIn  = isset($_SESSION['user_id'])
                   && $_SESSION['user_id'] !== null
                   && ($_SESSION['role'] ?? '') === 'admin';

    // No action provided — return available actions instead of an error
    if ($action === null || $action === '') {
        http_response_code(400);
        echo json_encode([
            'status'             => 'error',
            'message'            => 'No action specified',
            'public_actions'     => $config['api']['public_actions'],
            'protected_actions'  => array_map(fn($a) => $a . ' (auth required)', $config['api']['protected_actions']),
        ]);
        exit;
    }

    // Reject unknown action names
    if (!in_array($action, $allActions)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action', 'allowed' => $allActions]);
        exit;
    }

    // Reject unauthenticated access to protected actions (except login which is public)
    if ($isProtected && !$isLoggedIn && $action !== 'login') {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized', 'message' => 'Login required', 'requested_action' => $action]);
        exit;
    }

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

        case 'status':
        case 'health':
            echo json_encode(getPHPStatus());
            break;

        case 'login':
            // Read credentials from already-parsed JSON body or form fields
            if ($jsonBody && isset($jsonBody['username']) && isset($jsonBody['password'])) {
                $username = trim($jsonBody['username']);
                $password = trim($jsonBody['password']);
            } else {
                $username = trim($_POST['username'] ?? $_GET['username'] ?? '');
                $password = trim($_POST['password'] ?? $_GET['password'] ?? '');
            }

            // Validate inputs before touching the DB
            if ($username === '' || $password === '') {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Username and password are required']);
                break;
            }

            // Resolve aliases (admin → morgan, etc.)
            $adminAliases = array_map('strtolower', $config['admin']['aliases']);
            $resolved     = in_array(strtolower($username), $adminAliases)
                            ? $config['admin']['canonical_username']
                            : $username;

            // Try MySQL first, surface DB errors explicitly
            $authResult = null;
            $dbError    = null;
            if ($consoleDB) {
                try {
                    $authResult = $consoleDB->login($resolved, $password);
                } catch (Exception $e) {
                    $dbError = $e->getMessage();
                }
            }

            // Offline fallback: verify against the bcrypt hash in $config
            if (!$authResult || !$authResult['success']) {
                $isAlias = in_array(strtolower($username), $adminAliases);
                $hashOk  = password_verify($password, $config['admin']['password']);

                if ($isAlias && $hashOk) {
                    $_SESSION['user_id']  = 1;
                    $_SESSION['username'] = $config['admin']['canonical_username'];
                    $_SESSION['role']     = 'admin';
                    http_response_code(200);
                    echo json_encode([
                        'success'   => true,
                        'user'      => ['id' => 1, 'username' => $config['admin']['canonical_username'], 'role' => 'admin'],
                        'message'   => 'Login realizado (modo offline)',
                        'timestamp' => date('c')
                    ]);
                } else {
                    http_response_code(401);
                    $msg = $dbError ? "DB error: {$dbError}" : 'Credenciais inválidas';
                    echo json_encode(['success' => false, 'message' => $msg]);
                }
            } else {
                // MySQL auth succeeded — but only allow admin role through
                if (($authResult['user']['role'] ?? '') !== 'admin') {
                    session_destroy();
                    http_response_code(403);
                    echo json_encode(['success' => false, 'message' => 'Acesso negado: apenas administradores podem acessar a API']);
                    break;
                }
                http_response_code(200);
                echo json_encode(array_merge($authResult, ['timestamp' => date('c')]));
            }
            break;

        case 'logout':
            session_destroy();
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "Logout realizado"]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Unknown action: ' . $action]);
            break;
    }
    exit;
}

// ──────────────────────────────────────────────────────────────────────────────
// TESTE DIRETO (acessado via browser)
// ──────────────────────────────────────────────────────────────────────────────

if (basename(__FILE__) == basename($_SERVER['PHP_SELF'])) {
    echo "<h1>ConsoleDatabase PHP Export v{$config['version']}</h1>";
    echo "<p>Admin aliases aceitos: <strong>" . implode(', ', $config['admin']['aliases']) . "</strong></p>";

    echo "<h3>Status da Database</h3>";
    echo "<pre>" . json_encode($databaseStatus, JSON_PRETTY_PRINT) . "</pre>";

    if ($consoleDB) {
        echo "<h2>Teste de Login</h2>";

        // Testa login com "morgan"
        $r1 = $consoleDB->login("morgan", "12345678a");
        echo "<pre>login('morgan'): " . json_encode($r1, JSON_PRETTY_PRINT) . "</pre>";
        $consoleDB->logout();

        // Testa login com alias "admin"
        $r2 = $consoleDB->login("admin", "12345678a");
        echo "<pre>login('admin'): " . json_encode($r2, JSON_PRETTY_PRINT) . "</pre>";

        if ($consoleDB->isLoggedIn()) {
            echo "<p>✅ Logado como: <strong>" . $consoleDB->getCurrentUser()['username'] . "</strong></p>";
            echo "<p>✅ É admin: " . ($consoleDB->isAdmin() ? "Sim" : "Não") . "</p>";
        }

        $consoleDB->logout();
    }
}
?>
