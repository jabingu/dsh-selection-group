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

Provides the 「❐ 引用」 insertion core: it quotes the selected transcript text into the
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

`src/toolbar.js` coordinates one validated main-chat selection snapshot. The patched annotation client renders the sole toolbar, including cross-message excerpts. The patched quote client is a headless native-insertion service: floating-button creation, positioning, hiding and CSS are removed from the emitted body. Vendor inputs remain byte-identical and hash-pinned.

## Declared deviations

`patches/*.json` is the authoritative list. Every edit has a reason and an anchor that must match exactly once. Tests verify emitted replacements and absence of original anchors.

Annotation patches delegate scope and lifecycle to the coordinator, synchronize excerpt/root/button admission immediately, locate the current snapshot instead of another identical message, annotate cross-message or streaming snapshots, clear the snapshot on dismissal, and place the pending-annotation chip in a reserved row on the left inside the composer seat. When the row first grows, an existing tail scroll landing is preserved and geometry is settled after host layout; history readers retain their position. Deferred work is cancelled and owned padding is restored on hide, session change, composer replacement and disposal; queue clearance and viewport bounds are preserved.

Quote patches capture the same snapshot with native provenance rules, expose insertion/cancellation as an action API, preserve rendering-loss snapshots, report stale actions as failures, and remove standalone floating UI and its lifecycle. Error notices retain styling.

The generated plugin retires its previous mount before replacement, so competing selection bars cannot remain live. Disposers are idempotent and do not remove successor APIs.

## Updating upstream

Replace an original vendor input, update its version/sha256 and licence metadata, review every patch, then run `npm run build` and `npm test`. Do not hand-edit the generated bundle or silently normalize vendor bytes during hashing.

## Side-chat compatibility

The adapter uses public sidebar snapshot/update APIs and verifies committed React props through a read-only private fiber attachment because the sidebar has no draft API or DOM thread attributes. Unknown ownership fails visibly. No sidebar source is bundled or modified.

Reference implementation: https://github.com/omdsh-dev/DSH-better-sidebar/blob/main/src/client/SideChatView.tsx and src/client/service.ts.
