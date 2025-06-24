const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

// Windows Print Spooler APIを使用してサイレント印刷

let mainWindow;

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
      contextIsolation: false
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

app.whenReady().then(() => {
  createWindow();
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
ipcMain.on("save-pdf", (event, data) => {
  console.log("📥 画像データ受信");
 
  let imageDataUrl;
  if (typeof data === 'string') {
    imageDataUrl = data;
  } else {
    imageDataUrl = data.imageData;
  }
 
  const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, "");
  const pngBuffer = Buffer.from(base64Data, "base64");
 
  const now = new Date();
  const fileName = `signature_${now.getFullYear()}${(now.getMonth() + 1)
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
    // 送信ボタン（printType: "pen"）の場合はフォルダを開かない
    const shouldOpenFolder = data.printType !== "pen";
    
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
      console.log("📁 送信ボタンからの印刷のため、フォルダは開きません");
    }
    
    // 🔸 OS別の印刷処理
    const printerName = "Brother MFC-J6983CDW";
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
      
      // lprコマンドで印刷
      const printCommand = `lpr -P "${printerName}" "${savePath}"`;
      console.log(`🖨️ lprコマンド実行: ${printCommand}`);
      
      exec(printCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("❌ lpr印刷エラー:", error);
          console.error("❌ エラー詳細:", error.message);
          
          // フォールバック: デフォルトプリンターで印刷
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
    const printerName = "Brother MFC-J6983CDW";
    
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
