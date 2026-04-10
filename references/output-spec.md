# 输出规范 — design.md 9 章结构与验证清单

本文档定义 Phase 3 输出的 UI 结构协议文档（design.md）的完整章节结构和验证清单。

---

## design.md 章节结构

### 第1章：设计概述

- **页面名称**（英文标识 + 中文名称）
- **页面定位** — 在游戏流中的功能/位置
- **视觉目标** — 从参考图分析得出
- **游戏流位置** — 从启动到本页面的完整路径
- 状态标记：🔨 设计中 / ✅ 已实施
- **设计分辨率**（如 1280×720）
- **设计依据** — 列出 design-dna.json + 参考来源
- **设计原则** — 3~5 条核心原则

### 第1.5章：参考图与设计溯源

- **参考图列表** — 表格：缩略引用、文件名、设计影响
- **设计决策追踪** — 表格：每个重要设计决策 → 来源参考 → 理由
- 参考图存放路径：`cocos-dna/components/<page-name>/references/`
- 后续截图存档命名：`screenshot-{日期}_{描述}.png`

### 第2章：整体布局（ASCII 线框图）

- 所有可见元素必须出现在线框图中
- 标注视觉特征（颜色、尺寸、透明度）
- 层级关系清晰
- 附布局要点表格（要素 / 定位方式 / 说明）

### 第3章：视觉规范

包含 4 个子表（而非简单的视觉层级树）：

- **3.1 色彩规范** — 表格：用途 / 色值 / DNA 引用 / 说明
- **3.2 字体规范** — 表格：用途 / 字体 / 大小 / 粗细 / 颜色
- **3.3 尺寸规范**（如有特殊元素）— 表格：元素类型 / 尺寸 / 说明
- **3.4 动效规范** — 表格：动效 / 触发条件 / 参数 / 说明

> **注意**：早期版本的第3章为"视觉层级树"（Layer 1→2→3），已升级为更完整的视觉规范格式。
> 视觉层级信息现在融入第4章节点树的注释中。

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

### 第6章：资源切图清单

列出实现所需的所有图片资源。

**关键规则**：
- design.md 第6章的资源清单表**只列文件名、尺寸、格式、九宫格、说明**
- **资源路径（assetPath）、加载方式（loadType）、UUID 等信息以 `asset-manifest.json` 为唯一权威来源**，design.md 中**不得重复写路径或 loadType**，避免两处不同步
- @property 映射表列出 Renderer 需要运行时访问的节点→属性声明

命名规则：`bg_*` 背景 / `icon_*` 图标 / `btn_*` 按钮 / `char_*` 角色 / `frame_*` 边框 / `fx_*` 特效

详细节点格式见 → [node-spec.md](node-spec.md)

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

## art-prompts.md 格式规范

> **关键规则**：art-prompts.md 中每个资源 **必须独立一节**，严禁将多个资源合并到同一个章节或同一个代码块中。

### 文件结构（必须遵循）

```markdown
# <页面中文名> (<Page>) — 美术资源生成清单

> 元信息区：用途、设计来源、原资产目录、正式目录

## 风格基调 (Style Foundation)
（统一风格约束，从 design-dna.json 提取）

## 资源 #1: <中文描述> — `<filename>.png`
（属性表 + Prompt 代码块）

## 资源 #2: <中文描述> — `<filename>.png`
（属性表 + Prompt 代码块）

...（每个资源独立一节，序号连续）

## 共享资源（如有）
## 批量生成检查清单
## 生成后操作流程
```

### 每个资源节的必要结构

```markdown
## 资源 #N: <中文描述> — `<filename>.png`

| 属性 | 值 |
|------|-----|
| **输出文件** | `<filename>.png` |
| **尺寸** | <宽> × <高> px |
| **格式** | PNG (透明背景/非透明) |
| **用途** | <具体用途> |
| **绑定节点** | <Prefab 节点名> |

### Prompt

（独立代码块，一个资源一个代码块，不可多个资源共用）

### 中文参考（可选）
```

### ⛔ 禁止写法

| 禁止写法 | 问题 | 正确写法 |
|---------|------|---------|
| `### 2-5. 血条和能量条`（合并标题） | 无法对应具体资源 | 每个资源单独 `## 资源 #N:` |
| 多个 Prompt 写在同一个代码块内 | 无法区分哪段对应哪个资源 | 每个资源独立 Prompt 代码块 |
| Prompt 节标题不含文件名 | 无法与清单表格快速对照 | 标题格式：`## 资源 #N: 描述 — filename.png` |
| 缺少属性表直接写 Prompt | 缺失尺寸/格式等关键信息 | 必须先列属性表再写 Prompt |
| 属性表包含九宫格参数 / 路径信息 | 与 asset-manifest.json 冗余，维护两份易不一致 | 九宫格/路径/loadType 等技术参数只在 asset-manifest.json 中定义 |
| 包含「后处理 / 制作说明」节 | 路径和切分参数已在 asset-manifest.json，Prompt 文件不做路径管理 | 删除该节，路径统一看 asset-manifest.json |

### 对应关系规则

- art-prompts.md 中的 `资源 #N` 序号必须与文件顶部「批量生成检查清单」表格中的 `#` 列**一一对应**
- 每个 `资源 #N` 节的 `输出文件` 必须与 `asset-manifest.json` 中的条目**完全匹配**
- 相似资源（如多种颜色的卡牌背景、多种图标）**也必须每个单独一节**，不可合并

---

## 输出验证清单

### 目录结构完整性
- [ ] `cocos-dna/components/<page>/` 目录已创建
- [ ] `cocos-dna/components/<page>/assets/art-prompts.md` 已生成（AI 绘图 Prompt）
- [ ] `cocos-dna/components/<page>/assets/raw/.gitkeep` 已创建（原始资产占位目录）
- [ ] `cocos-dna/components/<page>/references/` 目录已创建
- [ ] `design-dna.json` → `pages` 索引中包含本页面条目

### art-prompts.md 格式完整性
- [ ] 每个资源独立一节（`## 资源 #N: 描述 — filename.png`），无合并
- [ ] 每节包含属性表（输出文件/尺寸/格式/用途，九宫格/绑定节点如有）
- [ ] 每节包含独立的 Prompt 代码块（一个资源一个代码块）
- [ ] 序号与「批量生成检查清单」表格一一对应
- [ ] 输出文件名与 asset-manifest.json 中的条目完全匹配
- [ ] 包含「风格基调」节（从 design-dna.json 提取）
- [ ] 包含「批量生成检查清单」表格
- [ ] 包含「生成后操作流程」

### 文档完整性
- [ ] 9 个章节全部输出（第1~8章 + 第1.5章参考图溯源）
- [ ] 第1.5章参考图列表和设计决策追踪已填写
- [ ] ASCII 线框图包含所有可见元素，附布局要点表格
- [ ] 第3章包含色彩/字体/尺寸/动效 4 个子表
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
- [ ] **每个 Group/Container/Row 容器节点声明了 `[Layout]` 组件或子节点有显式 `Position`**
- [ ] **多子节点容器中，子节点 Position 不全为 (0,0)**（防止重叠）
- [ ] **Layout spacing 值已明确标注**（不省略、不留默认 0）

### i18n 双语
- [ ] 所有 Label 同时列出中文和英文
- [ ] 按钮文字预留不同长度空间

### Phase 3 DNA 驱动验证
- [ ] 每个颜色值可追溯到 `cocos-dna/design-dna.json` → `color.*`
- [ ] 每个字号可追溯到 `cocos-dna/design-dna.json` → `typography.type_scale.*`
- [ ] 每个动画参数可追溯到 `cocos-dna/design-dna.json` → `motion.*`
- [ ] 代码注释中标注了 DNA 来源字段
- [ ] PageComp.ts 的 @property 覆盖节点树中所有需要运行时访问的节点
- [ ] Renderer.ts 的 COLORS/MOTION 常量与 ThemeConfig.ts 一致
- [ ] MCP 调用序列覆盖节点树中的所有节点
- [ ] Prefab 文件已保存到正确路径

### 数据边界验证
- [ ] **design-dna.json 未被写入页面级详情数据**（layout/components/animations/particles 等），仅含全局 token + pages 索引
- [ ] 页面设计数据完整写入 `cocos-dna/components/<page>/design.md`
- [ ] pages 索引中已添加新页面条目（page_name_cn + status + design_doc 路径）
