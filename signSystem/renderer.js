const { ipcRenderer } = require("electron");
const path = require("path");

// 🔸 拡大率を設定 (デフォルト4.0倍、ポスター時は2.4倍=A4の60%)
let SCALE_FACTOR = 4.0;

const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");

// 色補間関数（送信側と同じ）
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
}

// イージング関数（滑らかな変化のため）
function easeInOutSine(x) {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

function interpolateColor(color1, color2, factor) {
  // イージング関数を適用してより滑らかな変化
  const easedFactor = easeInOutSine(factor);
  
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const r = rgb1.r + easedFactor * (rgb2.r - rgb1.r);
  const g = rgb1.g + easedFactor * (rgb2.g - rgb1.g);
  const b = rgb1.b + easedFactor * (rgb2.b - rgb1.b);
  
  return rgbToHex(r, g, b);
}

function getNeonColorFromIndex(neonIndex) {
  const colors = [
    '#ff0000', '#ff4000', '#ff8000', '#ffb000', '#ffff00', '#b0ff00',
    '#80ff00', '#40ff00', '#00ff00', '#00ff40', '#00ff80', '#00ffb0',
    '#00ffff', '#00b0ff', '#0080ff', '#0040ff', '#0000ff', '#4000ff',
    '#8000ff', '#b000ff', '#ff00ff', '#ff00b0', '#ff0080', '#ff0040'
  ];
  
  const position = (neonIndex % colors.length);
  const colorIndex1 = Math.floor(position);
  const colorIndex2 = (colorIndex1 + 1) % colors.length;
  const factor = position - colorIndex1;
  
  const color1 = colors[colorIndex1];
  const color2 = colors[colorIndex2];
  return interpolateColor(color1, color2, factor);
}

// 妖精の粉エフェクト関数（送信側と完全に同じ）
function createReceiverFairyDust(x, y) {
  console.log(`✨ 受信側に妖精の粉を生成開始: (${x}, ${y})`);
  
  // 妖精の粉を極少数生成（1-2個）
  const dustCount = Math.floor(Math.random() * 2) + 1;
  console.log(`✨ 生成する妖精の粉の数: ${dustCount}`);
  
  for (let i = 0; i < dustCount; i++) {
    const dust = document.createElement('div');
    dust.className = 'fairy-dust';
    
    // 広範囲にランダム配置（80px範囲）
    const offsetX = (Math.random() - 0.5) * 80;
    const offsetY = (Math.random() - 0.5) * 80;
    
    const finalX = x + offsetX;
    const finalY = y + offsetY;
    
    dust.style.left = finalX + 'px';
    dust.style.top = finalY + 'px';
    
    // ランダムな色（キラキラした色）
    const colors = ['#fff', '#f0f8ff', '#e6e6fa', '#fffacd', '#f5f5dc', '#ffefd5'];
    dust.style.background = colors[Math.floor(Math.random() * colors.length)];
    dust.style.boxShadow = `0 0 6px ${dust.style.background}, 0 0 12px ${dust.style.background}, 0 0 18px ${dust.style.background}`;
    
    // ランダムな遅延でアニメーション開始
    dust.style.animationDelay = (Math.random() * 0.5) + 's';
    
    // 位置を固定
    dust.style.position = 'fixed';
    dust.style.zIndex = '9998';
    
    document.body.appendChild(dust);
    console.log(`✨ 妖精の粉${i+1}をDOMに追加:`, dust);
    console.log(`✨ 妖精の粉${i+1}の位置: left=${finalX}px, top=${finalY}px`);
    
    // アニメーション終了後に妖精の粉を削除
    setTimeout(() => {
      if (dust.parentNode) {
        dust.parentNode.removeChild(dust);
        console.log('✨ 受信側の妖精の粉を削除');
      }
    }, 3000);
  }
}

// 星エフェクト関数（送信側と完全に同じ飛び散る効果）
function createReceiverStar(x, y) {
  console.log(`⭐ 受信側に星を生成: (${x}, ${y})`);
  
  // 星の数をさらに減らす（1個、たまに2個）
  const starCount = Math.random() < 0.3 ? 2 : 1;
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    
    // より広範囲にランダム配置（50px範囲）
    const offsetX = (Math.random() - 0.5) * 50;
    const offsetY = (Math.random() - 0.5) * 50;
    
    const finalX = x + offsetX;
    const finalY = y + offsetY;
    
    star.style.left = finalX + 'px';
    star.style.top = finalY + 'px';
    
    console.log(`⭐ 星${i+1}の最終位置: left=${finalX}px, top=${finalY}px`);
    
    // ランダムな色（金色系）
    const colors = ['gold', '#FFD700', '#FFA500', '#FFFF00', '#FFE4B5', '#FFFACD'];
    star.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    // ランダムな飛び散り方向
    const direction = Math.random() * 360;
    star.style.setProperty('--fly-direction', direction + 'deg');
    
    // ランダムな遅延でアニメーション開始
    star.style.animationDelay = (Math.random() * 0.3) + 's';
    
    // 可視性を確認するため（位置を固定）
    star.style.position = 'fixed';
    star.style.zIndex = '9999';
    
    document.body.appendChild(star);
    console.log(`⭐ 星${i+1}をDOMに追加: `, star);
    
    // アニメーション終了後に星を削除
    setTimeout(() => {
      if (star.parentNode) {
        star.parentNode.removeChild(star);
        console.log('⭐ 受信側の星を削除');
      }
    }, 1000);
  }
}

// CSSアニメーションをスタイルシートに追加（送信側と完全に同じ）
function addStarStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .star {
      position: absolute;
      width: 16px;
      height: 16px;
      background: gold;
      pointer-events: none;
      animation: starTwinkle 1s ease-out forwards;
      z-index: 10;
      clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
    }
    @keyframes starTwinkle {
      0% {
        opacity: 1;
        transform: scale(0) rotate(0deg) translateX(0px) translateY(0px);
        filter: blur(0px);
      }
      30% {
        opacity: 1;
        transform: scale(1.2) rotate(180deg) translateX(10px) translateY(-10px);
        filter: blur(0px);
      }
      60% {
        opacity: 0.7;
        transform: scale(1.0) rotate(270deg) translateX(20px) translateY(-20px);
        filter: blur(1px);
      }
      85% {
        opacity: 0.3;
        transform: scale(0.6) rotate(330deg) translateX(25px) translateY(-25px);
        filter: blur(2px);
      }
      100% {
        opacity: 0;
        transform: scale(0.2) rotate(360deg) translateX(30px) translateY(-30px);
        filter: blur(3px);
      }
    }
    .fairy-dust {
      position: absolute;
      width: 3px;
      height: 3px;
      background: #fff;
      border-radius: 50%;
      pointer-events: none;
      animation: fairyDustTwinkle 3s ease-in-out forwards;
      z-index: 9;
      box-shadow: 0 0 8px #fff, 0 0 16px #fff, 0 0 24px #fff;
    }
    @keyframes fairyDustTwinkle {
      0% {
        opacity: 0;
        transform: scale(0) translateX(0px) translateY(0px);
        filter: blur(2px);
      }
      15% {
        opacity: 0.7;
        transform: scale(0.5) translateX(3px) translateY(-3px);
        filter: blur(1px);
      }
      30% {
        opacity: 1;
        transform: scale(1) translateX(8px) translateY(-8px);
        filter: blur(0px);
      }
      60% {
        opacity: 0.9;
        transform: scale(0.9) translateX(15px) translateY(-15px);
        filter: blur(0.5px);
      }
      80% {
        opacity: 0.5;
        transform: scale(0.6) translateX(20px) translateY(-20px);
        filter: blur(1.5px);
      }
      100% {
        opacity: 0;
        transform: scale(0.2) translateX(25px) translateY(-25px);
        filter: blur(3px);
      }
    }
  `;
  document.head.appendChild(style);
  console.log('⭐ 受信側の星アニメーションCSSを追加（送信側と完全に同じ）');
}

// ハートエフェクト用CSS
function addHeartStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .heart {
      position: fixed;
      width: 25px;
      height: 25px;
      background: #ff69b4;
      right: 50px;
      bottom: 20px;
      pointer-events: none;
      z-index: 10000;
      transform: rotate(45deg);
    }
    .heart::before,
    .heart::after {
      content: '';
      width: 25px;
      height: 25px;
      position: absolute;
      background: #ff69b4;
      border-radius: 50%;
    }
    .heart::before {
      top: -12.5px;
      left: 0;
    }
    .heart::after {
      top: 0;
      left: -12.5px;
    }
    .special-heart {
      position: fixed;
      width: 120px;
      height: 120px;
      background: #ff1493;
      bottom: 20px;
      pointer-events: none;
      z-index: 99999;
      transform: rotate(45deg);
      box-shadow: 0 0 20px #ff1493, 0 0 40px #ff1493, 0 0 60px #ff1493;
    }
    .special-heart::before,
    .special-heart::after {
      content: '';
      width: 120px;
      height: 120px;
      position: absolute;
      background: #ff1493;
      border-radius: 50%;
      box-shadow: 0 0 20px #ff1493;
    }
    .special-heart::before {
      top: -60px;
      left: 0;
    }
    .special-heart::after {
      top: 0;
      left: -60px;
    }
  `;
  document.head.appendChild(style);
}

// ハートエフェクト生成関数
function createHeart() {
  console.log('💖 ハート生成開始（受信側）');
  const heart = document.createElement('div');
  heart.className = 'heart';
  
  // ランダムなゆらゆら効果を生成
  const randomAnimationName = `heartFloat_${Math.random().toString(36).substr(2, 9)}`;
  const randomMoves = [];
  for (let i = 0; i <= 5; i++) {
    const randomX = (Math.random() - 0.5) * 30; // -15px to 15px
    randomMoves.push(randomX);
  }
  
  console.log(`💖 ランダム移動値: [${randomMoves.join(', ')}]`);
  
  // ランダムなキーフレームを動的に生成
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ${randomAnimationName} {
      0% {
        opacity: 1;
        transform: rotate(45deg) translateX(${randomMoves[0]}px);
        bottom: 20px;
      }
      20% {
        opacity: 1;
        transform: rotate(45deg) translateX(${randomMoves[1]}px);
        bottom: 80px;
      }
      40% {
        opacity: 0.9;
        transform: rotate(45deg) translateX(${randomMoves[2]}px);
        bottom: 140px;
      }
      60% {
        opacity: 0.8;
        transform: rotate(45deg) translateX(${randomMoves[3]}px);
        bottom: 200px;
      }
      80% {
        opacity: 0.5;
        transform: rotate(45deg) translateX(${randomMoves[4]}px);
        bottom: 260px;
      }
      100% {
        opacity: 0;
        transform: rotate(45deg) translateX(${randomMoves[5]}px);
        bottom: 320px;
      }
    }
  `;
  document.head.appendChild(style);
  console.log(`💖 スタイル追加: ${randomAnimationName}`);
  
  // ランダムアニメーションを適用
  heart.style.animation = `${randomAnimationName} 3s linear forwards`;
  
  document.body.appendChild(heart);
  console.log('💖 ハートをDOMに追加（受信側）:', heart);
  
  // 音楽再生
  const audio = new Audio('./poyo.mp3');
  audio.play().catch(e => console.log('音楽再生エラー:', e));
  
  // アニメーション終了後削除（スタイルも削除）
  setTimeout(() => {
    if (heart.parentNode) {
      heart.parentNode.removeChild(heart);
      console.log('💖 ハート削除（受信側）');
    }
    if (style.parentNode) {
      style.parentNode.removeChild(style);
      console.log('💖 スタイル削除（受信側）');
    }
  }, 3000);
}

// lキー連続押下の管理
let lKeyPressCount = 0;
let lKeyPressTimer = null;
let specialWindow = null;

// Electron透明ウィンドウ作成関数
async function createTransparentWindow() {
  try {
    const windowId = await ipcRenderer.invoke('create-transparent-window');
    console.log('👻 Electron透明ウィンドウ作成完了:', windowId);
    return { id: windowId };
  } catch (error) {
    console.error('❌ 透明ウィンドウ作成エラー:', error);
    return null;
  }
}

// Electron透明ウィンドウにハートを追加する関数
function createSpecialHeartInOverlay(x) {
  const heartData = { x, timestamp: Date.now() };
  ipcRenderer.send('add-heart-to-transparent-window', heartData);
  console.log(`👻 Electron透明ウィンドウにハート追加指示:`, heartData);
}

// 特別演出用の大きなハート生成関数
function createSpecialHeart() {
  console.log('✨ 特別ハート生成開始');
  const heart = document.createElement('div');
  heart.className = 'special-heart';
  
  // ウィンドウ下中央から±300px（合計600px）の範囲でランダム出現
  const windowCenterX = window.innerWidth / 2;
  const randomX = windowCenterX + (Math.random() - 0.5) * 600; // -300px to +300px
  
  // ランダムなアニメーション名
  const randomAnimationName = `specialHeartFloat_${Math.random().toString(36).substr(2, 9)}`;
  
  // 動的キーフレーム生成（フェードアウトなし、高速）
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ${randomAnimationName} {
      0% {
        transform: rotate(45deg);
        bottom: 20px;
        left: ${randomX}px;
      }
      100% {
        transform: rotate(45deg);
        bottom: ${window.innerHeight + 100}px;
        left: ${randomX}px;
      }
    }
  `;
  document.head.appendChild(style);
  
  // ハートに特別スタイルを適用（高速アニメーション）
  heart.style.animation = `${randomAnimationName} 0.8s linear forwards`;
  heart.style.position = 'fixed';
  heart.style.zIndex = '99999';
  
  document.body.appendChild(heart);
  console.log(`✨ 特別ハートをDOMに追加: x=${randomX}px`);
  
  // 音楽再生
  const audio = new Audio('./poyo.mp3');
  audio.play().catch(e => console.log('音楽再生エラー:', e));
  
  // 0.8秒後（画面上部到達時）に透明ウィンドウにハートを追加
  setTimeout(() => {
    console.log('📤 透明ウィンドウへのハート送信実行:', randomX);
    createSpecialHeartInOverlay(randomX);
  }, 800);
  
  // アニメーション終了後削除
  setTimeout(() => {
    if (heart.parentNode) {
      heart.parentNode.removeChild(heart);
    }
    if (style.parentNode) {
      style.parentNode.removeChild(style);
    }
  }, 800);
}

// 特別演出実行関数
async function triggerSpecialEffect() {
  console.log('🎉 特別演出開始！30個の大きなハートを生成');
  
  // 送信側にも特別演出開始を通知
  if (socket && socket.readyState === WebSocket.OPEN) {
    const specialEffectMessage = JSON.stringify({
      type: "specialHeartEffect"
    });
    socket.send(specialEffectMessage);
    console.log('🎉 送信側に特別演出開始を通知:', specialEffectMessage);
  } else {
    console.log('❌ WebSocket接続なし - 特別演出通知送信失敗');
  }
  
  // 既存の透明ウィンドウがない場合のみ新規作成
  try {
    await createTransparentWindow();
  } catch (error) {
    console.log('👻 透明ウィンドウは既に存在または作成済み');
  }
  
  // 30個のハートを0.03秒間隔で生成
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      createSpecialHeart();
    }, i * 30);
  }
}

// キーボードイベントリスナー
document.addEventListener('keydown', function(event) {
  if (event.key.toLowerCase() === 'l') {
    console.log('💖 lキーが押されました - ハートエフェクト開始');
    
    // lキー押下回数をカウント
    lKeyPressCount++;
    console.log(`💖 lキー押下回数: ${lKeyPressCount}/10`);
    
    // 既存のタイマーをクリア
    if (lKeyPressTimer) {
      clearTimeout(lKeyPressTimer);
    }
    
    // 10回押下で特別演出
    if (lKeyPressCount >= 10) {
      console.log('🎉 lキー10回押下達成！特別演出発動');
      triggerSpecialEffect();
      lKeyPressCount = 0; // カウントリセット
    } else {
      // 通常のハートエフェクト
      createHeart();
      
      // 書き手側にもハート表示指示を送信
      if (socket && socket.readyState === WebSocket.OPEN) {
        const heartMessage = JSON.stringify({
          type: "heartEffect"
        });
        socket.send(heartMessage);
        console.log('💖 送信側にハートエフェクト指示を送信:', heartMessage);
      } else {
        console.log('❌ WebSocket接続なし - ハートエフェクト送信失敗');
      }
    }
    
    // 3秒後にカウントリセット
    lKeyPressTimer = setTimeout(() => {
      if (lKeyPressCount < 10) {
        console.log('⏰ 3秒経過 - lキーカウントリセット');
        lKeyPressCount = 0;
      }
    }, 3000);
  }
});

// 初期化時にスタイルを追加
addStarStyles();
addHeartStyles();

// 🔸 キャンバスのサイズを1.4倍に設定
const originalWidth = canvas.width;
const originalHeight = canvas.height;
canvas.width = Math.floor(originalWidth * SCALE_FACTOR);
canvas.height = Math.floor(originalHeight * SCALE_FACTOR);

// 🔸 キャンバスの位置を最上部から60px下に移動（画像の上切れ防止）
canvas.style.position = "absolute";
canvas.style.top = "60px";
canvas.style.left = "50%";
canvas.style.transform = "translateX(-50%)"; // 180度回転を削除
canvas.style.zIndex = "1";

let backgroundImage = null;
let drawingData = [];
let lastBackgroundSrc = null;
let currentPaperSize = "A4"; // 🔸 現在の用紙サイズ（デフォルトはA4）
let currentVideoSize = 100; // 🔸 現在のビデオサイズ（デフォルト100%）
let starEffectEnabled = true; // 星エフェクトの状態（標準でON）
let fairyDustEffectEnabled = true; // 妖精の粉エフェクトの状態（標準でON）

// 🔸 Dev Tool設定
let devCanvasScale = 1.0; // キャンバススケール
let devRotationWaitTime = 5.1; // 回転後待機時間（秒）

// 🔸 描画エリア調整設定
let drawingAreaOffset = { x: 0, y: 0 }; // 描画エリアのオフセット
let drawingAreaSize = { width: 630, height: 450 }; // 描画エリアのサイズ
let showDrawingAreaFrame = false; // 描画エリアの枠表示フラグ
let isDragSetupComplete = false; // ドラッグセットアップ完了フラグ

// 🔸 ドラッグ機能の状態管理
let isDragging = false;
let isResizing = false;
let dragStartPos = { x: 0, y: 0 };
let dragStartAreaPos = { x: 0, y: 0 };
let dragStartAreaSize = { width: 0, height: 0 };
let resizeDirection = null;

// 🔸 送信側と受信側のキャンバスサイズ情報
let senderCanvasSize = { width: 842, height: 595 }; // 送信側のキャンバスサイズ
let receiverCanvasSize = { width: 842, height: 595 }; // 受信側のキャンバスサイズ

let socket = new WebSocket("wss://realtime-sign-server-1.onrender.com");
socket.onopen = () => console.log("✅ WebSocket接続完了（Electron受信側）");
socket.onerror = e => console.error("❌ WebSocketエラー", e);
socket.onclose = () => console.warn("⚠️ WebSocket切断");

let animationImage = null;

// 音声機能は削除されました

function resolveImagePath(filename) {
  return filename.startsWith("file://") ? filename : `file://${path.join(__dirname, filename)}`;
}

// 🔸 キャンバスサイズ変更関数を追加
function setCanvasToPortraitSize() {
  // 縦長サイズ（A4縦）に変更
  const portraitWidth = 595;  // A4縦の幅
  const portraitHeight = 842; // A4縦の高さ
  
  // A4モードの場合はキャンバスサイズを大きくして背景画像の見切れを防ぐ
  let widthMultiplier = SCALE_FACTOR;
  let heightMultiplier = SCALE_FACTOR;
  
  if (currentPaperSize === "A4") {
    // A4モードでは背景2が大きくなるため、キャンバスも大きくする
    widthMultiplier = SCALE_FACTOR * 1.6; // 60%大きく
    heightMultiplier = SCALE_FACTOR * 1.6; // 60%大きく
    console.log(`A4モード: キャンバスサイズを1.6倍に拡大`);
  }
  
  canvas.width = Math.floor(portraitWidth * widthMultiplier);
  canvas.height = Math.floor(portraitHeight * heightMultiplier);
  
  console.log(`キャンバスを縦長に変更: ${canvas.width} x ${canvas.height}`);
}

function resetCanvasToNormalSize() {
  // 通常サイズ（A4横）に戻す
  const normalWidth = 1050;  // A4横の幅
  const normalHeight = 743;  // A4横の高さ
  
  // A4モードの場合はキャンバスサイズを大きくして背景画像の見切れを防ぐ
  let widthMultiplier = SCALE_FACTOR;
  let heightMultiplier = SCALE_FACTOR;
  
  if (currentPaperSize === "A4") {
    // A4モードでは背景1が大きくなるため、キャンバスも少し大きくする
    widthMultiplier = SCALE_FACTOR * 1.3; // 30%大きく
    heightMultiplier = SCALE_FACTOR * 1.3; // 30%大きく
    console.log(`A4モード: キャンバスサイズを1.3倍に拡大`);
  }
  
  canvas.width = Math.floor(normalWidth * widthMultiplier);
  canvas.height = Math.floor(normalHeight * heightMultiplier);
  
  console.log(`キャンバスを通常サイズに変更: ${canvas.width} x ${canvas.height}`);
}

// 🔸 キャンバスサイズ更新関数を追加
function updateCanvasSize() {
  // 現在の背景に応じてサイズを再計算
  if (backgroundImage && lastBackgroundSrc && lastBackgroundSrc.includes('back2')) {
    setCanvasToPortraitSize();
  } else {
    resetCanvasToNormalSize();
  }
  
  // 🔸 用紙サイズに応じて受信側キャンバスサイズを調整
  setReceiverCanvasSize();
  
  // キャンバスを再描画
  redrawCanvas();
}

function redrawCanvas(withBackground = true) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 🔸 描画エリアの枠表示（dev機能がオンの場合のみ、キャンバス上に描画）
  if (showDrawingAreaFrame) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 0, 0, 0.05)"; // 非常に薄い赤色
    
    // キャンバス中央から描画エリアの位置を計算
    const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
    const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
    const areaLeft = areaCenterX - drawingAreaSize.width / 2;
    const areaTop = areaCenterY - drawingAreaSize.height / 2;
    
    ctx.fillRect(areaLeft, areaTop, drawingAreaSize.width, drawingAreaSize.height);
    
    // 描画エリアの境界線を描画
    ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(areaLeft, areaTop, drawingAreaSize.width, drawingAreaSize.height);
    
    ctx.restore();
  }
  
  // 🔸 背景画像を180度回転して描画
  if (withBackground && backgroundImage) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2); // 中心に移動
    ctx.rotate(Math.PI); // 180度回転
    
    // 🔸 背景画像のサイズを調整
    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    
    if (currentPaperSize === "poster" && lastBackgroundSrc && (lastBackgroundSrc.includes('back3') || lastBackgroundSrc.includes('back4'))) {
      // 背景1,3のポストカードは背景2より少し小さく（0.9倍）
      drawWidth = canvas.width * 0.9;
      drawHeight = canvas.height * 0.9;
    } else if (currentPaperSize === "L") {
      // L判モードでの背景サイズ調整
      if (lastBackgroundSrc && (lastBackgroundSrc.includes('back3') || lastBackgroundSrc.includes('back4'))) {
        // 背景1,3のL判はベースより10%小さく
        drawWidth = canvas.width * 0.90;
        drawHeight = canvas.height * 0.90;
        console.log("🔍 背景1,3のL判サイズ調整: 0.90倍");
      } else if (lastBackgroundSrc && lastBackgroundSrc.includes('back2')) {
        // 背景2のL判はベースより14%小さく
        drawWidth = canvas.width * 0.86;
        drawHeight = canvas.height * 0.86;
        console.log("🔍 背景2のL判サイズ調整: 0.86倍");
      }
    } else if (currentPaperSize === "A4") {
      // A4モードでの背景サイズ調整
      if (lastBackgroundSrc && (lastBackgroundSrc.includes('back3') || lastBackgroundSrc.includes('back4'))) {
        // 背景1,3のA4はベースより8%小さく
        drawWidth = canvas.width * 0.92;
        drawHeight = canvas.height * 0.92;
        console.log("🔍 背景1,3のA4サイズ調整: 0.92倍");
      } else if (lastBackgroundSrc && lastBackgroundSrc.includes('back2')) {
        // 背景2のA4はベースより12%小さく
        drawWidth = canvas.width * 0.88;
        drawHeight = canvas.height * 0.88;
        console.log("🔍 背景2のA4サイズ調整: 0.88倍");
      }
    }
    
    ctx.drawImage(backgroundImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }
  
  // 🔸 筆跡描画（描画エリア調整を適用して180度回転）
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2); // キャンバス中心に移動
  ctx.rotate(Math.PI); // 180度回転（背景と同じ）
  ctx.translate(-canvas.width / 2, -canvas.height / 2); // 元の位置に戻す
  
  drawingData.forEach(cmd => {
    if (cmd.type === "start") {
      ctx.beginPath();
      // 🔸 描画エリア調整を適用した座標変換
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      
      // 描画エリアの中央位置に調整
      const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
      const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
      const areaLeft = areaCenterX - drawingAreaSize.width / 2;
      const areaTop = areaCenterY - drawingAreaSize.height / 2;
      
      ctx.moveTo(areaLeft + scaledX, areaTop + scaledY);
    } else if (cmd.type === "draw") {
      // 🔸 描画エリア調整を適用した座標変換
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      
      // 描画エリアの中央位置に調整
      const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
      const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
      const areaLeft = areaCenterX - drawingAreaSize.width / 2;
      const areaTop = areaCenterY - drawingAreaSize.height / 2;
      
      // ネオンの場合はセグメントごとに新しいパスを作成（送信側と同じ方式）
      if (cmd.color === 'neon' && cmd.neonIndex !== null) {
        ctx.beginPath();
        // 前の位置から移動（前のdrawコマンドの位置を取得）
        const prevCmd = drawingData[drawingData.indexOf(cmd) - 1];
        if (prevCmd && (prevCmd.type === 'start' || prevCmd.type === 'draw')) {
          const prevScaledX = (prevCmd.x / senderCanvasSize.width) * drawingAreaSize.width;
          const prevScaledY = (prevCmd.y / senderCanvasSize.height) * drawingAreaSize.height;
          ctx.moveTo(areaLeft + prevScaledX, areaTop + prevScaledY);
        }
        
        const interpolatedColor = getNeonColorFromIndex(cmd.neonIndex);
        ctx.lineWidth = (cmd.thickness || 4) * (drawingAreaSize.width / senderCanvasSize.width);
        ctx.strokeStyle = interpolatedColor;
        ctx.shadowBlur = 5;
        ctx.shadowColor = interpolatedColor;
        ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
        ctx.stroke();
      } else {
        // 通常の色の場合
        ctx.lineWidth = (cmd.thickness || 4) * (drawingAreaSize.width / senderCanvasSize.width);
        ctx.strokeStyle = cmd.color === 'black' ? '#000' : (cmd.color === 'white' ? '#fff' : (cmd.color === 'green' ? '#008000' : (cmd.color === 'pink' ? '#ff69b4' : (cmd.color || '#000'))));
        ctx.shadowBlur = 0;
        ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
        ctx.stroke();
      }
    }
  });
  
  ctx.restore();
}

socket.onmessage = (event) => {
  const handle = (raw) => {
    try {
      const data = JSON.parse(raw);
      handleMessage(data);
    } catch (e) {
      console.error("JSON parse error:", e);
    }
  };

  if (event.data instanceof Blob) {
    const reader = new FileReader();
    reader.onload = () => handle(reader.result);
    reader.readAsText(event.data);
  } else {
    handle(event.data);
  }
};

function handleMessage(data) {
  console.log("受信メッセージ:", data.type);

  if (data.type === "print") {
    // 🔸 印刷時に用紙サイズ情報を取得
    if (data.paperSize) {
      currentPaperSize = data.paperSize;
      console.log(`印刷用紙サイズ: ${currentPaperSize}`);
    }
    // 🔸 送信ボタンで印刷ペンと同じ処理を実行
    console.log("🔴 送信ボタン押下 → 印刷ペン処理 + アニメーション実行");
    printPen();
    prepareAndRunAnimation();
  } else if (data.type === "paperSize") {
    // 🔸 用紙サイズ変更の通知を受信
    const oldPaperSize = currentPaperSize;
    const oldScaleFactor = SCALE_FACTOR;
    currentPaperSize = data.size;
    console.log(`📄 用紙サイズが${oldPaperSize}から${data.size}に変更されました`);
    
    // 🔸 用紙サイズに応じて拡大率を変更
    if (data.size === "poster") {
      SCALE_FACTOR = 2.4; // A4の4.0倍の60% = 2.4倍
      console.log("🔍 拡大率を2.4倍に変更（ポストカードモード - A4の60%サイズ）");
    } else if (data.size === "L") {
      SCALE_FACTOR = 3.2; // A4の4.0倍の80% = 3.2倍
      console.log("🔍 拡大率を3.2倍に変更（L判モード - A4の80%サイズ）");
    } else {
      SCALE_FACTOR = 4.0;
      console.log("🔍 拡大率を4.0倍に変更（A4モード）");
    }
    
    console.log(`📊 SCALE_FACTOR変更: ${oldScaleFactor} → ${SCALE_FACTOR}`);
    
    // 🔸 キャンバスサイズを再計算
    updateCanvasSize();
    
  } else if (data.type === "background") {
    // 🔸 送信側のキャンバスサイズ情報を保存
    if (data.canvasSize) {
      const oldSenderSize = { ...senderCanvasSize };
      senderCanvasSize = data.canvasSize;
      console.log(`📐 送信側キャンバスサイズ: ${senderCanvasSize.width} x ${senderCanvasSize.height}`);
      
      // 🔸 キャンバスサイズ変更時に描画エリアも連動してスケール
      if (oldSenderSize.width !== 0 && oldSenderSize.height !== 0) {
        const scaleX = senderCanvasSize.width / oldSenderSize.width;
        const scaleY = senderCanvasSize.height / oldSenderSize.height;
        
        // 描画エリアサイズを連動してスケール
        drawingAreaSize.width = Math.round(drawingAreaSize.width * scaleX);
        drawingAreaSize.height = Math.round(drawingAreaSize.height * scaleY);
        
        // 描画エリアの位置（オフセット）も連動してスケール
        drawingAreaOffset.x = Math.round(drawingAreaOffset.x * scaleX);
        drawingAreaOffset.y = Math.round(drawingAreaOffset.y * scaleY);
        
        // GUI入力値も更新
        document.getElementById('centerX').value = drawingAreaOffset.x;
        document.getElementById('centerY').value = drawingAreaOffset.y;
        document.getElementById('areaWidth').value = drawingAreaSize.width;
        document.getElementById('areaHeight').value = drawingAreaSize.height;
        
        console.log(`📏 描画エリアをスケール調整: サイズ${drawingAreaSize.width}x${drawingAreaSize.height}, 位置(${drawingAreaOffset.x}, ${drawingAreaOffset.y}) (倍率: ${scaleX.toFixed(2)}, ${scaleY.toFixed(2)})`);
        
        // 描画エリアが表示中なら更新
        if (showDrawingAreaFrame) {
          showDrawingArea();
        }
      }
    }
    
    if (data.src === "white") {
      backgroundImage = null;
      lastBackgroundSrc = null;
      
      // 🔸 受信側キャンバスサイズを送信側に合わせて設定
      setReceiverCanvasSize();
      redrawCanvas();
    } else {
      const img = new Image();
      const resolved = resolveImagePath(data.src);
      img.src = resolved;
      lastBackgroundSrc = resolved;
      img.onload = () => {
        backgroundImage = img;
        
        // 🔸 受信側キャンバスサイズを送信側に合わせて設定
        setReceiverCanvasSize();
        redrawCanvas();
      };
    }
  } else if (data.type === "clear") {
    drawingData = [];
    redrawCanvas();
  } else if (data.type === "start") {
    // 🔸 座標はスケール変換せずにそのまま保存（描画時に変換）
    drawingData.push({ ...data });
    
    // 🔸 リアルタイム描画（描画エリア調整を適用して180度回転）
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2); // キャンバス中心に移動
    ctx.rotate(Math.PI); // 180度回転（背景と同じ）
    ctx.translate(-canvas.width / 2, -canvas.height / 2); // 元の位置に戻す
    
    // 🔸 描画エリア調整を適用した座標変換
    const scaledX = (data.x / senderCanvasSize.width) * drawingAreaSize.width;
    const scaledY = (data.y / senderCanvasSize.height) * drawingAreaSize.height;
    
    // 描画エリアの中央位置に調整
    const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
    const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
    const areaLeft = areaCenterX - drawingAreaSize.width / 2;
    const areaTop = areaCenterY - drawingAreaSize.height / 2;
    
    ctx.beginPath();
    ctx.moveTo(areaLeft + scaledX, areaTop + scaledY);
    
    // 星エフェクトが有効でスタート時に星を表示
    if (data.starEffect) {
      // 180度回転を考慮した座標変換
      const canvasRect = canvas.getBoundingClientRect();
      // 180度回転後の座標を計算
      const rotatedX = canvas.width - (areaLeft + scaledX);
      const rotatedY = canvas.height - (areaTop + scaledY);
      const pageX = canvasRect.left + rotatedX;
      const pageY = canvasRect.top + rotatedY;
      console.log(`⭐ start時に星エフェクト(180度回転): canvas(${scaledX}, ${scaledY}) -> rotated(${rotatedX}, ${rotatedY}) -> page(${pageX}, ${pageY})`);
      createReceiverStar(pageX, pageY);
    }
    
    // 妖精の粉エフェクトが有効でスタート時に妖精の粉を表示
    console.log(`✨ 妖精の粉チェック: fairyDustEffectEnabled=${fairyDustEffectEnabled}`);
    if (fairyDustEffectEnabled) {
      // 180度回転を考慮した座標変換
      const canvasRect = canvas.getBoundingClientRect();
      // 180度回転後の座標を計算
      const rotatedX = canvas.width - (areaLeft + scaledX);
      const rotatedY = canvas.height - (areaTop + scaledY);
      const pageX = canvasRect.left + rotatedX;
      const pageY = canvasRect.top + rotatedY;
      console.log(`✨ start時に妖精の粉エフェクト(180度回転): canvas(${scaledX}, ${scaledY}) -> rotated(${rotatedX}, ${rotatedY}) -> page(${pageX}, ${pageY})`);
      createReceiverFairyDust(pageX, pageY);
    }
    
    ctx.restore();
  } else if (data.type === "draw") {
    // 🔸 座標はスケール変換せずにそのまま保存（描画時に変換）
    drawingData.push({ ...data });
    
    // 🔸 リアルタイム描画（描画エリア調整を適用して180度回転）
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2); // キャンバス中心に移動
    ctx.rotate(Math.PI); // 180度回転（背景と同じ）
    ctx.translate(-canvas.width / 2, -canvas.height / 2); // 元の位置に戻す
    
    // 🔸 描画エリア調整を適用した座標変換
    const scaledX = (data.x / senderCanvasSize.width) * drawingAreaSize.width;
    const scaledY = (data.y / senderCanvasSize.height) * drawingAreaSize.height;
    
    // 描画エリアの中央位置に調整
    const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
    const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
    const areaLeft = areaCenterX - drawingAreaSize.width / 2;
    const areaTop = areaCenterY - drawingAreaSize.height / 2;
    
    // ペンの太さと色を適用
    const thickness = data.thickness || 4;
    
    // ネオンの場合はセグメントごとに新しいパスを作成（送信側と同じ方式）
    if (data.color === 'neon' && data.neonIndex !== null) {
      ctx.beginPath();
      // 前の位置から移動（前のdrawコマンドの位置を取得）
      const currentIndex = drawingData.length - 1;
      if (currentIndex > 0) {
        const prevData = drawingData[currentIndex - 1];
        if (prevData && (prevData.type === 'start' || prevData.type === 'draw')) {
          const prevScaledX = (prevData.x / senderCanvasSize.width) * drawingAreaSize.width;
          const prevScaledY = (prevData.y / senderCanvasSize.height) * drawingAreaSize.height;
          ctx.moveTo(areaLeft + prevScaledX, areaTop + prevScaledY);
        }
      }
      
      const interpolatedColor = getNeonColorFromIndex(data.neonIndex);
      ctx.lineWidth = thickness * (drawingAreaSize.width / senderCanvasSize.width);
      ctx.strokeStyle = interpolatedColor;
      ctx.shadowBlur = 5;
      ctx.shadowColor = interpolatedColor;
      ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
      ctx.stroke();
    } else {
      // 通常の色の場合
      ctx.lineWidth = thickness * (drawingAreaSize.width / senderCanvasSize.width);
      ctx.strokeStyle = data.color === 'black' ? '#000' : (data.color === 'white' ? '#fff' : (data.color === 'green' ? '#008000' : (data.color === 'pink' ? '#ff69b4' : (data.color || '#000'))));
      ctx.shadowBlur = 0;
      ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
      ctx.stroke();
    }
    
    // 星エフェクトが有効で受信側に星を表示（2回に1回の頻度）
    if (data.starEffect && Math.random() < 0.5) {
      // 180度回転を考慮した座標変換
      const canvasRect = canvas.getBoundingClientRect();
      // 180度回転後の座標を計算
      const rotatedX = canvas.width - (areaLeft + scaledX);
      const rotatedY = canvas.height - (areaTop + scaledY);
      const pageX = canvasRect.left + rotatedX;
      const pageY = canvasRect.top + rotatedY;
      console.log(`⭐ draw時に星エフェクト(180度回転): canvas(${scaledX}, ${scaledY}) -> rotated(${rotatedX}, ${rotatedY}) -> page(${pageX}, ${pageY})`);
      createReceiverStar(pageX, pageY);
    }
    
    // 妖精の粉エフェクトが有効で受信側に妖精の粉を表示（テスト用：毎回表示）
    console.log(`✨ draw時妖精の粉チェック: fairyDustEffectEnabled=${fairyDustEffectEnabled}`);
    if (fairyDustEffectEnabled) {
      // 180度回転を考慮した座標変換
      const canvasRect = canvas.getBoundingClientRect();
      // 180度回転後の座標を計算
      const rotatedX = canvas.width - (areaLeft + scaledX);
      const rotatedY = canvas.height - (areaTop + scaledY);
      const pageX = canvasRect.left + rotatedX;
      const pageY = canvasRect.top + rotatedY;
      console.log(`✨ draw時に妖精の粉エフェクト(180度回転): canvas(${scaledX}, ${scaledY}) -> rotated(${rotatedX}, ${rotatedY}) -> page(${pageX}, ${pageY})`);
      createReceiverFairyDust(pageX, pageY);
    }
    
    ctx.restore();
  } else if (data.type === "playVideo") {
    // 🔸 ビデオ再生処理
    console.log(`📹 ビデオ再生指示を受信（サイズ: ${data.size || 100}%）`);
    if (data.size) {
      currentVideoSize = data.size;
    }
    playVideoWithSize();
  } else if (data.type === "videoSize") {
    // 🔸 ビデオサイズ変更
    currentVideoSize = data.size;
    console.log(`📐 ビデオサイズを${data.size}%に設定`);
  } else if (data.type === "penThickness") {
    // ペンの太さ変更通知を受信
    console.log(`✏️ ペンの太さを${data.thickness}に変更`);
  } else if (data.type === "penColor") {
    // ペンの色変更通知を受信
    console.log(`🎨 ペンの色を${data.color}に変更`);
  } else if (data.type === "starEffect") {
    // 星エフェクト状態変更通知を受信
    starEffectEnabled = data.enabled;
    console.log(`⭐ 星エフェクト: ${starEffectEnabled ? 'ON' : 'OFF'}`);
  } else if (data.type === "fairyDustEffect") {
    // 妖精の粉エフェクト状態変更通知を受信
    fairyDustEffectEnabled = data.enabled;
    console.log(`✨ 妖精の粉エフェクト状態変更: ${fairyDustEffectEnabled ? 'ON' : 'OFF'}`);
    console.log(`✨ 受信した妖精の粉データ:`, data);
  } else if (data.type === "heartEffect") {
    // ハートエフェクト指示を受信
    console.log('💖 送信側からハートエフェクト指示を受信');
    createHeart();
  } else if (data.type === "downloadRotated") {
    // 🔸 180度回転ダウンロード要求を受信
    if (data.paperSize) {
      currentPaperSize = data.paperSize;
      console.log(`📤 180度回転ダウンロード用紙サイズ: ${currentPaperSize}`);
    }
    console.log("🔄 送信ボタン押下 → 180度回転ダウンロード処理実行");
    downloadRotated();
  } else if (data.type === "devSettings") {
    // 🔸 Dev Tool設定受信
    const oldCanvasScale = devCanvasScale;
    devCanvasScale = data.canvasScale || 1.0;
    devRotationWaitTime = data.rotationWaitTime || 5.1;
    console.log(`🔧 Dev設定受信: scale=${devCanvasScale}, wait=${devRotationWaitTime}`);
    
    // 🔸 キャンバススケール変更時に描画エリアも連動してスケール
    if (oldCanvasScale !== 0 && oldCanvasScale !== devCanvasScale) {
      const scaleRatio = devCanvasScale / oldCanvasScale;
      
      // 描画エリアサイズを連動してスケール
      drawingAreaSize.width = Math.round(drawingAreaSize.width * scaleRatio);
      drawingAreaSize.height = Math.round(drawingAreaSize.height * scaleRatio);
      
      // 描画エリアの位置（オフセット）も連動してスケール
      drawingAreaOffset.x = Math.round(drawingAreaOffset.x * scaleRatio);
      drawingAreaOffset.y = Math.round(drawingAreaOffset.y * scaleRatio);
      
      // GUI入力値も更新
      document.getElementById('centerX').value = drawingAreaOffset.x;
      document.getElementById('centerY').value = drawingAreaOffset.y;
      document.getElementById('areaWidth').value = drawingAreaSize.width;
      document.getElementById('areaHeight').value = drawingAreaSize.height;
      
      console.log(`📏 Dev設定による描画エリアスケール調整: サイズ${drawingAreaSize.width}x${drawingAreaSize.height}, 位置(${drawingAreaOffset.x}, ${drawingAreaOffset.y}) (倍率: ${scaleRatio.toFixed(2)})`);
      
      // 描画エリアが表示中なら更新
      if (showDrawingAreaFrame) {
        showDrawingArea();
      }
    }
    
    // キャンバスサイズを即座に適用
    applyCanvasScale();
  } else if (data.type === "printRotatedImage") {
    // 🔸 更に180度回転画像の印刷処理
    console.log("🖨️ 受信側: printRotatedImage メッセージを受信");
    console.log("📥 受信データタイプ:", data.printType);
    console.log("📄 受信用紙サイズ:", data.paperSize);
    
    // ElectronのメインプロセスにWebSocketで受信した画像データを送信
    const { ipcRenderer } = require('electron');
    console.log('🚨 プリンターに印刷命令を送信開始！（更に180度回転）');
    console.log(`📊 印刷データ: 用紙サイズ=${data.paperSize || 'A4'}, タイプ=${data.printType || 'double_rotated'}`);
    
    ipcRenderer.send('save-pdf', {
      imageData: data.imageData,
      printType: data.printType || 'double_rotated',
      paperSize: data.paperSize || 'A4'
    });
    
    console.log('✅ プリンターへの印刷命令送信完了！（更に180度回転）');
    console.log("✅ 更に180度回転画像をElectronに送信完了");
  } else if (data.type === "startRotationAnimation") {
    // 🔸 回転アニメーション開始
    console.log("🎬 回転アニメーション開始");
    console.log(`⏱️ 待機時間: ${data.waitTime}秒`);
    
    // アニメーション実行
    prepareAndRunAnimation(data.waitTime);
  }
}

function sendCanvasToMainProcess() {
  console.log("🖨️ 送信ボタン印刷処理開始");
  console.log(`- 描画エリアサイズ: ${drawingAreaSize.width} x ${drawingAreaSize.height}`);
  console.log(`- drawingData項目数: ${drawingData.length}`);
  console.log(`- senderCanvasSize: ${senderCanvasSize.width} x ${senderCanvasSize.height}`);
  console.log(`- drawingAreaOffset: ${drawingAreaOffset.x}, ${drawingAreaOffset.y}`);
  
  // 🔸 デバッグ：drawingDataの中身を確認
  if (drawingData.length > 0) {
    console.log("📝 drawingData最初の5項目:");
    drawingData.slice(0, 5).forEach((cmd, i) => {
      console.log(`  ${i}: type=${cmd.type}, x=${cmd.x}, y=${cmd.y}`);
    });
  } else {
    console.log("⚠️ drawingDataが空です！描画データが受信されていません。");
  }

  // 🔸 printPen()と同じ処理を使用
  const printCanvas = document.createElement('canvas');
  const printCtx = printCanvas.getContext('2d');
  
  // 印刷用キャンバスサイズを設定
  printCanvas.width = drawingAreaSize.width;
  printCanvas.height = drawingAreaSize.height;
  
  // 背景は透明のまま（描画データのみ）
  
  // 筆跡のみを描画
  drawingData.forEach(cmd => {
    if (cmd.type === "start") {
      printCtx.beginPath();
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      printCtx.moveTo(scaledX, scaledY);
    } else if (cmd.type === "draw") {
      // ペンの太さと色を適用
      const thickness = cmd.thickness || 4;
      printCtx.lineWidth = thickness * (drawingAreaSize.width / senderCanvasSize.width);
      
      // ネオン効果の処理（印刷時も補間色を使用）
      if (cmd.color === 'neon' && cmd.neonIndex !== null) {
        const interpolatedColor = getNeonColorFromIndex(cmd.neonIndex);
        printCtx.strokeStyle = interpolatedColor;
      } else {
        printCtx.strokeStyle = cmd.color === 'black' ? '#000' : (cmd.color === 'white' ? '#fff' : (cmd.color === 'green' ? '#008000' : (cmd.color === 'pink' ? '#ff69b4' : (cmd.color || '#000'))));
      }
      
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      printCtx.lineTo(scaledX, scaledY);
      printCtx.stroke();
    }
  });
  
  // 🔸 Canvas変換を使った180度回転（printPen()と同じ方法）
  console.log(`🔄 送信ボタン印刷: 180度回転処理開始 - キャンバスサイズ: ${printCanvas.width}x${printCanvas.height}`);
  
  const rotatedCanvas = document.createElement('canvas');
  const rotatedCtx = rotatedCanvas.getContext('2d');
  rotatedCanvas.width = printCanvas.width;
  rotatedCanvas.height = printCanvas.height;
  
  // デバッグ: 元画像の内容確認
  const originalData = printCanvas.toDataURL("image/png");
  console.log('🔄 元画像データ:', originalData.substring(0, 100) + '...');
  
  // 現在の印刷キャンバス内容を180度回転してコピー
  rotatedCtx.save();
  rotatedCtx.translate(rotatedCanvas.width, rotatedCanvas.height);
  rotatedCtx.rotate(Math.PI);
  rotatedCtx.drawImage(printCanvas, 0, 0);
  rotatedCtx.restore();
  
  // デバッグ: 回転後画像の内容確認
  const rotatedData = rotatedCanvas.toDataURL("image/png");
  console.log('🔄 回転後画像データ:', rotatedData.substring(0, 100) + '...');
  console.log('🔄 送信ボタン印刷: 180度回転完了');
  
  // 印刷用データを作成
  const imageDataUrl = rotatedCanvas.toDataURL("image/png");
  
  // 🔸 印刷時に用紙サイズ情報も送信
  console.log('🚨 プリンターに印刷命令を送信開始！');
  console.log(`📊 印刷データ: 用紙サイズ=${currentPaperSize}, タイプ=pen`);
  
  ipcRenderer.send("save-pdf", {
    imageData: imageDataUrl,
    paperSize: currentPaperSize,
    printType: "pen"
  });
  
  console.log('✅ プリンターへの印刷命令送信完了！');
  console.log('🖨️ 送信ボタン印刷（180度回転描画データのみ）を実行');
}

// 🔸 受信側キャンバスサイズ設定関数
function setReceiverCanvasSize() {
  // Dev Tool設定を適用したサイズを計算
  const newWidth = Math.floor(senderCanvasSize.width * SCALE_FACTOR * devCanvasScale);
  const newHeight = Math.floor(senderCanvasSize.height * SCALE_FACTOR * devCanvasScale);
  
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;
  
  canvas.width = newWidth;
  canvas.height = newHeight;
  canvas.style.width = newWidth + "px";
  canvas.style.height = newHeight + "px";
  
  // 受信側のキャンバスサイズを記録
  receiverCanvasSize = { width: newWidth, height: newHeight };
  
  console.log(`📐 受信側キャンバスサイズ変更: ${oldWidth}x${oldHeight} → ${newWidth}x${newHeight}`);
  console.log(`📊 計算: ${senderCanvasSize.width} x ${SCALE_FACTOR} x ${devCanvasScale} = ${newWidth}`);
  console.log(`📊 送信側: ${senderCanvasSize.width} x ${senderCanvasSize.height}`);
  console.log(`📊 受信側: ${receiverCanvasSize.width} x ${receiverCanvasSize.height}`);
}

// 🔸 Dev Tool関数
function applyCanvasScale() {
  // 送信側サイズに基づいて再計算
  setReceiverCanvasSize();
  redrawCanvas();
}

function prepareAndRunAnimation(waitTime = null) {
  console.log(`🎬 アニメーション準備開始 (待機時間: ${waitTime}秒)`);
  
  const imageDataUrl = canvas.toDataURL("image/png");
  canvas.style.display = "none";
  const container = document.getElementById("container");

  if (animationImage) {
    container.removeChild(animationImage);
  }

  animationImage = new Image();
  animationImage.src = imageDataUrl;
  // 🔸 アニメーション画像のサイズも拡大したキャンバスに合わせる
  animationImage.style.width = canvas.width + "px";
  animationImage.style.height = canvas.height + "px";
  animationImage.style.display = "block";
  
  // アニメーション画像をキャンバスと同じ位置に配置（その場に止まる）
  animationImage.style.position = "absolute";
  animationImage.style.top = "30px";
  animationImage.style.left = "50%";
  animationImage.style.transform = "translateX(-50%)"; // 初期は反転なし
  animationImage.style.zIndex = "2";
  
  container.appendChild(animationImage);

  runAnimationSequence(waitTime);
}

function runAnimationSequence(waitTime = null) {
  // 🔸 アニメーション画像を直接操作（containerではなく）
  
  // 初期状態を設定（その場に止まる）
  animationImage.style.transition = "none";
  animationImage.style.transform = "translateX(-50%)";

  // 🔸 即座に回転アニメーション開始（待機なし）
  let animationStartDelay = 100; // 0.1秒後に即座に開始
  console.log("🎬 即座に回転アニメーション開始");

  // 🔸 調整されたタイミングでアニメーション開始
  setTimeout(() => {
    animationImage.style.transition = "transform 1.5s ease";
    animationImage.style.transform = "translateX(-50%) rotate(180deg)"; // 180度回転

    // 音声再生は削除されました

    // 🔸 回転完了後の待機時間（書き手側の設定またはDev Tool設定を使用）
    let rotationWaitTime;
    if (waitTime !== null) {
      // 書き手側から送信された待機時間を使用
      rotationWaitTime = waitTime * 1000; // 秒をmsに変換
      console.log(`⏰ 書き手側設定：回転後${waitTime}秒待機してから移動開始`);
    } else if (currentPaperSize === "A4") {
      rotationWaitTime = devRotationWaitTime * 1000; // Dev設定の秒数をmsに変換
      console.log(`⏰ ${currentPaperSize}モード：回転後${devRotationWaitTime}秒待機してから移動開始`);
    } else {
      rotationWaitTime = 1100; // ポスター：従来通り1.1秒
      console.log("⏰ ポスターモード：回転後1.1秒待機してから移動開始");
    }
    
    setTimeout(() => {
      animationImage.style.transition = "transform 2s ease";
      
      // 🔸 用紙サイズに応じて移動距離を調整（ウィンドウ下部を完全に通過）
      let moveDistance;
      const windowHeight = window.innerHeight || 1000; // ウィンドウ高さを取得
      const extraDistance = 500; // さらに500px下まで移動
      
      if (currentPaperSize === "poster") {
        moveDistance = -(windowHeight + extraDistance); // ウィンドウ高さ + 500px
        console.log(`📦 ポスターモード：移動距離 ${moveDistance}px（ウィンドウ高さ: ${windowHeight}px）`);
      } else if (currentPaperSize === "L") {
        moveDistance = -(windowHeight + extraDistance); // ウィンドウ高さ + 500px  
        console.log(`📦 L版モード：移動距離 ${moveDistance}px（ウィンドウ高さ: ${windowHeight}px）`);
      } else {
        moveDistance = -(windowHeight + extraDistance); // ウィンドウ高さ + 500px  
        console.log(`📦 A4モード：移動距離 ${moveDistance}px（ウィンドウ高さ: ${windowHeight}px）`);
      }
      
      // 🔸 下方向への移動
      animationImage.style.transform = `translateX(-50%) rotate(180deg) translateY(${moveDistance}px)`;

      // 🔸 用紙サイズに応じて待機時間を調整
      let waitTime;
      if (currentPaperSize === "poster") {
        waitTime = 4000; // ポスター：移動完了後2秒待機（2秒 + 2秒 = 4秒）
        console.log("⏰ ポスターモード：移動後4秒待機");
      } else if (currentPaperSize === "L") {
        waitTime = 2000; // L版：従来通り2秒
        console.log("⏰ L版モード：移動後2秒待機");
      } else {
        waitTime = 2000; // A4：従来通り2秒
        console.log("⏰ A4モード：移動後2秒待機");
      }

      setTimeout(() => {
        if (animationImage && animationImage.parentNode) {
          animationImage.parentNode.removeChild(animationImage);
          animationImage = null;
        }

        drawingData = [];
        canvas.style.display = "block";

        if (lastBackgroundSrc) {
          const img = new Image();
          img.src = lastBackgroundSrc;
          img.onload = () => {
            backgroundImage = img;
            redrawCanvas();
          };
        } else {
          backgroundImage = null;
          redrawCanvas();
        }
      }, waitTime); // 🔸 用紙サイズに応じた待機時間

    }, rotationWaitTime + 1500); // 🔸 回転完了（1.5秒）+ 用紙サイズに応じた待機時間

  }, animationStartDelay); // 🔸 用紙サイズに応じた遅延時間
}

// 🔸 ビデオサイズ対応再生関数
function playVideoWithSize() {
  try {
    console.log(`📹 ビデオ再生開始（サイズ: ${currentVideoSize}%）`);
    
    // 既存のビデオ要素があれば削除
    const existingVideo = document.getElementById('resizableVideo');
    if (existingVideo) {
      existingVideo.remove();
    }
    
    // ビデオ要素を作成
    const video = document.createElement('video');
    video.id = 'resizableVideo';
    video.src = resolveImagePath('signVideo.mp4');
    video.autoplay = true;
    video.controls = false;
    video.style.position = 'fixed';
    video.style.zIndex = '9999';
    video.style.backgroundColor = 'black';
    video.style.transform = 'rotate(180deg)';
    
    // サイズに応じて配置を変更
    if (currentVideoSize === 100) {
      // 100%: フルスクリーン
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '100vw';
      video.style.height = '100vh';
      video.style.objectFit = 'cover';
    } else {
      // 90%, 80%: ウィンドウ中央に配置、縮小表示
      video.style.top = '50%';
      video.style.left = '50%';
      video.style.transform = 'translate(-50%, -50%) rotate(180deg)';
      video.style.width = `${currentVideoSize}vw`;
      video.style.height = `${currentVideoSize}vh`;
      video.style.objectFit = 'contain';
    }
    
    // キャンバスを隠す
    canvas.style.display = 'none';
    
    // ビデオをDOMに追加
    document.body.appendChild(video);
    
    // ビデオ終了時の処理
    video.addEventListener('ended', () => {
      console.log("📹 ビデオ再生終了");
      video.remove();
      canvas.style.display = 'block';
      redrawCanvas();
    });
    
    // エラー処理
    video.addEventListener('error', (e) => {
      console.error("❌ ビデオ再生エラー:", e);
      video.remove();
      canvas.style.display = 'block';
      alert('ビデオファイルが見つかりません: signVideo.mp4');
    });
    
    console.log(`✅ ビデオ再生設定完了（${currentVideoSize}%）`);
    
  } catch (error) {
    console.error("❌ ビデオ再生に失敗:", error);
  }
}

// 🔸 Dev Panel GUI機能
function toggleDevPanel() {
  const panel = document.getElementById('devPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    // DEVパネルを開いた時に自動的に描画エリアを表示
    showDrawingArea();
  } else {
    panel.style.display = 'none';
    // DEVパネルを閉じた時に描画エリアも非表示にする
    hideDrawingArea();
  }
}

function showDrawingArea() {
  const centerX = parseInt(document.getElementById('centerX').value) || 0;
  const centerY = parseInt(document.getElementById('centerY').value) || 0;
  const width = parseInt(document.getElementById('areaWidth').value) || 630;
  const height = parseInt(document.getElementById('areaHeight').value) || 450;
  
  const drawingArea = document.getElementById('drawingArea');
  const canvas = document.getElementById('drawCanvas');
  const canvasRect = canvas.getBoundingClientRect();
  
  // キャンバス中央から相対位置を計算
  const canvasCenterX = canvasRect.left + canvasRect.width / 2;
  const canvasCenterY = canvasRect.top + canvasRect.height / 2;
  
  const areaLeft = canvasCenterX + centerX - width / 2;
  const areaTop = canvasCenterY + centerY - height / 2;
  
  drawingArea.style.left = areaLeft + 'px';
  drawingArea.style.top = areaTop + 'px';
  drawingArea.style.width = width + 'px';
  drawingArea.style.height = height + 'px';
  drawingArea.style.display = 'block';
  
  // 描画エリアの枠表示を有効にする
  showDrawingAreaFrame = true;
  
  // ドラッグイベントリスナーを追加（初回のみ）
  if (!isDragSetupComplete) {
    setupDragEvents();
    isDragSetupComplete = true;
  }
  
  // キャンバスを再描画して枠を表示
  redrawCanvas();
  
  console.log(`📐 描画エリア表示: ${width}x${height} at (${centerX}, ${centerY})`);
}

function hideDrawingArea() {
  document.getElementById('drawingArea').style.display = 'none';
  // DEVパネルが開いている間は枠表示を維持
  const devPanel = document.getElementById('devPanel');
  if (devPanel.style.display === 'none') {
    // DEVパネルが閉じている時のみ枠を非表示
    showDrawingAreaFrame = false;
    // キャンバスを再描画して枠を非表示
    redrawCanvas();
  }
}

function applyDrawingArea() {
  const centerX = parseInt(document.getElementById('centerX').value) || 0;
  const centerY = parseInt(document.getElementById('centerY').value) || 0;
  const width = parseInt(document.getElementById('areaWidth').value) || 842;
  const height = parseInt(document.getElementById('areaHeight').value) || 595;
  
  // 描画エリア設定を更新
  drawingAreaOffset.x = centerX;
  drawingAreaOffset.y = centerY;
  drawingAreaSize.width = width;
  drawingAreaSize.height = height;
  
  console.log(`✅ 描画エリア適用: オフセット(${centerX}, ${centerY}), サイズ${width}x${height}`);
  
  // キャンバスを再描画
  redrawCanvas();
  
  // 適用後は自動的に描画エリアを非表示にする
  hideDrawingArea();
}

function resetDrawingArea() {
  // デフォルト値にリセット
  document.getElementById('centerX').value = 0;
  document.getElementById('centerY').value = 0;
  document.getElementById('areaWidth').value = 630;
  document.getElementById('areaHeight').value = 450;
  
  drawingAreaOffset = { x: 0, y: 0 };
  drawingAreaSize = { width: 630, height: 450 };
  
  hideDrawingArea();
  redrawCanvas();
  
  console.log('🔄 描画エリアをリセットしました');
}

// 🔸 ドラッグ機能のセットアップ
function setupDragEvents() {
  const drawingArea = document.getElementById('drawingArea');
  const resizeHandles = drawingArea.querySelectorAll('.resize-handle');
  
  // 描画エリア本体のドラッグイベント
  drawingArea.addEventListener('mousedown', handleAreaMouseDown);
  
  // リサイズハンドルのドラッグイベント
  resizeHandles.forEach(handle => {
    handle.addEventListener('mousedown', handleResizeMouseDown);
  });
  
  // グローバルマウスイベント（重複登録を防ぐ）
  if (!isDragSetupComplete) {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
  
  console.log('🖱️ ドラッグイベントセットアップ完了');
}

function handleAreaMouseDown(e) {
  if (e.target.classList.contains('resize-handle')) return;
  
  isDragging = true;
  dragStartPos.x = e.clientX;
  dragStartPos.y = e.clientY;
  
  const drawingArea = document.getElementById('drawingArea');
  const rect = drawingArea.getBoundingClientRect();
  dragStartAreaPos.x = rect.left;
  dragStartAreaPos.y = rect.top;
  
  e.preventDefault();
  console.log('🖱️ 描画エリア移動開始');
}

function handleResizeMouseDown(e) {
  isResizing = true;
  resizeDirection = e.target.className.replace('resize-handle ', '');
  
  dragStartPos.x = e.clientX;
  dragStartPos.y = e.clientY;
  
  const drawingArea = document.getElementById('drawingArea');
  const rect = drawingArea.getBoundingClientRect();
  dragStartAreaPos.x = rect.left;
  dragStartAreaPos.y = rect.top;
  dragStartAreaSize.width = rect.width;
  dragStartAreaSize.height = rect.height;
  
  e.preventDefault();
  e.stopPropagation();
  console.log(`🔧 リサイズ開始: ${resizeDirection}`);
}

function handleMouseMove(e) {
  if (!isDragging && !isResizing) return;
  
  e.preventDefault(); // デフォルトの動作を防止
  
  const deltaX = e.clientX - dragStartPos.x;
  const deltaY = e.clientY - dragStartPos.y;
  const drawingArea = document.getElementById('drawingArea');
  
  if (isDragging) {
    // 移動処理
    const newLeft = dragStartAreaPos.x + deltaX;
    const newTop = dragStartAreaPos.y + deltaY;
    
    drawingArea.style.left = newLeft + 'px';
    drawingArea.style.top = newTop + 'px';
    
    // リアルタイムで入力値を更新
    updateInputValues();
    
    // キャンバス上の枠も更新
    if (showDrawingAreaFrame) {
      redrawCanvas();
    }
  } else if (isResizing) {
    // リサイズ処理
    let newLeft = dragStartAreaPos.x;
    let newTop = dragStartAreaPos.y;
    let newWidth = dragStartAreaSize.width;
    let newHeight = dragStartAreaSize.height;
    
    switch (resizeDirection) {
      case 'nw':
        newLeft += deltaX;
        newTop += deltaY;
        newWidth -= deltaX;
        newHeight -= deltaY;
        break;
      case 'n':
        newTop += deltaY;
        newHeight -= deltaY;
        break;
      case 'ne':
        newTop += deltaY;
        newWidth += deltaX;
        newHeight -= deltaY;
        break;
      case 'w':
        newLeft += deltaX;
        newWidth -= deltaX;
        break;
      case 'e':
        newWidth += deltaX;
        break;
      case 'sw':
        newLeft += deltaX;
        newWidth -= deltaX;
        newHeight += deltaY;
        break;
      case 's':
        newHeight += deltaY;
        break;
      case 'se':
        newWidth += deltaX;
        newHeight += deltaY;
        break;
    }
    
    // 最小サイズ制限
    if (newWidth < 50) newWidth = 50;
    if (newHeight < 50) newHeight = 50;
    
    drawingArea.style.left = newLeft + 'px';
    drawingArea.style.top = newTop + 'px';
    drawingArea.style.width = newWidth + 'px';
    drawingArea.style.height = newHeight + 'px';
    
    // リアルタイムで入力値を更新
    updateInputValues();
    
    // キャンバス上の枠も更新
    if (showDrawingAreaFrame) {
      redrawCanvas();
    }
  }
}

function handleMouseUp(e) {
  if (isDragging || isResizing) {
    console.log('🖱️ ドラッグ操作完了');
    isDragging = false;
    isResizing = false;
    resizeDirection = null;
  }
}

function updateInputValues() {
  const drawingArea = document.getElementById('drawingArea');
  const canvas = document.getElementById('drawCanvas');
  const canvasRect = canvas.getBoundingClientRect();
  const areaRect = drawingArea.getBoundingClientRect();
  
  // キャンバス中央からの相対位置を計算
  const canvasCenterX = canvasRect.left + canvasRect.width / 2;
  const canvasCenterY = canvasRect.top + canvasRect.height / 2;
  const areaCenterX = areaRect.left + areaRect.width / 2;
  const areaCenterY = areaRect.top + areaRect.height / 2;
  
  const offsetX = Math.round(areaCenterX - canvasCenterX);
  const offsetY = Math.round(areaCenterY - canvasCenterY);
  const width = Math.round(areaRect.width);
  const height = Math.round(areaRect.height);
  
  // GUI入力値を更新
  document.getElementById('centerX').value = offsetX;
  document.getElementById('centerY').value = offsetY;
  document.getElementById('areaWidth').value = width;
  document.getElementById('areaHeight').value = height;
  
  // 内部設定値も更新
  drawingAreaOffset.x = offsetX;
  drawingAreaOffset.y = offsetY;
  drawingAreaSize.width = width;
  drawingAreaSize.height = height;
}

// 🔸 印刷物プレビュー機能
function showPrintPreview() {
  const modal = document.getElementById('printPreviewModal');
  const previewCanvas = document.getElementById('printPreviewCanvas');
  const previewCtx = previewCanvas.getContext('2d');
  
  // プレビュー用キャンバスサイズを設定（実際の印刷サイズ）
  previewCanvas.width = drawingAreaSize.width;
  previewCanvas.height = drawingAreaSize.height;
  
  // プレビュー用キャンバスを初期化
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  
  // 背景を白で塗りつぶし
  previewCtx.fillStyle = '#ffffff';
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  
  // 背景画像があれば描画
  if (backgroundImage) {
    previewCtx.drawImage(backgroundImage, 0, 0, previewCanvas.width, previewCanvas.height);
  }
  
  // 筆跡を描画（180度回転せずにそのまま）
  drawingData.forEach(cmd => {
    if (cmd.type === "start") {
      previewCtx.beginPath();
      // 送信側から受信側への座標変換
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      previewCtx.moveTo(scaledX, scaledY);
    } else if (cmd.type === "draw") {
      // ペンの太さと色を適用
      const thickness = cmd.thickness || 4;
      previewCtx.lineWidth = thickness * (drawingAreaSize.width / senderCanvasSize.width);
      
      // ネオン効果の処理（プレビューでも表示）
      if (cmd.color === 'neon' && cmd.neonIndex !== null) {
        const interpolatedColor = getNeonColorFromIndex(cmd.neonIndex);
        previewCtx.strokeStyle = interpolatedColor;
        previewCtx.shadowBlur = 5;
        previewCtx.shadowColor = interpolatedColor;
      } else {
        previewCtx.strokeStyle = cmd.color === 'black' ? '#000' : (cmd.color === 'white' ? '#fff' : (cmd.color === 'green' ? '#008000' : (cmd.color === 'pink' ? '#ff69b4' : (cmd.color || '#000'))));
        previewCtx.shadowBlur = 0;
      }
      
      // 送信側から受信側への座標変換
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      previewCtx.lineTo(scaledX, scaledY);
      previewCtx.stroke();
    }
  });
  
  // モーダルを表示
  modal.style.display = 'flex';
  
  console.log('📋 印刷物プレビューを表示');
}

function closePrintPreview() {
  const modal = document.getElementById('printPreviewModal');
  modal.style.display = 'none';
  console.log('📋 印刷物プレビューを閉じました');
}

// 🔸 印刷フル機能（背景込み）
function printFull() {
  const printCanvas = document.createElement('canvas');
  const printCtx = printCanvas.getContext('2d');
  
  // 印刷用キャンバスサイズを設定
  printCanvas.width = drawingAreaSize.width;
  printCanvas.height = drawingAreaSize.height;
  
  // 背景を白で塗りつぶし
  printCtx.fillStyle = '#ffffff';
  printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);
  
  // 背景画像があれば描画
  if (backgroundImage) {
    printCtx.drawImage(backgroundImage, 0, 0, printCanvas.width, printCanvas.height);
  }
  
  // 筆跡を描画
  drawingData.forEach(cmd => {
    if (cmd.type === "start") {
      printCtx.beginPath();
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      printCtx.moveTo(scaledX, scaledY);
    } else if (cmd.type === "draw") {
      printCtx.lineWidth = 4 * (drawingAreaSize.width / senderCanvasSize.width);
      printCtx.strokeStyle = "#000";
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      printCtx.lineTo(scaledX, scaledY);
      printCtx.stroke();
    }
  });
  
  // 🔸 Canvas変換を使った180度回転（送信側と同じ方法）
  console.log(`🔄 フル印刷: 180度回転処理開始 - キャンバスサイズ: ${printCanvas.width}x${printCanvas.height}`);
  
  const rotatedCanvas = document.createElement('canvas');
  const rotatedCtx = rotatedCanvas.getContext('2d');
  rotatedCanvas.width = printCanvas.width;
  rotatedCanvas.height = printCanvas.height;
  
  // デバッグ: 元画像の内容確認
  const originalData = printCanvas.toDataURL("image/png");
  console.log('🔄 元画像データ:', originalData.substring(0, 100) + '...');
  
  // 現在の印刷キャンバス内容を180度回転してコピー
  rotatedCtx.save();
  rotatedCtx.translate(rotatedCanvas.width, rotatedCanvas.height);
  rotatedCtx.rotate(Math.PI);
  rotatedCtx.drawImage(printCanvas, 0, 0);
  rotatedCtx.restore();
  
  // デバッグ: 回転後画像の内容確認
  const rotatedData = rotatedCanvas.toDataURL("image/png");
  console.log('🔄 回転後画像データ:', rotatedData.substring(0, 100) + '...');
  console.log('🔄 フル印刷: 180度回転完了');
  
  // 印刷用データを作成
  try {
    const imageDataUrl = rotatedCanvas.toDataURL("image/png");
    console.log('🔄 フル印刷: 画像データ作成完了', imageDataUrl.substring(0, 100) + '...');
    
    // Electronのメインプロセスに印刷データを送信
    if (typeof ipcRenderer !== 'undefined') {
      ipcRenderer.send("save-pdf", {
        imageData: imageDataUrl,
        paperSize: currentPaperSize,
        printType: "full"
      });
      console.log('📤 フル印刷データをメインプロセスに送信完了');
    } else {
      console.error('❌ ipcRenderer が利用できません');
    }
    
    console.log('🖨️ フル印刷（背景込み）を実行');
  } catch (error) {
    console.error('❌ フル印刷でエラー発生:', error);
  }
}

// 🔸 印刷ペン機能（描画データのみ）
function printPen() {
  const printCanvas = document.createElement('canvas');
  const printCtx = printCanvas.getContext('2d');
  
  // 印刷用キャンバスサイズを設定
  printCanvas.width = drawingAreaSize.width;
  printCanvas.height = drawingAreaSize.height;
  
  // 背景は透明のまま（描画データのみ）
  
  // まず通常の描画を行う
  drawingData.forEach(cmd => {
    if (cmd.type === "start") {
      printCtx.beginPath();
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      printCtx.moveTo(scaledX, scaledY);
    } else if (cmd.type === "draw") {
      // ペンの太さと色を適用
      const thickness = cmd.thickness || 4;
      printCtx.lineWidth = thickness * (drawingAreaSize.width / senderCanvasSize.width);
      
      // ネオン効果の処理（印刷時も補間色を使用）
      if (cmd.color === 'neon' && cmd.neonIndex !== null) {
        const interpolatedColor = getNeonColorFromIndex(cmd.neonIndex);
        printCtx.strokeStyle = interpolatedColor;
      } else {
        printCtx.strokeStyle = cmd.color === 'black' ? '#000' : (cmd.color === 'white' ? '#fff' : (cmd.color === 'green' ? '#008000' : (cmd.color === 'pink' ? '#ff69b4' : (cmd.color || '#000'))));
      }
      
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      printCtx.lineTo(scaledX, scaledY);
      printCtx.stroke();
    }
  });
  
  // 🔸 Canvas変換を使った180度回転（送信側と同じ方法）
  console.log(`🔄 ペン印刷: 180度回転処理開始 - キャンバスサイズ: ${printCanvas.width}x${printCanvas.height}`);
  
  const rotatedCanvas = document.createElement('canvas');
  const rotatedCtx = rotatedCanvas.getContext('2d');
  rotatedCanvas.width = printCanvas.width;
  rotatedCanvas.height = printCanvas.height;
  
  // デバッグ: 元画像の内容確認
  const originalData = printCanvas.toDataURL("image/png");
  console.log('🔄 元画像データ:', originalData.substring(0, 100) + '...');
  
  // 現在の印刷キャンバス内容を180度回転してコピー
  rotatedCtx.save();
  rotatedCtx.translate(rotatedCanvas.width, rotatedCanvas.height);
  rotatedCtx.rotate(Math.PI);
  rotatedCtx.drawImage(printCanvas, 0, 0);
  rotatedCtx.restore();
  
  // デバッグ: 回転後画像の内容確認
  const rotatedData = rotatedCanvas.toDataURL("image/png");
  console.log('🔄 回転後画像データ:', rotatedData.substring(0, 100) + '...');
  console.log('🔄 ペン印刷: 180度回転完了');
  
  // 印刷用データを作成
  try {
    const imageDataUrl = rotatedCanvas.toDataURL("image/png");
    console.log('🔄 ペン印刷: 画像データ作成完了', imageDataUrl.substring(0, 100) + '...');
    
    // Electronのメインプロセスに印刷データを送信
    if (typeof ipcRenderer !== 'undefined') {
      ipcRenderer.send("save-pdf", {
        imageData: imageDataUrl,
        paperSize: currentPaperSize,
        printType: "pen"
      });
      console.log('📤 ペン印刷データをメインプロセスに送信完了');
    } else {
      console.error('❌ ipcRenderer が利用できません');
    }
    
    console.log('🖨️ ペン印刷（描画データのみ）を実行');
  } catch (error) {
    console.error('❌ ペン印刷でエラー発生:', error);
  }
}

// 🔸 180度回転ダウンロード機能
function downloadRotated() {
  const downloadCanvas = document.createElement('canvas');
  const downloadCtx = downloadCanvas.getContext('2d');
  
  // ダウンロード用キャンバスサイズを設定
  downloadCanvas.width = drawingAreaSize.width;
  downloadCanvas.height = drawingAreaSize.height;
  
  // 背景を白で塗りつぶし
  downloadCtx.fillStyle = '#ffffff';
  downloadCtx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
  
  // 筆跡のみを描画
  drawingData.forEach(cmd => {
    if (cmd.type === "start") {
      downloadCtx.beginPath();
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      downloadCtx.moveTo(scaledX, scaledY);
    } else if (cmd.type === "draw") {
      // ペンの太さと色を適用
      const thickness = cmd.thickness || 4;
      downloadCtx.lineWidth = thickness * (drawingAreaSize.width / senderCanvasSize.width);
      
      // ネオン効果の処理
      if (cmd.color === 'neon' && cmd.neonIndex !== null) {
        const interpolatedColor = getNeonColorFromIndex(cmd.neonIndex);
        downloadCtx.strokeStyle = interpolatedColor;
      } else {
        downloadCtx.strokeStyle = cmd.color === 'black' ? '#000' : (cmd.color === 'white' ? '#fff' : (cmd.color === 'green' ? '#008000' : (cmd.color === 'pink' ? '#ff69b4' : (cmd.color || '#000'))));
      }
      
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      downloadCtx.lineTo(scaledX, scaledY);
      downloadCtx.stroke();
    }
  });
  
  // 🔸 180度回転済みの新しいキャンバスを作成
  console.log(`🔄 180度回転ダウンロード: 回転処理開始`);
  const rotatedCanvas = document.createElement('canvas');
  const rotatedCtx = rotatedCanvas.getContext('2d');
  rotatedCanvas.width = downloadCanvas.width;
  rotatedCanvas.height = downloadCanvas.height;
  
  // 現在のダウンロードキャンバス内容を180度回転してコピー
  rotatedCtx.save();
  rotatedCtx.translate(rotatedCanvas.width, rotatedCanvas.height);
  rotatedCtx.rotate(Math.PI);
  rotatedCtx.drawImage(downloadCanvas, 0, 0);
  rotatedCtx.restore();
  
  console.log('🔄 180度回転ダウンロード: 回転完了');
  
  // ダウンロード用データを作成
  try {
    const imageDataUrl = rotatedCanvas.toDataURL("image/png");
    console.log('🔄 180度回転ダウンロード: 画像データ作成完了');
    
    // ダウンロードリンクを作成
    const link = document.createElement('a');
    const now = new Date();
    const fileName = `rotated_${now.getFullYear()}${(now.getMonth() + 1)
      .toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now
      .getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now
      .getSeconds().toString().padStart(2, "0")}.png`;
    
    link.download = fileName;
    link.href = imageDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('📥 180度回転画像ダウンロード完了:', fileName);
  } catch (error) {
    console.error('❌ 180度回転ダウンロードでエラー発生:', error);
  }
}

// 🔸 フルスクリーン切り替え機能
function toggleFullscreen() {
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send('toggle-fullscreen');
    console.log('🖥️ フルスクリーンモード切り替え');
  } else {
    console.log('❌ フルスクリーン機能はElectron環境でのみ利用可能');
  }
}

// 🔸 フルスクリーン状態変更の受信
if (typeof ipcRenderer !== 'undefined') {
  ipcRenderer.on('fullscreen-changed', (event, isFullScreen) => {
    const devButton = document.getElementById('devButton');
    const reviewButton = document.getElementById('reviewButton');
    
    if (isFullScreen) {
      // フルスクリーン時：ボタンを透明にする（見えないが押せる）
      if (devButton) devButton.style.opacity = '0.01';
      if (reviewButton) reviewButton.style.opacity = '0.01';
      console.log('🖥️ フルスクリーンモード：ボタンを透明化');
    } else {
      // ウィンドウモード時：ボタンを元に戻す
      if (devButton) devButton.style.opacity = '1';
      if (reviewButton) reviewButton.style.opacity = '1';
      console.log('🖥️ ウィンドウモード：ボタンを表示');
    }
  });
}