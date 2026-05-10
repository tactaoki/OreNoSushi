// ===== ゲームコア処理 =====
// データ定義、ゲーム状態、入力、アクション、更新ループ。

// ===== データ定義 =====
// PLATES.price と PLATES.base は neta-base.csv で上書きされる（同ランクの最初の行を採用）。
// ここの値は CSV読み込み失敗時のフォールバック。
const PLATES = [
  { nm: '水色皿',   rk: 0, c: '#4fc3f7', price: 100, base: 30 },
  { nm: '緑色皿',   rk: 1, c: '#2e7d32', price: 200, base: 45 },
  { nm: '黄色皿',   rk: 2, c: '#f9a825', price: 300, base: 55 },
  { nm: '赤色皿',   rk: 3, c: '#c62828', price: 400, base: 60 },
  { nm: '銀色皿',   rk: 4, c: '#9e9e9e', price: 500, base: 70 },
  { nm: '金色皿',   rk: 5, c: '#111',    price: 800, base: 80 }
];

// neta-base CSV から PLATES の price と base を読み込み（rankごとに最初の行を採用）
(function loadNetaBase() {
  const el = document.getElementById('neta-base-data');
  if (!el) return;
  const rows = parseCSV(el.textContent);
  if (rows.length < 2) return;
  const headers = rows[0].map(h => h.trim());
  const I = {
    rank:  headers.indexOf('rank'),
    price: headers.indexOf('base_price'),
    base:  headers.indexOf('base_satisfaction'),
  };
  if (I.rank < 0 || I.price < 0 || I.base < 0) return;
  const seen = {};
  for (let i = 1; i < rows.length; i++) {
    const r  = rows[i];
    const rk = parseInt(r[I.rank], 10);
    if (isNaN(rk) || seen[rk] || !PLATES[rk]) continue;
    seen[rk] = true;
    const price = parseInt(r[I.price], 10);
    const base  = parseInt(r[I.base], 10);
    if (!isNaN(price)) PLATES[rk].price = price;
    if (!isNaN(base))  PLATES[rk].base  = base;
  }
})();

const PLATE_COLORS = PLATES.map(p => p.c);
const PLATE_NAMES  = PLATES.map(p => p.nm);

// 時価システム：ゲーム開始時にこの中央値±スプレッドでランダム決定
const PRICE_CENTERS = PLATES.map(p => p.price);
const PRICE_SPREADS = [ 20,  50,  80, 120, 180, 300];

const NETA_LIST = [
  { nm: '納豆巻',    rk: 0, tc: '#3e2723', gn: 1 },
  { nm: 'カッパ巻',  rk: 0, tc: '#4caf50', gn: 1 },
  { nm: 'ツナマヨ',  rk: 0, tc: '#ffcc80', gn: 1 },
  { nm: 'タマゴ',    rk: 0, tc: '#f9a825'        },
  { nm: 'コハダ',    rk: 0, tc: '#90a4ae'        },
  { nm: 'シメサバ',  rk: 1, tc: '#607d8b'        },
  { nm: 'イカ',      rk: 1, tc: '#ddd'           },
  { nm: 'エビ',      rk: 1, tc: '#ef9a9a'        },
  { nm: 'マグロ',    rk: 1, tc: '#c62828'        },
  { nm: 'サーモン',  rk: 1, tc: '#ff7043'        },
  { nm: 'アジ',      rk: 2, tc: '#78909c'        },
  { nm: 'カツオ',    rk: 2, tc: '#b71c1c'        },
  { nm: 'エンガワ',  rk: 2, tc: '#e0e0e0'        },
  { nm: 'ホタテ',    rk: 2, tc: '#fff9c4'        },
  { nm: 'タイ',      rk: 3, tc: '#ffcdd2'        },
  { nm: 'ウナギ',    rk: 3, tc: '#5d4037'        },
  { nm: 'カンパチ',  rk: 3, tc: '#f48fb1'        },
  { nm: '中トロ',    rk: 4, tc: '#e91e63'        },
  { nm: 'ズワイガニ',rk: 4, tc: '#bf360c'        },
  { nm: '大トロ',    rk: 5, tc: '#c62828'        },
  { nm: 'ウニ',      rk: 5, tc: '#e65100', gn: 1 }
];

const NETA_BY_RANK = [[], [], [], [], [], []];
NETA_LIST.forEach(n => NETA_BY_RANK[n.rk].push(n));

// NETA_LIST と一対一対応するファイル名（assets/images/neta/ 用）
const NETA_FILE_NAMES = [
  'natto', 'kappa', 'tunamayo', 'tamago', 'kohada',
  'shimesaba', 'ika', 'ebi', 'maguro', 'salmon',
  'aji', 'katsuo', 'engawa', 'hotate', 'tai',
  'unagi', 'kanpachi', 'chutoro', 'zuwaikani', 'otoro', 'uni'
];

// Stage5（fadeout=true）専用テキスト：scenario.csv の Stage5_FADEOUT_LINES / Stage5_FADEOUT_CENTER から読み込む
let STAGE5_LINES = [];
let STAGE5_CENTER_TEXT = 'これが……俺の寿司だ';

const HINTS = [
  'おすすめを連続で食べるとコンボ発生！満足度がどんどん増える。',
  '皿の値段は時価。ガリを食べると次の皿の値段が分かるかも。',
  'お茶を飲むとイライラがリセット。飲み過ぎ注意（4秒操作不能）。',
  'おすすめ以外を食べてもペナルティはない。でもコンボは切れる。',
  'イライラが50%を超えると満足度が減り続ける。注意しよう。',
  'ガリは2回まで。次に食べた皿の値段を見破れる。',
  '10〜15皿がちょうどいい。少なすぎても食べすぎてもマイナス。',
  '会計は3000円がベスト。安すぎても高すぎても補正がかかる。',
  '後半になるほどレーンに高いネタが流れてくる。',
  'おすすめのネタがレーンに見えたら素早く取ろう。',
  '寿司を食べたいおっさんの後ろ姿に哀愁があっていいよね。'
];

// ステージ別ヒント（stage-hints.csv → index.html 埋め込み から読み込む）
const STAGE_HINTS = { 1: [], 2: [], 3: [], 4: [], 5: [] };
(function loadStageHints() {
  const el = document.getElementById('stage-hints-data');
  if (!el) return;
  const rows = parseCSV(el.textContent);
  if (rows.length < 2) return;
  for (let i = 1; i < rows.length; i++) {
    const stage = parseInt(rows[i][0], 10);
    const hint  = (rows[i][1] || '').trim();
    if (!isNaN(stage) && hint && STAGE_HINTS[stage]) {
      STAGE_HINTS[stage].push(hint);
    }
  }
})();

// ===== ユーティリティ =====
// 正規分布で中央寄りのランダム値（min〜max の範囲）
function normRand(min, max) {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  const t = Math.max(-2.5, Math.min(2.5, z));
  return min + (max - min) * ((t + 2.5) / 5);
}

// 時価をゲーム開始時に決定
function rollPrices() {
  if (DEBUG_OVERRIDE.fixedPrices) return PRICE_CENTERS.slice();
  const prices = [];
  for (let rank = 0; rank < 6; rank++) {
    const raw = normRand(PRICE_CENTERS[rank] - PRICE_SPREADS[rank], PRICE_CENTERS[rank] + PRICE_SPREADS[rank]);
    prices[rank] = Math.round(raw / 10) * 10;
  }
  return prices;
}

function rand(min, max) { return min + Math.random() * (max - min); }

// ===== レーン生成 =====
let laneHistory = [];

// 安いほど多く、後半は高いネタ増加、直前2つと被らない
function randomLaneSushi() {
  const maxRank = game.config?.maxPlateRank ?? 5;
  const maxFull = game.config?.maxFull || 20;
  const progress = (game.full || 0) / maxFull;
  const pool = NETA_LIST.filter(n => n.rk <= maxRank);
  const weights = pool.map(n => {
    const base = 3 - n.rk * 0.5;
    const late = progress * n.rk * 0.8;
    return Math.max(0.05, base + late);
  });
  for (let attempt = 0; attempt < 30; attempt++) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let pick = pool[0];
    for (let j = 0; j < pool.length; j++) {
      r -= weights[j];
      if (r <= 0) { pick = pool[j]; break; }
    }
    if (!laneHistory.includes(pick.nm)) {
      laneHistory.push(pick.nm);
      if (laneHistory.length > 2) laneHistory.shift();
      return pick;
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// 食べた枚数に応じたおすすめ候補の最大ランク
function maxRecommendRank(platesEaten) {
  let cap = 5;
  if      (platesEaten <= 0) cap = 0;
  else if (platesEaten <= 3) cap = 1;
  else if (platesEaten <= 6) cap = 2;
  else if (platesEaten <= 9) cap = 3;
  return Math.min(cap, game.config?.maxPlateRank ?? 5);
}

// おすすめを1件選ぶ（食べ済み・既表示と被らない）
// targetRank以下のすべての候補から、ランクで重み付けしてランダム抽選。
// 高ランクほど確率は高いが、低ランクも一定の確率で出てコンボを繋ぎやすい。
// プール枯渇時（食べ尽くし）は「食べた除外」を解除して、現在表示中のおすすめだけ除外で再抽選する。
function pickOneRecommend(existing) {
  const targetRank = maxRecommendRank(game.full || 0);
  const recExclude = existing.map(e => e.nm);
  const fullExclude = recExclude.concat(game.eatenNeta || []);

  // 1段階目：表示中のおすすめ＋食べ済みを除外
  let candidates = [];
  for (let rk = 0; rk <= targetRank; rk++) {
    for (const n of NETA_BY_RANK[rk]) {
      if (!fullExclude.includes(n.nm)) candidates.push(n);
    }
  }
  // 2段階目：プール枯渇時は「食べ済み」を許して再抽選（表示中のみ除外）
  if (!candidates.length) {
    for (let rk = 0; rk <= targetRank; rk++) {
      for (const n of NETA_BY_RANK[rk]) {
        if (!recExclude.includes(n.nm)) candidates.push(n);
      }
    }
  }
  if (!candidates.length) return null;

  // 重み: 1 + rk * 0.5 → ランク0=1.0, ランク5=3.5
  const weights = candidates.map(n => 1 + n.rk * 0.5);
  const total   = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

// ゲーム開始時のおすすめ（ランク0から1件）
function genInitialRecommends() {
  const pool = NETA_BY_RANK[0].slice();
  if (!pool.length) return [];
  return [pool[Math.floor(Math.random() * pool.length)]];
}

// ===== 進行状態 =====
let currentStage      = 1;
let stageSelectCursor = 0;
let titleFlashTimer   = 0;
const INTER_MAP       = { 1: 'Inter_0', 4: 'Inter_1' };

// ===== ゲーム状態 =====
let game = { phase: prologueSeen ? 'title' : 'prologue' };

function newGame() {
  laneHistory = [];
  const config = getStageConfig(currentStage) || {
    maxPlateRank: 5, budget: 0, irritateRate: 6, beltSpeed: 22,
    maxFull: 20, scoreMode: 'combo', tea: true, gari: true, fadeout: false
  };
  const gamePrices = rollPrices();
  // 皿の値段ヒント状態: 0=不明, 1=高め/安め, 2=確定
  const cardState = [0, 0, 0, 0, 0, 0];
  const cardHint  = [null, null, null, null, null, null];

  game = {
    phase: 'play',
    config,
    gamePrices,
    cardState,
    cardHint,
    upper:   [],
    lower:   [],
    pending: [],
    spawnTimer:  0.3,
    handX:       130,
    recommends:  null,
    combo:       0,
    comboLabel:  '',
    comboLabelTimer: 0,
    comboShown:  0,
    full:        0,
    sat:         0,
    totalCost:   0,
    irritate:    0,
    lastEat:     0,
    time:        0,
    decaying:    false,
    penaltyTriggered: false,
    irritateSaid:     [false, false, false],
    billSaid:    false,
    gariUsed:    false,
    gariNextReveal: false,
    bubbleText:  '',
    bubbleTimer: 0,
    eaten:       [],
    eatenNeta:   [],
    plateCnt:    [0, 0, 0, 0, 0, 0],
    teaTimer:    0,
    gari:        config.gari ? 3 : 0,
    fadeoutProgress:   0,
    fadeoutTriggered:  false,
    centerTextStartAt: 0,
    flash:       0,
    flashCol:    '',
    cardFlash:   [0, 0, 0, 0, 0, 0],
    popups:      [],
    beltSpeed:   22,
    paused:      false,
    pauseSel:    0,
    billPhase:   0,
    billStep:    0,
    billWait:    0,
    billTotal:   0,
    score:       0,
    priceMult:   1,
    fullnessMult:1,
    billListDone:  false,
    billKeyReady:  false,
    resultPhase:   0,
    resultWait:    0,
    anyKey:        false
  };

  game.recommends = genInitialRecommends();
  for (let i = 0; i < 10; i++) game.lower.push({ x: 10 + i * 20, data: randomLaneSushi() });
  for (let i = 0; i < 8;  i++) game.upper.push({ x:  8 + i * 25, data: randomLaneSushi() });

  // バーをアニメーションなしで0にリセット
  resetStatusBars();
  showGameUI();
  document.getElementById('ui').style.opacity = '1';
  setBGMVolume(1);

  stopBGM();
  startBGM('play');
}

// ===== 入力 =====
const keys = {};

document.addEventListener('click', () => {
  if (game.phase === 'prologue') {
    resumeAudio();
    audioInitialized = true;
    prologueSeen = true;
    saveProgress();
    startBGM('title');
    game.phase = 'title';
    return;
  }
  tryInitAudio();
}, { once: false });

window.addEventListener('keydown', e => {
  // 押しっぱなしによるOSキーリピートは無視（grabやVN進行が暴発するのを防ぐ）
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  // Space は常にデフォルト挙動（フォーカスされた button をクリック扱いする等）を抑制
  if (k === ' ') e.preventDefault();

  // プロローグ画面：何か押したらオーディオ初期化してプロローグVNへ
  if (game.phase === 'prologue') {
    resumeAudio();
    audioInitialized = true;
    prologueSeen = true;
    saveProgress();
    startBGM('title');
    game.phase = 'title';
    return;
  }

  if (game.phase !== 'prologue') tryInitAudio();

  // VN中のスペース処理
  if (game.phase === 'vn' && k === ' ') {
    e.preventDefault();
    if (performance.now() < vn.inputGuardUntil) return;
    const fadeDone = Math.abs(vn.fadeAlpha - vn.fadeTarget) < 0.01;
    if (!fadeDone) {
      // フェードをスキップして即完了
      vn.fadeAlpha = vn.fadeTarget;
      if (vn.fadeCb) { const cb = vn.fadeCb; vn.fadeCb = null; cb(); }
    } else if (vn.waitInput) {
      vn.waitInput = false;
      // vn.dialog はクリアしない：次のセリフ/シーン開始で上書きされる。
      // これによりフェードアウト中も最後のダイアログが残って一緒にフェードする。
      processVNEvent();
    }
    return;
  }

  if (game.phase === 'title') {
    if (k === 'r') {
      resetProgress();
      titleFlashTimer = 0.5;
      stopBGM();
      return;
    }
    // フラッシュ進行中は無視（連打防止）
    if (titleFlashTimer > 0) return;
    // 軽くフラッシュ → タイマー終了で stageselect へ遷移
    titleFlashTimer = 0.35;
    game.titleExiting = true;
    return;
  }

  if (game.phase === 'stageselect') {
    if (performance.now() < (game.stageSelectGuardUntil || 0)) return;
    const prevCursor = stageSelectCursor;
    if (k === 'a' || k === 'arrowleft')  stageSelectCursor = Math.max(0, stageSelectCursor - 1);
    if (k === 'd' || k === 'arrowright') stageSelectCursor = Math.min(4, stageSelectCursor + 1);
    if (stageSelectCursor !== prevCursor) sfxEatMid();
    if (k === ' ') {
      const sel = stageSelectCursor + 1;
      if (sel <= unlockedStages) {
        sfxEatGreat();
        currentStage = sel;
        // 前回プレイの状態をリセット（特に Stage5 fadeout 後の残留が
        // 次の VN 描画を白くしてしまうのを防ぐ）
        game.config = getStageConfig(currentStage);
        game.fadeoutTriggered = false;
        game.fadeoutProgress  = 0;
        stopBGM();
        playVNScene(`Stage${currentStage}_OPEN`, () => newGame());
      }
    }
    return;
  }

  if (game.phase === 'choice') {
    if (performance.now() < (game.choiceGuardUntil || 0)) return;
    if (k === 'a' || k === 'arrowleft' || k === 'd' || k === 'arrowright') {
      game.choiceSel = 1 - game.choiceSel;
      sfxEatMid();
    }
    if (k === ' ') {
      sfxEatGreat();
      if (game.choiceSel === 0) {
        newGame();
      } else {
        game.phase = 'title';
      }
    }
    return;
  }

  if (game.phase === 'ending' && game.endingReady) {
    game.phase = 'title';
    stopBGM();
    return;
  }

  if (game.paused) {
    if (k === 'a' || k === 'arrowleft' || k === 'd' || k === 'arrowright') {
      game.pauseSel = 1 - game.pauseSel;
      sfxEatMid();
    }
    if (k === ' ') {
      sfxEatGreat();
      if (game.pauseSel === 0) game.paused = false; else newGame();
    }
    if (k === 'escape') game.paused = false;
    return;
  }

  if (game.phase === 'result' && game.anyKey) {
    stopBGM();
    hideGameUI();
    const stage = currentStage;
    if (game.score >= 600) {
      if (stage >= unlockedStages) {
        unlockedStages = stage + 1;
        saveProgress();
      }
      playVNScene(`Stage${stage}_CLEAR`, () => {
        const afterInter = () => {
          if (stage === 5) {
            playVNScene('Ending', () => { game.phase = 'ending'; game.endingWait = 3; game.endingReady = false; }, 800);
          } else {
            game.phase = 'stageselect';
            // クリアしたステージの次にカーソルを移動（解放範囲内に収める）
            stageSelectCursor = Math.min(unlockedStages - 1, stage);
            // 連打吸収用の入力ガード
            game.stageSelectGuardUntil = performance.now() + 800;
          }
        };
        const interKey = INTER_MAP[stage];
        if (interKey) playVNScene(interKey, afterInter, 800);
        else afterInter();
      }, 800);
    } else {
      playVNScene(`Stage${stage}_RETRY`, () => {
        game.phase = 'choice';
        game.choiceSel = 0;
        game.choiceGuardUntil = performance.now() + 800;
      }, 800);
    }
    return;
  }

  if (game.phase === 'billing' && game.billKeyReady) {
    game.phase = 'result';
    game.resultPhase = 0;
    game.resultWait  = 0.8;
    game.anyKey      = false;
    game.billKeyReady = false;
    game.resultBgIdx = undefined;  // 次回 renderResult が新たにランダム選択する

    const cfg     = game.config || {};
    const budget  = cfg.budget  ?? 3000;
    const maxFull = cfg.maxFull ?? 20;
    const plateCount = game.eaten.length;

    // 価格補正：budget=0 のステージは補正なし（divide-by-zero回避）
    let priceMult = 1;
    if (budget > 0 && game.billTotal > 0) priceMult = budget / game.billTotal;

    // 満腹度補正：ベスト範囲は maxFull の 0.6〜0.8 倍
    const bestLo = Math.max(1, Math.floor(maxFull * 0.6));
    const bestHi = Math.max(bestLo, Math.floor(maxFull * 0.8));
    let fullnessMult = 1;
    if      (plateCount < bestLo)  fullnessMult = Math.max(0.1, 1 - (bestLo - plateCount) * 0.1);
    else if (plateCount <= bestHi) fullnessMult = 1;
    else                           fullnessMult = Math.max(0.1, 1 - (plateCount - bestHi) * 0.1);

    game.priceMult    = priceMult;
    game.fullnessMult = fullnessMult;
    game.bestLo       = bestLo;
    game.bestHi       = bestHi;
    game.budget       = budget;
    game.score        = game.billTotal > 10000 ? 0 : Math.round(game.sat * priceMult * fullnessMult);
    return;
  }

  keys[k] = true;
  if (k === ' ') e.preventDefault();

  if (k === 'escape' && game.phase === 'play') {
    if (game.fadeoutTriggered) return;
    game.paused = true; game.pauseSel = 0; return;
  }

  if (game.phase === 'play') {
    if (game.fadeoutTriggered) return;
    if (game.teaTimer > 0) return;
    if      (k === 'q') startBill();
    else if (k === 'z') {
      if (game.config?.tea) startTea();
      else { sfxBuzz(); showBubble('お茶は置いてないみたいだ', 2); }
    }
    else if (k === 'e') {
      if (game.config?.gari) eatGari();
      else { sfxBuzz(); showBubble('ガリは出てこないみたいだ', 2); }
    }
    else if (k === ' ') grab();
  }
});

window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// ===== アクション =====
function startTea() {
  game.phase     = 'tea';
  game.teaTimer  = 3;
  sfxGulp();
  showBubble('ゴクゴクゴク……', 3);
}

function startBill() {
  if (game.eaten.length === 0) { showBubble('まだ何も食べてないぞ！', 2); return; }
  // プレイ画面をフリーズして「お勘定」演出を挟む。1.5秒後に enterBillingScreen() へ
  game.phase = 'bill_intro';
  game.billIntroTimer = 1.5;
  stopBGM();
  sfxBillIntro();
}

function enterBillingScreen() {
  game.phase       = 'billing';
  game.billPhase   = 0;
  game.billStep    = 0;
  game.billWait    = 0.8;
  game.billListDone = false;
  game.billKeyReady = false;
  game.billTotal   = game.totalCost;
  sfxJingle();
  startBGM('bill');
  hideGameUI();
}

function showBubble(text, duration, force) {
  // fadeoutステージでは通常bubbleを抑制（force=trueで強制表示）
  if (!force && game.config?.fadeout) return;
  game.bubbleText  = text;
  game.bubbleTimer = duration || 3;
}

function addPopup(text, color, size) {
  game.popups.push({ txt: text, y: 0, life: 2, col: color || '#ffd740', sz: size || 20 });
}

function eatGari() {
  if (game.gari <= 0) { sfxBuzz(); showBubble('もうガリはない！', 2); return; }
  game.gari--;
  sfxGari();
  game.flash    = 0.4;
  game.flashCol = 'rgba(200,255,200,';
  game.gariNextReveal = true;
  // ガリを食べるとおすすめを即切り替え
  const prevRec = game.recommends.slice();
  game.recommends = [];
  const newRec = pickOneRecommend(prevRec);
  if (newRec) game.recommends.push(newRec);
  showBubble('口の中がさっぱりした！！', 3);
}

function grab() {
  // 終了演出中は掴めない
  if (game.fadeoutTriggered) return;
  // 満腹上限に達した後は掴めない（会計演出の0.6秒の間に食べ続けるのを防ぐ）
  const maxFull = game.config?.maxFull ?? 20;
  if (game.full >= maxFull) return;
  let best = null, bestDist = 20;
  for (const sushi of game.lower) {
    const dist = Math.abs(sushi.x - game.handX);
    if (dist < bestDist) { bestDist = dist; best = sushi; }
  }
  if (!best) return;
  game.lower = game.lower.filter(s => s !== best);
  eat(best.data);
}

function eat(neta) {
  const rank  = neta.rk;
  const price = game.gamePrices[rank];
  const base  = PLATES[rank].base;

  game.eaten.push({ neta, ri: rank, price });
  game.eatenNeta.push(neta.nm);
  game.plateCnt[rank]++;
  game.totalCost += price;
  game.irritate   = Math.max(0, game.irritate - 20);
  game.cardFlash[rank] = 0.4;

  // ガリ効果：次に食べた皿の値段を確定表示
  if (game.gariNextReveal) {
    game.gariNextReveal = false;
    if (game.cardState[rank] < 2) { game.cardState[rank] = 2; game.cardHint[rank] = price; }
    showBubble('間違いない、これは' + price + '円だ！', 3);
  }

  // おすすめ判定（fadeoutステージは何を食べてもおすすめ扱い）
  const recIdx     = game.recommends.findIndex(r => r.nm === neta.nm);
  const matchedRec = recIdx >= 0;
  const isRec      = game.config?.fadeout || matchedRec;
  let mult = 1.0;

  if (isRec) {
    game.combo++;
    mult = Math.min(2.5, 1.0 + game.combo * 0.5); // 1連×1.5, 2連×2.0, 3連×2.5
    showBubble('美味い！！', 2);
    sfxEatGreat();
    game.flash    = 0.5;
    game.flashCol = 'rgba(255,215,0,';
    const c = game.combo;
    game.comboLabel      = c === 1 ? 'combo!' : c === 2 ? 'combo x2!!' : 'combo x3!!!';
    game.comboLabelTimer = 2;
    game.comboShown      = c; // 描画派手度用
    if (game.combo >= 3) { game.combo = 0; } // 3連でリセット（ラベルはタイマー切れまで残す）
    let prevRec;
    if (matchedRec) {
      game.recommends.splice(recIdx, 1);
      prevRec = game.recommends;
    } else {
      // fadeoutステージ：実際は不一致だがisRec扱い。直前のおすすめを退避してから入れ替え
      prevRec = game.recommends.slice();
      game.recommends = [];
    }
    const newRec = pickOneRecommend(prevRec);
    if (newRec) game.recommends.push(newRec);
  } else {
    game.combo      = 0;
    game.comboLabel = '';
    sfxEatMid();
    const recRank = game.recommends.length > 0 ? game.recommends[0].rk : -1;
    if (rank === recRank) { mult = 0.8; showBubble('まあ、値段は一緒だし……', 2); }
    else                  { mult = 0.5; showBubble('とりあえずこれでも食っておくか', 2); }
  }

  const earned = Math.round(base * mult);

  // 食べたときの独り言（値段ヒント、おすすめ時はスキップ）
  if (!isRec) {
    const r = Math.random();
    if (r < 0.1 && game.cardState[rank] < 2) {
      game.cardState[rank] = 2; game.cardHint[rank] = price;
      showBubble('これは' + price + '円だ！', 3);
    } else if (r < 0.3 && game.cardState[rank] === 0) {
      const hint = price >= PRICE_CENTERS[rank] ? '高め' : '安め';
      game.cardState[rank] = 1; game.cardHint[rank] = hint;
      showBubble(price >= PRICE_CENTERS[rank] ? '高めだな……' : '安めだな', 2);
    }
  } else if (game.combo >= 2) {
    setTimeout(() => { if (game.bubbleTimer <= 0) showBubble('寿司最高！', 1.5); }, 500);
  }

  game.sat    += earned;
  game.full++;
  game.lastEat = game.time;

  if (game.totalCost > 4000 && !game.billSaid) { game.billSaid = true; showBubble('……会計が気になるな', 2.5); }

  let popColor = '#aaa', popSize = 18;
  if      (earned >= 200) { popColor = '#ffd740'; popSize = 38; }
  else if (earned >= 100) { popColor = '#ff9800'; popSize = 32; }
  else if (earned >= 60)  { popColor = '#4caf50'; popSize = 26; }
  else if (earned >= 30)  { popColor = '#fff';    popSize = 22; }
  addPopup('+' + earned, popColor, popSize);
  sfxChew();

  // おすすめ外を食べてもおすすめを即切り替え
  if (!isRec) {
    const prevRec = game.recommends.slice();
    game.recommends = [];
    const newRec = pickOneRecommend(prevRec);
    if (newRec) game.recommends.push(newRec);
  }

  const maxFull = game.config?.maxFull ?? 20;
  if (game.full === maxFull - 4) showBubble('そろそろ腹がきつい……', 2);
  if (game.full >= maxFull && !game.billPending) {
    game.billPending = true;
    showBubble('は、腹がもう限界だ……！', 2);
    setTimeout(startBill, 1800);
  }

  // Stage5フェードアウト演出
  if (game.config?.fadeout && !game.fadeoutTriggered) {
    // 皿数比で進行（浮動小数誤差を避けるため整数除算ベース）
    const total = STAGE5_LINES.length || 10;
    game.fadeoutProgress = Math.min(1, game.eaten.length / total);
    setBGMVolume(Math.max(0, 1 - game.fadeoutProgress));
    // 既存bubble（「美味い！！」等）の後に独り言を上書き表示
    const idx = Math.min(STAGE5_LINES.length - 1, game.eaten.length - 1);
    setTimeout(() => showBubble(STAGE5_LINES[idx], 3, true), 800);
    if (game.fadeoutProgress >= 1) {
      game.fadeoutTriggered = true;
      // 完全白 → 1.2秒の間 → 白背景上にダイアログ → スペース → 中央テキスト → 自動でFIN
      setTimeout(() => {
        stopBGM();
        hideGameUI();
        document.getElementById('ui').style.opacity = '1';
        setBGMVolume(1);
        if (currentStage >= unlockedStages) {
          unlockedStages = currentStage + 1;
          saveProgress();
        }
        playVNScene('Ending', () => {
          // ダイアログ完了後、中央テキスト表示モードへ
          game.phase = 'stage5_center';
          game.centerTextStartAt = performance.now();
        }, 1200);
      }, 1200);
    }
  }
}

// ===== 更新 =====
function update(dt) {
  if (game.paused) return;

  if (game.phase !== 'title') titleStartTime = null;

  if (titleFlashTimer > 0) {
    titleFlashTimer = Math.max(0, titleFlashTimer - dt);
    if (titleFlashTimer === 0 && game.phase === 'title' && game.titleExiting) {
      game.titleExiting = false;
      // タイトルとステージ選択は同じBGM(Title.mp3)を共有するので、停止せず継続
      game.phase = 'stageselect';
      stageSelectCursor = 0;
    }
  }

  if (game.phase === 'vn') { updateVN(dt); return; }

  if (game.phase === 'ending') {
    if (game.endingWait > 0) { game.endingWait -= dt; if (game.endingWait <= 0) game.endingReady = true; }
    return;
  }

  if (game.phase === 'bill_intro') {
    game.billIntroTimer -= dt;
    if (game.billIntroTimer <= 0) enterBillingScreen();
    return;
  }

  if (game.phase === 'stage5_center') {
    // 純白0.8秒 → 2秒フェードイン → 2秒静止 → 自動で 'ending'（合計4.8秒）
    if (performance.now() - game.centerTextStartAt > 4800) {
      game.phase = 'ending';
      game.endingWait = 1;
      game.endingReady = false;
    }
    return;
  }

  if (game.phase === 'play' || game.phase === 'tea') {
    game.time        += dt;
    game.bubbleTimer -= dt;
    game.flash       -= dt;
    for (let i = 0; i < 6; i++) {
      if (game.cardFlash[i] > 0) game.cardFlash[i] = Math.max(0, game.cardFlash[i] - dt * 1.5);
    }
    for (const p of game.popups) { p.y += 35 * dt; p.life -= dt; }
    game.popups = game.popups.filter(p => p.life > 0);

    if (DEBUG_OVERRIDE.beltSpeed != null) {
      game.beltSpeed = DEBUG_OVERRIDE.beltSpeed;
    } else {
      const baseBelt = game.config?.beltSpeed ?? 22;
      game.beltSpeed = baseBelt + game.full * 0.5;
    }

    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      // ベルトが速いほど発生間隔も短く（密度を保つ）
      const speedFactor = (game.config?.beltSpeed ?? 22) / 22;
      game.spawnTimer = rand(0.35, 0.9) / speedFactor;
      game.upper.push({ x: 212, data: randomLaneSushi() });
    }

    for (const s of game.upper) s.x -= game.beltSpeed * dt;
    game.upper = game.upper.filter(s => {
      if (s.x < -12) { game.pending.push({ data: s.data, delay: rand(0.15, 0.4) }); return false; }
      return true;
    });
    for (const p of game.pending) p.delay -= dt;
    for (const p of game.pending.filter(p => p.delay <= 0)) game.lower.push({ x: -12, data: p.data });
    game.pending = game.pending.filter(p => p.delay > 0);
    for (const s of game.lower) s.x += game.beltSpeed * dt;
    game.lower = game.lower.filter(s => s.x < 215);
  }

  if (game.phase === 'play') {
    if (game.fadeoutTriggered) return;
    const moveSpeed = 115 * dt;
    if (keys['a'] || keys['arrowleft'])  game.handX = Math.max(10,  game.handX - moveSpeed);
    if (keys['d'] || keys['arrowright']) game.handX = Math.min(190, game.handX + moveSpeed);

    if (game.config?.fadeout) {
      // fadeoutステージはイライラ無効
      game.irritate = 0;
      game.decaying = false;
      game.penaltyTriggered = false;
    } else {
      // イライラ上昇（ステージ依存、デバッグで上書き可）
      const baseIrr = game.config?.irritateRate ?? 6;
      game.irritate = Math.min(100, game.irritate + (DEBUG_OVERRIDE.irritateRate ?? baseIrr) * dt);
      if (game.irritate >= 20 && !game.irritateSaid[0]) { game.irritateSaid[0] = true; showBubble('なかなか食べられないな……', 2.5); }
      if (game.irritate >= 40 && !game.irritateSaid[1]) { game.irritateSaid[1] = true; showBubble('イライラしてきた', 2.5); }
      if (game.irritate >= 60 && !game.irritateSaid[2]) { game.irritateSaid[2] = true; showBubble('イライライライラ……！！', 2.5); }

      game.decaying = false;
      if (game.irritate > 60) {
        if (!game.penaltyTriggered) { game.penaltyTriggered = true; sfxBuzz(); }
        game.sat = Math.max(0, game.sat - 7 * dt);
        game.decaying = true;
      } else if (game.irritate > 40) {
        if (!game.penaltyTriggered) { game.penaltyTriggered = true; sfxBuzz(); }
        game.sat = Math.max(0, game.sat - 4 * dt);
        game.decaying = true;
      } else {
        game.penaltyTriggered = false;
      }
    }

    if (game.comboLabelTimer > 0) game.comboLabelTimer -= dt;
  }

  if (game.phase === 'tea') {
    game.teaTimer -= dt;
    if (game.teaTimer <= 0) {
      game.irritate = 0;
      game.phase    = 'play';
      showBubble('プハー！', 1.5);
      game.irritateSaid = [false, false, false];
    }
  }

  if (game.phase === 'billing') {
    game.billWait -= dt;
    if (game.billPhase === 0 && game.billWait <= 0) {
      game.billPhase = 1; game.billStep = 0; game.billWait = 0.2;
    }
    if (game.billPhase === 1) {
      if (game.billWait <= 0 && !game.billListDone) {
        if (game.billStep < game.eaten.length) {
          game.billStep++; sfxCoin(); game.billWait = 0.15;
        } else {
          game.billListDone = true; sfxRegister(); game.billWait = 0.8;
        }
      }
      if (game.billListDone && game.billWait <= 0 && !game.billKeyReady) game.billKeyReady = true;
    }
  }

  if (game.phase === 'result') {
    game.resultWait -= dt;
    if (game.resultWait <= 0 && game.resultPhase < 6) {
      game.resultPhase++;
      if (game.resultPhase === 6) {
        // スコアランクに応じてSEを使い分け
        const sc = game.score;
        const over10k = game.billTotal > 10000;
        if (over10k || sc < 600) {
          sfxScoreLow();          // 並 / 下 / 無銭飲食
        } else if (sc < 1100) {
          sfxScoreMid();          // 上
        } else {
          sfxScoreHigh();         // 神 / 特上
          if (sc >= 1800) sfxScoreFanfare();  // 神のときだけファンファーレを重ねる
        }
      } else {
        sfxBan();
      }
      game.resultWait = game.resultPhase < 6 ? 0.4 : 1.2;
    }
    if (game.resultPhase >= 6 && game.resultWait <= 0 && !game.anyKey) game.anyKey = true;
  }
}

// ===== 起動 =====
// HTMLに埋め込まれたシナリオを読み込む
parseAndStoreScenario(document.getElementById('scenario-data').textContent);

// 手前レーン用のネタPNGをプリロード（無いものは自動的にドット絵フォールバック）
preloadNetaSprites();

// プレイ画面の背景PNG（200×150 → ×4倍で800×600）
preloadPlayBackground();

// リザルト画面の背景PNG群（複数、表示時にランダム選択）
preloadResultBackgrounds();

// ステージ選択画面の背景PNG
preloadStoryBackground();

// VN背景PNGをプリロード（無いものは BG_COLORS の単色にフォールバック）
preloadBackgrounds();

// VNキャラPNGをプリロード（無いものは色矩形プレースホルダーにフォールバック）
preloadCharacters();

// シナリオから Stage5 演出テキストを取得（CSVが正、見つからなければデフォルト）
{
  const lines = scenario.scenes.get('Stage5_FADEOUT_LINES');
  if (lines && lines.length) STAGE5_LINES = lines.map(e => e.content);
  const center = scenario.scenes.get('Stage5_FADEOUT_CENTER');
  if (center && center.length && center[0].content) STAGE5_CENTER_TEXT = center[0].content;
}

let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(t => { lastTime = t; loop(t); });
