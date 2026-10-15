<!-- SPDX-FileCopyrightText: 2026 北京京微资易科技有限公司 and AI WorkDeck contributors -->
<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# AI WorkDeck 插件体系顶级架构蓝图

## 1. 背景与痛点诊断

随着 AI WorkDeck 业务高速演进，主仓 `AI-WorkDeck/aiworkdeck` 同时承载了：
1. **核心工作台宿主（Core Workbench Host）**：三栏编辑器（LOWA LibreOffice WASM / Docx / PDF）、Agent 编排引擎、账户与安全体系；
2. **第二代沙箱官方插件（Gen-2 Sandbox Plugins）**：腾讯会议（`tencent-meeting`）、项目沟通 IM（`project-im`）、包晴天（`baoqingtian`）、律所管理（`lawfirm-management`）；
3. **第一代内置业务面板（Gen-1 Legacy Built-in Panels）**：诉讼可视化（`litigation-visual`）、文档脱敏（`desensitize`）、语音工作台（`voice-suite`：语音转文字/文字转语音/录音纪要）、办案日历（`calendar`）。

如果继续把所有垂直业务插件与核心宿主耦合在同一个仓库中，会导致：
- **构建与 CI 爆炸**：修改一行插件 CSS 或提示词，触发宿主全量后端 + 桌面端构建；
- **边界腐化（Boundary Erosion）**：内置面板容易绕过插件权限模型直接引用宿主内部组件或状态；
- **发版周期锁死**：官方插件的热更新与独立迭代被桌面客户端发版周期绑定。

---

## 2. 顶级架构师的三层解耦方案

对标 **VS Code**（核心 `microsoft/vscode` vs 官方插件仓）、**Obsidian** 与 **Backstage**，我们将体系划分为清晰的三个层次：

| 层级 | 仓库 / 模块 | 核心职责 | 稳定性与发版节奏 |
| :--- | :--- | :--- | :--- |
| **L1 微内核宿主层** | `AI-WorkDeck/aiworkdeck` | 提供三栏容器、左栏插件坞、插件广场安装器、`postMessage` 安全桥、`URLClassLoader` Java SPI 沙箱、`--awd-*` 主题引擎 | 稳健演进，随桌面端/云端版本发布 |
| **L2 契约与 SDK 层** | `sdk/plugin-api` (Java)<br>`sdk/plugin-sdk` (JS) | 定义宿主与插件之间的唯一合法通信契约（`awd` 协议 `v1` / SDK `1.6.0` / Maven `com.checkba:plugin-api:1.0.0`） | 严格向下兼容（Additive-Only） |
| **L3 官方插件单仓** | `AI-WorkDeck/aiworkdeck-official-plugins` | 集中承载全部 8 款官方插件的 Web 面板、Java SPI 扩展与 AI Skill，独立构建出确定性 `.zip` 与 `catalog.json` | 敏捷独立发布，支持随包内置（Bundled）与广场按需下载（Marketplace） |

---

## 3. 存量内置功能的「绞杀者模式（Strangler Fig）」平滑演进路线

针对此前半内置于主仓的 4 个能力（诉讼可视化、脱敏、语音套件、日历），采用三阶段无损迁移：

1. **Phase 1（已完成）—— 标准沙箱插件化与独立建仓**：
   - 在 `AI-WorkDeck/aiworkdeck-official-plugins` 中将 `litigation-visual`、`desensitize`、`voice-suite`、`calendar` 完整封装为标准插件结构（`manifest.json` + `web/` + `skill/` + `tests/`），并在 `awd-plugin-sdk.js` (`v1.6.0`) 中标准化 `awd.litviz`、`awd.desensitize`、`awd.voice`、`awd.calendar` 桥接命名空间。
2. **Phase 2 —— 宿主桥接转发与制品拉取（Artifact Consumption）**：
   - 主仓通过 `scripts/sync-to-host.sh` 或 Release `catalog.json` 消费本仓构建好的确定性 `.zip` 插件包，不再在主仓维护重复的插件构建逻辑。
3. **Phase 3 —— 宿主内置旧面板退役**：
   - 待存量桌面客户端全部升级至支持 `v1.6.0` 桥接协议后，移除主仓 `frontend/src/components/` 中历史遗留的紧耦合 Vue 面板，实现 100% 纯净微内核宿主。
