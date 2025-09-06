// rendering-print.js
// 印刷処理システム - renderer.jsから分離
// 作成日: 2025年09月06日

// ===========================
// 🖨️ PRINT SYSTEM - 印刷処理システム
// ===========================

/**
 * PrintManager クラス
 * 印刷関連の全処理を統合管理
 */
class PrintManager {
  constructor(dependencies = {}) {
    // 外部依存の注入
    this.canvas = dependencies.canvas;
    this.ctx = dependencies.ctx;
    this.drawCanvas = dependencies.drawCanvas;
    this.drawCtx = dependencies.drawCtx;
    this.drawingAreaSize = dependencies.drawingAreaSize;
    this.drawingAreaOffset = dependencies.drawingAreaOffset;
    this.writerDrawingData = dependencies.writerDrawingData;
    this.back2Image = dependencies.back2Image;
    this.initialBack2Size = dependencies.initialBack2Size;
    
    console.log('✅ PrintManager初期化完了');
  }

  // ===========================
  // 📋 PRINT PREVIEW - 印刷プレビュー機能
  // ===========================

  /**
   * 印刷物プレビュー表示
   */
  showPrintPreview() {
    const modal = document.getElementById('printPreviewModal');
    const previewCanvas = document.getElementById('printPreviewCanvas');
    const previewCtx = previewCanvas.getContext('2d');
    
    // プレビュー用キャンバスサイズを設定（実際の印刷サイズ）
    previewCanvas.width = this.drawingAreaSize.width;
    previewCanvas.height = this.drawingAreaSize.height;
    
    // 受信側Canvasの描画エリア部分を直接コピーしてプレビュー表示
    const centerX = this.canvas.width / 2 + this.drawingAreaOffset.x;
    const centerY = this.canvas.height / 2 + this.drawingAreaOffset.y;
    const areaLeft = centerX - this.drawingAreaSize.width / 2;
    const areaTop = centerY - this.drawingAreaSize.height / 2;
    
    // 受信側Canvasの指定エリアをプレビューCanvasにコピー
    previewCtx.drawImage(
      this.canvas,
      areaLeft, areaTop, this.drawingAreaSize.width, this.drawingAreaSize.height,
      0, 0, previewCanvas.width, previewCanvas.height
    );
    
    console.log('📋 プレビュー: 受信側Canvas描画エリアを直接コピー完了');
    
    // モーダルを表示
    modal.style.display = 'flex';
  }

  /**
   * 印刷プレビューを閉じる
   */
  closePrintPreview() {
    const modal = document.getElementById('printPreviewModal');
    modal.style.display = 'none';
  }

  // ===========================
  // 🖨️ PRINT EXECUTION - 印刷実行機能
  // ===========================

  /**
   * フル印刷（背景込み）
   */
  printFull() {
    console.log('🖨️ === フル印刷開始: 受信側Canvas内容をそのまま印刷 ===');
    
    // 受信側の現在のCanvas内容をそのまま印刷用に使用
    const printCanvas = document.createElement('canvas');
    const printCtx = printCanvas.getContext('2d');
    
    // 受信側キャンバスと同じサイズ
    printCanvas.width = this.canvas.width;
    printCanvas.height = this.canvas.height;
    
    // 白い背景を設定
    printCtx.fillStyle = 'white';
    printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);
    
    // 受信側Canvas全体をコピー
    printCtx.drawImage(this.canvas, 0, 0);
    
    console.log(`🖨️ フル印刷: ${printCanvas.width}x${printCanvas.height}px`);
    
    // 印刷用画像データを生成
    const dataURL = printCanvas.toDataURL('image/png', 1.0);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `sign-full-${timestamp}.png`;
    
    // ダウンロードと印刷処理
    this._downloadAndPrint(dataURL, fileName);
    
    console.log('✅ フル印刷処理完了');
  }

  /**
   * ペン印刷（描画のみ）
   */
  printPen() {
    console.log('🖨️ === ペン印刷開始: 受信側キャンバスの描画部分のみ印刷 ===');
    
    try {
      // 印刷用キャンバスを作成
      const printCanvas = document.createElement('canvas');
      const printCtx = printCanvas.getContext('2d');
      
      // 描画エリアサイズに合わせる
      printCanvas.width = this.drawingAreaSize.width;
      printCanvas.height = this.drawingAreaSize.height;
      
      // 背景を白に設定
      printCtx.fillStyle = 'white';
      printCtx.fillRect(0, 0, printCanvas.width, printCanvas.height);
      
      console.log(`🖨️ ペン印刷: 印刷キャンバス作成 ${printCanvas.width}x${printCanvas.height}px`);
      
      // 全WriterIDの描画データを0度で再描画
      let totalStrokes = 0;
      
      Object.keys(this.writerDrawingData).forEach(writerId => {
        const commands = this.writerDrawingData[writerId];
        if (commands && commands.length > 0) {
          totalStrokes += this._drawWriterCommandsForPrint(commands, writerId, printCtx);
        }
      });
      
      console.log(`🖨️ ペン印刷: ${totalStrokes}本のストロークを描画`);
      
      // 印刷用画像データを生成
      const dataURL = printCanvas.toDataURL('image/png', 1.0);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `sign-pen-${timestamp}.png`;
      
      // ダウンロードと印刷処理
      this._downloadAndPrint(dataURL, fileName);
      
      console.log('✅ ペン印刷処理完了');
      
    } catch (error) {
      console.error('❌ ペン印刷処理でエラー:', error);
    }
  }

  // ===========================
  // 🎨 IMAGE GENERATION - 画像生成機能
  // ===========================

  /**
   * 印刷用画像を生成
   */
  async generatePrintImage() {
    console.log('🎨 generatePrintImage: 印刷用画像を生成');
    
    try {
      // キャンバスサイズを決定
      let canvasWidth, canvasHeight;
      
      if (this.back2Image && this.back2Image.naturalWidth && this.back2Image.naturalHeight) {
        canvasWidth = this.back2Image.naturalWidth;
        canvasHeight = this.back2Image.naturalHeight;
        console.log(`📐 back2画像サイズを使用: ${canvasWidth} x ${canvasHeight}`);
      } else if (this.initialBack2Size && this.initialBack2Size.width && this.initialBack2Size.height) {
        canvasWidth = this.initialBack2Size.width;
        canvasHeight = this.initialBack2Size.height;
        console.log(`📐 初期back2サイズを使用: ${canvasWidth} x ${canvasHeight}`);
      } else if (this.drawCanvas) {
        canvasWidth = this.drawCanvas.width;
        canvasHeight = this.drawCanvas.height;
        console.log(`📐 drawCanvasサイズを使用: ${canvasWidth} x ${canvasHeight}`);
      } else {
        canvasWidth = 800;
        canvasHeight = 600;
        console.log('📐 デフォルトサイズを使用: 800 x 600');
      }
      
      // 印刷用キャンバスを作成
      const printCanvas = document.createElement('canvas');
      const printCtx = printCanvas.getContext('2d');
      
      printCanvas.width = canvasWidth;
      printCanvas.height = canvasHeight;
      
      // 背景を白に設定
      printCtx.fillStyle = 'white';
      printCtx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      console.log('🔄 描画データを0度で背景サイズキャンバスに描画');
      
      // 全WriterIDの描画データを0度で再描画
      let totalStrokes = 0;
      
      Object.keys(this.writerDrawingData).forEach(writerId => {
        const commands = this.writerDrawingData[writerId];
        if (commands && commands.length > 0) {
          commands.forEach(cmd => {
            if (cmd.type === 'start') {
              printCtx.beginPath();
              printCtx.moveTo(cmd.x, cmd.y);
            } else if (cmd.type === 'draw') {
              printCtx.lineWidth = cmd.thickness || 8;
              printCtx.strokeStyle = cmd.color || 'black';
              printCtx.lineTo(cmd.x, cmd.y);
              printCtx.stroke();
              totalStrokes++;
            }
          });
        }
      });
      
      console.log(`✅ 0度描画完了: ${totalStrokes}本のストロークを描画`);
      
      // 描画データが無い場合はdrawCanvasから直接コピー
      if (totalStrokes === 0 && this.drawCanvas) {
        console.log('🔄 描画データが見つからないため、drawCanvasから直接コピーを試行');
        
        printCtx.save();
        printCtx.translate(canvasWidth / 2, canvasHeight / 2);
        printCtx.rotate(Math.PI);
        printCtx.drawImage(this.drawCanvas, -canvasWidth / 2, -canvasHeight / 2);
        printCtx.restore();
      }
      
      // 画像データを生成
      const dataURL = printCanvas.toDataURL('image/png', 1.0);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `sign-generated-${timestamp}.png`;
      
      return {
        dataURL,
        fileName,
        printPath: null // ブラウザ環境では印刷パス不明
      };
      
    } catch (error) {
      console.error('❌ generatePrintImage エラー:', error);
      throw error;
    }
  }

  // ===========================
  // 🔌 PUBLIC DOWNLOAD/PRINT METHODS - パブリックダウンロード・印刷メソッド
  // ===========================

  /**
   * 画像をダウンロード（パブリックメソッド）
   * @param {string} dataURL - 画像データURL
   * @param {string} fileName - ファイル名
   * @returns {string|null} 保存パス
   */
  downloadImage(dataURL, fileName) {
    return this._downloadImage(dataURL, fileName);
  }

  /**
   * 印刷を実行（パブリックメソッド）
   * @param {string} filePath - ファイルパス
   */
  executePrint(filePath) {
    return this._executePrint(filePath);
  }

  // ===========================
  // 🔧 PRIVATE HELPER METHODS - プライベートヘルパー関数
  // ===========================

  /**
   * WriterID別印刷用描画関数（Canvas状態完全分離）
   */
  _drawWriterCommandsForPrint(commands, writerId, printCtx) {
    if (commands.length === 0) return 0;
    
    // 印刷用WriterID別Canvas状態完全分離
    printCtx.save();
    printCtx.beginPath();
    printCtx.setTransform(1, 0, 0, 1, 0, 0);
    printCtx.globalAlpha = 1.0;
    printCtx.shadowBlur = 0;
    printCtx.shadowColor = 'transparent';
    printCtx.globalCompositeOperation = 'source-over';
    printCtx.lineCap = 'round';
    printCtx.lineJoin = 'round';
    
    let strokeCount = 0;
    let currentPath = [];
    
    commands.forEach(cmd => {
      if (cmd.type === 'start') {
        // 前のパスを描画
        if (currentPath.length > 0) {
          strokeCount += this._renderPrintPath(currentPath, printCtx);
        }
        // 新しいパス開始
        currentPath = [cmd];
      } else if (cmd.type === 'draw') {
        currentPath.push(cmd);
      }
    });
    
    // 最後のパスを描画
    if (currentPath.length > 0) {
      strokeCount += this._renderPrintPath(currentPath, printCtx);
    }
    
    printCtx.restore();
    return strokeCount;
  }

  /**
   * 印刷用パス描画
   */
  _renderPrintPath(pathCommands, printCtx) {
    if (pathCommands.length === 0) return 0;
    
    printCtx.beginPath();
    
    for (let i = 0; i < pathCommands.length; i++) {
      const cmd = pathCommands[i];
      
      if (cmd.type === 'start') {
        printCtx.moveTo(cmd.x, cmd.y);
      } else if (cmd.type === 'draw') {
        const thickness = cmd.thickness || 8;
        printCtx.lineWidth = thickness;
        printCtx.strokeStyle = cmd.color || 'black';
        printCtx.lineTo(cmd.x, cmd.y);
      }
    }
    
    printCtx.stroke();
    return 1;
  }

  /**
   * ダウンロードと印刷処理
   */
  _downloadAndPrint(dataURL, fileName) {
    // ダウンロード処理
    const savedPath = this._downloadImage(dataURL, fileName);
    
    // 印刷処理（Node.js環境でのみ実行）
    if (savedPath && typeof require !== 'undefined') {
      console.log(`🖨️ 印刷実行: ${savedPath}`);
      this._executePrint(savedPath);
    } else {
      console.log('⚠️ ブラウザ環境のため印刷はスキップ');
    }
  }

  /**
   * 画像ダウンロード
   */
  _downloadImage(dataURL, fileName) {
    console.log('💾 downloadImage: 画像ダウンロード開始');
    
    if (typeof require !== 'undefined') {
      // Node.js/Electron環境
      return this._downloadInElectron(dataURL, fileName);
    } else {
      // ブラウザ環境
      this._downloadInBrowser(dataURL, fileName);
      return null;
    }
  }

  /**
   * Electron環境でのダウンロード
   */
  _downloadInElectron(dataURL, fileName) {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      // Base64データを抽出
      const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 保存先パスを生成
      const downloadDir = path.join(os.homedir(), 'Downloads');
      const filePath = path.join(downloadDir, fileName);
      
      // ファイル保存
      fs.writeFileSync(filePath, buffer);
      
      console.log(`✅ Electron: 画像保存完了 ${filePath}`);
      return filePath;
      
    } catch (error) {
      console.error('❌ Electronダウンロードエラー:', error);
      return null;
    }
  }

  /**
   * ブラウザ環境でのダウンロード
   */
  _downloadInBrowser(dataURL, fileName) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = fileName;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`✅ ブラウザ: ダウンロード完了 ${fileName}`);
  }

  /**
   * 印刷実行
   */
  _executePrint(filePath) {
    console.log('🖨️ executePrint: 印刷処理開始');
    
    if (typeof require === 'undefined') {
      console.log('⚠️ ブラウザ環境のため印刷をスキップ');
      return;
    }
    
    try {
      const { spawn } = require('child_process');
      const os = require('os');
      
      if (os.platform() === 'win32') {
        // Windows環境
        const printProcess = spawn('mspaint', ['/pt', filePath]);
        console.log('🖨️ Windows: mspaint印刷コマンド実行');
      } else if (os.platform() === 'darwin') {
        // macOS環境
        const printProcess = spawn('lpr', [filePath]);
        console.log('🖨️ macOS: lpr印刷コマンド実行');
      } else {
        // Linux環境
        const printProcess = spawn('lp', [filePath]);
        console.log('🖨️ Linux: lp印刷コマンド実行');
      }
      
      console.log(`✅ 印刷処理開始: ${filePath}`);
      
    } catch (error) {
      console.error('❌ 印刷処理エラー:', error);
    }
  }
}

// ===========================
// 📤 EXPORTS - エクスポート
// ===========================

// Node.js環境とブラウザ環境の両方に対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrintManager;
} else if (typeof window !== 'undefined') {
  window.PrintManager = PrintManager;
}

// グローバルインスタンス用の初期化関数
function initializePrintManager(dependencies) {
  if (typeof PrintManager !== 'undefined') {
    window.printManager = new PrintManager(dependencies);
    console.log('✅ PrintManager グローバル初期化完了');
    return window.printManager;
  } else {
    console.error('❌ PrintManager クラスが見つかりません');
    return null;
  }
}

// ブラウザ環境での初期化関数をグローバルに公開
if (typeof window !== 'undefined') {
  window.initializePrintManager = initializePrintManager;
}

console.log('✅ rendering-print.js loaded successfully');