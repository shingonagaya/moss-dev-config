/**
 * moss/no-raw-ui-element
 * UI プリミティブのベタ書きを禁止する。
 * `<button>` `<input>` `<select>` `<textarea>` `<dialog>` の生 HTML タグは
 * `@/components/ui/` の shadcn コンポーネントから import すべし。
 *
 * 「色じゃないコンポーネント化サボり」を物理ガードする規則。
 * 同等品が UI 配下に存在しないケース（type="hidden" 等）は適宜 disable コメントで例外化。
 */
const RAW_UI_ELEMENTS = ['button', 'input', 'select', 'textarea', 'dialog']
const RAW_UI_REPLACEMENT = {
  button: "import { Button } from '@/components/ui/button'",
  input: "import { Input } from '@/components/ui/input'",
  select: "import { Select } from '@/components/ui/select'",
  textarea: "import { Textarea } from '@/components/ui/textarea'",
  dialog: "import { Dialog } from '@/components/ui/dialog' (or AlertDialog from '@/components/ui/alert-dialog')",
}

const noRawUiElement = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow raw HTML primitives in favor of shadcn components in @/components/ui/' },
    schema: [],
    messages: {
      raw: 'Raw <{{tag}}> is forbidden. Use the shadcn component instead: {{hint}}. If you genuinely need the raw element (e.g., type="hidden"), add `// eslint-disable-next-line moss/no-raw-ui-element` with a justifying comment.',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name
        if (name.type !== 'JSXIdentifier') return
        const tag = name.name
        if (!RAW_UI_ELEMENTS.includes(tag)) return
        context.report({
          node,
          messageId: 'raw',
          data: { tag, hint: RAW_UI_REPLACEMENT[tag] },
        })
      },
    }
  },
}

export default noRawUiElement
