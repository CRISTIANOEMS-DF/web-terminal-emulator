# 🌐 Console Bridge HTTP/REST API - Complete Integration Guide

## 📋 Overview

**console.bridge.js v1.0.0** is the HTTP/REST API gateway that links all console modules with external applications, websites, and services via a robust REST API.

**Status**: ✅ Production Ready
**Lines**: 1100+
**Port**: Auto-assign (port 0) or custom
**Authentication**: API Key + Token
**Rate Limiting**: 100 req/min per client

---

## 🔧 Core Components

### 1. Logger System
```javascript
// Debug output with history tracking
window.ConsoleBridge._logger.log('Message', data);
window.ConsoleBridge._logger.getLogs('ERROR');
window.ConsoleBridge._logger.clearLogs();
```

### 2. Validator
```javascript
// Comprehensive input validation
_Validator.validateURL(url);
_Validator.validatePort(port);
_Validator.validateCommand(cmd);
_Validator.validateSiteKey(key);
_Validator.validateAPIKey(apiKey);
_Validator.sanitizeInput(input);
```

### 3. Rate Limiter
```javascript
// Track requests per client
const allowed = rateLimiter.identify(clientId);
const remaining = rateLimiter.getRemainingRequests(clientId);
const resetTime = rateLimiter.getResetTime(clientId);
rateLimiter.getStats();
```

### 4. Authentication Manager
```javascript
// Site registration & token management
const registered = authManager.registerSite('mysite', config);
const token = authManager.generateToken('mysite');
const verified = authManager.verifyToken(token);
const siteInfo = authManager.getSiteInfo('mysite');
```

### 5. Cache Manager
```javascript
// Response caching
cacheManager.set(key, value, ttl);
const cached = cacheManager.get(key);
cacheManager.getStats();
```

---

## 🛣️ Routes

### Health & System

#### GET /api/health
```javascript
// Check server health
const response = await fetch('http://localhost:3000/api/health');
// Returns: { status: 'ok', timestamp, uptime, modules }
```

#### GET /api/info
```javascript
// Get server info
const response = await fetch('http://localhost:3000/api/info');
// Returns: { name, version, port, uptime }
```

### Commands

#### POST /api/command/execute
```javascript
// Execute command
const response = await fetch('http://localhost:3000/api/command/execute', {
  method: 'POST',
  headers: { 'X-API-Token': token },
  body: JSON.stringify({ command: 'help' })
});
// Returns: { success, result }
```

### Database

#### POST /api/database/query
```javascript
// Execute database query
const response = await fetch('http://localhost:3000/api/database/query', {
  method: 'POST',
  headers: { 'X-API-Token': token },
  body: JSON.stringify({ query: 'SELECT * FROM users' })
});
// Returns: { success, result }
```

### Settings

#### GET /api/settings
```javascript
// Get all settings
const response = await fetch('http://localhost:3000/api/settings', {
  headers: { 'X-API-Token': token }
});
// Returns: { success, settings }
```

#### PUT /api/settings
```javascript
// Update setting
const response = await fetch('http://localhost:3000/api/settings', {
  method: 'PUT',
  headers: { 'X-API-Token': token },
  body: JSON.stringify({ path: 'display.fontSize', value: 18 })
});
// Returns: { success, message }
```

### Modules

#### GET /api/modules
```javascript
// Get linked modules
const response = await fetch('http://localhost:3000/api/modules', {
  headers: { 'X-API-Token': token }
});
// Returns: { modules, total, linked }
```

### Authentication

#### POST /api/auth/register-site
```javascript
// Register a new site/app
const response = await fetch('http://localhost:3000/api/auth/register-site', {
  method: 'POST',
  body: JSON.stringify({
    siteKey: 'myapp',
    name: 'My Application',
    url: 'https://myapp.com',
    permissions: ['read', 'execute']
  })
});
// Returns: { success, apiKey, secret }
```

#### POST /api/auth/token
```javascript
// Get authentication token
const response = await fetch('http://localhost:3000/api/auth/token', {
  method: 'POST',
  body: JSON.stringify({ apiKey: 'api_...' })
});
// Returns: { success, token, expiresAt, expiresIn }
```

### Monitoring

#### GET /api/monitoring/logs
```javascript
// Get server logs
const response = await fetch('http://localhost:3000/api/monitoring/logs?level=ERROR', {
  headers: { 'X-API-Token': token }
});
// Returns: { logs, total }
```

#### GET /api/monitoring/stats
```javascript
// Get server statistics
const response = await fetch('http://localhost:3000/api/monitoring/stats', {
  headers: { 'X-API-Token': token }
});
// Returns: { rateLimiter, cache, authentication, routes, modules }
```

---

## 🔐 Authentication

### API Key Method
```javascript
// Include API key in header
fetch(url, {
  headers: {
    'X-API-Key': 'api_xxxxx'
  }
});
```

### Token Method
```javascript
// Include token in header
fetch(url, {
  headers: {
    'X-API-Token': 'tok_xxxxx'
  }
});
```

### Site Registration
```javascript
// 1. Register site
const registered = await fetch('/api/auth/register-site', {
  method: 'POST',
  body: JSON.stringify({
    siteKey: 'mysite',
    name: 'My Website',
    url: 'https://mysite.com'
  })
});

// 2. Get token
const tokenResponse = await fetch('/api/auth/token', {
  method: 'POST',
  body: JSON.stringify({
    apiKey: registered.apiKey
  })
});

// 3. Use token
const data = await fetch('/api/settings', {
  headers: {
    'X-API-Token': tokenResponse.token
  }
});
```

---

## 📊 Request/Response Format

### Request
```javascript
{
  "method": "POST",
  "path": "/api/command/execute",
  "headers": {
    "X-API-Token": "tok_...",
    "Content-Type": "application/json"
  },
  "body": {
    "command": "help",
    "args": []
  }
}
```

### Response
```javascript
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "X-RateLimit-Remaining": 99
  },
  "body": {
    "success": true,
    "result": "...",
    "timestamp": 1234567890
  }
}
```

### Error Response
```javascript
{
  "statusCode": 400,
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "error": "Bad Request",
    "message": "Command required"
  }
}
```

---

## 🛡️ Rate Limiting

### Limits
- **Default**: 100 requests per 60 seconds
- **Per Client**: Tracked by API key or IP
- **Headers**: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Rate Limit Response
```javascript
{
  "statusCode": 429,
  "headers": {
    "X-RateLimit-Remaining": 0,
    "X-RateLimit-Reset": "2026-03-25T15:30:00Z"
  },
  "body": {
    "error": "Too Many Requests",
    "retryAfter": 12
  }
}
```

---

## 🔗 Module Linking

### Link Modules
```javascript
window.ConsoleBridge.linkModules({
  ConsoleSettings: window.ConsoleSettings,
  ConsoleRenderer: window.ConsoleRenderer,
  ConsoleDatabase: window.ConsoleDatabase,
  ConsoleRegistry: window.ConsoleRegistry,
  ConsoleCommands: window.ConsoleCommands,
  ConsoleKeyboard: window.ConsoleKeyboard,
  ConsoleTable: window.ConsoleTable,
  ConsoleBuiltins: window.ConsoleBuiltins,
  ConsoleEngine: window.ConsoleEngine
});
```

### Verify Linking
```javascript
const info = window.ConsoleBridge.getServerInfo();
console.log(info.modules); // List of linked modules

const linked = window.ConsoleBridge.areAllModulesLinked();
console.log(linked); // true/false
```

---

## 🛣️ Custom Routes

### Register Route
```javascript
// GET route
window.ConsoleBridge.get('/custom/endpoint', (req, res) => {
  return {
    message: 'Custom response',
    timestamp: Date.now()
  };
});

// POST route
window.ConsoleBridge.post('/custom/endpoint', (req, res) => {
  const { data } = req.body;
  return {
    received: data,
    processed: true
  };
});

// PUT route
window.ConsoleBridge.put('/custom/endpoint/:id', (req, res) => {
  const { id } = req.params;
  return { updated: id };
});

// DELETE route
window.ConsoleBridge.delete('/custom/endpoint/:id', (req, res) => {
  const { id } = req.params;
  return { deleted: id };
});
```

---

## 🔌 Middleware

### Use Middleware
```javascript
// Authentication
window.ConsoleBridge.use(window.ConsoleBridge.authMiddleware);

// CORS
window.ConsoleBridge.use(window.ConsoleBridge.corsMiddleware);

// Rate Limiting
window.ConsoleBridge.use(window.ConsoleBridge.rateLimitMiddleware);

// Logging
window.ConsoleBridge.use(window.ConsoleBridge.loggingMiddleware);

// Custom middleware
window.ConsoleBridge.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

---

## 💻 Server Control

### Start/Stop
```javascript
// Start server
window.ConsoleBridge.start();
// Returns: true

// Check if running
console.log(window.ConsoleBridge.isRunning); // true

// Stop server
window.ConsoleBridge.stop();
// Returns: true
```

### Get Server Info
```javascript
const info = window.ConsoleBridge.getServerInfo();
// {
//   running: true,
//   port: 3456,
//   host: 'localhost',
//   url: 'http://localhost:3456',
//   routes: 15,
//   modules: ['ConsoleSettings', ...]
// }
```

---

## 📈 CORS Configuration

### Enable CORS
```javascript
window.ConsoleBridge.config.corsEnabled = true;
window.ConsoleBridge.config.corsOrigins = [
  'https://myapp.com',
  'https://anotherapp.com'
];
```

### Allow All Origins
```javascript
window.ConsoleBridge.config.corsOrigins = ['*'];
```

---

## 📊 Statistics & Monitoring

### Get Statistics
```javascript
const stats = window.ConsoleBridge.getStats();
// {
//   server: {...},
//   authentication: {...},
//   cache: {...},
//   rateLimiter: {...},
//   logs: {...}
// }
```

### Get Debug Info
```javascript
const debug = window.ConsoleBridge.debugInfo();
// {
//   name: 'ConsoleBridge',
//   version: '1.0.0',
//   running: true,
//   port: 3456,
//   routes: 15,
//   modules: [...]
// }
```

### Clear Caches
```javascript
window.ConsoleBridge.clearCaches();
```

---

## 🔍 Error Handling

### Common Error Codes

| Code | Error | Meaning |
|------|-------|---------|
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Invalid credentials |
| 404 | Not Found | Route not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Server error |
| 503 | Unavailable | Module not available |

### Error Handling
```javascript
fetch('/api/command/execute', {
  method: 'POST',
  headers: { 'X-API-Token': token },
  body: JSON.stringify({ command: 'invalid' })
})
.then(res => {
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
})
.catch(error => {
  console.error('Request failed:', error);
});
```

---

## 🚀 Complete Integration Example

```javascript
// 1. Initialize Bridge
window.ConsoleBridge.linkModules({
  ConsoleSettings: window.ConsoleSettings,
  ConsoleDatabase: window.ConsoleDatabase,
  ConsoleRegistry: window.ConsoleRegistry
});

// 2. Register your site
const registered = window.ConsoleBridge._authManager.registerSite('myapp', {
  name: 'My Application',
  url: 'https://myapp.com',
  permissions: ['read', 'execute']
});

// 3. Generate token
const token = window.ConsoleBridge._authManager.generateToken('myapp');

// 4. Start server
window.ConsoleBridge.start();
console.log('Server running at:', window.ConsoleBridge.getServerInfo().url);

// 5. Make API requests
const response = await fetch('http://localhost:3000/api/command/execute', {
  method: 'POST',
  headers: {
    'X-API-Token': token.token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ command: 'help' })
});

const result = await response.json();
console.log('Command result:', result);
```

---

## 📞 API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Check health |
| `/api/info` | GET | Get server info |
| `/api/command/execute` | POST | Execute command |
| `/api/database/query` | POST | Run database query |
| `/api/settings` | GET | Get all settings |
| `/api/settings` | PUT | Update setting |
| `/api/modules` | GET | List modules |
| `/api/auth/register-site` | POST | Register site |
| `/api/auth/token` | POST | Get token |
| `/api/monitoring/logs` | GET | Get logs |
| `/api/monitoring/stats` | GET | Get statistics |

---

**Version**: 1.0.0
**Status**: Production Ready ✅
**Authentication**: Required
**Rate Limit**: 100 req/min
**CORS**: Configurable
