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

<!-- ⚠️ 格式规则：
  1. 每个资源必须独立一节（## 资源 #N: 中文描述 — `filename.png`）
  2. 严禁多个资源合并到同一节或同一代码块
  3. 每节必须包含：属性表 + 独立 Prompt 代码块
  4. 序号必须与资源清单表格中的 # 列一一对应
  5. 相似资源（如多种卡牌背景）也必须每个单独一节
  6. 属性表只放「输出文件/尺寸/格式/用途/绑定节点」，九宫格/路径等技术参数由 asset-manifest.json 管理，不在此重复
  7. 禁止「后处理 / 制作说明」节 — 路径和九宫格参数已在 asset-manifest.json 中定义
-->

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
