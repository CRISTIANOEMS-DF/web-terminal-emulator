<?php
/**
 * Test Script for ConsoleDatabase PHP API
 * Usage: php test_login.php
 */

echo "═══════════════════════════════════════════════════════════\n";
echo "ConsoleDatabase API Test Script\n";
echo "═══════════════════════════════════════════════════════════\n\n";

$baseUrl = "http://localhost:8000/BACKEND/DATABASE/database_export.php";

// Test 1: Check if API is accessible
echo "[1] Testing if API is accessible...\n";
$response = @file_get_contents("$baseUrl?api=1");
if ($response === false) {
    echo "❌ ERROR: Cannot reach PHP API\n";
    echo "Make sure PHP is running: php -S localhost:8000\n";
    exit(1);
}
echo "✅ API is accessible\n\n";

// Test 2: Health check
echo "[2] Testing health endpoint...\n";
$response = json_decode(file_get_contents("$baseUrl?api=1&action=health"), true);
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n\n";

// Test 3: Login with valid credentials
echo "[3] Testing login with valid credentials (admin / 12345678a)...\n";
$data = json_encode(['username' => 'admin', 'password' => '12345678a']);
$context = stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\nContent-Length: " . strlen($data),
        'content' => $data
    ]
]);
$response = json_decode(file_get_contents("$baseUrl?api=1&action=login", false, $context), true);
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
if ($response['success']) {
    echo "✅ Login successful!\n";
} else {
    echo "❌ Login failed: " . $response['message'] . "\n";
}
echo "\n";

// Test 4: Login with invalid credentials
echo "[4] Testing login with invalid credentials (admin / wrongpassword)...\n";
$data = json_encode(['username' => 'admin', 'password' => 'wrongpassword']);
$context = stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\nContent-Length: " . strlen($data),
        'content' => $data
    ]
]);
$response = json_decode(file_get_contents("$baseUrl?api=1&action=login", false, $context), true);
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
if (!$response['success']) {
    echo "✅ Correctly rejected invalid credentials\n";
} else {
    echo "❌ Security issue: Invalid credentials were accepted!\n";
}
echo "\n";

// Test 5: Test with alias (morgan)
echo "[5] Testing login with alias (morgan / 12345678a)...\n";
$data = json_encode(['username' => 'morgan', 'password' => '12345678a']);
$context = stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\nContent-Length: " . strlen($data),
        'content' => $data
    ]
]);
$response = json_decode(file_get_contents("$baseUrl?api=1&action=login", false, $context), true);
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
if ($response['success']) {
    echo "✅ Alias login successful!\n";
} else {
    echo "❌ Alias login failed\n";
}
echo "\n";

echo "═══════════════════════════════════════════════════════════\n";
echo "✅ All tests completed!\n";
echo "═══════════════════════════════════════════════════════════\n";
?>
