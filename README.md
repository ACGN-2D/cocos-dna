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

## 文件结构

```
cocos-dna/
├── SKILL.md                              ← 主指令（核心工作流）
├── README.md                             ← 本文件
├── references/                           ← 按需加载的详细规范
│   ├── design-dna-schema.md              ← 三维度 JSON Schema（Phase 1/2）
│   ├── dna-cocos-mapping.md              ← DNA→Cocos 映射表 + MCP 流程 + 代码模板
│   ├── output-spec.md                    ← design.md 9章定义 + 动效接口 + 验证清单
│   ├── node-spec.md                      ← 节点命名规范、节点信息格式
│   ├── asset-binding.md                  ← 资产绑定协议、三层目录结构
│   ├── cocos-constraints.md              ← Cocos 技术栈禁止清单与约束
│   ├── validate-workflow.md              ← V1-V4 验证规范
│   └── runtime-integration.md            ← ★ Runtime 集成规范（同步 + 改造指南）
├── templates/                            ← ★ 通用代码模板（同步到项目）
│   └── runtime/                          ← Runtime 基础设施
│       ├── ResourceManager.ts            ← 资源加载/缓存/分组释放
│       ├── LayerManager.ts               ← UI 层级管理（page/popup/effect/guide）
│       ├── EventBus.ts                   ← ★ 全局事件总线（发布/订阅）
│       ├── DebugLogger.ts                ← ★ 调试日志工具（分级输出）
│       └── README.md                     ← 版本说明 + 变更日志
├── scripts/                              ← 可执行工具脚本
│   ├── mcp-client.js                     ← 通用 MCP 通信层
│   ├── resolve-asset-uuids.js            ← 资产 UUID 解析
│   ├── ui-dev-workflow.js                ← V1-V4 验证引擎
│   └── sync-runtime.js                   ← ★ Runtime 模板同步工具
└── examples/                             ← 格式模板
    ├── README.md
    └── _example-page/                    ← 完整页面目录结构示例
```

### Progressive Disclosure（渐进式加载）

| 层级 | 内容 | 加载时机 |
|------|------|----------|
| **Level 1** | name + description（~100 词） | 始终在上下文中 |
| **Level 2** | SKILL.md 主体（~200 行） | 技能触发时加载 |
| **Level 3** | references/ 各文件 | 按需读取（仅在需要时） |

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

## 触发词

- "解析这张图的 UI 结构"
- "为这个界面设计 Cocos 节点树"
- "生成 UI 设计规范 / design.md"
- "将 DNA 映射为 Cocos 组件"
- "用 MCP 生成 Prefab"
- "cocos-dna"

## License

MIT
