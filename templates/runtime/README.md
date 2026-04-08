# cocos-dna Runtime Templates

> **版本**: v1.0.0  
> **最后更新**: 2026-04-08

## 概述

本目录包含 cocos-dna skill 提供的**通用运行时基础设施模板**。这些模板由 skill 统一维护，通过 `sync-runtime.js` 脚本同步到项目中。

**同步目标（独立目录，与项目自有代码隔离）**：
- `ResourceManager.ts` / `LayerManager.ts` → `assets/scripts/core/runtime/`
- `BaseRenderer.ts` → `assets/scripts/views/`（因为是 views 下子类的基类，保留原位）

**为什么放在 skill 而非项目里？**

- 资源管理、层级管理是所有 Cocos DNA 项目都需要的通用能力
- 由 skill 统一维护，确保跨项目的一致性和可升级性
- 项目中只持有同步后的副本，不直接修改

## 文件清单

| 文件 | 版本 | 职责 |
|------|------|------|
| `ResourceManager.ts` | 1.0.0 | 统一资源加载/缓存/分组释放 |
| `LayerManager.ts` | 1.0.0 | UI 层级隔离（page/popup/effect/guide） |
| `BaseRenderer.ts` | 1.0.0 | 渲染器基类（状态机 + 生命周期 + Prefab 加载），配色/分辨率通过 `configure()` 注入 |

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
| `RendererConfig.ts` | **项目自有** | 项目特定的配色方案和设计分辨率（调用 `BaseRenderer.configure()`） |
| `EventBus.ts` | **项目自有** | 事件总线实现各有不同 |
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

### v1.1.0 (2026-04-08)
- `BaseRenderer.ts`: 从项目自有代码提取为通用模板
  - 移除硬编码配色（SteamColors）和设计分辨率
  - 新增 `IRendererConfig` 接口 + `configure()` 静态方法
  - 项目侧通过 `RendererConfig.ts` 注入配置，子类零改动

### v1.0.0 (2026-04-08)
- 初始版本
- `ResourceManager.ts`: cache + group release + 并发加载防护
- `LayerManager.ts`: page/popup/effect/guide 四层结构
