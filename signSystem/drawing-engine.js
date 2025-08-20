// ==========================================
// Drawing Engine - 描画処理専用モジュール
// ==========================================

// 描画座標変換ユーティリティ
function getCanvasCoordinates(event, element) {
  const rect = element.getBoundingClientRect();
  const scaleX = element.width / rect.width;
  const scaleY = element.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  return { x, y };
}

// タッチイベント用座標変換
function getTouchCanvasCoordinates(event, element) {
  const touch = event.touches[0];
  const rect = element.getBoundingClientRect();
  const scaleX = element.width / rect.width;
  const scaleY = element.height / rect.height;
  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;
  return { x, y };
}

// キャンバス座標をページ座標に変換（エフェクト表示用）
function canvasToPageCoordinates(canvasX, canvasY, canvasElement) {
  const rect = canvasElement.getBoundingClientRect();
  const scaleX = rect.width / canvasElement.width;
  const scaleY = rect.height / canvasElement.height;
  const pageX = rect.left + (canvasX * scaleX);
  const pageY = rect.top + (canvasY * scaleY);
  return { x: pageX, y: pageY };
}

// ベジェ曲線補間用のヘルパー関数
function drawSmoothLine(ctx, points) {
  if (points.length < 2) return;
  
  if (points.length === 2) {
    // 2点の場合は直線
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }
  
  // 3点以上の場合はベジェ曲線で滑らかに
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    
    // 制御点を計算（前後の点から滑らかな曲線を作成）
    const cp1x = p1.x + (p2.x - p0.x) * 0.1;
    const cp1y = p1.y + (p2.y - p0.y) * 0.1;
    
    ctx.quadraticCurveTo(cp1x, cp1y, p2.x, p2.y);
  }
}

// 描画コンテキストの設定初期化
function setupDrawingContext() {
  ctx.strokeStyle = currentPenColor || 'black';
  ctx.lineWidth = currentPenThickness || 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

// 描画開始メッセージ作成
function createStartMessage(x, y) {
  return {
    type: "start",
    x: x,
    y: y,
    thickness: currentPenThickness,
    color: currentPenColor,
    writerId: myWriterId,
    timestamp: Date.now()
  };
}

// 描画継続メッセージ作成
function createDrawMessage(x, y) {
  return {
    type: "draw",
    x: x,
    y: y,
    thickness: currentPenThickness,
    color: currentPenColor,
    writerId: myWriterId,
    timestamp: Date.now(),
    starEffect: starEffectEnabled,
    fairyDustEffect: fairyDustEffectEnabled,
    canvasSize: {
      width: canvas.width,
      height: canvas.height
    }
  };
}

// 統合描画開始処理
function handleDrawingStart(x, y) {
  if (!isWithinBackgroundArea(x, y)) {
    return false;
  }

  isPaintDrawing = true;
  lastPaintPos = { x, y };

  // 点履歴をリセットして最初の点を追加
  pointHistory = [{ x, y }];

  // WriterID別描画状態をリセット
  if (myWriterId && writerDrawingStates[myWriterId]) {
    writerDrawingStates[myWriterId] = {
      isDrawing: false,
      lastPosition: null,
      color: currentPenColor,
      thickness: currentPenThickness
    };
  }

  // コンテキスト初期化と描画設定を統合
  setupDrawingContext();

  // 描画開始（最適化：1回のbeginPath()で処理）
  ctx.beginPath();
  ctx.moveTo(x, y);

  // 描画コマンドを記録
  const drawCommand = {
    type: 'start',
    x: x,
    y: y,
    color: currentPenColor,
    thickness: currentPenThickness,
    timestamp: Date.now(),
    writerId: myWriterId
  };
  drawingCommands.push(drawCommand);

  // WebSocket送信（接続確認付き）
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return true; // 描画は開始したがWebSocket送信はしない
  }

  const startMsg = createStartMessage(x, y);
  try {
    socket.send(JSON.stringify(startMsg));
  } catch (error) {
    console.error('描画開始メッセージ送信エラー:', error);
  }

  // ペン効果音の再生（必要に応じて）
  if (typeof playPenStartSound === 'function') {
    playPenStartSound();
  }

  // エフェクト生成（ハートチェックボックスがONの場合のみ）
  if (typeof createDrawingHeart === 'function' && heartEffectEnabled) {
    createDrawingHeart(x, y);
  }

  return true;
}

// 統合描画継続処理
function handleDrawingMove(x, y) {
  if (!isPaintDrawing || !lastPaintPos) return false;
  if (!isWithinBackgroundArea(x, y)) return false;

  // 点履歴を更新
  pointHistory.push({ x, y });
  if (pointHistory.length > MAX_POINT_HISTORY) {
    pointHistory.shift(); // 古い点を削除
  }

  // 滑らかな曲線を描画（3点以上の場合のみ）
  if (pointHistory.length >= 3) {
    // 最新の3点で曲線を描画
    const len = pointHistory.length;
    const p0 = pointHistory[len - 3];
    const p1 = pointHistory[len - 2];
    const p2 = pointHistory[len - 1];
    
    // 制御点を計算
    const cp1x = p1.x + (p2.x - p0.x) * 0.1;
    const cp1y = p1.y + (p2.y - p0.y) * 0.1;
    
    // 前の点から曲線で接続
    ctx.quadraticCurveTo(cp1x, cp1y, p2.x, p2.y);
    ctx.stroke();
  } else if (pointHistory.length === 2) {
    // 2点目の場合は直線で接続
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // 白赤ボーダー効果の処理
  if (currentPenColor === 'white-red-border') {
    drawWhiteRedBorderEffect();
  }

  // エフェクト生成（書き手側）- キャンバス座標をページ座標に変換
  const canvasElement = document.getElementById('drawCanvas');
  const pageCoords = canvasToPageCoordinates(x, y, canvasElement);
  
  if (starEffectEnabled) {
    createStar(pageCoords.x, pageCoords.y);
  }
  if (fairyDustEffectEnabled) {
    createFairyDust(pageCoords.x, pageCoords.y);
  }

  // 描画コマンド記録
  const drawCommand = {
    type: 'draw',
    x: x,
    y: y,
    color: currentPenColor === 'black' ? '#000' : currentPenColor,
    thickness: currentPenThickness,
    timestamp: Date.now(),
    writerId: myWriterId
  };
  drawingCommands.push(drawCommand);

  // WebSocket送信
  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      const drawMsg = createDrawMessage(x, y);
      socket.send(JSON.stringify(drawMsg));
    } catch (error) {
      console.error('描画継続メッセージ送信エラー:', error);
    }
  }

  // 位置更新
  lastPaintPos = { x, y };

  // エフェクト生成（ハートチェックボックスがONの場合のみ）
  if (typeof createDrawingHeart === 'function' && heartEffectEnabled) {
    createDrawingHeart(x, y);
  }

  return true;
}

// 統合描画終了処理
function handleDrawingEnd() {
  if (!isPaintDrawing) return;

  isPaintDrawing = false;
  lastPaintPos = null;

  // WriterID別描画状態を更新
  if (myWriterId && writerDrawingStates[myWriterId]) {
    writerDrawingStates[myWriterId].isDrawing = false;
    writerDrawingStates[myWriterId].lastPosition = null;
  }

  // ペン効果音の停止（必要に応じて）
  if (typeof stopPenSound === 'function') {
    stopPenSound();
  }

  return true;
}

// 白赤ボーダー効果描画
function drawWhiteRedBorderEffect() {
  if (!lastPaintPos) return;

  // 描画レイヤー定義（外側→内側の順）
  const layers = [
    { thickness: currentPenThickness + 10, alpha: 0.2, color: '#ffccdd' },
    { thickness: currentPenThickness + 8, alpha: 0.5, color: '#ffaacc' },
    { thickness: currentPenThickness + 6, alpha: 0.8, color: '#ff88bb' },
    { thickness: Math.max(1, currentPenThickness - 3), alpha: 0.9, color: '#ffffff' }
  ];

  // 現在の設定を保存
  const originalStrokeStyle = ctx.strokeStyle;
  const originalLineWidth = ctx.lineWidth;
  const originalGlobalAlpha = ctx.globalAlpha;

  // 各レイヤーを効率的に描画
  layers.forEach(layer => {
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = layer.thickness;
    ctx.globalAlpha = layer.alpha;
    ctx.stroke();
  });

  // 設定を復元
  ctx.strokeStyle = originalStrokeStyle;
  ctx.lineWidth = originalLineWidth;
  ctx.globalAlpha = originalGlobalAlpha;
}

// 描画エンジンの初期化
function initializeDrawingEngine() {
  const canvasElement = document.getElementById('drawCanvas');
  
  if (!canvasElement) {
    console.error('描画キャンバスが見つかりません');
    return false;
  }

  // マウスイベントリスナー
  canvasElement.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e, canvasElement);
    handleDrawingStart(x, y);
  });

  canvasElement.addEventListener('mousemove', (e) => {
    e.preventDefault();
    const { x, y } = getCanvasCoordinates(e, canvasElement);
    handleDrawingMove(x, y);
  });

  canvasElement.addEventListener('mouseup', (e) => {
    e.preventDefault();
    handleDrawingEnd();
  });

  // タッチイベントリスナー
  canvasElement.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const { x, y } = getTouchCanvasCoordinates(e, canvasElement);
    handleDrawingStart(x, y);
  });

  canvasElement.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const { x, y } = getTouchCanvasCoordinates(e, canvasElement);
      handleDrawingMove(x, y);
    }
  });

  canvasElement.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleDrawingEnd();
  });

  // ポインターイベントリスナー（現代ブラウザ用）
  if ('PointerEvent' in window) {
    canvasElement.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const { x, y } = getCanvasCoordinates(e, canvasElement);
      handleDrawingStart(x, y);
    });

    canvasElement.addEventListener('pointermove', (e) => {
      e.preventDefault();
      const { x, y } = getCanvasCoordinates(e, canvasElement);
      handleDrawingMove(x, y);
    });

    canvasElement.addEventListener('pointerup', (e) => {
      e.preventDefault();
      handleDrawingEnd();
    });
  }

  // mouseleaveで描画を終了（一般的なペイントツールの動作）
  canvasElement.addEventListener('mouseleave', (e) => {
    e.preventDefault();
    handleDrawingEnd();
  });

  // 右クリックで描画を中断
  canvasElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    handleDrawingEnd();
  });

  console.log('描画エンジンが初期化されました');
  return true;
}