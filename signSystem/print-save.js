// ==========================================
// Print & Save Functions - 印刷・保存機能
// ==========================================

// メイン送信関数 - 「渡す」ボタンで実行
function saveDoubleRotatedImage() {
  // 音楽制御は送信側では無効化（受信側のみで音楽再生）
  
  console.log(`🔄🔄🔄 送信ボタン押下: globalSend送信開始→${animationStartWaitTime}秒後にアニメーション開始 🔄🔄🔄`);
  
  // 🔸 まず受信側に印刷指示を送信（データが残っている状態で）
  console.log('📤📤📤 受信側にglobalSend指示を送信中... 📤📤📤');
  
  // 音楽ボリュームを取得（スライダーがあれば）
  const musicVolumeSlider = document.getElementById('musicVolume');
  const currentMusicVolume = musicVolumeSlider ? parseFloat(musicVolumeSlider.value) : 0.5;
  
  // 背景5判定（DevToolsで背景5(白背景)が選択されているかで判定）
  const isBackground5 = document.querySelector('#back2-wrapper') && 
                       document.querySelector('#back2-wrapper .white-background');
  
  const sendData = {
    type: "globalSend",
    writerId: myWriterId,
    timestamp: Date.now(),
    animationStartWaitTime: animationStartWaitTime,
    rotationWaitTime: rotationWaitTime,
    videoPattern: currentVideoPattern,
    musicVolume: currentMusicVolume,
    isBackground5: isBackground5  // 背景5フラグを追加
  };
  
  console.log('🔍 送信データ詳細:');
  console.log(`  - animationStartWaitTime: ${animationStartWaitTime}秒`);
  console.log(`  - rotationWaitTime: ${rotationWaitTime}秒`);
  console.log(`  - videoPattern: ${currentVideoPattern}`);
  console.log(`  - isBackground5: ${isBackground5}`);
  console.log(`  - musicVolume: ${currentMusicVolume}`);
  
  socket.send(JSON.stringify(sendData));
  console.log('✅✅✅ 受信側へのglobalSend指示送信完了 ✅✅✅');
  console.log(`🎵 音楽ボリューム: ${currentMusicVolume}`);
  
  // 🔸 少し待ってから送信側の印刷処理のみ実行
  setTimeout(() => {
    actualPrintProcess();
  }, 500); // 受信側の印刷処理が開始されるまで500ms待機
  
  // 🔄 送信直後に新しい描画を可能にするため、hasSentDataフラグを即座にリセット
  // 送信済みフラグをリセットして、すぐに新しい描画を可能にする
  hasSentData = false;
  console.log('🔓 送信直後: hasSentDataをリセット - 新しい描画と他writerデータ受信を再開');
  
  // 🔄 受信側のアニメーション完了後に送信者側のデータクリアと自動Clear処理を実行
  const totalAnimationTime = (animationStartWaitTime + 1 + rotationWaitTime + 2) * 1000; // アニメーション開始待機 + 回転1秒 + 回転後待機 + スライド2秒
  console.log(`🔄 送信完了 → ${totalAnimationTime/1000}秒後（アニメーション完了後）に送信者データクリア + 自動Clear処理を実行`);
  setTimeout(() => {
    // 🔸 送信者側のデータクリア（アニメーション完了後）
    // ✅ アニメーション完了後は全データクリア（仕様通り）
    otherWritersData = {};
    drawingCommands = []; // 🔥 アニメーション完了後に自分の描画コマンドをクリア
    console.log('🧹 アニメーション完了後: 全描画データをクリア');
    console.log('🧹 otherWritersData遅延クリア:', Object.keys(otherWritersData).length);
    console.log('🧹 drawingCommands遅延クリア:', drawingCommands.length);
    
    // キャンバスを再描画（空の状態）- 遅延実行
    if (window.saveDoubleRotatedRedrawTimeout) {
      clearTimeout(window.saveDoubleRotatedRedrawTimeout);
    }
    
    window.saveDoubleRotatedRedrawTimeout = setTimeout(() => {
      redrawCanvasWithOthers();
      window.saveDoubleRotatedRedrawTimeout = null;
    }, 10);
    
    // 全書き手同期のためのクリア命令を送信
    socket.send(JSON.stringify({ 
      type: "globalClear",
      writerId: myWriterId,
      timestamp: Date.now()
    }));
    console.log('📤 自動Clear: 全書き手にクリア指示を送信');
    console.log('✅ 自動Clear処理完了（アニメーション完了後）');
  }, totalAnimationTime); // アニメーション完了後に自動Clear実行
  
  // 🔸 送信ボタンの視覚的フィードバック
  const sendButton = event.target;
  sendButton.style.transform = 'scale(0.95)';
  sendButton.style.backgroundColor = '#ff1493';
  sendButton.style.color = '#fff';
  sendButton.textContent = '送信中...';
  sendButton.disabled = true;
  
  // 🔸 打ち上げ花火演出を追加（受信側と同期）
  // 回転アニメーション完了後1秒で実行するようにタイミング調整
  const fireworksCheckbox = document.getElementById('fireworksEffect');
  if (fireworksCheckbox && fireworksCheckbox.checked) {
    const fireworksDelay = animationStartWaitTime * 1000 + 2500; // アニメーション開始待機時間 + 回転時間(1.5秒) + 1秒
    setTimeout(() => {
      if (typeof createFireworks === 'function') {
        createFireworks();
      }
    }, fireworksDelay);
  }
  
  // 🔸 紙吹雪演出を追加（受信側と同期）
  const confettiCheckbox = document.getElementById('confettiEffect');
  if (confettiCheckbox && confettiCheckbox.checked) {
    const confettiDelay = animationStartWaitTime * 1000 + 2500 + (rotationWaitTime * 1000) - 1500; // 花火と同じタイミング + 回転後待機時間 - 1.5秒前
    setTimeout(() => {
      if (typeof createConfetti === 'function') {
        createConfetti();
      }
    }, confettiDelay);
  }
  
  // ボタンを元に戻す
  setTimeout(() => {
    sendButton.style.transform = 'scale(1)';
    sendButton.style.backgroundColor = '';
    sendButton.style.color = '';
    sendButton.textContent = '渡す';
    sendButton.disabled = false;
  }, 2000);
  
  // 設定時間後にWebSocket経由で受信側にアニメーション開始を通知
  setTimeout(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "startRotationAnimation",
        waitTime: rotationWaitTime, // 回転後待機時間を設定値から取得
        fireworksEnabled: fireworksCheckbox ? fireworksCheckbox.checked : false,
        confettiEnabled: confettiCheckbox ? confettiCheckbox.checked : false
      }));
    }
  }, animationStartWaitTime * 1000); // アニメーション開始待機時間（秒をミリ秒に変換）
  
  // 🔸 送信ボタン押下から10秒後にクリアを実行（印刷が即座に開始されるため）
  setTimeout(() => {
    // キャンバスを完全にクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景画像があれば再描画（回転なし）
    if (backgroundImage && typeof drawBackgroundImage === 'function') {
      drawBackgroundImage(ctx, backgroundImage, canvas);
    }
    
    // 全ての描画データを完全クリア
    drawingCommands = [];
    otherWritersData = {};
    
    // 受信側にもクリア指示を送信（送信者自身は除外）
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ 
        type: "clear",
        fromSender: true,  // 送信者からのクリア指示であることを明示
        senderWriterId: myWriterId
      }));
    }
    
  }, 10000); // 送信ボタン押下から10秒後にクリア
}

// 送信側では印刷処理は行わない（受信側のみ印刷）
function actualPrintProcess() {
  // 送信側では印刷処理をスキップ
  console.log('📝 送信側: 印刷処理をスキップ（受信側で実行）');
  
  // 受信側で印刷が実行されるため、送信側では何も処理しない
  console.log('✅ 送信側処理完了（印刷は受信側で実行）');
}

// 回転保存機能（レガシー）
function saveRotatedImage() {
  try {
    // 最終的な画像用のcanvasを作成
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    
    // 1. 背景を先に描画（回転させない）
    if (backgroundImage) {
      finalCtx.drawImage(backgroundImage, 0, 0, finalCanvas.width, finalCanvas.height);
    } else {
      // 白背景で塗りつぶし
      finalCtx.fillStyle = '#ffffff';
      finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    }
    
    // 2. ペイントデータのみを180度回転させて描画
    if (drawingCommands.length > 0) {
      // 180度回転変換を適用
      finalCtx.save();
      finalCtx.translate(finalCanvas.width, finalCanvas.height);
      finalCtx.rotate(Math.PI);
      
      // 描画コマンドを実行（座標は元のまま、キャンバスが回転している）
      drawingCommands.forEach(cmd => {
        if (cmd.type === 'start') {
          finalCtx.beginPath();
          finalCtx.moveTo(cmd.x, cmd.y);
        } else if (cmd.type === 'draw') {
          finalCtx.lineWidth = cmd.thickness || 8;
          finalCtx.strokeStyle = cmd.color || 'black';
          finalCtx.lineTo(cmd.x, cmd.y);
          finalCtx.stroke();
        }
      });
      
      finalCtx.restore();
    }
    
    // 画像として保存
    const link = document.createElement('a');
    link.download = 'drawing_rotated.png';
    link.href = finalCanvas.toDataURL();
    link.click();
    
    console.log('✅ 回転画像保存完了');
  } catch (error) {
    console.error('❌ 回転画像保存エラー:', error);
  }
}

console.log('✅ print-save.js loaded successfully');