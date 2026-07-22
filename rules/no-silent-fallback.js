/**
 * moss/no-silent-fallback
 *
 * 「失敗や欠落を、それらしい既定値にすり替えて黙って進む」コードを禁止する。
 * 根本原因の修正が原則で、フォールバックは実装前に承認を得る（CLAUDE.md）。
 * テキストルールだけでは再発が止まらなかったため、機械で止める側に移した。
 *
 * 検出するのは「実際に損失を出した形」だけに絞る。`??` / `||` の一律禁止は
 * 誤検知が多すぎてルールごと無効化されるため、意図的に対象外にしている。
 *
 *   1. 握りつぶす catch          … throw も報告系の呼び出しも無い catch 節
 *   2. .catch(() => 既定値)      … Promise レベルの握りつぶし
 *   3. process.env.X || 既定値   … 必須設定の暗黙デフォルト
 *   4. await 呼び出し ?? 既定値  … 外部データ欠落の隠蔽
 *
 * 意図的なフォールバックは理由付きで明示する:
 *
 *   // fallback-approved: 表示専用のため取得失敗時は空配列で描画する（2026-07-22 承認）
 *   const items = (await fetchItems()) ?? []
 */

/**
 * エラーを外に出している（＝黙っていない）と見なす呼び出し。
 * ログ・監視・通知に加え、UI へ出す setError / showError / handleError 等も
 * 「表面化している」に含める（React で握りつぶしと区別できないと誤検知になるため）。
 */
const SURFACING_CALL = /error|^(console\.|logger?\.|log\b|report|capture|notify|toast|alert|track|metrics?\.|Sentry\.|next\()/i

/**
 * 「失敗した」と伝えている文字列。setFinalizeNote('確定に失敗しました') のように
 * 呼び出し名からは判別できないが UI に表面化しているケースを拾う。
 */
const FAILURE_MESSAGE = /失敗|エラー|できません|できませんでした|不正|error|failed/i

/** 承認コメント。理由が空のものは承認と見なさない */
const APPROVAL = /fallback-approved:\s*\S/

/** ノード配下を再帰的に走査する（ESLint のトラバーサに依存しない簡易版） */
function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return
  if (visit(node) === false) return
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue
    const value = node[key]
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visit)
    } else if (value && typeof value.type === 'string') {
      walk(value, visit)
    }
  }
}

/** 内側の関数に入らずに走査する（catch 内のコールバック定義を誤検出しないため） */
function walkOwnScope(node, visit) {
  walk(node, (current) => {
    if (
      current !== node &&
      (current.type === 'FunctionExpression' ||
        current.type === 'FunctionDeclaration' ||
        current.type === 'ArrowFunctionExpression')
    ) {
      return false
    }
    return visit(current)
  })
}

const noSilentFallback = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow silently swallowing errors or substituting default values for missing required data.',
    },
    schema: [],
    messages: {
      swallowedCatch:
        'この catch はエラーを握りつぶしています（throw も報告もありません）。原因を修正するか、再 throw / ログ出力で表面化させてください。意図的なら直前行に `// fallback-approved: <理由>` を書いてください。',
      swallowedPromiseCatch:
        '.catch() が既定値を返して失敗を隠しています。原因を修正するか失敗を表面化させてください。意図的なら直前行に `// fallback-approved: <理由>` を書いてください。',
      envDefault:
        '必須設定 {{name}} に既定値を当てています。設定漏れは黙って別の値で動くより起動時に失敗させてください（未設定なら throw）。意図的なら直前行に `// fallback-approved: <理由>` を書いてください。',
      awaitDefault:
        '外部呼び出しの結果に既定値を当てて欠落を隠しています。呼び出し失敗と「結果が空」を区別して扱ってください。意図的なら直前行に `// fallback-approved: <理由>` を書いてください。',
    },
  },

  create(context) {
    const source = context.sourceCode ?? context.getSourceCode()

    /**
     * 承認コメントがあるか。
     * 直前行・同一行に加え、対象ノードの内側（catch ブロック内など、
     * 理由を書く自然な位置）も承認と見なす。
     */
    function isApproved(node) {
      const from = node.loc.start.line - 1
      const to = node.loc.end.line
      return source.getAllComments().some((comment) => {
        const line = comment.loc.end.line
        return line >= from && line <= to && APPROVAL.test(comment.value)
      })
    }

    function report(node, messageId, data) {
      if (isApproved(node)) return
      context.report({ node, messageId, data })
    }

    /**
     * エラーを表面化しているか。判定は次のいずれかで成立する:
     *   a. throw がある（再送出・言い換え送出）
     *   b. 捕まえたエラー変数を参照している（ログ・UI表示・Result 型での伝播）
     *   c. ログ/監視/通知系の呼び出しがある
     *
     * 逆に言うと「エラー変数を一度も触らず、throw もログもしない」catch だけを
     * 握りつぶしと見なす。実プロジェクトでの誤検知はこの判定で消えた。
     *
     * @param {object} node       走査対象（catch の body や .catch のハンドラ本体）
     * @param {string[]} errorNames 捕まえたエラー変数名
     */
    function surfacesError(node, errorNames = []) {
      let surfaces = false
      walkOwnScope(node, (current) => {
        if (surfaces) return false
        if (current.type === 'ThrowStatement') {
          surfaces = true
          return false
        }
        if (current.type === 'Identifier' && errorNames.includes(current.name)) {
          surfaces = true
          return false
        }
        if (current.type === 'CallExpression') {
          if (SURFACING_CALL.test(source.getText(current.callee))) {
            surfaces = true
            return false
          }
        }
        if (
          (current.type === 'Literal' || current.type === 'TemplateElement') &&
          FAILURE_MESSAGE.test(String(current.value?.cooked ?? current.value ?? ''))
        ) {
          surfaces = true
          return false
        }
        return true
      })
      return surfaces
    }

    /** catch のパラメータから、参照を追うべき識別子名を集める（分割代入も拾う） */
    function boundErrorNames(param) {
      if (!param) return []
      const names = []
      walk(param, (current) => {
        if (current.type === 'Identifier') names.push(current.name)
        return true
      })
      return names
    }

    /** finally 節の中か。本エラーが既に伝播中なので、後始末の握りつぶしは対象外にする */
    function isInsideFinally(node) {
      const ancestors = source.getAncestors ? source.getAncestors(node) : []
      for (let i = ancestors.length - 1; i >= 0; i -= 1) {
        const parent = ancestors[i]
        const child = i + 1 < ancestors.length ? ancestors[i + 1] : node
        if (parent.type === 'TryStatement' && parent.finalizer === child) return true
      }
      return false
    }

    /** 必須値の欠落を隠す「空の既定値」か（'' / null / undefined） */
    function isEmptyDefault(node) {
      if (!node) return false
      if (node.type === 'Literal') return node.value === '' || node.value === null
      if (node.type === 'Identifier') return node.name === 'undefined'
      return false
    }

    /** 「それらしい既定値」か。リテラル・空配列・空オブジェクト・undefined/null */
    function isDefaultishValue(node) {
      if (!node) return false
      switch (node.type) {
        case 'Literal':
          return true
        case 'ArrayExpression':
          return node.elements.length === 0
        case 'ObjectExpression':
          return node.properties.length === 0
        case 'Identifier':
          return node.name === 'undefined'
        case 'UnaryExpression':
          return node.operator === 'void'
        case 'TSAsExpression':
        case 'TSSatisfiesExpression':
          return isDefaultishValue(node.expression)
        default:
          return false
      }
    }

    return {
      CatchClause(node) {
        if (isInsideFinally(node)) return
        if (surfacesError(node.body, boundErrorNames(node.param))) return
        report(node, 'swallowedCatch')
      },

      // .catch(() => 既定値) / .catch(function () { return 既定値 })
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression') return
        if (callee.property.type !== 'Identifier' || callee.property.name !== 'catch') return
        const handler = node.arguments[0]
        if (!handler) return
        if (
          handler.type !== 'ArrowFunctionExpression' &&
          handler.type !== 'FunctionExpression'
        ) {
          return
        }
        if (isInsideFinally(node)) return
        if (surfacesError(handler.body, boundErrorNames(handler.params[0]))) return
        report(node, 'swallowedPromiseCatch')
      },

      LogicalExpression(node) {
        if (node.operator !== '||' && node.operator !== '??') return

        // process.env.X || '' —— 必須設定を「空」で埋めると、未設定のまま起動して
        // 遠く離れた場所で意味不明に失敗する。非空の既定値は正当な設定値なので対象外。
        const leftText = source.getText(node.left)
        if (/^process\.env\./.test(leftText)) {
          if (isEmptyDefault(node.right)) {
            report(node, 'envDefault', { name: leftText })
          }
          return
        }

        if (!isDefaultishValue(node.right)) return

        // (await fetchX()) ?? []
        let hasAwaitedCall = false
        walk(node.left, (current) => {
          if (current.type === 'AwaitExpression') {
            hasAwaitedCall = true
            return false
          }
          return true
        })
        if (hasAwaitedCall) {
          report(node, 'awaitDefault')
        }
      },
    }
  },
}

export default noSilentFallback
