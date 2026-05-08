#!/bin/bash
# 俺の寿司 — SFX マニフェスト更新スクリプト
# 各SEフォルダの中身をスキャンして js/sfx-manifest.js を再生成する。

cd "$(dirname "$0")"

OUT="js/sfx-manifest.js"
SFX_DIR="assets/sounds/sfx"

if [ ! -d "$SFX_DIR" ]; then
  echo "❌ $SFX_DIR が見つかりません"
  read -p "Enterで閉じる..."
  exit 1
fi

{
  echo "// 自動生成ファイル — update-sfx.command で更新"
  echo "// 各SEフォルダに置かれた最初の音声ファイル(.wav/.mp3/.ogg/.m4a)を参照"
  echo "const SFX_MANIFEST = {"
} > "$OUT"

found=0
empty=0
for dir in "$SFX_DIR"/*/; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")
  # 隠しファイル(.DS_Store等)を除いて、対応拡張子の最初のファイルを取得
  file=$(ls -1 "$dir" 2>/dev/null | grep -v '^\.' | grep -iE '\.(wav|mp3|ogg|m4a)$' | head -1)
  if [ -n "$file" ]; then
    # シングルクォートをエスケープ
    safe_file=$(echo "$file" | sed "s/'/\\\\'/g")
    echo "  '$name': '$name/$safe_file'," >> "$OUT"
    echo "  ✅ $name → $file"
    found=$((found+1))
  else
    echo "  '$name': null," >> "$OUT"
    echo "  ⏭  $name → （ファイルなし、合成音にフォールバック）"
    empty=$((empty+1))
  fi
done

echo "};" >> "$OUT"

echo ""
echo "─────────────────────────────────"
echo "$OUT を更新しました。"
echo "差し替え: $found 個 / 合成音: $empty 個"
echo ""
echo "ブラウザでゲームをリロード（Cmd+R）すれば反映されます。"
echo "─────────────────────────────────"
echo ""
read -p "Enterで閉じる..."
