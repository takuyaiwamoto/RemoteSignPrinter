// canvas-background.js - 背景・キャンバス管理関連の機能を分離
// 元ファイル: remotesign.html
// 分離日: 2025-08-20

// ==========================================
// 背景範囲計算関数群
// ==========================================

// 🔸 背景画像の範囲を計算する関数（グローバル）
function getBackgroundArea() {
  if (!backgroundImage) {
    // 背景画像がない場合は全範囲を許可
    // console.log('🖼️ 背景画像なし - 全範囲を許可'); // 軽量化
    return {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height
    };
  }
  
  // drawBackgroundImage関数と同じ計算ロジック（2倍拡大を含む）
  const canvasRatio = canvas.width / canvas.height;
  const imageRatio = backgroundImage.width / backgroundImage.height;
  
  let baseWidth, baseHeight;
  
  // 基本サイズを計算（contain方式）
  if (imageRatio > canvasRatio) {
    // 画像の方が横長
    baseWidth = canvas.width;
    baseHeight = canvas.width / imageRatio;
  } else {
    // 画像の方が縦長
    baseHeight = canvas.height;
    baseWidth = canvas.height * imageRatio;
  }
  
  // 背景画像と描画エリアを同じサイズに
  const scale = 1.0;
  const drawWidth = baseWidth * scale;
  const drawHeight = baseHeight * scale;
  
  // 中央に配置するためのオフセット
  const offsetX = (canvas.width - drawWidth) / 2;
  const offsetY = (canvas.height - drawHeight) / 2;
  
  // console.log('🖼️ 背景画像範囲計算:', {
  //   canvasSize: { width: canvas.width, height: canvas.height },
  //   imageSize: { width: backgroundImage.width, height: backgroundImage.height },
  //   baseSize: { width: baseWidth, height: baseHeight },
  //   scale: scale,
  //   drawArea: { x: offsetX, y: offsetY, width: drawWidth, height: drawHeight }
  // }); // 軽量化
  
  return {
    x: offsetX,
    y: offsetY,
    width: drawWidth,
    height: drawHeight
  };
}

// 🔸 座標が背景画像の範囲内かチェックする関数（グローバル）
function isWithinBackgroundArea(x, y) {
  // 背景画像範囲チェックを再有効化して詳細ログ出力
  const bgArea = getBackgroundArea();
  
  const withinX = x >= bgArea.x && x <= bgArea.x + bgArea.width;
  const withinY = y >= bgArea.y && y <= bgArea.y + bgArea.height;
  const isWithin = withinX && withinY;
  
  // console.log('🖼️ 背景画像範囲チェック詳細:', {
  //   clickX: x,
  //   clickY: y,
  //   bgX: bgArea.x,
  //   bgY: bgArea.y,
  //   bgWidth: bgArea.width,
  //   bgHeight: bgArea.height,
  //   withinX: withinX,
  //   withinY: withinY,
  //   isWithin: isWithin
  // }); // 軽量化
  
  return isWithin;
}

// ==========================================
// 背景画像描画関数群
// ==========================================

// 🔸 背景画像をアスペクト比を保持して描画する関数（2倍サイズ・キャンバス自動調整）
function drawBackgroundImage(ctx, image, canvas) {
  if (!image) return;
  
  console.log('🖼️ 背景画像をキャンバス下に設定');
  console.log(`📥 画像サイズ: ${image.naturalWidth}x${image.naturalHeight}`);
  
  // キャンバスサイズはそのままで、CSSで背景画像を設定
  const canvasElement = document.getElementById('drawCanvas');
  if (canvasElement) {
    canvasElement.style.backgroundImage = `url(${image.src})`;
    canvasElement.style.backgroundSize = 'contain';
    canvasElement.style.backgroundRepeat = 'no-repeat';
    canvasElement.style.backgroundPosition = 'center';
    
    console.log(`✅ 背景画像をCSS背景として設定: ${image.src}`);
  }
}

// ==========================================
// キャンバスサイズ管理関数群
// ==========================================

// 🔸 キャンバスをポートレート（縦型）サイズに設定
function setCanvasToPortraitSize() {
  canvas.setAttribute('width', '420');
  canvas.setAttribute('height', '283');
  canvas.style.width = '420px';
  canvas.style.height = '283px';
  
  // console.log(`書き手側キャンバスをポートレートサイズに変更: ${canvas.width} x ${canvas.height}`);
}

// 🔸 キャンバスを通常サイズにリセット
function resetCanvasToNormalSize() {
  canvas.setAttribute('width', '283');
  canvas.setAttribute('height', '420');
  canvas.style.width = '283px';
  canvas.style.height = '420px';
  
  // console.log(`書き手側キャンバスを通常サイズに変更: ${canvas.width} x ${canvas.height}`);
}

// ==========================================
// 背景設定関数群
// ==========================================

// 🔸 背景設定関数
function setBackground(src) {
  // console.log('setBackground関数呼び出し:', src, 'WebSocket状態:', socket ? socket.readyState : 'socket未初期化');
  
  // 背景変更時に他のwriterの古いデータをクリア
  // ※ 自分が明示的に背景を変更した場合のみクリアする（初期化時は除く）
  if (lastBackgroundSrc !== undefined && lastBackgroundSrc !== src) {
    // console.log('🧹 背景変更: 他のwriter描画データをクリア');
    otherWritersData = {};
  }
  
  if (src === null) {
    backgroundImage = null;
    
    // 🔸 白背景の場合も縦長サイズを設定（背景画像と同じ傾向）
    canvas.width = 400;  // 幅（横）
    canvas.height = 600; // 高さ（縦）
    
    console.log(`📄 白背景縦長確認: 幅${canvas.width} < 高さ${canvas.height} = ${canvas.width < canvas.height ? '縦長' : '横長'}`);
    
    console.log(`📄 白背景キャンバス: ${canvas.width}x${canvas.height}`);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 🔧 WebSocket接続状態を確認してから白背景データを送信
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ 
        type: "background", 
        src: "white",
        writerId: myWriterId,
        canvasSize: { 
          width: canvas.width,
          height: canvas.height 
        },
        scale: canvasScale,
        originalSize: backgroundSizes['white']
      }));
      
      console.log(`📡 白背景とキャンバスサイズを受信側に送信: ${canvas.width}x${canvas.height}`);
    } else {
      console.log(`⚠️ WebSocket未接続のため白背景データ送信をスキップ (状態: ${socket?.readyState})`);
    }
  } else {
    const img = new Image();
    img.src = src;
    // console.log("🔍 背景画像読み込み開始:", src);
    
    img.onload = () => {
      // console.log("✅ 背景画像読み込み成功:", src);
      backgroundImage = img;
      
      // 🔸 背景画像キーを取得（後で参照用）
      const backgroundKey = src.includes('back3') ? 'back3' : (src.includes('back4') ? 'back4' : (src.includes('back5') ? 'back5' : (src.includes('back6') ? 'back6' : 'back2')));
      
      // ⚠️ setCanvasSize()を削除 - drawBackgroundImage()でサイズ決定
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // アスペクト比を保持して描画
      const imageAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imageAspect > canvasAspect) {
        // 画像が横長の場合、幅をキャンバス幅に合わせる
        drawWidth = canvas.width;
        drawHeight = drawWidth / imageAspect;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        // 画像が縦長の場合、高さをキャンバス高さに合わせる
        drawHeight = canvas.height;
        drawWidth = drawHeight * imageAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      }
      
      // 全背景で統一されたアスペクト比処理を使用
      
      // 書き手側では背景画像を回転なしで表示
      drawBackgroundImage(ctx, backgroundImage, canvas);
      
      // 背景ソースを記録
      lastBackgroundSrc = src;
      
      // 🔍 背景画像の配置情報を詳細表示
      // console.log(`🖼️ 背景画像配置詳細 [${src}]:`);
      // console.log(`  キャンバスサイズ: ${canvas.width}x${canvas.height}`);
      // console.log(`  元画像サイズ: ${img.naturalWidth}x${img.naturalHeight}`);
      // console.log(`  描画サイズ: ${drawWidth.toFixed(1)}x${drawHeight.toFixed(1)}`);
      // console.log(`  描画位置: (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);
      // console.log(`  画像の占有率: ${((drawWidth * drawHeight) / (canvas.width * canvas.height) * 100).toFixed(1)}%`);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const bgCenterX = offsetX + drawWidth / 2;
      const bgCenterY = offsetY + drawHeight / 2;
      // console.log(`  キャンバス中心: (${centerX}, ${centerY}) 緑点`);
      // console.log(`  背景画像中心: (${bgCenterX.toFixed(1)}, ${bgCenterY.toFixed(1)}) 青点`);
      
      // 🔍 デバッグ表示が有効な場合のみ視覚的な表示を追加
      if (backgroundDebugEnabled) {
        addBackgroundDebugVisuals(offsetX, offsetY, drawWidth, drawHeight);
      }
      
      // 🔧 WebSocket接続状態を確認してから背景画像データを送信
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ 
          type: "background", 
          src: src,
          writerId: myWriterId,
          canvasSize: { 
            width: canvas.width,
            height: canvas.height 
          },
          scale: canvasScale,
          originalSize: backgroundSizes[backgroundKey]
        }));
        
        console.log(`📡 背景画像とキャンバスサイズを受信側に送信: ${canvas.width}x${canvas.height}`);
      } else {
        console.log(`⚠️ WebSocket未接続のため背景画像データ送信をスキップ (状態: ${socket?.readyState})`);
      }
    };
    
    img.onerror = (error) => {
      console.error("❌ 背景画像読み込みエラー:", src, error);
      alert("背景画像が見つかりません: " + src);
    };
  }
}

// 🔸 特殊背景設定関数（扉開く演出付き）
function setSpecialBackground(src) {
  // console.log(`🚪 特殊背景設定開始: ${src}`);
  
  // 受信側に扉アニメーション開始を通知
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "doorAnimation",
      imageSrc: src
    }));
    // console.log('🚪 受信側に扉アニメーション開始を送信');
  }
}

// 🔸 キャンバスサイズ設定関数
function setCanvasSize(backgroundKey) {
  // ❌ この関数を無効化 - drawBackgroundImageでサイズ管理
  console.log(`⚠️ setCanvasSize(${backgroundKey})は無効化されました`);
  return;
  
  // console.log(`📐 送信側キャンバスサイズ変更: ${size.width} x ${size.height}`);
}

// 🎪 特殊背景設定関数（ドア開閉アニメーション付き）
function setSpecialBackground(src) {
  // console.log('🎪 特殊背景設定開始:', src, 'State:', specialBackgroundState);
  
  if (specialBackgroundState === 'ready') {
    // 第1段階: 扉を表示して停止
    // console.log('🚪 第1段階: 扉表示');
    specialBackgroundState = 'door_shown';
    
    // 受信側に扉表示のみを通知
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ 
        type: "doorAnimation", 
        action: "show_door_only",
        backgroundSrc: src
      }));
      // console.log('🚪 受信側に扉表示のみを送信');
    }
    
    // 送信側でも視覚的フィードバック
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 背景画像を事前に読み込み
    const img = new Image();
    img.src = src;
    img.onload = () => {
      backgroundImage = img;
      // console.log("✅ 特殊背景画像読み込み成功（待機中）:", src);
    };
    
  } else if (specialBackgroundState === 'door_shown') {
    // 第2段階: 扉を開く
    // console.log('🚪 第2段階: 扉開放');
    specialBackgroundState = 'door_opened';
    
    // 受信側に扉開放を通知
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ 
        type: "doorAnimation", 
        action: "open_door",
        backgroundSrc: src
      }));
      // console.log('🚪 受信側に扉開放を送信');
    }
    
    // 1秒後に背景を設定（ドアが開くタイミング）
    setTimeout(() => {
      if (backgroundImage) {
        // console.log("✅ 特殊背景画像設定開始:", src);
        
        // 背景画像キーを取得（参照用）
        const backgroundKey = src.includes('back3') ? 'back3' : (src.includes('back4') ? 'back4' : (src.includes('back5') ? 'back5' : (src.includes('back6') ? 'back6' : 'back2')));
        
        // ⚠️ setCanvasSize()を削除 - drawBackgroundImage()でサイズ決定
        
        // キャンバスをクリアして背景を描画
        ctx.restore();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackgroundImage(ctx, backgroundImage, canvas);
        
        // 受信側に背景変更を通知
        socket.send(JSON.stringify({ 
          type: "specialBackground", 
          src: src,
          canvasSize: backgroundSizes[backgroundKey],
          doorAction: "opened"
        }));
        
        // 特別なエフェクトを追加（星や妖精の粉を散らす）
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            if (starEffectEnabled) {
              createStar(x, y);
            }
            if (fairyDustEffectEnabled) {
              createFairyDust(x, y);
            }
          }, i * 100);
        }
        
        // 特別な音を再生（sound1.mp3を削除）
        
        // 🎪 背景が正常に適用されたのでトグルフラグを反転
        specialBackgroundToggle = !specialBackgroundToggle;
        // console.log(`🎪 背景適用完了 - フラグを反転: ${specialBackgroundToggle}`);
        
        // 1秒後に通常状態に戻す
        setTimeout(() => {
          specialBackgroundState = 'ready';
          // console.log('🎪 特殊背景処理完了 - 状態を通常に戻す');
        }, 1000);
      }
    }, 1000);
  }
}

// 🔸 特殊背景切り替え関数
function setSpecialBackgroundToggle() {
  // specialBackgroundToggleの値に応じて背景を切り替え
  if (specialBackgroundToggle) {
    setSpecialBackground('./back6.png');
    // console.log('🎪 特殊背景: back6.png に切り替え');
  } else {
    setSpecialBackground('./back5.png');
    // console.log('🎪 特殊背景: back5.png に切り替え');
  }
}

// ==========================================
// キャンバスクリア関数群
// ==========================================

// 🔸 キャンバス全体をクリアする関数
function clearCanvas() {
  console.log('🧹 キャンバス全体をクリア開始');
  
  // キャンバスを完全にクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 背景画像があれば再描画
  if (backgroundImage) {
    drawBackgroundImage(ctx, backgroundImage, canvas);
  }
  
  // 🔧【修正】全ての描画データを完全クリア
  drawingCommands = [];
  if (typeof otherWritersData !== 'undefined') {
    otherWritersData = {};
  }
  
  // 🔧【追加】描画エンジンの状態もクリア
  if (typeof pointHistory !== 'undefined') {
    pointHistory = [];
  }
  if (typeof lastPaintPos !== 'undefined') {
    lastPaintPos = null;
  }
  if (typeof isPaintDrawing !== 'undefined') {
    isPaintDrawing = false;
  }
  if (typeof writerDrawingStates !== 'undefined') {
    // constオブジェクトは再代入不可のため、プロパティを削除
    Object.keys(writerDrawingStates).forEach(key => {
      delete writerDrawingStates[key];
    });
  }
  
  // 🔧【修正】グローバル関数を使用してWebSocket送信
  if (typeof sendGlobalClearMessage === 'function') {
    const success = sendGlobalClearMessage();
    if (success) {
      console.log('📡 全体クリアを受信側に送信');
    } else {
      console.warn('⚠️ 全体クリア送信失敗');
    }
  } else {
    console.error('❌ sendGlobalClearMessage関数が見つかりません');
  }
  
  console.log('✅ 全体クリア完了 - 全描画データと状態をクリア');
}

// 🔸 自分の描画のみをクリアする関数
function clearMyDrawing() {
  console.log('🧹 自分の描画のみをクリア開始');
  
  // 🔧【修正】自分の描画データのみをクリア
  drawingCommands = [];
  
  // 🔧【修正】描画エンジンの自分の状態のみクリア
  if (typeof pointHistory !== 'undefined') {
    pointHistory = [];
  }
  if (typeof lastPaintPos !== 'undefined') {
    lastPaintPos = null;
  }
  if (typeof isPaintDrawing !== 'undefined') {
    isPaintDrawing = false;
  }
  if (typeof writerDrawingStates !== 'undefined' && myWriterId) {
    delete writerDrawingStates[myWriterId];
  }
  
  // 🔧【重要】キャンバス全体をクリアして再描画（自分の分だけ除外）
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (backgroundImage) {
    drawBackgroundImage(ctx, backgroundImage, canvas);
  }
  
  // 🔧【重要】他の人の描画を再描画（自分の描画は除外済み）
  if (typeof redrawCanvasWithOthers === 'function') {
    redrawCanvasWithOthers();
  }
  
  // 🔧【修正】グローバル関数を使用してWebSocket送信
  if (typeof sendClearWriterMessage === 'function') {
    const success = sendClearWriterMessage();
    if (success) {
      console.log('📡 自分の描画クリアを受信側に送信');
    } else {
      console.warn('⚠️ 自分の描画クリア送信失敗');
    }
  } else {
    console.error('❌ sendClearWriterMessage関数が見つかりません');
  }
  
  console.log('✅ 自分の描画クリア完了 - 他の人の描画は保持');
}

// ==========================================
// 背景デバッグ関数群
// ==========================================

// 🔸 背景デバッグ表示制御関数
function toggleBackgroundDebug() {
  backgroundDebugEnabled = !backgroundDebugEnabled;
  // console.log(`🔍 背景デバッグ表示: ${backgroundDebugEnabled ? 'ON' : 'OFF'}`);
  
  // 既存の背景デバッグ要素を削除
  const existingDebugElements = document.querySelectorAll('.background-debug');
  existingDebugElements.forEach(element => element.remove());
  
  // デバッグが有効で背景画像が設定されている場合、デバッグ情報を表示
  if (backgroundDebugEnabled && backgroundImage) {
    // 背景のデバッグ情報を再表示
    const rect = canvas.getBoundingClientRect();
    // 簡単なデバッグ表示の実装
    console.log('🔍 背景デバッグ情報を表示');
  }
}

// 🔸 背景デバッグビジュアル追加関数
function addBackgroundDebugVisuals(offsetX, offsetY, drawWidth, drawHeight) {
  // デバッグ用の視覚的要素を追加
  const debugDiv = document.createElement('div');
  debugDiv.className = 'background-debug';
  debugDiv.style.cssText = `
    position: absolute;
    left: ${offsetX}px;
    top: ${offsetY}px;
    width: ${drawWidth}px;
    height: ${drawHeight}px;
    border: 2px solid red;
    pointer-events: none;
    z-index: 1000;
  `;
  
  // キャンバスの親要素に追加
  const canvasContainer = canvas.parentElement;
  if (canvasContainer) {
    canvasContainer.style.position = 'relative';
    canvasContainer.appendChild(debugDiv);
  }
  
  console.log(`🔍 背景デバッグビジュアル追加: ${offsetX}, ${offsetY}, ${drawWidth}x${drawHeight}`);
}

// ==========================================
// PNG背景表示関数群
// ==========================================

// 🔸 送信側PNG背景表示関数
function showSenderPngBackground() {
  // 送信側でのPNG背景表示処理
  console.log('🖼️ 送信側でPNG背景を表示');
  
  // 背景画像をPNGに設定
  setBackground('./background.png');
}

// ==========================================
// 背景変形関数群
// ==========================================

// 🔸 背景画像の変形パラメータ更新関数
function updateBackgroundTransform() {
  // 背景画像の変形処理
  console.log('🔄 背景画像変形パラメータを更新');
  
  // 変形パラメータに基づいて背景を再描画
  if (backgroundImage) {
    drawBackgroundImage(ctx, backgroundImage, canvas);
  }
}

// ==========================================
// テスト・デバッグ関数群
// ==========================================

// 🔸 右下描画テスト関数
function testDrawRightBottom() {
  console.log('🎯 右下描画テストを開始');
  
  // デバイス情報を取得
  const device = DeviceManager.detectDevice();
  console.log('🔍 現在のデバイス情報:', device);
  
  if (!canvas) {
    console.error('❌ キャンバスが見つかりません');
    return;
  }
  
  // キャンバスサイズを取得
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  console.log(`🎯 キャンバスサイズ: ${canvasWidth} x ${canvasHeight}`);
  
  // 右下の位置を計算（キャンバスの右下角から少し内側）
  const margin = 20; // 端からの余白
  const lineLength = 30; // 線の長さ
  
  const startX = canvasWidth - margin - lineLength;
  const startY = canvasHeight - margin - lineLength;
  const endX = canvasWidth - margin;
  const endY = canvasHeight - margin;
  
  console.log(`🎯 テスト線の座標: (${startX}, ${startY}) → (${endX}, ${endY})`);
  
  // 線を描画
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = '#FF1493'; // 目立つピンク色
  ctx.lineWidth = 4;
  ctx.stroke();
  
  // WebSocketでデータを送信（実際の描画と同じ形式）
  if (socket.readyState === WebSocket.OPEN && myWriterId) {
    // 開始点を送信
    socket.send(JSON.stringify({
      type: "draw",
      x: startX,
      y: startY,
      drawing: true,
      writerId: myWriterId,
      thickness: 4,
      color: '#FF1493',
      starEffect: starEffectEnabled,
      fairyDustEffect: fairyDustEffectEnabled,
      canvasSize: {
        width: canvas.width,
        height: canvas.height
      }
    }));
    
    // 終了点を送信
    setTimeout(() => {
      socket.send(JSON.stringify({
        type: "draw",
        x: endX,
        y: endY,
        drawing: true,
        writerId: myWriterId,
        thickness: 4,
        color: '#FF1493',
        starEffect: starEffectEnabled,
        fairyDustEffect: fairyDustEffectEnabled,
        canvasSize: {
          width: canvas.width,
          height: canvas.height
        }
      }));
      
      console.log('✅ 右下描画テスト完了 - WebSocketでデータ送信済み');
    }, 50);
  } else {
    console.warn('⚠️ WebSocket未接続またはWriterID未設定のため、テストデータ送信をスキップ');
  }
  
  console.log('✅ 右下描画テスト完了');
}

// 背景5(dev)用の特別な関数
function setBackgroundDev() {
  console.log('🔧 背景5(dev)モード起動');
  
  // 書き手側にback2.pngを表示
  setBackground('./back2.png');
  
  // 受信側に白背景を送信するための特別なメッセージ
  if (socket && socket.readyState === WebSocket.OPEN) {
    // 少し遅延を入れて背景設定後に上書き送信
    setTimeout(() => {
      socket.send(JSON.stringify({ 
        type: "background-dev", 
        src: null, // 受信側は白背景
        writerId: myWriterId,
        canvasSize: { 
          width: canvas.width,
          height: canvas.height 
        },
        scale: canvasScale
      }));
      
      console.log('📡 背景5(dev): 書き手=back2.png, 受信側=白背景');
    }, 100);
  }
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
// スタートボタン関数
// ==========================================

// スタートボタン押下時の処理
function startWaitingAnimation() {
  console.log('🚀 スタートボタンが押されました - 待機画像スライド開始');
  
  // 「幕が上るまで」カウントダウンを開始
  showCurtainCountdown();
  
  // 環境の詳細調査（安全にチェック）
  const envInfo = {
    'typeof require': typeof require,
    'typeof ipcRenderer': typeof ipcRenderer,
    'typeof window': typeof window,
    'typeof process': typeof process
  };
  
  // processが定義されている場合のみelectronバージョンをチェック
  if (typeof process !== 'undefined') {
    envInfo['process.versions.electron'] = process.versions?.electron;
  }
  
  // windowが定義されている場合のみプロトコルをチェック
  if (typeof window !== 'undefined') {
    envInfo['window.location.protocol'] = window.location?.protocol;
  }
  
  console.log('🔍 環境調査:', envInfo);
  
  // ハート機能がどのように動作しているかを確認するため、既存のcreateSpecialHeartInOverlay関数を呼び出してみる
  if (typeof createSpecialHeartInOverlay === 'function') {
    console.log('🧪 テスト: ハート機能でIPC送信テスト');
    try {
      createSpecialHeartInOverlay(100); // テスト用の座標
      console.log('✅ ハート機能のIPC送信は成功');
    } catch (error) {
      console.log('❌ ハート機能のIPC送信も失敗:', error.message);
    }
  } else {
    console.log('❌ createSpecialHeartInOverlay関数が見つかりません');
  }
  
  // ハート機能と同じ仕組みでIPC送信（複数の方法でipcRendererにアクセス）
  let ipcSent = false;
  
  // 方法1: グローバルのipcRendererを直接使用（renderer.jsで定義済み）
  if (typeof ipcRenderer !== 'undefined') {
    try {
      const slideData = { action: 'slide', timestamp: Date.now() };
      ipcRenderer.send('add-slide-to-transparent-window', slideData);
      console.log('📡 Electron (global): ハート機能と同じルートで透明ウィンドウにスライド指示を送信');
      ipcSent = true;
    } catch (error) {
      console.log('⚠️ グローバルipcRenderer送信失敗:', error.message);
    }
  }
  
  // 方法2: require経由でのipcRenderer取得
  if (!ipcSent && typeof require !== 'undefined') {
    try {
      const { ipcRenderer: localIpcRenderer } = require('electron');
      const slideData = { action: 'slide', timestamp: Date.now() };
      localIpcRenderer.send('add-slide-to-transparent-window', slideData);
      console.log('📡 Electron (require): ハート機能と同じルートで透明ウィンドウにスライド指示を送信');
      ipcSent = true;
    } catch (error) {
      console.log('⚠️ require経由でのIPC送信失敗:', error.message);
    }
  }
  
  // 方法3: WebSocket経由で受信側に指示を送信（書き手=ブラウザ、受信側=Electron構成）
  if (!ipcSent && typeof sendWebSocketMessage === 'function') {
    try {
      const slideMessage = {
        type: 'slide-animation',
        action: 'slide',
        timestamp: Date.now()
      };
      sendWebSocketMessage(slideMessage);
      console.log('📡 WebSocket: 受信側経由で透明ウィンドウにスライド指示を送信');
      ipcSent = true;
      
      // 書き手側では6秒後にカウントダウン開始（3秒待機 + 3秒アニメーション）
      setTimeout(() => {
        startSyncCountdown();
      }, 6000);
    } catch (error) {
      console.log('⚠️ WebSocket経由でのスライド指示送信失敗:', error.message);
    }
  }
  
  // 方法4: 直接socket.sendを使用（フォールバック）
  if (!ipcSent && typeof socket !== 'undefined' && socket.readyState === WebSocket.OPEN) {
    try {
      const slideMessage = {
        type: 'slide-animation',
        action: 'slide',
        timestamp: Date.now()
      };
      socket.send(JSON.stringify(slideMessage));
      console.log('📡 WebSocket (直接): 受信側経由で透明ウィンドウにスライド指示を送信');
      ipcSent = true;
      
      // 書き手側では6秒後にカウントダウン開始（3秒待機 + 3秒アニメーション）
      setTimeout(() => {
        startSyncCountdown();
      }, 6000);
    } catch (error) {
      console.log('⚠️ WebSocket直接送信失敗:', error.message);
    }
  }
  
  if (!ipcSent) {
    console.log('⚠️ すべての送信方法が失敗しました - 書き手がブラウザ環境の可能性');
  }
}

// ==========================================
// 「幕が上るまで」カウントダウン機能
// ==========================================

// スタートボタン上にカウントダウン表示
function showCurtainCountdown() {
  const curtainCountdown = document.getElementById('curtainCountdown');
  const curtainTimer = document.getElementById('curtainTimer');
  
  if (!curtainCountdown || !curtainTimer) {
    console.log('❌ curtainCountdown要素が見つかりません');
    return;
  }
  
  // スタートボタンの位置を取得
  const startButton = document.querySelector('button[onclick="startWaitingAnimation()"]');
  if (startButton) {
    const rect = startButton.getBoundingClientRect();
    curtainCountdown.style.left = rect.left + 'px';
    curtainCountdown.style.top = (rect.top - 80) + 'px'; // ボタンの上に配置
  }
  
  // カウントダウン開始
  let count = 3;
  curtainCountdown.style.display = 'block';
  curtainTimer.textContent = count;
  console.log('🎭 幕が上るまで: 3秒');
  
  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      curtainTimer.textContent = count;
      console.log(`🎭 幕が上るまで: ${count}秒`);
    } else {
      curtainCountdown.style.display = 'none';
      console.log('🎭 幕が上りました！');
      clearInterval(countdownInterval);
    }
  }, 1000);
}

// ==========================================
// 書き手側カウントダウン機能（透明ウィンドウと同期）
// ==========================================

// 書き手側のカウントダウン機能
function startSyncCountdown() {
  const countdownElement = document.getElementById('syncCountdown');
  if (!countdownElement) {
    console.log('❌ syncCountdown要素が見つかりません');
    return;
  }
  
  let count = 5;
  
  countdownElement.style.display = 'block';
  countdownElement.textContent = count;
  console.log('⏱️ 書き手側カウントダウン開始: 5秒');
  
  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownElement.textContent = count;
      console.log(`⏱️ 書き手側カウントダウン: ${count}`);
    } else {
      countdownElement.style.display = 'none';
      console.log('⏱️ 書き手側カウントダウン終了');
      clearInterval(countdownInterval);
    }
  }, 1000);
}

// ==========================================
console.log('✅ canvas-background.js loaded successfully');