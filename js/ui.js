// ===== UI制御（DOM要素のステータスバー・操作説明帯） =====

// HTMLバー＆操作説明はキャンバス描画に移行済み。互換のため関数は残すが何もしない
function showGameUI() {}
function hideGameUI() {}

// アニメーションなしでバーを0%にリセット
function resetStatusBars() {
  const barFull = document.getElementById('barFull');
  const barSat  = document.getElementById('barSat');
  const barIrr  = document.getElementById('barIrr');
  barFull.style.transition = barSat.style.transition = barIrr.style.transition = 'none';
  barFull.style.width = barSat.style.width = barIrr.style.width = '0%';
  requestAnimationFrame(() => {
    barFull.style.transition = barSat.style.transition = barIrr.style.transition = '';
  });
}

// プレイ中：満足度・満腹度・イライラの3バーを更新
function updateStatusBars() {
  const barFull = document.getElementById('barFull');
  const barSat  = document.getElementById('barSat');
  const barIrr  = document.getElementById('barIrr');
  const maxFull = game.config?.maxFull || 20;
  const fullRatio = game.full / maxFull;
  barFull.style.width      = Math.min(100, fullRatio * 100) + '%';
  barFull.style.background = fullRatio < 0.5 ? '#4caf50' : fullRatio < 0.8 ? '#ffd740' : '#d9534f';
  barSat.style.width       = Math.min(100, game.sat / 1500 * 100) + '%';
  barSat.style.background  = game.decaying ? '#d9534f' : '#f0ad4e';
  barIrr.style.width       = game.irritate + '%';
  barIrr.style.background  = game.irritate < 25 ? '#4caf50' : game.irritate < 50 ? '#ffd740' : '#d9534f';

  // Stage5フェードアウト：UIバー全体を段階的に透明化
  const uiEl = document.getElementById('ui');
  if (game.config?.fadeout && game.fadeoutProgress > 0) {
    uiEl.style.opacity = (1 - game.fadeoutProgress).toFixed(2);
  } else {
    uiEl.style.opacity = '1';
  }
}
