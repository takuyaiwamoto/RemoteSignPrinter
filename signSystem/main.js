const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

// Windows Print Spooler APIを使用してサイレント印刷

let mainWindow;
let globalTransparentWindow = null;
let isOverlayTransparent = false;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1080,
    height: 1920,
    // 🔸 以下を追加
    minWidth: 800,       // 最小幅
    minHeight: 600,      // 最小高さ
    resizable: true,     // サイズ変更可能
    show: false,         // 準備完了まで非表示
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
      webSecurity: false
    }
  });

  // 🔸 画面サイズに合わせて調整
  const { screen } = require('electron');
  const allDisplays = screen.getAllDisplays();
  
  // 常にメインモニターを使用
  let targetDisplay = screen.getPrimaryDisplay();
  console.log(`メインモニターに表示: ${targetDisplay.bounds.width} x ${targetDisplay.bounds.height}`);
  
  const { width: screenWidth, height: screenHeight } = targetDisplay.workAreaSize;
  const { x: screenX, y: screenY } = targetDisplay.bounds;
 
  // 画面に収まるサイズに調整
  const windowWidth = Math.min(1080, screenWidth - 100);
  const windowHeight = Math.min(1920, screenHeight - 100);
 
  mainWindow.setSize(windowWidth, windowHeight);
  
  // メインモニターの中央に配置
  const centerX = screenX + (screenWidth - windowWidth) / 2;
  const centerY = screenY + (screenHeight - windowHeight) / 2;
  mainWindow.setPosition(Math.floor(centerX), Math.floor(centerY));
 
  // 受信側HTMLを読み込み（絶対パスで指定）
  mainWindow.loadFile(path.join(__dirname, "index.html"));
 
  // 🔸 準備完了後に表示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log(`ウィンドウサイズ: ${windowWidth} x ${windowHeight}`);
  });
 
  // mainWindow.webContents.openDevTools(); // デバッグツール非表示
}

app.whenReady().then(async () => {
  createWindow();
  
  // 透明ウィンドウも同時に作成
  try {
    await createTransparentOverlayWindow();
    console.log('👻 起動時に透明ウィンドウを作成');
  } catch (error) {
    console.error('❌ 起動時の透明ウィンドウ作成エラー:', error);
  }
  
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 🔸 フルスクリーン切り替えのIPCハンドラー
ipcMain.on('toggle-fullscreen', (event) => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    const isFullScreen = focusedWindow.isFullScreen();
    const newFullScreenState = !isFullScreen;
    
    // フルスクリーンモード設定
    focusedWindow.setFullScreen(newFullScreenState);
    
    // フルスクリーン時はタイトルバーを完全に非表示
    if (newFullScreenState) {
      focusedWindow.setMenuBarVisibility(false);
    } else {
      focusedWindow.setMenuBarVisibility(true);
    }
    
    // レンダラープロセスにフルスクリーン状態を通知
    event.reply('fullscreen-changed', newFullScreenState);
    
    console.log(`🖥️ フルスクリーンモード: ${newFullScreenState ? 'ON' : 'OFF'}`);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// 印刷処理
// 🔸 画像保存のIPCハンドラー
ipcMain.on("save-image", (event, data) => {
  try {
    console.log("💾 画像保存要求を受信");
    console.log("💾 ファイル名:", data.filename);
    console.log("💾 画像データサイズ:", data.imageData ? data.imageData.length : 'なし');
    
    if (!data.imageData) {
      console.error("❌ 画像データがありません");
      return;
    }
    
    const base64Data = data.imageData.replace(/^data:image\/png;base64,/, "");
    const pngBuffer = Buffer.from(base64Data, "base64");
    console.log("💾 バッファサイズ:", pngBuffer.length);
    
    // Downloadsフォルダに保存
    const os = require('os');
    const downloadsPath = path.join(os.homedir(), 'Downloads');
    const filePath = path.join(downloadsPath, data.filename);
    
    console.log("💾 保存先パス:", filePath);
    console.log("💾 Downloadsフォルダ存在確認:", fs.existsSync(downloadsPath));
    
    // フォルダが存在しない場合は作成
    if (!fs.existsSync(downloadsPath)) {
      fs.mkdirSync(downloadsPath, { recursive: true });
      console.log("💾 Downloadsフォルダを作成しました");
    }
    
    fs.writeFileSync(filePath, pngBuffer);
    console.log("💾 画像保存完了:", filePath);
    console.log("💾 保存ファイル確認:", fs.existsSync(filePath));
    
    // 保存完了をレンダラープロセスに通知
    event.reply("save-image-complete", { filePath });
  } catch (error) {
    console.error("❌ 画像保存でエラー発生:", error);
    event.reply("save-image-error", { error: error.message });
  }
});

ipcMain.on("save-pdf", (event, data) => {
  console.log("📥 画像データ受信");
  console.log("📥 受信データタイプ:", data.printType || "不明");
  console.log("📄 受信用紙サイズ:", data.paperSize || "不明");
 
  let imageDataUrl;
  if (typeof data === 'string') {
    imageDataUrl = data;
  } else {
    imageDataUrl = data.imageData;
  }
 
  const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, "");
  const pngBuffer = Buffer.from(base64Data, "base64");
 
  const now = new Date();
  const printType = data.printType || "signature";
  const fileName = `${printType}_${now.getFullYear()}${(now.getMonth() + 1)
    .toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now
    .getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now
    .getSeconds().toString().padStart(2, "0")}.png`;
 
  const savePath = path.join(require('os').homedir(), 'Documents', 'AutoPrint', fileName);
 
  const saveDir = path.dirname(savePath);
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }
 
  fs.writeFile(savePath, pngBuffer, (err) => {
    if (err) {
      console.error("❌ PNG保存エラー:", err);
      return;
    }
    console.log("✅ PNG保存完了:", savePath);
    console.log("📁 保存場所:", savePath);
    
    // 🔸 画像確認のためにエクスプローラーで開く（デバッグ用）
    // 送信ボタン（printType: "pen"）と更に180度回転ボタン（printType: "double_rotated"）の場合はフォルダを開かない
    const shouldOpenFolder = data.printType !== "pen" && data.printType !== "double_rotated";
    
    if (shouldOpenFolder) {
      if (process.platform === 'win32') {
        exec(`explorer /select,"${savePath.replace(/\//g, '\\')}"`, (error) => {
          if (error) {
            console.error("❌ エクスプローラー起動エラー:", error);
          } else {
            console.log("✅ エクスプローラーで画像を表示");
          }
        });
      } else if (process.platform === 'darwin') {
        exec(`open -R "${savePath}"`, (error) => {
          if (error) {
            console.error("❌ Finder起動エラー:", error);
          } else {
            console.log("✅ Finderで画像を表示");
          }
        });
      }
    } else {
      if (data.printType === "pen") {
        console.log("📁 送信ボタンからの印刷のため、フォルダは開きません");
      } else if (data.printType === "double_rotated") {
        console.log("📁 更に180度回転ボタンからの印刷のため、フォルダは開きません");
      }
    }
    
    // 🔸 OS別の印刷処理
    // 用紙サイズに応じてプリンター名を変更（L版専用設定を使用）
    const basePrinterName = "Brother_MFC_J6983CDW";
    const printerName = paperSize === 'L' ? basePrinterName : basePrinterName;
    console.log(`🖨️ 使用予定プリンター名: "${printerName}"`);
    
    if (process.platform === 'darwin') {
      // macOS用の印刷処理
      console.log(`🖨️ macOSで印刷開始: ${savePath}`);
      
      // macでプリンター一覧を確認（詳細版）
      exec('lpstat -p', (error, stdout, stderr) => {
        if (error) {
          console.error("❌ プリンター確認エラー:", error);
        } else {
          console.log("📋 利用可能なプリンター（lpstat -p）:");
          console.log(stdout);
          console.log(`🔍 探しているプリンター: "${printerName}"`);
          if (stdout.includes(printerName)) {
            console.log("✅ 対象プリンターが見つかりました");
          } else {
            console.log("⚠️ 対象プリンターが見つかりません");
          }
        }
      });
      
      // 別の方法でもプリンター一覧を確認
      exec('lpstat -a', (error, stdout, stderr) => {
        if (error) {
          console.error("❌ プリンター確認エラー2:", error);
        } else {
          console.log("📋 プリンター状態（lpstat -a）:");
          console.log(stdout);
        }
      });
      
      // 用紙サイズに応じてlprコマンドを変更
      const paperSize = data.paperSize || 'A4'; // デフォルトはA4
      let printCommand;
      
      console.log(`🔍 用紙サイズ判定: paperSize="${paperSize}" (型: ${typeof paperSize})`);
      
      // シンプルにプリンターのデフォルト設定を使用（現在はL版がデフォルト）
      printCommand = `lpr -P "${printerName}" "${savePath}"`;
      console.log(`🖨️ 印刷コマンド実行（プリンターのデフォルト設定使用）: ${printCommand}`);
      console.log(`📝 選択された用紙サイズ: ${paperSize} (プリンター側で自動処理)`);
      
      // デバッグ用：現在のプリンター設定を確認
      exec(`lpoptions -p "${printerName}"`, (error, stdout, stderr) => {
        if (!error) {
          console.log(`📋 現在のプリンター設定:`, stdout);
        }
      });
      
      console.log('🚨🚨🚨 プリンターに印刷コマンドを実行！！！');
      console.log(`📟 実行コマンド: ${printCommand}`);
      
      exec(printCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("❌ lpr印刷エラー:", error);
          console.error("❌ エラー詳細:", error.message);
          
          // L判の場合は別のコマンドを試行
          if (paperSize === 'L') {
            const fallbackCommand = `lpr -P "${printerName}" -o PageSize=4x6 "${savePath}"`;
            console.log(`🔄 L判フォールバック印刷（renderer.jsで180度回転済み）: ${fallbackCommand}`);
            
            exec(fallbackCommand, (fbError, fbStdout, fbStderr) => {
              if (fbError) {
                console.error("❌ L判フォールバック印刷エラー:", fbError);
                // さらにフォールバック: デフォルトプリンターで印刷
                const defaultCommand = `lpr "${savePath}"`;
                console.log(`🔄 デフォルトプリンターで印刷: ${defaultCommand}`);
                
                exec(defaultCommand, (dfError, dfStdout, dfStderr) => {
                  if (dfError) {
                    console.error("❌ デフォルトプリンター印刷エラー:", dfError);
                    // 最終手段: Previewアプリで開く
                    exec(`open -a Preview "${savePath}"`, (previewError) => {
                      if (previewError) {
                        console.error("❌ Preview起動エラー:", previewError);
                      } else {
                        console.log("✅ Previewアプリで画像を開きました（手動印刷してください）");
                      }
                    });
                  } else {
                    console.log("✅ デフォルトプリンターで印刷完了");
                  }
                });
              } else {
                console.log("✅ L判フォールバック印刷完了");
                console.log("📋 stdout:", fbStdout);
                console.log("📋 stderr:", fbStderr);
              }
            });
          } else {
            // A4などの通常フォールバック
            const fallbackCommand = `lpr "${savePath}"`;
            console.log(`🔄 デフォルトプリンターで印刷: ${fallbackCommand}`);
            
            exec(fallbackCommand, (fbError, fbStdout, fbStderr) => {
              if (fbError) {
                console.error("❌ デフォルトプリンター印刷エラー:", fbError);
                // 最終手段: Previewアプリで開く
                exec(`open -a Preview "${savePath}"`, (previewError) => {
                  if (previewError) {
                    console.error("❌ Preview起動エラー:", previewError);
                  } else {
                    console.log("✅ Previewアプリで画像を開きました（手動印刷してください）");
                  }
                });
              } else {
                console.log("✅ デフォルトプリンターで印刷完了");
              }
            });
          }
        } else {
          console.log(`✅ Brother印刷完了（lpr）`);
          console.log("📋 stdout:", stdout);
          console.log("📋 stderr:", stderr);
        }
      });
      
    } else {
      // Windows用の印刷処理（既存のコード）
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x: primaryX, y: primaryY, width: primaryWidth, height: primaryHeight } = primaryDisplay.bounds;
      
      const mspaintCommand = `mspaint /pt "${savePath}" "${printerName}"`;
      
      console.log(`🖨 mspaintで印刷: ${mspaintCommand}`);
      console.log(`📍 メインモニター位置: ${primaryX}, ${primaryY} (${primaryWidth}x${primaryHeight})`);
      
      process.env.DISPLAY_X = primaryX.toString();
      process.env.DISPLAY_Y = primaryY.toString();
      
      exec(mspaintCommand, { 
        windowsHide: true,
        env: { ...process.env, DISPLAY_X: primaryX.toString(), DISPLAY_Y: primaryY.toString() }
      }, (error, stdout, stderr) => {
        if (error) {
          console.error("❌ mspaint印刷エラー:", error);
          console.error("❌ エラー詳細:", error.message);
          fallbackPowerShellPrint(savePath, printerName);
        } else {
          console.log(`✅ Brother印刷完了（mspaint - ダイアログ抑制）`);
          console.log("📋 stdout:", stdout);
          console.log("📋 stderr:", stderr);
        }
      });
    }
  });
});

// フォールバック：PowerShell印刷関数
function fallbackPowerShellPrint(filePath, printerName) {
  // 🔸 メインモニターの位置情報を取得
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x: primaryX, y: primaryY } = primaryDisplay.bounds;
  
  const printCommand = `powershell -Command "Start-Process -FilePath '${filePath}' -Verb PrintTo -ArgumentList '${printerName}' -WindowStyle Hidden"`;
  
  console.log(`🔄 PowerShellフォールバック印刷: ${printCommand}`);
  
  exec(printCommand, { 
    windowsHide: true,
    env: { ...process.env, DISPLAY_X: primaryX.toString(), DISPLAY_Y: primaryY.toString() }
  }, (error, stdout, stderr) => {
    if (error) {
      console.error("❌ PowerShell印刷エラー:", error);
      // 最終フォールバック：mspaint
      const fallbackCommand = `mspaint /pt "${filePath}" "${printerName}"`;
      console.log(`🔄 mspaint最終フォールバック: ${fallbackCommand}`);
      exec(fallbackCommand, {
        env: { ...process.env, DISPLAY_X: primaryX.toString(), DISPLAY_Y: primaryY.toString() }
      }, (fbError, fbStdout, fbStderr) => {
        if (fbError) {
          console.error("❌ mspaint印刷エラー:", fbError);
        } else {
          console.log(`✅ mspaint印刷完了`);
        }
      });
    } else {
      console.log(`✅ PowerShell印刷完了`);
    }
  });
}

// 透明ウィンドウ作成の共通関数
async function createTransparentOverlayWindow() {
  // 既に存在する場合は何もしない
  if (globalTransparentWindow && !globalTransparentWindow.isDestroyed()) {
    console.log('👻 透明ウィンドウは既に存在します');
    return globalTransparentWindow.id;
  }
  
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  const transparentWindow = new BrowserWindow({
    width: 800,
    height: 600,
    x: 100,
    y: 100,
    transparent: true,
    backgroundColor: '#00000000',
    frame: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    focusable: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false
    }
  });
  
  // waiting.pngを読み込んでbase64に変換
  const fs = require('fs');
  const path = require('path');
  const waitingImagePath = path.join(__dirname, 'waiting.png');
  let waitingImageBase64 = '';
  
  try {
    const imageBuffer = fs.readFileSync(waitingImagePath);
    waitingImageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    console.log('✅ waiting.png読み込み成功');
  } catch (error) {
    console.error('❌ waiting.png読み込み失敗:', error);
    waitingImageBase64 = ''; // 空の場合は画像なしで表示
  }
  
  // 透明ウィンドウのHTML内容
  const transparentHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;">
      <style>
        body {
          margin: 0;
          padding: 0;
          background: rgba(240, 240, 240, 0.9);
          overflow: hidden;
          transition: all 0.3s ease;
        }
        body.transparent {
          background: transparent;
          pointer-events: none;
        }
        #controls {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.8);
          padding: 10px;
          border-radius: 5px;
          z-index: 100000;
        }
        #transparentBtn {
          padding: 10px 20px;
          background: #ff1493;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          margin: 5px;
        }
        #fullscreenBtn {
          padding: 10px 20px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          margin: 5px;
        }
        body.transparent #controls {
          opacity: 0;
          pointer-events: none;
        }
        .special-heart-overlay {
          position: fixed;
          width: 120px;
          height: 120px;
          background: #ff1493 !important;
          pointer-events: none;
          z-index: 999999;
          transform: rotate(45deg);
          box-shadow: 0 0 20px #ff1493, 0 0 40px #ff1493, 0 0 60px #ff1493;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .special-heart-overlay::before,
        .special-heart-overlay::after {
          content: '';
          width: 120px;
          height: 120px;
          position: absolute;
          background: #ff1493 !important;
          border-radius: 50%;
          box-shadow: 0 0 20px #ff1493;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .special-heart-overlay::before {
          top: -60px;
          left: 0;
        }
        .special-heart-overlay::after {
          top: 0;
          left: -60px;
        }
        body.transparent .special-heart-overlay {
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: none;
          background: #ff1493 !important;
        }
        body.transparent .special-heart-overlay::before,
        body.transparent .special-heart-overlay::after {
          background: #ff1493 !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        #waitingImage {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          object-fit: cover;
          z-index: 1000;
          opacity: 1;
          transition: transform 1s ease-in-out;
          pointer-events: none;
        }
        #waitingImage.slide-up {
          transform: translateY(-100vh);
        }
      </style>
    </head>
    <body>
      <div id="controls">
        <button id="transparentBtn">透明化</button>
        <button id="fullscreenBtn">最大化</button>
      </div>
      ${waitingImageBase64 ? `<img id="waitingImage" src="${waitingImageBase64}" alt="待機中" />` : '<div id="waitingImage" style="color: #333;">Loading...</div>'}
      <script>
        const { ipcRenderer } = require('electron');
        
        // 透明状態監視用の変数
        let isCurrentlyTransparent = false;
        
        // 透明化ボタンイベント（ウィンドウのみ透明化、画像はそのまま）
        document.getElementById('transparentBtn').addEventListener('click', () => {
          document.body.classList.add('transparent');
          ipcRenderer.send('set-overlay-transparent', true);
          isCurrentlyTransparent = true;
          console.log('🔍 オーバーレイウィンドウを透明化（画像はそのまま表示）');
        });
        
        // 最大化ボタンイベント
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
          ipcRenderer.send('set-overlay-fullscreen');
          console.log('🖥️ オーバーレイウィンドウを最大化');
        });
        
        // ハート追加要求を受信
        ipcRenderer.on('add-heart-to-transparent', (event, data) => {
          console.log('💖 透明ウィンドウでハート追加要求を受信:', data);
          
          const heart = document.createElement('div');
          heart.className = 'special-heart-overlay';
          
          const randomAnimationName = \`overlayHeartFloat_\${Math.random().toString(36).substr(2, 9)}\`;
          // 中央から±300px（合計600px）の範囲でランダム配置
          const windowCenterX = window.innerWidth / 2;
          const randomX = windowCenterX + (Math.random() - 0.5) * 600; // -300px to +300px
          
          console.log('💖 ハート配置位置:', { windowCenterX, randomX, windowWidth: window.innerWidth });
          
          const style = document.createElement('style');
          style.textContent = \`
            @keyframes \${randomAnimationName} {
              0% {
                transform: rotate(45deg);
                bottom: -150px;
                left: \${randomX}px;
              }
              100% {
                transform: rotate(45deg);
                bottom: \${window.innerHeight + 150}px;
                left: \${randomX}px;
              }
            }
          \`;
          document.head.appendChild(style);
          
          heart.style.animation = \`\${randomAnimationName} 1s linear forwards\`;
          heart.style.position = 'fixed';
          
          document.body.appendChild(heart);
          console.log('👻 透明ウィンドウにハート追加完了 - DOM要素数:', document.body.children.length);
          
          setTimeout(() => {
            if (heart.parentNode) heart.parentNode.removeChild(heart);
            if (style.parentNode) style.parentNode.removeChild(style);
            console.log('👻 ハート削除完了');
          }, 1000);
        });
        
        // スライドアニメーション要求を受信（ハート機能と同じ仕組み）
        ipcRenderer.on('add-slide-to-transparent', (event, data) => {
          console.log('📤 透明ウィンドウでスライドアニメーション要求を受信:', data);
          const waitingImage = document.getElementById('waitingImage');
          if (waitingImage) {
            waitingImage.classList.add('slide-up');
            console.log('📤 待機画像を上部にスライド開始');
          }
        });
        
        // 画像スライドアニメーション要求を受信（旧式・互換性のため残存）
        ipcRenderer.on('slide-waiting-image', (event) => {
          const waitingImage = document.getElementById('waitingImage');
          if (waitingImage) {
            waitingImage.classList.add('slide-up');
            console.log('📤 待機画像を上部にスライド開始（旧式）');
          }
        });
        
        // ブラウザ環境対応 + Electron環境でのLocalStorage併用
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          // LocalStorageの変更を監視
          window.addEventListener('storage', (event) => {
            if (event.key === 'slideWaitingImage' && event.newValue) {
              try {
                const data = JSON.parse(event.newValue);
                if (data.action === 'slide') {
                  const waitingImage = document.getElementById('waitingImage');
                  if (waitingImage) {
                    waitingImage.classList.add('slide-up');
                    console.log('📤 LocalStorage経由で待機画像を上部にスライド開始');
                  }
                }
              } catch (error) {
                console.error('❌ LocalStorageイベント処理エラー:', error);
              }
            }
          });
          
          // 定期的にLocalStorageをポーリング（storageイベントが発火しない場合の対策）
          setInterval(() => {
            const slideCommand = localStorage.getItem('slideWaitingImage');
            if (slideCommand) {
              try {
                const data = JSON.parse(slideCommand);
                if (data.action === 'slide' && Date.now() - data.timestamp < 2000) { // 2秒以内の指示のみ有効
                  const waitingImage = document.getElementById('waitingImage');
                  if (waitingImage && !waitingImage.classList.contains('slide-up')) {
                    waitingImage.classList.add('slide-up');
                    console.log('📤 ポーリングでLocalStorageから待機画像スライド実行');
                    // 使用済みコマンドを削除
                    localStorage.removeItem('slideWaitingImage');
                  }
                }
              } catch (error) {
                console.error('❌ LocalStorageポーリングエラー:', error);
              }
            }
          }, 500);
          
          // 初期化時にLocalStorageをチェック（既存の指示があるかもしれない）
          setTimeout(() => {
            const slideCommand = localStorage.getItem('slideWaitingImage');
            if (slideCommand) {
              try {
                const data = JSON.parse(slideCommand);
                if (data.action === 'slide' && Date.now() - data.timestamp < 5000) { // 5秒以内の指示のみ有効
                  const waitingImage = document.getElementById('waitingImage');
                  if (waitingImage) {
                    waitingImage.classList.add('slide-up');
                    console.log('📤 初期化時LocalStorageから待機画像スライド実行');
                  }
                }
              } catch (error) {
                console.error('❌ 初期化時LocalStorageチェックエラー:', error);
              }
            }
          }, 100);
        }
        
        // 透明状態を維持する監視機能
        setInterval(() => {
          if (isCurrentlyTransparent && !document.body.classList.contains('transparent')) {
            document.body.classList.add('transparent');
            if (typeof ipcRenderer !== 'undefined') {
              ipcRenderer.send('ensure-overlay-transparency');
            }
            console.log('👻 透明状態を復元');
          }
        }, 500);
      </script>
    </body>
    </html>
  `;
  
  transparentWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(transparentHTML));
  
  // グローバル参照に保存
  globalTransparentWindow = transparentWindow;
  
  // WebContentsが準備完了するまで待機
  await new Promise((resolve) => {
    transparentWindow.webContents.once('did-finish-load', () => {
      console.log('👻 透明ウィンドウのWebContents準備完了');
      resolve();
    });
  });
  
  console.log('👻 Electronオーバーレイウィンドウを作成（可視状態）');
  return transparentWindow.id;
}

// 透明ウィンドウ作成のIPCハンドラー
ipcMain.handle('create-transparent-window', async () => {
  return await createTransparentOverlayWindow();
});

// 動画ウィンドウ管理
let videoWindow = null;

// 動画ウィンドウ作成のIPCハンドラー
ipcMain.handle('create-video-window', async () => {
  if (videoWindow && !videoWindow.isDestroyed()) {
    console.log('🎬 動画ウィンドウは既に存在します');
    videoWindow.focus();
    return { success: true, exists: true };
  }
  
  videoWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    resizable: true,
    maximizable: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    title: 'Sign Video Player'
  });
  
  // HTMLファイルをロード
  const videoHtmlPath = path.join(__dirname, 'video-player.html');
  videoWindow.loadFile(videoHtmlPath);
  
  videoWindow.once('ready-to-show', () => {
    videoWindow.show();
    console.log('🎬 動画ウィンドウを表示しました');
  });
  
  videoWindow.on('closed', () => {
    videoWindow = null;
    console.log('🎬 動画ウィンドウが閉じられました');
  });
  
  return { success: true, exists: false };
});

// 動画制御のIPCハンドラー
ipcMain.on('video-control', (event, data) => {
  if (videoWindow && !videoWindow.isDestroyed()) {
    videoWindow.webContents.send('video-command', data);
    console.log(`🎬 動画制御コマンド送信: ${data.command}`);
  }
});

// 透明ウィンドウにハート追加のIPCハンドラー
ipcMain.on('add-heart-to-transparent-window', (event, data) => {
  console.log('📨 ハート追加要求を受信:', data);
  
  if (globalTransparentWindow && !globalTransparentWindow.isDestroyed()) {
    // WebContentsが準備できているか確認
    if (globalTransparentWindow.webContents.isLoading()) {
      console.log('⏳ 透明ウィンドウの読み込み中、少し待機...');
      globalTransparentWindow.webContents.once('did-finish-load', () => {
        globalTransparentWindow.webContents.send('add-heart-to-transparent', data);
        console.log('👻 透明ウィンドウ読み込み完了後にハート送信');
      });
    } else {
      globalTransparentWindow.webContents.send('add-heart-to-transparent', data);
      console.log('👻 透明ウィンドウにハート送信指示完了');
    }
  } else {
    console.log('❌ 透明ウィンドウが存在しないかデストロイされています');
  }
});

// スライドアニメーション要求のIPCハンドラー（ハート機能と同じ仕組み）
ipcMain.on('add-slide-to-transparent-window', (event, data) => {
  console.log('📨 スライドアニメーション要求を受信:', data);
  
  if (globalTransparentWindow && !globalTransparentWindow.isDestroyed()) {
    // WebContentsが準備できているか確認
    if (globalTransparentWindow.webContents.isLoading()) {
      console.log('⏳ 透明ウィンドウの読み込み中、少し待機...');
      globalTransparentWindow.webContents.once('did-finish-load', () => {
        globalTransparentWindow.webContents.send('add-slide-to-transparent', data);
        console.log('👻 透明ウィンドウ読み込み完了後にスライド送信');
      });
    } else {
      globalTransparentWindow.webContents.send('add-slide-to-transparent', data);
      console.log('👻 透明ウィンドウにスライド送信指示完了');
    }
  } else {
    console.log('❌ 透明ウィンドウが存在しないかデストロイされています');
  }
});

// 画像スライドアニメーション要求のIPCハンドラー（旧式・互換性のため残存）
ipcMain.on('slide-waiting-image', () => {
  console.log('📨 画像スライド要求を受信（旧式）');
  
  if (globalTransparentWindow && !globalTransparentWindow.isDestroyed()) {
    globalTransparentWindow.webContents.send('slide-waiting-image');
    console.log('👻 透明ウィンドウに画像スライド指示送信');
  } else {
    console.log('❌ 透明ウィンドウが存在しません');
  }
});

// オーバーレイウィンドウ透明化のIPCハンドラー
ipcMain.on('set-overlay-transparent', (event, isTransparent) => {
  isOverlayTransparent = isTransparent;
  if (globalTransparentWindow && !globalTransparentWindow.isDestroyed()) {
    if (isTransparent) {
      // ウィンドウ自体は透明にするが、コンテンツは見えるようにする
      globalTransparentWindow.setBackgroundColor('#00000000'); // 完全透明背景
      globalTransparentWindow.setIgnoreMouseEvents(true);
      console.log('👻 オーバーレイウィンドウを透明化');
    } else {
      globalTransparentWindow.setBackgroundColor('#f0f0f0'); // 不透明背景
      globalTransparentWindow.setIgnoreMouseEvents(false);
      console.log('👻 オーバーレイウィンドウを不透明化');
    }
  }
});

// オーバーレイウィンドウ最大化のIPCハンドラー
ipcMain.on('set-overlay-fullscreen', (event) => {
  if (globalTransparentWindow && !globalTransparentWindow.isDestroyed()) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    globalTransparentWindow.setBounds({ x: 0, y: 0, width, height });
    globalTransparentWindow.setAlwaysOnTop(true);
    console.log('👻 オーバーレイウィンドウを最大化');
  }
});

// 透明状態確保のIPCハンドラー
ipcMain.on('ensure-overlay-transparency', (event) => {
  if (globalTransparentWindow && !globalTransparentWindow.isDestroyed() && isOverlayTransparent) {
    globalTransparentWindow.setBackgroundColor('#00000000');
    globalTransparentWindow.setIgnoreMouseEvents(true);
    console.log('👻 オーバーレイ透明状態を強制確保');
  }
});

// 定期的な透明状態維持（メインプロセス側でも監視）
setInterval(() => {
  if (globalTransparentWindow && !globalTransparentWindow.isDestroyed() && isOverlayTransparent) {
    globalTransparentWindow.setBackgroundColor('#00000000');
    globalTransparentWindow.setIgnoreMouseEvents(true);
  }
}, 200);

// 透過画像印刷処理（ダイアログなし）
ipcMain.on("print-transparent-image", (event, data) => {
  console.log("🖨️ 透過画像印刷要求を受信");
  
  const base64Data = data.imageData.replace(/^data:image\/png;base64,/, "");
  const pngBuffer = Buffer.from(base64Data, "base64");
  
  const now = new Date();
  const fileName = `transparent_${now.getFullYear()}${(now.getMonth() + 1)
    .toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now
    .getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now
    .getSeconds().toString().padStart(2, "0")}.png`;
  
  const savePath = path.join(require('os').homedir(), 'Documents', 'AutoPrint', fileName);
  
  const saveDir = path.dirname(savePath);
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }
  
  fs.writeFile(savePath, pngBuffer, (err) => {
    if (err) {
      console.error("❌ 透過PNG保存エラー:", err);
      return;
    }
    console.log("✅ 透過PNG保存完了:", savePath);
    
    // 🔸 OS別の透過画像印刷処理
    const printerName = "Brother_MFC_J6983CDW";
    
    if (process.platform === 'darwin') {
      // macOS用の透過画像印刷処理
      console.log(`🖨️ macOSで透過画像印刷開始: ${savePath}`);
      
      // lprコマンドで印刷
      const printCommand = `lpr -P "${printerName}" "${savePath}"`;
      console.log(`🖨️ 透過画像lprコマンド実行: ${printCommand}`);
      
      exec(printCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("❌ 透過画像lpr印刷エラー:", error);
          console.error("❌ エラー詳細:", error.message);
          
          // フォールバック: デフォルトプリンターで印刷
          const fallbackCommand = `lpr "${savePath}"`;
          console.log(`🔄 透過画像をデフォルトプリンターで印刷: ${fallbackCommand}`);
          
          exec(fallbackCommand, (fbError, fbStdout, fbStderr) => {
            if (fbError) {
              console.error("❌ 透過画像デフォルトプリンター印刷エラー:", fbError);
              // 最終手段: Previewアプリで開く
              exec(`open -a Preview "${savePath}"`, (previewError) => {
                if (previewError) {
                  console.error("❌ 透過画像Preview起動エラー:", previewError);
                } else {
                  console.log("✅ 透過画像をPreviewアプリで開きました（手動印刷してください）");
                }
              });
            } else {
              console.log("✅ 透過画像をデフォルトプリンターで印刷完了");
            }
          });
        } else {
          console.log(`✅ 透過画像Brother印刷完了（lpr）: ${fileName}`);
          console.log("📋 stdout:", stdout);
          console.log("📋 stderr:", stderr);
        }
      });
      
    } else {
      // Windows用の透過画像印刷処理（既存のコード）
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x: primaryX, y: primaryY } = primaryDisplay.bounds;
      
      const mspaintCommand = `mspaint /pt "${savePath}" "${printerName}"`;
      
      console.log(`🖨️ 透過画像をmspaintで印刷: ${mspaintCommand}`);
      console.log(`📍 透過画像印刷 - メインモニター位置: ${primaryX}, ${primaryY}`);
      
      exec(mspaintCommand, { 
        windowsHide: true,
        env: { ...process.env, DISPLAY_X: primaryX.toString(), DISPLAY_Y: primaryY.toString() }
      }, (error, stdout, stderr) => {
        if (error) {
          console.error("❌ 透過画像mspaint印刷エラー:", error);
          fallbackPowerShellPrint(savePath, printerName);
        } else {
          console.log(`✅ 透過画像印刷完了（mspaint - ダイアログ抑制）: ${fileName}`);
        }
      });
    }
  });
});
