# cocos-dna 工作流验证规范

> 本文档定义 cocos-dna 三阶段工作流产出物的验证规则。Agent 在完成 Phase 3 后应自动执行验证。

---

## 验证阶段概览

| 阶段 | 验证对象 | 通过条件 |
|------|----------|----------|
| V1 | design.md | 9章完整 + 必填字段齐全 |
| V2 | Prefab | 节点树与 design.md 第4章一致 |
| V3 | View | 三层架构的必需方法和模式齐全 |
| V4 | 测试 | 测试文件存在且含必要断言 |

---

## V1: 设计文档验证

### 检查路径
`cocos-dna/components/<page>/design.md`

### 必需章节
| 章节 | 关键词（任一匹配即可） | 必填 |
|------|----------------------|------|
| 第1章 | "设计概述" | ✅ |
| 第1.5章 | "参考图溯源" | ✅ |
| 第2章 | "整体布局", ASCII 线框图 | ✅ |
| 第3章 | "视觉规范", "配色方案", "颜色" | ✅ |
| 第4章 | "节点树" | ✅ |
| 第5章 | "元素详述", "UI 元素定义", "设计规范" | ✅ |
| 第6章 | "资源切图表" | ✅ |
| 第6.5章 | "资产绑定" | ✅ |
| 第7章 | "交互逻辑" | ✅ |
| 第8章 | "动态效果", "动画效果" | ⚠️ 可选 |

### 项目设计系统一致性检查
- **配色引用**：文档中的色值应与项目 `cocos-dna/design-dna.json` 中 `design_system.color` 的定义一致
- **设计分辨率**：文档中应出现项目设定的设计分辨率（从 `design-dna.json` 或 `RendererConfig` 读取）
- **双语支持**：UI 文本元素应标注 i18n key（如项目启用了 i18n）

---

## V2: Prefab 验证

### 检查路径
`assets/resources/prefabs/pages/<PascalName>Page.prefab`

### 验证规则
1. **节点存在性**：design.md 第4章声明的每个节点名都必须出现在 .prefab JSON 中的 `"_name"` 字段
2. **UITransform**：根节点必须有 `cc.UITransform` 组件
3. **PageComp 挂载**：根节点必须挂载对应的 `<Page>PageComp` 组件

### 必需节点验证

每个界面的 Prefab 必需节点由 `cocos-dna/components/<page>/design.md` 第4章节点树定义。验证时从该文档提取节点列表，逐一检查 `.prefab` JSON 中是否包含对应 `"_name"` 字段。

> **注意**：此处不硬编码具体页面的节点列表，所有节点需求以各页面 `design.md` 为准。

---

## V3: View 验证（三层架构）

### Layer 2 检查（`assets/scripts/views/<Page>View.generated.ts`）

**必需模式**（缺少即报 ❌）：
- 包含 `@ccclass` 装饰器（类名含 `Generated` 后缀）
- 继承 `BaseView`（从 `../runtime/views/BaseView` 导入）
- override `viewName` getter（返回视图名称字符串）
- override `resourceGroup` getter（返回资源分组名称）
- 至少 1 个 `@property` 声明

**推荐模式**（缺少报 ⚠️ 建议）：
- override `assetManifest` getter（如 design.md 第 6.5 章定义了动态资源）

### Layer 3 检查（`assets/scripts/views/<Page>PageView.ts`）

**必需模式**（缺少即报 ❌）：
- 包含 `@ccclass` 装饰器
- 继承 Layer 2 类（`<Page>ViewGenerated`）
- override `onBind()` 方法（事件绑定）

**推荐模式**（缺少报 ⚠️ 建议）：
- override `onRefresh(data?)` 方法（数据填充）
- 使用 `I18n.t()` 获取文本（如项目启用了 i18n）

**禁止模式**（存在报 ❌）：
- Layer 3 中声明 `@property`（应在 Layer 2 中声明）
- Layer 3 中 override `viewName` / `resourceGroup`（应在 Layer 2 中定义）

### Import 规范检查

**违反报 ⚠️**：
- `SteamColors` 必须从 `ThemeConfig.ts` 导入
- `DESIGN_WIDTH` / `DESIGN_HEIGHT` 必须从 `RendererConfig.ts` 导入

---

## V4: 测试验证

### 检查路径
`tests/` 目录下对应的测试文件

### 验证规则
- 测试文件存在
- 包含 `expect` / `toBe` 等断言
- 建议包含黑屏检测（`detectBlackScreen`）

---

## Agent 执行指引

在 Phase 3 产出物全部生成后，Agent 应：

1. 按 V1 → V4 顺序逐项检查
2. 每项输出 ✅ / ❌ + 具体问题
3. 所有 ❌ 项列出修复建议
4. 汇总报告格式：

```
📊 cocos-dna 验证结果 — <page-name>
  V1 设计文档: ✅ 通过
  V2 Prefab:   ✅ 通过  
  V3 代码:     ❌ 缺少 I18n.t() 调用
  V4 测试:     ⚠️ 测试文件不存在（建议创建）
```
