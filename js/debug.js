// ===== デバッグモード =====
// URL に ?debug=1 を付けるか、 ゲーム中に F1 を押すとパネルが現れる。
// game-logic.js は DEBUG_OVERRIDE の存在を前提にしているので、
// このファイルは storage.js の直後に必ず読み込むこと。

const DEBUG_PARAMS = (() => {
  const params = new URLSearchParams(location.search);
  return {
    enabled: params.get('debug') === '1',
    stage:   parseInt(params.get('stage') || '0', 10),
  };
})();

const DEBUG_OVERRIDE = {
  irritateRate: null,    // null = 通常の config.irritateRate
  beltSpeed:    null,    // null = 通常の config.beltSpeed + full*0.5
  fixedPrices:  false,   // true = PRICE_CENTERS を時価とする
};

// debug=1 の時だけ全ステージ解放（プレイ用セーブには触らない：reload で戻る）
if (DEBUG_PARAMS.enabled) {
  unlockedStages = 5;
  prologueSeen   = true;
}

// ネタを1枚に並べたシートPNGを出力（全体把握・印刷用）
function debugExportNetaSheet() {
  const cols = 7, rows = 3;
  const cellW = 200, cellH = 170;
  const c = document.createElement('canvas');
  c.width = cols * cellW;
  c.height = rows * cellH;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(0, 0, c.width, c.height);

  for (let i = 0; i < NETA_LIST.length; i++) {
    const neta = NETA_LIST[i];
    const fileName = NETA_FILE_NAMES[i];
    const cx = (i % cols) * cellW;
    const cy = Math.floor(i / cols) * cellH;

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx + 0.5, cy + 0.5, cellW - 1, cellH - 1);

    pixelCtx.clearRect(0, 0, 200, 110);
    drawNeta(10, 4, neta, false);
    // pixelCanvas の (5,3)〜(15,10) → 10x7 範囲を 144x100 に拡大
    ctx.drawImage(pixelCanvas, 5, 3, 10, 7, cx + (cellW - 144) / 2, cy + 16, 144, 100);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(neta.nm, cx + cellW / 2, cy + cellH - 26);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(fileName + '.png', cx + cellW / 2, cy + cellH - 8);
  }

  const link = document.createElement('a');
  link.download = 'neta_sheet.png';
  link.href = c.toDataURL('image/png');
  link.click();
}

// ネタを個別PNGとして連続ダウンロード（36×24px、ゲーム実寸）
// ブラウザによっては「複数ダウンロードを許可」のプロンプトが出る
function debugExportNetaIndividual() {
  for (let i = 0; i < NETA_LIST.length; i++) {
    setTimeout(() => {
      const neta = NETA_LIST[i];
      const fileName = NETA_FILE_NAMES[i];
      const W = 36, H = 24;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      // 透過背景

      pixelCtx.clearRect(0, 0, 200, 110);
      drawNeta(10, 4, neta, false);
      // ネタ全範囲 (cx-4=6, y=4) から 9x6 ピクセルを 36x24 へ正確に4倍拡大
      ctx.drawImage(pixelCanvas, 6, 4, 9, 6, 0, 0, W, H);

      const link = document.createElement('a');
      link.download = fileName + '.png';
      link.href = c.toDataURL('image/png');
      link.click();
    }, i * 250);
  }
}

// VNキャラの下絵テンプレートPNGを生成（400×740、透過、顔位置ガイド付き）
function debugExportCharacterTemplate() {
  const W = 400, H = 740;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  // 枠線
  ctx.strokeStyle = 'rgba(150,150,200,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // 中央縦線
  ctx.strokeStyle = 'rgba(150,150,200,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();

  // 顔の参考楕円（上から1/4 あたり）
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.22, 90, 110, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 体の参考線
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.65, 150, 200, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 上下境界（顔の下、体の下）
  ctx.beginPath();
  ctx.moveTo(0, H * 0.36); ctx.lineTo(W, H * 0.36); ctx.stroke();

  // テキスト案内
  ctx.fillStyle = 'rgba(120,120,170,0.7)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('400 × 740  (game display: 200 × 370)', W / 2, 26);
  ctx.font = '12px sans-serif';
  ctx.fillText('character template (transparent bg)', W / 2, 46);
  ctx.fillText('save as: ore_normal.png / taisho_smile.png ...', W / 2, H - 14);

  const link = document.createElement('a');
  link.download = 'character_template.png';
  link.href = c.toDataURL('image/png');
  link.click();
}

// プレイ画面の背景だけをPNG出力（寿司・キャラ・UIなし、800×600、上下端は透過）
function debugExportBackground() {
  const W = 800, H = 600;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // pixelCanvas に背景のみを描画（render.js のプレイ描画から、寿司・キャラ部分を除いた抜粋）
  pixelCtx.fillStyle = '#2a1f14'; pixelCtx.fillRect(0, 0, 200, 110);
  pixelCtx.fillStyle = '#1a1520'; pixelCtx.fillRect(0, 0, 200, UPPER_BELT_Y);
  pixelCtx.fillStyle = '#3d2b18'; pixelCtx.fillRect(0, LOWER_BELT_Y + 10, 200, 110 - (LOWER_BELT_Y + 10));
  for (let y = LOWER_BELT_Y + 14; y < 110; y += 5) drawPixel(0, y, 200, 1, '#4a3520');
  pixelCtx.fillStyle = '#d4c4a8'; pixelCtx.fillRect(0, LOWER_BELT_Y + 10, 200, 12);
  drawBelt(UPPER_BELT_Y, 0, -1);
  drawBelt(LOWER_BELT_Y, 0,  1);

  // 800×600 の Y=120〜560 へ ×4 拡大転写。上(0〜120)と下(560〜600)は透過のまま
  ctx.drawImage(pixelCanvas, 0, 0, 200, 110, 0, 120, 800, 440);

  const link = document.createElement('a');
  link.download = 'background.png';
  link.href = c.toDataURL('image/png');
  link.click();
}

// 前ステージの状態（config, fadeout フラグ）をリセットする内部ヘルパー
function debugApplyStage(n) {
  currentStage = n;
  game.config = getStageConfig(currentStage);
  game.fadeoutTriggered = false;
  game.fadeoutProgress  = 0;
  document.getElementById('ui').style.opacity = '1';
  setBGMVolume(1);
}

// 任意ステージへ即ジャンプ（VNを経てゲーム開始）
function debugJumpToStage(n) {
  if (n < 1 || n > 5) return;
  debugApplyStage(n);
  stopBGM();
  hideGameUI();
  playVNScene(`Stage${n}_OPEN`, () => newGame());
}

// 任意VNシーンを再生（終了後はタイトルに戻る）
function debugPlayVN(key) {
  // シーンキーからステージ番号を抽出（例: "Stage3_OPEN" → 3）→ config を反映
  const match = key.match(/^Stage(\d+)_/);
  if (match) {
    const n = parseInt(match[1], 10);
    if (n >= 1 && n <= 5) debugApplyStage(n);
  } else {
    // ステージ非依存のシーン（PROLOGUE, Inter, Ending）は fadeout だけリセット
    game.fadeoutTriggered = false;
    game.fadeoutProgress  = 0;
    document.getElementById('ui').style.opacity = '1';
    setBGMVolume(1);
  }
  stopBGM();
  hideGameUI();
  playVNScene(key, () => { game.phase = 'title'; });
}

// パネル構築（DOMロード後・シナリオ読み込み済みの状態で実行）
let debugPanelInitialized = false;
function initDebugPanel() {
  if (debugPanelInitialized) return;
  debugPanelInitialized = true;
  // 初回構築時にステージ全解放（プレイ用セーブには触らず、リロードで戻る）
  unlockedStages = 5;
  prologueSeen   = true;

  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.classList.add('show');
  panel.innerHTML = `
    <div class="dh">DEBUG</div>
    <div>
      <strong>ステージ</strong><br>
      <button data-stage="1">1</button>
      <button data-stage="2">2</button>
      <button data-stage="3">3</button>
      <button data-stage="4">4</button>
      <button data-stage="5">5</button>
    </div>
    <div>
      <label><input type="checkbox" id="dbgFixed"> 時価を中央値に固定</label>
    </div>
    <div>
      イライラ速度 <span id="dbgIrrLabel">default</span><br>
      <input type="range" id="dbgIrr" min="0" max="20" step="1" value="6">
      <button id="dbgIrrReset">×</button>
    </div>
    <div>
      ベルト速度 <span id="dbgBeltLabel">default</span><br>
      <input type="range" id="dbgBelt" min="5" max="60" step="1" value="22">
      <button id="dbgBeltReset">×</button>
    </div>
    <div>
      <strong>VN任意再生</strong><br>
      <select id="dbgVN"></select>
      <button id="dbgVNPlay">▶</button>
    </div>
    <div>
      <strong>ネタPNG下書き</strong><br>
      <button id="dbgNetaSheet">シート1枚DL</button>
      <button id="dbgNetaIndividual">21枚個別DL (36×24)</button>
    </div>
    <div>
      <strong>キャラ下絵</strong><br>
      <button id="dbgCharTemplate">テンプレDL (400×740)</button>
    </div>
    <div>
      <strong>背景PNG</strong><br>
      <button id="dbgBgExport">現状の背景DL (800×600)</button>
    </div>
    <div>
      <button id="dbgSaveReset">セーブリセット&リロード</button>
    </div>
  `;
  document.body.appendChild(panel);

  // パネル内のボタンクリック後はフォーカスを外す
  // （フォーカスが残ると Space キーでクリックが暴発する）
  panel.addEventListener('click', e => {
    if (e.target instanceof HTMLElement) e.target.blur();
  });

  // ステージジャンプ
  panel.querySelectorAll('button[data-stage]').forEach(btn => {
    btn.addEventListener('click', () => {
      debugJumpToStage(parseInt(btn.getAttribute('data-stage'), 10));
    });
  });

  // 時価固定
  document.getElementById('dbgFixed').addEventListener('change', e => {
    DEBUG_OVERRIDE.fixedPrices = e.target.checked;
  });

  // イライラ速度
  const irrSlider = document.getElementById('dbgIrr');
  const irrLabel  = document.getElementById('dbgIrrLabel');
  irrSlider.addEventListener('input', () => {
    DEBUG_OVERRIDE.irritateRate = parseFloat(irrSlider.value);
    irrLabel.textContent = irrSlider.value + '%/s';
  });
  document.getElementById('dbgIrrReset').addEventListener('click', () => {
    DEBUG_OVERRIDE.irritateRate = null;
    irrLabel.textContent = 'default';
  });

  // ベルト速度
  const beltSlider = document.getElementById('dbgBelt');
  const beltLabel  = document.getElementById('dbgBeltLabel');
  beltSlider.addEventListener('input', () => {
    DEBUG_OVERRIDE.beltSpeed = parseFloat(beltSlider.value);
    beltLabel.textContent = beltSlider.value;
  });
  document.getElementById('dbgBeltReset').addEventListener('click', () => {
    DEBUG_OVERRIDE.beltSpeed = null;
    beltLabel.textContent = 'default';
  });

  // VN選択肢を埋める（scenario.scenes はこの時点で読み込み済み）
  const vnSelect = document.getElementById('dbgVN');
  const keys = Array.from(scenario.scenes.keys()).sort();
  for (const key of keys) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = key;
    vnSelect.appendChild(opt);
  }
  document.getElementById('dbgVNPlay').addEventListener('click', () => {
    debugPlayVN(vnSelect.value);
  });

  // ネタPNG出力
  document.getElementById('dbgNetaSheet').addEventListener('click', debugExportNetaSheet);
  document.getElementById('dbgNetaIndividual').addEventListener('click', debugExportNetaIndividual);

  // キャラテンプレ
  document.getElementById('dbgCharTemplate').addEventListener('click', debugExportCharacterTemplate);

  // 背景PNG出力
  document.getElementById('dbgBgExport').addEventListener('click', debugExportBackground);

  // セーブリセット
  document.getElementById('dbgSaveReset').addEventListener('click', () => {
    resetProgress();
    location.reload();
  });

  // ?stage=N で起動時自動ジャンプ
  if (DEBUG_PARAMS.stage >= 1 && DEBUG_PARAMS.stage <= 5) {
    setTimeout(() => debugJumpToStage(DEBUG_PARAMS.stage), 50);
  }
}

function toggleDebugPanel() {
  if (!debugPanelInitialized) {
    initDebugPanel();  // 初回は生成して表示
    return;
  }
  const panel = document.getElementById('debug-panel');
  if (panel) panel.classList.toggle('show');
}

// F1 でデバッグパネルを表示/非表示トグル
window.addEventListener('keydown', e => {
  if (e.key === 'F1') {
    e.preventDefault();
    toggleDebugPanel();
  }
});

// ?debug=1 で起動した場合のみ自動でパネル表示（シナリオ読み込み後）
window.addEventListener('load', () => {
  if (DEBUG_PARAMS.enabled) initDebugPanel();
});
