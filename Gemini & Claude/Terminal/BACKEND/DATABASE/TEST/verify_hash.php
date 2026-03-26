<?php
/**
 * Quick test to verify bcrypt hash
 */

$password_to_test = "12345678a";
$stored_hash = '$2y$10$fPL7rZ.P4/a/cXCsmVGlg.0giM0qyYsgjgB0slxq1xTkt1p8CmqOm';

echo "═══════════════════════════════════════\n";
echo "Bcrypt Hash Verification Test\n";
echo "═══════════════════════════════════════\n\n";

echo "Password to test: $password_to_test\n";
echo "Stored hash: $stored_hash\n\n";

$result = password_verify($password_to_test, $stored_hash);

echo "password_verify() result: " . ($result ? "TRUE ✅" : "FALSE ❌") . "\n\n";

if ($result) {
    echo "✅ HASH IS VALID - Password matches!\n";
} else {
    echo "❌ HASH IS INVALID - Password does NOT match!\n";
    echo "\nGenerating new hash for password '$password_to_test':\n";
    $new_hash = password_hash($password_to_test, PASSWORD_BCRYPT);
    echo "New hash: $new_hash\n";
    echo "\nUse this in database_export.php config:\n";
    echo "\"password\" => '$new_hash',\n";
}

// Test with PHP current method
echo "\n═══════════════════════════════════════\n";
echo "Creating test user with password\n";
echo "═══════════════════════════════════════\n\n";

$test_password = "testpass123";
$test_hash = password_hash($test_password, PASSWORD_BCRYPT);

echo "Password: $test_password\n";
echo "Hash: $test_hash\n";

$verify = password_verify($test_password, $test_hash);
echo "Verify result: " . ($verify ? "TRUE ✅" : "FALSE ❌") . "\n";

// Also test incorrect password
$wrong_password = "wrongpass";
$verify_wrong = password_verify($wrong_password, $test_hash);
echo "Verify with wrong password: " . ($verify_wrong ? "TRUE ✅" : "FALSE ❌") . "\n";
?>
