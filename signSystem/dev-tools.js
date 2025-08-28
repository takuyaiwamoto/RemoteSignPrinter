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

// 🔧 音楽ボリューム更新関数
function updateMusicVolume(value) {
  const volume = parseFloat(value);
  const percentage = Math.round(volume * 100);
  document.getElementById("musicVolumeValue").textContent = percentage + "%";
  console.log(`🎵 音楽ボリューム設定: ${percentage}%`);
}

// 🔧 動画パターン設定関数
function setVideoPattern(pattern) {
  currentVideoPattern = pattern;
  
  // ボタンの見た目を更新
  const pattern1Btn = document.getElementById("pattern1Btn");
  const pattern2Btn = document.getElementById("pattern2Btn");
  
  if (pattern === 1) {
    pattern1Btn.classList.add("selected");
    pattern2Btn.classList.remove("selected");
    pattern1Btn.style.background = "#4CAF50";
    pattern2Btn.style.background = "#2196F3";
    console.log("🎬 動画パターン1(回転)に設定");
  } else {
    pattern1Btn.classList.remove("selected");
    pattern2Btn.classList.add("selected");
    pattern1Btn.style.background = "#4CAF50";
    pattern2Btn.style.background = "#FF5722";
    console.log("🎬 動画パターン2(フェード)に設定");
  }
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
      rotationWaitTime: rotationWaitTime,
      videoPattern: currentVideoPattern,
      printDelayTime: printDelayTime
    }));
  } else {
    console.error("❌ WebSocket接続なし");
  }
}

// ==========================================
// 印刷設定関数群
// ==========================================

// 🔧 印刷遅延時間更新関数
function updatePrintDelay(value) {
  printDelayTime = parseFloat(value);
  document.getElementById("printDelayValue").textContent = value + "秒";
  console.log(`🖨️ 印刷遅延時間を${value}秒に設定`);
  
  // 設定を他の受信側に送信
  sendDevSettings();
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ dev-tools.js loaded successfully');