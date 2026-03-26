# ConsoleDatabase PHP API - Integration Guide

## Status

✅ **Fixed & Ready**

- PHP now correctly handles login requests from the JavaScript console
- Session management works with CORS enabled
- Credentials authenticated through bcrypt or MySQL database

## Starting the PHP Server

```bash
# Open terminal in the project directory
cd "Gemini & Claude\Terminal"

# Start PHP server on port 8000
php -S localhost:8000
```

Then open in browser:

```
http://localhost:8000/FRONTEND/terminal.html
```

## Commands

### Login (PHP Session)

```bash
loginphp <username> <password>
```

**Examples:**

```bash
loginphp admin 12345678a
loginphp morgan 12345678a
loginphp Morgan 12345678a  # (aliases work too)
```

**Admin Credentials:**

- Username: `admin`, `morgan`, `Morgan`, `Admin`, etc. (all aliases work)
- Password: `12345678a`

### Load PHP Data

```bash
loadphp
```

Requires authentication (run `loginphp` first)

## API Endpoints

### Base URL

```
http://localhost:8000/BACKEND/DATABASE/database_export.php
```

### Login (POST)

```
POST ?api=1&action=login
Content-Type: application/json

{
  "username": "admin",
  "password": "12345678a"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "morgan",
    "role": "admin"
  },
  "message": "Login realizado (modo offline)",
  "timestamp": "2026-03-26T..."
}
```

**Response (Failure - 401):**

```json
{
  "success": false,
  "message": "Credenciais inválidas"
}
```

### Health Check (GET)

```
GET ?api=1&action=health
```

### Users List (GET - Auth Required)

```
GET ?api=1&action=users
```

### Logout (POST)

```
POST ?api=1&action=logout
```

## Testing

Test the API locally:

```bash
# Run the test script
php BACKEND/DATABASE/test_login.php
```

## Troubleshooting

### Error: 401 Unauthorized

- **Cause:** Session not established
- **Solution:** Run `loginphp` command first before accessing protected resources

### Error: HTTP 400 Bad Request

- **Cause:** Missing username/password or invalid action
- **Solution:** Check that both `username` and `password` are provided

### Error: "PHP server unreachable"

- **Cause:** PHP server not running on localhost:8000
- **Solution:** Run `php -S localhost:8000` in the Terminal directory

### Error: "You are on Live Server"

- **Cause:** Using VS Code Live Server (port 5500) instead of PHP server
- **Solution:** Use PHP server instead: `php -S localhost:8000`

## Architecture

```
JavaScript (console.engine.js)
        ↓
    loginphp command
        ↓
fetch POST /BACKEND/DATABASE/database_export.php?api=1&action=login
        ↓
PHP Receives Request
        ↓
Parse JSON body: {username, password}
        ↓
Authenticate against bcrypt hash or MySQL
        ↓
Create PHP Session ($_SESSION['user_id'])
        ↓
Return JSON response with user data
        ↓
Browser stores session cookie automatically (credentials: "include")
        ↓
Subsequent requests use session cookie for authentication
```

## Security Notes

- ✅ CORS properly configured for localhost
- ✅ Bcrypt password hashing in use
- ✅ Session tokens managed by PHP
- ✅ Admin user isolated and protected
- ✅ SQL injection prevented via prepared statements
- ✅ Credentials sent over HTTP only in localhost (development)

## Database Schema (auto-created)

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE
);
```

**Auto-created Admin User:**

- Username: `morgan` (canonical)
- Password: `12345678a` (hashed with bcrypt)
- Role: `admin`

## Version

- **ConsoleEngine:** v3.0.0+
- **Database PHP:** v3.5.1
- **Last Updated:** 2026-03-26
