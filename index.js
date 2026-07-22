import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import noHardcodedColor from './rules/no-hardcoded-color.js'
import noRawUiElement from './rules/no-raw-ui-element.js'
import noSilentFallback from './rules/no-silent-fallback.js'

/** moss カスタムプラグイン（再利用しやすいよう単体でも export） */
export const mossPlugin = {
  rules: {
    'no-hardcoded-color': noHardcodedColor,
    'no-raw-ui-element': noRawUiElement,
    'no-silent-fallback': noSilentFallback,
  },
}

/**
 * Moss 共通 ESLint flat config を生成する。
 * 各プロジェクトの eslint.config.js は通常これ1行で済む:
 *
 *   import { moss } from 'eslint-config-moss'
 *   export default moss()
 *
 * プロジェクト固有の除外や上書きが要る場合:
 *
 *   export default [...moss({ ignores: ['src/legacy/**'] }), { rules: { ... } }]
 *
 * @param {object} [options]
 * @param {string[]} [options.ignores]  追加で lint 対象外にするパス
 * @param {'off'|'warn'|'error'} [options.a11y='warn']  jsx-a11y の重大度（安定後に 'error' へ昇格）
 * @returns {import('eslint').Linter.Config[]}
 */
export function moss(options = {}) {
  const { ignores = [], a11y = 'warn' } = options

  return tseslint.config(
    {
      ignores: [
        'dist',
        'storybook-static',
        'node_modules',
        'coverage',
        'playwright-report',
        'test-results',
        // shadcn の生成物。生 HTML プリミティブはここにだけ存在してよい
        'src/components/ui/**',
        ...ignores,
      ],
    },
    {
      extends: [js.configs.recommended, ...tseslint.configs.recommended],
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        ecmaVersion: 2022,
        globals: globals.browser,
      },
      plugins: {
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
        'jsx-a11y': jsxA11y,
        moss: mossPlugin,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        ...jsxA11y.flatConfigs.recommended.rules,
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        // デザイントークン強制・UIプリミティブ強制は保証層（fail-closed）
        'moss/no-hardcoded-color': 'error',
        'moss/no-raw-ui-element': 'error',
        // 失敗・欠落を既定値にすり替えて黙って進むコードを止める（fallback-approved で明示解除）
        'moss/no-silent-fallback': 'error',
      },
    },
    // jsx-a11y は recommended が一部 error のため、初期は一律 a11y レベル（既定 warn）に統一する。
    // 誤検知を潰しながら moss() の a11y: 'error' で fail-closed へ昇格できる（STRATEGY §5）。
    {
      files: ['**/*.{ts,tsx}'],
      rules: Object.fromEntries(
        Object.keys(jsxA11y.flatConfigs.recommended.rules).map((rule) => [rule, a11y]),
      ),
    },
  )
}

export default moss()
