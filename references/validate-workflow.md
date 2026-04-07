# cocos-dna 工作流验证规范

> 本文档定义 cocos-dna 三阶段工作流产出物的验证规则。Agent 在完成 Phase 3 后应自动执行验证。

---

## 验证阶段概览

| 阶段 | 验证对象 | 通过条件 |
|------|----------|----------|
| V1 | design.md | 9章完整 + 必填字段齐全 |
| V2 | Prefab | 节点树与 design.md 第4章一致 |
| V3 | Renderer/Comp | 必需方法和模式齐全 |
| V4 | 测试 | 测试文件存在且含必要断言 |

---

## V1: 设计文档验证

### 检查路径
`design-dna/components/<page>/design.md`

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

### 项目标准检查
- **SteamColors 配色**：文档中应出现 `#C4A962` 或其他 SteamColors 色值
- **设计分辨率**：文档中应出现 `1280` 和 `720`（本项目标准分辨率）
- **双语支持**：UI 文本元素应标注 i18n key

---

## V2: Prefab 验证

### 检查路径
`assets/resources/prefabs/pages/<PascalName>Page.prefab`

### 验证规则
1. **节点存在性**：design.md 第4章声明的每个节点名都必须出现在 .prefab JSON 中的 `"_name"` 字段
2. **UITransform**：根节点必须有 `cc.UITransform` 组件
3. **PageComp 挂载**：根节点必须挂载对应的 `<Page>PageComp` 组件

### 各 UI 必需节点

```json
{
  "main-menu": ["BG", "GameTitle", "StartBtn"],
  "char-select": ["BG", "CharacterList", "ConfirmBtn"],
  "route-map": ["BG", "MapContainer"],
  "battle": ["BG", "TopStatusBar", "PlayerArea", "EnemyContainer", "EnergyOrb", "EndTurnBtn", "BottomBar"]
}
```

---

## V3: Renderer / Comp 验证

### Comp 检查（`assets/scripts/prefab-components/<Page>PageComp.ts`）
- 包含 `@ccclass` 装饰器
- 包含 `@property` 声明（至少 1 个子节点引用）
- 继承 `Component`

### Renderer 检查（`assets/scripts/views/<Page>Renderer.ts`）
- 继承 `BaseRenderer`
- 包含 `_tryLoadPrefab` 方法
- 包含 `_setupPrefabUI` 方法
- 包含 `_bindPrefabEvents` 方法
- 使用 `resources.load` 异步加载 Prefab
- 维护 `_prefabReady` 状态标记
- 使用 `I18n.t()` 获取文本
- 使用 `SteamColors` 常量

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
