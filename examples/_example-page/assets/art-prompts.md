# <页面中文名> (<Page Name>) — 美术资源生成清单

> **用途**：为 AI 绘图工具（如 Midjourney / Stable Diffusion / DALL·E）提供精确的 Prompt，生成本页面所需的全部切图资源。
> **设计来源**：`cocos-dna/components/<page>/design.md` 第6章
> **原资产保存目录**：`cocos-dna/components/<page>/assets/raw/`（AI 生成的原始 PNG，不参与 Cocos 构建）
> **正式目录**：以 `asset-manifest.json` 中各资源的 `assetPath` 为准（由 `loadType` 决定 static/dynamic 目录）

---

## 风格基调 (Style Foundation)

所有资源必须遵循以下统一风格：

- **世界观**: <从 design-dna.json → design_style 提取>
- **色系**: <从 design-dna.json → design_system.color 提取主要色彩和色值>
- **质感**: <质感描述>
- **背景**: 所有切图均需**透明背景** (PNG with alpha)，除非特别标注
- **风格参考**: <游戏/UI 风格参考>

---

## 资源 #1: <中文描述> — `<filename>.png`

| 属性 | 值 |
|------|-----|
| **输出文件** | `<filename>.png` |
| **尺寸** | <宽> × <高> px |
| **格式** | PNG (透明背景/非透明) |
| **用途** | <具体用途描述> |
| **绑定节点** | <Prefab 中绑定的节点名> |

### Prompt

```
<英文 AI 绘图 Prompt，一个完整段落>
```

### 中文参考（可选）

```
<中文翻译版 Prompt，辅助理解>
```

---

## 资源 #2: <中文描述> — `<filename>.png`

| 属性 | 值 |
|------|-----|
| **输出文件** | `<filename>.png` |
| **尺寸** | <宽> × <高> px |
| **格式** | PNG |
| **用途** | <用途> |
| **绑定节点** | <节点名> |

### Prompt

```
<英文 AI 绘图 Prompt>
```

---

## 资源 #3: 兔子角色 轻拳攻击 Sprite Sheet — `rabbit_light_punch.png`

> **📌 这是 Level B（复杂动作）的示例 — 注意 Prompt 中包含动作阶段描述短语。**

| 属性 | 值 |
|------|-----|
| **输出文件** | `rabbit_light_punch.png` |
| **角色** | 兔子（rabbit） |
| **动作** | light_punch（轻拳） |
| **帧数** | 6 帧 |
| **帧尺寸** | 64 × 64 px（每帧） |
| **排列** | 水平排列 6列×1行 |
| **总尺寸** | 384 × 64 px |
| **格式** | PNG（透明背景） |
| **用途** | 兔子角色轻拳攻击序列帧 |
| **绑定节点** | BattleRoot/PlayerArea/CharSprite |

### Prompt

```
2D side-view humanoid rabbit character sprite sheet, chibi style,
white fur, long upright ears with pink lining, brown leather vest,
cream tunic, red eyes, quick jab punch attack,
from wind-up to follow-through, dynamic action,
64x64 per frame, 6 frames,
transparent background, pixel-perfect, game asset, clean outline
```

<!-- ✅ Level B 关键点：
     - "quick jab punch attack" = 具体动作描述
     - "from wind-up to follow-through" = 动作阶段术语（蓄力→出拳→收招）
     - "dynamic action" = 增强动感
     - 不写 Frame 1:... Frame 2:... -->

---

## 资源 #4: 兔子角色 闪避 Sprite Sheet — `rabbit_dodge.png`

> **📌 这也是 Level B（复杂动作）的示例。**

| 属性 | 值 |
|------|-----|
| **输出文件** | `rabbit_dodge.png` |
| **角色** | 兔子（rabbit） |
| **动作** | dodge（闪避） |
| **帧数** | 4 帧 |
| **帧尺寸** | 64 × 64 px（每帧） |
| **排列** | 水平排列 4列×1行 |
| **总尺寸** | 256 × 64 px |
| **格式** | PNG（透明背景） |
| **用途** | 兔子角色闪避序列帧 |
| **绑定节点** | BattleRoot/PlayerArea/CharSprite |

### Prompt

```
2D side-view humanoid rabbit character sprite sheet, chibi style,
white fur, long upright ears with pink lining, brown leather vest,
cream tunic, red eyes, quick dodge backward,
anticipation to recovery, agile movement,
64x64 per frame, 4 frames,
transparent background, pixel-perfect, game asset, clean outline
```

---

<!-- ⚠️ Prompt 描述深度规则（基于行业调研）：
     ╔═══════════════════════════════════════════════════════════╗
     ║ Level A — 简单循环（idle/walk/run）                        ║
     ║   → 纯关键词：动作名 + 帧数，如 "running pose, 4 frames"   ║
     ║                                                           ║
     ║ Level B — 复杂动作（attack/cast/dodge/hit/death）          ║
     ║   → 关键词 + 动作阶段短语：                                ║
     ║     "from wind-up to follow-through" (蓄力→收招)           ║
     ║     "anticipation to release" (预备→释放)                  ║
     ║     "impact and recoil" (命中→反冲)                        ║
     ║                                                           ║
     ║ Level C — 单帧定格（jump/slide/stand）                     ║
     ║   → 关键词 + 姿态特征："arms up, legs bent"                ║
     ║                                                           ║
     ║ ❌ 绝对禁止：Frame 1:... Frame 2:... 逐帧描述             ║
     ╚═══════════════════════════════════════════════════════════╝

     其他规则：
     1. 关键词扁平化，逗号分隔，不写长句
     2. 视角 + 画风在最前面（2D side-view xxx character, chibi style）
     3. 角色外观关键词从「角色外观基线」复制，保证一致性
     4. 必含 transparent background + game asset/game sprite
     5. 每新增一个动作照此格式新增独立章节 -->

## 共享资源 (复用其他页面)（如有）

以下资源从其他页面复用，不需单独生成：

| # | 文件名 | 来源 | 用途 |
|---|--------|------|------|
| S1 | `<shared_asset>.png` | <来源页面> | <用途> |

---

## 批量生成检查清单

| # | 文件名 | 尺寸 | 九宫 | 难度 | 状态 |
|---|--------|------|------|------|------|
| 1 | `<filename>.png` | <宽>×<高> | ✅/❌ | 🟢低/🟡中/🔴高 | ⬜ 待生成 |
| 2 | `<filename>.png` | <宽>×<高> | ✅/❌ | 🟢低/🟡中/🔴高 | ⬜ 待生成 |

**小计**：<N> 个独立资源 + <M> 个共享资源

---

## 生成后操作流程

1. **保存原资产**：将所有 AI 生成的原始 PNG 放入 `cocos-dna/components/<page>/assets/raw/` 目录
2. **后处理（如需）**：检查原图是否有背景不透明等问题，如有则处理后再放入正式目录
3. **放置到正式目录**：根据 asset-manifest.json 中的 `loadType` 和 `assetPath` 决定目标：
   - `loadType: "static"` → 放入 `assets/textures/<page>/`（Prefab @property 绑定）
   - `loadType: "dynamic"` → 放入 `assets/resources/textures/<page>/`（代码动态加载）
   - 未标注 `loadType` 的按 `dynamic` 处理
4. **刷新编辑器**：在 Cocos Creator 中刷新资源管理器，等待 `.meta` 文件自动生成
5. **解析 UUID**：运行 `node tools/resolve-asset-uuids.js <page> --verbose`
6. **验证状态**：确认 `asset-manifest.json` 中所有资源状态变为 `ready`
7. **绑定资源**：Agent 可通过 MCP 将真实 SpriteFrame UUID 绑定到 Prefab 节点

---

**创建日期**：<YYYY-MM-DD>
**设计来源**：cocos-dna/components/<page>/design.md v<版本号>
