# cocos-dna Runtime Templates

> **版本**: v1.1.0  
> **最后更新**: 2026-04-09

## 概述

本目录包含 cocos-dna skill 提供的**通用运行时基础设施模板**。这些模板由 skill 统一维护，通过 `sync-runtime.js` 脚本同步到项目中。

**Skill v1 覆盖层**（5 文件）：
- **生命周期** — BaseRenderer（状态机 + 双层生命周期 + Prefab 加载）
- **资源** — ResourceManager（cache + group release + 并发加载防护）
- **层级** — LayerManager（page / popup / effect / guide）
- **通信** — EventBus（on/off/emit/once + 单例 + context 绑定）
- **调试** — DebugLogger（module/tag/level + window.__DEBUG_LOG__ 供 E2E）

**同步目标**：
- `ResourceManager.ts` / `LayerManager.ts` / `EventBus.ts` / `DebugLogger.ts` → `assets/scripts/runtime/core/`
- `BaseRenderer.ts` → `assets/scripts/runtime/views/`

**为什么放在 skill 而非项目里？**

- 这 5 个模块是所有 Cocos DNA 项目都需要的通用能力
- 由 skill 统一维护，确保跨项目的一致性和可升级性
- 项目中只持有同步后的副本，不直接修改

## 文件清单

| 文件 | 版本 | 职责 |
|------|------|------|
| `BaseRenderer.ts` | 1.0.0 | 渲染器基类（状态机 + 生命周期 + Prefab 加载），配色/分辨率通过 `configure()` 注入 |
| `ResourceManager.ts` | 1.0.0 | 统一资源加载/缓存/分组释放 |
| `LayerManager.ts` | 1.0.0 | UI 层级隔离（page/popup/effect/guide） |
| `EventBus.ts` | 1.0.0 | 全局事件总线（on/off/emit/once + 单例 + context 绑定） |
| `DebugLogger.ts` | 1.0.0 | 结构化调试日志（module/tag/level + window.__DEBUG_LOG__ 供 E2E） |

## 架构边界

Skill 模板只放 **runtime core**（80%项目都会用到的通用基础设施）：

| 类别 | 模板 |
|------|------|
| 生命周期 | BaseRenderer |
| 资源 | ResourceManager |
| 层级 | LayerManager |
| 通信 | EventBus |
| 调试 | DebugLogger |

以下属于**应用层**，留在项目侧：

| 模块 | 不进入 skill 的原因 |
|------|-------------------|
| GameEvents | 事件常量绑定具体项目业务 |
| UIManager | 导航框架，不同项目差异大 |
| I18n | 可选能力（v1.5 考虑） |
| GameFlowFSM | 状态机与具体游戏流绑定 |
| DataProvider | 数据模型项目特有 |
| ThemeConfig | 项目特定设计 token |
| RendererConfig | 项目特定配色方案 |

## 同步到项目

```bash
node .codebuddy/skills/cocos-dna/scripts/sync-runtime.js --project <project-root>
```

或由 Agent 在 Phase 3 首次执行时自动同步。

详细集成指南见 → [../references/runtime-integration.md](../references/runtime-integration.md)

## 与项目自有代码的关系

| 模块 | 归属 | 说明 |
|------|------|------|
| `BaseRenderer.ts` | **skill 模板** | 通用渲染器基类（状态机 + 生命周期），配色/分辨率通过 `configure()` 注入 |
| `ResourceManager.ts` | **skill 模板** | 纯通用能力，任何 Cocos DNA 项目都能用 |
| `LayerManager.ts` | **skill 模板** | 纯通用能力，层级定义与业务无关 |
| `EventBus.ts` | **skill 模板** | 纯通用事件总线，项目特定事件常量（GameEvents）另外维护 |
| `DebugLogger.ts` | **skill 模板** | 零依赖调试日志，window.__DEBUG_LOG__ 支持 E2E 自动化 |
| `RendererConfig.ts` | **项目自有** | 项目特定的配色方案和设计分辨率（调用 `BaseRenderer.configure()`） |
| `GameEvents.ts` | **项目自有** | 项目特定事件常量枚举 |
| `GameFlowFSM.ts` | **项目自有** | 状态机与具体游戏流绑定 |

## BaseRenderer 配置注入模式

BaseRenderer 模板通过 `IRendererConfig` 接口注入项目特定的配置：

```ts
// 项目侧: core/RendererConfig.ts
import { IRendererConfig } from '../runtime/views/BaseRenderer';
export const RENDERER_CONFIG: IRendererConfig = {
    designWidth: 1280,
    designHeight: 720,
    colors: {
        PRIMARY:    new Color(...),
        BG_DEEP:    new Color(...),
        TEXT_LIGHT: new Color(...),
        // ...
    }
};

// GameEntry.onLoad() 中注入
BaseRenderer.configure(RENDERER_CONFIG);
```

项目侧的 `views/BaseRenderer.ts` 从模板同步后，还需添加兼容导出（`SteamColors`/`DESIGN_WIDTH`/`DESIGN_HEIGHT`），
使已有子类的 `import { SteamColors } from './BaseRenderer'` 无需修改。

## 变更日志

### v1.1.0 (2026-04-09)
- **Skill v1 扩展**: 3 文件 → 5 文件
- `EventBus.ts`: 新增通用事件总线模板
  - 从项目 `core/EventBus.ts` 提取 `EventBus` 类（零依赖）
  - 剥离项目特定 `GameEvents` 常量到项目侧
  - 新增 `resetInstance()` 和 `eventNames()` 调试方法
- `DebugLogger.ts`: 新增结构化调试日志模板
  - 从项目 `core/DebugLogger.ts` 提取（零依赖）
  - API: `create()` → `info/warn/error` + 全局配置
  - `window.__DEBUG_LOG__` 支持 E2E 自动化测试

### v1.0.1 (2026-04-08)
- `BaseRenderer.ts`: 从项目自有代码提取为通用模板
  - 移除硬编码配色（SteamColors）和设计分辨率
  - 新增 `IRendererConfig` 接口 + `configure()` 静态方法
  - 项目侧通过 `RendererConfig.ts` 注入配置，子类零改动

### v1.0.0 (2026-04-08)
- 初始版本
- `ResourceManager.ts`: cache + group release + 并发加载防护
- `LayerManager.ts`: page/popup/effect/guide 四层结构
