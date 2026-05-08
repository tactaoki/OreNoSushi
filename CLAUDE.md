# 俺の寿司 — プロジェクト概要

ブラウザ単体で動く回転寿司ゲーム＋ノベルゲーム。`index.html` をダブルクリックで起動する単一HTMLアプリ。

---

## 物語構成

**人生×回転寿司**の5幕。主人公（俺）と大将（親方）のやりとりで進行。

| Stage | 年齢 | テーマ |
|---|---|---|
| 1 | 20 | 新卒。安皿のみ |
| 2 | 30 | 30代。お茶解放 |
| 3 | 40 | 40代。ガリ解放、ストレス強 |
| 4 | 50 | 50代。全機能解放 |
| 5 | 60 | 定年の日。フェード演出で締め |

Stage5 は独白を重ねながら白フェードし「これが……俺の寿司だ」で FIN。

---

## ゲームループ（1ステージ）

1. **VN OPEN**（背景・大将の語り）
2. **プレイ**（ベルト・寿司取り）
3. **会計**（Q キー or 満腹で自動）— 皿ごとに合計
4. **リザルト**（神/特上/上/並/下）
5. クリア → **VN CLEAR** → 必要なら Inter → ステージ選択
   失敗 → **VN RETRY** → choice（もう一回 / タイトル）

---

## 操作

| キー | 動作 |
|---|---|
| A / D（← / →） | 手の左右移動 |
| Space | 寿司を掴む / VN進行 / 決定 |
| Z | お茶（イライラリセット、3秒操作不能） |
| E | ガリ（次の皿の値段判明、最大3個） |
| Q | 会計 |
| Esc | ポーズ |
| F1 | デバッグパネル切替 |
| R（タイトルで） | セーブリセット |

---

## プレイ画面の仕組み

- **2レーン**: 奥（右→左、小皿）/ 手前（左→右、大皿）。手前を狙う
- **おすすめ**: ⭐表示の1ネタを取るとコンボ（×1.5 → ×2.0 → ×2.5 → リセット）
- **時価システム**: ゲーム開始時に各ランクの価格が中央値±スプレッドで決定。皿カードは `?` → 「高め/安め」 → 「N円」と段階的に判明
- **イライラ**: 時間で上昇。40%超で満足度 -4/秒、60%超で -7/秒（fadeoutステージは無効）
- **満腹度**: `maxFull` の60〜80%がベスト範囲。範囲外で fullnessMult 減衰

---

## スコア式（全ステージ共通）

```
score = sat × priceMult × fullnessMult
priceMult    = budget / billTotal   （budget=0 なら 1.0）
fullnessMult = maxFull × 0.6〜0.8 で 1.0、範囲外で減衰
```

- **600以上でクリア**
- **10,000円超は強制0**（無銭飲食）

ランク表示:
| score | ランク |
|---|---|
| 1800+ | 神 |
| 1100+ | 特上 |
| 600+ | 上（クリア閾値） |
| 420+ | 並 |
| <420 | 下 |

---

## ステージ別パラメーター（stage-config.csv）

| Stage | maxRank | budget | irritate | beltSpeed | maxFull | tea | gari | fadeout |
|---|---|---|---|---|---|---|---|---|
| 1 | 2 | 3300 | 1 | 52 | 25 | × | × | × |
| 2 | 3 | 3700 | 3 | 56 | 22 | ○ | × | × |
| 3 | 4 | 5000 | 8 | 62 | 20 | ○ | ○ | × |
| 4 | 5 | 6000 | 4 | 56 | 15 | ○ | ○ | × |
| 5 | 5 | 0 | 1 | 36 | 999 | ○ | ○ | ○ |

---

## ネタとランク（neta-base.csv）

| rank | 皿色 | base価格 | base満足度 |
|---|---|---|---|
| 0 | 水色 | 100 | 30 |
| 1 | 緑 | 200 | 45 |
| 2 | 黄色 | 300 | 55 |
| 3 | 赤 | 400 | 60 |
| 4 | 銀 | 500 | 70 |
| 5 | 金 | 800 | 80 |

ネタは全21種（ランク0〜5に分散）。低ランクほど多い、後半ほど高ランクが流れやすい。

---

## ファイル構成

```
OreNoSushi/
├── index.html              起動ファイル（ダブルクリック）
├── ore-no-sushi.html       旧1ファイル版（バックアップ）
├── scenario.csv            VNシナリオ（手動同期）
├── stage-config.csv        ステージパラメーター（手動同期）
├── neta-base.csv           ランク別 base値・基本価格（手動同期）
├── progress.md             セッションごとの進捗メモ
├── CLAUDE.md               このファイル
├── instructions.md         元の引き継ぎ指示
├── reminder.txt            前回のメモ
├── js/
│   ├── util.js             parseCSV
│   ├── audio.js            BGM/SE（Web Audio APIで生成）
│   ├── storage.js          localStorage（unlockedStages, prologueSeen）
│   ├── debug.js            F1パネル、?debug=1、ネタシート出力
│   ├── stage-config.js     stage-config CSV パース
│   ├── ui.js               ステータスバーDOM操作
│   ├── render.js           描画一切（PNGスプライト管理含む）
│   ├── vn-engine.js        VN（背景・キャラ・ダイアログ・フェード）
│   └── game-logic.js       ゲームコア（最後にループ起動）
└── assets/
    └── images/
        ├── neta/           21枚（aji.png 等）
        ├── backgrounds/    bg01〜bg05.png
        ├── characters/     ore20〜60、taisho30/50/70/90
        └── ui/             （空）
```

JS読み込み順は依存に従う:
`util → audio → storage → debug → stage-config → ui → render → vn-engine → game-logic`

---

## 技術構成

- **2層 Canvas**: `#c`（800×600、メイン）+ `#ov`（800×600、オーバーレイ、pointer-events:none）
- **ドット絵**: 200×110px のオフスクリーン `pixelCanvas` に描画 → ×4拡大して `#c` に転写。プレイ画面のキャラ・ベルト・背景はこの方式
- **ネタはPNG優先・ドット絵フォールバック**: `NETA_SPRITE_LOADED[name]` で判定、PNGがあれば `gameCtx.drawImage` で直接描画
- **VN背景・キャラもPNG優先**: 無ければ単色矩形 + ラベルでフォールバック
- **CSV駆動**: HTML内 `<script type="text/plain" id="...">` に埋め込み → `parseCSV` で展開
- **BGM/SEはWeb Audio APIで生成**: `tone(freq, duration, type, vol)` を組み合わせ。BGMは setInterval ベースで bpm 調整
- **状態は単一の `game` オブジェクト**: `phase` で画面切り替え（prologue / title / stageselect / vn / play / tea / billing / result / choice / ending / stage5_center / paused）

---

## CSV手動同期方針（重要）

ダブルクリック起動を維持するため、CSVをブラウザが直接読み込まず **HTMLに埋め込む**。

ユーザーが `*.csv` を編集 → 「更新したよ」とAIに伝える → AIが `index.html` 内の対応する `<script type="text/plain">` ブロックに貼り直す。

埋め込み先:
- `scenario.csv` → `#scenario-data`
- `stage-config.csv` → `#stage-config-data`
- `neta-base.csv` → `#neta-base-data`

---

## 起動・デバッグ

- **起動**: `index.html` を Finder からダブルクリック
- **デバッグパネル**: F1 で切替、または URL末尾に `?debug=1`
- **ステージ直接ジャンプ**: `?debug=1&stage=N`
- **セーブリセット**: タイトル画面で `R`、またはデバッグパネルから

`DEBUG_OVERRIDE` で irritateRate / beltSpeed / 固定価格を一時上書きできる。

---

## 進捗状況

| Step | 内容 | 状態 |
|---|---|---|
| 1 | ファイル分割（js/, assets/） | 完了 |
| 1.5 | デバッグモード | 完了 |
| 2 | stage-config.csv 駆動化 | 完了 |
| 3 | スコア共通式化（scoreMode廃止） | 完了 |
| 4 | Stage5 fadeout演出 | 完了 |
| 5 | PNG読み込み | 完了 |
| 6 | スマホタッチ対応 | 未着手 |

詳細な進捗・改善候補は `progress.md` を参照。
