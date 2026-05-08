// ===== ステージ別パラメーター =====
// HTMLに埋め込まれた stage-config CSV を読み込んで STAGE_CONFIG に格納する。
// CSVカラム: stage,age,label,maxPlateRank,budget,irritateRate,beltSpeed,maxFull,scoreMode,tea,gari,fadeout

const STAGE_CONFIG = {};

function loadStageConfig(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return;
  const headers = rows[0].map(h => h.trim());
  const idx = name => headers.indexOf(name);
  const I = {
    stage:        idx('stage'),
    age:          idx('age'),
    label:        idx('label'),
    maxPlateRank: idx('maxPlateRank'),
    budget:       idx('budget'),
    irritateRate: idx('irritateRate'),
    beltSpeed:    idx('beltSpeed'),
    maxFull:      idx('maxFull'),
    scoreMode:    idx('scoreMode'),
    tea:          idx('tea'),
    gari:         idx('gari'),
    fadeout:      idx('fadeout'),
  };
  const truthy = s => /^true$/i.test((s || '').trim());

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const stageStr = (r[I.stage] || '').trim();
    if (!stageStr) continue;
    const stageNum = parseInt(stageStr, 10);
    STAGE_CONFIG[stageNum] = {
      stage:        stageNum,
      age:          parseInt(r[I.age], 10),
      label:        (r[I.label] || '').trim(),
      maxPlateRank: parseInt(r[I.maxPlateRank], 10),
      budget:       parseInt(r[I.budget], 10),
      irritateRate: parseFloat(r[I.irritateRate]),
      beltSpeed:    parseFloat(r[I.beltSpeed]),
      maxFull:      parseInt(r[I.maxFull], 10),
      scoreMode:    (r[I.scoreMode] || '').trim(),
      tea:          truthy(r[I.tea]),
      gari:         truthy(r[I.gari]),
      fadeout:      truthy(r[I.fadeout]),
    };
  }
}

function getStageConfig(stage) {
  return STAGE_CONFIG[stage] || null;
}

// HTMLに埋め込まれたCSVを即読み込み
loadStageConfig(document.getElementById('stage-config-data').textContent);
