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
      console.log("🖼️ WriterID割り当て完了 - 背景5を受信側に送信");
      setBackgroundDev();
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
    // 受信側からの全体クリア（送信者自身は除外）
    if (data.fromSender && data.senderWriterId === myWriterId) {
      console.log('🧹 自分が送信者のため、clearメッセージを無視');
      return;
    }
    
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
      console.log(`🧹 他の書き手(${data.writerId})からクリア指示を受信`);
      
      // キャンバスを完全にクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (backgroundImage) {
        drawBackgroundImage(ctx, backgroundImage, canvas);
      }
      
      // 🔧【強化】全ての描画データを完全クリア
      otherWritersData = {};
      drawingCommands = [];
      
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
      
      console.log('🧹 全描画データと状態を完全クリア');
      
      // キャンバス再描画は不要（もうデータが無いため）
      // 遅延実行も削除
      
      console.log('✅ 他の書き手からのクリア指示で完全クリア完了');
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
      console.log(`📤 他の書き手(${data.writerId})から送信実行を受信 - 受信側で印刷開始`);
      
      // 🔸 受信側で印刷処理を実行（背景5の場合は10秒遅延）
      console.log(`🔍 背景判定デバッグ: videoPattern=${data.videoPattern}, isBackground5フラグ=${data.isBackground5}, 全データ=${JSON.stringify(data)}`);
      
      // 印刷処理はrenderer.jsのdownloadAndPrintDrawing()で実行（重複削除）
      console.log('🎬 渡すボタン押下: 印刷処理はrenderer.jsで実行');
      
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
    // ハートエフェクト指示受信（受信側からのハートは常に表示）
    console.log('💖 受信: heartEffectメッセージ受信（受信側からは常に表示）');
    createHeart();
  } else if (data.type === "specialHeartEffect") {
    // 特別ハートエフェクト指示受信
    console.log('🎉💖 受信: specialHeartEffectメッセージ受信');
    createSpecialHeart();
  } else if (data.type === "autoSelectBackground") {
    // console.log('🖼️ 受信側から背景自動選択指示を受信:', data.background);
    // 背景4を自動選択
    if (data.background === "back6") {
      setBackground('./back6.png');
      // console.log('🖼️ 背景4（back6.png）を自動選択');
    }
  } else if (data.type === "devSettings") {
    // Dev Tools設定を受信
    console.log('🔧 Dev Tools設定を受信');
    
    if (data.canvasScale !== undefined) {
      canvasScale = data.canvasScale;
      console.log(`📏 キャンバススケール更新: ${canvasScale}x`);
    }
    
    if (data.animationStartWaitTime !== undefined) {
      animationStartWaitTime = data.animationStartWaitTime;
      console.log(`⏰ アニメーション開始待機時間更新: ${animationStartWaitTime}秒`);
    }
    
    if (data.rotationWaitTime !== undefined) {
      rotationWaitTime = data.rotationWaitTime;
      console.log(`🔄 回転待機時間更新: ${rotationWaitTime}秒`);
    }
    
    if (data.videoPattern !== undefined) {
      currentVideoPattern = data.videoPattern;
      console.log(`🎬 動画パターン更新: ${currentVideoPattern}`);
    }
    
    if (data.printDelayTime !== undefined) {
      printDelayTime = data.printDelayTime;
      console.log(`🖨️ 印刷遅延時間更新: ${printDelayTime}秒`);
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
  versionSpan.textContent = 'v3.8-integrated (統合最適化版)';
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
// 🔧【改善】再描画頻度の最適化
let pendingRedrawWriters = new Set();
const REDRAW_BATCH_DELAY = 16; // 16ms (約60fps)

function handleOtherWriterDrawing(data) {
  const writerId = data.writerId;
  
  if (!otherWritersData[writerId]) {
    otherWritersData[writerId] = [];
  }
  
  otherWritersData[writerId].push(data);
  pendingRedrawWriters.add(writerId);
  
  // 🔧 フレームレート制限付きバッチ再描画
  if (window.redrawTimeout) {
    clearTimeout(window.redrawTimeout);
  }
  
  window.redrawTimeout = setTimeout(() => {
    if (pendingRedrawWriters.size > 0) {
      console.log(`🎨 バッチ再描画: ${pendingRedrawWriters.size}人のWriter`);
      redrawCanvasWithOthers();
      pendingRedrawWriters.clear();
    }
    window.redrawTimeout = null;
  }, REDRAW_BATCH_DELAY);
}

// WriterID別パス状態管理（書き手側用）
const senderWriterPathStates = {};

// 🔧【新機能】描画コマンドをパス単位でグループ化
function groupCommandsByPath(commands) {
  const pathGroups = [];
  let currentPath = null;
  
  commands.forEach(cmd => {
    if (cmd.type === "start") {
      // 新しいパス開始
      if (currentPath) {
        pathGroups.push(currentPath);
      }
      currentPath = {
        color: cmd.color,
        thickness: cmd.thickness,
        points: [{ x: cmd.x, y: cmd.y }]
      };
    } else if (cmd.type === "draw" && currentPath) {
      // 既存パスに点を追加
      currentPath.points.push({ x: cmd.x, y: cmd.y });
    }
  });
  
  // 最後のパスを追加
  if (currentPath) {
    pathGroups.push(currentPath);
  }
  
  return pathGroups;
}

// 🔧【新機能】通常色のパス描画（ベジェ曲線滑らか版）
function drawNormalColorPath(pathGroup, isMyself) {
  if (!pathGroup.points || pathGroup.points.length < 2) return;
  
  ctx.beginPath();
  ctx.strokeStyle = pathGroup.color || (isMyself ? currentPenColor : 'black');
  ctx.lineWidth = pathGroup.thickness || (isMyself ? currentPenThickness : 4);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const points = pathGroup.points;
  ctx.moveTo(points[0].x, points[0].y);
  
  if (points.length === 2) {
    // 2点の場合は直線
    ctx.lineTo(points[1].x, points[1].y);
  } else if (points.length >= 3) {
    // 3点以上の場合はベジェ曲線で滑らかに描画
    for (let i = 1; i < points.length - 1; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      
      // Catmull-Rom スプライン係数での制御点計算
      const tension = 0.25;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      
      ctx.quadraticCurveTo(cp1x, cp1y, p2.x, p2.y);
    }
  }
  
  ctx.stroke();
}

// 🔧【新機能】白赤ボーダーパス描画（最適化版）
function drawWhiteRedBorderPath(pathGroup, isMyself) {
  if (!pathGroup.points || pathGroup.points.length < 2) return;
  
  const baseThickness = pathGroup.thickness || (isMyself ? currentPenThickness : 4);
  const points = pathGroup.points;
  
  // 3層を一度に描画（効率化）
  const layers = [
    { thickness: baseThickness + 8, color: '#ffccdd', alpha: isMyself ? 0.3 : 0.2 },
    { thickness: baseThickness + 6, color: '#ff88bb', alpha: isMyself ? 0.8 : 0.6 },
    { thickness: Math.max(1, baseThickness - 3), color: '#ffffff', alpha: isMyself ? 0.9 : 0.7 }
  ];
  
  layers.forEach(layer => {
    ctx.beginPath();
    ctx.strokeStyle = layer.color;
    ctx.lineWidth = layer.thickness;
    ctx.globalAlpha = layer.alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.moveTo(points[0].x, points[0].y);
    
    if (points.length === 2) {
      // 2点の場合は直線
      ctx.lineTo(points[1].x, points[1].y);
    } else if (points.length >= 3) {
      // 3点以上の場合はベジェ曲線で滑らかに描画
      for (let i = 1; i < points.length - 1; i++) {
        const p0 = points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        
        // Catmull-Rom スプライン係数での制御点計算
        const tension = 0.25;
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        
        ctx.quadraticCurveTo(cp1x, cp1y, p2.x, p2.y);
      }
    }
    
    ctx.stroke();
  });
  
  // アルファ値を元に戻す
  ctx.globalAlpha = isMyself ? 1.0 : 0.7;
}

// 🔸 Writer別に独立した描画関数
// 🔧【大幅改善】描画コマンドのバッチ処理と最適化
function drawWriterCommands(commands, writerId, isMyself = false) {
  if (!Array.isArray(commands) || commands.length === 0) {
    return;
  }
  
  // 🎯 パフォーマンス計測
  const startTime = performance.now();
  
  // Canvas状態を1回だけ設定（毎回のリセットを削除）
  ctx.save();
  
  // 基本設定（一度だけ）
  ctx.globalAlpha = isMyself ? 1.0 : 0.7;
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  
  // 🔧 描画パスをグループ化してバッチ処理
  const pathGroups = groupCommandsByPath(commands);
  
  pathGroups.forEach(pathGroup => {
    if (pathGroup.color === 'white-red-border') {
      drawWhiteRedBorderPath(pathGroup, isMyself);
    } else {
      drawNormalColorPath(pathGroup, isMyself);
    }
  });
  
  ctx.restore();
  
  // パフォーマンス計測結果
  const endTime = performance.now();
  if (isMyself) {
    console.log(`🎨 描画完了: ${commands.length}件 (${(endTime - startTime).toFixed(2)}ms)`);
  }
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
// グローバルWebSocket送信関数群
// ==========================================

// 🔧【新機能】WebSocketメッセージ送信用グローバル関数
function sendWebSocketMessage(message) {
  if (typeof socket !== 'undefined' && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
    console.log('📡 WebSocketメッセージ送信:', message.type);
    return true;
  } else {
    console.warn('⚠️ WebSocket未接続のため送信失敗:', message.type);
    return false;
  }
}

// 🔧【新機能】グローバルクリア通知専用関数
function sendGlobalClearMessage() {
  return sendWebSocketMessage({
    type: "globalClear",
    writerId: myWriterId,
    timestamp: Date.now()
  });
}

// 🔧【新機能】個人クリア通知専用関数
function sendClearWriterMessage() {
  return sendWebSocketMessage({
    type: "clearWriter", 
    writerId: myWriterId,
    timestamp: Date.now()
  });
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ websocket.js loaded successfully');