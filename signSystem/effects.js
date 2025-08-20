// effects.js - 視覚エフェクト関連の機能を分離
// 元ファイル: remotesign.html
// 分離日: 2025-08-20

// ==========================================
// 描画エフェクト関数群
// ==========================================

// 描画中のハートエフェクトを生成する関数
function createDrawingHeart(x, y) {
  // ハートを少数生成（1-3個）
  const heartCount = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < heartCount; i++) {
    const heart = document.createElement('div');
    heart.className = 'drawing-heart';
    
    // ペン先により近い範囲にランダム配置（18px範囲）
    const offsetX = (Math.random() - 0.5) * 18;
    const offsetY = (Math.random() - 0.5) * 18;
    
    heart.style.left = (x + offsetX) + 'px';
    heart.style.top = (y + offsetY) + 'px';
    
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
    
    document.body.appendChild(heart);
    console.log(`💖 ハート ${i + 1} を body に追加しました`);
    
    // アニメーション終了後にハートを削除
    setTimeout(() => {
      if (heart.parentNode) {
        heart.parentNode.removeChild(heart);
      }
    }, 1500);
  }
}

// 書き手側星エフェクトを生成する関数
function createSenderStar(x, y) {
  // 星の数（1個、たまに2個）
  const starCount = Math.random() < 0.3 ? 2 : 1;
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'sender-star';
    
    // ペン先周辺にランダム配置（50px範囲）
    const offsetX = (Math.random() - 0.5) * 50;
    const offsetY = (Math.random() - 0.5) * 50;
    
    const finalX = x + offsetX;
    const finalY = y + offsetY;
    
    star.style.left = finalX + 'px';
    star.style.top = finalY + 'px';
    
    document.body.appendChild(star);
    
    // アニメーション終了後に星を削除
    setTimeout(() => {
      if (star.parentNode) {
        star.parentNode.removeChild(star);
      }
    }, 1000);
  }
}

// 妖精の粉を生成する関数
function createFairyDust(x, y) {
  // 妖精の粉を極少数生成（1-2個）
  const dustCount = Math.floor(Math.random() * 2) + 1;
  
  for (let i = 0; i < dustCount; i++) {
    const dust = document.createElement('div');
    dust.className = 'fairy-dust';
    
    // ペン先により近い範囲にランダム配置（20px範囲）
    const offsetX = (Math.random() - 0.5) * 20;
    const offsetY = (Math.random() - 0.5) * 20;
    
    dust.style.left = (x + offsetX) + 'px';
    dust.style.top = (y + offsetY) + 'px';
    
    // ランダムな色（キラキラした色）
    const colors = ['#fff', '#f0f8ff', '#e6e6fa', '#fffacd', '#f5f5dc', '#ffefd5'];
    dust.style.background = colors[Math.floor(Math.random() * colors.length)];
    dust.style.boxShadow = `0 0 6px ${dust.style.background}, 0 0 12px ${dust.style.background}, 0 0 18px ${dust.style.background}`;
    
    // ランダムな遅延でアニメーション開始
    dust.style.animationDelay = (Math.random() * 0.5) + 's';
    
    document.body.appendChild(dust);
    
    // アニメーション終了後に妖精の粉を削除
    setTimeout(() => {
      if (dust.parentNode) {
        dust.parentNode.removeChild(dust);
      }
    }, 3000);
  }
}

// 星を生成する関数（飛び散る効果）
function createStar(x, y) {
  // 星の数をさらに減らす（1個、たまに2個）
  const starCount = Math.random() < 0.3 ? 2 : 1;
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    
    // ペン先により近い範囲にランダム配置（15px範囲）
    const offsetX = (Math.random() - 0.5) * 15;
    const offsetY = (Math.random() - 0.5) * 15;
    
    star.style.left = (x + offsetX) + 'px';
    star.style.top = (y + offsetY) + 'px';
    
    // ランダムな色（金色系）
    const colors = ['gold', '#FFD700', '#FFA500', '#FFFF00', '#FFE4B5', '#FFFACD'];
    star.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    // ランダムな飛び散り方向
    const direction = Math.random() * 360;
    star.style.setProperty('--fly-direction', direction + 'deg');
    
    // ランダムな遅延でアニメーション開始
    star.style.animationDelay = (Math.random() * 0.3) + 's';
    
    document.body.appendChild(star);
    
    // アニメーション終了後に星を削除
    setTimeout(() => {
      if (star.parentNode) {
        star.parentNode.removeChild(star);
      }
    }, 1000);
  }
}

// ==========================================
// エフェクトトグル関数群
// ==========================================

// 星エフェクトのON/OFF切り替え
function toggleStarEffect() {
  starEffectEnabled = document.getElementById('starEffect').checked;
  // console.log(`⭐ 星エフェクト: ${starEffectEnabled ? 'ON' : 'OFF'}`);
  
  // 受信側に星エフェクト状態を送信
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ 
      type: "starEffect", 
      enabled: starEffectEnabled 
    }));
  }
}

// 妖精の粉エフェクトのON/OFF切り替え
function toggleFairyDustEffect() {
  fairyDustEffectEnabled = document.getElementById('fairyDustEffect').checked;
  // console.log(`✨ 妖精の粉エフェクト: ${fairyDustEffectEnabled ? 'ON' : 'OFF'}`);
  
  // 受信側に妖精の粉エフェクト状態を送信
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ 
      type: "fairyDustEffect", 
      enabled: fairyDustEffectEnabled 
    }));
  }
}

// ハートエフェクトのON/OFF切り替え
function toggleHeartEffect() {
  heartEffectEnabled = document.getElementById('heartEffect').checked;
  // ハートエフェクト設定
  
  // 受信側にハートエフェクト状態を送信
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ 
      type: "heartEffect", 
      enabled: heartEffectEnabled 
    }));
  }
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ effects.js loaded successfully');