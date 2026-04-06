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

`assets/resources/textures/<page-name>/`
