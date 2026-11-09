/** Plugin-detail preferences and an owned override of DSH's native quote seat. */
const SETTINGS_STORAGE_KEY = "dsh-selection-group.settings.v1";
const NATIVE_QUOTE_SLOT = "conversation.chat.text-interaction";
const SETTINGS_PACKAGE = "dsh-selection-group";

const settingsMessages = {
	zh: {
		title: "引用设置", label: "关闭 DSH 自带引用",
		help: "关闭选中文字后的原生“引用文本”按钮。本插件的引用功能和消息中的引用显示仍可使用。",
		on: "已关闭原生引用入口", off: "保留原生引用入口",
		waiting: "原生引用入口加载后，开关将自动生效。",
		saved: "设置已保存", readError: "无法读取设置，沿用当前状态。",
		saveError: "无法保存设置，开关未更改。请重试。",
		applyError: "无法应用设置，请重新加载插件后重试。",
		unavailable: "当前 DSH 未提供设置所需的界面接口，请更新 DSH 后重试。",
	},
	en: {
		title: "Quote settings", label: "Disable DSH built-in quote",
		help: "Turn off the native “Quote text” action shown after selecting text. This plugin’s quote action and existing quotes in messages remain available.",
		on: "Built-in quote action disabled", off: "Built-in quote action enabled",
		waiting: "This setting will take effect when the built-in quote action loads.",
		saved: "Setting saved", readError: "Settings could not be read. The current state is kept.",
		saveError: "Settings could not be saved. The switch was not changed. Try again.",
		applyError: "Settings could not be applied. Reload the plugin and try again.",
		unavailable: "This DSH version does not provide the required UI interface. Update DSH and try again.",
	},
};

function mountNativeQuoteSettings(ctx) {
	let slots;
	try { slots = ctx.slots ?? ctx.get?.("slots"); } catch (_) { /* optional on legacy hosts */ }
	const supported = typeof slots?.inject === "function" && typeof slots?.register === "function";
	const listeners = new Set();
	let disposed = false;
	let stopOverride = null;
	let disableNativeQuote = false;
	let error = null;
	const language = () => {
		try { return String(ctx.locale?.getSnapshot?.()?.active ?? "zh").startsWith("en") ? "en" : "zh"; }
		catch (_) { return "zh"; }
	};
	const readPreference = () => {
		const record = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "{}");
		return record?.disableNativeQuote !== false;
	};
	try { disableNativeQuote = readPreference(); } catch (_) { error = "readError"; }
	let snapshot = { disableNativeQuote, active: false, supported, language: language(), error, saved: false };
	const publish = (changes = {}) => {
		if (disposed) return;
		snapshot = { ...snapshot, ...changes };
		for (const listener of [...listeners]) listener();
	};
	const stopNativeOverride = () => {
		stopOverride?.(); stopOverride = null;
		publish({ active: false });
	};
	const startNativeOverride = () => {
		if (!supported || stopOverride !== null) return;
		let live = true;
		let stopInjection;
		let injecting = true;
		let registrationFailure = null;
		const registrations = new Set();
		const release = () => {
			if (!live) return;
			live = false;
			if (typeof stopInjection === "function") stopInjection();
			for (const stop of [...registrations]) stop();
			registrations.clear();
		};
		try {
			stopInjection = slots.inject(NATIVE_QUOTE_SLOT, () => {
				if (!live || disposed) return;
				// Override only the native quote renderer, never its registry or UserText rules.
				let unregister;
				try { unregister = slots.register({ name: NATIVE_QUOTE_SLOT, key: "quote", priority: -1000 }, () => null); }
				catch (failure) {
					if (injecting) registrationFailure = failure;
					publish({ error: "applyError", active: false });
					return;
				}
				let registered = true;
				const stop = () => {
					if (!registered) return;
					registered = false;
					registrations.delete(stop);
					if (typeof unregister === "function") unregister();
					publish({ active: registrations.size > 0 });
				};
				registrations.add(stop);
				publish({ active: true, error: null });
				return stop;
			});
			injecting = false;
			if (registrationFailure) throw registrationFailure;
			stopOverride = release;
		} catch (failure) { release(); throw failure; }
	};
	const applyPreference = () => {
		if (snapshot.disableNativeQuote) startNativeOverride();
		else stopNativeOverride();
	};
	try { applyPreference(); } catch (_) { publish({ error: "applyError" }); }

	const api = {
		getSnapshot: () => snapshot,
		subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
		setDisableNativeQuote(value) {
			if (disposed || !supported || typeof value !== "boolean") return false;
			if (value === snapshot.disableNativeQuote && snapshot.error === null) return true;
			const previous = snapshot.disableNativeQuote;
			let previousRaw;
			try {
				previousRaw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
				let latest;
				try { latest = JSON.parse(previousRaw ?? "{}"); } catch (_) { latest = {}; }
				const base = latest && typeof latest === "object" && !Array.isArray(latest) ? latest : {};
				window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...base, disableNativeQuote: value }));
			} catch (_) { publish({ error: "saveError", saved: false }); return false; }
			snapshot = { ...snapshot, disableNativeQuote: value };
			try { applyPreference(); }
			catch (_) {
				snapshot = { ...snapshot, disableNativeQuote: previous };
				try {
					if (previousRaw === null) window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
					else window.localStorage.setItem(SETTINGS_STORAGE_KEY, previousRaw);
				} catch (_) { /* the visible error still reports that the operation failed */ }
				publish({ error: "applyError", saved: false });
				return false;
			}
			publish({ error: null, saved: true });
			return true;
		},
	};
	const onStorage = event => {
		if (event.key !== SETTINGS_STORAGE_KEY && event.key !== null) return;
		try {
			snapshot = { ...snapshot, disableNativeQuote: readPreference(), saved: false };
			applyPreference();
			publish({ error: null });
		} catch (_) { publish({ error: "readError", saved: false }); }
	};
	window.addEventListener("storage", onStorage);
	let stopLocale;
	try { stopLocale = ctx.locale?.subscribe?.(() => publish({ language: language() })); } catch (_) { /* optional on older hosts */ }

	function SettingsPanel() {
		const React = require("react");
		const { Switch } = require("@deepseek-ai/dsh-client-ui-primitives");
		const state = React.useSyncExternalStore(api.subscribe, api.getSnapshot, api.getSnapshot);
		const text = settingsMessages[state.language];
		const helpId = React.useId();
		const h = React.createElement;
		const description = state.error ? text[state.error] : !state.supported ? text.unavailable
			: state.disableNativeQuote ? state.active ? text.on : text.waiting : state.saved ? text.saved : text.off;
		return h("section", { "data-selection-group-settings": "", "aria-label": text.title,
			style: { padding: "16px 0", fontFamily: "var(--dsw-font-family, system-ui)", color: "var(--dsw-alias-label-primary)" } },
			h("h3", { style: { margin: "0 0 12px", fontSize: 14, fontWeight: 600 } }, text.title),
			h("div", { role: "group", "aria-label": text.label, "aria-describedby": helpId,
				style: { display: "flex", alignItems: "center", gap: 16 } },
				h("div", { style: { flex: "1 1 auto", minWidth: 0 } },
					h("div", { style: { fontSize: 14, lineHeight: 1.5 } }, text.label),
					h("p", { id: helpId, style: { margin: "6px 0 0", fontSize: 12, lineHeight: 1.6, color: "var(--dsw-alias-label-secondary)" } }, text.help)),
				h(Switch, { checked: state.disableNativeQuote, label: text.label, disabled: !state.supported,
					title: text.help, onChange: value => api.setDisableNativeQuote(value) })),
			h("p", { role: state.error ? "alert" : "status", "aria-live": "polite",
				style: { margin: "10px 0 0", minHeight: "1.5em", fontSize: 12, lineHeight: 1.5,
					color: state.error ? "var(--dsw-alias-state-error-primary)" : "var(--dsw-alias-label-secondary)" } }, description));
	}
	function SettingsSection({ subject }) {
		const matches = subject?.kind === "bundle" && subject.pkg?.name === SETTINGS_PACKAGE
			|| subject?.kind === "row" && subject.row?.moduleName === SETTINGS_PACKAGE;
		return matches ? require("react").createElement(SettingsPanel) : null;
	}
	let stopDetails;
	const detailRegistrations = new Set();
	if (supported) {
		try {
			stopDetails = slots.inject("plugins.detail.section", () => {
				if (disposed) return;
				const unregister = slots.register({ name: "plugins.detail.section", id: `${SETTINGS_PACKAGE}.settings` }, SettingsSection);
				let active = true;
				const stop = () => { if (!active) return; active = false; detailRegistrations.delete(stop); if (typeof unregister === "function") unregister(); };
				detailRegistrations.add(stop);
				return stop;
			});
		} catch (_) { publish({ error: "applyError" }); }
	}
	api.dispose = () => {
		if (disposed) return;
		disposed = true;
		stopNativeOverride();
		snapshot = { ...snapshot, active: false };
		if (typeof stopDetails === "function") stopDetails();
		for (const stop of [...detailRegistrations]) stop();
		detailRegistrations.clear();
		window.removeEventListener("storage", onStorage);
		if (typeof stopLocale === "function") stopLocale();
		listeners.clear();
	};
	return api;
}
