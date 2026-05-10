# 「俺の寿司」進捗 — 2026-05-08 セッション終了時点

## 今日やったこと

- **コンボ表示の改修**
  - 1連目から段階的に派手化: `combo!` → `combo x2!!` → `combo x3!!!`
  - フォントサイズ・色・揺れ・グローを連数に応じて強める
  - 3連目で combo は0にリセット、ラベルはタイマー切れまで表示
  - 関連: `js/render.js` の `renderPlay` 内コンボ表示ブロック / `js/game-logic.js` の `eatSushi` 内
  - 状態フィールドに `comboShown`（描画派手度用）を追加

- **ステージ選択パネル刷新**
  - `assets/images/ui/stage_base.png` をパネル背景として読み込み、各パネルに使用
  - 各パネルに「第一話 邂逅／第二話 飛躍／第三話 葛藤／第四話 決戦／第五話 そして…」を上下2段表示
  - `imageSmoothingEnabled = false` でドット絵をパキッと拡大
  - 未解放はα0.45で暗く、選択中は金色枠を上から重ねる
  - 関連: `js/render.js` の `renderStageSelect` と冒頭の `STAGE_BASE_IMG` 定義

- **VN・ヒント大将画像を5枚版に対応**
  - `assets/images/characters/taisho30/40/50/60/70.png` の5枚に対応
  - `TAISHO_AGE_MAP = { 20:30, 30:40, 40:50, 50:60, 60:70 }`（俺＋10歳の大将を割当）
  - preload対象も `[30,40,50,60,70]`
  - 関連: `js/vn-engine.js`

- **BGM 速度変動機能を削除**
  - 食べた枚数で再生レートを上げる仕掛けをオミット
  - 削除: `updateBGMRate` 関数 / `bgmRate` 変数 / `lastBgmTick` 状態 / `startBGM` の `rate` 引数 / `playbackRate` 設定
  - 関連: `js/audio.js`, `js/game-logic.js`

- **GitHub への初プッシュ（マルチファイル構成）**
  - リモート: `https://github.com/tactaoki/OreNoSushi.git`
  - これまで未プッシュだった `index.html + js/ + assets/ + 各CSV + ドキュメント` 一式を1コミットに集約してpush（494cab1）
  - `.gitignore` 新規追加（`.DS_Store`, `._*`, `.mscbackup/`）
  - HTTP 400 が出たので `git config http.postBuffer 524288000` をリポジトリローカルに設定（他リポジトリには影響なし）

---

## 進捗ステップ

| Step | 内容 | 状態 |
|---|---|---|
| 1 | ファイル分割（js/, assets/） | ✅ 完了 |
| 1.5 | デバッグモード（`?debug=1` または **F1**で切替） | ✅ 完了 |
| 2 | stage-config.csv 駆動化 | ✅ 完了 |
| 3 | scoreMode → 廃止し全ステージ共通式に | ✅ 完了 |
| 4 | Stage5 fadeout演出（独白→白フェード→FIN） | ✅ 完了 |
| 5 | PNG読み込み（ネタ／背景／VN／キャラ／UI） | ✅ 完了 |
| 6 | スマホタッチ対応 | ⏸️ 未着手 |

---

## ファイル構成（現状）

```
OreNoSushi/
├── index.html              起動ファイル（ダブルクリック）
├── .gitignore              .DS_Store / ._* / .mscbackup を除外
├── _old/
│   ├── instructions.md
│   └── ore-no-sushi.html   旧1ファイル版バックアップ
├── scenario.csv            VNシナリオ（手動同期）
├── stage-config.csv        ステージパラメーター（手動同期）
├── neta-base.csv           ランク別 base値・基本価格（手動同期）
├── stage-hints.csv         ステージごとのヒント
├── progress.md             このファイル
├── CLAUDE.md               プロジェクト概要・運用ルール
├── reminder.txt / se-report.md / update-sfx.command 各種補助
├── js/
│   ├── util.js / audio.js / storage.js / debug.js
│   ├── stage-config.js / ui.js / render.js
│   ├── vn-engine.js / sfx-manifest.js / game-logic.js
└── assets/
    ├── images/
    │   ├── neta/                   21枚
    │   ├── backgrounds/            bg01〜bg05.png + result/ + story/
    │   ├── characters/             ore20〜60 + taisho30〜70
    │   └── ui/stage_base.png       ステージ選択パネル背景
    └── sounds/
        ├── bgm/                    Title/VN/game/Result.mp3
        └── sfx/                    各種効果音（mp3/wav）
```

---

## 現状のCSV値（バランス）

### stage-config.csv
| Stage | age | label | maxRank | budget | irritate | beltSpeed | maxFull | tea | gari | fadeout |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 20 | 新卒 | 2 | 3300 | 1 | 52 | 25 | × | × | × |
| 2 | 30 | 30代 | 3 | 3700 | 3 | 56 | 22 | ○ | × | × |
| 3 | 40 | 40代 | 4 | 5000 | 8 | 62 | 20 | ○ | ○ | × |
| 4 | 50 | 50代 | 5 | 6000 | 4 | 56 | 15 | ○ | ○ | × |
| 5 | 60 | 定年 | 5 | 0 | 1 | 36 | 999 | ○ | ○ | ○ |

### neta-base.csv
| rank | 皿色 | price | base |
|---|---|---|---|
| 0 | 水色 | 100 | 30 |
| 1 | 緑 | 200 | 45 |
| 2 | 黄色 | 300 | 55 |
| 3 | 赤 | 400 | 60 |
| 4 | 銀 | 500 | 70 |
| 5 | 金 | 800 | 80 |

---

## 覚えておくべき仕様

- **スコア**: `score = sat × priceMult × fullnessMult`（全ステージ共通）
  - `priceMult = budget / billTotal`（budget=0なら 1.0）
  - `fullnessMult`: `maxFull × 0.6 〜 0.8` で 1.0、範囲外で減衰
  - クリア閾値: `score ≥ 600`
- **コンボ**: 倍率 `min(2.5, 1.0 + combo × 0.5)`、3連で最大×2.5、その後リセット
- **ベルト速度**: `config.beltSpeed + game.full × 0.5`
- **発生間隔**: `rand(0.35, 0.9) / (config.beltSpeed / 22)` で密度を一定に
- **おすすめ抽選**: targetRank 以下から `重み = 1 + rank×0.5` で重み付き
- **キャラ年齢マップ**: `TAISHO_AGE_MAP = {20:30, 30:40, 40:50, 50:60, 60:70}`
- **CSV手動同期**: ユーザーがCSV編集 → AIが index.html の `<script type="text/plain">` 埋め込みも同期

---

## 改善余地（次回以降の候補）

- **Step6**: スマホタッチ対応（横向き、バーチャルボタン）— 未着手
- バランス微調整: Stage4 で「神」が取りやすい傾向、Stage1「上」クリアの安定度
- pause画面の整理
- ハイスコア記録（localStorage）
- `game-logic.js` の更なる分割（700行超）

---

## 引き継ぎ時の合言葉

- 起動: `index.html` をFinderからダブルクリック
- 動作確認: F1 → 各ステージにジャンプして即テスト
- CSV編集したら「更新したよ」と伝えれば、AI が `index.html` 埋め込みに同期
- セッション終了の合図は **「今日は終わりにしよう」**（CLAUDE.md 参照）
