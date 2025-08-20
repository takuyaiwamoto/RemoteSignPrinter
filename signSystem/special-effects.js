// special-effects.js - 特殊エフェクト関連の機能を分離
// 元ファイル: remotesign.html
// 分離日: 2025-08-20

// ==========================================
// 特殊エフェクト関数群（ハート、花火、紙吹雪）
// ==========================================

// ハート生成関数
function createHeart() {
  // ハート生成開始
  const heart = document.createElement('div');
  heart.className = 'heart';
  
  // ランダムなゆらゆら効果を生成
  const randomAnimationName = `heartFloat_${Math.random().toString(36).substr(2, 9)}`;
  const randomMoves = [];
  for (let i = 0; i <= 5; i++) {
    const randomX = (Math.random() - 0.5) * 30; // -15px to 15px
    randomMoves.push(randomX);
  }
  
  // ランダム移動値計算
  
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
  // スタイル追加
  
  // ランダムアニメーションを適用
  heart.style.animation = `${randomAnimationName} 3s linear forwards`;
  
  // デバッグ用スタイル追加
  heart.style.border = '2px solid red';
  heart.style.zIndex = '99999';
  
  document.body.appendChild(heart);
  // ハートをDOMに追加
  
  // 音楽再生は受信側のみ（送信側では削除）
  
  // アニメーション終了後削除（スタイルも削除）
  setTimeout(() => {
    if (heart.parentNode) {
      heart.parentNode.removeChild(heart);
      // ハート削除
    }
    if (style.parentNode) {
      style.parentNode.removeChild(style);
      // スタイル削除
    }
  }, 3000);
}

// 特別演出用の大きなハート生成関数
function createSpecialHeart() {
  // 特別ハート演出開始
  
  // 30個のハートを30ms間隔で生成
  for (let i = 0; i < 30; i++) {
    setTimeout(() => {
      const heart = document.createElement('div');
      heart.className = 'special-heart';
      
      // ランダムなアニメーション名を生成
      const randomAnimationName = `specialHeartFloat_${Math.random().toString(36).substr(2, 9)}`;
      
      // 中央から±300px（合計600px）の範囲でランダム配置
      const windowCenterX = window.innerWidth / 2;
      const randomX = windowCenterX + (Math.random() - 0.5) * 600; // -300px to +300px
      
      // 特別ハート配置
      
      // 個別のキーフレームアニメーションを動的に生成
      const style = document.createElement('style');
      style.textContent = `
        @keyframes ${randomAnimationName} {
          0% {
            opacity: 1;
            transform: rotate(45deg) scale(0.5) translateX(0px);
            bottom: 10px;
          }
          25% {
            opacity: 1;
            transform: rotate(45deg) scale(0.8) translateX(${(Math.random() - 0.5) * 80}px);
            bottom: 100px;
          }
          50% {
            opacity: 0.9;
            transform: rotate(45deg) scale(1.2) translateX(${(Math.random() - 0.5) * 120}px);
            bottom: 200px;
          }
          75% {
            opacity: 0.6;
            transform: rotate(45deg) scale(0.9) translateX(${(Math.random() - 0.5) * 100}px);
            bottom: 300px;
          }
          100% {
            opacity: 0;
            transform: rotate(45deg) scale(0.3) translateX(${(Math.random() - 0.5) * 150}px);
            bottom: 400px;
          }
        }
      `;
      
      document.head.appendChild(style);
      
      // ハートにランダム配置とアニメーションを適用
      heart.style.left = randomX + 'px';
      heart.style.animation = `${randomAnimationName} 4s ease-out forwards`;
      
      // ランダムな色の特別ハート
      const heartColors = ['#ff1493', '#ff69b4', '#ff6347', '#ff1493', '#db7093', '#c71585', '#ff007f', '#ff3399'];
      const heartColor = heartColors[Math.floor(Math.random() * heartColors.length)];
      heart.style.backgroundColor = heartColor;
      heart.style.boxShadow = `0 0 20px ${heartColor}, 0 0 40px ${heartColor}`;
      
      document.body.appendChild(heart);
      
      // アニメーション終了後削除（スタイルも削除）
      setTimeout(() => {
        if (heart.parentNode) {
          heart.parentNode.removeChild(heart);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 4000);
    }, i * 30); // 30ms間隔
  }
}

// 花火アニメーション関数
function createFireworks() {
  // console.log('🎆 打ち上げ花火演出を開始（リッチバージョン）');
  
  // 🔸 花火アニメーションを追加
  addSenderFireworkAnimations();
  
  // 受信側に花火テスト指示を送信
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "fireworksTest"
    }));
    // console.log('🎆 受信側に花火テスト指示を送信');
  }
  
  // 複数の打ち上げ花火を生成（超派手に改良）
  for (let i = 0; i < 18; i++) {
    setTimeout(() => {
      // 画面下部からランダムな位置で花火を発射
      const launchX = Math.random() * (window.innerWidth - 100) + 50; // 端から50px離す
      const targetY = Math.random() * (window.innerHeight * 0.5) + 80; // 上部50%の範囲に拡大
      
      // console.log(`🎆 花火${i+1}発射: X=${launchX}, Y=${targetY}`);
      
      // 花火の軌道となる要素を作成（より派手に）
      const firework = document.createElement('div');
      firework.className = 'firework';
      
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
      // console.log(`🎆 花火${i+1}要素を追加`);
      
      // 打ち上げアニメーション（即座に開始）
      const launchDuration = 1000 + Math.random() * 500; // 1000-1500ms
      setTimeout(() => {
        firework.style.transition = `bottom ${launchDuration}ms ease-out`;
        firework.style.bottom = (window.innerHeight - targetY) + 'px';
        // console.log(`🎆 花火${i+1}打ち上げ開始`);
      }, 50);
      
      // 花火爆発
      setTimeout(() => {
        // console.log(`🎆 花火${i+1}爆発開始`);
        firework.style.display = 'none';
        createExplosion(launchX, targetY);
      }, launchDuration + 100);
      
      // 花火要素を削除
      setTimeout(() => {
        if (firework.parentNode) firework.parentNode.removeChild(firework);
        // console.log(`🎆 花火${i+1}要素削除`);
      }, launchDuration + 200);
      
    }, i * 350); // 350msずつ時間差で発射（6.5秒継続: 18発 × 350ms = 6.3秒）
  }
}

// 花火爆発エフェクト（超派手に改良）
function createExplosion(x, y) {
  // console.log(`💥 爆発エフェクト開始: X=${x}, Y=${y}`);
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff', '#ffd700', '#ff69b4', '#32cd32', '#ff4500', '#8a2be2', '#00ced1', '#ff6347', '#9370db'];
  const particles = 24; // 爆発する粒子数を大幅増加
  
  for (let i = 0; i < particles; i++) {
    const particle = document.createElement('div');
    particle.className = 'firework-particle';
    
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
    const keyframeName = `explode_${randomId}`;
    
    const endX = x + Math.cos(angle * Math.PI / 180) * distance;
    const endY = y + Math.sin(angle * Math.PI / 180) * distance;
    
    const keyframes = `
      @keyframes ${keyframeName} {
        0% {
          transform: translate(0, 0) scale(1);
          opacity: 1;
        }
        70% {
          transform: translate(${endX - x}px, ${endY - y}px) scale(0.8);
          opacity: 0.6;
        }
        100% {
          transform: translate(${(endX - x) * 1.3}px, ${(endY - y) * 1.3}px) scale(0.2);
          opacity: 0;
        }
      }
    `;
    
    // スタイルシートに追加
    const styleSheet = document.createElement('style');
    styleSheet.textContent = keyframes;
    document.head.appendChild(styleSheet);
    
    // アニメーションを適用
    particle.style.animation = `${keyframeName} 1.5s ease-out forwards`;
    
    document.body.appendChild(particle);
    
    // パーティクルとスタイルシートを削除
    setTimeout(() => {
      if (particle.parentNode) particle.parentNode.removeChild(particle);
      if (styleSheet.parentNode) styleSheet.parentNode.removeChild(styleSheet);
    }, 1500);
  }
}

// 紙吹雪エフェクト
function createConfetti() {
  // console.log('🎊 紙吹雪エフェクト開始');
  
  // 受信側に紙吹雪テスト指示を送信
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "confettiTest"
    }));
    // console.log('🎊 受信側に紙吹雪テスト指示を送信');
  }
  
  // 紙吹雪パーティクルを大量生成
  for (let i = 0; i < 100; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      
      // ランダムな色の紙吹雪
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4', '#ffd700', '#32cd32'];
      const confettiColor = colors[Math.floor(Math.random() * colors.length)];
      
      // ランダムな開始位置（画面上部）
      const startX = Math.random() * window.innerWidth;
      const startY = -20;
      
      confetti.style.cssText = `
        position: fixed;
        left: ${startX}px;
        top: ${startY}px;
        width: 8px;
        height: 8px;
        background: ${confettiColor};
        z-index: 10002;
        pointer-events: none;
        transform: rotate(${Math.random() * 360}deg);
      `;
      
      // ランダムな落下アニメーション
      const randomId = Math.random().toString(36).substr(2, 9);
      const keyframeName = `confettiFall_${randomId}`;
      
      const endX = startX + (Math.random() - 0.5) * 200; // -100px to +100px
      const fallDuration = 3000 + Math.random() * 2000; // 3-5秒
      
      const keyframes = `
        @keyframes ${keyframeName} {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(${window.innerHeight + 50}px) translateX(${endX - startX}px) rotate(720deg);
            opacity: 0;
          }
        }
      `;
      
      const styleSheet = document.createElement('style');
      styleSheet.textContent = keyframes;
      document.head.appendChild(styleSheet);
      
      confetti.style.animation = `${keyframeName} ${fallDuration}ms linear forwards`;
      
      document.body.appendChild(confetti);
      
      // 紙吹雪とスタイルシートを削除
      setTimeout(() => {
        if (confetti.parentNode) confetti.parentNode.removeChild(confetti);
        if (styleSheet.parentNode) styleSheet.parentNode.removeChild(styleSheet);
      }, fallDuration + 100);
      
    }, i * 20); // 20ms間隔で生成
  }
}

// 花火アニメーション用のCSSを追加する関数
function addSenderFireworkAnimations() {
  if (document.getElementById('senderFireworkAnimations')) return; // 既に追加済みの場合はスキップ
  
  const style = document.createElement('style');
  style.id = 'senderFireworkAnimations';
  style.textContent = `
    @keyframes fireworkPulse {
      0% { transform: scale(1); }
      100% { transform: scale(1.2); }
    }
    
    @keyframes particleShimmer {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.1); }
      100% { opacity: 0; transform: scale(0.3); }
    }
  `;
  
  document.head.appendChild(style);
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ special-effects.js loaded successfully');