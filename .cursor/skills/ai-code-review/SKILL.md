---
name: ai-code-review
description: Review code and emit a normalized JSON review file conforming to schema/review.schema.json into .ai-review/. Use when the user asks for a code review whose result should be visualized in the AI review dashboard, or mentions reviewing code into .ai-review.
---

# AI Code Review (Normalized JSON Output)

This skill defines the **contract** for AI code reviews so that any AI editor (Claude Code, Cursor, etc.) produces an identical, machine-readable result that the dashboard can visualize.

## Goal

Review the target code and write the result as a single JSON file conforming to `schema/review.schema.json`, saved to `.ai-review/<id>.json` in the reviewed repository.

## Output Location and Naming

- Directory: `.ai-review/` at the repository root.
- File name: `<YYYY-MM-DD>_<shortCommit>.json` (e.g. `2026-06-27_abc1234.json`). If no commit is available, use `<YYYY-MM-DD>_<shortRandom>.json`.
- One file per review run. Do not overwrite previous reviews.

## Review Workflow

```
- [ ] 1. Identify the review target (diff, PR, or whole repo) and gather repo/branch/commit
- [ ] 2. Read all relevant source files thoroughly — don't skip tests, config, or schema files
- [ ] 3. Detect issues across all categories; prefer depth over breadth for each finding
- [ ] 4. Write findings + summary into the JSON structure below
- [ ] 5. Validate against schema/review.schema.json (all required fields, valid enums)
- [ ] 6. Save to .ai-review/<id>.json
```

## Output Schema (must conform to schema/review.schema.json)

```json
{
  "schemaVersion": "1.0",
  "id": "2026-06-27_abc1234",
  "createdAt": "2026-06-27T00:00:00Z",
  "reviewer": { "tool": "cursor", "model": "claude-opus-4.8" },
  "target": { "repo": "my-repo", "branch": "main", "commit": "abc1234", "pr": 42 },
  "summary": { "score": 80, "text": "全体の評価と主なパターンをここに書く。" },
  "findings": [
    {
      "id": "f1",
      "fingerprint": "e64e69554a80",
      "file": "src/auth.ts",
      "line": { "start": 20, "end": 24 },
      "severity": "critical",
      "category": "security",
      "message": "指摘内容の詳細説明（2〜3文）。",
      "suggestion": "具体的な修正方法とコード例。",
      "confidence": "high",
      "status": "open",
      "codeSnippet": "該当箇所のコード抜粋"
    }
  ]
}
```

### Required fields

- Top level: `schemaVersion` (always `"1.0"`), `id`, `createdAt` (ISO 8601), `reviewer.tool`, `target.repo`, `findings`.
- Each finding: `id`, `file`, `severity`, `category`, `message`, **`confidence`**.
- `suggestion`, `line`, `codeSnippet`, `summary`, `status`, `fingerprint` are recommended but optional. Default `status` to `"open"`.

## Writing quality standards

### `summary.text`
3〜4文で書く。スコアの根拠、目立つ問題のパターン、良かった点、優先して直すべき領域を含める。

**悪い例**: "全体的に問題があります。"
**良い例**: "認証周りに critical が2件あり、本番運用前に必ず対処が必要です。エラーハンドリングが一貫しておらず、Promise を握りつぶしているケースが複数のモジュールで見られます。テストカバレッジは主要なハッピーパスを押さえているものの、境界値とエラーパスが手薄です。型定義は丁寧で可読性は高いため、スコアは 62 としました。"

### `message`
**2〜3文で書く。** 1文目で問題を特定し、2文目でなぜそれが問題なのか（リスク・影響・根拠）を説明し、必要なら3文目で問題の範囲や関連箇所を補足する。

**悪い例**: "エラーが握りつぶされています。"
**良い例**: "fetchUser() の catch ブロックが空で、ネットワークエラーや認証エラーを呼び出し元に伝達していません。これにより、ログインに失敗してもUIがエラーを表示せず、ユーザーが何も起きていないと誤認するリスクがあります。同じパターンが fetchProfile() と updateSettings() にも存在します。"

### `suggestion`
**具体的なコード例か、番号付きの修正手順を含める。** 「〜してください」で終わる抽象的な指示は不十分。

**悪い例**: "適切なエラーハンドリングを追加してください。"
**良い例**:
```
catch ブロックでエラーを再スローするか、呼び出し元が処理できる形で返す:

  async function fetchUser(id: string): Promise<User> {
    try {
      const res = await api.get(`/users/${id}`);
      return res.data;
    } catch (e) {
      // ログに記録してから再スロー
      logger.error("fetchUser failed", { id, error: e });
      throw new ApiError("ユーザー取得に失敗しました", { cause: e });
    }
  }

fetchProfile() と updateSettings() にも同じ修正を適用する。
```

### `codeSnippet`
問題の該当箇所が明確になる場合は必ず含める（`line` と合わせて使う）。修正前のコードを貼ること。

### fingerprint（レビュー実行をまたぐ安定ID）

`fingerprint` は再レビュー時に同一指摘を識別するための安定ID。人間の処分・修正指示（`.ai-review/review-state.json`）はこの `fingerprint` に紐づくため、付与すると再レビュー後も維持される。

- 算出方法: `sha1(repo + "\0" + file + "\0" + category + "\0" + 正規化message)` の先頭12桁。正規化messageは前後空白除去・小文字化・連続空白を1つに圧縮したもの。**行番号は含めない**（行ズレに強くするため）。
- 省略した場合はマネージャ側が同じ規則で算出する。可能な限り付与すること。

## Fixed Enums (do not invent new values)

### category (review perspective)

| value | 観点 | 含むもの |
|-------|------|---------|
| `security` | セキュリティ | 認証/認可、機密情報漏えい、インジェクション |
| `bug` | バグ | ロジック誤り、未処理の例外、null/undefined、競合状態 |
| `performance` | パフォーマンス | N+1、不要な再計算、計算量、メモリ |
| `maintainability` | 可読性・保守性 | 命名、責務過多、重複、複雑度、エラー処理設計 |
| `test` | テスト | 不足・脆いテスト、カバレッジ |
| `docs` | ドキュメント | コメント/README/型注釈の不足 |
| `other` | その他 | 上記に当てはまらないもの |

### severity (PR comment prefix)

Store the enum value in JSON; the dashboard displays the PR-style prefix.

| value | UI prefix | 基準 |
|-------|-----------|------|
| `critical` | **must** | マージ/blocker 級。本番障害・セキュリティに直結 |
| `high` | **should** | 強く推奨。重大な不具合やリスク |
| `medium` | **imo** | 主観的提案。議論の余地あり |
| `low` | **nit** | 軽微。スタイル・命名など |
| `info` | **fyi** | 情報共有。修正必須ではない |

### confidence

Every finding **must** include `confidence`. Display as `high` / `medium` / `low` (evidence strength — distinct from severity priority).

| value | 基準 |
|-------|------|
| `high` | コード上で直接確認できる |
| `medium` | 強い示唆があるが完全な証明はない |
| `low` | 推測。人間の確認が必要 |

### status

`open`（未対応） / `acknowledged`（確認中） / `resolved`（対応済） / `dismissed`（対象外）。
新規レビューは原則 `open`。

## Rules

1. すべての finding に正しい `category`、`severity`、**`confidence`** を付ける。判断基準は上表に従い、一貫性を保つ。
2. `message` は2〜3文で「何が問題か・なぜ問題か・影響範囲」を説明する（上記の品質基準を参照）。
3. `suggestion` には具体的なコード例または番号付き手順を含める（上記の品質基準を参照）。
4. `codeSnippet` は問題箇所が特定できる場合は必ず含める。
5. `file` はリポジトリルートからの相対パス。`line` は可能な限り埋める。
6. enum 以外の値を使わない。不明なら `other` / 妥当な severity を選ぶ。
7. 出力後、`schema/review.schema.json` の必須項目・enum・型を満たしているか必ず確認する。
8. 推測の指摘は `confidence: "low"` で記載し、根拠を明示する。重複指摘はまとめる。
9. 人間の処分と修正指示は `.ai-review/review-state.json`（可変層）で管理される。レビューJSON（不変層）はAIの所見のみを書き、`review-state.json` をこのスキルで書き換えてはならない。

## Validation

スキーマ検証ツールが使える場合は実行する。

```bash
npx --yes --package=ajv-cli@5 --package=ajv-formats@2 -- ajv validate \
  -s schema/review.schema.json -d ".ai-review/*.json" -c ajv-formats --spec=draft2020
```

検証が通らない場合は、エラー箇所を修正してから保存を完了する。
