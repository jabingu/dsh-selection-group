/**
 * dsh-selection-group — merge integrity.
 *
 * The whole point of this package is that it *is* the two plugins merged, with
 * no dependency on either. These assertions keep that honest:
 *
 *   - the vendored files still match the sha256 pinned in vendor/manifest.json,
 *   - their licences travel with them,
 *   - the built `client.js` carries every emitted byte of both plugins verbatim
 *     (so a reviewer can diff the merge against the upstream files),
 *   - the build is deterministic and `client.js` is up to date.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(join(root, relative), 'utf8')
const sha256 = (text) => createHash('sha256').update(text).digest('hex')

const vendors = JSON.parse(read('vendor/manifest.json'))
const client = read('client.js')

/** Fork deviations declared under patches/, keyed by vendored package name. */
const patches = (() => {
  const byPackage = {}
  for (const file of readdirSync(join(root, 'patches')).filter((name) => name.endsWith('.json'))) {
    const spec = JSON.parse(read(join('patches', file)))
    byPackage[spec.package] = spec
  }
  return byPackage
})()

/** The same application the build performs. */
function applyPatches(source, spec) {
  if (spec === undefined) return { text: source, applied: [] }
  let text = source
  const applied = []
  for (const edit of spec.edits) {
    assert.equal(text.split(edit.find).length - 1, 1, `patch ${edit.id} must match exactly once in the vendored file`)
    text = text.replace(edit.find, edit.replace)
    applied.push(edit.id)
  }
  return { text, applied }
}

/** Same extraction the build performs. */
function extractFactoryBody(source, label) {
  const factoryAt = source.indexOf('factory:')
  const arrowAt = source.indexOf('=>', factoryAt)
  const openAt = source.indexOf('{', arrowAt)
  const body = source.slice(openAt + 1)
  const returnAt = body.indexOf('return module.exports')
  const closeAt = body.indexOf('}', returnAt + 'return module.exports'.length)
  assert.ok(factoryAt >= 0 && arrowAt >= 0 && openAt >= 0 && returnAt >= 0 && closeAt >= 0, `${label}: wrapper shape changed`)
  return body.slice(0, closeAt).trim()
}

test('both vendored clients are present, MIT-licensed and hash-pinned', () => {
  const names = Object.keys(vendors)
  assert.equal(names.length, 2, 'exactly two plugins are vendored')
  for (const name of names) {
    const meta = vendors[name]
    const source = read(join('vendor', meta.file))
    assert.equal(sha256(source), meta.sha256, `${name}: vendored file changed — update vendor/manifest.json deliberately`)
    assert.equal(meta.license, 'MIT', `${name} must be MIT to vendor it`)
    assert.match(meta.version, /^\d+\.\d+\.\d+/)
    const licensePath = join(root, 'vendor', meta.licenseFile)
    assert.ok(existsSync(licensePath), `${name}: licence text must ship next to the vendored file`)
    const license = readFileSync(licensePath, 'utf8')
    assert.match(license, /MIT License/)
    assert.ok(license.includes(meta.copyright), `${name}: licence must keep the upstream copyright line`)
  }
})

test('the built bundle carries both plugins, with only the declared deviations applied', () => {
  for (const [name, meta] of Object.entries(vendors)) {
    const raw = read(join('vendor', meta.file))
    const { text, applied } = applyPatches(raw, patches[name])
    const body = extractFactoryBody(text, name)
    assert.ok(client.includes(body), `${name}: the inlined body differs from vendor + patches/`)
    assert.ok(client.includes(`//#region vendored: ${name} v${meta.version} (MIT`), `${name}: the vendored region header is missing`)
    if (applied.length > 0)
      assert.ok(client.includes(`Fork deviations applied at build time: ${applied.join(', ')}`), `${name}: the deviation note is missing`)
  }
  assert.equal(client.match(/window\.__ModuleLoader__\.load\(/g)?.length, 1, 'the bundle must register exactly one module')
  assert.ok(!/require\(\s*["']/.test(client), 'the bundle must not require any external module')
})

test('every declared deviation is anchored, explained, and actually shipped', () => {
  assert.ok(Object.keys(patches).length > 0, 'this project deliberately deviates from upstream; patches/ must not be empty')
  for (const [name, spec] of Object.entries(patches)) {
    const raw = read(join('vendor', vendors[name].file))
    assert.ok(spec.summary && spec.summary.length > 20, `${name}: patches/ must summarise the deviation`)
    for (const edit of spec.edits) {
      assert.equal(raw.split(edit.find).length - 1, 1, `${name}/${edit.id}: the anchor no longer matches the vendored file once — review patches/`)
      assert.equal(raw.includes(edit.replace), false, `${name}/${edit.id}: the replacement is already upstream; drop the patch`)
      assert.ok(typeof edit.why === 'string' && edit.why.length > 30, `${name}/${edit.id}: every deviation must say why`)
      assert.ok(client.includes(edit.replace), `${name}/${edit.id}: the deviation did not reach client.js`)
      assert.ok(!client.includes(edit.find), `${name}/${edit.id}: the upstream code is still present in client.js`)
    }
  }
})

test('no upstream package is referenced at runtime', () => {
  // The merge exists so that neither package has to be installed: no import,
  // no lookup and no dependency on their ids may remain.
  const face = client.slice(client.indexOf('//#region plugin face'))
  assert.ok(!/@changfenhuang\/dsh-annotation["']/.test(face), 'the annotation package must not be referenced')
  assert.ok(!/require\(\s*["']dsh-quote-followup/.test(client), 'the quote package must not be required')
  const manifest = JSON.parse(read('package.json'))
  assert.deepEqual(manifest.dependencies, undefined, 'the merged bundle must declare no runtime dependencies')
  assert.deepEqual(manifest.peerDependencies, undefined, 'the merged bundle must declare no peer dependencies')
})

test('client.js is deterministic and up to date with vendor/ + src/', () => {
  const before = sha256(client)
  execFileSync(process.execPath, [join(root, 'scripts', 'build.mjs')], { cwd: root, stdio: 'pipe' })
  const after = sha256(read('client.js'))
  assert.equal(after, before, 'client.js is stale or hand-edited — run `node scripts/build.mjs`')
})

test('the vendored quote plugin still registers the state symbol the swap retires', () => {
  // The hot-swap fix retires a predecessor's registered state by symbol before
  // applying the plugin again. If upstream renames it, the swap silently breaks
  // (引用 dead until restart), so pin the name here.
  const vendored = read(join('vendor', 'dsh-quote-followup.client.js'))
  const built = read(join('client.js'))
  const symbol = 'Symbol.for("dsh-quote-followup.state")'
  assert.ok(vendored.includes(symbol), 'the vendored plugin must still register this symbol')
  assert.ok(built.includes(symbol), 'and the built bundle must still retire it before the successor applies')
})
