# SignSystem - リアルタイム手書きサインシステム

## 概要
WebSocketを使用したリアルタイム手書きサインシステム。複数のユーザーが同時に絵を描き、送信側と受信側で同期表示を行う。

## カウントダウンシステム設計

### 📊 カウントダウンシステムアーキテクチャ

#### 1. システム構成要素

##### 定数管理 (COUNTDOWN_CONSTANTS)
```javascript
const COUNTDOWN_CONSTANTS = {
  CURTAIN_SECONDS: 3,        // 「幕が上るまで」カウントダウン秒数
  SYNC_SECONDS: 5,            // 同期カウントダウン秒数  
  UNIFIED_WAIT_TIME: 3000,    // 統一待機時間（ミリ秒）
  NETWORK_DELAY: 100,         // ネットワーク遅延（ミリ秒）
  SAFETY_MARGIN: 200,         // 安全マージン（ミリ秒）
  MAX_RECEIVER_CURTAIN_REMAINING: 3000, // 受信側「幕が上るまで」最大残り時間
  TIMEOUT_DURATION: 5000      // タイムアウト時間（ミリ秒）
};
```

#### 2. 主要関数群

##### DOM要素アクセス統一化
- **`getCountdownElements()`**: すべてのカウントダウン関連DOM要素を一元管理
  - curtainCountdown: 「幕が上るまで」表示要素
  - syncCountdown: 同期カウントダウン表示要素
  - countdownTimer: タイマー表示要素
  - curtainClosedDisplay: 「幕が閉じています」表示要素

##### 汎用カウントダウン実装
- **`createCountdownNew(options)`**: 統一されたカウントダウン実装
  ```javascript
  options = {
    element,        // 表示DOM要素
    seconds,        // カウントダウン秒数
    onTick,        // 毎秒実行されるコールバック
    onComplete,    // 完了時コールバック
    logPrefix,     // ログ出力時のプレフィックス
    showElement,   // 要素を表示するか
    hideOnComplete // 完了時に要素を非表示にするか
  }
  ```

##### 時間計算ロジック
- **`calculateCountdownTime()`**: 動的なカウントダウン時間計算
  - 背景タイプ（通常/動画）による計算分岐
  - 開発モードと本番モードの設定値切り替え
  - アニメーション待機時間の考慮

#### 3. カウントダウンの種類と動作フロー

##### 3.1 「幕が上るまで」カウントダウン（3秒）
**対象**: 送信側・受信側の全ユーザー

**動作フロー**:
1. **スタートボタンを押した送信側**:
   - 即座に3秒カウントダウン開始
   - `canvas-background.js`の`showCurtainCountdown()`を実行
   
2. **スタートボタンを押していない送信側**:
   - WebSocketで`curtain-countdown`メッセージ受信
   - `canvas-background.js`の`showSenderCurtainCountdown()`を実行
   
3. **受信側**:
   - WebSocketで`curtain-countdown`メッセージ受信
   - `startReceiverCurtainCountdown()`を実行
   - 統一実装`createCountdownNew()`を使用

##### 3.2 同期カウントダウン（5秒）
**対象**: 全ユーザー（送信側・受信側）

**動作フロー**:
1. **タイミング制御**:
   - 「幕が上るまで」カウントダウン終了を待機
   - `waitForCurtainEndThenStartCountdown()`で制御
   
2. **送信側**:
   - `canvas-background.js`で5秒カウントダウン表示
   - 送信ボタン押下者は特別な処理
   
3. **受信側**:
   - `startReceiverSyncCountdown()`を実行
   - 「幕が閉じています」表示を一時的に非表示
   - カウントダウン終了後に再表示

#### 4. ユーザー種別による動作の違い

| ユーザー種別 | 幕カウントダウン | 同期カウントダウン | 特殊処理 |
|------------|----------------|-----------------|---------|
| スタートボタン押下者（送信側） | 即座に開始 | 幕終了後に開始 | アニメーション制御 |
| その他の送信側 | WebSocket受信後 | 幕終了後に開始 | - |
| 受信側 | WebSocket受信後 | 幕終了後に開始 | 「幕が閉じています」表示制御 |

#### 5. WebSocketメッセージフロー

```
[スタートボタン押下]
    ↓
{type: 'draw', action: 'curtain-countdown', countdown: 3}
    ↓ (全クライアントへブロードキャスト)
[各クライアントでカウントダウン開始]
    ↓ (3秒後)
{type: 'draw', action: 'five-second-countdown', countdown: 5}
    ↓ (全クライアントへブロードキャスト)
[同期カウントダウン開始]
    ↓ (5秒後)
[アニメーション開始]
```

#### 6. クロスファイル依存関係

- **remotesign.html**: 受信側のカウントダウン実装
- **canvas-background.js**: 送信側のカウントダウン実装
- **video-player.html**: 動画プレーヤー側のカウントダウン表示

両ファイルに共通関数を実装:
- `getCountdownElements()`
- `createCountdownNew()`

#### 7. リファクタリング履歴

**2025年9月5日実施**:
- ✅ ハードコード値を`COUNTDOWN_CONSTANTS`に統一
- ✅ DOM要素アクセスを`getCountdownElements()`に統一
- ✅ カウントダウン実装を`createCountdownNew()`に統一
- ✅ 古い実装の削除（5つの未使用関数を削除）
- ✅ セクション別にコード整理

#### 8. デバッグ用ログプレフィックス

| プレフィックス | 意味 | 使用場所 |
|------------|-----|---------|
| 🎭 | 幕カウントダウン関連 | curtain countdown |
| ⏱️ | 同期カウントダウン関連 | sync countdown |
| 📊 | 時間計算・統計 | calculation |
| 📡 | WebSocket通信 | network |
| ✅ | 成功 | success |
| ❌ | エラー | error |

#### 9. 今後の改善点

- [ ] カウントダウン音声の追加
- [ ] カウントダウンアニメーションの強化
- [ ] ネットワーク遅延の自動補正
- [ ] カウントダウンのカスタマイズ設定

---

## 設定値管理システム

### 📋 APP_SETTINGS 統一設定オブジェクト（2025年9月5日実装）

#### 概要
散在していたグローバル設定値を`APP_SETTINGS`オブジェクトに統一化し、保守性と一貫性を向上。

#### 設定構造
```javascript
const APP_SETTINGS = {
  // アニメーション設定
  animationStartWaitTime: 0.1,  // アニメーション開始待機時間（秒）
  rotationWaitTime: 1.0,         // 回転後待機時間（秒）
  currentVideoPattern: 2,        // 背景5動画パターン（1:回転, 2:フェード）
  
  // 印刷設定
  printDelayTime: 5.0,          // 印刷遅延時間（秒）
  
  // 描画設定
  currentPenThickness: 6,       // 現在のペンの太さ
  currentPenColor: 'black',     // 現在のペンの色
  
  // 状態管理
  hasSentData: false            // 送信済みフラグ
};
```

#### 移行状況
- ✅ `remotesign.html`内のすべての設定値参照を`APP_SETTINGS`経由に更新
- ⚠️ 後方互換性のため、従来の変数名も一時的に維持（段階的削除予定）
- 📝 今後、他ファイル（`settings.js`, `dev-tools.js`等）も統一予定

## WebSocketメッセージ処理システム

### 📡 MESSAGE_HANDLERS メッセージハンドラーマップ（2025年9月5日実装）

#### 概要
WebSocketメッセージ処理をハンドラーマップで整理し、拡張性と保守性を向上。

#### ハンドラー構造
```javascript
const MESSAGE_HANDLERS = {
  'curtain-countdown': function(data) {
    // 「幕が上るまで」カウントダウン処理
  },
  'five-second-countdown': function(data) {
    // 5秒同期カウントダウン処理
  },
  'global-countdown-start': function(data) {
    // グローバルカウントダウン処理
  }
};
```

#### 処理フロー
1. `socket.onmessage`でメッセージ受信
2. `processMessage(data)`で処理振り分け
3. `data.type === 'draw' && data.action`をチェック
4. `MESSAGE_HANDLERS[data.action]`で対応ハンドラー実行

#### メリット
- ✅ メッセージタイプごとの処理が明確に分離
- ✅ 新規メッセージタイプの追加が容易
- ✅ 重複コードの削減
- ✅ テスタビリティの向上

## Writer管理システム

### 👤 WriterManager クラス（2025年9月5日実装）

#### 概要
WriterID関連の機能を`WriterManager`クラスに統合し、管理を一元化。

#### クラス構造
```javascript
class WriterManager {
  constructor() {
    this.myWriterId = null;           // 自分のWriterID
    this.drawingStates = {};          // WriterID別の描画状態
    this.activeWriters = new Set();   // アクティブなWriter一覧
  }
}
```

#### 主要メソッド

| メソッド | 説明 | 使用例 |
|---------|------|--------|
| `setMyWriterId(id)` | 自分のWriterIDを設定 | `writerManager.setMyWriterId('writer123')` |
| `getMyWriterId()` | 自分のWriterIDを取得 | `const id = writerManager.getMyWriterId()` |
| `isMyMessage(writerId)` | 自分のメッセージか判定 | `if (writerManager.isMyMessage(data.writerId))` |
| `getDrawingState(writerId)` | 描画状態を取得 | `const state = writerManager.getDrawingState(id)` |
| `updateDrawingState(writerId, state)` | 描画状態を更新 | `writerManager.updateDrawingState(id, {isDrawing: true})` |
| `addActiveWriter(writerId)` | アクティブWriterを追加 | `writerManager.addActiveWriter(id)` |
| `removeActiveWriter(writerId)` | アクティブWriterを削除 | `writerManager.removeActiveWriter(id)` |
| `clearAll()` | すべてクリア | `writerManager.clearAll()` |

#### 描画状態の構造
```javascript
{
  isDrawing: false,      // 描画中かどうか
  lastX: null,          // 最後のX座標
  lastY: null,          // 最後のY座標
  lastTimestamp: null   // 最後のタイムスタンプ
}
```

#### メリット
- ✅ Writer関連ロジックの集約化
- ✅ 状態管理の一元化
- ✅ メモリ管理の改善
- ✅ デバッグの容易化
- ⚠️ 後方互換性のため、一部グローバル変数も維持（段階的削除予定）

## DOM要素キャッシュシステム

### 🏗️ DOMCache クラス（2025年9月5日実装）

#### 概要
DOM要素アクセスを最適化するキャッシュシステム。頻繁にアクセスされる要素をメモリに保持し、パフォーマンスを向上。

#### クラス構造
```javascript
class DOMCache {
  constructor() {
    this.cache = new Map();        // DOM要素のキャッシュ
    this.contextCache = new Map(); // Canvas contextのキャッシュ
  }
}
```

#### 主要メソッド

| メソッド | 説明 | 使用例 |
|---------|------|--------|
| `getElementById(id)` | 要素をキャッシュして取得 | `domCache.getElementById('drawCanvas')` |
| `getContext(canvasId, type)` | Canvas contextをキャッシュ取得 | `domCache.getContext('drawCanvas', '2d')` |
| `getElements(ids)` | 複数要素を一度に取得 | `domCache.getElements(['canvas1', 'canvas2'])` |
| `clearCache(id)` | 特定要素のキャッシュクリア | `domCache.clearCache('drawCanvas')` |
| `clearAll()` | 全キャッシュクリア | `domCache.clearAll()` |

#### パフォーマンス改善
- ✅ DOM要素の再取得コストを削減
- ✅ Canvas context取得の最適化
- ✅ バッチ取得による効率化

#### 使用例
```javascript
// 単一要素の取得
const canvas = domCache.getElementById('drawCanvas');

// Canvas contextの取得
const ctx = domCache.getContext('drawCanvas', '2d');

// 複数要素の一括取得
const elements = domCache.getElements([
  'curtainCountdown',
  'syncCountdown',
  'countdownTimer'
]);
```

## リファクタリング履歴サマリー

### 2025年9月5日 実施分

#### 📊 段階的リファクタリング完了項目

| Stage | 実施内容 | 作成物 | 状態 |
|-------|---------|--------|------|
| Stage 1 | 設定値管理の統一化 | `APP_SETTINGS` | ✅ 完了 |
| Stage 2 | WebSocketメッセージ処理の整理 | `MESSAGE_HANDLERS` | ✅ 完了 |
| Stage 3 | Writer機能の統合 | `WriterManager` | ✅ 完了 |
| Stage 4 | DOM要素アクセスの最適化 | `DOMCache` | ✅ 完了 |

#### 主な改善点
- **コードの整理**: 散在していた機能を論理的にグループ化
- **保守性向上**: クラス化により責務を明確化
- **パフォーマンス改善**: キャッシュ機構によるアクセス最適化
- **拡張性向上**: 新機能追加が容易な構造に改善
- **後方互換性**: 段階的移行のため一部旧コードも維持

## リファクタリング履歴

### Phase 1 完了 (2025年)
- カウントダウンシステムの統一化と同期修正
- `COUNTDOWN_CONSTANTS` による設定値統一管理
- `getCountdownElements()` と `createCountdownNew()` による汎用実装
- クロスファイル依存性解決とコード重複除去

### Phase 2 完了 (2025年)
- **renderer.js (8845行) を6つのファイルに分割**
  - `rendering-core.js` - コア描画機能、Canvas管理、設定値統一管理
  - `rendering-video.js` - 動画・音楽処理、動画ウィンドウ管理、SwitchBot連携  
  - `rendering-effects.js` - エフェクト処理（ハート、星、妖精の粉、扉演出、回転アニメーション）
  - `rendering-writer.js` - Writer管理、描画データ管理、滑らかな曲線描画、座標変換
  - `rendering-utils.js` - ユーティリティ関数（色変換、座標変換、イージング、Canvas操作）
  - `rendering-print.js` - 印刷・ダウンロード処理、データ統合、Canvas出力
- **管理クラス作成**
  - `CanvasManager` - Canvas状態管理とライフサイクル管理
  - `EffectManager` - エフェクト状態管理とアクティブエフェクト追跡
  - `RenderingWriterManager` - Writer状態管理と複数Writer対応
- **後方互換性維持**
  - 既存の関数名とグローバル変数を維持
  - 段階的移行方式で既存コードとの互換性保持
  - レガシー互換関数による透明な移行

## ファイル構成と機能マッピング

### 📁 プロジェクト構造

```
signSystem/
├── 📄 メインHTML
│   ├── remotesign.html         # メインアプリケーション（送信側/受信側）
│   ├── index.html              # エントリーポイント
│   ├── video-player.html       # ビデオプレーヤー（Electron用）
│   ├── devtool-controller.html # 開発ツールコントローラー
│   └── debug_position.html     # デバッグ用位置確認ツール
│
├── 🎨 描画・レンダリング
│   ├── canvas-background.js    # 背景画像・動画処理、送信側カウントダウン
│   ├── drawing-engine.js       # 描画エンジン・筆記処理
│   ├── drawing-lines.js        # 線描画・パス管理
│   ├── renderer.js            # メインレンダリング処理
│   └── renderer_new.js        # 新レンダリング実装（テスト用）
│
├── 🌐 通信・WebSocket
│   ├── websocket.js           # WebSocket通信処理、メッセージ送受信
│   └── video-sender.js        # ビデオ通信処理
│
├── 🎭 エフェクト・演出
│   ├── effects.js             # 視覚エフェクト（花火、ハート等）
│   ├── special-effects.js     # 特殊エフェクト処理
│   └── audio-music.js         # 音楽・音声処理
│
├── ⚙️ 設定・制御
│   ├── settings.js            # アプリケーション設定管理
│   ├── dev-tools.js           # 開発者ツール・デバッグ機能
│   ├── ui-controls.js         # UI制御・ボタン管理
│   └── event-handlers.js      # イベントハンドラー集約
│
├── 💾 データ処理
│   ├── print-save.js          # 印刷・保存機能
│   └── utils.js               # ユーティリティ関数
│
├── 🖥️ Electron関連
│   ├── main.js                # Electronメインプロセス
│   └── package.json           # Node.js依存関係
│
└── 📚 ドキュメント
    └── README.md              # このファイル

```

### 🔧 主要機能と実装ファイルの対応表

| 機能カテゴリ | 機能 | 実装ファイル | 主要関数/クラス |
|------------|------|------------|---------------|
| **カウントダウン** | | | |
| | 幕カウントダウン（送信側） | canvas-background.js | `showCurtainCountdown()`, `showSenderCurtainCountdown()` |
| | 幕カウントダウン（受信側） | remotesign.html | `startReceiverCurtainCountdown()` |
| | 同期カウントダウン | remotesign.html | `startReceiverSyncCountdown()` |
| | 統一カウントダウン実装 | remotesign.html, canvas-background.js | `createCountdownNew()` |
| **描画処理** | | | |
| | キャンバス描画 | drawing-engine.js | `drawOnCanvas()`, `sendDrawingData()` |
| | 線の描画 | drawing-lines.js | `drawContinuousLineForWriter()` |
| | 背景画像処理 | canvas-background.js | `drawBackgroundImage()`, `getBackgroundArea()` |
| | レンダリング | renderer.js | `removeDrawWriterCommandsReceiver()` |
| **WebSocket通信** | | | |
| | 接続管理 | websocket.js | `connectWebSocket()`, `requestWriterId()` |
| | メッセージ処理 | remotesign.html | `MESSAGE_HANDLERS`, `processMessage()` |
| | Writer管理 | remotesign.html | `WriterManager` クラス |
| **エフェクト** | | | |
| | 花火エフェクト | effects.js | `startFireworks()` |
| | ハートエフェクト | special-effects.js | `createHeartEffect()` |
| | 音楽再生 | audio-music.js | `playMusic()`, `stopMusic()` |
| **設定管理** | | | |
| | アプリ設定 | remotesign.html | `APP_SETTINGS` オブジェクト |
| | 開発設定 | settings.js | `updateDevSettings()` |
| | UI制御 | ui-controls.js | `showControls()`, `hideControls()` |
| **印刷・保存** | | | |
| | 印刷処理 | print-save.js | `printDrawing()` |
| | データ保存 | print-save.js | `saveDrawingData()` |
| **DOM管理** | | | |
| | DOM要素キャッシュ | remotesign.html | `DOMCache` クラス |
| | 要素取得 | remotesign.html | `getCountdownElements()` |
| **Electron** | | | |
| | メインプロセス | main.js | `createWindow()`, `createVideoWindow()` |
| | IPC通信 | main.js, video-player.html | `ipcMain`, `ipcRenderer` |

### 📝 各ファイルの詳細説明

#### **remotesign.html**
- **役割**: メインアプリケーションのエントリーポイント
- **主要機能**:
  - 送信側/受信側の判定と切り替え
  - WebSocket通信の確立と管理
  - カウントダウンシステムの制御
  - 描画データの送受信
- **リファクタリング済みクラス**:
  - `DOMCache`: DOM要素キャッシュシステム
  - `WriterManager`: WriterID管理システム
  - `APP_SETTINGS`: 統一設定オブジェクト
  - `MESSAGE_HANDLERS`: WebSocketメッセージハンドラー

#### **canvas-background.js**
- **役割**: 背景処理と送信側カウントダウン
- **主要機能**:
  - 背景画像の描画と管理
  - 背景動画（背景5）の制御
  - 送信側カウントダウン表示
  - アニメーション制御

#### **websocket.js**
- **役割**: WebSocket通信処理
- **主要機能**:
  - WebSocket接続の確立
  - WriterID割り当て要求
  - メッセージ送受信
  - 接続状態管理

#### **drawing-engine.js**
- **役割**: 描画エンジン
- **主要機能**:
  - タッチ/マウスイベント処理
  - 描画コマンド生成
  - 描画データの送信
  - ペン設定（色、太さ）

#### **renderer.js**
- **役割**: レンダリング処理
- **主要機能**:
  - 受信した描画データの再現
  - 複数Writerの描画管理
  - 印刷用レンダリング
  - ダウンロード用画像生成

#### **effects.js / special-effects.js**
- **役割**: 視覚エフェクト
- **主要機能**:
  - 花火アニメーション
  - ハートエフェクト
  - その他演出効果

#### **main.js**
- **役割**: Electronメインプロセス
- **主要機能**:
  - アプリケーションウィンドウ作成
  - ビデオウィンドウ管理
  - IPC通信処理
  - 印刷処理

### 🔍 機能を探す際の参考

| 探したい機能 | 確認すべきファイル |
|------------|-----------------|
| カウントダウン関連 | remotesign.html, canvas-background.js |
| 描画・レンダリング | drawing-engine.js, renderer.js |
| WebSocket通信 | websocket.js, remotesign.html (MESSAGE_HANDLERS) |
| Writer管理 | remotesign.html (WriterManager) |
| 設定値 | remotesign.html (APP_SETTINGS), settings.js |
| エフェクト | effects.js, special-effects.js |
| 印刷機能 | print-save.js, main.js |
| DOM操作 | remotesign.html (DOMCache) |

## その他のシステムコンポーネント
（今後追加予定）

## 開発環境セットアップ
（今後追加予定）

## トラブルシューティング
（今後追加予定）