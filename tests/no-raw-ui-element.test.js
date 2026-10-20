import { RuleTester } from 'eslint'
import rule, { RAW_UI_ELEMENTS, RAW_UI_REPLACEMENT } from '../rules/no-raw-ui-element.js'

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
    // 要素ごとの案内（hint）が文言に入ること。案内の表の打ち間違い（undefined）もここで落ちる
    errors: [{ messageId: 'raw', data: { tag, hint: RAW_UI_REPLACEMENT[tag] } }],
  })),
})

// 案内の表は止める要素と同じだけあり、どの案内も moss-ui と管理画面の両方の取り先を示すこと
if (Object.keys(RAW_UI_REPLACEMENT).sort().join() !== [...RAW_UI_ELEMENTS].sort().join()) {
  throw new Error('案内の表（RAW_UI_REPLACEMENT）と止める要素（RAW_UI_ELEMENTS）が食い違っています')
}
for (const [tag, hint] of Object.entries(RAW_UI_REPLACEMENT)) {
  if (!hint.includes('（moss-ui）') || !hint.includes("'@/components/ui/")) {
    throw new Error(`<${tag}> の案内に moss-ui か @/components/ui/ がありません: ${hint}`)
  }
}

// 案内の文が、生活者向け（moss-ui）と管理画面（@/components/ui/）の両方の取り先を示すこと
const message = rule.meta.messages.raw
for (const part of ['@moss-inc-dev/moss-ui', '@/components/ui/', 'frontend-ui']) {
  if (!message.includes(part)) throw new Error(`案内の文に ${part} がありません`)
}

console.log('moss/no-raw-ui-element: すべて通りました')
