// utils.js - ユーティリティ・計算関連の機能を分離
// 元ファイル: remotesign.html
// 分離日: 2025-08-20

// ==========================================
// 色変換ユーティリティ関数群
// ==========================================

// 🎨 16進数カラーをRGBに変換
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// 🎨 RGBを16進数カラーに変換
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
}

// ==========================================
// アニメーション・補間計算関数群
// ==========================================

// 📈 イージング関数（滑らかな変化のため）
function easeInOutSine(x) {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

// 🎨 2つの色の間を補間する（イージング適用）
function interpolateColor(color1, color2, factor) {
  // イージング関数を適用してより滑らかな変化
  const easedFactor = easeInOutSine(factor);
  
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const r = rgb1.r + easedFactor * (rgb2.r - rgb1.r);
  const g = rgb1.g + easedFactor * (rgb2.g - rgb1.g);
  const b = rgb1.b + easedFactor * (rgb2.b - rgb1.b);
  
  return rgbToHex(r, g, b);
}

// ==========================================
// デバッグ用：ファイルが正しく読み込まれたことを確認
// ==========================================
console.log('✅ utils.js loaded successfully');