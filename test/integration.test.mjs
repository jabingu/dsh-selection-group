/**
 * dsh-selection-group — merged-mount integration.
 *
 * Runs the real built `client.js` in jsdom through the same
 * `window.__ModuleLoader__` the Web shell provides, with a stub cordis context,
 * and proves the bundle is one self-contained plugin: both vendored plugins
 * mount, the toolbar glue publishes its action hook, and nothing references
 * either upstream package at runtime.
 */

import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { JSDOM } from 'jsdom'

const here = dirname(fileURLToPath(import.meta.url))
const clientSource = readFileSync(join(here, '..', 'client.js'), 'utf8')

const HTML = `<!doctype html><html><head></head><body>
<div data-slot="conversation.session"><p id="line">hello world</p></div>
</body></html>`

const QUOTE_ID = 'dsh-quote-followup-btn'
const HIDE_ATTR = 'data-dsh-selection-group-bar'
const STYLE_ID = 'dsh-selection-group-style'
const BAR_CLASS = 'dsh-ann-bar'

const windows = []
afterEach(() => { for (const window of windows.splice(0)) window.close() })

function boot(html = HTML) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' })
  const { window } = dom
  windows.push(window)
  let mod = null
  window.__ModuleLoader__ = {
    load: (registration) => {
      assert.equal(registration.id, 'dsh-selection-group')
      mod = registration.factory(() => {
        throw new Error('the merged bundle must not require any external module')
      })
    },
  }
  window.eval(clientSource)
  assert.ok(mod !== null)
  return { dom, window, document: window.document, mod }
}

function stubContext() {
  const noop = () => {}
  const unsubscribe = () => {}
  return {
    sessions: {
      list: { getSnapshot: () => ({ ids: [], byId: {} }), subscribe: () => unsubscribe },
      scope: () => ({ key: 'stub-session' }),
      current: undefined,
    },
    conversation: { input: { for: () => ({ state: { getSnapshot: () => ({ draft: '' }) }, submit: noop, setDraft: noop }) } },
    locale: { getSnapshot: () => ({ active: 'zh' }), subscribe: () => unsubscribe },
    get: () => null,
    // Real cordis semantics: run the callback now, keep its return value as the
    // cleanup. A stub that ignored this would hide a plugin that tears itself
    // down the moment it mounts.
    effect: (execute) => {
      const cleanup = typeof execute === 'function' ? execute() : undefined
      return typeof cleanup === 'function' ? cleanup : unsubscribe
    },
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test('one module mounts both inlined plugins plus the toolbar glue', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext())
  await wait(120)

  assert.equal(typeof dispose, 'function', 'apply must return a disposer')

  // dsh-quote-followup's own UI, created by its inlined code (standalone button,
  // hidden only while the shared box is up).
  const quote = document.getElementById(QUOTE_ID)
  assert.equal(quote, null, 'the quote core has no standalone UI')
  assert.equal(typeof window.__DSH_SELECTION_GROUP_QUOTE__?.run, 'function')

  // @changfenhuang/dsh-annotation's own UI, created by its inlined code.
  assert.ok(document.querySelector('[data-annotation-for-dsh]') !== null, 'the vendored annotation plugin must create its host')
  assert.ok(document.querySelector('[data-annotation-overlay]') !== null, 'and its overlay layers')
  assert.ok(document.querySelector('[data-annotation-num-layer]') !== null)

  // The glue.
  assert.equal(typeof window.__DSH_SELECTION_GROUP_ACTIONS__, 'function', 'the toolbar glue publishes its actions')
  assert.ok(document.getElementById(STYLE_ID) !== null, 'and its stylesheet')

  const diagnostics = window.__DSH_SELECTION_GROUP__
  assert.equal(diagnostics.applied, true)
  assert.equal(diagnostics.actionsInstalled, true)
  assert.equal(diagnostics.lastError, null, 'mounting must not hit an error')
  assert.equal(diagnostics.vendoredMount.annotation, 'mounted (with disposer)')
  assert.equal(diagnostics.vendoredMount.quote, 'mounted')

  dispose()
  window.close()
})

test('no independent quote button or CSS hiding rule is mounted', () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext())
  assert.equal(document.getElementById(QUOTE_ID), null)
  const css = document.getElementById(STYLE_ID).textContent
  assert.ok(!css.includes(QUOTE_ID))
  assert.ok(!css.includes('display: none'))
  dispose()
})

test('the merged bundle works with no upstream package present', () => {
  // The vendored sources are the only implementation; nothing may reach for the
  // packages at runtime. This is a source-level guard on the generated file.
  assert.ok(!/require\(\s*["'](@?[a-z0-9-]+\/)?dsh-(quote-followup|annotation)/.test(clientSource))
  assert.ok(!clientSource.includes("from '@changfenhuang/dsh-annotation'"))
  assert.ok(!clientSource.includes("from 'dsh-quote-followup'"))
  assert.equal(clientSource.match(/window\.__ModuleLoader__\.load\(/g)?.length, 1)
})
