// settings.js - 設定・ユーティリティ関連の機能を分離
// 元ファイル: remotesign.html
// 分離日: 2025-08-20

// ==========================================
// 用紙・印刷設定関数群
// ==========================================

// 🔸 用紙サイズ設定関数
function setPaperSize(size) {
  currentPaperSize = size;
  
  // ボタンの選択状態を更新
  document.getElementById("a4Btn").classList.remove("selected");
  document.getElementById("lBtn").classList.remove("selected");
  document.getElementById("posterBtn").classList.remove("selected");
  
  if (size === "A4") {
    document.getElementById("a4Btn").classList.add("selected");
    // console.log("📄 用紙サイズをA4に設定");
  } else if (size === "L") {
    document.getElementById("lBtn").classList.add("selected");
    // console.log("📄 用紙サイズをL判に設定");
  } else if (size === "poster") {
    document.getElementById("posterBtn").classList.add("selected");
    // console.log("📄 用紙サイズをポストカードに設定");
  }
  
  // 受信側に用紙サイズ情報を送信
  socket.send(JSON.stringify({ 
    type: "paperSize", 
    size: size 
  }));
}

// 🖨️ 印刷モード設定関数
function setPrintMode(mode) {
  currentPrintMode = mode;
  
  // ボタンの選択状態を更新
  document.getElementById("drawOnlyBtn").classList.remove("selected");
  document.getElementById("fullModeBtn").classList.remove("selected");
  
  if (mode === "drawOnly") {
    document.getElementById("drawOnlyBtn").classList.add("selected");
    // 印刷モードを描画モードに設定
  } else if (mode === "fullMode") {
    document.getElementById("fullModeBtn").classList.add("selected");
    // 印刷モードをフルモードに設定
  }
  
  // 受信側に印刷モード情報を送信
  socket.send(JSON.stringify({ 
    type: "printMode", 
    mode: mode 
  }));
}

// ==========================================
// ペン設定関数群
// ==========================================

// ペンの太さ設定関数
function setPenThickness(thickness) {
  currentPenThickness = thickness;
  
  // ボタンの選択状態を更新
  document.querySelectorAll('.thickness-btn').forEach(btn => btn.classList.remove('selected'));
  
  // クリックされたボタンを選択状態にする
  document.querySelectorAll('.thickness-btn').forEach(btn => {
    const onClick = btn.getAttribute('onclick');
    if (onClick && onClick.includes(`setPenThickness(${thickness})`)) {
      btn.classList.add('selected');
    }
  });
  
  // console.log(`✏️ ペンの太さを${thickness}に設定`);
  
  // ペンの太さ設定
  
  // 受信側に太さ情報を送信
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ 
      type: "penThickness", 
      thickness: thickness 
    }));
  }
}

// ペンの色設定関数
function setPenColor(color) {
  currentPenColor = color;
  
  // ボタンの選択状態を更新
  document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('selected'));
  
  // クリックされたボタンを選択状態にする
  document.querySelectorAll('.color-btn').forEach(btn => {
    // ボタンのstyle属性から背景色を取得して比較
    const btnStyle = btn.getAttribute('style') || '';
    const btnOnClick = btn.getAttribute('onclick') || '';
    if (btnStyle.includes(`background: ${color}`) || btnStyle.includes(`background:${color}`) ||
        btnOnClick.includes(`setPenColor('${color}')`)) {
      btn.classList.add('selected');
    }
  });
  
  // ペンの色設定
  
  // 受信側に色情報を送信
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ 
      type: "penColor", 
      color: color 
    }));
  }
}

// 🎵 ペン音制御関数（送信側では無効化）
function togglePenSound() {
  penSoundEnabled = false; // 送信側では常に無効
  // 音声は受信側のみで再生
}

// 🎬 映像再生機能の切り替え
let videoPlaybackEnabled = true; // デフォルトでON
function toggleVideoPlayback() {
  const checkbox = document.getElementById('videoPlayback');
  videoPlaybackEnabled = checkbox.checked;
  console.log(`🎬 映像再生: ${videoPlaybackEnabled ? 'ON' : 'OFF'}`);
  
  // WebSocketで受信側に通知
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'videoPlaybackToggle',
      enabled: videoPlaybackEnabled
    }));
  }
}

// 🔍 背景デバッグ表示制御関数
function toggleBackgroundDebug() {
  backgroundDebugEnabled = !backgroundDebugEnabled;
  // console.log(`🔍 背景デバッグ表示: ${backgroundDebugEnabled ? 'ON' : 'OFF'}`);
  
  // 既存の背景デバッグ要素を削除
  const existingDebugElements = document.querySelectorAll('.background-debug');
  existingDebugElements.forEach(element => element.remove());
  
  // デバッグが有効で背景画像が設定されている場合、デバッグ情報を表示
  if (backgroundDebugEnabled && backgroundImage) {
    // 背景のデバッグ情報を再表示
    const rect = canvas.getBoundingClientRect();
    // 簡単なデバッグ表示の実装
    console.log('🔍 背景デバッグ情報を表示');
  }
}

// ==========================================
// Dev Tools関数群
// ==========================================

// 🔸 Dev Tools 関数
function toggleDevTools() {
  const devTools = document.getElementById("devTools");
  devTools.style.display = devTools.style.display === "none" ? "block" : "none";
}

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

function updateAnimationStartWait(value) {
  animationStartWaitTime = parseFloat(value);
  document.getElementById("animationStartWaitValue").textContent = value + "秒";
}

function updateRotationWait(value) {
  rotationWaitTime = parseFloat(value);
  document.getElementById("rotationWaitValue").textContent = value + "秒";
}

function sendDevSettings() {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "devSettings",
      canvasScale: canvasScale,
      animationStartWaitTime: animationStartWaitTime,
      rotationWaitTime: rotationWaitTime
    }));
    // console.log(`🔧 Dev設定送信: scale=${canvasScale}, animationWait=${animationStartWaitTime}, rotationWait=${rotationWaitTime}`);
    // console.log("✅ 設定を受信側に送信しました");
  } else {
    console.error("❌ WebSocket接続なし");
  }
}

// ==========================================
// テーマ・UI設定関数群
// ==========================================

// 🎨 テーマ切り替え関数
function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.contains('dark-theme');
  
  if (isDark) {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
    // console.log('🌞 ライトテーマに切り替え');
  } else {
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    // console.log('🌙 ダークテーマに切り替え');
  }
  
  // テーマ設定を受信側に送信
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "theme",
      theme: isDark ? "light" : "dark"
    }));
  }
}

// ==========================================
// ビデオサイズ設定関数
// ==========================================

// 🔸 ビデオサイズ設定関数
function setVideoSize(size) {
  currentVideoSize = size;
  
  // ボタンの選択状態を更新
  document.getElementById("size100Btn").classList.remove("selected");
  document.getElementById("size90Btn").classList.remove("selected");
  document.getElementById("size80Btn").classList.remove("selected");
  
  document.getElementById(`size${size}Btn`).classList.add("selected");
  
  // console.log(`📐 ビデオサイズを${size}%に設定`);
  
  // 受信側にサイズ情報を送信
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ 
      type: "videoSize", 
      size: size 
    }));
  }
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ settings.js loaded successfully');