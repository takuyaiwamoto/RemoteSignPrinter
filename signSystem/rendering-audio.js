// rendering-audio.js
// オーディオ関連機能を統合管理
// 分離元: renderer.js
// 作成日: 2025年09月06日

// ===========================
// 🎵 AUDIO MANAGER - オーディオ管理クラス
// ===========================

/**
 * AudioManagerクラス
 * 全てのオーディオ再生機能を統合管理
 */
class AudioManager {
  constructor(config = {}) {
    // 設定値を保持
    this.config = {
      musicVolume: config.musicVolume || 0.5,
      ...config
    };
    
    // オーディオ要素の状態管理
    this.currentMusicElement = null;
    this.audioElements = new Map(); // 複数のオーディオ要素を管理
    
    console.log('✅ AudioManager初期化完了');
  }
  
  // ===========================
  // 🎵 BACKGROUND MUSIC - 背景音楽管理
  // ===========================
  
  /**
   * 背景音楽再生
   * @param {boolean} forcePlay - 強制再生フラグ
   * @returns {HTMLAudioElement|null} オーディオ要素
   */
  playBackgroundMusic(forcePlay = false) {
    if (!forcePlay && !window.isDevWhiteBackground) {
      console.log('🎵 背景5以外では音楽再生しません');
      return null;
    }
    
    // 既存の音楽要素があれば削除
    this.stopBackgroundMusic();
    
    // 音楽要素を作成
    const music = document.createElement('audio');
    music.src = './signMusic.mp3';
    music.volume = this.config.musicVolume;
    music.loop = false; // 1回のみ再生
    
    console.log(`🎵 音楽再生開始: signMusic.mp3, 音量: ${this.config.musicVolume}`);
    
    // 音楽再生開始
    music.play().catch(error => {
      console.error('🎵 音楽再生失敗:', error);
    });
    
    this.currentMusicElement = music;
    
    // 音楽終了時のログ
    music.addEventListener('ended', () => {
      console.log('🎵 音楽再生終了');
      this.currentMusicElement = null;
    });
    
    return music;
  }
  
  /**
   * 背景音楽停止
   */
  stopBackgroundMusic() {
    if (this.currentMusicElement) {
      this.currentMusicElement.pause();
      this.currentMusicElement.remove();
      this.currentMusicElement = null;
      console.log('🎵 背景音楽停止');
    }
  }
  
  // ===========================
  // 🔊 EFFECT SOUNDS - 効果音管理
  // ===========================
  
  /**
   * 効果音再生（汎用）
   * @param {string} audioFile - オーディオファイル名
   * @param {Object} options - 再生オプション
   * @returns {Promise<HTMLAudioElement>} オーディオ要素
   */
  async playEffectSound(audioFile, options = {}) {
    const {
      volume = 0.7,
      loop = false,
      onEnded = null,
      onError = null
    } = options;
    
    try {
      const audio = new Audio(audioFile);
      audio.volume = volume;
      audio.loop = loop;
      
      // イベントリスナー設定
      if (onEnded) {
        audio.addEventListener('ended', onEnded);
      }
      
      const errorHandler = onError || ((error) => {
        console.error(`🔊 ${audioFile}再生エラー:`, error);
      });
      
      await audio.play();
      console.log(`🔊 ${audioFile}再生開始 (音量: ${volume})`);
      
      // オーディオ要素を管理マップに追加
      const audioId = `effect_${Date.now()}_${Math.random()}`;
      this.audioElements.set(audioId, audio);
      
      // 終了時にマップから削除
      audio.addEventListener('ended', () => {
        this.audioElements.delete(audioId);
      });
      
      return audio;
    } catch (error) {
      console.error(`🔊 ${audioFile}再生失敗:`, error);
      if (onError) onError(error);
      throw error;
    }
  }
  
  /**
   * poyo.mp3再生（ハートエフェクト用）
   */
  async playPoyoSound() {
    return await this.playEffectSound('./poyo.mp3', {
      volume: 0.8
    });
  }
  
  /**
   * renzoku.mp3再生（特別演出用）
   */
  async playRenzokuSound() {
    return await this.playEffectSound('./renzoku.mp3', {
      volume: 0.7
    });
  }
  
  /**
   * DJ.mp3再生（背景画像設定時）
   */
  async playDJSound() {
    return await this.playEffectSound('./DJ.mp3', {
      volume: 0.8
    });
  }
  
  /**
   * open.wav再生（スライドアニメーション・扉演出用）
   */
  async playOpenSound() {
    return await this.playEffectSound('./open.wav', {
      volume: 0.7
    });
  }
  
  /**
   * open2.mp3再生（扉演出完了時）
   */
  async playOpen2Sound() {
    return await this.playEffectSound('./open2.mp3', {
      volume: 0.6
    });
  }
  
  /**
   * rotate.mp3再生（回転アニメーション用）
   */
  async playRotateSound() {
    return await this.playEffectSound('./rotate.mp3', {
      volume: 0.7
    });
  }
  
  /**
   * clack1.mp3再生（紙吹雪エフェクト用）
   */
  async playClackSound() {
    return await this.playEffectSound('./clack1.mp3', {
      volume: 0.7
    });
  }
  
  /**
   * fire.wav再生（花火演出用）
   */
  async playFireSound() {
    return await this.playEffectSound('./fire.wav', {
      volume: 0.7
    });
  }
  
  // ===========================
  // 🎬 SPECIALIZED SOUND EFFECTS - 特殊効果音
  // ===========================
  
  /**
   * 背景画像設定時の音楽再生
   * @param {string} backgroundSrc - 背景画像のソース
   */
  playBackgroundImageMusic(backgroundSrc) {
    if (backgroundSrc.includes('back2.png') || 
        backgroundSrc.includes('back3.png') || 
        backgroundSrc.includes('back4.png')) {
      this.playDJSound().catch(error => {
        console.log('DJ.mp3再生エラー:', error);
      });
      console.log('🔊 背景画像設定時にDJ.mp3再生開始（ボリューム0.8）');
    }
  }
  
  /**
   * 紙吹雪エフェクト音響
   * @param {boolean} useClackSound - clack1.mp3を使用するか
   */
  playConfettiSound(useClackSound = false) {
    if (useClackSound) {
      this.playClackSound().catch(error => {
        console.log('clack1.mp3再生エラー:', error);
      });
      console.log('🔊 clack1.mp3再生開始');
    } else {
      this.playRenzokuSound().catch(error => {
        console.log('renzoku.mp3再生エラー:', error);
      });
    }
  }
  
  // ===========================
  // 🔧 AUDIO SETTINGS - オーディオ設定管理
  // ===========================
  
  /**
   * 音楽ボリューム設定
   * @param {number} volume - ボリューム (0.0-1.0)
   */
  setMusicVolume(volume) {
    this.config.musicVolume = Math.max(0, Math.min(1, volume));
    
    // 現在再生中の背景音楽のボリュームも更新
    if (this.currentMusicElement) {
      this.currentMusicElement.volume = this.config.musicVolume;
    }
    
    console.log(`🎵 音楽ボリューム設定: ${this.config.musicVolume}`);
  }
  
  /**
   * 現在のボリューム設定を取得
   * @returns {number} 現在のボリューム
   */
  getMusicVolume() {
    return this.config.musicVolume;
  }
  
  // ===========================
  // 🧹 CLEANUP - クリーンアップ
  // ===========================
  
  /**
   * 全オーディオ要素を停止・削除
   */
  stopAllAudio() {
    // 背景音楽を停止
    this.stopBackgroundMusic();
    
    // 全効果音を停止
    this.audioElements.forEach((audio, id) => {
      audio.pause();
      audio.remove();
    });
    this.audioElements.clear();
    
    console.log('🔇 全オーディオ停止');
  }
  
  /**
   * AudioManagerのクリーンアップ
   */
  dispose() {
    this.stopAllAudio();
    console.log('🗑️ AudioManager disposed');
  }
}

// ===========================
// 🔗 LEGACY COMPATIBILITY - 後方互換性サポート
// ===========================

// 既存のグローバル関数として公開（段階的移行用）
let audioManager = null;

function initializeAudioManager(config = {}) {
  audioManager = new AudioManager(config);
  return audioManager;
}

function playBackgroundMusic() {
  if (!audioManager) {
    audioManager = new AudioManager();
  }
  return audioManager.playBackgroundMusic();
}

// ===========================
// 📤 EXPORTS - エクスポート
// ===========================

// Node.js環境とブラウザ環境の両方に対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
} else if (typeof window !== 'undefined') {
  window.AudioManager = AudioManager;
  window.initializeAudioManager = initializeAudioManager;
}

console.log('✅ rendering-audio.js loaded successfully');