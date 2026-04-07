# DNA → Cocos 组件映射与代码生成规范

本文档定义 Phase 3 如何将 Design DNA JSON 转换为 Cocos Creator 实现。

---

## 1. DNA → Cocos 组件映射表

### Dimension 1: design_system → Cocos 组件

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

### Dimension 2: design_style → 主观设计决策

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

### Dimension 3: visual_effects → Cocos 特效组件

| DNA 字段 | Cocos 实现 | 技术选择 |
|----------|-----------|----------|
| `background_effects` (gradient-animation) | `cc.tween()` 驱动 Sprite 颜色渐变 | Tween 循环 |
| `background_effects` (noise-field) | 自定义 Material + Shader | Cocos Effect |
| `particle_systems` | `cc.ParticleSystem2D` 或程序化 Sprite 模拟 | count < 50 → 程序化；count >= 50 → ParticleSystem2D |
| `3d_elements` | Cocos 3D 节点 + MeshRenderer | 仅当项目为 3D 模式时 |
| `shader_effects` | 自定义 Cocos Effect (.effect) | 顶点/片段着色器 |
| `scroll_effects` | `cc.ScrollView` + `cc.tween()` 组合 | Tween 驱动滚动联动动画 |
| `text_effects` (typewriter) | `cc.Label` + 定时器逐字显示 | schedule + string.substring |
| `text_effects` (gradient-fill) | 自定义 Material 文字着色器 | Cocos Effect |
| `cursor_effects` | 不适用（触屏为主） | 跳过或映射为触摸反馈 |
| `glassmorphism` | `cc.Sprite` + 模糊材质 | 自定义 blur Effect |
| `canvas_drawings` | `cc.Graphics` 组件 | 程序化绘制路径（见下方路径渲染指南） |
| `svg_animations` | `cc.Graphics` + `cc.tween()` | 路径动画描边 |

---

## 2. 路径/连线渲染方案选择指南

在游戏 UI 中绘制节点间连线、路径、虚线等**几何线段**时，**必须优先使用 `cc.Graphics` 组件**，而非创建多个 Sprite 节点拼接。

| 方案 | 节点数 | DrawCall | 虚线支持 | 弯曲路径 | 推荐场景 |
|------|--------|---------|---------|---------|---------|
| ❌ N 个 Sprite 拼接 | O(N×路径数) | O(N) | 差（锯齿/断裂） | 不可能 | **禁止用于路径** |
| ❌ Sprite.Type=TILED 拉伸 | O(路径数) | O(路径数) | 一般 | 不可能 | 仅限简单直线纹理 |
| ✅ **单 cc.Graphics 组件** | **1** | **1** | ✅ moveTo/lineTo 模拟 | ✅ bezierCurveTo | **路径/连线的标准方案** |
| ✅ Graphics + 自定义 Shader | **1** | **1** | ✅ Shader 计算 | ✅ 需自定义 | 需要特殊视觉效果时 |

### cc.Graphics 虚线实现模式

```typescript
private _drawDashedLine(g: Graphics, x1: number, y1: number,
    x2: number, y2: number, dashLen: number, gapLen: number): void {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len, uy = dy / len;
    let drawn = 0;
    while (drawn < len) {
        const segEnd = Math.min(drawn + dashLen, len);
        g.moveTo(x1 + ux * drawn, y1 + uy * drawn);
        g.lineTo(x1 + ux * segEnd, y1 + uy * segEnd);
        drawn = segEnd + gapLen;
    }
}
```

路径状态着色通过切换 `g.strokeColor` 实现 PASSED/UNLOCKED/LOCKED 三态，无需为每条路径创建独立节点。

---

## 3. MCP 驱动的 Prefab 创建流程

```
design-dna.json ──→ 映射表 ──→ 节点树定义 ──→ MCP 命令序列 ──→ .prefab 文件
                                    ↓
                              design.md（8章文档）
                              asset-manifest.json
                              PageComp.ts / Renderer.ts
```

### MCP 调用序列

1. **创建根节点** — MCP: `create-node` → `<PageName>Page`，设置 `UITransform` + `Widget: LRTB=0`
2. **逐层创建子节点** — 按 design.md 第4章节点树从上到下创建：背景层(`BG`) → 装饰层(`Deco*`) → 内容层(`*Group`/`*Btn`/`*Label`) → 动效层(`*ParticleLayer`/`*AnimLayer`)
3. **绑定资源** — 两种绑定方式（由 asset-manifest.json 的 `loadType` 决定）：
   - **静态资源** (`loadType: "static"`)：资源放 `assets/textures/<page>/`，在 Prefab JSON 的 PageComp 序列化数据中添加 `@property(SpriteFrame)` 属性，直接引用 `spriteFrameUuid`（`<uuid>@f9941`）。构建器自动依赖追踪
   - **动态资源** (`loadType: "dynamic"`, 默认)：资源放 `assets/resources/textures/<page>/`，Renderer 代码中 `resources.load()` 加载。asset-manifest.json 记录 UUID 映射
   - **原资产追溯**：AI 生成的原始图片存放在 `design-dna/components/<page>/assets/raw/`，asset-manifest.json 的 `sourceFile` 字段记录原资产路径，建立设计产物→正式资产的可追溯链
4. **挂载脚本** — MCP `add-component` 在根节点挂载 `PageComp.ts`，关联 `@property` 引用
5. **保存 Prefab** — MCP `save-prefab` → `assets/resources/prefabs/<page-name>.prefab`

---

## 4. 代码生成规范

Phase 3 生成两个代码文件，遵循以下接口协议。

### PageComp.ts（Prefab 组件脚本）

将 DNA 的组件映射为 `@property` 声明。每个节点在 PageComp 中有对应引用：

| 节点组件类型 | @property 类型 | DNA 来源 |
|-------------|---------------|----------|
| `[Node]` | `@property(Node)` | 容器/动效层节点 |
| `[Label]` | `@property(Label)` | DNA: typography 映射 |
| `[Sprite]` | `@property(Sprite)` | DNA: color.surface / imagery |
| `[SpriteFrame]` | `@property(SpriteFrame)` | **静态绑定资源**（固定背景、固定图标等） |
| `[Button]` | `@property(Button)` | DNA: components.button_style |
| `[EditBox]` | `@property(EditBox)` | DNA: components.input_style |

> **静态资源绑定规则**：当某个 Sprite 的图片是固定不变的（路径写死），应在 PageComp 中声明 `@property(SpriteFrame)`，在 Prefab JSON 中直接绑定该图片的 `spriteFrameUuid`（`<uuid>@f9941`），而不是在 Renderer 中用 `resources.load()` 动态加载。详见 → [asset-binding.md](asset-binding.md)「静态引用 vs 动态加载」

```typescript
// 模板 — 节点属性绑定
import { _decorator, Component, Node, Label, Sprite, SpriteFrame, Button } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PageNameComp')
export class PageNameComp extends Component {
    // ═══ 背景层（DNA: color.surface.background）═══
    @property(Sprite) bgSprite: Sprite = null!;
    /** 背景图 SpriteFrame — 静态引用，Prefab 序列化绑定 UUID */
    @property(SpriteFrame) bgSpriteFrame: SpriteFrame = null!;
    // ═══ 内容层（DNA: typography + components）═══
    @property(Label) titleLabel: Label = null!;
    // ═══ 按钮（DNA: components.button_style）═══
    @property(Button) primaryBtn: Button = null!;
    // ... 根据实际节点树生成
}
```

### Renderer.ts（渲染器逻辑脚本）

继承 `BaseRenderer`，采用**双层生命周期**（模板方法模式）+ **RendererState 状态机**将 DNA 设计决策转化为运行时逻辑。

#### 渲染器状态机

```
RendererState:  None ──init()──→ Inited ──show()──→ Visible ──hide()──→ Hidden
                                   ↑                                      │
                                   └──────────── show() ──────────────────┘
                Any non-Disposed ──dispose()──→ Disposed（终态，拦截所有操作）
```

- `show()` 在 `Disposed` / `None` 下 → `console.error` + 直接 return
- `hide()` 在非 `Visible` 下 → 安全 noop
- `dispose()` 在 `Disposed` 下 → 跳过

#### 驱动层 (Public — 由 GameEntry 统一调度，子类**不得重写**)

| 方法 | 状态转换 | 职责 |
|------|---------|------|
| `init(parent)` | None → Inited | 创建根节点、状态检查、调用 `onInit()` |
| `show(data?)` | Inited/Hidden → Visible | 激活节点、防重复显示、调用 `onShow()` |
| `async hide()` | Visible → Hidden | **await `onHide()`**（退场动画）→ deactivate 节点 |
| `update(dt)` | — | 仅 Visible 状态调用 `onUpdate(dt)` |
| `dispose()` | 任意 → Disposed | ① **递归** `_stopTweensRecursive` 停止所有子节点 Tween → ② 调用 `onDispose()` → ③ destroy 节点树 |

#### 业务层 (Hooks — 子类重写)

| 钩子 | 返回类型 | 说明 |
|------|---------|------|
| `onInit()` | `void` | **[抽象]** 一次性资源预加载（如图标 SpriteFrame）和 Prefab 实例化 |
| `onShow(data?)` | `void` | 执行进场动画 `playEnterAnimation()` 和数据绑定 |
| `async onHide()` | `Promise<void>` | **异步退场动画**（如 0.3s 淡出），完成后 resolve；基类在 resolve 后才 `active=false` |
| `onUpdate(dt)` | `void` | 驱动粒子/动画帧更新 |
| `onDispose()` | `void` | 释放子类特有资源、清理引用，解除 DNA 数据引用 |

> **重要**：`hide()` 是 async 的。GameEntry 的 `_switchRenderer` / `_hideCurrentRenderer` 均 `await hide()`，确保退场动画播完再 show 新渲染器。如果子类 `onHide` 无退场动画（默认空实现），await 立即 resolve，零额外开销。

> **dispose 三步顺序**：① `_stopTweensRecursive(root)` 递归停止所有子节点 Tween → ② `onDispose()` 子类释放资源 → ③ `destroy()` 销毁节点树。先 stop 后 dispose 确保子类在 `onDispose()` 中访问节点属性时不会被残留 Tween 回调干扰。子类 `onDispose()` 中无需手动清理 Tween。

#### 事件监听规范

| 监听方式 | 生命周期清理 | 子类 onDispose 是否需要手动 off |
|---------|------------|-------------------------------|
| `node.on(Node.EventType.TOUCH_END, ...)` | `Node.destroy()` 自动清理该节点上的所有事件监听器 | ❌ 不需要（destroy 自动覆盖） |
| `EventBus.on('event', ...)` | **不会**被 Node.destroy 清理 | ✅ **必须**在 `onDispose()` 中 `EventBus.off()` |
| `director.on(...)` / `systemEvent.on(...)` | **不会**被 Node.destroy 清理 | ✅ **必须**在 `onDispose()` 中手动 off |

**规范要求**：
- **优先使用 `node.on()`**：将触摸/鼠标事件绑定在 Prefab 子节点上，dispose 时由 `Node.destroy()` 自动清理，无需手动 off。
- **若使用 `EventBus.on()`**：子类**必须**在 `onDispose()` 中配对调用 `EventBus.off()`。建议在 `onInit()` 中绑定时保存回调引用，便于 off 时精确匹配。
- **当前审计结果**：5 个子类均使用 `node.on()` 而非 `EventBus.on()`，dispose 清理已被 `Node.destroy()` 覆盖，风险为低。

```typescript
// 模板 — 渲染器逻辑
import { Color, tween, Vec3 } from 'cc';
import { BaseRenderer, RendererState } from './BaseRenderer';

export class PageNameRenderer extends BaseRenderer {
    // ═══ DNA Dimension 1: design_system tokens ═══
    private readonly COLORS = {
        primary: new Color().fromHEX('#...'),     // ← DNA: color.primary.hex
        accent: new Color().fromHEX('#...'),      // ← DNA: color.accent.hex
    };
    private readonly MOTION = {
        easing: 'quadOut',    // ← DNA: motion.easing
        normal: 0.3,          // ← DNA: motion.duration_scale.normal
    };

    protected onInit(): void { /* 初始化颜色 + 动态效果 */ }
    protected onShow(): void { /* 入场动画 */ }
    protected onUpdate(dt: number): void { /* 驱动粒子/动画帧更新 */ }

    // 退场动画示例（可选重写）
    protected async onHide(): Promise<void> {
        // 如果需要退场动画，用 Promise 包装 tween：
        // await new Promise<void>(resolve => {
        //     tween(this._root!)
        //         .to(0.3, { scale: new Vec3(0.95, 0.95, 1) }, { easing: 'quadIn' })
        //         .call(() => resolve())
        //         .start();
        // });
    }
}
```

### DNA 数据溯源要求

每一行生成的代码都必须可追溯到 DNA JSON 中的具体字段，在代码注释中标注：

```typescript
// ← DNA: color.primary.hex
// ← DNA: typography.type_scale.heading_1.size
// ← DNA: motion.duration_scale.normal
```

### ThemeConfig 集成

DNA 的 `design_system` tokens 同步写入项目级 `ThemeConfig.ts`：

```
design-dna.json → color.* → COLORS.* (ThemeConfig.ts)
                → typography.* → FONT_SIZES.*
                → spacing.* → SPACING.*
                → motion.* → MOTION.*
```

**design-dna.json 是唯一真相源 (SSOT)**，ThemeConfig.ts 是运行时读取层，两者必须同步。
