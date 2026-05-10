#!/bin/bash
# 俺の寿司 — プレイヤースプライト マニフェスト更新スクリプト
# assets/images/characters/oreplay{age}/ 内の画像をスキャンして js/sprite-manifest.js を再生成する。
# 各フォルダから最初に見つかった画像（.png/.jpg/.jpeg/.gif/.webp）を採用するので、ファイル名は何でもOK。

cd "$(dirname "$0")"

OUT="js/sprite-manifest.js"
CHAR_DIR="assets/images/characters"

if [ ! -d "$CHAR_DIR" ]; then
  echo "❌ $CHAR_DIR が見つかりません"
  read -p "Enterで閉じる..."
  exit 1
fi

{
  echo "// 自動生成ファイル — update-sprites.command で更新"
  echo "// 各 oreplay{age}/ righthand{age}/ フォルダに置かれた最初の画像ファイルを参照"
} > "$OUT"

# プレフィックスとマニフェスト名のペアでループ生成
scan_manifest() {
  local prefix="$1"
  local manifest_name="$2"
  local label="$3"
  local found=0
  local empty=0
  echo "" >> "$OUT"
  echo "const ${manifest_name} = {" >> "$OUT"
  for age in 20 30 40 50 60; do
    local dir="$CHAR_DIR/${prefix}${age}"
    if [ ! -d "$dir" ]; then
      echo "  $age: null," >> "$OUT"
      echo "  ⏭  ${prefix}$age → （フォルダなし、ドット絵にフォールバック）"
      empty=$((empty+1))
      continue
    fi
    local file=$(ls -1 "$dir" 2>/dev/null | grep -v '^\.' | grep -iE '\.(png|jpg|jpeg|gif|webp)$' | head -1)
    if [ -n "$file" ]; then
      local safe_file=$(echo "$file" | sed "s/'/\\\\'/g")
      echo "  $age: '$dir/$safe_file'," >> "$OUT"
      echo "  ✅ ${prefix}$age → $file"
      found=$((found+1))
    else
      echo "  $age: null," >> "$OUT"
      echo "  ⏭  ${prefix}$age → （画像なし、ドット絵にフォールバック）"
      empty=$((empty+1))
    fi
  done
  echo "};" >> "$OUT"
  echo ""
  echo "[$label] 差し替え: $found 個 / ドット絵: $empty 個"
}

scan_manifest "oreplay" "SPRITE_MANIFEST" "メインスプライト"

# 右手は全ステージ共通（righthand20 のみ参照、単一パス）
echo "" >> "$OUT"
right_dir="$CHAR_DIR/righthand20"
if [ -d "$right_dir" ]; then
  right_file=$(ls -1 "$right_dir" 2>/dev/null | grep -v '^\.' | grep -iE '\.(png|jpg|jpeg|gif|webp)$' | head -1)
  if [ -n "$right_file" ]; then
    safe_right=$(echo "$right_file" | sed "s/'/\\\\'/g")
    echo "const RIGHT_HAND_PATH = '$right_dir/$safe_right';" >> "$OUT"
    echo "[右手] ✅ righthand20 → $right_file（全ステージ共通）"
  else
    echo "const RIGHT_HAND_PATH = null;" >> "$OUT"
    echo "[右手] ⏭  righthand20 → （画像なし、ドット絵にフォールバック）"
  fi
else
  echo "const RIGHT_HAND_PATH = null;" >> "$OUT"
  echo "[右手] ⏭  righthand20 → （フォルダなし、ドット絵にフォールバック）"
fi

# items/{name}/ の単一パス（湯呑み・ガリ皿・ガリ本体）
ITEMS_DIR="assets/images/items"
scan_item() {
  local subdir="$1"
  local var_name="$2"
  local label="$3"
  local dir="$ITEMS_DIR/$subdir"
  if [ -d "$dir" ]; then
    local file=$(ls -1 "$dir" 2>/dev/null | grep -v '^\.' | grep -iE '\.(png|jpg|jpeg|gif|webp)$' | head -1)
    if [ -n "$file" ]; then
      local safe_file=$(echo "$file" | sed "s/'/\\\\'/g")
      echo "const $var_name = '$dir/$safe_file';" >> "$OUT"
      echo "[$label] ✅ $subdir → $file"
    else
      echo "const $var_name = null;" >> "$OUT"
      echo "[$label] ⏭  $subdir → （画像なし、ドット絵にフォールバック）"
    fi
  else
    echo "const $var_name = null;" >> "$OUT"
    echo "[$label] ⏭  $subdir → （フォルダなし、ドット絵にフォールバック）"
  fi
}

scan_item "tea"       "TEA_PATH"        "湯呑み"
scan_item "gariplate" "GARIPLATE_PATH"  "ガリ皿"
scan_item "gari"      "GARI_PATH"       "ガリ本体"

echo ""
echo "─────────────────────────────────"
echo "$OUT を更新しました。"
echo ""
echo "ブラウザでゲームをリロード（Cmd+R）すれば反映されます。"
echo "─────────────────────────────────"
echo ""
read -p "Enterで閉じる..."
