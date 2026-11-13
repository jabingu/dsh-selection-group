import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import React from 'react'

const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const KEY = 'dsh-selection-group.settings.v1'
const NATIVE_SLOT = 'conversation.chat.text-interaction'
const CONFIG_SLOT = 'plugins.bundle.config'
const PACKAGE = 'dsh-selection-group'
const cleanups = []
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup() })

// Implements the public keyed-seat contract: lower priority shadows the same key,
// while other keys and their registration lifetimes remain independent.
class Slots {
  ready = new Set([CONFIG_SLOT, NATIVE_SLOT])
  callbacks = new Set()
  entries = new Set()
  listeners = new Set()
  failNative = false
  emit() { for (const callback of [...this.listeners]) callback() }
  register(options, component) {
    if (this.failNative && options.name === NATIVE_SLOT) throw Error('registration failed')
    const entry = { options, component }
    this.entries.add(entry); this.emit()
    let active = true
    return () => { if (!active) return; active = false; this.entries.delete(entry); this.emit() }
  }
  inject(name, callback) {
    const binding = { name, callback, stop: null }
    this.callbacks.add(binding)
    if (this.ready.has(name)) binding.stop = callback()
    return () => { this.callbacks.delete(binding); binding.stop?.() }
  }
  mount(name) {
    this.ready.add(name)
    for (const binding of [...this.callbacks]) if (binding.name === name) binding.stop = binding.callback()
  }
  renderer(name, key) {
    return [...this.entries].filter(entry => entry.options.name === name && entry.options.key === key)
      .sort((a, b) => (a.options.priority ?? 0) - (b.options.priority ?? 0))[0]?.component
  }
}

function setup({ stored, late = false, legacy = false } = {}) {
  const { window } = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true })
  cleanups.push(() => window.close())
  if (stored !== undefined) window.localStorage.setItem(KEY, stored)
  const slots = new Slots()
  if (late) slots.ready.delete(NATIVE_SLOT)
  const native = () => 'native quote'
  const translation = () => 'translate'
  slots.register({ name: NATIVE_SLOT, key: 'quote' }, native)
  slots.register({ name: NATIVE_SLOT, key: 'translate' }, translation)
  let lang = 'zh'; const localeListeners = new Set()
  const context = {
    slots: legacy ? undefined : slots,
    get: () => null,
    locale: { getSnapshot: () => ({ active: lang }), subscribe: callback => { localeListeners.add(callback); return () => localeListeners.delete(callback) } },
  }
  function Switch({ checked, label, disabled, onChange, ...props }) {
    return React.createElement('button', { ...props, type: 'button', role: 'switch', 'aria-label': label,
      'aria-checked': checked, disabled, onClick: () => onChange(!checked) }, checked ? 'On' : 'Off')
  }
  let mod
  window.__ModuleLoader__ = { load: registration => { mod = registration.factory(name => {
    if (name === 'react') return React
    if (name === '@deepseek-ai/dsh-client-ui-primitives') return { Switch }
    throw Error('unexpected module: ' + name)
  }) } }
  window.eval(client)
  const api = mod.__settings(context)
  cleanups.push(() => api.dispose())
  return { window, document: window.document, context, slots, native, translation, api,
    setLanguage(value) { lang = value; for (const callback of localeListeners) callback() } }
}

test('native quote is hidden by default and other interaction keys remain available', () => {
  const { api, slots, translation, window } = setup()
  assert.equal(api.getSnapshot().disableNativeQuote, true)
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote')(), null)
  assert.equal(slots.renderer(NATIVE_SLOT, 'translate'), translation)
  assert.equal(window.localStorage.getItem(KEY), null)
})

test('turning off suppression restores the native renderer and persists across plugin mounts', () => {
  const { api, slots, native, translation, window, context } = setup()
  assert.equal(api.setDisableNativeQuote(false), true)
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote'), native)
  assert.equal(slots.renderer(NATIVE_SLOT, 'translate'), translation)
  assert.equal(JSON.parse(window.localStorage.getItem(KEY)).disableNativeQuote, false)
  api.dispose()
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote'), native)
  let mod
  window.__ModuleLoader__.load = registration => { mod = registration.factory(() => { throw Error('UI modules must remain lazy') }) }
  window.eval(client)
  const next = mod.__settings(context); cleanups.push(() => next.dispose())
  assert.equal(next.getSnapshot().disableNativeQuote, false)
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote'), native)
})

test('switching off and repeated disposal restore native quoting without duplicate registrations', () => {
  const { api, slots, native } = setup()
  for (let i = 0; i < 3; i++) {
    api.setDisableNativeQuote(true); api.setDisableNativeQuote(true)
    assert.equal([...slots.entries].filter(entry => entry.options.name === NATIVE_SLOT).length, 3)
    api.setDisableNativeQuote(false)
    assert.equal(slots.renderer(NATIVE_SLOT, 'quote'), native)
  }
  api.dispose(); api.dispose()
  assert.equal(slots.callbacks.size, 0)
  assert.equal(slots.renderer(CONFIG_SLOT, PACKAGE), undefined)
  assert.equal(api.setDisableNativeQuote(true), false)
})

test('default suppression applies when the host registers its text interaction slot later', () => {
  const { api, slots } = setup({ late: true })
  assert.equal(api.getSnapshot().disableNativeQuote, true)
  assert.equal(api.getSnapshot().active, false)
  slots.mount(NATIVE_SLOT)
  assert.equal(api.getSnapshot().active, true)
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote')(), null)
})

test('disposal before a late native slot appears never suppresses the successor host UI', () => {
  const { api, slots, native } = setup({ stored: JSON.stringify({ disableNativeQuote: true }), late: true })
  api.dispose(); slots.mount(NATIVE_SLOT)
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote'), native)
})

test('a late host registration failure is reported without an uncaught callback error', () => {
  const { api, slots, native } = setup({ stored: JSON.stringify({ disableNativeQuote: true }), late: true })
  slots.failNative = true
  assert.doesNotThrow(() => slots.mount(NATIVE_SLOT))
  assert.equal(api.getSnapshot().error, 'applyError')
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote'), native)
  assert.equal(api.setDisableNativeQuote(false), true)
  slots.failNative = false
  assert.equal(api.setDisableNativeQuote(true), true)
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote')(), null)
})

test('a storage failure retains the previous switch state and native UI, and can be retried', () => {
  const { api, slots, native, window } = setup({ stored: JSON.stringify({ disableNativeQuote: false }) })
  const original = window.Storage.prototype.setItem
  window.Storage.prototype.setItem = () => { throw Error('quota exceeded') }
  assert.equal(api.setDisableNativeQuote(true), false)
  assert.equal(api.getSnapshot().error, 'saveError')
  assert.equal(api.getSnapshot().disableNativeQuote, false)
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote'), native)
  window.Storage.prototype.setItem = original
  assert.equal(api.setDisableNativeQuote(true), true)
  assert.equal(api.getSnapshot().error, null)
  window.Storage.prototype.setItem = () => { throw Error('quota exceeded') }
  assert.equal(api.setDisableNativeQuote(false), false)
  assert.equal(api.getSnapshot().disableNativeQuote, true)
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote')(), null)
  window.Storage.prototype.setItem = original
})

test('a host registration failure rolls back the saved preference and can be retried', () => {
  const stored = JSON.stringify({ disableNativeQuote: false })
  const { api, slots, native, window } = setup({ stored })
  slots.failNative = true
  assert.equal(api.setDisableNativeQuote(true), false)
  assert.equal(api.getSnapshot().error, 'applyError')
  assert.equal(api.getSnapshot().disableNativeQuote, false)
  assert.equal(window.localStorage.getItem(KEY), stored)
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote'), native)
  slots.failNative = false
  assert.equal(api.setDisableNativeQuote(true), true)
})

test('malformed settings remain safe and are replaced by a successful user save', () => {
  const { api, slots, native, window } = setup({ stored: '{broken' })
  assert.equal(api.getSnapshot().error, 'readError')
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote'), native)
  assert.equal(api.setDisableNativeQuote(true), true)
  assert.equal(JSON.parse(window.localStorage.getItem(KEY)).disableNativeQuote, true)
})

test('cross-window preference changes preserve explicit choices and clearing storage restores the default', () => {
  const { api, slots, native, window } = setup()
  window.localStorage.setItem(KEY, JSON.stringify({ disableNativeQuote: false, futureSetting: 42 }))
  window.dispatchEvent(new window.StorageEvent('storage', { key: KEY }))
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote'), native)
  api.setDisableNativeQuote(true)
  assert.equal(JSON.parse(window.localStorage.getItem(KEY)).futureSetting, 42)
  api.setDisableNativeQuote(false)
  window.localStorage.removeItem(KEY)
  window.dispatchEvent(new window.StorageEvent('storage', { key: null }))
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote')(), null)
})

test('older hosts without slots retain the toolbar behavior and never acquire an override', () => {
  const { api, slots, native } = setup({ legacy: true })
  assert.equal(api.getSnapshot().supported, false)
  assert.equal(api.setDisableNativeQuote(true), false)
  assert.equal(slots.renderer(NATIVE_SLOT, 'quote'), native)
})

async function mountPanel(fixture, packageName = PACKAGE) {
  const { window, document, slots } = fixture
  const descriptors = Object.fromEntries(['window', 'document', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const [key, value] of Object.entries({ window, document, navigator: window.navigator }))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  const { createRoot } = await import('react-dom/client')
  const { flushSync } = await import('react-dom')
  const host = document.createElement('div'); document.body.appendChild(host)
  const root = createRoot(host)
  cleanups.push(() => {
    try { flushSync(() => root.unmount()) }
    finally { for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]
    } }
  })
  const Panel = slots.renderer(CONFIG_SLOT, packageName)
  flushSync(() => root.render(Panel ? React.createElement(Panel, { view: 'page' }) : null))
  return { host, flushSync }
}

test('the real React detail panel toggles native quoting with an accessible saved state', async () => {
  const fixture = setup()
  const { host, flushSync } = await mountPanel(fixture)
  const toggle = host.querySelector('[role="switch"]')
  assert.equal(toggle.getAttribute('aria-label'), '关闭 DSH 自带引用')
  assert.equal(toggle.getAttribute('aria-checked'), 'true')
  assert.ok(fixture.document.getElementById(toggle.closest('[role="group"]').getAttribute('aria-describedby')))
  assert.match(toggle.title, /引用文本/)
  flushSync(() => toggle.click())
  assert.equal(toggle.getAttribute('aria-checked'), 'false')
  assert.match(host.querySelector('[role="status"]').textContent, /设置已保存/)
  assert.equal(fixture.slots.renderer(NATIVE_SLOT, 'quote'), fixture.native)
  flushSync(() => toggle.click())
  assert.equal(toggle.getAttribute('aria-checked'), 'true')
  assert.match(host.querySelector('[role="status"]').textContent, /已关闭/)
  assert.equal(fixture.slots.renderer(NATIVE_SLOT, 'quote')(), null)
})

test('the detail panel uses the current locale and reports a failed save without flipping the switch', async () => {
  const fixture = setup()
  const { host, flushSync } = await mountPanel(fixture)
  flushSync(() => fixture.setLanguage('en'))
  const toggle = host.querySelector('[role="switch"]')
  assert.equal(toggle.getAttribute('aria-label'), 'Disable DSH built-in quote')
  fixture.window.Storage.prototype.setItem = () => { throw Error('read-only storage') }
  flushSync(() => toggle.click())
  assert.equal(toggle.getAttribute('aria-checked'), 'true')
  assert.match(host.querySelector('[role="alert"]').textContent, /could not be saved/)
})

test('quote settings register once under the Selection Toolbar bundle configuration key', async () => {
  const fixture = setup()
  assert.equal(typeof fixture.slots.renderer(CONFIG_SLOT, PACKAGE), 'function')
  assert.equal([...fixture.slots.entries].filter(entry => entry.options.name.startsWith('plugins.')).length, 1)
  const { host } = await mountPanel(fixture, 'another-plugin')
  assert.equal(host.textContent, '')
})
