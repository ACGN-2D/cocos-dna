# 输出规范 — design.md 8 章结构与验证清单

本文档定义 Phase 3 输出的 UI 结构协议文档（design.md）的完整章节结构和验证清单。

---

## design.md 8 章结构

### 第1章：设计概述

- 页面功能/用途、视觉目标、在游戏/应用流中的位置
- 状态标记：🔨 设计中 / ✅ 已实施
- 设计来源：参考图文件名
- 设计分辨率

### 第2章：整体布局（ASCII 线框图）

- 所有可见元素必须出现在线框图中
- 标注视觉特征（颜色、尺寸、透明度）
- 层级关系清晰

### 第3章：视觉层级树

从底到顶列出视觉层：第1层（底）背景层 → 第2层（中）装饰层 → 第3层（顶）内容层

### 第4章：Cocos 节点树（Prefab 结构）

**核心输出**。详细节点命名规范和格式要求见 → [node-spec.md](node-spec.md)

关键原则：
- PascalCase 命名
- 每个节点标注组件类型、UITransform 尺寸、位置、颜色
- 所有 Label 节点必须有中英双语文本和字号
- 节点名是 Prefab 与 Renderer 代码的唯一契约

### 第5章：元素设计详述

使用 TypeScript 伪代码格式详述每个元素的设计参数：
- 背景层：渐变/颜色/图片参数
- 装饰层：位置/尺寸/旋转/透明度
- 内容层：文字样式/颜色/对齐
- 按钮：完整交互状态（默认 / 悬停 / 按下 / 禁用）

### 第6章：资源切图表

列出实现所需的所有图片资源，详细格式见 → [node-spec.md](node-spec.md)

命名规则：`bg_*` 背景 / `icon_*` 图标 / `btn_*` 按钮 / `char_*` 角色 / `frame_*` 边框 / `fx_*` 特效

### 第6.5章：资产绑定协议 (Asset Binding Protocol)

同时生成 `asset-manifest.json`。详细 Schema 和状态机说明见 → [asset-binding.md](asset-binding.md)

### 第7章：交互逻辑与状态

- 点击区域定义 — 节点名、点击行为、反馈效果
- 入场动画序列 — 延迟、持续时间、起始/结束状态
- 页面跳转 — 触发条件、当前/目标页面、过渡方式
- 持续动画概要 — 引用第8章详细定义

### 第8章：动态效果规范（Particle & Animation Spec）

本章是动态效果的完整规范，解决静态截图无法表达动效的问题。

---

## 第8章详细接口定义

### 8.1 粒子系统规范

每个粒子效果使用以下模板：

```typescript
interface ParticleSpec {
  id: string;                    // 效果唯一标识（对应节点名）
  description: string;

  container: {
    nodeName: string;            // PascalCase
    parentNode: string;
    siblingIndex: number;
    size: { width: number; height: number };
  };

  particle: {
    count: number;
    shape: 'circle' | 'square' | 'sprite';
    sizeRange: [number, number]; // 最小~最大尺寸 (px)
    colorPalette: string[];      // HEX 颜色数组
    opacity: {
      initial: number;           // 0~255
      fadeIn: number;
      fadeOut: number;
    };
  };

  motion: {
    type: 'rise' | 'fall' | 'float' | 'orbit' | 'custom';
    speed: { min: number; max: number }; // px/s
    direction: { x: number; y: number };
    wobble?: { amplitude: number; frequency: number; };
    rotation?: { speed: number; randomDirection: boolean; };
  };

  lifecycle: {
    duration: [number, number];  // 秒
    spawnRate: number;           // 每秒新生粒子数（0=预生成全部）
    fadeInDuration: number;
    fadeOutDuration: number;
    respawn: boolean;
  };

  performance: {
    gpuParticle: boolean;
    programmatic: boolean;
    lodLevels?: { high: number; medium: number; low: number; };
    disableOnLowEnd: boolean;
  };
}
```

### 8.2 持续动画规范

```typescript
interface ContinuousAnimationSpec {
  id: string;
  description: string;

  target: {
    nodeName: string;
    parentNode: string;
    siblingIndex: number;
  };

  animation: {
    type: 'rotation' | 'translation' | 'scale' | 'opacity' | 'composite';
    params: {
      rotationSpeed?: number;    // 度/秒
      rotationAxis?: 'z';
      translateRange?: { x: [number, number]; y: [number, number] };
      translateDuration?: number;
      scaleRange?: [number, number];
      scaleDuration?: number;
      opacityRange?: [number, number]; // 0~255
      opacityDuration?: number;
      easing?: string;
      loop?: boolean;
      pingPong?: boolean;
    };
  };

  children?: Array<{
    nodeName: string;
    shape: { width: number; height: number };
    color: string;
    pivotOffset: { x: number; y: number };
    animationOverride: Partial<ContinuousAnimationSpec['animation']>;
  }>;
}
```

### 8.3 背景动效规范

```typescript
interface BackgroundEffectSpec {
  id: string;
  type: 'breathing' | 'parallax' | 'pan' | 'color-shift';
  target: string;                // 目标节点名
  params: {
    property: string;            // 'brightness' | 'opacity' | 'position' | 'color'
    range: [number, number];
    duration: number;
    easing: string;
  };
}
```

### 8.4 动态效果总表

| 效果ID | 类型 | 目标节点 | 描述 | 性能等级 | 可选/必需 |
|--------|------|----------|------|----------|-----------|
| (列出所有动态效果) | particle / animation / background | (节点名) | (简述) | low/medium/high | 必需/可选 |

---

## 输出验证清单

### 完整性
- [ ] 8 个章节全部输出
- [ ] ASCII 线框图包含所有可见元素
- [ ] 节点树覆盖所有需要的节点
- [ ] 每个 Label 有中英双语文本和字号
- [ ] 每个交互元素有状态定义
- [ ] 资源清单覆盖所有图片
- [ ] asset-manifest.json 已生成
- [ ] 第8章动态效果规范已填写（如无动效则明确标注"无"）

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
