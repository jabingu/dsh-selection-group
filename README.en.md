# dsh-selection-group

**Selection Toolbar** — the name the plugins panel shows (the package name, plugin id and repository are all `dsh-selection-group`: kebab-case for the identifier, a readable name for the panel).

[![test](https://github.com/jabingu/dsh-selection-group/actions/workflows/test.yml/badge.svg)](https://github.com/jabingu/dsh-selection-group/actions/workflows/test.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

One hover toolbar for text selected in the DeepSeek Harness chat: **one box,
three actions** — annotate, quote and side chat — and it does **not** depend on
either of the two upstream plugins being installed.

[中文说明见 README.md](README.md)

## What you get

- **＋ Annotate** — annotate the selected text. The annotations travel with the
  message and the model answers them one by one (upstream
  [`@changfenhuang/dsh-annotation`](https://www.npmjs.com/package/@changfenhuang/dsh-annotation)).
- **❐ Quote** — append the selection to the composer as a native DSH reference
  chip (upstream [`dsh-quote-followup`](https://www.npmjs.com/package/dsh-quote-followup)).
- **◧ Side chat** — open a new, **empty** **Side Chat** thread in
  [`dsh-better-sidebar`](https://www.npmjs.com/package/dsh-better-sidebar) and put
  the selection in **its composer verbatim** (plain text, no `>` prefix and no
  heading; caret at the end) — **nothing is sent**. Add your own question and
  press send when you want. This press costs **no tokens**: the context is only
  submitted when you send.

**Chat only**: the box appears over **conversation messages** and nowhere else. Text
selected in the sidebar (file tree, file viewers, side chat, terminal, tasks) or in
**any file content** — opened in the right column or the centre — raises no box;
file content belongs to `dsh-better-sidebar`'s own "add to conversation" action.

Both browser halves are inlined into this package **verbatim**, so both upstream
plugins can stay disabled or be uninstalled entirely. The third action needs the
neighbour plugin: without it (or with it disabled) the button **is not offered at
all**, rather than being a dead control.

## Install

The plugins panel lists it as **Selection Toolbar**.

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

## Architecture — one box with injected actions, not boxes relocated

| | How |
|---|---|
| The only hover box | The annotation plugin's toolbar. A build-time patch makes it **render one button per injected action** (`window.__DSH_SELECTION_GROUP_ACTIONS__`). |
| The quote action | A `❐ Quote` button whose `run()` simply **clicks `dsh-quote-followup`'s own button**. That plugin stays fully upstream (selection tracking, native chip insertion, failure notices); only its floating button is hidden while the shared box is on screen. |
| The side chat action | A `◧ Side chat` button that **does not reimplement** side chat: it creates an **empty** thread the way the neighbour's own tab does (`POST /sidebar/api/sidechat.start` with `question: ''`), parks the new thread id where that plugin looks for "this session's last thread", opens the tab through its published `ctx.betterSidebar.openTab({ type: 'sidechat' })`, then writes the selection into that tab's own composer verbatim. See below. |
| Hiding is same-turn | The moment text is selected (inside `selectionchange`, synchronously) `<html>` gets `data-dsh-selection-group-bar`, so the standalone button never gets a frame to flash — it is instantaneous while the shared box waits out annotation's ~120 ms settle. If the box has not appeared within a **300 ms** grace window (for example a cross-message selection upstream refuses), the marker is released and the standalone button returns, so quote keeps working. |
| No DOM moving | No node is ever re-parented or moved: no container, no positioning takeover, no frame scheduling. `test/contract.test.mjs` asserts the glue contains no `insertBefore` / `appendChild(quote…)`. |
| **Chat only** | A build-time patch rewrites annotation's `annotationRootOf`: the **file-content path is disabled** and the whole `[data-slot="sidebar"]` subtree is refused. Upstream serves BOTH conversation rows and the host's text previews (`DOCUMENT_TEXT` + `[data-textpreview-url]`); the merged bundle keeps only the former, so a source file raises nothing and neither does a chat row rendered in the right column. |

## The side chat action (how it talks to `dsh-better-sidebar`)

Side chat belongs to `dsh-better-sidebar`; this package does not modify it and
only uses entry points it already has:

| Step | What is used | Why |
|---|---|---|
| Create the thread | `POST sidebar/api/sidechat.start`, body `{ sessionId, question: '' }` | Side threads have no consumer API; this is the route that plugin's own tab uses. An empty `question` is its Codex-style **empty thread**: the inherited-context snapshot waits, the composer owns the first message — so **this press sends nothing and bills nothing**. |
| Make the tab show it | Write `localStorage['dsh-sidebar:v1:sidechat-thread'][sessionId] = childId`, **then** open the tab | That plugin's `createTab` takes no seed and its tab reattaches to "the last thread of this session" on mount; writing first is what keeps the tab from minting a second, empty thread. |
| Open the tab | `ctx.get('betterSidebar').openTab({ type: 'sidechat' }, { sessionId })` | The extension service that plugin publishes to other plugins (`registerTab` / `openTab`), not an internal. |
| Write the text | Put the selection **verbatim** in that tab's `<textarea>` through the **prototype's `value` setter**, then dispatch `input` | It is a React 18 controlled field (its own `value` accessor swallows a plain assignment), so the WRITE needs the prototype setter and the LOOKUP goes by structure: the container that directly holds the textarea must also hold the send button (`title="发送"` / `"Send"`, that plugin's own localised label) within two levels, and the textarea closest to that button wins. Hashed module class names are never used, and no unrelated field is ever adopted. |

Failures degrade loudly, never silently (each case has a test): the action is not
published without the neighbour service (and the service is re-read on **every**
render, so one that registers later is picked up); a refused route (the parent
session is not running → 409), an unreachable route, a non-JSON answer or a
missing thread id all surface a notice with the reason and open **no** tab;
selections over 4000 code points are truncated; a thread that was created but
whose tab failed to open says exactly that; and a composer that never mounted
within four seconds (a collapsed bottom workbench, say) says the selection was
**not** placed instead of pretending otherwise (that wait is
`window.__DSH_SELECTION_GROUP_SIDECHAT_POLL_MS__`, 4000 ms unless a page overrides
it). An existing draft in that composer is appended to, never overwritten. Every
failure notice clears itself after 8 seconds.

The **only network request** this package makes is that one same-origin route,
and only when the action is pressed. No file writes, no host permissions.

## Version history

| Version | Approach | Result |
|---|---|---|
| 0.2.0 | DOM adapter: move both plugins' floating buttons into one container | needed both plugins enabled |
| 1.0.0 | inlined merge + a re-anchoring layer (still moving DOM) | self-contained, still at the mercy of DOM moves |
| 1.1.0 | **one hover box + a patched-in second action** | no moving, no container, no scheduler |
| 1.2.x | immediate toolbar, close-on-quote, `ctx.effect` and hot-swap fixes | appears with the selection, no lingering box |
| 1.3.x | drag-aware painting, event-driven marker, fewer self-heals to do | no flicker while dragging, ~18 DOM queries/s idle |
| 1.4.x | a third action: side chat (talks to `dsh-better-sidebar`; the selection was **sent** as the first message) | one box, three actions — but one press paid for a context injection |
| 1.5.x | the third action became **quote-to-side**: create an **empty** thread and write the selection into its composer as a quote block | zero tokens per press; you decide when to send |
| 1.6.0 | the quote wrapper is gone: the selection is written **verbatim** (plain text) into that composer | it reads as if you pasted it yourself |
| 1.6.1 | fixed the composer lookup (all four earlier rules were wrong — see CHANGELOG) | the text actually lands; regression tests for the real nesting and for a distractor field |
| 1.6.2 | the button is simply 「侧边对话」 / `Side chat` | one box, three actions, the shortest name |
| **1.6.3** (current) | **scope tightened to the conversation**: the file-content path is off and the whole right column is refused | no box over a file or in the sidebar — the root cause was a gate my own patch had dropped (see CHANGELOG) |

## Deliberate deviations from upstream

Every entry in `patches/` carries a `why`. `test/vendor.test.mjs` asserts that its
anchor matches the upstream file **exactly once**, that the replacement is not
already upstream, that it **reaches the built artifact**, and that the upstream
text is gone from the artifact.

| Patch | Upstream | Here | Why |
|---|---|---|---|
| `chat-only-root` (annotation) | serves **assistant** rows AND **file content** (the host's text previews, `DOCUMENT_TEXT` + `[data-textpreview-url]`), preferring the file path | serves **only** conversation rows (any kind: user / steering / tool step) and refuses the whole `[data-slot="sidebar"]` subtree; cross-message selections are still refused | (1) the merged bundle is **chat-only** — file content belongs to `dsh-better-sidebar`'s own "add to conversation"; (2) so the injected actions apply to the **same** selection; (3) a chat row rendered in the right column must not raise it either |
| `immediate-toolbar` (annotation) | paints the toolbar only after the settle | paints **in the `selectionchange` turn**; while the pointer is down it steps aside; during a drag only the position is updated; the settle re-renders once with the final excerpt | so 批注 + 引用 appear with the selection, not 120 ms later — and the misplaced box no longer flickers mid-drag |
| `hold-while-dragging` (annotation) | the settle can paint **mid-drag** | stands down while the pointer is down | every drag frame fires `selectionchange` and crossing a message boundary closes the box — that flickered; it waits for the release |
| `resync-excerpt-on-click` (annotation) | `enterEditing` uses the excerpt captured by the settle | re-reads the **live selection** on click | the box appears before the settle, so a click right after a drag would otherwise annotate the wrong text |
| `expose-close-hook` (annotation) | `closeToolbar` is an internal closure | published as `window.__DSH_SELECTION_GROUP_CLOSE__` | so 引用 closes the box like 批注 does (a cleared selection does **not** close it by itself) |
| `bar-extra-actions` (annotation) | the toolbar has a single 批注 button | also renders the glue's injected actions (tagged `data-dsh-selection-group-action`), in a `try/catch` | this *is* the merge; one action that fails to render must not take the whole toolbar down |
| `mousedown-tolerates-merged-trigger` (quote) | a pointerdown anywhere but its own button drops the pending excerpt | tolerates buttons tagged `data-dsh-selection-group-action` | otherwise pressing the injected 引用 button clears the excerpt before the click |
| `fail-loud-without-excerpt` (quote) | a click with no pending excerpt returns silently | shows the plugin's own insert-failed notice | a press must never fail silently — and the glue uses it to keep its box open |
| `keep-excerpt-across-scroll` (quote) | any scroll drops the pending excerpt | not while the merged toolbar is in charge | the transcript auto-scrolls while an answer streams, and dropping it made 引用 hit "excerpt saved; select the original text to retry" |
| `keep-excerpt-while-toolbar-holds` (quote) | an unresolvable selection (empty text, unmeasurable rect) drops the excerpt | not while the merged toolbar is in charge | a transcript re-render during streaming looks exactly like that, and the annotation box does **not** close — so 引用 failed |

One coupling lives in `scripts/build.mjs` rather than in a patch: before applying
the vendored quote plugin it retires a predecessor's registered state
(`Symbol.for("dsh-quote-followup.state")`), because that plugin early-returns while
a previous state exists and the predecessor's teardown would then remove the UI for
good — a hot swap would leave 引用 dead until a restart. `test/vendor.test.mjs` pins
that symbol name.

## Behaviour and limits

- **Scope = conversation messages**: the box appears only inside `[data-slot="conversation.session"]` and
  never inside the `[data-slot="sidebar"]` subtree — so a file opened in the sidebar, a chat view in the right
  column, the file tree, the terminal or the task panel all raise nothing.
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
- **Failures are loud**: if quote cannot insert (no composer, a locked composer, or an
  excerpt that really is gone) the upstream plugin shows the reason and **the box stays
  open** for a retry — never "nothing happened and the box vanished".
- **The excerpt cannot go missing while the box is up**: upstream drops its pending
  excerpt whenever the selection cannot be resolved (empty text, unmeasurable rect —
  what a transcript re-render during streaming looks like) or on **any scroll**, while
  the annotation box stays up — so pressing 引用 hit "excerpt saved; select the original
  text to retry". Patched: **while the merged toolbar is in charge, neither drops the
  excerpt**. Escape, outside presses and scrolls in standalone mode keep their meaning.
- **The editor card also hides the standalone button**, so it cannot pop up over an
  open card.
- **Cost, with the diagnostics expiring after 3 minutes**: the toolbar is **event-driven** — `selectionchange` sets the marker in
  its own turn, a `MutationObserver` (body / head / annotation host, `childList`)
  follows the box and the card, the grace window is a one-shot timer, and a 1 s
  interval only self-heals and samples. Measured completely idle: ~18 DOM queries a
  second (down from ~110) and **~8 a second with zero writes once they expire**, which is the default. Raise `TICK_MS`/`SAMPLE_MS` to go lower still.
- **Changelog**: [CHANGELOG.md](CHANGELOG.md).
- **When the box appears**: **it stays away while the pointer is down** — every drag
  frame fires `selectionchange` and the frame that crosses a message boundary closes
  the box upstream, which made it flicker — and **appears in the turn the pointer is
  released** (`pointerup` re-dispatches one `selectionchange`, so there is no 120 ms
  settle wait either). **The standalone button stays hidden for the whole hold too**:
  since the shared box is deliberately waiting for the release, the grace window
  cannot justify releasing it — otherwise a pause of more than 300 ms mid-drag
  exposes that lone 引用 pill. Non-drag paths (double-click, keyboard, programmatic
  selection) still paint in the same turn.
- **Side chat is the only action that makes a request**: pressing it `POST`s once
  to the same-origin `sidebar/api/sidechat.start` (create the empty thread) and
  reports the reason inline when that fails. It sends **no message**, so pressing it
  costs no tokens. Annotate and quote still make **no** network requests.
- **No file writes, no host permissions.**

## Troubleshooting (self-reporting diagnostics, no DevTools needed)

**The diagnostics run for three minutes by default.** They wrap `console.warn/error`,
listen for window errors and sample the DOM once a second — useful for a startup
problem, wrong to leave on someone else's page forever.

| Want | Do this (before the plugin loads) |
|---|---|
| keep them on | `window.__DSH_SELECTION_GROUP_DIAGNOSTICS__ = true` |
| switch them off entirely (no hooks, no writes, no sampling) | `window.__DSH_SELECTION_GROUP_DIAGNOSTICS__ = false` |
| change the window in milliseconds | `window.__DSH_SELECTION_GROUP_DIAGNOSTICS_TTL_MS__ = 600000` |
| change how long the side chat composer is awaited (ms, default 4000) | `window.__DSH_SELECTION_GROUP_SIDECHAT_POLL_MS__ = 1000` |

On expiry (or when switched off) the console wrappers and error listeners are
**restored**, sampling and persistence stop, and **one final snapshot** is written
carrying `diagnosticsMode: "expired"` and `diagnosticsExpiredAt`. The cheap,
event-driven fields on `window.__DSH_SELECTION_GROUP__` (`applied` / `barUp` /
`cardUp` / `quoteButtonHidden` / `diagnosticsMode`) stay readable. Nothing about the
toolbar changes: the marker, the observer, the action hook, drag tracking and the rAF
fallback (a correctness measure, not a diagnostic) are never switched off.

Measured idle cost: ~18 DOM queries a second while running, with writes; **~8 a second
and zero writes once expired or off** (the remainder is the functional floor: one
marker/self-heal pass a second).

The diagnostics live on `window.__DSH_SELECTION_GROUP__` and are mirrored into
`localStorage['dsh-selection-group.diagnostics']` (Electron keeps that on disk, so it
can be read directly):

`applied / mountedAt / tick / barUp / cardUp / extraButtons / actionsInstalled /
quoteButtonHidden / stylePresent / hookPresent / selection{state,rowKind,rowTurn,inTranscript} /
sidechatEnabled / sidechatService / sidechatLast / sidechatLastThread / sidechatLastError /
consoleTail / lastWindowError / lastError / visibility / docHidden / rafFired /
rafShimmed / topLevel / href / frames / transcripts / flowRows / turnRows / context /
vendoredMount / disposedAt`

| Symptom | Look at |
|---|---|
| no box at all | `vendoredMount.annotation` is `mounted (with disposer)`; `consoleTail` / `lastWindowError` |
| box with too few buttons | `extraButtons` should be **2** (quote + side chat); a 1 means `sidechatEnabled` is false, i.e. `dsh-better-sidebar` is absent or disabled; also `actionsInstalled`; `[annotation] …` in `consoleTail` |
| side chat did not land in the composer | `sidechatLast` (`inserted` / `no-composer` / `no-session` / `failed`), `sidechatLastError`, `sidechatLastThread`; whether `sidechatService` reads `missing` or a version. On `no-composer`, check that the **bottom workbench is expanded** (the tab can exist in state while its view, and so its textarea, is never mounted) |
| two boxes at once | `barUp` / `cardUp` / `quoteButtonHidden`; `stylePresent` / `hookPresent` |
| annotations do nothing | `selection.rowKind` / `inTranscript`; `transcripts` > 0 (the plugin and the UI share one document) |

DevTools is **F12** in this app (`Fn+F12` if the system grabs it).

## Development and tests

```sh
npm install                     # one development dependency: jsdom
npm run build                   # regenerate client.js
npm test                        # 69 tests
```

| Test file | Covers |
|---|---|
| `test/toolbar.test.mjs` (51) | action hook and conditional hiding; **one box, three buttons**; **pressing 引用 really runs quote's native insertion** (asserts the official facade receives one `insertReference` carrying the selection); **pressing 侧边对话 really creates an empty thread and writes the selection into that tab's composer verbatim** (asserts the empty `question`, the URL/body, the tab's seed and scope, that the thread id is stored before the tab opens, that the draft IS the selection, append-to-existing-draft, the React controlled path, and that **the selection never reaches the wire**), plus two locator regressions (**the real nesting** — button inside the bar, with an unrelated editor textarea earlier in the document — and **no send button at all**, where nothing may be guessed), the neighbour-absent/late-registration cases, the five failure paths (refused route, unreachable route, non-JSON answer, tab that will not open, composer that never mounts) and the length cap; hidden while the box is up and released when it is not; works in the user's own message; drag behaviour; hot swap; rAF shim; the three diagnostics modes (expiring by default / forced on / off) |
| `test/integration.test.mjs` (3) | mounting the merged bundle for real: both inlined plugins create their UI, the glue publishes its actions, **no DOM is moved**, no runtime upstream reference |
| `test/vendor.test.mjs` (6) | vendor hashes/licences, inlined bodies = vendor + declared patches, each deviation's anchor/reason/presence, no upstream reference, reproducible build and an up-to-date `client.js` |
| `test/manifest.test.mjs` (5) + `test/contract.test.mjs` (4) | package shape, locale metadata, the DOM contract of the inlined code, and a **static audit of the glue's constants** (a used-but-undeclared one fails the suite — `SIDECHAT_DRAFT_POLL_MS` was once exactly that) |

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
