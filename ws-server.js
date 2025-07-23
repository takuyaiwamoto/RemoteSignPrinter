const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 10000;

// HTTPサーバーを作成
const server = http.createServer((req, res) => {
  // 通常のHTTPリクエストには426を返す
  res.writeHead(426, { 'Content-Type': 'text/plain' });
  res.end('Please use WebSocket protocol');
});

// WebSocketサーバーを作成
const wss = new WebSocket.Server({ server });

// 接続されたクライアントを管理
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('✅ 新しいクライアントが接続しました');
  clients.add(ws);

  ws.on('message', (message) => {
    console.log('📨 メッセージ受信:', message.toString());
    
    // 他のすべてのクライアントにメッセージを転送
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('👋 クライアントが切断しました');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocketエラー:', error);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 WebSocketサーバーがポート${PORT}で起動しました`);
});