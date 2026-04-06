# 格式示例：UI 结构协议文档

> ⚠️ **本文件仅展示文档格式，不代表任何真实项目。**
> 所有颜色值、节点名、文本内容均为**占位符示例**，Agent 使用本技能时**禁止**直接复制这些值。
> 实际项目的设计参数必须来自该项目自己的 `design-dna.json` 和用户提供的参考图。

---

## 第1章示例：设计概述

| 属性 | 值 |
|------|-----|
| **页面名称** | `<page-name>`（中文：<中文页面名>） |
| **状态** | 🔨 设计中 |
| **设计分辨率** | <宽> × <高>（从项目 design-dna.json 读取） |
| **视觉目标** | <从参考图分析得出的视觉目标描述> |

---

## 第2章示例：整体布局（ASCII 线框图）

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

---

## 第4章示例：Cocos 节点树

```
<PageName>Page (root) [UITransform: <宽>x<高>] [Widget: LRTB=0]
│
├─ BG [Sprite] [UITransform: <宽>x<高>] [Widget: LRTB=0]
│    描述: <背景描述 — 从参考图分析>
│    Color: <从 design-dna.json 取值>
│
├─ <DecoElement> [Sprite/Label] [UITransform: <尺寸>]
│    描述: <装饰元素描述>
│    Position: (<x>, <y>)
│    Color: <从 design-dna.json primary/secondary/accent 取值>
│    Opacity: <0-255>
│
├─ TitleGroup [Node] [UITransform: auto]
│  │  Position: (0, <y>)
│  │
│  ├─ GameTitle [Label] [UITransform: auto]
│  │    文本: "<中文标题>" / "<English Title>"
│  │    FontSize: <字号>
│  │    Color: <颜色>
│  │
│  └─ GameSubtitle [Label] [UITransform: auto]
│       文本: "<中文副标题>" / "<English Subtitle>"
│       FontSize: <字号>
│       Color: <颜色>
│
├─ ButtonGroup [Node] [UITransform: auto]
│  │  Position: (0, <y>)
│  │
│  ├─ PrimaryBtn [Node] [UITransform: <宽>x<高>]
│  │  │  描述: 主按钮
│  │  │
│  │  ├─ PrimaryBtn_BG [Sprite] [UITransform: <宽>x<高>]
│  │  │    Color: <从 design-dna.json 取值>
│  │  │
│  │  └─ PrimaryBtn_Label [Label]
│  │       文本: "<中文按钮文字>" / "<English Button Text>"
│  │       FontSize: <字号>
│  │       Color: <颜色>
│  │
│  └─ SecondaryBtn [Node] [UITransform: <宽>x<高>]
│     │  描述: 次要按钮
│     │
│     └─ SecondaryBtn_Label [Label]
│          文本: "<中文>" / "<English>"
│          FontSize: <字号>
│          Color: <颜色>
│
└─ VersionLabel [Label] [Widget: bottom=<n>, right=<n>]
     文本: "v<版本号>"
     FontSize: <字号>
     Color: <颜色>
```

---

## 第5章示例：按钮交互状态

```typescript
// 所有颜色值必须来自项目的 design-dna.json，以下为格式示例
primaryButtonStates: {
  default: {
    background: '<design-dna.json → color.primary.hex>',
    labelColor: '<design-dna.json → color.accent.hex>',
    shadow: '<design-dna.json → elevation.levels.medium>'
  },
  hover: {
    background: '<悬停色>',
    labelColor: '<悬停文字色>',
    transform: 'translateY(-2px)'
  },
  active: {
    transform: 'scale(0.95)',
    shadow: '<design-dna.json → elevation.levels.low>'
  },
  disabled: {
    opacity: 0.5,
    background: '<禁用色>',
    labelColor: '<禁用文字色>'
  }
}
```

---

## 第7章示例：入场动画序列

```typescript
entranceSequence: [
  { target: 'BG',           delay: 0,    duration: 500, from: {opacity:0}, to: {opacity:1} },
  { target: 'GameTitle',    delay: 300,  duration: 800, from: {opacity:0, y:-30}, to: {opacity:1, y:0} },
  { target: 'GameSubtitle', delay: 600,  duration: 600, from: {opacity:0}, to: {opacity:1} },
  { target: 'PrimaryBtn',   delay: 1000, duration: 400, from: {opacity:0, y:20}, to: {opacity:1, y:0} },
  { target: 'SecondaryBtn', delay: 1200, duration: 400, from: {opacity:0, y:20}, to: {opacity:1, y:0} }
]
```

---

## 第8章示例：动态效果规范

### 8.1 粒子系统示例

```typescript
// 以下为格式示例，实际参数由用户需求和项目风格决定
const particleExample: ParticleSpec = {
  id: '<ParticleName>',
  description: '<效果描述 — 根据实际项目填写>',

  container: {
    nodeName: '<ParticleLayerName>',
    parentNode: '<PageName>Page',
    siblingIndex: 1,
    size: { width: '<设计宽度>', height: '<设计高度>' }
  },

  particle: {
    count: '<根据效果密度决定, 如 20~50>',
    shape: 'circle',
    sizeRange: ['<最小>', '<最大>'],
    colorPalette: ['<从 design-dna.json 取色>'],
    opacity: { initial: 0, fadeIn: '<峰值>', fadeOut: 0 }
  },

  motion: {
    type: '<rise/fall/float/orbit>',
    speed: { min: '<最小速度>', max: '<最大速度>' },
    direction: { x: 0, y: '<正=上, 负=下>' },
    wobble: { amplitude: '<摆幅>', frequency: '<频率>' }
  },

  lifecycle: {
    duration: ['<最短寿命>', '<最长寿命>'],
    spawnRate: 0,
    fadeInDuration: '<淡入秒数>',
    fadeOutDuration: '<淡出秒数>',
    respawn: true
  },

  performance: {
    gpuParticle: false,
    programmatic: true,
    lodLevels: { high: '<N>', medium: '<N/2>', low: 0 },
    disableOnLowEnd: true
  }
}
```

### 8.2 持续动画示例

```typescript
const animationExample: ContinuousAnimationSpec = {
  id: '<AnimationName>',
  description: '<动画描述>',

  target: {
    nodeName: '<TargetNodeName>',
    parentNode: '<PageName>Page',
    siblingIndex: 2
  },

  animation: {
    type: 'rotation',
    params: {
      rotationSpeed: '<度/秒>',
      rotationAxis: 'z',
      loop: true
    }
  }
}
```

### 8.4 动态效果总表示例

| 效果ID | 类型 | 目标节点 | 描述 | 性能等级 | 可选/必需 |
|--------|------|----------|------|----------|-----------|
| `<ParticleName>` | particle | `<LayerNode>` | <描述> | medium | 可选 |
| `<AnimName>` | animation | `<TargetNode>` | <描述> | low | 必需 |

---

## ⚠️ 重要提醒

这只是**格式示例**。实际输出时：

1. **所有颜色值** 必须来自项目的 `design-dna.json`，不得使用本示例中的占位符
2. **所有节点名** 必须根据实际项目界面内容命名
3. **所有文本内容** 必须来自用户需求和参考图分析
4. **所有尺寸/位置** 必须基于项目的设计分辨率计算
5. **所有动态效果** 必须经过用户确认后才写入第8章
6. **不同项目风格各异** — 不要假设游戏类型、视觉风格或交互模式
