# cocos-dna 示例目录

> ⚠️ **本目录仅展示 `cocos-dna/components/<page>/` 的标准目录结构和文件格式。**
> 所有内容均为**占位符示例**，Agent 使用 cocos-dna skill 时**禁止**直接复制这些值。

## 目录结构

```
examples/
├── README.md                      ← 本文件（索引说明）
└── _example-page/                 ← 模拟一个完整的页面设计目录
    ├── design.md                  ← ★ 核心：UI 结构协议文档（9 章完整格式示例）
    ├── asset-manifest.json        ← 资产绑定清单格式示例
    ├── view-manifest.json         ← UI 节点绑定清单（从 design.md 第6.2章 @property 映射表提取）
    ├── references/
    │   └── README.md              ← 参考图索引格式示例
    └── assets/
        └── art-prompts.md         ← AI 绘图 Prompt 格式示例
```

## 数据边界提醒

| 存储位置 | 存什么 | 不存什么 |
|---------|--------|---------|
| `design-dna.json` | 全局 token（色彩/字体/间距/动效/风格）+ 页面轻量索引 | ❌ 页面级 layout/components/animations/particles |
| `components/<page>/design.md` | 页面的完整设计数据（9 章） | ❌ 全局 token 定义（只引用） |
| `components/<page>/asset-manifest.json` | 资源路径 + UUID + 加载方式 | ❌ 设计参数、UI 节点绑定 |
| `components/<page>/view-manifest.json` | UI 节点绑定（property 名 + cc 类型 + Prefab 节点名） | ❌ 资源路径、设计参数 |

## 新增 UI 页面的正确流程

1. 在 `design-dna.json` 的 `pages` 索引中加一行轻量条目
2. 创建 `components/<page-name>/` 目录（复制本示例结构）
3. 在 `design.md` 中编写完整的 9 章设计文档
4. 填写 `asset-manifest.json`（资源清单）、`view-manifest.json`（UI 节点绑定）、`references/README.md`、`assets/art-prompts.md`
