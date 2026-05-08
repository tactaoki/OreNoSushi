// ===== 共通ユーティリティ =====

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
