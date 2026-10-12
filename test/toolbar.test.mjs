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
 *
 * `betterSidebar` is the neighbour service the 侧边对话 action gates on (its
 * absence is a case of its own); `fetch` is the route the action posts to, since
 * the thread has to be created before its tab can be opened.
 *
 * @param options - `{ sidebar }`: `false` leaves the service unregistered,
 * `'broken'` registers one whose `openTab` throws, an object overrides it.
 */
function stubContext(options = {}) {
  const noop = () => {}
  const unsubscribe = () => {}
  const inserted = []
  const openedTabs = []
  const requests = []
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
  const sidebar = options.sidebar === undefined
    ? {
      version: '0.25.0',
      features: ['tabLifecycle'],
      getSnapshot: () => ({ sessionId: 'session-test' }),
      openTab: (seed, scope) => { openedTabs.push({ seed, scope }) },
      registerTab: () => unsubscribe,
    }
    : options.sidebar
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
      if (name === 'betterSidebar')
        return sidebar
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
  return { context, inserted, openedTabs, requests, cleanups }
}

/**
 * Replace the window's fetch with a recorded stub. The 侧边对话 action owns its
 * own wire call, so the assertions are about the request it sends and what it
 * does with each answer.
 *
 * @param window - the jsdom window under test.
 * @param reply - the answer: `{ childId }` for a success envelope, an
 * `Error` to reject the request, an object for a raw envelope, or a function
 * receiving the parsed request body.
 */
function stubFetch(window, reply) {
  const calls = []
  window.fetch = (url, init) => {
    const body = init !== undefined && typeof init.body === 'string' ? JSON.parse(init.body) : null
    calls.push({ url: String(url), init, body })
    const answer = typeof reply === 'function' ? reply(body) : reply
    if (answer instanceof Error)
      return Promise.reject(answer)
    if (answer !== undefined && answer.ok === undefined)
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, value: answer }) })
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(answer) })
  }
  return calls
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

test('the glue publishes its actions and hides only the standalone quote button', () => {
  const { window, document, mod } = boot()
  const dispose = mod.__toolbar(stubContext().context)

  const actions = window.__DSH_SELECTION_GROUP_ACTIONS__
  assert.equal(typeof actions, 'function', 'the patched toolbar reads its actions from this hook')
  const list = actions()
  assert.equal(list.length, 2, '引用 plus 侧边对话 while the sidebar service is present')
  assert.equal(list[0].id, 'quote')
  assert.match(list[0].label, /引用/)
  assert.equal(typeof list[0].run, 'function')
  assert.equal(list[1].id, 'sidechat')
  assert.match(list[1].label, /侧边对话/)
  assert.equal(typeof list[1].run, 'function')

  const css = document.getElementById(STYLE_ID).textContent
  assert.match(css, new RegExp(`html\\[${HIDE_ATTR}\\] #${QUOTE_ID}`), 'the standalone button is hidden only under the marker')
  assert.match(css, /display: none !important/, 'and the hiding must beat the plugin\'s inline display')
  assert.ok(!css.includes(BAR_CLASS), 'the shared toolbar itself is never hidden or restyled into invisibility')

  dispose()
  assert.equal(window.__DSH_SELECTION_GROUP_ACTIONS__, undefined, 'dispose removes the hook')
  assert.equal(document.getElementById(STYLE_ID), null, 'and the stylesheet')
  window.close()
})

test('without the sidebar service the hook publishes 引用 alone', () => {
  // `dsh-better-sidebar` is a neighbour, not a dependency: on a profile without
  // it the toolbar keeps its two upstream actions instead of offering a button
  // that cannot work. The service can also register AFTER this bundle mounts, so
  // the list is rebuilt on every render rather than decided once at mount.
  const { window, mod } = boot()
  const { context } = stubContext({ sidebar: false })
  const live = mod.__toolbar(context)
  const idsOf = () => window.__DSH_SELECTION_GROUP_ACTIONS__().map((action) => action.id).join(',')

  assert.equal(idsOf(), 'quote', 'no sidebar service, no 侧边对话 button')

  // The service registers later (the neighbour plugin mounts after this one).
  context.get = (name) => (name === 'betterSidebar' ? { version: '0.25.0', openTab: () => {} } : null)
  assert.equal(idsOf(), 'quote,sidechat', 'the next render picks the service up')

  live()
  window.close()
})

test('a sidebar service that registers after mount is picked up by the heartbeat', async () => {
  // Realistic order: this bundle mounts, the neighbour's client half provides
  // `betterSidebar` a moment later. Without the heartbeat republishing the action
  // list, a selection made in that window would offer two buttons until the next
  // selection; here the toolbar must grow its third action on its own.
  const { window, document, mod } = boot()
  const context = stubContext({ sidebar: false }).context
  const dispose = mod.apply(context)

  assert.equal(window.__DSH_SELECTION_GROUP_ACTIONS__().length, 1, 'only 引用 before the neighbour exists')
  assert.equal(document.querySelectorAll(`[${ACTION_ATTR}="sidechat"]`).length, 0, 'no 侧边对话 button before the neighbour exists')
  assert.equal(window.__DSH_SELECTION_GROUP__.sidechatEnabled, false, 'the probe reports the neighbour as missing')

  context.get = (name) => (name === 'betterSidebar' ? { version: '0.25.0', openTab: () => {} } : null)
  assert.ok(await waitFor(() => window.__DSH_SELECTION_GROUP__.sidechatEnabled === true), 'the heartbeat notices the registered service')
  assert.ok(await waitFor(() => window.__DSH_SELECTION_GROUP_ACTIONS__().length === 2), 'and republishes the actions carrying it')

  dispose()
  window.close()
})

test('the one hover box carries every action after a selection', async () => {
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
  const sidechat = bar.querySelector(`[${ACTION_ATTR}="sidechat"]`)
  assert.ok(sidechat !== null, 'and the injected 侧边对话 action')
  assert.match(sidechat.textContent, /侧边对话/)
  const annotate = [...bar.querySelectorAll('button')].filter((button) => button.getAttribute(ACTION_ATTR) === null)
  assert.ok(annotate.length >= 1, "the plugin's own 批注 button stays next to it")
  assert.equal(document.querySelectorAll(`[${ACTION_ATTR}="quote"]`).length, 1, 'exactly one 引用 button, never a duplicate')
  assert.equal(document.querySelectorAll(`[${ACTION_ATTR}="sidechat"]`).length, 1, 'and exactly one 侧边对话 button')

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

//#region 侧边对话 (dsh-better-sidebar)
/**
 * Press the injected 侧边对话 button of a fresh selection.
 *
 * `pollMs` shortens the composer wait through the plugin's own window switch.
 * The DEFAULT is the production constant on purpose: the failure this guards
 * against was exactly "the code path without the override is broken", so the
 * tests that do not need a short wait must exercise the real default.
 */
function pressSidechat(window, document, { pollMs } = {}) {
  if (pollMs !== undefined)
    window.__DSH_SELECTION_GROUP_SIDECHAT_POLL_MS__ = pollMs
  select(window, 'user-line')
  const button = document.querySelector(`[${ACTION_ATTR}="sidechat"]`)
  assert.ok(button !== null, 'precondition: the 侧边对话 button is rendered')
  button.click()
}

/**
 * Mount a stand-in for the neighbour's Side Chat composer, shaped exactly the
 * way that plugin builds it: a card whose first child is the send button and
 * whose last child is the `<textarea>` the draft lives in.
 *
 * `tracked` gives the field React 18's own value interception — an OWN `value`
 * accessor over the prototype's — because that is precisely what makes a plain
 * `field.value = …` useless and the prototype setter the only way in.
 */
function mountSideChatComposer(document, { value = '', tracked = false } = {}) {
  const window = document.defaultView
  const card = document.createElement('div')
  card.className = 'sidechat-composer-stub'
  const field = document.createElement('textarea')
  if (tracked) {
    const prototypeGetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').get
    const prototypeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    if (value !== '')
      prototypeSetter.call(field, value)
    const seen = []
    field.addEventListener('input', () => {
      // React re-reads the element through the prototype getter after the event.
      // A plain `field.value = …` never reaches here, because the tracker's own
      // accessor still holds the old value.
      seen.push(prototypeGetter.call(field))
    })
    Object.defineProperty(field, 'value', {
      configurable: true,
      get: () => prototypeGetter.call(field),
      set: () => { /* React's tracker: the raw write is swallowed */ },
    })
    field.__seen = seen
  }
  else {
    field.value = value
  }
  // The neighbour's REAL nesting, which the lookup must survive: the button is NOT
  // the card's first child — the textarea is, and the button sits one level deeper
  // inside the bar. A stub with the button first let the wrong heuristic pass once.
  const bar = document.createElement('div')
  bar.className = 'sidechat-composer-bar-stub'
  const meta = document.createElement('span')
  const send = document.createElement('button')
  send.type = 'button'
  send.setAttribute('title', '发送')
  bar.appendChild(meta)
  bar.appendChild(send)
  card.appendChild(field)
  card.appendChild(bar)
  document.body.appendChild(card)
  return field
}

test('the composer lookup survives the neighbour\'s real nesting and a distractor field', async () => {
  // The shape that broke the shipped lookup, reproduced exactly: the send button is
  // the BAR's child (two levels below the card), the card's first child is the
  // textarea, AND an unrelated editor textarea sits earlier in the document. Four
  // wrong walks passed a shallower stub and failed here — one of them even wrote the
  // selection into the unrelated editor. This is the case that must hold.
  const { window, document, mod } = boot(`<!doctype html><html><head></head><body>
<div data-slot="conversation.session">
  <div data-chat-flow-kind="assistant-step" data-chat-turn="2"><p id="user-line">my own question</p></div>
</div>
<div data-composer-card><div id="composer" data-composer-input contenteditable="true"></div></div>
<div id="editor-card"><textarea id="editor">unrelated editor draft</textarea><div><button title="Save"></button></div></div>
<div class="_4BEzFa_sidechatComposer">
  <textarea id="sidechat-input" class="_4BEzFa_sidechatComposerInput"></textarea>
  <div class="_4BEzFa_sidechatComposerBar">
    <span class="_4BEzFa_sidechatComposerMeta"></span>
    <button class="_4BEzFa_sidechatSendBtn" title="发送"></button>
  </div>
</div>
</body></html>`)
  const { context } = stubContext()
  stubFetch(window, { childId: 'session-side-real' })
  const dispose = mod.apply(context)

  pressSidechat(window, document)
  assert.ok(await waitFor(() => window.__DSH_SELECTION_GROUP__.sidechatLast === 'inserted'), 'the text must land')

  assert.equal(document.getElementById('sidechat-input').value, 'my own question', 'the real composer receives the selection')
  assert.equal(document.getElementById('editor').value, 'unrelated editor draft', 'the unrelated editor is left strictly alone')

  dispose()
  window.close()
})

test('a field with no send button near it is never mistaken for the side chat', async () => {
  // The mirror of the test above: the same nesting but WITHOUT the send button. The
  // lookup must find nothing (and the action must report that), not fall back to some
  // textarea that happens to be on the page.
  const { window, document, mod } = boot(`<!doctype html><html><head></head><body>
<div data-slot="conversation.session"><div data-chat-flow-kind="assistant-step" data-chat-turn="2"><p id="user-line">my own question</p></div></div>
<div data-composer-card><div id="composer" data-composer-input contenteditable="true"></div></div>
<div id="editor-card"><textarea id="editor">unrelated editor draft</textarea><div><button title="Save"></button></div></div>
<div class="_4BEzFa_sidechatComposer">
  <textarea id="sidechat-input" class="_4BEzFa_sidechatComposerInput"></textarea>
  <div class="_4BEzFa_sidechatComposerBar"><span class="_4BEzFa_sidechatComposerMeta"></span></div>
</div>
</body></html>`)
  const { context } = stubContext()
  stubFetch(window, { childId: 'session-side-nosend' })
  const dispose = mod.apply(context)

  pressSidechat(window, document, { pollMs: 60 })
  assert.ok(await waitFor(() => window.__DSH_SELECTION_GROUP__.sidechatLast === 'no-composer'), 'no button means no composer')
  assert.equal(document.getElementById('sidechat-input').value, '', 'nothing is written into a guessed field')
  assert.equal(document.getElementById('editor').value, 'unrelated editor draft', 'and the editor is untouched')

  dispose()
  window.close()
})

test('pressing 侧边对话 quotes the selection into an EMPTY side chat and sends nothing', async () => {
  const { window, document, mod } = boot()
  const { context, openedTabs } = stubContext()
  const calls = stubFetch(window, { childId: 'session-side-1' })
  const dispose = mod.apply(context)
  // The tab's composer is already there (the usual case: `openTab` expands the
  // workbench and the view mounts before the action's poll gives up).
  mountSideChatComposer(document)

  pressSidechat(window, document)
  assert.ok(await waitFor(() => openedTabs.length === 1), 'the action must create the thread and open its tab')

  assert.equal(calls.length, 1, 'exactly one request: the empty-thread create')
  assert.equal(calls[0].url, 'http://localhost/sidebar/api/sidechat.start', 'the thread is created on the neighbour route, resolved against the page base')
  assert.equal(calls[0].init.method, 'POST')
  assert.equal(calls[0].body.sessionId, 'session-test', 'scoped to the conversation the selection lives in')
  assert.equal(calls[0].body.question, '', 'an EMPTY question: nothing is sent, so this costs no tokens')
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'the box closes on the way out')

  // The tab is opened for the THREAD THAT WAS CREATED: the neighbour plugin's
  // descriptor mints its tab without a seed, so its mount reattaches through the
  // "last thread of this session" key — which has to be written before it opens.
  // Deep comparison goes through JSON because these objects are built inside the
  // jsdom realm, and Node's deepStrictEqual refuses a foreign prototype.
  assert.equal(JSON.stringify(openedTabs[0].seed), JSON.stringify({ type: 'sidechat' }))
  assert.equal(JSON.stringify(openedTabs[0].scope), JSON.stringify({ sessionId: 'session-test' }))
  assert.equal(
    JSON.stringify(JSON.parse(window.localStorage.getItem('dsh-sidebar:v1:sidechat-thread'))),
    JSON.stringify({ 'session-test': 'session-side-1' }),
    'the new thread is parked where the tab looks for it',
  )

  // The selection lands in that tab's OWN composer VERBATIM: no wrapper, no `>`
  // prefix — the person adds their own question and sends it.
  const field = document.querySelector('.sidechat-composer-stub textarea')
  assert.equal(field.value, 'my own question', 'the selection is the draft, exactly as selected')
  assert.equal(document.querySelector('.sidechat-composer-stub textarea').getAttribute('data-dsh-selection-group-sidechat-draft') !== null, true, 'the filled composer is marked')
  assert.equal(document.activeElement, field, 'and the caret is in it')
  assert.equal(window.__DSH_SELECTION_GROUP__.sidechatLast, 'inserted')
  assert.equal(window.__DSH_SELECTION_GROUP__.sidechatLastThread, 'session-side-1')
  assert.equal(document.getElementById('dsh-selection-group-sidechat-notice'), null, 'a success needs no notice')

  dispose()
  window.close()
})

test('the selection reaches a React-controlled composer, appending to what is already there', async () => {
  // The neighbour's composer is a controlled textarea: React installs its own
  // `value` property over the prototype's, so writing through the prototype
  // setter (and dispatching `input`) is the only way a draft lands at all.
  const { window, document, mod } = boot()
  const { context } = stubContext()
  stubFetch(window, { childId: 'session-side-2' })
  const dispose = mod.apply(context)
  const field = mountSideChatComposer(document, { value: '## 我的问题', tracked: true })

  pressSidechat(window, document)
  assert.ok(await waitFor(() => field.__seen.length > 0), 'React must observe the write as a user edit')
  assert.equal(field.value, '## 我的问题\n\nmy own question', 'the existing draft is preserved and the selection appended verbatim')
  assert.equal(window.__DSH_SELECTION_GROUP__.sidechatLast, 'inserted')

  dispose()
  window.close()
})

test('a side chat with no composer to write into says so, and invents nothing', async () => {
  // The bottom workbench is collapsed, so the tab exists in state but its view
  // (and therefore its textarea) never mounts. The quote cannot be placed: the
  // action must say that instead of pretending it landed.
  const { window, document, mod } = boot()
  const { context, openedTabs } = stubContext()
  stubFetch(window, { childId: 'session-side-3' })
  const dispose = mod.apply(context)
  document.querySelectorAll('.sidechat-composer-stub').forEach((node) => node.remove())

  pressSidechat(window, document, { pollMs: 60 })
  assert.ok(await waitFor(() => document.getElementById('dsh-selection-group-sidechat-notice') !== null), 'the missing composer must be visible')
  assert.match(document.getElementById('dsh-selection-group-sidechat-notice').textContent, /输入框.*没有出现|composer did not appear/)
  assert.equal(openedTabs.length, 1, 'the tab was opened — only the prefill failed')
  assert.equal(window.__DSH_SELECTION_GROUP__.sidechatLast, 'no-composer')
  assert.equal(window.__DSH_SELECTION_GROUP__.sidechatLastThread, 'session-side-3')

  dispose()
  window.close()
})

test('the default composer wait works with no window override set', async () => {
  // Regression for a shipped ReferenceError: the constant the default branch
  // reads was left behind by a refactor, so the action died with
  // "SIDECHAT_DRAFT_POLL_MS is not defined" the first time it ran on a machine
  // with no override. Every earlier test set the override, which is exactly why
  // none of them caught it. This one sets NOTHING and takes the real default.
  const { window, document, mod } = boot()
  const { context, openedTabs } = stubContext()
  stubFetch(window, { childId: 'session-side-7' })
  const dispose = mod.apply(context)
  assert.equal(window.__DSH_SELECTION_GROUP_SIDECHAT_POLL_MS__, undefined, 'precondition: no override in this window')

  pressSidechat(window, document)
  const startedAt = Date.now()
  assert.ok(
    await waitFor(() => window.__DSH_SELECTION_GROUP__.sidechatLast === 'no-composer', 6000),
    'the default path must run to completion instead of throwing',
  )
  // The checkout of the reported bug: with the constant missing, the read threw
  // in the same microtask, so the outcome was `failed` almost at once. A real
  // default wait burns the whole four seconds before reporting the same state.
  assert.ok(Date.now() - startedAt >= 3900, `the default wait must actually run (took ${Date.now() - startedAt}ms)`)
  assert.equal(openedTabs.length, 1, 'the thread and its tab were created')
  assert.match(document.getElementById('dsh-selection-group-sidechat-notice').textContent, /输入框.*没有出现|composer did not appear/, 'the missing composer is reported')
  assert.doesNotMatch(String(window.__DSH_SELECTION_GROUP__.lastWindowError ?? ''), /is not defined/, 'no ReferenceError may reach the window')

  dispose()
  window.close()
})

test('a side chat insertion never sends the selected text itself', async () => {
  // The whole point of the asked-for change: the selection becomes a draft. The
  // host route must never see it, and no prompt may be admitted.
  const { window, document, mod } = boot()
  const { context } = stubContext()
  const calls = stubFetch(window, () => ({ childId: 'session-side-4' }))
  const dispose = mod.apply(context)
  mountSideChatComposer(document)

  pressSidechat(window, document)
  assert.ok(await waitFor(() => window.__DSH_SELECTION_GROUP__.sidechatLast === 'inserted'), 'precondition: the text landed')
  assert.ok(!calls.some((call) => String(call.body?.question ?? '').includes('my own question')), 'the selection is not on the wire')
  assert.ok(!calls.some((call) => call.url.includes('sidechat.prompt')), 'and no prompt is admitted')

  dispose()
  window.close()
})

test('a refused 侧边对话 says why, and opens no tab', async () => {
  // The neighbour route refuses a parent session that is not running (409). The
  // thread never exists, so no tab may be opened onto nothing.
  const { window, document, mod } = boot()
  const { context, openedTabs } = stubContext()
  stubFetch(window, { ok: false, error: { code: 'sidechat-error', message: 'parent session "session-test" is not running' } })
  const dispose = mod.apply(context)
  mountSideChatComposer(document)

  pressSidechat(window, document)
  assert.ok(await waitFor(() => document.getElementById('dsh-selection-group-sidechat-notice') !== null), 'the refusal must be visible')

  const notice = document.getElementById('dsh-selection-group-sidechat-notice').textContent
  assert.match(notice, /侧边对话失败/)
  assert.match(notice, /not running/, 'with the route\'s own reason, not a generic failure')
  assert.equal(openedTabs.length, 0, 'no tab is opened for a thread that was never created')
  assert.equal(window.__DSH_SELECTION_GROUP__.sidechatLast, 'failed')
  assert.match(window.__DSH_SELECTION_GROUP__.sidechatLastError, /not running/)

  dispose()
  assert.equal(document.getElementById('dsh-selection-group-sidechat-notice'), null, 'the last dispose drops the notice and its timer')
  window.close()
})

test('a 侧边对话 that cannot reach the route reports it instead of failing silently', async () => {
  const { window, document, mod } = boot()
  const { context, openedTabs } = stubContext()
  stubFetch(window, new Error('Failed to fetch'))
  const dispose = mod.apply(context)
  mountSideChatComposer(document)

  pressSidechat(window, document)
  assert.ok(await waitFor(() => document.getElementById('dsh-selection-group-sidechat-notice') !== null), 'a network failure must be visible')
  assert.match(document.getElementById('dsh-selection-group-sidechat-notice').textContent, /Failed to fetch/)
  assert.equal(openedTabs.length, 0)
  assert.equal(window.__DSH_SELECTION_GROUP__.sidechatLast, 'failed')

  dispose()
  window.close()
})

test('a hostile 侧边对话 answer is reported, never acted on', async () => {
  // A route that is not there answers HTML (or any other shape): the request
  // "succeeds" while carrying no thread. Nothing may be stored or opened.
  const { window, document, mod } = boot()
  const { context, openedTabs } = stubContext()
  window.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError('not json')) })
  const dispose = mod.apply(context)
  mountSideChatComposer(document)

  pressSidechat(window, document)
  assert.ok(await waitFor(() => document.getElementById('dsh-selection-group-sidechat-notice') !== null))
  assert.match(document.getElementById('dsh-selection-group-sidechat-notice').textContent, /HTTP 200/)
  assert.equal(openedTabs.length, 0)
  assert.equal(window.localStorage.getItem('dsh-sidebar:v1:sidechat-thread'), null, 'no thread id is invented')

  dispose()
  window.close()
})

test('侧边对话 quotes a very long selection, capped', async () => {
  const { window, document, mod } = boot()
  const { context } = stubContext()
  stubFetch(window, { childId: 'session-side-5' })
  const dispose = mod.apply(context)
  mountSideChatComposer(document)

  document.getElementById('user-line').textContent = 'x'.repeat(5000)
  pressSidechat(window, document)
  assert.ok(await waitFor(() => window.__DSH_SELECTION_GROUP__.sidechatLast === 'inserted'), 'the long selection still lands')

  const field = document.querySelector('.sidechat-composer-stub textarea')
  assert.equal(Array.from(field.value).length, 4001, 'the inserted text is capped at 4000 code points plus the ellipsis')
  assert.ok(field.value.endsWith('…'))

  dispose()
  window.close()
})

test('a 侧边对话 tab that refuses to open still reports the failure', async () => {
  // The thread exists at that point: the person reaches it from the workbench's
  // own thread menu, so the failure must say so rather than claim nothing happened.
  const { window, document, mod } = boot()
  const { context } = stubContext({ sidebar: { version: '0.25.0', features: [], openTab: () => { throw new Error('no workbench') } } })
  stubFetch(window, { childId: 'session-side-6' })
  const dispose = mod.apply(context)

  pressSidechat(window, document)
  assert.ok(await waitFor(() => document.getElementById('dsh-selection-group-sidechat-notice') !== null))
  assert.match(document.getElementById('dsh-selection-group-sidechat-notice').textContent, /tab did not open|no workbench/)
  assert.equal(window.__DSH_SELECTION_GROUP__.sidechatLastThread, 'session-side-6', 'the created thread is still recorded')

  dispose()
  window.close()
})
//#endregion

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
  assert.equal(bar.querySelectorAll('button').length, 3, 'and it must already carry every action')
  assert.ok(bar.querySelector(`[${ACTION_ATTR}="quote"]`) !== null)
  assert.ok(bar.querySelector(`[${ACTION_ATTR}="sidechat"]`) !== null)
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

//#region chat-only (no toolbar over file content)
/**
 * The document-preview markers the HOST renders and upstream annotation
 * recognized: `DOCUMENT_TEXT` inside `[data-textpreview-url]`.
 */
const FILE_PREVIEW_HTML = `<!doctype html><html><head></head><body>
<div data-slot="conversation.session">
  <div data-chat-flow-kind="user" data-chat-turn="1"><p id="user-line">my own question</p></div>
</div>
<div data-composer-card><div id="composer" data-composer-input contenteditable="true"></div></div>
<div data-slot="sidebar" id="sidebar">
  <div data-slot="sidebar.right.tab.document">
    <div data-textpreview-url="dsh-resource://file/session/session-test/package-lock.json">
      <div data-code-preview><pre id="file-line">"lockfileVersion": 3,</pre></div>
    </div>
  </div>
</div>
</body></html>`

test('a selection inside a file preview raises no toolbar at all', async () => {
  // The reported regression: the box appeared over a package-lock.json opened in the
  // sidebar. Upstream annotation serves file content on purpose (documentSourceOf),
  // and the merged bundle disabled that path — the toolbar is a chat affordance.
  const { window, document, mod } = boot(FILE_PREVIEW_HTML)
  const { context } = stubContext()
  const dispose = mod.apply(context)

  select(window, 'file-line')
  await wait(400)

  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'no hover box over file content')
  assert.equal(document.querySelectorAll(`[${ACTION_ATTR}]`).length, 0, 'no injected actions either')
  assert.equal(document.getElementById(QUOTE_ID)?.style.display ?? '', 'none', 'and the standalone quote button stays hidden')

  dispose()
  window.close()
})

test('a file selection leaves the toolbar available for the conversation', async () => {
  // …and the gate is not a blanket off-switch: selecting in the transcript right
  // after a file selection still raises the box.
  const { window, document, mod } = boot(FILE_PREVIEW_HTML)
  const { context } = stubContext()
  const dispose = mod.apply(context)

  select(window, 'file-line')
  await wait(400)
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'precondition: no box for the file')

  select(window, 'user-line')
  await wait(400)
  const bar = document.querySelector(`.${BAR_CLASS}`)
  assert.ok(bar !== null, 'the conversation still gets its box')
  assert.equal(bar.querySelectorAll(`[${ACTION_ATTR}]`).length, 2, 'with both injected actions')

  dispose()
  window.close()
})

test('a conversation row rendered inside the sidebar is refused too', async () => {
  // The sidebar hosts a Side Chat view; DSH's right column hosts tab types. The rule
  // is by COLUMN, not by row kind: a chat row inside [data-slot="sidebar"] raises nothing.
  const { window, document, mod } = boot(`<!doctype html><html><head></head><body>
<div data-slot="conversation.session">
  <div data-chat-flow-kind="user" data-chat-turn="1"><p id="user-line">my own question</p></div>
</div>
<div data-composer-card><div id="composer" data-composer-input contenteditable="true"></div></div>
<div data-slot="sidebar">
  <div data-slot="sidebar.chat.conversation">
    <div data-slot="conversation.session">
      <div data-chat-flow-kind="assistant-step" data-chat-turn="2"><p id="side-line">an answer in the side chat</p></div>
    </div>
  </div>
</div>
</body></html>`)
  const { context } = stubContext()
  const dispose = mod.apply(context)

  select(window, 'side-line')
  await wait(400)

  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'the right column never raises the box')
  assert.equal(window.__DSH_SELECTION_GROUP__.selection.inTranscript, false, 'and the diagnostic agrees')

  dispose()
  window.close()
})
//#endregion
