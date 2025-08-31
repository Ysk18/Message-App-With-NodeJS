// Simple WebSocket chat server with @user-name messaging and thread system
const WebSocket = require('ws');
const { Worker } = require('worker_threads');

const fs = require('fs');
const https = require('https');
// Only one clients declaration
const clients = new Map(); // username -> ws

// Load self-signed certs (generate with openssl if needed)
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

// Create HTTPS server with HTTP response for Render
const server = https.createServer(options, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server is running!');
});
const wss = new WebSocket.Server({ server });

function broadcast(sender, message) {
    for (const [username, ws] of clients.entries()) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ from: sender, message }));
        }
    }
}

function sendToUser(sender, target, message) {
    const targetWs = clients.get(target);
    const senderWs = clients.get(sender);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({ from: sender, message }));
    }
    if (senderWs && senderWs.readyState === WebSocket.OPEN) {
        senderWs.send(JSON.stringify({ from: sender, message }));
    }
}

// Improved message handling: first message must be username, others must be message
// Store client IPs
wss.on('connection', (ws, req) => {
    let username = null;
    const clientIp = req.socket.remoteAddress;
    ws.clientIp = clientIp;
    console.log(`Client connected from IP: ${clientIp}`);
    ws.on('message', (data) => {
        // Use a worker thread for message processing
        const worker = new Worker(`
            const { parentPort } = require('worker_threads');
            parentPort.on('message', (msg) => {
                parentPort.postMessage(msg);
            });
        `, { eval: true });
        worker.on('message', (msg) => {
            //console.log('Received raw message:', msg);
            let parsed;
            try {
                // Convert Buffer or Uint8Array to string
                const strMsg = Buffer.isBuffer(msg) ? msg.toString() : (msg instanceof Uint8Array ? Buffer.from(msg).toString() : msg);
                parsed = JSON.parse(strMsg);
                console.log('Parsed message:', parsed);
            } catch (e) {
                ws.send(JSON.stringify({ system: true, message: 'Invalid message format.' }));
                console.log('JSON parse error:', e);
                return;
            }
            // First message: register username
            if (!username && parsed.username) {
                username = parsed.username;
                clients.set(username, ws);
                ws.send(JSON.stringify({ system: true, message: `Welcome, ${username}!` }));
                // Notify all other users
                for (const [otherUser, otherWs] of clients.entries()) {
                    if (otherUser !== username && otherWs.readyState === WebSocket.OPEN) {
                        otherWs.send(JSON.stringify({ system: true, message: `User: ${username} joined the server` }));
                    }
                }
                return;
            }
            // Only respond to valid message events after registration
            if (username) {
                if (typeof parsed.message === 'string') {
                    const match = parsed.message.match(/^@(\w+) (.+)$/);
                    if (match) {
                        const target = match[1];
                        const msgText = match[2];
                        sendToUser(username, target, msgText);
                    } else {
                        broadcast(username, parsed.message);
                    }
                }
                // Ignore anything else (no error sent)
                return;
            }
            // Ignore any other message types (no error sent)
        });
        worker.postMessage(data);
    });
    ws.on('close', () => {
        if (username) clients.delete(username);
    });
});

const PORT = process.env.PORT || 8080;
server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on https://0.0.0.0:${PORT}`);
    console.log(`WebSocket server running on wss://0.0.0.0:${PORT}`);
    console.log('NOTE: You must generate key.pem and cert.pem for HTTPS.');
    console.log('For testing, use: openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem');
});
