# 「俺の寿司」進捗 — 2026-05-08 セッション終了時点

## 今日のハイライト
- **Step5（PNG差し替え）まで一通り完了**。寿司ネタ21枚 / 背景5枚 / VNキャラ9枚（ore20〜60、taisho30/50/70/90）が読み込まれて表示される
- ゲームバランスを大改修。 budget・base値・beltSpeedをユーザーフィードバックで何度も調整
- 多くの細かいバグ修正（連打誤動作、 BGM rate 引き継ぎ、 デバッグモードの状態残留 ほか）

---

## 進捗状況

| Step | 内容 | 状態 |
|---|---|---|
| 1 | ファイル分割（js/, assets/） | ✅ 完了 |
| 1.5 | デバッグモード（`?debug=1` または **F1**で切替） | ✅ 完了 |
| 2 | stage-config.csv 駆動化 | ✅ 完了 |
| 3 | scoreMode → 廃止し全ステージ共通式に。 ストーリー的整合性優先 | ✅ 方針変更で完了 |
| 4 | Stage5 fadeout演出（独り言 → 完全白 → ダイアログ → 中央テキスト → FIN） | ✅ 完了 |
| 5 | PNG読み込み（ネタ手前/奥、 おすすめ、 タイトル、 VN背景、 VNキャラ） | ✅ 完了 |
| 6 | スマホタッチ対応 | ⏸️ 未着手 |

---

## ファイル構成（現状）

```
orenosushi/
├── index.html                 ← 起動ファイル（ダブルクリック）
├── ore-no-sushi.html          ← 旧1ファイル版（バックアップ）
├── scenario.csv               ← VNシナリオ（手動同期）
├── stage-config.csv           ← ステージパラメーター（手動同期）
├── neta-base.csv              ← ランク別 base値・基本価格（手動同期）
├── instructions.md            ← 元の引き継ぎ指示
├── reminder.txt               ← 前回のメモ
├── progress.md                ← このファイル
├── js/
│   ├── util.js                ← parseCSV
│   ├── audio.js               ← BGM/SE
│   ├── storage.js             ← localStorage
│   ├── debug.js               ← デバッグモード
│   ├── stage-config.js        ← stage-config CSV パース
│   ├── ui.js                  ← ステータスバー
│   ├── render.js              ← 描画（PNGスプライト管理含む）
│   ├── vn-engine.js           ← VN（背景・キャラもPNG読込）
│   └── game-logic.js          ← ゲームコア（最終ループまで）
└── assets/
    └── images/
        ├── neta/              ← 21枚（aji.png 等）
        ├── backgrounds/       ← bg01〜bg05.png
        ├── characters/        ← ore20〜60.png + taisho30/50/70/90.png
        └── ui/                ← （空）
```

> 手動同期方針: ユーザーがCSVを編集 → 「更新したよ」と伝える → AIが index.html の埋め込みに同期。

---

## 現状のCSV値（バランス調整済み）

### stage-config.csv
| Stage | age | label | maxRank | budget | irritate | beltSpeed | maxFull | tea | gari | fadeout |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 20 | 新卒 | 2 | 3300 | 1 | 52 | 25 | × | × | × |
| 2 | 30 | 30代 | 3 | 3700 | 3 | 56 | 22 | ○ | × | × |
| 3 | 40 | 40代 | 4 | 5000 | 8 | 62 | 20 | ○ | ○ | × |
| 4 | 50 | 50代 | 5 | 6000 | 4 | 56 | 15 | ○ | ○ | × |
| 5 | 60 | 定年 | 5 | 0 | 1 | 36 | 999 | ○ | ○ | ○ |

> `scoreMode` 列はCSVに残っているがコードでは未参照（仕様変更で全ステージ共通計算）。

### neta-base.csv（base値抜粋、低ランクほど割安・高ランクほど割高）
| rank | 皿色 | price | base | コスパ |
|---|---|---|---|---|
| 0 | 水色 | 100 | 30 | 0.30 |
| 1 | 緑 | 200 | 45 | 0.225 |
| 2 | 黄色 | 300 | 55 | 0.183 |
| 3 | 赤 | 400 | 60 | 0.150 |
| 4 | 銀 | 500 | 70 | 0.140 |
| 5 | 金 | 800 | 80 | 0.100 |

---

## 主なルール（覚えておくべき仕様）

- **スコア計算**: `score = sat × priceMult × fullnessMult`（全ステージ共通）
  - `priceMult = budget / billTotal`（budget=0なら1.0で補正なし）
  - `fullnessMult`: ベスト範囲 `maxFull × 0.6 〜 maxFull × 0.8` で 1.0、 範囲外は減衰
- **クリア閾値**: `score ≥ 600`（「上」以上）。 600未満はRETRY
- **Stage5 fadeout**: 10皿（FADEOUT_LINESの行数）食べると自動演出
- **おすすめ抽選**: targetRank以下から `重み = 1 + rank×0.5` で重み付き
  - targetRank: 食べた皿数で 0→1→2→3→5 と上がるが maxPlateRank で頭打ち
- **ベルト速度**: `config.beltSpeed + game.full × 0.5`
- **発生間隔**: `rand(0.35, 0.9) / (config.beltSpeed / 22)` で密度を一定に保つ

---

## 演出関連の動作ポイント

- **VN遷移時の入力ガード**: CLEAR/RETRY/Inter/Ending VN は冒頭 0.8秒 入力無効。 stageselect / choice 着地時も 0.8秒
- **キーリピート無視**: keydown ハンドラ冒頭で `e.repeat` を return（押しっぱなしで暴発しない）
- **Spaceキー preventDefault**: フォーカスされたボタンが反応しないように
- **Stage5キャラ年齢マップ**（`TAISHO_AGE_MAP`）: `{20:30, 30:50, 40:50, 50:70, 60:90}`
- **VNフェード**: fadeout 中の Ending VN は背景白＋黒オーバーレイなし

---

## 既知の改善余地（明日以降の候補）

### バランス（要検証）
- 全体的にちょうど良いが、 まだ Stage4 で「神」が取りやすい傾向。 微調整可
- Stage1 の「上」クリアの安定度確認

### アセット
- VNキャラの **ore40** など細かい表情差分が入れば豊かに（現状は年齢別1枚のみ）
- **ui/** フォルダ（操作説明帯のデザイン化）
- **sounds/bgm/**, **sounds/effects/** の音声ファイル化（現状はWeb Audio APIで生成）

### 機能
- **Step6**: スマホタッチ対応（横向き、 バーチャルボタン）— 未着手
- pause画面の整理
- ハイスコア記録（localStorage）

### コード整理
- `game-logic.js` がやや肥大化（700行超）。 必要なら更に分割
- `scoreMode` カラムの扱い（削除 or 復活）

---

## 操作・起動メモ

- **起動**: `index.html` をFinderからダブルクリック
- **デバッグ**: F1 で切替、 または URL末尾に `?debug=1` を追加。 `?debug=1&stage=N` で起動時直接ジャンプ
- **セーブリセット**: タイトル画面で `R` キー、 またはデバッグパネルの「セーブリセット&リロード」

---

## 引き継ぎ時の合言葉
作業を再開する時は、 まず `index.html` をブラウザで起動して **F1 → 各ステージにジャンプ** で動作確認するのが早い。 CSV を編集したら「更新したよ」と伝えれば AI が HTML 埋め込みに同期する。
