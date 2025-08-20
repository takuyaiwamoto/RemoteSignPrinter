// audio-music.js - 音楽・音声関連の機能を分離
// 元ファイル: remotesign.html
// 分離日: 2025-08-20

// ==========================================
// 音楽・音声初期化関数群
// ==========================================

// 🎵 描画音楽初期化関数
function initDrawingAudio() {
  if (!drawingAudio) {
    drawingAudio = new Audio('./draw.mp3');
    drawingAudio.loop = true; // ループ再生
    drawingAudio.volume = 0.7; // ボリュームを70%に設定
    // 描画音楽初期化
  }
}

// ==========================================
// 音楽再生制御関数群
// ==========================================

// 🎵 描画音楽開始関数
function startDrawingMusic() {
  if (!penSoundEnabled) return; // ペン音が無効の場合は何もしない
  
  initDrawingAudio();
  
  if (drawingAudio.paused) {
    drawingAudio.play().then(() => {
      // 描画音楽開始
    }).catch(e => {
      // 描画音楽再生エラー
    });
  }
  
  isDrawingActive = true;
  
  // 既存のタイマーをクリア
  if (drawingInactiveTimer) {
    clearTimeout(drawingInactiveTimer);
    drawingInactiveTimer = null;
  }
}

// 🎵 描画音楽一時停止関数
function pauseDrawingMusic() {
  if (drawingAudio && !drawingAudio.paused) {
    drawingAudio.pause();
    // 描画音楽一時停止
  }
}

// 🎵 描画音楽停止関数
function stopDrawingMusic() {
  if (drawingAudio) {
    drawingAudio.pause();
    drawingAudio.currentTime = 0;
    // 描画音楽停止・先頭に戻す
  }
  
  isDrawingActive = false;
}

// ==========================================
// 描画活動監視関数群
// ==========================================

// 🎵 描画活動処理関数
function handleDrawingActivity() {
  // 描画が開始されたら音楽を開始
  startDrawingMusic();
  
  // 既存の非アクティブタイマーをクリア
  if (drawingInactiveTimer) {
    clearTimeout(drawingInactiveTimer);
  }
  
  // 3秒後に非アクティブ状態とみなして音楽を停止
  drawingInactiveTimer = setTimeout(() => {
    pauseDrawingMusic();
    isDrawingActive = false;
    // 3秒間描画が無いため音楽一時停止
  }, 3000);
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ audio-music.js loaded successfully');