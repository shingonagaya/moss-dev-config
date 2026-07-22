import { RuleTester } from 'eslint'
import rule from '../rules/no-silent-fallback.js'

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

ruleTester.run('moss/no-silent-fallback', rule, {
  valid: [
    // 通常の ?? / || は対象外（ここを禁止するとルールごと無効化されるため）
    'const label = props.label ?? ""',
    'const count = data.count || 0',
    'const name = user.name ?? "名無し"',

    // catch で再 throw / ログ / UI 表示していれば表面化と見なす
    'try { risky() } catch (e) { throw e }',
    'try { risky() } catch (e) { console.error(e); }',
    'try { risky() } catch (e) { logger.warn(e) }',
    'try { risky() } catch (e) { setError(e.message) }',
    'try { risky() } catch (e) { handleError(e) }',
    'try { risky() } catch (e) { throw new Error("取得に失敗しました") }',
    // Result 型でエラーを呼び出し元へ返すのは伝播であって握りつぶしではない
    'function f() { try { risky() } catch (e) { return { ok: false, error: e.message } } }',
    'function f() { try { risky() } catch ({ message }) { return { ok: false, error: message } } }',
    // finally 内の後始末は本エラーが既に伝播中なので対象外
    'async function f() { try { await go() } finally { await browser.disconnect().catch(() => {}) } }',

    // 非空の既定値は正当な設定値（ここを止めるとルールごと無効化される）
    'const dataset = process.env.BQ_DATASET || "zozo_scraper"',
    'const n = parseInt(process.env.CONCURRENCY || "2", 10)',
    'const retry = process.env.RETRY_FAILURES === "1"',

    // .catch に名前付きハンドラを渡す形は中身を追えないので対象外
    'fetchItems().catch(handleFetchError)',
    'fetchItems().catch((e) => console.error(e))',
    'fetchItems().catch((e) => { throw e })',

    // 必須設定は未設定なら落とすのが正しい
    'if (!process.env.API_KEY) throw new Error("API_KEY が未設定です")',
    'const key = process.env.API_KEY',

    // await の結果をそのまま使う／既定値でないものを右辺に置く
    'async function f() { const items = await fetchItems() }',
    'async function f() { const items = (await fetchItems()) ?? (await fetchBackup()) }',

    // 承認コメント（理由あり）があれば通す
    {
      code: [
        '// fallback-approved: 表示専用のため取得失敗時は空配列で描画する（2026-07-22 承認）',
        'async function f() { const items = (await fetchItems()) ?? [] }',
      ].join('\n'),
    },
    {
      code: [
        'try { risky() } catch (e) {',
        '  // fallback-approved: 計測タグの失敗は本体処理を止めない（2026-07-22 承認）',
        '}',
      ].join('\n'),
    },
  ],

  invalid: [
    // 1. 握りつぶす catch
    {
      code: 'try { risky() } catch (e) {}',
      errors: [{ messageId: 'swallowedCatch' }],
    },
    {
      code: 'function f() { try { risky() } catch (e) { return [] } }',
      errors: [{ messageId: 'swallowedCatch' }],
    },
    {
      code: 'let items = null; try { items = load() } catch (e) { items = [] }',
      errors: [{ messageId: 'swallowedCatch' }],
    },
    // 理由の無い承認コメントは承認と見なさない
    {
      code: ['// fallback-approved:', 'try { risky() } catch (e) {}'].join('\n'),
      errors: [{ messageId: 'swallowedCatch' }],
    },

    // 2. .catch(() => 既定値)
    {
      code: 'fetchItems().catch(() => [])',
      errors: [{ messageId: 'swallowedPromiseCatch' }],
    },
    {
      code: 'fetchItems().catch(() => { return null })',
      errors: [{ messageId: 'swallowedPromiseCatch' }],
    },

    // 3. 必須設定を空値で埋める
    {
      code: 'const key = process.env.WEB_UNLOCKER_API_KEY || ""',
      errors: [{ messageId: 'envDefault' }],
    },
    {
      code: 'const key = process.env.API_KEY ?? ""',
      errors: [{ messageId: 'envDefault' }],
    },
    {
      code: 'const path = process.env.GOOGLE_APPLICATION_CREDENTIALS || null',
      errors: [{ messageId: 'envDefault' }],
    },

    // 4. 外部呼び出しの欠落を既定値で隠す
    {
      code: 'async function f() { const items = (await fetchItems()) ?? [] }',
      errors: [{ messageId: 'awaitDefault' }],
    },
    {
      code: 'async function f() { const rows = (await res.json()).rows || [] }',
      errors: [{ messageId: 'awaitDefault' }],
    },
  ],
})

console.log('moss/no-silent-fallback: 全ケース通過')
