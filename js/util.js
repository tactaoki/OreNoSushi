// ===== 共通ユーティリティ =====

// ロード追跡：起動時に揃えたい重要画像をここに push し、全部 complete になったらゲーム開始
const LOADING_IMAGES = [];
function trackImage(img) { LOADING_IMAGES.push(img); return img; }
function getLoadingProgress() {
  if (!LOADING_IMAGES.length) return { done: 0, total: 0, ratio: 1 };
  let done = 0;
  for (const img of LOADING_IMAGES) if (img.complete) done++;
  return { done, total: LOADING_IMAGES.length, ratio: done / LOADING_IMAGES.length };
}

// CSV を行→セルの配列に変換（quoted fields対応、BOM除去）
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let pos = 0;
  while (pos < text.length) {
    const row = [];
    while (pos <= text.length) {
      let field = '';
      if (pos < text.length && text[pos] === '"') {
        pos++;
        while (pos < text.length) {
          if (text[pos] === '"' && text[pos + 1] === '"') { field += '"'; pos += 2; }
          else if (text[pos] === '"') { pos++; break; }
          else field += text[pos++];
        }
      } else {
        while (pos < text.length && text[pos] !== ',' && text[pos] !== '\r' && text[pos] !== '\n')
          field += text[pos++];
      }
      row.push(field);
      if (pos >= text.length) break;
      if (text[pos] === ',') { pos++; continue; }
      if (text[pos] === '\r' && text[pos + 1] === '\n') { pos += 2; break; }
      if (text[pos] === '\n') { pos++; break; }
    }
    if (row.some(f => f.trim())) rows.push(row);
  }
  return rows;
}
