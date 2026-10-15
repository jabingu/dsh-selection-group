# Selection Toolbar

**简体中文** · [English](./README.en.md)

选中对话文字，批注、引用或放入侧边对话。

一个为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 提供选区工具条的插件。单条消息和跨消息选区共用一个工具条，包含「批注 / 引用 / 侧边对话」，不再创建独立引用浮窗。

| 项目 | 当前版本 / 要求 |
| --- | --- |
| 插件 | `1.6.5`（包名：`dsh-selection-group`） |
| DSH | `>=0.2.0-rc.2` |
| 许可证 | [MIT](./LICENSE) |

## 功能

- **批注**：为选中文字添加备注，随下一条消息发送。待发送批注入口位于输入区左侧的预留行。
- **引用**：把摘录插入当前输入框，优先使用原生引用，不支持时使用文本引用。
- **侧边对话**：创建空线程，把摘录放入新线程草稿，编辑后自行发送。需要 `dsh-better-sidebar`，未启用时不显示该按钮；摘录超过 4000 个字符时截断。
- 支持同一主会话内跨消息选择，包括跨过复制、状态按钮的选区。
- 鼠标松开后显示工具条；键盘选区立即显示。取消选区时关闭，流式重渲染导致选区丢失时保留原始摘录。
- 侧边栏、文件预览、输入框和编辑区不弹框；直接选择按钮文字也不处理。

批注和引用功能已内置，无需另装上游插件。请勿同时启用 `@changfenhuang/dsh-annotation` 或 `dsh-quote-followup` 的独立实例，以免重复显示或争用状态。

## 演示

![Selection Toolbar：跨消息选区与批注、引用、侧边对话三个动作](https://github.com/jabingu/dsh-selection-group/releases/download/v1.6.5/selection-toolbar-demo-v1.6.5.png)

这张图来自加载真实 v1.6.5 插件客户端的模拟对话页面。

## 安装

### 从 GitHub 安装

1. 打开 DSH 的 **插件** 页面，先检查是否已安装 `dsh-selection-group`。已安装时使用更新入口，避免重复添加。
2. 点击 **添加插件**，在“包名或地址”中填写：

   ```text
   https://github.com/jabingu/dsh-selection-group
   ```

3. 按应用提示完成加载并启用，重启 DSH。
4. 在主对话中选中文字，松开鼠标，确认工具条出现。

仓库包含构建好的 `lib/` 和 `client.js`，安装前无需自行构建。本包通过 GitHub 分发，不通过 npm registry 发布。

### 从本地目录安装

下载仓库 ZIP 并解压，或克隆仓库。检查插件尚未安装后，在同一添加入口填写包含 `package.json` 的目录绝对路径，启用后重启 DSH。

验证尚未推送到仓库的修改时，请使用本地目录。更新已链接目录中的文件并重启 DSH 即可，无需重复安装；GitHub 来源需更新仓库对应版本后才能获得这些修改。

官方桌面 profile 由应用管理，请使用桌面插件页面。使用 `dsh web` 的用户可在插件目录执行：

```powershell
dsh plugin --profile web list --depth=0
# 确认尚未安装后再添加：
dsh plugin --profile web add .
```

## 使用示例

在助手回复中选中：

> 插件是一段可以插进现有软件里的附加程序，让软件多出一项功能。

松开鼠标后，在同一个工具条中选择：

- **批注**：写下“给一个更具体的例子”，保存后随下一条消息发送。
- **引用**：将这段文字放入当前输入框，再输入追问。
- **侧边对话**：将文字放入新线程草稿，补充问题后自行发送。

跨用户消息和助手回复选择时，操作方式相同。

## 开发与验证

使用 Node.js 22.19.0 或更新的 22.x，或 Node.js 24 及以上版本，在项目目录执行：

```powershell
npm install
npm run build
npm test
```

当前 **115 项自动化测试通过**，覆盖跨消息选区、批注首次显示与布局清理、取消与流式恢复、侧边线程归属和插件生命周期。批注布局另在模拟本机 DSH 贴底结构的 Chrome 测试页中检查了普通、窄窗口和队列场景；最新修改仍需在实际 DSH 中验证。

`client.js` 由 `src/`、`vendor/` 和 `patches/` 生成，请勿手动修改。`npm test` 会先检查构建产物与源码是否一致，再运行测试。

诊断入口：`window.__DSH_SELECTION_GROUP__`。构建补丁和兼容性说明见 [第三方声明](./THIRD_PARTY_NOTICES.md)，变更记录见 [CHANGELOG](./CHANGELOG.md)。

## 许可证

[MIT](./LICENSE)。内置上游代码的许可见 [第三方声明](./THIRD_PARTY_NOTICES.md)。
