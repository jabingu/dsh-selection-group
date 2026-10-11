# dsh-selection-group

[![test](https://github.com/jabingu/dsh-selection-group/actions/workflows/test.yml/badge.svg)](https://github.com/jabingu/dsh-selection-group/actions/workflows/test.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

One hover toolbar for text selected in the DeepSeek Harness chat: **one box, two
actions** — annotate and quote — and it does **not** depend on either of the two
upstream plugins being installed.

[中文说明见 README.md](README.md)

## What you get

- **＋ Annotate** — annotate the selected text. The annotations travel with the
  message and the model answers them one by one (upstream
  [`@changfenhuang/dsh-annotation`](https://www.npmjs.com/package/@changfenhuang/dsh-annotation)).
- **❐ Quote** — append the selection to the composer as a native DSH reference
  chip (upstream [`dsh-quote-followup`](https://www.npmjs.com/package/dsh-quote-followup)).

Both browser halves are inlined into this package **verbatim**, so both upstream
plugins can stay disabled or be uninstalled entirely.

## Install

From the harness:

```
Settings → Plugins → Install, and paste the absolute path of this checkout:
~/path/to/dsh-selection-group
```

or from the CLI (`link:` keeps edits in place, so a `git pull` plus a restart is
enough to upgrade):

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add \
  "link:$PWD"          # run this in the repository root
```

Then **quit DeepSeek Harness completely (`Cmd+Q`) and open it again**.

> ⚠️ Keep `dsh-quote-followup` and `@changfenhuang/dsh-annotation` **disabled or
> uninstalled**. The inlined copies use the same element ids as upstream
> (`dsh-quote-followup-btn`), so enabling both would fight over the DOM.

## Architecture — one box with an injected action, not two boxes relocated

| | How |
|---|---|
| The only hover box | The annotation plugin's toolbar. A build-time patch makes it **render one button per injected action** (`window.__DSH_SELECTION_GROUP_ACTIONS__`). |
| The second action | A `❐ Quote` button whose `run()` simply **clicks `dsh-quote-followup`'s own button**. That plugin stays fully upstream (selection tracking, native chip insertion, failure notices); only its floating button is hidden while the shared box is on screen. |
| Hiding is same-turn | The moment text is selected (inside `selectionchange`, synchronously) `<html>` gets `data-dsh-selection-group-bar`, so the standalone button never gets a frame to flash — it is instantaneous while the shared box waits out annotation's ~120 ms settle. If the box has not appeared within a **300 ms** grace window (for example a cross-message selection upstream refuses), the marker is released and the standalone button returns, so quote keeps working. |
| No DOM moving | No node is ever re-parented or moved: no container, no positioning takeover, no frame scheduling. `test/contract.test.mjs` asserts the glue contains no `insertBefore` / `appendChild(quote…)`. |

## Version history

| Version | Approach | Result |
|---|---|---|
| 0.2.0 | DOM adapter: move both plugins' floating buttons into one container | needed both plugins enabled |
| 1.0.0 | inlined merge + a re-anchoring layer (still moving DOM) | self-contained, still at the mercy of DOM moves |
| 1.1.0 | **one hover box + a patched-in second action** | no moving, no container, no scheduler |
| 1.2.x | immediate toolbar, close-on-quote, `ctx.effect` and hot-swap fixes | appears with the selection, no lingering box |
| **1.3.x** (current) | drag-aware painting, event-driven marker, fewer self-heals to do | no flicker while dragging, ~18 DOM queries/s idle |

## Deliberate deviations from upstream

Every entry in `patches/` carries a `why`. `test/vendor.test.mjs` asserts that its
anchor matches the upstream file **exactly once**, that the replacement is not
already upstream, that it **reaches the built artifact**, and that the upstream
text is gone from the artifact.

| Patch | Upstream | Here | Why |
|---|---|---|---|
| `accept-any-conversation-row` (annotation) | offers the toolbar only for selections in **assistant** messages | any message row inside the conversation (user / steering / tool step); cross-message selections are still refused | so both actions apply to the **same** selection |
| `settle-120ms` (annotation) | waits **250 ms** after the selection settles | **120 ms**, used only to re-validate and re-render once with the final excerpt | shortens the misplacement |
| `immediate-toolbar` (annotation) | paints the toolbar after the settle | paints **in the `selectionchange` turn**; while the pointer is down it steps aside; during a drag only the position is updated; the settle re-renders once with the final excerpt | so 批注 + 引用 appear with the selection, not 120 ms later |
| `hold-while-dragging` (annotation) | the settle can paint mid-drag | stands down while the pointer is down | a drag fires `selectionchange` every frame, and crossing a message boundary closes the box — that flickered |
| `resync-excerpt-on-click` (annotation) | `enterEditing` uses the excerpt captured by the settle | re-reads the **live selection** on click | the box appears before the settle, so a click right after a drag would otherwise annotate the wrong text |
| `expose-close-hook` (annotation) | `closeToolbar` is an internal closure | published as `window.__DSH_SELECTION_GROUP_CLOSE__` | so 引用 closes the box like 批注 does (a cleared selection does **not** close it by itself) |
| `bar-extra-actions` (annotation) | the toolbar has a single 批注 button | also renders the glue's injected actions (tagged `data-dsh-selection-group-action`), in a `try/catch` | this *is* the merge |
| `mousedown-tolerates-merged-trigger` (quote) | a pointerdown anywhere but its own button drops the pending excerpt | tolerates buttons tagged `data-dsh-selection-group-action` | otherwise pressing the injected 引用 button clears the excerpt before the click |
| `fail-loud-without-excerpt` (quote) | a click with no pending excerpt returns silently | shows the plugin's own insert-failed notice | a press must never fail silently — and the glue uses it to keep its box open |

One coupling lives in `scripts/build.mjs` rather than in a patch: before applying
the vendored quote plugin it retires a predecessor's registered state
(`Symbol.for("dsh-quote-followup.state")`), because that plugin early-returns while
a previous state exists and the predecessor's teardown would then remove the UI for
good — a hot swap would leave 引用 dead until a restart. `test/vendor.test.mjs` pins
that symbol name.

## Behaviour and limits

- **Quote uses the upstream path**: the injected button clicks quote's own button,
  which inserts through the official session facade
  (`conversation.input.for(scope).insertReference`) and shows its own notice on
  failure.
- **Smallest possible surface**: apart from one CSS rule that hides the standalone
  button and the patches above, both plugins behave exactly as upstream.
- **No `requestAnimationFrame` dependency**: annotation uses rAF for marker
  re-layout, card placement and post-send focus. This package probes whether rAF
  actually fires at startup and, if it demonstrably does not (some Electron views),
  installs a timer-based implementation for the whole page, recorded in
  `rafShimmed`.
- **Known behaviour**: 批注 replaces the box with the editor card; 引用 inserts and
  **closes the box too** (both actions behave alike). Losing the selection or
  clicking outside closes the whole box, and the standalone button comes back.
- **Failures are loud**: if quote cannot insert (the pending excerpt was dropped by
  a scroll, no composer, a locked composer) the upstream plugin shows the reason and
  **the box stays open** for a retry — never "nothing happened and the box vanished".
- **The editor card also hides the standalone button**, so it cannot pop up over an
  open card.
- **Cost**: the toolbar is **event-driven** — `selectionchange` sets the marker in
  its own turn, a `MutationObserver` (body / head / annotation host, `childList`)
  follows the box and the card, the grace window is a one-shot timer, and a 1 s
  interval only self-heals and samples. Measured completely idle: ~18 DOM queries a
  second (down from ~110) and no idle `localStorage` writes (writes happen on mount
  and on real state changes only). Raise `TICK_MS`/`SAMPLE_MS` to go lower still.
- **When the box appears**: **it stays away while the pointer is down** — every drag
  frame fires `selectionchange` and the frame that crosses a message boundary closes
  the box upstream, which made it flicker — and **appears in the turn the pointer is
  released** (`pointerup` re-dispatches one `selectionchange`, so there is no 120 ms
  settle wait either). **The standalone button stays hidden for the whole hold too**:
  since the shared box is deliberately waiting for the release, the grace window
  cannot justify releasing it — otherwise a pause of more than 300 ms mid-drag
  exposes that lone 引用 pill. Non-drag paths (double-click, keyboard, programmatic
  selection) still paint in the same turn.
- **No network requests, no file writes, no host permissions.**

## Troubleshooting (self-reporting diagnostics, no DevTools needed)

The diagnostics live on `window.__DSH_SELECTION_GROUP__` and are mirrored into
`localStorage['dsh-selection-group.diagnostics']` (Electron keeps that on disk, so it
can be read directly):

`applied / mountedAt / tick / barUp / cardUp / extraButtons / actionsInstalled /
quoteButtonHidden / stylePresent / hookPresent / selection{state,rowKind,rowTurn,inTranscript} /
consoleTail / lastWindowError / lastError / visibility / docHidden / rafFired /
rafShimmed / topLevel / href / frames / transcripts / flowRows / turnRows / context /
vendoredMount / disposedAt`

| Symptom | Look at |
|---|---|
| no box at all | `vendoredMount.annotation` is `mounted (with disposer)`; `consoleTail` / `lastWindowError` |
| box with only one button | `extraButtons` is 1; `actionsInstalled`; `[annotation] …` in `consoleTail` |
| two boxes at once | `barUp` / `cardUp` / `quoteButtonHidden`; `stylePresent` / `hookPresent` |
| annotations do nothing | `selection.rowKind` / `inTranscript`; `transcripts` > 0 (the plugin and the UI share one document) |

DevTools is **F12** in this app (`Fn+F12` if the system grabs it).

## Development and tests

```sh
npm install                     # one development dependency: jsdom
npm run build                   # regenerate client.js
npm test                        # 43 tests
```

| Test file | Covers |
|---|---|
| `test/toolbar.test.mjs` (26) | action hook and conditional hiding; **one box, two buttons**; **pressing 引用 really runs quote's native insertion** (asserts the official facade receives one `insertReference` carrying the selection); hidden while the box is up and released when it is not; works in the user's own message; drag behaviour; hot swap; rAF shim; diagnostics |
| `test/integration.test.mjs` (3) | mounting the merged bundle for real: both inlined plugins create their UI, the glue publishes its actions, **no DOM is moved**, no runtime upstream reference |
| `test/vendor.test.mjs` (6) | vendor hashes/licences, inlined bodies = vendor + declared patches, each deviation's anchor/reason/presence, no upstream reference, reproducible build and an up-to-date `client.js` |
| `test/manifest.test.mjs` (5) + `test/contract.test.mjs` (3) | package shape, locale metadata, and the DOM contract of the inlined code |

## Updating an upstream version

1. Drop the new `client.js` into `vendor/` and update the matching `LICENSE.*`.
2. Update `version` and `sha256` in `vendor/manifest.json` (`shasum -a 256 vendor/<file>`).
3. Run `node scripts/build.mjs` — if upstream touched a patched anchor the build
   **fails** and names the patch; adjust the anchor in `patches/*.json`.
4. Run `npm test`.

## Licence

MIT for this project (see [LICENSE](LICENSE)). Both vendored plugins are MIT as
well; their licences travel in `vendor/LICENSE.*` and every deviation from upstream
is listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
