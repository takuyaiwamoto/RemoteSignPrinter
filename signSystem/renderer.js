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

let socket = new WebSocket("wss://realtime-sign-server.onrender.com");
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
      ctx.lineWidth = 4 * (drawingAreaSize.width / senderCanvasSize.width); // 線の太さもスケール
      ctx.strokeStyle = "#000";
      // 🔸 描画エリア調整を適用した座標変換
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      
      // 描画エリアの中央位置に調整
      const areaCenterX = canvas.width / 2 + drawingAreaOffset.x;
      const areaCenterY = canvas.height / 2 + drawingAreaOffset.y;
      const areaLeft = areaCenterX - drawingAreaSize.width / 2;
      const areaTop = areaCenterY - drawingAreaSize.height / 2;
      
      ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
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
    // 🔸 送信ボタンで印刷ペンと同じ処理を実行
    console.log("🔴 送信ボタン押下 → 印刷ペン処理 + アニメーション実行");
    printPen();
    prepareAndRunAnimation();
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
    
    ctx.lineWidth = 4 * (drawingAreaSize.width / senderCanvasSize.width); // 線の太さもスケール
    ctx.strokeStyle = "#000";
    ctx.lineTo(areaLeft + scaledX, areaTop + scaledY);
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
      printCtx.lineWidth = 4 * (drawingAreaSize.width / senderCanvasSize.width);
      printCtx.strokeStyle = "#000";
      const scaledX = (cmd.x / senderCanvasSize.width) * drawingAreaSize.width;
      const scaledY = (cmd.y / senderCanvasSize.height) * drawingAreaSize.height;
      printCtx.lineTo(scaledX, scaledY);
      printCtx.stroke();
    }
  });
  
  // 印刷用データを作成
  const imageDataUrl = printCanvas.toDataURL("image/png");
  
  // 🔸 印刷時に用紙サイズ情報も送信
  ipcRenderer.send("save-pdf", {
    imageData: imageDataUrl,
    paperSize: currentPaperSize,
    printType: "pen"
  });
  
  console.log('🖨️ 送信ボタン印刷（描画データのみ）を実行');
}

// 🔸 受信側キャンバスサイズ設定関数
function setReceiverCanvasSize() {
  // Dev Tool設定を適用したサイズを計算
  const newWidth = Math.floor(senderCanvasSize.width * SCALE_FACTOR * devCanvasScale);
  const newHeight = Math.floor(senderCanvasSize.height * SCALE_FACTOR * devCanvasScale);
  
  canvas.width = newWidth;
  canvas.height = newHeight;
  canvas.style.width = newWidth + "px";
  canvas.style.height = newHeight + "px";
  
  // 受信側のキャンバスサイズを記録
  receiverCanvasSize = { width: newWidth, height: newHeight };
  
  console.log(`📐 受信側キャンバスサイズ変更: ${newWidth} x ${newHeight}`);
  console.log(`📊 送信側: ${senderCanvasSize.width} x ${senderCanvasSize.height}`);
  console.log(`📊 受信側: ${receiverCanvasSize.width} x ${receiverCanvasSize.height}`);
}

// 🔸 Dev Tool関数
function applyCanvasScale() {
  // 送信側サイズに基づいて再計算
  setReceiverCanvasSize();
  redrawCanvas();
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

    // 音声再生は削除されました

    // 🔸 回転完了後の待機時間（Dev Tool設定を使用）
    let rotationWaitTime;
    if (currentPaperSize === "A4") {
      rotationWaitTime = devRotationWaitTime * 1000; // Dev設定の秒数をmsに変換
      console.log(`⏰ A4モード：回転後${devRotationWaitTime}秒待機してから移動開始`);
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
      previewCtx.lineWidth = 4 * (drawingAreaSize.width / senderCanvasSize.width);
      previewCtx.strokeStyle = "#000";
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
  
  // 印刷用データを作成
  const imageDataUrl = printCanvas.toDataURL("image/png");
  
  // Electronのメインプロセスに印刷データを送信
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send("save-pdf", {
      imageData: imageDataUrl,
      paperSize: currentPaperSize,
      printType: "full"
    });
  }
  
  console.log('🖨️ フル印刷（背景込み）を実行');
}

// 🔸 印刷ペン機能（描画データのみ）
function printPen() {
  const printCanvas = document.createElement('canvas');
  const printCtx = printCanvas.getContext('2d');
  
  // 印刷用キャンバスサイズを設定
  printCanvas.width = drawingAreaSize.width;
  printCanvas.height = drawingAreaSize.height;
  
  // 🔸 印刷画像を180度回転
  printCtx.translate(printCanvas.width, printCanvas.height);
  printCtx.rotate(Math.PI);
  
  // 背景は透明のまま（描画データのみ）
  
  // 筆跡のみを描画
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
  
  // 印刷用データを作成
  const imageDataUrl = printCanvas.toDataURL("image/png");
  
  // Electronのメインプロセスに印刷データを送信
  if (typeof ipcRenderer !== 'undefined') {
    ipcRenderer.send("save-pdf", {
      imageData: imageDataUrl,
      paperSize: currentPaperSize,
      printType: "pen"
    });
  }
  
  console.log('🖨️ ペン印刷（描画データのみ）を実行');
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