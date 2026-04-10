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

## 版本兼容性

| 引擎 | 支持版本 | 说明 |
|------|---------|------|
| **Cocos Creator** | **3.7+**（推荐 3.8 / 4.x） | 依赖 `cc.tween` 新 API、`Widget.AlignMode`、`Sprite.SizeMode.CUSTOM`、Prefab 嵌套序列化等 3.7+ 特性 |
| Node.js（工具脚本） | 16+ | `sync-runtime.js`、`resolve-asset-uuids.js` 等使用 ES2020+ 语法 |

> **低版本注意**：Cocos Creator 3.6 及以下版本的 `resources.load` 回调签名和 Prefab 序列化格式可能与本 skill 模板不兼容。如需支持更早版本，请在 `templates/runtime/` 中做适配。

## 来源与架构

基于 [design-dna](https://github.com/zanwei/design-dna) 扩展。Phase 1（结构）和 Phase 2（分析）完全复用 design-dna skill 原始实现，Phase 3 重写为 **DNA 数据驱动转换方案** — 将 DNA JSON 映射为 Cocos Creator 原生组件，通过 MCP 工具自动生成 Prefab。

**为什么不能直接用 design-dna 的 Phase 3**：design-dna 的 Phase 3 产出是自包含 HTML/CSS/JS（Web 前端），而 Cocos Creator 使用自有渲染管线（WebGL/Metal/Vulkan）、ECS-like 组件模型（`Node + Component`）、Asset Manager 资源系统，三者完全不同。因此 cocos-dna 替换 Phase 3 为 Cocos 原生组件映射 + MCP 驱动 Prefab 创建。

### 依赖

cocos-dna 依赖 design-dna skill。如未安装，引导用户安装：`https://github.com/zanwei/design-dna`

> **项目隔离原则**：本技能是通用规范，不包含任何特定项目的设计内容。所有项目特定的设计系统来自各项目自己的 `cocos-dna/design-dna.json`。

---

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

---

## Phase 1: 结构 — 展示 Schema `📦 由 design-dna skill 执行`

1. 读取 [references/design-dna-schema.md](references/design-dna-schema.md)
2. 向用户展示三维度结构：**design_system**（tokens）、**design_style**（定性感知）、**visual_effects**（特效层）
3. 询问用户是否需要定制或扩展维度

## Phase 2: 分析 — 从参考图提取 DNA `📦 由 design-dna skill 执行`

1. 从用户提供的参考图/截图/URL 中逐字段提取或推断值
2. 输出完整 DNA JSON — **每字段必须填充**
3. **必须询问**：*"需要在进入生成阶段前调整任何值吗？"*
4. 用户确认后保存为 `cocos-dna/design-dna.json`

## Phase 3: 生成 — DNA 数据驱动转换 `🎮 cocos-dna 核心`

**本阶段是 cocos-dna 的核心价值。** 详细映射规则和代码模板见 → [references/dna-cocos-mapping.md](references/dna-cocos-mapping.md)

### 执行步骤

1. **读取设计约束** — 读取 `cocos-dna/design-dna.json`（SSOT）+ 已有 components/ 文档作为风格基线
2. **确认输入** — 页面名称（英文+中文）、设计分辨率、适配策略、UI 参考图
   - **⚠️ 适配策略确认（不可跳过）**：从 `design-dna.json` → `design_system.layout` 读取 `design_resolution` + `fit_strategy` + `safe_area`。如缺失，**必须先询问用户**目标平台和适配策略后补充到 design-dna.json
3. **⚠️ 初始化页面目录结构（不可跳过）** — 见下方「页面目录初始化」
4. **分析图片 → 匹配 DNA** — 将图片元素匹配到 DNA 的颜色、字体、间距等
5. **⚠️ 参考图坐标换算（不可跳过）** — 见下方「参考图坐标换算规则」
6. **⚠️ 询问动态效果（不可跳过）** — 见下方「动态效果确认」
7. **DNA → Cocos 组件映射** — 按映射表确定层级结构和组件分配。**必须按三层分类规则决定定位方式**（Layer 1 交互UI→Widget / Layer 2 容器→Widget+Layout / Layer 3 装饰→Position）
8. **输出文档 + 代码** — 见下方「产出物清单」
9. **MCP 创建 Prefab** — 按 MCP 调用序列自动创建节点树
10. **验证** — 按验证清单自检，见 → [references/output-spec.md](references/output-spec.md)

### ⚠️ 页面目录初始化（必须在输出任何文件前执行）

> **关键规则**：进入 Phase 3 后，Agent **必须首先**创建完整的页面目录结构，再开始编写文档和代码。
> 不完整的目录结构会导致后续 `resolve-asset-uuids.js`、AI 绘图、验证等环节断裂。

**必须创建的目录和文件**：

```
cocos-dna/components/<page>/
├── design.md                  ← 步骤 7 输出
├── asset-manifest.json        ← 步骤 7 输出
├── assets/
│   ├── art-prompts.md         ← 步骤 7 输出（AI 绘图 Prompt，基于 design.md 第6章资源清单）
│   └── raw/
│       └── .gitkeep           ← 占位，后续 AI 生成的原始资产放在此目录
└── references/
    └── README.md              ← 参考图索引（可从 examples/_example-page/references/README.md 复制模板）
```

**Agent 检查清单**（步骤 3）：
- [ ] `cocos-dna/components/<page>/` 目录已创建
- [ ] `cocos-dna/components/<page>/assets/` 目录已创建
- [ ] `cocos-dna/components/<page>/assets/raw/.gitkeep` 已创建
- [ ] `cocos-dna/components/<page>/references/` 目录已创建
- [ ] `design-dna.json` 的 `pages` 索引中已添加新页面条目

> 💡 **提示**：可参考 `examples/_example-page/` 的目录结构。`assets/art-prompts.md` 在步骤 7 输出文档时与 design.md、asset-manifest.json 一起编写。

### ⚠️ 参考图坐标换算规则（必须在输出 design.md 前执行）

> **背景**：用户提供的 UI 参考图分辨率（如 2712×1220）通常与项目设计分辨率（如 1280×720）不同。
> 如果直接使用参考图上的像素坐标写入 design.md 第4章，会导致节点偏移出屏、UI 布局崩溃。
> **这是 pig-rabbit 等项目 UI 全乱的根本原因。**

**换算公式**：

```
scaleX = design_resolution.width / 参考图宽度
scaleY = design_resolution.height / 参考图高度

新坐标 x = 参考图 x × scaleX
新坐标 y = 参考图 y × scaleY
新尺寸 w = 参考图 w × scaleX  (或 scaleY，取决于保持比例的需求)
新尺寸 h = 参考图 h × scaleY
```

**换算后按「三层分类」决定定位方式**（见 [node-spec.md](references/node-spec.md) 的「UI 布局三层分类规则」）：

> **核心原则（来自 Cocos 官方多分辨率适配文档）**：
> Canvas 负责整体缩放（所有渲染元素统一缩放），Widget 负责 UI 对齐（确保元素在不同分辨率保持正确位置）。
> **Widget 只用于「需要在不同分辨率保持语义位置」的 UI 元素**，不是所有节点都用 Widget。

| 层级 | 元素类型 | 定位方式 | 说明 |
|------|---------|---------|------|
| **Layer 1: 交互 UI** | 按钮、标题、文本、HUD、输入框、提示 | **必须 Widget**（禁止用 Position 定位到屏幕边缘） | 不同分辨率/宽高比必须保持语义位置 |
| **Layer 2: 结构容器** | Panel、Group、Container、List | **Widget + Layout** | 容器决定内部元素位置，自身用 Widget 锚定 |
| **Layer 3: 装饰/视觉元素** | 背景纹理、齿轮装饰、光效、粒子 | **可以用 Position**（Canvas 已统一缩放），不强制 Widget | 装饰不需精确对齐；有动画的装饰用 Position 更灵活 |

**Widget 具体策略表**（仅 Layer 1 + Layer 2）：

| 换算后的节点位置 | Widget 策略 | 说明 |
|----------------|------------|------|
| 顶部 UI（标题、返回按钮） | `[Widget: Top=边距, HCenter=0]` | 不同设备顶部高度不同（刘海/平板） |
| 底部 UI（按钮、提示文字） | `[Widget: Bottom=边距, HCenter=0]` | 底部 UI 最典型需要适配的区域 |
| 全屏背景/遮罩 | `[Widget: LRTB=0]` | 自动撑满，不用固定尺寸 |
| 水平居中内容组 | `[Widget: HCenter=0]` + Position y | 居中不依赖绝对 x |
| 底部多个按钮/提示 | 用 Layout 包一层 + `[Widget: Bottom=N, HCenter=0]` | 避免按钮与提示文字重叠 |

**装饰元素（Layer 3）策略**：

| 装饰类型 | 推荐定位 | 说明 |
|---------|---------|------|
| 纯视觉装饰（齿轮、飘带、纹理） | `Position`（Canvas 缩放即可） | 不同宽高比下允许被裁切 |
| 需要在宽窄屏都可见的角落装饰 | `[Widget: 方向=边距, AlignMode=ONCE]` | ONCE = 仅初始化对齐一次，之后不干涉动画 |
| 有持续动画的装饰（旋转齿轮等） | `Position` 或 `[Widget: AlignMode=ONCE]` | **⚠️ AlignMode=ALWAYS 会每帧重置 Position，覆盖 tween 动画** |

**换算示例**（参考图 2712×1220 → 设计分辨率 1280×720）：

```
scaleX = 1280/2712 ≈ 0.472
scaleY = 720/1220  ≈ 0.590

TitleGroup(交互UI):  y=440  → y≈260 → Widget: Top=100, HCenter=0
CardGroup(结构容器):  y=80   → y≈47  → Widget: HCenter=0, VCenter=25
DifficultyGroup(UI): y=-380 → y≈-224 → Widget: Bottom=136, HCenter=0
StartBtn(交互UI):    y=-500 → y≈-295 → Widget: Bottom=65, HCenter=0
DecoGear(装饰):      (-560, 300) → (-264, 177) → Position: (-264, 177)（Canvas 缩放即可）
Card 500×600 → 236×354（按 scaleX 等比缩放）
```

**Agent 检查清单**（步骤 5）：
- [ ] 已识别参考图分辨率与设计分辨率的差异
- [ ] 已计算 scaleX 和 scaleY
- [ ] 所有坐标和尺寸已按比例换算到设计分辨率
- [ ] **交互 UI（Layer 1）** 使用 Widget 定位，禁止 Position 定位到屏幕边缘
- [ ] **结构容器（Layer 2）** 使用 Widget + Layout
- [ ] **装饰元素（Layer 3）** 使用 Position（有动画的节点不用 Widget ALWAYS）
- [ ] 关键 UI 元素在安全区域内
- [ ] 有持续动画的 Widget 节点设置 `AlignMode=ONCE`

### ⚠️ MCP 降级策略

当 MCP Server 不可用时（连接超时、未启动、端口占用等），**不应阻塞整个 Phase 3 流程**。按以下降级方案输出：

| 降级级别 | 条件 | 输出 |
|---------|------|------|
| **L1 完整模式** | MCP 正常连通 | design.md + View.generated.ts + PageView.ts + MCP 自动生成 Prefab |
| **L2 文档模式** | MCP 不可用 | design.md + View.generated.ts + PageView.ts + **Prefab 节点树定义文档**（第4章详细到可手动创建） |
| **L3 最小模式** | MCP 不可用且缺少模板信息 | design.md（9章完整） |

**降级时的 Agent 行为**：

1. 在输出开头明确标注：`⚠️ MCP Server 未连通，已降级到 L2 文档模式`
2. 输出 MCP 启动指引：
   ```
   请在终端启动 Cocos MCP Server：
   node <cocos-cli-path>/dist/cli.js start-mcp-server
   启动后可重新执行 Prefab 创建步骤。
   ```
3. design.md 第4章节点树写到**可直接在 Cocos Creator 编辑器中手动创建**的精度（含每个节点的组件类型、属性值、锚点、尺寸）
4. 所有代码文件（View.generated.ts / PageView.ts）正常输出，不依赖 MCP

---

## 输入要求

| 必填项 | 说明 |
|--------|------|
| **UI 图片** | 至少 1 张截图/设计稿 |
| **页面名称** | 英文标识符，如 `main-menu`、`char-select` |
| **中文名称** | 如 "主菜单"、"角色选择界面" |

| 选填项 | 默认值 |
|--------|--------|
| 设计分辨率 | 从项目 `cocos-dna/design-dna.json` → `layout.design_resolution` 读取，或默认 1280×720 |
| 适配策略 | 从项目 `cocos-dna/design-dna.json` → `layout.fit_strategy` 读取，或默认 `"fitHeight"`（横屏）/ `"fitWidth"`（竖屏） |
| 安全区域 | 从项目 `cocos-dna/design-dna.json` → `layout.safe_area` 读取。如未定义，默认等于设计分辨率 |
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
| 1 | Design DNA JSON | `cocos-dna/design-dna.json` | **全局设计 token SSOT**（色彩/字体/间距/动效/风格）+ 页面轻量索引。**禁止**在此存储页面级设计详情 |
| 2 | UI 结构协议文档 | `cocos-dna/components/<page>/design.md` | 9章 Markdown（含第1.5章），页面设计数据的唯一存储位置 |
| 3 | 资产绑定清单 | `cocos-dna/components/<page>/asset-manifest.json` | Sprite UUID 映射。运行 `resolve-asset-uuids.js` Smart Discovery 自动同步 |
| 4 | AI 绘图 Prompt | `cocos-dna/components/<page>/assets/art-prompts.md` | 美术资源生成指引，**每个资源独立一节**（`## 资源 #N: 描述 — filename.png`），严禁合并。格式规范见 → [references/output-spec.md](references/output-spec.md) |
| 5a | **三层架构** — AI 生成层 | `assets/scripts/views/<Page>View.generated.ts` | Layer 2：@property 声明 + assetManifest（AI 可安全覆盖） |
| 5b | **三层架构** — 业务逻辑层 | `assets/scripts/views/<Page>PageView.ts` | Layer 3：业务逻辑（人写，AI **永不覆盖**） |
| 5c | Prefab 组件脚本（可选） | `assets/scripts/prefab-components/<Page>PageComp.ts` | @property 声明（辅助 Prefab 编辑器序列化） |
| 6 | Prefab 文件 | `assets/resources/prefabs/pages/<Page>Page.prefab` | MCP 自动创建 |
| 7 | ThemeConfig 更新 | `assets/scripts/ui/themed-components/ThemeConfig.ts` | 全局 tokens 同步（SteamColors SSOT） |

### Scene vs Prefab 架构决策

> ⚠️ **关键规则**：新 UI 页面**默认创建为 `.prefab`**，不新建 `.scene`。详细约束见 → [cocos-constraints.md](references/cocos-constraints.md)「Scene 架构约束」章节。

| 决策 | 条件 | 产物 |
|------|------|------|
| **创建 Prefab**（默认） | 所有普通 UI 页面（菜单/战斗/地图/设置等） | `assets/resources/prefabs/pages/<Page>Page.prefab` |
| **创建 Scene**（例外） | 渲染管线/光照/天空盒与主场景根本不同（需设计文档论证 + 用户确认） | `assets/scenes/<name>.scene` + 更新 build-config.json |

`design2prefab.js` 的 MCP 模式使用 scene 仅作为**临时工作区**（打开 → 创建节点 → 导出为 Prefab → 清理），scene 本身不是产出物。Offline 模式不涉及 scene。

### 三层架构

所有页面统一使用 BaseView 三层架构：

| 层级 | 文件 | 职责 | 维护者 |
|------|------|------|--------|
| Layer 1 | `BaseView.ts` | 通用基类（状态机 + 资源管理 + Widget 工具） | skill 维护 |
| Layer 2 | `XxxView.generated.ts` | @property + assetManifest（可安全覆盖） | Codegen / AI |
| Layer 3 | `XxxPageView.ts` | 业务逻辑（永不覆盖） | 人工 |

### design.md 章节结构（9章，含第1.5章）

| 章节 | 内容 | 何时读取详细规范 |
|------|------|-----------------|
| 第1章 设计概述 | 页面功能、视觉目标、设计分辨率、**适配策略（fit_strategy + safe_area）**、设计原则 | — |
| 第1.5章 参考图溯源 | 参考图列表、设计决策追踪表 | — |
| 第2章 整体布局 | ASCII 线框图 + 布局要点表 | — |
| 第3章 视觉规范 | 色彩/字体/尺寸/动效 4 个子表 | — |
| 第4章 节点树 | Cocos Prefab 结构（核心） | → [node-spec.md](references/node-spec.md) |
| 第5章 元素详述 | 每个元素的设计参数（Cocos API 格式） | — |
| 第6章 资源切图清单 | 资源文件名/尺寸表 + @property 映射表（**路径以 asset-manifest.json 为权威，不重复**） | → [node-spec.md](references/node-spec.md) |
| 第6.5章 资产绑定 | asset-manifest.json | → [asset-binding.md](references/asset-binding.md) |
| 第7章 交互逻辑 | 点击、入场动画、页面跳转 | — |
| 第8章 动态效果 | 粒子/动画/背景动效规范 | → [output-spec.md](references/output-spec.md) |

---

## 项目设计系统

每个项目在 `cocos-dna/` 目录下维护自己的设计系统：

```
<project-root>/cocos-dna/
├── design-dna.json          ← 全局 SSOT（仅含 design_system / design_style / visual_effects / cocos_dna_extensions + 页面索引）
├── design-tokens.css        ← CSS 变量辅助预览
├── asset-manifest.schema.json
├── components/              ← 各 UI 页面的设计数据
│   ├── <page-name>/
│   │   ├── design.md        ← 页面级设计数据的唯一存储位置（9 章）
│   │   ├── asset-manifest.json
│   │   ├── assets/
│   │   │   ├── art-prompts.md    ← AI 绘图 Prompt
│   │   │   └── raw/              ← AI 生成的原始资产（不参与 Cocos 构建）
│   │   └── references/
│   └── ...
└── README.md

# examples 目录位于 skill 本身（不在项目产物 cocos-dna/ 下）：
.codebuddy/skills/cocos-dna/examples/
├── README.md                ← 索引说明 + 数据边界 + 新建流程
└── _example-page/           ← 模拟完整页面目录
    ├── design.md            ← design.md 9 章完整格式模板
    ├── asset-manifest.json
    ├── references/README.md
    └── assets/art-prompts.md
```

### design-dna.json 数据边界

> ⚠️ **关键规则**：`design-dna.json` **只保存全局设计 token**（`design_system`、`design_style`、`visual_effects`、`cocos_dna_extensions`）和一个 **pages 轻量索引**（仅含 `page_name_cn`、`status`、`design_doc` 路径）。
>
> **禁止**在 `design-dna.json` 的 `pages` 中写入页面的 layout、components、animations、particles 等详细设计数据。这些数据**必须且只能**写在对应的 `cocos-dna/components/<page>/design.md` 中。
>
> 新增 UI 页面时：
> 1. 在 `pages` 索引中添加一行轻量条目
> 2. 在 `cocos-dna/components/<page>/design.md` 中编写完整的 9 章设计文档

- **无 cocos-dna/design-dna.json**：先从参考图提取设计系统（Phase 1→2），生成后再进入 UI 分析
- **已有 cocos-dna/design-dna.json**：读取全局 token 作为设计约束，新界面必须与已有系统保持一致

---

## 参考资料索引

| 文件 | 用途 | 何时读取 |
|------|------|----------|
| [design-dna-schema.md](references/design-dna-schema.md) | 三维度 JSON Schema | Phase 1 展示结构、Phase 2 首次生成 DNA |
| [dna-cocos-mapping.md](references/dna-cocos-mapping.md) | DNA→Cocos 映射表 + MCP 流程 + 代码模板 + 路径渲染指南 | Phase 3 执行映射与代码生成 |
| [output-spec.md](references/output-spec.md) | design.md 9章详细定义（含第1.5章）+ 动效接口 + 验证清单 | Phase 3 编写 design.md、最终验证 |
| [node-spec.md](references/node-spec.md) | 节点命名规范、节点信息格式 | Phase 3 构建第4/6章节点树 |
| [asset-binding.md](references/asset-binding.md) | 资产绑定协议、Schema、状态机、静态 vs 动态资源目录决策、**Smart Discovery 规范** | Phase 3 生成第6.5章、资产同步 |
| `examples/_example-page/`（skill 目录下） | 完整页面目录结构示例（design.md 9章 + asset-manifest + references + art-prompts） | 理解输出格式、新页面目录结构 |
| [cocos-constraints.md](references/cocos-constraints.md) | Cocos 技术栈禁止清单与约束 | 代码生成/任务规划时自检 |
| [validate-workflow.md](references/validate-workflow.md) | V1-V4 验证规范（设计文档/Prefab/代码/测试） | Phase 3 完成后自动验证 |
| [runtime-integration.md](references/runtime-integration.md) | Runtime 集成规范（ResourceManager/LayerManager 同步与改造指南） | Phase 3 代码生成、runtime 集成 |

## Runtime 模板

cocos-dna 提供通用运行时基础设施模板，由 skill 统一维护，通过 `sync-runtime.js` 同步到项目。

| 模板文件 | 版本 | 职责 |
|---------|------|------|
| [`templates/runtime/core/ResourceManager.ts`](templates/runtime/core/ResourceManager.ts) | 1.0.0 | 统一资源加载/缓存/分组释放（解决 resources.load 散落 + 零 release 问题） |
| [`templates/runtime/core/LayerManager.ts`](templates/runtime/core/LayerManager.ts) | 1.0.0 | UI 层级隔离：page / popup / effect / guide |
| [`templates/runtime/core/EventBus.ts`](templates/runtime/core/EventBus.ts) | 1.1.0 | 全局事件总线（on/off/emit/once + 单例 + context 绑定）+ 使用范围规约 + 清理规则 |
| [`templates/runtime/core/DebugLogger.ts`](templates/runtime/core/DebugLogger.ts) | 1.0.0 | 结构化调试日志（module/tag/level + window.\_\_DEBUG\_LOG\_\_ 供 E2E） |
| [`templates/runtime/core/UIBinder.ts`](templates/runtime/core/UIBinder.ts) | 1.0.0 | 运行时节点绑定工具（auto/map/component 三种模式，@property 的动态 fallback） |
| [`templates/runtime/views/BaseView.ts`](templates/runtime/views/BaseView.ts) | 1.1.0 | **视图 Component 基类**（三层架构：runtime → generated → business），支持 @property + 状态机 + 资源管理 + asset-manifest 绑定 |

### Agent 自动集成时机

- **Phase 3 首次执行**：检查项目 `assets/scripts/runtime/` 是否缺少 runtime 文件，缺少则自动同步
- **新项目初始化**：完整流程（Phase 1 → 2 → 3）时自动同步
- **用户显式请求**："同步 runtime"、"更新 runtime 模板"

### 什么放 skill，什么放项目

| 判断标准 | 归属 |
|---------|------|
| 能直接在另一个 Cocos DNA 项目里用 | → skill `templates/` |
| 绑定项目视觉风格/游戏流/业务逻辑 | → 项目 `assets/scripts/` |

**Skill v1.6 覆盖层**（6 模板 + 1 codegen 脚本）：视图基类（BaseView）+ 绑定工具（UIBinder）+ 资源（ResourceManager）+ 层级（LayerManager）+ 通信（EventBus）+ 调试（DebugLogger）+ Codegen（generate-view.js）

**留在项目侧**：GameEvents（事件常量）、GameFlowFSM、UIManager、I18n、DataProvider、ThemeConfig、RendererConfig

详细集成步骤见 → [runtime-integration.md](references/runtime-integration.md)

## 资产同步与 Prefab 生成工作流

### 资产时序问题与解决方案

Phase 3 设计阶段先生成 `asset-manifest.json`（预设路径），美术资源后续**异步、逐步**生成。两者之间存在时序断裂：

| 问题 | 表现 | 解决 |
|------|------|------|
| 路径猜错 | manifest 预设 `resources/textures/main-menu/`，实际放在 `textures/common/buttons/` | Smart Discovery 自动纠正 |
| 资源重命名 | manifest 记录 `4.1 主菜单背景.png`，实际规范名 `main_menu_bg.png` | 按 id 关键词模糊匹配 |
| UUID 缺失 | 文件已存在但 manifest 中 uuid 为 null | resolve-asset-uuids 从 .meta 提取 |
| 低优先级目录 | NanoBanana/raw/ 等原始目录被误选 | 优先级排序 + 自动切换到正式目录 |

### 完整流水线

```
Phase 3 设计       美术资源生成         资产同步              Prefab 生成
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ design.md    │  │ AI 绘图/手工 │  │ resolve-asset-   │  │ design2prefab.js │
│ + asset-     │→ │ 放入 assets/ │→ │ uuids.js v2.0    │→ │ 读 design.md #4  │
│   manifest   │  │ 任意合理目录 │  │ Smart Discovery  │  │ + asset-manifest │
│ (预设路径)   │  │ .meta 自动生 │  │ 自动修正+填UUID  │  │ → MCP/Offline    │
└──────────────┘  └──────────────┘  └──────────────────┘  └──────────────────┘
```

### resolve-asset-uuids.js v2.0 — Smart Discovery

资产同步的核心工具。详细算法见 → [asset-binding.md](references/asset-binding.md)

**查找策略（按优先级）**：
1. **精确路径** — 按 `assetPath` 查找，非低优先级目录则直接使用
2. **精确 filename** — 按 `filename` 在 `assets/` 全局索引中查找
3. **id 模糊匹配** — 从 `id` 提取关键词（去掉 bg\_/icon\_/btn\_/fx\_ 前缀），匹配文件名包含所有关键词的文件

**loadType 路径偏好**：
- `static` → 优先 `assets/textures/`（非 resources）
- `dynamic` → 优先 `assets/resources/textures/`

**Agent 执行时机**：
- 每次美术资源有更新（新增/移动/重命名）后运行
- Phase 3 生成 Prefab 前必须先运行
- 运行命令：`node .codebuddy/skills/cocos-dna/scripts/resolve-asset-uuids.js --project <path> [--page <id>] --verbose`

### design2prefab.js — 设计文档到 Prefab

从 `design.md` 第4章自动解析节点树 → 生成 `NodeSpec[]` 中间表示 → MCP 或 Offline 创建 Prefab。

**数据源**：
1. `design.md` 第4章代码块 → 节点树结构（NodeSpec）
2. `asset-manifest.json` → SpriteFrame UUID 绑定

**三种模式**：

| 模式 | 命令 | 说明 |
|------|------|------|
| dry-run | `--dry-run` | 仅解析 + 打印 NodeSpec 树 |
| MCP | （默认） | 需 Cocos 编辑器运行，实时创建节点 + 保存 Prefab |
| Offline | `--offline` | 不需编辑器，直接写 .prefab JSON 文件 |

**SpriteFrame 绑定流程（双策略）**：
1. **显式绑定** — design.md 节点中 `SpriteFrame: xxx.png` → 从 asset-manifest 查找 `filename === xxx.png && (status === 'ready' || status === 'size_mismatch')` → 获取 `spriteFrameUuid` → MCP `setSpriteFrame()` / Offline `__uuid__` 绑定
2. **自动绑定（推荐）** — 节点为 `[Sprite]` 类型但无显式 `SpriteFrame:` 属性时 → 从 asset-manifest 的 `boundToNodes` 数组匹配当前节点路径 → 获取 `spriteFrameUuid` → 自动绑定

> **注意**：`size_mismatch` 状态的资源也有有效 UUID，不会跳过绑定。MCP 和 Offline 模式均支持上述双策略。

## 可执行脚本

### 脚本总览

| 脚本 | 角色层 | 用途 | 调用方式 |
|------|--------|------|----------|
| [mcp-client.js](scripts/mcp-client.js) | 🔧 底层库 | MCP 通信层 — 场景/节点/组件/Prefab 操作 API | `require()` 内部调用；或 `node scripts/mcp-client.js [port]` 测试连通性 |
| [prefab-builder.js](scripts/prefab-builder.js) | 🔧 底层库 | 离线 Prefab JSON 构建器（不需编辑器） | `require()` 内部调用；`node scripts/prefab-builder.js` 自测 |
| [resolve-asset-uuids.js](scripts/resolve-asset-uuids.js) | ⚙️ 数据同步 | **v2.0** Smart Discovery 资产 UUID 解析 | `node scripts/resolve-asset-uuids.js --project <P> [--page <id>] [--check] [--verbose]` |
| [design2prefab.js](scripts/design2prefab.js) | ⚙️ 生成 | design.md #4 → NodeSpec → MCP/Offline Prefab | `node scripts/design2prefab.js --project <P> <page> [--dry-run\|--offline]` |
| [generate-view.js](scripts/generate-view.js) | ⚙️ 生成 | asset-manifest → Layer 2 XxxView.generated.ts | `node scripts/generate-view.js <page> [--dry-run] [--out <dir>]` |
| [sync-runtime.js](scripts/sync-runtime.js) | 🏗️ 基建 | Runtime 模板同步（templates/ → 项目 scripts/runtime/） | `node scripts/sync-runtime.js --project <P> --apply` |
| [ui-dev-workflow.js](scripts/ui-dev-workflow.js) | ✅ 验证 | V1-V4 验证引擎（设计文档/Prefab/代码/测试） | `node scripts/ui-dev-workflow.js --project <P> <ui-name>` |

### ⭐ 脚本编排地图（Orchestration Map）

> **Coding Agent 必读**：下面按**场景**列出脚本的组合顺序与依赖关系。**底层库脚本（mcp-client / prefab-builder）不需要手动调用**，它们被 design2prefab 内部 require()。

#### 场景 A：新建 UI 页面（完整 Phase 3 流程）

```
步骤  脚本                    输入 → 输出                                前置条件
─────────────────────────────────────────────────────────────────────────────
 A1   sync-runtime.js         skill templates/ → 项目 runtime/           首次执行或 runtime 版本落后时
 A2   — (AI 手写) —           Phase 3 输出 design.md + asset-manifest    无（AI 核心工作）
 A3   — (AI 手写) —           Phase 3 输出 ThemeConfig + PageView.ts     A2 完成
 A4   resolve-asset-uuids.js  .meta 文件 → asset-manifest UUID 填充     美术资源已放入 assets/
 A5   generate-view.js        asset-manifest → XxxView.generated.ts     A4（manifest UUID 已填充）
 A6   design2prefab.js        design.md #4 + manifest → Prefab          A4 + A5
 A7   ui-dev-workflow.js      全部产出物 → V1-V4 验证报告               A6（所有文件就绪）
```

**流程图**：
```
sync-runtime ─→ AI 写 design.md + manifest + 代码
                        ↓
              美术资源放入 assets/
                        ↓
              resolve-asset-uuids ─→ generate-view ─→ design2prefab
                                                           ↓
                                                   ui-dev-workflow
```

#### 场景 B：美术资源更新后刷新

```
步骤  脚本                    说明
─────────────────────────────────────────────────────────────
 B1   resolve-asset-uuids.js  重新扫描 → 更新路径 + 填充新 UUID
 B2   generate-view.js        重新生成 .generated.ts（manifest 变化了）
 B3   design2prefab.js        可选 — 如需重建 Prefab
```

#### 场景 C：设计迭代（用户反馈修正后）

> **典型触发**：Phase 3 首次输出 design.md 后，用户审阅并提出修改意见（如调整布局、增删节点、修改配色等），Agent 需要同步更新所有受影响的产出物。

```
步骤  操作                      说明                                     必须/可选
────────────────────────────────────────────────────────────────────────────────────
 C1   — (AI 手写) —             更新 design.md（按用户反馈修改受影响章节）    必须
 C2   — (AI 手写) —             同步更新 asset-manifest.json               必须（如资源清单有变化）
 C3   — (AI 手写) —             同步更新 assets/art-prompts.md             必须（如资源清单有变化）
 C4   resolve-asset-uuids.js    重新扫描 → 更新 UUID 映射                  必须（manifest 变化时）
 C5   generate-view.js          重新生成 .generated.ts                     必须（manifest 变化时）
 C6   design2prefab.js --dry-run 预览节点树变化                            推荐
 C7   design2prefab.js          正式重建 Prefab                            必须（节点树有变化时）
 C8   ui-dev-workflow.js        重新验证 V1-V4                             推荐
```

**⚠️ 同步更新规则（不可违反）**：

| design.md 变化类型 | asset-manifest.json | art-prompts.md | View.generated.ts | Prefab |
|-------------------|---------------------|----------------|-------------------|--------|
| 仅文案/字号调整 | — | — | — | 重建 |
| 增删/重命名节点 | 同步增删条目 | 同步增删 Prompt | 重新生成 | 重建 |
| 增删/替换图片资源 | 同步增删条目 | 同步增删 Prompt | 重新生成 | 重建 |
| 布局/位置调整 | — | — | — | 重建 |
| 配色/风格调整 | — | 更新 Prompt 中的风格描述 | — | 重建 |

> 💡 **简记**：design.md 是 SSOT。**凡 design.md 第6章（资源清单）有变化，asset-manifest.json 和 art-prompts.md 必须联动更新**。Agent 禁止只改 design.md 而忘记同步其他文件。

#### 场景 D：仅重建 Prefab（小幅调整后）

```
步骤  脚本                    说明
─────────────────────────────────────────────────────────────
 D1   design2prefab.js --dry-run   先预览节点树变化
 D2   design2prefab.js             确认无误后正式构建
```

#### 场景 E：仅验证产出物完整性

```
步骤  脚本                    说明
─────────────────────────────────────────────────────────────
 E1   ui-dev-workflow.js      运行 V1-V4 验证，查看哪些产出物缺失或不一致
```

#### 场景 F：新项目初始化

```
步骤  脚本                    说明
─────────────────────────────────────────────────────────────
 F1   sync-runtime.js --apply      同步全部 runtime 模板到项目
 F2   进入场景 A（A2 开始）
```

### 脚本依赖关系图

```
                     ┌─────────────────────┐
                     │   sync-runtime.js   │ ← 首次/版本更新时执行
                     │ 🏗️ 基建（独立）      │
                     └─────────────────────┘

                     ┌─────────────────────┐
                     │ resolve-asset-uuids │ ← 美术资源变化后执行
                     │ ⚙️ 数据同步          │
                     └────────┬────────────┘
                              │ manifest UUID 已填充
                    ┌─────────┼─────────┐
                    ▼                   ▼
         ┌──────────────────┐  ┌─────────────────┐
         │ generate-view.js │  │ design2prefab.js │ ← 内部 require:
         │ ⚙️ Layer 2 代码   │  │ ⚙️ Prefab 生成   │    mcp-client.js (MCP 模式)
         └──────────────────┘  │                  │    prefab-builder.js (Offline)
                               └────────┬─────────┘
                                        │ 所有产出物就绪
                                        ▼
                             ┌──────────────────────┐
                             │ ui-dev-workflow.js    │
                             │ ✅ V1-V4 验证         │
                             └──────────────────────┘
```

### 关键规则

1. **底层库不手动调用** — `mcp-client.js` 和 `prefab-builder.js` 由 `design2prefab.js` 内部 require()，Agent 无需直接运行
2. **resolve 必须先于 generate/design2prefab** — UUID 未填充就生成代码 = 资源绑定失败
3. **generate-view 和 design2prefab 可并行** — 两者都只读 manifest，互不依赖（但习惯上先 generate-view 再 design2prefab）
4. **ui-dev-workflow 放最后** — 它是验证全部产出物的最终关卡
5. **sync-runtime 按需执行** — 非每次都跑，仅首次或 runtime 模板版本更新时

> **重要**：Agent 在 Cocos Creator 项目中工作时，必须遵守 [cocos-constraints.md](references/cocos-constraints.md) 中的全部约束。核心规则：运行时代码中禁止使用 HTML/CSS/DOM/Web 框架，必须使用 Cocos 原生 API 和组件。
