# 资产绑定协议 (Asset Binding Protocol)

本章解决设计文档到 Cocos Prefab 的资源 UUID 映射断裂问题。

---

## 一、目录结构：三层归属分类（工业级推荐）

### 核心原则

- **一级按 ownership（归属）**：common / pages / modules
- **二级按复用层级**：具体的功能子分类
- **两棵树结构一致，加载语义不同**

```
assets/textures/                        ← 静态引用（Prefab @property 绑定）
├── common/                             ← 全局复用：所有页面都能用的基础 UI 资源
│   ├── buttons/                        ← 通用按钮（confirm, cancel, close）
│   │   ├── btn_primary_bg.png
│   │   ├── btn_secondary_bg.png
│   │   └── btn_hover_glow.png
│   ├── icons/                          ← 通用图标（装饰、分隔线等）
│   │   ├── icon_deco_s.png
│   │   ├── icon_deco_m.png
│   │   └── divider_fade.png
│   └── effects/                        ← 通用特效（粒子贴图等）
│       └── fx_particle_dot.png
│
├── pages/                              ← 页面专属：只有该页面使用
│   ├── <page-a>/                       ← 页面 A 专属（按项目实际页面命名）
│   │   ├── <page-a>_bg.png
│   │   └── ...
│   ├── <page-b>/                       ← 页面 B 专属
│   └── <page-c>/                       ← 页面 C 专属
│
└── modules/                            ← 跨页面业务模块：多个页面复用的完整业务组件
    └── (暂无，未来如 reward-popup / hero-panel 可放此处)

assets/resources/textures/              ← 动态加载（resources.load()）
├── common/                             ← 全局动态复用（尽量少用，只放主题切换类资源）
│   └── themes/                         ← 皮肤/主题动态切换
│
├── pages/                              ← 页面专属动态资源
│   ├── <page-a>/                       ← 页面 A 动态资源（按 ID / 类型动态加载的资源）
│   │   ├── item_bg_type1.png
│   │   ├── item_bg_type2.png
│   │   └── ...
│   ├── <page-b>/                       ← 页面 B 动态资源
│   └── <page-c>/                       ← 页面 C 动态资源
│
├── characters/                         ← 实体类型：按角色 ID 动态加载
│   ├── <character_id>.png
│   └── ...
├── enemies/                            ← 实体类型：按敌人 ID 动态加载
│   ├── <enemy_id>.png
│   └── ...
├── backgrounds/                        ← 背景 fallback 副本（静态绑定失败时的兜底）
│   ├── <page-a>_bg.png
│   └── ...
│
└── modules/                            ← 跨页面业务模块动态资源
    └── (暂无)
```

### 三层定义

| 层级 | 含义 | 判断标准 | 典型资源 |
|------|------|---------|---------|
| **common** | 全局复用 | 所有人都能用，无页面归属 | `btn_primary_bg`, `icon_deco_s`, `fx_particle_dot`, `divider_fade` |
| **pages** | 页面拥有 | 仅该页面使用，其他页面不引用 | `<page-a>/bar_hp_bg`, `<page-c>/icon_node_xxx` |
| **modules** | 功能模块拥有 | 跨多个页面复用的完整业务模块 | `reward-popup/`, `hero-panel/`（未来） |

### ⚠️ 分类容易误判的注意点

- `characters/` 和 `enemies/` **不属于任何页面也不属于 common**，它们是**实体类型（entity-type）**目录，按 ID 动态加载，直接放 `resources/textures/` 一级。
- `backgrounds/` 的 fallback 副本也是类似的实体类型目录，不归入 pages。
- common **尽量不进 resources**。因为 common 本来就是高频常驻资源，放 resources 反而增加管理负担。只有动态主题切换场景才需要 `resources/textures/common/themes/`。

---

## 二、唯一 Owner 原则（最重要的规则）

### 口诀

> **能拖进 Prefab 的，不进 resources。必须靠路径加载的，才进 resources。**

### 规则

1. **同一资源只能有唯一物理位置（owner）**。禁止在 `assets/textures/` 和 `assets/resources/textures/` 同时存放相同文件。

2. **唯一例外：背景图 fallback 模式**。3 个页面背景图允许在 `assets/textures/pages/<page>/` 和 `assets/resources/textures/backgrounds/` 各有一份，因为项目使用"静态优先 + 动态 Fallback"双保险模式，且这是基于 Cocos CLI 构建器序列化 Missing class 问题的已知工程妥协。

### 决策矩阵

| 问题 | 答案 → 放哪 |
|------|-------------|
| Prefab 中直接拖引用？ | → `assets/textures/` (static) |
| 代码中 `resources.load()` 路径拼接？ | → `assets/resources/textures/` (dynamic) |
| 路径是字符串常量？ | → 优先考虑改为 @property 静态引用 |
| 路径包含变量（如 `${characterId}`）？ | → 必须放 resources |

### ⚠️ loadType 决策规则（Agent 必须遵守）

**核心原则：static 优先，dynamic 是例外。**

为每个资源回答以下 3 个问题，选择第一个匹配的结论：

| # | 判断问题 | 如果"是" | loadType |
|---|---------|---------|----------|
| 1 | 路径中包含**变量**（如 `${characterId}`、`${enemyId}`）？ | 必须运行时拼接 | **dynamic** |
| 2 | 同一节点会在运行时**切换不同图片**（如换肤、卡牌类型切换）？ | 需要动态替换 | **dynamic** |
| 3 | 资源在整个页面生命周期中**固定不变**？（装饰、按钮底图、图标、背景、分隔线、粒子贴图等） | 可以直接绑 Prefab | **static** |

**常见分类速查**：

| 资源类型 | loadType | 理由 |
|---------|----------|------|
| 页面背景 | **static** | 固定不变，Prefab 直接引用 |
| 装饰齿轮/图标 | **static** | 固定装饰，不会运行时切换 |
| 按钮底图 (primary/secondary) | **static** | 通用固定样式 |
| 分隔线 | **static** | 纯装饰 |
| 粒子贴图 | **static** | 贴图本身固定（着色在代码中） |
| 按钮悬停发光叠层 | **static** | 资源固定，只是透明度变化 |
| 角色立绘 (`${id}`) | **dynamic** | 按数据 ID 动态加载 |
| 卡牌背景 (按类型切换) | **dynamic** | 运行时数据驱动 |
| 敌人图片 (`${id}`) | **dynamic** | 按数据 ID 动态加载 |
| 主题皮肤资源 | **dynamic** | 运行时切换主题 |

> **❌ 错误模式**：把所有资源都标 `dynamic`（"反正 resources.load 也能用"）。
> 后果：resources/ 目录膨胀 → 包体增大 → 多余的异步 IO → 缓存管理负担。

### loadType 与目录的映射

| loadType | assetPath 前缀 | 实现方式 |
|----------|---------------|---------|
| `static` | `assets/textures/common/` 或 `assets/textures/pages/<page>/` | `@property(SpriteFrame)` 在 PageComp 中声明，Prefab 序列化绑定 UUID |
| `dynamic` | `assets/resources/textures/pages/<page>/` 或 `assets/resources/textures/<entity-type>/` | `resources.load('textures/...')` 或 `loadImageToSprite()` |

---

## 三、asset-manifest.json

每个界面生成 `cocos-dna/components/<page-name>/asset-manifest.json`。

### 顶层结构

```json
{
  "version": "1.1.0",
  "page": "<page-name>",
  "generatedAt": null,
  "description": "界面描述",
  "assets": [ ... ]
}
```

### 每个资产条目 (AssetEntry)

```json
{
  "id": "icon_example",
  "designRef": "DecoElement_TL.SpriteFrame",
  "filename": "icon_example.png",
  "assetPath": "assets/textures/common/icons/icon_example.png",
  "category": "decoration",
  "type": "sprite-frame",
  "status": "missing",
  "loadType": "static",
  "ownership": "common",
  "sourceFile": "cocos-dna/components/<page-name>/assets/raw/icon_example_raw.png",
  "uuid": null,
  "spriteFrameUuid": null,
  "meta": {
    "size": { "w": 64, "h": 64 },
    "format": "PNG",
    "nineSlice": null
  },
  "boundToNodes": ["PageRoot/DecoGear_TL"]
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | ✅ | 资源唯一标识符 (snake_case) |
| `designRef` | ✅ | 设计文档中引用此资源的节点.属性 |
| `filename` | ✅ | 文件名（不含路径） |
| `assetPath` | ✅ | 相对项目根的完整路径（遵循三层目录结构） |
| `category` | ✅ | 分类: background / decoration / icon / button / effect / character / card / frame / node / ui |
| `type` | ✅ | Cocos 资源类型: sprite-frame / texture / spine / particle |
| `status` | ✅ | 状态: missing / exists / ready / deprecated / size_mismatch |
| `loadType` | ✅ | 加载方式: `static`（@property 绑定）/ `dynamic`（resources.load）。**⚠️ 无默认值，必须逐项判断**（见下方决策规则） |
| `ownership` | ✅ | 归属层级: `common` / `page` / `module` / `entity-type`。决定 assetPath 中的子目录 |
| `uuid` | - | 图片资源主 UUID（从 .meta 顶层 uuid） |
| `spriteFrameUuid` | - | SpriteFrame 子资源 UUID（格式: `<uuid>@f9941`） |
| `meta` | - | 尺寸、格式、九宫格信息 |
| `boundToNodes` | - | Prefab 中引用此资源的节点路径数组 |
| `sourceFile` | - | AI 生成的原始资产路径（相对项目根），null 表示直接手工制作或代码生成 |

### ownership 与 assetPath 对应关系

| ownership | loadType=static assetPath | loadType=dynamic assetPath |
|-----------|--------------------------|---------------------------|
| `common` | `assets/textures/common/<sub>/...` | `assets/resources/textures/common/<sub>/...`（尽量避免） |
| `page` | `assets/textures/pages/<page>/...` | `assets/resources/textures/pages/<page>/...` |
| `module` | `assets/textures/modules/<module>/...` | `assets/resources/textures/modules/<module>/...` |
| `entity-type` | — | `assets/resources/textures/<entity-type>/...`（characters/enemies/backgrounds） |

---

## 四、状态机

```
missing  →  exists  →  ready
  |           |          |
  |           |          └─ UUID 已填充，可 MCP 绑定
  |           └─ 文件存在但 UUID 未提取
  └─ 需要切图/生成

size_mismatch ← exists/ready（尺寸校验失败时回退到此状态）
  → 需要 AI 重新生成正确尺寸的图片
```

### 状态转换

1. **missing → exists**: 将图片文件放入 `assetPath` 指向的目录（根据 `loadType` 选择 static 或 dynamic 目录）
2. **exists → ready**: 运行 `tools/resolve-asset-uuids.js` 自动从 `.meta` 文件解析填充 UUID
3. **exists/ready → size_mismatch**: `resolve-asset-uuids.js` 检测到 PNG 实际像素与 `meta.size` 预设不符

### 完整资产生命周期

```
AI 绘图          原资产存放              放入正式目录                Cocos 集成
┌──────────┐   ┌──────────────────┐   ┌────────────────────────┐   ┌──────────────────┐
│art-prompts│→ │cocos-dna/        │→ │复制到 assetPath 指向的  │→ │.meta 自动生成     │
│.md 生成   │   │components/<page>/│   │目录（三层结构判定归属）│   │resolve-asset-uuids│
│(含尺寸)   │   │assets/raw/       │   │common→ textures/common/│   │→ status=ready     │
│           │   │  xxx_raw.png     │   │page → textures/pages/  │   │→ MCP/Prefab 绑定  │
└──────────┘   └──────────────────┘   │entity→ resources/...   │   └──────────────────┘
                                      └────────────────────────┘
```

> **Smart Discovery 简化流程**：资产放入 `assets/` 目录的*任意合理位置*后，运行 `resolve-asset-uuids.js`，脚本会自动发现资产、修正 `assetPath`、填充 UUID。无需严格按 manifest 预设路径放置。

---

## 四-B、Smart Discovery 规范 (v2.0)

### 问题背景

Phase 3 设计阶段先生成 `asset-manifest.json`（`assetPath` 基于目录规范预设），美术资源后续异步、逐步生成。两者之间存在**时序断裂**：

1. **路径猜错** — manifest 预设 `resources/textures/main-menu/`，实际放 `textures/common/buttons/`
2. **资源重命名** — manifest 记录 `4.1 主菜单背景.png`，实际规范名 `main_menu_bg.png`
3. **低优先级目录** — NanoBanana（AI 原始生成）、raw（原始资产）被误选为最终路径

### 查找策略（三级 fallback）

`resolve-asset-uuids.js` v2.0 的 `locateAsset()` 按以下顺序查找：

```
Step 1: 精确路径
  按 assetPath 查找文件
  ├─ 找到 + 非低优先级目录 → ✅ 直接使用
  ├─ 找到 + 低优先级目录   → 继续 Step 2（寻找更优候选）
  └─ 未找到                → 继续 Step 2

Step 2a: 精确 filename 匹配
  按 filename（如 "btn_primary_bg.png"）在 assets/ 全局索引中查找
  ├─ 找到 + 有非低优先级候选 → ✅ selectBestCandidate
  └─ 全部是低优先级或未找到  → 继续 Step 2b

Step 2b: id 关键词模糊匹配
  从 id 提取关键词：
    1. 去掉前缀: bg_ / icon_ / btn_ / fx_
    2. 按 _ 分词，过滤长度<3的短词
    3. 文件名必须包含所有关键词
  例: id="bg_main_menu" → 关键词 ["main","menu"] → 匹配 "main_menu_bg.png" ✅
  ├─ 找到 → ✅ selectBestCandidate
  └─ 未找到 → ❌ 使用精确路径结果（即使低优先级）或标记 missing
```

### 优先级评分

`buildAssetIndex()` 为每个文件计算优先级分数（数字越小越优先）：

| 目录模式 | 基础 priority | 说明 |
|---------|:---:|------|
| `resources/textures/` | 3 | 动态加载标准目录 |
| `textures/pages/` | 4 | 页面专属静态目录 |
| `textures/common/` | 5 | 全局复用静态目录 |
| `textures/<other>/` | 6 | 其他 textures 子目录 |
| 其他 assets/ 目录 | 10 | 默认 |
| NanoBanana\* / raw/ / cocos-dna/ | 50 | 低优先级（原始/设计目录） |

`selectBestCandidate()` 在基础 priority 上叠加 **loadType 偏好**（权重 ±5）：

| loadType | 调整 | 效果 |
|----------|------|------|
| `static` + 非 resources 目录 | score -= 5 | 优先 `textures/`（静态引用） |
| `dynamic` + resources 目录 | score -= 5 | 优先 `resources/textures/`（动态加载） |

### 自动修正行为

当 Smart Discovery 找到更优候选时，自动写回 manifest：
- `assetPath` → 更新为发现的相对路径
- `sourceFile` → 同步更新（如原值等于旧 assetPath）
- `uuid` / `spriteFrameUuid` → 从新路径的 .meta 提取
- `status` → `ready` 或 `size_mismatch`（如尺寸不符但 UUID 仍填充）

### Agent 执行规范

**何时运行**：
- 每次美术资源有更新（新增/移动/重命名）
- Phase 3 生成 Prefab **前**必须先运行
- `--check` 模式可预览变更而不写入

**命令**：
```bash
# 处理所有页面
node .codebuddy/skills/cocos-dna/scripts/resolve-asset-uuids.js --project <path> --verbose

# 只处理指定页面
node .codebuddy/skills/cocos-dna/scripts/resolve-asset-uuids.js --project <path> --page main-menu --verbose

# 预览模式（不写入）
node .codebuddy/skills/cocos-dna/scripts/resolve-asset-uuids.js --project <path> --check --verbose
```

- **原资产目录** `cocos-dna/components/<page>/assets/raw/` — 保存 AI 生成的原始图片，不参与 Cocos 构建
- `sourceFile` 字段记录原资产路径，建立设计产物→最终资产的可追溯关联。原图可能需要去背景等后处理后再放入正式目录
- AI 生成时 prompt 已指定精确尺寸，**不需要裁切/缩放**。尺寸不符应调整 prompt 重新生成

---

## 五、MCP 绑定关键

在通过 Cocos MCP 绑定 `cc.Sprite.spriteFrame` 属性时，**始终使用 `spriteFrameUuid`**（带 `@f9941` 后缀），而不是主 `uuid`。

```
正确: spriteFrameUuid = "abc123@f9941"  →  cc.Sprite.spriteFrame
错误: uuid = "abc123"                    →  这是原始图片资源，不是 SpriteFrame
```

---

## 六、静态引用 vs 动态加载 — 深度指南

### 两棵树的职责差异

| 维度 | `assets/textures/`（静态） | `assets/resources/textures/`（动态） |
|------|--------------------------|-------------------------------------|
| **加载方式** | Prefab / Scene Inspector 直接引用 | `resources.load()` 运行时加载 |
| **生命周期管理** | 引擎自动（跟随 Prefab 打包、引用计数、依赖链释放） | **手动管理**（load / release，需要你自己控制） |
| **构建行为** | 构建器自动依赖分析，按需打入 | `resources/` 下**所有资源**都打入包（无论是否使用） |
| **适用场景** | 固定引用、内容不变、路径写死的资源 | 路径由变量拼接、运行时数据驱动的资源 |

### 决策口诀（写入团队规范）

> **能拖进 Prefab 的，不进 resources。必须靠路径加载的，才进 resources。**

### 通用按钮到底放哪？

`btn_primary_bg`、`btn_secondary_bg`、`icon_deco_*`、`divider_fade`、`fx_particle_dot` 等跨页面复用资源：

- ✅ 所有页面 Prefab 都直接拖引用 → 放 `assets/textures/common/`（**最佳**）
- ❌ 不需要每次 `resources.load()`，避免多余 IO 和 cache 管理

**唯一例外**：动态主题切换（如皮肤系统 `theme_dark_confirm_btn` / `theme_light_confirm_btn`）才放 `assets/resources/textures/common/themes/`。

### PageComp 静态绑定实现

```typescript
// PageComp 中声明
@property(SpriteFrame)
backgroundSpriteFrame: SpriteFrame = null!;

@property(SpriteFrame)
btnPrimaryBgSpriteFrame: SpriteFrame = null!;  // common 按钮也可静态绑定
```

```json
// Prefab JSON 序列化 — 从 .meta 文件获取 spriteFrameUuid
"backgroundSpriteFrame": {
  "__uuid__": "<uuid>@f9941",
  "__expectedType__": "cc.SpriteFrame"
}
```

```typescript
// Renderer 中使用 — 静态优先，fallback 动态加载
private _loadBackgroundImage(): void {
    if (!this._bgSprite) return;
    if (this._comp?.backgroundSpriteFrame) {
        // 静态路径（零运行时开销，构建器自动追踪依赖）
        this._bgSprite.spriteFrame = this._comp.backgroundSpriteFrame;
    } else {
        // Fallback: 动态加载（兼容 Prefab 尚未绑定的过渡状态）
        this.loadImageToSprite('textures/backgrounds/xxx', this._bgSprite);
    }
}
```

### 项目优化方向（通用建议）

**典型问题**：项目初期大量资源走动态加载（含 common 级按钮/图标），偏激进。

**优化路径**（渐进式，不需要一步到位）：

| 优先级 | 操作 | 收益 |
|--------|------|------|
| P0 | common 按钮/图标从 `resources/textures/` 迁移到 `textures/common/`，改为 @property 静态引用 | 减少 resources.load() 调用、降低包体冗余 |
| P1 | 各页面专属静态资源从 `resources/` 迁移到 `textures/pages/<page>/` | 进一步减少 resources 目录膨胀 |
| P2 | 保留 characters/enemies 等实体类型的动态加载（这些必须动态） | 维持正确的运行时数据驱动 |
| P3 | 保留 backgrounds/ fallback 副本（CLI 构建 Missing class 的工程妥协） | 双保险机制不变 |

---

## 七、assetPath 路径规则速查

### loadType=static（@property 绑定）

| ownership | assetPath 模式 |
|-----------|----------------|
| common 按钮 | `assets/textures/common/buttons/btn_primary_bg.png` |
| common 图标 | `assets/textures/common/icons/icon_deco_s.png` |
| common 特效 | `assets/textures/common/effects/fx_particle_dot.png` |
| 页面背景 | `assets/textures/pages/<page>/<page>_bg.png` |
| 页面专属 UI | `assets/textures/pages/<page>/bar_hp_bg.png` |

### loadType=dynamic（resources.load）

| ownership | assetPath 模式 | resources.load 路径 |
|-----------|----------------|---------------------|
| 页面动态资源 | `assets/resources/textures/pages/battle/card_bg_attack.png` | `textures/pages/battle/card_bg_attack` |
| 角色立绘 | `assets/resources/textures/characters/${id}.png` | `textures/characters/${id}` |
| 敌人立绘 | `assets/resources/textures/enemies/${id}.png` | `textures/enemies/${id}` |
| 背景 fallback | `assets/resources/textures/backgrounds/battle_bg.png` | `textures/backgrounds/battle_bg` |

> **注意**：resources.load 路径 = assetPath 去掉 `assets/resources/` 前缀和 `.png` 后缀。

---

## 八、禁止事项

1. ❌ **同一文件存两份**：禁止 `textures/common/X.png` 和 `resources/textures/common/X.png` 同时存在（背景 fallback 例外）
2. ❌ **common 资源归属到某个页面**：`btn_primary_bg` 不能放 `textures/pages/<page>/`，应放 `textures/common/buttons/`
3. ❌ **滥用 resources 目录**：能静态引用的资源不进 resources，`resources/` 下所有资源构建时全部打入包
4. ❌ **跨页面用"复用 xxx"注释代替正确归属**：如果多页面使用，应归入 common 或 modules，不应保留在某个 page 下标注"复用"

---

## 九、JSON Schema

完整的 JSON Schema 定义应放在项目级 `cocos-dna/asset-manifest.schema.json` 中。

关键约束：
- `version` 固定为 `"1.0.0"` 或 `"1.1.0"`
- `category` 枚举：`background | decoration | icon | button | effect | character | card | frame | node | ui`
- `type` 枚举：`sprite-frame | texture | spine | particle`
- `status` 枚举：`missing | exists | ready | deprecated | size_mismatch`
- `loadType` 枚举：`static | dynamic`（**无默认值，必须逐项判断**，见「loadType 决策规则」）
- `ownership` 枚举：`common | page | module | entity-type`
- `sourceFile`：字符串或 null，指向 `cocos-dna/components/<page>/assets/raw/` 下的原始资产
- `meta.size`：`{ w, h }` 为预设尺寸（必填），`resolve-asset-uuids.js` 直接从 Cocos `.meta` 文件的 `subMetas.f9941.userData.rawWidth/rawHeight` 读取实际像素尺寸进行校验（零额外 I/O），不符则标记 `size_mismatch`
