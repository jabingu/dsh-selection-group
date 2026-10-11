/**
 * dsh-selection-group — toolbar glue tests.
 *
 * The design under test: ONE hover box (the annotation plugin's toolbar, patched
 * at build time to render injected actions) with TWO actions. The 引用 action
 * clicks dsh-quote-followup's own hidden button, so that plugin's insert path
 * stays untouched upstream code. No DOM is moved, no container exists.
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
<div data-slot="conversation.session">
  <div data-chat-flow-kind="user" data-chat-turn="1"><p id="user-line">my own question</p></div>
  <div data-chat-flow-kind="assistant-step" data-chat-turn="2"><p id="assistant-line">the assistant answer</p></div>
</div>
<div data-composer-card><div id="composer" data-composer-input contenteditable="true"></div></div>
</body></html>`

const RECT = { left: 100, top: 100, width: 200, height: 20, right: 300, bottom: 120 }
const QUOTE_ID = 'dsh-quote-followup-btn'
const ACTION_ATTR = 'data-dsh-selection-group-action'
const HIDE_ATTR = 'data-dsh-selection-group-bar'
const STYLE_ID = 'dsh-selection-group-style'
const BAR_CLASS = 'dsh-ann-bar'
const QUOTE_NOTICE_ID = 'dsh-quote-followup-notice'

/**
 * Every window a test opens, so `afterEach` can close it even when an assertion
 * throws: a leaked jsdom window keeps the test process alive, which turned a red
 * test into a hung CI job.
 */
const openWindows = []
afterEach(() => {
  for (const window of openWindows.splice(0)) {
    try {
      window.close()
    }
    catch (_) { /* already closed */ }
  }
})

function boot(html = HTML) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' })
  const { window } = dom
  openWindows.push(window)
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
  window.localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 'session-test' }))
  // jsdom has no layout; give Ranges a real rect so the toolbar's settle path runs.
  window.Range.prototype.getBoundingClientRect = () => ({ ...RECT, x: RECT.left, y: RECT.top, toJSON() {} })
  return { dom, window, document: window.document, mod }
}

/**
 * A stand-in for the client services both plugins inject, shaped like the real
 * ones: in particular the session facade quote-followup inserts a native
 * reference chip through (`conversation.input.for(scope)` + `insertReference`),
 * so the 引用 action can be asserted end to end.
 */
function stubContext(options = {}) {
  const noop = () => {}
  const unsubscribe = () => {}
  const inserted = []
  const inputApi = {
    state: { getSnapshot: () => ({ draft: '', draftRev: 0, phase: 'plain', occurrences: [] }) },
    insertText: () => true,
    insertReference: (payload) => {
      inserted.push(payload)
      return true
    },
    focus: noop,
  }
  const sessionsService = {
    list: {
      getSnapshot: () => ({ current: 'session-test', ids: ['session-test'], byId: { 'session-test': {} } }),
      subscribe: () => unsubscribe,
    },
    scope: (id) => ({ key: id, get: (name) => (name === 'conversation' ? { input: { for: () => inputApi } } : null) }),
    current: 'session-test',
  }
  /** Cleanups a real fiber effect would hold on to (cordis runs the callback now). */
  const cleanups = []
  const context = {
    sessions: sessionsService,
    conversation: { input: { for: () => inputApi } },
    locale: { getSnapshot: () => ({ active: 'zh' }), subscribe: () => unsubscribe },
    // quote-followup resolves its services through ctx.get('sessions' | 'inputTriggers' | 'uiSession').
    get: (name) => {
      if (name === 'sessions')
        return sessionsService
      if (name === 'inputTriggers')
        return { registerSource: () => unsubscribe }
      if (name === 'uiSession')
        return { adapter: { current: { getSnapshot: () => ({ key: 'session-test' }) } } }
      return null
    },
    // Real cordis semantics: the callback runs immediately and its RETURN VALUE is
    // the cleanup. A stub that ignored this would hide a plugin that disposes
    // itself the moment it mounts.
    effect: (execute) => {
      const cleanup = typeof execute === 'function' ? execute() : undefined
      if (typeof cleanup === 'function')
        cleanups.push(cleanup)
      return cleanup
    },
  }
  return { context, inserted, cleanups }
}

/** Put a real DOM selection over the text of `#id` and let the plugins react. */
function select(window, id) {
  const range = window.document.createRange()
  range.selectNodeContents(window.document.getElementById(id))
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
  window.document.dispatchEvent(new window.Event('selectionchange'))
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wait for a condition instead of a fixed delay.
 *
 * Fixed waits flake on a loaded CI runner (a 150 ms timer can land well after 500 ms),
 * and CI shows that as a failing assertion — which used to hang the job entirely.
 */
async function waitFor(predicate, timeout = 5000, step = 25) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (predicate())
      return true
    await wait(step)
  }
  return predicate()
}

test('registering the fiber effect must not dispose the plugin (cordis runs it now)', async () => {
  const { window, document, mod } = boot()
  const { context, cleanups } = stubContext()
  const dispose = mod.apply(context)
  await wait(400)

  const diagnostics = window.__DSH_SELECTION_GROUP__
  assert.equal(diagnostics.applied, true, 'the plugin must still be mounted')
  assert.equal(diagnostics.disposedAt, null, 'passing the disposer to ctx.effect would dispose it on the spot')
  assert.ok(diagnostics.tick >= 2, 'the glue must keep ticking')
  assert.ok(document.getElementById(QUOTE_ID) !== null, 'the vendored plugins must stay mounted')
  assert.ok(document.getElementById(STYLE_ID) !== null)
  assert.equal(typeof window.__DSH_SELECTION_GROUP_ACTIONS__, 'function')
  assert.ok(cleanups.length >= 1, 'the merged apply must hand the fiber a cleanup function')

  // …and the collected cleanup really does unmount everything.
  for (const cleanup of cleanups) cleanup()
  assert.equal(document.getElementById(QUOTE_ID), null, 'the fiber cleanup removes the plugins')
  assert.equal(window.__DSH_SELECTION_GROUP_ACTIONS__, undefined)

  dispose()
  window.close()
})

test('the glue publishes one action and hides only the standalone quote button', () => {
  const { window, document, mod } = boot()
  const dispose = mod.__toolbar(stubContext().context)

  const actions = window.__DSH_SELECTION_GROUP_ACTIONS__
  assert.equal(typeof actions, 'function', 'the patched toolbar reads its actions from this hook')
  const list = actions()
  assert.equal(list.length, 1, 'one extra action: 引用')
  assert.equal(list[0].id, 'quote')
  assert.match(list[0].label, /引用/)
  assert.equal(typeof list[0].run, 'function')

  const css = document.getElementById(STYLE_ID).textContent
  assert.match(css, new RegExp(`html\\[${HIDE_ATTR}\\] #${QUOTE_ID}`), 'the standalone button is hidden only under the marker')
  assert.match(css, /display: none !important/, 'and the hiding must beat the plugin\'s inline display')
  assert.ok(!css.includes(BAR_CLASS), 'the shared toolbar itself is never hidden or restyled into invisibility')

  dispose()
  assert.equal(window.__DSH_SELECTION_GROUP_ACTIONS__, undefined, 'dispose removes the hook')
  assert.equal(document.getElementById(STYLE_ID), null, 'and the stylesheet')
  window.close()
})

test('the one hover box carries both actions after a selection', async () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  select(window, 'user-line')
  await wait(400)

  const bar = document.querySelector(`.${BAR_CLASS}`)
  assert.ok(bar !== null, 'the annotation toolbar is the single hover box')
  const extra = bar.querySelector(`[${ACTION_ATTR}="quote"]`)
  assert.ok(extra !== null, 'it renders the injected 引用 action')
  assert.match(extra.textContent, /引用/)
  const annotate = [...bar.querySelectorAll('button')].filter((button) => button.getAttribute(ACTION_ATTR) === null)
  assert.ok(annotate.length >= 1, "the plugin's own 批注 button stays next to it")
  assert.equal(document.querySelectorAll(`[${ACTION_ATTR}="quote"]`).length, 1, 'exactly one 引用 button, never a duplicate')

  dispose()
  window.close()
})

test('pressing 引用 runs dsh-quote-followup\'s own native-insertion path', async () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  select(window, 'user-line')
  await wait(400)

  const quote = document.getElementById(QUOTE_ID)
  assert.ok(quote !== null, 'the quote plugin still mounts (its button is merely hidden)')
  let clicked = 0
  quote.addEventListener('click', () => { clicked += 1 })

  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  assert.equal(clicked, 1, "the action must click the plugin's own button, not reimplement it")
  await wait(150)

  assert.equal(inserted.length, 1, "the plugin's own insert path must ask the session facade for one reference insertion")
  assert.match(JSON.stringify(inserted[0]), /my own question/, 'and it must carry the selected text')

  dispose()
  window.close()
})

test('pressing 引用 closes the shared box, like 批注 does', async () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)

  select(window, 'user-line')
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'precondition: the box is up')

  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  assert.equal(inserted.length, 1, 'the quote still lands in the composer')
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'and the box closes instead of lingering')

  dispose()
  window.close()
})

test('pressing 批注 replaces the box with the editor card', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)

  select(window, 'user-line')
  const bar = document.querySelector(`.${BAR_CLASS}`)
  const annotate = [...bar.querySelectorAll('button')].find((button) => button.getAttribute(ACTION_ATTR) === null)
  annotate.click()

  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'the actions box is gone')
  assert.ok(document.querySelector('.dsh-ann-card') !== null, 'replaced by the editor card')

  dispose()
  window.close()
})

test('a scroll while the box is up must not discard the excerpt', () => {
  // The transcript auto-scrolls while an answer streams, and the quote plugin drops
  // its pending excerpt on any scroll. Pressed in the same turn (before anything can
  // re-arm it) 引用 must still insert, which is exactly what the guard buys.
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)

  select(window, 'user-line')
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'precondition: the box is up')

  window.dispatchEvent(new window.Event('scroll'))
  document.querySelector(`[${ACTION_ATTR}="quote"]`).click() // same turn as the scroll
  assert.equal(inserted.length, 1, '引用 must insert even though the page scrolled')
  assert.equal(document.getElementById(QUOTE_NOTICE_ID)?.textContent ?? '', '', 'with no failure notice')

  dispose()
  window.close()
})

test('pressing inside the shared box never breaks the next 引用 press', async () => {
  // Touching the box background (or the 批注 button) used to drop the pending excerpt
  // while the box stayed up, so the next press of 引用 failed.
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)

  select(window, 'user-line')
  const bar = document.querySelector(`.${BAR_CLASS}`)
  assert.ok(bar !== null, 'precondition: the box is up')

  // A real press: the plugin listens for mousedown (capture), the glue for pointerdown.
  for (const type of ['pointerdown', 'mousedown'])
    bar.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }))
  for (const type of ['pointerup', 'mouseup'])
    bar.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }))
  await wait(150)  // settle the cross-plugin pipeline; 60 ms flaked under parallel load

  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  await wait(150)  // settle the cross-plugin pipeline; 60 ms flaked under parallel load
  assert.equal(inserted.length, 1, 'the excerpt must survive a press inside the box')
  assert.equal(document.getElementById(QUOTE_NOTICE_ID)?.textContent ?? '', '', 'with no failure notice')

  dispose()
  window.close()
})

test('a transcript re-render must not discard the excerpt', async () => {
  // While an answer streams the transcript re-renders under a live selection: the
  // range can go empty or unmeasurable. The annotation box stays up (it only returns
  // on an unusable selection), and the quote plugin used to drop the excerpt right
  // there — so pressing 引用 failed with "excerpt saved; select the original text".
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)

  select(window, 'user-line')
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'precondition: the box is up')

  // The stream re-renders the row the selection lives in.
  document.getElementById('user-line').textContent = ''
  document.dispatchEvent(new window.Event('selectionchange'))
  await wait(150)  // settle the cross-plugin pipeline; 60 ms flaked under parallel load
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'the box is still up')

  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  await wait(150)  // settle the cross-plugin pipeline; 60 ms flaked under parallel load
  assert.equal(inserted.length, 1, '引用 must still insert the excerpt the person selected')
  assert.equal(document.getElementById(QUOTE_NOTICE_ID)?.textContent ?? '', '', 'with no failure notice')

  dispose()
  window.close()
})

test('a press that cannot insert must say so and keep the box open', async () => {
  // Deterministic failure path: the composer is gone, so the quote plugin cannot
  // insert and reports it. The glue must not close the box over a failed press.
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)

  select(window, 'user-line')
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'precondition: the box is up')
  document.querySelector('[data-composer-card]').remove()

  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  await wait(150)  // settle the cross-plugin pipeline; 60 ms flaked under parallel load

  assert.equal(inserted.length, 0, 'nothing could be inserted')
  assert.notEqual(document.getElementById(QUOTE_NOTICE_ID)?.textContent ?? '', '', 'the plugin must say why')
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'so the box stays open for a retry')

  dispose()
  window.close()
})

test('pressing 引用 never fails silently, whatever dismissed the excerpt', async () => {
  // Any window scroll drops the plugin's pending excerpt. Whether it is dropped in
  // this environment or not, the invariant is: an insert happens, or the plugin
  // says why — never nothing at all with the box closed.
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)

  select(window, 'user-line')
  window.dispatchEvent(new window.Event('scroll'))
  await wait(150)  // settle the cross-plugin pipeline; 60 ms flaked under parallel load
  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  await wait(150)  // settle the cross-plugin pipeline; 60 ms flaked under parallel load

  const notice = document.getElementById(QUOTE_NOTICE_ID)?.textContent ?? ''
  const box = document.querySelector(`.${BAR_CLASS}`)
  assert.ok(inserted.length === 1 || notice !== '', 'a press must either insert or explain itself')
  if (notice !== '')
    assert.ok(box !== null, 'a reported failure keeps the box open')
  else
    assert.equal(box, null, 'a successful insert closes the box')

  dispose()
  window.close()
})

test('applying the bundle twice in one realm keeps 引用 alive', async () => {
  // Hot swap order: the successor is applied while the predecessor is still live.
  // The vendored quote plugin refuses to re-apply in that state, so without the
  // retirement step the successor installs nothing and the predecessor's teardown
  // removes the button — 引用 stays dead until a restart.
  const { window, document, mod } = boot()
  const first = stubContext()
  const second = stubContext()
  const disposeFirst = mod.apply(first.context)
  const disposeSecond = mod.apply(second.context)
  await wait(150)  // settle the cross-plugin pipeline; 60 ms flaked under parallel load

  assert.equal(document.querySelectorAll(`#${QUOTE_ID}`).length, 1, 'exactly one quote button after the swap')

  disposeFirst() // the predecessor is torn down afterwards
  await wait(150)  // settle the cross-plugin pipeline; 60 ms flaked under parallel load
  assert.ok(document.getElementById(QUOTE_ID) !== null, 'the button must survive the predecessor teardown')

  select(window, 'user-line')
  await wait(150)  // settle the cross-plugin pipeline; 60 ms flaked under parallel load
  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  await wait(150)  // settle the cross-plugin pipeline; 60 ms flaked under parallel load
  assert.equal(second.inserted.length, 1, 'the live layer inserts exactly once')
  assert.equal(first.inserted.length, 0, 'and the retired layer inserts nothing')

  disposeSecond()
  window.close()
})

test('captures are installed once per window and restored by the last dispose', async () => {
  const { window, document, mod } = boot()
  const warnBefore = window.console.warn
  const disposeFirst = mod.apply(stubContext().context)
  const record = window.__DSH_SELECTION_GROUP_CAPTURE__
  assert.ok(record !== undefined, 'the capture record must live on the window')
  const warnAfterFirst = window.console.warn
  assert.notEqual(warnAfterFirst, warnBefore, 'the first layer installs the capture')

  const disposeSecond = mod.apply(stubContext().context)
  assert.equal(window.console.warn, warnAfterFirst, 'a hot-swapped layer must not wrap console again')
  assert.equal(window.__DSH_SELECTION_GROUP_CAPTURE__, record, 'and must reuse the same record')

  disposeFirst()
  assert.ok(window.__DSH_SELECTION_GROUP_CAPTURE__ !== undefined, 'a live layer keeps the captures')

  disposeSecond()
  assert.equal(window.__DSH_SELECTION_GROUP_CAPTURE__, undefined, 'the last dispose removes the record')
  assert.equal(window.console.warn, warnBefore, 'and restores the original console')
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), false, 'and clears the marker')
  window.close()
})

test('the standalone button stays hidden while the editor card is open', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)

  select(window, 'user-line')
  const annotate = [...document.querySelectorAll(`.${BAR_CLASS} button`)].find((button) => button.getAttribute(ACTION_ATTR) === null)
  annotate.click()
  // Wait past the grace window: only the open card can keep the marker set now.
  await wait(420)

  assert.ok(document.querySelector('.dsh-ann-card') !== null, 'the editor card is open')
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'the actions box is gone')
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), true, 'so the standalone button must stay hidden')

  dispose()
  window.close()
})

test('the marker follows the box through the DOM, without polling', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)

  select(window, 'user-line')
  await wait(420) // past the grace window: only the open box keeps the button hidden
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), true)

  document.querySelector(`.${BAR_CLASS}`).remove() // the plugin closes its own box
  await wait(80) // far below the 1 s safety interval: only an observer can explain this
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), false, 'the observer releases the marker at once')

  dispose()
  window.close()
})

test('idling must not poll the document', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  await wait(50) // let the vendored plugins finish mounting

  let queries = 0
  const originals = {}
  for (const name of ['querySelector', 'querySelectorAll', 'getElementById', 'getSelection']) {
    originals[name] = document[name].bind(document)
    document[name] = (...args) => {
      queries += 1
      return originals[name](...args)
    }
  }
  await wait(1000)
  for (const name of Object.keys(originals))
    document[name] = originals[name]

  // Polling at 40 ms cost ~110 queries a second; the event-driven design leaves the
  // safety interval and the sampler, which is ~18. The ceiling below fails loudly if
  // a poll is ever introduced again.
  assert.ok(queries <= 40, `an idle page must not keep querying the document (saw ${queries}/s)`)

  dispose()
  window.close()
})

test('the standalone button is hidden exactly while the shared box is up', async () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)

  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), false, 'no marker before any selection')

  select(window, 'user-line')
  await wait(400)
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), true, 'marker while the shared box is up')
  assert.equal(window.__DSH_SELECTION_GROUP__.barUp, true)

  // The toolbar goes away (selection collapsed, plugin re-rendered, …).
  document.querySelector('[data-annotation-for-dsh]').textContent = ''
  await wait(400)
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), false, 'the standalone button returns')
  assert.equal(window.__DSH_SELECTION_GROUP__.barUp, false)

  dispose()
  window.close()
})

test('a hot swap must not leave the toolbar unstyled', () => {
  // Reproduces the field failure: the successor is applied BEFORE the predecessor
  // is torn down, reuses its stylesheet, and the predecessor's teardown then took
  // that stylesheet away — leaving the standalone button visible next to the box.
  const { window, document, mod } = boot()
  const context = stubContext().context
  const layerA = mod.__toolbar(context)
  const layerB = mod.__toolbar(context) // successor reuses the stylesheet
  layerA()                              // predecessor disposed afterwards

  assert.ok(document.getElementById(STYLE_ID) !== null, 'the successor must keep its stylesheet')

  select(window, 'user-line')
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), true, 'the marker still applies')
  assert.equal(window.__DSH_SELECTION_GROUP__.stylePresent, true)
  assert.equal(window.__DSH_SELECTION_GROUP__.hookPresent, true)

  layerB()
  assert.equal(document.getElementById(STYLE_ID), null, 'the last owner does remove it')
  window.close()
})

/** Count writes to the diagnostics key (jsdom's localStorage is a proxy, so patch the prototype). */
function countingStorage(window) {
  const writes = []
  const proto = window.Storage.prototype
  const original = proto.setItem
  proto.setItem = function (key, value) {
    if (key === 'dsh-selection-group.diagnostics')
      writes.push(value)
    return original.call(this, key, value)
  }
  return { writes, restore: () => { proto.setItem = original } }
}

test('diagnostics can be switched off entirely before mount', async () => {
  const { window, document, mod } = boot()
  window.__DSH_SELECTION_GROUP_DIAGNOSTICS__ = false
  const warnBefore = window.console.warn
  const storage = countingStorage(window)

  const dispose = mod.apply(stubContext().context)
  await wait(300)

  assert.equal(window.console.warn, warnBefore, 'console must stay untouched')
  assert.equal(window.__DSH_SELECTION_GROUP__.diagnosticsMode, 'off')
  assert.equal(storage.writes.length, 0, 'and nothing may be written to disk')

  // The toolbar itself must be unaffected by the switch.
  select(window, 'user-line')
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'the box still works with diagnostics off')
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), true)

  storage.restore()
  dispose()
  window.close()
})

test('diagnostics expire by themselves and put the page back', async () => {
  const { window, document, mod } = boot()
  window.__DSH_SELECTION_GROUP_DIAGNOSTICS_TTL_MS__ = 150
  const warnBefore = window.console.warn
  const storage = countingStorage(window)

  const dispose = mod.apply(stubContext().context)
  assert.notEqual(window.console.warn, warnBefore, 'installed while they run')

  await waitFor(() => window.console.warn === warnBefore)
  assert.equal(window.console.warn, warnBefore, 'restored once the window expired')
  assert.equal(window.__DSH_SELECTION_GROUP__.diagnosticsMode, 'expired')

  // The final snapshot goes through the 250 ms write throttle, so wait for it too.
  await waitFor(() => (window.localStorage.getItem('dsh-selection-group.diagnostics') ?? '').includes('"diagnosticsMode":"expired"'))
  const stored = JSON.parse(window.localStorage.getItem('dsh-selection-group.diagnostics'))
  assert.equal(stored.diagnosticsMode, 'expired', 'the final snapshot says why sampling stopped')
  assert.notEqual(stored.diagnosticsExpiredAt, null)

  const writesAtExpiry = storage.writes.length
  await wait(400)
  assert.equal(storage.writes.length, writesAtExpiry, 'and nothing is written after that')

  // The toolbar keeps working; only the diagnostics went away.
  select(window, 'user-line')
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'the box still works after expiry')
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), true, 'and the marker still applies')

  storage.restore()
  dispose()
  window.close()
})

test('unmounting clears the expiry timer it armed', async () => {
  const { window, mod } = boot()
  window.__DSH_SELECTION_GROUP_DIAGNOSTICS_TTL_MS__ = 5000 // a regression costs 5 s, not 3 min
  const dispose = mod.apply(stubContext().context)
  assert.notEqual(window.__DSH_SELECTION_GROUP_DIAGNOSTICS_TIMER__, undefined, 'armed at mount')

  dispose()
  assert.equal(window.__DSH_SELECTION_GROUP_DIAGNOSTICS_TIMER__, undefined, 'and cleared on unmount')
  assert.equal(window.__DSH_SELECTION_GROUP_DIAGNOSTICS_DEADLINE__, undefined, 'the deadline goes with it')
  window.close()
})

test('diagnostics can be forced to keep running', async () => {
  const { window, document, mod } = boot()
  window.__DSH_SELECTION_GROUP_DIAGNOSTICS__ = true
  window.__DSH_SELECTION_GROUP_DIAGNOSTICS_TTL_MS__ = 150
  const warnBefore = window.console.warn

  const dispose = mod.apply(stubContext().context)
  const wrapped = window.console.warn
  assert.notEqual(wrapped, warnBefore, 'installed at mount')

  await wait(400)
  assert.equal(window.console.warn, wrapped, 'still capturing well past the TTL')
  assert.equal(window.__DSH_SELECTION_GROUP__.diagnosticsMode, 'on')
  assert.equal(window.__DSH_SELECTION_GROUP__.diagnosticsExpiredAt, null)

  select(window, 'user-line')
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null)

  dispose()
  window.close()
})

test('a stylesheet removed behind our back is restored at once', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  document.getElementById(STYLE_ID).remove() // e.g. a predecessor's teardown
  await waitFor(() => document.getElementById(STYLE_ID) !== null)
  assert.ok(document.getElementById(STYLE_ID) !== null, 'the heartbeat must restore it')
  assert.equal(window.__DSH_SELECTION_GROUP__.stylePresent, true)
  dispose()
  window.close()
})

test('holding the pointer down keeps the standalone button hidden', async () => {
  // The grace window releases the standalone button when no shared box appeared —
  // but while a drag is in flight that would expose it mid-selection, exactly the
  // momentary 引用 pill the user saw. The hold must keep it hidden until release.
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  const pointer = (type) => document
    .querySelector('[data-slot="conversation.session"]')
    .dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }))

  pointer('pointerdown')
  select(window, 'user-line')
  await wait(400) // beyond GRACE_MS: only the hold can still justify hiding it

  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'no shared box during the hold')
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), true, 'and the standalone button stays hidden')

  pointer('pointerup')
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'the release paints the shared box')
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), true, 'which keeps the standalone button hidden')

  dispose()
  window.close()
})

test('a drag paints no box until the pointer is released', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  const pointer = (type) => document
    .querySelector('[data-slot="conversation.session"]')
    .dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }))

  pointer('pointerdown')
  select(window, 'user-line')
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'no box while the pointer is down')

  await wait(180) // longer than the 120 ms settle: that path must stand down too
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'the settle must not paint mid-drag either')

  // Drag across the message boundary — the frame that used to close the box and
  // make it flicker — and release on a valid row.
  select(window, 'assistant-line')
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'still nothing during the drag')

  pointer('pointerup')
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'the box appears in the release turn')
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), true, 'and the standalone button stays hidden')
  assert.equal(document.querySelectorAll(`[${ACTION_ATTR}="quote"]`).length, 1, 'with both actions in it')

  dispose()
  window.close()
})

test('a click without a drag still shows the box at once', async () => {
  // Double-click / keyboard selection: pointerdown+pointerup around the selection,
  // so the release turn paints it immediately (no 120 ms settle wait).
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  const pointer = (type) => document
    .querySelector('[data-slot="conversation.session"]')
    .dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }))

  pointer('pointerdown')
  select(window, 'user-line')
  pointer('pointerup')
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'the box is up right after the release')

  dispose()
  window.close()
})

test('the shared box appears in the same turn as the selection', () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'nothing before a selection')

  select(window, 'user-line')
  // Synchronously — no timer may have run between selecting and this assertion:
  const bar = document.querySelector(`.${BAR_CLASS}`)
  assert.ok(bar !== null, 'the toolbar must be painted in the selectionchange turn')
  assert.equal(bar.querySelectorAll('button').length, 2, 'and it must already carry both actions')
  assert.ok(bar.querySelector(`[${ACTION_ATTR}="quote"]`) !== null)
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), true, 'the standalone button stays hidden meanwhile')

  dispose()
  window.close()
})

test('dragging repositions the box instead of rebuilding it', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)

  select(window, 'user-line')
  const first = document.querySelector(`.${BAR_CLASS}`)
  const firstAction = first.querySelector(`[${ACTION_ATTR}="quote"]`)

  // Keep "dragging": the excerpt changes, but the box must not be rebuilt.
  select(window, 'assistant-line')
  const second = document.querySelector(`.${BAR_CLASS}`)
  assert.equal(second, first, 'the same toolbar node must be reused while dragging')
  assert.equal(second.querySelector(`[${ACTION_ATTR}="quote"]`), firstAction, 'the injected button must survive')
  assert.equal(document.querySelectorAll(`.${BAR_CLASS}`).length, 1)

  // The settle then re-reads the final selection and re-renders exactly once.
  await wait(300)
  assert.equal(document.querySelectorAll(`.${BAR_CLASS}`).length, 1, 'still exactly one toolbar')
  assert.equal(document.querySelectorAll(`[${ACTION_ATTR}="quote"]`).length, 1, 'and exactly one 引用 button')

  dispose()
  window.close()
})

test('clicking 批注 right after a drag annotates the live excerpt', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)

  select(window, 'user-line')
  select(window, 'assistant-line') // the settle for this excerpt has not run yet
  const annotate = [...document.querySelectorAll(`.${BAR_CLASS} button`)].find((button) => button.getAttribute(ACTION_ATTR) === null)
  assert.ok(annotate !== undefined, "the plugin's own 批注 button must be there")
  annotate.click()

  const quoted = document.querySelector('.dsh-ann-quote')
  assert.ok(quoted !== null, 'the editor card must open')
  assert.match(quoted.textContent, /the assistant answer/, 'it must quote the live selection')
  assert.ok(!quoted.textContent.includes('my own question'), 'not the excerpt captured when the box first appeared')

  dispose()
  window.close()
})

test('the standalone button is hidden from the same turn as the selection', () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), false, 'nothing is hidden while idle')

  select(window, 'user-line')
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), true, 'the marker must be set synchronously on selectionchange')
  assert.equal(window.__DSH_SELECTION_GROUP__.quoteButtonHidden, true)
  // The shared box is painted in this same turn as well, so there is no window in
  // which the standalone button could have been visible on its own.
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'the shared box is already up')

  dispose()
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), false, 'dispose releases the marker')
  window.close()
})

test('if the shared box never arrives, the standalone button comes back', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  // Make the shared toolbar impossible: the annotation host is gone for good.
  document.querySelector('[data-annotation-for-dsh]').remove()

  select(window, 'user-line')
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), true, 'hidden while the toolbar is still expected')

  await waitFor(() => document.documentElement.hasAttribute(HIDE_ATTR) === false)
  assert.equal(document.documentElement.hasAttribute(HIDE_ATTR), false, 'released once the grace window expired')
  assert.equal(window.__DSH_SELECTION_GROUP__.quoteButtonHidden, false, 'so 引用 stays reachable on its own')

  dispose()
  window.close()
})

test('the toolbar works in the user\'s own message, not only in assistant replies', async () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  select(window, 'user-line')
  await wait(400)
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'a user-row selection still offers both actions')
  assert.equal(window.__DSH_SELECTION_GROUP__.selection.rowKind, 'user')
  dispose()
  window.close()
})

test('a paused requestAnimationFrame is replaced with a timer', async () => {
  const { window, document, mod } = boot()
  window.requestAnimationFrame = () => 0
  window.cancelAnimationFrame = () => {}
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  await wait(450)
  const diagnostics = window.__DSH_SELECTION_GROUP__
  assert.equal(diagnostics.rafFired, false, 'the probe must notice that rAF never fired')
  assert.equal(diagnostics.rafShimmed, true, 'and replace it, so the plugin\'s rAF refinements still run')
  assert.equal(typeof window.requestAnimationFrame, 'function')
  dispose()
  window.close()
})

test('diagnostics keep sampling the document and mirror into localStorage', async () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  await wait(400)

  const diagnostics = window.__DSH_SELECTION_GROUP__
  assert.ok(diagnostics.tick >= 1, 'the tick must run on a timer')
  assert.equal(diagnostics.transcripts, 1, 'document facts are sampled')
  assert.equal(diagnostics.flowRows, 2)
  assert.equal(diagnostics.actionsInstalled, true)
  const stored = JSON.parse(window.localStorage.getItem('dsh-selection-group.diagnostics'))
  assert.equal(stored.tick >= 1, true)

  dispose()
  assert.equal(typeof diagnostics.disposedAt, 'string')
  const after = window.__DSH_SELECTION_GROUP__.tick
  await wait(350)
  assert.equal(window.__DSH_SELECTION_GROUP__.tick, after, 'dispose must stop the tick, so nothing keeps the page busy')
  window.close()
})
