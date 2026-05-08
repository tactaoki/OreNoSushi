// ===== 音声基盤 =====
let audioCtx;

function resumeAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function tone(freq, duration, type, volume, delay) {
  if (!audioCtx) return;
  // volume===0 のとき falsy フォールバックで意図せず鳴ってしまうのを防ぐ
  const v = (volume === undefined || volume === null) ? 0.04 : volume;
  if (v <= 0.0001) return;
  const startTime = audioCtx.currentTime + (delay || 0);
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type || 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(v, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playNoise(duration, volume, delay) {
  if (!audioCtx) return;
  const startTime = audioCtx.currentTime + (delay || 0);
  const src = audioCtx.createBufferSource();
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  src.buffer = buf;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume || 0.02, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  src.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(startTime);
  src.stop(startTime + duration);
}

// ===== 効果音ファイル差し替え =====
// SFX_MANIFEST（sfx-manifest.js で定義）にファイルパスがあれば、合成音の代わりにそれを再生する。
// マニフェストが無い／キーが null の場合は従来の合成音にフォールバック。
const SFX_AUDIO = {};

(function preloadSfx() {
  if (typeof SFX_MANIFEST === 'undefined') return;
  for (const key in SFX_MANIFEST) {
    const rel = SFX_MANIFEST[key];
    if (!rel) continue;
    const audio = new Audio(`assets/sounds/sfx/${rel}`);
    audio.preload = 'auto';
    SFX_AUDIO[key] = audio;
  }
})();

// ファイルが登録されていれば再生して true を返す。無ければ false（→ 呼び出し側で合成音を鳴らす）
function playSfxFile(key) {
  if (!audioInitialized) return false;
  const audio = SFX_AUDIO[key];
  if (!audio) return false;
  // 同時発火に対応するため毎回 cloneNode する
  const clone = audio.cloneNode(true);
  clone.play().catch(() => {});
  return true;
}

// ===== 効果音 =====
function sfxEatGreat()    { if (playSfxFile('eat-great')) return; tone(784,.12,'sine',.07); tone(988,.12,'sine',.065,.05); tone(1175,.12,'sine',.06,.1); tone(1568,.2,'sine',.055,.15); tone(2093,.25,'sine',.04,.2); }
function sfxEatGood()     { tone(523,.1,'sine',.05); tone(659,.1,'sine',.045,.05); tone(784,.15,'sine',.04,.1); }
function sfxEatMid()      { if (playSfxFile('eat-mid')) return; tone(523,.12,'triangle',.04); tone(659,.1,'triangle',.035,.06); }
function sfxEatBad()      { tone(180,.25,'sine',.035); tone(140,.2,'sine',.03,.05); }
function sfxEatTerrible() { tone(110,.35,'sawtooth',.04); tone(90,.3,'sawtooth',.035,.08); playNoise(.1,.015,.05); }
function sfxChew()        { if (playSfxFile('chew')) return; for (let i = 0; i < 4; i++) tone(90 + Math.random() * 50, .09, 'square', .012, i * .12); }
function sfxGulp()        { if (playSfxFile('gulp')) return; for (let i = 0; i < 10; i++) tone(100 + Math.random() * 80, .22, 'sine', .02, i * .35); }
function sfxGari()        { if (playSfxFile('gari')) return; tone(800,.06,'sine',.04); tone(1200,.08,'sine',.035,.04); tone(1600,.1,'sine',.03,.08); }
function sfxRegister()    { if (playSfxFile('register')) return; tone(2800,.2,'sine',.07); setTimeout(() => { tone(1200,.1,'square',.045); tone(800,.15,'sawtooth',.035,.05); tone(500,.25,'sawtooth',.025,.1); tone(300,.4,'sawtooth',.02,.18); }, 300); }
function sfxCoin()        { if (playSfxFile('coin')) return; tone(1319,.06,'square',.025); tone(1568,.09,'square',.025,.07); }
function sfxDead()        { tone(233,.4,'sawtooth',.04); tone(147,.6,'sawtooth',.04,.3); }
function sfxBuzz()        { if (playSfxFile('buzz')) return; tone(55,.5,'sawtooth',.07); tone(58,.45,'square',.05,.02); playNoise(.2,.02); }
function sfxBan()         { if (playSfxFile('ban')) return; tone(150,.2,'square',.07); playNoise(.08,.03); tone(300,.1,'square',.04,.03); }
function sfxJingle()      { if (playSfxFile('jingle')) return; tone(523,.12,'sine',.05); tone(659,.12,'sine',.045,.1); tone(784,.12,'sine',.04,.2); tone(1047,.3,'sine',.05,.3); }
function sfxBillIntro()   { if (playSfxFile('bill-intro')) return; tone(110,.4,'square',.09); tone(80,.5,'sawtooth',.07,.02); playNoise(.18,.05); tone(440,.12,'square',.06,.15); tone(587,.12,'square',.06,.27); tone(880,.5,'square',.07,.4); tone(1175,.4,'sine',.05,.55); }
function sfxScoreFanfare(){ if (playSfxFile('score-fanfare')) return; for (let i = 0; i < 8; i++) playNoise(.03,.03,i*.04); tone(523,.2,'sine',.06,.35); tone(659,.2,'sine',.055,.45); tone(784,.2,'sine',.05,.55); tone(1047,.4,'sine',.06,.65); }
function sfxScoreHigh()   { if (playSfxFile('score-high')) return; sfxScoreFanfare(); }
function sfxScoreMid()    { if (playSfxFile('score-mid'))  return; tone(523,.15,'sine',.05); tone(659,.15,'sine',.045,.1); tone(784,.25,'sine',.05,.2); }
function sfxScoreLow()    { if (playSfxFile('score-low'))  return; tone(220,.3,'sawtooth',.05); tone(180,.4,'sawtooth',.04,.15); }

// ===== BGM =====
// ファイル優先、未配置・未対応キーは合成音にフォールバック
let bgmTimer   = null;
let bgmStep    = 0;
let currentBgm = '';
let bgmVolume  = 1;  // 0〜1。Stage5フェードアウトで下げる

const BGM_FILE_PATHS = {
  title:  'assets/sounds/bgm/Title.mp3',
  vn:     'assets/sounds/bgm/VN.mp3',
  play:   'assets/sounds/bgm/game.mp3',
  bill:   'assets/sounds/bgm/Result.mp3',  // 会計〜リザルトを通しでこの曲
  result: 'assets/sounds/bgm/Result.mp3',
};
const BGM_AUDIO = {};
const BGM_BASE_VOLUME = 0.5;
let currentBgmAudio = null;

(function preloadBGM() {
  for (const key in BGM_FILE_PATHS) {
    const audio = new Audio(BGM_FILE_PATHS[key]);
    audio.loop = true;
    audio.preload = 'auto';
    BGM_AUDIO[key] = audio;
  }
})();

function setBGMVolume(v) {
  bgmVolume = Math.max(0, Math.min(1, v));
  if (currentBgmAudio) currentBgmAudio.volume = bgmVolume * BGM_BASE_VOLUME;
}

const BGM_TRACKS = {
  title: {
    bpm: 135,
    mel: [523,659,784,0,659,784,1047,0,784,659,523,659,784,0,523,0,523,659,784,0,880,784,659,0,523,392,523,0,659,523,0,0],
    bas: [262,0,0,196,0,0,220,0,0,0,262,0,196,0,220,0,262,0,0,196,0,0,220,0,262,0,196,0,262,0,0,0]
  },
  play: {
    bpm: 170,
    mel: [440,0,523,587,659,0,523,0,440,523,659,784,659,523,440,0,440,523,587,0,659,784,880,0,784,659,523,440,523,659,440,0,330,0,440,523,659,0,784,659,523,0,440,523,659,0,523,0,440,523,587,659,784,880,784,659,523,0,440,330,440,0,0,0],
    bas: [220,0,0,147,0,0,165,0,220,0,0,165,0,0,196,0,220,0,0,147,0,0,165,0,196,0,0,220,0,0,165,0,220,0,0,165,0,0,196,0,220,0,0,147,0,0,165,0,220,0,0,165,0,0,196,0,220,0,0,147,220,0,0,0]
  },
  bill: {
    bpm: 80,
    mel: [220,0,262,0,330,0,0,0,294,0,262,0,220,0,0,0,220,0,247,0,262,0,330,0,294,0,0,0,262,0,0,0],
    bas: [220,0,0,0,0,0,165,0,147,0,0,0,0,0,220,0,220,0,0,0,165,0,0,0,147,0,0,0,165,0,0,0]
  }
};

function startBGM(name) {
  if (currentBgm === name) return;
  // 同じファイルを共有するキー（bill ↔ result）は再生をリスタートせず、キーだけ切り替える
  const newPath = BGM_FILE_PATHS[name];
  const curPath = BGM_FILE_PATHS[currentBgm];
  if (newPath && curPath && newPath === curPath && currentBgmAudio) {
    currentBgm = name;
    return;
  }
  stopBGM();
  currentBgm = name;

  // ファイル優先
  const audio = BGM_AUDIO[name];
  if (audio && audioInitialized) {
    audio.volume = bgmVolume * BGM_BASE_VOLUME;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    currentBgmAudio = audio;
    return;
  }

  // 合成音フォールバック
  if (!audioCtx) return;
  const track = BGM_TRACKS[name];
  if (!track) return;
  bgmStep = 0;
  const interval = 60000 / track.bpm / 2;
  bgmTimer = setInterval(() => {
    const m = track.mel[bgmStep % track.mel.length];
    if (m) tone(m, interval / 1000 * 0.7, 'triangle', 0.02 * bgmVolume);
    const b = track.bas[bgmStep % track.bas.length];
    if (b) tone(b, interval / 1000 * 1.2, 'sine', 0.014 * bgmVolume);
    bgmStep++;
  }, interval);
}

function stopBGM() {
  if (currentBgmAudio) {
    currentBgmAudio.pause();
    currentBgmAudio = null;
  }
  if (bgmTimer) clearInterval(bgmTimer);
  bgmTimer   = null;
  currentBgm = '';
}

let audioInitialized = false;
function tryInitAudio() {
  if (audioInitialized) return;
  audioInitialized = true;
  resumeAudio();
  startBGM('title');
}
