# 🔌 Console WebSocket - Real-time Communication Layer

## 📋 Overview

**console.websocket.js v1.0.0** provides bidirectional WebSocket communication for real-time terminal updates, command execution, and event broadcasting.

**Status**: ✅ Production Ready
**Lines**: 1100+
**Protocol**: WebSocket (RFC 6455)
**Message Format**: JSON
**Channels**: Unlimited pub/sub
**Heartbeat**: Every 30 seconds

---

## 🔧 Core Components

### 1. Logger System
```javascript
// Event logging with history
window.ConsoleWebSocket._logger.log('Message', data);
window.ConsoleWebSocket.getLogs('ERROR');
window.ConsoleWebSocket.clearLogs();
```

### 2. Message Queue
```javascript
// Reliable message delivery
queue.enqueue(message);
queue.dequeue();
queue.getStats();
// { size: 5, maxSize: 1000, pending: 5, oldest: ... }
```

### 3. Channel Manager
```javascript
// Pub/Sub channel system
channelManager.subscribe(channelName, clientId, callback);
channelManager.broadcast(channelName, message);
channelManager.getAllChannels();
channelManager.getStats();
```

### 4. Connection Manager
```javascript
// Individual connection management
connection.open();
connection.send(message);
connection.getStats();
connection.close();
```

---

## 🔌 Connection Management

### Add Connection
```javascript
// Create new WebSocket connection
const ws = new WebSocket('ws://localhost:8000');

ws.onopen = () => {
  const connection = window.ConsoleWebSocket.addConnection(ws, 'client-1');
  console.log('Connected:', connection.id);
};

ws.onmessage = (event) => {
  window.ConsoleWebSocket.handleMessage('client-1', event.data);
};

ws.onclose = () => {
  window.ConsoleWebSocket.removeConnection('client-1');
};
```

### Get Connection Info
```javascript
const connection = window.ConsoleWebSocket.getConnection('client-1');
console.log(connection.getStats());
// {
//   id: 'client-1',
//   state: 'open',
//   uptime: 5000,
//   messageCount: 10,
//   bytesSent: 1024,
//   bytesReceived: 2048,
//   channels: ['updates', 'commands']
// }
```

### Get All Connections
```javascript
const connections = window.ConsoleWebSocket.getAllConnections();
console.log(`Connected clients: ${connections.length}`);
```

### Broadcast to All
```javascript
const result = window.ConsoleWebSocket.broadcastAll({
  type: 'system_update',
  message: 'Server maintenance starting'
});
console.log(`Broadcasted to ${result.broadcasted} clients`);
```

---

## 📡 Pub/Sub Channel System

### Subscribe to Channel
```javascript
const result = window.ConsoleWebSocket.subscribe('updates', 'client-1', (message) => {
  console.log('Channel message:', message);
});
// { success: true, channel: 'updates', subscribers: 3 }
```

### Publish to Channel
```javascript
const result = window.ConsoleWebSocket.publish('updates', {
  type: 'data_update',
  data: { users: 100, active: 45 }
});
// { channel: 'updates', broadcasted: 3, subscribers: ['client-1', 'client-2', ...] }
```

### Unsubscribe from Channel
```javascript
window.ConsoleWebSocket.unsubscribe('updates', 'client-1');
```

### Channel Information
```javascript
// Get channel info
const channelInfo = window.ConsoleWebSocket.getChannelInfo('updates');
// { name: 'updates', subscribers: ['client-1', 'client-2'], count: 2 }

// Get all channels
const allChannels = window.ConsoleWebSocket.getAllChannels();
// [{ name: 'updates', subscribers: [...], count: 2 }, ...]
```

---

## 💭 Message Types

### Ping/Pong (Heartbeat)
```javascript
// Server sends ping
{ type: 'ping', timestamp: 1234567890 }

// Client responds with pong
{ type: 'pong', timestamp: 1234567890 }
```

### Command Execution
```javascript
// Client sends command
{
  type: 'command',
  command: 'help',
  payload: { args: [] },
  id: 'msg-1'
}

// Server responds
{
  type: 'command_result',
  id: 'msg-1',
  command: 'help',
  result: '...',
  success: true,
  timestamp: 1234567890
}

// On error
{
  type: 'command_error',
  id: 'msg-1',
  error: 'Command not found',
  command: 'help'
}
```

### Database Query
```javascript
// Client sends query
{
  type: 'query',
  command: 'SELECT * FROM users',
  payload: {},
  id: 'msg-2'
}

// Server responds
{
  type: 'query_result',
  id: 'msg-2',
  query: 'SELECT * FROM users',
  result: [...],
  success: true,
  rowCount: 10,
  timestamp: 1234567890
}

// On error
{
  type: 'query_error',
  id: 'msg-2',
  error: 'Invalid query',
  query: 'SELECT * FROM users'
}
```

### Channel Messages
```javascript
// Subscribe
{
  type: 'subscribe',
  payload: { channel: 'updates' }
}

// Unsubscribe
{
  type: 'unsubscribe',
  payload: { channel: 'updates' }
}

// Receive channel message
{
  type: 'channel_message',
  channel: 'updates',
  data: { ... },
  sender: 'client-2'
}
```

---

## 🔗 Module Linking

### Link Modules
```javascript
window.ConsoleWebSocket.linkModules({
  ConsoleSettings: window.ConsoleSettings,
  ConsoleRenderer: window.ConsoleRenderer,
  ConsoleDatabase: window.ConsoleDatabase,
  ConsoleRegistry: window.ConsoleRegistry,
  ConsoleCommands: window.ConsoleCommands,
  ConsoleBridge: window.ConsoleBridge
});
```

### Get Linked Module
```javascript
const registry = window.ConsoleWebSocket.getModule('ConsoleRegistry');
if (registry) {
  registry.execute('help');
}
```

---

## 💻 Server Control

### Start/Stop
```javascript
// Start WebSocket server
window.ConsoleWebSocket.start();
console.log('WebSocket server started');

// Check if running
console.log(window.ConsoleWebSocket.isRunning); // true

// Stop server
window.ConsoleWebSocket.stop();
console.log('WebSocket server stopped');
```

### Get Server Info
```javascript
const info = window.ConsoleWebSocket.getServerInfo();
// {
//   running: true,
//   port: 8000,
//   host: 'localhost',
//   url: 'ws://localhost:8000',
//   connections: 3,
//   channels: 5
// }
```

---

## 💗 Heartbeat & Health

### Health Check
```javascript
const health = window.ConsoleWebSocket.getHealth();
// {
//   status: 'healthy',
//   connections: { total: 5, healthy: 5, dead: 0 },
//   channels: 3,
//   uptime: 12345
// }
```

### Manual Heartbeat
```javascript
// Heartbeat happens automatically every 30 seconds
// You can trigger it manually:
window.ConsoleWebSocket._performHeartbeat();
```

### Connection Timeout
```javascript
// Connections timeout after 120 seconds without heartbeat
// They are automatically removed and connection:closed event fired
```

---

## 📊 Statistics & Monitoring

### Get Statistics
```javascript
const stats = window.ConsoleWebSocket.getStats();
// {
//   server: {...},
//   health: {...},
//   connections: [...],
//   channels: {...},
//   totalMessages: 100,
//   totalBytes: { sent: 10240, received: 20480 }
// }
```

### Get Debug Info
```javascript
const debug = window.ConsoleWebSocket.debugInfo();
// {
//   name: 'ConsoleWebSocket',
//   version: '1.0.0',
//   running: true,
//   port: 8000,
//   modules: 6,
//   connections: 5,
//   channels: 3,
//   logs: 50
// }
```

### Get Logs
```javascript
// Get all logs
const allLogs = window.ConsoleWebSocket.getLogs();

// Get error logs only
const errorLogs = window.ConsoleWebSocket.getLogs('ERROR');

// Clear logs
window.ConsoleWebSocket.clearLogs();
```

---

## 🎯 Event System

### Events
```javascript
// Connection opened
window.ConsoleWebSocket.on('connection:opened', (data) => {
  console.log(`Client connected: ${data.id}`);
});

// Connection closed
window.ConsoleWebSocket.on('connection:closed', (data) => {
  console.log(`Client disconnected: ${data.id}`);
});

// WebSocket server started
window.ConsoleWebSocket.on('websocket:started', (data) => {
  console.log(`Server started on port ${data.port}`);
});

// WebSocket server stopped
window.ConsoleWebSocket.on('websocket:stopped', () => {
  console.log('Server stopped');
});
```

### Listen for Events
```javascript
window.ConsoleWebSocket.on('connection:opened', handler);
```

### Stop Listening
```javascript
window.ConsoleWebSocket.off('connection:opened', handler);
```

---

## 🔌 Complete Client Example

```javascript
// 1. Create WebSocket connection
const ws = new WebSocket('ws://localhost:8000');

// 2. Handle connection
ws.onopen = () => {
  console.log('Connected to server');

  // Register with server
  const connection = window.ConsoleWebSocket.addConnection(
    ws,
    'my-app-client'
  );

  // Subscribe to channel
  window.ConsoleWebSocket.subscribe('updates', 'my-app-client');

  // Send command
  ws.send(JSON.stringify({
    type: 'command',
    command: 'help',
    id: 'msg-1'
  }));
};

// 3. Handle incoming messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'command_result') {
    console.log('Command result:', message.result);
  } else if (message.type === 'channel_message') {
    console.log('Channel update:', message.data);
  } else if (message.type === 'ping') {
    // Send pong automatically
    ws.send(JSON.stringify({ type: 'pong' }));
  }

  // Process message
  window.ConsoleWebSocket.handleMessage('my-app-client', event.data);
};

// 4. Handle errors
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// 5. Handle disconnection
ws.onclose = () => {
  console.log('Disconnected from server');
  window.ConsoleWebSocket.removeConnection('my-app-client');

  // Attempt reconnect
  setTimeout(() => {
    location.reload(); // Reconnect
  }, 5000);
};
```

---

## 🔌 Complete Server Example

```javascript
// 1. Link modules
window.ConsoleWebSocket.linkModules({
  ConsoleSettings: window.ConsoleSettings,
  ConsoleRenderer: window.ConsoleRenderer,
  ConsoleDatabase: window.ConsoleDatabase,
  ConsoleRegistry: window.ConsoleRegistry,
  ConsoleCommands: window.ConsoleCommands,
  ConsoleBridge: window.ConsoleBridge
});

// 2. Setup event listeners
window.ConsoleWebSocket.on('connection:opened', (data) => {
  console.log(`Client connected: ${data.id}`);
  // Broadcast to all clients
  window.ConsoleWebSocket.broadcastAll({
    type: 'user_joined',
    clientId: data.id
  });
});

window.ConsoleWebSocket.on('connection:closed', (data) => {
  console.log(`Client disconnected: ${data.id}`);
  // Broadcast to remaining clients
  window.ConsoleWebSocket.broadcastAll({
    type: 'user_left',
    clientId: data.id
  });
});

// 3. Start server
window.ConsoleWebSocket.start();
console.log('WebSocket server started:', 
  window.ConsoleWebSocket.getServerInfo().url);

// 4. Simulate data updates
setInterval(() => {
  window.ConsoleWebSocket.publish('data_updates', {
    timestamp: Date.now(),
    activeUsers: Math.floor(Math.random() * 100)
  });
}, 5000);

// 5. Monitor health
setInterval(() => {
  const health = window.ConsoleWebSocket.getHealth();
  console.log(`Health: ${health.status} - ` +
    `${health.connections.healthy}/${health.connections.total} connections`);
}, 30000);
```

---

## 🚀 Real-time Data Streaming

### Stream Command Output
```javascript
// Subscribe to command channel
window.ConsoleWebSocket.subscribe('commands', clientId, (msg) => {
  console.log('Command output:', msg.output);
});

// Publish command output in real-time
window.ConsoleWebSocket.publish('commands', {
  type: 'command_output',
  output: 'Line 1\nLine 2\nLine 3'
});
```

### Stream Database Updates
```javascript
// Subscribe to database channel
window.ConsoleWebSocket.subscribe('database', clientId);

// Publish table changes
setInterval(() => {
  const data = window.ConsoleDatabase.query('SELECT * FROM users');
  window.ConsoleWebSocket.publish('database', {
    type: 'table_update',
    table: 'users',
    data: data,
    timestamp: Date.now()
  });
}, 2000);
```

### Stream Terminal Output
```javascript
// Subscribe to output channel
window.ConsoleWebSocket.subscribe('output', clientId);

// Publish terminal updates
window.ConsoleRenderer.on('output:written', (data) => {
  window.ConsoleWebSocket.publish('output', {
    type: 'terminal_output',
    text: data.text,
    type: data.outputType
  });
});
```

---

## 🔐 Security

### Connection Validation
```javascript
// Validate connection on client
const connection = new WebSocket('ws://localhost:8000');

// Only use HTTPS in production (wss://)
const secureConnection = new WebSocket('wss://api.example.com:8000');
```

### Message Validation
```javascript
// Validate incoming messages
if (!message.type || !message.id) {
  console.error('Invalid message format');
  return;
}

// Validate command
if (message.type === 'command' &&
    !_Validator.validateCommand(message.command)) {
  console.error('Invalid command');
  return;
}
```

---

## 📊 Performance Tips

1. **Use Channels** for targeted broadcasting
2. **Queue Messages** for offline resilience
3. **Heartbeat** enables connection pooling
4. **Compression** reduces bandwidth (optional)
5. **Selective Subscription** reduces message volume

---

## 🔍 Error Handling

```javascript
const ws = new WebSocket('ws://localhost:8000');

ws.onerror = (error) => {
  console.error('Connection error:', error);
};

ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);
    if (message.type === 'command_error') {
      console.error('Command failed:', message.error);
    }
  } catch (error) {
    console.error('Message parsing failed:', error);
  }
};
```

---

**Version**: 1.0.0
**Status**: Production Ready ✅
**Protocol**: WebSocket RFC 6455
**Channels**: Unlimited
**Heartbeat**: 30 seconds
**Message Format**: JSON
