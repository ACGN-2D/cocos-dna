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
