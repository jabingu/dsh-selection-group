# dsh-selection-group

**Selection Toolbar** —— 插件面板里显示的名字（包名、插件 id、仓库名都是 `dsh-selection-group`；标识名用 kebab-case，面板名给人读，二者分工不同）。

> **English summary** — A DSH client plugin that gives text selection in the chat
> **one** hover toolbar with **three** actions (annotate + quote + side chat). It is a *merged*
> build: both upstream plugins are vendored byte-for-byte and patched at build time,
> so it depends on neither of them being installed. `client.js` is generated from
> `vendor/` + `src/` and verified by the test suite (`npm test`).
>
> [English README → README.en.md](README.en.md)
>
> MIT licensed. The vendored plugins are MIT too — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
> for their licences and every deliberate deviation from upstream, with reasons.

**一个悬停框，三个动作。** 选中文字后出现的**同一个**框里有三段：

```
┌─────────────────────────────────────┐
│  ＋ 批注  │  ❐ 引用  │  ◧ 侧边对话    │   ← 定位在选区上方
└─────────────────────────────────────┘
```

- **＋ 批注**：对选中的文字写批注，随消息发送，模型按编号逐条回应（上游 `@changfenhuang/dsh-annotation`）。
- **❐ 引用**：把选中文字以 DSH 原生引用 chip 追加到输入框（上游 `dsh-quote-followup`）。
- **◧ 侧边对话**：在 `dsh-better-sidebar` 的**侧边对话**里新建一条**空**线程，把选中文字**原样放进它的输入框**（纯文本，没有任何 `>` 前缀或标题；光标停在末尾），**不自动发出**——你补上自己的问题再按发送。点这个按钮**不消耗 token**；上下文要等你按发送才提交。

**只在聊天里生效**：这个框**只在对话消息**中出现。在**侧边栏**（文件树 / 文件查看器 / 侧边对话 / 终端 / 任务）里、或者在**任何文件内容**上选文字——不管文件开在右侧栏还是中间主区——都**不会**出现这个框（文件内容归 `dsh-better-sidebar` 自己的「添加到对话」管）。

**前两个动作不依赖任何上游插件**：两者的浏览器端代码被逐字内联进本包；两者都可以保持停用或直接卸载。**第三个动作依赖 `dsh-better-sidebar`**：它没装（或没启用）时这个按钮**根本不出现**，不会留一个点了没反应的死按钮。

## 架构（一个框 + 注入的动作，而不是搬运两个框）

| | 做法 |
|---|---|
| 唯一的悬停框 | annotation 的工具条。构建期补丁让它**为每个注入的动作渲染一个按钮**（`window.__DSH_SELECTION_GROUP_ACTIONS__`）。 |
| 第二个动作 | 一个 `❐ 引用` 按钮，它的 `run()` 只是**点击 `dsh-quote-followup` 自己的按钮**。那个插件完全保持上游实现（选区跟踪、原生 chip 插入、失败提示），只是它的浮动按钮在共享框出现时被隐藏。 |
| 第三个动作 | 一个 `◧ 侧边对话` 按钮。它**不复制**侧边对话的实现：先按 `dsh-better-sidebar` 自己的顺序建一条**空线程**（`POST /sidebar/api/sidechat.start`，`question: ''`），把这个线程 id 写进它"本会话最后一条线程"的位置，用公开的扩展服务 `ctx.betterSidebar.openTab({ type: 'sidechat' })` 打开 tab，最后把选中文字**原样写进那个 tab 自己的输入框**。见下节。 |
| 隐藏是**同回合**的 | 选中文字的那一刻（`selectionchange` 内，同步）就给 `<html>` 打上 `data-dsh-selection-group-bar`，独立按钮一帧都不会露——否则它会先在自己的位置闪一下（独立按钮是即时的，共享框要等批注约 120ms 的 settle）。若共享框在 **300ms** 宽限内没出现（例如跨消息选区被上游拒绝），标记释放，独立按钮回来，引用照旧可用。 |
| 不搬 DOM | 没有任何节点的重新父级化或移动，没有容器、没有定位接管、没有帧调度。（`test/contract.test.mjs` 断言 glue 里不存在 `insertBefore` / `appendChild(quote…)`。） |
| **只在聊天里** | 构建期补丁重写 annotation 的 `annotationRootOf`：**文件正文路径直接关掉**，且 `[data-slot="sidebar"]` 子树（右侧栏整列）一律拒绝。上游本来**同时**服务会话行和宿主文本预览（`DOCUMENT_TEXT` + `[data-textpreview-url]`），合并包只保留前者——所以文件里选文字不再弹框，右侧栏里的聊天行也不弹。 |

## 侧边对话动作（与 `dsh-better-sidebar` 的对接）

「侧边对话」是 `dsh-better-sidebar` 的功能，本包**不改它**，只走它自己的既有入口：

| 步骤 | 用的东西 | 为什么是它 |
|---|---|---|
| 建线程 | `POST sidebar/api/sidechat.start`，body `{ sessionId, question: '' }` | 侧边线程没有对外的消费者 API；这条路由就是那个插件的 tab 视图建线程用的。`question` 为空＝它自己的 Codex 式**空线程**：上下文快照挂在待发状态、输入框拥有第一条消息——所以**这一下不发消息、不计费**。 |
| 让 tab 显示这条线程 | 写 `localStorage['dsh-sidebar:v1:sidechat-thread'][sessionId] = childId`，**然后**再开 tab | 那个插件的 `createTab` 不接收 seed；tab 挂载时会"回到本会话上一条线程"。先写后开，tab 才不会又建一条空线程。 |
| 开 tab | `ctx.get('betterSidebar').openTab({ type: 'sidechat' }, { sessionId })` | 这是那个插件 README 里公开给其他插件的扩展服务（`registerTab` / `openTab`），不是内部实现。 |
| 放进文字 | 把选中文字**原样**写进该 tab 的 `<textarea>`：走**原型链的 `value` setter** + 派发 `input` | 它是 React 18 受控输入框，元素上装了自己的 `value` 访问器，直接赋值会被下一次渲染抹掉。所以：**写入**必须经由原型链上的 setter，**定位**则按结构——`textarea` 所在的容器里必须在两层内存在发送按钮（`title="发送"` / `"Send"`，那个插件自己的本地化文案）；多个候选时取离按钮最近的那个。不依赖会随重建变化的哈希类名，也不会跨容器误抓别的输入框。 |

**降级与边界**（都有测试）：

- `dsh-better-sidebar` 不存在 → 动作**不发布**，框里仍是「批注 + 引用」两个按钮。服务在**每次渲染**时重查，所以它之后才挂载也能被接上（也正因如此它不进 `inject` 列表：那会让整个 fiber 等待一个可选邻居）。
- 主会话**没有在运行**时那条路由会拒绝（409）：不会开 tab，界面给出**带原因的提示**，并记进诊断。
- 路由取不到、答案不是 JSON、`childId` 缺失 → 一律**不写存储、不开 tab**，提示失败原因。
- 选中文字超过 **4000 个码点**会截断（尾部加 `…`）：输入框不该被整个文档灌满。
- 输入框 4 秒内没出现（例如右侧底部工作台没展开）→ 明确提示『文字没有放进去，请先展开工作台再按一次』，**不会假装成功**。
- 输入框里已有草稿时**追加**，不覆盖。
- 线程建好但 tab 打不开 → 提示"线程已建好、tab 没打开"：它仍能从工作台的线程菜单里找到。
- 一次写入在途中再按一次不会叠加；失败提示 8 秒后自行消失。
- **这是本包唯一的网络请求**，只打到上面那条同源路由；没有文件写入，没有主机权限。

## 版本沿革

| 版本 | 做法 | 结果 |
|---|---|---|
| 0.2.0 | DOM 适配层：把两个插件各自的悬浮按钮搬进一个容器 | 依赖两个插件都启用 |
| 1.0.0 | 内联合并 + 归位层（仍是"搬 DOM"） | 自包含，但仍受 DOM 搬运与调度影响 |
| 1.1.0 | **一个悬停框 + 补丁注入第二个动作** | 无搬运、无容器、无调度器，改动面最小 |
| 1.2.x | 立即出框、引用点完收框、`ctx.effect` 与热插拔修复 | 与选区同时出现，不再残留框 |
| 1.3.x | 拖拽感知绘制、事件驱动标记、可观测的自我修复 | 拖选不闪，空闲 ~18 次 DOM 查询/秒 |
| 1.4.x | 第三个动作：侧边对话（对接 `dsh-better-sidebar`，选中文字**直接发出**） | 一个框三个动作；但点一下就替你付了一次上下文注入 |
| 1.5.x | 第三个动作改为**侧边引用**：建**空线程** + 把选中文字作为引用块写进它的输入框 | 点按钮**零 token**；发不发由你决定 |
| 1.6.0 | 引用块去掉：选中文字**原样**（纯文本）放进那个输入框 | 读起来就是你粘进去的，随手可改 |
| 1.6.1 | 修好输入框定位（此前四条规则全错；见 CHANGELOG） | 真的能写进去了；并补上针对真实嵌套与干扰输入框的回归测试 |
| 1.6.2 | 按钮文案定为「侧边对话」（中英同名不同字） | 一个框三个动作，名字最短 |
| **1.6.3**（当前） | **范围收紧到对话**：关掉文件正文路径，拒绝整个右侧栏 | 文件里 / 侧边栏里选文字不再弹框；根因是我自己漏掉的门（见 CHANGELOG） |

## 安装 / 升级

装好后在插件面板里显示为 **Selection Toolbar**。三种来源，按推荐顺序：

```sh
# ① 推荐：直接给 GitHub 仓库 URL（跟随 main）
dsh plugin --profile desktop add "github:jabingu/dsh-selection-group"

# ② 钉住版本：GitHub Release 的 tarball 直链（v1.6.4 起提供）
dsh plugin --profile desktop add \
  "https://github.com/jabingu/dsh-selection-group/releases/download/v1.6.4/dsh-selection-group-1.6.4.tgz"

# ③ 开发用：clone 后按本地路径装（改代码立即生效）
git clone https://github.com/jabingu/dsh-selection-group.git
dsh plugin --profile desktop add "link:$PWD/dsh-selection-group"
```

`dsh` 不在 PATH 里时用全路径：
`"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh"`。

| | ① `github:` 仓库 | ② Release tarball | ③ clone + `link:` |
|---|---|---|---|
| 拿到什么 | 仓库快照，**含已构建的 `client.js`** | 构建好的发布物 | 你的工作副本 |
| 版本 | 跟随默认分支当时的 HEAD | 钉死在标签版本 | 本地怎么改就怎么算 |
| 能自证 | ✅ | ✅ | ✅ |
| 能改代码 | ❌ | ❌ | ✅ |
| 升级 | 重跑 `add` | 换新版本 URL | `git pull` |

三种来源都**自带全部构建输入**（`src/`、`vendor/`、`patches/`、`scripts/`、`test/`），装完可以在包目录里自查：

```sh
node scripts/build.mjs --check    # client.js 是否与 vendor/ + src/ 一致（只校验、不重写）
node --test test/*.test.mjs       # 69 项：含 vendor sha256 校验与"每条补丁是否落进产物"的断言
```

> **没有 npm 包**：这个插件**不通过 npm registry 分发**（它不是靠 `prepare` 脚本在安装时构建的，
> 直接发 npm 还需要额外处理构建产物）。上面三种来源交付的都是同一份、可自证的产物。

### 装完必做

1. **完全退出 DeepSeek Harness（`Cmd+Q`）再打开**——客户端 bundle 是启动时装配的，不重启不会生效。
2. `dsh-quote-followup`、`@changfenhuang/dsh-annotation` **继续保持停用或直接卸载**。⚠️ 不要重新启用：内联副本与上游使用相同的元素 id（`dsh-quote-followup-btn`），同时存在会互相抢 DOM。

## 结构

| 路径 | 说明 |
|---|---|
| `client.js` | **生成物，勿手改**。由 `scripts/build.mjs` 从下面几份输入生成 |
| `vendor/dsh-annotation.client.js` | `@changfenhuang/dsh-annotation` v1.4.11 浏览器半区，**逐字**拷贝（MIT） |
| `vendor/dsh-quote-followup.client.js` | `dsh-quote-followup` v0.2.10 浏览器半区，**逐字**拷贝（MIT） |
| `vendor/manifest.json` | 两个 vendor 文件的版本、许可与 **sha256**（构建时强校验） |
| `patches/*.json` | 对上游的**有意偏离**（见下），构建时套用；`vendor/` 仍与上游逐字节一致 |
| `src/toolbar.js` | 本项目唯一自研部分：发布动作 hook（含「侧边对话」的建线程/开 tab/写输入框）、条件隐藏独立按钮、诊断 |
| `scripts/build.mjs` | 合并构建：套补丁 → 剥离 `__ModuleLoader__` 包装 → 内联工厂体 → 拼接 glue |
| `lib/index.js` / `cordis.patch.yml` | Node 半区空实现 / bundle patch |
| `icon.svg` + `locale/{en,zh}.json` | 插件面板显示用的图标与**本地化名称/简介**（`meta.title` / `meta.description`；`en.json` 是读取器要求的锚点，`exports` 里必须导出 `./locale/*.json` 才解析得到） |
| `THIRD_PARTY_NOTICES.md` | 第三方许可与偏离清单 |

## 对上游的有意偏离

`patches/` 里每条都写了 `why`。`test/vendor.test.mjs` 断言：锚点在上游文件里**恰好命中一次**、替换文本尚未存在于上游、**确实进入产物**，且产物里不再残留上游原文。

| 补丁 | 上游 | 现在 | 为什么 |
|---|---|---|---|
| `chat-only-root`（annotation） | 既服务**助手消息**里的选区，**也服务文件正文**（宿主文本预览 `DOCUMENT_TEXT` + `[data-textpreview-url]`），且文件路径优先 | **只**服务对话行（任意行类型：用户 / steering / 工具步），且拒绝整个 `[data-slot="sidebar"]` 子树；跨多条消息仍拒绝 | ①合并包**只在聊天里生效**——文件内容归 `dsh-better-sidebar` 自己的「添加到对话」；②让注入的动作对**同一个选区**都可用；③右侧栏（含侧边对话视图）里的聊天行也不该弹这个框 |
| `immediate-toolbar`（annotation） | 工具条要等 settle 之后才画出来 | **在 `selectionchange` 当回合就画**；拖拽中只更新位置、不重建；settle 只再校验并用最终摘录重绘一次 | 让「批注 + 引用」随选区**立即**出现，而不是延迟 120ms；错位的框还会在拖拽中闪烁 |
| `hold-while-dragging`（annotation） | settle 可能在**拖拽途中**触发并画框 | 指针按下期间不画 | 每帧 `selectionchange` + 跨消息边界会收框，于是闪烁；等松手再画 |
| `resync-excerpt-on-click`（annotation） | `enterEditing` 用 settle 时存下的摘录 | 点击时**从实时选区重取**摘录 | 框出得比 settle 早，否则拖选刚结束就点「批注」会批到旧文本 |
| `expose-close-hook`（annotation） | 收框函数 `closeToolbar` 是内部闭包 | 把它发布成 `window.__DSH_SELECTION_GROUP_CLOSE__` | 让「引用」点完也收框（点「批注」会切到编辑卡片所以框本就消失；而选区被清空时它**不会**自动收框） |
| `bar-extra-actions`（annotation） | 工具条只有一个「批注」按钮 | 额外渲染 glue 注入的动作按钮（带 `data-dsh-selection-group-action`），整段包在 `try/catch` 里 | 这就是"合并"本身；一个动作渲染失败不该带走整条工具条 |
| `mousedown-tolerates-merged-trigger`（quote） | 指针按在非本按钮上就丢弃待引用摘录 | 容忍标记为 `data-dsh-selection-group-action` 的按钮 | 否则按下注入的「引用」按钮会在 click 之前清掉摘录 |
| `fail-loud-without-excerpt`（quote） | 没有待引用摘录时点击**静默返回** | 显示它自己的"插入失败"提示 | 按下不能无声失败；glue 也借此判断该不该把框留着让你重试 |
| `keep-excerpt-across-scroll`（quote） | 任何滚动都丢弃待引用摘录 | 合并工具条接管期间（标记在）不丢 | 流式输出会自动滚动，一滚就丢 → 按「引用」得到"摘录已保留，请选中原文重试" |
| `keep-excerpt-while-toolbar-holds`（quote） | 选区解析不出来（文本空 / 矩形测不到）就丢弃摘录 | 合并工具条接管期间不丢 | 流式输出时聊天区重渲染就会这样，而批注的框此时**不会关**，于是「引用」失败 |

## 行为与边界

- **生效范围＝对话消息**：框只在 `[data-slot="conversation.session"]` 里、且不在 `[data-slot="sidebar"]` 子树内时出现。因此：侧边栏打开的文件、右侧栏里的聊天视图、文件树、终端、任务面板——都不会弹框。
- **引用走的是上游路径**：点击注入按钮 → 触发 quote 自己的按钮 click → 它经官方 session facade 做原生 chip 插入（`conversation.input.for(scope).insertReference`），失败时仍弹它自己的提示。
- **改动面最小**：除"隐藏独立按钮"这一条 CSS 和上述 9 处补丁外，两个插件的代码与行为不变。
- **不依赖 `requestAnimationFrame`**：批注用 rAF 做标记重排/卡片定位/发送后聚焦；本包启动时探测 rAF 是否真的触发，若证实不触发（某些 Electron 视图会如此）就给整页垫一个定时器实现，记入诊断 `rafShimmed`。
- **已知行为**：点「批注」→ 框换成编辑卡片；点「引用」→ 引用插入输入框后**框同样收起**（两者行为一致）。选区消失或点框外时整框收起，独立按钮随之恢复。
- **失败不静默**：若引用没能插入（没有输入框、输入框被锁、摘录确实已经失效），上游插件会**弹出原因提示**，且**框保持打开**让你重新选择重试——不会出现"点了没反应、框还消失了"。
- **框在屏上时摘录不会莫名丢失**：上游在"选区失效"（文本变空、矩形测不到 —— 流式输出时聊天区重渲染就会这样）或"任何滚动"时会丢弃待引用摘录，而批注的框此时**不会关**，于是你按「引用」就会撞上"摘录已保留，请选中原文重试"。本包打了补丁：**只要合并工具条还在接管（标记在），上述两种情形都不丢弃摘录**；Escape、点框外、独立模式下的滚动仍按上游语义处理。
- **编辑卡片期间也隐藏独立按钮**：批注的框换成编辑卡片后，独立「引用」按钮不再冒出来压住卡片。
- **侧边对话是唯一会发请求的动作**：点它才 `POST` 一次同源的 `sidebar/api/sidechat.start`（建空线程），失败会在界面给出原因提示（见上节）。**它不发送任何消息**，所以按它不花 token。
- **开销**：工具栏是**事件驱动**的——`selectionchange` 当回合打标记，`MutationObserver`（body / head / annotation host，childList）跟随框与编辑卡片的出现与消失，宽限期用一次性 timeout，1 秒的定时器只做兜底（自愈 + 采样）。实测**完全空闲**时：诊断全量期间 ~18 次 DOM 查询/秒（原来是 ~110），**过期/关闭后 ~8 次/秒且零写盘**。若还想更省，把 `TICK_MS`/`SAMPLE_MS` 调大即可。
- **更新日志**：见 [CHANGELOG.md](CHANGELOG.md)。
- **显示时机**：**按住鼠标期间不出框**（拖拽每一帧都会触发 `selectionchange`，且跨消息边界那一帧上游会收框，于是会闪），**松开鼠标的那一回合立刻出框**——`pointerup` 会补发一次 `selectionchange`，所以既没有闪烁，也不用等上游的 120ms settle。**按住期间独立「引用」按钮同样保持隐藏**：共享框既然要等松手，宽限期就不能成为它的理由，否则你按住停顿超过 300ms 就会看到那颗孤立的引用按钮。非拖拽路径（双击选词、键盘选择、程序化选择）依旧**当回合**出框。
- **没有**任何文件写入或主机权限。网络请求只有上面那一条（且只在按「侧边对话」时发生）。

## 排障（自证诊断，不用开控制台）

**诊断默认只跑 3 分钟。** 它们会包装 `console.warn/error`、监听 window 错误并每秒采样，对排查刚启动时的问题很值；长期挂在别人的页面上则不合适。

| 想要 | 做法（在插件加载前设置） |
|---|---|
| 一直开着 | `window.__DSH_SELECTION_GROUP_DIAGNOSTICS__ = true` |
| 完全关掉（不挂钩子、不写盘、不采样） | `window.__DSH_SELECTION_GROUP_DIAGNOSTICS__ = false` |
| 改过期时长（毫秒） | `window.__DSH_SELECTION_GROUP_DIAGNOSTICS_TTL_MS__ = 600000` |
| 改等侧边对话输入框出现的时长（毫秒，默认 4000） | `window.__DSH_SELECTION_GROUP_SIDECHAT_POLL_MS__ = 1000` |

过期（或关闭）时：console 与错误监听被**还原**、采样与写盘停止，并**写入最后一份快照**（含 `diagnosticsMode: "expired"`、`diagnosticsExpiredAt`）；`window.__DSH_SELECTION_GROUP__` 里那些**事件驱动的轻量字段**（`applied` / `barUp` / `cardUp` / `quoteButtonHidden` / `diagnosticsMode`）继续可用。工具栏功能不受影响——标记、观察者、动作 hook、拖拽跟踪，以及 rAF 兜底垫片（那是正确性修复，不是诊断）都不随开关关闭。

实测空闲开销：全量运行时 ~18 次 DOM 查询/秒（有写盘）；**过期或关闭后 ~8 次/秒、零写盘**（剩下的是标记与自愈的功能下限，1 秒一次）。

诊断同时挂在 `window.__DSH_SELECTION_GROUP__` 并**写进 `localStorage['dsh-selection-group.diagnostics']`**（Electron 把它落在磁盘上，可直接读）：

`applied / mountedAt / tick / barUp / cardUp / extraButtons / actionsInstalled / quoteButtonHidden / stylePresent / hookPresent / selection{state,rowKind,rowTurn,inTranscript} / sidechatEnabled / sidechatService / sidechatLast / sidechatLastThread / sidechatLastError / consoleTail / lastWindowError / lastError / visibility / docHidden / rafFired / rafShimmed / topLevel / href / frames / transcripts / flowRows / turnRows / context / vendoredMount / disposedAt`

| 症状 | 先看 |
|---|---|
| 一个框都不出现 | `vendoredMount.annotation` 是否 `mounted (with disposer)`；`consoleTail` / `lastWindowError` |
| 框出现但只有一个按钮 | `extraButtons` 是否为 **2**（引用 + 侧边对话；只有 1 说明 `sidechatEnabled` 为 false，即没装/没启用 `dsh-better-sidebar`）；`actionsInstalled`；`consoleTail` 里是否有 `[annotation] …` |
| 有「侧边对话」但文字没进输入框 | `sidechatLast`（`inserted` / `no-composer` / `no-session` / `failed`）、`sidechatLastError`、`sidechatLastThread`；`sidechatService` 是 `missing` 还是版本号。判定 `no-composer` 时，先看**底部工作台是否展开**（tab 存在但视图没挂载时没有输入框） |
| 两个框同时出现 | `barUp` / `cardUp` / `quoteButtonHidden`（选中同回合打标记，MutationObserver 跟随框的出现/消失）；`stylePresent` / `hookPresent` |
| 批注不出 | `selection.rowKind` / `inTranscript`；`transcripts` 是否 > 0（确认插件与 UI 在同一文档） |

开发者工具在这个应用里是 **F12**（Mac 上若被系统占用用 `Fn+F12`）。

## 开发与测试

```sh
npm install                     # 只有一个开发依赖：jsdom
npm run build                   # 重新生成 client.js
npm test                        # 69 项
```

| 测试文件 | 覆盖 |
|---|---|
| `test/toolbar.test.mjs`（51） | 动作 hook 与条件隐藏；**一个框里三个按钮**；**点击「引用」真的走通 quote 的原生插入**（断言官方 facade 收到一次 `insertReference` 且带选中文字）；**点击「侧边对话」真的建空线程并把选中文字原样写进那个 tab 的输入框**（断言 `question` 为空、URL/body、`openTab` 的 seed 与 scope、线程 id 落盘顺序、写入的就是原文、已有草稿则追加、React 受控路径，以及**选中文字绝不上线**），加上**真实嵌套**（按钮在 bar 里、且同页更早处有无关编辑器 textarea）与**没有发送按钮**时绝不猜输入框两条定位回归、邻居服务缺失 / 延后注册、路由拒绝 / 网络失败 / 非 JSON 答案 / tab 打不开 / 输入框不出现、超长截断；有框时隐藏 / 无框时恢复；用户消息里也成立；rAF 垫片；拖拽门控；热插拔；诊断的三种模式（默认过期 / 强制开启 / 完全关闭）与镜像快照 |
| `test/integration.test.mjs`（3） | 真实挂载合并 bundle：两个内联插件都创建 UI、glue 发布动作、**不移动任何 DOM**、无运行期上游引用 |
| `test/vendor.test.mjs`（6） | vendor 哈希/许可、内联体 = vendor + 已声明补丁、每处偏离的锚点/理由/是否落盘、无上游引用、构建可复现 |
| `test/manifest.test.mjs`（5）+ `test/contract.test.mjs`（4） | 包形状、面板本地化元数据、内联代码/glue 的 DOM 契约，以及 **glue 常量声明的静态审计**（用到却没声明就报错——`SIDECHAT_DRAFT_POLL_MS` 曾漏声明） |

## 更新上游版本

1. 新版 `client.js` 放进 `vendor/`，同步更新同名 `LICENSE.*`。
2. 更新 `vendor/manifest.json` 的 `version` 与 `sha256`（`shasum -a 256 vendor/<file>`）。
3. `node scripts/build.mjs` —— 若上游动过被补丁锚定的代码，这一步会**直接报错**并指出是哪个补丁，照 `patches/*.json` 的新上下文改锚点。
4. `node --test test/*.test.mjs`。
