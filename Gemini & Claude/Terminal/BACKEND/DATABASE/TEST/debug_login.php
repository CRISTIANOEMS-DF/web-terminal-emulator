<?php
/**
 * Complete Login Debug Test
 * Simulates the exact flow the JavaScript uses
 */

echo "═══════════════════════════════════════════════════════════════\n";
echo "ConsoleDatabase PHP Login Debug Test\n";
echo "═══════════════════════════════════════════════════════════════\n\n";

// Load the config from database_export.php
$config = array(
    "version"    => "3.5.1",
    "admin" => array(
        "canonical_username" => "morgan",
        "aliases"            => ["morgan", "admin", "Morgan", "Admin", "MORGAN", "ADMIN"],
        "password"           => '$2y$10$fPL7rZ.P4/a/cXCsmVGlg.0giM0qyYsgjgB0slxq1xTkt1p8CmqOm',
        "role"               => "admin"
    ),
    "api" => array(
        "public_actions"    => ["login", "health"],
        "protected_actions" => ["load", "users", "config", "status", "logout"],
    )
);

// Test 1: Verify hash
echo "[1] Testing bcrypt hash verification\n";
echo "───────────────────────────────────────────────────────────────\n";
$test_password = "12345678a";
$stored_hash = $config['admin']['password'];
$hash_verify = password_verify($test_password, $stored_hash);
echo "Password: $test_password\n";
echo "Hash: $stored_hash\n";
echo "password_verify result: " . ($hash_verify ? "✅ TRUE" : "❌ FALSE") . "\n\n";

if (!$hash_verify) {
    echo "❌ ERROR: Hash verification failed!\n";
    echo "Generating new hash for password '$test_password':\n";
    $new_hash = password_hash($test_password, PASSWORD_BCRYPT);
    echo "New hash: $new_hash\n";
    echo "\nYou must update database_export.php:\n";
    echo "Replace:\n";
    echo "  \"password\" => '$stored_hash',\n";
    echo "With:\n";
    echo "  \"password\" => '$new_hash',\n\n";
}

// Test 2: Check aliases
echo "[2] Testing alias resolution\n";
echo "───────────────────────────────────────────────────────────────\n";
$test_usernames = ["admin", "morgan", "Morgan", "ADMIN"];
$adminAliases = array_map('strtolower', $config['admin']['aliases']);

foreach ($test_usernames as $username) {
    $isAlias = in_array(strtolower($username), $adminAliases);
    $resolved = $isAlias ? $config['admin']['canonical_username'] : $username;
    echo "Input: '$username' → Resolved: '$resolved' (" . ($isAlias ? "✅ alias" : "❌ not alias") . ")\n";
}
echo "\n";

// Test 3: Simulate exact JavaScript payload
echo "[3] Simulating JavaScript fetch payload\n";
echo "───────────────────────────────────────────────────────────────\n";
$json_body = '{"username":"admin","password":"12345678a"}';
echo "JSON payload: $json_body\n";
$parsed = json_decode($json_body, true);
echo "Parsed:\n";
echo "  username: " . ($parsed['username'] ?? 'MISSING') . "\n";
echo "  password: " . ($parsed['password'] ?? 'MISSING') . "\n\n";

// Test 4: Simulate login process
echo "[4] Simulating login process\n";
echo "───────────────────────────────────────────────────────────────\n";
$username = $parsed['username'];
$password = $parsed['password'];
echo "Step 1: Input validation\n";
echo "  username is empty? " . ($username === '' ? "YES ❌" : "NO ✅") . "\n";
echo "  password is empty? " . ($password === '' ? "YES ❌" : "NO ✅") . "\n\n";

if ($username !== '' && $password !== '') {
    echo "Step 2: Alias resolution\n";
    $adminAliases = array_map('strtolower', $config['admin']['aliases']);
    $resolved = in_array(strtolower($username), $adminAliases) ? $config['admin']['canonical_username'] : $username;
    echo "  Resolved '$username' → '$resolved'\n\n";

    echo "Step 3: Verify credentials\n";
    $isAlias = in_array(strtolower($username), $adminAliases);
    $hashOk = password_verify($password, $config['admin']['password']);
    echo "  Is alias? " . ($isAlias ? "YES ✅" : "NO ❌") . "\n";
    echo "  Hash OK? " . ($hashOk ? "YES ✅" : "NO ❌") . "\n\n";

    if ($isAlias && $hashOk) {
        echo "✅ LOGIN SUCCESS\n";
        echo "   Status: 200 OK\n";
        echo "   Response:\n";
        $response = [
            'success' => true,
            'user' => ['id' => 1, 'username' => $config['admin']['canonical_username'], 'role' => 'admin'],
            'message' => 'Login realizado (modo offline)',
            'timestamp' => date('c')
        ];
        echo "   " . json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
    } else {
        echo "❌ LOGIN FAILED\n";
        echo "   Status: 401 Unauthorized\n";
        echo "   Reason: " . (!$isAlias ? "Username is not admin alias" : "Password hash mismatch") . "\n";
        echo "   Response:\n";
        $response = [
            'success' => false,
            'message' => 'Credenciais inválidas'
        ];
        echo "   " . json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
    }
}

// Test 5: Test with actual PHP fetch simulation
echo "\n";
echo "[5] Simulating actual PHP request handling\n";
echo "───────────────────────────────────────────────────────────────\n";
echo "Request URL: http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=login\n";
echo "Request method: POST\n";
echo "Request headers: Content-Type: application/json\n";
echo "Request body: $json_body\n\n";

// Simulate request processing
$_GET['api'] = '1';
$_GET['action'] = 'login';
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SESSION = []; // Empty session (not logged in)

$rawBody = $json_body;
$jsonBody = json_decode($rawBody, true);
$action = $_GET['action'];

echo "Processing in PHP:\n";
echo "  \$_GET['api'] = " . var_export($_GET['api'] ?? null, true) . "\n";
echo "  \$_GET['action'] = " . var_export($action, true) . "\n";
echo "  \$jsonBody = " . json_encode($jsonBody) . "\n\n";

if ($jsonBody && isset($jsonBody['username']) && isset($jsonBody['password'])) {
    $username = trim($jsonBody['username']);
    $password = trim($jsonBody['password']);
    echo "✅ Successfully parsed username and password from JSON\n";
} else {
    echo "❌ Failed to parse JSON\n";
}

echo "\n";
echo "═══════════════════════════════════════════════════════════════\n";
echo "Test Complete\n";
echo "═══════════════════════════════════════════════════════════════\n";
?>
