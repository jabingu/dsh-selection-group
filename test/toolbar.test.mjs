/**
 * dsh-selection-group — toolbar glue tests.
 *
 * One annotation-owned hover box with annotate, quote and side-chat actions.
 * Quote is a headless service; all three actions share the selection snapshot.
 */

import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { JSDOM } from 'jsdom'
import React from 'react'

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
  window.Range.prototype.getClientRects = function () { return [this.getBoundingClientRect()] }
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
  if (reply?.childId) window.__testSidechatThread = reply.childId
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

function selectAcrossMessages(window) {
  const document = window.document
  const range = document.createRange()
  range.setStart(document.getElementById('user-line').firstChild, 0)
  range.setEnd(document.getElementById('assistant-line').firstChild, 'the assistant answer'.length)
  const selection = window.getSelection()
  selection.removeAllRanges(); selection.addRange(range)
  const text = selection.toString().trim()
  document.dispatchEvent(new window.Event('selectionchange'))
  return text
}

/** Conversation chrome crossed by the selection in the reported screenshot. */
function insertConversationControls(document) {
  const controls = document.createElement('div')
  controls.innerHTML = '<time>09:30</time><button id="copy-message" aria-label="复制"><svg></svg></button><button id="message-status">已完成，用时1秒<span>⌄</span></button><hr>'
  document.getElementById('user-line').parentElement.after(controls)
  return controls
}

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
  assert.equal(typeof window.__DSH_SELECTION_GROUP_QUOTE__?.run, 'function', 'the quote core stays mounted without floating UI')
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

test('the glue publishes actions without a hidden standalone button', () => {
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
  assert.ok(!css.includes(QUOTE_ID), 'there is no button-hiding selector')
  assert.ok(!css.includes('display: none'), 'there is no floating-UI visibility workaround')
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

  assert.equal(document.getElementById(QUOTE_ID), null, 'no independent floating quote UI')
  const quote = window.__DSH_SELECTION_GROUP_QUOTE__
  let invoked = 0
  const run = quote.run
  quote.run = () => { invoked++; return run() }
  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  assert.equal(invoked, 1, 'the toolbar calls the native quote core directly')
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
/** SideChatView's committed props, matching the official tab/scope contract. */
function bindSideChatField(field, { childId, sessionId = 'session-test', visible = true } = {}) {
  const root = { stateNode: {} }
  root.stateNode.current = root
  const owner = { return: root, memoizedProps: { scope: { sessionId }, tab: { type: 'sidechat', meta: { threadId: childId } }, visible } }
  field.__reactFiber$fixture = { return: owner }
  return owner
}

function mountSideChatComposer(document, { value = '', tracked = false, childId = document.defaultView.__testSidechatThread ?? 'session-side-1', sessionId = 'session-test', visible = true } = {}) {
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
  bindSideChatField(field, { childId, sessionId, visible })
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
  bindSideChatField(document.getElementById('sidechat-input'), { childId: 'session-side-real' })
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
  bindSideChatField(document.getElementById('sidechat-input'), { childId: 'session-side-nosend' })
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
  assert.equal(JSON.stringify(openedTabs[0].seed), JSON.stringify({ type: 'sidechat', meta: { threadId: 'session-side-1' } }))
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
  mountSideChatComposer(document, { childId: 'session-side-4' })

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

test('the standalone quote fallback drops a main excerpt when selection moves into a sidebar', async () => {
  const { window, document, mod } = boot()
  const sidebar = document.createElement('div')
  sidebar.setAttribute('data-slot', 'sidebar.chat')
  sidebar.innerHTML = '<div data-slot="conversation.session"><p id="side-line">other session text</p></div>'
  document.body.appendChild(sidebar)
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  select(window, 'user-line')
  select(window, 'side-line')
  await wait(350)
  assert.equal(document.getElementById(QUOTE_ID), null)
  assert.equal(window.__DSH_SELECTION_GROUP_QUOTE__.run(), false)
  assert.equal(inserted.length, 0, 'neither the stale main excerpt nor the side excerpt is inserted')
  dispose()
})

test('a new side thread waits for its own composer among unrelated and old composers', async () => {
  const { window, document, mod } = boot()
  const unrelated = mountSideChatComposer(document, { childId: 'new-thread', sessionId: 'other-session', value: 'unrelated' })
  const old = mountSideChatComposer(document, { childId: 'old-thread', value: 'old draft' })
  let target
  const { context } = stubContext({ sidebar: { openTab: () => {
    window.setTimeout(() => { target = mountSideChatComposer(document, { childId: 'new-thread' }) }, 80)
  } } })
  stubFetch(window, { childId: 'new-thread' })
  const dispose = mod.apply(context)
  pressSidechat(window, document, { pollMs: 500 })
  await wait(30)
  assert.equal(old.value, 'old draft', 'an existing composer is not accepted as new-thread readiness')
  assert.equal(unrelated.value, 'unrelated')
  assert.ok(await waitFor(() => target?.value === 'my own question'))
  assert.equal(old.value, 'old draft')
  assert.equal(unrelated.value, 'unrelated')
  dispose()
})

test('unknown, hidden, read-only and disabled composers are never written', async () => {
  const { window, document, mod } = boot()
  stubFetch(window, { childId: 'target' })
  const fields = []
  const unknown = mountSideChatComposer(document); delete unknown.__reactFiber$fixture; fields.push(unknown)
  const hidden = mountSideChatComposer(document); hidden.parentElement.hidden = true; fields.push(hidden)
  const cssHidden = mountSideChatComposer(document); cssHidden.parentElement.style.display = 'none'; fields.push(cssHidden)
  const invisible = mountSideChatComposer(document, { visible: false }); fields.push(invisible)
  const disabled = mountSideChatComposer(document); disabled.disabled = true; fields.push(disabled)
  const readOnly = mountSideChatComposer(document); readOnly.readOnly = true; fields.push(readOnly)
  const { context } = stubContext()
  const dispose = mod.apply(context)
  pressSidechat(window, document, { pollMs: 60 })
  assert.ok(await waitFor(() => window.__DSH_SELECTION_GROUP__.sidechatLast === 'no-composer'))
  for (const field of fields) assert.equal(field.value, '')
  dispose()
})

test('side chat binds a newly created tab before its autoCreate view can mount', async () => {
  const { window, document, mod } = boot()
  const oldTab = { id: 'old', type: 'sidechat', meta: { threadId: 'old-thread' } }
  const tabs = [oldTab]
  let field
  const sidebar = {
    getSnapshot: () => ({ sessionId: 'session-test', state: { bottomSplits: { kind: 'split', children: [{ tabs }] } } }),
    openTab: () => { tabs.push({ id: 'new', type: 'sidechat', meta: { autoCreate: true } }) },
    updateTab: (id, patch, sessionId) => {
      assert.equal(id, 'new'); assert.equal(sessionId, 'session-test')
      tabs.find(tab => tab.id === id).meta = patch.meta
      field = mountSideChatComposer(document, { childId: patch.meta.threadId })
    },
  }
  const { context } = stubContext({ sidebar })
  stubFetch(window, { childId: 'target' })
  const dispose = mod.apply(context)
  pressSidechat(window, document)
  assert.ok(await waitFor(() => field?.value === 'my own question'))
  assert.equal(tabs[1].meta.threadId, 'target'); assert.equal(tabs[1].meta.autoCreate, false)
  assert.equal(oldTab.meta.threadId, 'old-thread')
  dispose()
})

test('dispose aborts an unresolved fetch and ignores a late response', async () => {
  const { window, document, mod } = boot()
  let finish; let signal
  window.fetch = (_url, init) => { signal = init.signal; return new Promise(resolve => { finish = resolve }) }
  const { context, openedTabs } = stubContext()
  const field = mountSideChatComposer(document, { childId: 'target' })
  const dispose = mod.apply(context)
  pressSidechat(window, document)
  dispose()
  assert.equal(signal.aborted, true)
  finish({ json: async () => ({ ok: true, value: { childId: 'target' } }) })
  await wait(50)
  assert.equal(openedTabs.length, 0)
  assert.equal(window.localStorage.getItem('dsh-sidebar:v1:sidechat-thread'), null)
  assert.equal(field.value, '')
  assert.equal(document.getElementById('dsh-selection-group-sidechat-notice'), null)
})

test('dispose during JSON parsing cannot write storage or open the tab', async () => {
  const { window, document, mod } = boot()
  let finish
  window.fetch = async () => ({ json: () => new Promise(resolve => { finish = resolve }) })
  const { context, openedTabs } = stubContext()
  const dispose = mod.apply(context)
  pressSidechat(window, document)
  assert.ok(await waitFor(() => finish !== undefined))
  dispose(); finish({ ok: true, value: { childId: 'target' } })
  await wait(30)
  assert.equal(openedTabs.length, 0)
  assert.equal(window.localStorage.getItem('dsh-sidebar:v1:sidechat-thread'), null)
})

test('dispose cancels the composer poll before a delayed field appears', async () => {
  const { window, document, mod } = boot()
  stubFetch(window, { childId: 'target' })
  const { context, openedTabs } = stubContext()
  const dispose = mod.apply(context)
  pressSidechat(window, document, { pollMs: 200 })
  assert.ok(await waitFor(() => openedTabs.length === 1))
  dispose()
  const field = mountSideChatComposer(document, { childId: 'target' })
  await wait(250)
  assert.equal(field.value, '')
  assert.equal(document.getElementById('dsh-selection-group-sidechat-notice'), null)
})

test('a session switch before the response cancels side chat without changing the other session', async () => {
  const { window, document, mod } = boot()
  const { context, openedTabs } = stubContext()
  let sessionId = 'session-test'; let onSession; let unsubscribed = false; let finish; let signal
  const originalGet = context.get
  context.get = name => name === 'uiSession' ? { adapter: { current: {
    getSnapshot: () => ({ key: sessionId }), subscribe: listener => { onSession = listener; return () => { unsubscribed = true } },
  } } } : originalGet(name)
  window.fetch = (_url, init) => { signal = init.signal; return new Promise(resolve => { finish = resolve }) }
  const dispose = mod.apply(context)
  pressSidechat(window, document)
  sessionId = 'other-session'; onSession()
  assert.equal(signal.aborted, true); assert.equal(unsubscribed, true)
  finish({ json: async () => ({ ok: true, value: { childId: 'target' } }) }); await wait(30)
  assert.equal(openedTabs.length, 0)
  assert.equal(window.localStorage.getItem('dsh-sidebar:v1:sidechat-thread'), null)
  dispose()
})

test('a hot swap cancels its predecessor without blocking the successor', async () => {
  const { window, document, mod } = boot()
  const { context, openedTabs } = stubContext()
  let finish; let oldSignal
  window.fetch = (_url, init) => { oldSignal = init.signal; return new Promise(resolve => { finish = resolve }) }
  const previous = mod.apply(context)
  pressSidechat(window, document)
  const successor = mod.apply(context)
  assert.equal(oldSignal.aborted, true)
  stubFetch(window, { childId: 'successor-thread' })
  const field = mountSideChatComposer(document)
  pressSidechat(window, document)
  finish({ json: async () => ({ ok: true, value: { childId: 'predecessor-thread' } }) })
  previous()
  assert.ok(await waitFor(() => field.value === 'my own question'))
  assert.equal(openedTabs.length, 1)
  assert.equal(JSON.parse(window.localStorage.getItem('dsh-sidebar:v1:sidechat-thread'))['session-test'], 'successor-thread')
  successor()
})

test('the real React composer waits for committed target-thread props and retains the controlled draft', async () => {
  const { window, document, mod } = boot()
  // React DOM needs navigator even on Node 20, where there is no native one.
  // Node 22+ exposes it through an accessor, so save/restore exact descriptors.
  const browserGlobals = { window, document, navigator: window.navigator }
  const previous = Object.fromEntries(Object.keys(browserGlobals)
    .map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  let dispose; let root; let flushSync
  try {
    for (const [key, value] of Object.entries(browserGlobals))
      Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
    const { createRoot } = await import('react-dom/client')
    ;({ flushSync } = await import('react-dom'))
    const host = document.createElement('div'); document.body.appendChild(host)
    root = createRoot(host)
    let setDraft; let observed = ''
    function SideChatView({ scope, tab, visible }) {
      const [draft, update] = React.useState('')
      setDraft = update; observed = draft
      return React.createElement('div', null,
        React.createElement('textarea', { value: draft, onChange: event => update(event.target.value) }),
        React.createElement('div', null, React.createElement('button', { title: 'Send' }, 'Send')))
    }
    const render = childId => flushSync(() => root.render(React.createElement(SideChatView, {
      scope: { sessionId: 'session-test' }, tab: { type: 'sidechat', meta: { threadId: childId } }, visible: true,
    })))
    render('old-thread')
    const field = host.querySelector('textarea')
    const { context } = stubContext({ sidebar: { openTab: () => window.setTimeout(() => render('target'), 80) } })
    stubFetch(window, { childId: 'target' }); dispose = mod.apply(context)
    pressSidechat(window, document, { pollMs: 500 })
    await wait(30); assert.equal(field.value, '', 'old committed props are refused')
    assert.ok(await waitFor(() => observed === 'my own question'), 'React onChange accepts the injected draft')
    flushSync(() => setDraft(value => value + '!'))
    assert.equal(host.querySelector('textarea').value, 'my own question!', 'a subsequent React commit preserves the draft')
  } finally {
    try {
      dispose?.()
      if (root) flushSync(() => root.unmount())
    } finally {
      for (const [key, descriptor] of Object.entries(previous)) {
        if (descriptor === undefined) delete globalThis[key]
        else Object.defineProperty(globalThis, key, descriptor)
      }
    }
  }
  for (const [key, descriptor] of Object.entries(previous))
    assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis, key), descriptor, `restore ${key}`)
})

test('an independently evaluated replacement bundle aborts the predecessor operation', async () => {
  const { window, document, mod } = boot()
  const { context, openedTabs } = stubContext()
  let finish; let signal
  window.fetch = (_url, init) => { signal = init.signal; return new Promise(resolve => { finish = resolve }) }
  const previous = mod.apply(context)
  pressSidechat(window, document)
  let replacement
  window.__ModuleLoader__.load = registration => { replacement = registration.factory(() => { throw new Error('external module') }) }
  window.eval(clientSource)
  const successor = replacement.apply(context)
  assert.equal(signal.aborted, true, 'a different factory has independent closure state but shares the operation owner')
  stubFetch(window, { childId: 'successor-thread' })
  const field = mountSideChatComposer(document)
  pressSidechat(window, document)
  finish({ json: async () => ({ ok: true, value: { childId: 'predecessor-thread' } }) })
  previous()
  assert.ok(await waitFor(() => field.value === 'my own question'))
  assert.equal(openedTabs.length, 1)
  assert.equal(JSON.parse(window.localStorage.getItem('dsh-sidebar:v1:sidechat-thread'))['session-test'], 'successor-thread')
  successor()
})

test('a failed request arriving after dispose does not recreate a notice', async () => {
  const { window, document, mod } = boot()
  let reject
  window.fetch = () => new Promise((_resolve, failure) => { reject = failure })
  const { context, openedTabs } = stubContext()
  const dispose = mod.apply(context)
  pressSidechat(window, document)
  dispose(); reject(new Error('late network failure'))
  await wait(50)
  assert.equal(openedTabs.length, 0)
  assert.equal(document.getElementById('dsh-selection-group-sidechat-notice'), null)
  assert.equal(window.__DSH_SELECTION_GROUP_SIDECHAT_OPERATION__, undefined)
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

  assert.equal(document.querySelectorAll(`#${QUOTE_ID}`).length, 0, 'no floating quote button after replacement')

  disposeFirst() // the predecessor is torn down afterwards
  await wait(150)  // settle the cross-plugin pipeline; 60 ms flaked under parallel load
  assert.equal(typeof window.__DSH_SELECTION_GROUP_QUOTE__?.run, 'function', 'the quote core survives predecessor cleanup')

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
  assert.notEqual(window.console.warn, warnBefore, 'the replacement still captures warnings')
  assert.ok(window.__DSH_SELECTION_GROUP_CAPTURE__ !== undefined, 'the replacement has an active capture record')

  disposeFirst()
  assert.ok(window.__DSH_SELECTION_GROUP_CAPTURE__ !== undefined, 'a live layer keeps the captures')

  disposeSecond()
  assert.equal(window.__DSH_SELECTION_GROUP_CAPTURE__, undefined, 'the last dispose removes the record')
  assert.equal(window.console.warn, warnBefore, 'and restores the original console')
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), false, 'and clears the marker')
  window.close()
})

test('annotation editing does not create a second floating window', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)

  select(window, 'user-line')
  const annotate = [...document.querySelectorAll(`.${BAR_CLASS} button`)].find((button) => button.getAttribute(ACTION_ATTR) === null)
  annotate.click()
  // Wait past the grace window: only the open card can keep the marker set now.
  await wait(420)

  assert.ok(document.querySelector('.dsh-ann-card') !== null, 'the editor card is open')
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null, 'the actions box is gone')
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), true, 'so the standalone button must stay hidden')

  dispose()
  window.close()
})

test('diagnostics follow the sole toolbar through DOM mutations', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  select(window, 'user-line')
  await wait(30)
  assert.equal(window.__DSH_SELECTION_GROUP__.barUp, true)
  document.querySelector(`.${BAR_CLASS}`).remove()
  await wait(30)
  assert.equal(window.__DSH_SELECTION_GROUP__.barUp, false)
  assert.equal(document.getElementById(QUOTE_ID), null)
  dispose()
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

test('cancelling the selection removes the sole toolbar and its snapshot', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  select(window, 'user-line')
  assert.equal(document.querySelectorAll(`.${BAR_CLASS}`).length, 1)
  window.getSelection().collapse(document.getElementById('user-line').firstChild, 0)
  document.dispatchEvent(new window.Event('selectionchange'))
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null)
  assert.equal(window.__DSH_SELECTION_GROUP_SELECTION__.getSnapshot(), null)
  assert.equal(document.getElementById(QUOTE_ID), null)
  dispose()
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
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), true, 'the marker still applies')
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
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), true)

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
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), true, 'and the marker still applies')

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

test('holding the primary pointer keeps all floating actions absent', async () => {
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
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), true, 'and the standalone button stays hidden')

  pointer('pointerup')
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'the release paints the shared box')
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), true, 'which keeps the standalone button hidden')

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
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), true, 'and the standalone button stays hidden')
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
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), true, 'the standalone button stays hidden meanwhile')

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

test('one selection snapshot drives the sole toolbar in the same turn', () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), false, 'nothing is hidden while idle')

  select(window, 'user-line')
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), true, 'the marker must be set synchronously on selectionchange')
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), true)
  // The shared box is painted in this same turn as well, so there is no window in
  // which the standalone button could have been visible on its own.
  assert.ok(document.querySelector(`.${BAR_CLASS}`) !== null, 'the shared box is already up')

  dispose()
  assert.equal(Boolean(window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot()), false, 'dispose releases the marker')
  window.close()
})

test('a missing annotation host never releases a fallback quote window', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  document.querySelector('[data-annotation-for-dsh]').remove()
  select(window, 'user-line')
  await wait(350)
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null)
  assert.equal(document.getElementById(QUOTE_ID), null, 'no fallback UI at any time')
  dispose()
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
  assert.equal(document.getElementById(QUOTE_ID), null, 'no independent quote UI')

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
  assert.equal(document.getElementById(QUOTE_ID), null, 'no independent quote UI in the sidebar')
  assert.equal(window.__DSH_SELECTION_GROUP__.selection.inTranscript, false, 'and the diagnostic agrees')

  dispose()
  window.close()
})
//#endregion

function pendingChipFixture({ seat = true } = {}) {
  const { window, document, mod } = boot()
  const card = document.querySelector('[data-composer-card]')
  if (seat) {
    const container = document.createElement('div')
    container.setAttribute('data-composer-seat', '')
    card.before(container)
    container.appendChild(card)
  }
  const container = seat ? card.parentElement : card
  container.style.setProperty('padding-top', '10px', 'important')
  container.getBoundingClientRect = () => ({ ...RECT, top: 400, bottom: 620 })
  if (seat) card.getBoundingClientRect = () => ({ ...RECT,
    top: 400 + parseFloat(container.style.paddingTop) + 40, bottom: 620 })
  window.localStorage.setItem('dsh.annotation.pending.v1.session-test', JSON.stringify([
    { id: 'pending-1', text: 'the assistant answer', note: 'review this' },
  ]))
  return { window, document, mod, card, container }
}

test('pending annotation reserves a row below conversation content and above queue and composer', () => {
  const { window, document, mod, card, container } = pendingChipFixture()
  const dispose = mod.apply(stubContext().context)
  const chip = document.querySelector('[data-annotation-chip]')
  const top = parseFloat(chip.style.top)
  assert.equal(chip.style.display, 'flex')
  assert.equal(chip.textContent, '1条批注')
  assert.ok(top >= container.getBoundingClientRect().top, 'inside input area, never over the preceding message')
  assert.ok(top + 24 + 6 <= card.getBoundingClientRect().top - 40, 'clear of the queue above the card')
  chip.dispatchEvent(new window.MouseEvent('mouseenter'))
  assert.ok(document.querySelector('[data-annotation-tip-layer]').textContent.includes('review this'))
  dispose()
  assert.equal(container.style.paddingTop, '10px')
  assert.equal(container.style.getPropertyPriority('padding-top'), 'important')
  assert.equal(document.querySelector('[data-annotation-chip]'), null)
})

test('pending chip fallback reserves input space when there is no composer seat', () => {
  const { document, mod, container } = pendingChipFixture({ seat: false })
  const dispose = mod.apply(stubContext().context)
  const chip = document.querySelector('[data-annotation-chip]')
  const top = parseFloat(chip.style.top)
  assert.ok(top >= 400)
  assert.ok(top + 24 <= 400 + parseFloat(container.style.paddingTop))
  dispose()
  assert.equal(container.style.paddingTop, '10px')
})

test('session switch releases the chip row and restores it once when returning to pending annotations', () => {
  const { window, document, mod, container } = pendingChipFixture()
  const { context } = stubContext()
  const listeners = []
  context.sessions.list.subscribe = callback => { listeners.push(callback); return () => {} }
  const dispose = mod.apply(context)
  const reserved = container.style.paddingTop
  window.localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 'empty-session' }))
  for (const listener of listeners) listener()
  assert.equal(document.querySelector('[data-annotation-chip]').style.display, 'none')
  assert.equal(container.style.paddingTop, '10px')
  window.localStorage.setItem('dsh.sessions.current', JSON.stringify({ sessionId: 'session-test' }))
  for (const listener of listeners) listener()
  assert.equal(container.style.paddingTop, reserved)
  for (const listener of listeners) listener()
  assert.equal(container.style.paddingTop, reserved, 'never accumulate reserved height')
  dispose()
})

test('composer replacement moves the reserved chip row and restores both containers on disposal', async () => {
  const { window, document, mod, container } = pendingChipFixture()
  const dispose = mod.apply(stubContext().context)
  const replacement = container.cloneNode(true)
  replacement.style.paddingTop = '16px'
  replacement.getBoundingClientRect = () => ({ ...RECT, top: 350, bottom: 620 })
  const replacementCard = replacement.querySelector('[data-composer-card]')
  replacementCard.getBoundingClientRect = () => ({ ...RECT,
    top: 350 + parseFloat(replacement.style.paddingTop) + 40, bottom: 620 })
  container.replaceWith(replacement)
  window.dispatchEvent(new window.Event('resize'))
  assert.ok(await waitFor(() => parseFloat(replacement.style.paddingTop) > 16))
  assert.equal(container.style.paddingTop, '10px')
  const chip = document.querySelector('[data-annotation-chip]')
  assert.ok(parseFloat(chip.style.top) + 24 < replacementCard.getBoundingClientRect().top)
  dispose()
  assert.equal(replacement.style.paddingTop, '16px')
})

function stickyChipFixture(scrollTop = 400) {
  const fixture = pendingChipFixture()
  const { window, document, container } = fixture
  window.localStorage.removeItem('dsh.annotation.pending.v1.session-test')
  const scroller = document.createElement('div')
  scroller.setAttribute('data-conversation-scroll', '')
  document.body.prepend(scroller)
  scroller.appendChild(document.querySelector('[data-slot="conversation.session"]'))
  scroller.appendChild(container)
  let extraHeight = 0
  Object.defineProperty(scroller, 'clientHeight', { get: () => 600 })
  Object.defineProperty(scroller, 'scrollHeight', {
    get: () => 1000 + parseFloat(container.style.paddingTop) - 10 + extraHeight,
  })
  scroller.scrollTop = scrollTop
  return { ...fixture, scroller, growHost: () => { extraHeight += 12 } }
}

function saveChipAnnotation(window, document) {
  select(window, 'assistant-line')
  document.querySelector(`.${BAR_CLASS} button`).click()
  const input = document.querySelector('.dsh-ann-input')
  input.value = 'new annotation'
  input.dispatchEvent(new window.Event('input'))
  document.querySelector('.dsh-ann-card .dsh-ann-action').click()
}

test('saving the first annotation keeps a sticky composer tail visible without a user scroll', async () => {
  const { window, document, mod, scroller, growHost } = stickyChipFixture()
  const dispose = mod.apply(stubContext().context)
  saveChipAnnotation(window, document)
  assert.equal(scroller.scrollTop, scroller.scrollHeight - scroller.clientHeight, 'compensate in the save turn')
  const landing = scroller.scrollTop
  growHost()
  assert.ok(await waitFor(() => scroller.scrollTop > landing), 'settle after delayed host layout without wheel/resize events')
  assert.equal(scroller.scrollTop, scroller.scrollHeight - scroller.clientHeight)
  dispose()
})

test('saving an annotation while reading history preserves the reading position', async () => {
  const { window, document, mod, scroller, growHost } = stickyChipFixture(100)
  const dispose = mod.apply(stubContext().context)
  saveChipAnnotation(window, document)
  growHost()
  await wait(50)
  assert.equal(scroller.scrollTop, 100)
  dispose()
})

test('a reader scroll before chip layout settles is not pulled back to the tail', async () => {
  const { window, document, mod, scroller, growHost } = stickyChipFixture()
  const dispose = mod.apply(stubContext().context)
  saveChipAnnotation(window, document)
  scroller.scrollTop = 100
  growHost()
  await wait(50)
  assert.equal(scroller.scrollTop, 100)
  dispose()
})

test('disposing before chip layout settles cancels the deferred scroll correction', async () => {
  const { window, document, mod, scroller, container, growHost } = stickyChipFixture()
  const dispose = mod.apply(stubContext().context)
  saveChipAnnotation(window, document)
  dispose()
  scroller.scrollTop = 100
  growHost()
  await wait(50)
  assert.equal(scroller.scrollTop, 100)
  assert.equal(container.style.paddingTop, '10px')
  assert.equal(document.querySelector('[data-annotation-chip]'), null)
})

test('single and cross-message selection always render the same sole three-action toolbar', async () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  select(window, 'user-line')
  const first = document.querySelector(`.${BAR_CLASS}`)
  const labels = [...first.querySelectorAll('button')].map(button => button.textContent)
  selectAcrossMessages(window)
  const second = document.querySelector(`.${BAR_CLASS}`)
  assert.equal(second, first, 'reuse one toolbar for both selection shapes')
  assert.deepEqual([...second.querySelectorAll('button')].map(button => button.textContent), labels)
  assert.equal(document.querySelectorAll(`.${BAR_CLASS}`).length, 1)
  assert.equal(document.getElementById(QUOTE_ID), null)
  await wait(350)
  assert.equal(document.getElementById(QUOTE_ID), null, 'no delayed fallback')
  assert.equal(document.documentElement.hasAttribute('data-dsh-selection-group-bar'), false, 'no hiding marker')
  dispose()
})

test('cross-message selection through copy and status controls shows one toolbar and quotes the full excerpt', () => {
  const { window, document, mod } = boot()
  insertConversationControls(document)
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  const text = selectAcrossMessages(window)
  assert.equal(document.querySelectorAll(`.${BAR_CLASS}`).length, 1)
  assert.equal(document.querySelector(`.${BAR_CLASS}`).querySelectorAll('button').length, 3)
  assert.equal(document.getElementById(QUOTE_ID), null)
  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  const payload = JSON.parse(inserted[0].ref)
  assert.equal(payload.text, text)
  assert.equal(payload.turn, null)
  assert.equal(payload.role, null)
  dispose()
})

test('selection starting or ending inside a conversation control is refused', () => {
  const { window, document, mod } = boot()
  insertConversationControls(document)
  const dispose = mod.apply(stubContext().context)
  for (const controlAtStart of [true, false]) {
    select(window, 'user-line')
    const range = document.createRange()
    range.setStart(document.getElementById(controlAtStart ? 'message-status' : 'user-line').firstChild, 0)
    const end = document.getElementById(controlAtStart ? 'assistant-line' : 'message-status').firstChild
    range.setEnd(end, end.textContent.length)
    const selection = window.getSelection()
    selection.removeAllRanges(); selection.addRange(range)
    document.dispatchEvent(new window.Event('selectionchange'))
    assert.equal(document.querySelector(`.${BAR_CLASS}`), null)
    assert.equal(window.__DSH_SELECTION_GROUP_SELECTION__.getSnapshot(), null)
  }
  dispose()
})

test('cross-message selection still refuses an intervening editor or input beside conversation controls', () => {
  for (const html of ['<div contenteditable="true">draft</div>', '<input value="draft">', '<textarea>draft</textarea>']) {
    const { window, document, mod } = boot()
    const controls = insertConversationControls(document)
    controls.insertAdjacentHTML('afterend', html)
    const dispose = mod.apply(stubContext().context)
    selectAcrossMessages(window)
    assert.equal(document.querySelector(`.${BAR_CLASS}`), null, html)
    assert.equal(window.__DSH_SELECTION_GROUP_SELECTION__.getSnapshot(), null, html)
    dispose()
  }
})

test('cross-message recovery across conversation controls restores its rect and original quote after rendering', () => {
  const { window, document, mod } = boot()
  insertConversationControls(document)
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  const text = selectAcrossMessages(window)
  window.Range.prototype.getBoundingClientRect = () => ({ ...RECT, top: 240, bottom: 260 })
  document.getElementById('assistant-line').replaceChildren(document.createTextNode('the assistant answer'))
  document.dispatchEvent(new window.Event('selectionchange'))
  const frame = window.__DSH_SELECTION_GROUP_SELECTION__.getSnapshot()
  assert.ok(frame.recovering)
  assert.equal(frame.rect.top, 240, 'recover the range through the same controls after rendering')
  assert.equal(document.querySelectorAll(`.${BAR_CLASS}`).length, 1)
  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  assert.equal(JSON.parse(inserted[0].ref).text, text)
  dispose()
})

test('a cross-message quote carries the complete excerpt without a false single-turn provenance', () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  const text = selectAcrossMessages(window)
  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  assert.equal(inserted.length, 1)
  const payload = JSON.parse(inserted[0].ref)
  assert.equal(payload.text, text)
  assert.equal(payload.turn, null)
  assert.equal(payload.role, null)
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null)
  assert.equal(document.getElementById(QUOTE_ID), null)
  dispose()
})

test('a cross-message annotation edits and saves the complete excerpt', () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  const text = selectAcrossMessages(window)
  document.querySelector(`.${BAR_CLASS} button`).click()
  assert.equal(document.querySelector('.dsh-ann-quote').title, text)
  const input = document.querySelector('.dsh-ann-input')
  input.value = 'cross-message note'; input.dispatchEvent(new window.Event('input'))
  document.querySelector('.dsh-ann-card .dsh-ann-action').click()
  const pending = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    .map(key => window.localStorage.getItem(key)).find(value => value.includes('cross-message note'))
  assert.ok(pending)
  assert.equal(JSON.parse(pending)[0].text, text)
  assert.equal(document.querySelector('.dsh-ann-card'), null)
  dispose()
})

test('a cross-message side chat places the complete excerpt in the new draft without sending', async () => {
  const { window, document, mod } = boot()
  const { context } = stubContext()
  const requests = stubFetch(window, { childId: 'cross-thread' })
  const dispose = mod.apply(context)
  const field = mountSideChatComposer(document)
  const text = selectAcrossMessages(window)
  document.querySelector(`[${ACTION_ATTR}="sidechat"]`).click()
  assert.ok(await waitFor(() => field.value === text))
  assert.equal(requests.length, 1)
  assert.equal(requests[0].body.question, '')
  dispose()
})

test('assistant markers outside the main transcript and embedded file/editor content are refused', () => {
  const { window, document, mod } = boot()
  const outside = document.createElement('div')
  outside.setAttribute('data-chat-flow-kind', 'assistant-step')
  outside.innerHTML = '<p id="outside-line">outside text</p>'
  document.body.appendChild(outside)
  document.getElementById('assistant-line').innerHTML = '<div data-textpreview-url="dsh-resource://file/session/session-test/file.txt"><div data-code-preview><pre id="embedded-file">file text</pre></div></div><div id="embedded-editor" contenteditable="true">draft text</div>'
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  for (const id of ['outside-line', 'embedded-file', 'embedded-editor']) {
    select(window, 'user-line')
    select(window, id)
    assert.equal(document.querySelector(`.${BAR_CLASS}`), null, id)
    assert.equal(window.__DSH_SELECTION_GROUP_SELECTION__.getSnapshot(), null, id)
    assert.equal(document.getElementById(QUOTE_ID), null)
  }
  assert.equal(inserted.length, 0)
  dispose()
})

test('cross-message selection intersecting an embedded file is refused even with valid endpoints', () => {
  const { window, document, mod } = boot()
  const file = document.createElement('div')
  file.setAttribute('data-textpreview-url', 'dsh-resource://file/session/session-test/file.txt')
  file.textContent = 'excluded file'
  document.getElementById('user-line').parentElement.after(file)
  const dispose = mod.apply(stubContext().context)
  selectAcrossMessages(window)
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null)
  assert.equal(window.__DSH_SELECTION_GROUP_SELECTION__.getSnapshot(), null)
  dispose()
})

test('repeated excerpts retain the selected message anchor across scroll', async () => {
  const { window, document, mod } = boot()
  document.getElementById('assistant-line').textContent = 'repeated excerpt'
  const row = document.createElement('div')
  row.setAttribute('data-chat-flow-kind', 'assistant-step'); row.setAttribute('data-chat-turn', '3')
  row.innerHTML = '<p id="second-line">repeated excerpt</p>'
  document.querySelector('[data-slot="conversation.session"]').appendChild(row)
  window.Range.prototype.getBoundingClientRect = function () {
    const node = this.startContainer.nodeType === 1 ? this.startContainer : this.startContainer.parentElement
    const top = node.closest('[data-chat-turn]')?.getAttribute('data-chat-turn') === '3' ? 400 : 100
    return { ...RECT, top, bottom: top + 20 }
  }
  const dispose = mod.apply(stubContext().context)
  select(window, 'assistant-line'); select(window, 'second-line')
  const bar = document.querySelector(`.${BAR_CLASS}`)
  assert.equal(bar.style.top, '428px')
  window.dispatchEvent(new window.Event('scroll')); await wait(50)
  assert.equal(bar.style.top, '428px')
  dispose()
})

test('an already-annotated button becomes available immediately for a different excerpt', () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  select(window, 'user-line'); document.querySelector(`.${BAR_CLASS} button`).click()
  document.querySelector('.dsh-ann-card .dsh-ann-action').click()
  select(window, 'user-line')
  assert.equal(document.querySelector(`.${BAR_CLASS} button`).disabled, true)
  select(window, 'assistant-line')
  const button = document.querySelector(`.${BAR_CLASS} button`)
  assert.equal(button.disabled, false)
  button.click()
  assert.equal(document.querySelector('.dsh-ann-quote').title, 'the assistant answer')
  dispose()
})

test('reselecting in the action turn immediately restores all three actions', () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  select(window, 'user-line'); document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  select(window, 'assistant-line')
  assert.equal(document.querySelector(`.${BAR_CLASS}`).querySelectorAll('button').length, 3)
  assert.equal(document.getElementById(QUOTE_ID), null)
  dispose()
})

test('explicit range removal or whitespace selection clears the old excerpt and prevents stale quoting', () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  select(window, 'user-line')
  window.getSelection().removeAllRanges(); document.dispatchEvent(new window.Event('selectionchange'))
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null)
  assert.equal(window.__DSH_SELECTION_GROUP_SELECTION__.getSnapshot(), null)
  assert.equal(window.__DSH_SELECTION_GROUP_QUOTE__.run(), false)
  assert.equal(inserted.length, 0)
  document.getElementById('assistant-line').textContent = '   '
  select(window, 'user-line'); select(window, 'assistant-line')
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null)
  dispose()
})

test('keyboard cancellation after a stream render clears recovery rather than reviving a stale excerpt', () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  select(window, 'user-line')
  document.getElementById('user-line').textContent = 'replacement'
  document.dispatchEvent(new window.Event('selectionchange'))
  assert.ok(window.__DSH_SELECTION_GROUP_SELECTION__.getSnapshot().recovering)
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
  document.dispatchEvent(new window.Event('selectionchange'))
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null)
  assert.equal(window.__DSH_SELECTION_GROUP_QUOTE__.run(), false)
  assert.equal(inserted.length, 0)
  dispose()
})

test('streamed text replacement preserves the original quote and its turn metadata', () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  select(window, 'assistant-line')
  document.getElementById('assistant-line').textContent = 'the assistant answer with streamed continuation'
  document.dispatchEvent(new window.Event('selectionchange'))
  assert.ok(window.__DSH_SELECTION_GROUP_SELECTION__.getSnapshot().recovering)
  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  const payload = JSON.parse(inserted[0].ref)
  assert.equal(payload.text, 'the assistant answer')
  assert.equal(payload.turn, 2)
  dispose()
})

test('cross-message streaming recovery still supports the sole toolbar and original quote', () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  const text = selectAcrossMessages(window)
  document.getElementById('assistant-line').textContent = 'the assistant answer continued'
  document.dispatchEvent(new window.Event('selectionchange'))
  assert.equal(document.querySelectorAll(`.${BAR_CLASS}`).length, 1)
  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  assert.equal(JSON.parse(inserted[0].ref).text, text)
  dispose()
})

test('streamed quote recovery also allows annotating the original excerpt', () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  select(window, 'assistant-line')
  document.getElementById('assistant-line').textContent = 're-rendered answer'
  document.dispatchEvent(new window.Event('selectionchange'))
  document.querySelector(`.${BAR_CLASS} button`).click()
  assert.equal(document.querySelector('.dsh-ann-quote').title, 'the assistant answer')
  dispose()
})

test('blur, pointer cancellation, lost capture and hidden visibility reset dragging and allow the next selection', () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  const target = document.getElementById('user-line')
  for (const type of ['blur', 'pointercancel', 'lostpointercapture', 'visibilitychange']) {
    target.dispatchEvent(new window.MouseEvent('pointerdown', { button: 0, bubbles: true }))
    select(window, 'user-line')
    assert.equal(window.__DSH_SELECTION_GROUP_IS_DRAGGING__(), true)
    if (type === 'visibilitychange') {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true })
      document.dispatchEvent(new window.Event(type))
      Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    } else window.dispatchEvent(new window.Event(type))
    assert.equal(window.__DSH_SELECTION_GROUP_IS_DRAGGING__(), false, type)
    assert.equal(document.querySelector(`.${BAR_CLASS}`), null)
    select(window, 'assistant-line')
    assert.equal(document.querySelectorAll(`.${BAR_CLASS}`).length, 1, type)
  }
  dispose()
})

test('right clicks, other pointer releases and clicks outside chat do not create a stale toolbar', () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  const target = document.getElementById('user-line')
  target.dispatchEvent(new window.MouseEvent('pointerdown', { button: 2, bubbles: true }))
  assert.equal(window.__DSH_SELECTION_GROUP_IS_DRAGGING__(), false)
  select(window, 'user-line')
  document.body.dispatchEvent(new window.MouseEvent('pointerdown', { button: 0, bubbles: true }))
  window.dispatchEvent(new window.MouseEvent('pointerup', { button: 0 }))
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null)
  const down = new window.Event('pointerdown', { bubbles: true }); Object.defineProperty(down, 'pointerId', { value: 7 })
  target.dispatchEvent(down); select(window, 'user-line')
  const wrong = new window.Event('pointerup'); Object.defineProperty(wrong, 'pointerId', { value: 8 })
  window.dispatchEvent(wrong)
  assert.equal(window.__DSH_SELECTION_GROUP_IS_DRAGGING__(), true)
  const up = new window.Event('pointerup'); Object.defineProperty(up, 'pointerId', { value: 7 })
  window.dispatchEvent(up)
  assert.equal(window.__DSH_SELECTION_GROUP_IS_DRAGGING__(), false)
  assert.equal(document.querySelectorAll(`.${BAR_CLASS}`).length, 1)
  dispose()
})

test('window blur preserves an unsaved annotation note while releasing drag state', () => {
  const { window, document, mod } = boot()
  const dispose = mod.apply(stubContext().context)
  select(window, 'user-line'); document.querySelector(`.${BAR_CLASS} button`).click()
  const input = document.querySelector('.dsh-ann-input')
  input.value = 'unsaved note'; input.dispatchEvent(new window.Event('input'))
  window.dispatchEvent(new window.Event('blur'))
  assert.equal(document.querySelector('.dsh-ann-input').value, 'unsaved note')
  assert.equal(window.__DSH_SELECTION_GROUP_IS_DRAGGING__(), false)
  dispose()
})

test('session change clears the selection snapshot before any stale quote action can run', () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const original = context.get
  let sessionId = 'session-test'
  context.get = name => name === 'uiSession' ? { adapter: { current: { getSnapshot: () => ({ key: sessionId }) } } } : original(name)
  const dispose = mod.apply(context)
  select(window, 'user-line')
  const action = window.__DSH_SELECTION_GROUP_ACTIONS__().find(action => action.id === 'quote')
  sessionId = 'other-session'
  assert.equal(window.__DSH_SELECTION_GROUP_QUOTE__.run(), false, 'the insertion API also refuses a stale session snapshot')
  action.run()
  assert.equal(inserted.length, 0)
  assert.equal(document.querySelector(`.${BAR_CLASS}`), null)
  dispose()
})

test('keyboard focus inside the toolbar preserves the excerpt for accessible quote activation', () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  select(window, 'user-line')
  const button = document.querySelector(`[${ACTION_ATTR}="quote"]`)
  button.focus()
  window.getSelection().removeAllRanges()
  document.dispatchEvent(new window.Event('selectionchange'))
  assert.equal(document.querySelectorAll(`.${BAR_CLASS}`).length, 1)
  button.click()
  assert.equal(inserted.length, 1)
  assert.equal(JSON.parse(inserted[0].ref).text, 'my own question')
  dispose()
})

test('an entire message-row replacement recovers the same turn rather than another identical message', async () => {
  const { window, document, mod } = boot()
  const oldRow = document.getElementById('assistant-line').parentElement
  const sameText = document.createElement('div')
  sameText.setAttribute('data-chat-turn', '3'); sameText.setAttribute('data-chat-flow-kind', 'assistant-step')
  sameText.innerHTML = '<p>the assistant answer</p>'
  oldRow.before(sameText)
  window.Range.prototype.getBoundingClientRect = function () {
    const node = this.startContainer.nodeType === 1 ? this.startContainer : this.startContainer.parentElement
    const top = node.closest('[data-chat-turn]')?.getAttribute('data-chat-turn') === '2' ? 400 : 100
    return { ...RECT, top, bottom: top + 20 }
  }
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  select(window, 'assistant-line')
  const replacement = oldRow.cloneNode(true)
  oldRow.replaceWith(replacement)
  document.dispatchEvent(new window.Event('selectionchange'))
  window.dispatchEvent(new window.Event('scroll')); await wait(40)
  assert.equal(document.querySelector(`.${BAR_CLASS}`).style.top, '428px')
  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  assert.equal(JSON.parse(inserted[0].ref).turn, 2)
  dispose()
})

test('side chat recovery after streaming places the original cross-message excerpt', async () => {
  const { window, document, mod } = boot()
  const { context } = stubContext()
  stubFetch(window, { childId: 'streamed-sidechat' })
  const dispose = mod.apply(context)
  const field = mountSideChatComposer(document)
  const text = selectAcrossMessages(window)
  document.getElementById('assistant-line').textContent = 'a streaming replacement'
  document.dispatchEvent(new window.Event('selectionchange'))
  document.querySelector(`[${ACTION_ATTR}="sidechat"]`).click()
  assert.ok(await waitFor(() => field.value === text))
  dispose()
})

test('a new pointer gesture after streaming clears the recovered snapshot before reselecting', () => {
  const { window, document, mod } = boot()
  const { context, inserted } = stubContext()
  const dispose = mod.apply(context)
  select(window, 'user-line')
  document.getElementById('user-line').textContent = 'changed by streaming'
  document.dispatchEvent(new window.Event('selectionchange'))
  document.getElementById('assistant-line').dispatchEvent(new window.MouseEvent('pointerdown', { button: 0, bubbles: true }))
  assert.equal(window.__DSH_SELECTION_GROUP_SELECTION__.getSnapshot(), null)
  select(window, 'assistant-line')
  window.dispatchEvent(new window.Event('pointerup'))
  document.querySelector(`[${ACTION_ATTR}="quote"]`).click()
  assert.equal(inserted.length, 1)
  assert.equal(JSON.parse(inserted[0].ref).text, 'the assistant answer')
  dispose()
})
