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
/**
 * The Side Chat surface this bundle talks to: `dsh-better-sidebar`'s own host
 * route and the tab type that owns the per-session Side Chat view.
 *
 * The sidebar service (`ctx.betterSidebar`) is the extension face that plugin
 * publishes to other plugins, and `openTab` is its documented entry point. The
 * thread itself has no consumer API — the tab view creates it through
 * `POST /sidebar/api/sidechat.start` — so the 侧边对话 action creates the thread
 * first and then opens the tab bound to it, which is exactly the order that
 * plugin's own "new thread" menu uses (park the id, then open).
 *
 * The thread is created with an EMPTY question (that plugin's Codex-style
 * immediate create) and the selection is then placed in the tab's own composer
 * as a quote: nothing is sent, so opening a side chat costs no tokens and the
 * person decides when — and whether — the context is submitted.
 *
 * Reaching a neighbour's route and its DOM is a deliberate coupling, so every
 * absence degrades: no `betterSidebar` service means the action is not offered
 * at all; a route that is missing, refuses (the parent session is not running)
 * or answers garbage surfaces as a notice; an unopened workbench (no composer
 * to write into) says so instead of pretending the quote landed.
 */
const SIDECHAT_ROUTE = "sidebar/api/sidechat.start";
const SIDECHAT_TAB_TYPE = "sidechat";
/**
 * The key `dsh-better-sidebar` keeps its last thread per session under, so a tab
 * that opens later reattaches to the thread instead of minting a second one.
 * Written to before the tab opens; an absent or unreadable store only means the
 * thread is reachable from the tab's own thread menu instead of automatically.
 */
const SIDECHAT_LAST_THREAD_KEY = "dsh-sidebar:v1:sidechat-thread";
/** Max code points of the selection that is placed in the side chat. */
const SIDECHAT_MAX_CHARS = 4000;
/** Mark on the composer we filled, so a re-run can find the field we already own. */
const SIDECHAT_DRAFT_MARK_ATTR = "data-dsh-selection-group-sidechat-draft";
/**
 * How long the tab's composer is given to mount, in milliseconds (its view is a
 * lazy chunk). {@link sidechatDraftPollMs} reads this when the window carries no
 * override.
 */
const SIDECHAT_DRAFT_POLL_MS = 4000;
/**
 * The wait actually used, so a test can shorten it through a window switch the
 * same way the diagnostics TTL can be set before load — a test that exercises
 * "the composer never appeared" must not wait the production four seconds for it.
 */
function sidechatDraftPollMs() {
	try {
		const requested = Number(window.__DSH_SELECTION_GROUP_SIDECHAT_POLL_MS__);
		if (Number.isFinite(requested) && requested >= 0)
			return requested;
	}
	catch (_) { /* keep the default window */ }
	return SIDECHAT_DRAFT_POLL_MS;
}
const SIDECHAT_NOTICE_ID = "dsh-selection-group-sidechat-notice";
const SIDECHAT_NOTICE_MS = 8000;
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
 * Let a leaked timer keep the page alive? Never.
 *
 * Browsers have no `unref`, so this is a no-op there; where it does exist it means a
 * timer that outlived an unmounted plugin cannot hold the whole process open (which
 * turned a failing test into a hung CI job instead of a red one).
 */
function unrefTimer(timer) {
	try {
		if (timer !== null && timer !== undefined && typeof timer.unref === "function")
			timer.unref();
	}
	catch (_) { /* nothing to do */ }
	return timer;
}

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
/** The context the published actions close over, and whether they carried 侧边对话. */
let actionsInstalledFor = null;
let actionsSidechatSeen = false;
/** Layers currently mounted — a hot swap can have a successor live before the predecessor goes. */
const liveLayers = new Set();
/** When the current selection was last seen (for the grace window). */
let lastSelectionAt = 0;
/** When the environment was last sampled. */
let lastSampleAt = 0;
/** One-shot re-evaluation after a selection, so the marker is not polled for. */
let graceTimer = null;
/** 侧边对话: whether one send is in flight (a second press would ride over it). */
let sidechatRunning = false;
/**
 * 侧边对话's failure notice and its deadline. Both live here, not on the layer:
 * the notice outlives a hot swap's predecessor (the press that produced it may
 * belong to the layer being replaced), and the LAST layer out is what clears it.
 */
let sidechatNoticeTimer = null;
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
	vendoredMount: null,
	/** 侧边对话: what the action last did, and the neighbour service it needs. */
	sidechatEnabled: false,
	sidechatService: null,
	// "inserted" | "no-composer" | "no-session" | "failed" | null
	sidechatLast: null,
	sidechatLastThread: null,
	sidechatLastError: null
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
		persistTimer = unrefTimer(setTimeout(() => {
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
		}, 250));
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
		window[DIAGNOSTICS_TIMER_KEY] = unrefTimer(setTimeout(() => {
			try {
				delete window[DIAGNOSTICS_TIMER_KEY];
			}
			catch (_) { /* already gone */ }
			diagnosticsAllowed();
		}, ttl));
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
			// The same two gates the toolbar itself uses, so a diagnostic reads as the
			// decision that was actually taken (a sidebar selection reports false).
			inTranscript: typeof el.closest === "function" && el.closest('[data-slot="conversation.session"]') !== null && !isInRightSidebar(el),
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

/**
 * Whether the interface is running in English. Every injected action needs the
 * same answer, and asking the locale service must never throw into a toolbar
 * render: an absent or unreadable service simply reads as Chinese, the plugin's
 * own default.
 */
function ctxIsEnglish(ctx) {
	try {
		const snapshot = ctx !== null && ctx !== undefined && ctx.locale !== null && ctx.locale !== undefined && typeof ctx.locale.getSnapshot === "function"
			? ctx.locale.getSnapshot()
			: null;
		return snapshot !== null && snapshot !== undefined && String(snapshot.active || "").toLowerCase().startsWith("en");
	}
	catch (_) {
		return false;
	}
}

/** The 引用 action: hand the click to dsh-quote-followup's own button. */
function quoteAction(ctx) {
	const english = ctxIsEnglish(ctx);
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

//#region 侧边对话 (dsh-better-sidebar)
/** A real service, not whatever a context's `get` handed back. */
function isSidebarService(service) {
	return service !== null && service !== undefined && typeof service === "object" && typeof service.openTab === "function";
}

/**
 * The sidebar service, when the neighbour plugin is mounted. It is read
 * defensively for two reasons: the service is not in this bundle's `inject`
 * list (an absent service must simply mean "the action is not offered", never a
 * fiber that never applies), and it can register after this bundle mounts, so
 * the answer is re-read on every render instead of being cached at mount.
 */
function sidebarService(ctx) {
	try {
		const get = ctx !== null && ctx !== undefined && typeof ctx.get === "function" ? ctx.get.bind(ctx) : null;
		if (get === null)
			return null;
		const service = get("betterSidebar") ?? null;
		return isSidebarService(service) ? service : null;
	}
	catch (_) {
		return null;
	}
}

/** Whether the 侧边对话 action can work right now. */
function sidechatAvailable(ctx) {
	const service = sidebarService(ctx);
	recordDiagnostics({
		sidechatEnabled: service !== null,
		sidechatService: service === null ? "missing" : String(service.version || "present")
	});
	return service !== null;
}

/**
 * The conversation the selection lives in. Same resolution the vendored quote
 * plugin uses (DSH 0.1.7's UI adapter first, the older session list as the
 * fallback) — scoping the thread to the wrong conversation would seed it with
 * another session's history, so no id means no action.
 */
function currentSessionId(ctx) {
	try {
		const get = ctx !== null && ctx !== undefined && typeof ctx.get === "function" ? ctx.get.bind(ctx) : null;
		const uiSession = get === null ? null : get("uiSession");
		const current = uiSession !== null && uiSession !== undefined && uiSession.adapter !== undefined && uiSession.adapter !== null
			? uiSession.adapter.current
			: null;
		if (current !== null && current !== undefined && typeof current.getSnapshot === "function") {
			const key = current.getSnapshot()?.key;
			if (typeof key === "string" && key !== "")
				return key;
		}
		const sessions = (get === null ? null : get("sessions")) ?? (ctx === null || ctx === undefined ? null : ctx.sessions);
		const snapshot = sessions !== null && sessions !== undefined && sessions.list !== undefined && sessions.list !== null
			&& typeof sessions.list.getSnapshot === "function"
			? sessions.list.getSnapshot()
			: null;
		const fallback = snapshot === null || snapshot === undefined ? undefined : snapshot.current;
		return typeof fallback === "string" && fallback !== "" ? fallback : null;
	}
	catch (_) {
		return null;
	}
}

/** The text the person selected, trimmed, or "" when there is nothing usable. */
function selectedTextNow() {
	try {
		const selection = typeof document.getSelection === "function" ? document.getSelection() : null;
		if (selection === null || selection.isCollapsed === true || selection.rangeCount === 0)
			return "";
		return String(selection.toString() || "").trim();
	}
	catch (_) {
		return "";
	}
}

/** Cap the inserted text; an empty excerpt never earns a side chat. */
function truncateSidechatText(text) {
	const characters = Array.from(text);
	if (characters.length <= SIDECHAT_MAX_CHARS)
		return text;
	return `${characters.slice(0, SIDECHAT_MAX_CHARS).join("")}…`;
}

/**
 * The text the action puts in the side chat's own composer: the selection,
 * verbatim — no wrapper, no `>` prefix, no heading. It reads as if the person
 * had pasted it themselves, which is the point: they add their own question and
 * send when they are ready. The thread is NOT sent, so opening a side chat costs
 * no tokens either.
 */
function sidechatInsertText(text) {
	return text;
}

/**
 * Mirror the thread id under the key the neighbour plugin's Side Chat tab reads
 * BEFORE the tab opens: that plugin's descriptor mints its tab without a seed,
 * and the tab's own mount reattaches to "the thread this session was last in" —
 * so writing here is what makes the new tab show the thread that was just
 * created instead of minting a second, empty one.
 */
function storeSidechatThread(sessionId, childId) {
	try {
		const raw = window.localStorage.getItem(SIDECHAT_LAST_THREAD_KEY);
		const parsed = raw === null ? null : JSON.parse(raw);
		const map = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
		map[sessionId] = childId;
		window.localStorage.setItem(SIDECHAT_LAST_THREAD_KEY, JSON.stringify(map));
	}
	catch (_) { /* storage denied or full: the thread stays reachable from the tab's own thread menu */ }
}

/** Read one JSON envelope off the route. A prefix route answers JSON for every path. */
async function readSidechatEnvelope(response) {
	const parsed = await response.json().catch(() => null);
	if (parsed === null || parsed === undefined || parsed.ok !== true)
		return { ok: false, error: parsed?.error?.message ?? `HTTP ${response.status}` };
	const childId = parsed.value?.childId;
	if (typeof childId !== "string" || childId === "")
		return { ok: false, error: "the side chat route returned no thread id" };
	return { ok: true, childId };
}

/**
 * Create one EMPTY side thread and open its tab.
 *
 * `question: ''` is that plugin's own Codex-style immediate create: the thread
 * holds its inherited-context snapshot in wait, and its composer owns the first
 * message. Nothing is sent, so this costs no tokens — the context is only
 * submitted once the person presses send.
 */
async function prepareSideChat(ctx, sessionId) {
	if (typeof window.fetch !== "function")
		return { ok: false, error: "this page has no fetch to reach the side chat route with" };
	const response = await window.fetch(hostRoute(SIDECHAT_ROUTE), {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ sessionId, question: "" })
	});
	const envelope = await readSidechatEnvelope(response);
	if (envelope.ok === false)
		return { ok: false, error: envelope.error };
	storeSidechatThread(sessionId, envelope.childId);
	try {
		sidebarService(ctx)?.openTab({ type: SIDECHAT_TAB_TYPE }, { sessionId });
	}
	catch (error) {
		// The thread exists either way: the person reaches it from the workbench's
		// thread menu, so an open failure is reported without undoing it.
		return { ok: false, error: `the thread was created but its tab did not open: ${String((error !== null && error !== undefined && error.message) || error)}`, childId: envelope.childId };
	}
	return { ok: true, childId: envelope.childId };
}

/**
 * How deep the send button may sit below the textarea's own container.
 *
 * TWO is the neighbour's real shape: the field and the bar are siblings inside
 * the composer card, and the button is the BAR's direct child — one level below
 * the card. Scans that looked only at the container's direct children (or that
 * climbed further up looking for an ancestor that owns both) missed it entirely,
 * which is why this number exists and is measured against the real nesting.
 *
 * The button is still required to sit inside the very container that directly
 * holds the field, so nothing on the page can match from a distance.
 */
const SIDECHAT_SEND_REACH = 2;

/** The Side Chat send control (`sideChatSend` in that plugin's locales). */
function isSideChatSendButton(element) {
	if (element === null || element === undefined || typeof element.getAttribute !== "function")
		return false;
	const title = String(element.getAttribute("title") || "").trim();
	return title === "发送" || title === "Send";
}

/** Whether one container holds the send button no deeper than {@link SIDECHAT_SEND_REACH}. */
function holdsSideChatSend(container) {
	if (container === null || container === undefined)
		return false;
	for (const child of container.children) {
		if (isSideChatSendButton(child))
			return true;
	}
	for (const child of container.children) {
		for (const grandchild of child.children) {
			if (isSideChatSendButton(grandchild))
				return true;
		}
	}
	return false;
}

/**
 * The Side Chat composer currently on screen.
 *
 * The neighbour gives consumers no draft API, so the composer is found
 * STRUCTURALLY — never by its hashed module class names
 * (`_4BEzFa_sidechatComposerInput`), which a rebuild renames.
 *
 * The shape is the neighbour's (SideChatView's composer card):
 *
 *     <div class="…sidechatComposer">          ← the container: it directly holds…
 *       <textarea class="…sidechatComposerInput" />   ← …this field (distance 0)
 *       <div class="…sidechatComposerBar">            ← …and this bar (distance 1)
 *         <button title="发送" | "Send" />            ← whose child is the send button (distance 2)
 *       </div>
 *     </div>
 *
 * Four wrong walks came before it, and each one is a rule below:
 *
 *   1. "the container's first child is a button" — the first child is the TEXTAREA,
 *      so it matched nothing and every press timed out (the reported failure);
 *   2. "the button's `closest('div')` is the container" — that lands on the BAR,
 *      which holds no field;
 *   3. "climb until an ancestor CONTAINS the button" — it climbed past the
 *      boundary and wrote the selection into an unrelated textarea on the page;
 *   4. "the container must DIRECTLY own the button" — false for the real shape,
 *      because the button is the BAR's child, not the card's.
 *
 * So: from each textarea, the container that directly holds it must also hold the
 * send button within two levels. Several candidates can match (another textarea
 * sharing an ancestor), so the CLOSEST textarea to the button wins — the nearest
 * common container. A page without a send button has no side chat composer.
 */
function findSideChatComposer() {
	try {
		let best = null;
		let bestDistance = Number.POSITIVE_INFINITY;
		for (const field of document.querySelectorAll("textarea")) {
			let container = field.parentElement;
			for (let depth = 0; container !== null && container !== undefined && depth < 2; depth += 1) {
				if (container !== (document.body ?? document.documentElement)) {
					let ownsField = false;
					for (const child of container.children) {
						if (child === field) {
							ownsField = true;
							break;
						}
					}
					if (ownsField && holdsSideChatSend(container)) {
						const distance = depth + 1;
						if (distance < bestDistance) {
							best = field;
							bestDistance = distance;
						}
					}
				}
				container = container.parentElement;
			}
		}
		return best;
	}
	catch (_) { /* an unreadable document means no composer */ }
	return null;
}

/**
 * Put the text in that composer, cursor at the end.
 *
 * React 18 installs its own `value` property on controlled inputs and compares
 * against the tracked value, so a plain `field.value = …` is reverted on the
 * next render. Writing through the prototype's setter (leaving the React-owned
 * own property alone) and dispatching a bubbling `input` makes React accept the
 * change as a user edit, which is the officially prescribed way to drive a
 * controlled input from outside. Existing text is preserved: this appends.
 */
function prefillSideChatComposer(field, text) {
	try {
		const separator = field.value.trim() === "" ? "" : "\n\n";
		const next = `${field.value}${separator}${text}`;
		// Walk past any OWN accessor (React installs one on the element) to the
		// nearest PROTOTYPE `value` setter, and bind it to the element: the native
		// slot is what the rest of the page — and the draft's own reader — sees.
		let owner = Object.getPrototypeOf(field);
		let setter;
		while (owner !== null && owner !== undefined) {
			setter = Object.getOwnPropertyDescriptor(owner, "value")?.set;
			if (typeof setter === "function")
				break;
			owner = Object.getPrototypeOf(owner);
		}
		if (typeof setter === "function")
			setter.call(field, next);
		else
			field.value = next;
		field.dispatchEvent(new window.Event("input", { bubbles: true }));
		field.setAttribute(SIDECHAT_DRAFT_MARK_ATTR, CLIENT_VERSION);
		try {
			field.setSelectionRange(next.length, next.length);
		}
		catch (_) { /* a detached field cannot take a selection */ }
		try {
			field.focus();
		}
		catch (_) { /* focus is a nicety, not the contract */
		}
		return field.value === next;
	}
	catch (_) {
		return false;
	}
}

/** Wait for the tab's composer, polling briefly. Null means it never mounted. */
function waitForSideChatComposer(timeoutMs) {
	const pollMs = Math.max(1, Math.round(sidechatDraftPollMs() / 10));
	const deadline = Date.now() + timeoutMs;
	return new Promise((resolve) => {
		const attempt = () => {
			const field = findSideChatComposer();
			if (field !== null) {
				resolve(field);
				return;
			}
			if (Date.now() >= deadline) {
				resolve(null);
				return;
			}
			unrefTimer(setTimeout(attempt, pollMs));
		};
		attempt();
	});
}


/**
 * The route URL, resolved against the page's own base.
 *
 * Never built with a leading slash: that pins the request to the origin root,
 * so a GUI served under a reverse-proxy directory (or the desktop shell's
 * `dsh-app://app/` page, whose non-static paths the shell forwards to the host)
 * would send it outside the prefix. `document.baseURI` is the base the desktop
 * shell's own UI uses for the same requests.
 */
function hostRoute(path) {
	try {
		return new URL(path.replace(/^\/+/, ""), document.baseURI).href;
	}
	catch (_) {
		return path;
	}
}

/** A one-line notice under the transcript; the action runs off the click, so a
 *  refusal has nowhere else to speak. */
function showSidechatNotice(text) {
	try {
		const host = document.body ?? document.documentElement;
		if (host === null || host === undefined || typeof host.appendChild !== "function")
			return;
		let notice = document.getElementById(SIDECHAT_NOTICE_ID);
		if (notice === null) {
			notice = document.createElement("div");
			notice.id = SIDECHAT_NOTICE_ID;
			notice.setAttribute(MARKER_ATTR, CLIENT_VERSION);
			notice.setAttribute("data-dsh-selection-group-sidechat-notice", "1");
			notice.style.cssText = [
				"position: fixed",
				"left: 50%",
				"bottom: 96px",
				"transform: translateX(-50%)",
				"max-width: min(560px, 82vw)",
				"padding: 8px 12px",
				"border-radius: 8px",
				"background: var(--dsh-color-surface-2, rgba(20, 20, 20, 0.92))",
				"color: var(--dsh-color-text-1, #fff)",
				"font-size: 12px",
				"line-height: 1.5",
				"box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28)",
				"z-index: 2147483000"
			].join(";");
			host.appendChild(notice);
		}
		notice.textContent = text;
		if (sidechatNoticeTimer !== null) {
			try {
				clearTimeout(sidechatNoticeTimer);
			}
			catch (_) { /* already gone */ }
		}
		sidechatNoticeTimer = unrefTimer(setTimeout(() => {
			sidechatNoticeTimer = null;
			try {
				document.getElementById(SIDECHAT_NOTICE_ID)?.remove();
			}
			catch (_) { /* already gone */ }
		}, SIDECHAT_NOTICE_MS));
	}
	catch (_) { /* a notice must never break the action it explains */ }
}

/** Drop the notice now (the last layer out, so a test process can exit). */
function clearSidechatNotice() {
	if (sidechatNoticeTimer !== null) {
		try {
			clearTimeout(sidechatNoticeTimer);
		}
		catch (_) { /* already gone */ }
		sidechatNoticeTimer = null;
	}
	try {
		document.getElementById(SIDECHAT_NOTICE_ID)?.remove();
	}
	catch (_) { /* already gone */ }
}

/**
 * The 侧边对话 action: put the selection into a side chat's composer as plain
 * text — and NOT send it.
 *
 * The excerpt is read and the shared box is closed IN THIS TURN (the click's own
 * turn, where the selection is still alive). What follows is asynchronous:
 * create an empty thread, open its tab, wait for that tab's composer to mount,
 * then write the text into it verbatim. Nothing is sent, so nothing is billed
 * until the person presses send themselves. A second press while one is in
 * flight is ignored rather than racing it.
 */
function sideChatAction(ctx) {
	const english = ctxIsEnglish(ctx);
	return {
		id: "sidechat",
		label: english ? "◧ Side chat" : "◧ 侧边对话",
		title: english
			? "Put the selection in a side conversation's composer, as plain text — it stays there until you send it"
			: "把选中文字原样放进侧边对话的输入框，发送与否由你决定（不自动发出）",
		run: () => {
			if (sidechatRunning)
				return;
			const text = selectedTextNow();
			// The patched toolbar is only rendered for a live transcript selection;
			// re-check anyway so a press that lost it reports instead of opening an
			// empty side chat.
			if (text === "") {
				showSidechatNotice(english
					? "Nothing to quote: select text in the conversation first."
					: "没有可引用的内容：请先在对话里选中文字。");
				return;
			}
			const sessionId = currentSessionId(ctx);
			closeSharedToolbar();
			if (sessionId === null) {
				recordDiagnostics({
					sidechatLast: "no-session",
					sidechatLastThread: null,
					sidechatLastError: "the current session id is unavailable"
				});
				showSidechatNotice(english
					? "Could not resolve the current conversation, so no side chat was created."
					: "无法确定当前会话，侧边对话没有创建。");
				return;
			}
			const insert = sidechatInsertText(truncateSidechatText(text));
			sidechatRunning = true;
			prepareSideChat(ctx, sessionId).then(async (result) => {
				if (result.ok === false) {
					sidechatRunning = false;
					recordDiagnostics({
						sidechatLast: "failed",
						sidechatLastThread: result.childId ?? null,
						sidechatLastError: String(result.error)
					});
					showSidechatNotice(english
						? `Side chat failed: ${String(result.error)}`
						: `侧边对话失败：${String(result.error)}`);
					return;
				}
				// The tab mounts asynchronously (its view is a lazy chunk), so wait
				// briefly for its composer before giving up on the prefill.
				const field = await waitForSideChatComposer(sidechatDraftPollMs());
				if (field === null) {
					sidechatRunning = false;
					recordDiagnostics({
						sidechatLast: "no-composer",
						sidechatLastThread: result.childId,
						sidechatLastError: "the side chat tab was opened but its composer never mounted"
					});
					showSidechatNotice(english
						? `The side chat composer did not appear within ${(sidechatDraftPollMs() / 1000).toFixed(0)}s, so the quote was not placed. Open the bottom workbench and press the button again.`
						: `侧边对话输入框在 ${(sidechatDraftPollMs() / 1000).toFixed(0)} 秒内没有出现，引用没有放进去。请先展开右侧底部工作台，再按一次。`);
					return;
				}
				const placed = prefillSideChatComposer(field, insert);
				sidechatRunning = false;
				recordDiagnostics({
					sidechatLast: placed ? "inserted" : "no-composer",
					sidechatLastThread: result.childId,
					sidechatLastError: placed ? null : "the side chat composer refused the draft"
				});
				if (!placed) {
					showSidechatNotice(english
						? "The side chat composer appeared but refused the text; the selection was not placed."
						: "侧边对话输入框出现了，但没能写进去；选中文字没有放进去。");
				}
			}).catch((error) => {
				sidechatRunning = false;
				const message = String((error !== null && error !== undefined && error.message) || error);
				recordDiagnostics({ sidechatLast: "failed", sidechatLastThread: null, sidechatLastError: message });
				showSidechatNotice(english ? `Side chat failed: ${message}` : `侧边对话失败：${message}`);
			});
		}
	};
}
//#endregion

/** Publish the actions the patched annotation toolbar renders. */
function installActions(ctx, layer) {
	// Rebuilt on every render on purpose: the neighbour service can register
	// after this bundle mounts, and a stale action list would then never grow its
	// 侧边对话 button.
	const actions = () => {
		const list = [quoteAction(ctx)];
		try {
			if (sidechatAvailable(ctx))
				list.push(sideChatAction(ctx));
		}
		catch (error) {
			diagnostics.lastError = `the 侧边对话 action could not be published: ${String((error !== null && error !== undefined && error.message) || error)}`;
		}
		return list;
	};
	try {
		window[ACTIONS_KEY] = actions;
		actionsOwner = layer === undefined ? actionsOwner : layer;
		actionsInstalledFor = ctx;
		actionsSidechatSeen = sidechatAvailable(ctx);
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

/**
 * Whether a node sits in the right column (the sidebar: file tree, file viewers,
 * side chat, terminal, tasks…).
 *
 * This package's toolbar is a CHAT affordance. A file viewer has its own
 * "add selection to conversation" action, and a box offering 批注 / 引用 /
 * 侧边对话 over a source file is noise at best and a wrong-context action at
 * worst. The shared box is also only ever rendered for a transcript selection
 * (see the build-time patch on the annotation plugin) — this guard makes the
 * standalone quote button and the marker agree with that, so the right column
 * never grows a toolbar and never has the standalone button released either.
 */
function isInRightSidebar(element) {
	try {
		return element !== null && element !== undefined && typeof element.closest === "function"
			&& element.closest('[data-slot="sidebar"], [data-slot^="sidebar."]') !== null;
	}
	catch (_) {
		return false;
	}
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
			&& el.closest('[data-slot="conversation.session"]') !== null
			&& !isInRightSidebar(el);
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
		graceTimer = unrefTimer(setTimeout(() => {
			graceTimer = null;
			try {
				refreshMarker();
			}
			catch (_) { /* diagnostics only */ }
		}, GRACE_MS));
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
		else if (layer.context !== undefined && actionsInstalledFor === layer.context && sidechatAvailable(layer.context) !== actionsSidechatSeen)
			// The neighbour registered after this layer published its actions. A
			// selection made in that window would still offer two buttons, so the
			// moment the service shows up the hook is republished (the toolbar reads
			// the list again on its next render).
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
		interval = unrefTimer(setInterval(() => heartbeat(layer), TICK_MS));
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
			// The notice is page-wide and its timer would otherwise hold a test
			// process open; an in-flight send is left to settle on its own (it holds
			// no listener and its result only touches the diagnostics).
			clearSidechatNotice();
			sidechatRunning = false;
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
