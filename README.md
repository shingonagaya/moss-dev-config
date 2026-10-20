# eslint-config-moss

Moss 共通 ESLint flat config の**単一ソース**。各プロジェクトはこれを git 依存で参照し、
`moss/no-hardcoded-color`・`moss/no-raw-ui-element`・jsx-a11y の設定をコピペせず共有する（drift 防止）。

第2層ガードレール（生成時に違反を書けない構造）の中核。全体設計は dev-quality-system キット参照。

## 何を強制するか

| ルール | 重大度 | 内容 |
|---|---|---|
| `moss/no-hardcoded-color` | error | 色のハードコード禁止。CSS変数（`var(--color-*)`）か Tailwind トークン（`bg-primary` 等）のみ |
| `moss/no-raw-ui-element` | error | 生 `<button>` `<input>` `<select>` `<textarea>` `<dialog>` 禁止。生活者向けの画面は moss-ui（`@moss-inc-dev/moss-ui`）、管理画面は `@/components/ui/` の部品を使う（取り先は Skill `frontend-ui`） |
| `moss/no-silent-fallback` | error | 失敗・欠落を既定値にすり替えて黙って進むコードの禁止（下記） |
| jsx-a11y recommended | warn（既定） | アクセシビリティ。安定後に `moss({ a11y: 'error' })` で fail-closed へ昇格 |

### moss/no-silent-fallback

根本原因の修正が原則で、フォールバックは実装前に承認を得る——というルールが文章では守られず
再発し続けたため、機械で止める側に移したもの。検出するのは次の4パターンだけ。

| # | 検出する形 | なぜ |
|---|---|---|
| 1 | 捕まえた error を一度も参照せず、throw もログも失敗表示もしない `catch` | 失敗が完全に消える |
| 2 | `.catch(() => 既定値)` | Promise レベルの握りつぶし |
| 3 | `process.env.X \|\| ''`（空文字・null・undefined への既定値） | 未設定のまま起動し、遠く離れた場所で意味不明に失敗する |
| 4 | `(await 呼び出し()) ?? []` | 「取得失敗」と「結果が空」の区別が消える |

`??` / `||` の一律禁止は**あえてしていない**。`props.label ?? ''` まで落とすと誤検知でルールごと
無効化されるため、実プロジェクト235ファイルにドライランして誤検知が出た形（Result 型でのエラー返却、
`finally` 内の後始末、非空の設定既定値、`setXxx('…に失敗しました')` での UI 表示）は判定から除外済み。

意図的なフォールバックは**理由付き**で明示すれば通る（対象行の直前行か、対象ブロックの内側に置く）:

```ts
// fallback-approved: 表示専用のため取得失敗時は空配列で描画する（2026-07-22 承認）
const items = (await fetchItems()) ?? []
```

理由が空の `// fallback-approved:` は承認と見なさない。

## 使い方

### 1. インストール（git 依存）

```bash
npm install -D "github:shingonagaya/moss-dev-config#v0.2.1"
```

> **public リポなので認証は不要**。ローカルも CI もそのまま `npm install` / `npm ci` で解決される。
> （中身は lint ルールのみで秘密情報を含まないため public。実シークレットは各プロジェクトの secrets/.env で管理する）

### 2. プロジェクトの eslint.config.js

```js
import { moss } from 'eslint-config-moss'

export default moss()
// 固有の除外や上書きが要る場合:
//   export default [...moss({ ignores: ['src/legacy/**'] }), { rules: { ... } }]
// a11y を fail-closed にする場合:
//   export default moss({ a11y: 'error' })
```

## バージョニング

- 破壊的変更（ルール追加で既存コードが赤くなる等）は **minor を上げて tag** を切り、各プロジェクトは任意のタイミングで上げる
- ルール追加＝複利ループの成果（すり抜けたバグ/指摘を1個の自動検査に翻訳）。CHANGELOG に「何を防ぐためか」を残す

## API

- `moss(options?)` → flat config 配列を返す
  - `options.ignores: string[]` — 追加の lint 対象外パス
  - `options.a11y: 'off'|'warn'|'error'` — jsx-a11y の重大度（既定 `warn`）
- `mossPlugin` — `{ rules: { 'no-hardcoded-color', 'no-raw-ui-element' } }`（単体利用向け）
