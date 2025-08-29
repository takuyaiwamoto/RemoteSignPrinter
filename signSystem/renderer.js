const { ipcRenderer } = require("electron");
const path = require("path");
const crypto = require("crypto");

// 🔸 拡大率を設定 (デフォルト4.0倍、ポスター時は2.4倍=A4の60%)
let SCALE_FACTOR = 4.0;

// 🎬 背景5用動画再生システム
let videoZIndex = 5;          // 動画のz-index（文字の下）
let textZIndex = 10;          // 文字のz-index（動画の上）
let currentVideoElement = null; // 現在再生中の動画要素
let videoPattern = 1;         // 動画パターン（1:回転, 2:フェード）
let currentMusicElement = null; // 現在再生中の音楽要素
let musicVolume = 0.5;        // 音楽のボリューム（0.0〜1.0）
let printDelayTime = 5.0;     // 印刷遅延時間（秒）

// 🎵 背景5用音楽再生
function playBackgroundMusic() {
  if (!window.isDevWhiteBackground) {
    console.log('🎵 背景5以外では音楽再生しません');
    return;
  }
  
  // 既存の音楽要素があれば削除
  if (currentMusicElement) {
    currentMusicElement.pause();
    currentMusicElement.remove();
    currentMusicElement = null;
  }
  
  // 音楽要素を作成
  const music = document.createElement('audio');
  music.src = './signMusic.mp3';
  music.volume = musicVolume;
  music.loop = false; // 1回のみ再生
  
  console.log(`🎵 音楽再生開始: signMusic.mp3, 音量: ${musicVolume}`);
  
  // 音楽再生開始
  music.play().catch(error => {
    console.error('🎵 音楽再生失敗:', error);
  });
  
  currentMusicElement = music;
  
  // 音楽終了時のログ
  music.addEventListener('ended', () => {
    console.log('🎵 音楽再生終了');
  });
  
  return music;
}

// 🎬 背景5用動画要素を作成
function createVideoElement() {
  // 既存の動画要素があれば削除
  if (currentVideoElement) {
    currentVideoElement.remove();
    currentVideoElement = null;
  }
  
  // 白背景キャンバスが表示されているかチェック
  if (!window.isDevWhiteBackground || !back2Wrapper || !drawCanvas) {
    console.log('🎬 背景5以外では動画を作成しません');
    return null;
  }
  
  // 動画要素を作成
  const video = document.createElement('video');
  video.src = './backVideo.mp4';
  video.muted = true; // 音声なしで自動再生を許可
  video.loop = false; // 1回のみ再生
  video.preload = 'auto';
  
  // 動画のサイズを白背景キャンバスに合わせる
  const canvasRect = drawCanvas.getBoundingClientRect();
  video.style.cssText = `
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    z-index: ${videoZIndex} !important;
    pointer-events: none !important;
  `;
  
  console.log(`🎬 動画要素作成: サイズ${canvasRect.width}x${canvasRect.height}, z-index=${videoZIndex}`);
  
  // back2Wrapperに追加（文字の下、背景の上）
  back2Wrapper.appendChild(video);
  currentVideoElement = video;
  
  // 描画キャンバスのz-indexを最上位に設定
  if (drawCanvas) {
    drawCanvas.style.zIndex = textZIndex + 5; // 確実に最上位
    console.log(`🎬 描画キャンバスz-index調整: ${textZIndex + 5} (最上位)`);
  }
  
  return video;
}

// 🎬 動画再生を開始
function startVideoPlayback() {
  if (!window.isDevWhiteBackground) {
    console.log('🎬 背景5以外では動画再生しません');
    return Promise.resolve();
  }
  
  const video = createVideoElement();
  if (!video) {
    console.log('🎬 動画要素作成失敗');
    return Promise.resolve();
  }
  
  console.log('🎬 動画再生開始');
  
  return new Promise((resolve) => {
    // 🔧【フェードイン完了イベント】動画終了時にイベント発火（パターン1）
    let fadeInCompleteEventFired = false;
    video.addEventListener('timeupdate', () => {
      if (video.duration && video.currentTime && !fadeInCompleteEventFired) {
        const remainingTime = video.duration - video.currentTime;
        // パターン1は動画終了時にフェードイン完了とする
        if (remainingTime <= 0.5 && remainingTime > 0.1) {
          fadeInCompleteEventFired = true;
          console.log(`🎬【パターン1】フェードイン完了 - スライドアニメーション待機時間開始`);
          console.log(`⏰ フェードイン完了時の動画残り時間: ${remainingTime.toFixed(2)}秒`);
          
          
          window.dispatchEvent(new CustomEvent('fadeInComplete', {
            detail: { 
              timestamp: Date.now(),
              pattern: 1,
              remainingTime: remainingTime
            }
          }));
        }
      }
    });

    // 動画終了時の処理
    video.addEventListener('ended', () => {
      console.log('🎬 動画再生終了検出 - 0.5秒待機後に次の処理へ');
      
      // 動画の最後のフレームが確実に表示されるよう少し待機
      setTimeout(() => {
        console.log('🎬 動画再生完全終了 - 最後のフレームで静止');
        
        // 🔧【パターン1】動画終了時の処理
        if (!fadeInCompleteEventFired) {
          console.log('🎬 パターン1動画終了 - フェードイン完了イベント発火（バックアップ）');
          window.dispatchEvent(new CustomEvent('fadeInComplete', {
            detail: { timestamp: Date.now(), pattern: 1 }
          }));
        } else {
          console.log('🎬 パターン1動画終了 - フェードイン完了イベントは既に発火済み');
        }
        
        // 動画は削除せず、最後のフレームで静止
        resolve();
      }, 500); // 0.5秒の遅延を追加
    });
    
    // 動画再生エラー時の処理
    video.addEventListener('error', (e) => {
      console.error('🎬 動画再生エラー:', e);
      resolve();
    });
    
    // 動画再生開始
    video.play().catch(error => {
      console.error('🎬 動画再生失敗:', error);
      resolve();
    });
  });
}

// 🎬 パターン2: 描画フェードアウト + 動画フェードイン処理
function startPattern2FadeInOut() {
  console.log('🎬 パターン2: フェードアニメーション開始');
  
  if (!window.isDevWhiteBackground || !drawCanvas) {
    console.log('🎬 背景5以外ではフェードアニメーションを実行しません');
    return Promise.resolve();
  }
  
  return new Promise((resolve) => {
    // 動画要素を作成
    const video = createVideoElement();
    if (!video) {
      console.log('🎬 動画要素作成失敗');
      resolve();
      return;
    }
    
    // 動画を最初は透明に設定
    video.style.opacity = '0';
    video.style.transition = 'opacity 0.5s ease-in';
    
    console.log('🎬 Step 1: 描画フェードアウト + 動画フェードイン（同時実行）');
    
    // デバッグ: すべての描画関連要素を確認
    console.log('🔍 描画要素debug info:');
    console.log('  - drawCanvas:', drawCanvas);
    console.log('  - drawCanvas.id:', drawCanvas ? drawCanvas.id : 'null');
    
    // back2Wrapper内のすべてのcanvas要素を取得してフェードアウト
    const allCanvases = back2Wrapper.querySelectorAll('canvas');
    console.log('🔍 back2Wrapper内のcanvas要素数:', allCanvases.length);
    
    allCanvases.forEach((canvas, index) => {
      console.log(`  - Canvas ${index}: id="${canvas.id}", opacity="${canvas.style.opacity}"`);
      
      // 描画関連のキャンバス（動画以外）をフェードアウト
      if (canvas.id !== 'backgroundVideo') {
        canvas.style.transition = 'opacity 1s ease-out';
        canvas.style.opacity = '0';
        console.log(`🎬 Canvas ${index} (${canvas.id}) フェードアウト開始`);
      }
    });
    
    // メインのdrawCanvasもフェードアウト（念のため）
    if (drawCanvas) {
      drawCanvas.style.transition = 'opacity 1s ease-out';
      drawCanvas.style.opacity = '0';
      console.log(`🎬 メインdrawCanvasフェードアウト開始: opacity ${drawCanvas.style.opacity}`);
    }
    
    // 同時に動画をフェードイン
    setTimeout(() => {
      video.style.opacity = '1';
      console.log('🎬 動画フェードイン開始');
      
      // 動画再生開始
      video.play().catch(error => {
        console.error('🎬 動画再生失敗:', error);
        resolve();
      });
      
      // 動画の長さを取得して2秒前からフェードイン開始
      const checkAndStartFadeIn = () => {
        // 既にメタデータが読み込まれているか確認
        if (video.readyState >= 1) {
          const videoDuration = video.duration;
          const fadeInStartTime = Math.max(0, videoDuration - 4); // 動画終了4秒前に変更（より早く開始）
          
          console.log(`🎬 動画時長: ${videoDuration}秒, フェードイン開始: ${fadeInStartTime}秒後`);
          
          setTimeout(() => {
            console.log('🎬 パターン2: 描画フェードイン開始（動画終了4秒前）');
            
            
            // フェードイン開始時間を記録（グローバル変数として保存）
            const newTimestamp = performance.now();
            const previousTimestamp = window.fadeInStartTimestamp;
            
            // 🔧 確実にクリーンな状態で開始
            window.fadeInStartTimestamp = newTimestamp;
            console.log(`⏱️ フェードイン開始時間記録: ${newTimestamp.toFixed(2)}ms (前回: ${previousTimestamp ? previousTimestamp.toFixed(2) + 'ms' : 'なし'})`);
            
            // 前回の値が残っている場合の警告
            if (previousTimestamp && (newTimestamp - previousTimestamp) > 30000) {
              console.warn('⚠️ 前回のフェードイン開始時間が30秒以上古い値でした - 適切にクリアされていない可能性');
            }
            
            // 🔧 フェードイン開始と同時にタイマーを設定（より確実なタイミング制御）
            setTimeout(() => {
              if (!fadeInCompleteEventFired) {
                fadeInCompleteEventFired = true;
                const fadeInElapsed = performance.now() - window.fadeInStartTimestamp;
                const currentTime = video.currentTime || 0;
                const remainingTime = video.duration ? video.duration - currentTime : 0;
                
                console.log(`🎬【パターン2】フェードイン完了（タイマーベース） - スライドアニメーション待機時間開始`);
                console.log(`⏱️ フェードイン実行時間: ${fadeInElapsed.toFixed(2)}ms (${(fadeInElapsed/1000).toFixed(2)}秒)`);
                console.log(`⏰ フェードイン完了時の動画残り時間: ${remainingTime.toFixed(2)}秒`);
                
                window.dispatchEvent(new CustomEvent('fadeInComplete', {
                  detail: { 
                    timestamp: Date.now(),
                    pattern: 2,
                    remainingTime: remainingTime,
                    fadeInDuration: fadeInElapsed
                  }
                }));
              }
            }, 1200); // CSSの1s + マージン0.2s
            
            // デバッグ：現在の状態を確認
            console.log('🔍 フェードイン前の状態:');
            console.log('  - back2Wrapper:', back2Wrapper);
            console.log('  - drawCanvas:', drawCanvas);
            
            // すべての描画キャンバスをゆっくりフェードイン（2秒）
            const allCanvases = back2Wrapper.querySelectorAll('canvas');
            console.log(`🔍 フェードイン対象canvas数: ${allCanvases.length}`);
            
            allCanvases.forEach((canvas, index) => {
              console.log(`🔍 Canvas ${index}:`, {
                id: canvas.id,
                currentOpacity: canvas.style.opacity,
                display: canvas.style.display,
                visibility: canvas.style.visibility,
                zIndex: canvas.style.zIndex
              });
              
              if (canvas.id !== 'backgroundVideo') {
                // 強制的に表示を確実にする
                canvas.style.display = 'block';
                canvas.style.visibility = 'visible';
                canvas.style.transition = 'opacity 1s ease-in';  // 2秒から1秒に短縮
                canvas.style.opacity = '1';
                console.log(`🎬 Canvas ${index} (${canvas.id}) 早期フェードイン開始 - opacity設定後: ${canvas.style.opacity}`);
              }
            });
            
            // メインのdrawCanvasも早期フェードイン
            if (drawCanvas) {
              drawCanvas.style.display = 'block';
              drawCanvas.style.visibility = 'visible';
              drawCanvas.style.transition = 'opacity 1s ease-in';  // 2秒から1秒に短縮
              drawCanvas.style.opacity = '1';
              console.log('🎬 メインdrawCanvas 早期フェードイン開始 - opacity設定後:', drawCanvas.style.opacity);
            }
            
            // 1秒後に最終状態を確認（イベント発火は動画終了時に移動）
            setTimeout(() => {
              console.log('🔍 フェードイン完了後の状態:');
              allCanvases.forEach((canvas, index) => {
                console.log(`  - Canvas ${index} (${canvas.id}): opacity=${canvas.style.opacity}`);
              });
              if (drawCanvas) {
                console.log(`  - メインdrawCanvas: opacity=${drawCanvas.style.opacity}`);
              }
            }, 1000);
          }, fadeInStartTime * 1000);
        } else {
          // メタデータがまだの場合はイベントリスナーを追加
          video.addEventListener('loadedmetadata', () => {
            checkAndStartFadeIn();
          }, { once: true });
        }
      };
      
      // メタデータチェックを実行
      checkAndStartFadeIn();
    }, 50);
    
    // 🔧【フェードイン完了イベント】実際のフェードイン開始後に設定されるタイマー方式
    let fadeInCompleteEventFired = false;
    let fadeInCheckInterval = null;
    
    // 動画終了時の処理（フェードインは既に完了している）
    video.addEventListener('ended', () => {
      console.log('🎬 パターン2: 動画再生終了検出 - 0.5秒待機後に次の処理へ');
      
      // タイマーをクリアして確実にクリーンアップ（setTimeoutの場合は自動的にクリアされる）
      console.log('🔄 パターン2動画終了時のクリーンアップ完了');
      
      // 動画の最後のフレームが確実に表示されるよう少し待機
      setTimeout(() => {
        console.log('🎬 パターン2: 動画再生完全終了 - フェードインは既に完了');
        
        // 🔧【パターン2】動画終了時の処理
        if (!fadeInCompleteEventFired) {
          console.log('🎬 パターン2動画終了 - フェードイン完了イベント発火（バックアップ）');
          console.log('⚠️ 実時間ベースでフェードイン完了が検出されなかったため、バックアップイベントを発火');
          window.dispatchEvent(new CustomEvent('fadeInComplete', {
            detail: { timestamp: Date.now(), pattern: 2, isBackup: true }
          }));
        } else {
          console.log('🎬 パターン2動画終了 - フェードイン完了イベントは実時間ベースで発火済み');
        }
        
        // 動画終了後、そのまま待機・スライド処理へ
        resolve();
      }, 500); // 0.5秒の遅延を追加
    });
    
    // 動画再生エラー時の処理
    video.addEventListener('error', (e) => {
      console.error('🎬 動画再生エラー:', e);
      resolve();
    });
  });
}

// 送信側のcanvasScaleと同期（受信側は常に送信側の設定を使用）
// senderCanvasScaleはUNIFIED_SETTINGS.canvasScaleで管理

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
    //console.log("🤖 SwitchBotボット押下開始...");
    
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
    //console.log("🤖 SwitchBotレスポンス:", result);
    
    if (result.statusCode === 100) {
      //console.log("✅ SwitchBotボット押下成功");
      return true;
    } else {
      //console.error("❌ SwitchBotボット押下失敗:", result);
      return false;
    }
  } catch (error) {
    //console.error("❌ SwitchBotエラー:", error);
    return false;
  }
}

// 🤖 SwitchBotボット連続押下関数（2秒間隔で2回押下）
async function executeSwitchBotSequence() {
  try {
    //console.log("🔴 SwitchBot物理ボット押下シーケンス開始");
    
    // 1回目の押下
    //console.log("🔴 SwitchBot物理ボット押下（1回目）");
    await pressSwitchBot();
    
    // 2秒待機
    //console.log("⏰ 2秒待機...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2回目の押下
    //console.log("🔴 SwitchBot物理ボット押下（2回目）");
    await pressSwitchBot();
    
    //console.log("🔴 SwitchBot物理ボット押下シーケンス完了");
  } catch (error) {
    //console.error("❌ SwitchBotシーケンスエラー:", error);
  }
}

// 初期化時にcanvasが存在しない場合の対処
let canvas = document.getElementById("drawCanvas");
let ctx = null;

if (!canvas) {
  console.log("⚠️ 初期化時にdrawCanvasが見つかりません - 動的作成待ち");
  // 一時的なダミーcanvasを作成（後で置き換えられる）
  canvas = document.createElement('canvas');
  canvas.id = 'drawCanvas-temp';
  canvas.style.display = 'none';
  document.body.appendChild(canvas);
}

ctx = canvas.getContext("2d");

// 実際のキャンバスが作成されたときにctxを更新する関数
function updateCanvasContext() {
  const actualCanvas = document.getElementById("drawCanvas");
  if (actualCanvas && actualCanvas !== canvas) {
    console.log("🎨 実際のdrawCanvasに切り替え");
    canvas = actualCanvas;
    ctx = canvas.getContext("2d");
    return true;
  }
  return false;
}

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

// アスペクト比を保持した座標変換関数
function transformCoordinatesWithAspectRatio(x, y, senderSize, drawingAreaSize) {
  const senderAspect = senderSize.width / senderSize.height;
  const drawingAreaAspect = drawingAreaSize.width / drawingAreaSize.height;
  
  let actualDrawingWidth, actualDrawingHeight, offsetX = 0, offsetY = 0;
  
  if (senderAspect > drawingAreaAspect) {
    // 送信側の方が横長 → 描画エリアの幅に合わせて、高さを調整
    actualDrawingWidth = drawingAreaSize.width;
    actualDrawingHeight = drawingAreaSize.width / senderAspect;
    offsetY = (drawingAreaSize.height - actualDrawingHeight) / 2;
  } else {
    // 送信側の方が縦長 → 描画エリアの高さに合わせて、幅を調整
    actualDrawingHeight = drawingAreaSize.height;
    actualDrawingWidth = drawingAreaSize.height * senderAspect;
    offsetX = (drawingAreaSize.width - actualDrawingWidth) / 2;
  }
  
  // 座標変換: 送信側の座標を実際の描画サイズに変換してからオフセットを追加
  const scaledX = (x / senderSize.width) * actualDrawingWidth + offsetX;
  const scaledY = (y / senderSize.height) * actualDrawingHeight + offsetY;
  
  // デバッグ: 変換結果が範囲内にあるかチェック
  // console.log(`  座標変換詳細: 送信(${x.toFixed(1)}, ${y.toFixed(1)}) → 実際サイズでスケール(${((x / senderSize.width) * actualDrawingWidth).toFixed(1)}, ${((y / senderSize.height) * actualDrawingHeight).toFixed(1)}) → オフセット後(${scaledX.toFixed(1)}, ${scaledY.toFixed(1)})`);
  
  return { x: scaledX, y: scaledY, actualWidth: actualDrawingWidth, actualHeight: actualDrawingHeight };
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

// ネオンパス完了時にピンクの枠を描画する関数（削除済み）
function drawNeonPathComplete(writerId) {
  if (!writerNeonPaths[writerId] || writerNeonPaths[writerId].length < 2) {
    return; // パスが短すぎる場合は何もしない
  }
  
  const neonPath = writerNeonPaths[writerId];
  const ctx = canvas.getContext('2d');
  const areaLeft = drawingAreaOffset.left;
  const areaTop = drawingAreaOffset.top;
  
  // 書き手側と同様のピンク枠描画処理（3層グラデーション）
  ctx.save();
  
  // 外側の薄いピンク（最も太い）
  ctx.beginPath();
  ctx.moveTo(areaLeft + neonPath[0].x, areaTop + neonPath[0].y);
  for (let i = 1; i < neonPath.length; i++) {
    ctx.lineTo(areaLeft + neonPath[i].x, areaTop + neonPath[i].y);
  }
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = neonPath[0].thickness * (drawingAreaSize.width / senderCanvasSize.width);
  ctx.strokeStyle = '#ff69b4'; // ピンク
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  
  // 中間のピンク
  ctx.beginPath();
  ctx.moveTo(areaLeft + neonPath[0].x, areaTop + neonPath[0].y);
  for (let i = 1; i < neonPath.length; i++) {
    ctx.lineTo(areaLeft + neonPath[i].x, areaTop + neonPath[i].y);
  }
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = Math.max(1, neonPath[0].thickness * (drawingAreaSize.width / senderCanvasSize.width) - 2);
  ctx.strokeStyle = '#ff69b4';
  ctx.stroke();
  
  // 内側の濃いピンク（最も細い）
  ctx.beginPath();
  ctx.moveTo(areaLeft + neonPath[0].x, areaTop + neonPath[0].y);
  for (let i = 1; i < neonPath.length; i++) {
    ctx.lineTo(areaLeft + neonPath[i].x, areaTop + neonPath[i].y);
  }
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(1, neonPath[0].thickness * (drawingAreaSize.width / senderCanvasSize.width) - 4);
  ctx.strokeStyle = '#ff1493'; // 濃いピンク
  ctx.stroke();
  
  ctx.restore();
  
  // 完了したパスを履歴に移動
  completedNeonPaths.push({
    writerId: writerId,
    path: [...neonPath],
    timestamp: Date.now()
  });
  
  // 現在のパスをクリア
  delete writerNeonPaths[writerId];
  
  // ピンクの枠を含めて再描画
  // 再描画処理は削除済み
}

// 妖精の粉エフェクト関数（送信側と完全に同じ）
function createReceiverFairyDust(x, y) {
  // //console.log(`✨ 受信側に妖精の粉を生成開始: (${x}, ${y})`);
  
  // 妖精の粉を極少数生成（1-2個）
  const dustCount = Math.floor(Math.random() * 2) + 1;
  // //console.log(`✨ 生成する妖精の粉の数: ${dustCount}`);
  
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
    // //console.log(`✨ 妖精の粉${i+1}をDOMに追加:`, dust);
    // //console.log(`✨ 妖精の粉${i+1}の位置: left=${finalX}px, top=${finalY}px`);
    
    // アニメーション終了後に妖精の粉を削除
    setTimeout(() => {
      if (dust.parentNode) {
        dust.parentNode.removeChild(dust);
        // //console.log('✨ 受信側の妖精の粉を削除');
      }
    }, 3000);
  }
}

// ハートエフェクト関数（受信側用）
function createReceiverHeart(x, y) {
  // //console.log(`💖 受信側にハートを生成開始: (${x}, ${y})`);
  
  // ハートを少数生成（1-3個）
  const heartCount = Math.floor(Math.random() * 3) + 1;
  // //console.log(`💖 生成するハートの数: ${heartCount}`);
  
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
    // //console.log(`💖 ハート${i+1}をDOMに追加:`, heart);
    // //console.log(`💖 ハート${i+1}の位置: left=${finalX}px, top=${finalY}px`);
    
    // アニメーション終了後にハートを削除
    setTimeout(() => {
      if (heart.parentNode) {
        heart.parentNode.removeChild(heart);
        // //console.log('💖 受信側のハートを削除');
      }
    }, 1500);
  }
}

// 星エフェクト関数（送信側と完全に同じ飛び散る効果）
function createReceiverStar(x, y) {
  console.log(`🌟 createReceiverStar関数開始: (${x}, ${y})`);
  console.log(`⭐ 受信側に星を生成: (${x}, ${y})`);
  
  // 星の数をさらに減らす（1個、たまに2個）
  const starCount = Math.random() < 0.3 ? 2 : 1;
  console.log(`🌟 生成する星の数: ${starCount}`);
  
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
    
    // 🔍 詳細デバッグ情報
    console.log(`⭐ 星${i+1}のCSS設定詳細:`);
    console.log(`   - position: fixed`);
    console.log(`   - left: ${finalX}px`);
    console.log(`   - top: ${finalY}px`);
    console.log(`   - z-index: 20000`);
    console.log(`   - 画面サイズ: ${window.innerWidth}x${window.innerHeight}`);
    
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
    star.style.zIndex = '20000';
    
    document.body.appendChild(star);
    // //console.log(`⭐ 星${i+1}をDOMに追加: `, star);
    
    // アニメーション終了後に星を削除
    setTimeout(() => {
      if (star.parentNode) {
        star.parentNode.removeChild(star);
        // //console.log('⭐ 受信側の星を削除');
      }
    }, 1000);
  }
  console.log(`🌟 createReceiverStar関数完了: ${starCount}個の星を作成しました`);
}


// CSSアニメーションをスタイルシートに追加（送信側と完全に同じ）
function addStarStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .star {
      position: fixed;
      width: 16px;
      height: 16px;
      background: gold;
      pointer-events: none;
      animation: starTwinkle 1s ease-out forwards;
      z-index: 20000;
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
  // //console.log('⭐ 受信側の星アニメーションCSSを追加（送信側と完全に同じ）');
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
  // //console.log('💖 ハート生成開始（受信側）');
  const heart = document.createElement('div');
  heart.className = 'heart';
  
  // ランダムなゆらゆら効果を生成
  const randomAnimationName = `heartFloat_${Math.random().toString(36).substr(2, 9)}`;
  const randomMoves = [];
  for (let i = 0; i <= 5; i++) {
    const randomX = (Math.random() - 0.5) * 30; // -15px to 15px
    randomMoves.push(randomX);
  }
  
  //console.log(`💖 ランダム移動値: [${randomMoves.join(', ')}]`);
  
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
  //console.log(`💖 スタイル追加: ${randomAnimationName}`);
  
  // ランダムアニメーションを適用
  heart.style.animation = `${randomAnimationName} 3s linear forwards`;
  
  document.body.appendChild(heart);
  // //console.log('💖 ハートをDOMに追加（受信側）:', heart);
  
  // 音楽再生（受信側では無効化して重複を防ぐ）
  // const audio = new Audio('./poyo.mp3');
  // audio.play().catch(e => {
  //   console.log('音楽再生エラー:', e);
  // });
  
  // アニメーション終了後削除（スタイルも削除）
  setTimeout(() => {
    if (heart.parentNode) {
      heart.parentNode.removeChild(heart);
      // //console.log('💖 ハート削除（受信側）');
    }
    if (style.parentNode) {
      style.parentNode.removeChild(style);
      // //console.log('💖 スタイル削除（受信側）');
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
    //console.log('👻 Electron透明ウィンドウ作成完了:', windowId);
    return { id: windowId };
  } catch (error) {
    //console.error('❌ 透明ウィンドウ作成エラー:', error);
    return null;
  }
}

// 動画ウィンドウ作成関数
let videoWindowCreated = false;
async function createVideoWindow() {
  if (videoWindowCreated) {
    console.log('🎬 動画ウィンドウは既に作成済みです');
    return;
  }
  
  if (typeof ipcRenderer === 'undefined') {
    console.error('❌ 動画ウィンドウ作成失敗: ipcRendererが利用できません');
    return;
  }
  
  try {
    const result = await ipcRenderer.invoke('create-video-window');
    if (result.success) {
      videoWindowCreated = !result.exists;
      console.log('🎬 動画ウィンドウ作成成功');
    }
  } catch (error) {
    console.error('❌ 動画ウィンドウ作成エラー:', error);
  }
}

// 動画制御コマンド送信関数
function sendVideoCommand(command, data = {}) {
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send('video-control', { command, ...data });
    console.log(`🎬 動画コマンド送信: ${command}`);
  } else {
    console.error(`🎬 動画コマンド送信失敗: ipcRendererが利用できません (${command})`);
  }
}

// Electron透明ウィンドウにハートを追加する関数
function createSpecialHeartInOverlay(x) {
  const heartData = { x, timestamp: Date.now() };
  ipcRenderer.send('add-heart-to-transparent-window', heartData);
  //console.log(`👻 Electron透明ウィンドウにハート追加指示:`, heartData);
}

// 特別演出用の大きなハート生成関数
function createSpecialHeart() {
  // //console.log('✨ 特別ハート生成開始');
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
  // //console.log(`✨ 特別ハートをDOMに追加: x=${randomX}px`);
  
  // 音楽再生（受信側では無効化して重複を防ぐ）
  // const audio = new Audio('./poyo.mp3');
  // audio.play().catch(e => {
  //   console.log('音楽再生エラー:', e);
  // });
  
  // 0.8秒後（画面上部到達時）に透明ウィンドウにハートを追加
  setTimeout(() => {
    // //console.log('📤 透明ウィンドウへのハート送信実行:', randomX);
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
  // //console.log('🎉 特別演出開始！30個の大きなハートを生成');
  
  // renzoku.mp3を再生
  const audio = new Audio('./renzoku.mp3');
  audio.volume = 0.7;
  audio.play().catch(e => {
    //console.log('renzoku.mp3再生エラー:', e);
  });
  //console.log('🔊 特別演出でrenzoku.mp3再生開始');
  
  // 送信側にも特別演出開始を通知
  if (socket && socket.readyState === WebSocket.OPEN) {
    const specialEffectMessage = JSON.stringify({
      type: "specialHeartEffect"
    });
    socket.send(specialEffectMessage);
    //console.log('🎉 送信側に特別演出開始を通知:', specialEffectMessage);
  } else {
    //console.log('❌ WebSocket接続なし - 特別演出通知送信失敗');
  }
  
  // 既存の透明ウィンドウがない場合のみ新規作成
  try {
    await createTransparentWindow();
  } catch (error) {
    //console.log('👻 透明ウィンドウは既に存在または作成済み');
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
      //console.log('🚪 扉演出中のため、L キーイベントを無効化');
      return;
    }
    // //console.log('💖 lキーが押されました - ハートエフェクト開始');
    
    // lキー押下回数をカウント
    lKeyPressCount++;
    //console.log(`💖 lキー押下回数: ${lKeyPressCount}/10`);
    
    // 既存のタイマーをクリア
    if (lKeyPressTimer) {
      clearTimeout(lKeyPressTimer);
    }
    
    // 10回押下で特別演出
    if (lKeyPressCount >= 10) {
      //console.log('🎉 lキー10回押下達成！特別演出発動');
      triggerSpecialEffect();
      lKeyPressCount = 0; // カウントリセット
    } else {
      // 通常のハートエフェクト（チェックボックスがONの場合のみ）
      if (heartEffectEnabled) {
        createHeart();
      }
      
      // 🎵 poyo.mp3を再生
      const poyoAudio = new Audio('./poyo.mp3');
      poyoAudio.volume = 0.8; // ボリュームを80%に設定
      poyoAudio.play().then(() => {
        //console.log('🎵 poyo.mp3再生開始');
      }).catch(e => {
        //console.log('🎵 poyo.mp3再生エラー:', e);
      });
      
      // 書き手側にもハート表示指示を送信
      if (socket && socket.readyState === WebSocket.OPEN) {
        const heartMessage = JSON.stringify({
          type: "heartEffect"
        });
        socket.send(heartMessage);
        // //console.log('💖 送信側にハートエフェクト指示を送信:', heartMessage);
      } else {
        //console.log('❌ WebSocket接続なし - ハートエフェクト送信失敗');
      }
    }
    
    // 3秒後にカウントリセット
    lKeyPressTimer = setTimeout(() => {
      if (lKeyPressCount < 10) {
        //console.log('⏰ 3秒経過 - lキーカウントリセット');
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

// 背景画像とキャンバス管理
let back2Image = null;
let back2Wrapper = null;
let drawCanvas = null;
let drawCtx = null;
let initialBack2Size = { width: 283, height: 420 }; // back2.pngの初期サイズ
let currentScale = 1.4; // 現在のスケール - 書き手側デフォルトと同期

// 書き手側と接続時にback2.pngを180度回転で表示
function displayBack2Image() {
  // 既存の要素を削除
  if (back2Wrapper) {
    back2Wrapper.remove();
  }
  
  // back2.pngの画像要素を作成
  back2Image = new Image();
  back2Image.onload = () => {
    console.log(`✅ back2.png読み込み完了: ${back2Image.naturalWidth}x${back2Image.naturalHeight}`);
    
    // 初期サイズを記録
    initialBack2Size.width = back2Image.naturalWidth;
    initialBack2Size.height = back2Image.naturalHeight;
    
    createBack2Display();
  };
  
  back2Image.onerror = (error) => {
    console.error('❌ back2.png読み込み失敗:', error);
  };
  
  back2Image.src = './back2.png';
}

// back2.pngの表示要素を作成
function createBack2Display() {
  // 現在のサイズを計算（スケール適用）
  const displayWidth = Math.round(initialBack2Size.width * currentScale);
  const displayHeight = Math.round(initialBack2Size.height * currentScale);
  
  // 横センタリングの位置を計算
  const leftPosition = (window.innerWidth - displayWidth) / 2;
  
  // ラッパー要素を作成
  back2Wrapper = document.createElement('div');
  back2Wrapper.id = 'back2-wrapper';
  back2Wrapper.style.cssText = `
    position: fixed !important;
    top: 100px !important;
    left: ${leftPosition}px !important;
    width: ${displayWidth}px !important;
    height: ${displayHeight}px !important;
    z-index: 1000 !important;
    transform: rotate(180deg) !important;
    transform-origin: center center !important;
    pointer-events: none !important;
  `;
  
  // 背景要素を作成（画像または白背景）
  let backgroundElement;
  if (window.isDevWhiteBackground) {
    // 白背景の場合
    backgroundElement = document.createElement('div');
    backgroundElement.className = 'white-background';
    backgroundElement.style.cssText = `
      width: 100% !important;
      height: 100% !important;
      background: #ffffff !important;
      border: 2px solid #ccc !important;
      box-sizing: border-box !important;
    `;
    console.log('🔧 白背景要素を作成（white-backgroundクラス付き）');
  } else {
    // 画像の場合
    backgroundElement = document.createElement('img');
    backgroundElement.src = './back2.png';
    backgroundElement.style.cssText = `
      width: 100% !important;
      height: 100% !important;
      display: block !important;
      object-fit: contain !important;
    `;
  }
  
  // キャンバスを作成（描画用）
  drawCanvas = document.createElement('canvas');
  drawCanvas.id = 'draw-canvas';
  // 描画キャンバスの論理サイズを表示サイズに合わせる
  drawCanvas.width = displayWidth;
  drawCanvas.height = displayHeight;
  drawCanvas.style.cssText = `
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    z-index: 10 !important;
    pointer-events: none !important;
  `;
  
  drawCtx = drawCanvas.getContext('2d');
  
  // 構造を組み立て
  back2Wrapper.appendChild(backgroundElement);
  back2Wrapper.appendChild(drawCanvas);
  document.body.appendChild(back2Wrapper);
  
  console.log(`🎯 back2表示完了: サイズ${displayWidth}x${displayHeight}, 位置(${leftPosition.toFixed(1)}, 100), scale=${currentScale}`);
  console.log(`🎯 back2画像サイズ: ${back2Image.naturalWidth}x${back2Image.naturalHeight}`);
  console.log(`🎯 描画キャンバス論理サイズ: ${drawCanvas.width}x${drawCanvas.height}`);
  console.log(`🎯 描画キャンバス表示サイズ: ${drawCanvas.style.width} x ${drawCanvas.style.height}`);
}

// back2のサイズとキャンバスを更新
function updateBack2Size(newScale) {
  if (!back2Wrapper || !back2Image || !drawCanvas) return;
  
  currentScale = newScale;
  const displayWidth = Math.round(initialBack2Size.width * currentScale);
  const displayHeight = Math.round(initialBack2Size.height * currentScale);
  const leftPosition = (window.innerWidth - displayWidth) / 2;
  
  // ラッパーのサイズと位置を更新
  back2Wrapper.style.width = `${displayWidth}px`;
  back2Wrapper.style.height = `${displayHeight}px`;
  back2Wrapper.style.left = `${leftPosition}px`;
  
  // 描画キャンバスの論理サイズもスケールに合わせて更新
  drawCanvas.width = displayWidth;
  drawCanvas.height = displayHeight;
  
  // 描画キャンバスの表示サイズは100%のまま（ラッパーに合わせる）
  drawCanvas.style.width = '100%';
  drawCanvas.style.height = '100%';
  
  console.log(`🔄 back2サイズ更新: 表示${displayWidth}x${displayHeight}, キャンバス座標系${drawCanvas.width}x${drawCanvas.height}, scale=${currentScale}`);
}

// 描画データ管理
let drawingData = [];

// WriterID別パス状態管理
let writerPathStates = {};
let writerNeonPaths = {};
let normalPathTimers = {};

// WriterID別描画データ管理
let writerDrawingData = {};

// WriterID別キャンバスサイズ管理
let writerCanvasSizes = {};

// 180度回転した描画を実行
// ベジェ曲線で滑らかに描画する関数（連続版）
function drawRotatedCurve(x0, y0, x1, y1, x2, y2, color, thickness) {
  if (!drawCtx) return;
  
  drawCtx.save();
  
  // キャンバスの中心に移動して180度回転
  drawCtx.translate(drawCanvas.width / 2, drawCanvas.height / 2);
  drawCtx.rotate(Math.PI);
  drawCtx.translate(-drawCanvas.width / 2, -drawCanvas.height / 2);
  
  // 基本設定
  drawCtx.lineCap = 'round';
  drawCtx.lineJoin = 'round';
  
  // 前回の終点から今回の終点へ連続的に描画
  // 中間点を制御点として使用
  const controlX = x1;
  const controlY = y1;
  const startX = x0;
  const startY = y0;
  const endX = x2;
  const endY = y2;
  
  // white-red-border特別処理
  if (color === 'white-red-border') {
    const layers = [
      { thickness: (thickness || 8) + 13, alpha: 0.2, color: '#ffccdd' },
      { thickness: (thickness || 8) + 10, alpha: 0.5, color: '#ffaacc' },
      { thickness: (thickness || 8) + 8, alpha: 0.8, color: '#ff88bb' },
      { thickness: Math.max(1, (thickness || 8) - 4), alpha: 0.9, color: '#ffffff' }
    ];
    
    layers.forEach(layer => {
      drawCtx.globalAlpha = layer.alpha;
      drawCtx.strokeStyle = layer.color;
      drawCtx.lineWidth = layer.thickness;
      
      // 前の点から直接描画（隙間を防ぐ）
      drawCtx.beginPath();
      drawCtx.moveTo(startX, startY);
      drawCtx.lineTo(controlX, controlY);
      drawCtx.lineTo(endX, endY);
      drawCtx.stroke();
    });
    
    drawCtx.globalAlpha = 1.0;
  } else {
    // 通常色の描画
    drawCtx.strokeStyle = color || '#000000';
    drawCtx.lineWidth = thickness || 2;
    
    // 前の点から直接描画（隙間を防ぐ）
    drawCtx.beginPath();
    drawCtx.moveTo(startX, startY);
    drawCtx.lineTo(controlX, controlY);
    drawCtx.lineTo(endX, endY);
    drawCtx.stroke();
  }
  
  drawCtx.restore();
}

function drawRotatedStroke(x1, y1, x2, y2, color, thickness) {
  if (!drawCtx) {
    return;
  }
  
  // 🔍【調査用】座標間距離の計算
  const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const isLongDistance = distance > 10; // 10px以上の距離を長距離と判定
  
  if (isLongDistance) {
    console.log(`📏距離調査: ${distance.toFixed(1)}px | (${x1.toFixed(1)},${y1.toFixed(1)}) → (${x2.toFixed(1)},${y2.toFixed(1)}) | 長距離:${isLongDistance ? '⚠️大きな間隔' : '✅正常'}`);
  }
  
  drawCtx.save();
  
  // キャンバスの中心に移動して180度回転
  drawCtx.translate(drawCanvas.width / 2, drawCanvas.height / 2);
  drawCtx.rotate(Math.PI);
  drawCtx.translate(-drawCanvas.width / 2, -drawCanvas.height / 2);
  
  // 基本設定
  drawCtx.lineCap = 'round';
  drawCtx.lineJoin = 'round';
  
  // 🔴 white-red-border特別処理
  if (color === 'white-red-border') {
    console.log('🔴 drawRotatedStroke: white-red-border特別処理実行中');
    
    // ピンク色のグラデーション効果（送信側と同じ）
    const layers = [
      { thickness: (thickness || 8) + 13, alpha: 0.2, color: '#ffccdd' },
      { thickness: (thickness || 8) + 10, alpha: 0.5, color: '#ffaacc' },
      { thickness: (thickness || 8) + 8, alpha: 0.8, color: '#ff88bb' },
      { thickness: Math.max(1, (thickness || 8) - 4), alpha: 0.9, color: '#ffffff' }
    ];
    
    // 各レイヤーを描画（外側から内側へ）
    layers.forEach(layer => {
      drawCtx.globalAlpha = layer.alpha;
      drawCtx.strokeStyle = layer.color;
      drawCtx.lineWidth = layer.thickness;
      
      drawCtx.beginPath();
      drawCtx.moveTo(x1, y1);
      drawCtx.lineTo(x2, y2);
      drawCtx.stroke();
    });
    
    // アルファ値を元に戻す
    drawCtx.globalAlpha = 1.0;
    
  } else {
    // 通常色の描画
    drawCtx.strokeStyle = color || '#000000';
    drawCtx.lineWidth = thickness || 2;
    drawCtx.beginPath();
    drawCtx.moveTo(x1, y1);
    drawCtx.lineTo(x2, y2);
    drawCtx.stroke();
  }
  
  drawCtx.restore();
}

// キャンバスをクリア
function clearDrawCanvas() {
  if (!drawCtx) return;
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
}

// 全描画データを再描画
function redrawAllStrokes() {
  if (!drawCtx) return;
  
  clearDrawCanvas();
  
  // ベジェ曲線で滑らかに描画（送信側と同じアルゴリズム）
  for (let i = 1; i < drawingData.length; i++) {
    const current = drawingData[i];
    const previous = drawingData[i - 1];
    
    // 連続する描画のみ線を引く
    if (current.type === 'draw' && previous.type === 'draw') {
      // 3点以上ある場合は曲線補間
      if (i >= 2) {
        const beforePrevious = drawingData[i - 2];
        if (beforePrevious.type === 'draw') {
          // ベジェ曲線で滑らかに接続
          drawRotatedCurve(
            beforePrevious.x, beforePrevious.y,
            previous.x, previous.y,
            current.x, current.y,
            current.color,
            current.thickness
          );
        } else {
          // 直線描画
          drawRotatedStroke(
            previous.x, previous.y,
            current.x, current.y,
            current.color,
            current.thickness
          );
        }
      } else {
        // 最初の2点は直線
        drawRotatedStroke(
          previous.x, previous.y,
          current.x, current.y,
          current.color,
          current.thickness
        );
      }
    }
  }
}

// Writer描画データをback2.png上に180度回転で描画
function processDrawingForBack2(data, writerId) {
  if (!drawCtx || !back2Wrapper) {
    return;
  }
  
  // 🔧【修正】Writer別データ管理を使用（既存のwriterDrawingDataを活用）
  if (!writerDrawingData[writerId]) {
    writerDrawingData[writerId] = [];
  }
  
  // Writer別配列に追加
  writerDrawingData[writerId].push(data);
  
  // 🔧【修正】WebSocket順序乱れ対策：タイムスタンプでソート
  writerDrawingData[writerId].sort((a, b) => a.timestamp - b.timestamp);
  
  // 🔧【修正】ソート後に正しい前のデータを取得
  const currentIndex = writerDrawingData[writerId].findIndex(item => 
    item.x === data.x && item.y === data.y && item.timestamp === data.timestamp
  );
  const prevData = currentIndex > 0 ? writerDrawingData[writerId][currentIndex - 1] : null;
  const beforePrevData = currentIndex > 1 ? writerDrawingData[writerId][currentIndex - 2] : null;
    
  // 🔍【デバッグ】前データの確認（高精度表示）
  // console.log(`🔍前データ確認: writerId=${writerId}, 配列長=${writerDrawingData[writerId]?.length || 0}, 現在インデックス=${currentIndex}, prevData=${prevData ? `存在(${prevData.x?.toFixed(3)},${prevData.y?.toFixed(3)}) ts:${prevData.timestamp}` : 'null'}, 現在=(${data.x.toFixed(3)},${data.y.toFixed(3)}) ts:${data.timestamp}`);
  
  // 後方互換性のため共通配列も更新（他機能で使用される可能性）
  drawingData.push(data);
  
  // 連続描画の場合のみ線を引く - Writer別データで判定
  if (data.type === 'draw' && prevData && (prevData.type === 'start' || prevData.type === 'draw')) {
    
    // 🔍【原因調査】座標変換前の距離計算
    const originalDistance = Math.sqrt((data.x - prevData.x) ** 2 + (data.y - prevData.y) ** 2);
    
    // 🔍【原因調査】タイムスタンプ間隔計算
    const timeInterval = data.timestamp - prevData.timestamp;
    const speed = timeInterval > 0 ? (originalDistance / timeInterval * 1000) : 0; // px/秒
    // 座標変換: 書き手側座標を受信側キャンバスサイズに合わせて変換
    const currentCanvasWidth = drawCanvas.width;
    const currentCanvasHeight = drawCanvas.height;
    
    // 書き手側のキャンバスサイズを取得（WebSocketで送信されるcanvasSizeを使用、または標準サイズ）
    const writerCanvasWidth = data.canvasSize?.width || prevData.canvasSize?.width || initialBack2Size.width;
    const writerCanvasHeight = data.canvasSize?.height || prevData.canvasSize?.height || initialBack2Size.height;
    
    // 書き手側座標を受信側キャンバスサイズにスケール変換
    const prevX = (prevData.x / writerCanvasWidth) * currentCanvasWidth;
    const prevY = (prevData.y / writerCanvasHeight) * currentCanvasHeight;
    const currX = (data.x / writerCanvasWidth) * currentCanvasWidth;
    const currY = (data.y / writerCanvasHeight) * currentCanvasHeight;
    
    // 180度回転を適用
    const rotatedPrevX = currentCanvasWidth - prevX;
    const rotatedPrevY = currentCanvasHeight - prevY;
    const rotatedCurrX = currentCanvasWidth - currX;
    const rotatedCurrY = currentCanvasHeight - currY;
    
    // 🔍【原因調査】座標変換後の距離計算
    const transformedDistance = Math.sqrt((rotatedCurrX - rotatedPrevX) ** 2 + (rotatedCurrY - rotatedPrevY) ** 2);
    
    // 🔍【原因調査】点線現象の詳細ログ（条件を緩和して確実に動作確認）
    // console.log(`🎯点線調査: 送信側${originalDistance.toFixed(1)}px → 受信側${transformedDistance.toFixed(1)}px | 時間${timeInterval}ms | 速度${speed.toFixed(1)}px/s | 条件判定:${originalDistance > 5 ? '送信側大' : ''}${transformedDistance > 10 ? '受信側大' : ''}`);
    
    // 大きな間隔の場合に詳細座標も出力
    if (originalDistance > 5 || transformedDistance > 10) {
      console.log(`🎯詳細: (${data.x.toFixed(1)},${data.y.toFixed(1)}) → 描画(${rotatedPrevX.toFixed(1)},${rotatedPrevY.toFixed(1)})→(${rotatedCurrX.toFixed(1)},${rotatedCurrY.toFixed(1)})`);
    }
    
    // 🎨 シンプルな直線描画に戻す（隙間を防ぐため）
    drawRotatedStroke(
      rotatedPrevX, rotatedPrevY,
      rotatedCurrX, rotatedCurrY,
      data.color || '#000000',
      data.thickness || 2
    );
  }
}
function removeDrawRealtimeWriterPath(writerId, currentCmd, prevCmd) {
  if (!currentCmd || !prevCmd) return;
  
  ctx.save();
  
  // 🔥 WriterID別Canvas状態完全分離（書き手側と同様の処理）
  ctx.beginPath(); // 重要：他のWriterのパス状態を完全にクリア
  ctx.setTransform(1, 0, 0, 1, 0, 0); // 変換行列をリセット
  
  // デフォルト描画設定をリセット
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalCompositeOperation = 'source-over';
  
  // 描画エリアの中心で180度回転を適用
  const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
  const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
  const areaLeft = areaCenterX - drawingAreaSize.width / 2;
  const areaTop = areaCenterY - drawingAreaSize.height / 2;
  
  ctx.translate(areaCenterX, areaCenterY);
  ctx.rotate(Math.PI);
  ctx.translate(-areaCenterX, -areaCenterY);
  
  // 前の座標と現在の座標を変換
  const prevCoords = transformCoordinatesWithAspectRatio(prevCmd.x, prevCmd.y, senderCanvasSize, drawingAreaSize);
  const currCoords = transformCoordinatesWithAspectRatio(currentCmd.x, currentCmd.y, senderCanvasSize, drawingAreaSize);
  
  const prevX = areaLeft + prevCoords.x;
  const prevY = areaTop + prevCoords.y;
  const currX = areaLeft + currCoords.x;
  const currY = areaTop + currCoords.y;
  
  // 線を描画（既にbeginPath済み、WriterID別に独立したパス）
  ctx.moveTo(prevX, prevY);
  ctx.lineTo(currX, currY);
  
  const scaledThickness = (currentCmd.thickness || 8) * (drawingAreaSize.width / senderCanvasSize.width);
  ctx.lineWidth = scaledThickness;
  
  // 色の設定
  const whiteColor = isVideoBackgroundActive ? '#f0f0f0' : '#fff';
  ctx.strokeStyle = currentCmd.color === 'black' ? '#000' : 
                   (currentCmd.color === 'white' ? whiteColor : 
                   (currentCmd.color === 'red' ? '#ff0000' : 
                   (currentCmd.color === 'blue' ? '#0000ff' : 
                   (currentCmd.color === 'green' ? '#008000' : 
                   (currentCmd.color === 'pink' ? '#ff69b4' : (currentCmd.color || '#000'))))));
  
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  
  ctx.restore();
}

// WriterID別に独立して描画する関数（受信側用）
function removeDrawWriterCommandsReceiver(commands, writerId) {
  if (commands.length === 0) return;
  
  // このWriterのパス状態を初期化
  if (!writerPathStates[writerId]) {
    writerPathStates[writerId] = {
      isInPath: false,
      currentPath: null,
      prevCmd: null
    };
  }
  
  const writerState = writerPathStates[writerId];
  
  // 各Writer描画前に完全にcontextを初期化
  ctx.save();
  
  // 🔥 WriterID別Canvas状態完全分離（書き手側と同様の処理）
  ctx.beginPath(); // 重要：他のWriterのパス状態を完全にクリア
  ctx.setTransform(1, 0, 0, 1, 0, 0); // 変換行列をリセット
  
  // デフォルト描画設定をリセット
  ctx.globalAlpha = 1.0;
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalCompositeOperation = 'source-over';
  
  // 描画エリアの中心で180度回転を適用（受信側の表示）
  const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
  const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
  const areaLeft = areaCenterX - drawingAreaSize.width / 2;
  const areaTop = areaCenterY - drawingAreaSize.height / 2;
  
  ctx.translate(areaCenterX, areaCenterY);
  ctx.rotate(Math.PI);
  ctx.translate(-areaCenterX, -areaCenterY);
  
  commands.forEach((cmd, index) => {
    if (cmd.type === "start") {
      // 前のパスがあれば完了させる
      if (writerState.isInPath && writerState.currentPath) {
        ctx.stroke();
        writerState.isInPath = false;
        writerState.currentPath = null;
      }
      
      const coords = transformCoordinatesWithAspectRatio(cmd.x, cmd.y, senderCanvasSize, drawingAreaSize);
      const scaledX = coords.x;
      const scaledY = coords.y;
      
      // 新しいパスを開始（既にWriterID別にbeginPath済み）
      ctx.moveTo(areaLeft + scaledX, areaTop + scaledY);
      
      // パス情報を記録
      writerState.currentPath = {
        writerId: writerId,
        startX: scaledX,
        startY: scaledY,
        commands: [cmd]
      };
      
      writerState.prevCmd = cmd;
      writerState.isInPath = true;
      
    } else if (cmd.type === "draw" && writerState.prevCmd && writerState.currentPath) {
      // 現在のパスのWriterIDと異なる場合はスキップ（安全性確保）
      if (writerState.currentPath.writerId !== writerId) {
        console.warn(`⚠️ WriterID不整合: currentPath=${writerState.currentPath.writerId}, cmd.writerId=${writerId}`);
        return;
      }
      
      const coords = transformCoordinatesWithAspectRatio(cmd.x, cmd.y, senderCanvasSize, drawingAreaSize);
      const scaledX = coords.x;
      const scaledY = coords.y;
      const scaledThickness = (cmd.thickness || 8) * (drawingAreaSize.width / senderCanvasSize.width);
      
      // パス情報を更新
      writerState.currentPath.commands.push(cmd);
      
      // 滑らかな描画: 前の点と現在の点で補間
      const prevCoords = transformCoordinatesWithAspectRatio(writerState.prevCmd.x, writerState.prevCmd.y, senderCanvasSize, drawingAreaSize);
      const prevX = areaLeft + prevCoords.x;
      const prevY = areaTop + prevCoords.y;
      const currX = areaLeft + scaledX;
      const currY = areaTop + scaledY;
      
      // quadraticCurveTo で滑らかな曲線を描画
      const commands = writerState.currentPath.commands;
      if (commands.length >= 3) {
        // 3点以上ある場合は quadratic curve
        const prev2Coords = transformCoordinatesWithAspectRatio(commands[commands.length - 3].x, commands[commands.length - 3].y, senderCanvasSize, drawingAreaSize);
        const prev2X = areaLeft + prev2Coords.x;
        const prev2Y = areaTop + prev2Coords.y;
        
        // 制御点を前の点に設定
        const controlX = prevX;
        const controlY = prevY;
        // 中間点を終点に設定
        const endX = (prevX + currX) / 2;
        const endY = (prevY + currY) / 2;
        
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
      } else {
        // 最初の数点は直線
        ctx.lineTo(currX, currY);
      }
      
      if (cmd.color === 'white-red-border') {
        console.log('🔴 white-red-border特別処理実行中:', cmd);
        // 白地赤縁の特別処理
        if (writerState.isInPath) {
          ctx.stroke(); // 現在のパスを完了
          writerState.isInPath = false;
        }
        
        const prevCoords = transformCoordinatesWithAspectRatio(writerState.prevCmd.x, writerState.prevCmd.y, senderCanvasSize, drawingAreaSize);
        const prevScaledX = prevCoords.x;
        const prevScaledY = prevCoords.y;
        
        // 外側の薄い赤
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = scaledThickness + 8;
        ctx.strokeStyle = '#ffccdd';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(areaLeft + prevScaledX, areaTop + prevScaledY);
        ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
        ctx.stroke();
        ctx.restore();
        
        // 🖊️ 描画位置デバッグ出力
        console.log(`🖊️ ペン描画位置（キャンバス座標）: (${(areaLeft + scaledX).toFixed(1)}, ${(areaTop + scaledY).toFixed(1)})`);
        console.log(`🖊️ ペン描画位置（元データ）: scaledX=${scaledX.toFixed(1)}, scaledY=${scaledY.toFixed(1)}, areaLeft=${areaLeft.toFixed(1)}, areaTop=${areaTop.toFixed(1)}`);
        
        // 🖊️ ページ座標でのペン描画位置も出力
        const canvasRect = canvas.getBoundingClientRect();
        const penPageX = canvasRect.left + (areaLeft + scaledX);
        const penPageY = canvasRect.top + (areaTop + scaledY);
        console.log(`🖊️ ペン描画位置（ページ座標）: (${penPageX.toFixed(1)}, ${penPageY.toFixed(1)})`);
        
        // 内側の濃い赤
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = scaledThickness + 6;
        ctx.strokeStyle = '#ff88bb';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(areaLeft + prevScaledX, areaTop + prevScaledY);
        ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
        ctx.stroke();
        ctx.restore();
        
        // 白い中心
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = Math.max(1, scaledThickness - 3);
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(areaLeft + prevScaledX, areaTop + prevScaledY);
        ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
        ctx.stroke();
        ctx.restore();
        
      } else {
        console.log('🔵 通常色描画処理:', cmd.color, cmd);
        // 通常の色の描画
        if (!writerState.isInPath) {
          const prevCoords = transformCoordinatesWithAspectRatio(writerState.prevCmd.x, writerState.prevCmd.y, senderCanvasSize, drawingAreaSize);
          const prevScaledX = prevCoords.x;
          const prevScaledY = prevCoords.y;
          ctx.beginPath();
          ctx.moveTo(areaLeft + prevScaledX, areaTop + prevScaledY);
          writerState.isInPath = true;
        }
        
        // 線の設定
        ctx.lineWidth = scaledThickness;
        const whiteColor = isVideoBackgroundActive ? '#f0f0f0' : '#fff';
        if (cmd.color === 'white-red-border') {
          // white-red-border の特別処理（3層グラデーション効果）
          const currentThickness = cmd.thickness || 4;
          const scaledThickness = currentThickness * (drawingAreaSize.width / senderCanvasSize.width);
          
          // 外側の薄い赤
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.lineWidth = scaledThickness + 10;
          ctx.strokeStyle = '#ffccdd';
          ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
          ctx.stroke();
          ctx.restore();
          
          // 中間の赤
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = scaledThickness + 6;
          ctx.strokeStyle = '#ff88bb';
          ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
          ctx.stroke();
          ctx.restore();
          
          // 内側の白
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = Math.max(1, scaledThickness - 3);
          ctx.strokeStyle = '#ffffff';
          ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.strokeStyle = cmd.color === 'black' ? '#000' : 
                           (cmd.color === 'white' ? whiteColor : 
                           (cmd.color === 'red' ? '#ff0000' : 
                           (cmd.color === 'blue' ? '#0000ff' : 
                           (cmd.color === 'green' ? '#008000' : 
                           (cmd.color === 'pink' ? '#ff69b4' : (cmd.color || '#000'))))));
        }
        ctx.shadowBlur = 0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
        
        // 🖊️ 通常色でも描画位置ログを出力
        console.log(`🖊️ ペン描画位置（通常色・キャンバス座標）: (${(areaLeft + scaledX).toFixed(1)}, ${(areaTop + scaledY).toFixed(1)})`);
        const canvasRect = canvas.getBoundingClientRect();
        const penPageX = canvasRect.left + (areaLeft + scaledX);
        const penPageY = canvasRect.top + (areaTop + scaledY);
        console.log(`🖊️ ペン描画位置（通常色・ページ座標）: (${penPageX.toFixed(1)}, ${penPageY.toFixed(1)})`);
      }
      
      writerState.prevCmd = cmd;
    }
  });
  
  // 最後のパスを完了
  if (writerState.isInPath && writerState.currentPath) {
    ctx.stroke();
    writerState.isInPath = false;
    writerState.currentPath = null;
  }
  
  // contextを完全に復元
  ctx.restore();
}

// 🖨️ WriterID別印刷用描画関数（Canvas状態完全分離）
function removeDrawWriterCommandsForPrint(commands, writerId, printCtx) {
  if (commands.length === 0) return;
  
  // 🔥 印刷用WriterID別Canvas状態完全分離
  printCtx.save();
  printCtx.beginPath(); // 重要：他のWriterのパス状態を完全にクリア
  printCtx.setTransform(1, 0, 0, 1, 0, 0); // 変換行列をリセット
  
  // デフォルト描画設定をリセット
  printCtx.globalAlpha = 1.0;
  printCtx.shadowBlur = 0;
  printCtx.shadowColor = 'transparent';
  printCtx.globalCompositeOperation = 'source-over';
  printCtx.lineCap = 'round';
  printCtx.lineJoin = 'round';
  
  let isInPath = false;
  
  commands.forEach((cmd, index) => {
    if (cmd.type === "start") {
      // 前のパスがあれば完了
      if (isInPath) {
        printCtx.stroke();
      }
      
      // 新しいパスを開始（既にbeginPath済み）
      printCtx.moveTo(cmd.x, cmd.y);
      isInPath = true;
      
    } else if (cmd.type === "draw" && isInPath) {
      const thickness = cmd.thickness || 4;
      printCtx.lineWidth = thickness;
      
      // 色とエフェクトの処理
      if (cmd.color === 'neon' && typeof cmd.neonIndex === 'number') {
        const interpolatedColor = getNeonColorFromIndex(cmd.neonIndex);
        printCtx.strokeStyle = interpolatedColor;
        printCtx.shadowBlur = 10;
        printCtx.shadowColor = interpolatedColor;
      } else if (cmd.color === 'white-red-border') {
        // 白地赤縁の印刷処理（複数層）
        const currentThickness = cmd.thickness || 4;
        
        // 外側の薄い赤
        printCtx.save();
        printCtx.globalAlpha = 0.2;
        printCtx.lineWidth = currentThickness + 10;
        printCtx.strokeStyle = '#ffccdd';
        printCtx.lineTo(cmd.x, cmd.y);
        printCtx.stroke();
        printCtx.restore();
        
        // 中間の赤
        printCtx.save();
        printCtx.globalAlpha = 0.5;
        printCtx.lineWidth = currentThickness + 8;
        printCtx.strokeStyle = '#ffaacc';
        printCtx.lineTo(cmd.x, cmd.y);
        printCtx.stroke();
        printCtx.restore();
        
        // 内側の濃い赤
        printCtx.save();
        printCtx.globalAlpha = 0.8;
        printCtx.lineWidth = currentThickness + 6;
        printCtx.strokeStyle = '#ff88bb';
        printCtx.lineTo(cmd.x, cmd.y);
        printCtx.stroke();
        printCtx.restore();
        
        // 白い中心
        printCtx.save();
        printCtx.globalAlpha = 0.9;
        printCtx.lineWidth = Math.max(1, currentThickness - 3);
        printCtx.strokeStyle = '#ffffff';
        printCtx.lineTo(cmd.x, cmd.y);
        printCtx.stroke();
        printCtx.restore();
        
        return; // 通常の描画処理をスキップ
      } else {
        // 通常の色
        const actualColor = cmd.color === 'white-red-border' ? '#ffffff' : 
                           (cmd.color === 'black' ? '#000' : 
                           (cmd.color === 'white' ? '#fff' : 
                           (cmd.color === 'red' ? '#ff0000' : 
                           (cmd.color === 'blue' ? '#0000ff' : 
                           (cmd.color === 'green' ? '#008000' : 
                           (cmd.color === 'pink' ? '#ff69b4' : (cmd.color || '#000')))))));
        printCtx.strokeStyle = actualColor;
        printCtx.shadowBlur = 0;
      }
      
      printCtx.lineTo(cmd.x, cmd.y);
      printCtx.stroke();
    }
  });
  
  // 最終パスを完了
  if (isInPath) {
    printCtx.stroke();
  }
  
  printCtx.restore();
}

// 🖨️ WriterID別ダウンロード用描画関数（Canvas状態完全分離）
function removeDrawWriterCommandsForDownload(commands, writerId, downloadCtx) {
  if (commands.length === 0) return;
  
  // 🔥 ダウンロード用WriterID別Canvas状態完全分離
  downloadCtx.save();
  downloadCtx.beginPath(); // 重要：他のWriterのパス状態を完全にクリア
  downloadCtx.setTransform(1, 0, 0, 1, 0, 0); // 変換行列をリセット
  
  // デフォルト描画設定をリセット
  downloadCtx.globalAlpha = 1.0;
  downloadCtx.shadowBlur = 0;
  downloadCtx.shadowColor = 'transparent';
  downloadCtx.globalCompositeOperation = 'source-over';
  downloadCtx.lineCap = 'round';
  downloadCtx.lineJoin = 'round';
  
  console.log(`🖨️ ダウンロード: Writer ${writerId} 独立描画開始`);
  
  let currentPath = [];
  let pathStarted = false;
  
  commands.forEach((cmd, index) => {
    if (cmd.type === "start") {
      // 前のパスがあれば描画完了
      if (pathStarted && currentPath.length > 0) {
        drawSinglePath(currentPath, downloadCtx);
      }
      
      // 新しいパスを開始
      currentPath = [cmd];
      pathStarted = true;
      
    } else if (cmd.type === "draw" && pathStarted) {
      currentPath.push(cmd);
    }
  });
  
  // 最後のパスを描画
  if (pathStarted && currentPath.length > 0) {
    drawSinglePath(currentPath, downloadCtx);
  }
  
  downloadCtx.restore();
  console.log(`🖨️ ダウンロード: Writer ${writerId} 描画完了`);
}

// 単一パスを描画する補助関数
function removeDrawSinglePath(pathCommands, ctx) {
  if (pathCommands.length === 0) return;
  
  ctx.beginPath();
  
  pathCommands.forEach((cmd, index) => {
    const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
    const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
    
    if (cmd.type === "start" || index === 0) {
      ctx.moveTo(scaledX, scaledY);
    } else if (cmd.type === "draw") {
      const thickness = cmd.thickness || 4;
      ctx.lineWidth = thickness * (drawingAreaSize.width / senderCanvasSize.width);
      ctx.strokeStyle = cmd.color === 'white-red-border' ? '#ffffff' :
                       (cmd.color === 'black' ? '#000' : 
                       (cmd.color === 'white' ? '#fff' : 
                       (cmd.color === 'green' ? '#008000' : 
                       (cmd.color === 'pink' ? '#ff69b4' : (cmd.color || '#000')))));
      ctx.lineTo(scaledX, scaledY);
    }
  });
  
  ctx.stroke();
}

// 全執筆者のデータを統合する関数（旧バージョン - 廃止予定）
function consolidateDrawingData() {
  const consolidated = [];
  
  // 時系列順に並べるため、全データを収集してタイムスタンプでソート
  const allData = [];
  
  Object.keys(writerDrawingData).forEach(writerId => {
    writerDrawingData[writerId].forEach(cmd => {
      allData.push({
        ...cmd,
        writerId: writerId,
        timestamp: cmd.timestamp || Date.now()
      });
    });
  });
  
  // タイムスタンプでソート
  allData.sort((a, b) => a.timestamp - b.timestamp);
  
  const writerCounts = Object.keys(writerDrawingData).map(id => `${id}: ${writerDrawingData[id].length}`).join(', ');
  console.log(`📊 統合描画データ: ${allData.length}個のコマンド（${writerCounts}）`);
  
  return allData;
}

let lastBackgroundSrc = null;
let currentPaperSize = "A4"; // 🔸 現在の用紙サイズ（デフォルトはA4）
let currentPrintMode = "drawOnly"; // 🔸 現在の印刷モード（デフォルトは描画のみ）
let currentVideoSize = 100; // 🔸 現在のビデオサイズ（デフォルト100%）
let starEffectEnabled = true; // 星エフェクトの状態（標準でON）
let fairyDustEffectEnabled = true; // 妖精の粉エフェクトの状態（標準でON）
let heartEffectEnabled = true; // ハートエフェクトの状態（標準でON）

// 🔸 背景変形パラメータ
let backgroundScale = 1.0; // 背景のスケール
let backgroundOffsetY = 0; // 背景の垂直オフセット

// 🔸 Dev Tool設定
let devCanvasScale = 1.4; // キャンバススケール（デフォルト1.4 - 書き手側と同期）
let devAnimationStartWaitTime = 0.1; // アニメーション開始待機時間（秒） - 書き手側と同期
let devRotationWaitTime = 1.0 - 3.0; // 回転後待機時間（秒）- 3秒短縮、書き手側と同期

// 🔸 描画エリア調整設定
// 統一座標システム設定
const UNIFIED_SETTINGS = {
  canvasScale: 0.7,  // 送信側設定と同期
  videoTop: 150,      // 動画・PNG固定位置
  centerAlign: true   // 中央配置
};

// 統一位置計算関数（動画とPNGの同一位置を保証）
function calculateUnifiedPosition(element, videoWidth, videoHeight) {
  const canvas = document.getElementById('drawCanvas');
  const canvasRect = canvas.getBoundingClientRect();
  
  // 中央配置計算
  const centerX = (window.innerWidth - videoWidth) / 2;
  const fixedY = UNIFIED_SETTINGS.videoTop;
  
  // 絶対座標で位置設定
  const positionStyle = `
    position: fixed;
    left: ${centerX}px;
    top: ${fixedY}px;
    width: ${videoWidth}px;
    height: ${videoHeight}px;
    z-index: -1;
  `;
  
  //console.log(`🔧 統一位置計算: center=${centerX.toFixed(1)}, top=${fixedY}, size=${videoWidth.toFixed(1)}x${videoHeight.toFixed(1)}`);
  return positionStyle;
}

let drawingAreaOffset = { x: 0, y: 0 }; // 描画エリアのオフセット
let drawingAreaSize = { width: 630, height: 450 }; // 描画エリアのサイズ（デフォルト）

// 背景画像比率に合わせて描画エリアサイズを更新する関数
function updateDrawingAreaToBackgroundSize() {
  // 動的背景の場合はスキップ（DevPanelの設定を維持）
  if (false) {
    console.log('🔒 動的背景検出: 描画エリアサイズの自動調整をスキップ');
    return;
  }
  
  if (null) {
    const maxWidth = canvas.width * UNIFIED_SETTINGS.canvasScale;
    const maxHeight = canvas.height * UNIFIED_SETTINGS.canvasScale;
    // 背景画像のアスペクト比計算は削除済み
    
    let bgWidth, bgHeight;
    if (imgAspect > maxWidth / maxHeight) {
      bgWidth = maxWidth;
      bgHeight = maxWidth / imgAspect;
    } else {
      bgHeight = maxHeight;
      bgWidth = maxHeight * imgAspect;
    }
    
    // 描画エリアサイズを背景画像サイズに合わせる
    drawingAreaSize.width = bgWidth;
    drawingAreaSize.height = bgHeight;
    
    console.log(`🎯 描画エリアサイズを背景画像に合わせて更新: ${bgWidth.toFixed(1)}x${bgHeight.toFixed(1)}`);
  }
}
let showDrawingAreaFrame = false; // 描画エリアの枠表示フラグ
let isDragSetupComplete = false; // ドラッグセットアップ完了フラグ

// 🔸 ドラッグ機能の状態管理
let isDragging = false;
let isResizing = false;
let dragStartPos = { x: 0, y: 0 };
let dragStartAreaPos = { x: 0, y: 0 };
let dragStartAreaSize = { width: 0, height: 0 };
let resizeDirection = null;

// 🎬 動画背景関連変数
let videoBackgroundElement = null;
let isVideoBackgroundActive = false;
let isCanvasRotated = false; // キャンバスが180度回転しているかのフラグ
let sendAnimationTimer = null; // 送信アニメーション後の扉タイマー

// 🔸 送信側と受信側のキャンバスサイズ情報
let senderCanvasSize = { width: 859, height: 607 }; // 送信側のキャンバスサイズ（デフォルト: 横長）
// WriterID別のキャンバスサイズ管理（複数Writer同時描画対応）
const writerCanvasSizesData = {};
let receiverCanvasSize = { width: 1202, height: 849 }; // 受信側のキャンバスサイズ（デフォルト: 横長 859*1.4=1202, 607*1.4=849）

// 🔧 書き手側のdevtool設定値（UNIFIED_SETTINGSで管理）

let socket = new WebSocket("wss://realtime-sign-server-1.onrender.com");
let connectedWriters = new Set(); // 接続中の書き手管理
let writerSessions = new Map(); // WriterID -> SessionID のマッピング
let writerLastSeen = new Map(); // WriterID -> 最終接触時刻

// WebSocket接続健全性管理
let heartbeatInterval = null;
let connectionHealthy = false;

// Writer IDクリーンアップ関数
function cleanupAllWriterSessions() {
  console.log("🧹 全Writer IDセッションをクリーンアップ");
  connectedWriters.clear();
  writerSessions.clear();
  console.log("✅ Writer IDクリーンアップ完了");
}

// 特定のWriter IDをクリーンアップ
function cleanupWriterSession(writerId) {
  if (connectedWriters.has(writerId)) {
    connectedWriters.delete(writerId);
    writerSessions.delete(writerId);
    writerLastSeen.delete(writerId);
    console.log(`🧹 Writer ID ${writerId} をクリーンアップ`);
  }
}

// タイムアウトしたWriter IDをクリーンアップ（30秒無通信）
function checkWriterTimeouts() {
  const now = Date.now();
  const timeoutMs = 30000; // 30秒
  
  for (let [writerId, lastSeen] of writerLastSeen.entries()) {
    if (now - lastSeen > timeoutMs) {
      console.log(`⏰ Writer ID ${writerId} がタイムアウト (${Math.floor((now - lastSeen) / 1000)}秒)`);
      cleanupWriterSession(writerId);
    }
  }
}

// アクティブなWriter IDのリストを取得
function getActiveWriterIds() {
  const now = Date.now();
  const activeTimeoutMs = 10000; // 10秒以内にアクティビティがあるもの
  const activeWriters = [];
  
  for (let [writerId, lastSeen] of writerLastSeen.entries()) {
    if (now - lastSeen <= activeTimeoutMs) {
      activeWriters.push(writerId);
    }
  }
  
  return activeWriters;
}

// WebSocket接続健全性チェック機能
function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  // 30秒間隔でハートビートを送信
  heartbeatInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("💓 ハートビート送信");
      socket.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
      
      // ハートビート応答タイムアウト設定（10秒）
      setTimeout(() => {
        if (!connectionHealthy) {
          console.warn("⚠️ ハートビート応答タイムアウト - 接続が不安定な可能性");
        }
      }, 10000);
      
      connectionHealthy = false; // pong受信でtrueに戻る
    }
  }, 30000);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  connectionHealthy = false;
}

socket.onopen = () => {
  console.log("✅ 受信側WebSocket接続完了");
  connectionHealthy = true;
  
  // ハートビートを開始
  startHeartbeat();
  
  // 定期的なWriter IDタイムアウトチェックを開始（10秒間隔）
  setInterval(checkWriterTimeouts, 10000);
};
socket.onerror = e => console.error("❌ 受信側WebSocketエラー", e);
socket.onclose = () => {
  console.warn("⚠️ 受信側WebSocket切断");
  
  // ハートビートを停止
  stopHeartbeat();
  
  // Writer IDとセッション情報をクリーンアップ
  cleanupAllWriterSessions();
};

// 🔍 受信側背景デバッグ表示関数
function addReceiverBackgroundDebugVisuals(x, y, bgWidth, bgHeight) {
  ctx.save();
  
  // 背景画像の境界線（青い実線）
  ctx.strokeStyle = 'rgba(0, 100, 255, 0.9)';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.strokeRect(x, y, bgWidth, bgHeight);
  
  // 受信側キャンバス中心点（緑の大きな円）
  const canvasCenterX = canvas.width / 2;
  const canvasCenterY = canvas.height / 2;
  ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
  ctx.beginPath();
  ctx.arc(canvasCenterX, canvasCenterY, 8, 0, 2 * Math.PI);
  ctx.fill();
  
  // 受信側背景画像中心点（黄色の大きな円）
  const bgCenterX = x + bgWidth / 2;
  const bgCenterY = y + bgHeight / 2;
  ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
  ctx.beginPath();
  ctx.arc(bgCenterX, bgCenterY, 8, 0, 2 * Math.PI);
  ctx.fill();
  
  // 位置情報テキスト表示
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.font = '14px Arial';
  ctx.fillText(`受信側: ${bgWidth.toFixed(0)}x${bgHeight.toFixed(0)} at (${x.toFixed(0)}, ${y})`, x + 10, y + 20);
  ctx.fillText(`緑=キャンバス中心 黄=背景中心`, x + 10, y + 40);
  
  ctx.restore();
  
  //console.log(`🔍 受信側背景デバッグ表示:`);
  //console.log(`  背景画像境界: 青い実線 ${bgWidth.toFixed(1)}x${bgHeight.toFixed(1)} at (${x}, ${y})`);
  //console.log(`  キャンバス中心: 緑円 (${canvasCenterX}, ${canvasCenterY})`);
  //console.log(`  背景画像中心: 黄円 (${bgCenterX.toFixed(1)}, ${bgCenterY.toFixed(1)})`);
  //console.log(`  中心のずれ: X=${(bgCenterX - canvasCenterX).toFixed(1)}px, Y=${(bgCenterY - canvasCenterY).toFixed(1)}px`);
}

// 180度回転時の座標変換関数
function transformCoordinates(x, y) {
  if (isCanvasRotated) {
    // 180度回転: (x, y) → (canvasWidth - x, canvasHeight - y)
    return {
      x: canvas.width - x,
      y: canvas.height - y
    };
  }
  return { x, y };
}

// 初期化時に横長サイズを適用
document.addEventListener('DOMContentLoaded', () => {
  setReceiverCanvasSize();
  //console.log('🔧 初期化: 横長キャンバスサイズを適用');
  //console.log(`🔧 初期化後の描画エリアサイズ: ${drawingAreaSize.width} x ${drawingAreaSize.height}`);
  
  // 🎬 映像再生機能がデフォルトで有効な場合、動画ウィンドウを作成
  setTimeout(() => {
    // WebSocketで書き手から設定を受信するまで少し待つ
    if (!window.videoPlaybackDisabled) {
      createVideoWindow();
      console.log('🎬 初期化: 動画ウィンドウを作成');
    }
  }, 2000);
  
  // ウィンドウリサイズ時にback2.pngを中央に再配置
  window.addEventListener('resize', () => {
    if (back2Wrapper && back2Image) {
      const displayWidth = Math.round(initialBack2Size.width * currentScale);
      const leftPosition = (window.innerWidth - displayWidth) / 2;
      back2Wrapper.style.left = `${leftPosition}px`;
      console.log(`🔄 ウィンドウリサイズ対応: back2.png中央配置更新 left=${leftPosition}px`);
    }
  });
});

// 🎬 動画背景関数群
function prepareVideoBackground(videoSrc) {
  
  // 既存の動画要素を削除
  if (videoBackgroundElement) {
    videoBackgroundElement.remove();
  }
  
  // 新しい動画要素を作成（devtoolスケールと同じサイズ）
  videoBackgroundElement = document.createElement('video');
  videoBackgroundElement.src = videoSrc;
  
  // 静止画背景と完全に同じサイズ計算を使用
  const maxWidth = canvas.width * UNIFIED_SETTINGS.canvasScale;
  const maxHeight = canvas.height * UNIFIED_SETTINGS.canvasScale;
  
  // back6.pngと同じアスペクト比（1920x1080）
  const videoAspect = 1920 / 1080;
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
  
  //console.log(`🎬 動画サイズ計算: スケール=${UNIFIED_SETTINGS.canvasScale}x, サイズ=${videoWidth.toFixed(1)}x${videoHeight.toFixed(1)}`);
  
  // 動画の位置をキャンバス基準で計算（静止画と完全に同じ計算）
  const canvasRect = canvas.getBoundingClientRect();
  const videoDrawXRelativeToCanvas = canvas.width / 2 - videoWidth / 2;
  const videoAbsoluteX = canvasRect.left + videoDrawXRelativeToCanvas;
  const videoAbsoluteY = canvasRect.top + canvas.height / 2 - videoHeight / 2;
  
  // 動画サイズをキャンバススケールに合わせて縮小（書き手側キャンバス内に収める）
  const scaledVideoWidth = videoWidth;
  const scaledVideoHeight = videoHeight;
  
  const unifiedStyle = calculateUnifiedPosition(videoBackgroundElement, scaledVideoWidth, scaledVideoHeight);
  videoBackgroundElement.setAttribute('style', unifiedStyle + `
    object-fit: contain !important;
    pointer-events: none !important;
    transform: rotate(180deg) !important;
  `);
  
  //console.log(`🎬 動画配置詳細: 統一位置システム使用 サイズ=${videoWidth.toFixed(1)}x${videoHeight.toFixed(1)}`);
  //console.log(`🎬 キャンバス相対位置: (${videoDrawXRelativeToCanvas.toFixed(1)}, 150) キャンバス位置(${canvasRect.left.toFixed(1)}, ${canvasRect.top.toFixed(1)})`);
  //console.log(`🎯 動画中心座標: (${(videoAbsoluteX + videoWidth/2).toFixed(1)}, ${(videoAbsoluteY + videoHeight/2).toFixed(1)})`);
  
  // 動画サイズ情報を保存（PNGを動画と同じ位置に配置するため）
  window.preparedVideoSize = {
    width: videoWidth,
    height: videoHeight,
    absoluteX: videoAbsoluteX,
    absoluteY: videoAbsoluteY
  };
  //console.log('🎬 動画サイズ情報を保存:');
  //console.log(`  サイズ: ${videoWidth.toFixed(1)}x${videoHeight.toFixed(1)}`);
  //console.log(`  画面位置: (${videoAbsoluteX.toFixed(1)}, ${videoAbsoluteY.toFixed(1)})`);
  //console.log('🎬 PNG配置時にこのサイズを使用予定');
  
  // 動画の中心Y座標（ボール位置用）
  const staticBgCenterY = canvas.height / 2;
  
  //console.log(`🎬 動画配置: PNG背景画像と完全同位置、left=${videoAbsoluteX}px, top=${videoAbsoluteY}px`);
  
  // MP4要素と完全に同じ位置計算
  //console.log(`📍 MP4要素配置: top: ${staticBgCenterY}px, left: 50%, transform: translateX(-50%) translateY(-50%)`);
  //console.log(`🔴 MP4: 赤枠追加 - サイズ: ${Math.round(videoWidth)}x${Math.round(videoHeight)}px`);
  
  
  
  // 最初のフレームで停止
  videoBackgroundElement.muted = true;
  
  // メタデータ読み込み後に最初のフレームに移動
  videoBackgroundElement.addEventListener('loadedmetadata', () => {
    videoBackgroundElement.currentTime = 0;
    videoBackgroundElement.pause(); // 確実に停止
  });
  
  // 動画をキャンバスのコンテナに追加（back1は後で追加）
  const container = document.getElementById('container');
  container.appendChild(videoBackgroundElement); // MP4のみ先に追加
  
  
  // キャンバスを半透明にして動画が透けて見えるようにする
  canvas.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  canvas.style.mixBlendMode = 'normal';
  
  // キャンバスコンテキストの合成モードを確実に設定
  const ctx = canvas.getContext('2d');  
  ctx.globalCompositeOperation = 'source-over';
  
  isVideoBackgroundActive = true;
  //console.log('🎨 受信側キャンバス透明化完了 - 描画表示準備OK');
  
  // 既存の描画を再描画して表示を確実にする
  // 再描画処理は削除済み;
  
  // 動画配置後に扉演出：既存の扉があれば開く、なければ作成
  setTimeout(() => {
    const existingLeftDoor = document.getElementById('leftDoor');
    const existingRightDoor = document.getElementById('rightDoor');
    
    if (existingLeftDoor && existingRightDoor) {
      // 扉が既に存在する場合は開く
      //console.log('🚪 既存の扉を開く');
      openDoorForVideo();
    } else {
      // 扉が存在しない場合は作成
      //console.log('🚪 新しい扉を作成');
      createDoorForVideo();
    }
  }, 100); // 動画配置後に扉を表示
  
  //console.log(`🎬 動画背景準備完了 - ${UNIFIED_SETTINGS.canvasScale}倍サイズで表示、扉で覆う`);
}

function playVideoBackground() {
  if (videoBackgroundElement) {
    // MP4中央座標を再出力（動画再生開始時）
    const mp4CenterX = canvas.width / 2;
    const mp4Height = parseInt(videoBackgroundElement.style.height) || 237; // スタイルから取得
    const mp4CenterY = 150 + mp4Height / 2;
    //console.log(`📍 MP4再生開始時の中央座標: (${mp4CenterX.toFixed(1)}, ${mp4CenterY.toFixed(1)}) - 高さ: ${mp4Height}px`);
    
    // 扉を開く演出は実行
    openDoorForVideo();
    
    // 扉開く演出開始から4秒後に動画再生開始
    setTimeout(() => {
      // 動画終了時のイベントリスナーを追加 - endVideoBackground関数に処理を委譲
      videoBackgroundElement.addEventListener('ended', () => {
        endVideoBackground();
      });
      
      // 動画再生開始
      videoBackgroundElement.play().catch(e => {
        //console.error('❌ 動画再生エラー:', e);
      });
      
      // 動画残り時間のログ表示のみ
      videoBackgroundElement.addEventListener('timeupdate', () => {
        if (videoBackgroundElement.duration && videoBackgroundElement.currentTime) {
          const remainingTime = videoBackgroundElement.duration - videoBackgroundElement.currentTime;
          //console.log(`⏰ 動画残り時間: ${remainingTime.toFixed(2)}秒`);
        }
      });
    }, 4000); // 4秒後に再生開始
  }
}


function endVideoBackground() {
  if (videoBackgroundElement) {
    //console.log('🎬 動画背景終了 - 最終フレームで停止');
    
    // 最終フレームに移動して停止
    if (videoBackgroundElement.duration) {
      videoBackgroundElement.currentTime = videoBackgroundElement.duration - 0.1;
    }
    videoBackgroundElement.pause();
    
    // 180度回転アニメーションを追加（位置固定で回転のみ）
    videoBackgroundElement.style.transition = 'transform 1s ease-in-out';
    videoBackgroundElement.style.transform = 'rotate(180deg)';
    
    //console.log('🎬 動画終了 - 180度回転アニメーション開始');
    
    // 回転アニメーション完了後の処理
    setTimeout(() => {
      //console.log('🎬 180度回転完了 - back6.png表示開始');
      
      // 1. まずback6.png背景画像を表示
      const img = new Image();
      img.src = './back6.png';
      img.onload = () => {
        //console.log('🖼️ 回転後：back6.png画像読み込み完了、表示開始');
        // 背景画像設定処理は削除済み
        lastBackgroundSrc = './back6.png';
        
        // 背景画像サイズに合わせて描画エリアサイズを更新
        updateDrawingAreaToBackgroundSize();
        
        // 動画要素の上にPNG要素を重ねて表示する方式
        if (window.preparedVideoSize && videoBackgroundElement) {
          // PNG画像要素を作成して動画と同じ位置に配置
          createPngOverlay();
          
          // PNG要素で表示するため、キャンバス描画は無効化
          // 背景画像設定処理は削除済み
          lastBackgroundSrc = null;
          //console.log('🖼️ PNG要素を動画の上に重ねて配置（キャンバス描画無効化）');
        } else {
          //console.log('⚠️ 動画要素がない、キャンバス描画で表示');
        }
        
        // CSS背景を削除してcanvas描画に統一
        // canvas表示設定処理は削除済み
        
        // 背景画像を描画（180度回転状態を維持）
        isCanvasRotated = true; // 180度回転状態フラグを設定
        
        // キャンバスもCSS transformで180度回転状態に設定
        canvas.style.transition = 'none';
        canvas.style.transform = 'translateX(-50%) rotate(180deg)';
        //console.log('🔄 キャンバスをCSS transformで180度回転状態に設定');
        
        // 再描画処理は削除済み;
        
        // back6.pngの中央座標を出力（実際の描画位置から計算）
        //console.log(`📍 BACK6.PNG中央座標計算開始`);
        // 再描画処理は削除済み; // まず再描画して最新の状態にする
        
        // 遅延してボールを追加（redrawCanvasで実際の描画位置が確定してから）
        setTimeout(() => {
          // nullのnullチェック
          if (!null) {
            //console.warn('⚠️ nullがnullのため、背景画像座標計算をスキップ');
            return;
          }
          
          // redrawCanvas内で使用される実際の座標を取得
          const maxWidth = canvas.width * UNIFIED_SETTINGS.canvasScale;
          const maxHeight = canvas.height * UNIFIED_SETTINGS.canvasScale;
          // 背景画像のアスペクト比計算は削除済み
          let actualBgWidth, actualBgHeight;
          
          if (imgAspect > maxWidth / maxHeight) {
            actualBgWidth = maxWidth;
            actualBgHeight = maxWidth / imgAspect;
          } else {
            actualBgHeight = maxHeight;
            actualBgWidth = maxHeight * imgAspect;
          }
          
          // redrawCanvas関数と同じ描画位置計算（180度回転考慮）
          const drawX = canvas.width / 2 - actualBgWidth / 2;
          const drawY = 150;
          const actualCenterX = drawX + actualBgWidth / 2;
          const actualCenterY = drawY + actualBgHeight / 2;
          
          //console.log(`📍 BACK6.PNG実際の中央座標: (${actualCenterX.toFixed(1)}, ${actualCenterY.toFixed(1)})`);
          //console.log(`📍 描画位置: (${drawX.toFixed(1)}, ${drawY.toFixed(1)}) サイズ: ${actualBgWidth.toFixed(1)}x${actualBgHeight.toFixed(1)}`);
          
          // キャンバスの実際の位置を取得
          const canvasRect = canvas.getBoundingClientRect();
          const pageOffsetX = canvasRect.left;
          const pageOffsetY = canvasRect.top;
          
          //console.log(`📍 キャンバス位置: (${pageOffsetX.toFixed(1)}, ${pageOffsetY.toFixed(1)})`);
          
        }, 100); // 100ms遅延
        
        //console.log('🖼️ 回転後：back6.png表示完了 - 180度回転状態を維持');
        
        // 2. 背景画像表示後にmp4を非表示（削除しない）
        setTimeout(() => {
          videoBackgroundElement.style.display = 'none';
          //console.log('🎬 back6.png表示後：mp4を非表示');
          
          // 送信側に背景4自動選択を通知（無効化：静止画を保持するため）
          // socket.send(JSON.stringify({
          //   type: "autoSelectBackground",
          //   background: "back6"
          // }));
          //console.log('📤 送信側に背景4自動選択を通知（無効化：静止画保持のため）');
          //console.log('🎬 動画演出完了 - back6.png表示で停止（送信ボタン待機中）');
        }, 200); // 背景画像表示後200ms待機してmp4削除
      };
      
      img.onerror = (error) => {
        //console.error('❌ 回転後：back6.png画像読み込みエラー', error);
        // エラーでもmp4は削除
        setTimeout(() => {
          videoBackgroundElement.style.display = 'none';
          //console.log('🎬 エラー時：mp4を削除');
        }, 200);
      };
    }, 1000); // 1秒間の回転アニメーション
  }
}

function hideVideoBackground() {
  if (videoBackgroundElement) {
    //console.log('🎬 動画背景を非表示にする');
    
    // 動画を停止
    if (videoBackgroundElement.tagName === 'VIDEO') {
      videoBackgroundElement.pause();
      videoBackgroundElement.src = '';
    }
    
    // 動画要素を削除
    const container = document.getElementById('container');
    if (container.contains(videoBackgroundElement)) {
      container.removeChild(videoBackgroundElement);
    }
    
    // 扉要素も削除
    const leftDoor = document.getElementById('videoDoorLeft');
    const rightDoor = document.getElementById('videoDoorRight');
    if (leftDoor) leftDoor.remove();
    if (rightDoor) rightDoor.remove();
    
    // 動画背景状態をクリア
    videoBackgroundElement = null;
    isVideoBackgroundActive = false;
    
    // キャンバスを通常状態に戻す
    canvas.style.backgroundColor = '#f0f0f0';
    canvas.style.mixBlendMode = 'normal';
    
    // キャンバスをクリアして再描画
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 再描画処理は削除済み;
    
    //console.log('🎬 動画背景完全終了 - 通常モードに戻る');
  }
}

// PNG要素を動画と同じ位置に作成
function createPngOverlay() {
  // 既存のPNG要素を削除
  const existingPng = document.getElementById('pngOverlay');
  if (existingPng) {
    existingPng.remove();
  }
  
  // PNG画像要素を作成
  const pngElement = document.createElement('img');
  pngElement.id = 'pngOverlay';
  pngElement.src = './back6.png';
  
  // 動画と同じサイズで計算
  const canvas = document.getElementById('drawCanvas');
  const maxWidth = canvas.width * UNIFIED_SETTINGS.canvasScale;
  const maxHeight = canvas.height * UNIFIED_SETTINGS.canvasScale;
  const videoWidth = Math.min(maxWidth, maxHeight * (16/9));
  const videoHeight = videoWidth / (16/9);
  
  // 統一位置システム使用（動画と完全同一位置）
  const unifiedStyle = calculateUnifiedPosition(pngElement, videoWidth, videoHeight);
  pngElement.setAttribute('style', unifiedStyle + `
    object-fit: contain;
    transform: rotate(180deg);
    z-index: 0;
  `);
  
  //console.log('🖼️ PNGオーバーレイ作成：動画と同一位置で配置');
  
  // bodyに追加
  document.body.appendChild(pngElement);
  
  //console.log('🖼️ PNG要素作成完了:');
  //console.log(`  位置・サイズ: 動画と同じ`);
  //console.log(`  z-index: 0 (動画は-1)`);
  //console.log(`  180度回転適用`);
}

function updateVideoBackgroundSize() {
  if (videoBackgroundElement) {
    // currentVideoSizeに基づいてスケールを調整（デフォルトは0.21、currentVideoSizeの比率で調整）
    const baseScale = 0.21;
    const newScale = baseScale * (currentVideoSize / 100);
    
    //console.log(`🎬 動画背景サイズ更新: ${currentVideoSize}% (scale: ${newScale})`);
    
    const baseWidth = 1470;
    const baseHeight = 1040;
    const newVideoWidth = baseWidth * newScale;
    const newVideoHeight = baseHeight * newScale;
    
    videoBackgroundElement.style.width = `${newVideoWidth}px`;
    videoBackgroundElement.style.height = `${newVideoHeight}px`;
    videoBackgroundElement.style.transform = 'rotate(180deg)';
    
    //console.log(`🎬 受信側動画180度回転 + サイズ更新: ${newVideoWidth}x${newVideoHeight}px`);
  }
}

function clearVideoBackground() {
  if (videoBackgroundElement) {
    //console.log('🎬 動画背景をクリア');
    
    // 動画要素の場合は停止してから削除
    if (videoBackgroundElement.tagName === 'VIDEO') {
      videoBackgroundElement.pause();
      videoBackgroundElement.src = '';
    }
    
    // DOM から削除
    if (videoBackgroundElement.parentNode) {
      videoBackgroundElement.parentNode.removeChild(videoBackgroundElement);
    }
    
    videoBackgroundElement = null;
    isVideoBackgroundActive = false;
    
    // キャンバスの背景を元に戻す
    canvas.style.backgroundColor = '#f0f0f0';
    canvas.style.mixBlendMode = 'normal';
    
    //console.log('🎬 動画背景要素を完全に削除');
  }
  
  // PNG要素も削除
  const existingPng = document.getElementById('pngOverlay');
  if (existingPng) {
    existingPng.remove();
    //console.log('🖼️ PNG要素も削除');
  }
}

// 🚪 動画用の扉作成（閉じた状態）
function createDoorForVideo() {
  //console.log('🚪 動画用の扉を作成（閉じた状態）');
  
  // 左の扉（白い立体的なデザイン）
  const leftDoor = document.createElement('div');
  leftDoor.id = 'videoDoorLeft';
  leftDoor.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 50vw;
    height: 100vh;
    background: linear-gradient(135deg, #ffffff 0%, #f8f8f8 25%, #f0f0f0 50%, #f8f8f8 75%, #ffffff 100%);
    z-index: 10002;
    transform-origin: left center;
    transform: rotateY(0deg);
    transition: transform 3s ease-in-out;
    border-right: 3px solid #e0e0e0;
    box-shadow: 
      inset -15px 0 25px rgba(0,0,0,0.1),
      inset 0 0 30px rgba(255,255,255,0.5),
      5px 0 20px rgba(0,0,0,0.15),
      0 0 30px rgba(0,0,0,0.1);
  `;
  document.body.appendChild(leftDoor);
  
  // 右の扉（白い立体的なデザイン）
  const rightDoor = document.createElement('div');
  rightDoor.id = 'videoDoorRight';
  rightDoor.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 50vw;
    height: 100vh;
    background: linear-gradient(-135deg, #ffffff 0%, #f8f8f8 25%, #f0f0f0 50%, #f8f8f8 75%, #ffffff 100%);
    z-index: 10002;
    transform-origin: right center;
    transform: rotateY(0deg);
    transition: transform 3s ease-in-out;
    border-left: 3px solid #e0e0e0;
    box-shadow: 
      inset 15px 0 25px rgba(0,0,0,0.1),
      inset 0 0 30px rgba(255,255,255,0.5),
      -5px 0 20px rgba(0,0,0,0.15),
      0 0 30px rgba(0,0,0,0.1);
  `;
  document.body.appendChild(rightDoor);
  
  //console.log('🚪 動画用の白い立体的な扉作成完了');
}

// 🚪 動画用の扉を開く
function openDoorForVideo() {
  //console.log('🚪 動画用の扉を開く');
  
  const leftDoor = document.getElementById('videoDoorLeft');
  const rightDoor = document.getElementById('videoDoorRight');
  
  if (leftDoor && rightDoor) {
    // 扉を開く（中央から外側に）
    leftDoor.style.transform = 'rotateY(90deg)';
    rightDoor.style.transform = 'rotateY(-90deg)';
    
    // 3秒後に扉を削除
    setTimeout(() => {
      if (leftDoor.parentNode) leftDoor.parentNode.removeChild(leftDoor);
      if (rightDoor.parentNode) rightDoor.parentNode.removeChild(rightDoor);
      //console.log('🚪 動画用の扉を削除');
    }, 3000);
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
    //console.log(`A4モード: キャンバスサイズを1.6倍に拡大`);
  }
  
  canvas.width = Math.floor(portraitWidth * widthMultiplier);
  canvas.height = Math.floor(portraitHeight * heightMultiplier);
  
  //console.log(`キャンバスを縦長に変更: ${canvas.width} x ${canvas.height}`);
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
    //console.log(`A4モード: キャンバスサイズを1.3倍に拡大`);
  }
  
  canvas.width = Math.floor(normalWidth * widthMultiplier);
  canvas.height = Math.floor(normalHeight * heightMultiplier);
  
  //console.log(`キャンバスを通常サイズに変更: ${canvas.width} x ${canvas.height}`);
}

// 🔸 キャンバスサイズ更新関数を追加
function updateCanvasSize() {
  // 現在の背景に応じてサイズを再計算
  if (null && lastBackgroundSrc && lastBackgroundSrc.includes('back2')) {
    setCanvasToPortraitSize();
  } else {
    resetCanvasToNormalSize();
  }
  
  // 🔸 用紙サイズに応じて受信側キャンバスサイズを調整
  setReceiverCanvasSize();
  
  // キャンバスを再描画
  // 再描画処理は削除済み;
}

function removeRedrawCanvas(withBackground = true) {
  // 動画背景時でも確実に描画が見えるよう設定
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  //console.log('🎨 redrawCanvas実行開始');
  //console.log(`  キャンバスサイズ: ${canvas.width} x ${canvas.height}`);
  //console.log(`  描画エリアサイズ: ${drawingAreaSize.width} x ${drawingAreaSize.height}`);
  //console.log(`  描画エリアオフセット: (${drawingAreaOffset.x}, ${drawingAreaOffset.y})`);
  
  // キャンバスのCSS表示状況も確認
  const canvasRect = canvas.getBoundingClientRect();
  const canvasStyle = window.getComputedStyle(canvas);
  //console.log(`  キャンバス表示サイズ: ${canvasRect.width} x ${canvasRect.height}`);
  //console.log(`  キャンバス位置: (${canvasRect.left}, ${canvasRect.top})`);
  //console.log(`  キャンバスmargin: ${canvasStyle.margin}`);
  
  // 🔸 背景画像をシンプルに中央描画（アスペクト比保持） - 描画エリア計算の前に実行
  // WriterID別の背景画像管理：現在アクティブなWriterの背景を使用
  const currentBackgroundImage = activeBackgroundWriterId && writerBackgroundImages[activeBackgroundWriterId] 
    ? writerBackgroundImages[activeBackgroundWriterId] 
    : null;
  
  if (withBackground && currentBackgroundImage) {
    //console.log('🖼️ 背景画像描画開始（シンプル版）');
    
    // 元画像のアスペクト比を保持したサイズ計算（書き手側のdevtoolスケール値を使用）
    const maxWidth = canvas.width * UNIFIED_SETTINGS.canvasScale;  // 書き手側のスケール値を使用
    const maxHeight = canvas.height * UNIFIED_SETTINGS.canvasScale; // 書き手側のスケール値を使用
    
    //console.log(`🔧 背景画像サイズ計算: スケール=${UNIFIED_SETTINGS.canvasScale}x, max=${maxWidth.toFixed(1)}x${maxHeight.toFixed(1)}`);
    
    // アスペクト比を保持してサイズを計算
    const imgAspect = currentBackgroundImage.width / currentBackgroundImage.height;
    
    let bgWidth, bgHeight;
    if (imgAspect > maxWidth / maxHeight) {
      // 横長：幅を基準に
      bgWidth = maxWidth;
      bgHeight = maxWidth / imgAspect;
    } else {
      // 縦長：高さを基準に
      bgHeight = maxHeight;
      bgWidth = maxHeight * imgAspect;
    }
    
    // 背景画像描画：動的背景の場合はスキップ（CSS wrapperを使用）
    let drawX, drawY;
    
    if (false) {
      // 🔒 動的背景：Canvas描画をスキップしてCSS wrapperのみ使用
      console.log('🎯 動的背景検出: Canvas背景描画をスキップ（CSS wrapperを使用）');
      // CSS wrapperの位置に合わせて仮想座標を設定（後続の位置計算用）
      drawX = canvas.width / 2 - bgWidth / 2; // 水平中央
      drawY = 150; // 上から150px（固定）
    } else {
      // 🔒 通常背景：Canvas上に描画
      // 全ての背景画像を統一した位置計算で中央揃え  
      drawX = canvas.width / 2 - bgWidth / 2;
      drawY = canvas.height / 2 - bgHeight / 2;
      
      // 背景画像を描画
      ctx.drawImage(currentBackgroundImage, drawX, drawY, bgWidth, bgHeight);
      
      // 🔍 デバッグ: 背景画像の境界線を表示
      ctx.save();
      ctx.strokeStyle = 'lime';
      ctx.lineWidth = 3;
      ctx.strokeRect(drawX, drawY, bgWidth, bgHeight);
      ctx.fillStyle = 'lime';
      ctx.font = '16px Arial';
      ctx.fillText(`背景画像 ${bgWidth.toFixed(0)}x${bgHeight.toFixed(0)}`, drawX + 10, drawY + 25);
      ctx.restore();
    }
    
    // 🎯 ズレ確認ログ: 背景画像の位置・サイズ
    console.log(`🟢 背景画像: 位置(${drawX.toFixed(1)}, ${drawY.toFixed(1)}) サイズ${Math.round(bgWidth)}x${Math.round(bgHeight)}`);
    
    // 背景画像の位置・サイズを記録（描画エリアとの比較用）
    window.lastBgX = drawX;
    window.lastBgY = drawY;
    window.lastBgWidth = Math.round(bgWidth);
    window.lastBgHeight = Math.round(bgHeight);
    
    // 📐 描画エリアサイズの処理（動的背景と通常背景で異なる）
    if (false) {
      // 🔒 動的背景の場合：DevPanelで設定された描画エリアサイズを維持
      console.log(`📐 動的背景: 描画エリアサイズを維持 ${drawingAreaSize.width}x${drawingAreaSize.height}`);
      // nullBasedDrawingAreaSizeは無効化
      window.nullBasedDrawingAreaSize = { 
        width: drawingAreaSize.width, 
        height: drawingAreaSize.height,
        isActive: false // 動的背景では無効
      };
    } else {
      // 📐 通常背景の場合：描画エリアサイズを背景画像サイズに合わせる
      drawingAreaSize.width = Math.round(bgWidth);
      drawingAreaSize.height = Math.round(bgHeight);
      
      // 🔒 背景画像サイズ設定を強制適用（他の処理による上書きを防ぐ）
      window.nullBasedDrawingAreaSize = { 
        width: drawingAreaSize.width, 
        height: drawingAreaSize.height,
        isActive: true 
      };
    }
    
    // 📍 描画エリア位置を背景画像位置に合わせる
    if (false) {
      // 🔒 動的背景の場合：描画エリアを青色エリア位置に固定
      // 複雑な計算を避けて、ログに表示された青色エリアの理想的な位置を直接使用
      drawingAreaOffset.x = 0; // 水平中央
      drawingAreaOffset.y = -canvas.height / 2 + 150; // 上から150px
      
      console.log(`🎯 動的背景検出: 描画エリアを青色エリア理想位置に固定 → offset(${drawingAreaOffset.x}, ${drawingAreaOffset.y})`);
    } else {
      // 🔒 通常背景の場合：キャンバス座標ベースの位置計算
      // 背景画像の実際の位置（左上角）を基準に描画エリアを配置
      // 描画エリアの左上角を背景画像の左上角に一致させる
      const bgLeft = drawX;
      const bgTop = drawY;
      
      // 描画エリアの中心位置を計算: エリア中心 = 左上 + サイズ/2
      const targetAreaCenterX = bgLeft + drawingAreaSize.width / 2;
      const targetAreaCenterY = bgTop + drawingAreaSize.height / 2;
      
      // キャンバス中央からのoffsetを計算 + 130px下に移動
      // areaCenterX = canvas.width/2 + drawingAreaOffset.x = targetAreaCenterX
      // よって: drawingAreaOffset.x = targetAreaCenterX - canvas.width/2
      drawingAreaOffset.x = Math.round(targetAreaCenterX - canvas.width / 2);
      drawingAreaOffset.y = Math.round(targetAreaCenterY - canvas.height / 2 + 130); // 130px下に移動
    }
    
    // デバッグパネルの値も更新（130px下に移動済み）
    const centerXInput = document.getElementById('centerX');
    const centerYInput = document.getElementById('centerY');
    const areaWidthInput = document.getElementById('areaWidth');
    const areaHeightInput = document.getElementById('areaHeight');
    if (centerXInput) centerXInput.value = drawingAreaOffset.x;
    if (centerYInput) centerYInput.value = drawingAreaOffset.y;
    if (areaWidthInput) areaWidthInput.value = drawingAreaSize.width;
    if (areaHeightInput) areaHeightInput.value = drawingAreaSize.height;
    
    //console.log('🖼️ 背景画像描画完了');
  }
  
  // 🔸 描画エリアの枠表示（デバッグ用に常時表示）
  if (true) { // showDrawingAreaFrame
    ctx.save();
    ctx.fillStyle = "rgba(255, 0, 0, 0.05)"; // 非常に薄い赤色
    
    // キャンバス中央から描画エリアの位置を計算
    const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
    const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
    const areaLeft = areaCenterX - drawingAreaSize.width / 2;
    const areaTop = areaCenterY - drawingAreaSize.height / 2;
    
    ctx.fillRect(areaLeft, areaTop, drawingAreaSize.width, drawingAreaSize.height);
    
    // 描画エリアの境界線を描画（青色で明確に表示）
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 3;
    ctx.strokeRect(areaLeft, areaTop, drawingAreaSize.width, drawingAreaSize.height);
    
    // 描画エリア情報をテキスト表示
    ctx.fillStyle = "blue";
    ctx.font = "16px Arial";
    ctx.fillText(`描画エリア ${drawingAreaSize.width}x${drawingAreaSize.height}`, areaLeft + 10, areaTop + 50);
    
    // 🎯 ズレ確認ログ: 描画エリアの位置・サイズ
    console.log(`🔵 描画エリア: 位置(${areaLeft.toFixed(1)}, ${areaTop.toFixed(1)}) サイズ${drawingAreaSize.width}x${drawingAreaSize.height}`);
    
    // 🎯 ズレ確認: 背景画像と描画エリアの差分
    const positionDiffX = areaLeft - (window.lastBgX || 0);
    const positionDiffY = areaTop - (window.lastBgY || 0);
    const sizeDiffW = drawingAreaSize.width - (window.lastBgWidth || 0);
    const sizeDiffH = drawingAreaSize.height - (window.lastBgHeight || 0);
    
    if (Math.abs(positionDiffX) > 1 || Math.abs(positionDiffY) > 1 || Math.abs(sizeDiffW) > 1 || Math.abs(sizeDiffH) > 1) {
      console.log(`❌ ズレ検出: 位置差(${positionDiffX.toFixed(1)}, ${positionDiffY.toFixed(1)}) サイズ差${sizeDiffW}x${sizeDiffH}`);
    } else {
      console.log(`✅ 位置・サイズ一致: 差分は許容範囲内`);
    }
    
    ctx.restore();
  }
  
  // 🔸 背景画像をシンプルに中央描画（アスペクト比保持）
  if (withBackground && currentBackgroundImage) {
    //console.log('🖼️ 背景画像描画開始（シンプル版）');
    
    // 元画像のアスペクト比を保持したサイズ計算（書き手側のdevtoolスケール値を使用）
    const maxWidth = canvas.width * UNIFIED_SETTINGS.canvasScale;  // 書き手側のスケール値を使用
    const maxHeight = canvas.height * UNIFIED_SETTINGS.canvasScale; // 書き手側のスケール値を使用
    
    //console.log(`🔧 背景画像サイズ計算: スケール=${UNIFIED_SETTINGS.canvasScale}x, max=${maxWidth.toFixed(1)}x${maxHeight.toFixed(1)}`);
    
    // アスペクト比を保持してサイズを計算
    const imgAspect = currentBackgroundImage.width / currentBackgroundImage.height;
    let bgWidth, bgHeight;
    
    if (imgAspect > maxWidth / maxHeight) {
      // 横長画像：幅を基準に
      bgWidth = maxWidth;
      bgHeight = maxWidth / imgAspect;
    } else {
      // 縦長画像：高さを基準に
      bgHeight = maxHeight;
      bgWidth = maxHeight * imgAspect;
    }
    
    //console.log(`📍 背景画像描画: ${bgWidth.toFixed(1)}x${bgHeight.toFixed(1)}`);
    //console.log(`  元画像サイズ: ${null.width}x${null.height}`);
    //console.log(`  アスペクト比: ${imgAspect.toFixed(3)}`);
    //console.log(`  現在のキャンバスサイズ: ${canvas.width}x${canvas.height}`);
    //console.log(`  背景画像ファイル: ${lastBackgroundSrc || 'unknown'}`);
    //console.log(`  max制限: ${maxWidth.toFixed(1)}x${maxHeight.toFixed(1)} (キャンバス×${UNIFIED_SETTINGS.canvasScale})`);
    
    // 背景画像描画の準備
    ctx.save();
    
    // 全ての背景画像を180度回転で表示
    let drawX, drawY;
    
    // 全ての背景画像を統一した位置計算で中央揃え  
    drawX = canvas.width / 2 - bgWidth / 2;
    drawY = canvas.height / 2 - bgHeight / 2;
    
    // 全ての背景画像に180度回転を適用
    if (true) {
      //console.log(`🔍 back6.png配置前の状態:`);
      //console.log(`  計算済みサイズ: ${bgWidth.toFixed(1)}x${bgHeight.toFixed(1)}`);
      //console.log(`  window.actualVideoSize存在: ${!!window.actualVideoSize}`);
      if (window.actualVideoSize) {
        //console.log(`  動画サイズ情報: ${window.actualVideoSize.width.toFixed(1)}x${window.actualVideoSize.height.toFixed(1)}`);
      }
      
      // back6.pngを動画と同じサイズ・同じ位置で配置
      if (window.actualVideoSize && window.actualVideoSize.width > 0 && window.actualVideoSize.height > 0) {
        const oldBgWidth = bgWidth;
        const oldBgHeight = bgHeight;
        const oldDrawX = drawX;
        const oldDrawY = drawY;
        
        bgWidth = window.actualVideoSize.width;
        bgHeight = window.actualVideoSize.height;
        
        // 動画の画面絶対座標をキャンバス座標系に変換
        const canvasRect = canvas.getBoundingClientRect();
        const videoAbsoluteX = window.actualVideoSize.absoluteX;
        const videoAbsoluteY = window.actualVideoSize.absoluteY;
        
        // キャンバス座標系での動画位置を計算
        drawX = videoAbsoluteX - canvasRect.left;
        drawY = videoAbsoluteY - canvasRect.top;
        
        //console.log(`🔄 back6.png: 動画と同じ位置・サイズに変更`);
        //console.log(`  サイズ変更: ${oldBgWidth.toFixed(1)}x${oldBgHeight.toFixed(1)} → ${bgWidth.toFixed(1)}x${bgHeight.toFixed(1)}`);
        //console.log(`  位置変更: (${oldDrawX.toFixed(1)}, ${oldDrawY.toFixed(1)}) → (${drawX.toFixed(1)}, ${drawY.toFixed(1)})`);
        //console.log(`  動画画面位置: (${videoAbsoluteX.toFixed(1)}, ${videoAbsoluteY.toFixed(1)})`);
        //console.log(`  キャンバス画面位置: (${canvasRect.left.toFixed(1)}, ${canvasRect.top.toFixed(1)})`);
      } else {
        //console.log(`🔄 back6.png: 標準ルール適用（動画サイズ情報なし）`);
        //console.log(`  使用サイズ: ${bgWidth.toFixed(1)}x${bgHeight.toFixed(1)}`);
      }
      
      // 回転: 画像の中心を基準に回転
      const imageCenterX = drawX + bgWidth / 2;
      const imageCenterY = drawY + bgHeight / 2;
      
      const rotationAngle = window.tempRotationAngle ? (window.tempRotationAngle * Math.PI / 180) : Math.PI;
      
      ctx.translate(imageCenterX, imageCenterY);
      ctx.rotate(rotationAngle);
      ctx.translate(-imageCenterX, -imageCenterY);
      
      if (window.tempRotationAngle) {
        //console.log(`🔄 back6.png: アニメーション回転 ${window.tempRotationAngle.toFixed(1)}度`);
      } else {
        //console.log(`🔄 back6.png: 中央揃え、上端150px、180度回転`);
      }
      //console.log(`🔄 画像中心: (${imageCenterX.toFixed(1)}, ${imageCenterY.toFixed(1)})`);
    } else {
      //console.log(`📍 通常背景: 中央揃え、上端150px基準`);
    }
    //console.log(`🎯 背景画像中央座標: (${(drawX + bgWidth/2).toFixed(1)}, ${(drawY + bgHeight/2).toFixed(1)})`);
    
    // 背景画像を描画（動的背景の場合はスキップ）
    if (!false) {
      ctx.drawImage(currentBackgroundImage, drawX, drawY, bgWidth, bgHeight);
      
      // 🔍 デバッグ: 背景画像の境界線を表示
      ctx.save();
      ctx.strokeStyle = 'lime';
      ctx.lineWidth = 3;
      ctx.strokeRect(drawX, drawY, bgWidth, bgHeight);
      ctx.fillStyle = 'lime';
      ctx.font = '16px Arial';
      ctx.fillText(`背景画像 ${bgWidth.toFixed(0)}x${bgHeight.toFixed(0)}`, drawX + 10, drawY + 25);
      ctx.restore();
    } else {
      console.log('🎯 動的背景検出: Canvas背景描画をスキップ（第2箇所）');
    }
    
    // 🎯 ズレ確認ログ: 背景画像の位置・サイズ
    console.log(`🟢 背景画像: 位置(${drawX.toFixed(1)}, ${drawY.toFixed(1)}) サイズ${Math.round(bgWidth)}x${Math.round(bgHeight)}`);
    
    // 背景画像の位置・サイズを記録（描画エリアとの比較用）
    window.lastBgX = drawX;
    window.lastBgY = drawY;
    window.lastBgWidth = Math.round(bgWidth);
    window.lastBgHeight = Math.round(bgHeight);
    
    
    // 📐 描画エリアサイズの処理（動的背景と通常背景で異なる）
    if (false) {
      // 🔒 動的背景の場合：DevPanelで設定された描画エリアサイズを維持
      console.log(`📐 動的背景: 描画エリアサイズを維持 ${drawingAreaSize.width}x${drawingAreaSize.height}`);
      // nullBasedDrawingAreaSizeは無効化
      window.nullBasedDrawingAreaSize = { 
        width: drawingAreaSize.width, 
        height: drawingAreaSize.height,
        isActive: false // 動的背景では無効
      };
    } else {
      // 📐 通常背景の場合：描画エリアサイズを背景画像サイズに合わせる
      drawingAreaSize.width = Math.round(bgWidth);
      drawingAreaSize.height = Math.round(bgHeight);
      
      // 🔒 背景画像サイズ設定を強制適用（他の処理による上書きを防ぐ）
      window.nullBasedDrawingAreaSize = { 
        width: drawingAreaSize.width, 
        height: drawingAreaSize.height,
        isActive: true 
      };
    }
    
    
    // 📍 描画エリア位置を背景画像位置に合わせる
    if (false) {
      // 🔒 動的背景の場合：描画エリアを青色エリア位置に固定
      // 複雑な計算を避けて、ログに表示された青色エリアの理想的な位置を直接使用
      drawingAreaOffset.x = 0; // 水平中央
      drawingAreaOffset.y = -canvas.height / 2 + 150; // 上から150px
      
      console.log(`🎯 動的背景検出: 描画エリアを青色エリア理想位置に固定 → offset(${drawingAreaOffset.x}, ${drawingAreaOffset.y})`);
    } else {
      // 🔒 通常背景の場合：キャンバス座標ベースの位置計算
      // 背景画像の実際の位置（左上角）を基準に描画エリアを配置
      // 描画エリアの左上角を背景画像の左上角に一致させる
      const bgLeft = drawX;
      const bgTop = drawY;
      
      // 描画エリアの中心位置を計算: エリア中心 = 左上 + サイズ/2
      const targetAreaCenterX = bgLeft + drawingAreaSize.width / 2;
      const targetAreaCenterY = bgTop + drawingAreaSize.height / 2;
      
      // キャンバス中央からのoffsetを計算 + 130px下に移動
      // areaCenterX = canvas.width/2 + drawingAreaOffset.x = targetAreaCenterX
      // よって: drawingAreaOffset.x = targetAreaCenterX - canvas.width/2
      drawingAreaOffset.x = Math.round(targetAreaCenterX - canvas.width / 2);
      drawingAreaOffset.y = Math.round(targetAreaCenterY - canvas.height / 2 + 130); // 130px下に移動
    }
    
    // 検証用：背景画像の中心位置
    const bgCenterX = drawX + bgWidth / 2;
    const bgCenterY = drawY + bgHeight / 2;
    
    
    // デバッグパネルの値も更新（130px下に移動済み）
    const centerXInput = document.getElementById('centerX');
    const centerYInput = document.getElementById('centerY');
    const areaWidthInput = document.getElementById('areaWidth');
    const areaHeightInput = document.getElementById('areaHeight');
    if (centerXInput) centerXInput.value = drawingAreaOffset.x;
    if (centerYInput) centerYInput.value = drawingAreaOffset.y;
    if (areaWidthInput) areaWidthInput.value = drawingAreaSize.width;
    if (areaHeightInput) areaHeightInput.value = drawingAreaSize.height;
    
    ctx.restore();
    
    //console.log('🖼️ 背景画像描画完了');
  }
  
  // 🔸 筆跡描画（描画エリア調整を適用して180度回転）
  //console.log('✏️ 筆跡描画開始');
  //console.log(`  描画データ数: ${[].length}`);
  
  // 描画エリアの位置とサイズを計算
  const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
  const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
  const areaLeft = areaCenterX - drawingAreaSize.width / 2;
  const areaTop = areaCenterY - drawingAreaSize.height / 2;
  
  // WriterID別に独立して描画（線の混在を防ぐ）
  Object.keys(writerDrawingData).forEach(writerId => {
    if (writerDrawingData[writerId].length > 0) {
      drawWriterCommandsReceiver(writerDrawingData[writerId], writerId);
    }
  });
  
  // 旧方式（統合データ）もサポート（後方互換性のため）
  if ([].length > 0 && Object.keys({}).length === 0) {
    ctx.save();
    ctx.translate(areaCenterX, areaCenterY);
    ctx.rotate(Math.PI);
    ctx.translate(-areaCenterX, -areaCenterY);
    
    let lastWriterId = null;
    [].forEach(cmd => {
    if (cmd.type === "start") {
      ctx.beginPath();
      lastWriterId = cmd.writerId; // 現在のwriterIDを記録
      // 🔸 アスペクト比を保持した座標変換
      const coords = transformCoordinatesWithAspectRatio(cmd.x, cmd.y, senderCanvasSize, drawingAreaSize);
      let scaledX = coords.x;
      let scaledY = coords.y;
      
      // デバッグ削除
      
      ctx.moveTo(areaLeft + scaledX, areaTop + scaledY);
    } else if (cmd.type === "draw") {
      
      // writerIDが変わった場合は新しいパスを開始
      if (cmd.writerId !== lastWriterId) {
        ctx.beginPath();
        lastWriterId = cmd.writerId;
        // 新しいパスの場合、moveToから開始
        const coords = transformCoordinatesWithAspectRatio(cmd.x, cmd.y, senderCanvasSize, drawingAreaSize);
        ctx.moveTo(areaLeft + coords.x, areaTop + coords.y);
        return; // この点はmoveToのみで、strokeは行わない
      }
      
      // 🔸 アスペクト比を保持した座標変換
      const coords = transformCoordinatesWithAspectRatio(cmd.x, cmd.y, senderCanvasSize, drawingAreaSize);
      let scaledX = coords.x;
      let scaledY = coords.y;
      
      // ネオンの場合はセグメントごとに新しいパスを作成（送信側と同じ方式）
      if (cmd.color === 'neon' && typeof cmd.neonIndex === 'number') {
        // 前の位置から移動（前のdrawコマンドの位置を取得）
        const prevCmd = [][[].indexOf(cmd) - 1];
        if (prevCmd && (prevCmd.type === 'start' || prevCmd.type === 'draw')) {
          const prevCoords = transformCoordinatesWithAspectRatio(prevCmd.x, prevCmd.y, senderCanvasSize, drawingAreaSize);
          const prevScaledX = prevCoords.x;
          const prevScaledY = prevCoords.y;
          
          // redrawCanvas内では白い線で描画（タイマー処理なし）
          const thickness = (cmd.thickness || 4) * (drawingAreaSize.width / senderCanvasSize.width);
          
          ctx.beginPath();
          ctx.moveTo(areaLeft + prevScaledX, areaTop + prevScaledY);
          ctx.lineWidth = Math.max(1, thickness - 3);
          ctx.strokeStyle = '#ffffff';
          ctx.globalAlpha = 0.9;
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#ffffff';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
          ctx.stroke();
          
          // 設定をリセット
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1.0;
        } else {
          // startコマンドの場合は白い点を描画
          const thickness = (cmd.thickness || 4) * (drawingAreaSize.width / senderCanvasSize.width);
          ctx.beginPath();
          ctx.arc(areaLeft + scaledX, areaTop + scaledY, Math.max(1, thickness - 3) / 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.9;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      } else {
        // 通常の色の場合
        // 線の太さ（動画背景時の特殊処理は動画キャプチャ後は無効）
        const baseThickness = cmd.thickness || 4;
        const adjustedThickness = isVideoBackgroundActive ? baseThickness * 1.5 : baseThickness;
        ctx.lineWidth = adjustedThickness * (drawingAreaSize.width / senderCanvasSize.width);
        // white-red-borderの特別処理
        if (cmd.color === 'white-red-border') {
          // 白赤枠の受信側表示処理（3層グラデーション効果）
          const currentThickness = cmd.thickness || 4;
          const scaledThickness = currentThickness * (drawingAreaSize.width / senderCanvasSize.width);
          
          // 外側の薄い赤
          ctx.save();
          ctx.globalAlpha = 0.2;
          ctx.lineWidth = scaledThickness + 10;
          ctx.strokeStyle = '#ffccdd';
          ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
          ctx.stroke();
          ctx.restore();
          
          // 中間の赤
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = scaledThickness + 8;
          ctx.strokeStyle = '#ffaacc';
          ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
          ctx.stroke();
          ctx.restore();
          
          // 内側の濃い赤
          ctx.save();
          ctx.globalAlpha = 0.8;
          ctx.lineWidth = scaledThickness + 6;
          ctx.strokeStyle = '#ff88bb';
          ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
          ctx.stroke();
          ctx.restore();
          
          // 白い中心
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = Math.max(1, scaledThickness - 3);
          ctx.strokeStyle = '#ffffff';
          ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
          ctx.stroke();
          ctx.restore();
        } else {
          // 動画背景時の白色調整（動画キャプチャ後は通常の白に戻す）
          const whiteColor = isVideoBackgroundActive ? '#f0f0f0' : '#fff';
          ctx.strokeStyle = cmd.color === 'black' ? '#000' : 
                           (cmd.color === 'white' ? whiteColor : 
                           (cmd.color === 'red' ? '#ff0000' : 
                           (cmd.color === 'blue' ? '#0000ff' : 
                           (cmd.color === 'green' ? '#008000' : 
                           (cmd.color === 'pink' ? '#ff69b4' : (cmd.color || '#000'))))));
          ctx.shadowBlur = 0;
          ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
          ctx.stroke();
        }
      }
    }
    });
    
    ctx.restore();
  }
  
  // 完了したネオンパスのピンクの枠を描画
  completedNeonPaths.forEach(completedPath => {
    const neonPath = completedPath.path;
    if (neonPath && neonPath.length >= 1) {
      ctx.save();
      
      // 描画エリアの中心で180度回転を適用（筆跡描画と同じ）
      ctx.translate(areaCenterX, areaCenterY);
      ctx.rotate(Math.PI);
      ctx.translate(-areaCenterX, -areaCenterY);
      
      // 外側の薄いピンク（最も太い）
      ctx.beginPath();
      ctx.moveTo(areaLeft + neonPath[0].x, areaTop + neonPath[0].y);
      for (let i = 1; i < neonPath.length; i++) {
        ctx.lineTo(areaLeft + neonPath[i].x, areaTop + neonPath[i].y);
      }
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = neonPath[0].thickness * (drawingAreaSize.width / senderCanvasSize.width);
      ctx.strokeStyle = '#ff69b4';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      
      // 中間のピンク
      ctx.beginPath();
      ctx.moveTo(areaLeft + neonPath[0].x, areaTop + neonPath[0].y);
      for (let i = 1; i < neonPath.length; i++) {
        ctx.lineTo(areaLeft + neonPath[i].x, areaTop + neonPath[i].y);
      }
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = Math.max(1, neonPath[0].thickness * (drawingAreaSize.width / senderCanvasSize.width) - 2);
      ctx.strokeStyle = '#ff69b4';
      ctx.stroke();
      
      // 内側の濃いピンク（最も細い）
      ctx.beginPath();
      ctx.moveTo(areaLeft + neonPath[0].x, areaTop + neonPath[0].y);
      for (let i = 1; i < neonPath.length; i++) {
        ctx.lineTo(areaLeft + neonPath[i].x, areaTop + neonPath[i].y);
      }
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = Math.max(1, neonPath[0].thickness * (drawingAreaSize.width / senderCanvasSize.width) - 4);
      ctx.strokeStyle = '#ff1493';
      ctx.stroke();
      
      ctx.restore();
    }
  });
  
  //console.log('✏️ 筆跡描画完了');
  //console.log('🎨 redrawCanvas完了\n');
}

socket.onmessage = (event) => {
  console.log("🔔 受信側WebSocketメッセージ受信:", event.data);
  
  const handle = (raw) => {
    try {
      console.log("📝 解析前のrawデータ:", raw);
      const data = JSON.parse(raw);
      console.log("📊 受信側解析後のデータ:", data.type, data);
      handleMessage(data);
    } catch (e) {
      //console.error("❌ JSON parse error:", e, "Raw data:", raw);
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
  //console.log("////🎯 受信側handleMessage実行:", data.type);
  
  // ハートビート応答処理
  if (data.type === "pong") {
    console.log("💗 ハートビート応答受信");
    connectionHealthy = true;
    return;
  }
  
  // Writer ID要求の処理
  if (data.type === "requestWriterId") {
    console.log("📨 Writer ID要求を受信:", data.sessionId);
    console.log("📊 現在の管理状況:");
    console.log(`  既存セッション: ${Array.from(writerSessions.entries()).map(([w,s]) => `${w}:${s}`).join(', ') || 'なし'}`);
    console.log(`  接続中Writer: ${Array.from(connectedWriters).join(', ') || 'なし'}`);
    console.log(`  接続健全性: ${connectionHealthy}`);
    
    // セッションIDが提供されていない場合は旧方式
    if (!data.sessionId) {
      console.warn("⚠️ セッションIDが提供されていません - 旧方式を使用");
      return;
    }
    
    // 接続が不安定な場合の対処
    if (!connectionHealthy) {
      console.warn("⚠️ 接続が不安定 - Writer ID管理データをリフレッシュ");
      // 積極的なクリーンアップを実行
      const now = Date.now();
      const shortTimeoutMs = 2000; // 2秒
      for (let [writerId, lastSeen] of writerLastSeen.entries()) {
        if (now - lastSeen > shortTimeoutMs) {
          console.log(`🧽 接続不安定時のクリーンアップ: Writer ID ${writerId}`);
          cleanupWriterSession(writerId);
        }
      }
    }
    
    // 既存セッションの確認と重複チェック（より厳密）
    let existingWriterId = null;
    for (let [writerId, sessionId] of writerSessions.entries()) {
      if (sessionId === data.sessionId) {
        existingWriterId = writerId;
        console.log(`🔄 既存セッション発見: ${writerId} -> ${sessionId}`);
        break;
      }
    }
    
    // セッションIDの一意性検証
    const sessionIdMatches = Array.from(writerSessions.entries()).filter(([, sessionId]) => sessionId === data.sessionId);
    if (sessionIdMatches.length > 1) {
      console.error(`🚨 セッションID重複検出: ${data.sessionId} が ${sessionIdMatches.length} 個のWriter IDに割り当てられています`);
      // 重複セッションをクリーンアップ
      sessionIdMatches.forEach(([writerId, sessionId]) => {
        console.log(`🧹 重複セッション削除: ${writerId} -> ${sessionId}`);
        cleanupWriterSession(writerId);
      });
      existingWriterId = null; // 重複があったので新規割り当て
    }
    
    // 新しいセッションの場合、古いタイムアウトしたセッションを積極的にクリーンアップ
    if (!existingWriterId) {
      console.log("🧹 新しいセッション要求 - タイムアウトセッションを即座にクリーンアップ");
      checkWriterTimeouts();
      
      // アクティブなWriter IDをチェック
      const activeWriters = getActiveWriterIds();
      console.log(`📊 アクティブなWriter ID: ${activeWriters.join(', ') || 'なし'}`);
      
      // さらに、5秒以上無通信のセッションも積極的にクリーンアップ
      const now = Date.now();
      const aggressiveTimeoutMs = 5000; // 5秒
      
      for (let [writerId, lastSeen] of writerLastSeen.entries()) {
        if (now - lastSeen > aggressiveTimeoutMs) {
          console.log(`⚡ 積極的クリーンアップ: Writer ID ${writerId} (${Math.floor((now - lastSeen) / 1000)}秒無通信)`);
          cleanupWriterSession(writerId);
        }
      }
    }
    
    // 既存セッションがある場合はそれを再利用
    if (existingWriterId) {
      // 最終接触時刻も更新
      writerLastSeen.set(existingWriterId, Date.now());
      
      const assignMsg = {
        type: "assignWriterId",
        writerId: existingWriterId,
        sessionId: data.sessionId
      };
      console.log("📤 既存Writer ID再送信:", assignMsg);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(assignMsg));
      }
      return;
    }
    
    // 利用可能なwriter IDを割り当て
    console.log("🆔 新規Writer ID割り当て処理開始");
    console.log(`📊 セッション要求: ${data.sessionId}`);
    console.log(`📊 Writer ID割り当て前の状況:`);
    console.log(`  接続中Writer: ${Array.from(connectedWriters).join(', ') || 'なし'}`);
    console.log(`  セッション数: ${writerSessions.size}`);
    console.log(`  最終接触時刻データ: ${writerLastSeen.size}件`);
    
    // データ整合性チェック
    for (let [writerId, sessionId] of writerSessions.entries()) {
      if (!connectedWriters.has(writerId)) {
        console.warn(`⚠️ データ不整合: Writer ${writerId} がセッションにあるが接続リストにない`);
        connectedWriters.add(writerId);
      }
    }
    
    let assignedId = null;
    
    // ランダムな順序でWriter IDをチェック（PC・スマホ両方がwriter1を取る問題を防ぐ）
    const writerIds = ['writer1', 'writer2', 'writer3', 'writer4', 'writer5', 'writer6'];
    const shuffledIds = [...writerIds].sort(() => Math.random() - 0.5);
    
    console.log(`🎲 Writer ID候補をランダム順序でチェック: ${shuffledIds.join(', ')}`);
    
    for (const candidateId of shuffledIds) {
      const isInConnected = connectedWriters.has(candidateId);
      const isInSessions = writerSessions.has(candidateId);
      
      console.log(`🔍 Writer ID ${candidateId} チェック: 接続=${isInConnected}, セッション=${isInSessions}`);
      
      // さらにアクティブかどうかもチェック
      const activeWriters = getActiveWriterIds();
      const isActive = activeWriters.includes(candidateId);
      
      // セッションIDの重複チェックも追加
      const sessionConflict = Array.from(writerSessions.entries()).some(([wId, sId]) => 
        wId !== candidateId && sId === data.sessionId
      );
      
      if (!isInConnected && !isInSessions && !isActive && !sessionConflict) {
        assignedId = candidateId;
        connectedWriters.add(candidateId);
        console.log(`✅ Writer ID ${candidateId} を新規割り当て`);
        break;
      } else {
        console.log(`❌ Writer ID ${candidateId} は既に使用中 (接続:${isInConnected}, セッション:${isInSessions}, アクティブ:${isActive}, 重複:${sessionConflict})`);
        
        // 非アクティブなのに使用中の場合はクリーンアップ
        if ((isInConnected || isInSessions) && !isActive) {
          console.log(`🧽 非アクティブなWriter ID ${candidateId} をクリーンアップして再利用`);
          cleanupWriterSession(candidateId);
          assignedId = candidateId;
          connectedWriters.add(candidateId);
          console.log(`✅ Writer ID ${candidateId} をクリーンアップ後に割り当て`);
          break;
        }
      }
    }
    
    if (assignedId) {
      // セッションマッピングを記録
      writerSessions.set(assignedId, data.sessionId);
      writerLastSeen.set(assignedId, Date.now()); // 最終接触時刻を記録
      
      console.log(`📝 Writer ID割り当て: ${assignedId} セッション: ${data.sessionId} (接続中: ${Array.from(connectedWriters).join(', ')})`);
      console.log("📋 現在のセッション:", Array.from(writerSessions.entries()));
      
      const assignMsg = {
        type: "assignWriterId",
        writerId: assignedId,
        sessionId: data.sessionId // セッションIDを含める
      };
      console.log("📤 Writer ID割り当て送信:", assignMsg);
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(assignMsg));
      } else {
        console.error("❌ WebSocket接続なし - Writer ID割り当て送信失敗");
      }
    } else {
      console.warn("⚠️ 利用可能なwriter IDがありません（最大6人）");
      console.log("📋 現在のセッション:", Array.from(writerSessions.entries()));
      
      // 緊急時：最も古いセッションを強制クリーンアップして再試行
      if (writerLastSeen.size > 0) {
        let oldestWriterId = null;
        let oldestTime = Date.now();
        
        for (let [writerId, lastSeen] of writerLastSeen.entries()) {
          if (lastSeen < oldestTime) {
            oldestTime = lastSeen;
            oldestWriterId = writerId;
          }
        }
        
        if (oldestWriterId) {
          console.log(`🚨 緊急クリーンアップ: 最古のWriter ID ${oldestWriterId} を削除 (${Math.floor((Date.now() - oldestTime) / 1000)}秒前)`);
          cleanupWriterSession(oldestWriterId);
          
          // 再試行
          for (let i = 1; i <= 6; i++) {
            const candidateId = `writer${i}`;
            if (!connectedWriters.has(candidateId)) {
              assignedId = candidateId;
              connectedWriters.add(candidateId);
              console.log(`✅ 緊急割り当て成功: Writer ID ${candidateId}`);
              
              // セッションマッピングを記録
              writerSessions.set(assignedId, data.sessionId);
              writerLastSeen.set(assignedId, Date.now());
              
              const assignMsg = {
                type: "assignWriterId",
                writerId: assignedId,
                sessionId: data.sessionId
              };
              console.log("📤 緊急Writer ID割り当て送信:", assignMsg);
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(assignMsg));
              }
              break;
            }
          }
        }
      }
    }
    return;
  }
  
  // 描画データ受信のデバッグログを一時的に有効化
  if (data.type === "start" || data.type === "draw") {
    console.log("🖊️ 描画データ受信:", data.type, "WriterID:", data.writerId);
    console.log("🖊️ データ詳細:", { x: data.x, y: data.y, color: data.color, thickness: data.thickness });
    console.log("🖊️ 条件分岐へ進む前の確認: type =", data.type);
  }
  
  // 描画データ以外のメッセージのみログ出力（送信ボタンを探すため）
  if (data.type !== "start" && data.type !== "draw" && data.type !== "clear") {
    console.log("🔍 送信ボタン探索 - メッセージタイプ:", data.type);
    console.log("🔍 メッセージ詳細:", data);
  }
  
  // draw関連以外のメッセージのみログ出力
  if (data.type !== "start" && data.type !== "draw" && data.type !== "clear") {
    //console.log("受信メッセージ:", data.type);
    //console.log("受信データ詳細:", data);
  }

  // 背景5(dev)モードの特別処理
  if (data.type === "background-dev") {
    const writerId = data.writerId || 'default';
    console.log(`🔧 背景5(dev)メッセージ受信 - 白背景を表示 (WriterID: ${writerId})`);
    
    // スケール情報があれば適用
    if (data.canvasSize && data.canvasSize.scale) {
      currentScale = data.canvasSize.scale;
      console.log(`🎯 書き手側のスケール適用: ${currentScale}`);
    }
    
    // canvasSize情報を保存
    if (data.canvasSize) {
      writerCanvasSizesData[writerId] = data.canvasSize;
      senderCanvasSize = data.canvasSize;
    }
    
    // 白背景フラグを設定
    window.isDevWhiteBackground = true;
    
    // back2.pngと全く同じ処理を実行（位置・アニメーション共通）
    displayBack2Image();
    
    console.log(`✅ 背景5(dev): back2共通処理で白背景表示完了`);
    return;
  }
  
  if (data.type === "background") {
    // 背景変更メッセージを受信（180度回転で表示）
    const writerId = data.writerId || 'default';
    
    // 白背景フラグをリセット
    window.isDevWhiteBackground = false;
    console.log(`📨 背景変更メッセージ受信: ${data.src} (WriterID: ${writerId})`);
    console.log(`📨 背景メッセージ詳細:`, data);
    console.log(`📨 back6.png含まれているか:`, data.src ? data.src.includes('back6.png') : 'srcなし');
    console.log(`📨 back2.png含まれているか:`, data.src ? data.src.includes('back2.png') : 'srcなし');
    console.log(`📨 isCanvasRotated状態:`, isCanvasRotated);
    
    // back2.pngの場合は新しい実装を使用
    if (data.src && data.src.includes('back2.png')) {
      console.log(`🎯 back2.png検出 - 新しい180度回転表示を開始 (現在のback2Wrapper=${!!back2Wrapper})`);
      
      // スケール情報があれば適用
      if (data.canvasSize && data.canvasSize.scale) {
        currentScale = data.canvasSize.scale;
        console.log(`🎯 書き手側のスケール適用: ${currentScale}`);
      }
      
      displayBack2Image();
      return;
    }
    
    if (data.src) {
      // nullオブジェクトを設定してcanvas描画で処理
      //console.log(`🖼️ 背景画像読み込み開始: ${data.src}`);
      
      const img = new Image();
      img.onload = () => {
        //console.log(`✅ 背景画像読み込み成功: ${data.src}`);
        
        // WriterID別の背景画像を保存
        writerBackgroundImages[writerId] = img;
        activeBackgroundWriterId = writerId;
        
        // 後方互換性のため、グローバル変数も更新
        // 背景画像設定処理は削除済み
        lastBackgroundSrc = data.src;
        
        // back6.png以外の背景に切り替わった場合は回転状態をリセット
        if (!data.src.includes('back6.png')) {
          isCanvasRotated = false;
          //console.log('🔄 通常背景切り替え: 回転状態リセット');
          
          // 新しい背景に変更された場合は古いWriter描画データを完全クリア
          console.log('🧹 新しい背景変更: Writer描画データを完全クリア');
          // 描画データクリア処理は削除済み
          
          // writer管理データもクリア
          if (typeof writerLastSeen !== 'undefined') {
            writerLastSeen.clear();
            console.log('🧹 writerLastSeenもクリア');
          }
          if (typeof writerPositions !== 'undefined') {
            writerPositions.clear(); 
            console.log('🧹 writerPositionsもクリア');
          }
          
          // otherWritersDataも存在する場合はクリア
          if (typeof otherWritersData !== 'undefined') {
            for (let writerId in otherWritersData) {
              otherWritersData[writerId] = [];
            }
            console.log('🧹 otherWritersDataもクリア');
          }
          
          console.log('🧹 背景変更に伴う完全データクリア完了');
        }
        
        // CSS背景を削除してcanvas描画に統一
        // canvas表示設定処理は削除済み
        
        //console.log(`🖼️ 背景画像読み込み完了、redrawCanvas呼び出し前`);
        
        // back6.pngの場合は回転アニメーションを実行
        if (data.src.includes('back6.png') && !isCanvasRotated) {
          console.log("🔴 送信ボタン(back6.png)押下 → 0度回転保存 + アニメーション実行");
          
          // 描画を0度に戻して保存
          console.log("🚀 0度回転保存処理を開始します");
          saveRotatedImageAs0Degree();
          
          console.log("🚀 回転アニメーションを開始します");
          performImageRotationAnimation();
        } else {
          // 🔸 背景画像とピンクエリアを動的に作成
          // 背景画像設置処理は削除済み
          
          // 🔸 キャンバスサイズが変更された場合に位置を再調整
          if (data.canvasSize) {
            setTimeout(() => {
              // 背景画像位置更新処理は削除済み
            }, 100); // DOM更新後に実行
          }
          
          // 再描画処理は削除済み; // これでログが出力される
        }
        //console.log(`🖼️ redrawCanvas呼び出し完了`);
      };
      
      img.onerror = (error) => {
        //console.error(`❌ 背景画像読み込みエラー: ${data.src}`, error);
      };
      
      img.src = data.src;
    } else {
      // 白背景
      // 背景画像設定処理は削除済み
      lastBackgroundSrc = null;
      
      //console.log('🖼️ 白背景を180度回転で設定');
      // 再描画処理は削除済み;
    }
  } else if (data.type === "print") {
    // 🔸 印刷時に用紙サイズ情報を取得
    if (data.paperSize) {
      currentPaperSize = data.paperSize;
      console.log(`印刷用紙サイズ: ${currentPaperSize}`);
    }
    // 🔸 送信ボタンで印刷ペンと同じ処理を実行
    console.log("🔴 送信ボタン押下 → 印刷ペン処理 + アニメーション実行");
    
    // キャンバスの回転アニメーションはprepareAndRunAnimationで処理するため、ここでは何もしない
    console.log("🔄 キャンバス回転アニメーションはアニメーション画像と同期して実行");
    
    // 描画を0度に戻して保存
    console.log("🚀 0度回転保存処理を開始します");
    saveRotatedImageAs0Degree();
    
    console.log("🚀 印刷ペン処理を開始します");
    printPen();
    
    console.log("🚀 アニメーション準備を開始します");
    prepareAndRunAnimation();
  } else if (data.type === "paperSize") {
    // 🔸 用紙サイズ変更の通知を受信
    const oldPaperSize = currentPaperSize;
    const oldScaleFactor = SCALE_FACTOR;
    currentPaperSize = data.size;
    //console.log(`📄 用紙サイズが${oldPaperSize}から${data.size}に変更されました`);
    
    // 🔸 用紙サイズに応じて拡大率を変更
    if (data.size === "poster") {
      SCALE_FACTOR = 2.4; // A4の4.0倍の60% = 2.4倍
      //console.log("🔍 拡大率を2.4倍に変更（ポストカードモード - A4の60%サイズ）");
    } else if (data.size === "L") {
      SCALE_FACTOR = 3.2; // A4の4.0倍の80% = 3.2倍
      //console.log("🔍 拡大率を3.2倍に変更（L判モード - A4の80%サイズ）");
    } else {
      SCALE_FACTOR = 4.0;
      //console.log("🔍 拡大率を4.0倍に変更（A4モード）");
    }
    
    //console.log(`📊 SCALE_FACTOR変更: ${oldScaleFactor} → ${SCALE_FACTOR}`);
    
    // 🔸 キャンバスサイズを再計算
    updateCanvasSize();
    
  } else if (data.type === "background") {
    // 🔧 送信側のdevtoolスケール値を更新
    if (data.scale !== undefined) {
      UNIFIED_SETTINGS.canvasScale = data.scale;
      //console.log(`🔧 送信側スケール値更新: ${UNIFIED_SETTINGS.canvasScale}x`);
    }
    
    // 🔸 送信側のキャンバスサイズ情報を保存（WriterID別管理）
    if (data.canvasSize) {
      const writerId = data.writerId || 'default';
      const oldSenderSize = writerCanvasSizesData[writerId] || { ...senderCanvasSize };
      
      // WriterID別のキャンバスサイズを保存
      writerCanvasSizesData[writerId] = data.canvasSize;
      
      // 後方互換性のため、グローバル変数も更新
      senderCanvasSize = data.canvasSize;
      //console.log(`📐 送信側キャンバスサイズ: ${senderCanvasSize.width} x ${senderCanvasSize.height}`);
      
      // 🔸 受信側キャンバスサイズも送信側と同じにする
      const oldReceiverSize = { width: canvas.width, height: canvas.height };
      canvas.width = senderCanvasSize.width;
      canvas.height = senderCanvasSize.height;
      //console.log(`📐 受信側キャンバスサイズも同期: ${oldReceiverSize.width}x${oldReceiverSize.height} → ${canvas.width}x${canvas.height}`);
      
      // 🔸 キャンバスサイズ変更時に描画エリアも連動してスケール
      if (oldSenderSize.width !== 0 && oldSenderSize.height !== 0) {
        const scaleX = senderCanvasSize.width / oldSenderSize.width;
        const scaleY = senderCanvasSize.height / oldSenderSize.height;
        
        // 動的背景画像の場合は自動調整をスキップ
        if (false) {
          console.log('🚫 動的背景画像のため描画エリア自動調整をスキップ');
          return;
        }
        
        // 描画エリアサイズを連動してスケール
        if (null && window.nullBasedDrawingAreaSize && window.nullBasedDrawingAreaSize.isActive) {
          // 🔒 背景画像サイズを優先（スケールは無視）
          drawingAreaSize.width = window.nullBasedDrawingAreaSize.width;
          drawingAreaSize.height = window.nullBasedDrawingAreaSize.height;
          console.log(`🔒 背景画像サイズを優先（送信側スケール無視）: ${drawingAreaSize.width}x${drawingAreaSize.height}`);
        } else {
          drawingAreaSize.width = Math.round(drawingAreaSize.width * scaleX);
          drawingAreaSize.height = Math.round(drawingAreaSize.height * scaleY);
        }
        
        // 描画エリアの位置（オフセット）も連動してスケール（動的背景は除く）
        if (!false) {
          drawingAreaOffset.x = Math.round(drawingAreaOffset.x * scaleX);
          drawingAreaOffset.y = Math.round(drawingAreaOffset.y * scaleY);
          console.log('📏 通常背景: 描画エリア位置をスケール調整');
        } else {
          console.log('🔒 動的背景: 描画エリア位置のスケール調整をスキップ（CSS中央配置維持）');
        }
        
        // GUI入力値も更新
        document.getElementById('centerX').value = drawingAreaOffset.x;
        document.getElementById('centerY').value = drawingAreaOffset.y;
        document.getElementById('areaWidth').value = drawingAreaSize.width;
        document.getElementById('areaHeight').value = drawingAreaSize.height;
        
        //console.log(`📏 描画エリアをスケール調整: サイズ${drawingAreaSize.width}x${drawingAreaSize.height}, 位置(${drawingAreaOffset.x}, ${drawingAreaOffset.y}) (倍率: ${scaleX.toFixed(2)}, ${scaleY.toFixed(2)})`);
        
        // 描画エリアが表示中なら更新
        if (showDrawingAreaFrame) {
          showDrawingArea();
        }
      }
    }
    
    if (data.src === "white") {
      // 背景画像設定処理は削除済み
      lastBackgroundSrc = null;
      
      // 🔸 受信側キャンバスサイズを送信側に合わせて設定
      setReceiverCanvasSize();
      // 再描画処理は削除済み;
    } else {
      const img = new Image();
      const resolved = resolveImagePath(data.src);
      img.src = resolved;
      lastBackgroundSrc = resolved;
      img.onload = () => {
        // 背景画像設定処理は削除済み
        
        // 🔸 背景画像とピンクエリアを動的に作成
        // 背景画像設置処理は削除済み
        
        // 🔸 通常背景画像（background 1, 2, 3）が設定された時にDJ.mp3を再生
        if (data.src.includes('back2.png') || data.src.includes('back3.png') || data.src.includes('back4.png')) {
          const audio = new Audio('./DJ.mp3');
          audio.volume = 0.8; // ボリュームを2割下げる（1.0 → 0.8）
          audio.play().catch(e => {
    //console.log('DJ.mp3再生エラー:', e);
  });
          //console.log('🔊 背景画像設定時にDJ.mp3再生開始（ボリューム0.8）');
        }
        
        // 🔸 受信側キャンバスサイズを送信側に合わせて設定
        setReceiverCanvasSize();
        // 再描画処理は削除済み;
      };
    }
  } else if (data.type === "canvasSizeUpdate") {
    // 書き手側のdevtoolキャンバスサイズ変更を受信
    console.log(`📐 キャンバスサイズ更新受信: ${data.canvasSize.width}x${data.canvasSize.height}, scale=${data.scale}`);
    
    const writerId = data.writerId || 'writer1';
    
    // back2.pngが表示中の場合、サイズを更新
    if (back2Wrapper && back2Image && drawCanvas) {
      const oldScale = currentScale;
      const newScale = data.scale || 1.0;
      
      console.log(`🔄 スケール変更: ${oldScale} → ${newScale}`);
      
      // 既存の描画データを保存
      const imageData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
      const oldCanvasWidth = drawCanvas.width;
      const oldCanvasHeight = drawCanvas.height;
      
      // back2画像のサイズ更新
      updateBack2Size(newScale);
      
      // 新しいキャンバスサイズを取得
      const newCanvasWidth = drawCanvas.width;
      const newCanvasHeight = drawCanvas.height;
      
      // 描画内容を新しいサイズにスケールして再描画
      if (oldCanvasWidth > 0 && oldCanvasHeight > 0) {
        // 一時的なキャンバスで既存の描画をスケール
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = oldCanvasWidth;
        tempCanvas.height = oldCanvasHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        // 既存の描画データを一時キャンバスに復元
        tempCtx.putImageData(imageData, 0, 0);
        
        // メインキャンバスをクリアして新しいサイズで既存描画を再描画
        drawCtx.clearRect(0, 0, newCanvasWidth, newCanvasHeight);
        drawCtx.drawImage(tempCanvas, 0, 0, oldCanvasWidth, oldCanvasHeight, 0, 0, newCanvasWidth, newCanvasHeight);
        
        console.log(`🖼️ 描画内容を再スケール: ${oldCanvasWidth}x${oldCanvasHeight} → ${newCanvasWidth}x${newCanvasHeight}`);
      }
      
      console.log(`✅ back2と描画内容の両方のサイズ更新完了: scale=${newScale}`);
    } else {
      console.log(`⚠️ back2未表示のためサイズ更新スキップ`);
    }
  } else if (data.type === "clear") {
    // アニメーション中はclearを無視
    if (isAnimationInProgress) {
      console.log('⏳ アニメーション実行中のため、clearを無視します');
      return;
    }
    
    // 🎬 描画検出フラグをリセット
    window.firstDrawingDetected = false;
    console.log('🎬 描画検出フラグをリセット');
    
    // 送信ボタン後のクリア前に描画データを0度回転で保存（印刷機能は削除）
    if ([].length > 0) {
      console.log("🔴 送信ボタン → 描画データを0度回転で保存のみ");
      saveDrawingDataAs0Degree();
    }
    
    console.log('🧹 受信側：complete clear処理開始');
    
    // back2.pngの描画データもクリア
    if (back2Wrapper && drawCtx) {
      clearDrawCanvas();
      drawingData = [];
      console.log('🧹 back2描画データクリア');
    }
    
    // 全ての執筆者データを完全クリア（6人対応）
    // 描画データクリア処理は削除済み
    
    // writer管理データもクリア
    if (typeof writerLastSeen !== 'undefined') {
      writerLastSeen.clear();
      console.log('🧹 writerLastSeenクリア');
    }
    if (typeof writerPositions !== 'undefined') {
      writerPositions.clear();
      console.log('🧹 writerPositionsクリア');
    }
    
    // 他の可能性のあるデータ構造もクリア
    if (typeof otherWritersData !== 'undefined') {
      for (let writerId in otherWritersData) {
        otherWritersData[writerId] = [];
      }
      console.log('🧹 otherWritersDataクリア');
    }
    
    console.log('🧹 受信側：全執筆者データを完全クリア');
    // 再描画処理は削除済み;
  } else if (data.type === "globalClear") {
    // 書き手からの全体クリア指示
    console.log(`🧹 書き手(${data.writerId})から全体クリア指示受信`);
    
    // アニメーション中はglobalClearを無視
    if (isAnimationInProgress) {
      console.log('⏳ アニメーション実行中のため、globalClearを無視します');
      return;
    }
    
    console.log('🧹 受信側：globalClear処理開始');
    
    // 🔧【修正】Writer別描画データを完全クリア
    if (typeof writerDrawingData !== 'undefined') {
      writerDrawingData = {};
      console.log('🧹 writerDrawingDataを完全クリア');
    }
    
    // 🔧【修正】共通描画データもクリア
    if (typeof drawingData !== 'undefined') {
      drawingData = [];
      console.log('🧹 drawingDataを完全クリア');
    }
    
    // writer管理データもクリア
    if (typeof writerLastSeen !== 'undefined') {
      writerLastSeen.clear();
      console.log('🧹 writerLastSeenクリア');
    }
    if (typeof writerPositions !== 'undefined') {
      writerPositions.clear();
      console.log('🧹 writerPositionsクリア');
    }
    
    // 他の可能性のあるデータ構造もクリア
    if (typeof otherWritersData !== 'undefined') {
      for (let writerId in otherWritersData) {
        otherWritersData[writerId] = [];
      }
      console.log('🧹 otherWritersDataクリア');
    }
    
    // 🔧【修正】実際のキャンバスをクリア
    if (drawCanvas && drawCtx) {
      drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      console.log('🧹 描画キャンバスを完全クリア');
    }
    
    console.log('🧹 受信側：globalClear全執筆者データとキャンバスを完全クリア');
  } else if (data.type === "clearWriter") {
    // アニメーション中はclearWriterを無視
    if (isAnimationInProgress) {
      console.log('⏳ アニメーション実行中のため、clearWriterを無視します');
      return;
    }
    
    // 特定の書き手の描画だけをクリア
    const writerId = data.writerId;
    console.log(`🧹 書き手(${writerId})の描画だけクリア指示受信`);
    
    // 🔧【修正】Writer別描画データをクリア
    if (writerDrawingData[writerId]) {
      writerDrawingData[writerId] = [];
      console.log(`🧹 Writer ${writerId} の描画データをクリア`);
    }
    
    // 🔧【修正】共通描画データから該当WriterIDのデータを削除
    if (drawingData && drawingData.length > 0) {
      const beforeCount = drawingData.length;
      drawingData = drawingData.filter(item => item.writerId !== writerId);
      const removedCount = beforeCount - drawingData.length;
      console.log(`🧹 共通データから Writer ${writerId} のデータ ${removedCount}件を削除`);
    }
    
    // WriterID別状態管理もクリア
    if (writerPathStates[writerId]) {
      writerPathStates[writerId] = {
        isInPath: false,
        lastPosition: null,
        currentPath: []
      };
      console.log(`🧹 Writer ${writerId} のパス状態をリセット`);
    }
    
    // 🔧【修正】キャンバスを再描画（残った描画のみ表示）
    if (drawCanvas && drawCtx) {
      // キャンバスをクリア
      drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      
      // 残ったWriterの描画を再描画
      Object.keys(writerDrawingData).forEach(wid => {
        if (wid !== writerId && writerDrawingData[wid].length > 0) {
          // Writer別に描画処理を実行
          writerDrawingData[wid].forEach((cmd, index) => {
            if (index > 0 && cmd.type === 'draw') {
              const prevCmd = writerDrawingData[wid][index - 1];
              if (prevCmd && (prevCmd.type === 'start' || prevCmd.type === 'draw')) {
                // 座標変換と描画
                const currentCanvasWidth = drawCanvas.width;
                const currentCanvasHeight = drawCanvas.height;
                const writerCanvasWidth = cmd.canvasSize?.width || initialBack2Size.width;
                const writerCanvasHeight = cmd.canvasSize?.height || initialBack2Size.height;
                
                const prevX = (prevCmd.x / writerCanvasWidth) * currentCanvasWidth;
                const prevY = (prevCmd.y / writerCanvasHeight) * currentCanvasHeight;
                const currX = (cmd.x / writerCanvasWidth) * currentCanvasWidth;
                const currY = (cmd.y / writerCanvasHeight) * currentCanvasHeight;
                
                // 180度回転を適用
                const rotatedPrevX = currentCanvasWidth - prevX;
                const rotatedPrevY = currentCanvasHeight - prevY;
                const rotatedCurrX = currentCanvasWidth - currX;
                const rotatedCurrY = currentCanvasHeight - currY;
                
                drawRotatedStroke(
                  rotatedPrevX, rotatedPrevY,
                  rotatedCurrX, rotatedCurrY,
                  cmd.color || '#000000',
                  cmd.thickness || 2
                );
              }
            }
          });
        }
      });
      console.log('🔄 キャンバス再描画完了（残った描画のみ）');
    }
    
    console.log(`✅ Writer ${writerId} の描画クリア完了`);
  } else if (data.type === "globalSend") {
    // 書き手からの送信指示
    console.log(`🎬🎬🎬 GLOBAL SEND メッセージ受信！ 書き手(${data.writerId})から送信指示受信 🎬🎬🎬`);
    console.log(`⏱️ アニメーション待機時間: ${data.animationStartWaitTime}秒`);
    console.log(`⏱️ 回転後待機時間: ${data.rotationWaitTime}秒`);
    
    // 🎬 渡すボタン押下を動画に通知
    sendVideoCommand('sendButtonPressed');
    console.log('🎬 渡すボタン押下を動画に通知');
    
    // 音楽ボリューム設定を受信
    if (data.musicVolume !== undefined) {
      musicVolume = data.musicVolume;
      console.log(`🎵 音楽ボリューム設定: ${musicVolume}`);
    }
    
    // 印刷遅延時間設定を受信
    if (data.printDelayTime !== undefined) {
      printDelayTime = data.printDelayTime;
      console.log(`🖨️ 印刷遅延時間設定: ${printDelayTime}秒`);
    }
    
    // 背景5の時に音楽再生開始
    if (window.isDevWhiteBackground) {
      playBackgroundMusic();
    }
    
    // 送信前に描画データを保存
    if ([].length > 0) {
      console.log("🔴 globalSend → 描画データを0度回転で保存");
      saveDrawingDataAs0Degree();
    }
    
    // 🔒 受信側はデータをクリアしない（回転後の描画を保持）
    console.log('🔒 受信側: globalSend受信時もデータを保持（回転後描画保護）');
    console.log(`🔒 保持中のデータ: ${Object.keys({}).map(id => `${id}: ${{}[id].length}`).join(', ')}`);
    
    // ⚠️ データクリアを無効化：受信側は回転後の描画を保持
    // {} = {...}; // コメントアウト
    // [] = [];        // コメントアウト
    
    console.log('🔒 globalSend: 受信側データ保持完了');
    
    // 描画内容のダウンロードと印刷（ダウンロードは即座、印刷は遅延）
    console.log('📥 globalSend: 画像ダウンロードを即座に実行、印刷は遅延実行');
    
    // まず即座にダウンロード処理を実行
    downloadAndPrintDrawing();
    
    // アニメーション開始までの待機時間後にアニメーションを実行
    const animationStartDelay = (data.animationStartWaitTime || 1.0) * 1000;
    const rotationWaitTime = (data.rotationWaitTime || 1.0) * 1000;
    
    // videoPatternを受信データから更新
    if (data.videoPattern !== undefined) {
      videoPattern = data.videoPattern;
      console.log(`🎬 globalSendでvideoPattern更新: ${videoPattern}`);
    }
    
    console.log(`🎬 ${animationStartDelay/1000}秒後にアニメーションを開始`);
    
    setTimeout(() => {
      // 180度回転アニメーション開始
      startRotationAnimation(rotationWaitTime);
    }, animationStartDelay);
    
    // 花火演出を全書き手に同期表示
    console.log('🎆 globalSend: 花火演出を開始');
    setTimeout(() => {
      createReceiverFireworks();
    }, animationStartDelay + 1000); // アニメーション開始後1秒で花火を実行
  } else if (data.type === "start") {
    console.log("🎯 START条件分岐に到達");
    // writer ID を取得（デフォルトは writer1 で後方互換性を保つ）
    const writerId = data.writerId || 'writer1';
    console.log("🎯 START処理開始: writerId =", writerId);
    
    // タイムスタンプを追加
    const startData = { 
      ...data, 
      writerId: writerId, 
      timestamp: Date.now() 
    };
    
    
    // 🔸 座標はスケール変換せずにそのまま保存（描画時に変換）
    // Writer IDが存在しない場合は配列を初期化（WriterID別状態完全分離）
    if (!writerDrawingData[writerId]) {
      writerDrawingData[writerId] = [];
      console.log(`🆕 新しいWriter ID ${writerId} の配列を初期化`);
    }
    
    // WriterID別パス状態も確実に初期化
    console.log(`🔧 writerPathStates初期化前: writerPathStates=${!!writerPathStates}, [${writerId}]=${!!writerPathStates[writerId]}`);
    if (!writerPathStates[writerId]) {
      writerPathStates[writerId] = {
        isInPath: false,
        lastPosition: null,
        currentPath: []
      };
      console.log(`🔄 Writer ID ${writerId} のパス状態を初期化`);
    }
    console.log(`🔧 START: writerPathStates初期化後の状態確認完了`);
    
    console.log(`🔧 START: データ配列への追加開始`);
    writerDrawingData[writerId].push(startData);
    console.log(`🔧 START: データ配列への追加完了`);
    
    // back2.pngが表示中の場合は描画処理
    console.log(`🎯 描画処理チェック: back2Wrapper=${!!back2Wrapper}, drawCtx=${!!drawCtx}`);
    if (back2Wrapper && drawCtx) {
      console.log(`✅ back2描画処理を実行`);
      processDrawingForBack2(startData, writerId);
    } else {
      console.log(`❌ back2描画処理をスキップ: back2Wrapper=${!!back2Wrapper}, drawCtx=${!!drawCtx}`);
    }
    
    
    // 🔸 WriterID別キャンバスサイズ情報を更新
    if (data.canvasSize) {
      const oldSize = writerCanvasSizesData[writerId] ? { ...writerCanvasSizesData[writerId] } : { ...senderCanvasSize };
      writerCanvasSizesData[writerId] = data.canvasSize;
      //console.log(`📐 Writer ${writerId} キャンバスサイズ更新: ${oldSize.width}x${oldSize.height} → ${writerCanvasSizesData[writerId].width}x${writerCanvasSizesData[writerId].height}`);
      
      // back2.pngが表示中でスケール情報があればサイズ更新
      if (back2Wrapper && data.canvasSize.scale && data.canvasSize.scale !== currentScale) {
        console.log(`🔄 back2スケール更新: ${currentScale} → ${data.canvasSize.scale}`);
        updateBack2Size(data.canvasSize.scale);
      }
    } else {
      // キャンバスサイズ情報がない場合はデフォルト値を使用
      if (!writerCanvasSizesData[writerId]) {
        writerCanvasSizesData[writerId] = { ...senderCanvasSize };
      }
      //console.log(`⚠️ Writer ${writerId} 描画メッセージにcanvasSizeが含まれていません - デフォルト使用`);
    }
    
    //console.log(`🖊️ 手動描画開始: 送信側(${data.x}, ${data.y}) canvas:${senderCanvasSize.width}x${senderCanvasSize.height}`);
    
    // 🚪 描画開始時は扉タイマーをスケジュールしない（送信ボタン時のみ）
    
    // 🔸 リアルタイム描画（描画エリア調整を適用して180度回転）
    // 描画エリアの位置とサイズを計算（redrawCanvasと同じ計算方法を使用）
    const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
    const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
    const areaLeft = areaCenterX - drawingAreaSize.width / 2;
    const areaTop = areaCenterY - drawingAreaSize.height / 2;
    
    // 🔸 書き手側と受信側の比率統一のための描画エリアサイズ調整
    // このWriterのキャンバス比率と同じになるよう受信側描画エリアを調整
    const currentWriterCanvasSize = writerCanvasSizesData[writerId] || senderCanvasSize;
    const senderAspectRatio = currentWriterCanvasSize.width / currentWriterCanvasSize.height;
    const adjustedDrawingAreaSize = {
      width: drawingAreaSize.width,
      height: Math.round(drawingAreaSize.width / senderAspectRatio)
    };
    
    console.log('  書き手側比率:', senderAspectRatio.toFixed(2), '調整前:', drawingAreaSize.width, 'x', drawingAreaSize.height, '調整後:', adjustedDrawingAreaSize.width, 'x', adjustedDrawingAreaSize.height);
    
    // 🔸 アスペクト比を保持した座標変換（このWriterのキャンバスサイズと調整後のサイズを使用）
    const coords = transformCoordinatesWithAspectRatio(data.x, data.y, currentWriterCanvasSize, adjustedDrawingAreaSize);
    let scaledX = coords.x;
    let scaledY = coords.y;
    
    console.log(`🎯 START描画デバッグ: 送信側(${data.x}, ${data.y}) → スケール後(${scaledX.toFixed(1)}, ${scaledY.toFixed(1)})`);
    console.log('  送信側キャンバスサイズ:', senderCanvasSize.width, 'x', senderCanvasSize.height);
    console.log('  描画エリアサイズ:', drawingAreaSize.width, 'x', drawingAreaSize.height);
    console.log('  実際の描画サイズ:', coords.actualWidth, 'x', coords.actualHeight);
    console.log('  描画エリア左上:', areaLeft.toFixed(1), areaTop.toFixed(1));
    console.log('  drawingAreaOffset:', drawingAreaOffset.x, drawingAreaOffset.y);
    console.log('  計算されたareaLeft/Top:', areaLeft.toFixed(1), areaTop.toFixed(1));
    
    // 180度回転座標変換を適用（実際の描画範囲内で回転）
    const beforeRotationX = scaledX;
    const beforeRotationY = scaledY;
    
    // オフセットを除いた実際の描画範囲内での相対座標に変換（調整後サイズを使用）
    const offsetX = (adjustedDrawingAreaSize.width - coords.actualWidth) / 2;
    const offsetY = (adjustedDrawingAreaSize.height - coords.actualHeight) / 2;
    const relativeX = scaledX - offsetX;
    const relativeY = scaledY - offsetY;
    
    // 実際の描画範囲内で180度回転
    const rotatedRelativeX = coords.actualWidth - relativeX;
    const rotatedRelativeY = coords.actualHeight - relativeY;
    
    // オフセットを加えて最終座標を計算
    scaledX = rotatedRelativeX + offsetX;
    scaledY = rotatedRelativeY + offsetY;
    
    console.log(`  180度回転変換: (${beforeRotationX.toFixed(1)}, ${beforeRotationY.toFixed(1)}) → (${scaledX.toFixed(1)}, ${scaledY.toFixed(1)})`);
    
    const finalX = areaLeft + scaledX;
    const finalY = areaTop + scaledY;
    
    console.log('  最終描画位置:', finalX.toFixed(1), finalY.toFixed(1));
    
    // 🎯 描画エリア内判定
    const isInDrawingArea = (finalX >= areaLeft && finalX <= areaLeft + drawingAreaSize.width &&
                            finalY >= areaTop && finalY <= areaTop + drawingAreaSize.height);
    const areaStatus = isInDrawingArea ? '✅ エリア内' : '❌ エリア外';
    console.log(`  描画位置判定: ${areaStatus} (エリア範囲: ${areaLeft.toFixed(1)}-${(areaLeft + drawingAreaSize.width).toFixed(1)}, ${areaTop.toFixed(1)}-${(areaTop + drawingAreaSize.height).toFixed(1)})`);
    
    // リアルタイム描画はredrawCanvasに任せる
    // 再描画処理は削除済み;
    
    // 星エフェクトが有効でスタート時に星を表示
    if (data.starEffect) {
      // キャンバスの実際の表示位置を取得
      const canvasRect = canvas.getBoundingClientRect();
      
      // キャンバスは180度回転しているため、座標を反転
      // 描画位置：(areaLeft + scaledX, areaTop + scaledY)
      // 180度回転後：(canvas.width - x, canvas.height - y)
      const rotatedX = canvas.width - (areaLeft + scaledX);
      const rotatedY = canvas.height - (areaTop + scaledY);
      
      // キャンバスのスケールを考慮した実際のピクセル位置
      const scaleX = canvasRect.width / canvas.width;
      const scaleY = canvasRect.height / canvas.height;
      
      // ページ上の実際の座標
      const pageX = canvasRect.left + (rotatedX * scaleX);
      const pageY = canvasRect.top + (rotatedY * scaleY);
      
      console.log(`⭐ start時に星エフェクト(180度回転): canvas(${scaledX.toFixed(1)}, ${scaledY.toFixed(1)}) -> rotated(${rotatedX.toFixed(1)}, ${rotatedY.toFixed(1)}) -> page(${pageX.toFixed(1)}, ${pageY.toFixed(1)})`);
      console.log(`   キャンバスRect: left=${canvasRect.left.toFixed(1)}, top=${canvasRect.top.toFixed(1)}, width=${canvasRect.width.toFixed(1)}, height=${canvasRect.height.toFixed(1)}`);
      console.log(`   スケール: X=${scaleX.toFixed(2)}, Y=${scaleY.toFixed(2)}`);
      
      createReceiverStar(pageX, pageY);
    }
    
    // 妖精の粉エフェクトが有効でスタート時に妖精の粉を表示
    console.log(`✨ start時妖精の粉チェック: fairyDustEffect=${data.fairyDustEffect} (書き手側チェックボックスの状態)`);
    if (data.fairyDustEffect) {
      // 180度回転を考慮した座標変換
      const canvasRect = canvas.getBoundingClientRect();
      // 180度回転後の座標を計算
      const rotatedX = canvas.width - (areaLeft + scaledX);
      const rotatedY = canvas.height - (areaTop + scaledY);
      
      // キャンバスのスケールを考慮した実際のピクセル位置
      const scaleX = canvasRect.width / canvas.width;
      const scaleY = canvasRect.height / canvas.height;
      
      // ページ上の実際の座標
      const pageX = canvasRect.left + (rotatedX * scaleX);
      const pageY = canvasRect.top + (rotatedY * scaleY);
      console.log(`✨ start時に妖精の粉エフェクト(180度回転): canvas(${scaledX}, ${scaledY}) -> rotated(${rotatedX}, ${rotatedY}) -> page(${pageX}, ${pageY})`);
      console.log(`✨ 妖精の粉実際の表示位置: (${pageX.toFixed(1)}, ${pageY.toFixed(1)})`);
      createReceiverFairyDust(pageX, pageY);
    }
    
    // ハートエフェクトが有効でスタート時にハートを表示
    console.log(`💖 start時ハートチェック: heartEffect=${data.heartEffect} (書き手側チェックボックスの状態)`);
    if (data.heartEffect) {
      // 180度回転を考慮した座標変換
      const canvasRect = canvas.getBoundingClientRect();
      // 180度回転後の座標を計算
      const rotatedX = canvas.width - (areaLeft + scaledX);
      const rotatedY = canvas.height - (areaTop + scaledY);
      
      // キャンバスのスケールを考慮した実際のピクセル位置
      const scaleX = canvasRect.width / canvas.width;
      const scaleY = canvasRect.height / canvas.height;
      
      // ページ上の実際の座標
      const pageX = canvasRect.left + (rotatedX * scaleX);
      const pageY = canvasRect.top + (rotatedY * scaleY);
      console.log(`💖 start時にハートエフェクト(180度回転): canvas(${scaledX}, ${scaledY}) -> rotated(${rotatedX}, ${rotatedY}) -> page(${pageX}, ${pageY})`);
      console.log(`💖 ハート実際の表示位置: (${pageX.toFixed(1)}, ${pageY.toFixed(1)})`);
      createReceiverHeart(pageX, pageY);
    }
    
  } else if (data.type === "draw") {
    console.log("🎯 DRAW条件分岐に到達");
    // writer ID を取得（デフォルトは writer1 で後方互換性を保つ）
    const writerId = data.writerId || 'writer1';
    console.log("🎯 DRAW処理開始: writerId =", writerId);
    
    // 🎬 最初の描画を検出して動画再生
    if (!window.firstDrawingDetected) {
      window.firstDrawingDetected = true;
      sendVideoCommand('drawingStarted');
      console.log('🎬 最初の描画を検出、動画に通知');
    }
    
    // 最終接触時刻を更新
    if (writerLastSeen.has(writerId)) {
      writerLastSeen.set(writerId, Date.now());
    }
    
    // タイムスタンプを追加
    const drawData = { 
      ...data, 
      writerId: writerId, 
      timestamp: Date.now() 
    };
    
    
    // 🔸 座標はスケール変換せずにそのまま保存（描画時に変換）
    // Writer IDが存在しない場合は配列を初期化（WriterID別状態完全分離）
    if (!writerDrawingData[writerId]) {
      writerDrawingData[writerId] = [];
      console.log(`🆕 新しいWriter ID ${writerId} の配列を初期化`);
    }
    
    // WriterID別パス状態も確実に初期化
    if (!writerPathStates[writerId]) {
      writerPathStates[writerId] = {
        isInPath: false,
        lastPosition: null,
        currentPath: []
      };
      console.log(`🔄 Writer ID ${writerId} のパス状態を初期化`);
    }
    
    writerDrawingData[writerId].push(drawData);
    
    // 🎯 テスト線検出機能（ピンク色 #FF1493 の線を検出）
    if (data.color === '#FF1493' || data.color === '#ff1493') {
      console.log('🎯 テスト線を検出しました！');
      console.log(`🎯 書き手側座標: (${data.x}, ${data.y})`);
      
      // 受信側での変換後座標を計算して表示
      if (back2Wrapper && drawCanvas) {
        // キャンバスサイズ取得
        const canvasWidth = drawCanvas.width;
        const canvasHeight = drawCanvas.height;
        
        // 180度回転変換を適用
        const rotatedX = canvasWidth - data.x;
        const rotatedY = canvasHeight - data.y;
        
        console.log(`🎯 受信側変換後座標: (${rotatedX}, ${rotatedY})`);
        
        // コンソールで詳細情報を出力
        console.log('🎯========================================');
        console.log('🎯 テスト線位置情報');
        console.log('🎯========================================');
        console.log(`📍 書き手側座標: (${data.x}, ${data.y})`);
        console.log(`🔄 受信側座標: (${rotatedX}, ${rotatedY})`);
        console.log(`📐 キャンバスサイズ: ${canvasWidth}x${canvasHeight}`);
        console.log('🎯========================================');
      }
    }

    // back2.pngが表示中の場合は描画処理
    console.log(`🎯 draw処理チェック: back2Wrapper=${!!back2Wrapper}, drawCtx=${!!drawCtx}`);
    if (back2Wrapper && drawCtx) {
      console.log(`✅ back2 draw処理を実行`);
      processDrawingForBack2(drawData, writerId);
      console.log(`✅ back2 draw処理完了 - 次の処理へ`);
    } else {
      console.log(`❌ back2 draw処理をスキップ: back2Wrapper=${!!back2Wrapper}, drawCtx=${!!drawCtx}`);
    }
    
    // 🔸 WriterID別キャンバスサイズ情報を更新
    if (data.canvasSize) {
      writerCanvasSizesData[writerId] = data.canvasSize;
      
      // back2.pngが表示中でスケール情報があればサイズ更新
      if (back2Wrapper && data.canvasSize.scale && data.canvasSize.scale !== currentScale) {
        console.log(`🔄 back2スケール更新: ${currentScale} → ${data.canvasSize.scale}`);
        updateBack2Size(data.canvasSize.scale);
      }
    } else {
      // キャンバスサイズ情報がない場合はデフォルト値を使用
      if (!writerCanvasSizesData[writerId]) {
        writerCanvasSizesData[writerId] = { ...senderCanvasSize };
      }
      //console.log(`⚠️ Writer ${writerId} move描画メッセージにcanvasSizeが含まれていません - デフォルト使用`);
    }
    
    //console.log(`🖊️ 手動描画継続: 送信側(${data.x}, ${data.y})`);
    
    // 🚪 描画データ受信時は扉タイマーをスケジュールしない（送信ボタン時のみ）
    
    // 🔸 リアルタイム描画（描画エリア調整を適用して180度回転）
    console.log(`🌟 星エフェクト処理セクションに到達 - WriterID: ${writerId}`);
    // 描画エリアの位置とサイズを計算（redrawCanvasと同じ計算方法を使用）
    const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
    const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
    const areaLeft = areaCenterX - drawingAreaSize.width / 2;
    const areaTop = areaCenterY - drawingAreaSize.height / 2;
    console.log(`🌟 エリア計算完了: center(${areaCenterX.toFixed(1)}, ${areaCenterY.toFixed(1)}), area(${areaLeft.toFixed(1)}, ${areaTop.toFixed(1)})`);
    console.log(`🌟 データ確認: starEffect=${data.starEffect}, fairyDustEffect=${data.fairyDustEffect}, canvasSize=${JSON.stringify(data.canvasSize)}`);
    
    // 送信側からのstarEffectデータに基づいて判定
    console.log(`🌟 星エフェクト設定: starEffect=${data.starEffect} (書き手側チェックボックスの状態)`);
    
    console.log(`🌟 次の処理開始: WriterCanvasSize調整`);
    
    // 🔸 書き手側と受信側の比率統一のための描画エリアサイズ調整
    // このWriterのキャンバス比率と同じになるよう受信側描画エリアを調整
    const currentWriterCanvasSize = writerCanvasSizesData[writerId] || senderCanvasSize;
    console.log(`🌟 WriterCanvasSize取得完了: ${JSON.stringify(currentWriterCanvasSize)}`);
    const senderAspectRatio = currentWriterCanvasSize.width / currentWriterCanvasSize.height;
    const adjustedDrawingAreaSize = {
      width: drawingAreaSize.width,
      height: Math.round(drawingAreaSize.width / senderAspectRatio)
    };
    console.log(`🌟 座標変換準備完了: aspect=${senderAspectRatio.toFixed(2)}, adjustedArea=${adjustedDrawingAreaSize.width}x${adjustedDrawingAreaSize.height}`);
    
    // 🔸 アスペクト比を保持した座標変換（このWriterのキャンバスサイズと調整後のサイズを使用）
    const coords = transformCoordinatesWithAspectRatio(data.x, data.y, currentWriterCanvasSize, adjustedDrawingAreaSize);
    let scaledX = coords.x;
    let scaledY = coords.y;
    console.log(`🌟 座標変換完了: scaledX=${scaledX.toFixed(1)}, scaledY=${scaledY.toFixed(1)}`);
    
    //console.log('DRAW描画デバッグ:');
    //console.log('送信側座標:', data.x, data.y);
    //console.log('スケール後座標:', scaledX.toFixed(1), scaledY.toFixed(1));
    //console.log('描画エリア中心:', areaCenterX.toFixed(1), areaCenterY.toFixed(1));
    
    // 180度回転座標変換を適用（実際の描画範囲内で回転）
    // オフセットを除いた実際の描画範囲内での相対座標に変換（調整後サイズを使用）
    const offsetX = (adjustedDrawingAreaSize.width - coords.actualWidth) / 2;
    const offsetY = (adjustedDrawingAreaSize.height - coords.actualHeight) / 2;
    const relativeX = scaledX - offsetX;
    const relativeY = scaledY - offsetY;
    
    // 実際の描画範囲内で180度回転
    const rotatedRelativeX = coords.actualWidth - relativeX;
    const rotatedRelativeY = coords.actualHeight - relativeY;
    
    // オフセットを加えて最終座標を計算
    scaledX = rotatedRelativeX + offsetX;
    scaledY = rotatedRelativeY + offsetY;
    console.log(`🌟 180度回転完了: scaledX=${scaledX.toFixed(1)}, scaledY=${scaledY.toFixed(1)}`);
    
    //console.log('180度回転座標変換適用済み:', scaledX.toFixed(1), scaledY.toFixed(1));
    
    // ペンの太さと色を適用
    const thickness = data.thickness || 4;
    console.log(`🌟 ペンの太さ設定完了: thickness=${thickness}`);
    
    // 🗑️ ネオン機能を無効化（座標問題解決のため）
    console.log(`🌟 ネオン色チェック: color=${data.color}, neonIndex=${data.neonIndex} - ネオン機能は無効化されています`);
    if (false && data.color === 'neon' && typeof data.neonIndex === 'number') {
      console.log(`🌟 ネオン色分岐に入りました`);
      const writerId = data.writerId || 'writer1';
      
      // 前の描画データから前の位置を取得
      const allWriterData = writerDrawingData[writerId] || [];
      const prevCmd = allWriterData[allWriterData.length - 2]; // 最新は現在のコマンド
      
      if (prevCmd && (prevCmd.type === 'start' || prevCmd.type === 'draw')) {
        const prevCoords = transformCoordinatesWithAspectRatio(prevCmd.x, prevCmd.y, senderCanvasSize, drawingAreaSize);
        const prevScaledX = prevCoords.x;
        const prevScaledY = prevCoords.y;
        
        // 現在のパスを管理
        if (!writerNeonPaths[writerId]) {
          writerNeonPaths[writerId] = [];
        }
        
        // 描画中は白い線で表示（redrawCanvasに任せて複数Writer混在を防ぐ）
        
        // パスに座標を追加
        writerNeonPaths[writerId].push({
          x: scaledX, y: scaledY,
          thickness: data.thickness,
          neonIndex: data.neonIndex
        });
        
        // パス完了タイマーをリセット（500ms後に完了とみなす）
        if (neonPathTimers[writerId]) {
          clearTimeout(neonPathTimers[writerId]);
        }
        neonPathTimers[writerId] = setTimeout(() => {
          // ネオンパス処理は削除済み(writerId);
        }, 500);
        
        // リアルタイム描画は独立したWriter描画で実行（混在防止）
        const prevCmd = allWriterData[allWriterData.length - 2];
        if (prevCmd) {
          // ネオン色の場合は白い線でリアルタイム描画
          const whiteCmd = { ...data, color: 'white', thickness: Math.max(1, (data.thickness || 4) - 3) };
          drawRealtimeWriterPath(writerId, whiteCmd, prevCmd);
        }
      } else {
        // startコマンド直後の最初のdrawの場合 - 独立した点描画で実行
        
        // 点描画をリアルタイムで実行
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        
        const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
        const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
        const areaLeft = areaCenterX - drawingAreaSize.width / 2;
        const areaTop = areaCenterY - drawingAreaSize.height / 2;
        
        ctx.translate(areaCenterX, areaCenterY);
        ctx.rotate(Math.PI);
        ctx.translate(-areaCenterX, -areaCenterY);
        
        ctx.beginPath();
        ctx.arc(areaLeft + scaledX, areaTop + scaledY, Math.max(1, (data.thickness || 4) - 3) / 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.9;
        ctx.fill();
        
        ctx.restore();
        
        // 新しいパスを開始
        writerNeonPaths[writerId] = [{
          x: scaledX, y: scaledY,
          thickness: data.thickness,
          neonIndex: data.neonIndex
        }];
        
        // タイマーを設定
        if (neonPathTimers[writerId]) {
          clearTimeout(neonPathTimers[writerId]);
        }
        neonPathTimers[writerId] = setTimeout(() => {
          // ネオンパス処理は削除済み(writerId);
        }, 200);
      }
    } else {
      console.log(`🌟 通常色分岐に入りました: color=${data.color}`);
      // 通常の色の場合 - リアルタイム描画は独立したWriter描画で実行（混在防止）
      const allWriterData = writerDrawingData[writerId] || [];
      console.log(`🌟 描画データ配列確認: 長さ=${allWriterData.length}`);
      const prevCmd = allWriterData[allWriterData.length - 2]; // 最新は現在のコマンド
      console.log(`🌟 前のコマンド確認: prevCmd=${prevCmd ? prevCmd.type : 'なし'}`);
      if (prevCmd && (prevCmd.type === 'start' || prevCmd.type === 'draw')) {
        // console.log(`🌟 リアルタイム描画処理を実行開始`);
        // 🔥 WriterID別状態を確実に分離してリアルタイム描画
        // ctx.save(); // Canvas状態を保存
        // drawRealtimeWriterPath(writerId, data, prevCmd); // この関数が存在しないためコメントアウト
        // ctx.restore(); // Canvas状態を復元
        // console.log(`🌟 リアルタイム描画処理をスキップしました（関数が存在しません）`);
        // console.log(`🌟 リアルタイム描画処理完了`);
      } else {
        console.log(`🌟 前のコマンドがないため、リアルタイム描画をスキップ`);
      }
      
      console.log(`🌟 パス完了タイマー設定開始`);
      // パス完了タイマーを設定（500ms後に完了とみなす）
      if (normalPathTimers[writerId]) {
        clearTimeout(normalPathTimers[writerId]);
      }
      normalPathTimers[writerId] = setTimeout(() => {
        // finishNormalPath(writerId); // この関数が存在しないためコメントアウト
        console.log(`🌟 パス完了タイマー実行（関数が存在しないためスキップ）: ${writerId}`);
      }, 500);
      console.log(`🌟 パス完了タイマー設定完了`);
    }
    console.log(`🌟 色分岐処理完了 - 次の処理へ`);
    
    // 🎯 move描画での描画エリア内判定
    console.log(`🌟 描画エリア内判定処理開始`);
    const finalX = areaLeft + scaledX;
    const finalY = areaTop + scaledY;
    // 🔥 エリア判定を一時的に無効化（座標問題解決のため）
    const isInDrawingArea = true; // 強制的にエリア内扱い
    const realAreaCheck = (finalX >= areaLeft && finalX <= areaLeft + drawingAreaSize.width &&
                          finalY >= areaTop && finalY <= areaTop + drawingAreaSize.height);
    const areaStatus = realAreaCheck ? '✅ エリア内' : '❌ エリア外(無効化)';
    console.log(`🎯 MOVE描画位置判定: ${areaStatus} 位置(${finalX.toFixed(1)}, ${finalY.toFixed(1)}) エリア範囲: ${areaLeft.toFixed(1)}-${(areaLeft + drawingAreaSize.width).toFixed(1)}, ${areaTop.toFixed(1)}-${(areaTop + drawingAreaSize.height).toFixed(1)}`);
    
    // 星エフェクトが有効で受信側に星を表示（2回に1回の頻度）
    console.log(`🌟 星エフェクト処理ブロックに到達 - WriterID: ${writerId}, starEffect=${data.starEffect}`);
    const shouldCreateStar = data.starEffect && Math.random() < 0.5;
    console.log(`⭐ 星エフェクトチェック: starEffect=${data.starEffect}, 判定=${shouldCreateStar}`);
    if (shouldCreateStar) {
      console.log(`🌟 星を生成します！ 位置: finalX=${finalX}, finalY=${finalY}`);
      
      // 🔧 ペン描画座標系を使用（processDrawingForBack2と同じ変換）
      const back2Canvas = document.getElementById('back2Canvas') || drawCanvas;
      const currentCanvasWidth = back2Canvas.width;
      const currentCanvasHeight = back2Canvas.height;
      
      // 書き手側座標を受信側キャンバスサイズにスケール変換
      const writerCanvasWidth = currentWriterCanvasSize.width;
      const writerCanvasHeight = currentWriterCanvasSize.height;
      const scaledPenX = (data.x / writerCanvasWidth) * currentCanvasWidth;
      const scaledPenY = (data.y / writerCanvasHeight) * currentCanvasHeight;
      
      // 180度回転を適用（processDrawingForBack2と同じ）
      const rotatedPenX = currentCanvasWidth - scaledPenX;
      const rotatedPenY = currentCanvasHeight - scaledPenY;
      
      // back2Canvasの位置を取得してページ座標に変換
      const back2Rect = back2Canvas.getBoundingClientRect();
      const pageX = back2Rect.left + rotatedPenX;
      const pageY = back2Rect.top + rotatedPenY;
      
      console.log(`🔧 星エフェクト座標修正: 送信(${data.x.toFixed(1)}, ${data.y.toFixed(1)}) -> ペン座標(${pageX.toFixed(1)}, ${pageY.toFixed(1)})`);
      
      createReceiverStar(pageX, pageY);
      // console.log(`🌟 createReceiverStar関数を呼び出しました！`);
    }
    
    // 妖精の粉エフェクトが有効で受信側に妖精の粉を表示
    console.log(`✨ 妖精の粉チェック: fairyDustEffect=${data.fairyDustEffect} (書き手側チェックボックスの状態)`);
    if (data.fairyDustEffect) {
      // 🔧 ペン描画座標系を使用（processDrawingForBack2と同じ変換）
      const back2Canvas = document.getElementById('back2Canvas') || drawCanvas;
      const currentCanvasWidth = back2Canvas.width;
      const currentCanvasHeight = back2Canvas.height;
      
      // 書き手側座標を受信側キャンバスサイズにスケール変換
      const writerCanvasWidth = currentWriterCanvasSize.width;
      const writerCanvasHeight = currentWriterCanvasSize.height;
      const scaledPenX = (data.x / writerCanvasWidth) * currentCanvasWidth;
      const scaledPenY = (data.y / writerCanvasHeight) * currentCanvasHeight;
      
      // 180度回転を適用（processDrawingForBack2と同じ）
      const rotatedPenX = currentCanvasWidth - scaledPenX;
      const rotatedPenY = currentCanvasHeight - scaledPenY;
      
      // back2Canvasの位置を取得してページ座標に変換
      const back2Rect = back2Canvas.getBoundingClientRect();
      const pageX = back2Rect.left + rotatedPenX;
      const pageY = back2Rect.top + rotatedPenY;
      console.log(`🔧 妖精エフェクト座標修正: 送信(${data.x.toFixed(1)}, ${data.y.toFixed(1)}) -> ペン座標(${pageX.toFixed(1)}, ${pageY.toFixed(1)})`);
      createReceiverFairyDust(pageX, pageY);
    }
    
    // ハートエフェクトが有効で受信側にハートを表示（4回に1回の頻度）
    console.log(`💖 ハートチェック: heartEffect=${data.heartEffect} (書き手側チェックボックスの状態)`);
    if (data.heartEffect && Math.random() < 0.25) {
      // 🔧 ペン描画座標系を使用（processDrawingForBack2と同じ変換）
      const back2Canvas = document.getElementById('back2Canvas') || drawCanvas;
      const currentCanvasWidth = back2Canvas.width;
      const currentCanvasHeight = back2Canvas.height;
      
      // 書き手側座標を受信側キャンバスサイズにスケール変換
      const writerCanvasWidth = currentWriterCanvasSize.width;
      const writerCanvasHeight = currentWriterCanvasSize.height;
      const scaledPenX = (data.x / writerCanvasWidth) * currentCanvasWidth;
      const scaledPenY = (data.y / writerCanvasHeight) * currentCanvasHeight;
      
      // 180度回転を適用（processDrawingForBack2と同じ）
      const rotatedPenX = currentCanvasWidth - scaledPenX;
      const rotatedPenY = currentCanvasHeight - scaledPenY;
      
      // back2Canvasの位置を取得してページ座標に変換
      const back2Rect = back2Canvas.getBoundingClientRect();
      const pageX = back2Rect.left + rotatedPenX;
      const pageY = back2Rect.top + rotatedPenY;
      console.log(`🔧 ハートエフェクト座標修正: 送信(${data.x.toFixed(1)}, ${data.y.toFixed(1)}) -> ペン座標(${pageX.toFixed(1)}, ${pageY.toFixed(1)})`);
      createReceiverHeart(pageX, pageY);
    }
    
    //console.log('DRAW描画完了');
  } else if (data.type === "playVideo") {
    // 🔸 ビデオ再生処理
    //console.log(`📹 ビデオ再生指示を受信（サイズ: ${data.size || 100}%）`);
    if (data.size) {
      currentVideoSize = data.size;
    }
    playVideoWithSize();
  } else if (data.type === "videoSize") {
    // 🔸 ビデオサイズ変更
    currentVideoSize = data.size;
    //console.log(`📐 ビデオサイズを${data.size}%に設定`);
    
    // 動画背景のサイズも更新
    if (videoBackgroundElement && isVideoBackgroundActive) {
      updateVideoBackgroundSize();
    }
  } else if (data.type === "penThickness") {
    // ペンの太さ変更通知を受信
    //console.log(`✏️ ペンの太さを${data.thickness}に変更`);
  } else if (data.type === "penColor") {
    // ペンの色変更通知を受信
    //console.log(`🎨 ペンの色を${data.color}に変更`);
  } else if (data.type === "starEffect") {
    // 星エフェクト状態変更通知を受信
    starEffectEnabled = data.enabled;
    // //console.log(`⭐ 星エフェクト: ${starEffectEnabled ? 'ON' : 'OFF'}`);
  } else if (data.type === "fairyDustEffect") {
    // 妖精の粉エフェクト状態変更通知を受信
    fairyDustEffectEnabled = data.enabled;
    // //console.log(`✨ 妖精の粉エフェクト状態変更: ${fairyDustEffectEnabled ? 'ON' : 'OFF'}`);
    // //console.log(`✨ 受信した妖精の粉データ:`, data);
  } else if (data.type === "heartEffect") {
    // ハートエフェクト状態変更通知を受信
    heartEffectEnabled = data.enabled;
    // //console.log(`💖 ハートエフェクト状態変更: ${heartEffectEnabled ? 'ON' : 'OFF'}`);
    // //console.log(`💖 受信したハートエフェクトデータ:`, data);
  } else if (data.type === "downloadRotated") {
    // 🔸 180度回転ダウンロード要求を受信
    if (data.paperSize) {
      currentPaperSize = data.paperSize;
      //console.log(`📤 180度回転ダウンロード用紙サイズ: ${currentPaperSize}`);
    }
    if (data.printMode) {
      currentPrintMode = data.printMode;
      //console.log(`🖨️ 印刷モード: ${currentPrintMode}`);
    }
    //console.log("🔄 送信ボタン押下 → 180度回転ダウンロード処理実行");
    downloadRotated();
  } else if (data.type === "videoBackground") {
    // 🎬 動画背景処理
    if (data.action === "prepare") {
      //console.log('🎬 動画背景準備開始:', data.videoSrc);
      prepareVideoBackground(data.videoSrc);
    } else if (data.action === "play") {
      //console.log('🎬 動画背景再生開始');
      playVideoBackground();
    } else if (data.action === "end") {
      //console.log('🎬 動画背景終了');
      endVideoBackground();
    }
  } else if (data.type === "doorAnimation") {
    // 🔸 扉演出を開始
    const imageSrc = data.imageSrc || data.backgroundSrc;
    const action = data.action || "start";
    //console.log('🚪 扉演出を開始:', imageSrc, 'Action:', action);
    //console.log('🚪 受信データ全体:', data);
    
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
    //console.log('🚪 特殊背景を設定:', data.src);
    setSpecialBackgroundWithRiseEffect(data.src, data.canvasSize);
  } else if (data.type === "devSettings") {
    // 🔸 Dev Tool設定受信
    const oldCanvasScale = devCanvasScale;
    devCanvasScale = data.canvasScale || 1.4;
    devAnimationStartWaitTime = data.animationStartWaitTime || 0.1;
    devRotationWaitTime = (data.rotationWaitTime || 1.0) - 3.0; // 3秒短縮
    videoPattern = data.videoPattern || 1;
    printDelayTime = data.printDelayTime || 5.0;
    console.log(`🔧 Dev設定受信: scale=${devCanvasScale}, animationWait=${devAnimationStartWaitTime}, rotationWait=${devRotationWaitTime}, videoPattern=${videoPattern}, printDelayTime=${printDelayTime}`);
    
    // 🔸 back2.pngのサイズ更新（スケール変更時のみ）
    if (back2Wrapper && back2Image && oldCanvasScale !== devCanvasScale) {
      updateBack2Size(devCanvasScale);
      console.log(`🔄 back2.png devSettings対応: スケール=${devCanvasScale}`);
    }
    
    // 🔸 キャンバススケール変更時に描画エリアも連動してスケール
    if (oldCanvasScale !== 0 && oldCanvasScale !== devCanvasScale) {
      const scaleRatio = devCanvasScale / oldCanvasScale;
      
      // 描画エリアサイズを連動してスケール
      if (null && window.nullBasedDrawingAreaSize && window.nullBasedDrawingAreaSize.isActive) {
        // 🔒 背景画像サイズを優先（スケールは無視）
        drawingAreaSize.width = window.nullBasedDrawingAreaSize.width;
        drawingAreaSize.height = window.nullBasedDrawingAreaSize.height;
        console.log(`🔒 背景画像サイズを優先（スケール無視）: ${drawingAreaSize.width}x${drawingAreaSize.height}`);
      } else {
        drawingAreaSize.width = Math.round(drawingAreaSize.width * scaleRatio);
        drawingAreaSize.height = Math.round(drawingAreaSize.height * scaleRatio);
      }
      
      // 描画エリアの位置（オフセット）も連動してスケール（動的背景は除く）
      if (!false) {
        drawingAreaOffset.x = Math.round(drawingAreaOffset.x * scaleRatio);
        drawingAreaOffset.y = Math.round(drawingAreaOffset.y * scaleRatio);
        console.log('📏 通常背景: 描画エリア位置をスケール調整');
      } else {
        console.log('🔒 動的背景: 描画エリア位置のスケール調整をスキップ（CSS中央配置維持）');
      }
      
      // GUI入力値も更新
      document.getElementById('centerX').value = drawingAreaOffset.x;
      document.getElementById('centerY').value = drawingAreaOffset.y;
      document.getElementById('areaWidth').value = drawingAreaSize.width;
      document.getElementById('areaHeight').value = drawingAreaSize.height;
      
      //console.log(`📏 Dev設定による描画エリアスケール調整: サイズ${drawingAreaSize.width}x${drawingAreaSize.height}, 位置(${drawingAreaOffset.x}, ${drawingAreaOffset.y}) (倍率: ${scaleRatio.toFixed(2)})`);
      
      // 描画エリアが表示中なら更新
      if (showDrawingAreaFrame) {
        showDrawingArea();
      }
    }
    
    // キャンバスサイズを即座に適用
    applyCanvasScale();
  } else if (data.type === "printRotatedImage") {
    // 🔸 更に180度回転画像の印刷処理
    //console.log("🖨️ 受信側: printRotatedImage メッセージを受信");
    //console.log("📥 受信データタイプ:", data.printType);
    //console.log("📄 受信用紙サイズ:", data.paperSize);
    
    // 印刷モードを更新
    if (data.printMode) {
      currentPrintMode = data.printMode;
      //console.log(`🖨️ 印刷モード更新: ${currentPrintMode}`);
    }
    
    // 180度回転確認フロー付きの印刷処理を実行
    console.log('🚨 printRotatedImage受信 → sendCanvasToMainProcess実行');
    console.log(`📊 印刷データ: 用紙サイズ=${data.paperSize || 'A4'}, タイプ=${data.printType || 'pen'}, モード=${currentPrintMode}`);
    
    // 用紙サイズを更新
    if (data.paperSize) {
      currentPaperSize = data.paperSize;
    }
    
    // 180度回転確認フロー付きの印刷処理を実行
    sendCanvasToMainProcess();
    
    console.log('✅ printRotatedImage処理完了（180度回転確認フロー実行）');
    
    // 🤖 SwitchBotボット押下（チェックボックスの状態を確認）
    if (data.switchBotEnabled) {
      //console.log("🤖 SwitchBot有効：2秒後にボット押下実行");
      // 2秒後にSwitchBotシーケンスを開始
      setTimeout(() => {
        executeSwitchBotSequence();
      }, 2000);
    } else {
      //console.log("🤖 SwitchBot無効：ボット押下をスキップ");
    }
  } else if (data.type === "startRotationAnimation") {
    // 🔸 回転アニメーション開始
    //console.log("🎬 回転アニメーション開始");
    //console.log(`⏱️ 待機時間: ${data.waitTime}秒`);
    // //console.log(`🎆 花火: ${data.fireworksEnabled ? '有効' : '無効'}`);
    // //console.log(`🎊 紙吹雪: ${data.confettiEnabled ? '有効' : '無効'}`);
    
    // アニメーション実行（チェックボックスの状態を渡す）
    prepareAndRunAnimation(data.waitTime, data.fireworksEnabled, data.confettiEnabled);
  } else if (data.type === "fireworksTest") {
    // 🔸 花火テスト指示を受信（無効化：送信ボタンでのみ花火実行）
    // //console.log("🎆 送信側から花火テスト指示を受信（無効化されています）");
    // createReceiverFireworks(); // 無効化
  } else if (data.type === "switchBotTest") {
    // 🔸 SwitchBotテスト指示を受信
    //console.log("🤖 送信側からSwitchBotテスト指示を受信");
    executeSwitchBotSequence();
  } else if (data.type === "videoPlaybackToggle") {
    // 🎬 映像再生機能の切り替え
    console.log(`🎬 映像再生設定を受信: ${data.enabled ? 'ON' : 'OFF'}`);
    if (data.enabled) {
      window.videoPlaybackDisabled = false;
      // 動画ウィンドウを作成
      createVideoWindow();
    } else {
      window.videoPlaybackDisabled = true;
      // 動画ウィンドウにリセット指示を送信
      sendVideoCommand('reset');
    }
  } else if (data.type === "printMode") {
    // 🔸 印刷モード変更通知を受信
    currentPrintMode = data.mode;
    //console.log(`🖨️ 印刷モード変更: ${currentPrintMode}`);
  } else if (data.type === "backgroundTransform") {
    // 🔸 背景変形パラメータを受信
    backgroundScale = data.scale || 1.0;
    backgroundOffsetY = data.offsetY || 0;
    //console.log(`🖼️ 背景変形: スケール=${backgroundScale.toFixed(1)}, オフセットY=${backgroundOffsetY}`);
    // 再描画処理は削除済み;
  }
}

function sendCanvasToMainProcess() {
  //console.log("🖨️ 送信ボタン印刷処理開始");
  //console.log(`- 描画エリアサイズ: ${drawingAreaSize.width} x ${drawingAreaSize.height}`);
  //console.log(`- []項目数: ${[].length}`);
  //console.log(`- senderCanvasSize: ${senderCanvasSize.width} x ${senderCanvasSize.height}`);
  //console.log(`- drawingAreaOffset: ${drawingAreaOffset.x}, ${drawingAreaOffset.y}`);
  
  // 🔸 デバッグ：[]の中身を確認
  if ([].length > 0) {
    //console.log("📝 []最初の5項目:");
    [].slice(0, 5).forEach((cmd, i) => {
      //console.log(`  ${i}: type=${cmd.type}, x=${cmd.x}, y=${cmd.y}`);
    });
  } else {
    //console.log("⚠️ []が空です！描画データが受信されていません。");
  }

  // 🔸 printPen()と同じ処理を使用
  const printCanvas = document.createElement('canvas');
  const printCtx = printCanvas.getContext('2d');
  
  // 印刷用キャンバスサイズを設定
  printCanvas.width = drawingAreaSize.width;
  printCanvas.height = drawingAreaSize.height;
  console.log('🖨️ 送信ボタン印刷キャンバスサイズ:', printCanvas.width, 'x', printCanvas.height);
  
  // JPEG変換のため白背景を設定
  printCtx.fillStyle = '#ffffff';
  printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);
  
  // 送信ボタン印刷用（回転なし）
  console.log('🖨️ 送信ボタン印刷用Canvas設定開始');
  printCtx.save();
  console.log('🖨️ 送信ボタン印刷用Canvas設定完了（回転なし）');
  
  // 🔥 WriterID別に独立して描画（線接続防止）
  Object.keys(writerDrawingData).forEach(writerId => {
    if (writerDrawingData[writerId].length > 0) {
      console.log(`🖨️ 送信ボタン Writer ${writerId} の描画開始: ${writerDrawingData[writerId].length}コマンド`);
      drawWriterCommandsForPrint(writerDrawingData[writerId], writerId, printCtx);
    }
  });
  
  // 旧方式フォールバック（互換性）
  if (Object.keys({}).length === 0 && [].length > 0) {
    console.log('🖨️ 送信ボタンフォールバック: 統合データで印刷');
    let lastWriterId = null;
    [].forEach((cmd, index) => {
      if (cmd.type === "start") {
        // WriterIDが変わった場合は新しいパスを開始
        if (cmd.writerId !== lastWriterId) {
          printCtx.beginPath();
          lastWriterId = cmd.writerId;
        }
        const scaledX = (cmd.x / senderCanvasSize.width) * printCanvas.width;
        const scaledY = (cmd.y / senderCanvasSize.height) * printCanvas.height;
        printCtx.moveTo(scaledX, scaledY);
        if (index < 3) console.log('🖨️ 送信座標[' + index + ']:', cmd.x, cmd.y, '->', scaledX, scaledY);
      } else if (cmd.type === "draw") {
        // WriterIDが変わった場合は新しいパスを開始
        if (cmd.writerId !== lastWriterId) {
          printCtx.beginPath();
          lastWriterId = cmd.writerId;
          const scaledX = (cmd.x / senderCanvasSize.width) * printCanvas.width;
          const scaledY = (cmd.y / senderCanvasSize.height) * printCanvas.height;
          printCtx.moveTo(scaledX, scaledY);
          return;
        }
        
        const scaledX = (cmd.x / senderCanvasSize.width) * printCanvas.width;
        const scaledY = (cmd.y / senderCanvasSize.height) * printCanvas.height;
        const thickness = cmd.thickness || 4;
        printCtx.lineWidth = thickness * (printCanvas.width / senderCanvasSize.width);
        printCtx.strokeStyle = cmd.color === 'black' ? '#000' : (cmd.color === 'white' ? '#fff' : (cmd.color === 'green' ? '#008000' : (cmd.color === 'pink' ? '#ff69b4' : (cmd.color || '#000'))));
        printCtx.lineTo(scaledX, scaledY);
        printCtx.stroke();
        if (index < 3) console.log('🖨️ 送信座標[' + index + ']:', cmd.x, cmd.y, '->', scaledX, scaledY);
      }
    });
  }
  
  printCtx.restore();
  console.log('🖨️ 送信ボタン描画完了 (0度回転)');
  
  // 印刷用データを作成（0度回転）
  console.log('🖨️ 送信ボタン印刷: 0度回転で印刷データ作成');
  const imageDataUrl = printCanvas.toDataURL("image/png");
  
  // 🔍 印刷データ確認（0度回転）
  console.log('🔍 === 印刷データ0度回転確認開始 ===');
  
  // 確認用キャンバスを作成して元データと比較
  const verifyCanvas = document.createElement('canvas');
  const verifyCtx = verifyCanvas.getContext('2d');
  verifyCanvas.width = printCanvas.width;
  verifyCanvas.height = printCanvas.height;
  
  // 元データ（回転なし）を確認用キャンバスに描画
  [].forEach((cmd, index) => {
    if (cmd.type === "start") {
      verifyCtx.beginPath();
      const scaledX = (cmd.x / senderCanvasSize.width) * verifyCanvas.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * verifyCanvas.height;
      verifyCtx.moveTo(scaledX, scaledY);
      if (index < 2) console.log('🔍 元データ[' + index + ']:', scaledX, scaledY);
    } else if (cmd.type === "draw") {
      const scaledX = (cmd.x / senderCanvasSize.width) * verifyCanvas.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * verifyCanvas.height;
      verifyCtx.lineTo(scaledX, scaledY);
      verifyCtx.stroke();
    }
  });
  
  // 回転確認：最初の座標を比較
  if ([].length > 0) {
    const firstStart = [].find(cmd => cmd.type === "start");
    if (firstStart) {
      const originalX = (firstStart.x / senderCanvasSize.width) * printCanvas.width;
      const originalY = (firstStart.y / senderCanvasSize.height) * printCanvas.height;
      
      // 180度回転後の期待座標
      const expectedRotatedX = printCanvas.width - originalX;
      const expectedRotatedY = printCanvas.height - originalY;
      
      console.log('🔍 回転確認:');
      console.log('  元座標:', originalX.toFixed(1), originalY.toFixed(1));
      console.log('  期待180度回転座標:', expectedRotatedX.toFixed(1), expectedRotatedY.toFixed(1));
      
      // 印刷キャンバスの実際の描画内容を確認
      const printImageData = printCtx.getImageData(0, 0, printCanvas.width, printCanvas.height);
      const verifyImageData = verifyCtx.getImageData(0, 0, verifyCanvas.width, verifyCanvas.height);
      
      // 簡単な違い確認（ピクセル数の差）
      let diffPixels = 0;
      for (let i = 0; i < printImageData.data.length; i += 4) {
        if (printImageData.data[i + 3] !== verifyImageData.data[i + 3]) { // アルファ値比較
          diffPixels++;
        }
      }
      
      console.log('🔍 画像差異ピクセル数:', diffPixels);
      
      // 回転確認をスキップして直接印刷実行（0度回転）
      console.log('✅ 0度回転で印刷実行');
      console.log('📤 印刷機にデータ送信を実行');
      
      // 🔸 印刷時に用紙サイズ情報も送信
      if (typeof ipcRenderer !== 'undefined') {
        ipcRenderer.send("save-pdf", {
          imageData: imageDataUrl,
          paperSize: currentPaperSize,
          printType: "pen"
        });
        
        console.log('✅ プリンターへの印刷命令送信完了！');
        console.log('🖨️ === 送信ボタン印刷完了（0度回転）===');
      } else {
        console.error('❌ ipcRenderer が利用できません');
      }
    } else {
      console.error('❌ 開始座標が見つかりません');
    }
  } else {
    console.error('❌ 描画データがありません');
  }
}

// 🔸 受信側キャンバス内容を0度に戻して保存する関数
function saveRotatedImageAs0Degree() {
  try {
    console.log('💾 === 0度回転保存開始 ===');
    console.log('💾 キャンバス確認:', canvas ? 'OK' : 'キャンバスなし');
    console.log('💾 ipcRenderer確認:', typeof ipcRenderer !== 'undefined' ? 'OK' : 'なし');
    
    // 新しいキャンバスを作成
    const saveCanvas = document.createElement('canvas');
    const saveCtx = saveCanvas.getContext('2d');
    
    // 受信側キャンバスと同じサイズ
    saveCanvas.width = canvas.width;
    saveCanvas.height = canvas.height;
    console.log('💾 保存キャンバスサイズ:', saveCanvas.width, 'x', saveCanvas.height);
    
    // 白背景を描画
    saveCtx.fillStyle = '#ffffff';
    saveCtx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);
    console.log('💾 白背景描画完了');
    
    // 受信側キャンバスを直接コピー（回転なし）
    saveCtx.drawImage(canvas, 0, 0);
    
    console.log('💾 キャンバスコピー完了（回転なし）');
    
    // 画像データを作成
    const imageDataUrl = saveCanvas.toDataURL("image/png");
    console.log('💾 画像データ作成完了, データサイズ:', imageDataUrl.length);
    
    // Electronのメインプロセスに保存指示を送信
    if (typeof ipcRenderer !== 'undefined') {
      const filename = "rotated_0_degree_" + Date.now() + ".png";
      console.log('💾 保存ファイル名:', filename);
      
      ipcRenderer.send("save-image", {
        imageData: imageDataUrl,
        filename: filename
      });
      console.log('💾 0度回転画像保存指示送信完了');
    } else {
      console.error('❌ ipcRenderer が利用できません');
    }
    
    console.log('💾 === 0度回転保存完了 ===');
  } catch (error) {
    console.error('❌ 0度回転保存でエラー発生:', error);
  }
}

// 🔸 描画データのみを0度回転で保存する関数
function saveDrawingDataAs0Degree() {
  try {
    console.log('💾 === 描画データ0度回転保存開始 ===');
    
    // 全執筆者データを統合
    const consolidatedData = consolidateDrawingData();
    console.log('💾 統合描画データ数:', consolidatedData.length);
    
    if (consolidatedData.length === 0) {
      console.log('💾 描画データがないため保存をスキップ');
      return;
    }
    
    // 新しいキャンバスを作成
    const saveCanvas = document.createElement('canvas');
    const saveCtx = saveCanvas.getContext('2d');
    
    // 送信側と同じサイズ
    saveCanvas.width = senderCanvasSize.width;
    saveCanvas.height = senderCanvasSize.height;
    console.log('💾 保存キャンバスサイズ:', saveCanvas.width, 'x', saveCanvas.height);
    
    // 白背景を描画
    saveCtx.fillStyle = '#ffffff';
    saveCtx.fillRect(0, 0, saveCanvas.width, saveCanvas.height);
    console.log('💾 白背景描画完了');
    
    // 描画データを回転なしで描画
    console.log('💾 Canvas設定開始');
    saveCtx.save();
    console.log('💾 Canvas設定完了（回転なし）');
    
    console.log('💾 統合描画データを描画開始（回転なし）');
    consolidatedData.forEach((cmd, index) => {
      if (cmd.type === "start") {
        saveCtx.beginPath();
        saveCtx.moveTo(cmd.x, cmd.y);
        if (index < 3) console.log('💾 start[' + index + ']:', cmd.x, cmd.y);
      } else if (cmd.type === "draw") {
        const thickness = cmd.thickness || 4;
        saveCtx.lineWidth = thickness;
        
        // ネオン効果の処理
        if (cmd.color === 'neon' && typeof cmd.neonIndex === 'number') {
          const interpolatedColor = getNeonColorFromIndex(cmd.neonIndex);
          saveCtx.strokeStyle = interpolatedColor;
          saveCtx.shadowBlur = 5;
          saveCtx.shadowColor = interpolatedColor;
          saveCtx.lineCap = 'round';
          saveCtx.lineJoin = 'round';
        } else {
          saveCtx.strokeStyle = cmd.color === 'black' ? '#000' : (cmd.color === 'white' ? '#fff' : (cmd.color === 'green' ? '#008000' : (cmd.color === 'pink' ? '#ff69b4' : (cmd.color || '#000'))));
        }
        
        saveCtx.lineTo(cmd.x, cmd.y);
        saveCtx.stroke();
        if (index < 3) console.log('💾 draw[' + index + ']:', cmd.x, cmd.y);
      }
    });
    
    saveCtx.restore();
    console.log('💾 描画データ描画完了 (180度回転)');
    
    // 画像データを作成
    const imageDataUrl = saveCanvas.toDataURL("image/png");
    console.log('💾 描画データ画像作成完了, データサイズ:', imageDataUrl.length);
    
    // Electronのメインプロセスに保存指示を送信
    if (typeof ipcRenderer !== 'undefined') {
      const filename = "drawing_0_degree_" + Date.now() + ".png";
      console.log('💾 保存ファイル名:', filename);
      
      ipcRenderer.send("save-image", {
        imageData: imageDataUrl,
        filename: filename
      });
      console.log('💾 描画データ保存指示送信完了');
    } else {
      console.error('❌ ipcRenderer が利用できません');
    }
    
    console.log('💾 === 描画データ0度回転保存完了 ===');
  } catch (error) {
    console.error('❌ 描画データ保存でエラー発生:', error);
  }
}

// 🔸 画像保存完了の通知を受信
if (typeof ipcRenderer !== 'undefined') {
  ipcRenderer.on('save-image-complete', (event, data) => {
    console.log('✅ 画像保存完了通知受信:', data.filePath);
  });
}

// 🔸 受信側キャンバスサイズ設定関数
function setReceiverCanvasSize() {
  
  // Dev Tool設定を適用したサイズを計算
  const newWidth = Math.floor(senderCanvasSize.width * SCALE_FACTOR * devCanvasScale);
  const newHeight = Math.floor(senderCanvasSize.height * SCALE_FACTOR * devCanvasScale);
  
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;
  
  //console.log(`🔍 キャンバスサイズ計算:`);
  //console.log(`  送信側: ${senderCanvasSize.width} x ${senderCanvasSize.height}`);
  //console.log(`  SCALE_FACTOR: ${SCALE_FACTOR}, devCanvasScale: ${devCanvasScale}`);
  //console.log(`  計算結果: ${newWidth} x ${newHeight}`);
  //console.log(`  横長確認: width(${newWidth}) > height(${newHeight}) = ${newWidth > newHeight}`);
  
  canvas.width = newWidth;
  canvas.height = newHeight;
  canvas.style.width = newWidth + "px";
  canvas.style.height = newHeight + "px";
  
  // 描画エリアサイズをキャンバスサイズに自動調整
  const oldDrawingAreaSize = { ...drawingAreaSize };
  
  // 🔒 背景画像が設定されている場合は背景画像サイズを優先
  if (null && window.nullBasedDrawingAreaSize && window.nullBasedDrawingAreaSize.isActive) {
    drawingAreaSize.width = window.nullBasedDrawingAreaSize.width;
    drawingAreaSize.height = window.nullBasedDrawingAreaSize.height;
  } else {
    drawingAreaSize.width = Math.floor(newWidth * 0.8); // キャンバスの80%
    drawingAreaSize.height = Math.floor(newHeight * 0.8);
  }
  
  // 受信側のキャンバスサイズを記録
  receiverCanvasSize = { width: newWidth, height: newHeight };
  
  //console.log(`📐 受信側キャンバスサイズ変更: ${oldWidth}x${oldHeight} → ${newWidth}x${newHeight}`);
  //console.log(`📐 描画エリアサイズ自動調整: ${oldDrawingAreaSize.width}x${oldDrawingAreaSize.height} → ${drawingAreaSize.width}x${drawingAreaSize.height}`);
}

// 🔸 Dev Tool関数
function applyCanvasScale() {
  // 送信側サイズに基づいて再計算
  setReceiverCanvasSize();
  // 再描画処理は削除済み;
}

function prepareAndRunAnimation(waitTime = null, fireworksEnabled = true, confettiEnabled = true) {
  // //console.log(`🎬 アニメーション準備開始 (待機時間: ${waitTime}秒, 花火: ${fireworksEnabled}, 紙吹雪: ${confettiEnabled})`);
  
  // 背景画像も含めてキャプチャ
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  
  // 背景画像も含めて現在の表示をキャプチャ
  redrawCanvas(true); // 背景を含めて再描画
  const imageDataUrl = canvas.toDataURL("image/png");
  continueAnimation(imageDataUrl, waitTime, fireworksEnabled, confettiEnabled);
}

function continueAnimation(imageDataUrl, waitTime, fireworksEnabled, confettiEnabled) {
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
  
  // アニメーション画像をキャンバスと全く同じ位置に配置
  const canvasRect = canvas.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  
  animationImage.style.position = "absolute";
  animationImage.style.top = `${canvasRect.top - containerRect.top}px`;
  animationImage.style.left = `${canvasRect.left - containerRect.left}px`;
  animationImage.style.marginLeft = "0";
  animationImage.style.marginTop = "0";
  
  // 初期回転状態を考慮した transform を設定（translateXは使わない）
  if (isCanvasRotated) {
    animationImage.style.transform = "rotate(180deg)";
  } else {
    animationImage.style.transform = "none";
  }
  animationImage.style.zIndex = "2";
  
  //console.log(`🎯 アニメーション画像配置: top=${canvasRect.top - containerRect.top}px, left=${canvasRect.left - containerRect.left}px`);
  
  container.appendChild(animationImage);

  runAnimationSequence(waitTime, fireworksEnabled, confettiEnabled);
}

function runAnimationSequence(waitTime = null, fireworksEnabled = true, confettiEnabled = true) {
  // 🔸 アニメーション画像を直接操作（containerではなく）
  
  // 初期状態を設定（その場に止まる）
  animationImage.style.transition = "none";
  
  // 背景画像の中心を軸とした回転の準備
  let backgroundCenterX = canvas.width / 2;
  let backgroundCenterY = canvas.height / 2; // 背景画像のY位置（中央）
  let bgWidth = 0;
  let bgHeight = 0;
  
  if (null) {
    // redrawCanvas内で使用される実際の背景画像サイズ計算ロジックを再現
    const maxWidth = canvas.width * UNIFIED_SETTINGS.canvasScale;
    const maxHeight = canvas.height * UNIFIED_SETTINGS.canvasScale;
    // 背景画像のアスペクト比計算は削除済み
    
    if (false) { // 背景画像処理は削除済み
      // 横長画像：幅を基準に
      bgWidth = maxWidth;
      bgHeight = maxWidth / imgAspect;
    } else {
      // 縦長画像：高さを基準に
      bgHeight = maxHeight;
      bgWidth = maxHeight * imgAspect;
    }
    
    // 背景画像の中心Y座標 = 中央位置
    backgroundCenterY = canvas.height / 2;
    
    //console.log(`🎯 背景画像サイズ計算結果: ${bgWidth.toFixed(1)}x${bgHeight.toFixed(1)}`);
    //console.log(`🎯 背景画像中心座標: (${backgroundCenterX.toFixed(1)}, ${backgroundCenterY.toFixed(1)})`);
    //console.log(`🎯 本来あるべき回転軸座標: キャンバス中心(${backgroundCenterX.toFixed(1)}, ${backgroundCenterY.toFixed(1)})`);
  }
  
  // アニメーション画像とキャンバスの位置関係を正確に計算
  const canvasRect = canvas.getBoundingClientRect();
  //console.log(`🎯 キャンバスの画面上の位置: (${canvasRect.left.toFixed(1)}, ${canvasRect.top.toFixed(1)})`);
  
  // 背景画像の中心の画面上の絶対座標
  const absoluteBackgroundCenterX = canvasRect.left + backgroundCenterX;
  const absoluteBackgroundCenterY = canvasRect.top + backgroundCenterY;
  
  // アニメーション画像の位置を取得
  const imageRect = animationImage.getBoundingClientRect();
  const imageCenterX = imageRect.left + imageRect.width / 2;
  const imageCenterY = imageRect.top + imageRect.height / 2;
  
  //console.log(`🎯 背景画像中心の画面絶対座標: (${absoluteBackgroundCenterX.toFixed(1)}, ${absoluteBackgroundCenterY.toFixed(1)})`);
  //console.log(`🎯 アニメーション画像中心の画面絶対座標: (${imageCenterX.toFixed(1)}, ${imageCenterY.toFixed(1)})`);
  
  const offsetX = absoluteBackgroundCenterX - imageCenterX;
  const offsetY = absoluteBackgroundCenterY - imageCenterY;
  
  // transform-originを背景画像の中心に設定（ピクセル単位で指定）
  const originX = backgroundCenterX;
  const originY = backgroundCenterY;
  animationImage.style.transformOrigin = `${originX}px ${originY}px`;
  animationImage.style.transform = isCanvasRotated ? "rotate(180deg)" : "none";
  
  //console.log(`🔄 初期状態: 背景画像中心軸での回転準備完了`);
  //console.log(`🎯 実際の回転軸座標（画面上の絶対座標）: (${absoluteBackgroundCenterX.toFixed(1)}, ${absoluteBackgroundCenterY.toFixed(1)})`);
  //console.log(`🎯 アニメーション画像の中心座標: (${imageCenterX.toFixed(1)}, ${imageCenterY.toFixed(1)})`);
  //console.log(`🎯 オフセット: (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);
  //console.log(`🎯 transform-origin（ピクセル指定）: ${originX.toFixed(1)}px ${originY.toFixed(1)}px`);
  //console.log(`🎯 背景画像情報: ${bgWidth.toFixed(1)}x${bgHeight.toFixed(1)}, 上端Y=150px`);

  // 🔸 即座に回転アニメーション開始（待機なし）
  let animationStartDelay = 100; // 0.1秒後に即座に開始
  //console.log("🎬 即座に回転アニメーション開始");

  // 🔸 調整されたタイミングでアニメーション開始
  setTimeout(() => {
    animationImage.style.transition = "transform 1.5s ease";
    
    // 背景画像の中心を軸とした180度回転アニメーション（transform-originは既に設定済み）
    animationImage.style.transform = "rotate(180deg)";
    //console.log("🔄 背景画像中心軸で0度→180度に回転アニメーション");
    //console.log(`🎯 回転中: transform-originは${backgroundCenterX.toFixed(1)}px ${backgroundCenterY.toFixed(1)}px`);
    
    // 🔄 同時にキャンバスも180度回転（180度→360度=0度）
    if (isCanvasRotated) {
      // キャンバスの座標系での背景画像中心を計算（キャンバス相対座標）
      const canvasBackgroundCenterX = backgroundCenterX;
      const canvasBackgroundCenterY = backgroundCenterY; // 中央位置
      
      // キャンバスの回転軸も背景画像の中心に設定（キャンバス座標系）
      canvas.style.transformOrigin = `${canvasBackgroundCenterX}px ${canvasBackgroundCenterY}px`;
      canvas.style.transition = 'transform 1.5s ease';
      canvas.style.transform = 'translateX(-50%) rotate(360deg)'; // translateXも含める
      //console.log("🔄 キャンバスも同時に180度回転アニメーション（180度→360度）");
      //console.log(`🔄 キャンバス回転軸（キャンバス座標）: ${canvasBackgroundCenterX.toFixed(1)}px ${canvasBackgroundCenterY.toFixed(1)}px`);
      
      // 1.5秒後にtransformをリセット（360度=0度）
      setTimeout(() => {
        canvas.style.transition = 'none';
        canvas.style.transform = 'translateX(-50%)'; // 元の位置に戻す
        canvas.style.transformOrigin = 'center center'; // デフォルトに戻す
        isCanvasRotated = false;
        //console.log("🔄 キャンバス回転アニメーション完了 - 元の向きに復帰");
      }, 1500);
    }

    // 🔸 回転アニメーションと同時にrotate.mp3を再生
    const rotateAudio = new Audio('./rotate.mp3');
    rotateAudio.volume = 0.7;
    rotateAudio.play().catch(e => {
    //console.log('rotate.mp3再生エラー:', e);
  });
    //console.log('🔊 回転アニメーション開始と同時にrotate.mp3再生');

    // 🔸 回転完了後の待機時間（書き手側の設定またはDev Tool設定を使用）
    let rotationWaitTime;
    if (waitTime !== null) {
      // 書き手側から送信された待機時間を使用
      rotationWaitTime = waitTime * 1000; // 秒をmsに変換
      console.log(`⏰ 書き手側設定：フェードイン完了後${waitTime}秒待機してから移動開始`);
    } else if (currentPaperSize === "A4" || currentPaperSize === "L") {
      rotationWaitTime = devRotationWaitTime * 1000; // Dev設定の秒数をmsに変換（既に-3秒済み）
      console.log(`⏰ ${currentPaperSize}モード：フェードイン完了後${devRotationWaitTime}秒待機してから移動開始`);
    } else {
      rotationWaitTime = 1100; // ポスター：従来通り1.1秒
      console.log("⏰ ポスターモード：フェードイン完了後1.1秒待機してから移動開始");
    }
    
    // 🔧【重要】移動アニメーション実行関数（先に定義）
    const startMoveAnimation = () => {
      // 🎬 移動アニメーション開始を動画に通知
      sendVideoCommand('animationStarted');
      console.log('🎬 移動アニメーション開始を動画に通知');
      
      animationImage.style.transition = "transform 2s ease";
      
      // 🔸 用紙サイズに応じて移動距離を調整（ウィンドウ下部を完全に通過）
      let moveDistance;
      const windowHeight = window.innerHeight || 1000; // ウィンドウ高さを取得
      const extraDistance = 500; // さらに500px下まで移動
      
      if (currentPaperSize === "poster") {
        moveDistance = -(windowHeight + extraDistance); // ウィンドウ高さ + 500px
        //console.log(`📦 ポスターモード：移動距離 ${moveDistance}px（ウィンドウ高さ: ${windowHeight}px）`);
      } else if (currentPaperSize === "L") {
        moveDistance = -(windowHeight + extraDistance); // ウィンドウ高さ + 500px  
        //console.log(`📦 L版モード：移動距離 ${moveDistance}px（ウィンドウ高さ: ${windowHeight}px）`);
      } else {
        moveDistance = -(windowHeight + extraDistance); // ウィンドウ高さ + 500px  
        //console.log(`📦 A4モード：移動距離 ${moveDistance}px（ウィンドウ高さ: ${windowHeight}px）`);
      }
      
      // 🔸 下方向への移動（180度回転を維持）
      animationImage.style.transform = `rotate(180deg) translateY(${moveDistance}px)`;

      // 🔸 用紙サイズに応じて待機時間を調整（全体的に5秒延長）
      let waitTime;
      if (currentPaperSize === "poster") {
        waitTime = 9000; // ポスター：移動完了後7秒待機（2秒 + 5秒 = 7秒）
        //console.log("⏰ ポスターモード：移動後9秒待機");
      } else if (currentPaperSize === "L") {
        waitTime = 7000; // L版：7秒待機（2秒 + 5秒 = 7秒）
        //console.log("⏰ L版モード：移動後7秒待機");
      } else {
        waitTime = 7000; // A4：7秒待機（2秒 + 5秒 = 7秒）
        //console.log("⏰ A4モード：移動後7秒待機");
      }

      setTimeout(() => {
        //console.log('🎬 アニメーション完了後5秒追加待機完了、キャンバス表示開始');
        
        if (animationImage && animationImage.parentNode) {
          animationImage.parentNode.removeChild(animationImage);
          animationImage = null;
        }

        // 描画データクリア処理は削除済み
        canvas.style.display = "block";
        //console.log('🎨 次のキャンバスを表示');

        if (lastBackgroundSrc) {
          const img = new Image();
          img.src = lastBackgroundSrc;
          img.onload = () => {
            //console.log('🎨 最新の背景画像を再適用');
            // 背景画像再適用処理は削除済み（既に適用済みのため）
          };
        }
        
        // 🚪 送信アニメーション完了後に扉タイマーを開始（back6.png状態の場合）
        if (isCanvasRotated && lastBackgroundSrc && lastBackgroundSrc.includes('back6.png')) {
          scheduleDoorClosing();
        }
      }, waitTime); // 🔸 用紙サイズに応じた待機時間（5秒延長済み）
    };
    
    // 🔧【重要】フェードイン完了イベントをリッスンして移動アニメーション開始
    const handleFadeInComplete = () => {
      const fadeInCompleteTime = performance.now();
      console.log('🎬 フェードイン完了イベント受信 - 待機時間カウント開始');
      
      setTimeout(() => {
        const moveAnimationStartTime = performance.now();
        const totalWaitTime = moveAnimationStartTime - fadeInCompleteTime;
        console.log('🎬 フェードイン完了後の待機時間経過 - 移動アニメーション開始');
        console.log(`⏱️ フェードイン完了→移動アニメーション開始: ${totalWaitTime.toFixed(2)}ms (設定: ${rotationWaitTime}ms)`);
        startMoveAnimation();
      }, rotationWaitTime);
    };
    
    // 背景5以外の通常のアニメーションでは、回転完了後に直接移動アニメーションを開始
    if (!window.isDevWhiteBackground) {
      const delayTime = 1500 + rotationWaitTime;
      console.log(`🎬 通常アニメーション: ${delayTime}ms後に移動開始予約 (回転1.5秒 + 待機${rotationWaitTime}ms)`);
      // 回転アニメーション（1.5秒）+ 待機時間後に移動開始
      setTimeout(() => {
        console.log('🎬 通常アニメーション: タイマー発火 - 移動アニメーション関数を呼び出し');
        try {
          startMoveAnimation();
        } catch (error) {
          console.error('🎬 移動アニメーション実行エラー:', error);
        }
      }, delayTime); // 回転1.5秒 + 待機時間
    } else {
      console.log('🎬 背景5モード: fadeInCompleteイベント待機');
    }
    
    // 🔸 回転完了後1秒で花火エフェクトを開始（チェックボックスが有効な場合のみ）
    setTimeout(() => {
      // 花火が有効で、既に実行中でない場合のみ実行
      if (fireworksEnabled && !fireworksInProgress) {
        // //console.log('🎆 回転アニメーション完了後1秒で花火を実行');
        createReceiverFireworks();
      } else if (!fireworksEnabled) {
        // //console.log('🎆 花火演出は無効に設定されています');
      } else {
        // //console.log('🎆 花火は既に実行中のため、回転アニメーションでの花火実行をスキップ');
      }
      
      // 🔸 紙吹雪エフェクト（チェックボックスが有効な場合のみ）
      if (confettiEnabled) {
        // 🔸 移動アニメーション1.5秒前に紙吹雪エフェクトを追加（clack.mp3再生）
        const confettiDelay = rotationWaitTime - 1500; // 移動開始1.5秒前
        setTimeout(() => {
          createConfettiEffectWithClack();
        }, confettiDelay);
      } else {
        // //console.log('🎊 紙吹雪演出は無効に設定されています');
      }
    }, 2500); // 回転完了後1秒で実行（回転1.5秒 + 1秒 = 2.5秒後）
    
    // 🔧【重要】フェードイン完了イベントリスナーを追加
    window.addEventListener('fadeInComplete', handleFadeInComplete, { once: true });
    console.log('🎬 フェードイン完了イベントリスナー追加完了');

  }, animationStartDelay); // 🔸 用紙サイズに応じた遅延時間
}

// 🔸 カウントダウン表示関数
function startCountdown() {
  //console.log('⏰ カウントダウン開始');
  
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
      //console.log(`⏰ カウントダウン: ${count}`);
      count--;
      setTimeout(updateCountdown, 1000); // 1秒後に次のカウント
    } else {
      // カウントダウン完了
      countdownElement.textContent = 'お渡しください';
      //console.log('⏰ カウントダウン完了');
      
      // 2秒後にカウントダウン表示を削除 + 花火演出開始
      setTimeout(() => {
        if (countdownElement.parentNode) {
          countdownElement.parentNode.removeChild(countdownElement);
          //console.log('⏰ カウントダウン表示を削除');
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
  // //console.log('🎊 紙吹雪エフェクト開始');
  
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
    audio.play().catch(e => {
    //console.log('クラッカー音再生エラー:', e);
  });
  }
  
  // 紙吹雪エフェクトを実行
  executeConfettiEffect(colors, windowWidth, windowHeight);
}

// 🔸 clack.mp3付きの紙吹雪エフェクト関数
function createConfettiEffectWithClack() {
  // //console.log('🎊 紙吹雪エフェクト開始（clack1.mp3再生）');
  
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
  audio.play().catch(e => {
    //console.log('clack1.mp3再生エラー:', e);
  });
  //console.log('🔊 clack1.mp3再生開始');
  
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
  
  // //console.log(`🎊 ${side}サイドから${confettiCount}個の紙吹雪を発射`);
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
  
  // //console.log(`🎊 上部から${confettiCount}個の紙吹雪を降らせる`);
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
  
  // //console.log(`✨ ${sparkleCount}個のキラキラエフェクトを追加`);
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
    // //console.log('🎆 花火演出は既に実行中またはクールダウン中のため、スキップします');
    return;
  }
  
  fireworksInProgress = true;
  lastFireworksTime = now;
  
  // 🔸 花火アニメーションを追加
  addFireworkAnimations();
  
  // //console.log('🎆 受け手側打ち上げ花火演出を開始（リッチバージョン）');
  
  // fire.wavを再生
  const audio = new Audio('./fire.wav');
  audio.volume = 0.7;
  audio.play().catch(e => {
    //console.log('fire.wav再生エラー:', e);
  });
  //console.log('🔊 fire.wav再生開始');
  
  // 複数の打ち上げ花火を生成（超派手に改良）
  for (let i = 0; i < 18; i++) {
    setTimeout(() => {
      // 画面下部からランダムな位置で花火を発射
      const launchX = Math.random() * (window.innerWidth - 100) + 50; // 端から50px離す
      const targetY = Math.random() * (window.innerHeight * 0.5) + 80; // 上部50%の範囲に拡大
      
      // //console.log(`🎆 受信側花火${i+1}発射: X=${launchX}, Y=${targetY}`);
      
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
    // //console.log('🎆 花火演出完了、フラグをリセット');
  }, 7000); // 7秒後（6.5秒継続 + 0.5秒マージン）
}


// 🔸 受け手側花火爆発エフェクト（超派手に改良）
function createReceiverExplosion(x, y) {
  // //console.log(`💥 受信側爆発エフェクト開始: X=${x}, Y=${y}`);
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
  //console.log('🚪 扉開く演出を開始');
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
    // 背景画像設定処理は削除済み
    lastBackgroundSrc = imageSrc;
    // 再描画処理は削除済み;
    
    //console.log('🚪 背景画像を180度回転してキャンバスに描画');
    
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
    
    //console.log('🚪 中央に切れ目のある扉を作成');
    
    // 3. 1秒後に扉が開く
    setTimeout(() => {
        // 効果音を再生 (sound1.mp3 removed due to file loading errors)
        
        // 0.1秒後に扉を開く（中央から外側に開く）
        setTimeout(() => {
          leftDoor.style.transform = 'rotateY(90deg)';
          rightDoor.style.transform = 'rotateY(-90deg)';
          //console.log('🚪 扉が開き始めました');
        }, 100);
        
        // 1秒後に全ての要素を削除
        setTimeout(() => {
          if (leftDoor.parentNode) leftDoor.parentNode.removeChild(leftDoor);
          if (rightDoor.parentNode) rightDoor.parentNode.removeChild(rightDoor);
          doorAnimationInProgress = false; // 扉演出中フラグを下げる
          //console.log('🚪 扉演出完了');
        }, 1100);
        
    }, 1000); // 初期表示から1秒後に扉開始
    
  };
  
  img.onerror = () => {
    //console.error('❌ 扉用背景画像の読み込みに失敗:', imageSrc);
  };
}

// 🔸 扉演出第1段階: 扉表示のみ（開く直前で停止）
function startDoorAnimationPhase1(imageSrc) {
  //console.log('🚪 扉演出第1段階: 開く直前で停止:', imageSrc);
  doorAnimationInProgress = true; // 扉演出中フラグを立てる
  
  const img = new Image();
  img.src = imageSrc;
  
  img.onload = () => {
    // 背景画像を保存（キャンバスには描画しない）
    // 背景画像設定処理は削除済み
    lastBackgroundSrc = imageSrc;
    
    //console.log('🚪 背景画像を保存（キャンバスには描画せず）');
    
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
    
    //console.log('🚪 中央に切れ目のある扉を作成（第1段階完了 - 開く直前で停止）');
  };
  
  img.onerror = () => {
    //console.error('❌ 扉用背景画像の読み込みに失敗:', imageSrc);
  };
}

// 🔸 扉演出第2段階: 扉開放（LED表示 + 背景描画 + 扉開放）
function startDoorAnimationPhase2(imageSrc) {
  //console.log('🚪 扉演出第2段階: LED表示 + 扉開放:', imageSrc);
  
  // 既存の扉要素を取得
  const leftDoor = document.getElementById('leftDoor');
  const rightDoor = document.getElementById('rightDoor');
  
  if (!leftDoor || !rightDoor) {
    //console.error('❌ 扉要素が見つかりません。第1段階が実行されていない可能性があります。');
    return;
  }
  
  // 1. 背景画像を180度回転してキャンバスに描画
  if (null) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI);
    ctx.drawImage(null, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();
    // 再描画処理は削除済み;
    //console.log('🚪 背景画像を180度回転してキャンバスに描画');
  }
  
  // 2. open.wavを再生
  const audio = new Audio('./open.wav');
  audio.volume = 0.6;
  audio.play().catch(e => {
    //console.log('open.wav再生エラー:', e);
  });
  //console.log('🔊 open.wav再生開始');
  
  // 3. 青色LEDを表示（削除）
  // createBlueLEDLightingWithFadeOut();
  
  // 4. 2.5秒後に開く演出開始
  setTimeout(() => {
    //console.log('🚪 開く演出開始（2.5秒後）');
    
    //console.log('🚪 既存の扉要素を使用');
    
    // 0.1秒後に扉を開く（中央から外側に開く）
    setTimeout(() => {
      leftDoor.style.transform = 'rotateY(90deg)';
      rightDoor.style.transform = 'rotateY(-90deg)';
      //console.log('🚪 扉が開き始めました（4秒間）');
    }, 100);
    
    // 4秒後に全ての要素を削除 + open2.mp3再生 + 心臓鼓動演出
    setTimeout(() => {
      if (leftDoor.parentNode) leftDoor.parentNode.removeChild(leftDoor);
      if (rightDoor.parentNode) rightDoor.parentNode.removeChild(rightDoor);
      doorAnimationInProgress = false; // 扉演出中フラグを下げる
      //console.log('🚪 扉演出完了');
      
      // 扉が開き切ったらopen2.mp3を再生
      const audio2 = new Audio('./open2.mp3');
      audio2.volume = 0.6;
      audio2.play().catch(e => {
    //console.log('open2.mp3再生エラー:', e);
  });
      //console.log('🔊 open2.mp3再生開始');
      
      // 心臓鼓動演出を開始
      createHeartbeatEffect();
    }, 4100);
    
  }, 2500); // 2.5秒後に開く演出開始
}

// 🔸 特殊背景設定（180度回転表示）- 背景を表示し続ける
function setSpecialBackgroundWithRiseEffect(src, canvasSize) {
  //console.log('🚪 特殊背景を180度回転で設定:', src);
  
  const img = new Image();
  img.src = src;
  
  img.onload = () => {
    // キャンバスサイズを調整
    if (canvasSize) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }
    
    // 背景画像を保存
    // 背景画像設定処理は削除済み
    lastBackgroundSrc = src;
    
    // 即座に180度回転した画像を表示（背景を消さない）
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI); // 180度回転
    ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
    ctx.restore();
    // 再描画処理は削除済み;
    
    //console.log('🚪 特殊背景設定完了（180度回転）- 背景を表示し続ける');
  };
  
  img.onerror = () => {
    //console.error('❌ 特殊背景画像の読み込みに失敗:', src);
  };
}

// 🔸 青色LED間接照明効果を削除
// function createBlueLEDLighting() { ... }
// function createBlueLEDLightingWithFadeOut() { ... }

// 🔸 心臓鼓動演出を作成
function createHeartbeatEffect() {
  //console.log('💓 心臓鼓動演出を開始');
  
  if (!null) {
    //console.log('❌ 背景画像が見つかりません');
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
  
  //console.log(`💓 キャンバス位置情報: top=${canvasTop}, left=${canvasLeft}, width=${canvasWidth}, height=${canvasHeight}`);
  
  heartbeatBg.style.cssText = `
    position: absolute;
    top: ${canvasTop}px;
    left: ${canvasLeft}px;
    width: ${canvasWidth}px;
    height: ${canvasHeight}px;
    transform: rotate(180deg);
    transform-origin: center center;
    background-image: url('${null.src}');
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
  
  //console.log('💓 心臓鼓動演出を表示');
  
  // 2秒後に削除
  setTimeout(() => {
    if (heartbeatBg.parentNode) heartbeatBg.parentNode.removeChild(heartbeatBg);
    if (style.parentNode) style.parentNode.removeChild(style);
    //console.log('💓 心臓鼓動演出を終了');
  }, 2000);
}

// 🔸 ビデオサイズ対応再生関数
function playVideoWithSize() {
  try {
    //console.log(`📹 ビデオ再生開始（サイズ: ${currentVideoSize}%）`);
    
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
      //console.log("📹 ビデオ再生終了");
      video.remove();
      canvas.style.display = 'block';
      // 再描画処理は削除済み;
      
      // 送信側に背景4選択を通知
      socket.send(JSON.stringify({
        type: "autoSelectBackground",
        background: "back6" // 背景4 = back6.png
      }));
      //console.log("📤 送信側に背景4自動選択を通知");
    });
    
    // エラー処理
    video.addEventListener('error', (e) => {
      //console.error("❌ ビデオ再生エラー:", e);
      video.remove();
      canvas.style.display = 'block';
      alert('ビデオファイルが見つかりません: signVideo.mp4');
    });
    
    //console.log(`✅ ビデオ再生設定完了（${currentVideoSize}%）`);
    
  } catch (error) {
    //console.error("❌ ビデオ再生に失敗:", error);
  }
}

// 🔸 Dev Panel GUI機能
function toggleDevPanel() {
  const panel = document.getElementById('devPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    
    // 現在の描画エリア設定を入力フィールドに反映
    document.getElementById('centerX').value = drawingAreaOffset.x;
    document.getElementById('centerY').value = drawingAreaOffset.y;
    document.getElementById('areaWidth').value = drawingAreaSize.width;
    document.getElementById('areaHeight').value = drawingAreaSize.height;
    
    console.log(`📊 DevPanel開く: 現在の描画エリアサイズ ${drawingAreaSize.width}x${drawingAreaSize.height}`);
    
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
  // 再描画処理は削除済み;
  
  //console.log(`📐 描画エリア表示: ${width}x${height} at (${centerX}, ${centerY})`);
}

function hideDrawingArea() {
  document.getElementById('drawingArea').style.display = 'none';
  // DEVパネルが開いている間は枠表示を維持
  const devPanel = document.getElementById('devPanel');
  if (devPanel.style.display === 'none') {
    // DEVパネルが閉じている時のみ枠を非表示
    showDrawingAreaFrame = false;
    // キャンバスを再描画して枠を非表示
    // 再描画処理は削除済み;
  }
}

function applyDrawingArea() {
  const centerX = parseInt(document.getElementById('centerX').value) || 0;
  const centerY = parseInt(document.getElementById('centerY').value) || 0;
  const width = parseInt(document.getElementById('areaWidth').value) || 842;
  const height = parseInt(document.getElementById('areaHeight').value) || 595;
  
  // 現在の描画エリアサイズを記録
  const oldSize = { width: drawingAreaSize.width, height: drawingAreaSize.height };
  
  // 描画エリア設定を更新
  drawingAreaOffset.x = centerX;
  drawingAreaOffset.y = centerY;
  drawingAreaSize.width = width;
  drawingAreaSize.height = height;
  
  console.log(`✅ 描画エリア適用: オフセット(${centerX}, ${centerY}), サイズ${oldSize.width}x${oldSize.height} → ${width}x${height}`);
  
  // 動的背景画像の位置とサイズを更新
  if (false) {
    console.log('🔄 動的背景画像の位置を更新');
    // 背景画像位置更新処理は削除済み
  }
  
  // キャンバスを再描画
  // 再描画処理は削除済み;
  
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
  
  console.log('🔄 描画エリアをリセット');
  
  // 動的背景画像の位置とサイズもリセット
  if (false) {
    console.log('🔄 動的背景画像の位置をリセット');
    // 背景画像位置更新処理は削除済み
  }
  
  hideDrawingArea();
  // 再描画処理は削除済み;
  
  //console.log('🔄 描画エリアをリセットしました');
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
  
  //console.log('🖱️ ドラッグイベントセットアップ完了');
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
  //console.log('🖱️ 描画エリア移動開始');
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
  //console.log(`🔧 リサイズ開始: ${resizeDirection}`);
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
      // 再描画処理は削除済み;
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
      // 再描画処理は削除済み;
    }
  }
}

function handleMouseUp(e) {
  if (isDragging || isResizing) {
    //console.log('🖱️ ドラッグ操作完了');
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

// 🔸 印刷物プレビュー機能（受信側Canvas内容を直接使用）
function showPrintPreview() {
  const modal = document.getElementById('printPreviewModal');
  const previewCanvas = document.getElementById('printPreviewCanvas');
  const previewCtx = previewCanvas.getContext('2d');
  
  // プレビュー用キャンバスサイズを設定（実際の印刷サイズ）
  previewCanvas.width = drawingAreaSize.width;
  previewCanvas.height = drawingAreaSize.height;
  
  // 🔥 重要: 受信側Canvasの描画エリア部分を直接コピーしてプレビュー表示
  // 描画エリアの範囲を計算
  const canvasRect = canvas.getBoundingClientRect();
  const centerX = canvas.width / 2 + drawingAreaOffset.x;
  const centerY = canvas.height / 2 + drawingAreaOffset.y;
  const areaLeft = centerX - drawingAreaSize.width / 2;
  const areaTop = centerY - drawingAreaSize.height / 2;
  
  // 受信側Canvasの指定エリアをプレビューCanvasにコピー
  previewCtx.drawImage(
    canvas,
    areaLeft, areaTop, drawingAreaSize.width, drawingAreaSize.height,  // 受信側Canvas内の範囲
    0, 0, previewCanvas.width, previewCanvas.height  // プレビューCanvas全体
  );
  
  console.log('📋 プレビュー: 受信側Canvas描画エリアを直接コピー完了');
  
  // モーダルを表示
  modal.style.display = 'flex';
}

function closePrintPreview() {
  const modal = document.getElementById('printPreviewModal');
  modal.style.display = 'none';
  //console.log('📋 印刷物プレビューを閉じました');
}

// 🔸 印刷フル機能（背景込み）
function printFull() {
  console.log('🖨️ === フル印刷開始: 受信側Canvas内容をそのまま印刷 ===');
  
  // 受信側の現在のCanvas内容をそのまま印刷用に使用
  const printCanvas = document.createElement('canvas');
  const printCtx = printCanvas.getContext('2d');
  
  // 受信側キャンバスと同じサイズ
  printCanvas.width = canvas.width;
  printCanvas.height = canvas.height;
  console.log('🖨️ 印刷キャンバスサイズ:', printCanvas.width, 'x', printCanvas.height);
  
  // 🔥 重要: 受信側Canvasの内容をそのまま印刷Canvasにコピー
  // JPEG変換のため白背景を先に設定
  printCtx.fillStyle = '#ffffff';
  printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);
  
  // 180度回転して描画
  printCtx.save();
  printCtx.translate(printCanvas.width / 2, printCanvas.height / 2);
  printCtx.rotate(Math.PI); // 180度回転
  printCtx.translate(-printCanvas.width / 2, -printCanvas.height / 2);
  printCtx.drawImage(canvas, 0, 0);
  printCtx.restore();
  console.log('🖨️ 受信側Canvas内容を180度回転して印刷Canvasにコピー完了（白背景付き）');
  console.log('🖨️ 印刷描画完了 (180度回転)');
  
  // 印刷用データを作成
  try {
    const imageDataUrl = printCanvas.toDataURL("image/png");
    console.log('🖨️ 印刷データ作成完了（JPEG形式）');
    
    // Electronのメインプロセスに印刷データを送信
    if (typeof ipcRenderer !== 'undefined') {
      ipcRenderer.send("save-pdf", {
        imageData: imageDataUrl,
        paperSize: currentPaperSize,
        printType: "full"
      });
      console.log('🖨️ フル印刷データ送信完了 (元座標で印刷)');
    } else {
      console.error('❌ ipcRenderer が利用できません');
    }
    
    console.log('🖨️ === フル印刷完了 ===');
  } catch (error) {
    console.error('❌ フル印刷でエラー発生:', error);
  }
}

// 🔸 印刷ペン機能（描画データのみ）
function printPen() {
  console.log('🖨️ === ペン印刷開始: 受信側キャンバスの描画部分のみ印刷 ===');
  
  // 受信側キャンバスの描画部分のみを印刷用に使用
  const printCanvas = document.createElement('canvas');
  const printCtx = printCanvas.getContext('2d');
  
  // 受信側キャンバスと同じサイズ
  printCanvas.width = canvas.width;
  printCanvas.height = canvas.height;
  console.log('🖨️ 印刷キャンバスサイズ:', printCanvas.width, 'x', printCanvas.height);
  
  // JPEG変換のため白背景を先に設定
  printCtx.fillStyle = '#ffffff';
  printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);
  
  // 🔥 重要: 受信側Canvasから描画部分のみを抽出して印刷Canvasにコピー
  // 一時的なCanvas作成して背景を除去
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  
  // 受信側Canvas内容を一時Canvasにコピー
  tempCtx.drawImage(canvas, 0, 0);
  
  // 白い背景部分を透明にする処理（背景除去）
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;
  
  // 背景部分（白色+背景画像）を透明にする
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    
    // 白に近い色（背景）を透明化
    if (r > 240 && g > 240 && b > 240 && alpha > 200) {
      data[i + 3] = 0; // アルファ値を0（透明）にする
    }
    // 背景画像の色パターンも透明化（薄い色調）
    else if (r > 200 && g > 200 && b > 200 && alpha > 150) {
      // 薄いグレー、ベージュ、薄いピンクなど背景色を透明化
      data[i + 3] = 0;
    }
    // 非常に薄い色も背景として扱う
    else if (r > 180 && g > 180 && b > 180 && alpha > 100 && 
             Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30) {
      // 薄くて色差の少ない（ほぼ無彩色の）部分を背景として透明化
      data[i + 3] = 0;
    }
  }
  
  // 一時的にImageDataを別のCanvasに適用して180度回転処理
  tempCtx.putImageData(imageData, 0, 0);
  
  // 印刷Canvasに180度回転して描画
  printCtx.save();
  printCtx.translate(printCanvas.width / 2, printCanvas.height / 2);
  printCtx.rotate(Math.PI); // 180度回転
  printCtx.translate(-printCanvas.width / 2, -printCanvas.height / 2);
  printCtx.drawImage(tempCanvas, 0, 0);
  printCtx.restore();
  console.log('🖨️ 受信側Canvas描画部分を180度回転して印刷Canvasにコピー完了（背景除去済み）');
  
  console.log('🖨️ ペン印刷完了：受信側Canvas内容を直接コピー');
  console.log('🖨️ ペン印刷描画完了 (180度回転)');
  
  // 印刷用データを作成
  try {
    const imageDataUrl = printCanvas.toDataURL("image/png");
    console.log('🖨️ ペン印刷データ作成完了');
    
    // Electronのメインプロセスに印刷データを送信
    if (typeof ipcRenderer !== 'undefined') {
      ipcRenderer.send("save-pdf", {
        imageData: imageDataUrl,
        paperSize: currentPaperSize,
        printType: "pen"
      });
      console.log('🖨️ ペン印刷データ送信完了 (最終回転済み)');
    } else {
      console.error('❌ ipcRenderer が利用できません');
    }
    
    console.log('🖨️ === ペン印刷完了 ===');
  } catch (error) {
    console.error('❌ ペン印刷でエラー発生:', error);
  }
}

// 描画内容のみを印刷（背景なし、0度で印刷、Brother MFC-J6983CDW直接印刷、L版サイズ）
async function printDrawingOnly() {
  console.log('🖨️ printDrawingOnly: 描画内容のみの印刷を開始');
  
  if (!drawCanvas || !drawCtx) {
    console.log('❌ printDrawingOnly: drawCanvasまたはdrawCtxが存在しません');
    return;
  }
  
  try {
    // back2画像と同じサイズの背景キャンバスを取得
    let canvasWidth, canvasHeight;
    
    if (back2Image && back2Image.naturalWidth && back2Image.naturalHeight) {
      canvasWidth = back2Image.naturalWidth;
      canvasHeight = back2Image.naturalHeight;
      console.log(`📐 back2画像サイズを使用: ${canvasWidth} x ${canvasHeight}`);
    } else if (initialBack2Size && initialBack2Size.width && initialBack2Size.height) {
      canvasWidth = initialBack2Size.width;
      canvasHeight = initialBack2Size.height;
      console.log(`📐 初期back2サイズを使用: ${canvasWidth} x ${canvasHeight}`);
    } else if (drawCanvas) {
      canvasWidth = drawCanvas.width;
      canvasHeight = drawCanvas.height;
      console.log(`📐 drawCanvasサイズを使用: ${canvasWidth} x ${canvasHeight}`);
    } else {
      // デフォルトサイズ
      canvasWidth = 800;
      canvasHeight = 600;
      console.log('📐 デフォルトサイズを使用: 800 x 600');
    }
    
    // 印刷用キャンバスを作成（back2と同じサイズ）
    const printCanvas = document.createElement('canvas');
    const printCtx = printCanvas.getContext('2d');
    
    printCanvas.width = canvasWidth;
    printCanvas.height = canvasHeight;
    
    // 背景を白に設定
    printCtx.fillStyle = 'white';
    printCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    console.log('🔄 描画データを0度で背景サイズキャンバスに描画');
    
    // 全WriterIDの描画データを0度で再描画
    console.log('📝 全WriterIDの描画データを0度で再描画開始');
    console.log('🔍 writerDrawingData内容:', Object.keys(writerDrawingData));
    console.log('🔍 writerDrawingDataサイズ:', Object.keys(writerDrawingData).length);
    
    let totalStrokes = 0;
    
    // デバッグ: 利用可能なデータソースを確認
    console.log('🔍 利用可能なデータソース確認:');
    console.log('  - writerDrawingData keys:', Object.keys(writerDrawingData));
    console.log('  - drawCanvas存在:', !!drawCanvas);
    if (drawCanvas) {
      console.log('  - drawCanvas size:', drawCanvas.width, 'x', drawCanvas.height);
    }
    
    Object.keys(writerDrawingData).forEach(writerId => {
      const commands = writerDrawingData[writerId];
      if (commands && commands.length > 0) {
        console.log(`✏️ Writer ${writerId}: ${commands.length}個のコマンドを0度で描画`);
        
        commands.forEach((cmd, index) => {
          if (cmd.type === 'draw' && cmd.prevData && cmd.currentData) {
            // 座標を元の向き（0度）で使用
            const x1 = cmd.prevData.x;
            const y1 = cmd.prevData.y;
            const x2 = cmd.currentData.x;
            const y2 = cmd.currentData.y;
            
            // デバッグ: 最初の数本のストロークの座標を表示
            if (index < 3) {
              console.log(`  📍 Stroke ${index}: (${x1.toFixed(1)},${y1.toFixed(1)}) → (${x2.toFixed(1)},${y2.toFixed(1)})`);
            }
            
            printCtx.strokeStyle = cmd.color || '#000000';
            printCtx.lineWidth = cmd.thickness || 2;
            printCtx.lineCap = 'round';
            printCtx.lineJoin = 'round';
            
            printCtx.beginPath();
            printCtx.moveTo(x1, y1);
            printCtx.lineTo(x2, y2);
            printCtx.stroke();
            totalStrokes++;
          }
        });
      } else {
        console.log(`⚠️ Writer ${writerId}: コマンドが空または存在しません`);
      }
    });
    
    console.log(`✅ 0度描画完了: ${totalStrokes}本のストロークを描画`);
    
    // 描画データが無い場合の代替手段: drawCanvasから直接コピー
    if (totalStrokes === 0 && drawCanvas) {
      console.log('🔄 描画データが見つからないため、drawCanvasから直接コピーを試行');
      
      // drawCanvasの内容をそのままコピー（180度回転なし）
      printCtx.save();
      
      // drawCanvasには180度回転された描画が入っているので、さらに180度回転して0度に戻す
      printCtx.translate(canvasWidth / 2, canvasHeight / 2);
      printCtx.rotate(Math.PI); // 180度回転
      printCtx.translate(-canvasWidth / 2, -canvasHeight / 2);
      
      printCtx.drawImage(drawCanvas, 0, 0);
      printCtx.restore();
      
      console.log('✅ drawCanvasから直接コピー完了（180度回転して0度に復元）');
    }
    
    // Brother_MFC_J6983CDWプリンターで直接印刷（ウィンドウなし）
    const dataURL = printCanvas.toDataURL('image/png');
    
    // 描画内容を自動保存（ダウンロード）
    console.log('💾 描画内容を自動ダウンロード開始');
    
    // L版縦向きサイズ（336×480px）でリサイズした印刷用キャンバスを作成
    const L_WIDTH = 336;  // 縦向きL版の幅
    const L_HEIGHT = 480; // 縦向きL版の高さ
    
    const resizeCanvas = document.createElement('canvas');
    const resizeCtx = resizeCanvas.getContext('2d');
    
    resizeCanvas.width = L_WIDTH;
    resizeCanvas.height = L_HEIGHT;
    
    // L版キャンバスの背景も白に設定
    resizeCtx.fillStyle = 'white';
    resizeCtx.fillRect(0, 0, L_WIDTH, L_HEIGHT);
    
    // 元のキャンバスをL版サイズに縮小してコピー
    const scaleX = L_WIDTH / canvasWidth;
    const scaleY = L_HEIGHT / canvasHeight;
    const scale = Math.min(scaleX, scaleY); // アスペクト比を保持
    
    const scaledWidth = canvasWidth * scale;
    const scaledHeight = canvasHeight * scale;
    const offsetX = (L_WIDTH - scaledWidth) / 2;
    const offsetY = (L_HEIGHT - scaledHeight) / 2;
    
    console.log(`📐 L版リサイズ: ${canvasWidth}×${canvasHeight} → ${L_WIDTH}×${L_HEIGHT} (scale: ${scale.toFixed(3)})`);
    
    resizeCtx.drawImage(printCanvas, 0, 0, canvasWidth, canvasHeight, offsetX, offsetY, scaledWidth, scaledHeight);
    
    // L版サイズの画像データを取得
    const resizeDataURL = resizeCanvas.toDataURL('image/png');
    
    // 180度回転して保存用キャンバスを作成
    console.log('🔄 保存用に180度回転したキャンバスを作成');
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    
    finalCanvas.width = L_WIDTH;
    finalCanvas.height = L_HEIGHT;
    
    // 背景を白に設定
    finalCtx.fillStyle = 'white';
    finalCtx.fillRect(0, 0, L_WIDTH, L_HEIGHT);
    
    // 180度回転で描画
    finalCtx.save();
    finalCtx.translate(L_WIDTH / 2, L_HEIGHT / 2);
    finalCtx.rotate(Math.PI); // 180度回転
    finalCtx.translate(-L_WIDTH / 2, -L_HEIGHT / 2);
    finalCtx.drawImage(resizeCanvas, 0, 0);
    finalCtx.restore();
    
    console.log('✅ 180度回転キャンバス作成完了');
    
    // 180度回転画像データを取得
    const finalDataURL = finalCanvas.toDataURL('image/png');
    
    // 完全自動ダウンロード（確認なし）
    console.log('📥 完全自動ダウンロード開始（ユーザー確認なし）');
    
    try {
      const downloadFileName = `drawing_${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}_${new Date().getHours().toString().padStart(2,'0')}${new Date().getMinutes().toString().padStart(2,'0')}${new Date().getSeconds().toString().padStart(2,'0')}.png`;
      
      // Node.js環境での完全自動保存
      if (typeof require !== 'undefined') {
        try {
          const fs = require('fs');
          const os = require('os');
          const path = require('path');
          
          const downloadsPath = path.join(os.homedir(), 'Downloads', downloadFileName);
          const base64Data = finalDataURL.replace(/^data:image\/png;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          // ファイルを直接保存（ダイアログなし）
          fs.writeFileSync(downloadsPath, buffer);
          console.log(`✅ 自動保存完了（180度回転）: ${downloadsPath}`);
          
          // ファイルが正常に保存されたか確認
          if (!fs.existsSync(downloadsPath)) {
            console.error('❌ ファイル保存に失敗:', downloadsPath);
            return;
          }
          
          const fileSize = fs.statSync(downloadsPath).size;
          console.log(`📁 ファイル情報: サイズ=${fileSize}バイト, パス=${downloadsPath}`);
          
          // Brother_MFC_J6983CDWプリンターで直接印刷（シンプル実装）
          const { exec } = require('child_process');
          
          console.log('🖨️ 直接印刷実行開始');
          
          // 印刷実行関数
          function executePrint(command, methodName) {
            return new Promise((resolve, reject) => {
              console.log(`🖨️ ${methodName}実行:`, command);
              
              exec(command, { 
                timeout: 15000,
                cwd: process.cwd(),
                env: process.env
              }, (error, stdout, stderr) => {
                
                const result = {
                  method: methodName,
                  command: command,
                  error: error?.message || null,
                  stdout: stdout || '',
                  stderr: stderr || '',
                  success: !error
                };
                
                console.log(`📤 ${methodName}結果:`, JSON.stringify(result, null, 2));
                
                if (error) {
                  reject(result);
                } else {
                  resolve(result);
                }
              });
            });
          }
          
          // 印刷コマンド配列（優先順位順）
          const printCommands = [
            {
              command: `lpr -P Brother_MFC_J6983CDW "${downloadsPath}"`,
              name: '標準印刷'
            },
            {
              command: `lpr -P Brother_MFC_J6983CDW "${downloadsPath}"`,
              name: 'L版印刷'
            },
            {
              command: `lpr "${downloadsPath}"`,
              name: 'デフォルト印刷'
            }
          ];
          
          // 印刷を順次試行
          async function tryPrintMethods() {
            for (let i = 0; i < printCommands.length; i++) {
              const { command, name } = printCommands[i];
              
              try {
                const result = await executePrint(command, name);
                console.log(`✅ ${name}成功: 印刷キューに送信完了`);
                
                // 印刷後にキューを確認
                setTimeout(() => {
                  exec('lpq -P Brother_MFC_J6983CDW', (qError, qStdout) => {
                    console.log('📋 印刷後のキュー状態:', qStdout || 'キュー情報取得エラー');
                  });
                }, 2000);
                
                return; // 成功したら終了
                
              } catch (error) {
                console.log(`❌ ${name}失敗:`, error.error);
                
                if (i === printCommands.length - 1) {
                  console.error('❌ 全ての印刷方法が失敗しました');
                  
                  // 最終診断
                  exec('lpstat -p', (diagError, diagStdout) => {
                    console.log('🔍 診断 - 利用可能プリンター:', diagStdout);
                  });
                } else {
                  console.log(`🔄 次の方法を試行: ${printCommands[i + 1].name}`);
                }
              }
            }
          }
          
          // 印刷実行
          tryPrintMethods();
          
        } catch (nodeError) {
          console.error('❌ Node.js保存エラー:', nodeError);
          silentDownloadInBrowser();
        }
      } else {
        // ブラウザ環境での完全自動ダウンロード
        silentDownloadInBrowser();
      }
      
      // ブラウザ環境用サイレントダウンロード
      function silentDownloadInBrowser() {
        // 非表示のダウンロードリンクを作成して自動クリック
        const link = document.createElement('a');
        link.href = finalDataURL;
        link.download = downloadFileName;
        link.style.position = 'absolute';
        link.style.left = '-9999px';
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        
        // 自動的にクリックしてダウンロード開始
        setTimeout(() => {
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            console.log('✅ ブラウザサイレントダウンロード完了（180度回転）');
          }, 100);
        }, 10);
      }
      
    } catch (error) {
      console.error('❌ 完全自動ダウンロードエラー:', error);
      
      // 緊急フォールバック（それでもサイレント）
      const emergencyLink = document.createElement('a');
      emergencyLink.href = finalDataURL;
      emergencyLink.download = `drawing_emergency_${Date.now()}.png`;
      emergencyLink.style.display = 'none';
      document.body.appendChild(emergencyLink);
      emergencyLink.click();
      document.body.removeChild(emergencyLink);
      console.log('📥 緊急フォールバックダウンロード完了（180度回転）');
    }
    
    console.log('✅ printDrawingOnly: Brother_MFC_J6983CDW印刷処理完了（0度回転）');
    
  } catch (error) {
    console.error('❌ printDrawingOnly: 印刷処理でエラー:', error);
  }
}

// 🔸 印刷用画像データ生成機能
function generatePrintImageData() {
  const downloadCanvas = document.createElement('canvas');
  const downloadCtx = downloadCanvas.getContext('2d');
  
  // ダウンロード用キャンバスサイズを設定
  downloadCanvas.width = drawingAreaSize.width;
  downloadCanvas.height = drawingAreaSize.height;
  
  //console.log(`🖨️ 印刷モード: ${currentPrintMode}`);
  
  if (currentPrintMode === "fullMode") {
    // フルモード: 背景画像も含める
    //console.log(`🖨️ フルモード: 背景画像を含めて印刷`);
    
    // 背景を白で塗りつぶし（ベース）
    downloadCtx.fillStyle = '#ffffff';
    downloadCtx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
    
    // 背景画像がある場合は描画
    if (null) {
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
      
      // 背景画像を回転なしで描画
      downloadCtx.drawImage(null, bgX, bgY, bgWidth, bgHeight);
      downloadCtx.restore();
      
      //console.log(`🖨️ 背景画像を描画: ${bgWidth}x${bgHeight} at (${bgX}, ${bgY})`);
    }
  } else {
    // 描画モード: 背景を白で塗りつぶし（従来通り）
    //console.log(`🖨️ 描画モード: 描画のみ印刷`);
    downloadCtx.fillStyle = '#ffffff';
    downloadCtx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
  }
  
  // 筆跡を描画（両モード共通）- WriterID別に独立描画（線接続防止）
  
  // 🔥 WriterID別に独立して描画（線接続防止）
  Object.keys(writerDrawingData).forEach(writerId => {
    if (writerDrawingData[writerId].length > 0) {
      console.log(`🖨️ ダウンロード Writer ${writerId} の描画開始: ${writerDrawingData[writerId].length}コマンド`);
      drawWriterCommandsForDownload(writerDrawingData[writerId], writerId, downloadCtx);
    }
  });
  
  // 旧方式フォールバック（互換性）
  if (Object.keys({}).length === 0 && [].length > 0) {
    console.log('🖨️ ダウンロードフォールバック: 統合データで描画');
    let lastWriterId = null;
    [].forEach(cmd => {
      if (cmd.type === "start") {
        // WriterIDが変わった場合は新しいパスを開始
        if (cmd.writerId !== lastWriterId) {
          downloadCtx.beginPath();
          lastWriterId = cmd.writerId;
        }
        const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
        const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
        downloadCtx.moveTo(scaledX, scaledY);
      } else if (cmd.type === "draw") {
        // WriterIDが変わった場合は新しいパスを開始
        if (cmd.writerId !== lastWriterId) {
          downloadCtx.beginPath();
          lastWriterId = cmd.writerId;
          const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
          const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
          downloadCtx.moveTo(scaledX, scaledY);
          return;
        }
        
        const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
        const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
        const thickness = cmd.thickness || 4;
        downloadCtx.lineWidth = thickness * (drawingAreaSize.width / senderCanvasSize.width);
        downloadCtx.strokeStyle = cmd.color === 'black' ? '#000' : (cmd.color === 'white' ? '#fff' : (cmd.color === 'green' ? '#008000' : (cmd.color === 'pink' ? '#ff69b4' : (cmd.color || '#000'))));
        downloadCtx.lineTo(scaledX, scaledY);
        downloadCtx.stroke();
      }
    });
  }
  
  // 🔸 印刷用画像を送信側の元の向きで生成
  //console.log('🔄 印刷用画像を送信側の元の向きで生成完了');
  
  // 画像データを返す（送信側の元の向き）
  return downloadCanvas.toDataURL("image/png");
}

// 🔸 180度回転ダウンロード機能
function downloadRotated() {
  try {
    // 新しい画像生成関数を使用
    const imageDataUrl = generatePrintImageData();
    //console.log('🔄 180度回転ダウンロード: 画像データ作成完了');
    
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
    
    //console.log('📥 180度回転画像ダウンロード完了:', fileName);
  } catch (error) {
    //console.error('❌ 180度回転ダウンロードでエラー発生:', error);
  }
}

// 🚪 送信アニメーション完了後の扉処理
function scheduleDoorClosing() {
  // 既存のタイマーをクリア
  if (sendAnimationTimer) {
    clearTimeout(sendAnimationTimer);
  }
  
  // 5秒後に扉を閉じる
  sendAnimationTimer = setTimeout(() => {
    // 扉を閉じる前に既存の静止画を消す
    // 背景画像設定処理は削除済み
    lastBackgroundSrc = null;
    //console.log('🖼️ 扉を閉じる前に既存の静止画を削除');
    
    createDoorForVideo();
    //console.log('🚪 送信アニメーション完了5秒後：扉を閉じる演出開始');
    sendAnimationTimer = null;
  }, 5000);
  
  //console.log('⏰ 送信アニメーション完了：5秒後に扉を閉じるタイマー開始');
}

// 🔄 back6.png回転アニメーション関数
function performImageRotationAnimation() {
  //console.log('🔄 back6.png回転アニメーション開始');
  
  let rotationAngle = 0;
  const rotationSpeed = 5; // 度数/フレーム
  const targetAngle = 180;
  
  function animate() {
    if (rotationAngle < targetAngle) {
      rotationAngle += rotationSpeed;
      if (rotationAngle > targetAngle) rotationAngle = targetAngle;
      
      // 一時的に回転フラグを設定してredrawCanvasで回転描画
      window.tempRotationAngle = rotationAngle;
      // 再描画処理は削除済み;
      
      requestAnimationFrame(animate);
    } else {
      // アニメーション完了
      window.tempRotationAngle = null;
      isCanvasRotated = true; // 180度回転状態に設定
      
      // キャンバスもCSS transformで180度回転状態に設定
      canvas.style.transition = 'none';
      canvas.style.transform = 'translateX(-50%) rotate(180deg)';
      //console.log('🔄 キャンバスをCSS transformで180度回転状態に設定');
      
      // 再描画処理は削除済み;
      //console.log('🔄 back6.png回転アニメーション完了 - 180度回転状態に移行');
    }
  }
  
  requestAnimationFrame(animate);
}

// 🔸 フルスクリーン切り替え機能
function toggleFullscreen() {
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send('toggle-fullscreen');
    //console.log('🖥️ フルスクリーンモード切り替え');
  } else {
    //console.log('❌ フルスクリーン機能はElectron環境でのみ利用可能');
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
      //console.log('🖥️ フルスクリーンモード：ボタンを透明化');
    } else {
      // ウィンドウモード時：ボタンを元に戻す
      if (devButton) devButton.style.opacity = '1';
      if (reviewButton) reviewButton.style.opacity = '1';
      //console.log('🖥️ ウィンドウモード：ボタンを表示');
    }
  });
}

// アニメーション実行中フラグ
let isAnimationInProgress = false;

// 🎬 アニメーションシーケンス: 180度回転 → 待機 → 下にスライド → リセット
function startRotationAnimation(rotationWaitTime) {
  console.log('🎬 アニメーションシーケンス開始');
  console.log(`🔍 startRotationAnimation受信: rotationWaitTime = ${rotationWaitTime}ms (${rotationWaitTime/1000}秒)`);
  isAnimationInProgress = true; // アニメーション開始フラグ
  
  // 🎵 背景5の場合に音楽再生開始
  if (window.isDevWhiteBackground) {
    playBackgroundMusic();
    console.log('🎵 背景5: アニメーション開始時に音楽再生開始');
  }
  
  // 実際に使用されている要素IDを使用
  const drawCanvasElement = document.getElementById('drawCanvas') || document.getElementById('drawCanvas-temp');
  const back2WrapperElement = document.getElementById('back2-wrapper'); // 正しいIDに修正
  const containerElement = document.getElementById('container');
  
  // 複数の候補から適切な要素を選択
  let animationTarget = null;
  
  if (back2WrapperElement) {
    animationTarget = back2WrapperElement;
    console.log('🎯 アニメーション対象: back2Wrapper要素');
  } else if (drawCanvasElement) {
    animationTarget = drawCanvasElement;
    console.log('🎯 アニメーション対象: drawCanvas要素');
  } else if (containerElement) {
    animationTarget = containerElement;
    console.log('🎯 アニメーション対象: container要素');
  } else {
    console.log('❌ アニメーション対象が見つかりません');
    console.log('🔍 利用可能な要素を検索...');
    
    // すべての主要要素の存在を確認
    const elements = ['drawCanvas', 'drawCanvas-temp', 'back2-wrapper', 'container', 'draw-canvas'];
    elements.forEach(id => {
      const elem = document.getElementById(id);
      console.log(`🔍 ${id}: ${elem ? 'EXISTS' : 'NOT FOUND'}`);
    });
    
    return;
  }
  
  // Step 1: 180度回転アニメーション (1秒)
  // back2-wrapperは既に180度回転しているので、さらに180度回転させて0度にする
  console.log('🔄 Step 1: 180度回転アニメーション開始（180度→360度=0度）');
  animationTarget.style.transition = 'transform 1s ease-in-out';
  
  if (animationTarget.id === 'back2-wrapper') {
    // back2-wrapperの場合：既に180度回転済みなので360度（0度）に回転
    animationTarget.style.transform = 'rotate(360deg)';
    console.log('🔄 back2-wrapper: 180度→360度（0度）に回転');
  } else {
    // その他の要素の場合：通常の180度回転
    animationTarget.style.transform = 'translateX(-50%) rotate(180deg)';
    console.log('🔄 その他要素: 0度→180度に回転');
  }
  
  setTimeout(() => {
    console.log('✅ Step 1完了: 180度回転アニメーション完了');
    
    // 背景5の場合はパターンに応じて処理分岐
    if (window.isDevWhiteBackground) {
      if (videoPattern === 2) {
        console.log('🎬 背景5 パターン2: 描画フェードアウト・動画フェードイン開始');
        // パターン2: 描画フェードアウト + 動画フェードイン
        // 🔧【修正】fadeInCompleteイベントを受信してから待機・スライド開始
        const handleFadeInCompleteForPattern2 = (event) => {
          console.log('🎬 パターン2: フェードイン完了イベント受信 - 待機時間開始');
          if (event.detail && event.detail.remainingTime !== undefined) {
            console.log(`⏰ フェードイン完了時の動画残り時間: ${event.detail.remainingTime.toFixed(2)}秒`);
          }
          if (event.detail && event.detail.fadeInDuration !== undefined) {
            console.log(`⏱️ 受信イベント: フェードイン実行時間 ${event.detail.fadeInDuration.toFixed(2)}ms`);
          }
          performWaitAndSlide(rotationWaitTime);
        };
        
        // 🔧 フェードイン開始時間を確実にリセット
        window.fadeInStartTimestamp = null;
        console.log('🔄 パターン2開始前: フェードイン開始時間をリセット');
        
        window.addEventListener('fadeInComplete', handleFadeInCompleteForPattern2, { once: true });
        console.log('🎬 パターン2: fadeInCompleteイベントリスナー設定完了');
        
        startPattern2FadeInOut().then(() => {
          console.log('🎬 パターン2 動画再生終了: フェードインイベント待機中');
        });
      } else {
        console.log('🎬 背景5 パターン1: 回転後動画再生開始');
        // 🔧【修正】パターン1もfadeInCompleteイベントを受信してから待機・スライド開始
        const handleFadeInCompleteForPattern1 = (event) => {
          console.log('🎬 パターン1: フェードイン完了イベント受信 - 待機時間開始');
          if (event.detail && event.detail.remainingTime !== undefined) {
            console.log(`⏰ フェードイン完了時の動画残り時間: ${event.detail.remainingTime.toFixed(2)}秒`);
          }
          performWaitAndSlide(rotationWaitTime);
        };
        
        window.addEventListener('fadeInComplete', handleFadeInCompleteForPattern1, { once: true });
        console.log('🎬 パターン1: fadeInCompleteイベントリスナー設定完了');
        
        startVideoPlayback().then(() => {
          console.log('🎬 パターン1 動画再生終了: フェードインイベント待機中');
        });
      }
    } else {
      // 背景5以外では従来通り即座に待機時間開始
      console.log('🎬 背景5以外: 従来通りの待機時間開始');
      performWaitAndSlide(rotationWaitTime);
    }
  }, 1000); // 回転アニメーション時間
}

// 🎬 待機とスライドアニメーション処理（動画対応版）
function performWaitAndSlide(rotationWaitTime) {
  console.log(`🔍 performWaitAndSlide受信: rotationWaitTime = ${rotationWaitTime}ms`);
  
  // Step 2: 待機時間 (devtool設定に基づく)
  const waitTime = rotationWaitTime || 7500;
  console.log(`🔍 実際の待機時間: waitTime = ${waitTime}ms (${waitTime/1000}秒)`);
  console.log(`⏳ Step 2: ${waitTime/1000}秒間待機中...`);
  
  // 実際に使用されている要素IDを使用
  const drawCanvasElement = document.getElementById('drawCanvas') || document.getElementById('drawCanvas-temp');
  const back2WrapperElement = document.getElementById('back2-wrapper');
  const containerElement = document.getElementById('container');
  
  // 複数の候補から適切な要素を選択
  let animationTarget = null;
  
  if (back2WrapperElement) {
    animationTarget = back2WrapperElement;
  } else if (drawCanvasElement) {
    animationTarget = drawCanvasElement;
  } else if (containerElement) {
    animationTarget = containerElement;
  } else {
    console.log('❌ アニメーション対象が見つかりません');
    return;
  }
  
  setTimeout(() => {
    const step2EndTime = performance.now();
    console.log('✅ Step 2完了: 待機時間終了');
      
    // Step 3: 下にスライドアニメーション (2秒で画面外まで)
    const step3StartTime = performance.now();
    const transitionTime = step3StartTime - step2EndTime;
    console.log('⬇️ Step 3: 下にスライドアニメーション開始');
    console.log(`⏱️ Step 2完了→Step 3開始: ${transitionTime.toFixed(2)}ms`);
    if (transitionTime > 10) {
      console.warn(`⚠️ Step 2完了からStep 3開始まで ${transitionTime.toFixed(2)}ms の遅延が発生しています`);
    }
    
    const preCssTime = performance.now();
    console.log(`🔍 Step 3詳細: CSS適用前の時間測定開始`);
    console.log(`🎯 アニメーション対象要素:`, {
      id: animationTarget.id,
      tagName: animationTarget.tagName,
      className: animationTarget.className,
      offsetWidth: animationTarget.offsetWidth,
      offsetHeight: animationTarget.offsetHeight,
      style_transform: animationTarget.style.transform,
      style_transition: animationTarget.style.transition,
      computedTransform: getComputedStyle(animationTarget).transform
    });
    
    const windowHeight = window.innerHeight;
    const targetHeight = animationTarget.offsetHeight;
    const slideDistance = windowHeight + targetHeight + 100; // 完全に画面外まで
    
    console.log(`🔍 計算完了: windowHeight=${windowHeight}, slideDistance=${slideDistance}`);
    
    const transitionSetTime = performance.now();
    animationTarget.style.transition = 'transform 2s ease-in-out';
    const transitionSetComplete = performance.now();
    console.log(`⏱️ transition設定時間: ${(transitionSetComplete - transitionSetTime).toFixed(2)}ms`);
    
    // 背景5の場合は動画も一緒に移動
    if (window.isDevWhiteBackground && currentVideoElement) {
      console.log('🎬 背景5: 動画も一緒に下移動');
      // 動画は既にback2Wrapper内にあるので、親要素と一緒に移動する
    }
    
    const transformStartTime = performance.now();
    if (animationTarget.id === 'back2-wrapper') {
      // back2-wrapperの場合：回転なしでスライド
      animationTarget.style.transform = 'rotate(360deg) translateY(' + slideDistance + 'px)';
      console.log(`🔄 back2-wrapper: ${slideDistance}px下にスライド`);
    } else {
      // その他の要素の場合：回転付きでスライド
      animationTarget.style.transform = 'translateX(-50%) rotate(180deg) translateY(' + slideDistance + 'px)';
      console.log(`🔄 その他要素: ${slideDistance}px下にスライド`);
    }
    const transformComplete = performance.now();
    
    const totalCssTime = transformComplete - preCssTime;
    const transformTime = transformComplete - transformStartTime;
    console.log(`⏱️ transform適用時間: ${transformTime.toFixed(2)}ms`);
    console.log(`⏱️ CSS処理総時間: ${totalCssTime.toFixed(2)}ms`);
    console.log(`🎯 実際のアニメーション開始: ${new Date().toLocaleTimeString()}.${Date.now() % 1000}`);
    
    // DOM強制再描画を確保
    animationTarget.offsetHeight; // reflow強制実行
    console.log(`🔄 DOM reflow強制実行完了`);
    
    if (totalCssTime > 50) {
      console.warn(`⚠️ CSS処理に ${totalCssTime.toFixed(2)}ms かかっています（50ms超過）`);
    }
      
      setTimeout(() => {
        console.log('✅ Step 3完了: スライドアニメーション完了（画面外に消失）');
        
        // Step 4: スライド完了と同時に描画をクリア
        console.log('🔄 Step 4: 描画クリア処理開始（スライド完了直後）');
        
        // 背景5の場合は動画要素も削除
        if (window.isDevWhiteBackground && currentVideoElement) {
          console.log('🎬 背景5: 動画要素を削除');
          currentVideoElement.remove();
          currentVideoElement = null;
        }
        
        // 描画データをクリア
        Object.keys(writerDrawingData).forEach(writerId => {
          writerDrawingData[writerId] = [];
          console.log(`🗑️ Writer ${writerId} の描画データをクリア`);
        });
        
        // キャンバスをクリア
        if (drawCtx) {
          drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
          console.log('🗑️ 描画キャンバスをクリア');
        }
        
        // Step 5: 2秒後に背景画像復帰とリセット完了
        console.log('⏳ Step 5: 2秒後に背景画像復帰...');
        
        setTimeout(() => {
          console.log('🔄 Step 5: 背景画像復帰とリセット完了');
          
          // 要素の位置とスタイルをリセット
          animationTarget.style.transition = 'none';
          
          if (animationTarget.id === 'back2-wrapper') {
            // back2-wrapperの場合：元の180度回転状態に戻す
            animationTarget.style.transform = 'rotate(180deg)';
            console.log('🔄 back2-wrapper: 元の180度回転状態に復帰');
          } else {
            // その他の要素の場合：0度状態に戻す
            animationTarget.style.transform = 'translateX(-50%) rotate(0deg) translateY(0px)';
            console.log('🔄 その他要素: 元の0度状態に復帰');
          }
          
          // 背景画像を再表示
          if (back2Wrapper) {
            back2Wrapper.style.display = 'block';
            back2Wrapper.style.opacity = '1';
            console.log('🖼️ 背景画像を再表示');
          }
          
          // 描画キャンバスの透明度を確実にリセット
          if (drawCanvas) {
            drawCanvas.style.transition = 'none';
            drawCanvas.style.opacity = '1';
            console.log('🎬 最終リセット: 描画キャンバス透明度を1に設定');
          }
          
          // 受信可能状態に復帰
          isCanvasRotated = false;
          console.log('📝 描画受信可能状態に復帰');
          
          console.log('✅ Step 5完了: リセット処理完了 - 新しい記入を受け付け可能');
          console.log('🎬 アニメーションシーケンス全体完了');
          
          // 🔧 フェードイン時間記録をクリア（次回のアニメーションのため）
          window.fadeInStartTimestamp = null;
          console.log('🔄 フェードイン開始時間をクリア - 次回アニメーション準備完了');
          
          isAnimationInProgress = false; // アニメーション終了フラグ
          
        }, 2000); // 2秒待機
        
      }, 2000); // スライドアニメーション時間
      
    }, waitTime); // devtool設定の待機時間
}

// 描画内容のダウンロードと印刷を分離した新関数
async function downloadAndPrintDrawing() {
  console.log('📥 downloadAndPrintDrawing: ダウンロード即座実行、印刷遅延実行開始');
  
  if (!drawCanvas || !drawCtx) {
    console.log('❌ downloadAndPrintDrawing: drawCanvasまたはdrawCtxが存在しません');
    return;
  }
  
  try {
    // 画像生成とダウンロード処理（即座に実行）
    const imageData = await generatePrintImage();
    
    if (imageData) {
      // ダウンロードを即座に実行し、実際の保存パスを取得
      console.log('💾 画像ダウンロードを即座に実行');
      const savedPath = downloadImage(imageData.dataURL, imageData.fileName);
      
      // 印刷処理を遅延実行（実際の保存パスを使用）
      const delayMs = (printDelayTime || 8.5) * 1000;
      console.log(`🖨️ ${printDelayTime || 8.5}秒後に印刷を実行`);
      
      setTimeout(() => {
        console.log(`🖨️ ${printDelayTime || 8.5}秒遅延完了 - 印刷処理を開始`);
        
        // 実際に保存されたパスを使用（Node.js環境の場合）
        const printPath = savedPath || imageData.printPath;
        if (printPath) {
          console.log('✅ 印刷パスが確認できました - executePrint実行');
          executePrint(printPath);
        } else {
          console.log('⚠️ 印刷パスがないため印刷をスキップ（ブラウザ環境）');
        }
      }, delayMs);
    }
  } catch (error) {
    console.error('❌ downloadAndPrintDrawing: エラー:', error);
  }
}

// 画像生成処理を分離
async function generatePrintImage() {
  console.log('🎨 generatePrintImage: 印刷用画像を生成');
  
  try {
    // 既存のprintDrawingOnlyから画像生成部分を抽出
    let canvasWidth, canvasHeight;
    
    if (back2Image && back2Image.naturalWidth && back2Image.naturalHeight) {
      canvasWidth = back2Image.naturalWidth;
      canvasHeight = back2Image.naturalHeight;
      console.log(`📐 back2画像サイズを使用: ${canvasWidth} x ${canvasHeight}`);
    } else if (initialBack2Size && initialBack2Size.width && initialBack2Size.height) {
      canvasWidth = initialBack2Size.width;
      canvasHeight = initialBack2Size.height;
      console.log(`📐 初期back2サイズを使用: ${canvasWidth} x ${canvasHeight}`);
    } else if (drawCanvas) {
      canvasWidth = drawCanvas.width;
      canvasHeight = drawCanvas.height;
      console.log(`📐 drawCanvasサイズを使用: ${canvasWidth} x ${canvasHeight}`);
    } else {
      canvasWidth = 800;
      canvasHeight = 600;
      console.log('📐 デフォルトサイズを使用: 800 x 600');
    }
    
    // 印刷用キャンバスを作成
    const printCanvas = document.createElement('canvas');
    const printCtx = printCanvas.getContext('2d');
    
    printCanvas.width = canvasWidth;
    printCanvas.height = canvasHeight;
    
    // 背景を白に設定
    printCtx.fillStyle = 'white';
    printCtx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    console.log('🔄 描画データを0度で背景サイズキャンバスに描画');
    
    // 全WriterIDの描画データを0度で再描画
    let totalStrokes = 0;
    
    Object.keys(writerDrawingData).forEach(writerId => {
      const commands = writerDrawingData[writerId];
      if (commands && commands.length > 0) {
        commands.forEach(cmd => {
          if (cmd.type === 'start') {
            printCtx.beginPath();
            printCtx.moveTo(cmd.x, cmd.y);
          } else if (cmd.type === 'draw') {
            printCtx.lineWidth = cmd.thickness || 8;
            printCtx.strokeStyle = cmd.color || 'black';
            printCtx.lineTo(cmd.x, cmd.y);
            printCtx.stroke();
            totalStrokes++;
          }
        });
      }
    });
    
    console.log(`✅ 0度描画完了: ${totalStrokes}本のストロークを描画`);
    
    // 描画データが無い場合はdrawCanvasから直接コピー
    if (totalStrokes === 0 && drawCanvas) {
      console.log('🔄 描画データが見つからないため、drawCanvasから直接コピーを試行');
      
      printCtx.save();
      printCtx.translate(canvasWidth / 2, canvasHeight / 2);
      printCtx.rotate(Math.PI);
      printCtx.translate(-canvasWidth / 2, -canvasHeight / 2);
      printCtx.drawImage(drawCanvas, 0, 0);
      printCtx.restore();
      
      console.log('✅ drawCanvasから直接コピー完了');
    }
    
    // L版サイズにリサイズ
    const L_WIDTH = 336;
    const L_HEIGHT = 480;
    
    const resizeCanvas = document.createElement('canvas');
    const resizeCtx = resizeCanvas.getContext('2d');
    
    resizeCanvas.width = L_WIDTH;
    resizeCanvas.height = L_HEIGHT;
    
    resizeCtx.fillStyle = 'white';
    resizeCtx.fillRect(0, 0, L_WIDTH, L_HEIGHT);
    
    const scaleX = L_WIDTH / canvasWidth;
    const scaleY = L_HEIGHT / canvasHeight;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = canvasWidth * scale;
    const scaledHeight = canvasHeight * scale;
    const offsetX = (L_WIDTH - scaledWidth) / 2;
    const offsetY = (L_HEIGHT - scaledHeight) / 2;
    
    console.log(`📐 L版リサイズ: ${canvasWidth}×${canvasHeight} → ${L_WIDTH}×${L_HEIGHT} (scale: ${scale.toFixed(3)})`);
    
    resizeCtx.drawImage(printCanvas, 0, 0, canvasWidth, canvasHeight, offsetX, offsetY, scaledWidth, scaledHeight);
    
    // 最終画像を生成
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    
    finalCanvas.width = L_WIDTH;
    finalCanvas.height = L_HEIGHT;
    
    finalCtx.fillStyle = 'white';
    finalCtx.fillRect(0, 0, L_WIDTH, L_HEIGHT);
    
    // 180度回転して描画
    finalCtx.save();
    finalCtx.translate(L_WIDTH / 2, L_HEIGHT / 2);
    finalCtx.rotate(Math.PI); // 180度回転
    finalCtx.translate(-L_WIDTH / 2, -L_HEIGHT / 2);
    finalCtx.drawImage(resizeCanvas, 0, 0);
    finalCtx.restore();
    
    const finalDataURL = finalCanvas.toDataURL('image/png');
    const fileName = `drawing_${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${new Date().getDate().toString().padStart(2,'0')}_${new Date().getHours().toString().padStart(2,'0')}${new Date().getMinutes().toString().padStart(2,'0')}${new Date().getSeconds().toString().padStart(2,'0')}.png`;
    
    // ファイルパスを生成（Node.js環境の場合）
    let printPath = null;
    if (typeof require !== 'undefined') {
      try {
        const os = require('os');
        const path = require('path');
        printPath = path.join(os.homedir(), 'Downloads', fileName);
      } catch (e) {
        console.log('⚠️ Node.js環境ではないため、ファイルパスは生成されません');
      }
    }
    
    return {
      dataURL: finalDataURL,
      fileName: fileName,
      printPath: printPath
    };
    
  } catch (error) {
    console.error('❌ generatePrintImage: エラー:', error);
    return null;
  }
}

// ダウンロード処理を分離
function downloadImage(dataURL, fileName) {
  console.log('💾 downloadImage: 画像ダウンロード開始');
  
  try {
    if (typeof require !== 'undefined') {
      // Node.js環境
      try {
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        
        const downloadsPath = path.join(os.homedir(), 'Downloads', fileName);
        const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        fs.writeFileSync(downloadsPath, buffer);
        console.log(`✅ 自動保存完了: ${downloadsPath}`);
        
        const fileSize = fs.statSync(downloadsPath).size;
        console.log(`📁 ファイル情報: サイズ=${fileSize}バイト, パス=${downloadsPath}`);
        
        // 保存されたパスを返す
        return downloadsPath;
        
      } catch (nodeError) {
        console.error('❌ Node.js保存エラー:', nodeError);
        // ブラウザ環境のフォールバック
        downloadInBrowser(dataURL, fileName);
        return null;
      }
    } else {
      // ブラウザ環境
      downloadInBrowser(dataURL, fileName);
      return null;
    }
  } catch (error) {
    console.error('❌ downloadImage: エラー:', error);
    return null;
  }
}

// ブラウザでのダウンロード
function downloadInBrowser(dataURL, fileName) {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = fileName;
  link.style.position = 'absolute';
  link.style.left = '-9999px';
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  
  setTimeout(() => {
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      console.log('✅ ブラウザダウンロード完了');
    }, 100);
  }, 10);
}

// 印刷実行処理を分離
function executePrint(filePath) {
  console.log('🖨️ executePrint: 印刷処理開始');
  console.log('📍 印刷ファイルパス:', filePath);
  
  if (!filePath) {
    console.log('⚠️ ファイルパスが指定されていません（ブラウザ環境のため印刷スキップ）');
    return;
  }
  
  if (typeof require !== 'undefined') {
    try {
      const { exec } = require('child_process');
      
      const printCommand = `lpr -P Brother_MFC_J6983CDW "${filePath}"`;
      console.log('📤 印刷コマンド実行:', printCommand);
      
      exec(printCommand, { 
        timeout: 15000,
        cwd: process.cwd(),
        env: process.env
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ 印刷エラー:', error.message);
          if (stderr) console.error('❌ 標準エラー出力:', stderr);
        } else {
          console.log('✅ 印刷成功: 印刷キューに送信完了');
          if (stdout) console.log('📋 標準出力:', stdout);
          
          // キュー確認
          setTimeout(() => {
            exec('lpq -P Brother_MFC_J6983CDW', (qError, qStdout) => {
              console.log('📋 印刷後のキュー状態:', qStdout || 'キュー情報取得エラー');
            });
          }, 2000);
        }
      });
      
    } catch (error) {
      console.error('❌ executePrint: エラー:', error);
    }
  } else {
    console.log('⚠️ ブラウザ環境のため印刷処理をスキップ');
  }
}