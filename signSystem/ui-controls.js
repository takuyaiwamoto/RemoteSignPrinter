// ui-controls.js - UI制御・テーマ関連の機能を分離
// 元ファイル: remotesign.html
// 分離日: 2025-08-20

// ==========================================
// ビデオサイズ制御関数群
// ==========================================

// 🔸 ビデオサイズ設定関数
function setVideoSize(size) {
  currentVideoSize = size;
  
  // ボタンの選択状態を更新
  document.getElementById("size100Btn").classList.remove("selected");
  document.getElementById("size90Btn").classList.remove("selected");
  document.getElementById("size80Btn").classList.remove("selected");
  
  document.getElementById(`size${size}Btn`).classList.add("selected");
  
  
  // 受信側にサイズ情報を送信
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ 
      type: "videoSize", 
      size: size 
    }));
  }
}

// ==========================================
// ビデオ再生制御関数群
// ==========================================

// 🔸 ビデオ再生関数
function playVideo() {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ 
      type: "playVideo",
      message: "再生開始"
    }));
  } else {
    console.error("❌ WebSocket接続なし");
  }
}

// ==========================================
// テーマ制御関数群
// ==========================================

// 🎨 テーマ切り替え関数
function toggleTheme() {
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');
  
  if (body.classList.contains('dark-theme')) {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
    if (themeToggle) themeToggle.textContent = '🌙';
  } else {
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    if (themeToggle) themeToggle.textContent = '☀️';
  }
  
  // テーマ設定を受信側に送信
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "theme",
      theme: body.classList.contains('dark-theme') ? "dark" : "light"
    }));
  }
}

// ==========================================
// テスト・デバッグ関数群
// ==========================================

// 🧪 SwitchBotテスト関数
function testSwitchBot() {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ 
      type: "testSwitchBot",
      message: "SwitchBotテスト実行"
    }));
  } else {
    console.error("❌ WebSocket接続なし");
  }
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ ui-controls.js loaded successfully');