// rendering-effects.js
// エフェクト関連機能を統合管理（ハート、星、花火、紙吹雪、扉演出など）
// 分離元: renderer.js
// 作成日: 2025年09月06日

// ===========================
// 🎆 EFFECTS MANAGER - エフェクト管理クラス
// ===========================

/**
 * EffectsManagerクラス
 * 全エフェクト機能を統合管理
 */
class EffectsManager {
  constructor(config = {}) {
    // 設定値
    this.config = {
      fireworksCooldown: config.fireworksCooldown || 3000, // 花火のクールダウン時間（ms）
      ...config
    };
    
    // 状態管理
    this.lastFireworksTime = 0;
    this.doorAnimationInProgress = false;
    this.activeEffects = new Set();
    
    console.log('✅ EffectsManager初期化完了');
  }
  
  // ===========================
  // 💖 HEART EFFECTS - ハートエフェクト
  // ===========================
  
  /**
   * 受信側ハートエフェクト
   * @param {number} x - X座標
   * @param {number} y - Y座標
   */
  createReceiverHeart(x, y) {
    console.log(`💖 受信側にハートを生成開始: (${x}, ${y})`);
    
    const heartCount = Math.floor(Math.random() * 3) + 3; // 3-5個
    console.log(`💖 生成するハートの数: ${heartCount}`);
    
    for (let i = 0; i < heartCount; i++) {
      const heart = document.createElement('div');
      heart.className = 'receiver-drawing-heart';
      
      // 色をランダムに変更
      const colors = ['#ff1493', '#ff69b4', '#ff0066', '#ff3399', '#cc0066'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      heart.style.setProperty('--heart-color', randomColor);
      
      // 位置をランダムに散らす（元の位置周辺）
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 60;
      const finalX = x + offsetX;
      const finalY = y + offsetY;
      
      heart.style.left = finalX + 'px';
      heart.style.top = finalY + 'px';
      
      document.body.appendChild(heart);
      
      // アニメーション完了後に削除
      setTimeout(() => {
        if (heart.parentNode) {
          heart.parentNode.removeChild(heart);
        }
      }, 1500);
    }
  }
  
  /**
   * 通常ハートエフェクト
   */
  createHeart() {
    console.log('💖 ハート生成開始（受信側）');
    const heart = document.createElement('div');
    heart.className = 'heart';
    
    // ランダム色設定
    const colors = ['#ff1493', '#ff69b4', '#ff0066', '#ff6347', '#ff1493'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // ランダム移動パターン
    const randomMoves = Array.from({ length: 10 }, () => Math.random() * 40 - 20);
    console.log(`💖 ランダム移動値: [${randomMoves.join(', ')}]`);
    
    // アニメーション作成
    const randomAnimationName = `heartMove${Date.now()}${Math.floor(Math.random() * 1000)}`;
    this.createHeartAnimation(randomAnimationName, randomMoves);
    
    // スタイル設定
    Object.assign(heart.style, {
      position: 'fixed',
      width: '20px',
      height: '18px',
      background: randomColor,
      left: (Math.random() * (window.innerWidth - 50)) + 'px',
      top: (window.innerHeight - 50) + 'px',
      transform: 'rotate(45deg)',
      borderRadius: '50%',
      animation: `${randomAnimationName} 3s ease-out forwards`,
      zIndex: '9999',
      pointerEvents: 'none',
      filter: 'drop-shadow(0 0 10px rgba(255, 20, 147, 0.8))'
    });
    
    // 疑似要素の代わりに子要素でハート形状を作成
    this.createHeartShape(heart, randomColor);
    
    document.body.appendChild(heart);
    console.log('💖 ハートをDOMに追加（受信側）:', heart);
    
    // 3秒後に削除
    setTimeout(() => {
      if (heart.parentNode) {
        heart.parentNode.removeChild(heart);
        console.log('💖 ハート削除（受信側）');
      }
    }, 3000);
  }
  
  /**
   * ハート形状作成
   */
  createHeartShape(heart, color) {
    const before = document.createElement('div');
    const after = document.createElement('div');
    
    [before, after].forEach((element, index) => {
      Object.assign(element.style, {
        content: '""',
        width: '20px',
        height: '18px',
        position: 'absolute',
        background: color,
        borderRadius: '50%',
        top: index === 0 ? '-9px' : '0px',
        left: index === 0 ? '0px' : '-9px'
      });
      heart.appendChild(element);
    });
  }
  
  /**
   * ハートアニメーション作成
   */
  createHeartAnimation(name, moves) {
    const style = document.createElement('style');
    let keyframes = `@keyframes ${name} {\n  0% { opacity: 1; transform: rotate(45deg) scale(0.3) translateY(0px); }\n`;
    
    moves.forEach((move, i) => {
      const percent = ((i + 1) * 10);
      keyframes += `  ${percent}% { transform: rotate(45deg) scale(${0.3 + (i * 0.07)}) translateY(-${(i + 1) * 30}px) translateX(${move}px); }\n`;
    });
    
    keyframes += '  100% { opacity: 0; transform: rotate(45deg) scale(0.5) translateY(-400px); }\n}';
    
    style.textContent = keyframes;
    document.head.appendChild(style);
    
    setTimeout(() => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 4000);
  }
  
  /**
   * 特別演出用の大きなハート
   */
  createSpecialHeart() {
    console.log('✨ 特別ハート生成開始');
    const heart = document.createElement('div');
    heart.className = 'special-heart';
    
    // 大きなハートのスタイル設定
    Object.assign(heart.style, {
      position: 'fixed',
      width: '40px',
      height: '36px',
      background: '#ff1493',
      left: (Math.random() * (window.innerWidth - 100)) + 'px',
      top: (window.innerHeight - 100) + 'px',
      transform: 'rotate(45deg)',
      borderRadius: '50%',
      animation: 'specialHeartFloat 4s ease-out forwards',
      zIndex: '9998',
      pointerEvents: 'none',
      filter: 'drop-shadow(0 0 20px rgba(255, 20, 147, 1.0))',
      boxShadow: '0 0 30px #ff1493, 0 0 60px #ff1493'
    });
    
    // 大きなハート形状作成
    this.createHeartShape(heart, '#ff1493');
    
    document.body.appendChild(heart);
    
    setTimeout(() => {
      if (heart.parentNode) {
        heart.parentNode.removeChild(heart);
      }
    }, 4000);
  }
  
  /**
   * Electron透明ウィンドウにハート追加
   */
  createSpecialHeartInOverlay(x) {
    const heartData = { x, timestamp: Date.now() };
    if (typeof ipcRenderer !== 'undefined') {
      ipcRenderer.send('add-heart-to-transparent-window', heartData);
    }
  }
  
  // ===========================
  // 🌟 STAR EFFECTS - 星エフェクト
  // ===========================
  
  /**
   * 受信側星エフェクト
   * @param {number} x - X座標
   * @param {number} y - Y座標
   */
  createReceiverStar(x, y) {
    console.log(`🌟 createReceiverStar関数開始: (${x}, ${y})`);
    console.log(`⭐ 受信側に星を生成: (${x}, ${y})`);
    
    const starCount = Math.floor(Math.random() * 5) + 8;
    console.log(`🌟 生成する星の数: ${starCount}`);
    
    for (let i = 0; i < starCount; i++) {
      setTimeout(() => {
        const star = document.createElement('div');
        star.className = 'star';
        
        const offsetX = (Math.random() - 0.5) * 120;
        const offsetY = (Math.random() - 0.5) * 120;
        const finalX = x + offsetX;
        const finalY = y + offsetY;
        
        star.style.left = finalX + 'px';
        star.style.top = finalY + 'px';
        
        document.body.appendChild(star);
        
        setTimeout(() => {
          if (star.parentNode) {
            star.parentNode.removeChild(star);
          }
        }, 1000);
      }, i * 50);
    }
    
    console.log(`🌟 createReceiverStar関数完了: ${starCount}個の星を作成しました`);
  }
  
  // ===========================
  // 🎊 CONFETTI EFFECTS - 紙吹雪エフェクト
  // ===========================
  
  /**
   * 紙吹雪エフェクト（renzoku.mp3付き）
   */
  createConfettiEffect(playAudio = true) {
    console.log('🎊 紙吹雪エフェクト開始');
    
    const colors = [
      '#ff1493', '#00ff00', '#0000ff', '#ffff00', '#ff8000', '#8000ff', 
      '#ff0000', '#00ffff', '#ff69b4', '#ffd700', '#ff00ff', '#00ff7f', 
      '#ff4500', '#1e90ff', '#dc143c', '#ffa500'
    ];
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // 効果音を再生（AudioManager使用）
    if (playAudio && window.audioManager) {
      window.audioManager.playRenzokuSound().catch(e => {
        console.log('クラッカー音再生エラー:', e);
      });
    }
    
    this.executeConfettiEffect(colors, windowWidth, windowHeight);
  }
  
  /**
   * clack1.mp3付きの紙吹雪エフェクト
   */
  createConfettiEffectWithClack() {
    console.log('🎊 紙吹雪エフェクト開始（clack1.mp3再生）');
    
    const colors = [
      '#ff1493', '#00ff00', '#0000ff', '#ffff00', '#ff8000', '#8000ff', 
      '#ff0000', '#00ffff', '#ff69b4', '#ffd700', '#ff00ff', '#00ff7f', 
      '#ff4500', '#1e90ff', '#dc143c', '#ffa500'
    ];
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // clack1.mp3を再生（AudioManager使用）
    if (window.audioManager) {
      window.audioManager.playClackSound().catch(e => {
        console.log('clack1.mp3再生エラー:', e);
      });
      console.log('🔊 clack1.mp3再生開始');
    }
    
    this.executeConfettiEffect(colors, windowWidth, windowHeight);
  }
  
  /**
   * 紙吹雪エフェクト実行（共通処理）
   */
  executeConfettiEffect(colors, windowWidth, windowHeight) {
    // 左サイドから紙吹雪
    this.createSideConfetti('left', colors, windowWidth, windowHeight);
    // 右サイドから紙吹雪
    this.createSideConfetti('right', colors, windowWidth, windowHeight);
    // 上部から紙吹雪
    this.createTopConfetti(colors, windowWidth, windowHeight);
    // 追加：キラキラエフェクト
    this.createSparkleEffect(windowWidth, windowHeight);
  }
  
  /**
   * サイドからの紙吹雪
   */
  createSideConfetti(side, colors, windowWidth, windowHeight) {
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
          position: fixed;
          width: ${Math.random() * 8 + 6}px;
          height: ${Math.random() * 8 + 6}px;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          left: ${side === 'left' ? -10 : windowWidth + 10}px;
          top: ${Math.random() * windowHeight * 0.8}px;
          z-index: 20000;
          pointer-events: none;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(255,255,255,0.8);
        `;
        
        document.body.appendChild(confetti);
        
        // アニメーション
        const targetX = side === 'left' ? 
          Math.random() * windowWidth * 0.7 + windowWidth * 0.3 :
          Math.random() * windowWidth * 0.7;
        const targetY = Math.random() * windowHeight + windowHeight * 0.2;
        
        confetti.animate([
          { 
            transform: `translate(0, 0) rotate(0deg)`,
            opacity: 1
          },
          { 
            transform: `translate(${targetX - parseInt(confetti.style.left)}px, ${targetY}px) rotate(720deg)`,
            opacity: 0
          }
        ], {
          duration: 3000 + Math.random() * 2000,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        setTimeout(() => {
          if (confetti.parentNode) {
            confetti.parentNode.removeChild(confetti);
          }
        }, 5500);
      }, i * 30);
    }
  }
  
  /**
   * 上部からの紙吹雪
   */
  createTopConfetti(colors, windowWidth, windowHeight) {
    const confettiCount = 40;
    
    for (let i = 0; i < confettiCount; i++) {
      setTimeout(() => {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
          position: fixed;
          width: ${Math.random() * 10 + 8}px;
          height: ${Math.random() * 10 + 8}px;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          left: ${Math.random() * windowWidth}px;
          top: -20px;
          z-index: 20000;
          pointer-events: none;
          transform: rotate(${Math.random() * 360}deg);
          box-shadow: 0 0 15px rgba(255,255,255,0.9);
        `;
        
        document.body.appendChild(confetti);
        
        confetti.animate([
          { 
            transform: `translateY(0px) rotate(0deg) scale(1)`,
            opacity: 1
          },
          { 
            transform: `translateY(${windowHeight + 100}px) rotate(${360 + Math.random() * 720}deg) scale(0.3)`,
            opacity: 0
          }
        ], {
          duration: 4000 + Math.random() * 3000,
          easing: 'linear'
        });
        
        setTimeout(() => {
          if (confetti.parentNode) {
            confetti.parentNode.removeChild(confetti);
          }
        }, 8000);
      }, i * 50);
    }
  }
  
  /**
   * キラキラエフェクト
   */
  createSparkleEffect(windowWidth, windowHeight) {
    const sparkleCount = 60;
    
    for (let i = 0; i < sparkleCount; i++) {
      setTimeout(() => {
        const sparkle = document.createElement('div');
        sparkle.style.cssText = `
          position: fixed;
          width: 6px;
          height: 6px;
          background: #ffd700;
          left: ${Math.random() * windowWidth}px;
          top: ${Math.random() * windowHeight}px;
          z-index: 20001;
          pointer-events: none;
          border-radius: 50%;
          box-shadow: 0 0 15px #ffd700;
          clip-path: polygon(50% 0%, 59% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 41% 35%);
        `;
        
        document.body.appendChild(sparkle);
        
        sparkle.animate([
          { 
            opacity: 0,
            transform: 'scale(0) rotate(0deg)'
          },
          { 
            opacity: 1,
            transform: 'scale(1.5) rotate(180deg)'
          },
          { 
            opacity: 0,
            transform: 'scale(0) rotate(360deg)'
          }
        ], {
          duration: 2000 + Math.random() * 1000,
          easing: 'ease-in-out'
        });
        
        setTimeout(() => {
          if (sparkle.parentNode) {
            sparkle.parentNode.removeChild(sparkle);
          }
        }, 3500);
      }, i * 40);
    }
  }
  
  // ===========================
  // 🎆 FIREWORKS EFFECTS - 花火エフェクト
  // ===========================
  
  /**
   * 受信側花火演出
   */
  createReceiverFireworks() {
    // 重複実行防止チェック
    const now = Date.now();
    if (now - this.lastFireworksTime < this.config.fireworksCooldown) {
      console.log('🎆 花火演出: クールダウン中のためスキップ');
      return;
    }
    this.lastFireworksTime = now;
    
    // fire.wavを再生（AudioManager使用）
    if (window.audioManager) {
      window.audioManager.playFireSound().catch(e => {
        console.log('fire.wav再生エラー:', e);
      });
      console.log('🔊 fire.wav再生開始');
    }
    
    // 複数の打ち上げ花火を生成
    for (let i = 0; i < 18; i++) {
      setTimeout(() => {
        const launchX = Math.random() * (window.innerWidth - 100) + 50;
        const targetY = Math.random() * (window.innerHeight * 0.5) + 80;
        
        this.createSingleFirework(launchX, targetY);
      }, i * 200);
    }
  }
  
  /**
   * 単発花火作成
   */
  createSingleFirework(launchX, targetY) {
    // 打ち上げフェーズ
    const launch = document.createElement('div');
    launch.style.cssText = `
      position: fixed;
      width: 4px;
      height: 4px;
      background: #ffff00;
      left: ${launchX}px;
      top: ${window.innerHeight - 50}px;
      z-index: 20000;
      pointer-events: none;
      box-shadow: 0 0 10px #ffff00;
    `;
    
    document.body.appendChild(launch);
    
    // 打ち上げアニメーション
    launch.animate([
      { top: `${window.innerHeight - 50}px` },
      { top: `${targetY}px` }
    ], {
      duration: 1000,
      easing: 'ease-out'
    });
    
    // 爆発エフェクト
    setTimeout(() => {
      if (launch.parentNode) {
        launch.parentNode.removeChild(launch);
      }
      
      this.createFireworkExplosion(launchX, targetY);
    }, 1000);
  }
  
  /**
   * 花火爆発エフェクト
   */
  createFireworkExplosion(centerX, centerY) {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      const angle = (i / particleCount) * Math.PI * 2;
      const velocity = 150 + Math.random() * 100;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      particle.style.cssText = `
        position: fixed;
        width: 4px;
        height: 4px;
        background: ${color};
        left: ${centerX}px;
        top: ${centerY}px;
        z-index: 20000;
        pointer-events: none;
        box-shadow: 0 0 10px ${color};
      `;
      
      document.body.appendChild(particle);
      
      // 爆発アニメーション
      particle.animate([
        { 
          left: `${centerX}px`,
          top: `${centerY}px`,
          opacity: 1
        },
        { 
          left: `${centerX + Math.cos(angle) * velocity}px`,
          top: `${centerY + Math.sin(angle) * velocity}px`,
          opacity: 0
        }
      ], {
        duration: 2000,
        easing: 'ease-out'
      });
      
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 2000);
    }
  }
  
  // ===========================
  // 🚪 DOOR EFFECTS - 扉演出
  // ===========================
  
  /**
   * 動画用の扉作成（閉じた状態）
   */
  createDoorForVideo() {
    console.log('🚪 動画用の扉を作成（閉じた状態）');
    
    const leftDoor = document.createElement('div');
    const rightDoor = document.createElement('div');
    
    const doorStyle = `
      position: fixed;
      top: 0;
      width: 50vw;
      height: 100vh;
      background: linear-gradient(45deg, #2c3e50, #34495e);
      z-index: 15000;
      transition: transform 1s ease-in-out;
      box-shadow: inset 0 0 50px rgba(0,0,0,0.3);
    `;
    
    leftDoor.style.cssText = doorStyle + 'left: 0;';
    rightDoor.style.cssText = doorStyle + 'right: 0;';
    
    // 扉のハンドル追加
    [leftDoor, rightDoor].forEach((door, index) => {
      const handle = document.createElement('div');
      handle.style.cssText = `
        position: absolute;
        top: 50%;
        ${index === 0 ? 'right' : 'left'}: 20px;
        width: 15px;
        height: 60px;
        background: #f39c12;
        border-radius: 10px;
        box-shadow: 0 0 20px rgba(243, 156, 18, 0.8);
        transform: translateY(-50%);
      `;
      door.appendChild(handle);
    });
    
    document.body.appendChild(leftDoor);
    document.body.appendChild(rightDoor);
    
    return { leftDoor, rightDoor };
  }
  
  /**
   * 心臓鼓動演出
   */
  createHeartbeatEffect() {
    console.log('💓 心臓鼓動演出を開始');
    
    const heartbeat = document.createElement('div');
    heartbeat.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle, rgba(255,0,0,0.3) 0%, rgba(255,0,0,0.1) 30%, transparent 60%);
      z-index: 14000;
      pointer-events: none;
      opacity: 0;
    `;
    
    document.body.appendChild(heartbeat);
    
    // 心臓鼓動パターン
    const pulsePattern = [
      { opacity: 0.6, duration: 200 },
      { opacity: 0, duration: 100 },
      { opacity: 0.8, duration: 200 },
      { opacity: 0, duration: 600 }
    ];
    
    let currentStep = 0;
    const heartbeatCycle = () => {
      const step = pulsePattern[currentStep];
      
      heartbeat.animate([
        { opacity: heartbeat.style.opacity || 0 },
        { opacity: step.opacity }
      ], {
        duration: step.duration,
        fill: 'forwards'
      });
      
      currentStep = (currentStep + 1) % pulsePattern.length;
      
      setTimeout(heartbeatCycle, step.duration);
    };
    
    heartbeatCycle();
    
    // 10秒後に削除
    setTimeout(() => {
      if (heartbeat.parentNode) {
        heartbeat.parentNode.removeChild(heartbeat);
      }
    }, 10000);
  }
  
  // ===========================
  // 🧹 UTILITY METHODS - ユーティリティメソッド
  // ===========================
  
  /**
   * 扉演出状態設定
   */
  setDoorAnimationInProgress(inProgress) {
    this.doorAnimationInProgress = inProgress;
  }
  
  /**
   * 扉演出状態取得
   */
  isDoorAnimationInProgress() {
    return this.doorAnimationInProgress;
  }
  
  /**
   * 全エフェクトクリア
   */
  clearAllEffects() {
    // アクティブエフェクトをクリア
    this.activeEffects.clear();
    
    // DOM上のエフェクト要素をクリア
    const effectSelectors = [
      '.receiver-drawing-heart',
      '.heart',
      '.special-heart',
      '.star',
      '.confetti',
      '.sparkle',
      '.firework'
    ];
    
    effectSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    });
    
    console.log('🧹 全エフェクトをクリア');
  }
  
  /**
   * EffectsManagerのクリーンアップ
   */
  dispose() {
    this.clearAllEffects();
    console.log('🗑️ EffectsManager disposed');
  }
}

// ===========================
// 🔗 LEGACY COMPATIBILITY - 後方互換性サポート
// ===========================

// 既存のグローバル関数として公開（段階的移行用）
let effectsManager = null;
let doorAnimationInProgress = false; // グローバル変数として維持

function initializeEffectsManager(config = {}) {
  effectsManager = new EffectsManager(config);
  return effectsManager;
}

// レガシー関数群
function createReceiverHeart(x, y) {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createReceiverHeart(x, y);
}

function createHeart() {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createHeart();
}

function createReceiverStar(x, y) {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createReceiverStar(x, y);
}

function createSpecialHeart() {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createSpecialHeart();
}

function createSpecialHeartInOverlay(x) {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createSpecialHeartInOverlay(x);
}

function createConfettiEffect(playAudio = true) {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createConfettiEffect(playAudio);
}

function createConfettiEffectWithClack() {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createConfettiEffectWithClack();
}

function executeConfettiEffect(colors, windowWidth, windowHeight) {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.executeConfettiEffect(colors, windowWidth, windowHeight);
}

function createSideConfetti(side, colors, windowWidth, windowHeight) {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createSideConfetti(side, colors, windowWidth, windowHeight);
}

function createTopConfetti(colors, windowWidth, windowHeight) {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createTopConfetti(colors, windowWidth, windowHeight);
}

function createSparkleEffect(windowWidth, windowHeight) {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createSparkleEffect(windowWidth, windowHeight);
}

function createReceiverFireworks() {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createReceiverFireworks();
}

function createDoorForVideo() {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createDoorForVideo();
}

function createHeartbeatEffect() {
  if (!effectsManager) effectsManager = new EffectsManager();
  return effectsManager.createHeartbeatEffect();
}

// ===========================
// 📤 EXPORTS - エクスポート
// ===========================

// Node.js環境とブラウザ環境の両方に対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EffectsManager;
} else if (typeof window !== 'undefined') {
  window.EffectsManager = EffectsManager;
  window.initializeEffectsManager = initializeEffectsManager;
}

console.log('✅ rendering-effects.js loaded successfully');