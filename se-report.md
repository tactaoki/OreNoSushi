# SE（効果音）レポート — 2026-05-08

`js/audio.js` で定義されている全SEと、`js/game-logic.js` 内での使用箇所をまとめます。
すべて Web Audio API で生成（PCMファイル不使用）。`tone(freq, duration, type, volume, delay)` と `playNoise(duration, volume, delay)` の組み合わせ。

---

## 全体サマリー

| # | 関数名 | 使用 | 用途 |
|---|---|---|---|
| 1 | `sfxEatGreat` | ○ | おすすめネタを食べた時 |
| 2 | `sfxEatGood` | × | （未使用） |
| 3 | `sfxEatMid` | ○ | おすすめ以外を食べた時 |
| 4 | `sfxEatBad` | × | （未使用） |
| 5 | `sfxEatTerrible` | × | （未使用） |
| 6 | `sfxChew` | ○ | 食べた瞬間（毎回） |
| 7 | `sfxGulp` | ○ | お茶を飲む |
| 8 | `sfxGari` | ○ | ガリを食べる |
| 9 | `sfxRegister` | ○ | 会計：合計確定 |
| 10 | `sfxCoin` | ○ | 会計：1皿ごとの加算 |
| 11 | `sfxDead` | × | （未使用） |
| 12 | `sfxBuzz` | ○ | エラー / イライラ閾値突破 |
| 13 | `sfxBan` | ○ | リザルト：各段階の表示 |
| 14 | `sfxJingle` | ○ | 会計画面遷移時 |
| 15 | `sfxBillIntro` | ○ | 「お勘定」演出（Q押下時） |
| 16 | `sfxScoreFanfare` | ○ | リザルト：最終スコア表示 |

定義16個 / 使用12個 / **未使用4個**。

---

## 個別詳細

### 1. `sfxEatGreat` — おすすめ命中
- **音色**: sine 5音上昇 G5(784) → B5(988) → D6(1175) → G6(1568) → C7(2093)
- **印象**: キラキラした上昇ファンファーレ
- **呼び出し**: `game-logic.js:601` `eat()` 内、`isRec` 分岐
- **トリガー**: おすすめネタ命中時。`showBubble('美味い！！')` と同時、フラッシュ＆コンボ加算とセット
- **fadeoutステージ**: 何を食べてもおすすめ扱いになるので毎回鳴る

### 2. `sfxEatGood` — （未使用）
- **音色**: sine 3音上昇 C5(523) → E5(659) → G5(784)
- **印象**: メジャーコードの軽快な上昇
- **メモ**: 過去のスコアモード（並み程度の食事）の名残。現在は呼び出しなし

### 3. `sfxEatMid` — おすすめ外
- **音色**: triangle 2音 C5(523) → E5(659)
- **印象**: 控えめな短い音
- **呼び出し**: `game-logic.js:621` `eat()` 内、`!isRec` 分岐
- **トリガー**: おすすめ外を食べた時。`mult` は同ランクなら0.8、別ランクなら0.5

### 4. `sfxEatBad` — （未使用）
- **音色**: sine 低音2音 180Hz → 140Hz
- **印象**: 鈍く下がる音
- **メモ**: 旧スコアモード（並み以下）の名残

### 5. `sfxEatTerrible` — （未使用）
- **音色**: sawtooth 110Hz/90Hz + ノイズ
- **印象**: 唸るような不快音
- **メモ**: 旧スコアモード（最悪）の名残

### 6. `sfxChew` — 咀嚼音
- **音色**: square 4回ランダム低音（90〜140Hz）、各0.12秒間隔
- **印象**: モグモグ
- **呼び出し**: `game-logic.js:656` `eat()` 末尾
- **トリガー**: 食べたら必ず鳴る（`sfxEatGreat`/`sfxEatMid` の上に重なる）

### 7. `sfxGulp` — お茶を飲む
- **音色**: sine 10回ランダム低音（100〜180Hz）、0.35秒間隔で約3.5秒
- **印象**: ゴクゴクゴク……
- **呼び出し**: `game-logic.js:504` `startTea()`
- **トリガー**: Z押下、お茶開始時。`showBubble('ゴクゴクゴク……')` と同時

### 8. `sfxGari` — ガリ
- **音色**: sine 3音上昇 800Hz → 1200Hz → 1600Hz、0.04秒間隔
- **印象**: シャリッ（短い高音）
- **呼び出し**: `game-logic.js:544` `eatGari()`
- **トリガー**: E押下、ガリ消費時。次の皿の値段確定機能とセット

### 9. `sfxRegister` — レジ
- **音色**: 2800Hz sine ベル → 300ms遅延で sawtooth 4音降下（1200/800/500/300）
- **印象**: チーン → ガッシャン（レジ開閉音）
- **呼び出し**: `game-logic.js:834` `update()` 内 billing フェーズ
- **トリガー**: 全皿の加算が終わり、合計金額確定時

### 10. `sfxCoin` — コイン
- **音色**: square 2音 1319Hz → 1568Hz、0.07秒間隔
- **印象**: チャリン
- **呼び出し**: `game-logic.js:832` `update()` 内 billing フェーズ
- **トリガー**: 会計画面で1皿ずつ加算されるたびに鳴る

### 11. `sfxDead` — （未使用）
- **音色**: sawtooth 233Hz/147Hz、0.4-0.6秒
- **印象**: 重く沈むダウン音
- **メモ**: 旧版でゲームオーバー用だったと推測。現在のRETRYは無音

### 12. `sfxBuzz` — ブザー
- **音色**: sawtooth 55Hz + square 58Hz + ノイズ（うなり）
- **印象**: ブブー（エラー音）
- **呼び出し**: 計5箇所
  - `game-logic.js:488` Zキー押下、お茶非対応ステージ
  - `game-logic.js:492` Eキー押下、ガリ非対応ステージ
  - `game-logic.js:542` `eatGari()`、ガリ残数0
  - `game-logic.js:799` イライラ60超え、初回ペナルティ発火
  - `game-logic.js:803` イライラ40超え、初回ペナルティ発火

### 13. `sfxBan` — 衝撃音
- **音色**: square 150Hz + ノイズ + square 300Hz
- **印象**: ドン！（短い打撃）
- **呼び出し**: `game-logic.js:845` `update()` 内 result フェーズ
- **トリガー**: リザルト画面で `resultPhase` が 1〜5 に進むたび（皿数→金額→満足度→価格補正→満腹補正の表示タイミング）

### 14. `sfxJingle` — ジングル
- **音色**: sine 4音上昇 C5/E5/G5/C6（メジャーコード分散）
- **印象**: 軽快な上昇音
- **呼び出し**: `game-logic.js:525` `enterBillingScreen()`
- **トリガー**: お勘定演出後、会計画面（皿一覧）に遷移する瞬間。BGM `bill` 開始と同時

### 15. `sfxBillIntro` — お勘定演出（NEW）
- **音色**: square 110Hz + sawtooth 80Hz + ノイズ + square 上昇 440/587/880Hz + sine 1175Hz
- **印象**: 低音インパクト → 上昇トーン（ドラマチック）
- **呼び出し**: `game-logic.js:514` `startBill()`
- **トリガー**: Q押下、または満腹で強制会計時。プレイ画面フリーズ＋「お勘定」表示と同時。BGM停止

### 16. `sfxScoreFanfare` — スコアファンファーレ
- **音色**: ノイズ8回（ドラムロール）→ sine 4音上昇 C5/E5/G5/C6
- **印象**: ドコドコドコ → ジャジャーン
- **呼び出し**: `game-logic.js:845` `update()` 内 result フェーズ
- **トリガー**: `resultPhase === 6`（最終スコア大写し）

---

## 観察・改善余地

### 未使用SE（4個）
- `sfxEatGood` `sfxEatBad` `sfxEatTerrible` `sfxDead` は全ステージ共通スコア式に統一した時点で参照が消えた残骸
- 削除しても支障なし（ファイルサイズ微減）。再利用したいシーンがあれば残す価値あり

### 重複・重なり
- 食事時は `sfxChew`（毎回）+ `sfxEatGreat`/`sfxEatMid`（評価別）が同時発火。意図的な層化
- お勘定演出は `sfxBillIntro`（startBill）→ 1.5秒後 `sfxJingle`（enterBillingScreen）の二段。演出と画面遷移を分けている

### 音量
- BGMは `bgmVolume` 変数で `setBGMVolume()` から制御可（Stage5フェードで使用）
- SEは個別関数内のリテラル値固定。一括音量調整不可

### 無音シーン
- VN中は完全無音（BGMのみ）。クリック音やページめくり音はなし
- ステージ選択カーソル移動・ポーズ画面のカーソル移動も無音
- タイトル画面の「何かキー」も無音

---

## SE発火の主要なタイミングまとめ

```
プレイ中
├ 食べる    → sfxChew + (sfxEatGreat | sfxEatMid)
├ お茶      → sfxGulp
├ ガリ      → sfxGari
├ エラー    → sfxBuzz（不可操作 / 残数0 / イライラ閾値）
└ Q/満腹    → sfxBillIntro

お勘定演出（1.5s）
└ 終了時    → sfxJingle

会計画面
├ 1皿加算   → sfxCoin（食べた皿数ぶん）
└ 合計確定  → sfxRegister

リザルト画面
├ Phase1〜5 → sfxBan（5回）
└ Phase6    → sfxScoreFanfare
```
