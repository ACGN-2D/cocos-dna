# Cocos 技术栈开发约束

> **适用版本**：Cocos Creator **3.7+**（推荐 3.8 / 4.x）。本文档中的 API、组件名、枚举值均基于 3.7+ 验证。

本文档适用于所有在 Cocos Creator 项目中工作的 AI Agent（包括 openspec、coding agent、任务规划 agent 等）。无论 Agent 处于何种工作模式，都必须遵守以下约束。

---

## 核心原则

Cocos Creator 不是 Web 前端框架。虽然使用 TypeScript 编写脚本，但渲染管线、组件模型、资源系统和交互系统与 Web 前端完全不同。Agent 必须始终使用 Cocos Creator 原生 API 和组件。

---

## 禁止清单

以下技术在 Cocos Creator 项目的**运行时代码**中**绝对禁止**：

| ❌ 禁止 | ✅ Cocos 替代方案 | 说明 |
|---------|------------------|------|
| HTML DOM 元素 (`<div>`, `<button>` 等) | `cc.Node` + `cc.Sprite` / `cc.Label` / `cc.Button` | Cocos 不渲染 DOM |
| CSS / CSS-in-JS / Tailwind | `cc.Color` / `UITransform` / `cc.Widget` / `cc.Layout` | 样式通过组件属性设置 |
| `document.*` / `window.*` | `cc.find()` / `cc.director` / `cc.sys` | Cocos 自有全局 API |
| React / Vue / Angular 等 Web 框架 | Cocos 原生组件系统 (`@ccclass` + `Component`) | ECS-like 架构 |
| `addEventListener` / DOM 事件 | `node.on()` / `cc.Button` + `cc.EventHandler` | Cocos 自有事件系统 |
| `fetch()` / `XMLHttpRequest` | `cc.assetManager.loadRemote()` / `cc.resources.load()` | Asset Manager 加载 |
| CSS Flexbox / Grid | `cc.Layout` (HORIZONTAL / VERTICAL / GRID) | Layout 组件布局 |
| CSS `position: absolute/relative` | `cc.Widget` + `UITransform` | Widget 对齐 + Transform 定位 |
| CSS `@keyframes` / `transition` | `cc.tween()` / `cc.Animation` | Tween 或动画组件 |
| `<canvas>` 2D Context 直接操作 | `cc.Graphics` / `cc.Sprite` / `cc.RenderTexture` | Cocos 封装底层渲染 |
| `<img>` / `<video>` / `<audio>` | `cc.Sprite` / `cc.VideoPlayer` / `cc.AudioSource` | Cocos 媒体组件 |
| npm Web UI 库（antd 等） | 自定义 Cocos UI 组件 | Web UI 库无法在 Cocos 中运行 |
| `localStorage` / `sessionStorage` | `cc.sys.localStorage` | Cocos 封装存储 API |

---

## 任务规划约束

为 Cocos Creator 项目生成执行计划、任务列表、实现方案时：

1. **UI 实现** — 必须使用 Cocos Creator 组件（Node, Sprite, Label, Button, Layout, Widget, ScrollView 等）
2. **动画** — 必须使用 `cc.tween()` 或 `cc.Animation`
3. **布局** — 必须使用 `cc.Layout` + `cc.Widget`
4. **数据存储** — 必须使用 `cc.sys.localStorage` 或项目自有存储层
5. **资源加载** — 必须使用 `cc.resources.load()` 或 `cc.assetManager`
6. **测试** — 单元测试可用 Jest（Node 环境），但被测 Cocos API 需正确 mock

---

## 代码生成约束

为 Cocos Creator 项目编写或修改代码时：

1. 脚本必须使用 `@ccclass` 装饰器和 `Component` 基类
2. 节点查找用 `cc.find()` / `node.getChildByName()` / `@property` 绑定
3. 颜色用 `new cc.Color().fromHEX()` 或 `cc.Color` 常量
4. 尺寸通过 `UITransform.setContentSize()` 设置
5. 事件用 `node.on(cc.Node.EventType.TOUCH_END, ...)` 或 `cc.Button` 组件
6. 定时器用 `this.schedule()` / `this.scheduleOnce()` / `cc.tween()`
7. 生命周期用 Cocos 组件生命周期（`onLoad`, `start`, `update`, `onDestroy`）

---

## 例外情况

| 场景 | 允许的 Web API | 条件 |
|------|---------------|------|
| 构建脚本/工具脚本 | 任意 Node.js API | 仅限 `tools/` 目录 |
| 单元测试 | Jest / Node.js 标准库 | 测试在 Node 环境运行 |
| 编辑器插件 | Cocos 编辑器扩展 API | 仅限 `extensions/` 目录 |
| 原生平台桥接 | `cc.native.bridge` | 与 Android/iOS 通信 |
| WebSocket 通信 | `WebSocket` | Cocos 支持标准 WebSocket |

---

## Scene 架构约束

### 单场景 + 多 Prefab 架构（默认）

Cocos Creator 项目 **默认采用单场景架构**：仅保留一个入口 `.scene`（通常为 `main.scene`），所有 UI 页面以 `.prefab` 形式动态加载。

| 规则 | 说明 |
|------|------|
| **默认不新建 `.scene`** | 新 UI 页面必须创建为 `.prefab`，通过 `resources.load()` + `instantiate()` 加载 |
| **唯一入口场景** | 项目仅保留 1 个 `main.scene` 作为启动场景，`GameEntry` / 根管理器挂载在此场景 |
| **禁止 1 UI = 1 Scene** | 每个 UI 页面对应一个 `.scene` 文件是**反模式**，会导致内存清空、脚本重新初始化、全局状态丢失 |

### 何时才需要多场景

以下情况**可以考虑**新建独立 `.scene`，但需在设计文档中明确论证：

| 合理场景 | 典型例子 | 原因 |
|---------|---------|------|
| **渲染环境根本不同** | 2D 大厅 vs 3D 战斗（不同光照/阴影/管线配置） | `.scene` 是环境参数的容器，不同管线配置无法在同一 scene 中共存 |
| **引擎级全量内存清理** | 关卡之间需 `director.loadScene()` 触发自动释放 | 只有 scene 切换才会触发引擎的 auto-release 机制 |
| **极大型内容分区** | 开放世界的多个区域，每区域有独立天空盒/雾效 | 渲染设置差异太大，一个 scene 无法承载 |

### Agent 决策流程

```
需要创建新 UI 页面？
        │
        ▼
  新页面需要不同的渲染管线/光照/天空盒？
        │                   │
       YES                 NO（默认）
        │                   │
        ▼                   ▼
  新建 .scene            创建 .prefab
  + 在设计文档中          + 挂载到入口场景
    明确论证原因           （标准工作流）
```

### mcp-client.js `createScene()` 使用约束

`createScene()` API 已导出但**禁止自动调用**。仅在以下条件全部满足时方可使用：

1. 设计文档中明确论证了需要独立 scene 的原因（渲染环境差异）
2. 用户明确确认需要新建 scene
3. 项目 `build-config.json` 的 `scenes` 列表和 `startScene` 已同步更新

---

## Agent 自检规则

提交代码或执行计划前自检：

- [ ] 运行时代码中是否引用了 `document` / `window` / DOM API？
- [ ] 是否使用了 CSS 样式字符串或 CSS 类名？
- [ ] UI 实现方案是否基于 HTML/DOM 渲染？
- [ ] 是否导入了 Web 前端框架或 Web UI 库？
- [ ] 任务计划中是否包含 "创建 HTML 文件" / "编写 CSS" / "使用 React/Vue" 等步骤？
- [ ] 新 UI 页面是否错误地创建为 `.scene` 而非 `.prefab`？（参见「Scene 架构约束」）
- [ ] 是否在无渲染环境差异的情况下新建了 `.scene` 文件？
