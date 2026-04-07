# 资产绑定协议 (Asset Binding Protocol)

本章解决设计文档到 Cocos Prefab 的资源 UUID 映射断裂问题。

## asset-manifest.json

每个界面生成 `design-dna/components/<page-name>/asset-manifest.json`。

### 顶层结构

```json
{
  "version": "1.0.0",
  "page": "<page-name>",
  "generatedAt": null,
  "description": "界面描述",
  "assets": [ ... ]
}
```

### 每个资产条目 (AssetEntry)

```json
{
  "id": "icon_gear_deco_s",
  "designRef": "DecoGear_TL.SpriteFrame",
  "filename": "icon_gear_deco_s.png",
  "assetPath": "assets/resources/textures/<page-name>/icon_gear_deco_s.png",
  "category": "decoration",
  "type": "sprite-frame",
  "status": "missing",
  "loadType": "dynamic",
  "sourceFile": "design-dna/components/<page-name>/assets/raw/icon_gear_deco_s_raw.png",
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
| `assetPath` | ✅ | 相对项目根的完整路径（目录由 `loadType` 决定） |
| `category` | ✅ | 分类: background / decoration / icon / button / effect / character / card / frame / node / ui |
| `type` | ✅ | Cocos 资源类型: sprite-frame / texture / spine / particle |
| `status` | ✅ | 状态: missing / exists / ready / deprecated / size_mismatch |
| `uuid` | - | 图片资源主 UUID（从 .meta 顶层 uuid） |
| `spriteFrameUuid` | - | SpriteFrame 子资源 UUID（格式: `<uuid>@f9941`） |
| `meta` | - | 尺寸、格式、九宫格信息 |
| `boundToNodes` | - | Prefab 中引用此资源的节点路径数组 |
| `loadType` | - | 加载方式: `static`（@property 绑定，放 assets/textures/）/ `dynamic`（resources.load，放 assets/resources/textures/）。默认 `dynamic` |
| `sourceFile` | - | AI 生成的原始资产路径（相对项目根），如 `design-dna/components/<page>/assets/raw/xxx_raw.png`。null 表示直接手工制作或代码生成。原图可能需要去背景等后处理 |

---

## 状态机

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
│art-prompts│→ │design-dna/       │→ │复制到 assetPath 指向的  │→ │.meta 自动生成     │
│.md 生成   │   │components/<page>/│   │目录（由 loadType 决定）│   │resolve-asset-uuids│
│(含尺寸)   │   │assets/raw/       │   │static → assets/textures/│   │→ status=ready     │
│           │   │  xxx_raw.png     │   │dynamic→ assets/resources/│  │→ MCP/Prefab 绑定  │
└──────────┘   └──────────────────┘   └────────────────────────┘   └──────────────────┘
```

- **原资产目录** `design-dna/components/<page>/assets/raw/` — 保存 AI 生成的原始图片，不参与 Cocos 构建
- `sourceFile` 字段记录原资产路径，建立设计产物→最终资产的可追溯关联。原图可能需要去背景等后处理后再放入正式目录
- `assetPath` 的目录由 `loadType` 决定（需要目录时用 `path.dirname(assetPath)`）：
  - `static` → `assets/textures/<page>/xxx.png`（Prefab @property 绑定，构建器自动依赖追踪）
  - `dynamic` → `assets/resources/textures/<page>/xxx.png`（代码 resources.load）
- AI 生成时 prompt 已指定精确尺寸，**不需要裁切/缩放**。尺寸不符应调整 prompt 重新生成

---

## MCP 绑定关键

在通过 Cocos MCP 绑定 `cc.Sprite.spriteFrame` 属性时，**始终使用 `spriteFrameUuid`**（带 `@f9941` 后缀），而不是主 `uuid`。

```
正确: spriteFrameUuid = "abc123@f9941"  →  cc.Sprite.spriteFrame
错误: uuid = "abc123"                    →  这是原始图片资源，不是 SpriteFrame
```

---

## 静态引用 vs 动态加载 — 资源目录决策

资源放 `assets/textures/` 还是 `assets/resources/textures/` 取决于**加载方式**：

### 决策矩阵

| 加载方式 | 目录 | 适用场景 | 实现方式 |
|---------|------|---------|---------|
| **静态引用** | `assets/textures/` | 路径写死、内容固定不变的资源（如固定背景图、按钮图标） | `@property(SpriteFrame)` 在 PageComp 中声明，Prefab 序列化绑定 UUID |
| **动态加载** | `assets/resources/textures/` | 运行时根据数据决定加载哪个资源（如根据角色 ID、敌人 ID 拼路径） | `resources.load('textures/xxx')` 或 `loadImageToSprite()` |

### 判断原则

1. **问：代码中加载路径是否写死（字符串常量）？**
   - 是 → **静态引用**。直接在 Prefab 中用 `@property(SpriteFrame)` 绑定，不需要放 `resources/`
   - 否（路径由变量拼接，如 `` `textures/characters/${characterId}` ``）→ **动态加载**。必须放 `resources/`

2. **`resources/` 目录的代价**：构建时 `resources/` 下的**所有**资源都会打入包中（无论是否使用），滥用会导致包体膨胀

### PageComp 静态绑定实现

```typescript
// PageComp 中声明
@property(SpriteFrame)
backgroundSpriteFrame: SpriteFrame = null!;
```

```json
// Prefab JSON 序列化 — 从 .meta 文件获取 spriteFrameUuid
"backgroundSpriteFrame": {
  "__uuid__": "<uuid>@f9941",
  "__expectedType__": "cc.SpriteFrame"
}
```

```typescript
// Renderer 中使用 — 优先静态引用，fallback 动态加载
private _loadBackgroundImage(): void {
    if (!this._bgSprite) return;
    if (this._comp?.backgroundSpriteFrame) {
        // 静态引用（零运行时开销，构建器自动追踪依赖）
        this._bgSprite.spriteFrame = this._comp.backgroundSpriteFrame;
    } else {
        // Fallback: 动态加载（兼容 Prefab 尚未绑定的过渡状态）
        this.loadImageToSprite('textures/backgrounds/xxx', this._bgSprite);
    }
}
```

### 项目标准目录结构

```
assets/textures/                    ← 静态引用资源（Prefab @property 绑定）
├── backgrounds/                    ← 固定背景（main_menu_bg, battle_bg, map_bg）
├── cards/                          ← 卡牌图（Prefab 中拖拽绑定）
├── ui/                             ← UI 图标/按钮（Prefab 中拖拽绑定）
└── effects/                        ← 特效图

assets/resources/textures/          ← 动态加载资源（resources.load()）
├── backgrounds/                    ← 全部背景图（含固定背景的 fallback 副本）
│   ├── main_menu_bg.png            ← fallback 副本（Renderer 静态引用为 null 时兜底）
│   ├── battle_bg.png               ← fallback 副本
│   ├── map_bg.png                  ← fallback 副本
│   ├── boss_bg.png                 ← 动态专用（DialogueRenderer）
│   └── shop_bg.png                 ← 动态专用（DialogueRenderer）
├── characters/                     ← 角色立绘（根据角色 ID 动态加载）
├── enemies/                        ← 敌人立绘（根据敌人 ID 动态加载）
└── route-map/                      ← 地图图标（根据节点类型动态加载）
```

> **为什么固定背景在 resources 有副本**：CLI 构建器在序列化 Prefab 时，如果自定义脚本的 `__type__` 无法解析（Missing class 警告），会跳过该组件的全部 `@property` UUID 引用，导致静态绑定的资源不被依赖追踪、不打入构建包。resources 副本确保 Renderer 的 fallback `resources.load()` 路径在构建后仍可用。

---

## JSON Schema

完整的 JSON Schema 定义应放在项目级 `design-dna/asset-manifest.schema.json` 中。

关键约束：
- `version` 固定为 `"1.0.0"` 或 `"1.1.0"`
- `category` 枚举：`background | decoration | icon | button | effect | character | card | frame | node | ui`
- `type` 枚举：`sprite-frame | texture | spine | particle`
- `status` 枚举：`missing | exists | ready | deprecated | size_mismatch`
- `loadType` 枚举：`static | dynamic`（默认 `dynamic`）
- `sourceFile`：字符串或 null，指向 `design-dna/components/<page>/assets/raw/` 下的原始资产
- `meta.size`：`{ w, h }` 为预设尺寸（必填），`resolve-asset-uuids.js` 直接从 Cocos `.meta` 文件的 `subMetas.f9941.userData.rawWidth/rawHeight` 读取实际像素尺寸进行校验（零额外 I/O），不符则标记 `size_mismatch`
