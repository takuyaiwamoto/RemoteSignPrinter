// drawing-lines.js - 描画ライン・アニメーション関連の機能を分離
// 元ファイル: remotesign.html
// 分離日: 2025-08-20

// ==========================================
// WriterID別描画状態管理関数群
// ==========================================

// 🎨 WriterID別描画状態ヘルパー関数
function getWriterDrawingState(writerId) {
  if (!writerId) writerId = 'self'; // 自分の描画の場合
  
  if (!writerDrawingStates[writerId]) {
    writerDrawingStates[writerId] = {
      lastPosition: null,
      currentPath: [],
      isDrawing: false
    };
  }
  return writerDrawingStates[writerId];
}

// 🎨 WriterID別描画状態リセット関数
function resetWriterDrawingState(writerId) {
  if (!writerId) writerId = 'self';
  writerDrawingStates[writerId] = {
    lastPosition: null,
    currentPath: [],
    isDrawing: false
  };
}

// ==========================================
// 連続描画ライン関数群
// ==========================================

// 🎨 WriterID別連続描画関数
function drawContinuousLineForWriter(x, y, writerId = 'self') {
  const writerState = getWriterDrawingState(writerId);
  
  if (!writerState.lastPosition) {
    // 描画開始点 - 他WriterIDとの状態混在を完全に防止
    ctx.beginPath(); // 重要：他のWriterの未完了パスをクリア
    ctx.moveTo(x, y);
    writerState.lastPosition = { x, y };
    writerState.currentPath = [{ x, y }];
    return;
  }
  
  // 距離が近すぎる場合はスキップ（パフォーマンス向上）
  const lastPos = writerState.lastPosition;
  const distance = Math.sqrt(Math.pow(x - lastPos.x, 2) + Math.pow(y - lastPos.y, 2));
  if (distance < 1) {
    return; // 1ピクセル以下の移動は無視
  }
  
  // スムージング: quadratic curve で滑らかな曲線を描画
  if (writerState.currentPath && writerState.currentPath.length >= 2) {
    const prev2 = writerState.currentPath[writerState.currentPath.length - 2];
    const prev1 = writerState.currentPath[writerState.currentPath.length - 1];
    
    // 中点を制御点として使用
    const midX = (prev1.x + x) / 2;
    const midY = (prev1.y + y) / 2;
    
    ctx.quadraticCurveTo(prev1.x, prev1.y, midX, midY);
    ctx.stroke();
  } else {
    // 最初の数点は直線
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  
  // 現在の点をパスに追加
  writerState.currentPath.push({ x, y });
  
  // パスの長さを制限（メモリ効率化）
  if (writerState.currentPath.length > 3) {
    writerState.currentPath.shift();
  }
  
  writerState.lastPosition = { x, y };
}

// 🎨 連続的な描画関数（一般的なペイントツールスタイル）- レガシー互換用
function drawContinuousLine(x, y) {
  // 新しいWriterID別描画システムを使用
  drawContinuousLineForWriter(x, y, 'self');
  // レガシー変数も更新（後方互換性のため）
  lastPosition = { x, y };
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ drawing-lines.js loaded successfully');