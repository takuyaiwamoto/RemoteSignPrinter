const { ipcRenderer } = require("electron");
const path = require("path");

// 🔸 拡大率を設定 (デフォルト4.0倍、ポスター時は2.4倍=A4の60%)
let SCALE_FACTOR = 4.0;

const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");

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

let socket = new WebSocket("wss://realtime-sign-server.onrender.com");
socket.onopen = () => console.log("✅ WebSocket接続完了（Electron受信側）");
socket.onerror = e => console.error("❌ WebSocketエラー", e);
socket.onclose = () => console.warn("⚠️ WebSocket切断");

let animationImage = null;

// 🔸 音声ファイルを準備
const audio = new Audio();
audio.src = resolveImagePath("haisyutu.mp3"); // 音声ファイルのパスを解決
audio.preload = "auto"; // 事前読み込み

// 🔸 音声の読み込み状況をチェック
audio.addEventListener('canplaythrough', () => {
  console.log("✅ 音声ファイル読み込み完了: haisyutu.mp3");
});

audio.addEventListener('error', (e) => {
  console.error("❌ 音声ファイル読み込みエラー:", e);
  console.error("音声ファイルパス:", audio.src);
});

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
  
  // キャンバスを再描画
  redrawCanvas();
}

function redrawCanvas(withBackground = true) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 🔸 背景画像を180度回転して描画
  if (withBackground && backgroundImage) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2); // 中心に移動
    ctx.rotate(Math.PI); // 180度回転
    
    // 🔸 背景画像のサイズを調整
    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    
    if (currentPaperSize === "poster" && lastBackgroundSrc && lastBackgroundSrc.includes('back3')) {
      // 背景1のポストカードは背景2より少し小さく（0.9倍）
      drawWidth = canvas.width * 0.9;
      drawHeight = canvas.height * 0.9;
    } else if (currentPaperSize === "A4") {
      // A4モードでの背景サイズ調整
      if (lastBackgroundSrc && lastBackgroundSrc.includes('back3')) {
        // 背景1のA4はベースより8%小さく
        drawWidth = canvas.width * 0.92;
        drawHeight = canvas.height * 0.92;
        console.log("🔍 背景1のA4サイズ調整: 0.92倍");
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
  
  // 🔸 筆跡描画（オフセット適用後に180度回転）
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2); // キャンバス中心に移動
  ctx.rotate(Math.PI); // 180度回転（背景と同じ）
  ctx.translate(-canvas.width / 2, -canvas.height / 2); // 元の位置に戻す
  
  drawingData.forEach(cmd => {
    if (cmd.type === "start") {
      ctx.beginPath();
      // 回転前の座標系でそのまま描画（オフセットなし）
      ctx.moveTo(cmd.x * SCALE_FACTOR, cmd.y * SCALE_FACTOR);
    } else if (cmd.type === "draw") {
      ctx.lineWidth = 4 * SCALE_FACTOR;
      ctx.strokeStyle = "#000";
      ctx.lineTo(cmd.x * SCALE_FACTOR, cmd.y * SCALE_FACTOR);
      ctx.stroke();
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
    prepareAndRunAnimation();
    sendCanvasToMainProcess();
  } else if (data.type === "paperSize") {
    // 🔸 用紙サイズ変更の通知を受信
    currentPaperSize = data.size;
    console.log(`用紙サイズが${data.size}に変更されました`);
    
    // 🔸 用紙サイズに応じて拡大率を変更
    if (data.size === "poster") {
      SCALE_FACTOR = 2.4; // A4の4.0倍の60% = 2.4倍
      console.log("🔍 拡大率を2.4倍に変更（ポストカードモード - A4の60%サイズ）");
    } else {
      SCALE_FACTOR = 4.0;
      console.log("🔍 拡大率を4.0倍に変更（A4モード）");
    }
    
    // 🔸 キャンバスサイズを再計算
    updateCanvasSize();
    
  } else if (data.type === "background") {
    if (data.src === "white") {
      backgroundImage = null;
      lastBackgroundSrc = null;
      
      // 🔸 白背景の場合は通常サイズに戻す
      resetCanvasToNormalSize();
      redrawCanvas();
    } else {
      const img = new Image();
      const resolved = resolveImagePath(data.src);
      img.src = resolved;
      lastBackgroundSrc = resolved;
      img.onload = () => {
        backgroundImage = img;
        
        // 🔸 back2の場合は縦長に変更
        if (data.src.includes('back2')) {
          setCanvasToPortraitSize();
        } else {
          resetCanvasToNormalSize();
        }
        
        redrawCanvas();
      };
    }
  } else if (data.type === "clear") {
    drawingData = [];
    redrawCanvas();
  } else if (data.type === "start") {
    // 🔸 座標はスケール変換せずにそのまま保存（描画時に変換）
    drawingData.push({ ...data });
    
    // 🔸 リアルタイム描画（180度回転のみ）
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2); // キャンバス中心に移動
    ctx.rotate(Math.PI); // 180度回転（背景と同じ）
    ctx.translate(-canvas.width / 2, -canvas.height / 2); // 元の位置に戻す
    
    ctx.beginPath();
    ctx.moveTo(data.x * SCALE_FACTOR, data.y * SCALE_FACTOR);
    
    ctx.restore();
  } else if (data.type === "draw") {
    // 🔸 座標はスケール変換せずにそのまま保存（描画時に変換）
    drawingData.push({ ...data });
    
    // 🔸 リアルタイム描画（背景と同じ180度回転を適用 + 左上にオフセット）
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2); // キャンバス中心に移動
    ctx.rotate(Math.PI); // 180度回転（背景と同じ）
    ctx.translate(-canvas.width / 2, -canvas.height / 2); // 元の位置に戻す
    
    ctx.lineWidth = 4 * SCALE_FACTOR;
    ctx.strokeStyle = "#000";
    ctx.lineTo(data.x * SCALE_FACTOR, data.y * SCALE_FACTOR);
    ctx.stroke();
    
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
  }
}

function sendCanvasToMainProcess() {
  // 🔸 印刷用キャンバス（表示キャンバスをそのまま複製）
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = canvas.width;
  tmpCanvas.height = canvas.height;
  const tmpCtx = tmpCanvas.getContext("2d");

  console.log("🖨️ 印刷用キャンバス情報:");
  console.log(`- キャンバスサイズ: ${tmpCanvas.width} x ${tmpCanvas.height}`);
  console.log(`- SCALE_FACTOR: ${SCALE_FACTOR}`);
  console.log(`- drawingData項目数: ${drawingData.length}`);

  // 表示中のキャンバスをそのまま複製
  tmpCtx.drawImage(canvas, 0, 0);

  const imageDataUrl = tmpCanvas.toDataURL("image/png");
  // 🔸 印刷時に用紙サイズ情報も送信
  ipcRenderer.send("save-pdf", {
    imageData: imageDataUrl,
    paperSize: currentPaperSize
  });
}

// 🔸 音声再生関数
function playAudio() {
  try {
    console.log("🔊 音声再生を試行中...");
    
    // 音声を最初から再生
    audio.currentTime = 0;
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log("✅ 音声再生開始: haisyutu.mp3");
      }).catch(error => {
        console.error("❌ 音声再生エラー:", error);
      });
    }
  } catch (error) {
    console.error("❌ 音声再生に失敗:", error);
  }
}

function prepareAndRunAnimation() {
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

  runAnimationSequence();
}

function runAnimationSequence() {
  // 🔸 アニメーション画像を直接操作（containerではなく）
  
  // 初期状態を設定（その場に止まる）
  animationImage.style.transition = "none";
  animationImage.style.transform = "translateX(-50%)";

  // 🔸 用紙サイズに応じてアニメーション開始時間を調整
  let animationStartDelay;
  if (currentPaperSize === "poster") {
    animationStartDelay = 3800; // ポスター：3.8秒で開始
    console.log("🎬 ポスターモード：3.8秒でアニメーション開始");
  } else {
    animationStartDelay = 6000; // A4：従来通り6秒で開始
    console.log("🎬 A4モード：6秒でアニメーション開始");
  }

  // 🔸 調整されたタイミングでアニメーション開始
  setTimeout(() => {
    animationImage.style.transition = "transform 1.5s ease";
    animationImage.style.transform = "translateX(-50%) rotate(180deg)"; // 180度回転

    // 🔸 回転完了と同時に音声再生（回転開始から1.5秒後）
    setTimeout(() => {
      playAudio();
    }, 1500);

    // 🔸 回転完了後の待機時間を用紙サイズに応じて調整
    let rotationWaitTime;
    if (currentPaperSize === "A4") {
      rotationWaitTime = 5100; // A4：5.1秒待機（1.1秒 + 4秒）
      console.log("⏰ A4モード：回転後5.1秒待機してから移動開始");
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