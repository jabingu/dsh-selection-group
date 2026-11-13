---
version: alpha
name: "Selection Toolbar"
description: "DSH-native selection actions and plugin-detail preferences"
typography:
  body:
    fontFamily: "system-ui, sans-serif"
spacing:
  section: "16px"
  help-gap: "6px"
  status-gap: "10px"
components:
  native-quote-settings:
    typography: "{typography.body}"
omitted:
  - section: colors
    reason: "DSH semantic CSS tokens are canonical and supply light/dark colors."
  - section: rounded
    reason: "The existing DSH Switch owns its shape and interaction states."
---

# Selection Toolbar Design

## Overview

This is an existing DSH plugin, not a standalone settings application. The detail
page follows the host's plugin settings and enable-switch workflow. Audience:
DSH users working in Chinese or English. Other locales use the existing Chinese
fallback policy. No Japan-specific business or locale contract is introduced.

The user controls whether the native selection quote entry appears. The default
suppresses the keyed `conversation.chat.text-interaction` / `quote` renderer.
A saved choice overrides the default. Quote insertion and UserText quote display
remain owned by their existing services.

## Colors

Token ownership is Model B: DSH owns runtime semantic colors. The settings
section consumes `--dsw-alias-label-primary`, `--dsw-alias-label-secondary`, and
`--dsw-alias-state-error-primary`; it does not set a global palette or theme.

## Typography

The section inherits `--dsw-font-family` with the system sans-serif fallback.
Labels/headings use 14px; help and status use 12px. Chinese and English copy,
accessible names, and status messages change together with the host locale.

## Layout

DSH places bundle configuration below the description and above source information.
A flexible text column and the host Switch share a row. Help wraps at narrow
widths, and a status line reserves 1.5em.

## Elevation & Depth

The section adds no new surface, shadow, or floating window. Existing selection
toolbar and annotation-card elevation remains unchanged.

## Shapes

Use the DSH Switch from `@deepseek-ai/dsh-client-ui-primitives`. Its shape,
pointer, keyboard, focus-visible, and disabled states belong to the host.

## Components

The panel uses the DSH Switch and registers under the package name in
`plugins.bundle.config`. `src/settings.js` is the sole preference store and
native-seat adapter. Saves are synchronous and require no artificial spinner.
The label is “关闭 DSH 自带引用” / “Disable DSH built-in quote”.

Saving to localStorage succeeds before the visual state is committed. A failed
save retains the previous switch state and provides an inline alert; retrying is
allowed. Host registration failures roll back persistence. Cross-window changes
are observed. Turning the preference off, disabling the plugin, or hot replacing
the client releases owned registrations and restores the host renderer.

DSH’s `dsh-message-quotes` client registers the `quote` key in
`conversation.chat.text-interaction`. The Plugin Manager renders
`plugins.bundle.config` before its source information section.

Verification lives in `test/settings.test.mjs` and `test/toolbar.test.mjs`.

## Do's and Don'ts

- Keep native message rendering and other interaction keys available.
- Keep the default reversible and preserve the saved preference on unload.
- Do not hide all text interaction surfaces, patch host methods, mutate React
  internals, or overwrite DSH/plugin configuration files to disable this entry.
- Do not introduce a separate switch design or a duplicate global theme.
