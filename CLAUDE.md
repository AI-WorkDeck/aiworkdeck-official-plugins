<!-- SPDX-FileCopyrightText: 2026 北京京微资易科技有限公司 and AI WorkDeck contributors -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# AI WorkDeck Official Plugins — Agent 导航指南

本仓库是 `AI-WorkDeck/aiworkdeck` 的官方插件独立单仓（Monorepo）。

## 目录结构

- `sdk/plugin-api/`：Java 插件 SPI（`com.checkba:plugin-api:1.0.0`，零第三方依赖，`ToolProvider` / `PluginContext` / `ToolResult`）
- `sdk/plugin-sdk/awd-plugin-sdk.js`：前端沙箱 iframe 桥接 SDK（`v1.6.0`）
- `plugins/<plugin-id>/`：8 款官方插件独立目录，每个插件包含：
  - `manifest.json`：插件元数据、权限声明、`entry`、`skill`、`backendJars`
  - `web/`：运行在 `sandbox="allow-scripts allow-forms"` iframe 内的前端界面（必须使用 `--awd-*` 语义主题变量，禁止硬编码亮色背景）
  - `backend/`（可选）：Java SPI 实现，打包为无重型依赖的轻量 JAR
  - `skill/`（可选）：`skill.yml` + `prompt.md` AI 技能定义
  - `tests/*.mjs`：基于 `node:test` + `jsdom` 的沙箱单元测试
  - `build.sh`：单插件测试与确定性 `.zip` 打包脚本
- `scripts/build-all.sh`：全仓一键编译、测试、打包并生成 `dist/catalog.json` 与 `dist/SHA256SUMS`
- `scripts/check-spdx.mjs`：SPDX 许可证头门禁检查

## 常用验证命令

- 检查 SPDX 头：`npm run check:spdx`
- 运行全部插件单元测试：`npm test`
- 全量编译 + 测试 + 打包 8 款插件：`npm run verify`
