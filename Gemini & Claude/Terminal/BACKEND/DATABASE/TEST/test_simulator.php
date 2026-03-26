<?php
/**
 * Complete End-to-End Test Simulation
 * Replicates exactly what the JavaScript console does
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>ConsoleDatabase Login Test Simulator</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            background: #1e1e1e;
            color: #00ff00;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .container {
            background: #2d2d2d;
            border: 1px solid #00ff00;
            padding: 20px;
            margin: 10px 0;
            border-radius: 5px;
        }
        h1 { color: #00aaff; }
        h2 { color: #ffaa00; margin-top: 30px; }
        .success { color: #00ff00; }
        .error { color: #ff0000; }
        .info { color: #00aaff; }
        .warn { color: #ffaa00; }
        pre {
            background: #1e1e1e;
            padding: 10px;
            border-left: 3px solid #00ff00;
            overflow-x: auto;
        }
        button {
            background: #00ff00;
            color: #000;
            border: none;
            padding: 10px 20px;
            border-radius: 3px;
            cursor: pointer;
            font-weight: bold;
            margin: 5px;
        }
        button:hover {
            background: #00dd00;
        }
        #output {
            min-height: 400px;
            background: #1e1e1e;
            padding: 15px;
            border-radius: 5px;
            border: 1px solid #00ff00;
            margin-top: 20px;
        }
        .log-line {
            margin: 5px 0;
            padding: 5px;
        }
    </style>
</head>
<body>

<div class="container">
    <h1>🧪 ConsoleDatabase Login Test Simulator</h1>
    <p class="info">This page simulates the exact flow the JavaScript terminal uses</p>
</div>

<div class="container">
    <h2>Test Controls</h2>
    <button onclick="testHashVerification()">1️⃣ Test Hash Verification (PHP)</button>
    <button onclick="testAliasResolution()">2️⃣ Test Alias Resolution</button>
    <button onclick="testHttpFetch()">3️⃣ Test HTTP Fetch (POST)</button>
    <button onclick="testJavaScriptFetch()">4️⃣ Test JavaScript Fetch</button>
    <button onclick="runAllTests()">▶️ Run All Tests</button>
    <button onclick="clearOutput()">🗑️ Clear Output</button>
</div>

<div id="output"></div>

<script>
const output = document.getElementById('output');

function log(message, type = 'info') {
    const colors = {
        'success': '#00ff00',
        'error': '#ff0000',
        'info': '#00aaff',
        'warn': '#ffaa00',
        'debug': '#00dd00'
    };
    
    const line = document.createElement('div');
    line.className = 'log-line';
    line.style.color = colors[type] || colors['info'];
    
    // Add timestamp
    const time = new Date().toLocaleTimeString();
    line.textContent = `[${time}] ${message}`;
    
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
}

function clearOutput() {
    output.innerHTML = '';
    log('Output cleared', 'info');
}

async function testHashVerification() {
    log('═══════════════════════════════════════', 'warn');
    log('TEST 1: Hash Verification (PHP)', 'warn');
    log('═══════════════════════════════════════', 'warn');
    
    try {
        const response = await fetch('<?php echo $_SERVER['HTTP_HOST']; ?>/BACKEND/DATABASE/verify_hash.php');
        const text = await response.text();
        
        if (text.includes('TRUE ✅')) {
            log('✅ HASH IS VALID', 'success');
        } else if (text.includes('FALSE ❌')) {
            log('❌ HASH IS INVALID', 'error');
            log('You must regenerate the hash!', 'error');
        }
        
        log('Full output:', 'info');
        log(text, 'debug');
    } catch (e) {
        log('❌ Error: ' + e.message, 'error');
    }
}

async function testAliasResolution() {
    log('═══════════════════════════════════════', 'warn');
    log('TEST 2: Alias Resolution', 'warn');
    log('═══════════════════════════════════════', 'warn');
    
    const aliases = ['admin', 'morgan', 'Morgan', 'ADMIN', 'MORGAN'];
    const canonical = 'morgan';
    
    aliases.forEach(alias => {
        const lower = alias.toLowerCase();
        const resolved = (lower === 'morgan' || lower === 'admin') ? canonical : alias;
        const icon = resolved === canonical ? '✅' : '❌';
        log(`${icon} "${alias}" → "${resolved}"`, 'info');
    });
}

async function testHttpFetch() {
    log('═══════════════════════════════════════', 'warn');
    log('TEST 3: HTTP Fetch (POST Login)', 'warn');
    log('═══════════════════════════════════════', 'warn');
    
    const url = `http://localhost:8000/BACKEND/DATABASE/database_export.php?api=1&action=login`;
    const credentials = { username: 'admin', password: '12345678a' };
    
    log(`URL: ${url}`, 'info');
    log(`Method: POST`, 'info');
    log(`Credentials: ${JSON.stringify(credentials)}`, 'debug');
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        
        const status = response.status;
        log(`Status: ${status}`, status === 200 ? 'success' : 'error');
        
        const data = await response.json();
        log(`Response: ${JSON.stringify(data, null, 2)}`, data.success ? 'success' : 'error');
        
        if (data.success) {
            log('✅ Login successful!', 'success');
        } else {
            log(`❌ Login failed: ${data.message}`, 'error');
        }
    } catch (e) {
        log(`❌ Fetch error: ${e.message}`, 'error');
        log('Make sure PHP server is running: php -S localhost:8000', 'warn');
    }
}

async function testJavaScriptFetch() {
    log('═══════════════════════════════════════', 'warn');
    log('TEST 4: JavaScript Fetch (Console)', 'warn');
    log('═══════════════════════════════════════', 'warn');
    
    log('Running the exact code from console.engine.js...', 'info');
    
    const phpBase = `${window.location.origin}/BACKEND/DATABASE/database_export.php`;
    const username = 'admin';
    const password = '12345678a';
    
    log(`phpBase: ${phpBase}`, 'debug');
    log(`Sending: username="${username}", password="${password}"`, 'debug');
    
    try {
        const response = await fetch(`${phpBase}?api=1&action=login`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        log(`Response status: ${response.status}`, response.status === 200 || response.status === 401 ? 'info' : 'error');

        if (!response.ok && response.status !== 401) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            log(`✓ PHP session authenticated as ${data.user.username}`, 'success');
            if (data.user.role === 'admin') {
                log('🔑 Admin privileges granted', 'success');
            }
        } else {
            log(`❌ PHP login failed: ${data.message || 'Invalid credentials'}`, 'error');
        }
        
        log(`Full response: ${JSON.stringify(data, null, 2)}`, 'debug');
    } catch (e) {
        log(`❌ PHP server unreachable: ${e.message}`, 'error');
        log(`💡 Make sure PHP is running on ${window.location.origin}`, 'warn');
    }
}

async function runAllTests() {
    clearOutput();
    log('Starting all tests...', 'info');
    
    await testAliasResolution();
    log('', 'info');
    
    await testHashVerification();
    log('', 'info');
    
    await testHttpFetch();
    log('', 'info');
    
    await testJavaScriptFetch();
    log('', 'info');
    
    log('═══════════════════════════════════════', 'warn');
    log('All tests completed!', 'success');
    log('═══════════════════════════════════════', 'warn');
}

// Auto-run when page loads
window.addEventListener('load', () => {
    log('✅ Test simulator loaded', 'success');
    log('Click a button to start testing', 'info');
});
</script>

</body>
</html>
