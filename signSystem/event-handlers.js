// event-handlers.js - イベントハンドラー・初期化処理関連の機能を分離
// 元ファイル: remotesign.html
// 分離日: 2025-08-20

// ==========================================
// キーボードイベントハンドラー
// ==========================================

// キーボードイベントリスナーを追加（矢印キーで操作 - デスクトップ用）
document.addEventListener('keydown', function(event) {
  // 入力フィールドにフォーカスがある場合は無視
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }
  
  switch(event.key) {
    case 'ArrowUp':
      event.preventDefault();
      // 背景を上に移動・拡大
      backgroundOffsetY = Math.max(backgroundOffsetY - 20, -100);
      backgroundScale = Math.min(backgroundScale + 0.1, 2.0);
      updateBackgroundTransform();
      break;
    case 'ArrowDown':
      event.preventDefault();
      // 背景を下に移動・縮小
      backgroundOffsetY = Math.min(backgroundOffsetY + 20, 100);
      backgroundScale = Math.max(backgroundScale - 0.1, 0.5);
      updateBackgroundTransform();
      break;
    case 'ArrowLeft':
      event.preventDefault();
      setBackground('./back3.png');
      break;
    case 'ArrowRight':
      event.preventDefault();
      setBackground('./back4.png');
      break;
  }
});

// ==========================================
// 初期化処理・DOMContentLoadedイベントハンドラー
// ==========================================

// 初期化処理：起動時に背景2を設定
window.addEventListener('DOMContentLoaded', () => {
  
  // デバイス検出と設定適用
  const deviceInfo = DeviceManager.applyDeviceSettings();
  
  // ダブルタップズーム防止用の変数
  let lastTouchEnd = 0;
  
  // タブレットでのピンチズーム防止（ペン描画時も含む）
  document.addEventListener('touchstart', function(e) {
    // キャンバス上のタッチは全て描画として扱い、ズーム無効
    if (e.target.tagName === 'CANVAS' || e.target.id === 'drawCanvas') {
      e.preventDefault();
      return false;
    }
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
  
  document.addEventListener('touchend', function(e) {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });
  
  document.addEventListener('touchmove', function(e) {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
  
  // WebSocket接続を少し遅延（DOM読み込み完了を確実にする）
  setTimeout(() => {
    const writerId = generateSessionId();
    requestWriterId(writerId);
    
    // 少し待ってからwriter ID を要求（受信側の準備完了を待つ）
    setTimeout(() => {
      // 受信側にwriter IDを送信
      sendMessage({ 
        type: "requestWriterId", 
        sessionId: writerId,
        requestTime: new Date().toISOString()
      });
    }, 1000);
    
    // さらに少し待ってから背景設定（WebSocket安定化後）
    setTimeout(() => {
      // 背景画像を設定（デフォルト：背景2）
      setBackground('./back2.png');
    }, 2000);
    
  }, 500); // WebSocket接続を待つため少し遅延
});

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ event-handlers.js loaded successfully');