const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイル配信（signSystemディレクトリ）
app.use(express.static(path.join(__dirname, 'signSystem')));

// remotesign.htmlを直接アクセス可能に
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'signSystem', 'remotesign.html'));
});

// その他の静的ファイルアクセス
app.get('/remotesign', (req, res) => {
  res.sendFile(path.join(__dirname, 'signSystem', 'remotesign.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 サーバーが起動しました`);
  console.log(`📱 ローカルアクセス: http://localhost:${PORT}`);
  console.log(`🌍 外部アクセス: http://[あなたのIPアドレス]:${PORT}`);
  console.log(`⚠️  ファイアウォールでポート${PORT}を開放してください`);
});