# eslint-config-moss

Moss 共通 ESLint flat config の**単一ソース**。各プロジェクトはこれを git 依存で参照し、
`moss/no-hardcoded-color`・`moss/no-raw-ui-element`・jsx-a11y の設定をコピペせず共有する（drift 防止）。

第2層ガードレール（生成時に違反を書けない構造）の中核。全体設計は dev-quality-system キット参照。

## 何を強制するか

| ルール | 重大度 | 内容 |
|---|---|---|
| `moss/no-hardcoded-color` | error | 色のハードコード禁止。CSS変数（`var(--color-*)`）か Tailwind トークン（`bg-primary` 等）のみ |
| `moss/no-raw-ui-element` | error | 生 `<button>` `<input>` `<select>` `<textarea>` `<dialog>` 禁止。`@/components/ui/` から import |
| jsx-a11y recommended | warn（既定） | アクセシビリティ。安定後に `moss({ a11y: 'error' })` で fail-closed へ昇格 |

## 使い方

### 1. インストール（git 依存）

```bash
npm install -D "github:shingonagaya/moss-dev-config#v0.1.0"
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
