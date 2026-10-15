<!-- SPDX-FileCopyrightText: 2026 北京京微资易科技有限公司 and AI WorkDeck contributors -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# AI WorkDeck Official Plugins：Agent 入口

开始工作前先读根目录 `CLAUDE.md` 与 `docs/ARCHITECTURE.md`。

1. **强制 SPDX 头**：所有新增源码文件（`.java`/`.js`/`.mjs`/`.css`/`.html`/`.sh`）必须包含两行标准 SPDX 头，提交前运行 `npm run check:spdx`。
2. **双主题语义变量**：所有插件 UI 必须从第一天起使用 `var(--awd-surface)`、`var(--awd-text)`、`var(--awd-border)`、`var(--awd-accent)` 等语义变量，支持亮色/暗色双主题。
3. **沙箱安全边界**：插件页面运行在 `sandbox="allow-scripts allow-forms"` 的 opaque origin iframe 中，所有宿主能力必须经 `awd-plugin-sdk.js` 的 `postMessage` 桥调用，严禁直接访问父窗口 DOM 或 `localStorage`。
