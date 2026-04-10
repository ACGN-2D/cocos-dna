# 节点规范 — Cocos 节点树与资源切图

## 节点命名规范

所有节点名使用 PascalCase，名称是 **设计文档 → Prefab → Renderer 代码** 三者的唯一契约。

### 通用命名模式

| 节点类型 | 格式 | 示例 |
|----------|------|------|
| 页面根节点 | `<PageName>Page` | `MainMenuPage`, `CharSelectPage` |
| 背景 | `BG` | `BG` |
| 装饰元素 | `Deco<Type>_<位置>` | `DecoGear_TL`, `DecoGear_BR` |
| 标题附属装饰 | `Title<Type>_<方向>` | `TitleGear_L`, `TitleGear_R` |
| 主标题 | `GameTitle` 或 `Title` | `GameTitle` |
| 副标题 | `GameSubtitle` 或 `Subtitle` | `GameSubtitle` |
| 分隔线 | `Divider` | `Divider` |
| 主按钮 | `<功能>Btn` | `NewGameBtn`, `StartBtn`, `ConfirmBtn` |
| 按钮背景 | `<BtnName>_BG` | `NewGameBtn_BG` |
| 按钮图标 | `<BtnName>_Icon` | `NewGameBtn_Icon` |
| 按钮文字 | `<BtnName>_Label` | `NewGameBtn_Label` |
| 容器/分组 | `<用途>Group` 或 `<用途>Container` | `ButtonGroup`, `TitleGroup` |
| 版本号 | `VersionLabel` | `VersionLabel` |
| 提示文字 | `HintLabel` | `HintLabel` |

### 动态效果节点命名

| 节点类型 | 格式 | 示例 |
|----------|------|------|
| 粒子容器层 | `<效果>ParticleLayer` | `SteamParticleLayer`, `RainParticleLayer` |
| 单个粒子 | `Particle_<N>` | `Particle_0`, `Particle_1` |
| 动画容器层 | `<效果>AnimLayer` | `ClockHandsAnimLayer`, `GearAnimLayer` |
| 动画子元素 | `<容器>_<部件>` | `Clock_MinuteHand`, `Clock_HourHand` |
| 背景动效层 | `<效果>EffectLayer` | `BreathingEffectLayer`, `ParallaxEffectLayer` |

### 位置缩写

| 缩写 | 含义 |
|------|------|
| `TL` | Top-Left 左上 |
| `TR` | Top-Right 右上 |
| `BL` | Bottom-Left 左下 |
| `BR` | Bottom-Right 右下 |
| `L` | Left 左 |
| `R` | Right 右 |
| `T` | Top 上 |
| `B` | Bottom 下 |
| `C` | Center 中 |

### Prefab 文件命名规范

| 层级 | 格式 | 示例 (page-id = `route-map`) |
|------|------|-----|
| Prefab 文件 | `<PascalName>Page.prefab` | `RouteMapPage.prefab` |
| 存储路径 | `assets/resources/prefabs/pages/` | |
| GameEntry prefabPath | `prefabs/pages/<PascalName>Page` | `prefabs/pages/RouteMapPage` |
| Layer 2 类名 | `<PascalName>ViewGenerated` | `RouteMapViewGenerated` |
| Layer 3 类名 | `<PascalName>PageView` | `RouteMapPageView` |
| Comp 类名 | `<PascalName>PageComp` | `RouteMapPageComp` |

转换规则：`page-id`（kebab） → `toPascalCase()` → 拼接后缀

⚠️ Prefab 文件名必须与 page-id 的 PascalCase 严格对应，不得缩写或别名（如 `MapPage` ≠ `RouteMapPage`）。

> **历史兼容**：已有页面如因历史原因文件名与 page-id 不一致（如 `route-map` → `MapPage.prefab`），可在 `ui-dev-workflow.js` 的 `PREFAB_ALIAS_MAP` 中注册别名映射，但新页面必须严格遵循命名规则。

---

## 每个节点必填信息

| 字段 | 说明 | 必填 |
|------|------|------|
| **节点名** | PascalCase 英文 | ✅ |
| **组件类型** | `[Sprite]` / `[Label]` / `[Node]` / `[Button]` / `[EditBox]` | ✅ |
| **UITransform** | `[UITransform: 宽x高]` 或 `auto` | ✅ |
| **Widget** | 如需对齐 `[Widget: ...]` | 按需 |
| **Position** | `(x, y)` 相对于父节点 | ✅ |
| **描述** | 中文描述视觉内容 | ✅ |
| **Color** | HEX 颜色值 | 按需 |
| **Opacity** | 0-255，仅不为 255 时填写 | 按需 |
| **文本** | Label 文字内容（中文 + 英文） | Label ✅ |
| **FontSize** | Label 字号 | Label ✅ |

---

## Layout 组件强制声明规范（⚠️ 防重叠关键）

> **背景**：Prefab 中的 Group/Container 节点如果缺少 Layout 组件或子节点位置声明，
> 所有子节点将堆叠在 `(0, 0, 0)`，导致运行时内容重叠——标题和副标题叠在一起、多个按钮叠在一起。
> 这是 UI 黑屏之外最常见的视觉 bug。

### 规则 1：任何 `*Group` / `*Container` / `*Row` 容器节点，必须声明子节点排列方式

在第4章节点树中，容器节点**必须**明确标注以下之一：

| 方式 | 节点树标记 | 说明 |
|------|-----------|------|
| **Layout 组件** | `[Layout: VERTICAL, spacing=24]` 或 `[Layout: HORIZONTAL, spacing=20]` | Cocos 自动排列，推荐 |
| **手动位置** | 每个子节点显式写 `Position: (x, y)` | 不用 Layout 时必须逐个标注 |

**禁止**：容器节点有多个子节点但既无 `[Layout]` 标记、子节点也无 `Position` 声明。

### 规则 2：Layout 组件必须指定完整参数

```
<ContainerName> [Node] [UITransform: WxH] [Layout: <TYPE>, spacing=<N>, resizeMode=<MODE>]
```

必填参数：
| 参数 | 值域 | 说明 |
|------|------|------|
| `TYPE` | `VERTICAL` / `HORIZONTAL` | 排列方向 |
| `spacing` | 数字（px） | 子节点间距。**不可省略**，省略时 Cocos 默认 0 导致紧贴 |
| `resizeMode` | `NONE` / `CONTAINER` / `CHILDREN` | 容器是否根据子节点自动调整尺寸 |

可选参数：
| 参数 | 说明 |
|------|------|
| `paddingTop/Bottom/Left/Right` | 内边距 |
| `verticalDirection` | `TOP_TO_BOTTOM`（默认）/ `BOTTOM_TO_TOP` |
| `horizontalDirection` | `LEFT_TO_RIGHT`（默认）/ `RIGHT_TO_LEFT` |

### 规则 3：design.md 第4章写法示例

✅ **正确写法**（有 Layout）：
```
ButtonGroup [Node] [UITransform: 400x180] [Layout: VERTICAL, spacing=24, resizeMode=CONTAINER]
│   Position: (0, -80)
│
├── NewGameBtn [Node+Sprite] [UITransform: 320x72]
│   Position: 由 Layout 自动排列
│
└── ContinueBtn [Node+Sprite] [UITransform: 280x56]
    Position: 由 Layout 自动排列
```

✅ **正确写法**（手动位置，无 Layout）：
```
ButtonGroup [Node] [UITransform: 400x180]
│   Position: (0, -80)
│
├── NewGameBtn [Node+Sprite] [UITransform: 320x72]
│   Position: (0, 40)    ← 明确标注
│
└── ContinueBtn [Node+Sprite] [UITransform: 280x56]
    Position: (0, -48)   ← 明确标注
```

❌ **错误写法**（缺少排列信息 → 子节点全堆叠在 (0,0)）：
```
ButtonGroup [Node] [UITransform: 400x180]
│   Position: (0, -80)
│
├── NewGameBtn [Node+Sprite] [UITransform: 320x72]    ← 无 Position、无 Layout → 重叠！
└── ContinueBtn [Node+Sprite] [UITransform: 280x56]   ← 无 Position、无 Layout → 重叠！
```

### 规则 4：验证清单（design.md 输出后必检）

在附录 D 的设计验证清单中，追加以下检查项：

- [ ] **每个 Group/Container/Row 节点有 Layout 组件声明或子节点手动 Position**
- [ ] **Layout spacing ≠ 0**（除非设计意图就是紧贴）
- [ ] **多子节点容器的所有子节点 Position 不全为 (0,0)**

### 规则 5：运行时 fallback — PageView 中的位置保障

即使 design.md 正确声明了 Layout，**Prefab 生成工具可能遗漏 Layout 组件**（已知问题：MCP 创建节点时不自动添加 Layout 组件）。
因此，Layer 3 PageView 的 `_setupPrefabUI()` 中**必须包含子节点位置设置**作为 fallback：

```typescript
// ✅ 必须在 _setupPrefabUI() 中为 Group 子节点设置位置
// 即使 Prefab 有 Layout 组件，显式 setPosition 也不会冲突（Layout 会覆盖）
// 但如果 Prefab 缺少 Layout，这些位置就是唯一的布局保障
const newGameBtn = this.getNode('NewGameBtn');
if (newGameBtn) newGameBtn.setPosition(0, 40, 0);
const continueBtn = this.getNode('ContinueBtn');
if (continueBtn) continueBtn.setPosition(0, -48, 0);
```

> **原则**：**双保险** — design.md 声明 Layout + PageView 代码设置 Position。两者任一存在即可防止重叠。

---

## 多分辨率适配 — UI 布局三层分类规则

> **官方依据**：[Cocos Creator 多分辨率适配方案](https://docs.cocos.com/creator/3.8/manual/zh/ui-system/components/engine/multi-resolution.html) + [Widget 组件](https://docs.cocos.com/creator/3.8/manual/zh/ui-system/components/editor/widget.html) + [对齐策略](https://docs.cocos.com/creator/3.8/manual/zh/ui-system/components/engine/widget-align.html)
>
> **核心原则**：
> 1. **Canvas 负责整体缩放** — 统一缩放所有渲染元素（设计分辨率 → 屏幕分辨率）
> 2. **Widget 负责 UI 对齐** — 确保元素在不同分辨率/宽高比下保持正确的语义位置
> 3. **不是所有节点都需要 Widget** — 只有「需要在不同分辨率保持语义位置」的 UI 元素才用 Widget
>
> ⚠️ **过度使用 Widget 的危害**：Widget 嵌套过深 → 计算复杂 → 调试困难 → over-constrained UI

### ⭐ 三层分类规则（核心决策表）

| 层级 | 元素类型 | 定位方式 | 判断标准 | 说明 |
|------|---------|---------|---------|------|
| **Layer 1: 交互 UI** | 按钮、标题、文本、HUD、输入框、提示、版本号 | **必须 Widget** | 「这个节点需要在不同分辨率保持语义位置吗？」→ ✅ 是 | 禁止用 Position 定位到屏幕边缘 |
| **Layer 2: 结构容器** | Panel、Group、Container、List、Row | **Widget + Layout** | 容器负责管理子节点排列 | Widget 定位容器自身，Layout 排列子节点 |
| **Layer 3: 装饰/视觉元素** | 背景纹理、齿轮装饰、飘带、光效、粒子 | **可以用 Position** | 「这个节点需要在不同分辨率保持语义位置吗？」→ ❌ 不需要 | Canvas 已统一缩放，装饰不需精确对齐 |

### Layer 1: 交互 UI — Widget 策略详表

| 场景 | Widget 配置 | 节点树标记 | 说明 |
|------|------------|-----------|------|
| 全屏背景/遮罩 | 四边撑满 | `[Widget: LRTB=0]` | 同时 Left+Right → 自动拉伸宽度；同时 Top+Bottom → 自动拉伸高度 |
| 顶部 UI（标题、返回按钮） | 锚定顶部 | `[Widget: Top=40, HCenter=0]` | 不同设备顶部高度不同（刘海/平板） |
| 底部 UI（按钮、提示） | 锚定底部 | `[Widget: Bottom=60, HCenter=0]` | 底部区域在横屏设备上高度变化最大 |
| 底部多元素（按钮+提示） | Layout 包一层 | `ButtonArea [Widget: Bottom=40, HCenter=0] [Layout: VERTICAL, spacing=16]` | 避免按钮与提示重叠 |
| 屏幕四角固定 UI（设置按钮） | 锚定角落 | `[Widget: Top=20, Right=20]` | 不同宽高比仍在角落 |
| 底部按钮栏（水平撑满） | 锚定底部+水平撑满 | `[Widget: Bottom=40, Left=0, Right=0]` | 宽度撑满，底部固定 |
| 居中内容组 | 水平/垂直居中 | `[Widget: HCenter=0, VCenter=0]` | 任何分辨率都居中 |
| 父容器内的子节点 | Position 或 Layout | `Position: (0, -80)` | 相对于父节点中心的相对定位 |

### Layer 2: 结构容器 — Widget + Layout 策略

容器节点**自身**用 Widget 确定在屏幕中的位置，**内部**用 Layout 或手动 Position 排列子节点。

```
ButtonArea [Node] [Widget: Bottom=60, HCenter=0] [Layout: VERTICAL, spacing=16, resizeMode=CONTAINER]
├── StartBtn [Node] — 由 Layout 自动排列
└── HintLabel [Label] — 由 Layout 自动排列
```

### Layer 3: 装饰元素 — Position 为主

| 装饰类型 | 推荐定位 | 说明 |
|---------|---------|------|
| 纯视觉装饰（齿轮、飘带、纹理） | `Position: (x, y)`（换算后坐标） | Canvas 统一缩放即可，不同宽高比允许被裁切 |
| 需要在宽窄屏都可见的角落装饰 | `[Widget: Top=20, Left=20, AlignMode=ONCE]` | ONCE = 仅初始化对齐一次 |
| 有持续动画的装饰（旋转齿轮等） | `Position: (x, y)` | **⚠️ 禁止 Widget AlignMode=ALWAYS（每帧重置 Position，覆盖 tween 动画）** |

> **判断原则**：「这个节点是否需要在不同分辨率保持语义位置？」
> ✅ 是 → Widget（Layer 1/2）
> ❌ 不是 → Position（Layer 3）

### Widget AlignMode 说明（⚠️ 易踩坑）

> 官方文档：Widget 的 AlignMode 属性决定运行时何时更新对齐。

| AlignMode | 行为 | 适用场景 | 注意 |
|-----------|------|---------|------|
| **ON_WINDOW_RESIZE** | 仅窗口尺寸变化时对齐 | **推荐：大量 UI 元素**（性能最优） | 对齐后自动 `enabled=false` |
| **ONCE** | 仅 `onEnable` 时对齐一次 | **有动画的 Widget 节点** | 对齐后可自由做 tween/动画 |
| **ALWAYS** | 每帧重新对齐 | 仅特殊动态场景 | ⚠️ 会覆盖 Position/Scale 修改！禁止用于有动画的节点 |

**design.md 标记格式**：
```
[Widget: Top=20, Left=20, AlignMode=ONCE]    — 有动画的装饰元素
[Widget: Bottom=60, HCenter=0]               — 默认 ON_WINDOW_RESIZE（可省略）
```

### Widget 常用参数格式

```
[Widget: LRTB=0]                    — 四边撑满父容器（全屏背景）
[Widget: Top=20, Right=20]          — 锚定右上角（返回按钮、设置按钮）
[Widget: Bottom=40]                 — 锚定底部（底部栏）
[Widget: Left=0, Right=0]           — 水平撑满（横向条幅）
[Widget: HCenter=0]                 — 水平居中
[Widget: VCenter=0]                 — 垂直居中
[Widget: HCenter=0, VCenter=50]     — 居中偏上 50px
[Widget: Top=20, Left=20, AlignMode=ONCE] — 锚定后释放（可做动画）
```

### ⚠️ 定位反模式（禁止）

| ❌ 反模式 | 问题 | ✅ 正确做法 |
|---------|------|-----------|
| **交互 UI** 用 `Position: (600, -350)` | 在不同分辨率/宽高比下偏移出屏 | `[Widget: Bottom=20, Right=20]` |
| 返回按钮 `Position: (-620, 340)` | 依赖设计分辨率的绝对左上角 | `[Widget: Top=20, Left=20]` |
| 全屏背景 `[UITransform: 2712x1220]` 硬编码尺寸 | 换分辨率不匹配 | `[Widget: LRTB=0]`（自动撑满） |
| **交互 UI** 底部按钮 `Position: (0, -500)` | 在 720p Canvas 上 y=-500 超出屏幕 | `[Widget: Bottom=60, HCenter=0]` |
| 所有节点一律用 Widget（**过度约束**） | Widget 嵌套过深、计算复杂、调试困难 | 只有 Layer 1/2 用 Widget，Layer 3 装饰用 Position |
| 有动画的节点用 `Widget AlignMode=ALWAYS` | 每帧重置 Position，tween 动画失效 | 用 Position 或 `Widget AlignMode=ONCE` |
| Canvas 节点添加 Widget | Canvas 的 size 无法随屏幕变化 | **严禁给 Canvas 添加 Widget** |
| 禁用 Widget 但不删除 | widget-manager 递归时会意外激活 | 不需要 Widget 的节点必须**彻底删除**而非禁用 |

### ⚠️ 参考图坐标换算（必须在写入 design.md 前完成）

> **核心问题**：用户提供的 UI 参考图/截图的分辨率（如 2712×1220）通常与项目设计分辨率（如 1280×720）不同。
> 如果在 design.md 第4章中直接使用参考图的像素坐标，会导致所有节点偏移出屏。

**换算公式**：

```
scaleX = design_resolution.width / 参考图宽度
scaleY = design_resolution.height / 参考图高度

Position: (参考图x × scaleX, 参考图y × scaleY)
UITransform: 参考图w × scale, 参考图h × scale
```

**换算后 → 分层定位决策**：

| 元素类型 | 换算后处理 | 说明 |
|---------|-----------|------|
| **交互 UI**（按钮、标题、文本） | 换算坐标 → 转为 Widget（Top/Bottom/HCenter/VCenter） | Widget 边距 = 设计高度/2 - |换算y| |
| **结构容器** | 换算坐标 → Widget 定位 + Layout 排列子节点 | 容器用 Widget，子节点用 Layout |
| **装饰元素** | 换算坐标 → 直接用 Position | Canvas 已缩放，Position 即可 |

**禁止**：在 design.md 中写入未经换算的参考图原始坐标（如 `Position: (0, -500)` 来自 1220 高度的参考图）。

### 安全区域与装饰元素

根据 `design-dna.json` → `layout.safe_area` 定义的安全区域：

- **关键 UI（Layer 1）**（按钮、文字、交互元素）：**必须在安全区域内**
  - 居中内容：用 Widget 居中，自然在安全区域内
  - 边缘内容：用 Widget 锚定，设定足够的边距
- **装饰元素（Layer 3）**（背景延伸、角落装饰、粒子特效）：**可以超出安全区域**
  - 在宽屏上正常显示，窄屏上允许被裁切
  - 使用 Position 定位（Canvas 统一缩放）

---

## 节点树书写格式

```
PageRoot (root) [UITransform: 宽x高] [Widget: LRTB=0]
  BG [Sprite] [UITransform: 宽x高] [Widget: LRTB=0]
    描述: 全屏背景
    Color: <从 design-dna.json 取值>

  DecoElement_TL [Sprite] [UITransform: 80x80]
    描述: 左上角装饰
    Position: (-X, Y)
    Color: <颜色>
    Opacity: <值>

  TitleGroup [Node] [UITransform: auto]
    TitleRow [Node] [UITransform: auto] [Layout: horizontal]
      GameTitle [Label] [UITransform: auto]
        描述: 游戏主标题
        文本: "中文标题" / "English Title"
        FontSize: 64
        Color: <颜色>

  PrimaryBtn [Node] [UITransform: 240x56]
    描述: 主按钮
    Position: (0, -50)
    PrimaryBtn_BG [Sprite] [UITransform: 240x56]
      Color: <渐变或纯色>
    PrimaryBtn_Label [Label]
      文本: "按钮文字" / "Button Text"
      FontSize: 20
      Color: <颜色>
```

---

## 资源切图表格式

| # | 资源名称 | 文件名 | 尺寸 | 格式 | 九宫格 | 说明 |
|---|---------|--------|------|------|--------|------|
| 1 | 背景 | bg_page_name.png | 2712x1220 | PNG | 否 | 全屏合成图 |
| 2 | 装饰图标 | icon_deco.png | 128x128 | PNG | 否 | 透明背景 |
| ... | ... | ... | ... | ... | ... | ... |

### 资源命名规则

| 前缀 | 用途 | 示例 |
|------|------|------|
| `bg_*` | 全屏/大面积背景 | `bg_main_menu.png` |
| `icon_*` | 小图标、装饰 | `icon_gear_deco.png` |
| `btn_*` | 按钮背景、边框 | `btn_primary_bg.png` |
| `char_*` | 角色立绘、头像 | `char_hero_portrait.png` |
| `frame_*` | 面板边框、卡片背景 | `frame_card_border.png` |
| `fx_*` | 粒子贴图、发光特效 | `fx_glow_particle.png` |

### 资源路径

资源路径遵循三层归属模型（详见 → [asset-binding.md](asset-binding.md)）：

| 场景 | 路径 | 说明 |
|------|------|------|
| 静态引用（拖入 Prefab） | `assets/textures/<ownership>/<page-name>/` | 不进 resources |
| 动态加载（运行时路径加载） | `assets/resources/textures/<ownership>/<page-name>/` | 进 resources |

其中 `<ownership>` 为归属分类：`common`（全局复用）/ `pages`（页面专属）/ `modules`（跨页面业务模块）。

> **原则**：能拖进 Prefab 的不进 resources，必须靠路径加载的才进 resources。
