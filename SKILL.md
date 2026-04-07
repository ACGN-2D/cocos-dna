---
name: cocos-dna
description: >-
  Cocos Creator UI 设计规范技能 — 三阶段工作流将参考图转换为 Cocos Creator Prefab 和组件代码。
  Phase 1/2 复用 design-dna skill（结构/分析），Phase 3 为 cocos-dna 核心：DNA→Cocos 组件映射→MCP 生成 Prefab。
  触发词："解析 UI"、"UI 结构"、"Cocos 节点树"、"界面设计"、"设计规范"、"cocos-dna"、
  "分析这张图的 UI"、"生成 Prefab 结构"、"UI 设计文档"、"DNA 转 Cocos"、"映射组件"。
  即使用户没有明确说 "cocos-dna"，只要涉及 Cocos Creator 的 UI 结构/设计分析/节点规划/Prefab 生成，都应触发此技能。
---

# cocos-dna — Cocos Creator UI 设计规范技能

## 来源与架构

基于 [design-dna](https://github.com/zanwei/design-dna) 扩展。Phase 1（结构）和 Phase 2（分析）完全复用 design-dna skill 原始实现，Phase 3 重写为 **DNA 数据驱动转换方案** — 将 DNA JSON 映射为 Cocos Creator 原生组件，通过 MCP 工具自动生成 Prefab。

**为什么不能直接用 design-dna 的 Phase 3**：design-dna 的 Phase 3 产出是自包含 HTML/CSS/JS（Web 前端），而 Cocos Creator 使用自有渲染管线（WebGL/Metal/Vulkan）、ECS-like 组件模型（`Node + Component`）、Asset Manager 资源系统，三者完全不同。因此 cocos-dna 替换 Phase 3 为 Cocos 原生组件映射 + MCP 驱动 Prefab 创建。

### 依赖

cocos-dna 依赖 design-dna skill。如未安装，引导用户安装：`https://github.com/zanwei/design-dna`

> **项目隔离原则**：本技能是通用规范，不包含任何特定项目的设计内容。所有项目特定的设计系统来自各项目自己的 `design-dna/design-dna.json`。

---

## 三阶段工作流

```
Phase 1: 结构          Phase 2: 分析          Phase 3: 生成（Cocos 转换）
 [design-dna]           [design-dna]            [cocos-dna 自有]
┌─────────────┐     ┌─────────────────┐     ┌──────────────────────────┐
│ 展示 Schema │ ──→ │ 从参考图提取    │ ──→ │ DNA → Cocos 组件映射     │
│ 三维度字段   │     │ Design DNA JSON │     │ → MCP 创建节点/Prefab    │
│ 问用户定制   │     │ 问用户调整      │     │ → 生成 PageComp/Renderer │
└─────────────┘     └─────────────────┘     └──────────────────────────┘
```

根据上下文判断从哪个阶段开始：
- **全新项目**：Phase 1 → 2 → 3（完整流程）
- **已有 DNA，新界面**：Phase 3（直接转换）
- **用户只想看 Schema**：仅 Phase 1

---

## Phase 1: 结构 — 展示 Schema `📦 由 design-dna skill 执行`

1. 读取 [references/design-dna-schema.md](references/design-dna-schema.md)
2. 向用户展示三维度结构：**design_system**（tokens）、**design_style**（定性感知）、**visual_effects**（特效层）
3. 询问用户是否需要定制或扩展维度

## Phase 2: 分析 — 从参考图提取 DNA `📦 由 design-dna skill 执行`

1. 从用户提供的参考图/截图/URL 中逐字段提取或推断值
2. 输出完整 DNA JSON — **每字段必须填充**
3. **必须询问**：*"需要在进入生成阶段前调整任何值吗？"*
4. 用户确认后保存为 `design-dna/design-dna.json`

## Phase 3: 生成 — DNA 数据驱动转换 `🎮 cocos-dna 核心`

**本阶段是 cocos-dna 的核心价值。** 详细映射规则和代码模板见 → [references/dna-cocos-mapping.md](references/dna-cocos-mapping.md)

### 执行步骤

1. **读取设计约束** — 读取 `design-dna.json`（SSOT）+ 已有 components/ 文档作为风格基线
2. **确认输入** — 页面名称（英文+中文）、设计分辨率、UI 参考图
3. **分析图片 → 匹配 DNA** — 将图片元素匹配到 DNA 的颜色、字体、间距等
4. **⚠️ 询问动态效果（不可跳过）** — 见下方「动态效果确认」
5. **DNA → Cocos 组件映射** — 按映射表确定层级结构和组件分配
6. **输出文档 + 代码** — 见下方「产出物清单」
7. **MCP 创建 Prefab** — 按 MCP 调用序列自动创建节点树
8. **验证** — 按验证清单自检，见 → [references/output-spec.md](references/output-spec.md)

---

## 输入要求

| 必填项 | 说明 |
|--------|------|
| **UI 图片** | 至少 1 张截图/设计稿 |
| **页面名称** | 英文标识符，如 `main-menu`、`char-select` |
| **中文名称** | 如 "主菜单"、"角色选择界面" |

| 选填项 | 默认值 |
|--------|--------|
| 设计分辨率 | 从项目 design-dna.json 读取，或默认 1920×1080 |
| 额外交互说明 | 从图片推断 |

### ⚡ 动态效果确认（重要）

静态截图无法完整表达动态效果。Agent 分析完图片后 **必须主动询问用户**：

> 💡 我注意到这个界面可能包含以下动态效果。请确认哪些需要支持：
> 1. **粒子效果** — 烟雾、飘雪、火花、光点等
> 2. **持续旋转/摆动** — 齿轮旋转、时钟指针、钟摆等
> 3. **背景动效** — 缓慢平移、亮度呼吸、云层流动等
> 4. **入场/过渡动画** — 渐显、滑入、缩放出场等
> 5. **交互反馈** — 按钮悬停发光、按下缩放、点击波纹等
> 6. **其他** — 请补充

---

## 产出物清单

| # | 产物 | 路径 | 说明 |
|---|------|------|------|
| 1 | Design DNA JSON | `design-dna/design-dna.json` | 唯一真相源 (SSOT) |
| 2 | UI 结构协议文档 | `design-dna/components/<page>/design.md` | 9章 Markdown（含第1.5章） |
| 3 | 资产绑定清单 | `design-dna/components/<page>/asset-manifest.json` | Sprite UUID 映射 |
| 4 | AI 绘图 Prompt | `design-dna/components/<page>/assets/art-prompts.md` | 美术资源生成指引，产出放 `assets/raw/` |
| 5 | Prefab 组件脚本 | `assets/scripts/ui/<page>/<Page>Comp.ts` | @property 声明 |
| 6 | 渲染器脚本 | `assets/scripts/ui/<page>/<Page>Renderer.ts` | DNA 驱动逻辑 |
| 7 | Prefab 文件 | `assets/resources/prefabs/<page>.prefab` | MCP 自动创建 |
| 8 | ThemeConfig 更新 | `assets/scripts/config/ThemeConfig.ts` | 全局 tokens 同步 |

### design.md 章节结构（9章，含第1.5章）

| 章节 | 内容 | 何时读取详细规范 |
|------|------|-----------------|
| 第1章 设计概述 | 页面功能、视觉目标、设计分辨率、设计原则 | — |
| 第1.5章 参考图溯源 | 参考图列表、设计决策追踪表 | — |
| 第2章 整体布局 | ASCII 线框图 + 布局要点表 | — |
| 第3章 视觉规范 | 色彩/字体/尺寸/动效 4 个子表 | — |
| 第4章 节点树 | Cocos Prefab 结构（核心） | → [node-spec.md](references/node-spec.md) |
| 第5章 元素详述 | 每个元素的设计参数（Cocos API 格式） | — |
| 第6章 资源切图表 | 所有图片资源清单 | → [node-spec.md](references/node-spec.md) |
| 第6.5章 资产绑定 | asset-manifest.json | → [asset-binding.md](references/asset-binding.md) |
| 第7章 交互逻辑 | 点击、入场动画、页面跳转 | — |
| 第8章 动态效果 | 粒子/动画/背景动效规范 | → [output-spec.md](references/output-spec.md) |

---

## 项目设计系统

每个项目在 `design-dna/` 目录下维护自己的设计系统：

```
<project-root>/design-dna/
├── design-dna.json          ← SSOT
├── design-tokens.css        ← CSS 变量辅助预览
├── asset-manifest.schema.json
├── components/
│   ├── <page-name>/
│   │   ├── design.md
│   │   ├── asset-manifest.json
│   │   ├── assets/
│   │   │   ├── art-prompts.md    ← AI 绘图 Prompt
│   │   │   └── raw/              ← AI 生成的原始资产（不参与 Cocos 构建）
│   │   └── references/
│   └── ...
└── README.md
```

- **无 design-dna.json**：先从参考图提取设计系统（Phase 1→2），生成后再进入 UI 分析
- **已有 design-dna.json**：读取作为设计约束，新界面必须与已有系统保持一致

---

## 参考资料索引

| 文件 | 用途 | 何时读取 |
|------|------|----------|
| [design-dna-schema.md](references/design-dna-schema.md) | 三维度 JSON Schema | Phase 1 展示结构、Phase 2 首次生成 DNA |
| [dna-cocos-mapping.md](references/dna-cocos-mapping.md) | DNA→Cocos 映射表 + MCP 流程 + 代码模板 + 路径渲染指南 | Phase 3 执行映射与代码生成 |
| [output-spec.md](references/output-spec.md) | design.md 9章详细定义（含第1.5章）+ 动效接口 + 验证清单 | Phase 3 编写 design.md、最终验证 |
| [node-spec.md](references/node-spec.md) | 节点命名规范、节点信息格式 | Phase 3 构建第4/6章节点树 |
| [asset-binding.md](references/asset-binding.md) | 资产绑定协议、Schema、状态机、**静态 vs 动态资源目录决策** | Phase 3 生成第6.5章 |
| [example-design.md](references/example-design.md) | 全 9 章格式示例（含第1.5章溯源、Cocos API 交互状态） | 理解输出格式 |
| [cocos-constraints.md](references/cocos-constraints.md) | Cocos 技术栈禁止清单与约束 | 代码生成/任务规划时自检 |
| [validate-workflow.md](references/validate-workflow.md) | V1-V4 验证规范（设计文档/Prefab/代码/测试） | Phase 3 完成后自动验证 |

## 可执行脚本

| 脚本 | 用途 | 调用方式 |
|------|------|----------|
| [scripts/mcp-client.js](scripts/mcp-client.js) | 通用 MCP 通信层 — 场景/节点/组件/Prefab 操作 API | `require()` 或 `node scripts/mcp-client.js [port]` 测试连通性 |
| [scripts/resolve-asset-uuids.js](scripts/resolve-asset-uuids.js) | 解析 .meta → UUID，写回 asset-manifest.json | `node scripts/resolve-asset-uuids.js --project <path>` |
| [scripts/ui-dev-workflow.js](scripts/ui-dev-workflow.js) | V1-V4 验证引擎（通用，不含项目硬编码） | `node scripts/ui-dev-workflow.js --project <path> <ui-name>` |

> **重要**：Agent 在 Cocos Creator 项目中工作时，必须遵守 [cocos-constraints.md](references/cocos-constraints.md) 中的全部约束。核心规则：运行时代码中禁止使用 HTML/CSS/DOM/Web 框架，必须使用 Cocos 原生 API 和组件。
