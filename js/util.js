// ===== 共通ユーティリティ =====

// Canvas は CSS の font-family を継承しないので、ctx.font に直接フォント名を書く必要がある。
// Windows 10/11 では Meiryo がデフォルトで入っていないので、Yu Gothic UI / Yu Gothic を優先。
// MacではHiragino、Win10/11では Yu Gothic、古いWinでは Meiryo / MS PGothic にフォールバック。
const JP_FONT       = '"Hiragino Sans","Yu Gothic UI","Yu Gothic","Meiryo","MS PGothic",sans-serif';
const JP_MINCHO     = '"Hiragino Mincho ProN","Yu Mincho","YuMincho","MS PMincho","MS Mincho",serif';
const JP_MONO_FONT  = 'Consolas,"Courier New","MS Gothic",monospace';

// ロード追跡：起動時に揃えたい重要画像をここに push し、全部 complete になったらゲーム開始
const LOADING_IMAGES = [];
function trackImage(img) { LOADING_IMAGES.push(img); return img; }
function getLoadingProgress() {
  if (!LOADING_IMAGES.length) return { done: 0, total: 0, ratio: 1 };
  let done = 0;
  for (const img of LOADING_IMAGES) if (img.complete) done++;
  return { done, total: LOADING_IMAGES.length, ratio: done / LOADING_IMAGES.length };
}

// CSV を行→セルの配列に変換（quoted fields対応、BOM除去、改行コード CRLF/CR/LF 全対応）
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  // 改行コードを LF に統一して以降のパースを単純化
  text = text.replace(/\r\n?/g, '\n');
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
        while (pos < text.length && text[pos] !== ',' && text[pos] !== '\n')
          field += text[pos++];
      }
      row.push(field);
      if (pos >= text.length) break;
      if (text[pos] === ',') { pos++; continue; }
      if (text[pos] === '\n') { pos++; break; }
    }
    if (row.some(f => f.trim())) rows.push(row);
  }
  return rows;
}
