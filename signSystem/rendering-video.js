// rendering-video.js
// 動画関連機能を統合管理（動画再生、背景動画、動画ウィンドウ制御など）
// 分離元: renderer.js
// 作成日: 2025年09月06日

// ===========================
// 🎬 VIDEO MANAGER - 動画管理クラス
// ===========================

/**
 * VideoManagerクラス
 * 全動画関連機能を統合管理
 */
class VideoManager {
  constructor(config = {}) {
    // 設定値
    this.config = {
      videoZIndex: config.videoZIndex || 1000,
      videoPattern: config.videoPattern || 1,
      videoTop: config.videoTop || 100,
      ...config
    };
    
    // 状態管理
    this.currentVideoElement = null;
    this.videoBackgroundElement = null;
    this.videoWindowCreated = false;
    this.videoPlaybackDisabled = false;
    
    console.log('✅ VideoManager初期化完了');
  }
  
  // ===========================
  // 🎬 VIDEO ELEMENT CREATION - 動画要素作成
  // ===========================
  
  /**
   * 動画要素作成
   * @returns {HTMLVideoElement} 動画要素
   */
  createVideoElement() {
    // 既存の動画要素があれば削除
    if (this.currentVideoElement) {
      this.currentVideoElement.remove();
      this.currentVideoElement = null;
    }
    
    const video = document.createElement('video');
    video.src = './movie.mp4';
    video.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      max-width: 90vw;
      max-height: 75vh;
      width: auto;
      height: auto;
      object-fit: contain;
      z-index: ${this.config.videoZIndex};
      pointer-events: none;
      opacity: 0;
      transition: opacity 1s ease-in-out;
    `;
    
    document.body.appendChild(video);
    this.currentVideoElement = video;
    
    return video;
  }
  
  /**
   * 動画背景要素作成
   * @param {Object} canvasSize - キャンバスサイズ
   * @returns {HTMLVideoElement} 背景動画要素
   */
  createVideoBackgroundElement(canvasSize) {
    // 既存の背景動画があれば削除
    if (this.videoBackgroundElement) {
      this.videoBackgroundElement.remove();
      this.videoBackgroundElement = null;
    }
    
    this.videoBackgroundElement = document.createElement('video');
    this.videoBackgroundElement.src = './back6.mp4';
    this.videoBackgroundElement.loop = true;
    this.videoBackgroundElement.muted = true;
    this.videoBackgroundElement.autoplay = true;
    this.videoBackgroundElement.style.cssText = `
      position: fixed;
      object-fit: cover;
      pointer-events: none;
      z-index: -1;
    `;
    
    // サイズと位置の設定
    this.updateVideoBackgroundSize(canvasSize);
    
    document.body.appendChild(this.videoBackgroundElement);
    
    return this.videoBackgroundElement;
  }
  
  /**
   * 動画背景のサイズ更新
   * @param {Object} canvasSize - キャンバスサイズ
   */
  updateVideoBackgroundSize(canvasSize) {
    if (!this.videoBackgroundElement) return;
    
    // back6.pngと同じアスペクト比（1920x1080）
    const videoAspect = 1920 / 1080;
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.75;
    
    let videoWidth, videoHeight;
    
    if (videoAspect > maxWidth / maxHeight) {
      // 横長：幅を基準に
      videoWidth = maxWidth;
      videoHeight = maxWidth / videoAspect;
    } else {
      // 縦長：高さを基準に
      videoHeight = maxHeight;
      videoWidth = videoHeight * videoAspect;
    }
    
    const unifiedStyle = this.calculateUnifiedPosition(videoWidth, videoHeight);
    this.videoBackgroundElement.setAttribute('style', 
      this.videoBackgroundElement.style.cssText + unifiedStyle);
  }
  
  /**
   * 統一位置計算
   * @param {number} videoWidth - 動画幅
   * @param {number} videoHeight - 動画高さ
   * @returns {string} CSSスタイル文字列
   */
  calculateUnifiedPosition(videoWidth, videoHeight) {
    const centerX = (window.innerWidth - videoWidth) / 2;
    const fixedY = this.config.videoTop;
    
    return `
      width: ${videoWidth}px !important;
      height: ${videoHeight}px !important;
      left: ${centerX}px !important;
      top: ${fixedY}px !important;
    `;
  }
  
  // ===========================
  // 🎬 VIDEO PLAYBACK - 動画再生制御
  // ===========================
  
  /**
   * 動画再生開始
   * @returns {Promise<void>}
   */
  async startVideoPlayback() {
    if (!window.isDevWhiteBackground) {
      console.log('🎬 背景5以外では動画再生しません');
      return;
    }
    
    const video = this.createVideoElement();
    
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(() => {
          console.log('🎬 動画再生開始');
          video.style.opacity = '1';
          
          // フェードイン完了後の処理
          const fadeInDelay = 1000; // 1秒のフェードイン
          setTimeout(() => {
            const fadeInCompleteEvent = new CustomEvent('fadeInComplete', {
              detail: { video, videoDuration: video.duration }
            });
            window.dispatchEvent(fadeInCompleteEvent);
            console.log('🎬 フェードイン完了イベント発火');
          }, fadeInDelay);
          
          // 動画終了時の処理
          video.onended = () => {
            console.log('🎬 動画再生終了');
            video.style.opacity = '0';
            setTimeout(() => {
              if (video.parentNode) {
                video.parentNode.removeChild(video);
              }
              this.currentVideoElement = null;
            }, 1000);
            resolve();
          };
        }).catch(error => {
          console.error('🎬 動画再生エラー:', error);
          resolve();
        });
      };
      
      video.onerror = () => {
        console.error('🎬 動画読み込みエラー');
        resolve();
      };
    });
  }
  
  /**
   * 動画パターン別再生
   * @param {number} pattern - パターン番号（1:回転, 2:フェード）
   */
  async startVideoPlaybackPattern(pattern = null) {
    const activePattern = pattern || this.config.videoPattern;
    
    if (activePattern === 1) {
      console.log('🎬 パターン1: 回転アニメーション後に動画再生');
      return await this.startVideoPlayback();
    } else if (activePattern === 2) {
      console.log('🎬 パターン2: フェード演出後に動画再生');
      return await this.startVideoPlayback();
    }
  }
  
  /**
   * 動画停止
   */
  stopVideoPlayback() {
    if (this.currentVideoElement) {
      this.currentVideoElement.pause();
      this.currentVideoElement.style.opacity = '0';
      
      setTimeout(() => {
        if (this.currentVideoElement && this.currentVideoElement.parentNode) {
          this.currentVideoElement.parentNode.removeChild(this.currentVideoElement);
        }
        this.currentVideoElement = null;
      }, 1000);
      
      console.log('🎬 動画再生停止');
    }
  }
  
  // ===========================
  // 🖼️ VIDEO BACKGROUND - 動画背景制御
  // ===========================
  
  /**
   * 動画背景表示
   * @param {Object} canvasSize - キャンバスサイズ
   */
  showVideoBackground(canvasSize) {
    if (this.videoPlaybackDisabled) {
      console.log('🎬 動画再生が無効化されています');
      return;
    }
    
    this.createVideoBackgroundElement(canvasSize);
    
    this.videoBackgroundElement.onloadeddata = () => {
      console.log('🎬 動画背景読み込み完了');
      this.videoBackgroundElement.play().catch(error => {
        console.error('🎬 動画背景再生エラー:', error);
      });
    };
  }
  
  /**
   * 動画背景非表示
   */
  hideVideoBackground() {
    if (this.videoBackgroundElement) {
      this.videoBackgroundElement.style.display = 'none';
      console.log('🎬 動画背景を非表示');
    }
  }
  
  /**
   * 動画背景削除
   */
  clearVideoBackground() {
    if (this.videoBackgroundElement) {
      this.videoBackgroundElement.pause();
      this.videoBackgroundElement.remove();
      this.videoBackgroundElement = null;
      console.log('🎬 動画背景を削除');
    }
  }
  
  // ===========================
  // 🪟 VIDEO WINDOW - 動画ウィンドウ制御
  // ===========================
  
  /**
   * 動画ウィンドウ作成
   */
  async createVideoWindow() {
    if (this.videoWindowCreated) {
      console.log('🎬 動画ウィンドウは既に作成済み');
      return;
    }
    
    try {
      if (typeof ipcRenderer !== 'undefined') {
        const result = await ipcRenderer.invoke('create-video-window');
        this.videoWindowCreated = !result.exists;
        console.log('🎬 動画ウィンドウ作成:', result);
      }
    } catch (error) {
      console.error('🎬 動画ウィンドウ作成エラー:', error);
    }
  }
  
  /**
   * 動画ウィンドウにコマンド送信
   * @param {string} command - コマンド名
   * @param {Object} data - データ
   */
  sendVideoCommand(command, data = {}) {
    if (typeof ipcRenderer !== 'undefined') {
      ipcRenderer.send('video-window-command', { command, ...data });
      console.log('🎬 動画ウィンドウコマンド送信:', command, data);
    }
  }
  
  /**
   * 動画再生機能の有効/無効切り替え
   * @param {boolean} enabled - 有効/無効
   */
  setVideoPlaybackEnabled(enabled) {
    this.videoPlaybackDisabled = !enabled;
    
    if (enabled) {
      console.log('🎬 動画再生機能を有効化');
      this.createVideoWindow();
    } else {
      console.log('🎬 動画再生機能を無効化');
      this.sendVideoCommand('reset');
      this.clearVideoBackground();
    }
  }
  
  // ===========================
  // 🎬 SPECIAL VIDEO EFFECTS - 特殊動画演出
  // ===========================
  
  /**
   * 扉演出用動画背景設定
   * @param {string} src - 動画ソース
   * @param {Object} canvasSize - キャンバスサイズ
   */
  setSpecialBackgroundWithRiseEffect(src, canvasSize) {
    console.log(`🎬 特殊背景動画設定: ${src}`);
    
    // 既存の背景を削除
    this.clearVideoBackground();
    
    // 新しい背景動画要素を作成
    this.videoBackgroundElement = document.createElement('video');
    this.videoBackgroundElement.src = src;
    this.videoBackgroundElement.loop = true;
    this.videoBackgroundElement.muted = true;
    this.videoBackgroundElement.autoplay = true;
    
    // 初期状態（画面下部に隠れた状態）
    this.videoBackgroundElement.style.cssText = `
      position: fixed;
      object-fit: cover;
      pointer-events: none;
      z-index: -1;
      transition: transform 2s ease-out;
      transform: translateY(100vh);
    `;
    
    this.updateVideoBackgroundSize(canvasSize);
    document.body.appendChild(this.videoBackgroundElement);
    
    // 動画読み込み完了後に上昇演出
    this.videoBackgroundElement.onloadeddata = () => {
      this.videoBackgroundElement.play().catch(error => {
        console.error('🎬 特殊背景動画再生エラー:', error);
      });
      
      // 上昇演出開始
      setTimeout(() => {
        this.videoBackgroundElement.style.transform = 'translateY(0)';
        console.log('🎬 背景動画上昇演出開始');
      }, 100);
    };
    
    return this.videoBackgroundElement;
  }
  
  // ===========================
  // 🎬 VIDEO INTEGRATION - 動画統合機能
  // ===========================
  
  /**
   * 動画とアニメーションの統合処理
   * @param {Object} animationData - アニメーションデータ
   */
  integrateVideoWithAnimation(animationData) {
    const { pattern, delay, duration } = animationData;
    
    if (pattern === 1) {
      // 回転後に動画再生
      setTimeout(() => {
        this.startVideoPlaybackPattern(1);
      }, delay);
    } else if (pattern === 2) {
      // フェード後に動画再生
      setTimeout(() => {
        this.startVideoPlaybackPattern(2);
      }, delay + duration);
    }
  }
  
  /**
   * 設定更新
   * @param {Object} newConfig - 新しい設定
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    console.log('🎬 VideoManager設定更新:', newConfig);
  }
  
  // ===========================
  // 🧹 CLEANUP - クリーンアップ
  // ===========================
  
  /**
   * 全動画要素をクリア
   */
  clearAllVideos() {
    this.stopVideoPlayback();
    this.clearVideoBackground();
    console.log('🎬 全動画要素をクリア');
  }
  
  /**
   * VideoManagerのクリーンアップ
   */
  dispose() {
    this.clearAllVideos();
    this.videoWindowCreated = false;
    console.log('🗑️ VideoManager disposed');
  }
}

// ===========================
// 🔗 LEGACY COMPATIBILITY - 後方互換性サポート
// ===========================

// 既存のグローバル関数として公開（段階的移行用）
let videoManager = null;
let currentVideoElement = null; // グローバル変数として維持
let videoBackgroundElement = null; // グローバル変数として維持
let videoWindowCreated = false; // グローバル変数として維持

function initializeVideoManager(config = {}) {
  videoManager = new VideoManager(config);
  return videoManager;
}

// レガシー関数群
function createVideoElement() {
  if (!videoManager) videoManager = new VideoManager();
  return videoManager.createVideoElement();
}

function startVideoPlayback() {
  if (!videoManager) videoManager = new VideoManager();
  return videoManager.startVideoPlayback();
}

function createVideoWindow() {
  if (!videoManager) videoManager = new VideoManager();
  return videoManager.createVideoWindow();
}

function sendVideoCommand(command, data = {}) {
  if (!videoManager) videoManager = new VideoManager();
  return videoManager.sendVideoCommand(command, data);
}

function hideVideoBackground() {
  if (!videoManager) videoManager = new VideoManager();
  return videoManager.hideVideoBackground();
}

function clearVideoBackground() {
  if (!videoManager) videoManager = new VideoManager();
  return videoManager.clearVideoBackground();
}

function calculateUnifiedPosition(element, videoWidth, videoHeight) {
  if (!videoManager) videoManager = new VideoManager();
  return videoManager.calculateUnifiedPosition(videoWidth, videoHeight);
}

function setSpecialBackgroundWithRiseEffect(src, canvasSize) {
  if (!videoManager) videoManager = new VideoManager();
  return videoManager.setSpecialBackgroundWithRiseEffect(src, canvasSize);
}

// ===========================
// 📤 EXPORTS - エクスポート
// ===========================

// Node.js環境とブラウザ環境の両方に対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoManager;
} else if (typeof window !== 'undefined') {
  window.VideoManager = VideoManager;
  window.initializeVideoManager = initializeVideoManager;
}

console.log('✅ rendering-video.js loaded successfully');