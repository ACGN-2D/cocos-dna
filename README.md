# cocos-dna

**Cocos Creator UI 设计规范技能** — 三阶段工作流将参考图转换为 Cocos Creator Prefab 和组件代码。

## 概述

cocos-dna 是一个 AI Agent 技能，用于将 UI 设计参考图转换为 Cocos Creator 可用的 Prefab、组件脚本和渲染器代码。

基于 [design-dna](https://github.com/zanwei/design-dna) 扩展，保留其 Phase 1（结构）和 Phase 2（分析），重写 Phase 3 为 **DNA 数据驱动转换方案** — 将 DNA JSON 映射为 Cocos Creator 原生组件，通过 MCP 工具自动生成 Prefab 文件和节点树。

**为什么不能直接用 design-dna 的 Phase 3**：design-dna 的 Phase 3 产出是自包含 HTML/CSS/JS（Web 前端），而 Cocos Creator 使用自有渲染管线（WebGL/Metal/Vulkan）、ECS-like 组件模型（`Node + Component`）、Asset Manager 资源系统，三者完全不同。因此 cocos-dna 替换 Phase 3 为 Cocos 原生组件映射 + MCP 驱动 Prefab 创建。

## 版本兼容性

| 引擎 | 支持版本 | 说明 |
|------|---------|------|
| **Cocos Creator** | **3.7+**（推荐 3.8 / 4.x） | 依赖 `cc.tween` 新 API、`Widget.AlignMode`、`Sprite.SizeMode.CUSTOM`、Prefab 嵌套序列化等 3.7+ 特性 |
| Node.js（工具脚本） | 16+ | 脚本使用 ES2020+ 语法 |

## 三阶段工作流

```
Phase 1: 结构          Phase 2: 分析          Phase 3: 生成（Cocos 转换）
 [design-dna]           [design-dna]            [cocos-dna 自有]
┌─────────────┐     ┌─────────────────┐     ┌──────────────────────────┐
│ 展示 Schema │ ──→ │ 从参考图提取    │ ──→ │ DNA → Cocos 组件映射     │
│ 三维度字段   │     │ Design DNA JSON │     │ → MCP 创建节点/Prefab    │
│ 问用户定制   │     │ 问用户调整      │     │ → 生成 View.generated.ts │
└─────────────┘     └─────────────────┘     └──────────────────────────┘
```

根据上下文判断从哪个阶段开始：
- **全新项目**：Phase 1 → 2 → 3（完整流程）
- **已有 DNA，新界面**：Phase 3（直接转换）
- **用户只想看 Schema**：仅 Phase 1

## 三层代码架构

所有页面统一使用 BaseView 三层架构：

| 层级 | 文件 | 职责 | 维护者 |
|------|------|------|--------|
| Layer 1 | `BaseView.ts` | 通用基类（状态机 + 资源管理 + Widget 工具） | skill 维护 |
| Layer 2 | `XxxView.generated.ts` | @property + assetManifest（可安全覆盖） | Codegen / AI |
| Layer 3 | `XxxPageView.ts` | 业务逻辑（永不覆盖） | 人工 |

## 产出物清单

| # | 产物 | 路径 | 说明 |
|---|------|------|------|
| 1 | Design DNA JSON | `cocos-dna/design-dna.json` | 全局设计 token SSOT |
| 2 | UI 结构协议文档 | `cocos-dna/components/<page>/design.md` | 9章 Markdown，页面设计数据唯一存储位置 |
| 3 | 资产绑定清单 | `cocos-dna/components/<page>/asset-manifest.json` | Sprite UUID 映射 |
| 4 | AI 绘图 Prompt | `cocos-dna/components/<page>/assets/art-prompts.md` | 美术资源生成指引 |
| 5a | AI 生成层 | `assets/scripts/views/<Page>View.generated.ts` | Layer 2：@property 声明 + assetManifest |
| 5b | 业务逻辑层 | `assets/scripts/views/<Page>PageView.ts` | Layer 3：业务逻辑（永不覆盖） |
| 6 | Prefab 文件 | `assets/resources/prefabs/pages/<Page>Page.prefab` | MCP / Offline 自动创建 |
| 7 | ThemeConfig 更新 | `assets/scripts/ui/themed-components/ThemeConfig.ts` | 全局 tokens 同步 |

## 资产同步与 Prefab 生成流水线

```
Phase 3 设计       美术资源生成         资产同步              Prefab 生成
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ design.md    │  │ AI 绘图/手工 │  │ resolve-asset-   │  │ design2prefab.js │
│ + asset-     │→ │ 放入 assets/ │→ │ uuids.js v2.0    │→ │ 读 design.md #4  │
│   manifest   │  │ 任意合理目录 │  │ Smart Discovery  │  │ + asset-manifest │
│ (预设路径)   │  │ .meta 自动生 │  │ 自动修正+填UUID  │  │ → MCP/Offline    │
└──────────────┘  └──────────────┘  └──────────────────┘  └──────────────────┘
```

## 可执行脚本

| 脚本 | 角色层 | 用途 | 调用方式 |
|------|--------|------|----------|
| `mcp-client.js` | 🔧 底层库 | MCP 通信层 — 场景/节点/组件/Prefab 操作 API | `require()` 内部调用 |
| `prefab-builder.js` | 🔧 底层库 | 离线 Prefab JSON 构建器（不需编辑器） | `require()` 内部调用 |
| `resolve-asset-uuids.js` | ⚙️ 数据同步 | v2.0 Smart Discovery 资产 UUID 解析 | `node scripts/resolve-asset-uuids.js --project <P> [--page <id>] [--check] [--verbose]` |
| `design2prefab.js` | ⚙️ 生成 | design.md #4 → NodeSpec → MCP/Offline Prefab | `node scripts/design2prefab.js --project <P> <page> [--dry-run\|--offline]` |
| `generate-view.js` | ⚙️ 生成 | asset-manifest → Layer 2 XxxView.generated.ts | `node scripts/generate-view.js <page> [--dry-run] [--out <dir>]` |
| `sync-runtime.js` | 🏗️ 基建 | Runtime 模板同步（templates/ → 项目 scripts/runtime/） | `node scripts/sync-runtime.js --project <P> --apply` |
| `ui-dev-workflow.js` | ✅ 验证 | V1-V4 验证引擎（设计文档/Prefab/代码/测试） | `node scripts/ui-dev-workflow.js --project <P> <ui-name>` |

### 典型工作流

```
=== Phase 3a（立即执行，无需美术资源/MCP）===
sync-runtime ─→ AI 写 design.md + manifest + art-prompts + 代码
                        ↓
              generate-view（骨架，manifest UUID=null）

=== Phase 3b（美术到位后，需要 MCP）===
              美术资源放入 assets/
                        ↓
              resolve-asset-uuids ─→ generate-view（刷新）─→ design2prefab（MCP）
                                                                   ↓
                                                           ui-dev-workflow
```

**常用场景**：
- **场景 A**：新建 UI 页面（Phase 3a → 等资源 → Phase 3b）
- **场景 B**：美术资源更新后刷新（resolve → generate → 可选 Prefab 重建）
- **场景 G**：框架升级后批量刷新（sync-runtime → resolve → generate-view all → 构建 → E2E）
- **场景 H**：资源到位 + Prefab 创建（= Phase 3b，resolve → generate → design2prefab → verify）

**关键规则**：
1. 底层库（mcp-client / prefab-builder）不手动调用，由 design2prefab 内部 require()
2. resolve 必须先于 generate/design2prefab — UUID 未填充就生成代码 = 资源绑定失败
3. ui-dev-workflow 放最后 — 它是验证全部产出物的最终关卡

## 文件结构

```
cocos-dna/
├── SKILL.md                              ← 主指令（核心工作流）
├── README.md                             ← 本文件
├── references/                           ← 按需加载的详细规范
│   ├── design-dna-schema.md              ← 三维度 JSON Schema（Phase 1/2）
│   ├── dna-cocos-mapping.md              ← DNA→Cocos 映射表 + MCP 流程 + 代码模板
│   ├── output-spec.md                    ← design.md 9章定义 + 动效接口 + 验证清单
│   ├── node-spec.md                      ← 节点命名规范、节点信息格式
│   ├── asset-binding.md                  ← 资产绑定协议、Smart Discovery 规范
│   ├── cocos-constraints.md              ← Cocos 技术栈禁止清单与约束
│   ├── validate-workflow.md              ← V1-V4 验证规范
│   └── runtime-integration.md            ← Runtime 集成规范（同步 + 改造指南）
├── templates/                            ← 通用代码模板（同步到项目）
│   └── runtime/                          ← Runtime 基础设施
│       ├── core/                         ← 核心模块
│       │   ├── ResourceManager.ts        ← 资源加载/缓存/分组释放
│       │   ├── LayerManager.ts           ← UI 层级管理（page/popup/effect/guide）
│       │   ├── EventBus.ts               ← 全局事件总线（发布/订阅）
│       │   ├── DebugLogger.ts            ← 调试日志工具（分级输出）
│       │   └── UIBinder.ts              ← 运行时节点绑定工具
│       ├── views/                        ← 视图模块
│       │   └── BaseView.ts              ← 视图 Component 基类
│       └── README.md                     ← 版本说明 + 变更日志
├── scripts/                              ← 可执行工具脚本
│   ├── mcp-client.js                     ← 通用 MCP 通信层
│   ├── prefab-builder.js                 ← 离线 Prefab JSON 构建器
│   ├── resolve-asset-uuids.js            ← 资产 UUID 解析（Smart Discovery）
│   ├── design2prefab.js                  ← design.md #4 → Prefab 生成
│   ├── generate-view.js                  ← asset-manifest → Layer 2 generated.ts
│   ├── ui-dev-workflow.js                ← V1-V4 验证引擎
│   └── sync-runtime.js                   ← Runtime 模板同步工具
└── examples/                             ← 格式模板
    ├── README.md
    └── _example-page/                    ← 完整页面目录结构示例
```

## Runtime 模板

cocos-dna 提供通用运行时基础设施模板，由 skill 统一维护，通过 `sync-runtime.js` 同步到项目。

| 模板 | 职责 |
|------|------|
| `ResourceManager.ts` | 统一资源加载/缓存/分组释放 |
| `LayerManager.ts` | UI 层级隔离：page / popup / effect / guide |
| `EventBus.ts` | 全局事件总线（on/off/emit/once + 单例） |
| `DebugLogger.ts` | 结构化调试日志（module/tag/level） |
| `UIBinder.ts` | 运行时节点绑定工具（@property 的动态 fallback） |
| `BaseView.ts` | 视图 Component 基类（三层架构核心） |

**什么放 skill，什么放项目**：
- 能直接在另一个 Cocos DNA 项目里用 → skill `templates/`
- 绑定项目视觉风格/游戏流/业务逻辑 → 项目 `assets/scripts/`

## MCP 策略：MCP-Only（无降级）

Prefab 必须通过 MCP 在 Cocos Creator 编辑器中创建。不支持降级模式。

| 情况 | 行为 |
|------|------|
| **MCP 正常** | design.md + View.generated.ts + PageView.ts + MCP 自动生成 Prefab |
| **MCP 不可用** | Phase 3a 产出物正常输出，Prefab 步骤暂停等待 MCP 恢复 |

`design2prefab.js --offline` 仅用于调试/预览节点树结构，不作为正式产出路径。

## 美术资源异步工作流

Phase 3 支持渐进式完成，不要求美术资源同步就位：

| 子阶段 | 时机 | 产出物 | 依赖 MCP |
|--------|------|--------|----------|
| **Phase 3a** | 立即 | design.md + asset-manifest(UUID=null) + art-prompts + 代码 | ❌ |
| **Phase 3b** | 美术到位后 | manifest(UUID填充) + View.generated.ts(刷新) + Prefab | ✅ |

## 核心特性

- **DNA 数据驱动** — 所有颜色、字号、间距、动画参数可追溯到 DNA JSON
- **MCP 自动创建** — 通过 Cocos MCP 工具自动创建节点树和 Prefab（正式产出路径）
- **Offline Prefab 预览** — 无需编辑器，生成 .prefab JSON 供调试检查节点结构
- **Smart Discovery** — 资产 UUID 自动解析，支持精确路径 → 文件名 → 模糊匹配三级策略
- **完整动效规范** — 支持粒子系统、持续动画、背景动效的完整定义
- **AI 绘图集成** — 自动生成美术资源的 AI 绘图 Prompt
- **双语支持** — 所有 Label 同时输出中英文
- **三层代码隔离** — BaseView → generated.ts → PageView.ts，AI 可安全覆盖中间层

## 依赖

cocos-dna 依赖 [design-dna](https://github.com/zanwei/design-dna) skill。请先安装：

```
https://github.com/zanwei/design-dna
```

## 触发词

- "解析这张图的 UI 结构"
- "为这个界面设计 Cocos 节点树"
- "生成 UI 设计规范 / design.md"
- "将 DNA 映射为 Cocos 组件"
- "用 MCP 生成 Prefab"
- "cocos-dna"
- "分析这张图的 UI"
- "生成 Prefab 结构"
- "DNA 转 Cocos"

## License

MIT
