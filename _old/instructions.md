# 「俺の寿司」申し送りファイル
> ターミナル版（Claude Code）向け。現状のコードを把握した上で作業すること。

---

## 現状の実装状況（ore-no-sushi.html）

一枚のHTMLに全機能が実装されている。約1400行。

**既に実装済みの機能：**

- プロローグ画面（起動直後。黒背景にテキスト直接描画。VNエンジン不使用）
- タイトル画面（BGM付き。Rキーでセーブリセット）
- ステージセレクト画面（A/D移動、Space決定、順番解放）
- VNエンジン（紙芝居。フェード、キャラ表示、セリフ、ナレーション対応）
- シナリオ（HTMLに`<script type="text/plain" id="scenario-data">`として埋め込み済み）
- ゲームプレイ画面（上下2段レーン、おっさんキャラ、皿カード、おすすめパネル）
- 会計画面・リザルト画面
- RETRY/CLEAR/ENDINGフロー（VNシーンを経由して遷移）
- BGM（title/play/bill の3種、Web Audio API）
- SE（食べる/お茶/ガリ/会計/コンボ等）
- セーブ機構（localStorageでunlockedStagesとprologueSeen管理）
- ポーズ画面
- 時価システム（正規分布でゲーム開始時に価格決定）
- コンボシステム（おすすめを連続で食べると倍率アップ、3連でリセット）
- ガリ（おすすめを即切り替え、次に食べた皿の値段を確定表示）
- お茶（イライラリセット、3秒操作不能）
- 操作説明帯（#keys）はゲームプレイ中のみ表示。それ以外は非表示

**未実装の機能：**

- stage-config.csvによるステージパラメーターの外部管理
- pngアセットの読み込み（現状はCanvasで直接描画）
- 音声ファイルの読み込み（現状はWeb Audio APIで生成）
- スマホタッチ対応
- Stage5専用のフェードアウト演出
- デバッグモード

---

## 重要な構造

**起動フロー：**
```
初回起動：prologue（黒画面+テキスト） → キー押下 → title（BGM開始） → stageselect → ...
2回目以降：title（BGM開始） → stageselect → ...
```

**プロローグの仕様：**
- VNエンジンは使わない。renderPrologue()で直接Canvasにテキスト描画
- シナリオCSVのPROLOGUEシーンは現状未使用（将来的に別の場所で使う可能性あり）
- キー押下 or クリックでオーディオ初期化→タイトルへ遷移

**ゲームフロー：**
```
title → stageselect → (Stage N_OPEN VN) → play → billing → result
→ score >= 420: (Stage N_CLEAR VN) → (Inter VN) → stageselect or ending
→ score < 420:  (Stage N_RETRY VN) → choice（リトライ or タイトル）
```

**シナリオ管理：**
HTMLに埋め込まれたCSVをparseAndStoreScenario()で読み込み、scenario.scenesというMapに格納。
キーは「Stage1_OPEN」「Stage1_CLEAR」「Stage1_RETRY」「Inter_0」「Inter_1」「Ending」など。

**スコア計算（現状）：**
sat × priceMult（3000円基準）× fullnessMult（10〜15皿で補正なし）
※ステージごとのスコアモード切り替えは未実装

**セーブ：**
- orenosushi_unlocked：解放済みステージ数
- orenosushi_prologue：プロローグ既読フラグ

---

## 添付ファイル

- `ore-no-sushi.html` — 現状のゲーム（上記全機能実装済み）
- `stage-config.csv` — 5ステージのパラメーター定義
- `scenario.csv` — 全ステージのシナリオテキスト（HTMLにも埋め込み済み）

---

## Step別作業指示

**Step 1：ファイル分割**
動作を変えずにjsファイルに分割する。

```
ore-no-sushi/
├── index.html
├── stage-config.csv
├── scenario.csv
├── js/
│   ├── stage-config.js     ステージ別パラメーター（CSVから読み込む）
│   ├── game-logic.js       ゲームコア処理
│   ├── render.js           描画処理
│   ├── audio.js            BGM・SE
│   ├── storage.js          セーブ・ロード
│   ├── vn-engine.js        VNエンジン（紙芝居）
│   └── ui.js               UI制御
└── assets/
    ├── images/
    │   ├── neta/
    │   ├── characters/
    │   ├── backgrounds/
    │   └── ui/
    └── sounds/
        ├── bgm/
        └── effects/
```

**Step 1.5：デバッグモードの実装（Step1完了後、余裕があれば）**

URLパラメーターで起動するデバッグモードを実装する。本番ビルドには影響しない設計にすること。

```
index.html?debug=1&stage=3
```

実装してほしい機能：
- 任意のステージに直接ジャンプ（&stage=N）
- 全ステージ解放
- VNシーンの任意再生
- スコアモードの切り替えテスト
- 皿の時価を固定表示
- パラメーターのリアルタイム変更（イライラ速度・ベルト速度等）

**Step 2：stage-config.csv読み込み**

stage-config.csvを読み込んでステージパラメーターを外部管理化する。

CSVの構造：
```
stage,age,label,maxPlateRank,budget,irritateRate,beltSpeed,maxFull,scoreMode,tea,gari,fadeout
1,22,新卒,2,1200,1,20,25,quantity,FALSE,FALSE,FALSE
2,30,30代,3,2500,3,22,22,costperformance,TRUE,FALSE,FALSE
3,40,40代,4,5000,8,25,20,price,TRUE,TRUE,FALSE
4,50,50代,5,8000,4,22,15,combo,TRUE,TRUE,FALSE
5,60,定年,5,0,1,20,999,freeplay,TRUE,TRUE,TRUE
```

各パラメーターの意味：
- maxPlateRank：出現する皿の最高ランク（0=水色〜5=金）
- budget：目標予算（0=制限なし）
- irritateRate：イライラの上昇速度（毎秒%）
- beltSpeed：レーンの移動速度
- maxFull：満腹度の上限（皿数）
- scoreMode：スコア計算方式（quantity/costperformance/price/combo/freeplay）
- tea/gari：そのステージで使用可能かどうか
- fadeout：Stage5のフェードアウト演出フラグ

**Step 3：スコアモードの実装**

scoreModeに応じてステージごとに満足度の計算式を変える。

- quantity：枚数が多いほど高スコア
- costperformance：予算内でのコスパ
- price：高い皿ほど高スコア
- combo：おすすめ一致・コンボ重視（現状の計算式に近い）
- freeplay：スコア計算なし、満足度はゲーム開始からMAXに向けて自動上昇

**Step 4：Stage5フェードアウト演出**

fadeout=TRUEのステージでは以下の演出を追加する：
- 時間経過とともに画面が白く淡くなる
- BGMの音量が徐々に下がる
- 食べるごとに独り言テキストが表示される
- UIバー（満腹度・満足度・イライラ）が段階的に消える
- 最後に「これが……俺の寿司だ」が画面中央に表示
- 完全フェードアウト後、Endingシーンへ遷移

**Step 5：pngアセット差し替え準備**

寿司ネタのpng読み込みに対応する。ファイルが存在しない場合は現状のCanvas描画にフォールバックすること。

ネタのファイル名（assets/images/neta/）：
natto.png / kappa.png / tunamayo.png / tamago.png / kohada.png /
shimesaba.png / ika.png / ebi.png / maguro.png / salmon.png /
aji.png / katsuo.png / engawa.png / hotate.png / tai.png /
unagi.png / kanpachi.png / chutoro.png / zuwaikani.png / otoro.png / uni.png

**Step 6：スマホタッチ対応**

PC（キーボード）とスマホ（タッチパネル）のコンパチブル対応。
画面は横向き固定。スマホ検出時はバーチャルボタンを画面下部に表示。

---

## 全体方針

- アセット（ドット絵・BGM・SE・背景）は制作者が別途用意する。コードにはプレースホルダーを入れておくこと
- ゲームメカニクスはシンプル。チュートリアルとストーリーを追えば数回のリトライで先に進める難易度
- 総プレイ時間は約2時間を想定
- 作業は必ずStep単位で進め、各Step完了後に動作確認してから次に進むこと
- シナリオはHTMLに埋め込み済み＆scenario.csvの二重管理状態。ファイル分割時にscenario.csvを正として統一すること
