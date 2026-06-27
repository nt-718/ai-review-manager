# ReviewOps

> AIコードレビューの正規化された「契約」と、それを **操作・可視化** するダッシュボード。

[English](./README.md) | **日本語**

ReviewOps は、場当たり的になりがちなAIコードレビューを、どのエディタ
（Claude Code / Cursor など）でも生成できる **正規化された機械可読フォーマット**
に統一します。さらにダッシュボードを単なるビューアではなく、**人間の意思決定をAIへの
指示に変える操作盤** として設計しています。

人間は「直す」のではなく **「振り分ける」**。AIは振り分けられた指摘を実行する。
ボードの状態（処分）がそのまま AI の作業キューになります。

独立した3つのレイヤーで構成されています。

| レイヤー | パス | 役割 |
| --- | --- | --- |
| **スキル** | [`.claude/skills/`](./.claude/skills/) · [`.cursor/skills/`](./.cursor/skills/) | 契約。レビュー生成・修正適用・指摘調査・状態クリーンをAIエディタに指示する。 |
| **スキーマ** | [`schema/`](./schema) | レビュー（不変層）と処分（可変層）の単一の真実（JSON Schema, draft 2020-12）。 |
| **ReviewOps** | [`scripts/`](./scripts) ＋ [`web/`](./web) | CLI＋ローカルサーバ。ダッシュボードを配信し、`.ai-review/` を読み、人間の処分を書き戻す。 |

## 仕組み（操作盤としてのループ）

```
  AIエディタ (Claude Code / Cursor)
        │  .claude/skills/ または .cursor/skills/ai-code-review/SKILL.md に従う
        ▼
  .ai-review/<id>.json      ← 不変。AIが「見つけたもの」(review.schema.json 準拠)
        │
        ▼
  reviewops serve     ← findings(不変) と review-state(可変) を fingerprint で突合
        │
        ▼
  ダッシュボード = 操作盤      ← 人間が指摘を5つの「処分」レーンへ振り分け、修正指示を書く
        │  処分・指示を書き戻す
        ▼
  .ai-review/review-state.json ← 可変。人間が「決めたこと/指示したこと」(review-state.schema.json 準拠)
        │  AIが読む
        ▼
  AIが「AIで修正」レーンを指示どおりに実行 → 再レビュー → 解消を確認して「完了」へ
```

### 処分（disposition）レーン

| UIラベル | `disposition` 値 | 意味 |
| --- | --- | --- |
| **New** | `triage` | 新規。人間の判断待ち（初期値）。 |
| **In Progress** | `ai-fix` | **AIの作業キュー＝発注**。AIはこのレーンだけを対応する。 |
| **In Review** | `manual` | 人間がレビュー中。AIは触らない。 |
| **Won't Fix** | `wontfix` | 理由つきで却下。今後通知しない。 |
| **Done** | `done` | 再レビューで解消を確認済み。 |

人間の処分と修正指示は不変のレビューJSONではなく、指摘の `fingerprint` をキーとした
`.ai-review/review-state.json`（可変層）に保存されます。両者をマネージャが突合するため、
再レビューしても処分・指示は維持されます。

## クイックスタート

```bash
# 1. クローンしてグローバルにリンク（初回のみ）
git clone <this-repo> reviewops
cd reviewops
npm run build   # ダッシュボードをビルド
npm link        # `reviewops` コマンドをグローバルで使えるようにする

# 2. レビューしたい任意のプロジェクトで:
cd ~/projects/my-app
reviewops init         # スキル・スキーマをコピーし、グローバルボードに登録

# 3. 操作盤を起動（http://localhost:4517）
reviewops serve --open
```

開発時はホットリロード付きで起動でき、API はVite開発サーバに同梱されます。

```bash
cd web && npm run dev
```

グローバル設定に登録されたリポジトリの `.ai-review/` をライブで読み込むため、
事前の集約コピーは不要です（CIで静的ホスティングする場合のみ `npm run collect` を使用）。

## CLIリファレンス

```
reviewops init                          スキル・スキーマをプロジェクトへコピーし、グローバルボードに登録
reviewops serve [--port <n>] [--open]  ダッシュボード＋APIサーバを起動（デフォルトポート: 4517）
reviewops status                        ターミナルに指摘サマリーを表示
reviewops validate                      レビューJSONをスキーマで検証
reviewops collect [<path>...]           静的ホスティング用にレビューをコピー
```

### `reviewops init`

レビューしたいリポジトリで実行します。以下を行います。

1. カレントディレクトリに `.ai-review/` を作成。
2. `.claude/skills/`、`.cursor/skills/`、`schema/` をプロジェクトにコピー。
3. 4つのスキルすべてを **`~/.claude/skills/`** にインストール。
   以降はどのプロジェクトでもスキルが使えるようになります（per-project コピー不要）。
4. グローバル設定（`~/.config/reviewops/review-sources.json`）にプロジェクトを登録。
   どこからでも `reviewops serve` でボードに表示されます。

```bash
cd ~/projects/my-app
npx reviewops init
reviewops serve --open   # グローバルボードを開く — my-app が一覧に表示される
```

### `reviewops status`

ターミナルに指摘サマリーを表示します。CIでの簡易確認に便利です。

```
ReviewOps — status

  Sources : 2
  Findings: 14 unique (17 total across all reviews)

  Disposition
    triage        5  ████░░░░░░░░░░░░░░░░
    ai-fix        3  ████████████░░░░░░░░
    manual        2  ████████░░░░░░░░░░░░
    wontfix       1  ████░░░░░░░░░░░░░░░░
    done          3  ████████████░░░░░░░░

  Active by severity (triage + ai-fix + manual)
    must       2  critical
    should     4  high
    imo        4  medium
```

## レビューの生成（スキル）

`ai-code-review` スキルが出力の契約を定義します。AIエディタにこのスキルを参照させて
レビューを依頼すると、対象リポジトリの `.ai-review/<id>.json` に1ファイルが出力されます。

- **ファイル名**: `<YYYY-MM-DD>_<shortCommit>.json`（例: `2026-06-27_abc1234.json`）。
- **1回の実行 = 1ファイル** — 過去のレビューは上書きしません。
- スキルは `category` / `severity` / `confidence` / `status` を固定 enum で強制するため、
  ツールが異なっても結果の一貫性・比較可能性が保たれます。

別のリポジトリでスキルを再利用するには、`reviewops init` を実行するか、手動で
`.claude/skills/ai-code-review/`（Claude Code用）または `.cursor/skills/ai-code-review/`
（Cursor用）ディレクトリと `schema/review.schema.json` をコピーしてください。

## 利用可能なスキル一覧

ReviewOps には4つのスキルが同梱されています（`.claude/skills/` と `.cursor/skills/`）。

| スキル | 呼び出しキーワード例 | 内容 |
| --- | --- | --- |
| **`ai-code-review`** | "このコードをレビューして" | 正規化JSONレビューを生成し `.ai-review/` に書き出す。 |
| **`ai-fix-from-board`** | "ボードを修正して" / "ai-fixを実行して" | `review-state.json` を読み、`ai-fix` 指摘を `instruction` どおりに修正し `done` へ。 |
| **`ai-investigate-finding`** | "この指摘を調査して" | Q&Aスレッドを読みソースコードを調べ、`assistant` 返答をスレッドに追記する。 |
| **`ai-review-clean`** | "レビューをクリーンして" / "古いエントリを削除して" | `review-state.json` から孤立したフィンガープリント（レビューファイルに存在しないもの）を削除。 |

## 複数リポジトリの集約

`review-sources.json` に対象リポジトリを列挙します（パスはプロジェクトルートからの
相対で解決されます）。ReviewOps は各ソースの `.ai-review/` を直接読み書きします。
`review-sources.example.json` を `review-sources.json` にコピーして編集してください。

```json
{
  "sources": [".", "../other-repo"]
}
```

`review-sources.json` は gitignore 済みです。各ユーザーがローカルで自分用のファイルを管理します。

**グローバル設定**: `reviewops init` は `~/.config/reviewops/review-sources.json`
（または `$XDG_CONFIG_HOME/reviewops/review-sources.json`）にもプロジェクトを登録します。
ReviewOps はプロジェクトレベルの設定を優先し、見つからない場合はグローバル設定を使用します。
これにより、ReviewOps パッケージディレクトリから `reviewops serve` を実行するだけで、
`init` したすべてのプロジェクトのレビューが表示されます。

処分・指示の書き戻し先は **各ソースリポジトリの** `.ai-review/review-state.json` です。
決定がリポジトリと共に移動するため、そのリポジトリで動くAIがローカルで読めます。

## ダッシュボード

`reviewops serve` でボードが `http://localhost:4517` に開きます。複数リポジトリが設定
されている場合は **リポジトリ選択画面** が先に表示されます。URLハッシュ（`#my-org/my-repo`）
でブックマークできます。

### ビュー

| タブ | 内容 |
| --- | --- |
| **Board** | 5つの処分レーンのKanban。カードをクリックして処分・指示・メモを更新。 |
| **Files** | ファイルパス別に集約した指摘一覧。問題の多いファイルを素早く把握。 |
| **History** | 実行日時・スコア・指摘件数でレビュー履歴を時系列表示。 |
| **Insights** | アクティブな指摘の重要度・観点別の内訳グラフ。 |

**ブランチサイドバー** でブランチ別フィルタリング、**フィルターサイドバー** で重要度・
観点・レビューツール別フィルタリングが可能です。ヘッダーの☀/☾ボタンでライト/ダーク
テーマを切り替えられます。

### 詳細パネルと調査スレッド

指摘カードをクリックすると詳細パネルが開き、指摘の全文・処分操作・**調査（Investigation）
スレッド** が表示されます。チームメンバーが質問を投稿すると、`ai-investigate-finding`
スキルがソースコードを調べてスレッドにAI回答を直接追記します。

## AIが処分と修正指示を読む

`.ai-review/review-state.json` は人間が決めた処分と修正指示を `fingerprint` キーで保持
します（[`schema/review-state.schema.json`](./schema/review-state.schema.json) 準拠）。

```json
{
  "version": "1.0",
  "entries": {
    "my-repo": {
      "e64e69554a80": {
        "disposition": "ai-fix",
        "instruction": "Promise.allSettledで部分表示にし、失敗件数をまとめて通知して",
        "note": "",
        "thread": [
          { "role": "user",      "text": "リトライパスにも同じ問題がある？",          "at": "2026-06-27T10:00:00Z" },
          { "role": "assistant", "text": "はい。src/retry.ts:42 に同じパターンがあります。", "at": "2026-06-27T10:01:00Z" }
        ],
        "history": [
          { "from": "triage", "to": "ai-fix", "at": "2026-06-27T09:55:00Z", "by": "user" }
        ],
        "decidedAt": "2026-06-27T09:55:00Z",
        "decidedBy": "user"
      }
    }
  }
}
```

AIエージェントはこのファイルを読み、`disposition` が `ai-fix` の指摘だけを対応対象と
判別し、`instruction`（修正指示）に従って直します。`ai-fix-from-board` スキルがこの
ループを自動化し、修正済みの指摘を `done` に更新します。

## レビュースキーマ

正規化フォーマットは
[`schema/review.schema.json`](./schema/review.schema.json) に定義されています。最小例:

```json
{
  "schemaVersion": "1.0",
  "id": "2026-06-27_abc1234",
  "createdAt": "2026-06-27T00:00:00Z",
  "reviewer": { "tool": "claude-code", "model": "claude-sonnet-4-6" },
  "target": { "repo": "my-repo", "branch": "main", "commit": "abc1234" },
  "summary": { "score": 80, "text": "総評を1〜2文で。" },
  "findings": [
    {
      "id": "f1",
      "fingerprint": "e64e69554a80",
      "file": "src/auth.ts",
      "line": { "start": 20, "end": 24 },
      "severity": "critical",
      "category": "security",
      "confidence": "high",
      "message": "指摘内容を1文で。",
      "suggestion": "具体的な修正方針。",
      "status": "open"
    }
  ]
}
```

[ajv](https://ajv.js.org/) でレビューファイルをスキーマ検証できます。

```bash
npx --yes --package=ajv-cli@5 --package=ajv-formats@2 -- ajv validate \
  -s schema/review.schema.json -d ".ai-review/*.json" -c ajv-formats --spec=draft2020
```

### Enum 一覧

- **category（観点）**: `security` / `bug` / `performance` / `maintainability` / `test` / `docs` / `other`
- **severity（重要度）**: `critical` / `high` / `medium` / `low` / `info`
- **confidence（確信度）**: `high` / `medium` / `low`
- **status（対応状態）**: `open`（未対応）/ `acknowledged`（確認中）/ `resolved`（対応済）/ `dismissed`（対象外）

## ディレクトリ構成

```
.
├── .ai-review/                  # このリポジトリのレビューJSON ＋ review-state.json（gitignore済み）
├── .claude/skills/              # Claude Code用スキル
│   ├── ai-code-review/          #   レビュー生成
│   ├── ai-fix-from-board/       #   ai-fixレーンの修正適用
│   ├── ai-investigate-finding/  #   指摘へのQ&A調査
│   └── ai-review-clean/         #   孤立エントリの削除
├── .cursor/skills/              # 同じ4スキルのCursor版
├── schema/
│   ├── review.schema.json       # 正規化レビュースキーマ（不変層）
│   └── review-state.schema.json # 処分・修正指示スキーマ（可変層）
├── scripts/
│   ├── cli.mjs                  # reviewops の実行エントリ
│   ├── server.mjs               # ローカルサーバ（API＋dist配信）
│   ├── api.mjs                  # API共通ハンドラ（findings/state/thread）
│   ├── init.mjs                 # reviewops init ロジック
│   ├── status.mjs               # reviewops status ロジック
│   └── collect-reviews.mjs      # 静的ホスティング用の集約（任意）
├── review-sources.example.json  # テンプレート — review-sources.json にコピーして編集
└── web/                         # React + Vite ダッシュボード（操作盤）
```

## ライセンス

MIT
