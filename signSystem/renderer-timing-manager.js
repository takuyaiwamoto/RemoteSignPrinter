// renderer-timing-manager.js
// レンダリング関連のタイミング管理機能を統合管理
// 分離元: renderer.js
// 作成日: 2025年09月06日

// ===========================
// 📊 RENDERING TIMING MANAGER - レンダリングタイミング管理クラス
// ===========================

/**
 * RenderingTimingManagerクラス
 * 受信側のキャンバスサイズ調整、アニメーション待機時間管理、印刷時間遅延を統合管理
 */
class RenderingTimingManager {
  constructor(canvas, ctx, config = {}) {
    // Canvas関連の参照を保持
    this.canvas = canvas;
    this.ctx = ctx;
    
    // 設定値を保持
    this.config = {
      SCALE_FACTOR: config.SCALE_FACTOR || 4.0,
      printDelayTime: config.printDelayTime || 5.0,
      ...config
    };
    
    // 状態管理変数
    this.senderCanvasSize = { width: 859, height: 607 };
    this.receiverCanvasSize = { width: 1202, height: 849 };
    this.devCanvasScale = 1.4;
    this.devAnimationStartWaitTime = 0.1;
    this.devRotationWaitTime = 1.0 - 3.0; // 3秒短縮
    this.printDelayTime = this.config.printDelayTime;
    
    console.log('✅ RenderingTimingManager初期化完了');
  }
  
  // ===========================
  // 📐 CANVAS SIZE MANAGEMENT - キャンバスサイズ管理
  // ===========================
  
  /**
   * 受信側キャンバスサイズ設定
   * @param {Object} senderSize - 送信側のキャンバスサイズ
   */
  setReceiverCanvasSize(senderSize = null) {
    if (senderSize) {
      this.senderCanvasSize = senderSize;
    }
    
    // Dev Tool設定を適用したサイズを計算
    const newWidth = Math.floor(this.senderCanvasSize.width * this.config.SCALE_FACTOR * this.devCanvasScale);
    const newHeight = Math.floor(this.senderCanvasSize.height * this.config.SCALE_FACTOR * this.devCanvasScale);
    
    const oldWidth = this.canvas.width;
    const oldHeight = this.canvas.height;
    
    // キャンバスサイズを更新
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    
    // 受信側のキャンバスサイズを記録
    this.receiverCanvasSize = { width: newWidth, height: newHeight };
    
    console.log(`📐 受信側キャンバスサイズ変更: ${oldWidth}x${oldHeight} → ${newWidth}x${newHeight}`);
    
    return { oldSize: { width: oldWidth, height: oldHeight }, newSize: { width: newWidth, height: newHeight } };
  }
  
  /**
   * Dev Tool設定更新
   * @param {Object} settings - 設定値
   */
  updateDevSettings(settings) {
    if (settings.canvasScale !== undefined) {
      this.devCanvasScale = settings.canvasScale;
    }
    if (settings.animationStartWaitTime !== undefined) {
      this.devAnimationStartWaitTime = settings.animationStartWaitTime;
    }
    if (settings.rotationWaitTime !== undefined) {
      this.devRotationWaitTime = settings.rotationWaitTime - 3.0; // 3秒短縮
    }
    if (settings.printDelayTime !== undefined) {
      this.printDelayTime = settings.printDelayTime;
    }
    
    console.log(`🔧 TimingManager設定更新: scale=${this.devCanvasScale}, animationWait=${this.devAnimationStartWaitTime}, rotationWait=${this.devRotationWaitTime}, printDelayTime=${this.printDelayTime}`);
  }
  
  // ===========================
  // 🖨️ PRINT DELAY MANAGEMENT - 印刷遅延管理
  // ===========================
  
  /**
   * 印刷処理（遅延実行）
   * @param {Function} generateImageFn - 画像生成関数
   * @param {Function} downloadImageFn - ダウンロード関数
   * @param {Function} executePrintFn - 印刷実行関数
   * @param {Object} dependencies - 必要な依存関数/変数
   */
  async downloadAndPrintDrawing(generateImageFn, downloadImageFn, executePrintFn, dependencies) {
    console.log('📥 TimingManager: ダウンロード即座実行、印刷遅延実行開始');
    
    if (!dependencies.drawCanvas || !dependencies.drawCtx) {
      console.log('❌ TimingManager: drawCanvasまたはdrawCtxが存在しません');
      return;
    }
    
    try {
      // 画像生成とダウンロード処理（即座に実行）
      const imageData = await generateImageFn();
      
      if (imageData) {
        // ダウンロードを即座に実行し、実際の保存パスを取得
        console.log('💾 TimingManager: 画像ダウンロードを即座に実行');
        const savedPath = downloadImageFn(imageData.dataURL, imageData.fileName);
        
        // 印刷処理を遅延実行（実際の保存パスを使用）
        const delayMs = this.getPrintDelayTime();
        console.log(`🖨️ TimingManager: ${this.printDelayTime}秒後に印刷を実行`);
        
        setTimeout(() => {
          console.log(`🖨️ TimingManager: ${this.printDelayTime}秒遅延完了 - 印刷処理を開始`);
          
          // 実際に保存されたパスを使用（Node.js環境の場合）
          const printPath = savedPath || imageData.printPath;
          if (printPath) {
            console.log('✅ TimingManager: 印刷パスが確認できました - executePrint実行');
            executePrintFn(printPath);
          } else {
            console.log('⚠️ TimingManager: 印刷パスがないため印刷をスキップ（ブラウザ環境）');
          }
        }, delayMs);
      }
    } catch (error) {
      console.error('❌ TimingManager: downloadAndPrintDrawingエラー:', error);
    }
  }

  // ===========================
  // ⏰ TIMING UTILITIES - タイミングユーティリティ
  // ===========================
  
  /**
   * アニメーション開始遅延時間を取得
   * @param {number} waitTime - 指定待機時間
   * @returns {number} ミリ秒単位の遅延時間
   */
  getAnimationStartDelay(waitTime = null) {
    const delay = (waitTime || this.devAnimationStartWaitTime) * 1000;
    console.log(`⏰ アニメーション開始遅延: ${delay/1000}秒`);
    return delay;
  }
  
  /**
   * 回転後待機時間を取得
   * @param {number} waitTime - 指定待機時間
   * @returns {number} ミリ秒単位の待機時間
   */
  getRotationWaitTime(waitTime = null) {
    const delay = (waitTime || this.devRotationWaitTime) * 1000;
    console.log(`⏰ 回転後待機時間: ${delay/1000}秒`);
    return delay;
  }
  
  /**
   * 印刷遅延時間を取得
   * @returns {number} ミリ秒単位の遅延時間
   */
  getPrintDelayTime() {
    const delay = this.printDelayTime * 1000;
    console.log(`🖨️ 印刷遅延時間: ${delay/1000}秒`);
    return delay;
  }
  
  // ===========================
  // 🎬 ANIMATION TIMING MANAGEMENT - アニメーション待機時間管理
  // ===========================
  
  /**
   * 回転アニメーション開始（待機時間管理付き）
   * @param {number} rotationWaitTime - 回転後の待機時間（ミリ秒）
   * @param {Object} dependencies - 必要な依存関数/変数
   */
  startRotationAnimation(rotationWaitTime, dependencies = {}) {
    console.log('🎬 TimingManager: アニメーションシーケンス開始');
    console.log(`🔍 TimingManager: rotationWaitTime = ${rotationWaitTime}ms (${rotationWaitTime/1000}秒)`);
    
    // アニメーション開始フラグ設定（外部で管理される場合）
    if (dependencies.setAnimationFlag) {
      dependencies.setAnimationFlag(true);
    }
    
    // 背景5の場合に音楽再生開始
    if (dependencies.isDevWhiteBackground && dependencies.playBackgroundMusic) {
      dependencies.playBackgroundMusic();
      console.log('🎵 TimingManager: 背景5でアニメーション開始時に音楽再生');
    }
    
    // アニメーション対象要素を特定
    const drawCanvasElement = document.getElementById('drawCanvas') || document.getElementById('drawCanvas-temp');
    const back2WrapperElement = document.getElementById('back2-wrapper');
    const containerElement = document.getElementById('container');
    
    let animationTarget = null;
    
    if (back2WrapperElement) {
      animationTarget = back2WrapperElement;
      console.log('🎯 TimingManager: アニメーション対象: back2Wrapper要素');
    } else if (drawCanvasElement) {
      animationTarget = drawCanvasElement;
      console.log('🎯 TimingManager: アニメーション対象: drawCanvas要素');
    } else if (containerElement) {
      animationTarget = containerElement;
      console.log('🎯 TimingManager: アニメーション対象: container要素');
    } else {
      console.log('❌ TimingManager: アニメーション対象が見つかりません');
      return;
    }
    
    // 実際のアニメーション実行は外部に委譲
    if (dependencies.executeAnimation) {
      dependencies.executeAnimation(animationTarget, rotationWaitTime);
    }
    
    return animationTarget;
  }
  
  /**
   * グローバル送信時のアニメーション・印刷スケジューリング
   * @param {Object} data - 送信データ
   * @param {Object} callbacks - コールバック関数群
   */
  scheduleGlobalSendAnimations(data, callbacks = {}) {
    console.log('🎬 TimingManager: globalSendアニメーションスケジューリング開始');
    
    // アニメーション開始までの待機時間
    const animationStartDelay = this.getAnimationStartDelay(data.animationStartWaitTime);
    const rotationWaitTime = this.getRotationWaitTime(data.rotationWaitTime);
    
    console.log(`🎬 TimingManager: ${animationStartDelay/1000}秒後にアニメーションを開始`);
    
    setTimeout(() => {
      // 180度回転アニメーション開始
      if (callbacks.startRotationCallback) {
        callbacks.startRotationCallback(rotationWaitTime);
      }
    }, animationStartDelay);
    
    // 花火演出を同期表示
    if (callbacks.createFireworksCallback) {
      console.log('🎆 TimingManager: 花火演出をスケジュール');
      setTimeout(() => {
        callbacks.createFireworksCallback();
      }, animationStartDelay + 1000); // アニメーション開始後1秒で花火を実行
    }
    
    return {
      animationStartDelay,
      rotationWaitTime,
      fireworksDelay: animationStartDelay + 1000
    };
  }
}

// ===========================
// 📤 EXPORTS - エクスポート
// ===========================

// Node.js環境とブラウザ環境の両方に対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RenderingTimingManager;
} else if (typeof window !== 'undefined') {
  window.RenderingTimingManager = RenderingTimingManager;
}

console.log('✅ renderer-timing-manager.js loaded successfully');