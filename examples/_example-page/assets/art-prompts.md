# <页面名> — AI 绘图 Prompt

> ⚠️ 格式示例，实际 Prompt 必须根据项目风格和 design-dna.json 中的视觉风格定义编写。

## 资源需求清单

| # | 资源名 | 类型 | 尺寸 | 用途 |
|---|--------|------|------|------|
| 1 | `<bg_name>.png` | 背景图 | <宽>×<高> | 页面全屏背景 |
| 2 | `<icon_name>.png` | 图标 | <W>×<H> | <用途描述> |

## Prompt 模板

### 1. 背景图：`<bg_name>.png`

**风格**：<从 design-dna.json → design_style 提取的视觉风格描述>
**配色**：<从 design-dna.json → design_system.color 提取的主要色彩>

```
<AI 绘图 Prompt 内容>
```

**后处理**：
- 调整尺寸至 <宽>×<高>
- 存放路径：`assets/raw/<bg_name>.png`（原始）→ `assets/resources/textures/<page>/<bg_name>.png`（Cocos 引用）

### 2. 图标：`<icon_name>.png`

```
<AI 绘图 Prompt 内容>
```

## 产出规范

- 原始资产存放：`assets/raw/`（不参与 Cocos 构建）
- 最终资产存放：`assets/resources/textures/<page>/`（Cocos 引用路径）
- 格式要求：PNG，透明背景（图标类）/ 不透明（背景类）
- 分辨率：按 design.md 中定义的设计分辨率
