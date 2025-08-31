let ws;
function connect() {
    const usernameInput = document.getElementById('username');
    const connectBtn = document.querySelector('button[onclick="connect()"]');
    const username = usernameInput.value.trim();
    if (!username) return alert('Enter username');
    if (ws && ws.readyState === WebSocket.OPEN) return; // Prevent reconnect
    ws = new WebSocket('wss://10.42.33.76:8080'); // secure connection
    ws.onopen = () => {
        ws.send(JSON.stringify({ username }));
        document.getElementById('chat').innerHTML += `<div><em>Connected as ${username}</em></div>`;
        connectBtn.disabled = true;
        usernameInput.disabled = true;
    };
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.system) {
            document.getElementById('chat').innerHTML += `<div><strong>System:</strong> ${data.message}</div>`;
        } else {
            document.getElementById('chat').innerHTML += `<div><strong>${data.from}:</strong> ${data.message}</div>`;
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
