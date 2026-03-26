#!/usr/bin/env node
/**
 * ConsoleDatabase - API Testing Guide
 * ════════════════════════════════════════════════════════════════
 *
 * Tests you can run to validate the PHP/JavaScript integration
 */

// ────────────────────────────────────────────────────────────────
// CURL Examples - Run from your terminal
// ────────────────────────────────────────────────────────────────

/**
 * TEST 1: Health Check
 * Checks if PHP server is running and database is accessible
 */
// curl -X GET "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=health"

/**
 * TEST 2: Login with Admin
 * Authenticates with admin credentials
 */
// curl -X POST "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=login" \
//   -H "Content-Type: application/json" \
//   -d '{"username":"admin","password":"12345678a"}' \
//   -c cookies.txt

/**
 * TEST 3: Login with Alias (morgan)
 * Tests that aliases work correctly
 */
// curl -X POST "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=login" \
//   -H "Content-Type: application/json" \
//   -d '{"username":"morgan","password":"12345678a"}' \
//   -c cookies.txt

/**
 * TEST 4: Login with Wrong Password
 * Should return 401 Unauthorized
 */
// curl -X POST "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=login" \
//   -H "Content-Type: application/json" \
//   -d '{"username":"admin","password":"wrongpassword"}' \
//   -b cookies.txt

/**
 * TEST 5: Get Health Status (after login)
 * Should work because we saved session cookies
 */
// curl -X GET "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=health" \
//   -b cookies.txt

/**
 * TEST 6: Logout
 * Destroys session
 */
// curl -X POST "http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=logout" \
//   -b cookies.txt

// ────────────────────────────────────────────────────────────────
// JavaScript Fetch Examples - Run in browser console
// ────────────────────────────────────────────────────────────────

/**
 * TEST 1: Health Check (JavaScript)
 */
// fetch('http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=health')
//   .then(r => r.json())
//   .then(data => console.log(JSON.stringify(data, null, 2)))

/**
 * TEST 2: Login (JavaScript)
 */
// fetch('http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=login', {
//   method: 'POST',
//   credentials: 'include',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({ username: 'admin', password: '12345678a' })
// })
//   .then(r => r.json())
//   .then(data => console.log(JSON.stringify(data, null, 2)))

/**
 * TEST 3: Access Protected Resource (after login)
 */
// fetch('http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=users', {
//   credentials: 'include'
// })
//   .then(r => r.json())
//   .then(data => console.log(JSON.stringify(data, null, 2)))

/**
 * TEST 4: Logout (JavaScript)
 */
// fetch('http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=logout', {
//   method: 'POST',
//   credentials: 'include'
// })
//   .then(r => r.json())
//   .then(data => console.log(JSON.stringify(data, null, 2)))

// ────────────────────────────────────────────────────────────────
// Terminal Console Commands - Run in web console
// ────────────────────────────────────────────────────────────────

/**
 * These commands run in the WebConsole Terminal UI
 * (Type them directly into the terminal)
 */

/*

COMMAND 1: Clear terminal
  clear

COMMAND 2: Show all available commands
  help

COMMAND 3: Login to local database
  login admin 12345678a

COMMAND 4: Check if logged in
  describe users

COMMAND 5: List all tables
  list

COMMAND 6: Login to PHP server
  loginphp admin 12345678a

COMMAND 7: Load data from PHP
  loadphp

COMMAND 8: Logout from local database
  logout

COMMAND 9: Change password
  changepw newpassword123

COMMAND 10: Show command history
  history

*/

// ────────────────────────────────────────────────────────────────
// Response Format Examples
// ────────────────────────────────────────────────────────────────

/**
 * LOGIN SUCCESS (200 OK)
 *
 * {
 *   "success": true,
 *   "user": {
 *     "id": 1,
 *     "username": "morgan",
 *     "role": "admin"
 *   },
 *   "message": "Login realizado (modo offline)",
 *   "timestamp": "2026-03-26T18:24:49.088Z"
 * }
 */

/**
 * LOGIN FAILURE (401 Unauthorized)
 *
 * {
 *   "success": false,
 *   "message": "Credenciais inválidas"
 * }
 */

/**
 * HEALTH CHECK (200 OK)
 *
 * {
 *   "database_status": "OK",
 *   "total_users": 1,
 *   "recent_logins": 0,
 *   "current_user": "morgan",
 *   "admin_aliases": ["morgan", "admin", "Morgan", "Admin", "MORGAN", "ADMIN"],
 *   "timestamp": "2026-03-26T18:24:49.088Z"
 * }
 */

/**
 * USERS LIST (200 OK - Auth Required)
 *
 * [
 *   {
 *     "id": 1,
 *     "username": "morgan",
 *     "role": "admin",
 *     "created_at": "2026-03-26T18:24:49.088Z",
 *     "is_active": true
 *   }
 * ]
 */

/**
 * MISSING CREDENTIALS (400 Bad Request)
 *
 * {
 *   "success": false,
 *   "message": "Username and password are required"
 * }
 */

// ────────────────────────────────────────────────────────────────
// Troubleshooting Checklist
// ────────────────────────────────────────────────────────────────

/*

✅ PHP Server Not Starting
  1. Check if port 8000 is already in use
  2. Try another port: php -S localhost:3000
  3. Make sure you're in the Terminal directory

✅ 401 Unauthorized on Login
  1. Make sure credentials are correct: admin / 12345678a
  2. Check that JSON is properly formatted
  3. Verify Content-Type header is "application/json"

✅ CORS Errors
  1. Make sure you're accessing from localhost
  2. Check that browser is making request with credentials: "include"
  3. Verify PHP CORS headers are being sent

✅ Session Not Persisting
  1. Make sure credentials: "include" is used in fetch
  2. Verify cookies are being sent in request headers
  3. Check that PHP session is actually created

✅ MySQL Connection Errors
  1. Check if MySQL is running
  2. Verify credentials in $config['database']
  3. System works offline if MySQL is down

✅ My Changes Aren't Showing
  1. Hard refresh: Ctrl+Shift+R or Cmd+Shift+R
  2. Clear browser cache
  3. Restart PHP server

*/

// ────────────────────────────────────────────────────────────────
// IP & Port Configuration
// ────────────────────────────────────────────────────────────────

/**
 * Development (localhost)
 * ├─ PHP: http://localhost:8000
 * ├─ Browser: http://localhost:8000/FRONTEND/terminal.html
 * └─ API: http://localhost:8000/BACKEND/DATABASE/database_export.php
 *
 * Allowed in CORS:
 * ├─ http://127.0.0.1:*
 * ├─ http://localhost:*
 * └─ All ports on localhost/127.0.0.1
 */

// ────────────────────────────────────────────────────────────────
// Security Credentials
// ────────────────────────────────────────────────────────────────

/**
 * DEFAULT ADMIN USER
 *
 * Username: admin (or morgan, Morgan, ADMIN, etc.)
 * Password: 12345678a
 * Role: admin
 *
 * IMPORTANT: Change in production!
 *
 * To change:
 * 1. Generate new bcrypt hash for password
 * 2. Update $config['admin']['password'] in database_export.php
 * 3. Run PHP test to verify
 */

// ────────────────────────────────────────────────────────────────
// Generated Hashes (for reference)
// ────────────────────────────────────────────────────────────────

/*
Password: 12345678a
bcrypt hash: $2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

To generate a new hash in PHP:
  php -r "echo password_hash('yourpassword', PASSWORD_BCRYPT);"
*/

// ────────────────────────────────────────────────────────────────
// Useful PHP Artisan Commands (if using Laravel)
// ────────────────────────────────────────────────────────────────

/*
# Start dev server
php -S localhost:8000

# Test with curl
curl http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=health

# Run test script
php BACKEND/DATABASE/test_login.php
*/

console.log("✅ ConsoleDatabase Integration - Ready for Testing!");
console.log("📖 See this file for examples: BACKEND/DATABASE/test_api.js");
