/**
 * moss/no-hardcoded-color
 * 色のハードコードを禁止する。必ず CSS 変数（var(--color-*)）または
 * Tailwind の color トークン（bg-primary 等）を使う。
 * デザイントークン外の色が混ざる = デザイン崩壊の元凶なので error 扱い。
 */
const noHardcodedColor = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow hardcoded hex / rgb colors. Use CSS variables or Tailwind color tokens.' },
    schema: [],
    messages: {
      hardcoded:
        'Hardcoded color "{{value}}" detected. Use a CSS variable (var(--color-*)) or a Tailwind token (e.g., bg-primary, text-error). See CLAUDE.md for the design token list.',
    },
  },
  create(context) {
    function checkValue(node, value) {
      if (typeof value !== 'string') return
      // #fff, #ffffff, rgb(...), rgba(...) を検出
      const pattern = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/
      const match = value.match(pattern)
      if (match) {
        context.report({ node, messageId: 'hardcoded', data: { value: match[0] } })
      }
    }
    return {
      Literal(node) {
        checkValue(node, node.value)
      },
      TemplateElement(node) {
        checkValue(node, node.value.cooked)
      },
    }
  },
}

export default noHardcodedColor
