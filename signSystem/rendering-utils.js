// rendering-utils.js
// ユーティリティ関数群 - renderer.jsから分離
// 作成日: 2025年09月06日

// ===========================
// 🛠️ RENDERING UTILITIES - レンダリングユーティリティ関数群
// ===========================

/**
 * RenderingUtils クラス
 * 純粋関数として実装された各種ユーティリティを管理
 */
class RenderingUtils {
  
  // ===========================
  // 🎨 COLOR UTILITIES - 色処理ユーティリティ
  // ===========================

  /**
   * HEXカラーをRGBオブジェクトに変換
   * @param {string} hex - HEXカラー文字列 (#RRGGBB形式)
   * @returns {Object} {r, g, b} オブジェクト
   */
  static hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  /**
   * RGBをHEXカラーに変換
   * @param {number} r - 赤成分 (0-255)
   * @param {number} g - 緑成分 (0-255)
   * @param {number} b - 青成分 (0-255)
   * @returns {string} HEXカラー文字列
   */
  static rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
  }

  /**
   * 2つの色の間を補間
   * @param {string} color1 - 開始色 (HEX)
   * @param {string} color2 - 終了色 (HEX)
   * @param {number} factor - 補間係数 (0.0-1.0)
   * @returns {string} 補間された色 (HEX)
   */
  static interpolateColor(color1, color2, factor) {
    // イージング関数を適用してより滑らかな変化
    const easedFactor = RenderingUtils.easeInOutSine(factor);
    
    const rgb1 = RenderingUtils.hexToRgb(color1);
    const rgb2 = RenderingUtils.hexToRgb(color2);
    
    const r = rgb1.r + easedFactor * (rgb2.r - rgb1.r);
    const g = rgb1.g + easedFactor * (rgb2.g - rgb1.g);
    const b = rgb1.b + easedFactor * (rgb2.b - rgb1.b);
    
    return RenderingUtils.rgbToHex(r, g, b);
  }

  /**
   * ネオンカラーをインデックスから生成
   * @param {number} neonIndex - ネオンインデックス
   * @returns {string} ネオンカラー (HEX)
   */
  static getNeonColorFromIndex(neonIndex) {
    const colors = [
      '#ff0000', '#ff4000', '#ff8000', '#ffb000', '#ffff00', '#b0ff00',
      '#80ff00', '#40ff00', '#00ff00', '#00ff40', '#00ff80', '#00ffb0',
      '#00ffff', '#00b0ff', '#0080ff', '#0040ff', '#0000ff', '#4000ff',
      '#8000ff', '#b000ff', '#ff00ff', '#ff00b0', '#ff0080', '#ff0040'
    ];
    
    const position = (neonIndex % colors.length);
    const colorIndex1 = Math.floor(position);
    const colorIndex2 = (colorIndex1 + 1) % colors.length;
    const factor = position - colorIndex1;
    
    const color1 = colors[colorIndex1];
    const color2 = colors[colorIndex2];
    return RenderingUtils.interpolateColor(color1, color2, factor);
  }

  // ===========================
  // 📐 COORDINATE UTILITIES - 座標変換ユーティリティ
  // ===========================

  /**
   * アスペクト比を保持した座標変換
   * @param {number} x - X座標
   * @param {number} y - Y座標
   * @param {Object} senderSize - 送信側サイズ {width, height}
   * @param {Object} drawingAreaSize - 描画エリアサイズ {width, height}
   * @returns {Object} {x, y, actualWidth, actualHeight} 変換結果
   */
  static transformCoordinatesWithAspectRatio(x, y, senderSize, drawingAreaSize) {
    const senderAspect = senderSize.width / senderSize.height;
    const drawingAreaAspect = drawingAreaSize.width / drawingAreaSize.height;
    
    let actualDrawingWidth, actualDrawingHeight, offsetX = 0, offsetY = 0;
    
    if (senderAspect > drawingAreaAspect) {
      // 送信側の方が横長 → 描画エリアの幅に合わせて、高さを調整
      actualDrawingWidth = drawingAreaSize.width;
      actualDrawingHeight = drawingAreaSize.width / senderAspect;
      offsetY = (drawingAreaSize.height - actualDrawingHeight) / 2;
    } else {
      // 送信側の方が縦長 → 描画エリアの高さに合わせて、幅を調整
      actualDrawingHeight = drawingAreaSize.height;
      actualDrawingWidth = drawingAreaSize.height * senderAspect;
      offsetX = (drawingAreaSize.width - actualDrawingWidth) / 2;
    }
    
    // 座標変換: 送信側の座標を実際の描画サイズに変換してからオフセットを追加
    const scaledX = (x / senderSize.width) * actualDrawingWidth + offsetX;
    const scaledY = (y / senderSize.height) * actualDrawingHeight + offsetY;
    
    return { 
      x: scaledX, 
      y: scaledY, 
      actualWidth: actualDrawingWidth, 
      actualHeight: actualDrawingHeight 
    };
  }

  // ===========================
  // 🔄 ANIMATION UTILITIES - アニメーションユーティリティ
  // ===========================

  /**
   * イージング関数（滑らかな変化のため）
   * @param {number} x - 進行度 (0.0-1.0)
   * @returns {number} イージング済み進行度
   */
  static easeInOutSine(x) {
    return -(Math.cos(Math.PI * x) - 1) / 2;
  }

  // ===========================
  // 🔧 MATH UTILITIES - 数学ユーティリティ
  // ===========================

  /**
   * 値を範囲内にクランプ
   * @param {number} value - 値
   * @param {number} min - 最小値
   * @param {number} max - 最大値
   * @returns {number} クランプ済み値
   */
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * 2点間の距離を計算
   * @param {number} x1 - 点1のX座標
   * @param {number} y1 - 点1のY座標
   * @param {number} x2 - 点2のX座標
   * @param {number} y2 - 点2のY座標
   * @returns {number} 距離
   */
  static distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 線形補間
   * @param {number} start - 開始値
   * @param {number} end - 終了値
   * @param {number} t - 補間係数 (0.0-1.0)
   * @returns {number} 補間値
   */
  static lerp(start, end, t) {
    return start + (end - start) * t;
  }

  /**
   * 角度の正規化（0-360度）
   * @param {number} angle - 角度
   * @returns {number} 正規化された角度
   */
  static normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  /**
   * 度数法から弧度法に変換
   * @param {number} degrees - 度
   * @returns {number} ラジアン
   */
  static degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * 弧度法から度数法に変換
   * @param {number} radians - ラジアン
   * @returns {number} 度
   */
  static radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
  }
}

// ===========================
// 🔗 LEGACY COMPATIBILITY - 後方互換性サポート
// ===========================

// 既存のグローバル関数として公開（段階的移行用）
function hexToRgb(hex) {
  return RenderingUtils.hexToRgb(hex);
}

function rgbToHex(r, g, b) {
  return RenderingUtils.rgbToHex(r, g, b);
}

function easeInOutSine(x) {
  return RenderingUtils.easeInOutSine(x);
}

function transformCoordinatesWithAspectRatio(x, y, senderSize, drawingAreaSize) {
  return RenderingUtils.transformCoordinatesWithAspectRatio(x, y, senderSize, drawingAreaSize);
}

function interpolateColor(color1, color2, factor) {
  return RenderingUtils.interpolateColor(color1, color2, factor);
}

function getNeonColorFromIndex(neonIndex) {
  return RenderingUtils.getNeonColorFromIndex(neonIndex);
}

// ===========================
// 📤 EXPORTS - エクスポート
// ===========================

// Node.js環境とブラウザ環境の両方に対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RenderingUtils;
} else if (typeof window !== 'undefined') {
  window.RenderingUtils = RenderingUtils;
}

console.log('✅ rendering-utils.js loaded successfully');