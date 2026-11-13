# Selection Toolbar

[简体中文](./README.md) · **English**

Select conversation text to annotate, quote or place it in a side chat.

A selection toolbar plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Single-message and cross-message selections share one toolbar with Annotate, Quote and Side chat actions. No standalone quote popup is created.

| Item | Current version / requirement |
| --- | --- |
| Plugin | `1.6.6` (package: `dsh-selection-group`) |
| DSH | `>=0.2.0-rc.2 <0.2.3-0` |
| License | [MIT](./LICENSE) |

## Features

- **Annotate**: add notes to selected text and send them with your next message. Pending annotations appear in a reserved row on the left of the input area.
- **Quote**: insert the excerpt into the current composer as a native quote when available. Older DSH versions use the plugin’s fallback.
- To use **Side chat**, first install and enable `dsh-better-sidebar` in DSH. The button creates an empty thread and places the excerpt in its draft for you to edit and send. Excerpts are limited to 4,000 characters.
- Select across messages within one main conversation, including across copy and status controls.
- The toolbar appears on pointer release or immediately for keyboard selections. Cancelling dismisses it; streaming rerenders preserve the original excerpt for recovery.
- Sidebars, file previews, inputs and editable areas do not show the toolbar. Text selected directly inside buttons is excluded.

Annotation and quote are bundled. Do not also enable independent instances of `@changfenhuang/dsh-annotation` or `dsh-quote-followup`, which can create duplicate UI or compete for state.

## Demo

![Selection Toolbar: a cross-message selection with Annotate, Quote and Side chat actions](https://github.com/jabingu/dsh-selection-group/releases/download/v1.6.5/selection-toolbar-demo-v1.6.5.png)

Captured from a simulated conversation page running the actual v1.6.5 plugin client.

## Quote settings

**Disable DSH built-in quote** is on by default. The plugin hides the native “Quote text” action when you select text. The plugin’s quote action and existing quotes in messages remain available.

To restore the native action, turn off the switch in **Plugins → Selection Toolbar → Quote settings**. The client remembers your choice after reloading. Disabling the plugin also restores the native action.

## Install

### From GitHub

1. Open DSH's **Plugins** page and check whether `dsh-selection-group` is already installed. If so, use the update action rather than adding it again.
2. Click **Add plugin** and enter this repository address:

   ```text
   https://github.com/jabingu/dsh-selection-group
   ```

3. Follow the app's instructions to load and enable the plugin, then restart DSH.
4. Select text in a main conversation and release the pointer to check the toolbar.

The repository includes built `lib/` and `client.js` files, so no local build is needed to install. Distribution is through GitHub, not the npm registry.

### From a local directory

Download and extract the repository ZIP, or clone it. After checking that the plugin is not installed, use the same plugin page to add the absolute path of the directory containing `package.json`, then enable it and restart DSH.

Use a local directory to verify unpublished working-copy changes. Update files in a linked directory and restart DSH; reinstalling is unnecessary. GitHub installations receive changes once the corresponding repository version is updated.

The desktop app manages its own profile; use its plugin page. If you use `dsh web`, run from the plugin directory:

```powershell
dsh plugin --profile web list --depth=0
# Add only after confirming it is not installed:
dsh plugin --profile web add .
```

## Example

Select this text in an assistant reply:

> A plugin is an additional program that gives existing software a new capability.

Release the pointer and choose an action in the same toolbar:

- **Annotate**: write “Give a more concrete example,” save it and send it with your next message.
- **Quote**: insert the excerpt into the current composer and add a follow-up question.
- **Side chat**: place the excerpt in a new thread's draft, add a question and send it yourself.

The same actions work for selections spanning user and assistant messages.

## Development and verification

Use Node.js 22.19.0 or later within 22.x, or Node.js 24 or later, and run from the project directory:

```powershell
npm install
npm run build
npm test
```

The **138 automated tests** cover quote preferences, cross-message selections, annotation layout, cancellation and streaming recovery, side-chat ownership, and plugin lifecycle. Chrome fixtures also cover annotation layout in normal and narrow windows and with a message queue.

`client.js` is generated from `src/`, `vendor/` and `patches/`; do not edit it by hand. `npm test` checks bundle consistency before running tests.

Diagnostics: `window.__DSH_SELECTION_GROUP__`. See [third-party notices](./THIRD_PARTY_NOTICES.md) for build patches and compatibility details, and [CHANGELOG](./CHANGELOG.md) for changes.

## License

[MIT](./LICENSE). See [third-party notices](./THIRD_PARTY_NOTICES.md) for bundled upstream licenses.
