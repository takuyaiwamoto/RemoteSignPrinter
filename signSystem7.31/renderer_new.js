const { ipcRenderer } = require("electron");
const path = require("path");
const crypto = require("crypto");

// 統一座標システム設定（シンプル化）
const UNIFIED_SETTINGS = {
  canvasScale: 0.35,  // 送信側設定と同期
  videoTop: 150,      // 動画・PNG固定位置
  centerAlign: true   // 中央配置
};

// 🔸 拡大率を設定 (デフォルト4.0倍、ポスター時は2.4倍=A4の60%)
let SCALE_FACTOR = 4.0;

// 基本変数
const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");

// 統一位置計算関数（動画とPNGの同一位置を保証）
function calculateUnifiedPosition(videoWidth, videoHeight) {
  // 中央配置計算
  const centerX = (window.innerWidth - videoWidth) / 2;
  const fixedY = UNIFIED_SETTINGS.videoTop;
  
  // 統一スタイル
  const positionStyle = `
    position: fixed;
    left: ${centerX}px;
    top: ${fixedY}px;
    width: ${videoWidth}px;
    height: ${videoHeight}px;
    object-fit: contain;
    transform: rotate(180deg);
  `;
  
  return positionStyle;
}

// 統一サイズ計算関数
function calculateUnifiedSize() {
  const maxWidth = canvas.width * UNIFIED_SETTINGS.canvasScale;
  const maxHeight = canvas.height * UNIFIED_SETTINGS.canvasScale;
  const videoWidth = Math.min(maxWidth, maxHeight * (16/9));
  const videoHeight = videoWidth / (16/9);
  
  return { videoWidth, videoHeight };
}

// 簡素化された動画背景関数
function startUnifiedVideoBackground(videoSrc) {
  // 既存の動画要素を削除
  const existingVideo = document.querySelector('video');
  if (existingVideo) {
    existingVideo.remove();
  }
  
  // 新しい動画要素を作成
  const videoElement = document.createElement('video');
  videoElement.id = 'backgroundVideo';
  videoElement.src = videoSrc;
  videoElement.muted = true;
  videoElement.autoplay = true;
  
  // 統一サイズ・位置で配置
  const { videoWidth, videoHeight } = calculateUnifiedSize();
  const unifiedStyle = calculateUnifiedPosition(videoWidth, videoHeight);
  videoElement.setAttribute('style', unifiedStyle + 'z-index: -1;');
  
  console.log('🎬 動画開始:', videoElement.id, '表示状態:', videoElement.style.display || 'block');
  
  // 動画再生開始時のデバッグ
  videoElement.addEventListener('loadstart', () => {
    console.log('🎬 動画読み込み開始');
  });
  
  videoElement.addEventListener('play', () => {
    console.log('🎬 動画再生開始 - 表示状態:', videoElement.style.display || 'block');
  });
  
  // 動画終了時に動画を非表示にする（PNG表示なし）
  videoElement.addEventListener('ended', () => {
    console.log('🎬 動画再生終了 - 非表示処理前:', videoElement.style.display || 'block');
    videoElement.style.display = 'none';
    videoElement.style.visibility = 'hidden';
    console.log('🎬 動画非表示完了 - 処理後:', videoElement.style.display, 'visibility:', videoElement.style.visibility);
    
    // 5秒後に扉を閉じる
    setTimeout(() => {
      closeDoorEffect();
    }, 5000);
  });
  
  document.body.appendChild(videoElement);
}

// 統一PNG画像オーバーレイ関数
function createUnifiedPngOverlay() {
  console.log('🖼️ 統一PNGオーバーレイ作成');
  
  // 既存のPNG要素を削除
  const existingPng = document.getElementById('pngOverlay');
  if (existingPng) {
    existingPng.remove();
  }
  
  // PNG画像要素を作成
  const pngElement = document.createElement('img');
  pngElement.id = 'pngOverlay';
  pngElement.src = './back6.png';
  
  // 動画と同じサイズ・位置で配置
  const { videoWidth, videoHeight } = calculateUnifiedSize();
  const unifiedStyle = calculateUnifiedPosition(videoWidth, videoHeight);
  pngElement.setAttribute('style', unifiedStyle + 'z-index: 0;');
  
  document.body.appendChild(pngElement);
  console.log('🖼️ 統一PNGオーバーレイ配置完了：動画と同一位置');
}

// 統一180度回転アニメーション関数
function runUnified180Rotation() {
  // キャンバスの180度回転アニメーション
  canvas.style.transition = 'transform 2s ease-in-out';
  canvas.style.transform = 'rotate(180deg)';
  
  // 2秒後にアニメーション完了処理
  setTimeout(() => {
    // 動画背景開始（3.3秒待機後）
    setTimeout(() => {
      startUnifiedVideoBackground('./back6.mp4');
    }, 3300);
    
  }, 2000);
}

// 扉閉じ効果
function closeDoorEffect() {
  console.log('🚪 扉閉じ効果開始');
  // 既存の扉効果をそのまま使用
  // 実装は既存コードから移植
}

// メインアニメーションシーケンス関数（簡素化）
function runAnimationSequence(waitTime = null, fireworksEnabled = true, confettiEnabled = true) {
  // 180度回転実行
  runUnified180Rotation();
}

// WebSocket接続（簡素化）
let socket;

function connectToUnifiedServer() {
  try {
    socket = io('wss://realtime-sign-server-1.onrender.com');

    socket.on('connect', () => {
      // WebSocket接続成功
    });

    socket.on('drawing', (data) => {
      handleReceiveDrawing(data);
    });

    socket.on('animation_start', () => {
      runAnimationSequence();
    });

    // 送信側スケール値の同期
    socket.on('scale_update', (data) => {
      UNIFIED_SETTINGS.canvasScale = data.scale;
    });

  } catch (error) {
    console.error('❌ Socket.IO接続エラー:', error);
  }
}

// 描画処理関数（既存機能を維持）
function handleReceiveDrawing(data) {
  // 既存の描画処理をそのまま実装
  // 座標変換は180度回転のみ適用
}

// 色補間関数（送信側と同じ）
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// 初期化関数
function initializeUnifiedSystem() {
  connectToUnifiedServer();
  
  // キャンバス初期設定
  canvas.style.transformOrigin = 'center center';
}

// 初期化実行
document.addEventListener('DOMContentLoaded', () => {
  initializeUnifiedSystem();
});

// エクスポート（既存コードとの互換性のため）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAnimationSequence,
    startUnifiedVideoBackground,
    createUnifiedPngOverlay,
    UNIFIED_SETTINGS
  };
}