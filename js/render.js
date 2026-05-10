// ===== 描画 =====
// キャンバス・ドット絵ヘルパー・各画面のrenderXxx関数を集約。

const gameCanvas    = document.getElementById('c');
const gameCtx       = gameCanvas.getContext('2d');
const overlayCanvas = document.getElementById('ov');
const overlayCtx    = overlayCanvas.getContext('2d');

// ドット絵用オフスクリーンキャンバス（200×150px → PX倍に拡大して描画）
const pixelCanvas = document.createElement('canvas');
pixelCanvas.width  = 200;
pixelCanvas.height = 150;
const pixelCtx = pixelCanvas.getContext('2d');

const PX             = 4;    // ドット絵拡大倍率
const PIXEL_OFFSET_Y = 0;    // 背景PNGがキャンバス全体（800×600）を覆うのでオフセット不要
const UPPER_BELT_Y   = 73;   // 奥レーン（Y=73〜80、8行）
const LOWER_BELT_Y   = 85;   // 手前レーン（Y=85〜92、8行）
const BODY_CENTER_Y  = 119;  // キャラ胴体の中心（背景の上方シフトに合わせて -6）

// プレイ画面の背景PNG（200×150 → ×4倍で 800×600）
const PLAY_BG_IMG = new Image();
let PLAY_BG_LOADED = false;
PLAY_BG_IMG.onload  = () => { PLAY_BG_LOADED = true; };
PLAY_BG_IMG.onerror = () => { PLAY_BG_LOADED = false; };

function preloadPlayBackground() {
  PLAY_BG_IMG.src = 'assets/images/backgrounds/background03.png';
}

// ステージ選択画面の背景PNG
const STAGE_SELECT_BG_IMG = new Image();
let STAGE_SELECT_BG_LOADED = false;
STAGE_SELECT_BG_IMG.onload  = () => { STAGE_SELECT_BG_LOADED = true; };
STAGE_SELECT_BG_IMG.onerror = () => { STAGE_SELECT_BG_LOADED = false; };

// ステージ選択パネルのベース画像（木製パネルなど）
const STAGE_BASE_IMG = new Image();
let STAGE_BASE_LOADED = false;
STAGE_BASE_IMG.onload  = () => { STAGE_BASE_LOADED = true; };
STAGE_BASE_IMG.onerror = () => { STAGE_BASE_LOADED = false; };
STAGE_BASE_IMG.src = 'assets/images/ui/stage_base.png';
trackImage(STAGE_BASE_IMG);

// タイトル画面の全面背景画像
const TITLE_BG_IMG = new Image();
let TITLE_BG_LOADED = false;
TITLE_BG_IMG.onload  = () => { TITLE_BG_LOADED = true; };
TITLE_BG_IMG.onerror = () => { TITLE_BG_LOADED = false; };
TITLE_BG_IMG.src = 'assets/images/backgrounds/title/title.jpg';
trackImage(TITLE_BG_IMG);
let titleStartTime = null;

// プレイ画面用主人公スプライト（年齢別、体・頭のみ。右腕は既存のドット絵描画を維持）
// パスは js/sprite-manifest.js（update-sprites.command で生成）から参照。
// マニフェスト未生成 or 画像なしの場合は drawHead/drawBody のドット絵にフォールバック。

// PNG使用時の右肩オフセット（bcx, bcy 基準・ドット絵座標）。画像に合わせて微調整。
const PLAYER_PNG_SHOULDER_DX = 10;
const PLAYER_PNG_SHOULDER_DY = -8;
const ORE_PLAY_AGES = [20, 30, 40, 50, 60];
const ORE_PLAY_SPRITES = {};
const ORE_PLAY_LOADED  = {};
for (const age of ORE_PLAY_AGES) {
  const path = (typeof SPRITE_MANIFEST !== 'undefined') ? SPRITE_MANIFEST[age] : null;
  if (!path) { ORE_PLAY_LOADED[age] = false; continue; }
  const img = new Image();
  ORE_PLAY_SPRITES[age] = img;
  ORE_PLAY_LOADED[age]  = false;
  img.onload  = () => { ORE_PLAY_LOADED[age] = true; };
  img.onerror = () => { ORE_PLAY_LOADED[age] = false; };
  img.src = path;
}

// 右手スプライト（全ステージ共通、×4倍表示）。なければドット絵の手にフォールバック。
let RIGHT_HAND_IMG = null;
let RIGHT_HAND_IMG_LOADED = false;
{
  const path = (typeof RIGHT_HAND_PATH !== 'undefined') ? RIGHT_HAND_PATH : null;
  if (path) {
    const img = new Image();
    RIGHT_HAND_IMG = img;
    img.onload  = () => { RIGHT_HAND_IMG_LOADED = true; };
    img.onerror = () => { RIGHT_HAND_IMG_LOADED = false; };
    img.src = path;
  }
}

// アイテムスプライト（湯呑み・ガリ皿・ガリ本体、×4倍表示）
const ITEM_IMG = { tea: null, gariplate: null, gari: null };
const ITEM_LOADED = { tea: false, gariplate: false, gari: false };
{
  const itemPaths = {
    tea:       (typeof TEA_PATH       !== 'undefined') ? TEA_PATH       : null,
    gariplate: (typeof GARIPLATE_PATH !== 'undefined') ? GARIPLATE_PATH : null,
    gari:      (typeof GARI_PATH      !== 'undefined') ? GARI_PATH      : null,
  };
  for (const key in itemPaths) {
    const path = itemPaths[key];
    if (!path) continue;
    const img = new Image();
    ITEM_IMG[key] = img;
    img.onload  = () => { ITEM_LOADED[key] = true; };
    img.onerror = () => { ITEM_LOADED[key] = false; };
    img.src = path;
  }
}

// 会計画面の背景PNG
const GAME_END_BG_IMG = new Image();
let GAME_END_BG_LOADED = false;
GAME_END_BG_IMG.onload  = () => { GAME_END_BG_LOADED = true; };
GAME_END_BG_IMG.onerror = () => { GAME_END_BG_LOADED = false; };

function preloadStoryBackground() {
  STAGE_SELECT_BG_IMG.src = 'assets/images/backgrounds/story/stage_select.jpg';
  GAME_END_BG_IMG.src     = 'assets/images/backgrounds/story/game_end.jpg';
  trackImage(STAGE_SELECT_BG_IMG);
  trackImage(GAME_END_BG_IMG);
}

// リザルト画面の背景PNG（複数。表示時にランダム選択）
const RESULT_BG_NAMES = [
  'Gemini_Generated_Image_1neb021neb021neb',
  'Gemini_Generated_Image_7wbajv7wbajv7wba',
  'Gemini_Generated_Image_g0jtmpg0jtmpg0jt',
  'Gemini_Generated_Image_ma1s9wma1s9wma1s',
  'Gemini_Generated_Image_qpxoxyqpxoxyqpxo',
  'Gemini_Generated_Image_xeqqrfxeqqrfxeqq',
];
const RESULT_BG_IMGS = [];
const RESULT_BG_LOADED = [];
function preloadResultBackgrounds() {
  for (let i = 0; i < RESULT_BG_NAMES.length; i++) {
    const img = new Image();
    const idx = i;
    img.onload  = () => { RESULT_BG_LOADED[idx] = true; };
    img.onerror = () => { RESULT_BG_LOADED[idx] = false; };
    img.src = `assets/images/backgrounds/result/${RESULT_BG_NAMES[i]}.jpg`;
    RESULT_BG_IMGS.push(img);
    RESULT_BG_LOADED.push(false);
    trackImage(img);
  }
}

// ステージ番号 → VN背景キー（透過部分に敷くため）
const STAGE_VN_BG = {
  1: 'bg_cheap',
  2: 'bg_medium',
  3: 'bg_fancy',
  4: 'bg_rich',
  5: 'bg_underpass',
};

// ===== ネタPNGスプライト管理 =====
// assets/images/neta/{name}.png をプリロード。読み込めれば手前レーンで優先表示、
// 無ければ既存のドット絵描画にフォールバック。
const NETA_SPRITES = {};
const NETA_SPRITE_LOADED = {};

function preloadNetaSprites() {
  if (typeof NETA_FILE_NAMES === 'undefined') return;
  for (let i = 0; i < NETA_FILE_NAMES.length; i++) {
    const name = NETA_FILE_NAMES[i];
    const img = new Image();
    img.onload  = () => { NETA_SPRITE_LOADED[name] = true; };
    img.onerror = () => { NETA_SPRITE_LOADED[name] = false; };
    img.src = `assets/images/neta/${name}.png`;
    NETA_SPRITES[name] = img;
  }
}

// ===== ドット絵ヘルパー =====
function drawPixel(x, y, w, h, color) {
  pixelCtx.fillStyle = color;
  pixelCtx.fillRect(x | 0, y | 0, w, h);
}

function drawPlate(cx, y, rank, small) {
  const w = small ? 6 : 8, hw = w / 2 | 0;
  if (rank === 5) {
    drawPixel(cx - hw, y,     w, 2, '#111');
    drawPixel(cx - hw, y,     w, 1, '#daa520');
    drawPixel(cx - hw, y,     1, 2, '#daa520');
    drawPixel(cx + hw - 1, y, 1, 2, '#daa520');
  } else {
    drawPixel(cx - hw, y, w, 2, PLATE_COLORS[rank]);
  }
}

function drawNeta(cx, y, neta, small) {
  const nw = small ? 4 : 6, nh = small ? 1 : 2, rh = small ? 1 : 2, hnw = nw / 2 | 0;
  drawPlate(cx, y + nh + rh, neta.rk, small);
  if (neta.gn) { // 軍艦巻き
    drawPixel(cx - hnw - 1, y,      nw + 2, nh + rh, '#1a2e1a');
    drawPixel(cx - hnw,     y + nh, nw,     rh,      '#fff');
    drawPixel(cx - hnw,     y,      nw,     nh,      neta.tc);
  } else {
    drawPixel(cx - hnw, y + nh, nw, rh, '#fff');
    drawPixel(cx - hnw, y,      nw, nh, neta.tc);
  }
}

function drawBelt(y, time, dir) {
  pixelCtx.fillStyle = '#484848';
  pixelCtx.fillRect(0, y, 200, 10);
  const offset = ((time * (dir > 0 ? 20 : -20)) | 0) % 6;
  for (let x = (offset % 6 + 6) % 6 - 6; x < 200; x += 6) {
    drawPixel(x, y + 3, 3, 1, '#3e3e3e');
    drawPixel(x, y + 6, 3, 1, '#3e3e3e');
  }
  drawPixel(0, y,     200, 1, '#777');
  drawPixel(0, y + 9, 200, 1, '#777');
}

function drawHead(cx, cy) {
  const skinDark = '#dba87a', skinLight = '#ecc9a0';
  for (let dy = -9; dy <= 4; dy++) {
    const r2 = 110 - (dy * dy) * 1.1;
    if (r2 < 0) continue;
    const w = Math.floor(Math.sqrt(r2));
    drawPixel(cx - w, cy + dy, w * 2, 1, dy < -5 ? skinLight : skinDark);
  }
  drawPixel(cx - 3,  cy - 8, 2, 2, '#f5dfc0');
  drawPixel(cx - 1,  cy - 9, 1, 1, '#faebd7');
  drawPixel(cx - 12, cy - 1, 3, 5, skinDark);
  drawPixel(cx + 9,  cy - 1, 3, 5, skinDark);
}

function drawBody(cx, cy) {
  drawPixel(cx - 9,  cy,     18, 20, '#444');
  drawPixel(cx - 8,  cy + 1, 16, 18, '#3c3c3c');
  drawPixel(cx - 10, cy + 2,  2,  6, '#444');
  drawPixel(cx + 8,  cy + 2,  2,  6, '#444');
  drawPixel(cx - 3,  cy,      6,  2, '#ddd'); // 襟
}

function drawLeftArm(bodyX, bodyY, targetX, targetY) {
  const sleeve = '#444', skin = '#dba87a';
  const sx = bodyX - 10, sy = bodyY + 4;
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    drawPixel((sx + (targetX - 3 - sx) * t) | 0, (sy + (targetY - 2 - sy) * t) | 0, 3, 3, sleeve);
  }
  drawPixel(targetX - 5, targetY - 4,  3, 6, skin);
  drawPixel(targetX - 6, targetY - 2,  1, 3, '#c49060');
  drawPixel(targetX - 2, targetY - 6,  8, 8, '#e0e0e0');
  drawPixel(targetX - 1, targetY - 7,  6, 1, '#eee');
  drawPixel(targetX - 1, targetY - 5,  6, 5, '#2e7d32');
  drawPixel(targetX + 6, targetY - 4,  2, 3, '#ccc');
}

function drawRightArm(handX, bodyX, bodyY, shoulderDX, shoulderDY, skipHand) {
  const sleeve = '#696a6a', skin = '#dba87a', skinDark = '#c49060';
  const sx = bodyX + (shoulderDX ?? 9), sy = bodyY + (shoulderDY ?? 4), hy = LOWER_BELT_Y + 4;  // 手の中心を下ベルト内（91〜98の中央寄り）
  // 肩→手の距離に応じてスタンプ数を増やし、腕が伸びても隙間ができないように補完
  const adx = handX - sx, ady = hy - sy;
  const dist = Math.sqrt(adx * adx + ady * ady);
  const n = Math.max(10, Math.ceil(dist));   // 1px間隔で配置
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    drawPixel((sx + adx * t) | 0, (sy + ady * t) | 0, 4, 3, sleeve);
  }
  if (!skipHand) {
    drawPixel(handX - 4, hy - 3, 9, 6, skin);
    drawPixel(handX - 4, hy - 2, 1, 4, skinDark);
    drawPixel(handX + 4, hy - 2, 1, 4, skinDark);
    drawPixel(handX - 3, hy + 3, 7, 1, skinDark);
  }
}

function drawGari(cx, cy, count) {
  drawPixel(cx - 4, cy, 8, 2, '#e0e0e0');
  for (let i = 0; i < count; i++) {
    drawPixel(cx - 3 + i * 4, cy - 2, 3, 2, '#ffcc80');
    drawPixel(cx - 3 + i * 4, cy - 1, 3, 1, '#ffe0b2');
  }
}

// おすすめパネル用：ネタスプライトを overlayCtx へ描画
// PNGがあればそれを、無ければ pixelCanvas のドット絵を使う
function drawSushiToOverlay(neta, destX, destY, scale) {
  const idx  = NETA_LIST.indexOf(neta);
  const name = NETA_FILE_NAMES[idx];
  const img  = NETA_SPRITES[name];
  overlayCtx.imageSmoothingEnabled = false;
  if (img && NETA_SPRITE_LOADED[name]) {
    overlayCtx.drawImage(img, destX, destY, img.naturalWidth, img.naturalHeight);
    return;
  }
  // フォールバック：ドット絵を pixelCanvas で描画して転写
  const wx = 190, wy = 101; // pixelCanvas 上の作業領域（右下隅）
  pixelCtx.clearRect(wx - 6, wy - 1, 16, 10);
  drawNeta(wx, wy, neta, false);
  overlayCtx.drawImage(pixelCanvas, wx - 4, wy, 8, 6, destX, destY, 8 * scale, 6 * scale);
}

// 角丸矩形パスを定義（fill/stroke は呼び出し側で行う）
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y,         x + r, y);
  ctx.closePath();
}

// ===== メイン描画 =====
function render() {
  overlayCtx.clearRect(0, 0, 800, 600);

  if (game.phase === 'prologue')    { renderPrologue();    return; }
  if (game.phase === 'vn')          { renderVN();          return; }
  if (game.phase === 'title')       { renderTitle();       return; }
  if (game.phase === 'stageselect') { renderStageSelect(); return; }
  if (game.phase === 'choice')      { renderChoice();      return; }
  if (game.phase === 'ending')      { renderEnding();      return; }
  if (game.phase === 'stage5_center'){ renderStage5Center(); return; }
  if (game.phase === 'billing')     { renderBill();        return; }
  if (game.phase === 'result')      { renderResult();      return; }
  if (game.phase !== 'play' && game.phase !== 'tea' && game.phase !== 'bill_intro') return;

  gameCtx.imageSmoothingEnabled = false;

  // 1) ステージのVN背景（透過部分=画面上部に敷く、ぼかし＋色薄めで前景UIを見やすく）
  const stageBgKey = STAGE_VN_BG[currentStage] || 'bg_cheap';
  const stageBg    = BG_SPRITES[stageBgKey];
  if (stageBg && BG_SPRITE_LOADED[stageBgKey]) {
    gameCtx.filter = 'brightness(0.55) saturate(0.5)';
    gameCtx.drawImage(stageBg, 0, 0, 800, 600);
    gameCtx.filter = 'none';
  } else {
    gameCtx.fillStyle = BG_COLORS[stageBgKey] || '#0a0828';
    gameCtx.fillRect(0, 0, 800, 600);
  }

  // 2) プレイ画面背景（200×150、上部透過）を上から重ねる
  if (PLAY_BG_LOADED) {
    gameCtx.drawImage(PLAY_BG_IMG, 0, 0, 800, 600);
  }

  // pixelCanvas は寿司ドット絵とキャラ用に透明クリア
  pixelCtx.clearRect(0, 0, 200, 150);

  // 奥レーン・手前レーンとも：PNGが読めていればpixelCanvasには描かず、後でgameCanvasに直接描画
  for (const s of game.upper) {
    if (s.x > -8 && s.x < 210) {
      const idx = NETA_LIST.indexOf(s.data);
      const name = NETA_FILE_NAMES[idx];
      if (!(NETA_SPRITES[name] && NETA_SPRITE_LOADED[name])) {
        // 小スプライト（高さ4）を上ベルト内、ベルト下端より1pxA上に配置
        drawNeta(s.x | 0, UPPER_BELT_Y + 3, s.data, true);
      }
    }
  }
  for (const s of game.lower) {
    if (s.x > -8 && s.x < 210) {
      const idx = NETA_LIST.indexOf(s.data);
      const name = NETA_FILE_NAMES[idx];
      if (!(NETA_SPRITES[name] && NETA_SPRITE_LOADED[name])) {
        // 大スプライト（高さ6）を下ベルト内、ベルト下端より1px上に配置
        drawNeta(s.x | 0, LOWER_BELT_Y + 1, s.data, false);
      }
    }
  }

  const bcx = 100, bcy = BODY_CENTER_Y;
  const playerAge    = game.config?.age ?? 20;
  const playerImg    = ORE_PLAY_SPRITES[playerAge];
  const playerLoaded = ORE_PLAY_LOADED[playerAge];

  // 右手・右腕は最前面に描くため、ここでは描かない（後段でPNG寿司の上に重ねる）
  // 体・頭はPNGがあれば後段で描画。無ければここでドット絵を描く
  if (!(playerImg && playerLoaded)) {
    drawBody(bcx, bcy);
    drawHead(bcx, bcy - 8);
  }
  // ガリ皿・本体PNGが両方あれば後段でgameCanvasに描画。無ければドット絵フォールバック
  const usePngGari = ITEM_IMG.gariplate && ITEM_LOADED.gariplate && ITEM_IMG.gari && ITEM_LOADED.gari;
  if (game.config?.gari && !usePngGari) drawGari(bcx + 32, bcy + 14, game.gari);

  // pixelCanvas → gameCanvas（200×150 → 800×600 に×4倍。透明領域は背景PNGがそのまま見える）
  gameCtx.drawImage(pixelCanvas, 0, 0, 200, 150, 0, 0, 800, 600);

  // 主人公スプライトはここでは描画しない（右腕の後に移動）

  // アイテムスプライト：ガリ皿・ガリ本体・湯呑み（×4倍拡大、画像中心が指定座標に来る）
  gameCtx.imageSmoothingEnabled = false;
  if (game.config?.gari && usePngGari) {
    // ガリ本体（count個並べる）— 先に描いて皿の下になるように
    const bodyImg = ITEM_IMG.gari;
    const bw = bodyImg.naturalWidth  * PX;
    const bh = bodyImg.naturalHeight * PX;
    const startCx = (bcx + 36-4) * PX;  // 既存ロジックの cx-3
    const bcyy    = (bcy - 15)     * PX;
    for (let i = 0; i < game.gari; i++) {
      const cx = startCx + i * 4 * PX;     // 4px間隔（pixelCanvas単位） → ×4で16px
      gameCtx.drawImage(bodyImg, Math.round(cx - bw / 2), Math.round(bcyy - bh / 2), bw, bh);
    }
    // ガリ皿（後に描いて手前になる）
    const plateImg = ITEM_IMG.gariplate;
    const pw = plateImg.naturalWidth  * PX;
    const ph = plateImg.naturalHeight * PX;
    const pcx = (bcx + 36) * PX;
    const pcy = (bcy - 18) * PX;
    gameCtx.drawImage(plateImg, Math.round(pcx - pw / 2), Math.round(pcy - ph / 2), pw, ph);
  }
  // 湯呑み（お茶解放ステージのみ、ガリ皿の左隣）
  if (game.config?.tea && ITEM_IMG.tea && ITEM_LOADED.tea) {
    const teaImg = ITEM_IMG.tea;
    const tw = teaImg.naturalWidth  * PX;
    const th = teaImg.naturalHeight * PX;
    const tcx = (bcx + 24) * PX;  // ガリ皿の左隣
    const tcy = (bcy - 14) * PX;
    gameCtx.drawImage(teaImg, Math.round(tcx - tw / 2), Math.round(tcy - th / 2), tw, th);
  }

  // 奥レーンのPNGスプライトを gameCanvas に縮小描画（皿の下端をベルト下端に合わせる、24×16）
  const UPPER_PLATE_BOTTOM_Y = (UPPER_BELT_Y + 7) * PX + PIXEL_OFFSET_Y;
  const UPPER_W = 24, UPPER_H = 16;
  for (const s of game.upper) {
    if (s.x > -8 && s.x < 210) {
      const idx = NETA_LIST.indexOf(s.data);
      const name = NETA_FILE_NAMES[idx];
      const img = NETA_SPRITES[name];
      if (img && NETA_SPRITE_LOADED[name]) {
        const dx = Math.round(s.x * PX - UPPER_W / 2);
        const dy = Math.round(UPPER_PLATE_BOTTOM_Y - UPPER_H);
        gameCtx.drawImage(img, dx, dy, UPPER_W, UPPER_H);
      }
    }
  }

  // 手前レーンのPNGスプライトを gameCanvas に直接描画（皿の下端をベルト下端に合わせる、自然サイズ）
  const PLATE_BOTTOM_Y = (LOWER_BELT_Y + 7) * PX + PIXEL_OFFSET_Y;
  for (const s of game.lower) {
    if (s.x > -8 && s.x < 210) {
      const idx = NETA_LIST.indexOf(s.data);
      const name = NETA_FILE_NAMES[idx];
      const img = NETA_SPRITES[name];
      if (img && NETA_SPRITE_LOADED[name]) {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const dx = Math.round(s.x * PX - w / 2);
        const dy = Math.round(PLATE_BOTTOM_Y - h);
        gameCtx.drawImage(img, dx, dy, w, h);
      }
    }
  }

  // 右手・右腕を描画（後から主人公スプライトを上に重ねる）
  const useHandImg = RIGHT_HAND_IMG && RIGHT_HAND_IMG_LOADED;
  pixelCtx.clearRect(0, 0, 200, 150);
  if (playerImg && playerLoaded) {
    drawRightArm(game.handX | 0, bcx, bcy, PLAYER_PNG_SHOULDER_DX, PLAYER_PNG_SHOULDER_DY, useHandImg);
  } else {
    drawRightArm(game.handX | 0, bcx, bcy, undefined, undefined, useHandImg);
  }
  gameCtx.drawImage(pixelCanvas, 0, 0, 200, 150, 0, 0, 800, 600);

  // 主人公スプライトを右腕より手前に描画（×4倍拡大、横中心=bcx, 底辺=画面下端600）
  if (playerImg && playerLoaded) {
    gameCtx.imageSmoothingEnabled = false;
    const w  = playerImg.naturalWidth  * PX;
    const h  = playerImg.naturalHeight * PX;
    const cx = bcx * PX;
    const by = 600;
    gameCtx.drawImage(playerImg, Math.round(cx - w / 2), Math.round(by - h), w, h);
  }

  // 右手PNG（×4倍拡大、画像中心が手の中心。画像の下底が常に肩を向くよう回転）
  if (useHandImg) {
    gameCtx.imageSmoothingEnabled = false;
    const w  = RIGHT_HAND_IMG.naturalWidth  * PX;
    const h  = RIGHT_HAND_IMG.naturalHeight * PX;
    const cx = (game.handX | 0)   * PX;  // 手の中心
    const cy = (LOWER_BELT_Y + 4) * PX;
    // 肩位置（PNG使用時 / ドット絵時で異なるオフセットを使う）
    const shoulderDXv = (playerImg && playerLoaded) ? PLAYER_PNG_SHOULDER_DX : 9;
    const shoulderDYv = (playerImg && playerLoaded) ? PLAYER_PNG_SHOULDER_DY : 4;
    const sx = (bcx + shoulderDXv) * PX;
    const sy = (bcy + shoulderDYv) * PX;
    // 画像の +y方向（下底側）が手→肩ベクトルと同じ向きになるように
    const angle = Math.atan2(sy - cy, sx - cx) - Math.PI / 2;
    gameCtx.save();
    gameCtx.translate(cx, cy);
    gameCtx.rotate(angle);
    gameCtx.drawImage(RIGHT_HAND_IMG, -w / 2, -h / 2, w, h);
    gameCtx.restore();
  }

  // 画面フラッシュ
  if (game.flash > 0) {
    overlayCtx.fillStyle = game.flashCol + Math.min(0.35, game.flash * 0.7) + ')';
    overlayCtx.fillRect(0, 0, 800, 600);
  }

  // ネタ名テキスト（手前レーンのみ。奥レーンは省略）
  overlayCtx.font = 'bold 9px monospace';
  for (const s of game.lower) {
    if (s.x > 5 && s.x < 195) {
      const sx = s.x * PX;
      overlayCtx.fillStyle = 'rgba(0,0,0,.55)';
      overlayCtx.fillText(s.data.nm, sx + 1, PIXEL_OFFSET_Y + LOWER_BELT_Y * PX - 2);
      overlayCtx.fillStyle = '#fff';
      overlayCtx.fillText(s.data.nm, sx, PIXEL_OFFSET_Y + LOWER_BELT_Y * PX - 3);
    }
  }

  renderStatusBarsCanvas();
  renderRecommendPanel();
  renderMasterHint();
  renderPlateCards();
  renderKeysHint();

  // 独り言吹き出し（右詰め。rx を右端として左に伸びる）
  overlayCtx.textAlign = 'center';
  if (game.bubbleTimer > 0 && game.bubbleText) {
    const rx = 330;   // 右端x（ここを動かすと吹き出し全体が動く）
    const by = 400;
    overlayCtx.font = 'bold 16px sans-serif';
    const bw = overlayCtx.measureText(game.bubbleText).width + 28;
    roundedRect(overlayCtx, rx - bw, by - 4, bw, 32, 6);
    overlayCtx.fillStyle = 'rgba(255,255,255,.95)'; overlayCtx.fill();
    overlayCtx.strokeStyle = '#999'; overlayCtx.lineWidth = 1;
    roundedRect(overlayCtx, rx - bw, by - 4, bw, 32, 6); overlayCtx.stroke();

    // 三角しっぽ（吹き出し右辺の中央から右に突き出す）
    const sideX = rx;             // 矩形の右辺x
    const midY  = by + 12;        // 矩形高さの中央y
    const tipX  = sideX + 14;     // 先端（右方向）
    overlayCtx.beginPath();
    overlayCtx.moveTo(sideX, midY - 8);
    overlayCtx.lineTo(tipX,  midY);
    overlayCtx.lineTo(sideX, midY + 8);
    overlayCtx.closePath();
    overlayCtx.fillStyle = 'rgba(255,255,255,.95)'; overlayCtx.fill();
    overlayCtx.beginPath();   // 枠線は上→先端→下の2辺だけ（右辺は矩形と継ぎ目なし）
    overlayCtx.moveTo(sideX, midY - 8);
    overlayCtx.lineTo(tipX,  midY);
    overlayCtx.lineTo(sideX, midY + 8);
    overlayCtx.stroke();

    overlayCtx.fillStyle = '#222';
    overlayCtx.textAlign = 'right';
    overlayCtx.fillText(game.bubbleText, rx - 14, by + 18);
    overlayCtx.textAlign = 'center';
  }

  // コンボ表示（皿カード帯と上ベルトの境界あたり、コンボ数で派手さが変わる）
  if (game.comboLabelTimer > 0 && game.comboLabel) {
    const c        = game.comboShown || 1;
    const fontSize = c === 1 ? 30 : c === 2 ? 44 : 60;
    const color    = c === 1 ? '#ffd740' : c === 2 ? '#ff9800' : '#ff3d00';
    const elapsed  = 2 - game.comboLabelTimer;       // 出現からの経過秒
    const pop      = Math.max(0, 1 - elapsed * 5);   // 出現直後 0.2 秒だけ拡大
    const scale    = 1 + pop * 0.5;
    const shake    = c >= 2 ? (c - 1) * 3 : 0;
    const sx       = 400 + (Math.random() - 0.5) * shake;
    const sy       = 281 + (Math.random() - 0.5) * shake;
    overlayCtx.save();
    overlayCtx.translate(sx, sy);
    overlayCtx.scale(scale, scale);
    overlayCtx.textAlign = 'center';
    overlayCtx.font      = 'bold ' + fontSize + 'px sans-serif';
    overlayCtx.lineWidth   = c >= 3 ? 8 : c === 2 ? 6 : 5;
    overlayCtx.strokeStyle = 'rgba(0,0,0,.85)';
    overlayCtx.strokeText(game.comboLabel, 0, 0);
    overlayCtx.fillStyle = color;
    overlayCtx.fillText(game.comboLabel, 0, 0);
    if (c >= 3) {
      overlayCtx.shadowColor = '#ffeb3b';
      overlayCtx.shadowBlur  = 24;
      overlayCtx.fillText(game.comboLabel, 0, 0);
      overlayCtx.shadowBlur  = 0;
    }
    overlayCtx.restore();
    overlayCtx.lineWidth = 1;
  }

  // 満足度ポップアップ（カウンター下端から上へ浮かぶ）
  for (const p of game.popups) {
    const py = PIXEL_OFFSET_Y + (bcy - 24) * PX - p.y;
    overlayCtx.globalAlpha = Math.min(1, p.life);
    overlayCtx.font = 'bold ' + p.sz + 'px sans-serif';
    overlayCtx.strokeStyle = 'rgba(0,0,0,.8)'; overlayCtx.lineWidth = 4;
    overlayCtx.strokeText(p.txt, 400, py);
    overlayCtx.fillStyle = p.col;
    overlayCtx.fillText(p.txt, 400, py);
    overlayCtx.lineWidth = 1;
    overlayCtx.globalAlpha = 1;
  }

  // ガリ残数（gari有効ステージのみ。ガリ皿の右、黒縁取り）
  if (game.config?.gari) {
    const text = game.gari + '/3';
    const tx = (bcx + 46) * PX;          // ガリ皿の右
    const ty = (bcy - 10) * PX;          // ガリ皿の中心高さ
    overlayCtx.font = 'bold 14px monospace';
    overlayCtx.textAlign = 'left';
    overlayCtx.textBaseline = 'middle';
    overlayCtx.lineWidth = 3;
    overlayCtx.lineJoin = 'round';
    overlayCtx.strokeStyle = 'rgba(0,0,0,0.85)';
    overlayCtx.strokeText(text, tx, ty);
    overlayCtx.fillStyle = '#fff';
    overlayCtx.fillText(text, tx, ty);
    overlayCtx.textBaseline = 'alphabetic';
    overlayCtx.lineWidth = 1;
  }

  // お茶タイム
  if (game.phase === 'tea') {
    overlayCtx.fillStyle = 'rgba(0,0,0,.3)'; overlayCtx.fillRect(0, 0, 800, 600);
    overlayCtx.fillStyle = '#fff'; overlayCtx.font = 'bold 20px sans-serif'; overlayCtx.textAlign = 'center';
    overlayCtx.fillText('🍵 お茶タイム… ' + Math.ceil(game.teaTimer), 400, 400);
  }

  // ポーズ
  if (game.paused) {
    overlayCtx.fillStyle = 'rgba(0,0,0,.7)'; overlayCtx.fillRect(0, 0, 800, 600);
    overlayCtx.textAlign = 'center';
    overlayCtx.font = 'bold 32px sans-serif'; overlayCtx.fillStyle = '#ffd740'; overlayCtx.fillText('ポーズ', 400, 280);
    overlayCtx.font = 'bold 20px sans-serif';
    overlayCtx.fillStyle = game.pauseSel === 0 ? '#fff' : '#666'; overlayCtx.fillText('▶ 続行',    300, 350);
    overlayCtx.fillStyle = game.pauseSel === 1 ? '#fff' : '#666'; overlayCtx.fillText('▶ やり直し', 500, 350);
    overlayCtx.font = '14px sans-serif'; overlayCtx.fillStyle = '#aaa';
    overlayCtx.fillText('A/D で選択　Space で決定', 400, 410);
  }

  // Stage5フェードアウト演出（白オーバーレイ）
  // 序盤〜中盤は薄め（食べやすさ優先）、終盤に一気に白くする非線形カーブ
  // 中央テキスト「これが……俺の寿司だ」は VN 完了後の 'stage5_center' フェーズで表示
  if (game.config?.fadeout && game.fadeoutProgress > 0) {
    const p = game.fadeoutProgress;
    const a = p < 0.7 ? p * 0.3 : 0.21 + (p - 0.7) / 0.3 * 0.79;
    overlayCtx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
    overlayCtx.fillRect(0, 0, 800, 600);
  }

  // 「お勘定」演出オーバーレイ（プレイ画面フリーズ中）
  if (game.phase === 'bill_intro') {
    overlayCtx.fillStyle = 'rgba(0,0,0,0.55)';
    overlayCtx.fillRect(0, 0, 800, 600);

    // 開始0.2秒で1.4倍 → 等倍へスケールイン
    const elapsed = 1.5 - (game.billIntroTimer ?? 0);
    const scale = elapsed < 0.2 ? 1.4 - (elapsed / 0.2) * 0.4 : 1;

    overlayCtx.save();
    overlayCtx.translate(400, 320);
    overlayCtx.scale(scale, scale);
    overlayCtx.textAlign = 'center';
    overlayCtx.textBaseline = 'middle';
    overlayCtx.font = '900 160px "Hiragino Sans","Meiryo",sans-serif';
    overlayCtx.strokeStyle = '#000';
    overlayCtx.lineWidth = 14;
    overlayCtx.lineJoin = 'round';
    overlayCtx.strokeText('お勘定', 0, 0);
    overlayCtx.fillStyle = '#ffd740';
    overlayCtx.fillText('お勘定', 0, 0);
    overlayCtx.restore();
    overlayCtx.textBaseline = 'alphabetic';
  }

}

// ===== UI（キャンバス描画、海エリア Y=92〜292 内に配置） =====

// ステータスバー3本（Y=128〜186 / 透過、海が透けて見える）
function renderStatusBarsCanvas() {
  const opacity = (game.config?.fadeout && game.fadeoutProgress > 0)
    ? Math.max(0, 1 - game.fadeoutProgress) : 1;
  if (opacity <= 0) return;
  overlayCtx.globalAlpha = opacity;

  // 左半分にバー、右半分におすすめ。プレイカード（Y=208〜268）と被らないよう
  // バー全体は Y=112〜196 に収める。
  const X_LABEL = 30;
  const LABEL_W = 80;
  const BAR_X   = X_LABEL + LABEL_W;   // 110
  const BAR_W   = 380;                  // 110〜490
  const BAR_H   = 20;
  const ROW_GAP = 12;                   // バー同士の縦間隔
  const ROW_H   = BAR_H + ROW_GAP;     // 32
  const TOP_Y   = 88;                   // 1本目の上端（背景シフトに合わせ -24）

  const maxFull   = game.config?.maxFull || 20;
  const fullRatio = Math.min(1, game.full / maxFull);
  const satRatio  = Math.min(1, game.sat / 1500);
  const irrRatio  = game.irritate / 100;

  const fullColor = fullRatio < 0.5 ? '#4caf50' : fullRatio < 0.8 ? '#ffd740' : '#d9534f';
  const satColor  = game.decaying ? '#d9534f' : '#f0ad4e';
  const irrColor  = game.irritate < 25 ? '#4caf50' : game.irritate < 50 ? '#ffd740' : '#d9534f';

  const labels = ['満足度', '満腹度', 'イライラ'];
  const ratios = [satRatio, fullRatio, irrRatio];
  const colors = [satColor, fullColor, irrColor];

  // バーエリア全体を囲む細い縁取り（視認性向上）
  overlayCtx.strokeStyle = 'rgba(255,255,255,0.55)';
  overlayCtx.lineWidth = 1;
  overlayCtx.strokeRect(18.5, 80.5, 482, 100);

  for (let i = 0; i < 3; i++) {
    const barY = TOP_Y + i * ROW_H;
    const midY = barY + BAR_H / 2;

    // 見出し（左側、白文字＋黒輪郭で海背景上でも視認）
    overlayCtx.font = 'bold 18px "Hiragino Sans","Meiryo",sans-serif';
    overlayCtx.textAlign = 'left';
    overlayCtx.textBaseline = 'middle';
    overlayCtx.lineWidth = 4;
    overlayCtx.lineJoin = 'round';
    overlayCtx.strokeStyle = 'rgba(0,0,0,0.9)';
    overlayCtx.strokeText(labels[i], X_LABEL, midY);
    overlayCtx.fillStyle = '#fff';
    overlayCtx.fillText(labels[i], X_LABEL, midY);

    // バー外枠（半透明黒、海が透ける）
    overlayCtx.fillStyle = 'rgba(0,0,0,0.55)';
    overlayCtx.fillRect(BAR_X, barY, BAR_W, BAR_H);

    // バー中身（不透明色で値を示す）
    const fillW = Math.max(0, ratios[i] * BAR_W);
    overlayCtx.fillStyle = colors[i];
    overlayCtx.fillRect(BAR_X, barY, fillW, BAR_H);

    // 枠線（白で輪郭強調）
    overlayCtx.strokeStyle = 'rgba(255,255,255,0.65)';
    overlayCtx.lineWidth = 1;
    overlayCtx.strokeRect(BAR_X + 0.5, barY + 0.5, BAR_W - 1, BAR_H - 1);
  }

  overlayCtx.textBaseline = 'alphabetic';
  overlayCtx.lineWidth = 1;
  overlayCtx.globalAlpha = 1;
}

// おすすめパネル（右側のUIエリア、y=80〜180 内）
function renderRecommendPanel() {
  const opacity = (game.config?.fadeout && game.fadeoutProgress > 0)
    ? Math.max(0, 1 - game.fadeoutProgress) : 1;
  if (opacity <= 0) return;
  overlayCtx.globalAlpha = opacity;

  const recCx = 650;

  // 縁取り
  overlayCtx.strokeStyle = 'rgba(255,255,255,0.55)';
  overlayCtx.lineWidth = 1;
  overlayCtx.strokeRect(508.5, 80.5, 282, 100);

  // タイトル
  overlayCtx.font = 'bold 22px "Hiragino Mincho ProN","Yu Mincho","MS Mincho","Apple Color Emoji",serif';
  overlayCtx.textAlign = 'center';
  overlayCtx.textBaseline = 'middle';
  overlayCtx.lineWidth = 5;
  overlayCtx.lineJoin = 'round';
  overlayCtx.strokeStyle = 'rgba(0,0,0,0.9)';
  overlayCtx.strokeText('⭐️本日のおすすめ⭐️', recCx, 104);
  overlayCtx.fillStyle = '#ffe066';
  overlayCtx.fillText('⭐️本日のおすすめ⭐️', recCx, 104);
  overlayCtx.lineWidth = 1;

  // スプライト＋ネタ名
  const rec = game.recommends ? game.recommends[0] : null;
  if (rec) {
    const idx   = NETA_LIST.indexOf(rec);
    const fname = NETA_FILE_NAMES[idx];
    const img   = NETA_SPRITES[fname];
    const usePng = img && NETA_SPRITE_LOADED[fname];
    const sprW = usePng ? img.naturalWidth  : 32;
    const sprH = usePng ? img.naturalHeight : 24;

    const sprAreaY = 120, sprAreaH = 40;
    const sprX = recCx - sprW / 2;
    const sprY = sprAreaY + (sprAreaH - sprH) / 2;
    drawSushiToOverlay(rec, Math.round(sprX), Math.round(sprY), 4);

    overlayCtx.font = 'bold 18px "Hiragino Mincho ProN","Yu Mincho","MS Mincho",serif';
    overlayCtx.textAlign = 'center';
    overlayCtx.textBaseline = 'alphabetic';
    overlayCtx.lineWidth = 4;
    overlayCtx.lineJoin = 'round';
    overlayCtx.strokeStyle = 'rgba(0,0,0,0.9)';
    overlayCtx.strokeText(rec.nm, recCx, 176);
    overlayCtx.fillStyle = '#fff';
    overlayCtx.fillText(rec.nm, recCx, 176);
    overlayCtx.lineWidth = 1;
  }

  overlayCtx.textBaseline = 'alphabetic';
  overlayCtx.textAlign = 'center';
  overlayCtx.globalAlpha = 1;
}

// 大将のバストアップ＋吹き出し（ヒント表示）
//   ステージごとに大将のグラフィックを切り替え、吹き出しのテキストは時間経過で切り替わる
const HINT_INTERVAL = 6;  // ヒント切り替え秒数

function renderMasterHint() {
  const opacity = (game.config?.fadeout && game.fadeoutProgress > 0)
    ? Math.max(0, 1 - game.fadeoutProgress) : 1;
  if (opacity <= 0) return;
  overlayCtx.globalAlpha = opacity;

  // ステージから大将の年齢を決定
  const ageStage = game.config?.age ?? getStageConfig(currentStage)?.age ?? 20;
  const taishoAge = TAISHO_AGE_MAP[ageStage] ?? 30;
  const charKey = 'taisho' + taishoAge;
  const masterImg = CHAR_SPRITES[charKey];

  // 大将バストアップ：頭〜肩まで含めてクロップ（元画像 200×370 のうち上 200×190）
  // 透過エリア（Y=0〜68）からUIバー枠手前（Y=80）までを使い、Y=2〜78（76px）に表示
  const mDestX = 710, mDestY = 2, mDestW = 80, mDestH = 76;
  const mSrcW  = 200, mSrcH = 190;
  if (masterImg && CHAR_SPRITE_LOADED[charKey]) {
    overlayCtx.imageSmoothingEnabled = true;
    overlayCtx.drawImage(masterImg, 0, 0, mSrcW, mSrcH, mDestX, mDestY, mDestW, mDestH);
    overlayCtx.imageSmoothingEnabled = false;
  } else {
    // フォールバック：色矩形＋ラベル
    overlayCtx.fillStyle = '#5c3318';
    roundedRect(overlayCtx, mDestX, mDestY, mDestW, mDestH, 6); overlayCtx.fill();
    overlayCtx.fillStyle = 'rgba(255,255,255,0.7)';
    overlayCtx.font = 'bold 12px sans-serif';
    overlayCtx.textAlign = 'center';
    overlayCtx.fillText('親方', mDestX + mDestW / 2, mDestY + mDestH / 2);
  }

  // 吹き出し：大将の左に大きく横長で配置（一行を長く取れる）
  const bX = 80, bY = 4, bW = 610, bH = 64;
  overlayCtx.fillStyle = 'rgba(255,255,255,0.94)';
  roundedRect(overlayCtx, bX, bY, bW, bH, 10); overlayCtx.fill();
  overlayCtx.strokeStyle = '#444';
  overlayCtx.lineWidth = 2;
  roundedRect(overlayCtx, bX, bY, bW, bH, 10); overlayCtx.stroke();
  overlayCtx.lineWidth = 1;

  // 吹き出しの三角しっぽ（大将の方を指す）
  overlayCtx.beginPath();
  overlayCtx.moveTo(bX + bW, bY + bH * 0.4);
  overlayCtx.lineTo(bX + bW + 16, bY + bH * 0.5);
  overlayCtx.lineTo(bX + bW, bY + bH * 0.6);
  overlayCtx.closePath();
  overlayCtx.fillStyle = 'rgba(255,255,255,0.94)';
  overlayCtx.fill();
  overlayCtx.strokeStyle = '#444';
  overlayCtx.lineWidth = 2;
  overlayCtx.beginPath();
  overlayCtx.moveTo(bX + bW, bY + bH * 0.4);
  overlayCtx.lineTo(bX + bW + 16, bY + bH * 0.5);
  overlayCtx.lineTo(bX + bW, bY + bH * 0.6);
  overlayCtx.stroke();
  overlayCtx.lineWidth = 1;

  // 表示するヒント：ステージ別ヒント（stage-hints.csv）優先、無ければ HINTS にフォールバック
  const stageHints = (typeof STAGE_HINTS !== 'undefined' && STAGE_HINTS[currentStage]?.length)
    ? STAGE_HINTS[currentStage] : HINTS;
  const idx = Math.floor((game.time || 0) / HINT_INTERVAL) % stageHints.length;
  const text = stageHints[idx] || '';

  // テキスト描画（ゴシック体、常に1行・吹き出し中央高さ・左寄せ。長文ははみ出しても可）
  overlayCtx.font = 'bold 16px "Hiragino Sans","Meiryo",sans-serif';
  overlayCtx.fillStyle = '#222';
  overlayCtx.textAlign = 'left';
  overlayCtx.textBaseline = 'middle';
  overlayCtx.fillText(text, bX + 14, bY + bH / 2);

  overlayCtx.textBaseline = 'alphabetic';
  overlayCtx.textAlign = 'center';
  overlayCtx.globalAlpha = 1;
}

// 日本語向け文字単位折り返し
function wrapJapanese(text, maxWidth) {
  const lines = [];
  let current = '';
  for (const ch of text) {
    const test = current + ch;
    if (overlayCtx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// 皿カード×6 横一列（Y=244〜292）
function renderPlateCards() {
  const opacity = (game.config?.fadeout && game.fadeoutProgress > 0)
    ? Math.max(0, 1 - game.fadeoutProgress) : 1;
  if (opacity <= 0) return;
  overlayCtx.globalAlpha = opacity;

  // canvas (12,184,w=776,h=60) に6枚均等配置（背景シフトに合わせ ry -24）
  const cardW = 126, cardH = 60, cardGap = 4;  // 6×126 + 5×4 = 776
  const startX = 12;
  const ry = 184;

  for (let i = 0; i < 6; i++) {
    const rx = startX + i * (cardW + cardGap);

    // 同系色を濃くした各皿用のダークカラー
    const PLATE_DARK = ['#0d47a1', '#003d00', '#7a4f00', '#5a0000', '#3a3a3a', '#5d4500'];

    overlayCtx.fillStyle = '#e0ceb8';
    roundedRect(overlayCtx, rx, ry, cardW, cardH, 5); overlayCtx.fill();

    // 外側の細い濃色ボーダー
    overlayCtx.strokeStyle = PLATE_DARK[i];
    overlayCtx.lineWidth = 1.5;
    roundedRect(overlayCtx, rx - 1, ry - 1, cardW + 2, cardH + 2, 6);
    overlayCtx.stroke();

    // メインの皿色ボーダー（4px）
    overlayCtx.strokeStyle = i === 5 ? '#daa520' : PLATE_COLORS[i];
    overlayCtx.lineWidth = 4;
    roundedRect(overlayCtx, rx, ry, cardW, cardH, 5); overlayCtx.stroke();
    overlayCtx.lineWidth = 1;

    // フラッシュオーバーレイ
    if (game.cardFlash[i] > 0) {
      overlayCtx.fillStyle = 'rgba(255,255,255,' + Math.min(0.85, game.cardFlash[i] * 2) + ')';
      roundedRect(overlayCtx, rx, ry, cardW, cardH, 5); overlayCtx.fill();
      overlayCtx.strokeStyle = '#fff'; overlayCtx.lineWidth = 6;
      roundedRect(overlayCtx, rx, ry, cardW, cardH, 5); overlayCtx.stroke();
      overlayCtx.lineWidth = 1;
    }

    // 皿色テキスト：同系色を濃くしたものを輪郭線にして可読性UP
    overlayCtx.font = 'bold 16px sans-serif';
    overlayCtx.textAlign = 'left';
    overlayCtx.lineWidth = 3;
    overlayCtx.lineJoin = 'round';
    overlayCtx.strokeStyle = PLATE_DARK[i];
    overlayCtx.strokeText(PLATE_NAMES[i], rx + 8, ry + 22);
    overlayCtx.fillStyle = i === 5 ? '#daa520' : PLATE_COLORS[i];
    overlayCtx.fillText(PLATE_NAMES[i], rx + 8, ry + 22);
    overlayCtx.lineWidth = 1;

    // 枚数（×N）：濃色＋少し太めフォント
    overlayCtx.font = 'bold 19px sans-serif';
    overlayCtx.fillStyle = PLATE_DARK[i];
    overlayCtx.textAlign = 'right';
    overlayCtx.fillText('×' + game.plateCnt[i], rx + cardW - 8, ry + 22);

    overlayCtx.strokeStyle = 'rgba(120,80,30,.25)'; overlayCtx.lineWidth = 1;
    overlayCtx.beginPath();
    overlayCtx.moveTo(rx + 6, ry + 28); overlayCtx.lineTo(rx + cardW - 6, ry + 28); overlayCtx.stroke();

    // 値段ヒント（？／高め／N円）：濃色＋少し太めフォント
    overlayCtx.font = 'bold 19px sans-serif';
    overlayCtx.textAlign = 'center';
    overlayCtx.fillStyle = PLATE_DARK[i];
    if      (game.cardState[i] === 0) overlayCtx.fillText('？',                    rx + cardW / 2, ry + 49);
    else if (game.cardState[i] === 1) overlayCtx.fillText(game.cardHint[i],        rx + cardW / 2, ry + 49);
    else                              overlayCtx.fillText(game.cardHint[i] + '円', rx + cardW / 2, ry + 49);
  }

  overlayCtx.globalAlpha = 1;
}

// 操作説明帯（キャンバス内、画面下部）
function renderKeysHint() {
  // 操作説明帯の位置（ここを直せば共通で変わる）
  const KEYS_HINT_X = 400;
  const KEYS_HINT_Y = 580;

  const opacity = (game.config?.fadeout && game.fadeoutProgress > 0)
    ? Math.max(0, 1 - game.fadeoutProgress) : 1;
  if (opacity <= 0) return;
  overlayCtx.globalAlpha = opacity;

  const text = 'A/D：左右　Space：掴む　Z：お茶　E：ガリ　Q：会計　Esc：ポーズ';
  overlayCtx.font = 'bold 13px sans-serif';
  overlayCtx.textAlign = 'center';
  overlayCtx.textBaseline = 'middle';
  overlayCtx.lineWidth = 4;
  overlayCtx.lineJoin  = 'round';
  overlayCtx.strokeStyle = 'rgba(0,0,0,0.85)';
  overlayCtx.strokeText(text, KEYS_HINT_X, KEYS_HINT_Y);
  overlayCtx.fillStyle = '#fff';
  overlayCtx.fillText(text, KEYS_HINT_X, KEYS_HINT_Y);

  overlayCtx.textBaseline = 'alphabetic';
  overlayCtx.lineWidth = 1;
  overlayCtx.globalAlpha = 1;
}

// ===== ステージ選択画面 =====
function renderStageSelect() {
  const STAGE_EPISODES = ['第一話', '第二話', '第三話', '第四話', '第五話'];
  const STAGE_TITLES   = ['邂逅',   '飛躍',   '葛藤',   '決戦',   'そして…'];

  // 背景：stage_select.png
  if (STAGE_SELECT_BG_LOADED) {
    gameCtx.imageSmoothingEnabled = true;
    gameCtx.drawImage(STAGE_SELECT_BG_IMG, 0, 0, 800, 600);
  } else {
    gameCtx.fillStyle = '#0a0a12'; gameCtx.fillRect(0, 0, 800, 600);
  }

  overlayCtx.textAlign = 'center';
  overlayCtx.lineJoin  = 'round';

  // タイトル：黒輪郭付き
  overlayCtx.font = 'bold 34px "Hiragino Sans","Meiryo",sans-serif';
  overlayCtx.lineWidth = 6;
  overlayCtx.strokeStyle = 'rgba(0,0,0,0.9)';
  overlayCtx.strokeText('ステージ選択', 400, 110);
  overlayCtx.fillStyle = '#ffd740';
  overlayCtx.fillText('ステージ選択', 400, 110);
  overlayCtx.lineWidth = 1;

  for (let i = 0; i < 5; i++) {
    const bx = 72 + i * 136, by = 180, bw = 116, bh = 200;
    const unlocked = (i + 1) <= unlockedStages;
    const selected = i === stageSelectCursor;

    // パネル本体：stage_base.png を使用（無ければ従来のカラー矩形）
    if (STAGE_BASE_LOADED) {
      // ピクセルアート想定：スムージングを切ってパキッと拡大
      overlayCtx.save();
      overlayCtx.imageSmoothingEnabled = false;
      if (!unlocked) overlayCtx.globalAlpha = 0.45;
      overlayCtx.drawImage(STAGE_BASE_IMG, bx, by, bw, bh);
      overlayCtx.restore();
    } else {
      overlayCtx.fillStyle = selected ? 'rgba(26,18,0,0.92)'
                            : unlocked ? 'rgba(13,13,13,0.85)'
                            : 'rgba(7,7,7,0.85)';
      overlayCtx.fillRect(bx, by, bw, bh);
    }

    // 選択中は金色のハイライト枠を上から重ねる
    if (selected) {
      overlayCtx.strokeStyle = '#ffd740';
      overlayCtx.lineWidth   = 3;
      overlayCtx.strokeRect(bx + 1.5, by + 1.5, bw - 3, bh - 3);
      overlayCtx.lineWidth   = 1;
    }

    // 「第N話」「タイトル」を改行で2行表示。木目に映えるよう黒輪郭付き白文字
    const cx = bx + bw / 2;
    const epY    = by + 80;   // 1行目
    const titleY = by + 112;  // 2行目（改行）

    overlayCtx.lineJoin   = 'round';
    overlayCtx.lineWidth  = 4;
    overlayCtx.strokeStyle = 'rgba(0,0,0,0.85)';

    // 1行目：第N話
    overlayCtx.font = 'bold 18px "Hiragino Mincho ProN","YuMincho","Meiryo",serif';
    overlayCtx.strokeText(STAGE_EPISODES[i], cx, epY);
    overlayCtx.fillStyle = unlocked ? (selected ? '#ffd740' : '#fff') : '#888';
    overlayCtx.fillText(STAGE_EPISODES[i], cx, epY);

    // 2行目：タイトル（未解放ステージはネタバレ防止で非表示）
    if (unlocked) {
      overlayCtx.font = 'bold 22px "Hiragino Mincho ProN","YuMincho","Meiryo",serif';
      overlayCtx.strokeText(STAGE_TITLES[i], cx, titleY);
      overlayCtx.fillStyle = selected ? '#ffe680' : '#fff';
      overlayCtx.fillText(STAGE_TITLES[i], cx, titleY);
    }

    overlayCtx.lineWidth = 1;

    // ステータスバッジ：解放済みなら CLEAR/NEW、未解放なら 🔒
    if (unlocked) {
      const cleared = (i + 1) < unlockedStages;
      overlayCtx.font = 'bold 12px sans-serif';
      overlayCtx.lineWidth = 3;
      overlayCtx.strokeStyle = 'rgba(0,0,0,0.8)';
      overlayCtx.strokeText(cleared ? 'CLEAR' : 'NEW', cx, by + bh - 18);
      overlayCtx.fillStyle = cleared ? '#4caf50' : '#ffd740';
      overlayCtx.fillText(cleared ? 'CLEAR' : 'NEW', cx, by + bh - 18);
      overlayCtx.lineWidth = 1;
    } else {
      overlayCtx.font = 'bold 28px sans-serif';
      overlayCtx.fillStyle = '#222';
      overlayCtx.fillText('🔒', cx, by + bh - 18);
    }
  }

  // ヘルプ：黒輪郭付き
  overlayCtx.font = 'bold 15px sans-serif';
  overlayCtx.lineWidth = 4;
  overlayCtx.strokeStyle = 'rgba(0,0,0,0.85)';
  overlayCtx.strokeText('A / D : カーソル移動　　Space : 決定', 400, 430);
  overlayCtx.fillStyle = '#ddd';
  overlayCtx.fillText('A / D : カーソル移動　　Space : 決定', 400, 430);
  overlayCtx.lineWidth = 1;

  if (currentBgm !== 'title' && audioCtx) startBGM('title');
}

// ===== 選択画面（リトライ or タイトル） =====
function renderChoice() {
  gameCtx.fillStyle = '#0a0a12'; gameCtx.fillRect(0, 0, 800, 600);
  overlayCtx.textAlign = 'center';
  overlayCtx.font = `bold 28px "Hiragino Sans","Meiryo",sans-serif`;
  overlayCtx.fillStyle = '#ffd740';
  overlayCtx.fillText('どうする？', 400, 230);

  const opts = ['もう一回', 'タイトルへ'];
  opts.forEach((label, i) => {
    const cx = 220 + i * 360, cy = 310, bw = 200, bh = 60;
    const sel = game.choiceSel === i;
    overlayCtx.fillStyle = sel ? '#ffd740' : '#1a1a2a';
    overlayCtx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
    overlayCtx.strokeStyle = sel ? '#ffd740' : '#444';
    overlayCtx.lineWidth = 2;
    overlayCtx.strokeRect(cx - bw / 2 + 0.5, cy - bh / 2 + 0.5, bw - 1, bh - 1);
    overlayCtx.font = `bold 20px "Hiragino Sans","Meiryo",sans-serif`;
    overlayCtx.fillStyle = sel ? '#1a1200' : '#aaa';
    overlayCtx.fillText(label, cx, cy + 7);
  });

  overlayCtx.font = 'bold 14px sans-serif'; overlayCtx.fillStyle = '#555';
  overlayCtx.fillText('A / D : 選択　　Space : 決定', 400, 420);
}

// ===== Stage5 中央テキスト表示 =====
// ダイアログ閉幕直後 → 純白の間 (0.8秒) → テキスト2秒フェードイン → 2秒静止 → FIN自動遷移
function renderStage5Center() {
  gameCtx.fillStyle = '#fff';
  gameCtx.fillRect(0, 0, 800, 600);
  const elapsed = performance.now() - game.centerTextStartAt;
  const fadeStartMs   = 800;
  const fadeDuration  = 2000;
  let alpha = 0;
  if (elapsed >= fadeStartMs) {
    alpha = Math.min(1, (elapsed - fadeStartMs) / fadeDuration);
  }
  if (alpha > 0) {
    overlayCtx.fillStyle = `rgba(40,40,40,${alpha.toFixed(2)})`;
    overlayCtx.font = 'bold 36px "Hiragino Sans","Meiryo",sans-serif';
    overlayCtx.textAlign = 'center';
    overlayCtx.fillText(STAGE5_CENTER_TEXT, 400, 300);
  }
}

// ===== エンディング画面 =====
function renderEnding() {
  gameCtx.fillStyle = '#000'; gameCtx.fillRect(0, 0, 800, 600);
  overlayCtx.textAlign = 'center';
  overlayCtx.font = `900 72px "Hiragino Mincho ProN","YuMincho","MS PMincho",serif`;
  overlayCtx.fillStyle = '#ffd740';
  overlayCtx.fillText('-完-', 400, 310);
  if (game.endingReady) {
    overlayCtx.font = 'bold 20px sans-serif'; overlayCtx.fillStyle = '#ffd740';
    if (Math.sin(performance.now() / 400) > 0.2) overlayCtx.fillText('Press Any Key', 400, 400);
  }
}

// ===== プロローグ画面（起動直後。重要画像のDL進捗もここに表示）=====
function renderPrologue() {
  gameCtx.fillStyle = '#000';
  gameCtx.fillRect(0, 0, 800, 600);
  overlayCtx.textAlign = 'center';
  overlayCtx.font = '22px "Hiragino Sans","Meiryo",sans-serif';
  overlayCtx.fillStyle = 'rgba(255,255,255,0.6)';
  overlayCtx.fillText('俺の寿司の話をしよう。', 400, 270);
  overlayCtx.fillText('長い、長い話だ。', 400, 310);

  const { done, total, ratio } = getLoadingProgress();
  if (ratio < 1) {
    // ロード中：プログレスバー
    const bw = 360, bh = 12;
    const bx = 400 - bw / 2, by = 416;
    overlayCtx.strokeStyle = 'rgba(255,215,64,0.6)';
    overlayCtx.lineWidth = 2;
    overlayCtx.strokeRect(bx, by, bw, bh);
    overlayCtx.fillStyle = '#ffd740';
    overlayCtx.fillRect(bx + 2, by + 2, (bw - 4) * ratio, bh - 4);
    overlayCtx.font = 'bold 12px monospace';
    overlayCtx.fillStyle = 'rgba(255,255,255,0.6)';
    overlayCtx.fillText(`Loading... ${done} / ${total}`, 400, 450);
    overlayCtx.lineWidth = 1;
  } else {
    // ロード完了：Press Any Key（他画面と統一スタイル）
    if (Math.sin(performance.now() / 400) > 0.2) {
      overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      roundedRect(overlayCtx, 220, 416, 360, 40, 10);
      overlayCtx.fill();
      overlayCtx.font = 'bold 20px sans-serif';
      overlayCtx.fillStyle = '#ffd740';
      overlayCtx.fillText('Press Any Key', 400, 442);
    }
  }
}

// ===== タイトル画面 =====
function renderTitle() {
  if (titleStartTime === null) titleStartTime = performance.now();

  // 黒下地
  gameCtx.fillStyle = '#000';
  gameCtx.fillRect(0, 0, 800, 600);

  const FADE_MS = 1200;
  const elapsed = performance.now() - titleStartTime;
  const alpha = Math.min(1, elapsed / FADE_MS);

  // タイトル画像をフェードインで全画面に重ねる
  if (TITLE_BG_LOADED) {
    gameCtx.imageSmoothingEnabled = true;
    gameCtx.globalAlpha = alpha;
    gameCtx.drawImage(TITLE_BG_IMG, 0, 0, 800, 600);
    gameCtx.globalAlpha = 1;
  }

  // Press Any Key（フェードイン完了後に点滅表示。半透明黒パネル付きで他画面と統一）
  const showPrompt = !TITLE_BG_LOADED || alpha >= 1;
  if (showPrompt && Math.sin(performance.now() / 400) > 0.2) {
    overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    roundedRect(overlayCtx, 220, 506, 360, 40, 10);
    overlayCtx.fill();
    overlayCtx.textAlign = 'center';
    overlayCtx.font = 'bold 20px sans-serif';
    overlayCtx.fillStyle = '#ffd740';
    overlayCtx.fillText('Press Any Key', 400, 532);
  }

  // 白フラッシュ（Rキーリセット時／キー押下→遷移時）
  if (titleFlashTimer > 0) {
    overlayCtx.fillStyle = `rgba(255,255,255,${(titleFlashTimer / 0.5).toFixed(3)})`;
    overlayCtx.fillRect(0, 0, 800, 600);
  }

  if (currentBgm !== 'title' && audioCtx) startBGM('title');
}

// ===== 会計画面 =====
function renderBill() {
  // 背景：game_end.png
  if (GAME_END_BG_LOADED) {
    gameCtx.imageSmoothingEnabled = true;
    gameCtx.drawImage(GAME_END_BG_IMG, 0, 0, 800, 600);
  } else {
    gameCtx.fillStyle = '#100a04'; gameCtx.fillRect(0, 0, 800, 600);
  }

  // 細かい文字が並ぶので、リスト全体を半透明黒パネルで覆って可読性を確保
  overlayCtx.fillStyle = 'rgba(0,0,0,0.55)';
  roundedRect(overlayCtx, 50, 50, 700, 420, 14);
  overlayCtx.fill();

  overlayCtx.textAlign = 'center';
  overlayCtx.lineJoin  = 'round';

  // ヘルパー：黒輪郭付きテキスト
  function strokeFill(text, x, y, color, sw) {
    overlayCtx.lineWidth = sw || 4;
    overlayCtx.strokeStyle = 'rgba(0,0,0,0.92)';
    overlayCtx.strokeText(text, x, y);
    overlayCtx.fillStyle = color;
    overlayCtx.fillText(text, x, y);
  }

  // タイトル
  overlayCtx.font = 'bold 28px sans-serif';
  strokeFill('お 会 計', 400, 88, '#ffd740', 5);
  overlayCtx.font = 'bold 14px sans-serif';
  strokeFill('── 本日の皿価格 ──', 400, 112, '#fff', 3);

  const positions = [];
  for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) positions.push({ x: 80 + col * 240, y: 140 + row * 170 });

  const show   = Math.min(game.billStep, game.eaten.length);
  const groups = [[], [], [], [], [], []];
  for (let i = 0; i < show; i++) { const e = game.eaten[i]; groups[e.ri].push(e); }

  for (let pi = 0; pi < 6; pi++) {
    const { x: px, y: py } = positions[pi];
    overlayCtx.textAlign = 'left';
    // 皿色アイコン
    if (pi === 5) {
      overlayCtx.fillStyle = '#daa520'; overlayCtx.fillRect(px, py - 6, 14, 14);
      overlayCtx.fillStyle = '#111';    overlayCtx.fillRect(px + 1, py - 5, 12, 12);
    } else {
      overlayCtx.fillStyle = PLATE_COLORS[pi]; overlayCtx.fillRect(px, py - 6, 14, 14);
    }
    // 皿名+価格
    overlayCtx.font = 'bold 14px sans-serif';
    strokeFill(PLATE_NAMES[pi] + ' : ' + game.gamePrices[pi] + '円', px + 18, py + 6, '#fff', 3);
    // ネタ一覧
    overlayCtx.font = 'bold 12px sans-serif';
    const group = groups[pi];
    if (!group.length) {
      strokeFill('（なし）', px + 10, py + 22, '#aaa', 2.5);
    } else {
      const cnt = {};
      for (const e of group) cnt[e.neta.nm] = (cnt[e.neta.nm] || 0) + 1;
      let yi = 0;
      for (const nm of Object.keys(cnt)) {
        strokeFill(nm + (cnt[nm] > 1 ? ' ×' + cnt[nm] : ''), px + 10, py + 22 + yi * 14, '#fff', 2.5);
        yi++;
      }
    }
  }

  // 合計
  if (game.billListDone) {
    overlayCtx.textAlign = 'center';
    overlayCtx.font = 'bold 30px sans-serif';
    strokeFill('合計: ' + game.billTotal + '円', 400, 460, '#fff', 5);
  }

  // 押下プロンプト（小パネル付き）
  if (game.billKeyReady && Math.sin(performance.now() / 400) > 0.2) {
    overlayCtx.fillStyle = 'rgba(0,0,0,0.6)';
    roundedRect(overlayCtx, 160, 510, 480, 38, 10);
    overlayCtx.fill();
    overlayCtx.font = 'bold 20px sans-serif';
    overlayCtx.textAlign = 'center';
    strokeFill('Press Any Key', 400, 535, '#ffd740', 4);
  }

  overlayCtx.lineWidth = 1;
}

// ===== リザルト画面 =====
// 背景はランダムなPNG。視認性向上のため全テキストに黒輪郭ストロークを入れる
function renderResult() {
  // 背景: 初回描画時にランダムで1枚選んで固定（このリザルト表示中は同じものを使う）
  if (game.resultBgIdx === undefined || game.resultBgIdx === null) {
    game.resultBgIdx = Math.floor(Math.random() * RESULT_BG_NAMES.length);
    game.resultBgStartTime = performance.now();
  }
  let bgIdx = game.resultBgIdx;
  let bgImg = RESULT_BG_IMGS[bgIdx];
  // 選択画像がまだロード未完了の場合、別のロード済みを使う
  if (!bgImg || !RESULT_BG_LOADED[bgIdx]) {
    for (let i = 0; i < RESULT_BG_NAMES.length; i++) {
      if (RESULT_BG_LOADED[i]) { bgIdx = i; bgImg = RESULT_BG_IMGS[i]; break; }
    }
  }
  // 黒で下地を敷いてから、画像をフェードインで重ねる
  gameCtx.fillStyle = '#100a04'; gameCtx.fillRect(0, 0, 800, 600);
  if (bgImg && RESULT_BG_LOADED[bgIdx]) {
    const FADE_MS = 900;
    const elapsed = performance.now() - (game.resultBgStartTime ?? performance.now());
    const alpha = Math.min(1, elapsed / FADE_MS);
    gameCtx.imageSmoothingEnabled = true;
    gameCtx.globalAlpha = alpha;
    gameCtx.drawImage(bgImg, 0, 0, 800, 600);
    gameCtx.globalAlpha = 1;
  }

  // 半透明黒パネル（テキストの可読性向上、本体）
  overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  roundedRect(overlayCtx, 80, 30, 640, 395, 14);
  overlayCtx.fill();

  overlayCtx.textAlign = 'center';
  overlayCtx.lineJoin  = 'round';
  const over10k = game.billTotal > 10000;

  // 内部ヘルパー：太い黒輪郭付きテキスト
  function strokeFill(text, x, y, color, strokeW) {
    overlayCtx.lineWidth = strokeW || 4;
    overlayCtx.strokeStyle = 'rgba(0,0,0,0.92)';
    overlayCtx.strokeText(text, x, y);
    overlayCtx.fillStyle = color;
    overlayCtx.fillText(text, x, y);
  }

  overlayCtx.font = 'bold 28px sans-serif';
  strokeFill('結 果 発 表', 400, 80, '#ffd740', 5);
  if (game.resultPhase >= 1) { overlayCtx.font = 'bold 18px sans-serif'; strokeFill('食べた皿数: ' + game.eaten.length + '皿', 400, 120, '#fff'); }
  if (game.resultPhase >= 2) { overlayCtx.font = 'bold 18px sans-serif'; strokeFill('合計金額: ' + game.billTotal + '円', 400, 150, '#fff'); }
  if (game.resultPhase >= 3) { overlayCtx.font = 'bold 18px sans-serif'; strokeFill('素の満足度: ' + Math.round(game.sat), 400, 180, '#ffce6b'); }

  if (game.resultPhase >= 4) {
    if (over10k) {
      overlayCtx.font = 'bold 17px sans-serif';
      strokeFill('10,000円超過！！', 400, 215, '#ff6666');
    } else {
      overlayCtx.font = 'bold 16px sans-serif';
      const pm = game.priceMult;
      const budget = game.budget ?? 3000;
      if (budget > 0) {
        strokeFill('価格補正: ' + budget + '÷' + game.billTotal + '=×' + pm.toFixed(2) + (pm > 1 ? ' (お得！)' : pm < 1 ? ' (高い…)' : ''), 400, 215, '#ddd');
      } else {
        strokeFill('価格補正: なし（自由に食え）', 400, 215, '#ddd');
      }
    }
  }

  if (game.resultPhase >= 5 && !over10k) {
    const pl = game.eaten.length;
    const lo = game.bestLo ?? 10;
    const hi = game.bestHi ?? 15;
    let label = '', color = '#fff';
    if      (pl < lo)  { label = '物足りない…（×' + game.fullnessMult.toFixed(2) + '）'; color = '#ffae5a'; }
    else if (pl <= hi) { label = '満腹！（補正なし）';                                    color = '#a4d96a'; }
    else               { label = '食べすぎた…！（×' + game.fullnessMult.toFixed(1) + '）'; color = '#ffae5a'; }
    overlayCtx.font = 'bold 16px sans-serif';
    strokeFill('満腹度補正: ' + pl + '皿 → ' + label, 400, 245, color);
  }

  if (game.resultPhase >= 6) {
    const sc = game.score;
    overlayCtx.font = 'bold 76px sans-serif';
    strokeFill(String(sc), 400, 340, sc === 0 ? '#ff6666' : '#ffd740', 8);

    let rankText = '', rankColor = '#ff9800';
    if      (over10k)    { rankText = '無銭飲食：お会計が高すぎる……！ 払えないぞ！！'; rankColor = '#ff6666'; }
    else if (sc >= 1800) { rankText = '神：究極の寿司体験！！';                         rankColor = '#ffd740'; }
    else if (sc >= 1100) { rankText = '特上：最高の寿司だったな！';                     rankColor = '#ff9800'; }
    else if (sc >= 600)  { rankText = '上：申し分のない寿司だった！';                   rankColor = '#a4d96a'; }
    else if (sc >= 420)  { rankText = '並：まあ……こんなもんかなあ';                     rankColor = '#fff';    }
    else                 { rankText = '下：あんまり良くなかった……';                     rankColor = '#ccc';    }

    overlayCtx.font = 'bold 17px sans-serif';
    const colonIdx = rankText.indexOf('：');
    if (rankText.length > 25) {
      strokeFill(rankText.slice(0, colonIdx + 1), 400, 385, rankColor);
      overlayCtx.font = 'bold 15px sans-serif';
      strokeFill(rankText.slice(colonIdx + 1), 400, 405, rankColor);
    } else {
      strokeFill(rankText, 400, 390, rankColor);
    }
  }

  if (game.anyKey) {
    if (Math.sin(performance.now() / 400) > 0.2) {
      // 押下プロンプト用の半透明パネル
      overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      roundedRect(overlayCtx, 220, 518, 360, 40, 10);
      overlayCtx.fill();
      overlayCtx.font = 'bold 20px sans-serif';
      strokeFill('Press Any Key', 400, 544, '#ffd740');
    }
  }

  overlayCtx.lineWidth = 1;
}
