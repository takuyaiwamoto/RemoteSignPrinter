// ==========================================
// Drawing Engine - 描画処理専用モジュール
// ==========================================

// 🔧【統合改善】座標変換の統一とパフォーマンス最適化
let cachedCanvasRect = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 100; // 100msキャッシュ

// 統一座標変換関数（マウス・タッチ・ポインター対応）
function getUnifiedCanvasCoordinates(event, element) {
  // キャッシュチェック（パフォーマンス最適化）
  const now = performance.now();
  if (!cachedCanvasRect || (now - cacheTimestamp) > CACHE_DURATION) {
    cachedCanvasRect = element.getBoundingClientRect();
    cacheTimestamp = now;
  }
  
  const rect = cachedCanvasRect;
  const scaleX = element.width / rect.width;
  const scaleY = element.height / rect.height;
  
  // イベントタイプに応じて座標を取得
  let clientX, clientY;
  
  if (event.touches && event.touches.length > 0) {
    // タッチイベント
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else {
    // マウス・ポインターイベント
    clientX = event.clientX;
    clientY = event.clientY;
  }
  
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  return { x, y };
}

// 後方互換性のため既存関数を残す
function getCanvasCoordinates(event, element) {
  return getUnifiedCanvasCoordinates(event, element);
}

function getTouchCanvasCoordinates(event, element) {
  return getUnifiedCanvasCoordinates(event, element);
}

// キャッシュ無効化機能（ウィンドウリサイズ時など）
function invalidateCanvasCache() {
  cachedCanvasRect = null;
  cacheTimestamp = 0;
}

// キャンバス座標をページ座標に変換（エフェクト表示用）
function canvasToPageCoordinates(canvasX, canvasY, canvasElement) {
  // 🔧【改善】こちらもキャッシュを使用
  const now = performance.now();
  if (!cachedCanvasRect || (now - cacheTimestamp) > CACHE_DURATION) {
    cachedCanvasRect = canvasElement.getBoundingClientRect();
    cacheTimestamp = now;
  }
  
  const rect = cachedCanvasRect;
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
    
    // 制御点を計算（滑らかさを向上、品質重視）
    const cp1x = p1.x + (p2.x - p0.x) * 0.15;
    const cp1y = p1.y + (p2.y - p0.y) * 0.15;
    
    ctx.quadraticCurveTo(cp1x, cp1y, p2.x, p2.y);
  }
}

// 描画コンテキストの設定初期化
function setupDrawingContext() {
  ctx.strokeStyle = currentPenColor || 'black';
  ctx.lineWidth = currentPenThickness || 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // 🔧【修正】自分の描画は完全不透明に設定（他Writerの透明度設定をリセット）
  ctx.globalAlpha = 1.0;
  
  // 描画品質向上設定（座標系に影響なし）
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalCompositeOperation = 'source-over';
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

  // 🔧【安全な修正】他の書き手が描画中でない場合のみbeginPath()を呼ぶ
  // 他の書き手のデータが存在する場合は、現在のパスを保持
  if (Object.keys(otherWritersData).length === 0) {
    // 他の書き手がいない場合は、通常通りbeginPath()で新しいパス開始
    ctx.beginPath();
  }
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
  
  // 🔍【デバッグ】Canvas状態と他Writer状況を確認
  console.log(`🎨 描画前Canvas状態:`, {
    globalAlpha: ctx.globalAlpha,
    globalCompositeOperation: ctx.globalCompositeOperation,
    strokeStyle: ctx.strokeStyle,
    lineWidth: ctx.lineWidth,
    otherWritersCount: Object.keys(otherWritersData).length
  });

  // 点履歴を更新
  pointHistory.push({ x, y });
  if (pointHistory.length > MAX_POINT_HISTORY) {
    pointHistory.shift(); // 古い点を削除
  }

  // 🎨 高品質ベジェ曲線で滑らかな描画
  if (pointHistory.length >= 4) {
    // 3次ベジェ曲線での超滑らか描画（4点以上で使用）
    const len = pointHistory.length;
    const p0 = pointHistory[len - 4];
    const p1 = pointHistory[len - 3];  
    const p2 = pointHistory[len - 2];
    const p3 = pointHistory[len - 1];
    
    // Catmull-Rom スプライン係数で制御点を計算
    const tension = 0.3; // 曲線の張り具合（0.1-0.5が適切）
    
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;
    
    // 3次ベジェ曲線で描画
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    ctx.stroke();
    
    // 🔧【安全な修正】他の書き手がいない場合のみパスをリセット
    if (Object.keys(otherWritersData).length === 0) {
      ctx.beginPath();
    }
    ctx.moveTo(p2.x, p2.y);
  } else if (pointHistory.length >= 3) {
    // 2次ベジェ曲線で滑らかに描画（3点の場合）
    const len = pointHistory.length;
    const p0 = pointHistory[len - 3];
    const p1 = pointHistory[len - 2];
    const p2 = pointHistory[len - 1];
    
    // 制御点を計算（中点ベース）
    const cp1x = p0.x + (p1.x - p0.x) * 0.5;
    const cp1y = p0.y + (p1.y - p0.y) * 0.5;
    
    ctx.quadraticCurveTo(cp1x, cp1y, p1.x, p1.y);
    ctx.stroke();
    
    // 🔧【安全な修正】他の書き手がいない場合のみパスをリセット  
    if (Object.keys(otherWritersData).length === 0) {
      ctx.beginPath();
    }
    ctx.moveTo(p1.x, p1.y);
  } else if (pointHistory.length === 2) {
    // 2点目は線形補間で滑らかに
    const midPoint = {
      x: (lastPaintPos.x + x) / 2,
      y: (lastPaintPos.y + y) / 2
    };
    ctx.quadraticCurveTo(lastPaintPos.x, lastPaintPos.y, midPoint.x, midPoint.y);
    ctx.stroke();
    
    // 🔧【安全な修正】他の書き手がいない場合のみパスをリセット
    if (Object.keys(otherWritersData).length === 0) {
      ctx.beginPath();
    }
    ctx.moveTo(midPoint.x, midPoint.y);
  } else {
    // 最初の点
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
    color: currentPenColor,
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
  
  // 🔍【デバッグ】描画後のCanvas状態確認
  console.log(`🎨 描画後Canvas状態:`, {
    globalAlpha: ctx.globalAlpha,
    globalCompositeOperation: ctx.globalCompositeOperation,
    strokeStyle: ctx.strokeStyle,
    lineWidth: ctx.lineWidth
  });

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

  // 高品質化は他のライターの描画を消すため無効化
  // renderSmoothDrawing(); // 🚫 この関数はキャンバス全体をクリアして自分の描画のみ再描画するため他者の描画が消える

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

  // 各レイヤーを高品質描画
  layers.forEach(layer => {
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = layer.thickness;
    ctx.globalAlpha = layer.alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  });

  // 設定を復元
  ctx.strokeStyle = originalStrokeStyle;
  ctx.lineWidth = originalLineWidth;
  ctx.globalAlpha = originalGlobalAlpha;
}

// 高品質再描画システム
function renderSmoothDrawing() {
  if (!drawingCommands || drawingCommands.length === 0) return;
  
  console.log('🎨 高品質再描画開始:', drawingCommands.length, 'コマンド');
  
  // 高解像度一時キャンバス作成（1.3倍サイズ）
  const smoothCanvas = document.createElement('canvas');
  smoothCanvas.width = Math.round(canvas.width * 1.3);
  smoothCanvas.height = Math.round(canvas.height * 1.3);
  const smoothCtx = smoothCanvas.getContext('2d');
  
  // 高品質描画設定
  smoothCtx.imageSmoothingEnabled = true;
  smoothCtx.imageSmoothingQuality = 'high';
  smoothCtx.lineCap = 'round';
  smoothCtx.lineJoin = 'round';
  
  // 描画コマンドをグループ化（writerID別、ストローク別）
  const strokes = [];
  let currentStroke = null;
  
  drawingCommands.forEach(cmd => {
    if (cmd.type === 'start') {
      if (currentStroke) strokes.push(currentStroke);
      currentStroke = {
        points: [{ x: cmd.x * 1.3, y: cmd.y * 1.3 }],
        color: cmd.color || 'black',
        thickness: (cmd.thickness || 8) * 1.3,
        isSpecialColor: cmd.color === 'white-red-border'
      };
    } else if (cmd.type === 'draw' && currentStroke) {
      currentStroke.points.push({ x: cmd.x * 1.3, y: cmd.y * 1.3 });
    }
  });
  
  if (currentStroke) strokes.push(currentStroke);
  
  // 各ストロークを高品質で再描画
  strokes.forEach(stroke => {
    if (stroke.points.length < 2) return;
    
    // white-red-border の場合は特別処理
    if (stroke.isSpecialColor) {
      renderWhiteRedBorderStroke(smoothCtx, stroke);
      return;
    }
    
    smoothCtx.strokeStyle = stroke.color;
    smoothCtx.lineWidth = stroke.thickness;
    smoothCtx.beginPath();
    smoothCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    if (stroke.points.length === 2) {
      // 2点の場合は直線
      smoothCtx.lineTo(stroke.points[1].x, stroke.points[1].y);
    } else {
      // 3点以上の場合は滑らかなベジェ曲線
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const p0 = stroke.points[i - 1];
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        
        // より滑らかな制御点計算
        const cp1x = p1.x + (p2.x - p0.x) * 0.2;
        const cp1y = p1.y + (p2.y - p0.y) * 0.2;
        
        smoothCtx.quadraticCurveTo(cp1x, cp1y, p2.x, p2.y);
      }
    }
    
    smoothCtx.stroke();
  });
  
  // 元キャンバスをクリアして高品質版を描画
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(smoothCanvas, 0, 0, canvas.width, canvas.height);
  
  console.log('✅ 高品質再描画完了');
}

// white-red-borderストロークの高品質レンダリング
function renderWhiteRedBorderStroke(ctx, stroke) {
  if (stroke.points.length < 2) return;
  
  // 白赤ボーダー効果のレイヤー定義（高解像度対応）
  const layers = [
    { thickness: stroke.thickness + 13, alpha: 0.2, color: '#ffccdd' },
    { thickness: stroke.thickness + 10, alpha: 0.5, color: '#ffaacc' },
    { thickness: stroke.thickness + 8, alpha: 0.8, color: '#ff88bb' },
    { thickness: Math.max(1, stroke.thickness - 4), alpha: 0.9, color: '#ffffff' }
  ];
  
  // 各レイヤーを描画
  layers.forEach(layer => {
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = layer.thickness;
    ctx.globalAlpha = layer.alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // ストロークパスを描画
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    
    if (stroke.points.length === 2) {
      ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
    } else {
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const p0 = stroke.points[i - 1];
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        
        const cp1x = p1.x + (p2.x - p0.x) * 0.2;
        const cp1y = p1.y + (p2.y - p0.y) * 0.2;
        
        ctx.quadraticCurveTo(cp1x, cp1y, p2.x, p2.y);
      }
    }
    
    ctx.stroke();
  });
  
  // アルファを復元
  ctx.globalAlpha = 1.0;
}

// 手動高品質化のグローバル関数（デバッグ用）
function enhanceDrawingQuality() {
  console.log('🎨 手動高品質化実行');
  renderSmoothDrawing();
}

// 描画エンジンの初期化
function initializeDrawingEngine() {
  const canvasElement = document.getElementById('drawCanvas');
  
  if (!canvasElement) {
    console.error('❌ 描画キャンバスが見つかりません');
    return false;
  }
  
  console.log('🎨 描画エンジン初期化開始:', canvasElement);

  // マウスイベントリスナー
  // 🔧【統合改善】イベントハンドラーの統合と最適化
  
  // 統一イベントハンドラー関数
  function handleUnifiedInputStart(e) {
    e.preventDefault();
    // マルチタッチを防止（描画は1本指のみ）
    if (e.touches && e.touches.length > 1) return;
    
    const { x, y } = getUnifiedCanvasCoordinates(e, canvasElement);
    handleDrawingStart(x, y);
  }
  
  function handleUnifiedInputMove(e) {
    e.preventDefault();
    // マルチタッチを防止
    if (e.touches && e.touches.length > 1) return;
    
    const { x, y } = getUnifiedCanvasCoordinates(e, canvasElement);
    handleDrawingMove(x, y);
  }
  
  function handleUnifiedInputEnd(e) {
    e.preventDefault();
    handleDrawingEnd();
  }
  
  // Pointer Events を優先使用（モダンブラウザ対応）
  if ('PointerEvent' in window) {
    console.log('🖱️ Pointer Events使用（モダンブラウザ対応）');
    canvasElement.addEventListener('pointerdown', handleUnifiedInputStart);
    canvasElement.addEventListener('pointermove', handleUnifiedInputMove);
    canvasElement.addEventListener('pointerup', handleUnifiedInputEnd);
    canvasElement.addEventListener('pointercancel', handleUnifiedInputEnd);
  } else {
    // フォールバック：従来のマウス・タッチイベント
    console.log('🖱️ マウス・タッチイベント使用（レガシーブラウザ対応）');
    
    // マウスイベント
    canvasElement.addEventListener('mousedown', handleUnifiedInputStart);
    canvasElement.addEventListener('mousemove', handleUnifiedInputMove);
    canvasElement.addEventListener('mouseup', handleUnifiedInputEnd);
    
    // タッチイベント
    canvasElement.addEventListener('touchstart', handleUnifiedInputStart, { passive: false });
    canvasElement.addEventListener('touchmove', handleUnifiedInputMove, { passive: false });
    canvasElement.addEventListener('touchend', handleUnifiedInputEnd, { passive: false });
    canvasElement.addEventListener('touchcancel', handleUnifiedInputEnd, { passive: false });
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

  // ウィンドウリサイズ時にキャッシュを無効化
  window.addEventListener('resize', invalidateCanvasCache);
  window.addEventListener('orientationchange', invalidateCanvasCache);
  
  console.log('✅ 描画エンジンが初期化されました (統合入力システム)');
  return true;
}

// ページ読み込み完了時に自動初期化
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🚀 DOMContentLoaded: 描画エンジン自動初期化');
      initializeDrawingEngine();
    });
  } else {
    // 既にDOMが読み込まれている場合
    console.log('🚀 DOM Ready: 描画エンジン即座に初期化');
    initializeDrawingEngine();
  }
}