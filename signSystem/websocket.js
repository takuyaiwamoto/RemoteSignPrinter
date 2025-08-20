// websocket.js - WebSocket・通信関連の機能を分離
// 元ファイル: remotesign.html
// 分離日: 2025-08-20

// ==========================================
// WebSocketメッセージ処理関数群
// ==========================================

// 🔸 メッセージ処理メイン関数
function processMessage(data) {
  // console.log(`📨 メッセージ受信: type=${data.type}, writerId=${data.writerId || 'なし'}`);
  // console.log(`📨 受信時の状態: hasSentData=${hasSentData}, drawingCommands数=${drawingCommands.length}, otherWritersDataキー数=${Object.keys(otherWritersData).length}`);
  if (Object.keys(otherWritersData).length > 0) {
    // console.log(`📨 現在のotherWritersData詳細:`, Object.keys(otherWritersData).map(key => `${key}:${otherWritersData[key].length}件`));
  }
  
  // ハートビート要求処理
  if (data.type === "ping") {
    // console.log("💓 ハートビート要求受信 - pong送信");
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
    }
    return;
  }
  
  if (data.type === "assignWriterId") {
    // writer ID の割り当てを受信
    console.log("📨 WriterID割り当てメッセージ受信（生データ）:", data);
    console.log("📊 自分のセッションID:", mySessionId);
    console.log("📊 メッセージのセッションID:", data.sessionId);
    
    // セッションIDが一致する場合のみログ出力と処理
    if (data.sessionId && data.sessionId === mySessionId) {
      console.log("✅ セッションID一致 - WriterID処理開始");
      // 既に同じWriterIDを持っている他のブラウザがいないかチェック
      if (data.conflictDetected) {
        console.warn("⚠️ WriterID重複検出！再割り当てを要求します");
        mySessionId = generateSessionId(); // 新しいセッションIDを生成
        setTimeout(() => {
          requestWriterId(); // 再要求
        }, 100);
        return;
      }
      
      console.log("📋 WriterID割り当て実行:", data.writerId);
      myWriterId = data.writerId;
      console.log(`📝 Writer ID 割り当て: ${myWriterId} (SessionID: ${mySessionId})`);
      document.title = `送信側 - ${myWriterId}`;
      
      // Writer ID表示を更新
      const statusDiv = document.getElementById('writerStatus') || createWriterStatusDiv();
      statusDiv.childNodes[1].textContent = `Writer ID: ${myWriterId}`;
      
      // 割り当て成功をサーバーに通知
      socket.send(JSON.stringify({
        type: "confirmWriterId",
        writerId: myWriterId,
        sessionId: mySessionId,
        timestamp: Date.now()
      }));
      
      // WriterID割り当て完了後に背景画像を受信側に送信
      console.log("🖼️ WriterID割り当て完了 - 背景画像を受信側に送信");
      setBackground('./back2.png');
    } else {
      // 他のクライアント向けのメッセージなので静かに無視（エラーではない）
      console.log("🔇 セッションID不一致のWriterID割り当てメッセージ（他クライアント向け）");
      console.log("  自分のセッション:", mySessionId);
      console.log("  メッセージのセッション:", data.sessionId);
    }
    
  } else if (data.type === "start" || data.type === "draw") {
    // 他の執筆者からの描画データを受信
    console.log(`🖊️ 描画データ受信: type=${data.type}, writerId=${data.writerId}, myWriterId=${myWriterId}, 他の書き手？${data.writerId !== myWriterId}`);
    
    if (data.writerId && data.writerId !== myWriterId) {
      console.log("✅ 他の書き手の描画として処理");
      handleOtherWriterDrawing(data);
    } else {
      console.log("❌ 自分の描画のため無視");
    }
  } else if (data.type === "clear") {
    // 受信側からの全体クリア
    console.log('🧹 受信側からのクリア指示でotherWritersDataをクリア');
    otherWritersData = {};
    
    // 遅延実行で重複処理を回避
    if (window.clearRedrawTimeout) {
      clearTimeout(window.clearRedrawTimeout);
    }
    
    window.clearRedrawTimeout = setTimeout(() => {
      redrawCanvasWithOthers();
      window.clearRedrawTimeout = null;
    }, 10);
  } else if (data.type === "globalClear") {
    // 他の書き手からの全体クリア（自分が送信者でない場合のみ処理）
    if (data.writerId !== myWriterId) {
      // console.log(`🧹 他の書き手(${data.writerId})からクリア指示を受信`);
      
      // キャンバスを完全にクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (backgroundImage) {
        drawBackgroundImage(ctx, backgroundImage, canvas);
      }
      
      // 🔧【修正】全ての描画データをクリア（自分の描画も含む）
      otherWritersData = {};
      drawingCommands = []; // ✅ 自分の描画もクリアする
      console.log('🧹 他の書き手からのクリア指示：全描画データをクリア');
      
      // キャンバスを再描画（背景のみの状態にする）- 遅延実行
      if (window.globalClearRedrawTimeout) {
        clearTimeout(window.globalClearRedrawTimeout);
      }
      
      window.globalClearRedrawTimeout = setTimeout(() => {
        redrawCanvasWithOthers();
        window.globalClearRedrawTimeout = null;
      }, 10);
      
      // console.log('🧹 他の書き手からのクリア指示で完全クリア完了');
    }
  } else if (data.type === "clearWriter") {
    // 🔧【追加】特定の書き手の描画だけをクリア
    const writerId = data.writerId;
    
    // 自分が送信者でない場合のみ処理
    if (writerId !== myWriterId) {
      console.log(`🧹 書き手(${writerId})の描画クリア指示を受信`);
      
      // 該当書き手の描画データをクリア
      if (otherWritersData[writerId]) {
        delete otherWritersData[writerId];
        console.log(`🧹 ${writerId}の描画データを削除`);
      }
      
      // キャンバスを再描画（背景 + 残った描画）
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (backgroundImage) {
        drawBackgroundImage(ctx, backgroundImage, canvas);
      }
      
      // 再描画（自分の描画 + 他の書き手の描画）
      if (window.clearWriterRedrawTimeout) {
        clearTimeout(window.clearWriterRedrawTimeout);
      }
      
      window.clearWriterRedrawTimeout = setTimeout(() => {
        redrawCanvasWithOthers();
        window.clearWriterRedrawTimeout = null;
      }, 10);
      
      console.log(`✅ ${writerId}の描画クリア完了`);
    }
  } else if (data.type === "globalSend") {
    // 他の書き手からの送信実行（自分が送信者でない場合のみ処理）
    if (data.writerId !== myWriterId) {
      // console.log(`📤 他の書き手(${data.writerId})から送信実行を受信`);
      
      // 送信ボタンの無効化（他の人が送信中表示）
      const sendButton = document.querySelector('button[onclick="saveDoubleRotatedImage()"]');
      if (sendButton) {
        sendButton.style.backgroundColor = '#ffa500';
        sendButton.textContent = `${data.writerId}が送信中...`;
        sendButton.disabled = true;
        
        // 送信完了後にボタンを元に戻す
        setTimeout(() => {
          sendButton.style.backgroundColor = '';
          sendButton.textContent = '送信';
          sendButton.disabled = false;
        }, (data.animationStartWaitTime + data.rotationWaitTime + 10) * 1000); // 全体の処理時間
      }
      
      // 花火演出を他の書き手にも同期表示
      const fireworksCheckbox = document.getElementById('fireworksEffect');
      if (fireworksCheckbox && fireworksCheckbox.checked) {
        // console.log(`🎆 ${data.writerId}の送信に同期して花火演出を実行`);
        // 送信処理完了後少し遅れて花火を実行
        const fireworksDelay = (data.animationStartWaitTime + 3) * 1000; // アニメーション開始待機時間 + 3秒
        setTimeout(() => {
          createFireworks();
        }, fireworksDelay);
      }
      
      // 10秒後に自動クリア（送信処理と同期）
      setTimeout(() => {
        // console.log('🧹 他の書き手の送信に同期してクリア実行');
        
        // キャンバスをクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (backgroundImage) {
          drawBackgroundImage(ctx, backgroundImage, canvas);
        }
        
        // 他のWriterの描画データのみクリア（自分の描画は保持）
        otherWritersData = {};
        // drawingCommands = []; // ❌ 自分の描画はクリアしない
        console.log('🧹 他の書き手の送信に同期：他writerデータのみクリア（自分の描画は保持）');
        console.log('🧹 自分の描画コマンド数（保持）:', drawingCommands.length);
        console.log('🧹 他writerデータクリア:', Object.keys(otherWritersData).length);
        
        // キャンバスを再描画 - 遅延実行で重複処理を回避
        if (window.globalSendRedrawTimeout) {
          clearTimeout(window.globalSendRedrawTimeout);
        }
        
        window.globalSendRedrawTimeout = setTimeout(() => {
          redrawCanvasWithOthers();
          window.globalSendRedrawTimeout = null;
        }, 10);
        
        // console.log('🧹 他の書き手の送信に同期してクリア完了');
      }, 10000);
    }
  } else if (data.type === "heartEffect") {
    // ハートエフェクト指示受信
    createHeart();
  } else if (data.type === "specialHeartEffect") {
    // 特別ハートエフェクト指示受信
    createSpecialHeart();
  } else if (data.type === "autoSelectBackground") {
    // console.log('🖼️ 受信側から背景自動選択指示を受信:', data.background);
    // 背景4を自動選択
    if (data.background === "back6") {
      setBackground('./back6.png');
      // console.log('🖼️ 背景4（back6.png）を自動選択');
    }
  }
}

// ==========================================
// セッション・ライターID管理関数群
// ==========================================

// 🔸 セッションID生成関数
function generateSessionId() {
  // より一意性の高いセッションIDを生成
  const timestamp = Date.now();
  const nanoTime = performance.now() * 1000000; // ナノ秒精度に近づける
  const random1 = Math.random().toString(36).substr(2, 9);
  const random2 = Math.random().toString(36).substr(2, 9);
  const random3 = Math.random().toString(36).substr(2, 9);
  const random4 = Math.random().toString(36).substr(2, 9);
  const random5 = crypto.getRandomValues(new Uint32Array(1))[0].toString(36); // 暗号学的に安全な乱数
  
  // デバイス固有情報の収集（拡張）
  const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language || 'unknown';
  const platform = navigator.platform || 'unknown';
  const cookieEnabled = navigator.cookieEnabled ? '1' : '0';
  const onlineStatus = navigator.onLine ? '1' : '0';
  
  // 追加のブラウザ固有情報
  const userAgent = navigator.userAgent.length.toString(); // UAの長さ
  const vendor = navigator.vendor || 'unknown';
  const hardwareConcurrency = navigator.hardwareConcurrency || 'unknown';
  const deviceMemory = navigator.deviceMemory || 'unknown';
  const pixelRatio = window.devicePixelRatio || 'unknown';
  const touchPoints = navigator.maxTouchPoints || 'unknown';
  
  // より高精度なタイムスタンプ
  const performanceNow = performance.now().toString().replace('.', '');
  
  // キャンバスフィンガープリンティング（軽量版）
  let canvasFingerprint = 'unknown';
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint test', 2, 2);
      canvasFingerprint = canvas.toDataURL().slice(-10); // 最後の10文字のみ使用
    }
  } catch (e) {
    canvasFingerprint = 'canvas-error';
  }
  
  // すべての要素を結合
  const deviceInfo = `${screen}_${timezone}_${language}_${platform}_${cookieEnabled}_${onlineStatus}_${userAgent}_${vendor}_${hardwareConcurrency}_${deviceMemory}_${pixelRatio}_${touchPoints}_${canvasFingerprint}`;
  
  // ブラウザフィンガープリント（より長い）
  const fingerprint = btoa(deviceInfo).replace(/[^a-zA-Z0-9]/g, '').substr(0, 16);
  
  // localStorage/sessionStorageを使った永続的な識別子
  let storageId = '';
  try {
    // 既存のストレージIDを確認
    storageId = localStorage.getItem('senderBrowserId') || '';
    if (!storageId) {
      // 新規生成
      storageId = `browser_${crypto.getRandomValues(new Uint32Array(2)).join('_')}_${Date.now()}`;
      localStorage.setItem('senderBrowserId', storageId);
    }
  } catch (e) {
    // localStorage使用不可の場合
    storageId = 'no_storage';
  }
  
  const sessionId = `session_${random1}_${random2}_${random3}_${random4}_${random5}_${timestamp}_${nanoTime.toString().replace('.', '')}_${performanceNow}_${fingerprint}_${storageId}`;
  console.log("🆔 生成されたセッションID:", sessionId);
  console.log("🔍 デバイス情報:", {
    screen, timezone, language, platform, userAgent: userAgent, 
    vendor, hardwareConcurrency, deviceMemory, pixelRatio, touchPoints, 
    canvasFingerprint, storageId, nanoTime
  });
  return sessionId;
}

// 🔸 Writer ID要求関数
function requestWriterId() {
  console.log("🔄 requestWriterId関数呼び出し");
  console.log("📊 WebSocket状態:", socket ? socket.readyState : 'socket未初期化');
  console.log("📊 WebSocket.OPEN定数:", WebSocket.OPEN);
  
  if (socket && socket.readyState === WebSocket.OPEN) {
    // セッションIDが未設定の場合は生成
    if (!mySessionId) {
      mySessionId = generateSessionId();
      console.log("🆔 セッションID生成:", mySessionId);
    }
    
    const requestMsg = {
      type: "requestWriterId",
      sessionId: mySessionId
    };
    console.log("📤 Writer ID要求送信:", requestMsg);
    socket.send(JSON.stringify(requestMsg));
    
    // 要求後の確認（自動再試行機能付き）
    let retryCount = 0;
    const maxRetries = 5; // 再試行回数を増加
    
    const checkAndRetry = () => {
      setTimeout(() => {
        // WebSocket接続状態を確認
        if (socket.readyState !== WebSocket.OPEN) {
          console.warn("⚠️ WebSocket接続が切断されています - Writer ID割り当て中断");
          alert('❌ WebSocket接続が切断されました\n\nページをリロードしてください');
          return;
        }
        
        if (myWriterId) {
          // ステータス表示を更新
          const statusDiv = document.getElementById('writerStatus');
          if (statusDiv) {
            statusDiv.childNodes[0].textContent = `Writer ID: ${myWriterId}`;
          }
          // console.log(`✅ Writer ID割り当て成功: ${myWriterId} (${retryCount + 1}回目で成功)`);
        } else {
          retryCount++;
          if (retryCount < maxRetries) {
            // console.log(`🔄 Writer ID再試行 ${retryCount}/${maxRetries}`);
            
            // 再試行前にセッションIDを再生成（長時間待機後の問題対策）
            if (retryCount > 2) {
              mySessionId = generateSessionId();
              // console.log("🔄 セッションID再生成:", mySessionId);
            }
            
            // 再試行
            socket.send(JSON.stringify({
              type: "requestWriterId",
              sessionId: mySessionId
            }));
            checkAndRetry();
          } else {
            alert('❌ Writer ID割り当て失敗\n\n対処法:\n1. 受信側を先に起動してください\n2. ページをリロードしてください\n3. しばらく待ってから再試行してください');
          }
        }
      }, 3000); // 再試行間隔を3秒に延長
    };
    
    checkAndRetry();
  } else {
    console.error("❌ WebSocket未接続 - 状態:", socket ? socket.readyState : 'socket未初期化');
    alert('❌ WebSocket未接続\n\nページをリロードしてください');
  }
}

// 🔸 Writer ID ステータス表示div作成関数
function createWriterStatusDiv() {
  const statusDiv = document.createElement('div');
  statusDiv.id = 'writerStatus';
  statusDiv.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
  `;
  
  // Version情報を表示
  const versionSpan = document.createElement('span');
  versionSpan.textContent = 'v3.8-quiet (描画ログ削除版)';
  versionSpan.style.cssText = `
    display: block;
    color: #FFD700;
    font-weight: bold;
    margin-bottom: 4px;
  `;
  statusDiv.appendChild(versionSpan);
  
  // Writer IDテキストノード
  const writerIdText = document.createTextNode('Writer ID: 接続中...');
  statusDiv.appendChild(writerIdText);
  
  // デバッグ用テストボタンを追加
  const testBtn = document.createElement('button');
  testBtn.textContent = 'ID確認';
  testBtn.style.cssText = `
    margin-left: 8px;
    font-size: 10px;
    padding: 3px 8px;
    background: #333;
    color: white;
    border: 1px solid #666;
    border-radius: 3px;
    cursor: pointer;
  `;
  testBtn.onclick = () => {
    console.log(`🔍 現在のWriter ID: ${myWriterId}`);
    console.log(`🔍 WebSocket状態: ${socket ? socket.readyState : 'socket未初期化'}`);
    console.log(`🔍 セッションID: ${mySessionId}`);
    console.log(`🔍 他の書き手データ:`, otherWritersData);
    
    let message = `Version: 3.1-fixed\nWriter ID: ${myWriterId || '未割り当て'}\nWebSocket: ${socket ? socket.readyState : '未初期化'}\nセッションID: ${mySessionId || '未生成'}\n他の書き手: ${Object.keys(otherWritersData).length}人`;
    
    if (!myWriterId) {
      message += '\n\n🔄 Writer IDを再要求しますか？';
      if (confirm(message)) {
        console.log("🔄 手動でWriterID要求を実行");
        requestWriterId();
      }
    } else {
      alert(message);
    }
  };
  statusDiv.appendChild(testBtn);
  
  document.body.appendChild(statusDiv);
  return statusDiv;
}

// ==========================================
// 描画データ処理関数群
// ==========================================

// 🔸 他の執筆者の描画データを処理
function handleOtherWriterDrawing(data) {
  const writerId = data.writerId;
  
  console.log(`📋 DEBUG: 他Writer受信前 - 自分の描画=${drawingCommands.length}件`);
  
  if (!otherWritersData[writerId]) {
    otherWritersData[writerId] = [];
  }
  
  otherWritersData[writerId].push(data);
  
  // 重複する再描画要求をまとめるため、少し遅延させる
  if (window.redrawTimeout) {
    clearTimeout(window.redrawTimeout);
  }
  
  window.redrawTimeout = setTimeout(() => {
    console.log(`📋 DEBUG: 再描画直前 - 自分の描画=${drawingCommands.length}件`);
    redrawCanvasWithOthers();
    window.redrawTimeout = null;
  }, 10);
}

// WriterID別パス状態管理（書き手側用）
const senderWriterPathStates = {};

// 🔸 Writer別に独立した描画関数
function drawWriterCommands(commands, writerId, isMyself = false) {
  if (!Array.isArray(commands) || commands.length === 0) {
    return;
  }
  
  if (isMyself) {
    console.log(`📋 DEBUG: 自分の描画実行 - ${commands.length}件`);
  }
  
  // このWriterのパス状態を完全にリセット（他Writerとの混在防止）
  senderWriterPathStates[writerId] = {
    prevCmd: null
  };
  
  const writerState = senderWriterPathStates[writerId];
  
  ctx.save();
  
  // Canvas状態を完全にクリア（他WriterIDとの状態混在を防止）
  ctx.beginPath(); // 重要：前のパスをクリア
  ctx.setTransform(1, 0, 0, 1, 0, 0); // 変換行列をリセット
  
  // デフォルト描画設定を完全にリセット
  ctx.globalAlpha = isMyself ? 1.0 : 0.7;
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let startCount = 0;
  let drawCount = 0;
  
  commands.forEach((cmd, index) => {
    if (cmd.type === "start") {
      startCount++;
      // startコマンド時にこのWriterのパス状態を完全にリセット
      ctx.beginPath(); // 前のパスをクリア
      ctx.moveTo(cmd.x, cmd.y); // 開始点を設定
      writerState.prevCmd = cmd;
      
      if (index === 0) {
        const isValid = cmd.x >= 0 && cmd.x <= canvas.width && cmd.y >= 0 && cmd.y <= canvas.height;
        console.log(`    🎯 最初のstart: x=${cmd.x}, y=${cmd.y} (canvas: ${canvas.width}x${canvas.height}) 範囲内？${isValid}`);
      }
    } else if (cmd.type === "draw" && writerState.prevCmd) {
      drawCount++;
      if (cmd.color === 'white-red-border') {
        // 白地赤縁の特別処理
        if (writerState.prevCmd) {
          // 外側の薄い赤を描画
          ctx.beginPath();
          ctx.moveTo(writerState.prevCmd.x, writerState.prevCmd.y);
          ctx.lineWidth = (cmd.thickness || (isMyself ? currentPenThickness : 4)) + 8;
          ctx.globalAlpha = isMyself ? 0.3 : 0.2;
          ctx.strokeStyle = '#ffccdd';
          ctx.shadowColor = '#ffccdd';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineTo(cmd.x, cmd.y);
          ctx.stroke();
          ctx.closePath(); // パス終了
          
          // 内側の濃い赤を描画
          ctx.beginPath();
          ctx.moveTo(writerState.prevCmd.x, writerState.prevCmd.y);
          ctx.lineWidth = (cmd.thickness || (isMyself ? currentPenThickness : 4)) + 6;
          ctx.globalAlpha = isMyself ? 0.8 : 0.6;
          ctx.strokeStyle = '#ff88bb';
          ctx.shadowColor = '#ff88bb';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineTo(cmd.x, cmd.y);
          ctx.stroke();
          ctx.closePath(); // パス終了
          
          // 白い中心を描画（グロー効果付き）
          ctx.beginPath();
          ctx.moveTo(writerState.prevCmd.x, writerState.prevCmd.y);
          ctx.globalAlpha = isMyself ? 0.9 : 0.7;
          ctx.lineWidth = Math.max(1, (cmd.thickness || (isMyself ? currentPenThickness : 4)) - 3);
          ctx.strokeStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.lineTo(cmd.x, cmd.y);
          ctx.stroke();
          ctx.closePath(); // パス終了
          ctx.globalAlpha = isMyself ? 1.0 : 0.7; // 透明度をリセット
        }
      } else {
        // 通常の色の描画（各線分を完全独立して描画）
        ctx.beginPath(); // 必須：新しいパスを開始
        ctx.moveTo(writerState.prevCmd.x, writerState.prevCmd.y);
        ctx.lineWidth = cmd.thickness || (isMyself ? currentPenThickness : 4);
        ctx.strokeStyle = cmd.color || (isMyself ? currentPenColor : 'black');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(cmd.x, cmd.y);
        ctx.stroke(); // 各線分を即座に描画
        ctx.closePath(); // 重要：パスを完全に終了してWriter間の混在を防止
      }
      writerState.prevCmd = cmd;
    }
  });
  
  // 画面外描画の警告チェック
  let outOfBoundsCount = 0;
  commands.forEach(cmd => {
    if (cmd.x < 0 || cmd.x > canvas.width || cmd.y < 0 || cmd.y > canvas.height) {
      outOfBoundsCount++;
    }
  });
  
  if (isMyself) {
    console.log(`📋 DEBUG: 自分の描画完了 - start=${startCount}件, draw=${drawCount}件`);
  }
  
  // Canvas状態を完全にクリア（次のWriter描画との混在防止）
  ctx.beginPath(); // 重要：このWriterのパスを完全終了
  ctx.restore();
}

// 再描画中フラグを追加して重複実行を防止
let isRedrawing = false;

// 🔸 自分と他執筆者の描画を統合して再描画
function redrawCanvasWithOthers() {
  if (isRedrawing) {
    return;
  }
  
  isRedrawing = true;
  console.log(`📋 DEBUG: 再描画開始 - 自分=${drawingCommands.length}件, 他=${Object.keys(otherWritersData).length}人`);
  
  if (!Array.isArray(drawingCommands)) {
    isRedrawing = false;
    return;
  }
  
  // 🔥 現在描画中の場合は、現在の描画状態を保存
  let currentDrawingState = null;
  if (drawing) {
    const selfState = getWriterDrawingState('self');
    if (selfState && selfState.lastPosition && selfState.isDrawing) {
      currentDrawingState = {
        lastPosition: { ...selfState.lastPosition },
        penColor: currentPenColor,
        penThickness: currentPenThickness
      };
    }
  }
  
  // 背景をクリア
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 背景画像があれば描画
  if (backgroundImage) {
    drawBackgroundImage(ctx, backgroundImage, canvas);
  }
  
  // 自分の描画コマンドを再実行
  ctx.save();
  ctx.beginPath();
  console.log(`📋 DEBUG: 自分の描画実行開始 - ${drawingCommands.length}件`);
  drawWriterCommands(drawingCommands, myWriterId, true);
  ctx.restore();
  
  // 他執筆者の描画データを描画（完全分離）
  Object.keys(otherWritersData).forEach(writerId => {
    ctx.save();
    
    // Canvas状態を完全にリセット（Writer間の干渉を防止）
    ctx.beginPath();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    
    console.log(`📋 DEBUG: 他Writer[${writerId}]描画開始`);
    drawWriterCommands(otherWritersData[writerId], writerId, false);
    
    // Writer描画完了後、状態を完全クリア
    ctx.beginPath(); // 重要：このWriterのパスを完全終了
    ctx.restore();
    console.log(`📋 DEBUG: 他Writer[${writerId}]描画完了`);
  });
  
  // 現在描画中だった場合、描画状態を復元
  if (drawing && currentDrawingState) {
    ctx.beginPath();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.lineWidth = currentDrawingState.penThickness;
    if (currentDrawingState.penColor === 'white-red-border') {
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = Math.max(1, currentDrawingState.penThickness - 3);
    } else {
      const actualColor = currentDrawingState.penColor === 'black' ? '#000' : (currentDrawingState.penColor === 'white' ? '#fff' : (currentDrawingState.penColor === 'green' ? '#008000' : (currentDrawingState.penColor === 'pink' ? '#ff69b4' : currentDrawingState.penColor)));
      ctx.strokeStyle = actualColor;
    }
    
    ctx.moveTo(currentDrawingState.lastPosition.x, currentDrawingState.lastPosition.y);
  }
  
  // 再描画完了
  isRedrawing = false;
  console.log(`📋 DEBUG: 再描画完了`);
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ websocket.js loaded successfully');