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
  "targetDir": "assets/resources/textures/<page-name>/",
  "category": "decoration",
  "type": "sprite-frame",
  "status": "missing",
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
| `assetPath` | ✅ | 相对项目根的完整路径 |
| `targetDir` | - | 切图目标目录，null 表示已在位 |
| `category` | ✅ | 分类: background / decoration / icon / button / effect / character / card / frame |
| `type` | ✅ | Cocos 资源类型: sprite-frame / texture / spine / particle |
| `status` | ✅ | 状态: missing / exists / ready |
| `uuid` | - | 图片资源主 UUID（从 .meta 顶层 uuid） |
| `spriteFrameUuid` | - | SpriteFrame 子资源 UUID（格式: `<uuid>@f9941`） |
| `meta` | - | 尺寸、格式、九宫格信息 |
| `boundToNodes` | - | Prefab 中引用此资源的节点路径数组 |

---

## 状态机

```
missing  →  exists  →  ready
  |           |          |
  |           |          └─ UUID 已填充，可 MCP 绑定
  |           └─ 文件存在但 UUID 未提取
  └─ 需要切图/生成
```

### 状态转换

1. **missing → exists**: 将切图文件放入 `targetDir`
2. **exists → ready**: 运行 `tools/resolve-asset-uuids.js` 自动从 `.meta` 文件解析填充 UUID

---

## MCP 绑定关键

在通过 Cocos MCP 绑定 `cc.Sprite.spriteFrame` 属性时，**始终使用 `spriteFrameUuid`**（带 `@f9941` 后缀），而不是主 `uuid`。

```
正确: spriteFrameUuid = "abc123@f9941"  →  cc.Sprite.spriteFrame
错误: uuid = "abc123"                    →  这是原始图片资源，不是 SpriteFrame
```

---

## JSON Schema

完整的 JSON Schema 定义应放在项目级 `design-dna/asset-manifest.schema.json` 中。

关键约束：
- `version` 固定为 `"1.0.0"`
- `category` 枚举：`background | decoration | icon | button | effect | character | card | frame`
- `type` 枚举：`sprite-frame | texture | spine | particle`
- `status` 枚举：`missing | exists | ready`
