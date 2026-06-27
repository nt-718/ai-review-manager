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
| **スキル** | [`.claude/skills/ai-code-review/`](./.claude/skills/ai-code-review/) · [`.cursor/skills/ai-code-review/`](./.cursor/skills/ai-code-review/) | 契約。任意のAIエディタにスキーマ準拠のレビューJSONを出力させる。 |
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
# 1. ダッシュボードをビルド（初回・更新時）
npm run build

# 2. 操作盤を起動（http://localhost:4517）
npm run serve
#   または: node scripts/cli.mjs serve
```

開発時はホットリロード付きで起動でき、API はVite開発サーバに同梱されます。

```bash
cd web && npm run dev
```

`review-sources.json` に列挙したリポジトリの `.ai-review/` をライブで読み込むため、
事前の集約コピーは不要です（CIで静的ホスティングする場合のみ `npm run collect` を使用）。

## レビューの生成（スキル）

`ai-code-review` スキルが出力の契約を定義します。AIエディタにこのスキルを参照させて
レビューを依頼すると、対象リポジトリの `.ai-review/<id>.json` に1ファイルが出力されます。

- **ファイル名**: `<YYYY-MM-DD>_<shortCommit>.json`（例: `2026-06-27_abc1234.json`）。
- **1回の実行 = 1ファイル** — 過去のレビューは上書きしません。
- スキルは `category` / `severity` / `confidence` / `status` を固定 enum で強制するため、
  ツールが異なっても結果の一貫性・比較可能性が保たれます。

別のリポジトリでスキルを再利用するには、`.claude/skills/ai-code-review/`（Claude Code用）または
`.cursor/skills/ai-code-review/`（Cursor用）ディレクトリと `schema/review.schema.json` を
そのリポジトリにコピーしてください。

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

処分・指示の書き戻し先は **各ソースリポジトリの** `.ai-review/review-state.json` です。
決定がリポジトリと共に移動するため、そのリポジトリで動くAIがローカルで読めます。

## AIが処分と修正指示を読む

`.ai-review/review-state.json` は人間が決めた処分と修正指示を `fingerprint` キーで保持
します（[`schema/review-state.schema.json`](./schema/review-state.schema.json) 準拠）。

```json
{
  "version": "1.0",
  "entries": {
    "e64e69554a80": {
      "disposition": "ai-fix",
      "instruction": "Promise.allSettledで部分表示にし、失敗件数をまとめて通知して",
      "decidedBy": "user"
    }
  }
}
```

AIエージェントはこのファイルを読み、`disposition` が `ai-fix` の指摘だけを対応対象と
判別し、`instruction`（修正指示）に従って直します。修正後に再レビューを実行すれば、
解消した指摘は `fingerprint` 照合で `done` に整合できます（このループの自動化は
Roadmap の Phase 2）。

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
├── .claude/skills/              # ai-code-review スキル（Claude Code用）
├── .cursor/skills/              # ai-code-review スキル（Cursor用）
├── schema/
│   ├── review.schema.json       # 正規化レビュースキーマ（不変層）
│   └── review-state.schema.json # 処分・修正指示スキーマ（可変層）
├── scripts/
│   ├── cli.mjs                  # reviewops の実行エントリ
│   ├── server.mjs               # ローカルサーバ（API＋dist配信）
│   ├── api.mjs                  # API共通ハンドラ（findings/state）
│   └── collect-reviews.mjs      # 静的ホスティング用の集約（任意）
├── review-sources.example.json  # テンプレート — review-sources.json にコピーして編集
└── web/                         # React + Vite ダッシュボード（操作盤）
```

## ロードマップ

- **Phase 1（実装済）**: CLI＋サーバ、処分の操作盤、修正指示の入力、`review-state.json` への書き戻し。
- **Phase 2**: `ai-fix` レーンを `instruction` どおりに実行する `ai-fix-from-board` スキルと、再レビュー
  照合による自動 `done` / 重複マージ / `wontfix` の再通知抑制。
- **Phase 3**: 修正コミットへのトレーサビリティ、スコアの時系列、複数AIの指摘突合。
- `ai-code-review` スキルと操作盤を、それぞれ単体パッケージ／可視化ライブラリとして配布。

## ライセンス

MIT
