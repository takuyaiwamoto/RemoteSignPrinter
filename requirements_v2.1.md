# リモート署名・描画システム 要件定義書 v2.1

## 1. 機能要件

### 1.1 基本機能
- **リアルタイム描画同期**: 送信側での描画を受信側にリアルタイムで表示
- **クロスネットワーク通信**: 異なるネットワーク間での動作をサポート
- **自動印刷機能**: 描画完了時の自動印刷処理（透明背景、赤色半透明描画）
- **マルチモニター対応**: メインモニターでの表示

### 1.2 送信側機能（remotesign.html）

#### 1.2.1 描画機能
- **マウス・タッチ描画**: 自由描画機能
- **線設定**: 太さ4px、黒色固定
- **キャンバスサイズ**: A4（842×595px）、ポストカード（A4の60%）

#### 1.2.2 背景選択機能 ⭐ENHANCED
- **動的背景参照**: フォルダ内の画像ファイルを自動検索・表示
- **対応形式**: PNG, JPG, JPEG, GIF, BMP
- **背景選択UI**: ドロップダウンまたは画像サムネイル一覧
- **自動フィット機能**: キャンバスサイズに合わせた自動スケーリング
- **アスペクト比保持**: 画像比率を維持しながらフィット
- **白背景オプション**: 背景なしモード継続対応

#### 1.2.3 画像自動調整機能 ⭐NEW
- **自動リサイズ**: キャンバスサイズに応じた画像の自動調整
- **フィットモード**:
  - `contain`: アスペクト比保持、全体表示
  - `cover`: アスペクト比保持、領域フル活用
  - `stretch`: キャンバスサイズに完全一致（比率無視）
- **中央配置**: 自動センタリング
- **背景色指定**: 余白部分の色設定（デフォルト: 透明/白）

#### 1.2.4 用紙・ビデオ設定
- **用紙サイズ**: A4、ポストカード選択
- **ビデオ再生**: signVideo.mp4（100%、90%、80%サイズ、180度回転）

#### 1.2.5 開発者ツール機能
- **Dev Toolパネル**: 折りたたみ式開発者設定パネル
- **キャンバススケール調整**: 0.5倍〜2.0倍（0.1刻み）
- **回転待機時間調整**: 1秒〜10秒（0.5秒刻み）
- **背景フィットモード選択**: contain/cover/stretch切り替え ⭐NEW
- **リアルタイム設定送信**: 受信側への即座反映

#### 1.2.6 制御機能
- **送信・印刷**: 描画データ送信と印刷指示
- **カウントダウン**: A4（11秒）、ポストカード（8秒）
- **キャンバスクリア**: 描画データリセット

### 1.3 受信側機能（Electronアプリ）

#### 1.3.1 表示機能
- **180度回転表示**: 送信側描画の回転表示
- **座標オフセット**: 左に750px移動表示
- **動的スケーリング**: Dev Tool設定による可変サイズ

#### 1.3.2 背景・同期機能 ⭐ENHANCED
- **背景同期**: 送信側背景の180度回転表示
- **動的背景読み込み**: フォルダ内画像の自動取得・表示 ⭐NEW
- **自動フィット適用**: 送信側と同じフィット設定を適用 ⭐NEW
- **用紙サイズ対応**: A4（0.92倍/0.88倍）、ポストカード（0.9倍）サイズ調整

#### 1.3.3 印刷機能
- **自動印刷**: Windows mspaint経由
- **プリンター対応**: Brother MFC-J6983CDW
- **印刷形式**: 透明背景、赤色半透明線（rgba(255,0,0,0.5)）
- **座標同期**: 表示と同じ位置で印刷

#### 1.3.4 アニメーション機能
- **回転アニメーション**: 印刷後180度回転
- **移動アニメーション**: 下方向スライド
- **可変待機時間**: Dev Tool設定による調整可能
- **音声機能**: 削除済み

#### 1.3.5 開発者機能
- **設定受信**: WebSocket経由でリアルタイム設定更新
- **キャンバス動的リサイズ**: スケール設定の即座反映
- **アニメーション制御**: 待機時間の動的変更
- **背景フィット同期**: フィットモード設定の受信・適用 ⭐NEW

### 1.4 座標変換・位置調整
- **表示変換**: 180度回転 + 750px左オフセット
- **印刷変換**: 表示と同一変換
- **動的スケーリング**: 基本倍率×Dev Tool設定倍率

## 2. 技術仕様

### 2.1 アーキテクチャ
- **フロントエンド**: HTML5 + JavaScript（送信側）
- **デスクトップアプリ**: Electron.js（受信側）  
- **通信**: WebSocket
- **プラットフォーム**: Windows対応

### 2.2 WebSocketサーバー接続

#### 2.2.1 サーバー情報
```javascript
const WEBSOCKET_URL = "wss://realtime-sign-server.onrender.com";
```

#### 2.2.2 接続方法
```javascript
// 基本接続
let socket = new WebSocket("wss://realtime-sign-server.onrender.com");

// 接続イベント
socket.onopen = () => console.log("✅ WebSocket接続完了");
socket.onerror = e => console.error("❌ WebSocketエラー", e);
socket.onclose = () => console.warn("⚠️ WebSocket切断");

// メッセージ受信
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleMessage(data);
};

// メッセージ送信
socket.send(JSON.stringify({
  type: "messageType",
  data: "messageData"
}));
```

#### 2.2.3 サーバー仕様
- **プロトコル**: WSS（WebSocket Secure）
- **ホスト**: realtime-sign-server.onrender.com
- **ポート**: 443（HTTPS標準）
- **同時接続**: 複数クライアント対応
- **データ形式**: JSON

### 2.3 通信プロトコル

#### 2.3.1 メッセージ形式
```javascript
// 描画データ
{ type: "start", x: number, y: number }
{ type: "draw", x: number, y: number }
{ type: "clear" }

// 背景・設定 ⭐ENHANCED
{ 
  type: "background", 
  src: string,              // ファイルパスまたは"white"
  fitMode: string,          // "contain" | "cover" | "stretch"
  filename: string          // ファイル名（表示用）
}
{ type: "paperSize", size: string }
{ type: "print", paperSize: string }

// ビデオ
{ type: "playVideo", size: number }
{ type: "videoSize", size: number }

// 開発者ツール ⭐ENHANCED
{ 
  type: "devSettings", 
  canvasScale: number,      // 0.5-2.0
  rotationWaitTime: number, // 1.0-10.0
  backgroundFitMode: string // "contain" | "cover" | "stretch" ⭐NEW
}

// 背景一覧取得 ⭐NEW
{ type: "getBackgroundList" }
{ 
  type: "backgroundList", 
  images: [
    { filename: string, path: string, size: number },
    ...
  ]
}
```

### 2.4 技術スタック

#### 2.4.1 フロントエンド（送信側） ⭐ENHANCED
```html
<!-- 主要技術 -->
- HTML5 Canvas API
- WebSocket API  
- Touch Events
- Range Input Controls
- File System Access (画像読み込み) ⭐NEW
- CSS3 Flexbox
- CSS object-fit property ⭐NEW
```

```javascript
// 主要機能
- Real-time drawing
- WebSocket communication
- Dynamic UI controls
- Settings management
- Dynamic image loading ⭐NEW
- Auto-fit functionality ⭐NEW
```

#### 2.4.2 背景画像処理システム ⭐NEW
```javascript
// ファイル検索・読み込み
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'];
const backgroundFolder = './backgrounds/'; // デフォルトフォルダ

// 画像フィット処理
function fitImageToCanvas(image, canvas, fitMode) {
  const ctx = canvas.getContext('2d');
  let drawWidth, drawHeight, offsetX, offsetY;
  
  switch(fitMode) {
    case 'contain':
      // アスペクト比保持、全体表示
      const scale = Math.min(canvas.width/image.width, canvas.height/image.height);
      drawWidth = image.width * scale;
      drawHeight = image.height * scale;
      offsetX = (canvas.width - drawWidth) / 2;
      offsetY = (canvas.height - drawHeight) / 2;
      break;
      
    case 'cover':
      // アスペクト比保持、領域フル活用
      const scale = Math.max(canvas.width/image.width, canvas.height/image.height);
      drawWidth = image.width * scale;
      drawHeight = image.height * scale;
      offsetX = (canvas.width - drawWidth) / 2;
      offsetY = (canvas.height - drawHeight) / 2;
      break;
      
    case 'stretch':
      // キャンバスサイズに完全一致
      drawWidth = canvas.width;
      drawHeight = canvas.height;
      offsetX = 0;
      offsetY = 0;
      break;
  }
  
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

// 動的背景一覧取得
async function loadBackgroundImages() {
  const images = [];
  // フォルダ内画像ファイル検索
  // サムネイル生成
  // UIに反映
  return images;
}
```

#### 2.4.3 Electronアプリ（受信側） ⭐ENHANCED
```json
{
  "dependencies": {
    "electron": "^32.2.6"
  },
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  }
}
```

```javascript
// 主要モジュール
const { app, BrowserWindow, ipcMain } = require("electron");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// 画像処理関連 ⭐NEW
const { glob } = require("glob"); // 画像ファイル検索用
const sharp = require("sharp");   // 画像処理ライブラリ（オプション）
```

#### 2.4.4 印刷システム
```javascript
// Windows印刷API
const printerName = "Brother MFC-J6983CDW";
const printCommand = `mspaint /pt "${filePath}" "${printerName}"`;

// フォールバック
const powerShellCommand = `powershell -Command "Start-Process -FilePath '${filePath}' -Verb PrintTo -ArgumentList '${printerName}' -WindowStyle Hidden"`;
```

#### 2.4.5 座標変換システム ⭐ENHANCED
```javascript
// キャンバス変換
ctx.save();
ctx.translate(canvas.width / 2, canvas.height / 2);
ctx.rotate(Math.PI); // 180度回転
ctx.translate(-canvas.width / 2, -canvas.height / 2);

// 動的スケーリング
const scaledWidth = originalWidth * SCALE_FACTOR * devCanvasScale;
const scaledHeight = originalHeight * SCALE_FACTOR * devCanvasScale;

// 背景画像自動フィット ⭐NEW
function drawBackgroundWithFit(image, canvas, fitMode) {
  // フィットモードに応じた描画処理
  const ctx = canvas.getContext('2d');
  applyImageFit(ctx, image, canvas, fitMode);
}

// 座標オフセット
const offsetX = 750; // 受信側から見て左に移動
```

### 2.5 ファイル構成 ⭐ENHANCED
```
signSystem/
├── main.js              # Electronメインプロセス
├── renderer.js          # 受信側レンダラー（画像処理対応）⭐UPDATE
├── index.html           # 受信側HTML
├── remotesign.html      # 送信側HTML（画像選択UI追加）⭐UPDATE
├── package.json         # 依存関係定義
├── backgrounds/         # 背景画像フォルダ ⭐NEW
│   ├── back3.png       # 既存背景画像1
│   ├── back2.png       # 既存背景画像2
│   ├── custom1.jpg     # カスタム背景1
│   ├── custom2.png     # カスタム背景2
│   └── ...             # その他の背景画像
├── signVideo.mp4       # 再生動画
└── [削除] haisyutu.mp3 # 音声ファイル
```

### 2.6 新機能実装詳細

#### 2.6.1 動的背景選択UI ⭐NEW
```html
<div class="button-group">
  <label>背景:</label>
  <select id="backgroundSelect" onchange="setBackgroundFromSelect()">
    <option value="white">白背景</option>
    <!-- 動的に画像ファイルが追加される -->
  </select>
  <button onclick="refreshBackgroundList()">🔄 更新</button>
</div>

<div class="button-group">
  <label>フィットモード:</label>
  <select id="fitModeSelect" onchange="updateFitMode()">
    <option value="contain">全体表示</option>
    <option value="cover">領域フル活用</option>
    <option value="stretch">引き伸ばし</option>
  </select>
</div>
```

#### 2.6.2 画像自動フィット機能 ⭐NEW
```javascript
// 送信側
let currentFitMode = 'contain';

function setBackgroundWithFit(imagePath, fitMode) {
  const img = new Image();
  img.onload = () => {
    // キャンバスサイズに合わせて自動調整
    drawImageWithFit(img, canvas, fitMode);
    
    // 受信側に送信
    socket.send(JSON.stringify({
      type: "background",
      src: imagePath,
      fitMode: fitMode,
      filename: getFileName(imagePath)
    }));
  };
  img.src = imagePath;
}

// 受信側
function handleBackgroundMessage(data) {
  if (data.src === "white") {
    backgroundImage = null;
    redrawCanvas();
  } else {
    loadImageWithFit(data.src, data.fitMode);
  }
}
```

#### 2.6.3 Dev Tool拡張 ⭐ENHANCED
```html
<div id="devTools" style="display: none; border: 2px solid orange;">
  <h3>開発者ツール</h3>
  <input type="range" id="canvasScale" min="0.5" max="2.0" step="0.1">
  <input type="range" id="rotationWait" min="1" max="10" step="0.5">
  
  <!-- 新機能 -->
  <div class="button-group">
    <label>背景フィットモード:</label>
    <select id="devFitMode">
      <option value="contain">全体表示</option>
      <option value="cover">領域フル活用</option>
      <option value="stretch">引き伸ばし</option>
    </select>
  </div>
  
  <button onclick="sendDevSettings()">設定を受信側に送信</button>
</div>
```

### 2.7 パフォーマンス・互換性 ⭐ENHANCED
- **描画遅延**: 50ms以下
- **設定適用**: リアルタイム（即座反映）
- **画像読み込み**: 非同期処理、プログレス表示 ⭐NEW
- **画像キャッシュ**: ブラウザキャッシュ活用 ⭐NEW
- **フィット処理**: GPU加速対応（可能な場合） ⭐NEW
- **WebSocket**: 自動再接続対応
- **OS**: Windows 10/11
- **ブラウザ**: Chrome/Edge推奨
- **プリンター**: Brother MFC-J6983CDW専用

### 2.8 対応画像形式 ⭐NEW
- **PNG**: 透明度対応、高品質
- **JPEG/JPG**: 高圧縮、写真向け
- **GIF**: アニメーション対応（静止画として処理）
- **BMP**: Windows標準、無圧縮
- **WebP**: 高効率圧縮（ブラウザ対応時）
- **最大ファイルサイズ**: 10MB推奨
- **推奨解像度**: 1920×1080以下

### 2.9 セキュリティ・制約
- **WebSocket**: WSS暗号化通信
- **ファイルアクセス**: Electronのサンドボックス内
- **画像ファイル**: ローカルファイルシステムのみ
- **印刷権限**: Windows管理者権限不要
- **ネットワーク**: ファイアウォール透過

## 3. 新規開発時のサーバー利用方法

### 3.1 既存サーバー接続
```javascript
// 新しいプロジェクトでの接続方法
const socket = new WebSocket("wss://realtime-sign-server.onrender.com");

// 基本的な接続処理
socket.onopen = function() {
    console.log("サーバー接続成功");
    // 初期化メッセージ送信可能
};

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    // メッセージ処理（背景画像含む）
};
```

### 3.2 メッセージ形式の互換性
- 既存システムと同じJSON形式を使用
- 新機能は新しい`type`で拡張（`backgroundList`, `devSettings`拡張）
- 既存機能への影響なし
- 背景画像の`fitMode`はオプション（デフォルト: `contain`）

### 3.3 開発時の注意点
- サーバーは共有リソースのため、テスト時は他システムとの干渉に注意
- メッセージ`type`の重複を避ける
- 大量のメッセージ送信は控える
- 画像ファイルはBase64エンコードではなくパス参照を推奨

## 4. 追加機能アイデア（参考）

### 4.1 高優先度
- **描画履歴・Undo/Redo機能**: Ctrl+Zでの取り消し機能
- **描画エリア境界線表示**: 750pxオフセット後の実際の描画範囲表示
- **プリセット設定管理**: Dev Tool設定の保存・読み込み

### 4.2 中優先度
- **線の太さ・色選択機能**: 現在4px黒固定の拡張
- **背景の回転・反転機能**: 背景画像の向き調整
- **印刷プレビュー機能**: 印刷前の確認表示

### 4.3 低優先度
- **複数ページ対応**: 連続描画・一括印刷
- **描画データの保存・読み込み**: テンプレート機能
- **統計・ログ機能**: 使用状況の把握