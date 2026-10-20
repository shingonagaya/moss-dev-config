import { RuleTester } from 'eslint'
import rule from '../rules/no-raw-ui-element.js'

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

ruleTester.run('moss/no-raw-ui-element', rule, {
  valid: [
    // 部品（大文字で始まる）と、対象外の要素は通す
    'const a = <Button>保存</Button>',
    'const b = <Input id="a" label="名前" />',
    'const c = <ui.Dialog open />',
    'const d = <div><span>文</span></div>',
  ],
  invalid: ['button', 'input', 'select', 'textarea', 'dialog'].map((tag) => ({
    code: `const x = <${tag} />`,
    errors: [{ messageId: 'raw' }],
  })),
})

// 案内の文が、生活者向け（moss-ui）と管理画面（@/components/ui/）の両方の取り先を示すこと
const message = rule.meta.messages.raw
for (const part of ['@moss-inc-dev/moss-ui', '@/components/ui/', 'frontend-ui']) {
  if (!message.includes(part)) throw new Error(`案内の文に ${part} がありません`)
}

console.log('moss/no-raw-ui-element: すべて通りました')
