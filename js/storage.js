// ===== セーブ・ロード =====
let unlockedStages = parseInt(localStorage.getItem('orenosushi_unlocked') || '1', 10);
let prologueSeen   = localStorage.getItem('orenosushi_prologue') === '1';

function saveProgress() {
  localStorage.setItem('orenosushi_unlocked', String(unlockedStages));
  localStorage.setItem('orenosushi_prologue', '1');
}

function resetProgress() {
  localStorage.removeItem('orenosushi_unlocked');
  localStorage.removeItem('orenosushi_prologue');
  unlockedStages = 1;
  prologueSeen   = false;
}
