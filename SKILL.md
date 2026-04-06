---
name: cocos-dna
description: >-
  Cocos Creator UI 设计规范技能 — 三阶段工作流：(1) 展示 Schema 结构，(2) 从参考图分析提取 Design DNA JSON，
  (3) DNA 数据驱动转换 → 映射 Cocos 组件 → 通过 MCP 生成 Prefab/节点树。
  本技能替换了 design-dna 的 Phase 3（HTML/CSS/JS 生成），改为 Cocos Creator 原生组件映射和 MCP 驱动的 Prefab 创建。
  触发词："解析 UI"、"UI 结构"、"Cocos 节点树"、"界面设计"、"设计规范"、"cocos-dna"、
  "分析这张图的 UI"、"生成 Prefab 结构"、"UI 设计文档"、"DNA 转 Cocos"、"映射组件"。
  即使用户没有明确说 "cocos-dna"，只要涉及 Cocos Creator 的 UI 结构/设计分析/节点规划/Prefab 生成，都应触发此技能。
---

# cocos-dna — Cocos Creator UI 设计规范技能

## 来源与依赖

**本技能（cocos-dna）基于 [design-dna](https://github.com/zanwei/design-dna) 扩展而来。**

- **design-dna** 是通用的 UI 设计分析技能，提供三阶段工作流：结构 → 分析 → 生成。其默认 Phase 3 产出是 **自包含 HTML/CSS/JS**（面向 Web 前端）。
- **cocos-dna** 保留 Phase 1（结构）和 Phase 2（分析）不变，**重写 Phase 3** 为 **DNA 数据驱动转换方案** — 将 DNA JSON 映射为 Cocos Creator 原生组件，通过 MCP 工具自动生成 Prefab 文件和节点树。

### 为什么不能直接使用 design-dna 的 Phase 3

design-dna 的 Phase 3 生成的是**基于 Web 技术的正式 UI 实现**（单文件 HTML/CSS/JS），这是一套完整的、可在浏览器中直接运行的前端代码。然而，**这套 Web 产出无法直接放入 Cocos Creator 中运行**，原因包括：

1. **渲染引擎不同**：Cocos Creator 使用自有的渲染管线（基于 WebGL/Metal/Vulkan），不直接渲染 HTML DOM 元素。HTML `<div>`、`<button>`、CSS `flexbox` 等 Web 原语在 Cocos 场景中没有对应物。
2. **组件模型不同**：Cocos 使用 `Node + Component` 的 ECS-like 架构（`cc.Sprite`、`cc.Label`、`cc.Button`、`cc.Layout` 等），而非 DOM 元素 + CSS 样式表。两者的布局、事件、生命周期机制完全不同。
3. **资源系统不同**：Cocos 的图片/字体/动画通过 Asset Manager 管理（`.spriteFrame`、`.ttf`、`.prefab` 等），而非 Web 的 `<img src>`、`@font-face`、`<link rel="stylesheet">`。
4. **交互系统不同**：Cocos 的触摸/点击事件通过 `cc.Button` 组件 + `cc.EventHandler` 绑定，而非 DOM 的 `addEventListener`。
5. **场景组织不同**：Cocos 的 UI 通过 Prefab/Scene 文件（`.prefab`/`.scene`）组织为节点树结构，而非 HTML 文件。

因此，cocos-dna 的 Phase 3 **不让 Agent 生成 HTML 代码**，而是采用 **DNA 数据驱动转换方案**：读取 DNA JSON 中的设计数据 → 按映射规则转换为 Cocos 原生组件 → 通过 MCP 工具在编辑器中自动创建节点和 Prefab。

### Phase 1 & Phase 2：直接复用 design-dna skill

**Phase 1（结构）和 Phase 2（分析）完全复用 design-dna skill 的原始实现，不做任何修改。**

这两个阶段的工作——展示 Schema 结构、从参考图提取 Design DNA JSON——是**引擎无关的通用设计分析流程**，与最终输出是 Web 还是 Cocos 无关。因此：

- Agent 在执行 Phase 1 和 Phase 2 时，应**加载并遵循 design-dna skill 的指令**
- cocos-dna 仅在 **Phase 3** 介入，替换 design-dna 的 Web 生成逻辑为 Cocos 组件映射 + MCP Prefab 创建
- 如果项目中没有安装 design-dna skill，cocos-dna 无法运行 Phase 1 和 Phase 2

### Phase 3 差异对照

| 环节 | 原始 design-dna（Web） | cocos-dna（Cocos Creator） |
|------|------------------------|---------------------------|
| 输入 | DNA JSON + 内容 | DNA JSON + design.md + asset-manifest.json |
| 颜色/排版 | CSS custom properties (`:root`) | `ThemeConfig.ts` + Renderer 动态设置 |
| 按钮 | HTML `<button>` + CSS states | `cc.Button` + `cc.Sprite` + Tween 动画 |
| 文字 | HTML text + CSS typography | `cc.Label` + BitmapFont/TTF 配置 |
| 布局 | CSS Grid/Flexbox | `cc.Layout` + `cc.Widget` + `UITransform` |
| 粒子 | Canvas 2D / WebGL / Three.js Points | `cc.ParticleSystem2D` 或程序化 Sprite 模拟 |
| 动画 | GSAP / CSS @keyframes / requestAnimationFrame | `cc.tween()` / `cc.Animation` |
| 3D 效果 | Three.js / WebGL / GLSL | Cocos 3D 节点（如需） |
| 滚动效果 | IntersectionObserver / parallax | ScrollView + Tween 组合 |
| 输出物 | 单个自包含 HTML 文件 | `.prefab` 文件 + `PageComp.ts` + `Renderer.ts` |
| 生成方式 | Agent 直接写 HTML 代码 | Agent 调用 Cocos MCP 工具创建节点/Prefab |

### 安装

cocos-dna 依赖 design-dna skill。如果当前项目未安装，Agent 应引导安装：

```
# 从 GitHub 安装 design-dna skill
# 直接基于仓库地址安装，无需手动克隆或复制文件
https://github.com/zanwei/design-dna
```

Agent 检测到项目中缺少 design-dna skill 时，应自动引导安装（而非要求用户手动操作）。

> **重要**：本技能是**通用规范**，不包含任何特定项目的设计内容。
> 所有项目特定的设计系统（颜色、字体、风格等）来自各项目自己的 `design-dna/design-dna.json`。

---

## 三阶段工作流总览

cocos-dna 遵循严格的三阶段工作流。**每个阶段必须完成后才进入下一阶段**，不可跳过。

```
Phase 1: 结构          Phase 2: 分析          Phase 3: 生成（Cocos 转换）
 [design-dna]           [design-dna]            [cocos-dna 自有]
┌─────────────┐     ┌─────────────────┐     ┌──────────────────────────┐
│ 展示 Schema │ ──→ │ 从参考图提取    │ ──→ │ DNA → Cocos 组件映射     │
│ 三维度字段   │     │ Design DNA JSON │     │ → MCP 创建节点/Prefab    │
│ 问用户定制   │     │ 每字段有值      │     │ → 生成 PageComp/Renderer │
└─────────────┘     │ 问用户调整      │     └──────────────────────────┘
                    └─────────────────┘
```

### Phase 1: 结构 — 展示 Schema `📦 由 design-dna skill 执行`

> **执行者**：design-dna skill（Agent 应加载 design-dna 的指令执行此阶段）

1. 读取 [references/design-dna-schema.md](references/design-dna-schema.md)
2. 向用户展示三维度结构及各字段含义：
   - **design_system**：可度量的 tokens（颜色、排版、间距、布局、形状、阴影、动效、组件）
   - **design_style**：定性感知（情绪、视觉语言、构图、意象、交互感受、品牌语气）
   - **visual_effects**：特效层（粒子、3D、着色器 — 在 Cocos 中映射为原生组件）
3. 询问用户是否需要定制或扩展维度

### Phase 2: 分析 — 从参考图提取 DNA `📦 由 design-dna skill 执行`

> **执行者**：design-dna skill（Agent 应加载 design-dna 的指令执行此阶段）

1. 从用户提供的参考图/截图/URL 中，逐字段提取或推断值
2. 输出完整的 Design DNA JSON — **每个字段必须填充，不允许空字符串**
3. 多个参考图冲突时，注明主方案与变体
4. 输出后 **必须询问**：*"需要在进入生成阶段前调整任何值吗？"*
5. 用户确认后保存为 `design-dna/design-dna.json`

### Phase 3: 生成 — DNA 数据驱动转换 `🎮 cocos-dna 自有实现，替换 design-dna 的 Web 生成`

**本阶段是 cocos-dna 的核心价值。** design-dna 原始的 Phase 3 会生成自包含 HTML/CSS/JS（Web 前端实现），但这些代码无法在 Cocos Creator 中运行（原因见上文）。cocos-dna 替换为：

1. **解析 DNA** — 读取 Phase 2 生成的 `design-dna.json`，提取颜色、间距、排版、阴影、动效等全部数据
2. **映射为 Cocos 组件** — 将 DNA 中的每个设计概念映射为 Cocos Creator 原生组件（详见下方映射表）
3. **生成 UI 结构协议文档** — 输出 8 章 `design.md` + `asset-manifest.json`
4. **生成美术资源 Prompt 清单** — 输出 `assets/art-prompts.md`，为 AI 绘图工具提供精确 Prompt（详见 §3.3）
5. **调用 MCP 创建 Prefab** — 通过 Cocos MCP 工具自动在编辑器中创建节点树和 `.prefab` 文件
6. **生成代码文件** — 输出 `PageComp.ts`（属性绑定）+ `Renderer.ts`（渲染逻辑 + 动效驱动）

---

## 技能用途

cocos-dna 是一个 **视觉分析 → UI 架构设计 → Cocos 实现** 的完整流程技能。

当用户提供 UI 原型图（截图、设计稿、参考图）时，Agent 按三阶段工作流分析并生成，
最终产出可直接在 Cocos Creator 中使用的 Prefab、组件脚本和渲染器代码。

本技能不绑定任何特定项目或视觉风格 — 项目的设计系统（颜色、字体、间距等）
从项目级 `design-dna.json` 中读取；如果项目尚未建立设计系统，本技能会引导首次生成。

### 触发条件

- "解析这张图的 UI 结构"
- "为这个界面设计 Cocos 节点树"
- "生成 UI 设计规范 / design.md"
- "分析 UI 架构"
- "将 DNA 映射为 Cocos 组件"
- "用 MCP 生成 Prefab"
- 用户提供图片并提到 "cocos-dna" / "UI" / "界面" / "设计" / "节点" / "Prefab"

---

## Phase 3: DNA 数据驱动转换（核心规范）

本节详细定义 cocos-dna Phase 3 如何将 Design DNA JSON 转换为 Cocos Creator 实现。

### 3.1 DNA → Cocos 组件映射表

Agent 读取 `design-dna.json` 后，按以下映射规则将每个 DNA 概念转换为 Cocos 原生组件：

#### Dimension 1: design_system → Cocos 组件

| DNA 字段 | Cocos 组件 / API | 转换说明 |
|----------|-----------------|----------|
| `color.primary/secondary/accent` | `cc.Color` → `Sprite.color` / `Label.color` | HEX 转 `new Color().fromHEX()` |
| `color.surface.background` | `cc.Sprite` + `cc.Color` 或渐变材质 | 纯色 → Sprite.color；渐变 → 自定义 Material |
| `color.surface.card/elevated` | `cc.Sprite` + Alpha | RGBA 透明度映射 Sprite.color.a |
| `typography.font_families` | `cc.Label.font` (TTF/BitmapFont) | heading → 标题字体；body → 正文字体 |
| `typography.type_scale.*` | `cc.Label.fontSize` + `cc.Label.lineHeight` | 各级字号直接映射 |
| `spacing.base_unit` | `cc.Layout.paddingLeft/Right/Top/Bottom` | 间距值映射 Layout padding |
| `spacing.scale` | `cc.Layout.spacingX/Y` | 间距阶梯映射 Layout spacing |
| `layout.grid_system` | `cc.Layout` (HORIZONTAL/VERTICAL/GRID) | 根据类型选择布局方向 |
| `layout.alignment_tendency` | `cc.Widget` 锚点配置 | "centered" → 水平/垂直居中对齐 |
| `shape.border_radius` | 九宫格 Sprite 或自定义 Mask | 圆角通过 9-slice 或 Graphics 实现 |
| `elevation.levels` | `cc.Sprite` 阴影层节点 | 每级阴影 → 独立 Sprite 节点偏移 + 模糊 |
| `motion.easing` | `cc.tween().to({easing})` | 缓动曲线字符串映射 Tween easing |
| `motion.duration_scale` | `cc.tween().to(duration)` | micro/normal/macro 映射动画时长 |
| `components.button_style` | `cc.Button` + `Sprite` 状态切换 | primary/secondary/disabled → Button transition |
| `components.card_style` | `cc.Sprite`(9-slice) + `cc.Layout` | 卡片背景 + 内容布局 |
| `components.input_style` | `cc.EditBox` | 输入框样式映射 |
| `components.navigation_pattern` | 自定义导航组件 | 根据模式（tabs/sidebar/etc）选择实现 |

#### Dimension 2: design_style → 主观设计决策

| DNA 字段 | 影响的 Cocos 设计决策 |
|----------|---------------------|
| `aesthetic.mood` | 整体色调温暖/冷峻选择、材质质感 |
| `visual_language.whitespace_usage` | Layout padding/spacing 倍率 |
| `visual_language.contrast_level` | 前景/背景色差强度 |
| `composition.hierarchy_method` | 用字号/颜色/尺寸中的哪个来建立层级 |
| `composition.balance_type` | 对称/非对称布局的 Widget 配置 |
| `imagery.graphic_elements` | 装饰 Sprite 节点的类型和数量 |
| `interaction_feel.hover_behavior` | Button 悬停态的 Tween 效果 |
| `interaction_feel.microinteraction_density` | 交互反馈动效的密度 |

#### Dimension 3: visual_effects → Cocos 特效组件

| DNA 字段 | Cocos 实现 | 技术选择 |
|----------|-----------|----------|
| `background_effects` (gradient-animation) | `cc.tween()` 驱动 Sprite 颜色渐变 | Tween 循环 |
| `background_effects` (noise-field) | 自定义 Material + Shader | Cocos Effect |
| `particle_systems` | `cc.ParticleSystem2D`（原生）或程序化 Sprite 模拟 | count < 50 → 程序化；count >= 50 → ParticleSystem2D |
| `3d_elements` | Cocos 3D 节点 + MeshRenderer | 仅当项目为 3D 模式时 |
| `shader_effects` | 自定义 Cocos Effect (.effect) | 顶点/片段着色器 |
| `scroll_effects` | `cc.ScrollView` + `cc.tween()` 组合 | Tween 驱动滚动联动动画 |
| `text_effects` (typewriter) | `cc.Label` + 定时器逐字显示 | schedule + string.substring |
| `text_effects` (gradient-fill) | 自定义 Material 文字着色器 | Cocos Effect |
| `cursor_effects` | 不适用（触屏为主） | 跳过或映射为触摸反馈 |
| `glassmorphism` | `cc.Sprite` + 模糊材质 | 自定义 blur Effect |
| `canvas_drawings` | `cc.Graphics` 组件 | 程序化绘制路径 |
| `svg_animations` | `cc.Graphics` + `cc.tween()` | 路径动画描边 |

### 3.2 MCP 驱动的 Prefab 创建流程

Phase 3 不只是输出文档，而是通过 Cocos MCP 工具**自动创建 Prefab**：

```
design-dna.json ──→ 映射表 ──→ 节点树定义 ──→ MCP 命令序列 ──→ .prefab 文件
                                    ↓
                              design.md（8章文档）
                              asset-manifest.json
                              art-prompts.md（AI 绘图 Prompt）
                              PageComp.ts
                              Renderer.ts
```

#### MCP 调用序列

1. **创建场景/Prefab 根节点**
   - MCP: `create-node` — 创建页面根节点 `<PageName>Page`
   - 设置 `UITransform` 尺寸为设计分辨率
   - 设置 `Widget: LRTB=0`（全屏撑满）

2. **逐层创建子节点**
   - 按 design.md 第4章节点树，从上到下创建：
     - 背景层（`BG` Sprite 节点）
     - 装饰层（`Deco*` Sprite 节点）
     - 内容层（`*Group`、`*Btn`、`*Label` 节点）
     - 动效层（`*ParticleLayer`、`*AnimLayer` 节点）
   - 每个节点设置：组件类型、UITransform、Position、Color、Widget

3. **绑定资源**
   - 根据 `asset-manifest.json` 中 `status: ready` 的资产
   - MCP: `set-property` — 用 `spriteFrameUuid` 绑定 Sprite.spriteFrame

4. **挂载脚本**
   - MCP: `add-component` — 在根节点挂载 `PageComp.ts`
   - 自动关联 `@property` 引用到对应节点

5. **保存 Prefab**
   - MCP: `save-prefab` — 保存为 `assets/resources/prefabs/<page-name>.prefab`

### 3.3 美术资源 Prompt 清单（art-prompts.md）

Phase 3 在生成 `design.md` 和 `asset-manifest.json` 的同时，还必须生成 `assets/art-prompts.md`，为 AI 绘图工具（Midjourney / Stable Diffusion / DALL·E 等）提供精确的 Prompt，用于生成该界面所需的全部切图资源。

#### 文件位置

```
design-dna/components/<page-name>/assets/art-prompts.md
```

#### 生成规则

1. **风格基调**：开篇定义统一风格（世界观、色系、质感、背景要求），确保所有资源视觉一致
2. **逐资源列表**：为 `asset-manifest.json` 中每个需要生成的图片资源提供独立 Prompt，包含：
   - 输出文件名 + 尺寸 + 格式（对齐 asset-manifest.json 中的定义）
   - 绑定节点（对齐 design.md 第4章节点树）
   - 视觉描述 Prompt（中文说明 + 英文 Prompt，英文用于 AI 绘图工具输入）
   - 重要注意事项（透明背景、平铺需求、配色约束等）
3. **输出目标目录**：标注生成后图片应放入的项目路径（如 `assets/resources/textures/<page-name>/`）
4. **与 asset-manifest.json 一致性**：art-prompts.md 中的资源 ID 和文件名必须与 asset-manifest.json 完全匹配
5. **可代码生成标注**：对于简单的纯色/渐变/几何形状等可通过代码生成的资源，标注 `[可代码生成]`，并提供代码生成方案

#### 与工作流的关系

```
Phase 3 产出:
  design.md ──────────→ 定义节点树和视觉规范
  asset-manifest.json ─→ 定义资源 ID、尺寸、绑定关系
  art-prompts.md ──────→ 为每个资源提供 AI 绘图 Prompt
                              ↓
                     用户拿 Prompt 去 AI 工具生成图片
                              ↓
                     放入项目目录（如 assets/resources/textures/<page>/）
                              ↓
                     MCP 绑定 Sprite → asset-manifest 状态更新为 ready
```

---

### 3.4 代码生成规范

Phase 3 生成两个代码文件：

#### PageComp.ts（Prefab 组件脚本）

将 DNA 的组件映射为 Cocos `@property` 声明：

```typescript
// 自动生成 — 节点属性绑定
// DNA 来源: design-dna.json + design.md 第4章

import { _decorator, Component, Node, Label, Sprite, Button } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PageNameComp')
export class PageNameComp extends Component {
    // ═══ 背景层（DNA: color.surface.background）═══
    @property(Sprite) bgSprite: Sprite = null!;

    // ═══ 内容层（DNA: typography + components）═══
    @property(Label) titleLabel: Label = null!;
    @property(Label) subtitleLabel: Label = null!;

    // ═══ 按钮（DNA: components.button_style）═══
    @property(Button) primaryBtn: Button = null!;
    @property(Sprite) primaryBtnBg: Sprite = null!;
    @property(Label) primaryBtnLabel: Label = null!;

    // ═══ 动效节点（DNA: visual_effects）═══
    @property(Node) particleLayer: Node = null!;

    // ... 根据实际节点树生成
}
```

#### Renderer.ts（渲染器逻辑脚本）

将 DNA 的设计决策转化为运行时逻辑：

```typescript
// 自动生成 — 渲染器逻辑
// DNA 来源: design-dna.json 全部三个维度

import { Color, tween, Vec3 } from 'cc';

export class PageNameRenderer extends BaseRenderer {

    // ═══ DNA Dimension 1: design_system tokens ═══
    private readonly COLORS = {
        primary: new Color().fromHEX('#...'),     // ← DNA: color.primary.hex
        secondary: new Color().fromHEX('#...'),   // ← DNA: color.secondary.hex
        accent: new Color().fromHEX('#...'),      // ← DNA: color.accent.hex
    };

    private readonly MOTION = {
        easing: 'quadOut',                         // ← DNA: motion.easing
        micro: 0.15,                               // ← DNA: motion.duration_scale.micro
        normal: 0.3,                               // ← DNA: motion.duration_scale.normal
        macro: 0.6,                                // ← DNA: motion.duration_scale.macro
    };

    // ═══ DNA Dimension 2: design_style 主观决策 ═══
    // mood: ["dark", "mysterious"] → 暗色调主题
    // microinteraction_density: "moderate" → 中等密度交互反馈

    onInit(): void {
        // 初始化颜色（Dimension 1: color tokens）
        this.comp.bgSprite.color = this.COLORS.primary;
        this.comp.titleLabel.color = this.COLORS.accent;

        // 初始化动态效果（Dimension 3: visual_effects）
        this.initParticles();     // ← DNA: particle_systems
        this.initAnimations();    // ← DNA: background_effects + motion
    }

    onShow(): void {
        // 入场动画（Dimension 1: motion.entrance_pattern）
        this.playEntranceSequence();
    }

    onUpdate(dt: number): void {
        // 驱动粒子/动画帧更新（Dimension 3）
        this.updateParticles(dt);
    }

    // ═══ DNA Dimension 3: visual_effects 实现 ═══
    private initParticles(): void {
        // DNA: particle_systems.enabled = true
        // DNA: particle_systems.params.count/color/speed → 粒子参数
    }

    private initAnimations(): void {
        // DNA: background_effects.type = "gradient-animation"
        // → cc.tween() 驱动颜色渐变循环
    }
}
```

### 3.5 ThemeConfig 集成

DNA 的 `design_system` tokens 不仅写入 Renderer，还同步写入项目级 `ThemeConfig.ts`，确保跨页面一致性：

```
design-dna.json                    ThemeConfig.ts
┌─────────────────┐               ┌──────────────────────┐
│ color.primary   │ ──────────→  │ COLORS.primary       │
│ color.secondary │ ──────────→  │ COLORS.secondary     │
│ typography.*    │ ──────────→  │ FONT_SIZES.*         │
│ spacing.*       │ ──────────→  │ SPACING.*            │
│ motion.*        │ ──────────→  │ MOTION.*             │
│ components.*    │ ──────────→  │ BUTTON_STYLES.*      │
└─────────────────┘               └──────────────────────┘
         ↑                                  ↑
   唯一真相源 (SSOT)                各 Renderer 从此读取
```

**design-dna.json 是唯一真相源**，ThemeConfig.ts 是运行时读取层，两者必须同步。

---

## 输入要求

Agent 开始前必须确认以下输入：

| 必填项 | 说明 |
|--------|------|
| **UI 图片** | 至少 1 张截图/设计稿（可以是多个状态） |
| **页面名称** | 英文标识符，如 `main-menu`、`char-select`、`battle-ui` |
| **中文名称** | 如 "主菜单"、"角色选择界面" |

| 选填项 | 说明 | 默认值 |
|--------|------|--------|
| **设计分辨率** | Canvas 尺寸 | 从项目 design-dna.json 读取，或默认 1920×1080 |
| **额外交互说明** | 用户补充的交互逻辑 | 从图片推断 |

### ⚡ 动态效果确认（重要）

**静态截图无法完整表达动态效果。** Agent 在分析完图片后，**必须主动询问用户**：

> 💡 我注意到这个界面可能包含以下动态效果（从截图中推断）。
> 请确认哪些需要支持，并补充我无法从静态图中看到的效果：
>
> 1. **粒子效果** — 如烟雾、飘雪、火花、光点、雨滴等
> 2. **持续旋转/摆动动画** — 如齿轮旋转、时钟指针、钟摆效果
> 3. **背景动效** — 如缓慢平移、亮度呼吸、云层流动
> 4. **入场/过渡动画** — 如元素渐显、滑入、缩放出场
> 5. **交互反馈动效** — 如按钮悬停发光、按下缩放、点击波纹
> 6. **其他动态效果** — 请补充描述
>
> 如果不确定，我会在文档中标注可选的动态效果建议。

Agent 根据用户回答，将动态效果写入第 7.4 节和第 8 章（动态效果规范）。

---

## 项目设计系统（design-dna.json）

### 概念

每个项目在 `design-dna/` 目录下维护自己的设计系统，这些是调用本技能的**生成物**，不属于技能本身：

```
<project-root>/design-dna/
├── design-dna.json          ← 项目级 SSOT（唯一真相源）
├── design-tokens.css        ← CSS 变量版本（辅助预览）
├── asset-manifest.schema.json ← 资产清单 JSON Schema
├── components/              ← 各界面的设计规范
│   ├── main-menu/
│   │   ├── design.md        ← UI 结构协议文档
│   │   ├── asset-manifest.json
│   │   ├── assets/
│   │   │   └── art-prompts.md ← AI 绘图 Prompt 清单
│   │   └── references/      ← 参考图归档
│   └── <other-page>/
└── README.md                ← 设计系统索引
```

### 首次使用工作流

如果项目没有 `design-dna/design-dna.json`：

1. 读取 [references/design-dna-schema.md](references/design-dna-schema.md) 获取三维度 JSON Schema
2. 从用户提供的参考图中**提取设计系统**，生成项目的 `design-dna.json`
3. 同步生成 `design-tokens.css` 和 `README.md`
4. 然后进入正常的 UI 分析流程

### 已有设计系统

如果项目已有 `design-dna/design-dna.json`：

1. 读取该文件作为设计约束
2. 读取 `design-dna/components/` 中已有文档作为风格基线
3. 新界面的设计必须与已有设计系统保持一致

---

## 输出规范

Agent 输出一份 **UI 结构协议文档**（Markdown），保存到：
`design-dna/components/<page-name>/design.md`

文档 **必须** 包含以下 **8 个章节**（比原来多了第 8 章动态效果规范）：

---

### 第1章：设计概述

- 页面功能/用途、视觉目标、在游戏/应用流中的位置
- 状态标记：🔨 设计中 / ✅ 已实施
- 设计来源：参考图文件名
- 设计分辨率

---

### 第2章：整体布局（ASCII 线框图）

绘制 ASCII 线框图，展示所有可见元素及其位置关系。

**要求**：
- 所有可见元素必须出现在线框图中
- 标注视觉特征（颜色、尺寸、透明度）
- 层级关系清晰

---

### 第3章：视觉层级树

从底到顶列出视觉层：

```
第1层（底）：背景层
  - 元素及描述

第2层（中）：装饰层
  - 元素及描述

第3层（顶）：内容层
  - 元素及描述
```

---

### 第4章：Cocos 节点树（Prefab 结构）

这是 **核心输出**。定义完整的 Cocos Creator 节点树。

详细的节点命名规范和格式要求见 → [references/node-spec.md](references/node-spec.md)

关键原则：
- PascalCase 命名
- 每个节点标注组件类型、UITransform 尺寸、位置、颜色
- 所有 Label 节点必须有中英双语文本和字号
- 节点名是 Prefab 与 Renderer 代码的唯一契约，命名后不可随意更改

---

### 第5章：元素设计详述

使用 TypeScript 伪代码格式详述每个元素的设计参数。

包括：
- 背景层：渐变/颜色/图片参数
- 装饰层：位置/尺寸/旋转/透明度
- 内容层：文字样式/颜色/对齐
- 按钮：**完整的交互状态**（默认 / 悬停 / 按下 / 禁用）

---

### 第6章：资源切图表

列出实现所需的所有图片资源。详细格式见 → [references/node-spec.md](references/node-spec.md)

**命名规则**：`bg_*` 背景 / `icon_*` 图标 / `btn_*` 按钮 / `char_*` 角色 / `frame_*` 边框 / `fx_*` 特效

---

### 第6.5章：资产绑定协议 (Asset Binding Protocol)

同时生成 `design-dna/components/<page-name>/asset-manifest.json`。

详细 Schema 和状态机说明见 → [references/asset-binding.md](references/asset-binding.md)

核心概念：
- 每个 Sprite 节点的图片资源都必须在 manifest 中有对应条目
- 状态机：`missing` → `exists` → `ready`
- MCP 绑定时始终使用 `spriteFrameUuid`

---

### 第7章：交互逻辑与状态

包括：
- **点击区域定义** — 节点名、点击行为、反馈效果
- **入场动画序列** — 延迟、持续时间、起始/结束状态
- **页面跳转** — 触发条件、当前/目标页面、过渡方式
- **持续动画概要** — 引用第8章中的详细定义

---

### 第8章：动态效果规范（Particle & Animation Spec）

**本章是动态效果的完整规范**，解决静态截图无法表达动效的问题。

Agent 必须根据用户确认的动态效果需求，为每个效果输出以下结构：

#### 8.1 粒子系统规范

每个粒子效果使用以下模板：

```typescript
interface ParticleSpec {
  /** 效果唯一标识（对应节点名） */
  id: string;                    // 如 "SteamParticles", "RainDrops", "SnowFlakes"
  /** 效果描述 */
  description: string;           // 如 "蒸汽朋克风格的金铜色光点粒子"

  /** 粒子容器 */
  container: {
    nodeName: string;            // 节点名，PascalCase
    parentNode: string;          // 父节点名
    siblingIndex: number;        // 在兄弟节点中的层级（0=最底）
    size: { width: number; height: number }; // 容器尺寸
  };

  /** 粒子属性 */
  particle: {
    count: number;               // 粒子总数
    shape: 'circle' | 'square' | 'sprite'; // 粒子形状
    sizeRange: [number, number]; // 最小~最大尺寸 (px)
    colorPalette: string[];      // 颜色数组 (HEX)
    opacity: {
      initial: number;           // 初始透明度 (0~255)
      fadeIn: number;            // 淡入到的透明度
      fadeOut: number;           // 淡出到的透明度
    };
  };

  /** 运动参数 */
  motion: {
    type: 'rise' | 'fall' | 'float' | 'orbit' | 'custom';
    speed: { min: number; max: number }; // 移动速度 (px/s)
    direction: { x: number; y: number }; // 主方向向量
    wobble?: {                   // 可选：左右/上下摆动
      amplitude: number;         // 摆动幅度 (px)
      frequency: number;         // 摆动频率 (Hz)
    };
    rotation?: {                 // 可选：旋转
      speed: number;             // 旋转速度 (deg/s)
      randomDirection: boolean;  // 是否随机方向
    };
  };

  /** 生命周期 */
  lifecycle: {
    duration: [number, number];  // 生命时长范围 (秒)
    spawnRate: number;           // 每秒新生粒子数（0=预生成全部）
    fadeInDuration: number;      // 淡入时长 (秒)
    fadeOutDuration: number;     // 淡出时长 (秒)
    respawn: boolean;            // 是否循环重生
  };

  /** 性能与降级 */
  performance: {
    gpuParticle: boolean;        // 是否使用GPU粒子（Cocos ParticleSystem2D）
    programmatic: boolean;       // 是否程序化实现（用Sprite模拟）
    lodLevels?: {                // 可选：性能分级
      high: number;              // 高配粒子数
      medium: number;            // 中配粒子数
      low: number;               // 低配粒子数（0=关闭）
    };
    disableOnLowEnd: boolean;    // 低端设备是否自动关闭
  };
}
```

#### 8.2 持续动画规范

每个持续动画效果使用以下模板：

```typescript
interface ContinuousAnimationSpec {
  /** 动画唯一标识 */
  id: string;                    // 如 "ClockHands", "GearRotation", "PendulumSwing"
  /** 描述 */
  description: string;

  /** 目标节点 */
  target: {
    nodeName: string;            // 节点名
    parentNode: string;          // 父节点名
    siblingIndex: number;
  };

  /** 动画类型与参数 */
  animation: {
    type: 'rotation' | 'translation' | 'scale' | 'opacity' | 'composite';
    params: {
      // rotation 类型
      rotationSpeed?: number;    // 度/秒
      rotationAxis?: 'z';        // Cocos 2D 仅支持 z 轴

      // translation 类型
      translateRange?: { x: [number, number]; y: [number, number] };
      translateDuration?: number;

      // scale 类型
      scaleRange?: [number, number];
      scaleDuration?: number;

      // opacity 类型
      opacityRange?: [number, number]; // 0~255
      opacityDuration?: number;

      // 通用
      easing?: string;           // 缓动函数
      loop?: boolean;
      pingPong?: boolean;        // 是否来回
    };
  };

  /** 子元素（如时钟包含多个指针） */
  children?: Array<{
    nodeName: string;
    shape: { width: number; height: number };
    color: string;
    pivotOffset: { x: number; y: number };
    animationOverride: Partial<ContinuousAnimationSpec['animation']>;
  }>;
}
```

#### 8.3 背景动效规范

```typescript
interface BackgroundEffectSpec {
  id: string;
  type: 'breathing' | 'parallax' | 'pan' | 'color-shift';
  target: string;                // 目标节点名
  params: {
    property: string;            // 'brightness' | 'opacity' | 'position' | 'color'
    range: [number, number];
    duration: number;            // 周期时长 (秒)
    easing: string;
  };
}
```

#### 8.4 动态效果总表

| 效果ID | 类型 | 目标节点 | 描述 | 性能等级 | 可选/必需 |
|--------|------|----------|------|----------|-----------|
| (列出所有动态效果) | particle / animation / background | (节点名) | (简述) | low/medium/high | 必需/可选 |

---

## 代码生成接口协议

Phase 3 生成的代码文件必须遵循以下接口协议：

### PageComp.ts（Prefab 组件脚本）

节点树中每个节点在 PageComp.ts 中有对应的 `@property` 引用：

| 节点组件类型 | @property 类型 | DNA 来源 |
|-------------|---------------|----------|
| `[Node]` | `@property(Node)` | 容器/动效层节点 |
| `[Label]` | `@property(Label)` | DNA: typography 映射 |
| `[Sprite]` | `@property(Sprite)` | DNA: color.surface / imagery |
| `[Button]` | `@property(Button)` | DNA: components.button_style |
| `[EditBox]` | `@property(EditBox)` | DNA: components.input_style |

### Renderer.ts（渲染器逻辑脚本）

继承 `BaseRenderer`，实现 `onInit()` / `onShow()` / `onHide()` / `onUpdate()`。

**DNA 数据驱动原则**：Renderer 中的所有颜色、字号、间距、动画参数必须**可追溯到 DNA JSON**：
- 颜色 → `design-dna.json` → `color.*`
- 字号 → `design-dna.json` → `typography.type_scale.*`
- 动画时长/缓动 → `design-dna.json` → `motion.*`
- 粒子参数 → `design-dna.json` → `visual_effects.particle_systems.params`

**节点名一致性规则**：Renderer 中按名查找的节点名 **必须** 与 design.md 第4章定义的节点名完全一致。
这是设计文档 → Prefab → Renderer 三者的唯一契约。

**动态效果实现**：Renderer 中的 `onInit()` 初始化第8章定义的粒子和动画，`onUpdate(dt)` 驱动帧更新。

> Phase 3 产出的完整文件清单见「Phase 3 产出物清单」章节。

---

## 执行工作流

Agent 收到用户请求后，按三阶段工作流执行。根据上下文判断从哪个阶段开始：

- **全新项目**：Phase 1 → 2 → 3（完整流程）
- **已有 DNA，新界面**：Phase 3（直接转换）
- **用户只想看 Schema**：仅 Phase 1

### Phase 1 执行步骤 `📦 design-dna skill`

> Agent 应加载 design-dna skill 并遵循其 Phase 1 指令执行。

1. **检查依赖**：确认项目已安装 `design-dna` 技能
2. **展示 Schema**：读取 [references/design-dna-schema.md](references/design-dna-schema.md)，向用户展示三维度结构
3. **询问定制**：问用户是否需要扩展或裁剪维度
4. **确认后进入 Phase 2**

### Phase 2 执行步骤 `📦 design-dna skill`

> Agent 应加载 design-dna skill 并遵循其 Phase 2 指令执行。

1. **收集输入**：确认用户提供了参考图/截图/URL
2. **分析图片**：
   - 识别所有可见元素及其类型（文字/按钮/图片/装饰/背景）
   - 估算位置、尺寸、颜色
   - 识别层级关系和交互区域
3. **逐字段提取**：为 Schema 中每个字段提取或推断值
4. **输出完整 DNA JSON**：每字段有值，不留空
5. **⚠️ 必须询问**：*"需要在进入生成阶段前调整任何值吗？"*
6. **用户确认后保存** `design-dna/design-dna.json`

### Phase 3 执行步骤 `🎮 cocos-dna 自有实现`

#### 步骤 1：读取设计约束

- 读取 `design-dna/design-dna.json`（Phase 2 产出的 SSOT）
- 读取 `design-dna/components/` 中已有文档作为风格基线
- 如有 `ThemeConfig.ts`，检查一致性

#### 步骤 2：确认输入

- 确认页面名称（英文标识符 + 中文名称）
- 确认设计分辨率
- 确认 UI 参考图/截图

#### 步骤 3：分析图片 → 匹配 DNA

1. 识别所有可见元素及其类型
2. 将图片元素匹配到 `design-dna.json` 中的颜色、字体、间距、圆角、动效参数

#### 步骤 4：询问动态效果

**⚠️ 关键步骤 — 不可跳过**

静态截图无法完整表达动态效果。Agent **必须**在分析完图片后主动询问用户：

1. 该界面是否有粒子效果（烟雾、雨滴、雪花、火花、光点等）
2. 是否有持续旋转/摆动的装饰元素（齿轮、时钟、钟摆等）
3. 是否有背景动效（缓慢平移、呼吸脉动、云层流动等）
4. 用户是否有其他动态效果需求

如果用户不确定，Agent 应根据游戏类型和视觉风格**建议合理的动态效果**，
并在文档中将其标注为"可选"。

#### 步骤 5：DNA → Cocos 组件映射

按 §3.1 映射表将 DNA 数据转换为 Cocos 组件定义：
1. 确定层级结构（背景/装饰/内容/动效）
2. 为每个元素分配 Cocos 节点和组件
3. 计算位置（基于设计分辨率，原点在屏幕中心）
4. 为动态效果分配专用层节点

#### 步骤 6：输出文档 + 代码

产出以下文件：

| # | 文件 | 路径 | 说明 |
|---|------|------|------|
| 1 | design.md | `design-dna/components/<page-name>/design.md` | 8 章 UI 结构协议文档 |
| 2 | asset-manifest.json | `design-dna/components/<page-name>/asset-manifest.json` | 资产绑定清单 |
| 3 | PageComp.ts | `assets/scripts/ui/<page-name>/<PageName>Comp.ts` | Prefab 组件脚本 |
| 4 | Renderer.ts | `assets/scripts/ui/<page-name>/<PageName>Renderer.ts` | 渲染器逻辑脚本 |

#### 步骤 7：MCP 创建 Prefab

按 §3.2 的 MCP 调用序列，在 Cocos 编辑器中自动创建节点树和 Prefab 文件。

#### 步骤 8：验证

运行输出验证清单（见下方）。

---

## Phase 3 产出物清单

Phase 3 完成后，应产出以下完整文件集：

| # | 产物 | 文件路径 | 来源阶段 | 说明 |
|---|------|---------|---------|------|
| 1 | Design DNA JSON | `design-dna/design-dna.json` | Phase 2 | 唯一真相源 (SSOT) |
| 2 | CSS Tokens（可选） | `design-dna/design-tokens.css` | Phase 2 | Web 预览辅助 |
| 3 | UI 结构协议文档 | `design-dna/components/<page>/design.md` | Phase 3 | 8章 Markdown |
| 4 | 资产绑定清单 | `design-dna/components/<page>/asset-manifest.json` | Phase 3 | Sprite UUID 映射 |
| 5 | AI 绘图 Prompt 清单 | `design-dna/components/<page>/assets/art-prompts.md` | Phase 3 | 美术资源生成指引 |
| 6 | Prefab 组件脚本 | `assets/scripts/ui/<page>/<Page>Comp.ts` | Phase 3 | @property 声明 |
| 7 | 渲染器脚本 | `assets/scripts/ui/<page>/<Page>Renderer.ts` | Phase 3 | DNA 驱动逻辑 |
| 8 | Prefab 文件 | `assets/resources/prefabs/<page>.prefab` | Phase 3 (MCP) | Cocos 编辑器创建 |
| 9 | ThemeConfig 更新 | `assets/scripts/config/ThemeConfig.ts` | Phase 3 | 全局 tokens 同步 |

### DNA 数据溯源要求

**每一行生成的代码都必须可追溯到 DNA JSON 中的具体字段。** 在代码注释中标注来源：

```typescript
// ← DNA: color.primary.hex
// ← DNA: typography.type_scale.heading_1.size
// ← DNA: motion.duration_scale.normal
// ← DNA: visual_effects.particle_systems.params.count
```

这确保了：
1. 修改 DNA JSON 时，能快速定位所有受影响的代码
2. 审查代码时，能验证每个值的正确性
3. 未来自动化工具可以解析注释实现 DNA → 代码的自动同步

---

## 输出验证清单

文档输出后，Agent 自检：

### 完整性
- [ ] 8 个章节全部输出
- [ ] ASCII 线框图包含所有可见元素
- [ ] 节点树覆盖所有需要的节点
- [ ] 每个 Label 有中英双语文本和字号
- [ ] 每个交互元素有状态定义
- [ ] 资源清单覆盖所有图片
- [ ] asset-manifest.json 已生成
- [ ] art-prompts.md 已生成（覆盖 asset-manifest 中所有需要的图片资源）
- [ ] **第8章动态效果规范已填写**（如无动效则明确标注"无"）

### 动态效果完备性
- [ ] 已询问用户动态效果需求
- [ ] 每个粒子效果有完整的 ParticleSpec
- [ ] 每个持续动画有完整的 ContinuousAnimationSpec
- [ ] 动态效果总表已填写
- [ ] 性能分级和降级策略已定义

### 设计一致性
- [ ] 颜色能在 design-dna.json 中找到对应
- [ ] 字号使用字体系统层级
- [ ] 间距遵循间距系统
- [ ] 动效使用动效系统值

### Cocos 可实现性
- [ ] PascalCase 命名
- [ ] 组件类型正确
- [ ] 位置基于设计分辨率
- [ ] Widget 配置合理

### i18n 双语
- [ ] 所有 Label 同时列出中文和英文
- [ ] 按钮文字预留不同长度空间

### Phase 3 DNA 驱动验证
- [ ] 每个颜色值可追溯到 `design-dna.json` → `color.*`
- [ ] 每个字号可追溯到 `design-dna.json` → `typography.type_scale.*`
- [ ] 每个动画参数可追溯到 `design-dna.json` → `motion.*`
- [ ] 代码注释中标注了 DNA 来源字段
- [ ] PageComp.ts 的 @property 覆盖节点树中所有需要运行时访问的节点
- [ ] Renderer.ts 的 COLORS/MOTION 常量与 ThemeConfig.ts 一致
- [ ] MCP 调用序列覆盖节点树中的所有节点
- [ ] Prefab 文件已保存到正确路径

---

## ⚠️ 项目隔离原则

**本技能不包含任何项目特定的设计内容。** Agent 使用本技能时必须遵守：

1. **不得复制示例内容** — `references/example-design.md` 仅展示文档格式，其中的颜色值、节点名、文本内容等都是占位符，绝不能直接用于任何项目
2. **不得跨项目复用设计** — 每个项目的 `design-dna.json` 和 `components/` 是独立的，分析新项目时必须从该项目自己的参考图和设计系统出发
3. **不得假设游戏类型** — 不同项目可能是卡牌游戏、RPG、射击游戏等，Agent 必须从用户输入中推断，不做预设

---

## 参考资料

本技能的详细规范拆分在 references/ 目录中，按需读取：

| 文件 | 用途 | 何时读取 |
|------|------|----------|
| [references/design-dna-schema.md](references/design-dna-schema.md) | 三维度设计系统 JSON Schema | 首次建立设计系统时 |
| [references/node-spec.md](references/node-spec.md) | 节点命名规范、节点信息格式、资源切图表格式 | 构建第4/6章时 |
| [references/asset-binding.md](references/asset-binding.md) | 资产绑定协议、Schema、状态机 | 生成第6.5章时 |
| [references/example-design.md](references/example-design.md) | 通用格式示例（仅供参考格式，不可复制内容） | 理解输出格式时 |

---

## 🚨 Cocos 技术栈开发约束（通用 Agent 规则）

> **本章节适用于所有在 Cocos Creator 项目中工作的 AI Agent（包括但不限于 openspec、通用 coding agent、任务规划 agent 等）。**
> 无论 Agent 处于何种工作模式（代码生成、任务规划、需求分析、测试编写），都必须遵守以下约束。

### 核心原则：Cocos Creator 项目中禁止使用 Web 技术栈

**Cocos Creator 不是 Web 前端框架。** 虽然 Cocos Creator 使用 TypeScript 编写脚本，但它的渲染管线、组件模型、资源系统和交互系统与 Web 前端（HTML/CSS/DOM）完全不同。Agent 在 Cocos 项目中工作时，**必须始终使用 Cocos Creator 原生 API 和组件**，绝不能混入 Web 前端技术。

### 禁止清单

以下技术在 Cocos Creator 项目的**运行时代码**中**绝对禁止使用**：

| ❌ 禁止 | ✅ Cocos 替代方案 | 说明 |
|---------|------------------|------|
| HTML `<div>`, `<span>`, `<button>` 等 DOM 元素 | `cc.Node` + `cc.Sprite` / `cc.Label` / `cc.Button` | Cocos 不渲染 DOM |
| CSS 样式 / CSS-in-JS / Tailwind / styled-components | `cc.Color` / `UITransform` / `cc.Widget` / `cc.Layout` | 样式通过组件属性设置 |
| `document.*` / `window.*` / DOM API | `cc.find()` / `cc.director` / `cc.sys` | Cocos 有自己的全局 API |
| React / Vue / Angular / Svelte 等 Web 框架 | Cocos 原生组件系统 (`@ccclass` + `Component`) | Cocos 使用 ECS-like 架构 |
| `addEventListener` / DOM 事件 | `node.on()` / `cc.Button` + `cc.EventHandler` | Cocos 有自己的事件系统 |
| `fetch()` / `XMLHttpRequest` / axios | `cc.assetManager.loadRemote()` / `cc.resources.load()` | 资源通过 Asset Manager 加载 |
| CSS Flexbox / Grid | `cc.Layout` (HORIZONTAL / VERTICAL / GRID) | 布局通过 Layout 组件 |
| CSS `position: absolute/relative` | `cc.Widget` (对齐) + `UITransform` (锚点/尺寸) | 定位通过 Widget 和 Transform |
| CSS `@keyframes` / `transition` | `cc.tween()` / `cc.Animation` | 动画通过 Tween 或动画组件 |
| `<canvas>` 2D Context 直接操作 | `cc.Graphics` / `cc.Sprite` / `cc.RenderTexture` | Cocos 封装了底层渲染 |
| `<img>` / `<video>` / `<audio>` HTML 标签 | `cc.Sprite` / `cc.VideoPlayer` / `cc.AudioSource` | 使用 Cocos 媒体组件 |
| npm 的 Web UI 库（antd, element-ui 等） | 自定义 Cocos UI 组件 | Web UI 库无法在 Cocos 中运行 |
| `localStorage` / `sessionStorage` | `cc.sys.localStorage` | Cocos 封装了存储 API |

### 任务规划约束

当 Agent 为 Cocos Creator 项目**生成执行计划、任务列表、实现方案**时（无论使用 openspec 还是其他规划工具），必须遵守：

1. **UI 实现任务** — 所有 UI 界面的实现必须使用 Cocos Creator 组件（`Node`, `Sprite`, `Label`, `Button`, `Layout`, `Widget`, `ScrollView` 等），不得规划为 HTML/CSS/JS 实现
2. **动画任务** — 动画效果必须使用 `cc.tween()` 或 `cc.Animation`，不得规划为 CSS 动画或 Web 动画 API
3. **布局任务** — 布局必须使用 `cc.Layout` + `cc.Widget`，不得规划为 Flexbox/Grid
4. **数据存储任务** — 本地数据存储必须使用 `cc.sys.localStorage` 或项目自有的存储层，不得使用原生 DOM Storage API
5. **资源加载任务** — 图片/音频/预制体等资源加载必须使用 `cc.resources.load()` 或 `cc.assetManager`，不得使用 `fetch()` 或 DOM API
6. **测试任务** — 单元测试可以使用 Jest 等标准 Node.js 测试框架（测试代码运行在 Node 环境），但被测代码中的 Cocos API 需要被正确 mock

### 代码生成约束

当 Agent 为 Cocos Creator 项目**编写或修改代码**时：

1. **脚本文件** — 必须使用 `@ccclass` 装饰器和 `Component` 基类，遵循 Cocos Creator 脚本规范
2. **节点查找** — 使用 `cc.find()` / `node.getChildByName()` / `@property` 绑定，不得使用 `document.querySelector()`
3. **颜色设置** — 使用 `new cc.Color().fromHEX()` 或 `cc.Color` 常量，不得使用 CSS 颜色字符串
4. **尺寸设置** — 通过 `UITransform.setContentSize()` 设置，不得使用 CSS `width`/`height`
5. **事件处理** — 使用 `node.on(cc.Node.EventType.TOUCH_END, ...)` 或 `cc.Button` 组件，不得使用 DOM 事件
6. **定时器** — 使用 `this.schedule()` / `this.scheduleOnce()` / `cc.tween()`，不得使用 `setTimeout`/`setInterval`（测试代码除外）
7. **生命周期** — 使用 Cocos 组件生命周期（`onLoad`, `start`, `update`, `onDestroy`），不得使用 DOM 生命周期

### 例外情况

以下场景允许使用部分 Web API（需明确注释说明原因）：

| 场景 | 允许的 Web API | 条件 |
|------|---------------|------|
| **构建脚本 / 工具脚本** | 任意 Node.js API | 仅限 `tools/` 目录下的构建/辅助脚本 |
| **单元测试** | Jest / Node.js 标准库 | 测试在 Node 环境运行，需 mock Cocos API |
| **编辑器插件** | Cocos 编辑器扩展 API | 仅限 `extensions/` 目录 |
| **原生平台桥接** | `cc.native.bridge` | 与 Android/iOS 原生层通信 |
| **WebSocket 通信** | `WebSocket` | Cocos 支持标准 WebSocket |

### Agent 自检规则

Agent 在提交代码或执行计划前，必须自检：

- [ ] 运行时代码中是否引用了 `document` / `window` / DOM API？ → **如果是，必须替换为 Cocos API**
- [ ] 是否使用了 CSS 样式字符串或 CSS 类名？ → **如果是，必须替换为 Cocos 组件属性**
- [ ] UI 实现方案是否基于 HTML/DOM 渲染？ → **如果是，必须重写为 Cocos 节点树 + 组件**
- [ ] 是否导入了 Web 前端框架或 Web UI 库？ → **如果是，必须移除并使用 Cocos 原生方案**
- [ ] 任务计划中是否包含 "创建 HTML 文件" / "编写 CSS" / "使用 React/Vue" 等步骤？ → **如果是，必须修正为 Cocos 技术栈**
