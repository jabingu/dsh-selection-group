# dsh-selection-group

> **English summary** — A DSH client plugin that gives text selection in the chat
> **one** hover toolbar with **two** actions (annotate + quote). It is a *merged*
> build: both upstream plugins are vendored byte-for-byte and patched at build time,
> so it depends on neither of them being installed. `client.js` is generated from
> `vendor/` + `src/` and verified by the test suite (`npm test`).
>
> [English README → README.en.md](README.en.md)
>
> MIT licensed. The vendored plugins are MIT too — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
> for their licences and every deliberate deviation from upstream, with reasons.



**一个悬停框，两个动作。** 选中文字后出现的**同一个**框里有两段：

```
┌──────────────────────────┐
│  ＋ 批注  │  ❐ 引用       │      ← 定位在选区上方
└──────────────────────────┘
```

- **＋ 批注**：对选中的文字写批注，随消息发送，模型按编号逐条回应（上游 `@changfenhuang/dsh-annotation`）。
- **❐ 引用**：把选中文字以 DSH 原生引用 chip 追加到输入框（上游 `dsh-quote-followup`）。

**它不依赖那两个插件**：两者的浏览器端代码被逐字内联进本包；两者都可以保持停用或直接卸载。

## 架构（一个框 + 注入的动作，而不是搬运两个框）

| | 做法 |
|---|---|
| 唯一的悬停框 | annotation 的工具条。构建期补丁让它**为每个注入的动作渲染一个按钮**（`window.__DSH_SELECTION_GROUP_ACTIONS__`）。 |
| 第二个动作 | 一个 `❐ 引用` 按钮，它的 `run()` 只是**点击 `dsh-quote-followup` 自己的按钮**。那个插件完全保持上游实现（选区跟踪、原生 chip 插入、失败提示），只是它的浮动按钮在共享框出现时被隐藏。 |
| 隐藏是**同回合**的 | 选中文字的那一刻（`selectionchange` 内，同步）就给 `<html>` 打上 `data-dsh-selection-group-bar`，独立按钮一帧都不会露——否则它会先在自己的位置闪一下（独立按钮是即时的，共享框要等批注约 120ms 的 settle）。若共享框在 **300ms** 宽限内没出现（例如跨消息选区被上游拒绝），标记释放，独立按钮回来，引用照旧可用。 |
| 不搬 DOM | 没有任何节点的重新父级化或移动，没有容器、没有定位接管、没有帧调度。（`test/contract.test.mjs` 断言 glue 里不存在 `insertBefore` / `appendChild(quote…)`。） |

## 版本沿革

| 版本 | 做法 | 结果 |
|---|---|---|
| 0.2.0 | DOM 适配层：把两个插件各自的悬浮按钮搬进一个容器 | 依赖两个插件都启用 |
| 1.0.0 | 内联合并 + 归位层（仍是"搬 DOM"） | 自包含，但仍受 DOM 搬运与调度影响 |
| 1.1.0 | **一个悬停框 + 补丁注入第二个动作** | 无搬运、无容器、无调度器，改动面最小 |
| 1.2.x | 立即出框、引用点完收框、`ctx.effect` 与热插拔修复 | 与选区同时出现，不再残留框 |
| **1.3.x**（当前） | 拖拽感知绘制、事件驱动标记、可观测的自我修复 | 拖选不闪，空闲 ~18 次 DOM 查询/秒 |

## 安装 / 升级

包名与安装槽没变（desktop profile 里以 `link:` 安装且已在 `dsh.profile.bundles` 中启用），所以：

1. **完全退出 DeepSeek Harness（`Cmd+Q`）再打开**。
2. `dsh-quote-followup`、`@changfenhuang/dsh-annotation` **继续保持停用或直接卸载**。⚠️ 不要重新启用：内联副本与上游使用相同的元素 id（`dsh-quote-followup-btn`），同时存在会互相抢 DOM。

从零安装（新机器）：

```
设置 → 插件 → 安装，粘贴本仓库的绝对路径（示例）：
~/path/to/dsh-selection-group
```

或：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add \
  "link:$PWD"          # 在仓库根目录执行
```

## 结构

| 路径 | 说明 |
|---|---|
| `client.js` | **生成物，勿手改**。由 `scripts/build.mjs` 从下面几份输入生成 |
| `vendor/dsh-annotation.client.js` | `@changfenhuang/dsh-annotation` v1.4.11 浏览器半区，**逐字**拷贝（MIT） |
| `vendor/dsh-quote-followup.client.js` | `dsh-quote-followup` v0.2.10 浏览器半区，**逐字**拷贝（MIT） |
| `vendor/manifest.json` | 两个 vendor 文件的版本、许可与 **sha256**（构建时强校验） |
| `patches/*.json` | 对上游的**有意偏离**（见下），构建时套用；`vendor/` 仍与上游逐字节一致 |
| `src/toolbar.js` | 本项目唯一自研部分：发布动作 hook、条件隐藏独立按钮、诊断 |
| `scripts/build.mjs` | 合并构建：套补丁 → 剥离 `__ModuleLoader__` 包装 → 内联工厂体 → 拼接 glue |
| `lib/index.js` / `cordis.patch.yml` | Node 半区空实现 / bundle patch |
| `icon.svg` + `locale/{en,zh}.json` | 插件面板显示用的图标与**本地化名称/简介**（`meta.title` / `meta.description`；`en.json` 是读取器要求的锚点，`exports` 里必须导出 `./locale/*.json` 才解析得到） |
| `THIRD_PARTY_NOTICES.md` | 第三方许可与偏离清单 |

## 对上游的有意偏离

`patches/` 里每条都写了 `why`。`test/vendor.test.mjs` 断言：锚点在上游文件里**恰好命中一次**、替换文本尚未存在于上游、**确实进入产物**，且产物里不再残留上游原文。

| 补丁 | 上游 | 现在 | 为什么 |
|---|---|---|---|
| `accept-any-conversation-row`（annotation） | 只对**助手消息**里的选区提供工具条 | 会话区内的**任意消息行**（用户 / steering / 工具步）都可；跨多条消息仍拒绝 | 让两个动作对**同一个选区**都可用 |
| `settle-120ms`（annotation） | 选中稳定后等 **250ms** 才画工具条 | **120ms**（仅用于"再校验 + 用最终摘录重绘一次"） | 缩短错位 |
| `immediate-toolbar`（annotation） | 工具条在 settle 之后才画出来 | **在 `selectionchange` 当回合就画**；拖选过程中只移动不重建；settle 只在最后校验并用最终摘录重绘一次 | 让「批注 + 引用」随选区**立即**出现，而不是延迟 120ms |
| `resync-excerpt-on-click`（annotation） | `enterEditing` 用 settle 时存下的摘录 | 点击时**从实时选区重取**摘录 | 框出得比 settle 早，否则拖选刚结束就点「批注」会批到旧文本 |
| `expose-close-hook`（annotation） | 收框函数 `closeToolbar` 是内部闭包 | 把它发布成 `window.__DSH_SELECTION_GROUP_CLOSE__` | 让「引用」点完也收框（点「批注」会切到编辑卡片所以框本就消失；而选区被清空时它**不会**自动收框） |
| `bar-extra-actions`（annotation） | 工具条只有一个「批注」按钮 | 额外渲染 glue 注入的动作按钮（带 `data-dsh-selection-group-action`） | 这就是"合并"本身 |
| `mousedown-tolerates-merged-trigger`（quote） | 指针按在非本按钮上就丢弃待引用摘录 | 容忍标记为 `data-dsh-selection-group-action` 的按钮 | 否则按下注入的「引用」按钮会在 click 之前清掉摘录 |

## 行为与边界

- **引用走的是上游路径**：点击注入按钮 → 触发 quote 自己的按钮 click → 它经官方 session facade 做原生 chip 插入（`conversation.input.for(scope).insertReference`），失败时仍弹它自己的提示。
- **改动面最小**：除"隐藏独立按钮"这一条 CSS 和上述 9 处补丁外，两个插件的代码与行为不变。
- **不依赖 `requestAnimationFrame`**：批注用 rAF 做标记重排/卡片定位/发送后聚焦；本包启动时探测 rAF 是否真的触发，若证实不触发（某些 Electron 视图会如此）就给整页垫一个定时器实现，记入诊断 `rafShimmed`。
- **已知行为**：点「批注」→ 框换成编辑卡片；点「引用」→ 引用插入输入框后**框同样收起**（两者行为一致）。选区消失或点框外时整框收起，独立按钮随之恢复。
- **失败不静默**：若引用没能插入（没有输入框、输入框被锁、摘录确实已经失效），上游插件会**弹出原因提示**，且**框保持打开**让你重新选择重试——不会出现"点了没反应、框还消失了"。
- **框在屏上时摘录不会莫名丢失**：上游在"选区失效"（文本变空、矩形测不到 —— 流式输出时聊天区重渲染就会这样）或"任何滚动"时会丢弃待引用摘录，而批注的框此时**不会关**，于是你按「引用」就会撞上"摘录已保留，请选中原文重试"。本包打了补丁：**只要合并工具条还在接管（标记在），上述两种情形都不丢弃摘录**；Escape、点框外、独立模式下的滚动仍按上游语义处理。
- **编辑卡片期间也隐藏独立按钮**：批注的框换成编辑卡片后，独立「引用」按钮不再冒出来压住卡片。
- **开销**：工具栏是**事件驱动**的——`selectionchange` 当回合打标记，`MutationObserver`（body / head / annotation host，childList）跟随框与编辑卡片的出现与消失，宽限期用一次性 timeout，1 秒的定时器只做兜底（自愈 + 采样）。实测**完全空闲**时：诊断全量期间 ~18 次 DOM 查询/秒（原来是 ~110），**过期/关闭后 ~8 次/秒且零写盘**。若还想更省，把 `TICK_MS`/`SAMPLE_MS` 调大即可。
- **更新日志**：见 [CHANGELOG.md](CHANGELOG.md)。
- **显示时机**：**按住鼠标期间不出框**（拖拽每一帧都会触发 `selectionchange`，且跨消息边界那一帧上游会收框，于是会闪），**松开鼠标的那一回合立刻出框**——`pointerup` 会补发一次 `selectionchange`，所以既没有闪烁，也不用等上游的 120ms settle。**按住期间独立「引用」按钮同样保持隐藏**：共享框既然要等松手，宽限期就不能成为它的理由，否则你按住停顿超过 300ms 就会看到那颗孤立的引用按钮。非拖拽路径（双击选词、键盘选择、程序化选择）依旧**当回合**出框。
- **不含**任何网络请求、文件写入或主机权限。

## 排障（自证诊断，不用开控制台）

**诊断默认只跑 3 分钟。** 它们会包装 `console.warn/error`、监听 window 错误并每秒采样，对排查刚启动时的问题很值；长期挂在别人的页面上则不合适。

| 想要 | 做法（在插件加载前设置） |
|---|---|
| 一直开着 | `window.__DSH_SELECTION_GROUP_DIAGNOSTICS__ = true` |
| 完全关掉（不挂钩子、不写盘、不采样） | `window.__DSH_SELECTION_GROUP_DIAGNOSTICS__ = false` |
| 改过期时长（毫秒） | `window.__DSH_SELECTION_GROUP_DIAGNOSTICS_TTL_MS__ = 600000` |

过期（或关闭）时：console 与错误监听被**还原**、采样与写盘停止，并**写入最后一份快照**（含 `diagnosticsMode: "expired"`、`diagnosticsExpiredAt`）；`window.__DSH_SELECTION_GROUP__` 里那些**事件驱动的轻量字段**（`applied` / `barUp` / `cardUp` / `quoteButtonHidden` / `diagnosticsMode`）继续可用。工具栏功能不受影响——标记、观察者、动作 hook、拖拽跟踪，以及 rAF 兜底垫片（那是正确性修复，不是诊断）都不随开关关闭。

实测空闲开销：全量运行时 ~18 次 DOM 查询/秒（有写盘）；**过期或关闭后 ~8 次/秒、零写盘**（剩下的是标记与自愈的功能下限，1 秒一次）。

诊断同时挂在 `window.__DSH_SELECTION_GROUP__` 并**写进 `localStorage['dsh-selection-group.diagnostics']`**（Electron 把它落在磁盘上，可直接读）：

`applied / mountedAt / tick / barUp / cardUp / extraButtons / actionsInstalled / quoteButtonHidden / stylePresent / hookPresent / selection{state,rowKind,rowTurn,inTranscript} / consoleTail / lastWindowError / lastError / visibility / docHidden / rafFired / rafShimmed / topLevel / href / frames / transcripts / flowRows / turnRows / context / vendoredMount / disposedAt`

| 症状 | 先看 |
|---|---|
| 一个框都不出现 | `vendoredMount.annotation` 是否 `mounted (with disposer)`；`consoleTail` / `lastWindowError` |
| 框出现但只有一个按钮 | `extraButtons` 是否为 1；`actionsInstalled`；`consoleTail` 里是否有 `[annotation] …` |
| 两个框同时出现 | `barUp` / `cardUp` / `quoteButtonHidden`（选中同回合打标记，MutationObserver 跟随框的出现/消失）；`stylePresent` / `hookPresent` |
| 批注不出 | `selection.rowKind` / `inTranscript`；`transcripts` 是否 > 0（确认插件与 UI 在同一文档） |

开发者工具在这个应用里是 **F12**（Mac 上若被系统占用用 `Fn+F12`）。

## 开发与测试

```sh
npm install                     # 只有一个开发依赖：jsdom
npm run build                   # 重新生成 client.js
npm test                        # 51 项
```

| 测试文件 | 覆盖 |
|---|---|
| `test/toolbar.test.mjs`（30） | 动作 hook 与条件隐藏；**一个框里两个按钮**；**点击「引用」真的走通 quote 的原生插入**（断言官方 facade 收到一次 `insertReference` 且带选中文字）；有框时隐藏 / 无框时恢复；用户消息里也成立；rAF 垫片；拖拽门控；热插拔；诊断的三种模式（默认过期 / 强制开启 / 完全关闭）与镜像快照 |
| `test/integration.test.mjs`（3） | 真实挂载合并 bundle：两个内联插件都创建 UI、glue 发布动作、**不移动任何 DOM**、无运行期上游引用 |
| `test/vendor.test.mjs`（6） | vendor 哈希/许可、内联体 = vendor + 已声明补丁、每处偏离的锚点/理由/是否落盘、无上游引用、构建可复现 |
| `test/manifest.test.mjs`（5）+ `test/contract.test.mjs`（3） | 包形状、面板本地化元数据与内联代码/glue 的 DOM 契约 |

## 更新上游版本

1. 新版 `client.js` 放进 `vendor/`，同步更新同名 `LICENSE.*`。
2. 更新 `vendor/manifest.json` 的 `version` 与 `sha256`（`shasum -a 256 vendor/<file>`）。
3. `node scripts/build.mjs` —— 若上游动过被补丁锚定的代码，这一步会**直接报错**并指出是哪个补丁，照 `patches/*.json` 的新上下文改锚点。
4. `node --test test/*.test.mjs`。
