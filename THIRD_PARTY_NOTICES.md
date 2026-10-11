# Third-party notices

`dsh-selection-group` is a **merge of two MIT-licensed plugins**. Their browser
halves are vendored verbatim under `vendor/` and inlined into the generated
`client.js` by `scripts/build.mjs`. Neither package needs to be installed.

## dsh-quote-followup

- Version vendored: **0.2.10**
- Upstream: <https://github.com/tr1v3r/dsh-quote-followup>
- Licence: MIT — `vendor/LICENSE.dsh-quote-followup`
- Copyright (c) 2026 tr1v3r
- Vendored file: `vendor/dsh-quote-followup.client.js`
- SHA-256: `1b47ff6ef4330d9dddecb67c42951ad66ada29fbbcf298e71257ecc83c7c36cc`

Provides the 「❐ 引用」 button: it quotes the selected transcript text into the
composer as a native reference chip (plain markdown blockquote when the
`inputTriggers` codec is unavailable).

## @changfenhuang/dsh-annotation

- Version vendored: **1.4.11**
- Upstream: <https://github.com/omdsh-dev/dsh-annotation>
- Licence: MIT — `vendor/LICENSE.dsh-annotation`
- Copyright (c) 2026 omdsh-dev
- Vendored file: `vendor/dsh-annotation.client.js`
- SHA-256: `53c2d23ea1346845b2b2e6b7db8100f8a82879e43de75482009f9754e74a9039`

Provides the 「＋ 批注」 flow: annotate selected assistant text, send the
annotation block with the message, number the highlights, and render the model's
per-annotation replies as hoverable chips.

## What this project adds

`src/toolbar.js` (inlined as the “toolbar glue”) publishes the extra action the
patched annotation toolbar renders, and hides `dsh-quote-followup`'s own floating
button **only while that shared toolbar is on screen**. It moves no DOM nodes and
starts no frames: one interval toggles a marker attribute and refreshes the
diagnostics. No upstream file is modified; the vendored copies stay byte-identical
to the published ones (asserted by `test/vendor.test.mjs`).

## Deliberate deviations from upstream

Declared in `patches/`, applied at build time — the `vendor/` files themselves
stay byte-identical to the published ones. `test/vendor.test.mjs` asserts every
anchor matches exactly once and that every replacement reaches `client.js`:

1. **`accept-any-conversation-row`** (`@changfenhuang/dsh-annotation`): upstream
   only offers its annotation toolbar for selections inside an *assistant* row.
   This build also accepts any other conversation row (user, steering, tool
   steps) within `[data-slot="conversation.session"]`, so both actions are
   available for the same selection. Cross-row selections are still refused, as
   upstream.
2. **`immediate-toolbar`** / **`resync-excerpt-on-click`** (same package): the
   toolbar is painted in the `selectionchange` turn (upstream waits for the
   settle), and clicking 批注 re-syncs the excerpt from the live selection.
3. **`settle-120ms`** (same package): upstream waits 250 ms after the selection
   settles before painting its toolbar while the quote button is immediate; this
   build waits 120 ms so the two read as one toolbar.
3. **`bar-extra-actions`** (same package): the toolbar renders one extra button
   per action published at `window.__DSH_SELECTION_GROUP_ACTIONS__` — this is the
   merge. Each injected button carries `data-dsh-selection-group-action`.
4. **`expose-close-hook`** (annotation): publishes the plugin's own `closeToolbar`
   as `window.__DSH_SELECTION_GROUP_CLOSE__`, so the injected 引用 action closes the
   box the way 批注 does. (A cleared selection does not close it by itself.)
5. **`fail-loud-without-excerpt`** (`dsh-quote-followup`): a press with no pending
   excerpt used to return silently; it now shows the plugin's own insert-failed
   notice, which also lets the glue tell a no-op from a real insertion and keep its
   box open for a retry.
6. **`bar-extra-actions`** also wraps the injected-action loop in `try/catch`, so one
   throwing action cannot abort the whole annotation toolbar render.
7. **`mousedown-tolerates-merged-trigger`** (`dsh-quote-followup`): its
   pointerdown guard must tolerate the injected button, otherwise pressing 引用
   would discard the pending excerpt before the click lands.

Everything else in both plugins is unmodified upstream code.

## Updating a vendored plugin

1. Replace the file under `vendor/` with the new published `client.js`.
2. Update its `version` and `sha256` in `vendor/manifest.json`
   (`shasum -a 256 vendor/<file>`), and refresh its `LICENSE.*` if it changed.
3. `node scripts/build.mjs`
4. `node --test test/*.test.mjs`

## Coupling without a patch

`scripts/build.mjs` retires a predecessor's registered state before applying the
vendored quote plugin, because that plugin early-returns while a previous state is
registered and the predecessor's teardown would then remove its UI for good (a hot
swap would leave 引用 dead until a restart). This reads the plugin's own
`Symbol.for("dsh-quote-followup.state")`; `test/vendor.test.mjs` pins that the
vendored file still registers exactly that symbol, so an upstream rename fails loudly
instead of silently breaking the swap.
