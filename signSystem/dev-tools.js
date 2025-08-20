// dev-tools.js - 開発ツール関連の機能を分離
// 元ファイル: remotesign.html
// 分離日: 2025-08-20

// ==========================================
// Dev Tools表示制御関数群
// ==========================================

// 🔧 Dev Tools 表示切り替え関数
function toggleDevTools() {
  const devTools = document.getElementById("devTools");
  devTools.style.display = devTools.style.display === "none" ? "block" : "none";
}

// ==========================================
// キャンバス設定関数群
// ==========================================

// 🔧 キャンバススケール更新関数
function updateCanvasScale(value) {
  canvasScale = parseFloat(value);
  document.getElementById("canvasScaleValue").textContent = value + "x";
  
  // キャンバスサイズ変更を受信側に通知
  if (socket.readyState === WebSocket.OPEN && myWriterId) {
    const canvasSize = {
      width: canvas.width,
      height: canvas.height
    };
    
    socket.send(JSON.stringify({
      type: "canvasSizeUpdate",
      canvasSize: canvasSize,
      scale: canvasScale,
      writerId: myWriterId
    }));
    
    console.log(`📡 キャンバスサイズ変更を受信側に送信: ${canvas.width}x${canvas.height}, scale=${canvasScale}`);
  }
}

// ==========================================
// アニメーション設定関数群
// ==========================================

// 🔧 アニメーション開始待機時間更新関数
function updateAnimationStartWait(value) {
  animationStartWaitTime = parseFloat(value);
  document.getElementById("animationStartWaitValue").textContent = value + "秒";
}

// 🔧 回転待機時間更新関数
function updateRotationWait(value) {
  rotationWaitTime = parseFloat(value);
  document.getElementById("rotationWaitValue").textContent = value + "秒";
}

// ==========================================
// Dev設定送信関数群
// ==========================================

// 🔧 Dev設定送信関数
function sendDevSettings() {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "devSettings",
      canvasScale: canvasScale,
      animationStartWaitTime: animationStartWaitTime,
      rotationWaitTime: rotationWaitTime
    }));
  } else {
    console.error("❌ WebSocket接続なし");
  }
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ dev-tools.js loaded successfully');