/**
 * dsh-selection-group — package-shape guard.
 *
 * DSH mounts a client bundle from filesystem facts, so a typo here fails only
 * when the app boots. These assertions mirror what the loader reads:
 * `exports["./client"]`, `dsh.bundle.patch`, `dsh.client.platform`, `main`, the
 * module id the client bundle registers under (which must be the package name,
 * because the shell imports `<name>/client`), and the display metadata the
 * plugins panel renders (`locale/*.json` + a manifest-relative `icon`).
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join, relative, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const clientSource = readFileSync(join(root, 'client.js'), 'utf8')
/** The loader's own language-id grammar for `locale/<id>.json`. */
const LANGUAGE_ID = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/
const ICON_MEDIA_TYPES = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp'])
const MAX_ICON_BYTES = 256 * 1024

test('the client half is declared the way the shell resolves it', () => {
  assert.equal(manifest.name, 'dsh-selection-group')
  assert.equal(typeof manifest.exports?.['./client'], 'string', 'exports["./client"] must be a string')
  const clientPath = join(root, manifest.exports['./client'])
  assert.ok(existsSync(clientPath), `exports["./client"] must exist: ${clientPath}`)

  assert.equal(manifest.dsh?.client?.platform, 'web')
  // The merged bundle injects the union of both vendored plugins' services.
  assert.deepEqual(manifest.dsh.client.inject, undefined, 'the inject list belongs to the bundle, not the manifest')
  for (const service of ['sessions', 'conversation', 'locale', 'uiSession', 'inputTriggers'])
    assert.match(clientSource, new RegExp(`"${service}"`), `the bundle must inject ${service}`)
})

test('the host half and the bundle patch are wired to the same package', () => {
  const mainPath = join(root, manifest.main)
  assert.ok(existsSync(mainPath), `main must exist: ${mainPath}`)

  const patchPath = join(root, manifest.dsh?.bundle?.patch)
  assert.ok(existsSync(patchPath), `dsh.bundle.patch must exist: ${patchPath}`)
  const patch = readFileSync(patchPath, 'utf8')
  assert.match(patch, new RegExp(`name:\\s*${manifest.name}\\b`), 'the patch must insert this package')
  assert.match(patch, /- insert:/, 'the patch must be an insert list')
})

test('the client bundle registers under the package name', () => {
  assert.match(clientSource, /window\.__ModuleLoader__\.load\(\{/, 'client.js must register a module')
  assert.match(clientSource, new RegExp(`id:\\s*"${manifest.name}"`), 'the module id must be the package name')
  assert.match(clientSource, /exports\.apply\s*=\s*apply/, 'client.js must export apply')
  assert.ok(!/^\s*import\s/m.test(clientSource), 'the client bundle must not import anything (client bundles are self-contained)')
})

test('the plugins panel shows an English name with a Chinese description', () => {
  // The loader reads `<pkg>/locale/en.json` as the anchor and every sibling
  // language file through the ESM resolver, so the subpath must be exported.
  assert.equal(manifest.exports?.['./locale/*.json'], './locale/*.json', 'locale files are unreachable without this export')
  const localeDir = join(root, 'locale')
  assert.ok(existsSync(join(localeDir, 'en.json')), 'locale/en.json is the anchor the loader requires')

  const dictionaries = {}
  for (const file of readdirSync(localeDir)) {
    const language = file.replace(/\.json$/, '')
    assert.ok(LANGUAGE_ID.test(language), `locale file "${file}" must be named after a language id`)
    const parsed = JSON.parse(readFileSync(join(localeDir, file), 'utf8'))
    assert.equal(typeof parsed.meta, 'object', `${file}: display text lives under "meta"`)
    for (const field of ['title', 'description']) {
      assert.equal(typeof parsed.meta[field], 'string', `${file}: meta.${field} must be a string`)
      assert.ok(parsed.meta[field].trim().length > 0, `${file}: meta.${field} must not be empty`)
    }
    dictionaries[language] = parsed.meta
  }
  assert.ok(dictionaries.zh !== undefined, 'a Chinese dictionary must exist')
  // The NAME is deliberately English in every language; only the description is
  // localized. So the dictionaries must agree on the title and differ on the text.
  assert.equal(dictionaries.zh.title, dictionaries.en.title, 'the name must not be translated')
  assert.ok(!/[\u4e00-\u9fff]/u.test(dictionaries.zh.title), 'the name must be English')
  assert.notEqual(dictionaries.zh.description, dictionaries.en.description, 'the description is localized')
  assert.match(dictionaries.zh.description, /[\u4e00-\u9fff]/u, 'the Chinese description must be Chinese')
  // package.json description is the English fallback, so it must stay English.
  assert.ok(!/[\u4e00-\u9fff]/u.test(manifest.description), 'manifest.description is the English fallback')
})

test('the icon is a small manifest-relative image', () => {
  const icon = manifest.icon
  assert.equal(typeof icon, 'string', 'a top-level icon declaration is what the loader reads')
  assert.ok(!icon.startsWith('/') && !/^[A-Za-z][A-Za-z\d+.-]*:/u.test(icon), 'the icon must be a relative path')
  const file = resolve(root, icon)
  assert.ok(relative(root, file) !== '..' && !relative(root, file).startsWith('..'), 'the icon must stay inside the package')
  assert.ok(existsSync(file), `icon file must exist: ${icon}`)
  const extension = extname(file).toLowerCase()
  assert.ok(ICON_MEDIA_TYPES.has(extension), `icon must be SVG, PNG, JPEG or WebP, got ${extension}`)
  assert.ok(statSync(file).size <= MAX_ICON_BYTES, 'the icon must stay under 256 KiB')
})
