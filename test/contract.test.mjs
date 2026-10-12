/**
 * dsh-selection-group — vendored DOM contract guard.
 *
 * The glue and the build-time patches treat a handful of strings from the two
 * vendored plugins as a read-only contract: element ids/classes, the way each
 * plugin hides its own UI, and the render site the extra action is patched into.
 * Because the vendored files are hash-pinned, drift can only come from
 * deliberately updating `vendor/` — and this test names what would need
 * attention.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(join(root, relative), 'utf8')

test('the vendored quote plugin still exposes the button id and its own show/hide', () => {
  const source = read('vendor/dsh-quote-followup.client.js')
  assert.match(source, /BUTTON_ID\s*=\s*"dsh-quote-followup-btn"/, 'the singleton button id moved')
  assert.match(source, /getElementById\(BUTTON_ID\)/, 'the button is no longer looked up by id')
  assert.match(source, /style\.display\s*=\s*"none"/, 'hiding is no longer done through style.display')
  assert.match(source, /style\.display\s*=\s*"inline-flex"/, 'showing is no longer done through style.display')
})

test('the vendored annotation plugin still renders its bar through ghostButton', () => {
  const source = read('vendor/dsh-annotation.client.js')
  assert.match(source, /setAttribute\('data-annotation-for-dsh'/, 'the host attribute moved')
  assert.match(source, /className = 'dsh-ann-bar'/, 'the toolbar class moved')
  assert.match(source, /function ghostButton\(icon, label, title, disabled, onClick\)/, 'the button factory the patch hooks changed shape')
  assert.match(source, /bar\.appendChild\(ghostButton\(/, 'the actions-bar render site moved')
  assert.match(source, /host\.contains\(e\.target\)/, 'the own-UI pointer guard changed shape')
})

test('the glue only ever hides the standalone button — it never moves DOM', () => {
  const glue = read('src/toolbar.js')
  // The architectural invariant: one hover box, no reparenting.
  assert.ok(!glue.includes('insertBefore'), 'the glue must not reorder plugin nodes')
  assert.ok(!glue.includes('appendChild(quote'), 'the glue must not adopt the plugin button')
  assert.match(glue, /ACTIONS_KEY = "__DSH_SELECTION_GROUP_ACTIONS__"/, 'the action hook the patch reads')
  assert.match(glue, /QUOTE_BUTTON_ID = "dsh-quote-followup-btn"/)
  assert.match(glue, /HIDE_ATTR = "data-dsh-selection-group-bar"/)
  assert.match(glue, /data-dsh-selection-group-action/, 'the attribute the patched button carries')
})

test('every constant the glue references is declared in the glue', () => {
  // A browser bundle has no build-time symbol check: a constant that survives a
  // refactor only as a reference is a ReferenceError at the moment the person
  // presses the button, on their machine (measured — SIDECHAT_DRAFT_POLL_MS).
  // Declarations and uses are both lexically visible here, so the drift is
  // catchable before the bundle ships. Only this file is scanned: the generated
  // bundle also inlines both vendored plugins verbatim, whose own globals are not
  // ours to declare.
  const glue = read('src/toolbar.js')
  const used = new Set(glue.match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g) ?? [])
  const declared = new Set(
    [...glue.matchAll(/\b(?:const|let|var|function)\s+([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g)].map((match) => match[1]),
  )
  // Two exemptions, both named rather than pattern-widened:
  //   - GROUP_VERSION is mentioned in the module doc as "the build substitutes
  //     this"; the real identifiers are CLIENT_VERSION and MARKER_ATTR.
  //   - Number.POSITIVE_INFINITY is a language built-in that happens to match the
  //     naming pattern (the bounded-distance search uses it as "no candidate yet").
  const notGlueConstants = new Set(['GROUP_VERSION', 'POSITIVE_INFINITY'])
  const undeclared = [...used].filter((name) => !declared.has(name) && !notGlueConstants.has(name))
  assert.deepEqual(undeclared, [], `the glue references constants it never declares: ${undeclared.join(', ')}`)
})
