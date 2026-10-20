/**
 * moss/no-raw-ui-element
 * UI プリミティブのベタ書きを禁止する。
 * `<button>` `<input>` `<select>` `<textarea>` `<dialog>` の生 HTML タグは、共通の部品から import すべし。
 *   - 生活者向けの画面（スマホ）: moss-ui（`@moss-inc-dev/moss-ui`）の部品
 *   - 管理画面: `@/components/ui/` の shadcn の部品
 * どちらから取るかは Skill `frontend-ui` の「部品はどこから取るか」が正本。
 *
 * 「色じゃないコンポーネント化サボり」を物理ガードする規則。
 * 同等品が部品に存在しないケース（type="hidden" 等）は適宜 disable コメントで例外化。
 */
const RAW_UI_ELEMENTS = ['button', 'input', 'select', 'textarea', 'dialog']
const RAW_UI_REPLACEMENT = {
  button:
    "Button・IconButton（moss-ui）／import { Button } from '@/components/ui/button'（管理画面）",
  input:
    "Input・PasswordInput・Checkbox・Radio・ChoiceGroup（moss-ui）／import { Input } from '@/components/ui/input'（管理画面）",
  select: "Select（moss-ui）／import { Select } from '@/components/ui/select'（管理画面）",
  textarea: "Textarea（moss-ui）／import { Textarea } from '@/components/ui/textarea'（管理画面）",
  dialog:
    "Dialog・Sheet・Popup（moss-ui）／import { Dialog } from '@/components/ui/dialog' か import { AlertDialog } from '@/components/ui/alert-dialog'（管理画面）",
}

const noRawUiElement = {
  meta: {
    type: 'problem',
    docs: {
      description:
        '生の UI 要素を禁止し、共通の部品（生活者向けは moss-ui、管理画面は @/components/ui/）を使わせる',
    },
    schema: [],
    messages: {
      raw: '生の <{{tag}}> は使えません。共通の部品を使ってください: {{hint}}。生活者向けの画面は @moss-inc-dev/moss-ui から、管理画面は @/components/ui/ から取ります（Skill frontend-ui）。生の要素がどうしても要るとき（type="hidden" など）は、理由を添えて `// eslint-disable-next-line moss/no-raw-ui-element` を書きます。',
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

export { RAW_UI_ELEMENTS, RAW_UI_REPLACEMENT }
export default noRawUiElement
