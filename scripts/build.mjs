/**
 * Build `client.js`: a self-contained bundle that inlines both vendored plugins
 * verbatim plus the selection-toolbar glue.
 *
 * Inputs
 *   vendor/manifest.json                 pinned versions + sha256 of the vendored files
 *   vendor/dsh-quote-followup.client.js  dsh-quote-followup browser half (MIT)
 *   vendor/dsh-annotation.client.js      @changfenhuang/dsh-annotation browser half (MIT)
 *   src/toolbar.js                       selection-toolbar glue (this project)
 *
 * Output
 *   client.js                            generated; never edit by hand
 *
 * The vendored files are the *actual published files*: their
 * `window.__ModuleLoader__.load({ id, factory })` wrapper is stripped and the
 * factory body is inlined, so the merge is auditable — `test/vendor.test.mjs`
 * asserts every emitted byte of each body matches the vendored file.
 */

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(join(root, relative), 'utf8')

const packageManifest = JSON.parse(read('package.json'))
const vendors = JSON.parse(read('vendor/manifest.json'))
const glueSource = read('src/toolbar.js')

/** Fork deviations, keyed by vendored package name (see patches/*.json). */
const patches = (() => {
  const dir = join(root, 'patches')
  if (!existsSync(dir)) return {}
  const byPackage = {}
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.json'))) {
    const spec = JSON.parse(read(join('patches', file)))
    byPackage[spec.package] = spec
  }
  return byPackage
})()

/**
 * Apply one package's declared deviations to its vendored source.
 * Every `find` must match exactly once: a vendor bump that moves the code fails
 * the build instead of silently shipping an unpatched or double-patched file.
 */
function applyPatches(source, spec, label) {
  if (spec === undefined) return { text: source, applied: [] }
  let text = source
  const applied = []
  for (const edit of spec.edits) {
    const occurrences = text.split(edit.find).length - 1
    if (occurrences !== 1)
      throw new Error(`${label}: patch "${edit.id}" matched ${occurrences} times in the vendored file (expected exactly 1) — the upstream file changed; review patches/`)
    text = text.replace(edit.find, edit.replace)
    applied.push(edit.id)
  }
  return { text, applied }
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex')

/** The vendored plugins, in the order they mount. */
const PLAN = [
  { name: '@changfenhuang/dsh-annotation', variable: 'vendoredAnnotation', note: '批注' },
  { name: 'dsh-quote-followup', variable: 'vendoredQuote', note: '引用' }
]

/**
 * Take the factory body out of a `window.__ModuleLoader__.load({...})` file.
 * @param source - the vendored client file.
 * @param label - package name, for error messages.
 * @returns the body, from its first statement through `return module.exports`.
 */
function extractFactoryBody(source, label) {
  const factoryAt = source.indexOf('factory:')
  if (factoryAt < 0) throw new Error(`${label}: no factory marker in the vendored client`)
  const arrowAt = source.indexOf('=>', factoryAt)
  const openAt = source.indexOf('{', arrowAt)
  if (arrowAt < 0 || openAt < 0) throw new Error(`${label}: malformed factory wrapper`)
  const body = source.slice(openAt + 1)
  const returnAt = body.indexOf('return module.exports')
  if (returnAt < 0) throw new Error(`${label}: no \`return module.exports\` in the vendored client`)
  const closeAt = body.indexOf('}', returnAt + 'return module.exports'.length)
  if (closeAt < 0) throw new Error(`${label}: unbalanced factory wrapper`)
  const extracted = body.slice(0, closeAt).trim()
  // Parse-only check: a vendored body that no longer compiles must fail the build.
  new Function('require', extracted)
  return extracted
}

const indented = (text, depth) => text
  .split('\n')
  .map((line) => (line.trim() === '' ? '' : `${'\t'.repeat(depth)}${line}`))
  .join('\n')

//#region integrity + extraction
const extracted = PLAN.map((plan) => {
  const meta = vendors[plan.name]
  if (meta === undefined) throw new Error(`vendor/manifest.json has no entry for ${plan.name}`)
  const source = read(join('vendor', meta.file))
  const actual = sha256(source)
  if (actual !== meta.sha256)
    throw new Error(`vendor/${meta.file} does not match the pinned sha256 (expected ${meta.sha256}, got ${actual})`)
  const patched = applyPatches(source, patches[plan.name], plan.name)
  return { ...plan, meta, body: extractFactoryBody(patched.text, plan.name), applied: patched.applied }
})
//#endregion

const glue = glueSource.replaceAll('__VERSION__', packageManifest.version)

const blocks = extracted.map(({ name, variable, meta, body, applied }) => [
  `\t\t//#region vendored: ${name} v${meta.version} (${meta.license}, ${meta.copyright})`,
  `\t\t// Inlined verbatim from ${meta.repository.replace(/^git\+/, '').replace(/\.git$/, '')} — see THIRD_PARTY_NOTICES.md.`,
  applied.length > 0
    ? `\t\t// Fork deviations applied at build time: ${applied.join(', ')} (see patches/).`
    : '\t\t// No deviation from the published file.',
  `\t\t// Body kept at column 0 so it stays byte-identical to the vendored file up to those deviations (asserted by test/vendor.test.mjs).`,
  `\t\tconst ${variable} = ((require) => {`,
  body,
  '\t\t})(require);',
  '\t\t//#endregion'
].join('\n'))

const banner = `/**
 * dsh-selection-group — one self-contained selection toolbar for the DSH Web GUI.
 *
 * GENERATED FILE — do not edit. \`node scripts/build.mjs\` rebuilds it from:
${extracted.map(({ name, meta }) => ` *   - ${name} v${meta.version} (inlined ${meta.license})`).join('\n')}
 *   - src/toolbar.js (this project's selection-toolbar glue)
 *
 * Both plugins' browser halves are inlined byte-for-byte, so this bundle works
 * with NEITHER package installed: it is the merge, not an adapter. The grouping
 * layer adopts the two floating toolbars into one pill and never adopts anything
 * it cannot place. See THIRD_PARTY_NOTICES.md for the upstream licences.
 *
 * @module dsh-selection-group/client
 */`

const client = `${banner}
window.__ModuleLoader__.load({
\tid: ${JSON.stringify(packageManifest.name)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

${blocks.join('\n\n')}

\t\t//#region selection-toolbar glue (src/toolbar.js)
${indented(glue, 2)}
\t\t//#endregion

\t\t//#region plugin face
\t\tconst VENDORED_PLUGINS = [
\t\t\t{ key: "annotation", plugin: vendoredAnnotation },
\t\t\t{ key: "quote", plugin: vendoredQuote }
\t\t];

\t\t/** Which services the real client context carries, and what each mount returned. */
\t\tfunction describeContext(ctx) {
\t\t\tconst shape = {
\t\t\t\tsessions: typeof (ctx === null || ctx === undefined ? undefined : ctx.sessions),
\t\t\t\tconversation: typeof (ctx === null || ctx === undefined ? undefined : ctx.conversation),
\t\t\t\tlocale: typeof (ctx === null || ctx === undefined ? undefined : ctx.locale),
\t\t\t\tget: typeof (ctx === null || ctx === undefined ? undefined : ctx.get),
\t\t\t\tinputTriggers: "n/a"
\t\t\t};
\t\t\tif (shape.get === "function") {
\t\t\t\ttry {
\t\t\t\t\tconst codec = ctx.get("inputTriggers");
\t\t\t\t\tshape.inputTriggers = codec === null || codec === undefined ? "missing" : "present";
\t\t\t\t}
\t\t\t\tcatch (error) {
\t\t\t\t\tshape.inputTriggers = "threw: " + String((error !== null && error !== undefined && error.message) || error);
\t\t\t\t}
\t\t\t}
\t\t\treturn shape;
\t\t}

\t\t/**
\t\t * Publish the toolbar glue, then mount both vendored plugins. The glue must
\t\t * come first: the patched annotation toolbar reads the injected actions when
\t\t * it renders. A vendored plugin that throws must not take the others down;
\t\t * every mount outcome is recorded for the diagnostics probe.
\t\t * @param ctx - cordis context carrying the injected client services.
\t\t * @returns disposer for everything this bundle mounted.
\t\t */
\t\tfunction apply(ctx) {
\t\t\t// Diagnostics hooks go in before the plugins mount, so their own warnings and
\t\t\t// any mount failure get captured rather than guessed at.
\t\t\tinitDiagnostics();
\t\t\tconst disposers = [];
\t\t\tconst vendoredMount = {};
\t\t\trecordDiagnostics({ context: describeContext(ctx), vendoredMount });
\t\t\ttry {
\t\t\t\tdisposers.push(mountSelectionToolbar(ctx));
\t\t\t}
\t\t\tcatch (error) {
\t\t\t\tif (typeof console !== "undefined" && typeof console.warn === "function")
\t\t\t\t\tconsole.warn("[dsh-selection-group] the toolbar glue failed to mount:", error);
\t\t\t}
\t\t\t// The vendored quote plugin refuses to re-apply while a predecessor's state is
\t\t\t// still registered (it early-returns), and that predecessor's teardown then
\t\t\t// removes the button for good — a hot swap would leave 引用 dead until a
\t\t\t// restart. Retire the predecessor first; its teardown is idempotent.
\t\t\ttry {
\t\t\t\tconst quoteStateKey = Symbol.for("dsh-quote-followup.state");
\t\t\t\tconst previousQuote = globalThis[quoteStateKey];
\t\t\t\tif (previousQuote !== null && previousQuote !== undefined && typeof previousQuote.dispose === "function")
\t\t\t\t\tpreviousQuote.dispose();
\t\t\t\tdelete globalThis[quoteStateKey];
\t\t\t}
\t\t\tcatch (_) { /* nothing to retire */ }
\t\t\tfor (const { key, plugin } of VENDORED_PLUGINS) {
\t\t\t\ttry {
\t\t\t\t\tconst result = typeof plugin.apply === "function" ? plugin.apply(ctx) : undefined;
\t\t\t\t\tvendoredMount[key] = typeof result === "function" ? "mounted (with disposer)" : "mounted";
\t\t\t\t\tif (typeof result === "function")
\t\t\t\t\t\tdisposers.push(result);
\t\t\t\t}
\t\t\t\tcatch (error) {
\t\t\t\t\tvendoredMount[key] = "FAILED: " + String((error !== null && error !== undefined && error.stack) || error);
\t\t\t\t\tif (typeof console !== "undefined" && typeof console.warn === "function")
\t\t\t\t\t\tconsole.warn("[dsh-selection-group] a vendored plugin failed to mount; the rest still runs:", error);
\t\t\t\t}
\t\t\t}
\t\t\t// Record whether each half actually created its UI: an apply that early-returns
\t\t\t// (e.g. a predecessor still registered) reports as mounted but leaves nothing.
\t\t\ttry {
\t\t\t\tvendoredMount.quoteUi = document.getElementById("dsh-quote-followup-btn") !== null;
\t\t\t\tvendoredMount.annotationUi = document.querySelector("[data-annotation-for-dsh]") !== null;
\t\t\t}
\t\t\tcatch (_) { /* diagnostics only */ }
\t\t\tconst dispose = () => {
\t\t\t\tfor (const entry of disposers) {
\t\t\t\t\ttry {
\t\t\t\t\t\tentry();
\t\t\t\t\t}
\t\t\t\t\tcatch (_) { /* one failing disposer must not strand the others */ }
\t\t\t\t}
\t\t\t};
\t\t\t// cordis effect semantics: the callback runs NOW and its RETURN VALUE is the
\t\t\t// cleanup, so passing the disposer directly would dispose the plugin the
\t\t\t// instant it mounted (measured in the field: mountedAt + 1 ms). Mirror upstream quote.
\t\t\tif (ctx !== undefined && ctx !== null && typeof ctx.effect === "function")
\t\t\t\tctx.effect(() => dispose, "dsh-selection-group: merged selection toolbar");
\t\t\treturn dispose;
\t\t}

\t\t/** Test seam: mount only the toolbar glue (used by test/toolbar.test.mjs). */
\t\texports.__toolbar = mountSelectionToolbar;
\t\texports.inject = ["sessions", "conversation", "locale", "uiSession", "inputTriggers"];
\t\texports.apply = apply;
\t\treturn module.exports;
\t}
});
`

// Parse-only check of the whole bundle (does not execute it).
new Function(client)
writeFileSync(join(root, 'client.js'), client)

console.log([
  `built client.js from ${extracted.length} vendored plugins`,
  ...extracted.map(({ name, meta, body }) => `  ${name} v${meta.version}: ${body.split('\n').length} lines inlined, sha256 ${meta.sha256.slice(0, 12)}…`),
  `  src/toolbar.js: ${glue.split('\n').length} lines`,
  `  client.js: ${client.split('\n').length} lines, ${Buffer.byteLength(client)} bytes`
].join('\n'))
