// video-sender.js - 送信側動画表示関連の機能を分離
// 元ファイル: remotesign.html
// 分離日: 2025-08-20

// ==========================================
// 送信側動画作成・制御関数群
// ==========================================

// 🎬 送信側動画作成関数
function createSenderVideo() {
  // console.log('🎬 送信側に動画を作成');
  
  // 既存の動画要素を削除
  if (senderVideoElement) {
    senderVideoElement.remove();
  }
  
  // 新しい動画要素を作成（キャンバス位置に配置）
  senderVideoElement = document.createElement('video');
  senderVideoElement.src = './back6.mp4';
  
  // 🔍 デバッグ情報: 現状把握
  const canvasRect = canvas.getBoundingClientRect();
  // console.log('📊 書き手側デバッグ情報:');
  // console.log(`  canvasScale値: ${canvasScale}`);
  // console.log(`  キャンバス位置: (${canvasRect.left}, ${canvasRect.top})`);
  // console.log(`  キャンバスサイズ: ${canvasRect.width} x ${canvasRect.height}`);
  // console.log(`  ウィンドウサイズ: ${window.innerWidth} x ${window.innerHeight}`);
  
  // ステップ1: キャンバスの情報を確認
  // console.log('📏 ステップ1: キャンバス情報確認');
  // console.log(`  キャンバスサイズ: ${canvas.width} x ${canvas.height}`);
  // console.log(`  キャンバス画面位置: (${canvasRect.left}, ${canvasRect.top})`);
  
  // ステップ2: キャンバスの中心座標を計算
  const canvasCenterX = canvas.width / 2;
  const canvasCenterY = canvas.height / 2;
  // console.log('🎯 ステップ2: キャンバス中心座標計算');
  // console.log(`  キャンバス中心（相対座標）: (${canvasCenterX}, ${canvasCenterY})`);
  
  // ステップ3: 動画サイズを計算（受信側設定に基づいて）
  const videoSizePercent = currentVideoSize || 100;
  const videoScaleFactor = videoSizePercent / 100;
  
  const baseVideoWidth = 480 * canvasScale * videoScaleFactor;
  const baseVideoHeight = 640 * canvasScale * videoScaleFactor;
  
  // console.log('🎥 ステップ3: 動画サイズ計算');
  // console.log(`  動画サイズ設定: ${videoSizePercent}%`);
  // console.log(`  canvasScale: ${canvasScale}`);
  // console.log(`  videoScaleFactor: ${videoScaleFactor}`);
  // console.log(`  計算された動画サイズ: ${baseVideoWidth} x ${baseVideoHeight}`);
  
  // ステップ4: 画面上での配置位置を計算
  const videoLeft = canvasRect.left + (canvasRect.width - baseVideoWidth) / 2;
  const videoTop = canvasRect.top + (canvasRect.height - baseVideoHeight) / 2;
  
  // console.log('📐 ステップ4: 動画配置位置計算');
  // console.log(`  動画左上座標: (${videoLeft}, ${videoTop})`);
  
  // ステップ5: 動画要素にスタイルを適用
  senderVideoElement.style.cssText = `
    position: fixed !important;
    top: ${videoTop}px !important;
    left: ${videoLeft}px !important;
    width: ${baseVideoWidth}px !important;
    height: ${baseVideoHeight}px !important;
    z-index: 50 !important;
    object-fit: contain !important;
    pointer-events: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    transform: none !important;
    transform-origin: initial !important;
  `;
  
  // ステップ6: 動画設定
  senderVideoElement.muted = true;
  senderVideoElement.loop = false;
  senderVideoElement.autoplay = false;
  senderVideoElement.playsInline = true;
  
  // ステップ7: 動画を画面に追加
  document.body.appendChild(senderVideoElement);
  
  // console.log('✅ 送信側動画要素を作成・配置完了');
  // console.log(`  最終動画位置: (${videoLeft}, ${videoTop})`);
  // console.log(`  最終動画サイズ: ${baseVideoWidth} x ${baseVideoHeight}`);
}

// 🎬 送信側動画再生関数
function playSenderVideo() {
  if (!senderVideoElement) {
    console.error('❌ 送信側動画要素が存在しません');
    return;
  }
  
  // console.log('🎬 送信側動画再生開始');
  
  senderVideoElement.currentTime = 0;
  
  const playPromise = senderVideoElement.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        // console.log('✅ 送信側動画再生開始成功');
      })
      .catch(error => {
        console.error('❌ 送信側動画再生エラー:', error);
      });
  }
}

// 🎬 送信側動画を最後のフレームで停止する関数
function stopSenderVideoAtLastFrame() {
  if (!senderVideoElement) {
    console.error('❌ 送信側動画要素が存在しません');
    return;
  }
  
  // console.log('🎬 送信側動画を最後のフレームで停止');
  
  // 動画の最後にシーク
  senderVideoElement.currentTime = senderVideoElement.duration - 0.1;
  senderVideoElement.pause();
  
  // console.log('✅ 送信側動画を最後のフレームで停止しました');
}

// 🎬 送信側動画を隠す関数
function hideSenderVideo() {
  if (!senderVideoElement) {
    // console.log('⚠️ 送信側動画要素が存在しません（隠す処理をスキップ）');
    return;
  }
  
  // console.log('🎬 送信側動画を非表示');
  senderVideoElement.style.display = 'none';
  
  // console.log('✅ 送信側動画を非表示にしました');
}

// 🎬 送信側動画停止関数
function stopSenderVideo() {
  if (!senderVideoElement) {
    // console.log('⚠️ 送信側動画要素が存在しません（停止処理をスキップ）');
    return;
  }
  
  // console.log('🎬 送信側動画停止');
  
  senderVideoElement.pause();
  senderVideoElement.currentTime = 0;
  
  // console.log('✅ 送信側動画を停止しました');
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ video-sender.js loaded successfully');