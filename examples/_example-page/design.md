# 格式示例：UI 结构协议文档（design.md）

> ⚠️ **本文件仅展示 `cocos-dna/components/<page>/design.md` 的标准格式，不代表任何真实项目。**
> 所有颜色值、节点名、文本内容均为**占位符示例**，Agent 使用本技能时**禁止**直接复制这些值。
> 实际项目的设计参数必须来自该项目的 `design-dna.json`（全局 token）和用户提供的参考图。
>
> **数据边界**：`design.md` 是每个 UI 页面设计数据的**唯一存储位置**。
> 页面的 layout、components、animations、particles 等详细设计数据**只写在此文档中**，
> **不得**写入 `design-dna.json`（后者仅含全局 token + 页面轻量索引）。

---

## 第1章：设计概述

**页面名称**：`<page-name>`（中文：<中文页面名>）
**页面定位**：<页面在游戏流中的功能定位描述>
**视觉目标**：<从参考图分析得出的视觉目标描述>
**游戏流位置**：启动 → <上一界面> → **<本界面>** → <下一界面>

**状态**：🔨 设计中
**设计分辨率**：<宽> × <高>（横屏，原点在屏幕中心）
**设计依据**：
- `cocos-dna/design-dna.json` — 全局设计 token SSOT（色彩/字体/间距/动效/风格）
- 本文档 — 页面级设计数据的唯一存储位置
- <其他参考来源（参考图等）>

**设计原则**：
1. **<原则1>** — <说明>
2. **<原则2>** — <说明>
3. **<原则3>** — <说明>

---

## 第1.5章：参考图与设计溯源

> 📁 参考图存放路径：`cocos-dna/components/<page-name>/references/`

### 参考图列表

| # | 缩略引用 | 文件 | 设计影响 |
|---|---------|------|---------|
| 1 | ![ref-01](references/ref-01_<描述>.png) | `ref-01_<描述>.png` | **核心灵感来源**：<从此图学到的设计要素> |
| 2 | ![ref-02](references/ref-02_<描述>.png) | `ref-02_<描述>.png` | **风格定调**：<颜色/质感/布局等> |

### 设计决策追踪

| 设计决策 | 来源参考 | 说明 |
|---------|---------|------|
| <决策描述> | ref-01 | <为什么做这个选择> |
| <决策描述> | ref-02 | <理由> |

---

## 第2章：整体布局（ASCII 线框图）

```
┌─────────────────────────────────────────────┐
│                                             │
│     <顶部元素描述>                            │
│     Position: (x, y)                        │
│                                             │
│         ┌───────────────┐                   │
│         │  <标题/主内容>  │                   │
│         └───────────────┘                   │
│                                             │
│     ┌──────┐        ┌──────┐               │
│     │<按钮A>│        │<按钮B>│               │
│     └──────┘        └──────┘               │
│                                             │
│  <左下角元素>              <右下角元素>        │
│                                             │
└─────────────────────────────────────────────┘
```

### 布局要点

| 要素 | 定位方式 | 说明 |
|------|---------|------|
| 背景 | Widget LRTB=0 | 全屏 Sprite |
| <标题组> | Position (0, <y>) | 屏幕上部居中 |
| <按钮区> | Position (0, <y>) | 屏幕下部居中 |

---

## 第3章：视觉规范

### 3.1 色彩规范

| 用途 | 色值 | DNA 引用 | 说明 |
|------|------|---------|------|
| 背景底色 | <#HEX> | color.surface.background | <说明> |
| 主色 | <#HEX> | color.primary | <标题/高亮/交互元素> |
| 辅色 | <#HEX> | color.secondary | <次要信息/边框> |
| 文字-亮色 | <#HEX> | — | <主文字> |
| 文字-暗色 | <#HEX> | — | <辅助信息> |

### 3.2 字体规范

| 用途 | 字体 | 大小 | 粗细 | 颜色 |
|------|------|------|------|------|
| 主标题 | <字体族> | <N>px | <weight> | <#HEX> |
| 按钮文字 | <字体族> | <N>px | <weight> | <#HEX> |
| 辅助信息 | <字体族> | <N>px | <weight> | <#HEX> |

### 3.3 尺寸规范（如有特殊元素）

| 元素类型 | 尺寸 | 说明 |
|---------|------|------|
| <元素A> | <W>×<H> | <用途> |
| <元素B> | <W>×<H> | <用途> |

### 3.4 动效规范

| 动效 | 触发条件 | 参数 | 说明 |
|------|---------|------|------|
| <入场动画> | show() | duration 0.3s, ease: quadOut | <描述> |
| <悬停效果> | TOUCH_START | scale: 1→1.05, duration 0.15s | <描述> |
| <装饰旋转> | 常驻 | 30-40秒/圈 | <描述> |

---

## 第4章：Cocos 节点树

> **Prefab 路径**：`assets/resources/prefabs/pages/<PageName>Page.prefab`
> **组件脚本**：`<PageName>PageComp.ts`（挂载到根节点）
> **渲染器**：`<PageName>Renderer.ts`（extends BaseRenderer）
> **设计分辨率**：<宽> × <高>（原点屏幕中心）

```
<PageName>Page (root) [Node] [UITransform: <宽>x<高>] [Widget: LRTB=0]
│ 描述: <页面描述>根节点，全屏铺满 Canvas
│ 组件: <PageName>PageComp, Widget(LRTB=0)
│
├── BG [Sprite] [UITransform: <宽>x<高>] [Widget: LRTB=0]
│   描述: 全屏背景 — <背景描述>
│   SpriteFrame: <资源名>.png
│   Color: <#HEX>  ← DNA: color.surface.background
│   SizeMode: CUSTOM
│
├── <DecoElement>_TL [Sprite] [UITransform: <W>x<H>]
│   描述: <装饰元素描述>
│   Position: (<x>, <y>)
│   Color: <#HEX>  ← DNA: color.primary
│   Opacity: <0-255>
│   SpriteFrame: <资源名>.png
│   动画: <旋转/呼吸等>, <参数>
│
├── TitleGroup [Node] [UITransform: auto]
│   Position: (0, <y>)
│   │
│   ├── GameTitle [Label] [UITransform: auto]
│   │   描述: <标题描述>
│   │   String: CN="<中文标题>" / EN="<English Title>"
│   │   FontSize: <字号>
│   │   Color: <#HEX>  ← DNA: color.primary
│   │
│   └── GameSubtitle [Label] [UITransform: auto]
│       描述: <副标题描述>
│       String: CN="<中文副标题>" / EN="<English Subtitle>"
│       FontSize: <字号>
│       Color: <#HEX>
│
├── ButtonGroup [Node] [UITransform: auto]
│   Position: (0, <y>)
│   │
│   ├── PrimaryBtn [Node] [UITransform: <W>x<H>] [Button]
│   │   描述: 主按钮
│   │   │
│   │   ├── PrimaryBtn_BG [Sprite] [UITransform: <W>x<H>]
│   │   │   Color: <#HEX>
│   │   │
│   │   └── PrimaryBtn_Label [Label]
│   │       String: CN="<中文按钮文字>" / EN="<English Button Text>"
│   │       FontSize: <字号>
│   │       Color: <#HEX>
│   │
│   └── SecondaryBtn [Node] [UITransform: <W>x<H>] [Button]
│       描述: 次要按钮
│       │
│       ├── SecondaryBtn_BG [Sprite] [UITransform: <W>x<H>]
│       │   Color: <#HEX>
│       │
│       └── SecondaryBtn_Label [Label]
│           String: CN="<中文>" / EN="<English>"
│           FontSize: <字号>
│           Color: <#HEX>
│
└── VersionLabel [Label] [Widget: bottom=<n>, right=<n>]
    String: "v<版本号>"
    FontSize: <字号>
    Color: <#HEX>
```

---

## 第5章：元素设计详述

使用 Cocos API 伪代码格式（**禁止 CSS 属性**）：

```typescript
// 全局色彩 token 来自 design-dna.json，页面级组件状态在本 design.md 定义
primaryButtonStates: {
  default: {
    bgColor: '<design-dna.json → color.primary.hex>',    // Sprite.color（引用全局 token）
    labelColor: '<design-dna.json → color.accent.hex>',   // Label.color（引用全局 token）
    scale: new Vec3(1, 1, 1),                              // Node.scale
  },
  hover: {
    bgColor: '<悬停色>',
    labelColor: '<悬停文字色>',
    scale: new Vec3(1.02, 1.02, 1),                       // tween → Node.scale
  },
  active: {
    scale: new Vec3(0.95, 0.95, 1),                       // tween → Node.scale
  },
  disabled: {
    opacity: 128,                                          // Node.opacity (0-255)
    bgColor: '<禁用色>',
    labelColor: '<禁用文字色>',
  }
}
```

> **注意**：`transform`、`translateY`、`boxShadow` 等 CSS 属性在 Cocos 中**不存在**。
> 对应关系：位移 → `tween(node).to(dur, {position: ...})`，缩放 → `Node.scale`，
> 透明度 → `Node.opacity (0-255)`，阴影 → 额外 Sprite 节点偏移模拟。

---

## 第6章：资源切图清单

### 6.1 资源清单

> 列出本页面使用的所有图片资源（文件名、尺寸、格式）。
> **路径、loadType、assetPath 等信息以 `asset-manifest.json` 为唯一权威来源，此处不重复。**

| # | 资源名称 | 文件名 | 尺寸 | 格式 | 九宫格 | 说明 |
|---|---------|--------|------|------|--------|------|
| 1 | 背景图 | `<bg_name>.png` | <W>x<H> | PNG | 否 | <说明> |
| 2 | 装饰齿轮 | `<gear_name>.png` | <W>x<H> | PNG | 否 | 复用 main-menu |
| 3 | 主按钮背景 | `<btn_name>.png` | <W>x<H> | PNG | 是 `{T:N,B:N,L:N,R:N}` | <说明> |

### 6.2 @property 映射表

> **组件脚本**：`<PageName>PageComp.ts`，挂载到 Prefab 根节点 `<PageName>Page`。
> 下表列出所有需要运行时访问的节点 → @property 声明。

| @property 名称 | 类型 | 对应节点路径 | 用途 |
|---------------|------|-------------|------|
| `titleLabel` | `Label` | `TitleGroup/GameTitle` | 主标题文字更新 |
| `subtitleLabel` | `Label` | `TitleGroup/GameSubtitle` | 副标题文字更新 |
| `primaryBtn` | `Node` | `ButtonGroup/PrimaryBtn` | 主按钮交互绑定 |
| `secondaryBtn` | `Node` | `ButtonGroup/SecondaryBtn` | 次要按钮交互绑定 |
| `bgSprite` | `Sprite` | `BG` | 背景图片/颜色控制 |
| `versionLabel` | `Label` | `VersionLabel` | 版本号动态更新 |

---

## 第7章：入场动画序列与页面跳转

### 入场动画序列

| # | 目标节点 | 延迟(ms) | 时长(ms) | 起始状态 | 结束状态 | 缓动 |
|---|---------|---------|---------|---------|---------|------|
| 1 | BG | 0 | 500 | opacity: 0 | opacity: 255 | linear |
| 2 | GameTitle | 300 | 800 | opacity: 0, y: +30 | opacity: 255, y: 0 | quadOut |
| 3 | GameSubtitle | 600 | 600 | opacity: 0 | opacity: 255 | quadOut |
| 4 | PrimaryBtn | 1000 | 400 | opacity: 0, y: -20 | opacity: 255, y: 0 | quadOut |
| 5 | SecondaryBtn | 1200 | 400 | opacity: 0, y: -20 | opacity: 255, y: 0 | quadOut |

### 页面跳转矩阵

| 触发元素 | 事件 | 当前页面 | 目标页面 | 过渡方式 |
|---------|------|---------|---------|---------|
| PrimaryBtn | TOUCH_END | `<page-name>` | `<target>` | fade 0.3s |
| SecondaryBtn | TOUCH_END | `<page-name>` | `<previous>` | fade 0.3s |

---

## 第8章：动态效果规范

### 8.1 动态效果总表

| 效果ID | 类型 | 目标节点 | 描述 | 性能等级 | 可选/必需 |
|--------|------|----------|------|----------|-----------|
| `<ParticleName>` | particle | `<LayerNode>` | <效果描述> | medium | 可选 |
| `<AnimName>` | animation | `<TargetNode>` | <旋转/呼吸等> | low | 必需 |

### 8.2 粒子系统示例

```typescript
// 格式示例 — 实际参数由用户需求和项目风格决定
// 完整接口定义见 → output-spec.md → ParticleSpec
const particleExample = {
  id: '<ParticleName>',
  description: '<效果描述>',
  container: { nodeName: '<LayerNode>', parentNode: '<PageName>Page', siblingIndex: 1 },
  particle: { count: '<20~50>', shape: 'circle', sizeRange: ['<min>', '<max>'],
              colorPalette: ['<从 design-dna.json 取色>'] },
  motion: { type: '<rise/fall/float>', speed: { min: '<N>', max: '<N>' } },
  lifecycle: { duration: ['<min>', '<max>'], respawn: true },
  performance: { programmatic: true, disableOnLowEnd: true }
};
```

### 8.3 持续动画示例

```typescript
// 格式示例 — 完整接口定义见 → output-spec.md → ContinuousAnimationSpec
const animExample = {
  id: '<AnimName>',
  description: '<动画描述>',
  target: { nodeName: '<TargetNode>', parentNode: '<PageName>Page' },
  animation: { type: 'rotation', params: { rotationSpeed: '<度/秒>', rotationAxis: 'z', loop: true } }
};
```

---

## ⚠️ 重要提醒

这只是**格式示例**。实际输出时：

1. **全局色彩/字体/动效 token** 必须引用项目的 `cocos-dna/design-dna.json`，不得使用本示例中的占位符
2. **页面级设计数据**（layout、components、animations、particles）只写在本 `design.md` 中，**不得写入** `design-dna.json`
3. **所有节点名** 必须根据实际项目界面内容命名
4. **所有文本内容** 必须来自用户需求和参考图分析
5. **所有尺寸/位置** 必须基于项目的设计分辨率计算
6. **所有动态效果** 必须经过用户确认后才写入第8章
7. **不同项目风格各异** — 不要假设游戏类型、视觉风格或交互模式
8. **每个颜色/尺寸注释** 必须标注 DNA 来源字段（如 `← DNA: color.primary`）
9. **交互状态** 必须使用 Cocos API（Node.scale / Node.opacity / tween），**禁止 CSS 属性**
10. **新增页面时** 只需在 `design-dna.json` 的 `pages` 索引中加一行轻量条目（page_name_cn + status + design_doc），完整设计在此文档中编写
