/**
 * dsh-selection-group — one self-contained selection toolbar for the DSH Web GUI.
 *
 * GENERATED FILE — do not edit. `node scripts/build.mjs` rebuilds it from:
 *   - @changfenhuang/dsh-annotation v1.4.11 (inlined MIT)
 *   - dsh-quote-followup v0.2.10 (inlined MIT)
 *   - src/toolbar.js (this project's selection-toolbar glue)
 *
 * Both browser halves are inlined with declared build-time patches. Annotation
 * renders the sole toolbar; quote exposes native insertion without floating UI.
 * Neither upstream package is needed at runtime. See THIRD_PARTY_NOTICES.md.
 *
 * @module dsh-selection-group/client
 */
window.__ModuleLoader__.load({
	id: "dsh-selection-group",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		//#region vendored: @changfenhuang/dsh-annotation v1.4.11 (MIT, Copyright (c) 2026 omdsh-dev)
		// Inlined verbatim from https://github.com/omdsh-dev/dsh-annotation — see THIRD_PARTY_NOTICES.md.
		// Fork deviations applied at build time: bar-extra-actions, selection-coordinator-context, chat-only-root, coordinated-toolbar, coordinated-layout, coordinated-annotation, coordinated-dismissal, expose-close-hook, annotation-chip-reserved-row, annotation-chip-release-layout (see patches/).
		// Body kept at column 0 so it stays byte-identical to the vendored file up to those deviations (asserted by test/vendor.test.mjs).
		const vendoredAnnotation = ((require) => {
'use strict'
    var module = { exports: {} }
    var exports = module.exports

    // ============================== 样式 ==============================
    var STYLE_ID = 'annotation-for-dsh-style'
    if (document.getElementById(STYLE_ID) === null) {
      var style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = [
        '[data-annotation-for-dsh] { all: initial; }',
        '[data-annotation-for-dsh] * { box-sizing: border-box; }',
        '.dsh-ann-bar { position: fixed; z-index: 1200; display: flex; align-items: center;',
        '  gap: 2px; padding: 4px; border-radius: 12px;',
        '  border: 1px solid var(--dsw-alias-border-inverted);',
        '  background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #2c2c2e));',
        '  box-shadow: var(--dsw-shadow-lv3);',
        '  font-family: var(--dsw-font-family, system-ui);',
        '  animation: dsh-ann-pop .12s var(--ds-ease-in-out, ease); }',
        '@keyframes dsh-ann-pop { from { opacity: 0; transform: translateY(3px); }',
        '  to { opacity: 1; transform: none; } }',
        '.dsh-ann-ghost { display: inline-flex; align-items: center; gap: 5px; height: 28px;',
        '  padding: 0 10px; border: none; border-radius: 14px; background: transparent;',
        '  color: var(--dsw-alias-label-primary); font-family: inherit;',
        '  font-size: 12px; line-height: 18px; cursor: pointer; }',
        '.dsh-ann-ghost:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }',
        '.dsh-ann-ghost:disabled { opacity: .45; cursor: default; }',
        '.dsh-ann-ghost svg { width: 14px; height: 14px; }',
        '.dsh-ann-action { display: inline-flex; align-items: center; gap: 5px; height: 28px;',
        '  padding: 0 12px; border: none; border-radius: 14px;',
        '  background: var(--dsw-alias-button-primary-fill);',
        '  color: var(--dsw-alias-label-primary-foreground);',
        '  font-family: inherit; font-size: 12px; line-height: 18px; cursor: pointer; }',
        '.dsh-ann-action:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }',
        '.dsh-ann-action:disabled { opacity: .4; cursor: default; }',
        '.dsh-ann-action svg { width: 14px; height: 14px; }',
        '.dsh-ann-icon { display: inline-flex; align-items: center; justify-content: center;',
        '  width: 28px; height: 28px; padding: 0; border: none; border-radius: 28px;',
        '  background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }',
        '.dsh-ann-icon:hover { background: var(--dsw-alias-interactive-bg-hover);',
        '  color: var(--dsw-alias-label-secondary); }',
        '.dsh-ann-icon svg { width: 14px; height: 14px; }',
        '.dsh-ann-card { position: fixed; z-index: 1201; width: 400px;',
        '  max-width: calc(100vw - 16px); padding: 12px; border-radius: 12px;',
        '  border: 1px solid var(--dsw-alias-border-inverted);',
        '  background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #2c2c2e));',
        '  box-shadow: var(--dsw-shadow-lv3);',
        '  font-family: var(--dsw-font-family, system-ui);',
        '  animation: dsh-ann-pop .12s var(--ds-ease-in-out, ease); }',
        '.dsh-ann-card-head { display: flex; align-items: center; justify-content: space-between;',
        '  margin-bottom: 8px; cursor: move; touch-action: none; user-select: none; }',
        '.dsh-ann-card-title { font-size: 13px; font-weight: 600;',
        '  color: var(--dsw-alias-label-primary); }',
        '.dsh-ann-card-headmain { display: flex; align-items: center; gap: 2px; min-width: 0; }',
        '.dsh-ann-quote { font-size: 12px; line-height: 1.55;',
        '  color: var(--dsw-alias-label-tertiary);',
        '  border-left: 2px solid var(--dsw-alias-border-inverted);',
        '  background: var(--dsw-alias-bg-layer-1);',
        '  border-radius: 0 8px 8px 0; padding: 6px 10px; margin-bottom: 8px;',
        '  max-height: 72px; overflow: hidden; word-break: break-word;',
        '  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }',
        '.dsh-ann-quotes { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px;',
        '  max-height: 150px; overflow-y: auto; }',
        '.dsh-ann-qitem { display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px;',
        '  border-radius: 8px; background: var(--dsw-alias-bg-layer-1); }',
        '.dsh-ann-qnum { flex: none; display: inline-flex; align-items: center; justify-content: center;',
        '  width: 16px; height: 16px; margin-top: 1px; border-radius: 8px;',
        '  background: var(--dsw-alias-text-accent, #4c9aff); color: #fff;',
        '  font-size: 10px; font-weight: 700; }',
        '.dsh-ann-qbody { flex: 1; min-width: 0; }',
        '.dsh-ann-qtext { font-size: 12px; line-height: 1.5;',
        '  color: var(--dsw-alias-label-tertiary); max-height: 36px; overflow: hidden;',
        '  word-break: break-word; display: -webkit-box; -webkit-line-clamp: 2;',
        '  -webkit-box-orient: vertical; }',
        '.dsh-ann-qnote { font-size: 11px; line-height: 1.5; margin-top: 2px;',
        '  color: var(--dsw-alias-label-secondary); max-height: 34px; overflow: hidden;',
        '  word-break: break-word; white-space: pre-wrap; display: -webkit-box;',
        '  -webkit-line-clamp: 2; -webkit-box-orient: vertical; }',
        '.dsh-ann-qdel { flex: none; display: inline-flex; align-items: center; justify-content: center;',
        '  width: 18px; height: 18px; padding: 0; border: none; border-radius: 9px;',
        '  background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }',
        '.dsh-ann-qdel:hover { background: var(--dsw-alias-interactive-bg-hover);',
        '  color: var(--dsw-alias-label-secondary); }',
        '.dsh-ann-qdel svg { width: 10px; height: 10px; }',
        '.dsh-ann-input { width: 100%; min-height: 64px; padding: 8px 10px;',
        '  border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px;',
        '  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary);',
        '  font-family: inherit; font-size: 13px; line-height: 20px;',
        '  outline: none; resize: vertical; transition: border-color .15s ease; }',
        '.dsh-ann-input:focus { border-color: var(--dsw-alias-text-accent, #4c9aff); }',
        '.dsh-ann-input::placeholder { color: var(--dsw-alias-label-dimmed); }',
        '.dsh-ann-row { display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end; }',
        '.dsh-ann-error { color: var(--dsw-alias-state-error-primary, #ff7a7a);',
        '  font-size: 12px; margin-top: 8px; word-break: break-word; }',
        '.dsh-ann-hl { position: fixed; z-index: 900; background: rgba(255, 195, 0, .15);',
        '  border-radius: 2px; pointer-events: none; animation: dsh-ann-fadein .15s ease; }',
        '.dsh-ann-num { position: fixed; z-index: 940; display: inline-flex; align-items: center;',
        '  justify-content: center; min-width: 16px; height: 16px; padding: 0 4px;',
        '  border-radius: 8px; border: 1px solid rgba(255, 255, 255, .3);',
        '  background: var(--dsw-alias-text-accent, #4c9aff); color: #fff;',
        '  font-family: var(--dsw-font-family, system-ui); font-size: 10px; font-weight: 700;',
        '  box-shadow: 0 1px 4px rgba(0,0,0,.35); pointer-events: auto; cursor: pointer;',
        '  transition: filter .12s ease; }',
        '.dsh-ann-num:hover { filter: brightness(1.15); }',
        'body:has([role="dialog"][aria-modal="true"]) [data-annotation-overlay],',
        'body:has([role="dialog"][aria-modal="true"]) [data-annotation-num-layer] { display: none; }',
        '.dsh-ann-tip { animation: dsh-ann-pop .12s var(--ds-ease-in-out, ease); }',
        // 可交互浮层始终使用不透明主题底色；菜单 token 在新版宿主可能带 alpha，
        // 默认状态、键盘聚焦和鼠标悬停都不能让正文穿透影响可读性。
        '@keyframes dsh-ann-fadein { from { opacity: 0; } to { opacity: 1; } }',
      ].join('\n')
      document.head.appendChild(style)
    }

    // ============================== i18n（zh / en） ==============================
    // UI 文案与批注协议块双语化：当前语言由 DSH 的 locale 服务驱动
    // （ctx.locale.getSnapshot().active + subscribe()），服务缺失时回退 zh。
    // 历史消息的隐藏手术与反解析同时兼容 zh/en 标记，跨语言切换不丢批注。
    var STR = {
      zh: {
        actions: {
          annotate: '批注',
          already: '已批注',
          annotateTitle: '为选中的内容写一条批注',
          alreadyTitle: '这段内容已在批注清单中',
        },
        edit: {
          addTitle: '添加批注',
          editTitle: '编辑批注',
          placeholder: '写下批注…（可留空，保存后仅标记原文）',
          save: '保存批注',
          delete: '删除这条批注',
        },
        common: { cancel: '取消' },
        error: { noSelection: '没有选中的内容' },
        chip: { count: '条批注' },
        tip: { title: '批注（{n} 条）', notePrefix: '批注：', del: '删' },
        bubble: { tag: '批注 ×{n}', title: '本消息携带批注（{n} 条）' },
        reply: {
          headWithQuote: '批注 {n} 的原文',
          notePrefix: '你的批注：',
        },
        toast: {
          attachFail: '批注拼稿失败，消息将不带批注发送：',
          skipCommand: '本条是斜杠命令，未拼入批注；批注已保留，将随下一条消息发送',
          noSession: '无法确定当前会话，批注未拼入（已保留，将随下一条消息重试）',
        },
        block: {
          head: '我批注了以下 {n} 处内容（编号与原文对应），请针对它们回答我的问题：',
          notePrefix: '批注：',
          format: '请用「Annotation 1：…」到「Annotation {n}：…」的格式，逐条回应上面每一条批注，最后再回答我的问题。',
          headOnly: '我批注了以下内容，请逐条回应：',
          formatOnly: '请按「Annotation N：…」的格式，逐条回应以上批注。',
          marker: '提问：',
        },
      },
      en: {
        actions: {
          annotate: 'Annotate',
          already: 'Annotated',
          annotateTitle: 'Write a note about the selected text',
          alreadyTitle: 'This passage is already in your annotation list',
        },
        edit: {
          addTitle: 'Add annotation',
          editTitle: 'Edit annotation',
          placeholder: 'Write a note… (optional; saving only marks the passage)',
          save: 'Save annotation',
          delete: 'Delete this annotation',
        },
        common: { cancel: 'Cancel' },
        error: { noSelection: 'No text selected' },
        chip: { count: ' annotation(s)' },
        tip: { title: 'Annotations ({n})', notePrefix: 'Note: ', del: 'Del' },
        bubble: { tag: 'Annotations ×{n}', title: 'This message carries {n} annotation(s)' },
        reply: {
          headWithQuote: 'Source of annotation {n}',
          notePrefix: 'Your note: ',
        },
        toast: {
          attachFail: 'Failed to attach annotations; the message will be sent without them: ',
          skipCommand: 'Slash command detected — annotations stay pending and will attach to your next message',
          noSession: 'Cannot determine the current session; annotations kept pending and will retry with your next message',
        },
        block: {
          head: 'I annotated the following {n} passage(s) (the numbers match the quotes below); please respond to them when answering my question:',
          notePrefix: 'Note: ',
          format: 'Please respond to each annotation in the format "Annotation 1: …" through "Annotation {n}: …", then answer my question.',
          headOnly: 'I annotated the following passages; please respond to each annotation:',
          formatOnly: 'Please respond to each annotation above in the format "Annotation N: …".',
          marker: 'Ask:',
        },
      },
      ru: {
        actions: {
          annotate: 'Аннотировать',
          already: 'Уже аннотировано',
          annotateTitle: 'Написать примечание к выделенному тексту',
          alreadyTitle: 'Этот фрагмент уже в списке аннотаций',
        },
        edit: {
          addTitle: 'Добавить аннотацию',
          editTitle: 'Изменить аннотацию',
          placeholder: 'Примечание… (можно пустым: тогда фрагмент просто помечается)',
          save: 'Сохранить аннотацию',
        },
        common: { cancel: 'Отмена' },
        error: { noSelection: 'Текст не выделен' },
        // Три формы через «|» — их выбирает plural() по числу; у zh/en форма одна
        // (строка без «|»), поэтому их вывод не меняется.
        chip: { count: ' аннотация| аннотации| аннотаций' },
        tip: { title: 'Аннотации ({n})', notePrefix: 'Примечание: ', del: 'Удал.' },
        bubble: { tag: 'Аннотации ×{n}', title: 'В этом сообщении аннотаций: {n}' },
        reply: {
          headWithQuote: 'Источник аннотации {n}',
          headNoQuote: 'Аннотация {n}',
          notePrefix: 'Ваше примечание: ',
          missing: '(подходящая аннотация не найдена)',
        },
        toast: {
          attachFail: 'Не удалось собрать аннотации; сообщение уйдёт без них: ',
          skipCommand: 'Это слэш-команда — аннотации остаются в очереди и уйдут со следующим сообщением',
        },
        // Разбор блока опирается на три вещи: заголовок начинается с BLOCK_HEADS.ru,
        // разделитель вопроса — block.marker, префикс примечания — notePrefix.
        // Формат ответа модели намеренно латинский («Annotation N: …»): по нему
        // работает замена в ответе ассистента (decorateAnnotationLabels), и он не
        // зависит от языка интерфейса.
        block: {
          head: 'Я аннотировал следующие фрагменты ({n} шт.) — номера соответствуют цитатам ниже; пожалуйста, ответьте на них, отвечая на мой вопрос:',
          notePrefix: 'Примечание: ',
          format: 'Ответьте на каждую аннотацию в формате «Annotation 1: …» — «Annotation {n}: …», затем ответьте на мой вопрос.',
          headOnly: 'Я аннотировал следующие фрагменты — ответьте, пожалуйста, на каждую аннотацию:',
          formatOnly: 'Ответьте на каждую аннотацию выше в формате «Annotation N: …».',
          marker: 'Вопрос:',
        },
      },
    }
    var currentLang = 'zh'
    function setLang(id) {
      // 文案有 zh / en / ru 三套，DSH 的 locale 服务可能有更多（fr、de…）。
      // 已知语言原样采用；未知语言走英文 —— 曾经这里把一切非 zh/en 都当成 zh，
      // 选了俄语的节点整套批注界面退回中文。
      currentLang = (id === 'zh' || id === 'en' || id === 'ru') ? id : 'en'
    }
    function dictVal(lang, key) {
      var cur = STR[lang]
      var parts = key.split('.')
      for (var i = 0; i < parts.length; i++) {
        if (cur === undefined || cur === null) return undefined
        cur = cur[parts[i]]
      }
      return cur
    }
    /** @param {string} key @param {Object<string, string|number>} [params] */
    function t(key, params) {
      var s = dictVal(currentLang, key)
      if (s === undefined) s = dictVal('zh', key)
      if (s === undefined) s = key
      if (params !== undefined && params !== null) {
        for (var k in params) {
          if (Object.prototype.hasOwnProperty.call(params, k)) {
            s = s.split('{' + k + '}').join(String(params[k]))
          }
        }
      }
      return s
    }
    /** Числовая форма из словаря: «одна|две|много» через «|»; без «|» — как есть.
     *  Нужна для русского: «1 аннотация», «3 аннотации», «5 аннотаций». */
    function plural(key, n) {
      var forms = String(t(key)).split('|')
      if (forms.length < 3) return forms[0]
      var mod10 = n % 10
      var mod100 = n % 100
      var index = (mod10 === 1 && mod100 !== 11) ? 0
        : (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) ? 1 : 2
      return forms[index] !== undefined ? forms[index] : forms[0]
    }
    // 批注块头部哨兵（zh/en/ru 都识别；兼容历史消息与跨语言切换）。
    var BLOCK_HEADS = { zh: '我批注了以下', en: 'I annotated the following', ru: 'Я аннотировал следующие' }
    function hasAnnotationBlock(text) {
      for (var lang in BLOCK_HEADS) {
        if (Object.prototype.hasOwnProperty.call(BLOCK_HEADS, lang) && text.indexOf(BLOCK_HEADS[lang]) !== -1) return true
      }
      return false
    }
    // 气泡隐藏手术的分隔标记：当前语言优先，另保留其他语言与「问题：」老格式。
    var BLOCK_MARKERS = {
      zh: ['\n提问：', '提问：', '\n问题：', '问题：'],
      en: ['\nAsk:', 'Ask:'],
      ru: ['\nВопрос:', 'Вопрос:'],
    }
    function blockMarkers() {
      var langs = [currentLang]
      var known = Object.keys(BLOCK_MARKERS)
      for (var k = 0; k < known.length; k++) if (langs.indexOf(known[k]) === -1) langs.push(known[k])
      var out = []
      for (var i = 0; i < langs.length; i++) out = out.concat(BLOCK_MARKERS[langs[i]])
      return out
    }
    // 反解析用的段落级分隔标记（批注块按协议生成，均以 \n\n 开头）。
    var PARSE_MARKERS = ['\n\n提问：', '\n\n问题：', '\n\nAsk:', '\n\nВопрос:']

    // ============================== 工具 ==============================
    // 助手行判别：0810 snapshot 起助手消息行 = ChatNodeSeat 上的
    // data-chat-flow-kind="assistant-step"（旧版 data-time-hover-root 已不再
    // 出现在助手消息主体上，只留在用户行与 turn 尾节点）；保留旧判别式兜底
    // 兼容回滚旧 snapshot，并排除新版 data-turn-tail 误判。
    function isAssistantRow(el) {
      if (el.matches('[data-chat-flow-kind="assistant-step"]')) return true
      return el.hasAttribute('data-time-hover-root')
        && el.querySelector('[class*="bubble"]') === null
        && !el.hasAttribute('data-turn-tail')
    }

    // ---------- focus-chat（@dingyi222666/dsh-focus-chat）视图兼容 ----------
    // 该插件在 conversation.view 槽注册「聚焦会话」视图：挂载于
    // [data-focus-flow]（列容器）→ [data-focus-anchor-key]（行包装）→ 行。
    // 助手行 = class 含 "assistant" 的容器（CSS Modules 哈希名保留 local 名，
    // 形如 `<hash>_assistant`；流式期间行自带 data-streaming，停流后移除）。
    // 用户行保留 data-time-hover-root + [class*="bubble"]，与旧判别式一致。
    function isFocusFlow(el) {
      return el !== null && typeof el.closest === 'function'
        && el.closest('[data-focus-flow]') !== null
    }

    function isFocusAssistantRow(el) {
      if (el === null || !el.classList || !isFocusFlow(el)) return false
      for (var i = 0; i < el.classList.length; i++) {
        if (el.classList[i].indexOf('assistant') !== -1) return true
      }
      return false
    }

    /** focus 视图的全部消息行（用户 + 助手，DOM 顺序）。只保留最外层助手
     *  容器（markdown 内部子元素也可能带含 assistant 的类名）。 */
    function focusMessageRows() {
      var flow = document.querySelector('[data-focus-flow]')
      if (flow === null) return []
      var out = []
      var all = flow.querySelectorAll('[data-time-hover-root], [class*="assistant"]')
      for (var i = 0; i < all.length; i++) {
        var el = all[i]
        if (el.hasAttribute('data-time-hover-root')) {
          if (!isAssistantRow(el)) out.push(el)
          continue
        }
        if (!isFocusAssistantRow(el)) continue
        var p = el.parentElement
        if (p !== null && p !== flow && isFocusAssistantRow(p)) continue
        out.push(el)
      }
      return out
    }

    function assistantRowOf(node) {
      var el = (node instanceof Element) ? node : (node !== null ? node.parentElement : null)
      while (el !== null && el !== document.body) {
        if (el.hasAttribute('data-chat-flow-kind')) {
          return el.getAttribute('data-chat-flow-kind') === 'assistant-step' ? el : null
        }
        if (el.hasAttribute('data-time-hover-root')) {
          return isAssistantRow(el) ? el : null
        }
        if (isFocusAssistantRow(el)) {
          // 冒到最外层 focus 助手容器（内部子元素可能也含 assistant 类名）。
          while (el.parentElement !== null && el.parentElement !== document.body
            && isFocusAssistantRow(el.parentElement)) {
            el = el.parentElement
          }
          return el
        }
        el = el.parentElement
      }
      return null
    }

    // 只接管宿主的可选文本正文；标题、按钮、PDF 和 iframe 不属于此接口。
    var DOCUMENT_TEXT = '[data-textpreview-plain], [data-document-markdown], [data-code-preview] pre'

    function documentSourceOf(node) {
      var el = node instanceof Element ? node : node && node.parentElement
      if (el && el.closest('button, input, textarea, [contenteditable="true"]')) return null
      var root = el && el.closest(DOCUMENT_TEXT)
      var preview = root && root.closest('[data-textpreview-url]')
      if (!preview) return null
      var url = preview.getAttribute('data-textpreview-url') || ''
      var match = /^dsh-resource:\/\/file\/session\/([^/]+)\/(.+)$/.exec(url)
      if (!match) return null
      try {
        var sessionId = decodeURIComponent(match[1])
        var path = match[2].split('/').map(decodeURIComponent).join('/')
        if (/[\u0000-\u001f\u007f]/.test(path) || /[?#]/.test(url)) return null
        return { root: root, sourceUrl: url, sourcePath: path, sessionId: sessionId }
      } catch (_) { return null }
    }

    function annotationRootOf(node) {
      return window.__DSH_SELECTION_GROUP_SELECTION__?.rootOf(node) ?? null
    }

    function quoteRects(range, saved) {
      var rects = Array.from(range.getClientRects())
      if (!saved.sourceUrl) return rects
      var clip = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
      var node = range.commonAncestorContainer
      var el = node instanceof Element ? node : node.parentElement
      for (; el && el !== document.body; el = el.parentElement) {
        var style = getComputedStyle(el)
        var box = el.getBoundingClientRect()
        if (/auto|scroll|hidden|clip/.test(style.overflowX)) {
          clip.left = Math.max(clip.left, box.left); clip.right = Math.min(clip.right, box.right)
        }
        if (/auto|scroll|hidden|clip/.test(style.overflowY)) {
          clip.top = Math.max(clip.top, box.top); clip.bottom = Math.min(clip.bottom, box.bottom)
        }
      }
      return rects.map(function (r) {
        var left = Math.max(r.left, clip.left), top = Math.max(r.top, clip.top)
        return new DOMRect(left, top, Math.max(0, Math.min(r.right, clip.right) - left), Math.max(0, Math.min(r.bottom, clip.bottom) - top))
      }).filter(function (r) { return r.width > 0 && r.height > 0 })
    }

    function quoteWithSource(q) {
      return q.sourcePath ? '[' + q.sourcePath + ']\n' + q.text : q.text
    }

    function assistantRows() {
      var modern = document.querySelectorAll('[data-chat-flow-kind="assistant-step"]')
      if (modern.length > 0) return Array.prototype.slice.call(modern)
      var focus = focusMessageRows().filter(isFocusAssistantRow)
      if (focus.length > 0) return focus
      return Array.prototype.slice.call(document.querySelectorAll('[data-time-hover-root]'))
        .filter(isAssistantRow)
    }

    /** 全部消息行（用户 + 助手 + 其它节点）：新版走 data-chat-flow-kind，
     *  旧版回退 data-time-hover-root；focus-chat 视图单独按 DOM 顺序收集
     *  （会话视图 tab 切换时主视图会卸载，两种结构不同时存在）。
     *  用于气泡装饰、批注条目回溯。 */
    function allMessageRows() {
      var modern = document.querySelectorAll('[data-chat-flow-kind]')
      if (modern.length > 0) return Array.prototype.slice.call(modern)
      var focus = focusMessageRows()
      if (focus.length > 0) return focus
      return Array.prototype.slice.call(document.querySelectorAll('[data-time-hover-root]'))
    }

    /** 由字符偏移在元素内构造 Range（跨文本节点）。 */
    function rangeFromOffset(el, offset, length) {
      var nodes = []
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      var n
      while ((n = walker.nextNode()) !== null) nodes.push(n)
      var pos = 0
      for (var i = 0; i < nodes.length; i++) {
        var len = (nodes[i].nodeValue || '').length
        if (offset < pos + len) {
          var range = document.createRange()
          range.setStart(nodes[i], offset - pos)
          var remain = length
          var j = i
          var inner = offset - pos
          while (remain > 0) {
            var l = (nodes[j].nodeValue || '').length
            var take = Math.min(remain, l - inner)
            remain -= take
            if (remain === 0) { range.setEnd(nodes[j], inner + take); break }
            j++
            inner = 0
          }
          return range
        }
        pos += len
      }
      return null
    }

    function findRangeIn(el, quote) {
      var full = ''
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      var n
      while ((n = walker.nextNode()) !== null) full += n.nodeValue || ''
      var start = full.indexOf(quote)
      if (start === -1) return null
      return rangeFromOffset(el, start, quote.length)
    }

    /** 空白完全剥离匹配：返回 quote 在 full 中的所有原始偏移区间 [{start,end}]。
     *  解决选区文本跨块级元素（GenUI 表格单元格等）带出 \n、而 DOM textContent
     *  无此空白导致的匹配失败（此前会掉进宽松匹配命中旧轮次）。 */
    function allNormSpans(full, quote) {
      var nq = quote.replace(/\s+/g, '')
      if (nq === '') return []
      var nf = ''
      var map = []
      for (var i = 0; i < full.length; i++) {
        if (!/\s/.test(full[i])) { nf += full[i]; map.push(i) }
      }
      var out = []
      var idx = nf.indexOf(nq)
      while (idx !== -1) {
        out.push({ start: map[idx], end: map[idx + nq.length - 1] + 1 })
        idx = nf.indexOf(nq, idx + 1)
      }
      return out
    }

    function findNormSpan(full, quote) {
      var spans = allNormSpans(full, quote)
      return spans.length > 0 ? spans[0] : null
    }

    /** 批注芯片差异变体：选区文本里芯片是「Annotation N」（无冒号），而消息行
     *  渲染文本可能是「Annotation N：」（React 重渲染后冒号恢复）——匹配失败时
     *  用变体重试，抹平该差异。 */
    function quoteVariants(quote) {
      var out = [quote]
      var re = /Annotation[\s\u200b\u200c\u200d\u00ad]*(\d+)/gi
      var m
      while ((m = re.exec(quote)) !== null) {
        out.push(quote.slice(0, m.index) + 'Annotation ' + m[1] + '：' + quote.slice(m.index + m[0].length))
      }
      return out
    }

    function allPositionsOf(el, quote) {
      var full = el.textContent || ''
      var out = []
      var idx = full.indexOf(quote)
      while (idx !== -1) {
        out.push(idx)
        idx = full.indexOf(quote, idx + 1)
      }
      return out
    }

    function ctxScore(full, pos, len, ctx) {
      if (ctx === null) return 0
      var before = full.slice(Math.max(0, pos - 24), pos)
      var after = full.slice(pos + len, pos + len + 24)
      var s = 0
      for (var i = 0; i < Math.min(before.length, ctx.before.length); i++) {
        if (before[i] === ctx.before[i]) s++
      }
      for (var j = 0; j < Math.min(after.length, ctx.after.length); j++) {
        if (after[j] === ctx.after[j]) s++
      }
      return s
    }

    /** 由 Range 起点算出它在元素文本内的绝对字符偏移（真实位置）。 */
    function offsetOfRangeInRow(row, range) {
      try {
        var walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
        var n
        var pos = 0
        while ((n = walker.nextNode()) !== null) {
          var len = (n.nodeValue || '').length
          if (n === range.startContainer) return pos + range.startOffset
          pos += len
        }
      } catch (_) { /* fallthrough */ }
      return -1
    }

    /** 宽松定位：token 式匹配，双向容忍空白差异。 */
    function findRangeFlexible(el, quote) {
      var qNorm = quote.replace(/\s+/g, ' ').trim()
      if (qNorm === '') return null
      var tokens = qNorm.split(' ').filter(function (t) { return t !== '' })
      if (tokens.length === 0) return null
      var nodes = []
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      var n
      while ((n = walker.nextNode()) !== null) nodes.push(n)
      var stream = []
      for (var i = 0; i < nodes.length; i++) {
        var text = nodes[i].nodeValue || ''
        for (var k = 0; k < text.length; k++) stream.push({ node: nodes[i], offset: k, ch: text[k] })
      }
      var t = 0
      var ti = 0
      var startNode = null
      var startOff = 0
      var endNode = null
      var endOff = -1
      var seenGap = false
      for (var s = 0; s < stream.length && t < tokens.length; s++) {
        var ch = stream[s].ch
        var isWs = /\s/.test(ch)
        if (isWs) {
          if (ti === 0) seenGap = true
          continue
        }
        if (ti === 0) {
          if (t > 0 && !seenGap) seenGap = true
          if (ch === tokens[t][0]) {
            if (t === 0) { startNode = stream[s].node; startOff = stream[s].offset }
            ti = 1
          } else {
            seenGap = true
            continue
          }
          if (tokens[t].length === 1) {
            endNode = stream[s].node
            endOff = stream[s].offset
            t++
            ti = 0
            seenGap = false
          }
          continue
        }
        if (ch === tokens[t][ti]) {
          ti++
          if (ti === tokens[t].length) {
            endNode = stream[s].node
            endOff = stream[s].offset
            t++
            ti = 0
            seenGap = false
          }
        } else {
          ti = 0
          if (ch === tokens[t][0]) {
            if (t === 0) { startNode = stream[s].node; startOff = stream[s].offset }
            ti = 1
            if (tokens[t].length === 1) {
              endNode = stream[s].node
              endOff = stream[s].offset
              t++
              ti = 0
              seenGap = false
            }
          }
        }
      }
      if (t === tokens.length && startNode !== null) {
        var range = document.createRange()
        range.setStart(startNode, startOff)
        range.setEnd(endNode, endOff + 1)
        return range
      }
      return null
    }

    /** 定位批注的 Range：消息 seq 锚定优先，空白不敏感重搜兜底。 */
    function locateQuote(quote, saved) {
      if (saved && saved.sourceUrl) {
        var bodies = document.querySelectorAll(DOCUMENT_TEXT)
        for (var d = 0; d < bodies.length; d++) {
          var source = documentSourceOf(bodies[d])
          if (source === null || source.sourceUrl !== saved.sourceUrl || bodies[d].getClientRects().length === 0) continue
          if (saved.range && bodies[d].contains(saved.range.commonAncestorContainer)
            && saved.range.toString().trim() === quote) return saved.range
          if (saved.textOffset >= 0) {
            var exact = rangeFromOffset(bodies[d], saved.textOffset, quote.length)
            if (exact !== null && exact.toString() === quote) return exact
          }
          // 文件变化后只接受唯一匹配，避免标记重复代码中的另一处。
          var text = bodies[d].textContent || ''
          var at = text.indexOf(quote)
          if (at >= 0 && text.indexOf(quote, at + 1) === -1) return rangeFromOffset(bodies[d], at, quote.length)
        }
        return null
      }
      if (saved !== undefined && saved !== null && saved.range && saved.range.startContainer) {
        try {
          if (saved.range.startContainer.isConnected && saved.range.endContainer.isConnected) {
            var t = saved.range.toString()
            if (t.replace(/\s+/g, '') === quote.replace(/\s+/g, '')) {
              return saved.range
            }
          }
        } catch (_) { /* range 已失效 */ }
      }
      var rows = assistantRows()
      if (saved !== undefined && saved !== null && saved.seqKey !== '') {
        try {
          var item = document.querySelector('[data-chat-anchor-key="' + saved.seqKey + '"]')
          // focus-chat 视图的锚 key 属性名不同，值语义一致。
          if (item === null) {
            item = document.querySelector('[data-focus-anchor-key="' + saved.seqKey + '"]')
          }
          if (item !== null) {
            var itText = item.textContent || ''
            if (saved.textOffset >= 0) {
              var sp0 = findNormSpan(itText, quote)
              if (sp0 !== null && Math.abs(sp0.start - saved.textOffset) <= 2) {
                var itRange = rangeFromOffset(item, sp0.start, sp0.end - sp0.start)
                if (itRange !== null) return itRange
              }
            }
            if (saved.ctxBefore !== '') {
              var itIdx = itText.indexOf(saved.ctxBefore)
              if (itIdx !== -1) {
                var itNear = itIdx + saved.ctxBefore.length
                var sp1 = findNormSpan(itText.slice(itNear), quote)
                if (sp1 !== null) {
                  var itRange2 = rangeFromOffset(item, itNear + sp1.start, sp1.end - sp1.start)
                  if (itRange2 !== null) return itRange2
                }
              }
            }
            // 锚点消息内的全量扫描（空白不敏感 + 上下文评分）。
            var spansIt = allNormSpans(itText, quote)
            var bestIt = null
            var bestItScore = -1
            for (var pp2 = 0; pp2 < spansIt.length; pp2++) {
              var rngIt = rangeFromOffset(item, spansIt[pp2].start, spansIt[pp2].end - spansIt[pp2].start)
              if (rngIt === null) continue
              var scIt = ctxScore(itText, spansIt[pp2].start, spansIt[pp2].end - spansIt[pp2].start,
                { before: saved.ctxBefore || '', after: saved.ctxAfter || '' })
              if (scIt > bestItScore) { bestItScore = scIt; bestIt = rngIt }
            }
            if (bestIt !== null && (saved.ctxBefore === '' || bestItScore > 0)) return bestIt
            // 锚点消息还在但原文匹配不上：先试批注芯片差异变体（「Annotation N」
            // vs「Annotation N：」）在**同一条消息内**宽松重定位——绝不跨消息
            // 模糊搜索（那是「跳到旧轮次」的根源，v1.3.6 纪律）。
            var variants = quoteVariants(quote)
            for (var vi = 0; vi < variants.length; vi++) {
              var vsp = allNormSpans(itText, variants[vi])
              for (var vj = 0; vj < vsp.length; vj++) {
                var vrng = rangeFromOffset(item, vsp[vj].start, vsp[vj].end - vsp[vj].start)
                if (vrng !== null) return vrng
              }
              var vflex = findRangeFlexible(item, variants[vi])
              if (vflex !== null) return vflex
            }
            // 同消息内确实定位不到 → 放弃（脚标隐藏）。
            return null
          }
        } catch (_) { return null }
      }
      if (saved !== undefined && saved !== null && saved.rowHead !== '') {
        for (var r = 0; r < rows.length; r++) {
          var rowText = rows[r].textContent || ''
          if (rowText.slice(0, 24) !== saved.rowHead) continue
          if (saved.textOffset >= 0) {
            var spR = findNormSpan(rowText, quote)
            if (spR !== null && Math.abs(spR.start - saved.textOffset) <= 2) {
              var range = rangeFromOffset(rows[r], spR.start, spR.end - spR.start)
              if (range !== null) return range
            }
          }
          if (saved.ctxBefore !== '') {
            var bIdx = rowText.indexOf(saved.ctxBefore)
            if (bIdx !== -1) {
              var near = bIdx + saved.ctxBefore.length
              var spR2 = findNormSpan(rowText.slice(near), quote)
              if (spR2 !== null) {
                var range2 = rangeFromOffset(rows[r], near + spR2.start, spR2.end - spR2.start)
                if (range2 !== null) return range2
              }
            }
          }
          var spans = allNormSpans(rowText, quote)
          var bestRow = null
          var bestRowScore = -1
          for (var pp = 0; pp < spans.length; pp++) {
            var rng = rangeFromOffset(rows[r], spans[pp].start, spans[pp].end - spans[pp].start)
            if (rng === null) continue
            var sc = ctxScore(rowText, spans[pp].start, spans[pp].end - spans[pp].start,
              saved !== undefined && saved !== null
                ? { before: saved.ctxBefore || '', after: saved.ctxAfter || '' }
                : null)
            if (sc > bestRowScore) { bestRowScore = sc; bestRow = rng }
          }
          if (bestRow !== null) return bestRow
        }
      }
      var ctx = saved !== undefined && saved !== null
        ? { before: saved.ctxBefore || '', after: saved.ctxAfter || '' }
        : null
      var best = null
      var bestScore = -1
      for (var i = 0; i < rows.length; i++) {
        var full = rows[i].textContent || ''
        var spans = allNormSpans(full, quote)
        for (var p = 0; p < spans.length; p++) {
          var range = rangeFromOffset(rows[i], spans[p].start, spans[p].end - spans[p].start)
          if (range === null) continue
          var score = ctxScore(full, spans[p].start, spans[p].end - spans[p].start, ctx)
          if (score > bestScore) { bestScore = score; best = range }
        }
      }
      if (best !== null && (ctx === null || bestScore > 0)) return best
      var flow = document.querySelector('[data-chat-flow]')
      if (flow === null) flow = document.querySelector('[data-focus-flow]')
      if (flow !== null) {
        var full2 = flow.textContent || ''
        var positions2 = allPositionsOf(flow, quote)
        var best2 = null
        var bestScore2 = -1
        for (var q2 = 0; q2 < positions2.length; q2++) {
          var range2 = rangeFromOffset(flow, positions2[q2], quote.length)
          if (range2 === null) continue
          var score2 = ctxScore(full2, positions2[q2], quote.length, ctx)
          if (score2 > bestScore2) { bestScore2 = score2; best2 = range2 }
        }
        if (best2 !== null && (ctx === null || bestScore2 > 0)) return best2
      }
      return null
    }

    function truncate(s, n) {
      return s.length > n ? s.slice(0, n) + '…' : s
    }

    function placeAbove(rect, height) {
      var w = 400
      var left = rect.left + rect.width / 2 - w / 2
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8))
      // 下方优先：原生选中菜单（移动端长按菜单、桌面 Copy/Search 浮层）锚定在选区
      // 上沿附近，且原生 UI 恒绘制在页面内容之上（z-index 无效），工具条放上方必被
      // 遮挡；因此下方放得下就放下方，放不下才回上方。
      var belowTop = rect.bottom + 8
      var belowFits = belowTop + height <= window.innerHeight - 8
      var top
      if (belowFits) {
        top = belowTop
      } else {
        top = rect.top - height - 8
        if (top < 8) top = Math.min(rect.bottom + 8, window.innerHeight - height - 8)
      }
      return { left: Math.round(left), top: Math.round(Math.max(8, top)) }
    }

    function svg(paths, viewBox) {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      s.setAttribute('viewBox', viewBox)
      s.setAttribute('fill', 'none')
      s.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      for (var i = 0; i < paths.length; i++) {
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        p.setAttribute('d', paths[i])
        p.setAttribute('fill', 'currentColor')
        s.appendChild(p)
      }
      return s
    }
    var ICONS = {
      plus: function () {
        return svg(['M8.64453 1.5V7.34961H14.5V8.65039H8.64453V14.5H7.34473V8.65039H1.5V7.34961H7.34473V1.5H8.64453Z'], '0 0 16 16')
      },
      check: function () {
        return svg([
          'M15.0498 3.92579L8.49512 12.3818C8.25774 12.6881 8.04517 12.9645 7.84668 13.1689C7.63957 13.3823 7.38732 13.5841 7.04492 13.6719C6.86373 13.7183 6.6757 13.7346 6.48926 13.7197C6.13666 13.6915 5.8528 13.5355 5.6123 13.3604C5.38201 13.1926 5.12573 12.9567 4.83984 12.6953L1.03125 9.21289L1.96875 8.1875L5.77734 11.6699C6.08684 11.9529 6.27773 12.1249 6.43066 12.2363C6.50183 12.2882 6.54699 12.3135 6.57324 12.3252C6.58525 12.3305 6.59269 12.3322 6.5957 12.333C6.59802 12.3336 6.59961 12.334 6.59961 12.334C6.63317 12.3367 6.66758 12.3335 6.7002 12.3252C6.7002 12.3252 6.70211 12.3251 6.7041 12.3242C6.70698 12.3229 6.71348 12.319 6.72461 12.3115C6.74849 12.2956 6.78843 12.2642 6.84961 12.2012C6.98138 12.0654 7.13957 11.8628 7.39648 11.5313L13.9502 3.07422L15.0498 3.92579Z',
        ], '0 0 16 16')
      },
      close: function () {
        return svg([
          'M14.1168 13.197L13.197 14.1167L1.8833 2.80303L2.80309 1.88324L14.1168 13.197Z',
          'M13.197 1.88326L14.1168 2.80305L2.80309 14.1168L1.8833 13.197L13.197 1.88326Z',
        ], '0 0 16 16')
      },
      send: function () {
        return svg([
          'M8.3125 0.981587C8.66767 1.0545 8.97902 1.20558 9.2627 1.43374C9.48724 1.61438 9.73029 1.85933 9.97949 2.10854L14.707 6.83608L13.293 8.25014L9 3.95717V15.0431H7V3.95717L2.70703 8.25014L1.29297 6.83608L6.02051 2.10854C6.26971 1.85933 6.51277 1.61438 6.7373 1.43374C6.97662 1.24126 7.28445 1.04542 7.6875 0.981587C7.8973 0.94841 8.1031 0.956564 8.3125 0.981587Z',
        ], '0 0 16 16')
      },
      trash: function () {
        return svg([
          'M14.4782 4.84067L14.2138 10.1152C14.1102 12.1872 14.067 13.0115 13.3866 13.9607C13.1044 14.3546 12.7498 14.6912 12.3424 14.9535C11.8239 15.2872 11.2415 15.4316 10.5585 15.4998C9.88727 15.5668 9.04946 15.5656 7.99998 15.5656C6.95051 15.5656 6.1127 15.5668 5.44142 15.4998C4.75851 15.4316 4.17602 15.2872 3.65753 14.9535C3.25012 14.6912 2.89559 14.3546 2.61332 13.9607C1.93296 13.0115 1.88979 12.1872 1.78619 10.1152L1.52179 4.84067L2.89006 4.77277L3.15343 10.0463C3.26221 12.2218 3.32452 12.6015 3.72646 13.1624C3.90825 13.4161 4.13686 13.6334 4.39927 13.8023C4.66204 13.9714 5.00263 14.0792 5.57825 14.1367C6.16562 14.1953 6.92298 14.1963 7.99998 14.1963C9.07699 14.1963 9.83434 14.1953 10.4217 14.1367C10.9973 14.0792 11.3379 13.9714 11.6007 13.8023C11.8631 13.6334 12.0917 13.4161 12.2735 13.1624C12.6755 12.6015 12.7378 12.2218 12.8465 10.0463L13.1099 4.77277L14.4782 4.84067ZM5.43011 6.22849H6.7994V11.3909H5.43011V6.22849ZM9.20056 6.22849H10.5699V11.3909H9.20056V6.22849ZM8.53597 0.434431C9.17976 0.434431 9.6522 0.426926 10.0966 0.571258C10.2357 0.616451 10.3717 0.672554 10.502 0.738948C10.9182 0.951107 11.2464 1.29099 11.7015 1.74612L12.4978 2.54136H15.3742V3.91169H0.625732V2.54136H3.50218L4.29845 1.74612C4.75358 1.29099 5.08174 0.951107 5.49801 0.738948C5.62831 0.672554 5.76425 0.616451 5.90334 0.571258C6.34776 0.426926 6.82021 0.434431 7.46399 0.434431H8.53597ZM7.46399 1.80476C6.73208 1.80476 6.51641 1.81187 6.32617 1.87369C6.25545 1.89667 6.18668 1.92533 6.12041 1.95907C5.96398 2.03878 5.82348 2.16253 5.44142 2.54136H10.5585C10.1765 2.16253 10.036 2.03878 9.87955 1.95907C9.81329 1.92533 9.74452 1.89667 9.6738 1.87369C9.48356 1.81187 9.26789 1.80476 8.53597 1.80476H7.46399Z',
        ], '0 0 16 16')
      },
    }

    var PENDING_STORAGE_PREFIX = 'dsh.annotation.pending.v1.'

    function pendingStorageKey(sessionId) {
      return PENDING_STORAGE_PREFIX + encodeURIComponent(String(sessionId))
    }

    function parsePendingQuotes(raw) {
      if (typeof raw !== 'string' || raw === '') return []
      try {
        var value = JSON.parse(raw)
        if (!Array.isArray(value)) return []
        return value.filter(function (q) {
          return q !== null && typeof q === 'object'
            && typeof q.id === 'string' && typeof q.text === 'string' && q.text !== ''
        }).map(function (q) {
          return {
            id: q.id,
            text: q.text,
            note: typeof q.note === 'string' ? q.note : '',
            ...(typeof q.sourceUrl === 'string' && typeof q.sourcePath === 'string'
              ? { sourceUrl: q.sourceUrl, sourcePath: q.sourcePath } : {}),
            range: null,
            seqKey: typeof q.seqKey === 'string' ? q.seqKey : '',
            rowHead: typeof q.rowHead === 'string' ? q.rowHead : '',
            textOffset: Number.isFinite(q.textOffset) ? q.textOffset : -1,
            ctxBefore: typeof q.ctxBefore === 'string' ? q.ctxBefore : '',
            ctxAfter: typeof q.ctxAfter === 'string' ? q.ctxAfter : '',
          }
        })
      } catch (_) {
        return []
      }
    }

    function stringifyPendingQuotes(quotes) {
      return JSON.stringify(quotes.map(function (q) {
        return {
          id: q.id,
          text: q.text,
          note: q.note || '',
          ...(q.sourceUrl ? { sourceUrl: q.sourceUrl, sourcePath: q.sourcePath } : {}),
          seqKey: q.seqKey || '',
          rowHead: q.rowHead || '',
          textOffset: Number.isFinite(q.textOffset) ? q.textOffset : -1,
          ctxBefore: q.ctxBefore || '',
          ctxAfter: q.ctxAfter || '',
        }
      }))
    }

    // ============================== 插件主体 ==============================
    function apply(ctx) {
      var selectionApi = window.__DSH_SELECTION_GROUP_SELECTION__
      var sessions = ctx.sessions

      // ---------- 当前会话 id 的跨版本解析（覆盖 DSH 0.1.1 ~ 0.2.0-rc.2）----------
      // 优先级（自上而下，命中即返回）：
      // ① uiSession 服务的 `adapter.current`（HostObservable<binding>，binding.key =
      //    sessionId）—— 0.1.7 起的公开选中态：selection 收进 ClientSessions 私有
      //    selection，list 快照不再带 current。已对照 0.1.7-rc.2 与 0.2.0-rc.2 内核
      //    源码核实（packages/client/ui-session/src/client/index.ts:312 起暴露）。
      // ② `localStorage['dsh.sessions.current'].sessionId` —— 内核 workspace 服务
      //    持久化的选择态（`createSnapshotStore({}, { persist: { name: ... } })`，
      //    写入形状 `{ sessionId }`，会话归档时由内核 clearArchivedCurrent 自行清理）。
      //    0.1.6-alpha.2 ~ 0.1.6 上这是唯一真实可用的路径（#68 的考证）。
      // ③ list 快照上的 `current` —— 0.1.6-alpha.2 之前的宿主，该字段是精确选中值。
      // ④ list 行上的 `retainedBy.mainView > 0` —— 公开成员，兜底「尚未落盘 / 存储
      //    被清」的场景。它是「主视图 retain 的会话」而非选中值：内核自己也只在
      //    id 未知时才用它猜，故排在精确值之后。
      // （曾挂在 sessions 服务上的 `currentProvideInfo` 只存在于旧源码线
      // packages/client/runtime，上游现契约已无此成员，不再尝试。）
      var uiSessionService = null

      /** ui-session 服务（惰性探测：apply 时机早于它注册时下次再取）。 */
      function uiSessionFace() {
        if (uiSessionService === null) {
          try { uiSessionService = ctx.get('uiSession') || null } catch (_) { uiSessionService = null }
        }
        return uiSessionService
      }

      /** ① 命中时返回可订阅的选中态源（HostObservable），否则 null。 */
      function currentSessionSource() {
        try {
          var face = uiSessionFace()
          var adapter = face !== null ? face.adapter : undefined
          var source = adapter !== undefined && adapter !== null ? adapter.current : undefined
          if (source !== undefined && source !== null
            && typeof source.getSnapshot === 'function' && typeof source.subscribe === 'function') return source
        } catch (_) { /* 旧版内核：无 uiSession */ }
        return null
      }

      function readCurrentSessionId() {
        try {
          var source = currentSessionSource()
          if (source !== null) {
            var binding = source.getSnapshot()
            if (binding !== undefined && binding !== null && binding.key !== undefined) return binding.key
          }
        } catch (_) { /* 落到下一级 */ }
        try {
          if (typeof localStorage !== 'undefined') {
            var raw = localStorage.getItem('dsh.sessions.current')
            if (raw !== null) {
              var parsed = JSON.parse(raw)
              if (parsed !== null && typeof parsed === 'object'
                && typeof parsed.sessionId === 'string' && parsed.sessionId !== '') return parsed.sessionId
            }
          }
        } catch (_) { /* 落到下一级 */ }
        try {
          var snap = sessions.list.getSnapshot()
          if (snap !== undefined && snap !== null) {
            if (typeof snap.current === 'string' && snap.current !== '') return snap.current
            var byId = snap.byId
            if (byId !== undefined && byId !== null && typeof byId === 'object') {
              var ids = Array.isArray(snap.ids) ? snap.ids : Object.keys(byId)
              for (var i = 0; i < ids.length; i++) {
                var retained = byId[ids[i]] !== undefined && byId[ids[i]] !== null
                  ? byId[ids[i]].retainedBy : null
                if (retained !== null && typeof retained === 'object'
                  && typeof retained.mainView === 'number' && retained.mainView > 0) return ids[i]
              }
            }
          }
        } catch (_) { /* 落到下一级 */ }
        return undefined
      }

      var host = document.createElement('div')
      host.setAttribute('data-annotation-for-dsh', '')
      document.body.appendChild(host)
      var overlay = document.createElement('div')
      overlay.setAttribute('data-annotation-overlay', '')
      overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:900;'
      document.body.appendChild(overlay)

      // 编号单独成层：overlay 是 z-index 900 的 stacking context，编号挂在里面
      // 只能跟着它走——既会被宿主里层级更高的内容压住，也会被输入框/头部的
      // 裁剪一起切掉（表现为「滚到输入框上就不显示」）。分层之后编号有自己
      // 统一的层级（1100，仍低于胶囊/菜单层），不随宿主文档结构变化，也不再
      // 参与标记层的裁剪。
      var numLayer = document.createElement('div')
      numLayer.setAttribute('data-annotation-num-layer', '')
      numLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1100;'
      document.body.appendChild(numLayer)

      var ui = {
        mode: 'closed',      // closed | actions | editing | composing
        editingId: null,     // 非空 = 正在编辑该 id 的已有批注（点角标进入）
        quote: '',
        quotes: [],          // [{ id, text, note, range, seqKey, rowHead, textOffset, ctxBefore, ctxAfter }]
        noteDraft: '',
        pos: { left: 0, top: 0 },
        error: null,
        busy: false,
        lastKey: '',
        pendingAnchor: null,
        el: null,
      }

      function readPendingQuotes(sessionId) {
        if (sessionId === undefined) return []
        try {
          return parsePendingQuotes(localStorage.getItem(pendingStorageKey(sessionId)))
        } catch (err) {
          console.warn('[annotation] 读取待发送批注失败：', err)
          return []
        }
      }

      function writePendingQuotes(sessionId) {
        if (sessionId === undefined) return
        try {
          var key = pendingStorageKey(sessionId)
          if (ui.quotes.length === 0) localStorage.removeItem(key)
          else localStorage.setItem(key, stringifyPendingQuotes(ui.quotes))
        } catch (err) {
          console.warn('[annotation] 保存待发送批注失败：', err)
        }
      }

      function writeCurrentPendingQuotes() {
        writePendingQuotes(readCurrentSessionId())
      }

      var ignoreUntil = 0
      var settleTimer = null

      // ---------- IME 合成 latch（对齐官方 InputBar composingRef）----------
      // macOS / 豆包等：compositionend 之后才会到 keydown(Enter, isComposing=false,
      // keyCode=13)，仅查 isComposing / 229 挡不住「上屏确认 Enter」。若此时
      // attachAndSend → setDraft，会打断合成，表现为只能打出拼音字母。
      // 延迟清 latch 与 InputBar 一致（略放宽到 50ms，兼容第三方输入法时序）。
      var imeComposing = false
      var imeClearTimer = null
      var imeTouchedAt = 0
      function markImeComposing() {
        imeComposing = true
        imeTouchedAt = Date.now()
        if (imeClearTimer !== null) {
          clearTimeout(imeClearTimer)
          imeClearTimer = null
        }
      }
      function markImeEnded() {
        if (imeClearTimer !== null) clearTimeout(imeClearTimer)
        imeClearTimer = setTimeout(function () {
          imeComposing = false
          imeClearTimer = null
        }, 50)
      }
      /** @param {KeyboardEvent} e */
      function isImeKeyBlocked(e) {
        if (e.isComposing === true || e.keyCode === 229) {
          imeTouchedAt = Date.now()
          return true
        }
        // compositionend 偶尔会丢失。只在浏览器已明确报告「非合成」且 latch
        // 1.2 秒没有活动时复位，避免一次异常把之后所有 Enter 永久锁死。
        if (imeComposing && imeClearTimer === null && Date.now() - imeTouchedAt >= 1200) {
          imeComposing = false
        }
        return imeComposing
      }
      document.addEventListener('compositionstart', markImeComposing, true)
      document.addEventListener('compositionend', markImeEnded, true)

      // ---------- 轻提示 ----------
      var toastTimer = null
      function showToast(msg) {
        try {
          var old = document.querySelector('[data-annotation-toast]')
          if (old !== null) old.remove()
          var el = document.createElement('div')
          el.setAttribute('data-annotation-toast', '')
          el.textContent = msg
          el.style.cssText = 'position:fixed;z-index:1300;left:50%;bottom:88px;transform:translateX(-50%);max-width:min(420px,calc(100vw - 24px));padding:8px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #2c2c2e));border:1px solid var(--dsw-alias-border-inverted);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family,system-ui);font-size:12px;pointer-events:none;'
          document.body.appendChild(el)
          if (toastTimer !== null) clearTimeout(toastTimer)
          toastTimer = setTimeout(function () {
            toastTimer = null
            if (el.parentNode) el.parentNode.removeChild(el)
          }, 3000)
        } catch (_) { /* toast 失败忽略 */ }
      }

      // ---------- 选区监听 ----------
      function selectionKey(sel) {
        if (sel === null || sel.rangeCount === 0) return ''
        var r = sel.getRangeAt(0)
        return String(r.startContainer === r.endContainer ? 1 : 0)
          + ':' + r.startOffset + ':' + r.endOffset + ':' + sel.toString().length
      }

      function onSelection() {
        if (window.__DSH_SELECTION_GROUP_SELECTION__ !== selectionApi) return
        if (ui.mode === 'editing' || ui.mode === 'composing') return
        var frame = selectionApi.getSnapshot()
        if (frame === null) { closeToolbar(); return }
        if (ui.selectionSnapshot !== frame) {
          if (!frame.recovering) frame.annotationAnchor = captureAnchor(frame.text)
          ui.selectionSnapshot = frame
        }
        ui.quote = frame.text
        ui.source = null
        ui.selectionRoot = frame.root
        if (window.__DSH_SELECTION_GROUP_IS_DRAGGING__?.() === true) return
        var rect = frame.rect
        if (!rect || rect.width <= 0 || rect.height <= 0) return
        ui.pos = placeAbove(rect, 40)
        var existing = ui.mode === 'actions' && ui.el !== null && host.contains(ui.el)
        ui.mode = 'actions'
        ui.error = null
        if (!existing) { render(); return }
        ui.el.style.left = ui.pos.left + 'px'
        ui.el.style.top = ui.pos.top + 'px'
        var button = ui.el.querySelector('button:not([data-dsh-selection-group-action])')
        var already = ui.quotes.some(function (q) { return q.text === ui.quote && !q.sourceUrl })
        button.disabled = already
        button.title = already ? t('actions.alreadyTitle') : t('actions.annotateTitle')
        button.textContent = already ? t('actions.already') : t('actions.annotate')
        if (!already) button.prepend(ICONS.plus())
        var currentIds = Array.from(ui.el.querySelectorAll('[data-dsh-selection-group-action]')).map(function (b) { return b.getAttribute('data-dsh-selection-group-action') }).join(',')
        var nextIds = (window.__DSH_SELECTION_GROUP_ACTIONS__?.() || []).map(function (action) { return action.id }).join(',')
        if (currentIds !== nextIds) render()
      }
      document.addEventListener('selectionchange', onSelection)
      window.__DSH_SELECTION_GROUP_CLOSE__ = function () { closeToolbar() }

      function clearSettle() {
        if (settleTimer !== null) { clearTimeout(settleTimer); settleTimer = null }
      }

      function onHostPointerDown() { ignoreUntil = Date.now() + 80 }
      host.addEventListener('pointerdown', onHostPointerDown)

      function onDocPointerDown(e) {
        if (ui.mode === 'actions' && !host.contains(e.target) && !overlay.contains(e.target)) {
          closeToolbar()
        }
      }
      document.addEventListener('pointerdown', onDocPointerDown, true)

      var anchorRaf = false
      var lostSince = 0
      var ANCHOR_LOST_MS = 1000
      function onLayoutChange() {
        if (anchorRaf) return
        anchorRaf = true
        requestAnimationFrame(function () {
          anchorRaf = false
          if (window.__DSH_SELECTION_GROUP_SELECTION__ !== selectionApi) return
          if (ui.quotes.length > 0) renderMarkers()
          updateChip()
          if (ui.mode === 'editing' && ui.el !== null) positionEditor(ui.el, ui.pos.left, ui.pos.top)
          if (ui.mode !== 'actions') return
          var rect = selectionApi.rect()
          if (!rect) { closeToolbar(); return }
          if (rect.width <= 0 || rect.height <= 0) return
          ui.pos = placeAbove(rect, 40)
          if (ui.el !== null) {
            ui.el.style.left = ui.pos.left + 'px'
            ui.el.style.top = ui.pos.top + 'px'
          }
        })
      }
      window.addEventListener('scroll', onLayoutChange, true)
      window.addEventListener('resize', onLayoutChange)

      function mutationRelevant(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var t = mutations[i].target
          var el = t instanceof Element ? t : (t && t.parentElement)
          if (el === null || !el.closest) return true
          if (el.closest('[data-composer-card]') || el.closest('[data-input-scroll]')
            || el.closest('[data-annotation-for-dsh]') || el.closest('[data-annotation-overlay]')
            || el.closest('[data-annotation-num-layer]')
            || el.closest('[data-annotation-chip]') || el.closest('[data-annotation-tip-layer]')) {
            continue
          }
          return true
        }
        return false
      }
      var observer = new MutationObserver(function (mutations) {
        if (!mutationRelevant(mutations)) return
        onLayoutChange()
        // 只有「消息行插入」批次才同步执行气泡装饰（隐藏批注块 + 贴标签）：
        // MutationObserver 回调在微任务阶段运行，早于浏览器绘制，
        // 用户看不到「先显示批注块再隐藏」的闪烁。
        // 流式输出期的主体 mutation 是 attributes/characterData（每个 token 帧一层
        // class/style/文本变更，实测 20s 内 245 批次 0 个 childList）：行插入本来
        // 就携带完整批注块，逐一触发全文档扫描（decorateAll 是 querySelectorAll +
        // 每行子树查询 + textContent，成本随会话长度线性增长）会在长会话上白白
        // 烧主线程；漏网场景由下方 1s 兜底轮询覆盖。
        var hasRowInsert = false
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].type === 'childList') { hasRowInsert = true; break }
        }
        if (hasRowInsert) {
          scheduleDecorateAll()
          return
        }
        // 流式批次: 只做助手回复芯片的限流装饰(行内 data-streaming 守卫已保证
        // 流式中不做替换, 结束后的首拍芯片滞后 ≤500ms), 不再逐批全文档扫描。
        scheduleAssistantDecorate()
      })
      observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true })

      function onKeyDown(e) {
        if (e.key === 'Escape') {
          if (ui.mode !== 'closed') closeToolbar()
          return
        }
        // 【回车随输入框发送】在 composer 里按 Enter（且已收集批注、非输入法合成）：
        // 提交前一刻把批注块拼进草稿，composer 自己的 Enter 提交继续——模型收到
        // 批注清单 + 用户输入的问题。用户始终看不到文本被塞进去。
        // IME 铁律（v1.3.10 修了 nativeEvent.keyCode；v1.3.11 补 compositionend
        // 后 Enter keyCode=13 的时序洞）：合成期 / 上屏确认 Enter 绝不能 setDraft。
        // 修饰键守卫（v1.3.18 修 issue #10）：Shift+Enter 换行、Alt+Enter 默认路径
        // 不触发拼稿；裸 Enter 继续处理带文字草稿，Cmd/Ctrl+Enter 只接管空草稿
        // 的纯批注。已有文字时交回 composer，保留宿主的 Queue / Steer 策略。
        // 纯批注的 Cmd/Ctrl+Enter 需要在这里直接提交：composer 的 accelerated 路径在
        // 「运行中 + 有排队消息」时会走 steerQueue，而不是发送当前草稿；我们在
        // capture 阶段 setDraft 后 stopPropagation，主动 submit('queue')，保证
        // 纯批注能直接发出，同时不会把批注块明文留在输入框。
        if (e.key === 'Enter' && !e.shiftKey && !e.altKey
          && ui.quotes.length > 0) {
          // 双分支门控：DSH ≥0.1.2 是 div[data-composer-input] 输入区，≤0.1.1 是 textarea。
          // 1.4.6 适配 0.1.2 时移除了 textarea 分支，旧核心上 Enter 因此不再拼入批注块
          // （只剩发送按钮路径可用）。两条分支并行保留。
          var input = e.target instanceof Element &&
            (e.target.closest('[data-composer-input]') ||
              (e.target instanceof HTMLTextAreaElement && e.target.closest('[data-composer-card]')))
          if (input && input.closest('[data-composer-card]') !== null) {
            if (isImeKeyBlocked(e)) {
              // 宿主的合成尾窗可能短于这里的 50ms。仅在本来会拼批注的
              // 手势上拦住宿主提交；不 preventDefault，保留输入法确认行为。
              if (shouldGuardImeEnter(e)) e.stopPropagation()
              return
            }
            var attached = attachAndSend(e)
            if (attached && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              e.stopPropagation()
              submitAttached()
            }
          }
        }
      }
      // capture 阶段：必须先于 composer 自己的 Enter 处理（React 在容器层冒泡
      // 提交）——否则等我们执行时消息已提交，拼稿永远太迟。
      document.addEventListener('keydown', onKeyDown, true)

      function submitAttached() {
        var current = readCurrentSessionId()
        if (current === undefined) {
          console.warn('[annotation] 无法确定当前会话，批注直接提交已跳过')
          return
        }
        var scoped = sessions.scope(current)
        if (scoped === undefined) {
          console.warn('[annotation] 当前会话 scope 不可用，批注直接提交已跳过')
          return
        }
        try {
          ctx.conversation.input.for(scoped).submit('queue')
        } catch (err) {
          console.warn('[annotation] 批注直接提交失败：', err)
        }
      }

      function sendButtonOf(target) {
        if (!(target instanceof Element) || typeof target.closest !== 'function') return null
        var button = target.closest('button')
        if (!(button instanceof HTMLButtonElement)
          || button.closest('[data-composer-card]') === null) return null
        var label = button.getAttribute('aria-label')
        return label === '发送消息' || label === 'Send message' ? button : null
      }

      // 鼠标/触控发送不经过 textarea 的 Enter 路径。pointerdown 能覆盖宿主因
      // 空草稿而禁用的发送按钮；已有文字时只拼稿，后续 click 仍由宿主提交。
      function onSendPointerDown(e) {
        if (ui.quotes.length === 0 || e.button !== 0) return
        var button = sendButtonOf(e.target)
        if (button === null) return
        var wasDisabled = button.disabled
        if (!attachAndSend({ ctrlKey: false, metaKey: false }) || !wasDisabled) return
        e.preventDefault()
        e.stopPropagation()
        submitAttached()
      }

      // 键盘/辅助技术激活按钮时没有 pointerdown，以 detail=0 的 click 补齐。
      function onSendKeyboardClick(e) {
        if (e.detail !== 0 || ui.quotes.length === 0 || sendButtonOf(e.target) === null) return
        attachAndSend({ ctrlKey: false, metaKey: false })
      }
      document.addEventListener('pointerdown', onSendPointerDown, true)
      document.addEventListener('click', onSendKeyboardClick, true)

      // ---------- 渲染 ----------
      function iconButton(cls, icon, title, onClick) {
        var b = document.createElement('button')
        b.type = 'button'
        b.className = cls
        b.title = title
        b.appendChild(icon())
        b.addEventListener('click', function () { ignoreUntil = Date.now() + 80; onClick() })
        return b
      }

      function ghostButton(icon, label, title, disabled, onClick) {
        var b = document.createElement('button')
        b.type = 'button'
        b.className = 'dsh-ann-ghost'
        b.title = title
        if (icon !== null) b.appendChild(icon())
        b.appendChild(document.createTextNode(label))
        b.disabled = disabled === true
        b.addEventListener('click', function () { ignoreUntil = Date.now() + 80; onClick() })
        return b
      }

      function render() {
        host.textContent = ''
        ui.el = null
        if (ui.mode === 'actions') {
          var bar = document.createElement('div')
          bar.className = 'dsh-ann-bar'
          bar.style.left = ui.pos.left + 'px'
          bar.style.top = ui.pos.top + 'px'
          var already = ui.quotes.some(function (q) { return q.text === ui.quote && (q.sourceUrl || '') === (ui.source && ui.source.sourceUrl || '') })
          bar.appendChild(ghostButton(
            already ? null : ICONS.plus,
            already ? t('actions.already') : t('actions.annotate'),
            already ? t('actions.alreadyTitle') : t('actions.annotateTitle'),
            already,
            enterEditing,
          ))
          try {
            var mergedActions = (typeof window.__DSH_SELECTION_GROUP_ACTIONS__ === 'function') ? window.__DSH_SELECTION_GROUP_ACTIONS__() : []
            for (var mergedIndex = 0; mergedIndex < mergedActions.length; mergedIndex++) {
              (function (mergedAction) {
                var mergedButton = ghostButton(null, mergedAction.label, mergedAction.title, false, function () { mergedAction.run() })
                mergedButton.setAttribute('data-dsh-selection-group-action', String(mergedAction.id))
                bar.appendChild(mergedButton)
              })(mergedActions[mergedIndex])
            }
          } catch (mergedActionError) {
            if (typeof console !== 'undefined' && typeof console.warn === 'function')
              console.warn('[dsh-selection-group] an injected toolbar action failed to render', mergedActionError)
          }
          host.appendChild(bar)
          ui.el = bar
        } else if (ui.mode === 'editing') {
          var card = document.createElement('div')
          card.className = 'dsh-ann-card'
          card.style.left = ui.pos.left + 'px'
          card.style.top = ui.pos.top + 'px'
          ui.el = card
          var head = document.createElement('div')
          head.className = 'dsh-ann-card-head'
          makeEditorDraggable(head, card)
          var headMain = document.createElement('div')
          headMain.className = 'dsh-ann-card-headmain'
          var title = document.createElement('div')
          title.className = 'dsh-ann-card-title'
          title.textContent = ui.editingId !== null ? t('edit.editTitle') : t('edit.addTitle')
          headMain.appendChild(title)
          // 编辑已有批注时，标题右侧紧邻一个删除按钮（新增批注没有可删对象）。
          if (ui.editingId !== null) {
            var editingId = ui.editingId
            var del = document.createElement('button')
            del.type = 'button'
            del.className = 'dsh-ann-qdel'
            del.title = t('edit.delete')
            del.setAttribute('aria-label', t('edit.delete'))
            del.appendChild(ICONS.trash())
            del.addEventListener('click', function () {
              closeToolbar()
              removeQuote(editingId)
            })
            headMain.appendChild(del)
          }
          head.appendChild(headMain)
          head.appendChild(iconButton('dsh-ann-icon', ICONS.close, t('common.cancel'), closeToolbar))
          card.appendChild(head)
          var quote = document.createElement('div')
          quote.className = 'dsh-ann-quote'
          quote.textContent = truncate(quoteWithSource({ text: ui.quote, sourcePath: ui.source && ui.source.sourcePath }), 200)
          quote.title = quoteWithSource({ text: ui.quote, sourcePath: ui.source && ui.source.sourcePath })
          card.appendChild(quote)
          var ta = document.createElement('textarea')
          ta.className = 'dsh-ann-input'
          ta.placeholder = t('edit.placeholder')
          ta.value = ui.noteDraft
          ta.spellcheck = false
          ta.addEventListener('input', function () { ui.noteDraft = ta.value })
          ta.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey && !isImeKeyBlocked(e)) { e.preventDefault(); saveAnnotation() }
          })
          card.appendChild(ta)
          var row = document.createElement('div')
          row.className = 'dsh-ann-row'
          var save = document.createElement('button')
          save.type = 'button'
          save.className = 'dsh-ann-action'
          save.appendChild(ICONS.check())
          save.appendChild(document.createTextNode(t('edit.save')))
          save.addEventListener('click', saveAnnotation)
          row.appendChild(save)
          card.appendChild(row)
          if (ui.error !== null) {
            var err = document.createElement('div')
            err.className = 'dsh-ann-error'
            err.textContent = ui.error
            card.appendChild(err)
          }
          host.appendChild(card)
          ta.focus()
          ta.setSelectionRange(ta.value.length, ta.value.length)
          requestAnimationFrame(function () {
            if (card.isConnected) positionEditor(card, ui.pos.left, ui.pos.top)
          })
        }
      }

      function positionEditor(card, left, top) {
        ui.pos = {
          left: Math.max(8, Math.min(left, window.innerWidth - card.offsetWidth - 8)),
          top: Math.max(8, Math.min(top, window.innerHeight - card.offsetHeight - 8)),
        }
        card.style.left = ui.pos.left + 'px'
        card.style.top = ui.pos.top + 'px'
      }

      function makeEditorDraggable(head, card) {
        var drag = null
        head.addEventListener('pointerdown', function (e) {
          if (e.button !== 0 || !e.isPrimary || e.target.closest('button')) return
          var r = card.getBoundingClientRect()
          drag = { id: e.pointerId, x: e.clientX - r.left, y: e.clientY - r.top }
          head.setPointerCapture(e.pointerId)
          e.preventDefault()
        })
        head.addEventListener('pointermove', function (e) {
          if (drag === null || e.pointerId !== drag.id) return
          positionEditor(card, e.clientX - drag.x, e.clientY - drag.y)
        })
        head.addEventListener('lostpointercapture', function () { drag = null })
      }

      // ---------- 批注标记 ----------
      var markersSig = null
      function markersSignature(blockers) {
        var parts = []
        for (var i = 0; i < ui.quotes.length; i++) {
          var q = ui.quotes[i]
          var range = locateQuote(q.text, q)
          if (range === null) { parts.push(q.id + ':gone'); continue }
          var rects = quoteRects(range, q)
          for (var c = 0; c < rects.length; c++) {
            var r = rects[c]
            if (r.width === 0 || r.height === 0) continue
            parts.push(q.id + ':' + Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.width) + ',' + Math.round(r.height))
          }
          if (rects.length > 0) parts.push(q.id + ':chip')
        }
        // 遮挡区（输入框 + 会话头部）也进签名：它们改变时编号必须重走
        // 让位/隐藏，否则旧位置会被裁剪成半截残影。
        for (var b = 0; b < blockers.length; b++) {
          var br = blockers[b]
          parts.push('b:' + Math.round(br.left) + ',' + Math.round(br.top) + ',' + Math.round(br.width) + ',' + Math.round(br.height))
        }
        return parts.join('|')
      }

      /** 按 CSS Modules local 名取宿主元素的可见矩形：类名形如 `wSkVaW_header`
       *  （哈希前缀随版本变），故认「以 _<local> 收尾的 class token」，
       *  headerActions / composerSeatInner 这类同前缀兄弟名不会被误认。 */
      function hostLocalRects(local) {
        var out = []
        var found = document.querySelectorAll('[class*="_' + local + '"]')
        var re = new RegExp('(^|\\s)[^\\s]*_' + local + '(\\s|$)')
        for (var i = 0; i < found.length; i++) {
          var cls = found[i].getAttribute('class') || ''
          if (!re.test(cls)) continue
          var r = found[i].getBoundingClientRect()
          if (r.width <= 0 || r.height <= 0) continue
          if (r.bottom <= 0 || r.top >= window.innerHeight) continue
          out.push(r)
        }
        return out
      }

      /** 会话列的可视范围（x 轴 + 上沿）：优先 `data-conversation-scroll`（#63，
       *  data 属性跨版本稳定，已核实 0.2.0-rc.2 仍在 ui-chat/ChatView.tsx），
       *  找不到时退回 scrollBody 类名启发式取并集。侧边栏文件预览的批注与
       *  顶栏横带在 x 轴上重叠（#57），顶栏挖洞必须限制在会话列内。 */
      function conversationColumnRange() {
        var view = document.querySelector('[data-conversation-scroll]')
        var r = view !== null && typeof view.getBoundingClientRect === 'function'
          ? view.getBoundingClientRect() : null
        if (r === null || r.width <= 0) {
          var rects = hostLocalRects('scrollBody')
          if (rects.length === 0) return null
          var left = Infinity
          var right = -Infinity
          var top = Infinity
          for (var i = 0; i < rects.length; i++) {
            left = Math.min(left, rects[i].left)
            right = Math.max(right, rects[i].right)
            top = Math.min(top, rects[i].top)
          }
          return { left: left, right: right, top: top }
        }
        return { left: r.left, right: r.right, top: r.top }
      }

      /** 会盖住会话内容的宿主头部：标记层是 fixed 定位，原生绘制顺序上恒在
       *  头部之上——只有把头部区域从标记层裁掉，编号与高亮才会像会话内容
       *  一样被头部遮住。
       *  #63：只取会话列以内的部分。顶栏横带在侧边栏上方同样延伸，若整幅
       *  裁掉会把侧边栏文件批注一并裁掉；且类名启发式（_<header>）也会误中
       *  侧边栏自己的头——故逐个矩形与会话列求交，完全在列外的直接丢弃。 */
      function hostHeaderRects() {
        var col = conversationColumnRange()
        var rects = hostLocalRects('header')
        if (col === null) return []
        var out = []
        for (var i = 0; i < rects.length; i++) {
          var r = rects[i]
          var left = Math.max(r.left, col.left)
          var right = Math.min(r.right, col.right)
          if (right - left <= 0) continue
          out.push({
            left: left, right: right, top: r.top, bottom: r.bottom,
            width: right - left, height: r.bottom - r.top,
          })
        }
        return out
      }

/** 输入区（整块 composer 容器，含输入卡片与下方统计行）——不是单个
       *  `[data-composer-card]`：卡片下方那段同样被容器盖住，编号落在那里
       *  会像「显示在对话区下面」。找不到容器时退回输入卡片。 */
      function hostComposerRects() {
        var rects = hostLocalRects('composerSeat')
        if (rects.length > 0) return rects
        var card = document.querySelector('[data-composer-card]')
        if (card === null) return []
        var r = card.getBoundingClientRect()
        return r.width > 0 && r.height > 0 ? [r] : []
      }

      /** 外框保留、逐个矩形挖空（evenodd）：标记层的裁剪路径。 */
      function clipWithHoles(rects) {
        var d = 'polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0'
        for (var i = 0; i < rects.length; i++) {
          var r = rects[i]
          d += ', ' + r.left + 'px ' + r.top + 'px, ' + r.right + 'px ' + r.top + 'px, '
            + r.right + 'px ' + r.bottom + 'px, ' + r.left + 'px ' + r.bottom + 'px, '
            + r.left + 'px ' + r.top + 'px'
        }
        return d + ')'
      }

      function renderMarkers() {
        // 对整个标记层挖去输入区与会话头部区域；滚动、尺寸变化时即使原文没动也要刷新。
        var holes = hostComposerRects().concat(hostHeaderRects())
        overlay.style.clipPath = holes.length > 0 ? clipWithHoles(holes) : 'none'
        // 编号层用同一条裁剪路径兜底：编号只允许出现在会话内容可视区里，
        // 绝不压在输入框或会话头部之上（定位逻辑已先让位/隐藏，这里是保险）。
        numLayer.style.clipPath = overlay.style.clipPath
        var sig = markersSignature(holes)

        if (sig !== markersSig) {
          markersSig = sig
          overlay.textContent = ''
          numLayer.textContent = ''
          buildMarkers()
        }
      }

      function buildMarkers() {
        if (ui.quotes.length === 0) return
        var placed = []
        for (var i = 0; i < ui.quotes.length; i++) {
          var q = ui.quotes[i]
          var range = locateQuote(q.text, q)
          if (range === null) continue
          var rects = quoteRects(range, q)
          for (var c = 0; c < rects.length; c++) {
            var rect = rects[c]
            if (rect.width === 0 || rect.height === 0) continue
            var hl = document.createElement('div')
            hl.className = 'dsh-ann-hl'
            hl.style.left = rect.left + 'px'
            hl.style.top = rect.top + 'px'
            hl.style.width = rect.width + 'px'
            hl.style.height = rect.height + 'px'
            overlay.appendChild(hl)
          }
          var anchor = null
          for (var k = 0; k < rects.length; k++) {
            var r = rects[k]
            if (r.width === 0 || r.height === 0) continue
            if (r.top > -8 && r.top < window.innerHeight) { anchor = r; break }
          }
          if (anchor === null && rects.length > 0 && rects[0].width > 0) anchor = rects[0]
          if (anchor !== null) {
            var chipTop = anchor.top - 20
            if (chipTop < 4) chipTop = Math.min(anchor.top + 2, window.innerHeight - 22)
            if (chipTop < 4) chipTop = 4
            // #63：编号下限抬到会话列可视区上沿 + 4px——原文起于其下时，把落在
            // 顶栏横带里的编号压回正文区（而不是被裁成半截或整条跳过）；原文
            // 顶部已滚入顶栏之下时不钳制，仍走下方「与遮挡区相交即跳过」的
            // 逻辑（跟正文一样，滚出可视区即消失）。
            var col = conversationColumnRange()
            var chipFloor = col !== null ? col.top + 4 : 4
            if (col !== null && anchor.top >= chipFloor && chipTop < chipFloor) chipTop = chipFloor
            var chipLeft = Math.max(4, Math.min(anchor.left - 4, window.innerWidth - 24))
            // 编号只允许出现在「会话正文实际看得见」的地方：跟正文一样，滚出
            // 内容可视区就消失，绝不贴边钉住（钉住会浮在输入框上/下面的空处）。
            // 两条判据：① 落在正文滚动容器里；② 不与宿主遮挡 UI（会话头部、
            // 整块输入区）相交。任一不满足就整条不渲染——不渲染也就不会出现
            // 被裁掉半截的"阴影残影"。
            var skipChip = false
            var views = hostLocalRects('scrollBody')
            for (var vc = 0; vc < views.length; vc++) {
              var vr = views[vc]
              if (chipLeft + 26 <= vr.left || chipLeft >= vr.right) continue
              if (chipTop < vr.top || chipTop + 18 > vr.bottom) skipChip = true
              break
            }
            var blockers = hostHeaderRects().concat(hostComposerRects())
            for (var bc = 0; bc < blockers.length && !skipChip; bc++) {
              var bk = blockers[bc]
              if (chipLeft + 26 <= bk.left || chipLeft >= bk.right) continue
              if (chipTop + 18 > bk.top && chipTop < bk.bottom) skipChip = true
            }
            if (!skipChip) {
              var chip = document.createElement('div')
              chip.className = 'dsh-ann-num'
              chip.textContent = String(i + 1)
              var tries = 0
              while (tries < 12) {
                var clash = false
                for (var p = 0; p < placed.length; p++) {
                  var bp = placed[p]
                  if (Math.abs(bp.left - chipLeft) < 18 && Math.abs(bp.top - chipTop) < 18) {
                    clash = true
                    break
                  }
                }
                if (!clash) break
                chipLeft += 18
                if (chipLeft > window.innerWidth - 24) { chipLeft = 4; chipTop += 18 }
                tries++
              }
              placed.push({ left: chipLeft, top: chipTop })
              chip.style.left = chipLeft + 'px'
              chip.style.top = chipTop + 'px'
              ;(function (q) {
                chip.addEventListener('click', function (ev) {
                  ev.stopPropagation()
                  openEditorFor(q)
                })
              })(q)
              numLayer.appendChild(chip)
            }
          }
        }
      }

      // ---------- 动作 ----------
      function captureAnchor(text) {
        var anchor = {
          range: null, seqKey: '', rowHead: '', textOffset: -1,
          ctxBefore: '', ctxAfter: '',
        }
        try {
          var sel = window.getSelection()
          if (sel === null || sel.isCollapsed || sel.rangeCount === 0) return anchor
          var live = sel.getRangeAt(0)
          var liveText = live.toString()
          // 选区文本与 settle 快照一致才持有 live range；不一致（选区微变、DOM
          // 被批注芯片等装饰改写）时也绝不返回全空锚——尽力抓行级锚点
          // （seqKey/rowHead），让 locateQuote 在锚点消息内宽松重定位。
          var textMatch = liveText.trim() === text
            || liveText.trim().replace(/\s+/g, ' ') === text.replace(/\s+/g, ' ')
          if (textMatch) {
            anchor.range = live.cloneRange()
          }
          var source = documentSourceOf(live.commonAncestorContainer)
          if (source !== null) {
            anchor.sourceUrl = source.sourceUrl
            anchor.sourcePath = source.sourcePath
            anchor.textOffset = offsetOfRangeInRow(source.root, live) + liveText.indexOf(text)
            return anchor
          }
          var node = live.commonAncestorContainer
          var el = node instanceof Element ? node : (node !== null ? node.parentElement : null)
          // 主视图锚 key 为 data-chat-anchor-key；focus-chat 视图为
          // data-focus-anchor-key，两者等价（消息 seq 锚定）。
          while (el !== null && el !== document.body
            && !el.hasAttribute('data-chat-anchor-key')
            && !el.hasAttribute('data-focus-anchor-key')) {
            el = el.parentElement
          }
          if (el !== null
            && (el.hasAttribute('data-chat-anchor-key') || el.hasAttribute('data-focus-anchor-key'))) {
            anchor.seqKey = el.getAttribute('data-chat-anchor-key')
              || el.getAttribute('data-focus-anchor-key') || ''
            if (textMatch) {
              var itemText = el.textContent || ''
              var realOff = offsetOfRangeInRow(el, live)
              if (realOff >= 0) {
                anchor.textOffset = realOff
                anchor.ctxBefore = itemText.slice(Math.max(0, realOff - 24), realOff)
                anchor.ctxAfter = itemText.slice(realOff + text.length, realOff + text.length + 24)
              }
            }
          }
          var row = assistantRowOf(live.commonAncestorContainer)
          if (row !== null) {
            anchor.rowHead = (row.textContent || '').slice(0, 24)
          }
        } catch (_) { /* 抓取失败则保持空锚 */ }
        return anchor
      }

      function enterEditing() {
        var frame = selectionApi.getSnapshot()
        if (frame === null) { closeToolbar(); return }
        ui.quote = frame.text
        ui.source = null
        ui.selectionRoot = frame.root
        ui.mode = 'editing'
        ui.noteDraft = ''
        ui.error = null
        ui.editingId = null
        ui.pendingAnchor = frame.annotationAnchor || captureAnchor(frame.text)
        render()
      }

      /** 点击角标数字 → 重新打开该批注的编辑面板（预填批注内容，可修改后保存）。 */
      function openEditorFor(q) {
        ui.mode = 'editing'
        ui.quote = q.text
        ui.source = q
        ui.noteDraft = q.note !== undefined ? q.note : ''
        ui.error = null
        ui.editingId = q.id
        ui.pendingAnchor = null
        var range = locateQuote(q.text, q)
        var rect = range !== null ? range.getBoundingClientRect() : null
        ui.pos = rect !== null && rect.width > 0
          ? placeAbove(rect, 40)
          : { left: 8, top: 8 }
        render()
      }

      /** 组装批注块；只有附带正文时才添加「提问：」分隔标记。 */
      function buildBlock(hasQuestion) {
        var n = ui.quotes.length
        var parts = ui.quotes.map(function (q, i) {
          var s = (i + 1) + '. ' + quoteWithSource(q).replace(/\n/g, '\n   ')
          if (q.note !== undefined && q.note.trim() !== '') {
            s += '\n   ' + t('block.notePrefix') + q.note.replace(/\n/g, '\n    ')
          }
          return s
        })
        return t(hasQuestion ? 'block.head' : 'block.headOnly', { n: n }) + '\n\n'
          + parts.join('\n\n')
          + '\n\n' + t(hasQuestion ? 'block.format' : 'block.formatOnly', { n: n })
          + (hasQuestion ? '\n\n' + t('block.marker') : '')
      }

      function shouldAttachForEnter(e, draft) {
        return !(e.ctrlKey || e.metaKey) || draft.trim() === ''
      }

      /** 裸斜杠开头的草稿按宿主约定是命令（/goal、/model 等）：
       *  宿主输入机靠「草稿以命令 token 开头」维持命令声明。 */
      function isCommandDraft(draft) {
        return draft.trimStart().charAt(0) === '/'
      }

      /** 合成结束后的保护窗只拦住原本会携带批注的提交。
       *  原生合成信号仍交给宿主编辑器，草稿读取不改动合成文本。 */
      function shouldGuardImeEnter(e) {
        if (imeClearTimer === null || e.isComposing === true || e.keyCode === 229) return false
        var current = readCurrentSessionId()
        if (current === undefined) return false
        try {
          var scoped = sessions.scope(current)
          if (scoped === undefined) return false
          var draft = ctx.conversation.input.for(scoped).state.getSnapshot().draft || ''
          return shouldAttachForEnter(e, draft) && !isCommandDraft(draft)
        } catch (_) { return false }
      }

      /** 提交前把批注块拼进 composer 草稿（随回车一起发送）。
       *  返回 true 表示批注块已在草稿中（本次刚拼入，或之前已拼入未发送）。 */
      function attachAndSend(e) {
        var current = readCurrentSessionId()
        if (current === undefined) {
          console.warn('[annotation] 无法确定当前会话，批注未拼入草稿')
          showToast(t('toast.noSession'))
          return false
        }
        try {
          var scoped = sessions.scope(current)
          if (scoped === undefined) {
            console.warn('[annotation] 当前会话 scope 不可用，批注未拼入草稿')
            showToast(t('toast.noSession'))
            return false
          }
          var shell = ctx.conversation.input.for(scoped)
          var st = shell.state.getSnapshot()
          var draft = st.draft || ''
          if (!shouldAttachForEnter(e, draft)) return false
          // 斜杠命令不拼批注（issue #20）：批注块前置会破坏命令 token 前缀，
          // 宿主 watchClaim 释放声明后 /goal 被降级为普通消息；后置追加则会
          // 把块原样并入命令参数。命令草稿原样放行，批注保留待下一条消息。
          if (isCommandDraft(draft)) {
            showToast(t('toast.skipCommand'))
            return false
          }
          // 草稿已含批注块（上次追加未发送）→ 不重复追加（zh/en 双哨兵）。
          if (hasAnnotationBlock(draft)) {
            annotationAttached = true
            return true
          }
          var hasQuestion = draft.trim() !== ''
          var block = buildBlock(hasQuestion)
          shell.setDraft(block + (hasQuestion ? '\n' + draft : ''))
          annotationAttached = true
          console.log('[annotation] 批注块已拼入草稿，回车将随消息发送（' + ui.quotes.length + ' 条）')
          return true
        } catch (err) {
          console.warn('[annotation] 批注拼稿失败：', err)
          showToast(t('toast.attachFail') + (err && err.message ? err.message : err))
          return false
        }
      }

      // 批注保存/删除完成后把焦点还给 composer 输入框（光标在末尾），
      // 用户可直接回车发送，无需再点一下输入框。
      // preventScroll：长会话中选中文字时输入框可能在视口外，默认 focus
      // 会强制滚动页面（视觉上"卡一下"）；延迟一帧让卡片关闭动画先完成，
      // 焦点回归更平滑。
      function focusComposer() {
        var input = document.querySelector('[data-composer-card] [data-composer-input]')
        if (!(input instanceof HTMLElement) || !input.isContentEditable) return
        requestAnimationFrame(function () {
          if (!input.isConnected) return
          input.focus({ preventScroll: true })
          var selection = window.getSelection()
          if (selection !== null) {
            selection.selectAllChildren(input)
            selection.collapseToEnd()
          }
        })
      }

      function saveAnnotation() {
        var text = ui.quote
        if (text === '') { ui.error = t('error.noSelection'); render(); return }
        var note = ui.noteDraft.trim()
        // 编辑已有批注（点击角标进入）：按 id 更新批注内容。
        if (ui.editingId !== null) {
          for (var ei = 0; ei < ui.quotes.length; ei++) {
            if (ui.quotes[ei].id === ui.editingId) {
              ui.quotes[ei].note = note
              ui.editingId = null
              ui.pendingAnchor = null
              ui.noteDraft = ''
              ui.error = null
              writeCurrentPendingQuotes()
              closeToolbar()
              updateChip()
              renderMarkers()
              focusComposer()
              return
            }
          }
          ui.editingId = null
        }
        if (!ui.quotes.some(function (q) { return q.text === text && (q.sourceUrl || '') === (ui.pendingAnchor && ui.pendingAnchor.sourceUrl || '') })) {
          var a = ui.pendingAnchor || { range: null, seqKey: '', rowHead: '', textOffset: -1, ctxBefore: '', ctxAfter: '' }
          ui.quotes.push({
            id: 'q-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
            text: text,
            note: note,
            range: a.range,
            ...(a.sourceUrl ? { sourceUrl: a.sourceUrl, sourcePath: a.sourcePath } : {}),
            seqKey: a.seqKey,
            rowHead: a.rowHead,
            textOffset: a.textOffset,
            ctxBefore: a.ctxBefore,
            ctxAfter: a.ctxAfter,
          })
        }
        writeCurrentPendingQuotes()
        ui.pendingAnchor = null
        ui.noteDraft = ''
        ui.error = null
        closeToolbar()
        updateChip()
        renderMarkers()
        focusComposer()
      }

      function removeQuote(id) {
        ui.quotes = ui.quotes.filter(function (q) { return q.id !== id })
        writeCurrentPendingQuotes()
        updateChip()
        render()
        renderMarkers()
        // 面板正在显示时同步重建：否则删掉的条目还留在面板里，必须重新 hover 才消失。
        if (tipOwner === chipLayer) showChipTip()
      }

      function closeToolbar() {
        if (window.__DSH_SELECTION_GROUP_SELECTION__ === selectionApi) selectionApi.clear()
        if (ui.mode === 'closed') return
        clearSettle()
        ui.mode = 'closed'
        ui.error = null
        ui.busy = false
        ui.lastKey = ''
        ui.editingId = null
        render()
      }

      // ---------- 输入框旁的批注标签（N 条批注 · 悬浮看全部内容） ----------
      var chipLayer = document.createElement('div')
      chipLayer.setAttribute('data-annotation-chip', '')
      chipLayer.style.cssText = 'position:fixed;z-index:1150;display:none;align-items:center;gap:4px;height:22px;padding:0 10px;border-radius:11px;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #2c2c2e));box-shadow:var(--dsw-shadow-lv3);font-family:var(--dsw-font-family,system-ui);font-size:11px;color:var(--dsw-alias-label-primary);cursor:default;animation:dsh-ann-pop .12s var(--ds-ease-in-out, ease);'
      document.body.appendChild(chipLayer)
      var tipLayer = document.createElement('div')
      tipLayer.setAttribute('data-annotation-tip-layer', '')
      document.body.appendChild(tipLayer)
      // tipLayer 是三类悬浮面板（输入框胶囊 / 气泡标签 / 回复芯片）共享的单例容器。
      // 记录当前面板的归属元素：任何清空都必须指名归属，无归属清空会误杀用户
      // 正在观看的面板——宿主 layout mutation 会高频触发 updateChip，面板刚显示
      // 就被抹掉（表现为「芯片显示内容后直接消失」）。
      var tipOwner = null
      function clearTip(owner) {
        if (owner !== undefined && tipOwner !== owner) return
        tipLayer.textContent = ''
        tipOwner = null
      }
      function presentTip(owner, el) {
        tipLayer.textContent = ''
        tipLayer.appendChild(el)
        tipOwner = owner
      }
      // 共享容器的监听器只注册一次（sharedTipMouseEnter / sharedTipMouseLeave）。
      // 气泡标签与回复芯片会被反复重建：原先每个面板在 mouseenter 里都往共享容器
      // 追加一对监听器却从不移除，每重建一代净增两个闭包（持有已废弃的 grace 定时器
      // 与被移出 DOM 的触发元素）。这里改为两处固定监听器 + 一个「当前面板的关闭钩子」
      // 指针（tipActiveHide），由面板在 mouseenter 时登记，真正关闭后解除。
      var tipActiveHide = null
      function sharedTipMouseEnter() {
        if (tipActiveHide === null) return
        tipActiveHide.keep()
      }
      function sharedTipMouseLeave() {
        if (tipActiveHide === null) return
        tipActiveHide.hide()
      }
      tipLayer.addEventListener('mouseenter', sharedTipMouseEnter)
      tipLayer.addEventListener('mouseleave', sharedTipMouseLeave)
      var observedComposer = null
      var composerObserver = typeof ResizeObserver === 'function'
        ? new ResizeObserver(onLayoutChange)
        : null

      /** 待发送胶囊必须让开整个输入区：队列的「立即发送」按钮在卡片上方
       *  的 dock 内（#60）。优先稳定的 data hook，旧宿主认完整 CSS local，
       *  不能误中 composerSeatInner；没有 seat 的宿主仍以输入卡片为锚。 */
      function composerSeatOf(card) {
        var seat = card.closest('[data-composer-seat]')
        if (seat !== null) return seat
        for (var el = card.parentElement; el !== null; el = el.parentElement) {
          if (/(^|\s)\S*_composerSeat(\s|$)/.test(el.getAttribute('class') || '')) return el
        }
        return card
      }

      var chipReservation = null
      var chipLayoutRaf = null
      function settleChipLayout(saved, scroller, followTail, landing) {
        if (chipLayoutRaf !== null) cancelAnimationFrame(chipLayoutRaf)
        // The host also observes composer height. Re-measure after it commits,
        // rather than waiting for the reader's next wheel/scroll event.
        chipLayoutRaf = requestAnimationFrame(function () {
          chipLayoutRaf = null
          if (chipReservation !== saved || !saved.seat.isConnected
            || window.__DSH_SELECTION_GROUP_SELECTION__ !== selectionApi) return
          if (followTail && scroller.isConnected && Math.abs(scroller.scrollTop - landing) <= 2)
            scroller.scrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
          updateChip()
          renderMarkers()
        })
      }
      function releaseChipSpace() {
        if (chipLayoutRaf !== null) { cancelAnimationFrame(chipLayoutRaf); chipLayoutRaf = null }
        if (chipReservation === null) return
        var saved = chipReservation
        chipReservation = null
        // Restore only our own padding; do not overwrite a newer host style.
        if (saved.seat.style.getPropertyValue('padding-top') === saved.applied
          && saved.seat.style.getPropertyPriority('padding-top') === 'important') {
          if (saved.inline) saved.seat.style.setProperty('padding-top', saved.inline, saved.priority)
          else saved.seat.style.removeProperty('padding-top')
        }
      }
      function hideChip() {
        chipLayer.style.display = 'none'
        releaseChipSpace()
        clearTip(chipLayer)
      }
      function updateChip() {
        if (ui.quotes.length === 0) { hideChip(); return }
        chipLayer.textContent = ''
        var b = document.createElement('b')
        b.style.cssText = 'color:var(--dsw-alias-text-accent,#4c9aff);font-weight:700;'
        b.textContent = String(ui.quotes.length)
        chipLayer.appendChild(b)
        chipLayer.appendChild(document.createTextNode(plural('chip.count', ui.quotes.length)))
        var card = document.querySelector('[data-composer-card]')
        var seat = card === null ? null : composerSeatOf(card)
        if (seat !== observedComposer) {
          releaseChipSpace()
          if (composerObserver !== null) composerObserver.disconnect()
          observedComposer = seat
          if (composerObserver !== null && seat !== null) composerObserver.observe(seat)
        }
        if (card === null) { hideChip(); return }
        var r = card.getBoundingClientRect()
        if (r.width === 0 || r.height === 0 || r.right <= 0 || r.bottom <= 0
          || r.left >= window.innerWidth || r.top >= window.innerHeight) { hideChip(); return }
        chipLayer.style.display = 'flex'
        chipLayer.style.whiteSpace = 'nowrap'
        chipLayer.style.boxSizing = 'border-box'
        chipLayer.style.maxWidth = 'calc(100vw - 16px)'
        var w = chipLayer.offsetWidth || 80
        var h = chipLayer.offsetHeight || 24
        if (chipReservation === null) {
          chipReservation = { seat: seat, inline: seat.style.getPropertyValue('padding-top'),
            priority: seat.style.getPropertyPriority('padding-top'),
            base: parseFloat(getComputedStyle(seat).paddingTop) || 0, applied: '' }
        }
        // Reserve a real row inside the composer seat, above its queue and card.
        // Merely moving a fixed chip left would overlap the preceding message.
        var padding = (chipReservation.base + h + 12) + 'px'
        var changed = seat.style.getPropertyValue('padding-top') !== padding
          || seat.style.getPropertyPriority('padding-top') !== 'important'
        var scroller = seat.closest('[data-conversation-scroll]')
        var followTail = scroller !== null
          && scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop <= 2
        if (changed) {
          seat.style.setProperty('padding-top', padding, 'important')
          // A sticky composer grows upwards while the scroll range grows downwards.
          // Keep an existing tail landing; never pull a history reader to the end.
          if (followTail) scroller.scrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
        }
        chipReservation.applied = padding
        if (changed) settleChipLayout(chipReservation, scroller, followTail, scroller === null ? 0 : scroller.scrollTop)
        var top = seat.getBoundingClientRect().top
          + (parseFloat(getComputedStyle(seat).borderTopWidth) || 0) + chipReservation.base + 6
        if (top < 8 || top + h > window.innerHeight - 8) { hideChip(); return }
        r = card.getBoundingClientRect()
        chipLayer.style.left = Math.max(8, Math.min(r.left + 12, window.innerWidth - w - 8)) + 'px'
        chipLayer.style.top = top + 'px'
      }

      // 悬停宽限：标签与面板间有间隙，鼠标跨越间隙的瞬间不在任何元素上——
      // 离开后给 250ms 宽限期，期间进入面板则取消关闭（官方 HoverCard 的
      // pointer-grace 同款思路），同时杜绝闪烁循环。
      //
      // 但固定 250ms 只是「赌手快」：面板定位是 r.bottom + 6 或 r.top - h - 6，
      // 与触发元素之间有 6px 间隙，指针停在间隙里把宽限走满，面板照样消失；
      // 触摸板细调或系统卡顿更容易命中。这里改成确定性判定：宽限到点时复查
      // **实时**指针位置，只要还在「触发元素 + 面板 + 间隙容差」的并集内就不关闭。
      //
      // 必须用实时坐标：mouseleave 事件的 clientX/clientY 是离开那一刻的，
      // 250ms 后再拿它判断会读到过期位置，等于没判。
      var TIP_GAP_TOLERANCE = 10
      var livePointerX = null
      var livePointerY = null
      function onTipPointerMove(e) {
        livePointerX = e.clientX
        livePointerY = e.clientY
      }
      document.addEventListener('pointermove', onTipPointerMove, true)
      function pointerInsideRect(r) {
        if (r === undefined || r === null) return false
        if (livePointerX === null || livePointerY === null) return false
        return livePointerX >= r.left - TIP_GAP_TOLERANCE && livePointerX <= r.right + TIP_GAP_TOLERANCE
          && livePointerY >= r.top - TIP_GAP_TOLERANCE && livePointerY <= r.bottom + TIP_GAP_TOLERANCE
      }
      /** 实时指针是否仍在任一已展开面板内（含间隙容差）。 */
      function pointerWithinTipLayer() {
        for (var i = 0; i < tipLayer.childNodes.length; i++) {
          var node = tipLayer.childNodes[i]
          if (node.nodeType !== 1 || typeof node.getBoundingClientRect !== 'function') continue
          if (pointerInsideRect(node.getBoundingClientRect())) return true
        }
        return false
      }
      /** 关不关面板的统一判据：指针还在面板上或触发元素上就保持展开。 */
      function shouldKeepTipOpen(trigger) {
        if (pointerWithinTipLayer()) return true
        if (trigger === undefined || trigger === null) return false
        if (typeof trigger.getBoundingClientRect !== 'function') return false
        return pointerInsideRect(trigger.getBoundingClientRect())
      }
      var hoverGrace = null
      // 触发元素由调用方传入：面板留在 DOM 里时指针常常停在触发元素上
      // （还没移进面板），只判面板矩形会误关。
      function scheduleHide(trigger) {
        if (hoverGrace !== null) clearTimeout(hoverGrace)
        hoverGrace = setTimeout(function () {
          hoverGrace = null
          if (shouldKeepTipOpen(trigger)) return
          releaseActiveTip()
          clearTip(chipLayer)
        }, 250)
      }
      function cancelHide() {
        if (hoverGrace !== null) { clearTimeout(hoverGrace); hoverGrace = null }
      }
      /** 面板已真正关闭时解除登记：此后共享容器上的 mouseenter/leave 不再有对象可派发。 */
      function releaseActiveTip() {
        tipActiveHide = null
      }
      chipLayer.addEventListener('mouseenter', function () {
        cancelHide()
        showChipTip()
        tipActiveHide = { keep: cancelHide, hide: function () { scheduleHide(chipLayer) } }
      })
      chipLayer.addEventListener('mouseleave', function () { scheduleHide(chipLayer) })

      function showChipTip() {
        if (ui.quotes.length === 0) return
        var el = document.createElement('div')
        el.className = 'dsh-ann-tip'
        el.style.cssText = 'position:fixed;z-index:1160;box-sizing:border-box;width:300px;max-width:calc(100vw - 16px);padding:10px 12px;border-radius:12px;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #2c2c2e));box-shadow:var(--dsw-shadow-lv3);font-family:var(--dsw-font-family,system-ui);font-size:12px;color:var(--dsw-alias-label-primary);'
        var head = document.createElement('div')
        head.style.cssText = 'font-weight:600;margin-bottom:6px;'
        head.textContent = t('tip.title', { n: ui.quotes.length })
        el.appendChild(head)
        for (var i = 0; i < ui.quotes.length; i++) {
          var q = ui.quotes[i]
          var item = document.createElement('div')
          item.style.cssText = 'padding:6px 0;border-top:1px solid var(--dsw-alias-border-strong,#444);'
          var num = document.createElement('span')
          num.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;margin-right:6px;border-radius:8px;background:var(--dsw-alias-text-accent,#4c9aff);color:#fff;font-size:10px;font-weight:700;'
          num.textContent = String(i + 1)
          var body = document.createElement('span')
          body.style.cssText = 'font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary);'
          body.textContent = truncate(quoteWithSource(q), 100)
          item.appendChild(num)
          item.appendChild(body)
          if (q.note !== undefined && q.note.trim() !== '') {
            var note = document.createElement('div')
            note.style.cssText = 'font-size:11px;color:var(--dsw-alias-label-secondary);margin:2px 0 0 22px;word-break:break-word;'
            note.textContent = t('tip.notePrefix') + truncate(q.note, 60)
            item.appendChild(note)
          }
          var del = document.createElement('button')
          del.type = 'button'
          del.textContent = t('tip.del')
          del.style.cssText = 'margin-left:8px;background:transparent;border:1px solid rgba(255,107,107,.4);color:#ff8a8a;border-radius:6px;font-size:10px;cursor:pointer;padding:1px 6px;'
          ;(function (qid) {
            del.addEventListener('click', function (ev) {
              ev.stopPropagation()
              removeQuote(qid)
            })
          })(q.id)
          item.appendChild(del)
          el.appendChild(item)
        }
        presentTip(chipLayer, el)
        var r2 = chipLayer.getBoundingClientRect()
        var w2 = 300
        var gap = 8
        // 浮窗只允许出现在正文可见区里（避开会话头部与整块输入区）：批注条数多
        // 时先把它限制在这个高度内、内部滚动——否则十来个批注会把浮窗顶出屏幕
        // 或压到输入框上，看起来就是"浮窗显示错乱"。
        var topLimit = gap
        var heads = hostHeaderRects()
        for (var hi = 0; hi < heads.length; hi++) {
          if (r2.left + w2 <= heads[hi].left || r2.left >= heads[hi].right) continue
          if (heads[hi].bottom + gap > topLimit) topLimit = heads[hi].bottom + gap
        }
        var bottomLimit = window.innerHeight - gap
        var seats = hostComposerRects()
        for (var si = 0; si < seats.length; si++) {
          if (r2.left + w2 <= seats[si].left || r2.left >= seats[si].right) continue
          if (seats[si].top - gap < bottomLimit) bottomLimit = seats[si].top - gap
        }
        var room = Math.round(r2.top - gap - topLimit)
        if (room < 120) room = Math.round(bottomLimit - r2.bottom - gap)
        room = Math.max(80, room)
        el.style.maxHeight = room + 'px'
        el.style.overflowY = 'auto'
        var h2 = Math.min(el.offsetHeight || 120, room)
        var top = r2.top - h2 - gap
        if (top < topLimit) top = r2.bottom + gap
        if (top + h2 > bottomLimit) top = bottomLimit - h2
        el.style.left = Math.max(8, Math.min(r2.left, window.innerWidth - w2 - 8)) + 'px'
        el.style.top = Math.round(Math.max(topLimit, top)) + 'px'
        el.style.width = w2 + 'px'
      }

      // ---------- 发送完成监听（草稿从有内容变空 → 清空批注集） ----------
      var inputUnsub = null
      // 仅当批注块真正拼入过草稿（用户按过回车）才在草稿清空时清除批注，
      // 避免普通草稿编辑（打字后删字）误触发「已发送」判定而清空批注集。
      var annotationAttached = false
      var inputWatchTimer = null
      function tryWatchInputDraft(id) {
        try {
          var sc = sessions.scope(id)
          if (sc === undefined) return false
          var sh = ctx.conversation.input.for(sc)
          if (sh === undefined || sh === null || typeof sh.state.subscribe !== 'function') return false
          var hadDraft = false
          inputUnsub = sh.state.subscribe(function () {
            var d = (sh.state.getSnapshot().draft || '').trim()
            var wasHad = hadDraft
            hadDraft = d !== ''
            if (ui.quotes.length === 0) return
            // 发送完成：草稿从有内容变空 → 脚标消失、编号下次从 1 开始；
            // 同时在刚发出的用户消息气泡上贴「N 条批注」标签。
            if (wasHad && d === '' && annotationAttached) {
              var sentItems = ui.quotes.map(function (q) {
                return { text: quoteWithSource(q), note: q.note || '' }
              })
              ui.quotes = []
              annotationAttached = false
              writeCurrentPendingQuotes()
              clearTip(chipLayer)
              updateChip()
              renderMarkers()
              pendingDeco.push({ items: sentItems })
              kickDecorate()
            }
          })
          return true
        } catch (_) { inputUnsub = null; return false }
      }
      // 发送清空只认这里的「草稿有→空」迁移（装饰扫描不再兜底，见 decorateAll）。
      // 插件可能先于会话加载完成：current 未定、scope/input 尚不可用时订阅会失败，
      // 必须每秒重试直到挂上，否则一次发送的清空被漏掉，已发送的批注会永远留在
      // 待发送集里，之后每次 Enter 都重新拼进草稿。
      function watchInputDraft() {
        if (inputWatchTimer !== null) { clearInterval(inputWatchTimer); inputWatchTimer = null }
        if (typeof inputUnsub === 'function') { inputUnsub(); inputUnsub = null }
        // 会话切换时旧 scope 的订阅由上层先释放，这里只负责挂上当前会话；
        // 切换后若 scope 尚不可用，仍靠下方的 1s 重试补齐（同 watchInputDraft 原有语义）。
        // 注意：切换后必须重新订阅新会话的草稿，否则“草稿有→空”的发送清空权威会
        // 继续监听旧会话，新会话发送后待发送批注永远不清（每次 Enter 重复拼稿）。
        var id = readCurrentSessionId()
        if (id !== undefined && tryWatchInputDraft(id)) return
        inputWatchTimer = setInterval(function () {
          var cur = readCurrentSessionId()
          if (cur !== undefined && tryWatchInputDraft(cur)) {
            clearInterval(inputWatchTimer)
            inputWatchTimer = null
          }
        }, 1000)
      }

      /** 把批注块文本从用户消息气泡里藏掉（模型消息内容不受影响）：
       *  用户气泡是纯文本渲染（MessageText，单个文本节点），
       *  找到最后一个「\n提问：」（老格式回退「\n问题：」），
       *  保留其后的用户问题，整块批注文本从 DOM 移除。
       *  返回是否成功（内容未渲染完时返回 false，轮询稍后重试）。 */
      function hideAnnotationBlock(row) {
        try {
          var bubble = row.querySelector('[class*="bubble"]')
          if (bubble === null) return false
          var nodes = []
          var full = ''
          var walker = document.createTreeWalker(bubble, NodeFilter.SHOW_TEXT)
          var n
          while ((n = walker.nextNode()) !== null) {
            nodes.push(n)
            full += n.nodeValue || ''
          }
          // 纯批注用完整首尾文案识别，避免原文中的「提问：」被误当成正文分隔符。
          // 语言列表取自词典本身：多一种语言（ru）就自动多一条识别路径。
          var annotationOnly = Object.keys(STR).some(function (lang) {
            return full.indexOf(dictVal(lang, 'block.headOnly')) === 0
              && full.trimEnd().endsWith(dictVal(lang, 'block.formatOnly'))
          })
          if (annotationOnly) {
            nodes.forEach(function (node) { node.nodeValue = '' })
            return true
          }
          // 标记定位：当前语言优先（zh「提问：」/ en「Ask:」，均先带「\n」再裸匹配），
          // 另兼容另一语言与「问题：」老格式，保证历史消息跨语言切换可解析。
          var markers = blockMarkers()
          var marker = -1
          var markerStr = ''
          for (var p = 0; p < markers.length && marker === -1; p++) {
            var idx = full.lastIndexOf(markers[p])
            if (idx !== -1) { marker = idx; markerStr = markers[p] }
          }
          if (marker === -1) return false
          // 连同分隔标记一起切掉，保留其后的问题。
          var skip = markerStr.length
          // 定位到具体文本节点。
          var pos = 0
          var ti = -1
          var inner = 0
          for (var j = 0; j < nodes.length; j++) {
            var len = (nodes[j].nodeValue || '').length
            if (marker < pos + len) { ti = j; inner = marker - pos; break }
            pos += len
          }
          if (ti === -1) return false
          // 去掉标记及其前的所有内容，保留其后的问题。
          nodes[ti].nodeValue = (nodes[ti].nodeValue || '').slice(inner + skip).replace(/^\s+/, '')
          for (var m2 = ti - 1; m2 >= 0; m2--) {
            if (nodes[m2].parentNode !== null) nodes[m2].parentNode.removeChild(nodes[m2])
          }
          // 清理空元素。
          var empties = bubble.querySelectorAll('div,span,p')
          for (var e = 0; e < empties.length; e++) {
            var em = empties[e]
            if (em.parentNode !== null && (em.textContent || '').trim() === '') em.remove()
          }
          return true
        } catch (err) {
          console.warn('[annotation] 气泡隐藏手术失败：', err)
          return false
        }
      }

      /** 从气泡文本反解析批注条目（用于刷新后旧消息的 hover 内容）。 */
      function parseItemsFromBubble(row) {
        try {
          var b = row.querySelector('[class*="bubble"]')
          var text = (b ? b.textContent : '') || ''
          var mi = -1
          for (var mk = 0; mk < PARSE_MARKERS.length; mk++) {
            var pmi = text.lastIndexOf(PARSE_MARKERS[mk])
            if (pmi > mi) mi = pmi
          }
          if (mi !== -1) text = text.slice(0, mi)
          var nl = text.indexOf('\n\n')
          var body = nl === -1 ? '' : text.slice(nl + 2)
          var out = []
          var parts = body.split('\n\n')
          for (var i = 0; i < parts.length; i++) {
            var mm = /^(\d+)\.\s*([\s\S]*)$/.exec(parts[i])
            if (mm === null) continue
            var item = mm[2]
            var note = ''
            var nm = /\n\s*(?:批注：|Note:|Примечание:)\s*([\s\S]*)$/.exec(item)
            if (nm !== null) { note = nm[1].trim(); item = item.slice(0, nm.index) }
            out.push({ text: item.replace(/\n   /g, '\n').trim(), note: note })
          }
          return out
        } catch (_) { return [] }
      }

      /** 在用户气泡上贴「批注 ×N」标签（hover 显示条目内容）。 */
      function attachBubbleTag(row, items) {
        if (row.querySelector('[data-annotation-bubble-tag]') !== null) return
        var bubble = row.querySelector('[class*="bubble"]') || row
        var tag = document.createElement('span')
        tag.setAttribute('data-annotation-bubble-tag', '')
        tag.textContent = t('bubble.tag', { n: items.length })
        tag.style.cssText = 'display:inline-flex;align-items:center;height:18px;padding:0 8px;margin:4px 0 0 4px;border-radius:9px;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #2c2c2e));color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-family,system-ui);font-size:10px;cursor:default;'
        ;(function (list) {
          tag.addEventListener('mouseenter', function () {
            tipActiveHide = { keep: bubbleKeep, hide: bubbleHide }
            var el = document.createElement('div')
            el.className = 'dsh-ann-tip'
            el.style.cssText = 'position:fixed;z-index:1160;box-sizing:border-box;width:300px;max-width:calc(100vw - 16px);padding:10px 12px;border-radius:12px;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #2c2c2e));box-shadow:var(--dsw-shadow-lv3);font-family:var(--dsw-font-family,system-ui);font-size:12px;color:var(--dsw-alias-label-primary);'
            var head = document.createElement('div')
            head.style.cssText = 'font-weight:600;margin-bottom:6px;'
            head.textContent = t('bubble.title', { n: list.length })
            el.appendChild(head)
            for (var i = 0; i < list.length; i++) {
              var item = document.createElement('div')
              item.style.cssText = 'padding:6px 0;border-top:1px solid var(--dsw-alias-border-strong,#444);'
              var num = document.createElement('span')
              num.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;margin-right:6px;border-radius:8px;background:var(--dsw-alias-text-accent,#4c9aff);color:#fff;font-size:10px;font-weight:700;'
              num.textContent = String(i + 1)
              var body = document.createElement('span')
              body.style.cssText = 'font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary);'
              body.textContent = truncate(list[i].text, 50)
              item.appendChild(num)
              item.appendChild(body)
              if (list[i].note !== '') {
                var note = document.createElement('div')
                note.style.cssText = 'font-size:11px;color:var(--dsw-alias-label-secondary);margin:2px 0 0 22px;word-break:break-word;'
                note.textContent = t('tip.notePrefix') + truncate(list[i].note, 60)
                item.appendChild(note)
              }
              el.appendChild(item)
            }
            presentTip(tag, el)
            var r2 = tag.getBoundingClientRect()
            var w2 = 300
            var h2 = el.offsetHeight || 120
            var left = Math.max(8, Math.min(r2.left, window.innerWidth - w2 - 8))
            var top = r2.bottom + 6
            if (top + h2 > window.innerHeight - 8) top = r2.top - h2 - 6
            el.style.left = left + 'px'
            el.style.top = Math.max(8, top) + 'px'
            el.style.width = w2 + 'px'
          })
          var bubbleGrace = null
          function bubbleHide() {
            if (bubbleGrace !== null) clearTimeout(bubbleGrace)
            bubbleGrace = setTimeout(function () {
              bubbleGrace = null
              if (shouldKeepTipOpen(tag)) return
              releaseActiveTip()
              clearTip(tag)
            }, 250)
          }
          function bubbleKeep() {
            if (bubbleGrace !== null) { clearTimeout(bubbleGrace); bubbleGrace = null }
          }
          // 只登记关闭钩子，不再往共享 tipLayer 上追加监听器（见 tipActiveHide 注释）
          tag.addEventListener('mouseleave', bubbleHide)
        })(items)
        tag.__annotationItems = items
        bubble.appendChild(tag)
        console.log('[annotation] 气泡已贴批注标签 ×' + items.length)
      }

      /** 发送完成时暂存批注数据（供气泡 hover 面板使用）。 */
      var pendingDeco = []

      // ---------- 助手回复中的「Annotation N：」→ 悬浮批注芯片 ----------

      /** 找到该回复行之前最近一条携带批注标签的用户消息的条目数据。 */
      function findPrevAnnotationItems(row) {
        var rows = allMessageRows()
        var idx = rows.indexOf(row)
        if (idx === -1) return null
        for (var i = idx - 1; i >= 0; i--) {
          var tag = rows[i].querySelector('[data-annotation-bubble-tag]')
          if (tag !== null && Array.isArray(tag.__annotationItems) && tag.__annotationItems.length > 0) {
            return tag.__annotationItems
          }
        }
        return null
      }

      /** 扫描所有已结束流式输出的助手行：把「Annotation N：」替换为可悬浮芯片。 */
      /** 流式 mutation 批次的芯片装饰限流: 前导 + 500ms 拖尾, 每批次最多触发一次
       *  增量扫描(只扫助手行), 代替逐批全文档 decorateAll。 */
      var lastAssistantDecorate = 0
      var assistantDecorateTimer = null
      function scheduleAssistantDecorate() {
        var now = performance.now()
        if (now - lastAssistantDecorate >= 500) {
          lastAssistantDecorate = now
          decorateAssistantAnnotations()
          return
        }
        if (assistantDecorateTimer !== null) return
        assistantDecorateTimer = setTimeout(function () {
          assistantDecorateTimer = null
          lastAssistantDecorate = performance.now()
          decorateAssistantAnnotations()
        }, 500 - (now - lastAssistantDecorate))
      }

      function decorateAssistantAnnotations() {
        var rows = assistantRows()
        for (var i = 0; i < rows.length; i++) {
          var el = rows[i]
          if (!isAssistantRow(el) && !isFocusAssistantRow(el)) continue
          // 新版 data-streaming 标记在 AssistantMarkdown 内部元素上（行元素
          // 本身没有）——必须查行内，否则流式输出途中就把「Annotation N：」
          // 替换成芯片，与 React 正在更新的文本节点冲突，整条回复可能渲染
          // 异常（表现为看不到回复消息）。
          if (el.hasAttribute('data-streaming') || el.querySelector('[data-streaming]') !== null) continue
          if (el.querySelector('[data-annotation-reply-chip]') !== null) continue
          if ((el.textContent || '').indexOf('Annotation') === -1) continue
          var items = findPrevAnnotationItems(el)
          // 拿不到条目数据就干脆不生成芯片，保留原文「Annotation N：」——
          // 一个 hover 只显示「未找到对应批注条目」的占位芯片没有任何价值。
          if (items === null || items.length === 0) continue
          decorateAnnotationLabels(el, items)
        }
      }

      /** 在行内所有文本节点中找「Annotation N：」（不区分大小写），替换为芯片。 */
      function decorateAnnotationLabels(row, items) {
        var re = /Annotation[\s\u200b\u200c\u200d\u00ad]*(\d+)[\s\u200b\u200c\u200d\u00ad]*[:：]?/gi
        // 先快照所有文本节点，再逐个处理：遍历中途修改树会让 TreeWalker
        // 指针失效（处理完第一个节点后遍历就断了）——这是「只有第一个
        // Annotation 变成芯片」的根因。
        var nodes = []
        var walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT)
        var n
        while ((n = walker.nextNode()) !== null) nodes.push(n)
        var done = 0
        for (var i = 0; i < nodes.length; i++) {
          n = nodes[i]
          if (n.parentNode === null) continue
          var v = n.nodeValue || ''
          re.lastIndex = 0
          if (!re.test(v)) continue
          var frag = document.createDocumentFragment()
          var last = 0
          re.lastIndex = 0
          var m
          var replaced = 0
          while ((m = re.exec(v)) !== null) {
            if (m.index > last) frag.appendChild(document.createTextNode(v.slice(last, m.index)))
            var num = parseInt(m[1], 10)
            var item = items[num - 1]
            // 编号越界（比如模型自己在思考里写了「Annotation 5：」，实际只有 3 条）
            // 不是真正的逐条回应：原文照旧，不生成芯片。
            if (item !== undefined) {
              frag.appendChild(makeReplyChip(num, item))
              replaced++
              done++
            } else {
              frag.appendChild(document.createTextNode(m[0]))
            }
            last = m.index + m[0].length
          }
          // 一个都没真正替换时绝不碰 DOM：否则 replaceChild 会用一个内容相同的
          // 新节点换上，产生 childList mutation → MutationObserver → 全量装饰 →
          // 再替换…… 自激成死循环，把客户端主线程打满。
          if (replaced === 0) continue
          if (last < v.length) frag.appendChild(document.createTextNode(v.slice(last)))
          n.parentNode.replaceChild(frag, n)
        }
        // 匹配不到完整「Annotation N：」时静默：正文里出现 annotation 这个词
        // （模型自己的措辞、英文注解说明等）本来就不该产生任何日志。
        if (done > 0) {
          console.log('[annotation] 回复批注芯片 ×' + done, row.querySelectorAll('[data-annotation-reply-chip]').length + ' 个元素')
        }
      }

      /** 构造「Annotation N」芯片（hover 显示该批注的原文与批注内容）。
       *  `item` 必定存在：调用方只在编号能对应到批注条目时才生成芯片。 */
      function makeReplyChip(num, item) {
        var chip = document.createElement('span')
        chip.setAttribute('data-annotation-reply-chip', '')
        chip.style.cssText = 'display:inline-flex;align-items:center;height:18px;padding:0 6px;margin:0 2px;border-radius:9px;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #2c2c2e));color:var(--dsw-alias-text-accent,#4c9aff);font-family:var(--dsw-font-family,system-ui);font-size:11px;font-weight:600;cursor:default;vertical-align:middle;'
        chip.textContent = 'Annotation ' + num
        var grace = null
        function hide() {
          if (grace !== null) clearTimeout(grace)
          grace = setTimeout(function () {
            grace = null
            if (shouldKeepTipOpen(chip)) return
            releaseActiveTip()
            clearTip(chip)
          }, 250)
        }
        function keep() {
          if (grace !== null) { clearTimeout(grace); grace = null }
        }
        chip.addEventListener('mouseenter', function () {
          tipActiveHide = { keep: keep, hide: hide }
          var el = document.createElement('div')
          el.className = 'dsh-ann-tip'
          el.style.cssText = 'position:fixed;z-index:1160;width:320px;max-width:calc(100vw - 16px);padding:10px 12px;border-radius:12px;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-alias-bg-layer-2, var(--dsw-alias-bg-base, #2c2c2e));box-shadow:var(--dsw-shadow-lv3);font-family:var(--dsw-font-family,system-ui);font-size:12px;color:var(--dsw-alias-label-primary);'
          var head = document.createElement('div')
          head.style.cssText = 'font-weight:600;margin-bottom:6px;'
          head.textContent = t('reply.headWithQuote', { n: num })
          el.appendChild(head)
          var quote = document.createElement('div')
          quote.style.cssText = 'font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);word-break:break-word;padding:6px 8px;border-radius:8px;background:rgba(127,127,127,.12);'
          quote.textContent = truncate(item.text, 140)
          el.appendChild(quote)
          if (typeof item.note === 'string' && item.note !== '') {
            var note = document.createElement('div')
            note.style.cssText = 'font-size:11px;color:var(--dsw-alias-text-accent,#4c9aff);margin-top:6px;word-break:break-word;'
            note.textContent = t('reply.notePrefix') + truncate(item.note, 80)
            el.appendChild(note)
          }
          presentTip(chip, el)
          var r2 = chip.getBoundingClientRect()
          var w2 = 320
          var h2 = el.offsetHeight || 100
          var left = Math.max(8, Math.min(r2.left, window.innerWidth - w2 - 8))
          var top = r2.bottom + 6
          if (top + h2 > window.innerHeight - 8) top = r2.top - h2 - 6
          el.style.left = left + 'px'
          el.style.top = Math.max(8, top) + 'px'
          el.style.width = w2 + 'px'
        })
        chip.addEventListener('mouseleave', hide)
        return chip
      }

      /** 全局轮询装饰：找所有「携带批注块但未装饰」的用户气泡 → 隐藏批注块 + 贴标签。
       *  不依赖发送事件链：异步渲染、刷新后的历史消息都能被覆盖。 */
      function decorateAll() {
        try {
          var rows = allMessageRows()
          for (var i = rows.length - 1; i >= 0; i--) {
            var el = rows[i]
            if (el.hasAttribute('data-pending-steering')) continue
            if (el.querySelector('[data-annotation-bubble-tag]') !== null) continue
            var b = el.querySelector('[class*="bubble"]')
            if (b === null || !hasAnnotationBlock(b.textContent || '')) continue
            // 最新一条优先消费发送时暂存的数据；其余从气泡文本反解析（须在隐藏前）。
            var items = null
            var fromSend = false
            if (i === rows.length - 1 && pendingDeco.length > 0) { items = pendingDeco[0].items; fromSend = true }
            if (items === null || items.length === 0) { items = parseItemsFromBubble(el); fromSend = false }
            if (!hideAnnotationBlock(el)) continue // 内容未渲染完 → 留给下轮（发送暂存数据不弹出）
            if (fromSend) pendingDeco.shift()
            attachBubbleTag(el, items)
            // 这里绝不清空待发送批注：DOM 层面无法区分「刚发送的消息」与「会话
            // 切换/刷新后重新渲染的历史消息」，历史消息重装饰曾被误判为已发送而
            // 清空刚恢复的待发送批注（issue #28 复测）。发送清空的唯一权威是
            // watchInputDraft 的「草稿有→空」迁移，其初始化时序洞由订阅重试补齐。
          }
          // 助手回复：把「Annotation N：」变为可悬浮的批注芯片（内容取自最近一条带批注的用户消息）。
          decorateAssistantAnnotations()
        } catch (err) {
          console.warn('[annotation] 装饰扫描失败：', err)
        }
      }

      var decoTimer = null
      /** 全量装饰的合并调度：首个批次立即执行（气泡隐藏要赶在浏览器绘制前，
       *  否则会闪一下批注块），紧随其后的批次合并进 120ms 窗口。
       *  原因：装饰本身会改宿主 DOM（贴标签、换芯片、切气泡文本）并再次触发
       *  MutationObserver，一条回复上的多次替换会在长会话里滚成高频全量扫描，
       *  把主线程烧满——表现就是客户端卡死、什么都点不动。 */
      var decorateAllPending = null
      var lastDecorateAllAt = 0
      function scheduleDecorateAll() {
        var now = performance.now()
        if (now - lastDecorateAllAt >= 120) {
          lastDecorateAllAt = now
          decorateAll()
          return
        }
        if (decorateAllPending !== null) return
        decorateAllPending = setTimeout(function () {
          decorateAllPending = null
          lastDecorateAllAt = performance.now()
          decorateAll()
        }, 120)
      }
      function kickDecorate() {
        decorateAll()
        if (decoTimer === null) decoTimer = setInterval(decorateAll, 1000)
      }

      // ---------- locale 服务（zh/en）订阅与实时回流 ----------
      // locale.subscribe() 触发时：重绘打开中的浮层、更新输入框旁计数与历史气泡标签。
      // 服务缺失（旧 host / 测试环境）时保持 zh，全部功能不变。
      var localeUnsub = null
      function applyLocale() {
        var next = 'zh'
        try {
          if (ctx.locale !== undefined && ctx.locale !== null
            && typeof ctx.locale.getSnapshot === 'function') {
            var snap = ctx.locale.getSnapshot()
            if (snap !== undefined && snap !== null && snap.active) next = String(snap.active)
          }
        } catch (_) { /* keep zh */ }
        if (next === currentLang) return
        setLang(next)
        if (ui.mode !== 'closed') render()
        updateChip()
        // 打开的悬浮面板按新语言关闭（下次 hover 以新语言重建）。
        clearTip()
        var tags = document.querySelectorAll('[data-annotation-bubble-tag]')
        for (var i = 0; i < tags.length; i++) {
          var items = tags[i].__annotationItems
          if (Array.isArray(items)) tags[i].textContent = t('bubble.tag', { n: items.length })
        }
      }
      applyLocale()
      if (ctx.locale !== undefined && ctx.locale !== null
        && typeof ctx.locale.subscribe === 'function') {
        try { localeUnsub = ctx.locale.subscribe(applyLocale) } catch (_) { localeUnsub = null }
      }

      // ---------- 待发送批注按会话恢复 ----------
      // 0.1.6-alpha.2 起选择态已移出 list store：list.subscribe 不再于会话切换时触发。
      // 切换检测三层并行（onSessionSwitch 幂等，重复触发无害）：
      // ① uiSession 的 current source（0.1.7+ 精确；uiSession 晚于插件注册时，
      //    onSessionSwitch 内的惰性探测仍能读到，订阅缺口由轮询兜底）；
      // ② list.subscribe（0.1.6-alpha.2 之前的宿主精确）；
      // ③ 1s 轮询（新宿主上 ② 永不触发、① 缺席时它是唯一触发点）。
      var lastSessionId = readCurrentSessionId()
      ui.quotes = readPendingQuotes(lastSessionId)
      function onSessionSwitch() {
        var cur = readCurrentSessionId()
        if (cur === lastSessionId) return
        writePendingQuotes(lastSessionId)
        lastSessionId = cur
        if (ui.mode !== 'closed') closeToolbar()
        ui.quotes = readPendingQuotes(cur)
        annotationAttached = false
        // 旧会话未消费的发送暂存作废：留着会被新会话的历史消息误消费（错贴标签）；
        // 旧会话那条消息回切后会由气泡反解析路径重新装饰。
        pendingDeco.length = 0
        ui.noteDraft = ''
        clearTip()
        updateChip()
        watchInputDraft()
        renderMarkers()
      }
      var unsubList = null
      var unsubSession = null
      var switchTimer = null
      try {
        if (sessions.list !== undefined && sessions.list !== null
          && typeof sessions.list.subscribe === 'function') {
          unsubList = sessions.list.subscribe(onSessionSwitch)
        }
      } catch (_) { unsubList = null }
      try {
        var uiSource = currentSessionSource()
        if (uiSource !== null) unsubSession = uiSource.subscribe(onSessionSwitch)
      } catch (_) { unsubSession = null }
      switchTimer = setInterval(onSessionSwitch, 1000)
      function unsubSessionSwitch() {
        try { if (typeof unsubList === 'function') unsubList() } catch (_) { /* ignore */ }
        try { if (typeof unsubSession === 'function') unsubSession() } catch (_) { /* ignore */ }
        if (switchTimer !== null) { clearInterval(switchTimer); switchTimer = null }
      }
      var unsub = unsubSessionSwitch

      watchInputDraft()
      kickDecorate()
      updateChip()

      // ---------- 清理 ----------
      return function () {
        clearSettle()
        document.removeEventListener('selectionchange', onSelection)
        document.removeEventListener('pointerdown', onDocPointerDown, true)
        document.removeEventListener('keydown', onKeyDown, true)
        document.removeEventListener('pointermove', onTipPointerMove, true)
        document.removeEventListener('pointerdown', onSendPointerDown, true)
        document.removeEventListener('click', onSendKeyboardClick, true)
        document.removeEventListener('compositionstart', markImeComposing, true)
        document.removeEventListener('compositionend', markImeEnded, true)
        document.removeEventListener('pointermove', onTipPointerMove, true)
        if (imeClearTimer !== null) { clearTimeout(imeClearTimer); imeClearTimer = null }
        window.removeEventListener('scroll', onLayoutChange, true)
        window.removeEventListener('resize', onLayoutChange)
        host.removeEventListener('pointerdown', onHostPointerDown)
        observer.disconnect()
        if (typeof unsub === 'function') unsub()
        if (inputWatchTimer !== null) { clearInterval(inputWatchTimer); inputWatchTimer = null }
        if (typeof inputUnsub === 'function') inputUnsub()
        if (typeof localeUnsub === 'function') localeUnsub()
        if (decoTimer !== null) { clearInterval(decoTimer); decoTimer = null }
        if (decorateAllPending !== null) { clearTimeout(decorateAllPending); decorateAllPending = null }
        if (composerObserver !== null) composerObserver.disconnect()
        releaseChipSpace()
        chipLayer.remove() // reserved row has been released
        tipLayer.remove()
        host.remove()
        overlay.remove()
        numLayer.remove()
      }
    }

    exports.name = '@changfenhuang/dsh-annotation'
    exports.inject = ['sessions', 'conversation', 'locale', 'uiSession']
    exports.apply = apply

    return module.exports
		})(require);
		//#endregion

		//#region vendored: dsh-quote-followup v0.2.10 (MIT, Copyright (c) 2026 tr1v3r)
		// Inlined verbatim from https://github.com/tr1v3r/dsh-quote-followup — see THIRD_PARTY_NOTICES.md.
		// Fork deviations applied at build time: headless-quote-capture, fail-loud-without-excerpt, headless-quote-lifecycle, headless-quote-cleanup, no-standalone-button, remove-floating-quote-helpers, clear-quote-without-dom, insert-quote-without-dom, locale-without-floating-button, cleanup-without-floating-button (see patches/).
		// Body kept at column 0 so it stays byte-identical to the vendored file up to those deviations (asserted by test/vendor.test.mjs).
		const vendoredQuote = ((require) => {
var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region constants
		/** Official slot wrapper owning the chat transcript (composer excluded). */
		const TRANSCRIPT_SELECTOR = '[data-slot="conversation.session"]';
		/** Composer input candidates, most specific first (official slot → legacy hints). */
		const COMPOSER_SELECTORS = [
			'[data-composer-input]',
			'[data-slot="conversation.composer"] textarea',
			'[data-slot="conversation.composer"] [contenteditable="true"]',
			'textarea[data-phase]',
			'[data-composer-card] textarea',
			'[data-composer-card] [contenteditable="true"]',
			'[data-input-scroll] textarea'
		];
		const BUTTON_ID = "dsh-quote-followup-btn";
		const BUTTON_VERSION_ATTR = "data-dsh-quote-followup-version";
		const CLIENT_VERSION = "0.2.10";
		/** Shared <style> element; versioned like the button so hot-swaps replace it. */
		const STYLE_ID = "dsh-quote-followup-style";
		const STYLE_VERSION_ATTR = "data-dsh-quote-followup-style-version";
		const BUTTON_CLASS = "dsh-qf-btn";
		const NOTICE_ID = "dsh-quote-followup-notice";
		const NOTICE_CLASS = "dsh-qf-notice";
		/** Codec owner for native DSH reference chips. */
		const QUOTE_SOURCE = "quote-followup";
		const LOCALE_NS = "quote-followup";
		/** UI + serialized frame copy; the active DSH locale picks the language. */
		const LOCALE_DICT = {
			zh: {
				"button.label": "❐ 引用",
				"button.title": "引用选中内容到输入框（可多次引用，发送前可编辑）",
				"quote.header": "引用",
				"conversation.role": "对话",
				"conversation.role.user": "用户",
				"conversation.role.assistant": "助手",
				"quote.turn": "第 {n} 轮",
				"quote.truncated": "已截断",
				"notice.composer-missing": "未找到输入框；摘录已保留，请选中原文重试。",
				"notice.composer-locked": "输入框暂不可编辑；摘录已保留，请选中原文重试。",
				"notice.insert-failed": "引用未能插入；摘录已保留，请选中原文重试。"
			},
			en: {
				"button.label": "❐ Quote",
				"button.title": "Quote the selection into the composer (repeatable; editable before sending)",
				"quote.header": "Quote",
				"conversation.role": "conversation",
				"conversation.role.user": "user",
				"conversation.role.assistant": "assistant",
				"quote.turn": "turn {n}",
				"quote.truncated": "truncated",
				"notice.composer-missing": "Composer not found; excerpt saved. Select the original text to retry.",
				"notice.composer-locked": "Composer is unavailable; excerpt saved. Select the original text to retry.",
				"notice.insert-failed": "Quote could not be inserted; excerpt saved. Select the original text to retry."
			}
		};
		const fallbackT = (key) => LOCALE_DICT.en[key] ?? key;
		/** Per-quote character cap for a bounded composer insertion. */
		const QUOTE_MAX_CHARS = 1600;
		//#endregion
		//#region helpers
		const elementOf = (node) => (node === null ? null : node.nodeType === 1 ? node : node.parentElement);
		const transcriptOf = (node) => {
			const element = elementOf(node);
			return element === null ? null : element.closest(TRANSCRIPT_SELECTOR);
		};
		/** Walk from a range endpoint up to (but excluding) the transcript. */
		const walkAncestors = (node, transcript, visit) => {
			let element = elementOf(node);
			while (element !== null && element !== transcript) {
				const found = visit(element);
				if (found !== undefined)
					return found;
				element = element.parentElement;
			}
			return null;
		};
		/** A turn marker is only meaningful as a non-negative safe integer. */
		const isValidTurn = (turn) => Number.isSafeInteger(turn) && turn >= 0;
		/** The live selection when BOTH ends sit inside the same transcript. */
		const selectionInTranscript = (selection) => {
			if (selection === null || selection.isCollapsed || selection.rangeCount === 0)
				return null;
			const anchor = transcriptOf(selection.anchorNode);
			const focus = transcriptOf(selection.focusNode);
			if (anchor === null || anchor !== focus)
				return null;
			return anchor;
		};
		/** Only assign provenance when both ends belong to the same marked chat row. */
		const messageRowOf = (node, transcript) =>
			walkAncestors(node, transcript, (element) => element.hasAttribute?.("data-chat-turn") ? element : undefined);
		/**
		 * Best-effort role for the quoted fragment: walk up from the range start
		 * looking for role markers (data attributes, then class-name hints).
		 * Null → the generic "对话" label; this is display-only metadata.
		 */
		const detectRole = (range, transcript) =>
			walkAncestors(range.startContainer, transcript, (element) => {
				const role = element.getAttribute?.("data-role") ?? element.getAttribute?.("data-message-role");
				if (typeof role === "string" && role !== "") {
					if (/user|human/i.test(role)) return "user";
					if (/assistant|model|ai\b/i.test(role)) return "assistant";
				}
				const cls = String(element.className ?? "");
				if (/(^|[\s_-])user([\s_-]|$)/i.test(cls)) return "user";
				if (/(^|[\s_-])assistant([\s_-]|$)/i.test(cls)) return "assistant";
				return undefined;
			});
		const roleLabel = (role, t) => role === "user" ? t("conversation.role.user") : role === "assistant" ? t("conversation.role.assistant") : t("conversation.role");
		/**
		 * Conversation-turn provenance: DSH's chat renderer stamps every message
		 * row with `data-chat-turn` (a per-session monotonic ordinal). Resolving
		 * it lets the model address "what you quoted in turn N" without any
		 * host-side message-id API. Absent / non-numeric markers degrade to null
		 * and the serialized frame stays exactly as before.
		 */
		const detectTurn = (range, transcript) =>
			walkAncestors(range.startContainer, transcript, (element) => {
				const raw = element.getAttribute?.("data-chat-turn");
				if (typeof raw === "string" && raw !== "") {
					const turn = Number(raw);
					if (isValidTurn(turn))
						return turn;
				}
				return undefined;
			});
		/** Bound one quote before it becomes editor state. */
		const quotePayload = (text, role, turn) => {
			let body = String(text ?? "");
			let truncated = false;
			if (body.length > QUOTE_MAX_CHARS) {
				body = body.slice(0, QUOTE_MAX_CHARS);
				truncated = true;
			}
			return { text: body, role, truncated, turn: isValidTurn(turn) ? turn : null };
		};
		/** Model / clipboard projection. The composer shows a chip, not this frame. */
		const quoteFrame = ({ text, role, truncated, turn }, t) => {
			const lines = text.split("\n").map((line) => `> ${line}`.trimEnd());
			const meta = [t("quote.header"), roleLabel(role, t)];
			if (isValidTurn(turn))
				meta.push(String(t("quote.turn")).replace("{n}", String(turn)));
			if (truncated)
				meta.push(t("quote.truncated"));
			return `> [${meta.join(" · ")}]\n${lines.join("\n")}\n\n`;
		};
		const decodeQuote = (ref) => {
			try {
				const value = JSON.parse(ref);
				if (value === null || typeof value !== "object" || typeof value.text !== "string")
					return null;
				return {
					text: value.text,
					role: value.role === "user" || value.role === "assistant" ? value.role : null,
					truncated: value.truncated === true,
					turn: isValidTurn(value.turn) ? value.turn : null
				};
			} catch {
				return null;
			}
		};
		const quoteInsert = (payload, t) => {
			const clipboardText = quoteFrame(payload, t);
			const preview = payload.text.replace(/\s+/g, " ").trim();
			return {
				source: QUOTE_SOURCE,
				ref: JSON.stringify(payload),
				// The bubble icon carries the quote meaning; keep only the excerpt
				// visible. Role/truncation stay in the serialized Markdown frame.
				label: preview,
				appearance: "session",
				clipboardText
			};
		};
		/** Codec-only source: it owns quote chips but intentionally adds no @ candidates. */
		const makeQuoteSource = (t) => {
			/** Project a chip ref to Markdown, degrading to "" for malformed refs. */
			const project = (ref) => {
				const payload = decodeQuote(ref);
				return payload === null ? "" : quoteFrame(payload, t);
			};
			return {
				trigger: "@",
				name: QUOTE_SOURCE,
				order: 1000,
				candidates: () => Promise.resolve([]),
				onPick: () => void 0,
				codec: {
					clipboardText: project,
					serialize: (ref) => Promise.resolve(project(ref))
				}
			};
		};
		const findComposer = () => {
			for (const selector of COMPOSER_SELECTORS) {
				const element = document.querySelector(selector);
				if (element !== null)
					return element;
			}
			return null;
		};
		/** The UI adapter owns selection in 0.1.7; older hosts expose list.current. */
		const selectedSessionId = (ctx, sessions) => {
			let uiSession;
			try {
				uiSession = ctx?.get?.("uiSession");
			} catch {
				// Older hosts do not provide the UI session adapter.
			}
			const current = uiSession?.adapter?.current;
			if (typeof current?.getSnapshot === "function") {
				try {
					return current.getSnapshot()?.key;
				} catch {
					return undefined;
				}
			}
			return sessions?.list?.getSnapshot?.()?.current;
		};
		/**
		 * The per-session input facade owns chip creation, editor transactions and
		 * phase/revision guards. Append at its published draft end (detect-text
		 * offsets differ from clipboard-text lengths when a draft contains chips).
		 */
		const selectedSessionScope = (ctx) => {
			const sessions = ctx?.get?.("sessions");
			if (sessions === null || sessions === undefined)
				return null;
			const sessionId = selectedSessionId(ctx, sessions);
			// No selected session is not a missing composer capability. Never paste
			// unscoped text into a composer that may belong to another session.
			if (sessionId === undefined || sessionId === null)
				return null;
			// A binding is borrowed only for this synchronous edit; never retain it
			// across a promise or a subsequent click after its generation may release.
			// DSH 0.1.7 returns a SessionBinding wrapper whose scoped Cordis context
			// lives at `.ctx`; older hosts returned that context from sessions.scope().
			if (typeof sessions.binding === "function") {
				const binding = sessions.binding(sessionId);
				return binding?.ctx ?? null;
			}
			return sessions.scope?.(sessionId);
		};
		const appendQuoteChip = (scope, element, payload, t) => {
			const conversation = scope.get?.("conversation");
			if (typeof conversation?.input?.for !== "function")
				return false;
			let input;
			try {
				input = conversation.input.for(scope);
			} catch (error) {
				console.warn("[dsh-quote-followup] scoped composer unavailable", error);
				return false;
			}
			const state = input?.state?.getSnapshot?.();
			if (state === undefined || typeof state.draftRev !== "number" || typeof input.insertReference !== "function")
				return false;
			// This is a rejected edit, not a missing feature: never bypass the
			// facade's admission guard with an unguarded text fallback.
			if (state.phase !== "plain" && state.phase !== "claimed")
				return null;
			const end = state.draft.length - (state.occurrences ?? []).reduce((extra, occurrence) =>
				extra + Math.max(0, occurrence.length - 1), 0);
			if (!Number.isSafeInteger(end) || end < 0)
				return null;
			const lead = end > 0 && !/\s/u.test(state.draft.slice(-1)) ? " " : "";
			try {
				if (lead !== "" && input.insertText(lead, { start: end, end, draftRev: state.draftRev }) !== true)
					return null;
				const current = input.state.getSnapshot();
				if (current.draftRev !== state.draftRev + lead.length)
					return null;
				const at = end + lead.length;
				const inserted = input.insertReference(quoteInsert(payload, t), {
					start: at, end: at, draftRev: current.draftRev
				});
				if (inserted) {
					// DOM focus can move a Lexical caret to the start. The session
					// facade restores the selection left after the inserted chip.
					if (typeof input.focus === "function")
						input.focus();
					else
						element.focus();
				}
				return inserted ? true : null;
			} catch (error) {
				console.warn("[dsh-quote-followup] scoped reference insertion failed", error);
				return null;
			}
		};
		/**
		 * Use the live Lexical command table when DSH exposes its editor on the root.
		 * This bypasses browser security differences around synthetic clipboardData
		 * while still entering through DSH's own PASTE_COMMAND → keyboard.paste path.
		 */
		const pasteViaLexical = (element, text) => {
			const editor = element.__lexicalEditor;
			if (editor === null || typeof editor !== "object" || typeof editor.dispatchCommand !== "function")
				return false;
			const commands = editor._commands;
			if (commands === null || typeof commands !== "object" || typeof commands.keys !== "function")
				return false;
			const command = [...commands.keys()].find((candidate) => candidate?.type === "PASTE_COMMAND");
			if (command === undefined)
				return false;
			const clipboardData = {
				files: [],
				items: [],
				types: ["text/plain"],
				getData: (type) => type === "text/plain" ? text : ""
			};
			const event = {
				clipboardData,
				defaultPrevented: false,
				preventDefault() { this.defaultPrevented = true; },
				stopPropagation() {}
			};
			try {
				return editor.dispatchCommand(command, event) === true;
			} catch (error) {
				console.warn("[dsh-quote-followup] Lexical paste command failed; using DOM event fallback", error);
				return false;
			}
		};
		/** Dispatch a DOM paste fallback for non-DSH stateful editors. */
		const pasteIntoEditor = (element, text) => {
			let clipboardData = null;
			try {
				clipboardData = new DataTransfer();
				clipboardData.setData("text/plain", text);
			} catch {}
			let event;
			try {
				event = new ClipboardEvent("paste", {
					bubbles: true,
					cancelable: true,
					clipboardData
				});
			} catch {
				event = new Event("paste", { bubbles: true, cancelable: true });
			}
			if (clipboardData !== null && event.clipboardData == null) {
				try {
					Object.defineProperty(event, "clipboardData", { value: clipboardData });
				} catch {}
			}
			element.dispatchEvent(event);
			return event.defaultPrevented;
		};
		/**
		 * Append the quote at the END of the composer text (classic quote-reply
		 * reading order) and leave the caret on the blank line for the question.
		 * Textareas use their native setter; stateful contenteditables receive a
		 * paste event so Lexical/other editors update their model, not only the DOM.
		 */
		const appendToComposer = (element, insertText) => {
			element.focus();
			if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
				const value = element.value ?? "";
				const lead = value !== "" && !value.endsWith("\n") ? "\n" : "";
				const next = `${value}${lead}${insertText}`;
				const descriptor = element.tagName === "TEXTAREA"
					? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")
					: Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
				(descriptor?.set ?? ((v) => { element.value = v; })).call(element, next);
				element.dispatchEvent(new Event("input", { bubbles: true }));
				const caret = next.length;
				element.setSelectionRange(caret, caret);
				return;
			}
			const selection = document.getSelection();
			const range = document.createRange();
			// A Lexical root with existing block children does not admit a caret at
			// `root.childNodes.length`: its paste listener ignores that DOM point,
			// then mutation reconciliation deletes the raw-text fallback. Put the
			// caret INSIDE the last block instead. The empty-editor case still uses
			// the root because it has no block yet.
			const caretContainer = element.lastElementChild ?? element;
			range.selectNodeContents(caretContainer);
			range.collapse(false);
			selection?.removeAllRanges();
			selection?.addRange(range);
			if (pasteViaLexical(element, insertText))
				return;
			if (pasteIntoEditor(element, insertText))
				return;
			if (typeof document.execCommand === "function" && document.execCommand("insertText", false, insertText))
				return;
			range.insertNode(document.createTextNode(insertText));
			range.collapse(false);
			element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: insertText }));
		};
		//#endregion
		//#region floating button
		let pendingQuote = null;
		let quoteSourceReady = false;
		let currentT = fallbackT;
		let clientContext = null;
		let noticeTimer = null;
		const clearNotice = () => {
			if (noticeTimer !== null)
				clearTimeout(noticeTimer);
			noticeTimer = null;
			document.getElementById(NOTICE_ID)?.remove();
		};
		const showNotice = (key) => {
			clearNotice();
			const notice = document.createElement("div");
			notice.id = NOTICE_ID;
			notice.className = NOTICE_CLASS;
			notice.setAttribute("role", "status");
			notice.setAttribute("data-message-key", key);
			notice.textContent = currentT(key);
			document.body.appendChild(notice);
			noticeTimer = setTimeout(clearNotice, 4000);
		};
		const restoreSelection = (range) => {
			if (range === null)
				return;
			try {
				const selection = document.getSelection();
				selection?.removeAllRanges();
				selection?.addRange(range);
			} catch {}
		};
		/**
		 * Inject the button stylesheet once per client version. Visuals follow
		 * the dsh-annotation convention: a single idempotent <style> element
		 * built on DSH Web design tokens (--dsw-alias-* / --dsw-specific-*),
		 * so the pill tracks the active theme instead of hard-coded colors.
		 * The trailing fallbacks only engage when a token is renamed upstream.
		 * Without a real document.head (test fakes) the button still works,
		 * just unstyled.
		 */
		const ensureStyles = () => {
			if (!document.head || document.getElementById(STYLE_ID)) return;
			const style = document.createElement('style');
			style.id = STYLE_ID;
			style.setAttribute(STYLE_VERSION_ATTR, CLIENT_VERSION);
			style.textContent = `.${NOTICE_CLASS} { position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%); max-width: min(560px, 82vw); padding: 8px 12px; border-radius: 8px; background: var(--dsh-color-surface-2, #222); color: var(--dsh-color-text-1, #fff); font-size: 12px; z-index: 2147483000; }`;
			document.head.appendChild(style);
		};
		const dismissQuote = () => { pendingQuote = null; };
		let lastSelectionSnapshot = null;
		const onSelectionChange = () => {
			const frame = window.__DSH_SELECTION_GROUP_SELECTION__?.getSnapshot();
			if (!frame) { lastSelectionSnapshot = null; dismissQuote(); return; }
			if (frame === lastSelectionSnapshot) return;
			lastSelectionSnapshot = frame;
			const range = frame.range;
			const transcript = frame.transcript;
			const startRow = messageRowOf(range.startContainer, transcript);
			const endRow = messageRowOf(range.endContainer, transcript);
			const sameRow = startRow !== null && startRow === endRow;
			pendingQuote = { text: frame.text, role: sameRow ? detectRole(range, transcript) : null,
				turn: sameRow ? detectTurn(range, transcript) : null, range: range.cloneRange() };
		};
		const onQuoteClick = () => {
			if (pendingQuote === null) { showNotice("notice.insert-failed"); return; }
			const quote = pendingQuote; // headless insertion
			const composer = findComposer();
			if (composer === null) {
				restoreSelection(quote.range);
				showNotice("notice.composer-missing");
				return;
			}
			if (composer.disabled || composer.readOnly || composer.getAttribute("contenteditable") === "false" ||
				(composer.isContentEditable === false && composer.tagName !== "TEXTAREA" && composer.tagName !== "INPUT")) {
				restoreSelection(quote.range);
				showNotice("notice.composer-locked");
				return;
			}
			// Clear the transcript range BEFORE focusing the composer. Clearing after
			// insertion destroys Lexical's caret and makes the next quote unreliable.
			document.getSelection()?.removeAllRanges();
			const payload = quotePayload(quote.text, quote.role, quote.turn);
			try {
				const scope = selectedSessionScope(clientContext);
				const inserted = scope === null || scope === undefined
					? null
					: quoteSourceReady ? appendQuoteChip(scope, composer, payload, currentT) : false;
				if (inserted === false)
					appendToComposer(composer, quoteFrame(payload, currentT));
				if (inserted === null) {
					restoreSelection(quote.range);
					showNotice("notice.insert-failed");
					return;
				}
				pendingQuote = null;
				clearNotice();
			} catch (error) {
				console.warn("[dsh-quote-followup] quote insertion failed", error);
				restoreSelection(quote.range);
				showNotice("notice.insert-failed");
			}
		};
		//#endregion
		//#region apply
		const STATE = Symbol.for("dsh-quote-followup.state");
		function apply(ctx) {
			const previous = globalThis[STATE];
			if (previous?.version === CLIENT_VERSION)
				return;
			if (typeof previous?.dispose === "function")
				previous.dispose();
			clientContext = ctx;
			let unregisterSource = null;
			let unregisterLocale = null;
			let unsubscribeLocale = null;
			const refreshButtonCopy = () => {
				// No floating quote button to localize.
				const notice = document.getElementById(NOTICE_ID);
				if (notice !== null)
					notice.textContent = currentT(notice.getAttribute("data-message-key"));
			};
			try {
				const locale = typeof ctx?.get === "function" ? ctx.get("locale") : null;
				if (typeof locale?.register === "function" && typeof locale?.bind === "function") {
					unregisterLocale = locale.register(LOCALE_NS, LOCALE_DICT);
					currentT = locale.bind(LOCALE_NS);
					if (typeof locale.subscribe === "function") {
						unsubscribeLocale = locale.subscribe(refreshButtonCopy);
					}
				} else {
					currentT = fallbackT;
				}
			} catch (error) {
				console.warn("[dsh-quote-followup] locale unavailable; using English copy", error);
				currentT = fallbackT;
			}
			try {
				const inputTriggers = typeof ctx?.get === "function" ? ctx.get("inputTriggers") : null;
				if (typeof inputTriggers?.registerSource === "function") {
					unregisterSource = inputTriggers.registerSource(makeQuoteSource(currentT));
					quoteSourceReady = true;
				}
			} catch (error) {
				console.warn("[dsh-quote-followup] native reference codec unavailable; using text fallback", error);
			}
			const onScroll = () => {};
			const onKeyDown = () => {};
			const onMouseDown = () => {};
			const quoteApi = {
				capture: onSelectionChange,
				clear: () => { lastSelectionSnapshot = null; dismissQuote(); },
				run: () => { onSelectionChange(); const hadQuote = pendingQuote !== null; onQuoteClick(); return hadQuote && pendingQuote === null; }
			};
			window.__DSH_SELECTION_GROUP_QUOTE__ = quoteApi;
			let disposed = false;
			let state;
			const cleanup = () => {
				if (disposed)
					return;
				disposed = true;
				if (window.__DSH_SELECTION_GROUP_QUOTE__ === quoteApi) delete window.__DSH_SELECTION_GROUP_QUOTE__;
				clientContext = null;
				dismissQuote();
				clearNotice();
				quoteSourceReady = false;
				if (typeof unsubscribeLocale === "function")
					unsubscribeLocale();
				if (typeof unregisterLocale === "function")
					unregisterLocale();
				currentT = fallbackT;
				if (typeof unregisterSource === "function")
					unregisterSource();
				document.removeEventListener("selectionchange", onSelectionChange);
				window.removeEventListener("scroll", onScroll, true);
				document.removeEventListener("keydown", onKeyDown, true);
				document.removeEventListener("mousedown", onMouseDown, true);
				// No floating quote DOM to remove.
				const style = document.getElementById(STYLE_ID);
				if (style?.getAttribute(STYLE_VERSION_ATTR) === CLIENT_VERSION)
					style.remove();
				if (globalThis[STATE] === state)
					delete globalThis[STATE];
			};
			state = { version: CLIENT_VERSION, dispose: cleanup };
			globalThis[STATE] = state;
			document.addEventListener("selectionchange", onSelectionChange);
			window.addEventListener("scroll", onScroll, true);
			document.addEventListener("keydown", onKeyDown, true);
			document.addEventListener("mousedown", onMouseDown, true);
			// Claim the shared id immediately so an older listener in a long-lived tab
			// cannot keep its obsolete click handler after a client hot-swap.
			// FORK DEVIATION: quote insertion has no standalone UI.
			ensureStyles();
			if (ctx !== undefined && typeof ctx.effect === "function")
				ctx.effect(() => cleanup, "dsh-quote-followup: selection quote ui");
		}
		//#endregion
		exports.inject = ["inputTriggers", "locale", "sessions", "uiSession"];
		exports.apply = apply;
		return module.exports;
		})(require);
		//#endregion

		//#region selection-toolbar glue (src/toolbar.js)
		/**
		 * One selection coordinator and one three-action toolbar, including cross-message
		 * excerpts. Annotation owns the UI; quote is a headless native-insertion service.
		 * User dismissal clears the snapshot. DOM rendering loss preserves it for recovery.
		 * Built into client.js alongside hash-pinned vendor sources and declared patches.
		 */

		//#region constants
		const CLIENT_VERSION = "1.6.4";
		const STYLE_ID = "dsh-selection-group-style";
		const MARKER_ATTR = "data-dsh-selection-group";
		const SELECTION_API_KEY = "__DSH_SELECTION_GROUP_SELECTION__";
		const QUOTE_API_KEY = "__DSH_SELECTION_GROUP_QUOTE__";
		const SELECTION_RANGE_EXCLUDED = '[data-slot="sidebar"], [data-slot^="sidebar."], [data-textpreview-url], [data-textpreview-plain], [data-document-markdown], [data-code-preview], input, textarea, [contenteditable]:not([contenteditable="false"])';
		// Buttons cannot be selection endpoints, but copy/status controls between
		// messages must not veto a range whose endpoints are both conversation text.
		const SELECTION_EXCLUDED = `${SELECTION_RANGE_EXCLUDED}, button`;
		const ACTIONS_KEY = "__DSH_SELECTION_GROUP_ACTIONS__";
		/** Published by the patched annotation plugin: its own closeToolbar. */
		const CLOSE_KEY = "__DSH_SELECTION_GROUP_CLOSE__";
		const QUOTE_ACTION_ATTR = "data-dsh-selection-group-action";
		const ANNOTATION_HOST_SELECTOR = "[data-annotation-for-dsh]";
		const ANNOTATION_BAR_CLASS = "dsh-ann-bar";
		const ANNOTATION_CARD_CLASS = "dsh-ann-card";
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
		const SIDECHAT_OPERATION_KEY = "__DSH_SELECTION_GROUP_SIDECHAT_OPERATION__";
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

		/** The safety heartbeat samples diagnostics and validates service/session ownership. */
		const TICK_MS = 1000;
		const SAMPLE_MS = 1000;

		//#endregion

		//#region shared state
		/** Which layer most recently ensured the shared stylesheet / action hook exists. */
		let styleOwner = null;
		let actionsOwner = null;
		/** The context the published actions close over, and whether they carried 侧边对话. */
		let actionsInstalledFor = null;
		let actionsSidechatSeen = false;
		/** Layers currently mounted — a hot swap can have a successor live before the predecessor goes. */
		const liveLayers = new Set();
		/** When the environment was last sampled. */
		let lastSampleAt = 0;
		/** 侧边对话: whether one send is in flight (a second press would ride over it). */
		let sidechatRunning = false;
		let sidechatOperation = null;

		function cancelSidechatOperation(operation = sidechatOperation) {
			if (operation === null)
				return;
			operation.controller.abort();
			for (const unsubscribe of operation.unsubscribers.splice(0)) {
				try { unsubscribe(); } catch (_) { /* optional service already gone */ }
			}
			if (sidechatOperation === operation) {
				sidechatOperation = null;
				sidechatRunning = false;
			}
			if (window[SIDECHAT_OPERATION_KEY] === operation)
				delete window[SIDECHAT_OPERATION_KEY];
		}

		function sidechatOperationActive(operation) {
			return !operation.controller.signal.aborted && !operation.layer.disposed
				&& actionsOwner === operation.layer && liveLayers.has(operation.layer)
				&& window[ACTIONS_KEY] === operation.layer.actions
				&& currentSessionId(operation.ctx) === operation.sessionId;
		}

		function checkSidechatOperation(operation) {
			if (!sidechatOperationActive(operation)) {
				cancelSidechatOperation(operation);
				throw new window.DOMException("Side chat operation cancelled", "AbortError");
			}
		}

		/** Stop waiting even when a service or a test double ignores AbortSignal. */
		function awaitSidechatOperation(promise, operation) {
			checkSidechatOperation(operation);
			return new Promise((resolve, reject) => {
				const signal = operation.controller.signal;
				const aborted = () => reject(new window.DOMException("Side chat operation cancelled", "AbortError"));
				signal.addEventListener("abort", aborted, { once: true });
				Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener("abort", aborted));
			});
		}
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
			quoteReady: false,
			annotationHostPresent: null,
			actionsInstalled: false,
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
				diagnostics.quoteReady = window[QUOTE_API_KEY] !== undefined;
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
		const styleText = () => [`[${QUOTE_ACTION_ATTR}] { white-space: nowrap; }`].join("\n");

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

		/** The 引用 action calls the native insertion service; no second UI exists. */
		function quoteAction(ctx) {
			const english = ctxIsEnglish(ctx);
			return {
				id: "quote",
				label: english ? "❐ Quote" : "❐ 引用",
				title: english
					? "Quote the selection into the composer (repeatable; editable before sending)"
					: "引用选中内容到输入框（可多次引用，发送前可编辑）",
				run: () => {
					const quote = window[QUOTE_API_KEY];
					if (!quote) {
						showSidechatNotice(english ? 'Quote insertion is unavailable; reload the plugin.' : '引用插入服务不可用，请重新加载插件。');
						return;
					}
					quote.capture();
					if (quote.run() !== true) return;
					// The quote core reports failures; only successful insertion closes the UI.
					closeSharedToolbar();
				}
			};
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
			return window[SELECTION_API_KEY]?.getSnapshot()?.text ?? "";
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
		async function prepareSideChat(ctx, sessionId, operation) {
			checkSidechatOperation(operation);
			if (typeof window.fetch !== "function")
				return { ok: false, error: "this page has no fetch to reach the side chat route with" };
			const response = await awaitSidechatOperation(window.fetch(hostRoute(SIDECHAT_ROUTE), {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ sessionId, question: "" }),
				signal: operation.controller.signal
			}), operation);
			checkSidechatOperation(operation);
			const envelope = await awaitSidechatOperation(readSidechatEnvelope(response), operation);
			checkSidechatOperation(operation);
			if (envelope.ok === false)
				return { ok: false, error: envelope.error };
			storeSidechatThread(sessionId, envelope.childId);
			try {
				const service = sidebarService(ctx);
				if (service === null)
					throw new Error("the sidebar service is no longer available");
				const before = new Set(sidechatTabs(service, sessionId).map(tab => tab.id));
				const opened = service.openTab({ type: SIDECHAT_TAB_TYPE, meta: { threadId: envelope.childId } }, { sessionId });
				// createTab may ignore seed.meta. Bind its newly minted tab synchronously,
				// before React mounts an autoCreate view and starts a second thread.
				const created = sidechatTabs(service, sessionId).filter(tab => !before.has(tab.id));
				if (created.length === 1 && typeof service.updateTab === "function")
					service.updateTab(created[0].id, { meta: { ...created[0].meta, autoCreate: false, threadId: envelope.childId } }, sessionId);
				await awaitSidechatOperation(opened, operation);
				checkSidechatOperation(operation);
			}
			catch (error) {
				if (operation.controller.signal.aborted)
					throw error;
				// The thread exists either way: the person reaches it from the workbench's
				// thread menu, so an open failure is reported without undoing it.
				return { ok: false, error: `the thread was created but its tab did not open: ${String((error !== null && error !== undefined && error.message) || error)}`, childId: envelope.childId };
			}
			return { ok: true, childId: envelope.childId };
		}

		/** Public sidebar snapshot, including split panes. Never retarget an existing tab. */
		function sidechatTabs(service, sessionId) {
			const snapshot = service.getSnapshot?.();
			if (snapshot?.sessionId !== sessionId)
				return [];
			const tabs = [];
			const visit = node => {
				if (node === null || typeof node !== "object") return;
				if (Array.isArray(node.tabs)) tabs.push(...node.tabs.filter(tab => tab.type === SIDECHAT_TAB_TYPE));
				if (Array.isArray(node.children)) node.children.forEach(visit);
			};
			visit(snapshot.state?.bottomSplits);
			return tabs;
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
		 * The neighbour gives consumers no draft API. First verify its committed
		 * tab/scope props, then check the composer structure — never its hashed classes
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
		/**
		 * The neighbour exposes tab metadata through SideChatView's React props, but
		 * currently exposes neither a draft API nor DOM thread attributes. Read ONLY
		 * committed props (never pending/alternate props) to identify the owning tab.
		 * If that compatibility seam disappears, fail closed instead of pasting into
		 * another composer. No React state, fiber, or neighbour DOM is modified.
		 */
		function sidechatComposerOwner(field) {
			const key = Object.getOwnPropertyNames(field).find(name => name.startsWith("__reactFiber$"));
			if (key === undefined)
				return null;
			let fiber = field[key];
			let root = fiber;
			while (root?.return) root = root.return;
			if (root?.stateNode?.current !== root) {
				fiber = fiber?.alternate;
				root = fiber;
				while (root?.return) root = root.return;
				if (root?.stateNode?.current !== root) return null;
			}
			for (let depth = 0; fiber && depth < 100; depth++, fiber = fiber.return) {
				const props = fiber.memoizedProps;
				if (props?.tab?.type === SIDECHAT_TAB_TYPE) {
					return { sessionId: props.scope?.sessionId ?? props.sessionId,
						childId: props.tab.meta?.threadId, visible: props.visible === true };
				}
			}
			return null;
		}

		function findSideChatComposer(sessionId, childId) {
			try {
				let best = null;
				let bestDistance = Number.POSITIVE_INFINITY;
				for (const field of document.querySelectorAll("textarea")) {
					if (!field.isConnected || field.disabled || field.readOnly
						|| field.closest('[hidden], [aria-hidden="true"]') !== null)
						continue;
					const owner = sidechatComposerOwner(field);
					if (owner === null || !owner.visible || owner.sessionId !== sessionId || owner.childId !== childId)
						continue;
					let hidden = false;
					for (let node = field; node !== null; node = node.parentElement) {
						const style = window.getComputedStyle(node);
						if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
							hidden = true;
							break;
						}
					}
					if (hidden) continue;
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
		function waitForSideChatComposer(timeoutMs, operation, childId) {
			const pollMs = Math.max(1, Math.round(sidechatDraftPollMs() / 10));
			const deadline = Date.now() + timeoutMs;
			return new Promise((resolve) => {
				let timer = null;
				const signal = operation.controller.signal;
				const finish = field => {
					if (timer !== null) clearTimeout(timer);
					signal.removeEventListener("abort", aborted);
					resolve(field);
				};
				const aborted = () => finish(null);
				signal.addEventListener("abort", aborted, { once: true });
				const attempt = () => {
					if (!sidechatOperationActive(operation)) {
						cancelSidechatOperation(operation);
						finish(null);
						return;
					}
					const field = findSideChatComposer(operation.sessionId, childId);
					if (field !== null) {
						finish(field);
						return;
					}
					if (Date.now() >= deadline) {
						finish(null);
						return;
					}
					timer = unrefTimer(setTimeout(attempt, pollMs));
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
		function sideChatAction(ctx, layer) {
			const english = ctxIsEnglish(ctx);
			return {
				id: "sidechat",
				label: english ? "◧ Side chat" : "◧ 侧边对话",
				title: english
					? "Put the selection in a side conversation's composer, as plain text — it stays there until you send it"
					: "把选中文字原样放进侧边对话的输入框，发送与否由你决定（不自动发出）",
				run: () => {
					if (sidechatRunning || layer.disposed || actionsOwner !== layer || !liveLayers.has(layer)
						|| window[ACTIONS_KEY] !== layer.actions)
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
					const operation = { ctx, layer, sessionId, controller: new window.AbortController(), unsubscribers: [] };
					operation.cancel = () => cancelSidechatOperation(operation);
					window[SIDECHAT_OPERATION_KEY] = operation;
					sidechatOperation = operation;
					sidechatRunning = true;
					// Cancel immediately on a session switch where subscriptions exist; the
					// heartbeat and every async continuation also verify the captured session.
					const onSession = () => {
						if (!sidechatOperationActive(operation)) cancelSidechatOperation(operation);
					};
					try {
						for (const source of [ctx.get?.("uiSession")?.adapter?.current, ctx.sessions?.list]) {
							const unsubscribe = source?.subscribe?.(onSession);
							if (typeof unsubscribe === "function") operation.unsubscribers.push(unsubscribe);
						}
					} catch (_) { /* older hosts use the heartbeat fallback */ }
					prepareSideChat(ctx, sessionId, operation).then(async (result) => {
						checkSidechatOperation(operation);
						if (result.ok === false) {
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
						const field = await waitForSideChatComposer(sidechatDraftPollMs(), operation, result.childId);
						checkSidechatOperation(operation);
						if (field === null) {
							recordDiagnostics({
								sidechatLast: "no-composer",
								sidechatLastThread: result.childId,
								sidechatLastError: "no editable composer bound to the created thread appeared"
							});
							showSidechatNotice(english
								? `The side chat composer did not appear for the target thread within ${(sidechatDraftPollMs() / 1000).toFixed(0)}s, or its thread identity could not be verified. The selection was not placed; check the workbench and sidebar compatibility.`
								: `目标线程输入框在 ${(sidechatDraftPollMs() / 1000).toFixed(0)} 秒内没有出现，或无法确认所属线程；选中文字没有放进去。请检查工作台是否展开及侧边栏插件兼容性。`);
							return;
						}
						// React may commit between resolving the poll and resuming this promise.
						const placed = findSideChatComposer(sessionId, result.childId) === field && prefillSideChatComposer(field, insert);
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
						if (!sidechatOperationActive(operation))
							return;
						const message = String((error !== null && error !== undefined && error.message) || error);
						recordDiagnostics({ sidechatLast: "failed", sidechatLastThread: null, sidechatLastError: message });
						showSidechatNotice(english ? `Side chat failed: ${message}` : `侧边对话失败：${message}`);
					}).finally(() => cancelSidechatOperation(operation));
				}
			};
		}
		//#endregion

		/** Publish the actions the patched annotation toolbar renders. */
		function installActions(ctx, layer) {
			const previous = window[SIDECHAT_OPERATION_KEY];
			if (previous !== undefined && previous.layer !== layer)
				previous.cancel();
			if (sidechatOperation !== null && sidechatOperation.layer !== layer)
				cancelSidechatOperation();
			// Rebuilt on every render on purpose: the neighbour service can register
			// after this bundle mounts, and a stale action list would then never grow its
			// 侧边对话 button.
			const actions = () => {
				const list = [quoteAction(ctx)];
				try {
					if (sidechatAvailable(ctx))
						list.push(sideChatAction(ctx, layer));
				}
				catch (error) {
					diagnostics.lastError = `the 侧边对话 action could not be published: ${String((error !== null && error !== undefined && error.message) || error)}`;
				}
				return list;
			};
			try {
				layer.actions = actions;
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
		 * coordinator applies the same exclusion to annotation, quote and side chat.
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

		/** One source of selection truth for annotation, quote and side chat. */
		function selectionElement(node) {
			return node?.nodeType === 1 ? node : node?.parentElement ?? null;
		}

		function chatRootOf(node) {
			const element = selectionElement(node);
			if (element === null || element.closest(SELECTION_EXCLUDED) !== null)
				return null;
			const transcript = element.closest('[data-slot="conversation.session"]');
			if (transcript === null || isInRightSidebar(transcript))
				return null;
			let row = element;
			while (row !== transcript && row !== null) {
				if (row.hasAttribute('data-chat-flow-kind') || row.hasAttribute('data-chat-turn')) return row;
				row = row.parentElement;
			}
			return transcript;
		}

		function readChatSelection(ctx) {
			const selection = document.getSelection();
			if (selection === null || selection.isCollapsed || selection.rangeCount !== 1)
				return { frame: null, collapsed: true };
			const range = selection.getRangeAt(0);
			const start = selectionElement(range.startContainer);
			const end = selectionElement(range.endContainer);
			const transcript = start?.closest('[data-slot="conversation.session"]');
			if (!transcript || transcript !== end?.closest('[data-slot="conversation.session"]')
				|| chatRootOf(start) === null || chatRootOf(end) === null)
				return { frame: null, collapsed: false };
			// Endpoints alone do not exclude an embedded editor/file between two messages.
			for (const excluded of transcript.querySelectorAll(SELECTION_RANGE_EXCLUDED)) {
				if (range.intersectsNode(excluded)) return { frame: null, collapsed: false };
			}
			const rawText = selection.toString();
			if (rawText.trim() === '') return { frame: null, collapsed: true };
			const startRoot = chatRootOf(start);
			const root = startRoot === chatRootOf(end) ? startRoot : transcript;
			const prefix = document.createRange();
			prefix.selectNodeContents(root);
			prefix.setEnd(range.startContainer, range.startOffset);
			const offset = prefix.toString().length;
			const full = root.textContent ?? '';
			return { collapsed: false, frame: {
				text: rawText.trim(), rawText, range: range.cloneRange(), root, transcript,
				startNode: range.startContainer, endNode: range.endContainer,
				startValue: range.startContainer.textContent, endValue: range.endContainer.textContent,
				offset, before: full.slice(Math.max(0, offset - 24), offset),
				after: full.slice(offset + rawText.length, offset + rawText.length + 24),
				turn: root.getAttribute('data-chat-turn'),
				anchorKey: root.getAttribute('data-chat-anchor-key') ?? root.getAttribute('data-focus-anchor-key'),
				sessionId: currentSessionId(ctx), rect: range.getBoundingClientRect(), recovering: false,
			} };
		}

		/** Re-anchor inside the same message (or transcript for a cross-message quote). */
		function recoverSelectionRange(frame) {
			let root = frame.root;
			if (!root.isConnected) {
				const transcripts = [...document.querySelectorAll('[data-slot="conversation.session"]')]
					.filter(element => !isInRightSidebar(element));
				if (transcripts.length !== 1) return null;
				if (frame.turn === null) root = transcripts[0];
				else {
					const candidates = [...transcripts[0].querySelectorAll('[data-chat-turn]')]
						.filter(row => row.getAttribute('data-chat-turn') === frame.turn
							&& (frame.anchorKey === null || (row.getAttribute('data-chat-anchor-key') ?? row.getAttribute('data-focus-anchor-key')) === frame.anchorKey));
					if (candidates.length !== 1) return null;
					root = candidates[0];
				}
			}
			if (!root) return null;
			const full = root.textContent ?? '';
			let offset = frame.offset;
			if (full.slice(offset, offset + frame.rawText.length) !== frame.rawText
				|| full.slice(Math.max(0, offset - frame.before.length), offset) !== frame.before
				|| full.slice(offset + frame.rawText.length, offset + frame.rawText.length + frame.after.length) !== frame.after) {
				const context = frame.before + frame.rawText + frame.after;
				const found = full.indexOf(context);
				if (found < 0 || full.indexOf(context, found + 1) >= 0) return null;
				offset = found + frame.before.length;
			}
			const walker = document.createTreeWalker(root, window.NodeFilter.SHOW_TEXT);
			let node; let cursor = 0; let start = null; let startOffset = 0;
			while ((node = walker.nextNode()) !== null) {
				const next = cursor + node.textContent.length;
				if (start === null && offset < next) { start = node; startOffset = offset - cursor; }
				if (start !== null && offset + frame.rawText.length <= next) {
					const range = document.createRange();
					range.setStart(start, startOffset);
					range.setEnd(node, offset + frame.rawText.length - cursor);
					if (chatRootOf(start) === null || chatRootOf(node) === null) return null;
					for (const excluded of root.querySelectorAll(SELECTION_RANGE_EXCLUDED)) {
						if (range.intersectsNode(excluded)) return null;
					}
					return range;
				}
				cursor = next;
			}
			return null;
		}

		function clearSelectionFrame(layer, close = true) {
			layer.selection = null;
			window[QUOTE_API_KEY]?.clear();
			if (close) closeSharedToolbar();
		}

		function selectionFrame(layer) {
			if (layer.disposed || window[SELECTION_API_KEY] !== layer.selectionApi) return null;
			if (layer.selection && currentSessionId(layer.context) !== layer.selection.sessionId)
				clearSelectionFrame(layer);
			return layer.selection;
		}

		/** Only disconnected/changed selected nodes qualify as a render loss. */
		function onSelectionChange(layer) {
			if (layer.disposed || window[SELECTION_API_KEY] !== layer.selectionApi) return;
			if (document.querySelector(`.${ANNOTATION_CARD_CLASS}`) !== null) return;
			if (selectionElement(document.activeElement)?.closest('[data-annotation-for-dsh]')) return;
			const result = readChatSelection(layer.context);
			const previous = selectionFrame(layer);
			const renderLoss = previous && (!previous.startNode.isConnected || !previous.endNode.isConnected
				|| previous.startNode.textContent !== previous.startValue || previous.endNode.textContent !== previous.endValue
			);
			// A render can shrink a cross-message range without collapsing it. The
			// surviving fragment is not a new user selection; retain the full snapshot.
			if (previous && (renderLoss && (result.frame !== null || result.collapsed)
				|| result.collapsed && previous.recovering)) {
				previous.recovering = true;
				const recovered = recoverSelectionRange(previous);
				if (recovered) previous.rect = recovered.getBoundingClientRect();
			} else if (result.frame !== null) {
				layer.selection = result.frame;
			} else {
				clearSelectionFrame(layer);
			}
			diagnostics.selection = describeSelection();
			persistDiagnostics();
		}

		function installSelectionApi(layer) {
			layer.selection = null;
			layer.selectionSubscriptions = [];
			layer.selectionApi = {
				getSnapshot: () => selectionFrame(layer), rootOf: chatRootOf,
				clear: () => clearSelectionFrame(layer, false),
				rect: () => {
					const frame = selectionFrame(layer);
					if (!frame) return null;
					const range = recoverSelectionRange(frame);
					if (range) frame.rect = range.getBoundingClientRect();
					return frame.rect;
				},
			};
			window[SELECTION_API_KEY] = layer.selectionApi;
			try {
				for (const source of [layer.context?.get?.('uiSession')?.adapter?.current, layer.context?.sessions?.list]) {
					const unsubscribe = source?.subscribe?.(() => selectionFrame(layer));
					if (typeof unsubscribe === 'function') layer.selectionSubscriptions.push(unsubscribe);
				}
			} catch (_) { /* every action and the heartbeat still validate the session */ }
		}

		/** Observe UI ownership, without a second button or a hiding marker. */
		function refreshToolbarState() {
			diagnostics.barUp = document.querySelector(`.${ANNOTATION_BAR_CLASS}`) !== null;
			diagnostics.cardUp = document.querySelector(`.${ANNOTATION_CARD_CLASS}`) !== null;
		}

		/**
		 * Follow the toolbar through the DOM instead of asking for it 25 times a second.
		 *
		 * The bar and the editor card are direct children of the annotation host, and the
		 * host itself is a direct child of <body>, so two childList observers cover every
		 * appearance and disappearance; <head> is watched as well so a stylesheet removed
		 * behind our back is noticed at once. If the host ever moves somewhere else, the
		 * safety interval still samples the UI state.
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
						refreshToolbarState();
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

		/** Steady state: validate ownership and sample the environment occasionally. */
		function heartbeat(layer) {
			try {
				if (sidechatOperation !== null && !sidechatOperationActive(sidechatOperation))
					cancelSidechatOperation();
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
				selectionFrame(layer);
				refreshToolbarState();
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
		 * and start the safety heartbeat. Safe to call before the vendored plugins mount.
		 * @param ctx - cordis context carrying the injected client services.
		 * @returns disposer that removes every trace of this bundle.
		 */
		function mountSelectionToolbar(ctx) {
			const layer = { id: "dsh-selection-group", mountedAt: Date.now(), context: ctx, disposed: false };
			installActions(ctx, layer);
			installSelectionApi(layer);
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
			let pointerId = null;
			const cancelGesture = event => {
				if (window[SELECTION_API_KEY] !== layer.selectionApi) return;
				setDragging(false); pointerId = null;
				// Losing focus must not discard a note being edited in the annotation card.
				const editing = document.querySelector('.' + ANNOTATION_CARD_CLASS) !== null;
				clearSelectionFrame(layer, !editing || event?.key === 'Escape');
			};
			const onPointerDown = event => {
				if (window[SELECTION_API_KEY] !== layer.selectionApi || (event.button ?? 0) !== 0 || event.isPrimary === false) return;
				if (event.target?.closest?.('[data-annotation-for-dsh], [data-annotation-overlay], [data-annotation-num-layer]')) return;
				if (document.querySelector('.' + ANNOTATION_CARD_CLASS)) return;
				if (isDragging()) return; // pointerdown's compatibility mousedown is the same gesture
				clearSelectionFrame(layer);
				if (chatRootOf(event.target) === null) return;
				pointerId = event.pointerId ?? null;
				setDragging(true);
			};
			const onPointerUp = event => {
				if (window[SELECTION_API_KEY] !== layer.selectionApi || !isDragging()) return;
				if (pointerId !== null && event.pointerId !== undefined && event.pointerId !== pointerId) return;
				setDragging(false); pointerId = null;
				document.dispatchEvent(new window.Event('selectionchange'));
			};
			const onKeyDown = event => {
				if (event.target?.closest?.('[data-annotation-for-dsh]')) return;
				if (['Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)
					|| event.key?.toLowerCase() === 'a' && (event.ctrlKey || event.metaKey)) cancelGesture(event);
			};
			const onVisibility = () => { if (document.hidden) cancelGesture(); };
			document.addEventListener('pointerdown', onPointerDown, true);
			document.addEventListener('mousedown', onPointerDown, true);
			window.addEventListener('pointerup', onPointerUp, true);
			window.addEventListener('mouseup', onPointerUp, true);
			window.addEventListener('pointercancel', cancelGesture, true);
			window.addEventListener('lostpointercapture', cancelGesture, true);
			window.addEventListener('blur', cancelGesture);
			document.addEventListener('visibilitychange', onVisibility);
			document.addEventListener('keydown', onKeyDown, true);
			let interval = null;
			try {
				interval = unrefTimer(setInterval(() => heartbeat(layer), TICK_MS));
			}
			catch (_) { /* without timers the toolbar still works; only diagnostics stop sampling */ }
			heartbeat(layer);
			diagnostics.applied = true;
			diagnostics.mountedAt = new Date().toISOString();
			persistDiagnostics();

			return () => {
				if (layer.disposed) return;
				layer.disposed = true;
				if (sidechatOperation?.layer === layer)
					cancelSidechatOperation();
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
				for (const unsubscribe of layer.selectionSubscriptions.splice(0)) {
					try { unsubscribe(); } catch (_) { /* service already gone */ }
				}
				try {
					document.removeEventListener('pointerdown', onPointerDown, true);
					document.removeEventListener('mousedown', onPointerDown, true);
					window.removeEventListener('pointerup', onPointerUp, true);
					window.removeEventListener('mouseup', onPointerUp, true);
					window.removeEventListener('pointercancel', cancelGesture, true);
					window.removeEventListener('lostpointercapture', cancelGesture, true);
					window.removeEventListener('blur', cancelGesture);
					document.removeEventListener('visibilitychange', onVisibility);
					document.removeEventListener('keydown', onKeyDown, true);
				}

				catch (_) { /* already gone */ }
				if (window[SELECTION_API_KEY] === layer.selectionApi) {
					clearSelectionFrame(layer);
					delete window[SELECTION_API_KEY];
				}
				liveLayers.delete(layer);
				if (liveLayers.size === 0) {
					// Outstanding work was cancelled above, so no continuation can reopen
					// a tab, write storage or a draft, or recreate this notice after dispose.
					clearSidechatNotice();
					sidechatRunning = false;
				}
				// Only the last layer out clears the page-wide marker and captures: a successor
				// may already be live and still needs them (its heartbeat re-evaluates the
				// marker on the next tick).
				if (liveLayers.size === 0) {
					try {
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
					if (window[ACTIONS_KEY] === layer.actions)
						delete window[ACTIONS_KEY];
				}
				diagnostics.applied = false;
				diagnostics.disposedAt = new Date().toISOString();
				persistDiagnostics();
			};
		}
		//#endregion

		//#endregion

		//#region plugin face
		const VENDORED_PLUGINS = [
			{ key: "annotation", plugin: vendoredAnnotation },
			{ key: "quote", plugin: vendoredQuote }
		];

		/** Which services the real client context carries, and what each mount returned. */
		function describeContext(ctx) {
			const shape = {
				sessions: typeof (ctx === null || ctx === undefined ? undefined : ctx.sessions),
				conversation: typeof (ctx === null || ctx === undefined ? undefined : ctx.conversation),
				locale: typeof (ctx === null || ctx === undefined ? undefined : ctx.locale),
				get: typeof (ctx === null || ctx === undefined ? undefined : ctx.get),
				inputTriggers: "n/a"
			};
			if (shape.get === "function") {
				try {
					const codec = ctx.get("inputTriggers");
					shape.inputTriggers = codec === null || codec === undefined ? "missing" : "present";
				}
				catch (error) {
					shape.inputTriggers = "threw: " + String((error !== null && error !== undefined && error.message) || error);
				}
			}
			return shape;
		}

		/**
		 * Publish the toolbar glue, then mount both vendored plugins. The glue must
		 * come first: the patched annotation toolbar reads the injected actions when
		 * it renders. A vendored plugin that throws must not take the others down;
		 * every mount outcome is recorded for the diagnostics probe.
		 * @param ctx - cordis context carrying the injected client services.
		 * @returns disposer for everything this bundle mounted.
		 */
		const mergedStateKey = Symbol.for("dsh-selection-group.state");
		function apply(ctx) {
			globalThis[mergedStateKey]?.dispose();
			// Diagnostics hooks go in before the plugins mount, so their own warnings and
			// any mount failure get captured rather than guessed at.
			initDiagnostics();
			const disposers = [];
			const vendoredMount = {};
			recordDiagnostics({ context: describeContext(ctx), vendoredMount });
			try {
				disposers.push(mountSelectionToolbar(ctx));
			}
			catch (error) {
				if (typeof console !== "undefined" && typeof console.warn === "function")
					console.warn("[dsh-selection-group] the toolbar glue failed to mount:", error);
			}
			// The vendored quote plugin refuses to re-apply while a predecessor's state is
			// still registered (it early-returns), and that predecessor's teardown then
			// removes the button for good — a hot swap would leave 引用 dead until a
			// restart. Retire the predecessor first; its teardown is idempotent.
			try {
				const quoteStateKey = Symbol.for("dsh-quote-followup.state");
				const previousQuote = globalThis[quoteStateKey];
				if (previousQuote !== null && previousQuote !== undefined && typeof previousQuote.dispose === "function")
					previousQuote.dispose();
				delete globalThis[quoteStateKey];
			}
			catch (_) { /* nothing to retire */ }
			for (const { key, plugin } of VENDORED_PLUGINS) {
				try {
					const result = typeof plugin.apply === "function" ? plugin.apply(ctx) : undefined;
					vendoredMount[key] = typeof result === "function" ? "mounted (with disposer)" : "mounted";
					if (typeof result === "function")
						disposers.push(result);
				}
				catch (error) {
					vendoredMount[key] = "FAILED: " + String((error !== null && error !== undefined && error.stack) || error);
					if (typeof console !== "undefined" && typeof console.warn === "function")
						console.warn("[dsh-selection-group] a vendored plugin failed to mount; the rest still runs:", error);
				}
			}
			// Record whether each half actually created its UI: an apply that early-returns
			// (e.g. a predecessor still registered) reports as mounted but leaves nothing.
			try {
				vendoredMount.quoteApi = window.__DSH_SELECTION_GROUP_QUOTE__ !== undefined;
				vendoredMount.annotationUi = document.querySelector("[data-annotation-for-dsh]") !== null;
			}
			catch (_) { /* diagnostics only */ }
			let disposed = false;
			const mergedState = {};
			const dispose = () => {
				if (disposed) return;
				disposed = true;
				if (globalThis[mergedStateKey] === mergedState) delete globalThis[mergedStateKey];
				for (const entry of disposers) {
					try {
						entry();
					}
					catch (_) { /* one failing disposer must not strand the others */ }
				}
			};
			mergedState.dispose = dispose;
			globalThis[mergedStateKey] = mergedState;
			// cordis effect semantics: the callback runs NOW and its RETURN VALUE is the
			// cleanup, so passing the disposer directly would dispose the plugin the
			// instant it mounted (measured in the field: mountedAt + 1 ms). Mirror upstream quote.
			if (ctx !== undefined && ctx !== null && typeof ctx.effect === "function")
				ctx.effect(() => dispose, "dsh-selection-group: merged selection toolbar");
			return dispose;
		}

		/** Test seam: mount only the toolbar glue (used by test/toolbar.test.mjs). */
		exports.__toolbar = mountSelectionToolbar;
		exports.inject = ["sessions", "conversation", "locale", "uiSession", "inputTriggers"];
		exports.apply = apply;
		return module.exports;
	}
});
