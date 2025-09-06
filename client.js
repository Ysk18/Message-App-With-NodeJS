let ws;
let myUsername = null;
function connect() {
    const usernameInput = document.getElementById('username');
    const connectBtn = document.querySelector('button[onclick="connect()"]');
    const username = usernameInput.value.trim();
    if (!username) return alert('Enter username');
    if (ws && ws.readyState === WebSocket.OPEN) return; // Prevent reconnect
    ws = new WebSocket('wss://message-app-ysk.onrender.com'); // secure connection
    ws.onopen = () => {
        ws.send(JSON.stringify({ username }));
        myUsername = username;
        document.getElementById('chat').innerHTML += `<div><em>Connected as ${username}</em></div>`;
        connectBtn.disabled = true;
        usernameInput.disabled = true;
    };
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.system) {
            document.getElementById('chat').innerHTML += `<div class='system'><strong>System:</strong> ${data.message}</div>`;
        } else if (data.sent && data.from === myUsername && data.message.startsWith('@')) {
            // Sent direct message, show as sent to user
            const match = data.message.match(/^@(\w+) (.+)$/);
            if (match) {
                const target = match[1];
                const msgText = match[2];
                document.getElementById('chat').innerHTML += `<div class='message' style='text-align:right;'><span class='me'>Sent to @${target}:</span> <span style='color:#f59e42;'>"${msgText}"</span></div>`;
            } else {
                document.getElementById('chat').innerHTML += `<div class='message' style='text-align:right;'><span class='me'>You:</span> ${data.message}</div>`;
            }
        } else if (data.from === myUsername) {
            document.getElementById('chat').innerHTML += `<div class='message' style='text-align:right;'><span class='me'>You:</span> ${data.message}</div>`;
        } else {
            document.getElementById('chat').innerHTML += `<div class='message'><span class='sender'>${data.from}:</span> ${data.message}</div>`;
        }
        document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
    };
    ws.onclose = () => {
        document.getElementById('chat').innerHTML += `<div><em>Disconnected</em></div>`;
        connectBtn.disabled = false;
        usernameInput.disabled = false;
    };
}
function sendMessage() {
    const input = document.getElementById('input');
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ message: input.value }));
        input.value = '';
    }
}
