/**
 * dsh-selection-toolbar glue — inlined by `scripts/build.mjs`, never registered
 * as a module of its own.
 *
 * ONE hover box, TWO actions. There is no second floating toolbar to move:
 *
 *   - `@changfenhuang/dsh-annotation`'s toolbar is the only selection UI. A
 *     build-time patch (`patches/dsh-annotation.json`) makes it render one extra
 *     button per action this glue injects through
 *     `window.__DSH_SELECTION_GROUP_ACTIONS__`.
 *   - The 引用 button's action simply clicks `dsh-quote-followup`'s own button.
 *     That plugin stays fully upstream (selection tracking, native reference
 *     chip, markdown fallback); only its floating button is hidden, and only
 *     while the shared box is on screen — so if the box ever fails to appear,
 *     引用 keeps working standalone instead of regressing.
 *
 * Nothing here moves DOM nodes, positions anything, or schedules frames: one
 * interval toggles a marker attribute and refreshes the diagnostics.
 *
 * `GROUP_VERSION`/`CLIENT_VERSION` is replaced by the build with the package
 * version.
 */

//#region constants
const CLIENT_VERSION = "__VERSION__";
const STYLE_ID = "dsh-selection-group-style";
const MARKER_ATTR = "data-dsh-selection-group";
const HIDE_ATTR = "data-dsh-selection-group-bar";
const ACTIONS_KEY = "__DSH_SELECTION_GROUP_ACTIONS__";
/** Published by the patched annotation plugin: its own closeToolbar. */
const CLOSE_KEY = "__DSH_SELECTION_GROUP_CLOSE__";
const QUOTE_BUTTON_ID = "dsh-quote-followup-btn";
const QUOTE_ACTION_ATTR = "data-dsh-selection-group-action";
const ANNOTATION_HOST_SELECTOR = "[data-annotation-for-dsh]";
const ANNOTATION_BAR_CLASS = "dsh-ann-bar";
const ANNOTATION_CARD_CLASS = "dsh-ann-card";
const QUOTE_NOTICE_ID = "dsh-quote-followup-notice";
const CAPTURE_KEY = "__DSH_SELECTION_GROUP_CAPTURE__";
/** Published by the glue: true while the pointer is down, so the toolbar waits for the release. */
const DRAGGING_KEY = "__DSH_SELECTION_GROUP_IS_DRAGGING__";
/** Where that state actually lives: one record per page, not per hot-swapped copy. */
const DRAGGING_STATE_KEY = "__DSH_SELECTION_GROUP_DRAGGING_STATE__";
const DIAGNOSTICS_KEY = "__DSH_SELECTION_GROUP__";
/** Set BEFORE the plugin loads: false disables the diagnostics, true keeps them on. */
const DIAGNOSTICS_POLICY_KEY = "__DSH_SELECTION_GROUP_DIAGNOSTICS__";
/** Optional number of milliseconds to keep them on before they expire by themselves. */
const DIAGNOSTICS_TTL_KEY = "__DSH_SELECTION_GROUP_DIAGNOSTICS_TTL_MS__";
/** Where the one deadline per page lives, so a hot swap cannot restart the clock. */
const DIAGNOSTICS_DEADLINE_KEY = "__DSH_SELECTION_GROUP_DIAGNOSTICS_DEADLINE__";
const DIAGNOSTICS_TIMER_KEY = "__DSH_SELECTION_GROUP_DIAGNOSTICS_TIMER__";
/**
 * How long the diagnostics run before they turn themselves off.
 *
 * They wrap console.warn/error, listen for window errors and sample the DOM once a
 * second — fine for debugging a fresh install, wrong to leave on someone else's page
 * forever. Three minutes covers a startup problem (where these have always paid off);
 * after that only cheap, event-driven fields keep updating, and a final snapshot is
 * written so the record of what happened survives.
 */
const DIAGNOSTICS_TTL_MS = 3 * 60 * 1000;
const DIAGNOSTICS_STORAGE_KEY = "dsh-selection-group.diagnostics";
/**
 * The toolbar is event-driven: `selectionchange` paints the marker in its own
 * turn, a MutationObserver follows the box appearing/disappearing, and a one-shot
 * timer covers the grace window. The interval below is only a safety net (self
 * healing, sampling, and any DOM change the observers cannot see), which took the
 * idle cost from ~110 DOM queries a second to about one.
 */
const TICK_MS = 1000;
const SAMPLE_MS = 1000;
/**
 * How long a fresh transcript selection waits for the shared toolbar before the
 * standalone quote button is allowed back (it must not flash, but it must also
 * not stay hidden when the toolbar never arrives).
 */
const GRACE_MS = 300;
//#endregion

//#region marker state
/** Which layer most recently ensured the shared stylesheet / action hook exists. */
let styleOwner = null;
let actionsOwner = null;
/** Layers currently mounted — a hot swap can have a successor live before the predecessor goes. */
const liveLayers = new Set();
/** When the current selection was last seen (for the grace window). */
let lastSelectionAt = 0;
/** When the environment was last sampled. */
let lastSampleAt = 0;
/** One-shot re-evaluation after a selection, so the marker is not polled for. */
let graceTimer = null;
/** "off" | "expiring" | "expired" | "on" — what the diagnostics are allowed to do. */
let diagnosticsMode = "expiring";
let diagnosticsFinalWriteDone = false;
//#endregion

//#region diagnostics
const diagnostics = {
	version: CLIENT_VERSION,
	applied: false,
	mountedAt: null,
	tick: 0,
	barUp: false,
	cardUp: false,
	extraButtons: 0,
	sampledAt: null,
	quoteButtonPresent: null,
	annotationHostPresent: null,
	actionsInstalled: false,
	quoteButtonHidden: false,
	stylePresent: null,
	hookPresent: null,
	diagnosticsMode: null,
	diagnosticsExpiredAt: null,
	lastError: null,
	lastWindowError: null,
	selection: null,
	consoleTail: [],
	visibility: null,
	docHidden: null,
	rafFired: null,
	rafShimmed: false,
	rafShimReason: null,
	topLevel: null,
	href: null,
	frames: null,
	transcripts: null,
	flowRows: null,
	turnRows: null,
	disposedAt: null,
	context: null,
	vendoredMount: null
};
try {
	globalThis[DIAGNOSTICS_KEY] = diagnostics;
}
catch (_) { /* a frozen global must not stop the bundle */ }

/**
 * A subframe gets its own diagnostics key: several realms can share one
 * origin's localStorage, and the last writer would otherwise hide the others.
 */
const diagnosticsKey = (() => {
	try {
		return window.top === window ? DIAGNOSTICS_STORAGE_KEY : `${DIAGNOSTICS_STORAGE_KEY}.frame`;
	}
	catch (_) {
		return `${DIAGNOSTICS_STORAGE_KEY}.frame`;
	}
})();

let persistTimer = null;

/**
 * Mirror the diagnostics into localStorage, throttled. The client half cannot
 * write files, but Electron keeps this origin's localStorage on disk, so a grep
 * over the Chromium LevelDB answers "what did the browser actually see?" without
 * asking the person at the keyboard to open DevTools.
 */
function writeSnapshot(target) {
	try {
		window.localStorage.setItem(diagnosticsKey, JSON.stringify(target));
	}
	catch (_) { /* private mode or a full quota must never break the bundle */ }
}

let lastPersisted = null;

/**
 * The snapshot without its volatile counters, so sampling alone never makes it look
 * changed. `sampledAt` and `tick` advance on every sample; without this an idle page
 * rewrote the whole snapshot (and therefore the LevelDB) once a second.
 */
function snapshotSignature() {
	const { sampledAt, tick } = diagnostics;
	diagnostics.sampledAt = null;
	diagnostics.tick = null;
	try {
		return JSON.stringify(diagnostics);
	}
	finally {
		diagnostics.sampledAt = sampledAt;
		diagnostics.tick = tick;
	}
}

function persistDiagnostics() {
	if (diagnosticsMode === "off")
		return;
	if (diagnosticsMode === "expired" && diagnosticsFinalWriteDone)
		return;
	if (persistTimer !== null)
		return;
	try {
		persistTimer = setTimeout(() => {
			persistTimer = null;
			try {
				if (diagnosticsMode === "expired")
					diagnosticsFinalWriteDone = true;
				// A retired layer must never win the last-writer race: after a hot swap
				// its snapshot would otherwise overwrite the live one.
				if (globalThis[DIAGNOSTICS_KEY] !== diagnostics)
					return;
				// Writes happen only when the facts changed: an idle page keeps its
				// snapshot in memory instead of rewriting localStorage every tick.
				const signature = snapshotSignature();
				if (signature === lastPersisted)
					return;
				lastPersisted = signature;
				diagnostics.sampledAt = new Date().toISOString();
				writeSnapshot(diagnostics);
			}
			catch (_) { /* private mode or a full quota must never break the bundle */ }
		}, 250);
	}
	catch (_) { /* no timers available: skip persistence */ }
}

/** Attach facts from the plugin face (mount results, context shape) to the diagnostics. */
function recordDiagnostics(fields) {
	try {
		Object.assign(diagnostics, fields);
		persistDiagnostics();
	}
	catch (_) { /* diagnostics must never break the bundle */ }
}

/** Resolve what the diagnostics may do, from the two window switches. */
function diagnosticsPolicy() {
	let flag;
	try {
		flag = window[DIAGNOSTICS_POLICY_KEY];
	}
	catch (_) {
		flag = undefined;
	}
	if (flag === false)
		return { mode: "off", ttl: 0 };
	if (flag === true)
		return { mode: "on", ttl: 0 };
	let ttl = DIAGNOSTICS_TTL_MS;
	try {
		const requested = Number(window[DIAGNOSTICS_TTL_KEY]);
		if (Number.isFinite(requested) && requested >= 0)
			ttl = requested;
	}
	catch (_) { /* keep the default window */ }
	return { mode: "expiring", ttl };
}

/** Whether the heavy diagnostic work (sampling, capture, persistence) may run now. */
function diagnosticsAllowed() {
	if (diagnosticsMode === "off" || diagnosticsMode === "expired")
		return false;
	try {
		const deadline = window[DIAGNOSTICS_DEADLINE_KEY];
		if (diagnosticsMode === "expiring" && typeof deadline === "number" && Date.now() >= deadline) {
			expireDiagnostics();
			return false;
		}
	}
	catch (_) { /* a frozen window keeps them running */ }
	return true;
}

/**
 * Stop the heavy diagnostics and leave the page as it was.
 *
 * The captures live on the window keyed record, so restoring them here also covers a
 * hot-swapped successor; the last snapshot is written once so a reader can still see
 * what the page looked like when the window closed.
 */
function expireDiagnostics() {
	if (diagnosticsMode === "off" || diagnosticsMode === "expired")
		return;
	diagnosticsMode = "expired";
	diagnostics.diagnosticsMode = "expired";
	diagnostics.diagnosticsExpiredAt = new Date().toISOString();
	try {
		releaseCaptures();
	}
	catch (_) { /* already gone */ }
	persistDiagnostics();
}

/** Arm the one expiry timer per page; a hot swap must not restart the clock. */
function scheduleDiagnosticsExpiry(ttl) {
	try {
		if (window[DIAGNOSTICS_TIMER_KEY] !== undefined)
			return;
		const deadline = Date.now() + ttl;
		window[DIAGNOSTICS_DEADLINE_KEY] = deadline;
		window[DIAGNOSTICS_TIMER_KEY] = setTimeout(() => {
			try {
				delete window[DIAGNOSTICS_TIMER_KEY];
			}
			catch (_) { /* already gone */ }
			diagnosticsAllowed();
		}, ttl);
	}
	catch (_) { /* without timers the deadline check still expires them */ }
}

/** The diagnostics object that currently owns the page global. */
function diagnosticsNow() {
	try {
		const current = globalThis[DIAGNOSTICS_KEY];
		return current === undefined || current === null ? diagnostics : current;
	}
	catch (_) {
		return diagnostics;
	}
}

/**
 * Install the error and console captures ONCE per window.
 *
 * The installed flags used to live in module state, so every hot-swapped copy of
 * this module added another pair of window listeners and wrapped console.warn/error
 * again — each wrapper holding a dead layer's diagnostics. The record lives on the
 * window instead, and captured text is routed to the layer that owns the page
 * global now.
 */
function installCaptures() {
	if (window[CAPTURE_KEY] !== undefined)
		return;
	const record = { consoleOriginals: {}, onError: null, onRejection: null };
	record.onError = (event) => {
		const target = diagnosticsNow();
		target.lastWindowError = `${String((event !== null && event !== undefined && event.message) || event)} @ ${String((event !== null && event !== undefined && event.filename) || "")}:${String((event !== null && event !== undefined && event.lineno) || "")}`;
		writeSnapshot(target);
	};
	record.onRejection = (event) => {
		const target = diagnosticsNow();
		target.lastWindowError = `unhandledrejection: ${String((event !== null && event !== undefined && event.reason) || event)}`;
		writeSnapshot(target);
	};
	try {
		window.addEventListener("error", record.onError, true);
		window.addEventListener("unhandledrejection", record.onRejection);
	}
	catch (_) { /* diagnostics only */ }
	try {
		for (const level of ["warn", "error"]) {
			const original = console[level];
			if (typeof original !== "function")
				continue;
			record.consoleOriginals[level] = original;
			console[level] = (...args) => {
				try {
					const target = diagnosticsNow();
					const text = args
						.map((value) => (typeof value === "string" ? value : String((value !== null && value !== undefined && value.message) || value)))
						.join(" ");
					target.consoleTail = [...(target.consoleTail || []), `${level}: ${text}`].slice(-8);
					writeSnapshot(target);
				}
				catch (_) { /* never interfere with logging */ }
				return original.apply(console, args);
			};
		}
	}
	catch (_) { /* diagnostics only */ }
	window[CAPTURE_KEY] = record;
}

/** Put the page back the way it was; called when the last layer is torn down. */
function releaseCaptures() {
	const record = window[CAPTURE_KEY];
	if (record === undefined || record === null)
		return;
	try {
		window.removeEventListener("error", record.onError, true);
		window.removeEventListener("unhandledrejection", record.onRejection);
	}
	catch (_) { /* already gone */ }
	try {
		for (const [level, original] of Object.entries(record.consoleOriginals))
			console[level] = original;
	}
	catch (_) { /* already gone */ }
	try {
		delete window[CAPTURE_KEY];
	}
	catch (_) { /* already gone */ }
}

let animationFrameChecked = false;
let rafProbeConcluded = false;

/**
 * Measure whether `requestAnimationFrame` fires, and replace it with a timer
 * when it demonstrably does not. The vendored annotation plugin uses rAF for
 * marker re-layout, editor-card placement and composer focus; in an Electron
 * view Chromium treats as occluded those callbacks can stop arriving while the
 * page stays interactive.
 */
function probeAnimationFrame() {
	if (animationFrameChecked)
		return;
	animationFrameChecked = true;
	try {
		diagnostics.visibility = typeof document.visibilityState === "string" ? document.visibilityState : "unknown";
		diagnostics.docHidden = document.hidden === true;
		if (typeof window.requestAnimationFrame !== "function") {
			diagnostics.rafFired = "missing";
			installAnimationFrameFallback("missing");
			return;
		}
		let fired = false;
		window.requestAnimationFrame(() => {
			// A callback arriving after the probe concluded must not overwrite the
			// diagnosis (and must not pretend the shim never happened).
			if (rafProbeConcluded)
				return;
			fired = true;
			diagnostics.rafFired = true;
			persistDiagnostics();
		});
		setTimeout(() => {
			if (fired) {
				rafProbeConcluded = true;
				return;
			}
			rafProbeConcluded = true;
			diagnostics.rafFired = false;
			installAnimationFrameFallback("never fired");
		}, 300);
	}
	catch (_) { /* diagnostics only */ }
}

function installAnimationFrameFallback(reason) {
	try {
		if (diagnostics.rafShimmed === true)
			return;
		diagnostics.rafShimmed = true;
		diagnostics.rafShimReason = reason;
		window.requestAnimationFrame = (callback) => setTimeout(() => {
			try {
				callback(Date.now());
			}
			catch (_) { /* a plugin's frame callback must not break the timer loop */ }
		}, 16);
		window.cancelAnimationFrame = (handle) => clearTimeout(handle);
		persistDiagnostics();
	}
	catch (_) {
		diagnostics.rafShimReason = `${reason}; shim failed`;
	}
}

/** Describe what the current selection looks like to a plugin deciding whether to offer its toolbar. */
function describeSelection() {
	try {
		const selection = typeof document.getSelection === "function" ? document.getSelection() : null;
		if (selection === null || selection.rangeCount === 0)
			return { state: "no-selection" };
		const range = selection.getRangeAt(0);
		const node = range.commonAncestorContainer;
		const el = node instanceof Element ? node : (node !== null && node !== undefined ? node.parentElement : null);
		if (el === null || el === undefined)
			return { state: "no-element" };
		let rowKind = null;
		let rowTurn = null;
		let walker = el;
		let steps = 0;
		while (walker !== null && walker !== undefined && walker !== document.body && steps < 60) {
			if (typeof walker.hasAttribute === "function") {
				if (rowKind === null && walker.hasAttribute("data-chat-flow-kind"))
					rowKind = walker.getAttribute("data-chat-flow-kind");
				if (rowTurn === null && walker.hasAttribute("data-chat-turn"))
					rowTurn = walker.getAttribute("data-chat-turn");
			}
			walker = walker.parentElement;
			steps += 1;
		}
		return {
			state: "ok",
			collapsed: selection.isCollapsed === true,
			textLength: String(selection.toString() || "").length,
			inTranscript: typeof el.closest === "function" && el.closest('[data-slot="conversation.session"]') !== null,
			rowKind,
			rowTurn,
			anchor: typeof el.tagName === "string" ? el.tagName.toLowerCase() : "?"
		};
	}
	catch (error) {
		return { state: "threw", error: String((error !== null && error !== undefined && error.message) || error) };
	}
}

/** Snapshot the document facts that decide whether the toolbar can work here at all. */
function sampleEnvironment() {
	if (!diagnosticsAllowed())
		return;
	try {
		diagnostics.tick += 1;
		// `sampledAt` is stamped by the write path only, so sampling alone never
		// makes the snapshot look changed (which used to write to disk every tick).
		diagnostics.topLevel = (() => {
			try {
				return window.top === window;
			}
			catch (_) {
				return false;
			}
		})();
		diagnostics.href = String((window.location !== undefined && window.location !== null && window.location.href) || "");
		diagnostics.frames = document.querySelectorAll("iframe").length;
		diagnostics.transcripts = document.querySelectorAll('[data-slot="conversation.session"]').length;
		diagnostics.flowRows = document.querySelectorAll("[data-chat-flow-kind]").length;
		diagnostics.turnRows = document.querySelectorAll("[data-chat-turn]").length;
		diagnostics.quoteButtonPresent = document.getElementById(QUOTE_BUTTON_ID) !== null;
		diagnostics.annotationHostPresent = document.querySelector(ANNOTATION_HOST_SELECTOR) !== null;
		diagnostics.cardUp = document.querySelector(`.${ANNOTATION_CARD_CLASS}`) !== null;
		diagnostics.extraButtons = document.querySelectorAll(`[${QUOTE_ACTION_ATTR}]`).length;
		diagnostics.stylePresent = document.getElementById(STYLE_ID) !== null;
		diagnostics.hookPresent = window[ACTIONS_KEY] !== undefined;
		diagnostics.visibility = typeof document.visibilityState === "string" ? document.visibilityState : "unknown";
		diagnostics.docHidden = document.hidden === true;
		diagnostics.selection = describeSelection();
		persistDiagnostics();
	}
	catch (_) { /* diagnostics only */ }
}

/** Install every diagnostic hook the plugin face needs before the plugins mount. */
function initDiagnostics() {
	const policy = diagnosticsPolicy();
	diagnosticsMode = policy.mode;
	diagnostics.diagnosticsMode = policy.mode;
	// The rAF fallback is a correctness measure, not a diagnostic: it stays either way.
	probeAnimationFrame();
	if (policy.mode === "off") {
		diagnostics.diagnosticsExpiredAt = new Date().toISOString();
		return;
	}
	installCaptures();
	sampleEnvironment();
	if (policy.mode === "expiring")
		scheduleDiagnosticsExpiry(policy.ttl);
}
//#endregion

//#region toolbar glue
const styleText = () => [
	// The shared box carries the 引用 action itself; hide the plugin's own
	// floating button only while that box is on screen. `!important` beats the
	// plugin's inline `display`, and a hidden button still fires `.click()`.
	`html[${HIDE_ATTR}] #${QUOTE_BUTTON_ID} {`,
	"  display: none !important;",
	"}",
	// The injected action reuses the plugin's own ghost-button look; this only
	// keeps the two labels from colliding when they wrap on a narrow viewport.
	`[${QUOTE_ACTION_ATTR}] {`,
	"  white-space: nowrap;",
	"}"
].join("\n");

/**
 * Insert the stylesheet if it is missing, and hand ownership to the caller.
 *
 * Ownership matters across a hot swap: the successor reuses the stylesheet the
 * predecessor inserted, so a predecessor that is disposed afterwards (the new
 * fiber can be applied before the old one is torn down) must not take it away.
 * Whoever most recently ensured it owns it, and the heartbeat keeps re-ensuring.
 */
function ensureStylesheet(owner) {
	const head = document.head ?? document.documentElement;
	if (head === null || typeof head.appendChild !== "function")
		return null;
	const existing = document.getElementById(STYLE_ID);
	if (existing !== null) {
		if (existing.getAttribute(MARKER_ATTR) === CLIENT_VERSION) {
			styleOwner = owner;
			return existing;
		}
		existing.remove();
	}
	const style = document.createElement("style");
	style.id = STYLE_ID;
	style.setAttribute(MARKER_ATTR, CLIENT_VERSION);
	style.textContent = styleText();
	head.appendChild(style);
	styleOwner = owner;
	return style;
}

/** The 引用 action: hand the click to dsh-quote-followup's own button. */
function quoteAction(ctx) {
	const english = (() => {
		try {
			const snapshot = ctx !== null && ctx !== undefined && ctx.locale !== null && ctx.locale !== undefined && typeof ctx.locale.getSnapshot === "function"
				? ctx.locale.getSnapshot()
				: null;
			return snapshot !== null && snapshot !== undefined && String(snapshot.active || "").toLowerCase().startsWith("en");
		}
		catch (_) {
			return false;
		}
	})();
	return {
		id: "quote",
		label: english ? "❐ Quote" : "❐ 引用",
		title: english
			? "Quote the selection into the composer (repeatable; editable before sending)"
			: "引用选中内容到输入框（可多次引用，发送前可编辑）",
		run: () => {
			const button = document.getElementById(QUOTE_BUTTON_ID);
			if (button !== null && typeof button.click === "function")
				button.click();
			// The plugin shows a notice only when it could not insert (nothing pending,
			// no composer, locked composer). Keep the box open in that case so the
			// person can re-select and retry instead of losing the toolbar silently.
			if (quoteNoticeText() !== "")
				return;
			// Pressing 批注 replaces the box with the editor card; pressing 引用 must
			// close it too, or the box lingers over the composer.
			closeSharedToolbar();
		}
	};
}

/** The quote plugin's own failure notice text, empty when it reported no failure. */
function quoteNoticeText() {
	try {
		const notice = document.getElementById(QUOTE_NOTICE_ID);
		return notice === null ? "" : String(notice.textContent || "").trim();
	}
	catch (_) {
		return "";
	}
}

/** Ask the patched annotation plugin to close its toolbar (after 引用). */
function closeSharedToolbar() {
	try {
		const close = window[CLOSE_KEY];
		if (typeof close === "function")
			close();
	}
	catch (_) { /* the toolbar may already be gone */ }
}

/** Publish the actions the patched annotation toolbar renders. */
function installActions(ctx, layer) {
	const actions = () => [quoteAction(ctx)];
	try {
		window[ACTIONS_KEY] = actions;
		actionsOwner = layer === undefined ? actionsOwner : layer;
		diagnostics.actionsInstalled = true;
	}
	catch (_) {
		diagnostics.lastError = "could not publish the toolbar actions";
	}
}

/** True while the pointer is down (a drag or a hold) anywhere on the page. */
function isDragging() {
	try {
		return window[DRAGGING_STATE_KEY] === true;
	}
	catch (_) {
		return false;
	}
}

function setDragging(value) {
	try {
		window[DRAGGING_STATE_KEY] = value === true;
	}
	catch (_) { /* a frozen window must not stop the bundle */ }
}

/** Whether a selection is active and inside the conversation transcript. */
function selectionState() {
	try {
		const selection = typeof document.getSelection === "function" ? document.getSelection() : null;
		if (selection === null || selection.isCollapsed === true || selection.rangeCount === 0)
			return { active: false, inTranscript: false };
		const range = selection.getRangeAt(0);
		const node = range.commonAncestorContainer;
		const el = node instanceof Element ? node : (node !== null && node !== undefined ? node.parentElement : null);
		const inTranscript = el !== null && el !== undefined && typeof el.closest === "function"
			&& el.closest('[data-slot="conversation.session"]') !== null;
		return { active: true, inTranscript };
	}
	catch (_) {
		return { active: false, inTranscript: false };
	}
}

/**
 * Decide whether the standalone quote button must be hidden right now.
 *
 * The standalone button appears the instant a selection exists, while the shared
 * toolbar waits out the annotation plugin's settle (~120 ms) — so hiding it only
 * once the toolbar is up would let it flash at its own position first. Instead it
 * is hidden in the same turn as the selection, and shown again only if the shared
 * toolbar never arrives (grace), which keeps the cross-row fallback working.
 */
function refreshMarker() {
	const bar = document.querySelector(`.${ANNOTATION_BAR_CLASS}`);
	// The editor card counts as the toolbar being up: after 批注 the bar is gone but
	// the standalone quote button must not pop back over the open card.
	const card = document.querySelector(`.${ANNOTATION_CARD_CLASS}`);
	const state = selectionState();
	const waiting = state.active && state.inTranscript && (Date.now() - lastSelectionAt) < GRACE_MS;
	// While the pointer is down the shared box deliberately waits for the release, so
	// neither the box nor the grace window can justify hiding the standalone button —
	// the hold itself must, or a pause mid-drag exposes it.
	const hide = bar !== null || card !== null || waiting || isDragging();
	const root = document.documentElement;
	if (hide) {
		if (!root.hasAttribute(HIDE_ATTR))
			root.setAttribute(HIDE_ATTR, "1");
	}
	else if (root.hasAttribute(HIDE_ATTR)) {
		root.removeAttribute(HIDE_ATTR);
	}
	diagnostics.barUp = bar !== null;
	diagnostics.cardUp = card !== null;
	diagnostics.quoteButtonHidden = hide;
	return hide;
}

/** Runs inside the selectionchange turn: no frame may pass with both UIs up. */
function onSelectionChange(layer) {
	try {
		lastSelectionAt = Date.now();
		refreshMarker();
		diagnostics.selection = describeSelection();
		persistDiagnostics();
		armGraceRefresh();
	}
	catch (_) { /* diagnostics only */ }
}

/**
 * Re-evaluate once the grace window closes: by then either the shared toolbar is
 * up (the marker stays) or it never came (the standalone button is released).
 * One timer per selection replaces polling for the whole window.
 */
function armGraceRefresh() {
	try {
		if (graceTimer !== null)
			clearTimeout(graceTimer);
	}
	catch (_) { /* no timers: the safety interval still re-evaluates */ }
	try {
		graceTimer = setTimeout(() => {
			graceTimer = null;
			try {
				refreshMarker();
			}
			catch (_) { /* diagnostics only */ }
		}, GRACE_MS);
	}
	catch (_) {
		graceTimer = null;
	}
}

/**
 * Follow the toolbar through the DOM instead of asking for it 25 times a second.
 *
 * The bar and the editor card are direct children of the annotation host, and the
 * host itself is a direct child of <body>, so two childList observers cover every
 * appearance and disappearance; <head> is watched as well so a stylesheet removed
 * behind our back is noticed at once. If the host ever moves somewhere else, the
 * safety interval still keeps the marker honest.
 */
function observeToolbar(layer) {
	const body = document.body ?? document.documentElement;
	// `observing` is tracked separately from the host identity: on the first pass the
	// host does not exist yet, and comparing null to null used to skip the initial
	// observe() call outright — leaving the page unwatched.
	const state = { host: null, observer: null, observing: false };
	const sync = () => {
		if (state.observer === null)
			return;
		const host = document.querySelector(ANNOTATION_HOST_SELECTOR);
		if (state.observing && host === state.host)
			return;
		state.observing = true;
		state.host = host;
		try {
			state.observer.disconnect();
		}
		catch (_) { /* already gone */ }
		for (const target of [body, document.head, host]) {
			if (target === null || target === undefined)
				continue;
			try {
				state.observer.observe(target, { childList: true });
			}
			catch (_) { /* an unobservable target must not stop the rest */ }
		}
	};
	try {
		state.observer = new MutationObserver(() => {
			try {
				sync();
				ensureStylesheet(layer);
				refreshMarker();
			}
			catch (_) { /* diagnostics only */ }
		});
	}
	catch (_) {
		state.observer = null;
	}
	sync();
	return () => {
		try {
			if (state.observer !== null)
				state.observer.disconnect();
		}
		catch (_) { /* already gone */ }
	};
}

/** Steady state: keep the marker honest and sample the environment occasionally. */
function heartbeat(layer) {
	try {
		// Self-heal: a hot swap can dispose the predecessor after the successor
		// mounted, and its teardown may have taken shared resources away. Claiming
		// ownership here keeps the live layer in charge of them.
		ensureStylesheet(layer);
		if (window[ACTIONS_KEY] === undefined && layer.context !== undefined)
			installActions(layer.context, layer);
		refreshMarker();
		const now = Date.now();
		if (now - lastSampleAt >= SAMPLE_MS && diagnosticsAllowed()) {
			lastSampleAt = now;
			sampleEnvironment();
		}
	}
	catch (error) {
		diagnostics.lastError = String((error !== null && error !== undefined && error.message) || error);
	}
}

/**
 * Mount the glue: publish the actions the toolbar renders, add the stylesheet,
 * and start the marker heartbeat. Safe to call before the vendored plugins mount.
 * @param ctx - cordis context carrying the injected client services.
 * @returns disposer that removes every trace of this bundle.
 */
function mountSelectionToolbar(ctx) {
	const layer = { id: "dsh-selection-group", mountedAt: Date.now(), context: ctx };
	installActions(ctx, layer);
	ensureStylesheet(layer);
	try {
		document.documentElement.setAttribute(MARKER_ATTR, CLIENT_VERSION);
	}
	catch (_) { /* diagnostics only */ }

	// A per-layer wrapper, never a shared function: two live layers would otherwise
	// register the same listener object (addEventListener dedupes it) and the first
	// dispose would remove it for both.
	const onSelection = () => onSelectionChange(layer);
	document.addEventListener("selectionchange", onSelection);
	liveLayers.add(layer);
	const stopObserving = observeToolbar(layer);

	// The patched toolbar asks whether a drag is in flight. While the pointer is
	// down the box is held back: every drag frame fires selectionchange, and
	// crossing a message boundary closes the box once — which made it flicker.
	// The release runs a selectionchange in its own turn, so the box appears with
	// no settle delay at all.
	try {
		window[DRAGGING_KEY] = isDragging;
	}
	catch (_) { /* a frozen window must not stop the bundle */ }
	const onPointerDown = () => {
		setDragging(true);
		refreshMarker();
	};
	const onPointerUp = () => {
		if (isDragging() === false)
			return;
		setDragging(false);
		try {
			if (typeof window.Event === "function")
				document.dispatchEvent(new window.Event("selectionchange"));
		}
		catch (_) { /* the next selectionchange will paint instead */ }
	};
	document.addEventListener("pointerdown", onPointerDown, true);
	document.addEventListener("pointerup", onPointerUp, true);
	document.addEventListener("pointercancel", onPointerUp, true);
	document.addEventListener("mousedown", onPointerDown, true);
	document.addEventListener("mouseup", onPointerUp, true);
	let interval = null;
	try {
		interval = setInterval(() => heartbeat(layer), TICK_MS);
	}
	catch (_) { /* without timers the toolbar still works; only the marker sleeps */ }
	heartbeat(layer);
	diagnostics.applied = true;
	diagnostics.mountedAt = new Date().toISOString();
	persistDiagnostics();

	return () => {
		try {
			if (interval !== null)
				clearInterval(interval);
		}
		catch (_) { /* already gone */ }
		try {
			document.removeEventListener("selectionchange", onSelection);
		}
		catch (_) { /* already gone */ }
		stopObserving();
		try {
			document.removeEventListener("pointerdown", onPointerDown, true);
			document.removeEventListener("pointerup", onPointerUp, true);
			document.removeEventListener("pointercancel", onPointerUp, true);
			document.removeEventListener("mousedown", onPointerDown, true);
			document.removeEventListener("mouseup", onPointerUp, true);
		}
		catch (_) { /* already gone */ }
		liveLayers.delete(layer);
		if (liveLayers.size === 0) {
			try {
				if (graceTimer !== null)
					clearTimeout(graceTimer);
			}
			catch (_) { /* already gone */ }
			graceTimer = null;
		}
		// Only the last layer out clears the page-wide marker and captures: a successor
		// may already be live and still needs them (its heartbeat re-evaluates the
		// marker on the next tick).
		if (liveLayers.size === 0) {
			try {
				document.documentElement.removeAttribute(HIDE_ATTR);
				document.documentElement.removeAttribute(MARKER_ATTR);
			}
			catch (_) { /* already gone */ }
			releaseCaptures();
			try {
				delete window[DRAGGING_KEY];
				delete window[DRAGGING_STATE_KEY];
			}
			catch (_) { /* already gone */ }
			// Nothing left to diagnose: cancel the expiry timer and the pending write, or
			// an unmounted plugin would keep the page (and any test process) waiting for
			// a timer nobody is interested in any more.
			try {
				const diagnosticsTimer = window[DIAGNOSTICS_TIMER_KEY];
				if (diagnosticsTimer !== undefined)
					clearTimeout(diagnosticsTimer);
				delete window[DIAGNOSTICS_TIMER_KEY];
				delete window[DIAGNOSTICS_DEADLINE_KEY];
			}
			catch (_) { /* already gone */ }
			try {
				if (persistTimer !== null) {
					clearTimeout(persistTimer);
					persistTimer = null;
				}
			}
			catch (_) { /* already gone */ }
		}
		// Only the owner removes shared resources: a successor may already be live
		// and reusing them (it claims ownership on its next ensure).
		const style = document.getElementById(STYLE_ID);
		if (style !== null && styleOwner === layer)
			style.remove();
		if (styleOwner === layer)
			styleOwner = null;
		if (actionsOwner === layer) {
			actionsOwner = null;
			if (window[ACTIONS_KEY] !== undefined)
				delete window[ACTIONS_KEY];
		}
		diagnostics.applied = false;
		diagnostics.disposedAt = new Date().toISOString();
		persistDiagnostics();
	};
}
//#endregion
