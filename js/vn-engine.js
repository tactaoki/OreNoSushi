// ===== ノベルゲーム（VN）エンジン =====
// 背景色、シナリオCSVの解析、シーン再生、フェード、描画を担当。

const BG_COLORS = {
  bg_cheap:     '#0d4a60', // 水色皿系：青緑
  bg_medium:    '#0d3d12', // 緑皿系：深緑
  bg_fancy:     '#4a2000', // 黄〜赤皿系：琥珀
  bg_rich:      '#3d0810', // 赤〜銀皿系：深紅
  bg_underpass: '#6b5210', // 銀〜金皿系：金
};

// VN背景PNG（assets/images/backgrounds/）。 PNGが読めれば優先、 無ければ BG_COLORS にフォールバック
const BG_PNG_NAMES = {
  bg_cheap:     'bg01',
  bg_medium:    'bg02',
  bg_fancy:     'bg03',
  bg_rich:      'bg04',
  bg_underpass: 'bg05',
};
const BG_SPRITES = {};
const BG_SPRITE_LOADED = {};

function preloadBackgrounds() {
  for (const key in BG_PNG_NAMES) {
    const img = new Image();
    img.onload  = () => { BG_SPRITE_LOADED[key] = true; };
    img.onerror = () => { BG_SPRITE_LOADED[key] = false; };
    img.src = `assets/images/backgrounds/${BG_PNG_NAMES[key]}.jpg`;
    BG_SPRITES[key] = img;
    trackImage(img);
  }
}

// VNキャラPNG（assets/images/characters/）。 ore20〜ore60、 taisho30〜taisho70
const CHAR_SPRITES = {};
const CHAR_SPRITE_LOADED = {};

// 大将は5枚（30/40/50/60/70）。主人公の年齢に対して10歳上を割り当て
const TAISHO_AGE_MAP = { 20: 30, 30: 40, 40: 50, 50: 60, 60: 70 };

function preloadCharacters() {
  // 主人公: 5枚（age=20,30,40,50,60）
  for (const age of [20, 30, 40, 50, 60]) {
    const key = 'ore' + age;
    const img = new Image();
    img.onload  = () => { CHAR_SPRITE_LOADED[key] = true; };
    img.onerror = () => { CHAR_SPRITE_LOADED[key] = false; };
    img.src = `assets/images/characters/${key}.png`;
    CHAR_SPRITES[key] = img;
    trackImage(img);
  }
  // 大将: 5枚（30/40/50/60/70）
  for (const age of [30, 40, 50, 60, 70]) {
    const key = 'taisho' + age;
    const img = new Image();
    img.onload  = () => { CHAR_SPRITE_LOADED[key] = true; };
    img.onerror = () => { CHAR_SPRITE_LOADED[key] = false; };
    img.src = `assets/images/characters/${key}.png`;
    CHAR_SPRITES[key] = img;
    trackImage(img);
  }
}

const scenario = { scenes: new Map(), loaded: false };

function parseAndStoreScenario(text) {
  const rows = parseCSV(text);
  let interCount = 0;
  for (let i = 1; i < rows.length; i++) {
    const stage      = (rows[i][0] || '').trim();
    const scene      = (rows[i][1] || '').trim();
    const type       = (rows[i][2] || '').trim();
    const speaker    = (rows[i][3] || '').trim();
    const expression = (rows[i][4] || '').trim();
    const content    = (rows[i][5] || '').trim();
    if (!stage && !type) continue;
    if (stage === 'ステージ') continue;
    let key;
    if      (stage === 'Inter')    key = `Inter_${interCount++}`;
    else if (stage === 'PROLOGUE') key = 'PROLOGUE';
    else if (stage === 'Ending')   key = 'Ending';
    else                           key = `${stage}_${scene}`;
    if (!scenario.scenes.has(key)) scenario.scenes.set(key, []);
    scenario.scenes.get(key).push({ type, speaker, expression, content });
  }
  scenario.loaded = true;
  console.log(`[VN] シナリオロード完了: ${scenario.scenes.size} シーン, 行数=${rows.length}`);
}

// ===== VN状態 =====
const vn = {
  events: [], index: 0,
  bg: null, leftChar: null, rightChar: null, dialog: null,
  fadeAlpha: 1, fadeTarget: 1, fadeCb: null,
  waitInput: false, onComplete: null,
  inputGuardUntil: 0,
};

function playVNScene(key, onComplete, guardMs) {
  const events = scenario.scenes.get(key);
  console.log(`[VN] シーン開始: key="${key}", events=${events ? events.length : 'なし'}`);
  if (!events || !events.length) { onComplete && onComplete(); return; }
  game.phase = 'vn';
  document.getElementById('ui').style.display = 'none';
  document.getElementById('keys').style.display = 'none';
  // VN BGM 開始（既に同じBGMが鳴っていれば再生継続）
  startBGM('vn');
  Object.assign(vn, {
    events, index: 0,
    bg: null, leftChar: null, rightChar: null, dialog: null,
    fadeAlpha: 1, fadeTarget: 1, fadeCb: null,
    waitInput: false, onComplete,
    inputGuardUntil: guardMs ? performance.now() + guardMs : 0,
  });
  processVNEvent();
}

function processVNEvent() {
  while (vn.index < vn.events.length) {
    const { type, speaker, expression, content } = vn.events[vn.index++];
    if (type === 'フェード') {
      startVNFade(speaker === '暗転' ? 1 : 0, processVNEvent); return;
    }
    if (type === '背景')     { vn.bg = content; continue; }
    if (type === 'キャラ') {
      const isLeft = speaker === '主人公';
      const val = content === '退場' ? null : { expression };
      if (isLeft) vn.leftChar = val; else vn.rightChar = val;
      continue;
    }
    if (type === 'ナレーション') { vn.dialog = { speaker: '', text: content }; vn.waitInput = true; return; }
    if (type === 'セリフ')       { vn.dialog = { speaker,     text: content }; vn.waitInput = true; return; }
  }
  // シーン終了
  if (vn.onComplete) { const cb = vn.onComplete; vn.onComplete = null; cb(); }
}

function startVNFade(target, cb) {
  if (Math.abs(vn.fadeAlpha - target) < 0.01) { cb(); return; }
  vn.fadeTarget = target; vn.fadeCb = cb;
}

function updateVN(dt) {
  if (Math.abs(vn.fadeAlpha - vn.fadeTarget) > 0.001) {
    const dir = vn.fadeTarget > vn.fadeAlpha ? 1 : -1;
    vn.fadeAlpha = Math.max(0, Math.min(1, vn.fadeAlpha + dir * 1.8 * dt));
    if ((dir > 0 && vn.fadeAlpha >= vn.fadeTarget) || (dir < 0 && vn.fadeAlpha <= vn.fadeTarget)) {
      vn.fadeAlpha = vn.fadeTarget;
      if (vn.fadeCb) { const cb = vn.fadeCb; vn.fadeCb = null; cb(); }
    }
  }
}

// ===== VN描画 =====
function renderVN() {
  // 背景：fadeoutステージのフェード完了後は白
  if (game.config?.fadeout && game.fadeoutTriggered) {
    gameCtx.fillStyle = '#fff';
    gameCtx.fillRect(0, 0, 800, 600);
  } else {
    // PNG が読めていればそれを描画、無ければ BG_COLORS の単色にフォールバック
    const img = BG_SPRITES[vn.bg];
    if (img && BG_SPRITE_LOADED[vn.bg]) {
      gameCtx.drawImage(img, 0, 0, 800, 600);
    } else {
      gameCtx.fillStyle = BG_COLORS[vn.bg] || '#000';
      gameCtx.fillRect(0, 0, 800, 600);
    }
  }

  // キャラクタープレースホルダー
  const talking = vn.dialog && vn.dialog.speaker;
  if (vn.leftChar)  drawVNChar(80,  '主人公', vn.leftChar.expression,  talking && vn.dialog.speaker === '親方');
  if (vn.rightChar) drawVNChar(520, '親方',   vn.rightChar.expression, talking && vn.dialog.speaker === '俺');

  // フェードオーバーレイ（キャラの上、ダイアログの下）
  // fadeoutステージのフェード完了後は白背景を維持したいので黒オーバーレイをかけない
  if (vn.fadeAlpha > 0 && !(game.config?.fadeout && game.fadeoutTriggered)) {
    overlayCtx.fillStyle = `rgba(0,0,0,${vn.fadeAlpha.toFixed(3)})`;
    overlayCtx.fillRect(0, 0, 800, 600);
  }

  // ダイアログ（フェードの上 → 常に見える）
  if (vn.dialog) renderVNDialog();
}

function drawVNChar(x, name, expression, dimmed) {
  const w = 200, h = 370, y = 40;

  // 年齢別PNGがあれば優先表示（主人公: ore20〜ore60、 大将: taisho30〜taisho70）
  const ageStage = game.config?.age ?? getStageConfig(currentStage)?.age ?? 20;
  let key = null;
  if (name === '主人公') key = 'ore' + ageStage;
  else if (name === '親方') key = 'taisho' + (TAISHO_AGE_MAP[ageStage] ?? 30);
  if (key) {
    const img = CHAR_SPRITES[key];
    if (img && CHAR_SPRITE_LOADED[key]) {
      overlayCtx.imageSmoothingEnabled = true;
      // 発言していない側は不透明のまま少し暗く（filter: brightness）
      if (dimmed) overlayCtx.filter = 'brightness(0.6)';
      overlayCtx.drawImage(img, x, y, w, h);
      overlayCtx.filter = 'none';
      return;
    }
  }

  // フォールバック：プレースホルダー（色矩形 + 名前と表情ラベル）
  const colors = { '主人公': '#2a4a6e', '親方': '#5c3318' };
  overlayCtx.fillStyle = colors[name] || '#444';
  roundedRect(overlayCtx, x, y, w, h, 8); overlayCtx.fill();
  overlayCtx.strokeStyle = 'rgba(255,255,255,0.15)'; overlayCtx.lineWidth = 1;
  roundedRect(overlayCtx, x, y, w, h, 8); overlayCtx.stroke();
  overlayCtx.fillStyle = 'rgba(255,255,255,0.7)';
  overlayCtx.font = 'bold 16px sans-serif'; overlayCtx.textAlign = 'center';
  overlayCtx.fillText(name, x + w / 2, y + h / 2 - 8);
  overlayCtx.font = '13px sans-serif'; overlayCtx.fillStyle = 'rgba(255,255,255,0.4)';
  overlayCtx.fillText(expression, x + w / 2, y + h / 2 + 14);
  // 発言していない側は黒い半透明レイヤーを重ねて暗く
  if (dimmed) {
    overlayCtx.fillStyle = 'rgba(0,0,0,0.45)';
    roundedRect(overlayCtx, x, y, w, h, 8); overlayCtx.fill();
  }
}

function renderVNDialog() {
  const { speaker, text } = vn.dialog;
  const bx = 20, by = 410, bw = 760, bh = 148;

  // ボックス背景
  overlayCtx.fillStyle = 'rgba(0,0,0,0.88)';
  roundedRect(overlayCtx, bx, by, bw, bh, 8); overlayCtx.fill();
  overlayCtx.strokeStyle = 'rgba(255,215,0,0.35)'; overlayCtx.lineWidth = 1;
  roundedRect(overlayCtx, bx, by, bw, bh, 8); overlayCtx.stroke();

  // 話者名
  let textY = by + 26;
  if (speaker) {
    overlayCtx.font = 'bold 16px sans-serif'; overlayCtx.fillStyle = '#ffd740';
    overlayCtx.textAlign = 'left';
    overlayCtx.fillText(speaker, bx + 18, by + 24);
    textY = by + 50;
  }

  // 本文（改行対応）
  overlayCtx.font = '18px sans-serif'; overlayCtx.fillStyle = '#fff';
  overlayCtx.textAlign = 'left';
  text.split('\n').forEach((line, i) => {
    overlayCtx.fillText(line.trim(), bx + 18, textY + i * 28);
  });

  // 次へ▼（フェード完了後のみ点滅）
  const fadeDone = Math.abs(vn.fadeAlpha - vn.fadeTarget) < 0.01;
  if (fadeDone && Math.sin(performance.now() / 320) > 0) {
    overlayCtx.font = '14px sans-serif'; overlayCtx.fillStyle = '#ffd740';
    overlayCtx.textAlign = 'right';
    overlayCtx.fillText('▼', bx + bw - 14, by + bh - 10);
  }
}
