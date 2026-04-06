# cocos-dna

**Cocos Creator UI 设计规范技能** — 将设计 DNA 转换为 Cocos Creator 原生组件和 Prefab。

## 概述

cocos-dna 是一个 AI Agent 技能，用于将 UI 设计参考图转换为 Cocos Creator 可用的 Prefab、组件脚本和渲染器代码。

基于 [design-dna](https://github.com/zanwei/design-dna) 扩展，保留其 Phase 1（结构）和 Phase 2（分析），重写 Phase 3 为 **DNA 数据驱动转换方案** — 将 DNA JSON 映射为 Cocos Creator 原生组件，通过 MCP 工具自动生成 Prefab 文件和节点树。

## 三阶段工作流

```
Phase 1: 结构          Phase 2: 分析          Phase 3: 生成（Cocos 转换）
 [design-dna]           [design-dna]            [cocos-dna]
┌─────────────┐     ┌─────────────────┐     ┌──────────────────────────┐
│ 展示 Schema │ ──→ │ 从参考图提取    │ ──→ │ DNA → Cocos 组件映射     │
│ 三维度字段   │     │ Design DNA JSON │     │ → MCP 创建节点/Prefab    │
└─────────────┘     └─────────────────┘     └──────────────────────────┘
```

### Phase 1: 结构（由 design-dna 执行）
- 展示三维度 Schema 结构
- 询问用户是否需要定制

### Phase 2: 分析（由 design-dna 执行）
- 从参考图提取 Design DNA JSON
- 每字段必须填充值

### Phase 3: 生成（cocos-dna 核心）
- 解析 DNA JSON
- 映射为 Cocos 组件（`cc.Sprite`, `cc.Label`, `cc.Button`, `cc.Layout` 等）
- 生成 UI 结构协议文档（design.md）
- 生成资产绑定清单（asset-manifest.json）
- 生成 AI 绘图 Prompt 清单（art-prompts.md）
- 通过 MCP 自动创建 Prefab
- 生成 PageComp.ts + Renderer.ts

## 核心特性

- **DNA 数据驱动** — 所有颜色、字号、间距、动画参数可追溯到 DNA JSON
- **MCP 自动创建** — 通过 Cocos MCP 工具自动创建节点树和 Prefab
- **完整动效规范** — 支持粒子系统、持续动画、背景动效的完整定义
- **AI 绘图集成** — 自动生成美术资源的 AI 绘图 Prompt
- **双语支持** — 所有 Label 同时输出中英文

## 安装

### 依赖

cocos-dna 依赖 [design-dna](https://github.com/zanwei/design-dna) skill。请先安装：

```
https://github.com/zanwei/design-dna
```

### 安装 cocos-dna

将本仓库克隆到项目的 `.codebuddy/skills/` 目录：

```bash
cd your-project/.codebuddy/skills/
git clone https://github.com/ACGN-2D/cocos-dna.git
```

## 触发词

- "解析这张图的 UI 结构"
- "为这个界面设计 Cocos 节点树"
- "生成 UI 设计规范"
- "将 DNA 映射为 Cocos 组件"
- "用 MCP 生成 Prefab"
- "cocos-dna"

## 输出物

| 产物 | 路径 | 说明 |
|------|------|------|
| Design DNA JSON | `design-dna/design-dna.json` | 唯一真相源 (SSOT) |
| UI 结构协议文档 | `design-dna/components/<page>/design.md` | 8章 Markdown |
| 资产绑定清单 | `design-dna/components/<page>/asset-manifest.json` | Sprite UUID 映射 |
| AI 绘图 Prompt | `design-dna/components/<page>/assets/art-prompts.md` | 美术资源生成指引 |
| Prefab 组件脚本 | `assets/scripts/ui/<page>/<Page>Comp.ts` | @property 声明 |
| 渲染器脚本 | `assets/scripts/ui/<page>/<Page>Renderer.ts` | DNA 驱动逻辑 |
| Prefab 文件 | `assets/resources/prefabs/<page>.prefab` | Cocos 编辑器创建 |

## 参考资料

| 文件 | 说明 |
|------|------|
| [references/design-dna-schema.md](references/design-dna-schema.md) | 三维度设计系统 JSON Schema |
| [references/node-spec.md](references/node-spec.md) | 节点命名规范、节点信息格式 |
| [references/asset-binding.md](references/asset-binding.md) | 资产绑定协议、状态机 |
| [references/example-design.md](references/example-design.md) | 输出格式示例 |

## License

MIT
