const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

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
  
  // サブモニターがあるかチェック
  let targetDisplay = screen.getPrimaryDisplay(); // デフォルトはメインモニター
  
  if (allDisplays.length > 1) {
    // 複数モニターがある場合、2番目のモニター（サブモニター）を使用
    targetDisplay = allDisplays[1];
    console.log(`サブモニターに表示: ${targetDisplay.bounds.width} x ${targetDisplay.bounds.height}`);
  } else {
    console.log(`メインモニターに表示: ${targetDisplay.bounds.width} x ${targetDisplay.bounds.height}`);
  }
  
  const { width: screenWidth, height: screenHeight } = targetDisplay.workAreaSize;
  const { x: screenX, y: screenY } = targetDisplay.bounds;
 
  // 画面に収まるサイズに調整
  const windowWidth = Math.min(1080, screenWidth - 100);
  const windowHeight = Math.min(1920, screenHeight - 100);
 
  mainWindow.setSize(windowWidth, windowHeight);
  
  // サブモニターの中央に配置
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
    
    // 🔸 ダイアログなしで印刷（PowerShellを使用）
    const printerName = "Brother MFC-J6983CDW Printer";
    const printCommand = `powershell -Command "Start-Process -FilePath '${savePath}' -Verb PrintTo -ArgumentList '${printerName}' -WindowStyle Hidden"`;
    
    console.log(`🖨 ダイアログなしで印刷: ${printCommand}`);
    
    exec(printCommand, { windowsHide: true }, (error, stdout, stderr) => {
      console.log("📋 stdout:", stdout);
      console.log("📋 stderr:", stderr);
      if (error) {
        console.error("❌ 印刷エラー:", error);
        // フォールバック：従来の方法
        console.log("🔄 フォールバック印刷を試行");
        const fallbackCommand = `mspaint /pt "${savePath}" "${printerName}"`;
        exec(fallbackCommand, (fbError, fbStdout, fbStderr) => {
          if (fbError) {
            console.error("❌ フォールバック印刷エラー:", fbError);
          } else {
            console.log(`✅ フォールバック印刷完了`);
          }
        });
      } else {
        console.log(`✅ Brother印刷完了（ダイアログなし）`);
      }
    });
  });
});

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
    
    // 🔸 透過画像もダイアログなしで印刷
    const printerName = "Brother MFC-J6983CDW Printer";
    const printCommand = `powershell -Command "Start-Process -FilePath '${savePath}' -Verb PrintTo -ArgumentList '${printerName}' -WindowStyle Hidden"`;
    
    console.log(`🖨️ 透過画像ダイアログなしで印刷: ${printCommand}`);
    
    exec(printCommand, { windowsHide: true }, (error, stdout, stderr) => {
      console.log("📋 stdout:", stdout);
      console.log("📋 stderr:", stderr);
      if (error) {
        console.error("❌ 透過画像印刷エラー:", error);
        // フォールバック：従来の方法
        console.log("🔄 透過画像フォールバック印刷を試行");
        const fallbackCommand = `mspaint /pt "${savePath}" "${printerName}"`;
        exec(fallbackCommand, (fbError, fbStdout, fbStderr) => {
          if (fbError) {
            console.error("❌ 透過画像フォールバック印刷エラー:", fbError);
          } else {
            console.log(`✅ 透過画像フォールバック印刷完了`);
          }
        });
      } else {
        console.log(`✅ 透過画像印刷完了（ダイアログなし）: ${fileName}`);
      }
    });
  });
});
