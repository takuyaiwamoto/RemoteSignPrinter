const { ipcRenderer } = require("electron");
const path = require("path");
const crypto = require("crypto");

// 🔸 拡大率を設定 (デフォルト4.0倍、ポスター時は2.4倍=A4の60%)
let SCALE_FACTOR = 4.0;

// 🤖 SwitchBot API設定
const SWITCHBOT_CONFIG = {
  token: "868df462ea398ddd4c43c4241adf95d76956fe461e364731466442bef7cbe1bb2b765c3ba74ad6d0be9f1cdc6ce9fe7b",
  secret: "bfea0c53da5613e9ef5b577353b9f874",
  deviceId: "E13D0506342B",
  apiUrl: "https://api.switch-bot.com/v1.1"
};

// 🤖 SwitchBot API署名生成関数
function generateSwitchBotSignature() {
  const t = Date.now();
  const nonce = crypto.randomBytes(16).toString('base64');
  const data = SWITCHBOT_CONFIG.token + t + nonce;
  const signTerm = crypto.createHmac('sha256', SWITCHBOT_CONFIG.secret)
    .update(Buffer.from(data, 'utf-8'))
    .digest();
  const sign = signTerm.toString('base64');
  
  return { t, nonce, sign };
}

// 🤖 SwitchBotボット押下関数
async function pressSwitchBot() {
  try {
    console.log("🤖 SwitchBotボット押下開始...");
    
    const { t, nonce, sign } = generateSwitchBotSignature();
    
    const response = await fetch(`${SWITCHBOT_CONFIG.apiUrl}/devices/${SWITCHBOT_CONFIG.deviceId}/commands`, {
      method: 'POST',
      headers: {
        'Authorization': SWITCHBOT_CONFIG.token,
        'sign': sign,
        't': t.toString(),
        'nonce': nonce,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        command: 'press',
        parameter: 'default',
        commandType: 'command'
      })
    });
    
    const result = await response.json();
    console.log("🤖 SwitchBotレスポンス:", result);
    
    if (result.statusCode === 100) {
      console.log("✅ SwitchBotボット押下成功");
      return true;
    } else {
      console.error("❌ SwitchBotボット押下失敗:", result);
      return false;
    }
  } catch (error) {
    console.error("❌ SwitchBotエラー:", error);
    return false;
  }
}

// 🤖 SwitchBotボット連続押下関数（2秒間隔で2回押下）
async function executeSwitchBotSequence() {
  try {
    console.log("🔴 SwitchBot物理ボット押下シーケンス開始");
    
    // 1回目の押下
    console.log("🔴 SwitchBot物理ボット押下（1回目）");
    await pressSwitchBot();
    
    // 2秒待機
    console.log("⏰ 2秒待機...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2回目の押下
    console.log("🔴 SwitchBot物理ボット押下（2回目）");
    await pressSwitchBot();
    
    console.log("🔴 SwitchBot物理ボット押下シーケンス完了");
  } catch (error) {
    console.error("❌ SwitchBotシーケンスエラー:", error);
  }
}

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

// ハートエフェクト関数（受信側用）
function createReceiverHeart(x, y) {
  // console.log(`💖 受信側にハートを生成開始: (${x}, ${y})`);
  
  // ハートを少数生成（1-3個）
  const heartCount = Math.floor(Math.random() * 3) + 1;
  // console.log(`💖 生成するハートの数: ${heartCount}`);
  
  for (let i = 0; i < heartCount; i++) {
    const heart = document.createElement('div');
    heart.className = 'receiver-drawing-heart';
    
    // ペン先により近い範囲にランダム配置（18px範囲）
    const offsetX = (Math.random() - 0.5) * 18;
    const offsetY = (Math.random() - 0.5) * 18;
    
    const finalX = x + offsetX;
    const finalY = y + offsetY;
    
    heart.style.left = finalX + 'px';
    heart.style.top = finalY + 'px';
    
    // ランダムなピンク系の色
    const colors = ['#ff1493', '#ff69b4', '#ff6347', '#ff1493', '#db7093', '#c71585'];
    const heartColor = colors[Math.floor(Math.random() * colors.length)];
    
    heart.style.background = heartColor;
    heart.style.boxShadow = `0 0 8px ${heartColor}, 0 0 16px ${heartColor}`;
    
    // ランダムな飛び散り方向とアニメーション遅延
    const randomDirection = (Math.random() - 0.5) * 60; // -30度から30度
    heart.style.setProperty('--float-direction', randomDirection + 'deg');
    heart.style.animationDelay = (Math.random() * 0.3) + 's';
    
    // 疑似要素の色も更新
    heart.style.setProperty('--heart-color', heartColor);
    
    // 位置を固定
    heart.style.position = 'fixed';
    heart.style.zIndex = '9998';
    
    document.body.appendChild(heart);
    // console.log(`💖 ハート${i+1}をDOMに追加:`, heart);
    // console.log(`💖 ハート${i+1}の位置: left=${finalX}px, top=${finalY}px`);
    
    // アニメーション終了後にハートを削除
    setTimeout(() => {
      if (heart.parentNode) {
        heart.parentNode.removeChild(heart);
        // console.log('💖 受信側のハートを削除');
      }
    }, 1500);
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
  // console.log('💖 ハート生成開始（受信側）');
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
  // console.log('💖 ハートをDOMに追加（受信側）:', heart);
  
  // 音楽再生（受信側では無効化して重複を防ぐ）
  // const audio = new Audio('./poyo.mp3');
  // audio.play().catch(e => console.log('音楽再生エラー:', e));
  
  // アニメーション終了後削除（スタイルも削除）
  setTimeout(() => {
    if (heart.parentNode) {
      heart.parentNode.removeChild(heart);
      // console.log('💖 ハート削除（受信側）');
    }
    if (style.parentNode) {
      style.parentNode.removeChild(style);
      // console.log('💖 スタイル削除（受信側）');
    }
  }, 3000);
}

// lキー連続押下の管理
let lKeyPressCount = 0;
let lKeyPressTimer = null;
let specialWindow = null;
let doorAnimationInProgress = false; // 扉演出中フラグ

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
  // console.log('✨ 特別ハート生成開始');
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
  // console.log(`✨ 特別ハートをDOMに追加: x=${randomX}px`);
  
  // 音楽再生（受信側では無効化して重複を防ぐ）
  // const audio = new Audio('./poyo.mp3');
  // audio.play().catch(e => console.log('音楽再生エラー:', e));
  
  // 0.8秒後（画面上部到達時）に透明ウィンドウにハートを追加
  setTimeout(() => {
    // console.log('📤 透明ウィンドウへのハート送信実行:', randomX);
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
  // console.log('🎉 特別演出開始！30個の大きなハートを生成');
  
  // renzoku.mp3を再生
  const audio = new Audio('./renzoku.mp3');
  audio.volume = 0.7;
  audio.play().catch(e => console.log('renzoku.mp3再生エラー:', e));
  console.log('🔊 特別演出でrenzoku.mp3再生開始');
  
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
    // 扉演出中はL キーを無効化
    if (doorAnimationInProgress) {
      console.log('🚪 扉演出中のため、L キーイベントを無効化');
      return;
    }
    // console.log('💖 lキーが押されました - ハートエフェクト開始');
    
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
      
      // 🎵 poyo.mp3を再生
      const poyoAudio = new Audio('./poyo.mp3');
      poyoAudio.volume = 0.8; // ボリュームを80%に設定
      poyoAudio.play().then(() => {
        console.log('🎵 poyo.mp3再生開始');
      }).catch(e => {
        console.log('🎵 poyo.mp3再生エラー:', e);
      });
      
      // 書き手側にもハート表示指示を送信
      if (socket && socket.readyState === WebSocket.OPEN) {
        const heartMessage = JSON.stringify({
          type: "heartEffect"
        });
        socket.send(heartMessage);
        // console.log('💖 送信側にハートエフェクト指示を送信:', heartMessage);
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
canvas.style.zIndex = "10"; // 動画背景より上に設定

let backgroundImage = null;
let drawingData = [];
let lastBackgroundSrc = null;
let currentPaperSize = "A4"; // 🔸 現在の用紙サイズ（デフォルトはA4）
let currentPrintMode = "drawOnly"; // 🔸 現在の印刷モード（デフォルトは描画のみ）
let currentVideoSize = 100; // 🔸 現在のビデオサイズ（デフォルト100%）
let starEffectEnabled = true; // 星エフェクトの状態（標準でON）
let fairyDustEffectEnabled = true; // 妖精の粉エフェクトの状態（標準でON）
let heartEffectEnabled = false; // ハートエフェクトの状態（標準でOFF）

// 🔸 背景変形パラメータ
let backgroundScale = 1.0; // 背景のスケール
let backgroundOffsetY = 0; // 背景の垂直オフセット

// 🔸 Dev Tool設定
let devCanvasScale = 0.35; // キャンバススケール（デフォルト0.35）
let devAnimationStartWaitTime = 3.3; // アニメーション開始待機時間（秒）
let devRotationWaitTime = 7.5; // 回転後待機時間（秒）

// 🔸 描画エリア調整設定
let drawingAreaOffset = { x: 0, y: 0 }; // 描画エリアのオフセット
let drawingAreaSize = { width: 1077, height: 762 }; // 描画エリアのサイズ（1110x786の97%）
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

// 🎬 動画背景関数群
function prepareVideoBackground(videoSrc) {
  console.log('🎬 動画背景準備:', videoSrc);
  
  // 既存の動画要素を削除
  if (videoBackgroundElement) {
    videoBackgroundElement.remove();
  }
  
  // 新しい動画要素を作成
  videoBackgroundElement = document.createElement('video');
  videoBackgroundElement.src = videoSrc;
  videoBackgroundElement.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%) rotate(180deg);
    width: ${canvas.width}px;
    height: ${canvas.height}px;
    z-index: 0;
    object-fit: cover;
    pointer-events: none;
  `;
  
  // 最初のフレームで停止
  videoBackgroundElement.muted = true;
  
  // メタデータ読み込み後に最初のフレームに移動
  videoBackgroundElement.addEventListener('loadedmetadata', () => {
    videoBackgroundElement.currentTime = 0;
    console.log('🎬 動画メタデータ読み込み完了 - 最初のフレームに設定');
  });
  
  document.body.appendChild(videoBackgroundElement);
  
  // キャンバスを透明にする
  canvas.style.backgroundColor = 'transparent';
  isVideoBackgroundActive = true;
  
  console.log('🎬 動画背景準備完了 - 最初のフレームで停止');
}

function playVideoBackground() {
  if (videoBackgroundElement) {
    console.log('🎬 動画背景再生開始');
    videoBackgroundElement.play().catch(e => {
      console.error('❌ 動画再生エラー:', e);
    });
  }
}

function endVideoBackground() {
  if (videoBackgroundElement) {
    console.log('🎬 動画背景終了 - 最終フレームで停止');
    
    // 動画終了イベントをリスナーで監視
    videoBackgroundElement.addEventListener('ended', () => {
      console.log('🎬 動画再生終了 - 最終フレームで停止');
      // 最終フレームに停止（最後から0.1秒手前）
      videoBackgroundElement.currentTime = videoBackgroundElement.duration - 0.1;
    });
    
    // すでに再生中の場合は自然に終わるのを待つ
    if (!videoBackgroundElement.ended) {
      console.log('🎬 動画再生中 - 自然終了を待機');
    } else {
      // すでに終了している場合は最終フレームに設定
      videoBackgroundElement.currentTime = videoBackgroundElement.duration - 0.1;
    }
  }
}

function clearVideoBackground() {
  if (videoBackgroundElement) {
    console.log('🎬 動画背景をクリア');
    videoBackgroundElement.remove();
    videoBackgroundElement = null;
    isVideoBackgroundActive = false;
    
    // キャンバスの背景を元に戻す
    canvas.style.backgroundColor = '#f0f0f0';
  }
}

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
    
    // 🔸 背景画像のサイズを調整（変形パラメータを適用）
    let drawWidth = canvas.width * backgroundScale;
    let drawHeight = canvas.height * backgroundScale;
    
    if (currentPaperSize === "poster" && lastBackgroundSrc && (lastBackgroundSrc.includes('back3') || lastBackgroundSrc.includes('back4'))) {
      // 背景1,3のポストカードは背景2より少し小さく（0.9倍）
      drawWidth = canvas.width * 0.9 * backgroundScale;
      drawHeight = canvas.height * 0.9 * backgroundScale;
    } else if (currentPaperSize === "L") {
      // L判モードでの背景サイズ調整
      if (lastBackgroundSrc && (lastBackgroundSrc.includes('back3') || lastBackgroundSrc.includes('back4'))) {
        // 背景1,3のL判はベースより10%小さく
        drawWidth = canvas.width * 0.90 * backgroundScale;
        drawHeight = canvas.height * 0.90 * backgroundScale;
        console.log("🔍 背景1,3のL判サイズ調整: 0.90倍");
      } else if (lastBackgroundSrc && lastBackgroundSrc.includes('back2')) {
        // 背景2のL判はベースより14%小さく
        drawWidth = canvas.width * 0.86 * backgroundScale;
        drawHeight = canvas.height * 0.86 * backgroundScale;
        console.log("🔍 背景2のL判サイズ調整: 0.86倍");
      }
    } else if (currentPaperSize === "A4") {
      // A4モードでの背景サイズ調整
      if (lastBackgroundSrc && (lastBackgroundSrc.includes('back3') || lastBackgroundSrc.includes('back4'))) {
        // 背景1,3のA4はベースより8%小さく
        drawWidth = canvas.width * 0.92 * backgroundScale;
        drawHeight = canvas.height * 0.92 * backgroundScale;
        console.log("🔍 背景1,3のA4サイズ調整: 0.92倍");
      } else if (lastBackgroundSrc && lastBackgroundSrc.includes('back2')) {
        // 背景2のA4はベースより12%小さく
        drawWidth = canvas.width * 0.88 * backgroundScale;
        drawHeight = canvas.height * 0.88 * backgroundScale;
        console.log("🔍 背景2のA4サイズ調整: 0.88倍");
      }
    }
    
    ctx.drawImage(backgroundImage, -drawWidth / 2, -drawHeight / 2 - backgroundOffsetY, drawWidth, drawHeight);
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
        
        // 🔸 通常背景画像（background 1, 2, 3）が設定された時にDJ.mp3を再生
        if (data.src.includes('back2.png') || data.src.includes('back3.png') || data.src.includes('back4.png')) {
          const audio = new Audio('./DJ.mp3');
          audio.volume = 0.8; // ボリュームを2割下げる（1.0 → 0.8）
          audio.play().catch(e => console.log('DJ.mp3再生エラー:', e));
          console.log('🔊 背景画像設定時にDJ.mp3再生開始（ボリューム0.8）');
        }
        
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
    
    // ハートエフェクトが有効でスタート時にハートを表示
    // console.log(`💖 start時ハートチェック: heartEffectEnabled=${heartEffectEnabled}`);
    if (heartEffectEnabled) {
      // 180度回転を考慮した座標変換
      const canvasRect = canvas.getBoundingClientRect();
      // 180度回転後の座標を計算
      const rotatedX = canvas.width - (areaLeft + scaledX);
      const rotatedY = canvas.height - (areaTop + scaledY);
      const pageX = canvasRect.left + rotatedX;
      const pageY = canvasRect.top + rotatedY;
      // console.log(`💖 start時にハートエフェクト(180度回転): canvas(${scaledX}, ${scaledY}) -> rotated(${rotatedX}, ${rotatedY}) -> page(${pageX}, ${pageY})`);
      createReceiverHeart(pageX, pageY);
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
    
    // ハートエフェクトが有効で受信側にハートを表示（4回に1回の頻度）
    // console.log(`💖 draw時ハートチェック: heartEffectEnabled=${heartEffectEnabled}`);
    if (heartEffectEnabled && Math.random() < 0.25) {
      // 180度回転を考慮した座標変換
      const canvasRect = canvas.getBoundingClientRect();
      // 180度回転後の座標を計算
      const rotatedX = canvas.width - (areaLeft + scaledX);
      const rotatedY = canvas.height - (areaTop + scaledY);
      const pageX = canvasRect.left + rotatedX;
      const pageY = canvasRect.top + rotatedY;
      // console.log(`💖 draw時にハートエフェクト(180度回転): canvas(${scaledX}, ${scaledY}) -> rotated(${rotatedX}, ${rotatedY}) -> page(${pageX}, ${pageY})`);
      createReceiverHeart(pageX, pageY);
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
    // ハートエフェクト状態変更通知を受信
    heartEffectEnabled = data.enabled;
    // console.log(`💖 ハートエフェクト状態変更: ${heartEffectEnabled ? 'ON' : 'OFF'}`);
    // console.log(`💖 受信したハートエフェクトデータ:`, data);
  } else if (data.type === "downloadRotated") {
    // 🔸 180度回転ダウンロード要求を受信
    if (data.paperSize) {
      currentPaperSize = data.paperSize;
      console.log(`📤 180度回転ダウンロード用紙サイズ: ${currentPaperSize}`);
    }
    if (data.printMode) {
      currentPrintMode = data.printMode;
      console.log(`🖨️ 印刷モード: ${currentPrintMode}`);
    }
    console.log("🔄 送信ボタン押下 → 180度回転ダウンロード処理実行");
    downloadRotated();
  } else if (data.type === "videoBackground") {
    // 🎬 動画背景処理
    if (data.action === "prepare") {
      console.log('🎬 動画背景準備開始:', data.videoSrc);
      prepareVideoBackground(data.videoSrc);
    } else if (data.action === "play") {
      console.log('🎬 動画背景再生開始');
      playVideoBackground();
    } else if (data.action === "end") {
      console.log('🎬 動画背景終了');
      endVideoBackground();
    }
  } else if (data.type === "doorAnimation") {
    // 🔸 扉演出を開始
    const imageSrc = data.imageSrc || data.backgroundSrc;
    const action = data.action || "start";
    console.log('🚪 扉演出を開始:', imageSrc, 'Action:', action);
    console.log('🚪 受信データ全体:', data);
    
    if (action === "show_door_only") {
      // 第1段階: 扉表示のみ
      startDoorAnimationPhase1(imageSrc);
    } else if (action === "open_door") {
      // 第2段階: 扉開放
      startDoorAnimationPhase2(imageSrc);
    } else {
      // 従来の一括処理
      startDoorAnimation(imageSrc);
    }
  } else if (data.type === "specialBackground") {
    // 🔸 特殊背景を設定（扉演出後）
    console.log('🚪 特殊背景を設定:', data.src);
    setSpecialBackgroundWithRiseEffect(data.src, data.canvasSize);
  } else if (data.type === "devSettings") {
    // 🔸 Dev Tool設定受信
    const oldCanvasScale = devCanvasScale;
    devCanvasScale = data.canvasScale || 0.35;
    devAnimationStartWaitTime = data.animationStartWaitTime || 3.3;
    devRotationWaitTime = data.rotationWaitTime || 8.1;
    console.log(`🔧 Dev設定受信: scale=${devCanvasScale}, animationWait=${devAnimationStartWaitTime}, rotationWait=${devRotationWaitTime}`);
    
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
    
    // 印刷モードを更新
    if (data.printMode) {
      currentPrintMode = data.printMode;
      console.log(`🖨️ 印刷モード更新: ${currentPrintMode}`);
    }
    
    // 受信側で印刷モードに応じた画像を生成してから印刷
    console.log('🚨 プリンターに印刷命令を送信開始！（更に180度回転）');
    console.log(`📊 印刷データ: 用紙サイズ=${data.paperSize || 'A4'}, タイプ=${data.printType || 'double_rotated'}, モード=${currentPrintMode}`);
    
    // 印刷モードに応じて新しい画像を生成
    const printImageData = generatePrintImageData();
    
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('save-pdf', {
      imageData: printImageData,
      printType: data.printType || 'double_rotated',
      paperSize: data.paperSize || 'A4'
    });
    
    console.log('✅ プリンターへの印刷命令送信完了！（更に180度回転）');
    console.log("✅ 更に180度回転画像をElectronに送信完了");
    
    // 🤖 SwitchBotボット押下（チェックボックスの状態を確認）
    if (data.switchBotEnabled) {
      console.log("🤖 SwitchBot有効：2秒後にボット押下実行");
      // 2秒後にSwitchBotシーケンスを開始
      setTimeout(() => {
        executeSwitchBotSequence();
      }, 2000);
    } else {
      console.log("🤖 SwitchBot無効：ボット押下をスキップ");
    }
  } else if (data.type === "startRotationAnimation") {
    // 🔸 回転アニメーション開始
    console.log("🎬 回転アニメーション開始");
    console.log(`⏱️ 待機時間: ${data.waitTime}秒`);
    console.log(`🎆 花火: ${data.fireworksEnabled ? '有効' : '無効'}`);
    console.log(`🎊 紙吹雪: ${data.confettiEnabled ? '有効' : '無効'}`);
    
    // アニメーション実行（チェックボックスの状態を渡す）
    prepareAndRunAnimation(data.waitTime, data.fireworksEnabled, data.confettiEnabled);
  } else if (data.type === "fireworksTest") {
    // 🔸 花火テスト指示を受信（無効化：送信ボタンでのみ花火実行）
    console.log("🎆 送信側から花火テスト指示を受信（無効化されています）");
    // createReceiverFireworks(); // 無効化
  } else if (data.type === "switchBotTest") {
    // 🔸 SwitchBotテスト指示を受信
    console.log("🤖 送信側からSwitchBotテスト指示を受信");
    executeSwitchBotSequence();
  } else if (data.type === "printMode") {
    // 🔸 印刷モード変更通知を受信
    currentPrintMode = data.mode;
    console.log(`🖨️ 印刷モード変更: ${currentPrintMode}`);
  } else if (data.type === "backgroundTransform") {
    // 🔸 背景変形パラメータを受信
    backgroundScale = data.scale || 1.0;
    backgroundOffsetY = data.offsetY || 0;
    console.log(`🖼️ 背景変形: スケール=${backgroundScale.toFixed(1)}, オフセットY=${backgroundOffsetY}`);
    redrawCanvas();
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

function prepareAndRunAnimation(waitTime = null, fireworksEnabled = true, confettiEnabled = true) {
  console.log(`🎬 アニメーション準備開始 (待機時間: ${waitTime}秒, 花火: ${fireworksEnabled}, 紙吹雪: ${confettiEnabled})`);
  
  const imageDataUrl = canvas.toDataURL("image/png");
  canvas.style.display = "none";
  const container = document.getElementById("container");

  if (animationImage) {
    container.removeChild(animationImage);
  }

  animationImage = new Image();
  animationImage.src = imageDataUrl;
  // 🔸 アニメーション画像のサイズをキャンバスの表示サイズに合わせる
  const canvasComputedStyle = window.getComputedStyle(canvas);
  animationImage.style.width = canvasComputedStyle.width;
  animationImage.style.height = canvasComputedStyle.height;
  animationImage.style.display = "block";
  
  // アニメーション画像をキャンバスと同じ位置に配置（その場に止まる）
  animationImage.style.position = "absolute";
  animationImage.style.top = "30px";
  animationImage.style.left = "50%";
  animationImage.style.transform = "translateX(-50%)"; // 初期は反転なし
  animationImage.style.zIndex = "2";
  
  container.appendChild(animationImage);

  runAnimationSequence(waitTime, fireworksEnabled, confettiEnabled);
}

function runAnimationSequence(waitTime = null, fireworksEnabled = true, confettiEnabled = true) {
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

    // 🔸 回転アニメーションと同時にrotate.mp3を再生
    const rotateAudio = new Audio('./rotate.mp3');
    rotateAudio.volume = 0.7;
    rotateAudio.play().catch(e => console.log('rotate.mp3再生エラー:', e));
    console.log('🔊 回転アニメーション開始と同時にrotate.mp3再生');

    // 🔸 回転完了後の待機時間（書き手側の設定またはDev Tool設定を使用）
    let rotationWaitTime;
    if (waitTime !== null) {
      // 書き手側から送信された待機時間を使用
      rotationWaitTime = waitTime * 1000; // 秒をmsに変換
      console.log(`⏰ 書き手側設定：回転後${waitTime}秒待機してから移動開始`);
    } else if (currentPaperSize === "A4" || currentPaperSize === "L") {
      rotationWaitTime = devRotationWaitTime * 1000; // Dev設定の秒数をmsに変換
      console.log(`⏰ ${currentPaperSize}モード：回転後${devRotationWaitTime}秒待機してから移動開始`);
    } else {
      rotationWaitTime = 1100; // ポスター：従来通り1.1秒
      console.log("⏰ ポスターモード：回転後1.1秒待機してから移動開始");
    }
    
    // 🔸 回転完了後1秒で花火エフェクトを開始（チェックボックスが有効な場合のみ）
    setTimeout(() => {
      // 花火が有効で、既に実行中でない場合のみ実行
      if (fireworksEnabled && !fireworksInProgress) {
        console.log('🎆 回転アニメーション完了後1秒で花火を実行');
        createReceiverFireworks();
      } else if (!fireworksEnabled) {
        console.log('🎆 花火演出は無効に設定されています');
      } else {
        console.log('🎆 花火は既に実行中のため、回転アニメーションでの花火実行をスキップ');
      }
      
      // 🔸 紙吹雪エフェクト（チェックボックスが有効な場合のみ）
      if (confettiEnabled) {
        // 🔸 移動アニメーション1.5秒前に紙吹雪エフェクトを追加（clack.mp3再生）
        const confettiDelay = rotationWaitTime - 1500; // 移動開始1.5秒前
        setTimeout(() => {
          createConfettiEffectWithClack();
        }, confettiDelay);
      } else {
        console.log('🎊 紙吹雪演出は無効に設定されています');
      }
    }, 2500); // 回転完了後1秒で実行（回転1.5秒 + 1秒 = 2.5秒後）
    
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

      // 🔸 用紙サイズに応じて待機時間を調整（全体的に5秒延長）
      let waitTime;
      if (currentPaperSize === "poster") {
        waitTime = 9000; // ポスター：移動完了後7秒待機（2秒 + 5秒 = 7秒）
        console.log("⏰ ポスターモード：移動後9秒待機");
      } else if (currentPaperSize === "L") {
        waitTime = 7000; // L版：7秒待機（2秒 + 5秒 = 7秒）
        console.log("⏰ L版モード：移動後7秒待機");
      } else {
        waitTime = 7000; // A4：7秒待機（2秒 + 5秒 = 7秒）
        console.log("⏰ A4モード：移動後7秒待機");
      }

      setTimeout(() => {
        console.log('🎬 アニメーション完了後5秒追加待機完了、キャンバス表示開始');
        
        if (animationImage && animationImage.parentNode) {
          animationImage.parentNode.removeChild(animationImage);
          animationImage = null;
        }

        drawingData = [];
        canvas.style.display = "block";
        console.log('🎨 次のキャンバスを表示');

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

        // 🔸 アニメーション完了後にカウントダウン開始
        // startCountdown(); // カウントダウンを無効化
      }, waitTime); // 🔸 用紙サイズに応じた待機時間（5秒延長済み）

    }, rotationWaitTime + 1500); // 🔸 回転完了（1.5秒）+ 用紙サイズに応じた待機時間

  }, animationStartDelay); // 🔸 用紙サイズに応じた遅延時間
}

// 🔸 カウントダウン表示関数
function startCountdown() {
  console.log('⏰ カウントダウン開始');
  
  // カウントダウン表示用の要素を作成
  const countdownElement = document.createElement('div');
  countdownElement.id = 'countdownDisplay';
  countdownElement.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 80px;
    font-weight: bold;
    color: #ff1493;
    text-shadow: 3px 3px 0px #000, -3px -3px 0px #000, 3px -3px 0px #000, -3px 3px 0px #000;
    z-index: 9999;
    text-align: center;
    pointer-events: none;
    font-family: 'Arial', sans-serif;
  `;
  
  document.body.appendChild(countdownElement);
  
  let count = 5;
  
  function updateCountdown() {
    if (count > 0) {
      countdownElement.textContent = `お渡しまで ${count}`;
      console.log(`⏰ カウントダウン: ${count}`);
      count--;
      setTimeout(updateCountdown, 1000); // 1秒後に次のカウント
    } else {
      // カウントダウン完了
      countdownElement.textContent = 'お渡しください';
      console.log('⏰ カウントダウン完了');
      
      // 2秒後にカウントダウン表示を削除 + 花火演出開始
      setTimeout(() => {
        if (countdownElement.parentNode) {
          countdownElement.parentNode.removeChild(countdownElement);
          console.log('⏰ カウントダウン表示を削除');
        }
        
        // 🔸 花火演出を開始
        createReceiverFireworks();
      }, 2000);
    }
  }
  
  updateCountdown();
}

// 🔸 紙吹雪エフェクト関数（より派手に）
function createConfettiEffect(playAudio = true) {
  console.log('🎊 紙吹雪エフェクト開始');
  
  // より多彩な色
  const colors = [
    '#ff1493', '#00ff00', '#0000ff', '#ffff00', '#ff8000', '#8000ff', '#ff0000', '#00ffff',
    '#ff69b4', '#ffd700', '#ff00ff', '#00ff7f', '#ff4500', '#1e90ff', '#dc143c', '#ffa500'
  ];
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // 効果音を再生（playAudioフラグが真の場合のみ）
  if (playAudio) {
    const audio = new Audio('./renzoku.mp3');
    audio.volume = 0.7;
    audio.play().catch(e => console.log('クラッカー音再生エラー:', e));
  }
  
  // 紙吹雪エフェクトを実行
  executeConfettiEffect(colors, windowWidth, windowHeight);
}

// 🔸 clack.mp3付きの紙吹雪エフェクト関数
function createConfettiEffectWithClack() {
  console.log('🎊 紙吹雪エフェクト開始（clack1.mp3再生）');
  
  // より多彩な色
  const colors = [
    '#ff1493', '#00ff00', '#0000ff', '#ffff00', '#ff8000', '#8000ff', '#ff0000', '#00ffff',
    '#ff69b4', '#ffd700', '#ff00ff', '#00ff7f', '#ff4500', '#1e90ff', '#dc143c', '#ffa500'
  ];
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // clack1.mp3を再生
  const audio = new Audio('./clack1.mp3');
  audio.volume = 0.7;
  audio.play().catch(e => console.log('clack1.mp3再生エラー:', e));
  console.log('🔊 clack1.mp3再生開始');
  
  // 紙吹雪エフェクトを実行
  executeConfettiEffect(colors, windowWidth, windowHeight);
}

// 🔸 紙吹雪エフェクト実行関数（共通処理）
function executeConfettiEffect(colors, windowWidth, windowHeight) {
  // 左サイドから紙吹雪
  createSideConfetti('left', colors, windowWidth, windowHeight);
  
  // 右サイドから紙吹雪
  createSideConfetti('right', colors, windowWidth, windowHeight);
  
  // 追加：上部からも紙吹雪を降らせる
  createTopConfetti(colors, windowWidth, windowHeight);
  
  // 追加：キラキラエフェクト
  createSparkleEffect(windowWidth, windowHeight);
}

function createSideConfetti(side, colors, windowWidth, windowHeight) {
  const confettiCount = 50; // 各サイドから50個の紙吹雪（増量）
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    // 紙吹雪のスタイル（よりバリエーション豊かに）
    const size = Math.random() * 12 + 6; // 6-18px
    const shape = Math.random();
    let borderRadius = '0%';
    if (shape < 0.3) borderRadius = '50%'; // 円形
    else if (shape < 0.6) borderRadius = '25%'; // 角丸四角
    
    confetti.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size * (Math.random() * 0.5 + 0.5)}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      pointer-events: none;
      z-index: 9998;
      border-radius: ${borderRadius};
      opacity: ${Math.random() * 0.3 + 0.7};
      box-shadow: 0 0 ${Math.random() * 10 + 5}px rgba(255,255,255,0.8);
    `;
    
    // 開始位置を設定（下部から）
    if (side === 'left') {
      confetti.style.left = '0px';
      confetti.style.bottom = Math.random() * 100 + 'px'; // 底部から0-100pxの範囲
    } else {
      confetti.style.right = '0px';
      confetti.style.bottom = Math.random() * 100 + 'px'; // 底部から0-100pxの範囲
    }
    
    document.body.appendChild(confetti);
    
    // アニメーション用の動的スタイル作成
    const animationName = `confetti_${side}_${i}_${Date.now()}`;
    const style = document.createElement('style');
    
    // 飛び散る方向と距離を計算（下から上へ噴出）
    const horizontalDistance = Math.random() * 600 + 300; // 300-900px
    const verticalDistance = -(Math.random() * 600 + 400); // -400から-1000px（上方向へ）
    const rotation = Math.random() * 1440 + 720; // 720-2160度回転
    
    const keyframes = `
      @keyframes ${animationName} {
        0% {
          transform: translate(0, 0) rotate(0deg);
          opacity: 0.8;
        }
        50% {
          opacity: 1;
        }
        100% {
          transform: translate(${side === 'left' ? horizontalDistance : -horizontalDistance}px, ${verticalDistance}px) rotate(${rotation}deg);
          opacity: 0;
        }
      }
    `;
    
    style.textContent = keyframes;
    document.head.appendChild(style);
    
    // アニメーションを適用（より長く）
    const duration = Math.random() * 1500 + 2000; // 2-3.5秒
    const delay = Math.random() * 300; // 0-300ms遅延
    
    confetti.style.animation = `${animationName} ${duration}ms ease-out ${delay}ms forwards`;
    
    // アニメーション完了後にクリーンアップ
    setTimeout(() => {
      if (confetti.parentNode) {
        confetti.parentNode.removeChild(confetti);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, duration + delay + 100);
  }
  
  console.log(`🎊 ${side}サイドから${confettiCount}個の紙吹雪を発射`);
}

// 🔸 上部からの紙吹雪（追加演出）
function createTopConfetti(colors, windowWidth, windowHeight) {
  const confettiCount = 40; // 上部から40個
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-top';
    
    // キラキラした紙吹雪のスタイル
    const size = Math.random() * 15 + 8; // 8-23px
    
    confetti.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size * 0.6}px;
      background: linear-gradient(45deg, ${colors[Math.floor(Math.random() * colors.length)]}, ${colors[Math.floor(Math.random() * colors.length)]});
      pointer-events: none;
      z-index: 9998;
      border-radius: 10%;
      opacity: 0.9;
      box-shadow: 0 0 15px rgba(255,255,255,1), inset 0 0 5px rgba(255,255,255,0.5);
      top: -50px;
      left: ${Math.random() * windowWidth}px;
    `;
    
    document.body.appendChild(confetti);
    
    // 降ってくるアニメーション
    const animationName = `confetti_fall_${i}_${Date.now()}`;
    const style = document.createElement('style');
    
    const swayAmount = Math.random() * 200 - 100; // -100 to 100px 左右に揺れる
    const fallDistance = windowHeight + 100;
    const rotation = Math.random() * 720; // 0-720度回転
    
    const keyframes = `
      @keyframes ${animationName} {
        0% {
          transform: translateY(0) translateX(0) rotate(0deg);
          opacity: 0.9;
        }
        25% {
          transform: translateY(${fallDistance * 0.25}px) translateX(${swayAmount * 0.5}px) rotate(${rotation * 0.25}deg);
        }
        50% {
          transform: translateY(${fallDistance * 0.5}px) translateX(${swayAmount}px) rotate(${rotation * 0.5}deg);
          opacity: 1;
        }
        75% {
          transform: translateY(${fallDistance * 0.75}px) translateX(${swayAmount * 0.5}px) rotate(${rotation * 0.75}deg);
        }
        100% {
          transform: translateY(${fallDistance}px) translateX(0) rotate(${rotation}deg);
          opacity: 0;
        }
      }
    `;
    
    style.textContent = keyframes;
    document.head.appendChild(style);
    
    // アニメーションを適用
    const duration = Math.random() * 2000 + 3000; // 3-5秒
    const delay = Math.random() * 1000; // 0-1秒遅延
    
    confetti.style.animation = `${animationName} ${duration}ms ease-in-out ${delay}ms forwards`;
    
    // アニメーション完了後にクリーンアップ
    setTimeout(() => {
      if (confetti.parentNode) {
        confetti.parentNode.removeChild(confetti);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, duration + delay + 100);
  }
  
  console.log(`🎊 上部から${confettiCount}個の紙吹雪を降らせる`);
}

// 🔸 キラキラエフェクト関数
function createSparkleEffect(windowWidth, windowHeight) {
  const sparkleCount = 60; // 60個のキラキラ
  
  for (let i = 0; i < sparkleCount; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    
    // キラキラのスタイル
    const size = Math.random() * 6 + 2; // 2-8px
    const startX = Math.random() * windowWidth;
    const startY = windowHeight - Math.random() * 200; // 下部200pxの範囲から
    
    sparkle.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size}px;
      background: radial-gradient(circle, #ffffff 0%, rgba(255,255,255,0) 70%);
      pointer-events: none;
      z-index: 9999;
      left: ${startX}px;
      top: ${startY}px;
      border-radius: 50%;
      box-shadow: 0 0 ${size * 2}px #fff, 0 0 ${size * 4}px #fff, 0 0 ${size * 6}px #fff;
    `;
    
    document.body.appendChild(sparkle);
    
    // キラキラアニメーション
    const animationName = `sparkle_${i}_${Date.now()}`;
    const style = document.createElement('style');
    
    // ランダムな動き
    const moveX = (Math.random() - 0.5) * 800; // -400 to 400px
    const moveY = -(Math.random() * 600 + 200); // -200 to -800px（上方向）
    const duration = Math.random() * 2000 + 1000; // 1-3秒
    
    const keyframes = `
      @keyframes ${animationName} {
        0% {
          transform: translate(0, 0) scale(0);
          opacity: 0;
        }
        20% {
          transform: translate(${moveX * 0.2}px, ${moveY * 0.2}px) scale(1.5);
          opacity: 1;
        }
        50% {
          transform: translate(${moveX * 0.5}px, ${moveY * 0.5}px) scale(1);
          opacity: 0.8;
        }
        100% {
          transform: translate(${moveX}px, ${moveY}px) scale(0);
          opacity: 0;
        }
      }
    `;
    
    style.textContent = keyframes;
    document.head.appendChild(style);
    
    // アニメーションを適用
    const delay = Math.random() * 500; // 0-500ms遅延
    sparkle.style.animation = `${animationName} ${duration}ms ease-out ${delay}ms forwards`;
    
    // 点滅エフェクトを追加
    const blinkInterval = setInterval(() => {
      sparkle.style.opacity = Math.random() > 0.5 ? '1' : '0.3';
    }, 100);
    
    // アニメーション完了後にクリーンアップ
    setTimeout(() => {
      clearInterval(blinkInterval);
      if (sparkle.parentNode) {
        sparkle.parentNode.removeChild(sparkle);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, duration + delay + 100);
  }
  
  console.log(`✨ ${sparkleCount}個のキラキラエフェクトを追加`);
}

// 🔸 花火重複実行防止のための変数
let fireworksInProgress = false;
let lastFireworksTime = 0;

// 🔸 花火エフェクト用のCSSアニメーションを追加
function addFireworkAnimations() {
  if (document.getElementById('fireworkAnimations')) return; // 既に追加済みの場合はスキップ
  
  const style = document.createElement('style');
  style.id = 'fireworkAnimations';
  style.textContent = `
    @keyframes fireworkPulse {
      0% { 
        transform: scale(1);
        filter: brightness(1);
      }
      100% { 
        transform: scale(1.1);
        filter: brightness(1.3);
      }
    }
    
    @keyframes trailFade {
      0% { 
        opacity: 0.6;
        height: 20px;
      }
      100% { 
        opacity: 0;
        height: 60px;
      }
    }
    
    @keyframes particleShimmer {
      0% { 
        opacity: 1;
        transform: scale(1);
        filter: brightness(1);
      }
      50% { 
        opacity: 0.8;
        transform: scale(0.9);
        filter: brightness(1.2);
      }
      100% { 
        opacity: 0;
        transform: scale(0.3);
        filter: brightness(0.8);
      }
    }
  `;
  document.head.appendChild(style);
}

// 🔸 受け手側花火演出を作成（送信側と同じ実装）
function createReceiverFireworks() {
  // 🔸 重複実行防止チェック
  const now = Date.now();
  if (fireworksInProgress || (now - lastFireworksTime < 5000)) {
    console.log('🎆 花火演出は既に実行中またはクールダウン中のため、スキップします');
    return;
  }
  
  fireworksInProgress = true;
  lastFireworksTime = now;
  
  // 🔸 花火アニメーションを追加
  addFireworkAnimations();
  
  console.log('🎆 受け手側打ち上げ花火演出を開始（リッチバージョン）');
  
  // fire.wavを再生
  const audio = new Audio('./fire.wav');
  audio.volume = 0.7;
  audio.play().catch(e => console.log('fire.wav再生エラー:', e));
  console.log('🔊 fire.wav再生開始');
  
  // 複数の打ち上げ花火を生成（超派手に改良）
  for (let i = 0; i < 18; i++) {
    setTimeout(() => {
      // 画面下部からランダムな位置で花火を発射
      const launchX = Math.random() * (window.innerWidth - 100) + 50; // 端から50px離す
      const targetY = Math.random() * (window.innerHeight * 0.5) + 80; // 上部50%の範囲に拡大
      
      console.log(`🎆 受信側花火${i+1}発射: X=${launchX}, Y=${targetY}`);
      
      // 花火の軌道となる要素を作成（より派手に）
      const firework = document.createElement('div');
      firework.className = 'receiver-firework';
      
      // ランダムな色の花火（より多彩に）
      const colors = ['#ffff00', '#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4', '#ffd700', '#ff1493', '#32cd32', '#ff4500', '#8a2be2', '#00ced1', '#ff6347', '#9370db'];
      const fireworkColor = colors[Math.floor(Math.random() * colors.length)];
      
      // より大きくて明るい花火（リッチな演出）
      firework.style.cssText = `
        position: fixed;
        left: ${launchX}px;
        bottom: 0px;
        width: 12px;
        height: 12px;
        background: radial-gradient(circle, ${fireworkColor} 0%, ${fireworkColor}99 30%, ${fireworkColor}66 60%, transparent 100%);
        border-radius: 50%;
        z-index: 10000;
        pointer-events: none;
        box-shadow: 
          0 0 15px ${fireworkColor}, 
          0 0 30px ${fireworkColor}, 
          0 0 45px ${fireworkColor}, 
          0 0 60px ${fireworkColor},
          0 0 75px ${fireworkColor}44,
          inset 0 0 10px ${fireworkColor}aa;
        animation: fireworkPulse 0.5s ease-in-out infinite alternate;
      `;
      
      document.body.appendChild(firework);
      
      // 🔸 花火の軌跡エフェクトを追加
      const trail = document.createElement('div');
      trail.className = 'firework-trail';
      trail.style.cssText = `
        position: fixed;
        left: ${launchX}px;
        bottom: 0px;
        width: 3px;
        height: 20px;
        background: linear-gradient(to top, ${fireworkColor}, transparent);
        border-radius: 50%;
        z-index: 9999;
        pointer-events: none;
        opacity: 0.6;
        animation: trailFade 1s ease-out forwards;
      `;
      document.body.appendChild(trail);
      
      // 打ち上げアニメーション（より滑らかに）
      const launchDuration = 800 + Math.random() * 400; // 800-1200ms
      setTimeout(() => {
        firework.style.transition = `bottom ${launchDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
        firework.style.bottom = (window.innerHeight - targetY) + 'px';
        
        // 軌跡も同時に移動
        trail.style.transition = `bottom ${launchDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
        trail.style.bottom = (window.innerHeight - targetY) + 'px';
      }, 50);
      
      // 花火爆発
      setTimeout(() => {
        firework.style.display = 'none';
        createReceiverExplosion(launchX, targetY);
      }, launchDuration + 100);
      
      // 花火要素と軌跡を削除
      setTimeout(() => {
        if (firework.parentNode) firework.parentNode.removeChild(firework);
        if (trail.parentNode) trail.parentNode.removeChild(trail);
      }, launchDuration + 200);
      
    }, i * 350); // 350msずつ時間差で発射（6.5秒継続: 18発 × 350ms = 6.3秒）
  }
  
  // 🔸 花火演出完了後にフラグをリセット（6.5秒継続に合わせて調整）
  setTimeout(() => {
    fireworksInProgress = false;
    console.log('🎆 花火演出完了、フラグをリセット');
  }, 7000); // 7秒後（6.5秒継続 + 0.5秒マージン）
}


// 🔸 受け手側花火爆発エフェクト（超派手に改良）
function createReceiverExplosion(x, y) {
  console.log(`💥 受信側爆発エフェクト開始: X=${x}, Y=${y}`);
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff', '#ffd700', '#ff69b4', '#32cd32', '#ff4500', '#8a2be2', '#00ced1', '#ff6347', '#9370db'];
  const particles = 24; // 爆発する粒子数を大幅増加
  
  for (let i = 0; i < particles; i++) {
    const particle = document.createElement('div');
    particle.className = 'receiver-firework-particle';
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    const angle = (360 / particles) * i + Math.random() * 30; // より多くのランダム性を追加
    const distance = 120 + Math.random() * 80; // 120-200px（爆発範囲をさらに拡大）
    const size = 5 + Math.random() * 5; // 5-10px（パーティクルサイズをさらに拡大）
    
    particle.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: radial-gradient(circle, ${color} 0%, ${color}cc 40%, ${color}66 70%, transparent 100%);
      border-radius: 50%;
      z-index: 10001;
      pointer-events: none;
      box-shadow: 
        0 0 15px ${color}, 
        0 0 30px ${color}, 
        0 0 45px ${color}, 
        0 0 60px ${color},
        0 0 75px ${color}33,
        inset 0 0 8px ${color}99;
      animation: particleShimmer 1.2s ease-out forwards;
    `;
    
    // 動的にCSSアニメーションを作成
    const randomId = Math.random().toString(36).substr(2, 9);
    const keyframeName = `receiverExplode_${randomId}`;
    
    const endX = x + Math.cos(angle * Math.PI / 180) * distance;
    const endY = y + Math.sin(angle * Math.PI / 180) * distance;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ${keyframeName} {
        0% {
          transform: translate(0, 0) scale(1);
          opacity: 1;
        }
        100% {
          transform: translate(${endX - x}px, ${endY - y}px) scale(0.3);
          opacity: 0;
        }
      }
    `;
    
    document.head.appendChild(style);
    particle.style.animation = `${keyframeName} 1s ease-out forwards`;
    
    document.body.appendChild(particle);
    
    // 粒子を削除
    setTimeout(() => {
      if (particle.parentNode) particle.parentNode.removeChild(particle);
      if (style.parentNode) style.parentNode.removeChild(style);
    }, 1000);
  }
}

// 🔸 扉開く演出関数
function startDoorAnimation(imageSrc) {
  console.log('🚪 扉開く演出を開始');
  doorAnimationInProgress = true; // 扉演出中フラグを立てる
  
  // 背景画像を事前に読み込み
  const img = new Image();
  img.src = imageSrc;
  
  img.onload = () => {
    // 1. 背景画像を180度回転してキャンバスに描画
    const scaledWidth = drawingAreaSize.width * devCanvasScale;
    const scaledHeight = drawingAreaSize.height * devCanvasScale;
    
    // 実際のキャンバスに180度回転した背景を描画
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI);
    ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();
    
    // 背景画像を保存
    backgroundImage = img;
    lastBackgroundSrc = imageSrc;
    redrawCanvas();
    
    console.log('🚪 背景画像を180度回転してキャンバスに描画');
    
    // 2. 左右の扉を即座に作成（中央に切れ目がある状態）
    // 左の扉（中央から左に開く）- 重厚感のあるデザイン
    const leftDoor = document.createElement('div');
    leftDoor.id = 'leftDoor';
    leftDoor.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 50vw;
      height: 100vh;
      background: linear-gradient(45deg, #ffffff, #f0f0f0, #e5e5e5, #f0f0f0, #ffffff);
      z-index: 10002;
      transform-origin: left center;
      transition: transform 1s ease-out;
      border-right: 3px solid #d0d0d0;
      box-shadow: inset -10px 0 30px rgba(0,0,0,0.2), 0 0 20px rgba(0,0,0,0.3), inset 0 0 50px rgba(255,255,255,0.3);
    `;
    document.body.appendChild(leftDoor);
    
    // 右の扉（中央から右に開く）- 重厚感のあるデザイン
    const rightDoor = document.createElement('div');
    rightDoor.id = 'rightDoor';
    rightDoor.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 50vw;
      height: 100vh;
      background: linear-gradient(-45deg, #ffffff, #f0f0f0, #e5e5e5, #f0f0f0, #ffffff);
      z-index: 10002;
      transform-origin: right center;
      transition: transform 1s ease-out;
      border-left: 3px solid #d0d0d0;
      box-shadow: inset 10px 0 30px rgba(0,0,0,0.2), 0 0 20px rgba(0,0,0,0.3), inset 0 0 50px rgba(255,255,255,0.3);
    `;
    document.body.appendChild(rightDoor);
    
    console.log('🚪 中央に切れ目のある扉を作成');
    
    // 3. 1秒後に扉が開く
    setTimeout(() => {
        // 効果音を再生 (sound1.mp3 removed due to file loading errors)
        
        // 0.1秒後に扉を開く（中央から外側に開く）
        setTimeout(() => {
          leftDoor.style.transform = 'rotateY(90deg)';
          rightDoor.style.transform = 'rotateY(-90deg)';
          console.log('🚪 扉が開き始めました');
        }, 100);
        
        // 1秒後に全ての要素を削除
        setTimeout(() => {
          if (leftDoor.parentNode) leftDoor.parentNode.removeChild(leftDoor);
          if (rightDoor.parentNode) rightDoor.parentNode.removeChild(rightDoor);
          doorAnimationInProgress = false; // 扉演出中フラグを下げる
          console.log('🚪 扉演出完了');
        }, 1100);
        
    }, 1000); // 初期表示から1秒後に扉開始
    
  };
  
  img.onerror = () => {
    console.error('❌ 扉用背景画像の読み込みに失敗:', imageSrc);
  };
}

// 🔸 扉演出第1段階: 扉表示のみ（開く直前で停止）
function startDoorAnimationPhase1(imageSrc) {
  console.log('🚪 扉演出第1段階: 開く直前で停止:', imageSrc);
  doorAnimationInProgress = true; // 扉演出中フラグを立てる
  
  const img = new Image();
  img.src = imageSrc;
  
  img.onload = () => {
    // 背景画像を保存（キャンバスには描画しない）
    backgroundImage = img;
    lastBackgroundSrc = imageSrc;
    
    console.log('🚪 背景画像を保存（キャンバスには描画せず）');
    
    // 1. 左右の扉を即座に作成（中央に切れ目がある状態）
    // 左の扉（中央から左に開く）- 重厚感のあるデザイン
    const leftDoor = document.createElement('div');
    leftDoor.id = 'leftDoor';
    leftDoor.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 50vw;
      height: 100vh;
      background: linear-gradient(45deg, #ffffff, #f0f0f0, #e5e5e5, #f0f0f0, #ffffff);
      z-index: 10002;
      transform-origin: left center;
      transition: transform 4s ease-out;
      border-right: 3px solid #d0d0d0;
      box-shadow: inset -10px 0 30px rgba(0,0,0,0.2), 0 0 20px rgba(0,0,0,0.3), inset 0 0 50px rgba(255,255,255,0.3);
    `;
    document.body.appendChild(leftDoor);
    
    // 右の扉（中央から右に開く）- 重厚感のあるデザイン
    const rightDoor = document.createElement('div');
    rightDoor.id = 'rightDoor';
    rightDoor.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 50vw;
      height: 100vh;
      background: linear-gradient(-45deg, #ffffff, #f0f0f0, #e5e5e5, #f0f0f0, #ffffff);
      z-index: 10002;
      transform-origin: right center;
      transition: transform 4s ease-out;
      border-left: 3px solid #d0d0d0;
      box-shadow: inset 10px 0 30px rgba(0,0,0,0.2), 0 0 20px rgba(0,0,0,0.3), inset 0 0 50px rgba(255,255,255,0.3);
    `;
    document.body.appendChild(rightDoor);
    
    // グレーオーバーレイIDを設定（互換性のため）
    leftDoor.setAttribute('data-door-phase', '1');
    rightDoor.setAttribute('data-door-phase', '1');
    
    console.log('🚪 中央に切れ目のある扉を作成（第1段階完了 - 開く直前で停止）');
  };
  
  img.onerror = () => {
    console.error('❌ 扉用背景画像の読み込みに失敗:', imageSrc);
  };
}

// 🔸 扉演出第2段階: 扉開放（LED表示 + 背景描画 + 扉開放）
function startDoorAnimationPhase2(imageSrc) {
  console.log('🚪 扉演出第2段階: LED表示 + 扉開放:', imageSrc);
  
  // 既存の扉要素を取得
  const leftDoor = document.getElementById('leftDoor');
  const rightDoor = document.getElementById('rightDoor');
  
  if (!leftDoor || !rightDoor) {
    console.error('❌ 扉要素が見つかりません。第1段階が実行されていない可能性があります。');
    return;
  }
  
  // 1. 背景画像を180度回転してキャンバスに描画
  if (backgroundImage) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI);
    ctx.drawImage(backgroundImage, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();
    redrawCanvas();
    console.log('🚪 背景画像を180度回転してキャンバスに描画');
  }
  
  // 2. open.wavを再生
  const audio = new Audio('./open.wav');
  audio.volume = 0.6;
  audio.play().catch(e => console.log('open.wav再生エラー:', e));
  console.log('🔊 open.wav再生開始');
  
  // 3. 青色LEDを表示（削除）
  // createBlueLEDLightingWithFadeOut();
  
  // 4. 2.5秒後に開く演出開始
  setTimeout(() => {
    console.log('🚪 開く演出開始（2.5秒後）');
    
    console.log('🚪 既存の扉要素を使用');
    
    // 0.1秒後に扉を開く（中央から外側に開く）
    setTimeout(() => {
      leftDoor.style.transform = 'rotateY(90deg)';
      rightDoor.style.transform = 'rotateY(-90deg)';
      console.log('🚪 扉が開き始めました（4秒間）');
    }, 100);
    
    // 4秒後に全ての要素を削除 + open2.mp3再生 + 心臓鼓動演出
    setTimeout(() => {
      if (leftDoor.parentNode) leftDoor.parentNode.removeChild(leftDoor);
      if (rightDoor.parentNode) rightDoor.parentNode.removeChild(rightDoor);
      doorAnimationInProgress = false; // 扉演出中フラグを下げる
      console.log('🚪 扉演出完了');
      
      // 扉が開き切ったらopen2.mp3を再生
      const audio2 = new Audio('./open2.mp3');
      audio2.volume = 0.6;
      audio2.play().catch(e => console.log('open2.mp3再生エラー:', e));
      console.log('🔊 open2.mp3再生開始');
      
      // 心臓鼓動演出を開始
      createHeartbeatEffect();
    }, 4100);
    
  }, 2500); // 2.5秒後に開く演出開始
}

// 🔸 特殊背景設定（180度回転表示）- 背景を表示し続ける
function setSpecialBackgroundWithRiseEffect(src, canvasSize) {
  console.log('🚪 特殊背景を180度回転で設定:', src);
  
  const img = new Image();
  img.src = src;
  
  img.onload = () => {
    // キャンバスサイズを調整
    if (canvasSize) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }
    
    // 背景画像を保存
    backgroundImage = img;
    lastBackgroundSrc = src;
    
    // 即座に180度回転した画像を表示（背景を消さない）
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI); // 180度回転
    ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();
    redrawCanvas();
    
    console.log('🚪 特殊背景設定完了（180度回転）- 背景を表示し続ける');
  };
  
  img.onerror = () => {
    console.error('❌ 特殊背景画像の読み込みに失敗:', src);
  };
}

// 🔸 青色LED間接照明効果を削除
// function createBlueLEDLighting() { ... }
// function createBlueLEDLightingWithFadeOut() { ... }

// 🔸 心臓鼓動演出を作成
function createHeartbeatEffect() {
  console.log('💓 心臓鼓動演出を開始');
  
  if (!backgroundImage) {
    console.log('❌ 背景画像が見つかりません');
    return;
  }
  
  // 心臓鼓動用の背景画像要素を作成
  const heartbeatBg = document.createElement('div');
  heartbeatBg.id = 'heartbeat-background';
  
  // キャンバスの最新の位置情報を取得（DevTool変更に対応）
  const canvasRect = canvas.getBoundingClientRect();
  const canvasTop = canvasRect.top + window.scrollY;
  const canvasLeft = canvasRect.left + window.scrollX;
  const canvasWidth = canvas.offsetWidth;  // 表示される実際の幅
  const canvasHeight = canvas.offsetHeight; // 表示される実際の高さ
  
  console.log(`💓 キャンバス位置情報: top=${canvasTop}, left=${canvasLeft}, width=${canvasWidth}, height=${canvasHeight}`);
  
  heartbeatBg.style.cssText = `
    position: absolute;
    top: ${canvasTop}px;
    left: ${canvasLeft}px;
    width: ${canvasWidth}px;
    height: ${canvasHeight}px;
    transform: rotate(180deg);
    transform-origin: center center;
    background-image: url('${backgroundImage.src}');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    opacity: 0.5;
    z-index: 9999;
    pointer-events: none;
    animation: heartbeat 2s ease-in-out, heartbeatFadeOut 2s ease-out forwards;
  `;
  
  // CSSアニメーションを動的に追加
  const style = document.createElement('style');
  style.textContent = `
    @keyframes heartbeat {
      0% {
        transform: rotate(180deg) scale(0.95);
        opacity: 0.5;
      }
      25% {
        transform: rotate(180deg) scale(1.05);
        opacity: 0.6;
      }
      50% {
        transform: rotate(180deg) scale(0.95);
        opacity: 0.5;
      }
      75% {
        transform: rotate(180deg) scale(1.08);
        opacity: 0.65;
      }
      100% {
        transform: rotate(180deg) scale(0.95);
        opacity: 0.5;
      }
    }
    
    @keyframes heartbeatFadeOut {
      0% {
        opacity: 0.5;
      }
      50% {
        opacity: 0.3;
      }
      100% {
        opacity: 0;
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(heartbeatBg);
  
  console.log('💓 心臓鼓動演出を表示');
  
  // 2秒後に削除
  setTimeout(() => {
    if (heartbeatBg.parentNode) heartbeatBg.parentNode.removeChild(heartbeatBg);
    if (style.parentNode) style.parentNode.removeChild(style);
    console.log('💓 心臓鼓動演出を終了');
  }, 2000);
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

// 🔸 印刷用画像データ生成機能
function generatePrintImageData() {
  const downloadCanvas = document.createElement('canvas');
  const downloadCtx = downloadCanvas.getContext('2d');
  
  // ダウンロード用キャンバスサイズを設定
  downloadCanvas.width = drawingAreaSize.width;
  downloadCanvas.height = drawingAreaSize.height;
  
  console.log(`🖨️ 印刷モード: ${currentPrintMode}`);
  
  if (currentPrintMode === "fullMode") {
    // フルモード: 背景画像も含める
    console.log(`🖨️ フルモード: 背景画像を含めて印刷`);
    
    // 背景を白で塗りつぶし（ベース）
    downloadCtx.fillStyle = '#ffffff';
    downloadCtx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
    
    // 背景画像がある場合は描画
    if (backgroundImage) {
      downloadCtx.save();
      
      // 描画エリアに合わせて背景画像をスケール・配置
      let bgWidth = drawingAreaSize.width;
      let bgHeight = drawingAreaSize.height;
      
      // 用紙サイズに応じた背景サイズ調整
      if (currentPaperSize === "L") {
        if (lastBackgroundSrc && (lastBackgroundSrc.includes('back3') || lastBackgroundSrc.includes('back4'))) {
          bgWidth = drawingAreaSize.width * 0.90;
          bgHeight = drawingAreaSize.height * 0.90;
        } else if (lastBackgroundSrc && lastBackgroundSrc.includes('back2')) {
          bgWidth = drawingAreaSize.width * 0.86;
          bgHeight = drawingAreaSize.height * 0.86;
        }
      } else if (currentPaperSize === "A4") {
        if (lastBackgroundSrc && (lastBackgroundSrc.includes('back3') || lastBackgroundSrc.includes('back4'))) {
          bgWidth = drawingAreaSize.width * 0.92;
          bgHeight = drawingAreaSize.height * 0.92;
        } else if (lastBackgroundSrc && lastBackgroundSrc.includes('back2')) {
          bgWidth = drawingAreaSize.width * 0.88;
          bgHeight = drawingAreaSize.height * 0.88;
        }
      }
      
      // 中央配置の計算
      const bgX = (drawingAreaSize.width - bgWidth) / 2;
      const bgY = (drawingAreaSize.height - bgHeight) / 2;
      
      // 背景画像を180度回転して送信側の元の向きに戻す
      downloadCtx.translate(bgX + bgWidth / 2, bgY + bgHeight / 2);
      downloadCtx.rotate(Math.PI);
      downloadCtx.translate(-bgWidth / 2, -bgHeight / 2);
      
      downloadCtx.drawImage(backgroundImage, 0, 0, bgWidth, bgHeight);
      downloadCtx.restore();
      
      console.log(`🖨️ 背景画像を描画: ${bgWidth}x${bgHeight} at (${bgX}, ${bgY})`);
    }
  } else {
    // 描画モード: 背景を白で塗りつぶし（従来通り）
    console.log(`🖨️ 描画モード: 描画のみ印刷`);
    downloadCtx.fillStyle = '#ffffff';
    downloadCtx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
  }
  
  // 筆跡を描画（両モード共通）- 送信側の元の向きで描画（回転なし）
  
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
  
  // 🔸 印刷用画像を送信側の元の向きで生成
  console.log('🔄 印刷用画像を送信側の元の向きで生成完了');
  
  // 画像データを返す（送信側の元の向き）
  return downloadCanvas.toDataURL("image/png");
}

// 🔸 180度回転ダウンロード機能
function downloadRotated() {
  try {
    // 新しい画像生成関数を使用
    const imageDataUrl = generatePrintImageData();
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