# cocos-dna Runtime Templates

> **版本**: v1.4.0  
> **最后更新**: 2026-04-09

## 概述

本目录包含 cocos-dna skill 提供的**通用运行时基础设施模板**。这些模板由 skill 统一维护，通过 `sync-runtime.js` 脚本同步到项目中。

**Skill v1.2 覆盖层**（7 文件）：
- **生命周期** — BaseRenderer（纯 TS 类，状态机 + 双层生命周期 + Prefab 加载）
- **视图基类** — BaseView（Component 基类，三层架构：runtime → generated → business）
- **绑定工具** — UIBinder（运行时动态节点绑定，auto/map/component 三种模式）
- **资源** — ResourceManager（cache + group release + 并发加载防护）
- **层级** — LayerManager（page / popup / effect / guide）
- **通信** — EventBus（on/off/emit/once + 单例 + context 绑定）
- **调试** — DebugLogger（module/tag/level + window.__DEBUG_LOG__ 供 E2E）

**目录结构**（skill 侧与项目侧完全镜像）：
```
templates/runtime/          →  assets/scripts/runtime/
├── core/                       ├── core/
│   ├── ResourceManager.ts      │   ├── ResourceManager.ts
│   ├── LayerManager.ts         │   ├── LayerManager.ts
│   ├── EventBus.ts             │   ├── EventBus.ts
│   ├── DebugLogger.ts          │   ├── DebugLogger.ts
│   └── UIBinder.ts             │   └── UIBinder.ts
├── views/                      ├── views/
│   ├── BaseRenderer.ts         │   ├── BaseRenderer.ts
│   └── BaseView.ts             │   └── BaseView.ts
└── README.md                   └── README.md (不同步)
```

import 路径两侧完全一致，sync 为纯镜像复制，无需路径转换。

**为什么放在 skill 而非项目里？**

- 这 7 个模块是所有 Cocos DNA 项目都需要的通用能力
- 由 skill 统一维护，确保跨项目的一致性和可升级性
- 项目中只持有同步后的副本，不直接修改

## 文件清单

| 文件 | 目录 | 版本 | 职责 |
|------|------|------|------|
| `BaseRenderer.ts` | `views/` | 1.0.0 | 渲染器基类（纯 TS 类，状态机 + 生命周期 + Prefab 加载），配色/分辨率通过 `configure()` 注入 |
| `BaseView.ts` | `views/` | 1.1.0 | **视图 Component 基类**（三层架构：runtime → generated → business），支持 @property + 状态机 + 资源管理 + **asset-manifest 动态绑定** |
| `ResourceManager.ts` | `core/` | 1.0.0 | 统一资源加载/缓存/分组释放 |
| `LayerManager.ts` | `core/` | 1.0.0 | UI 层级隔离（page/popup/effect/guide） |
| `EventBus.ts` | `core/` | 1.0.0 | 全局事件总线（on/off/emit/once + 单例 + context 绑定） |
| `DebugLogger.ts` | `core/` | 1.0.0 | 结构化调试日志（module/tag/level + window.__DEBUG_LOG__ 供 E2E） |
| `UIBinder.ts` | `core/` | 1.0.0 | **运行时节点绑定工具**（auto/map/component 三种模式），作为 @property 的动态 fallback |

## 架构边界

Skill 模板只放 **runtime core**（80%项目都会用到的通用基础设施）：

| 类别 | 模板 |
|------|------|
| 生命周期（纯类） | BaseRenderer |
| 生命周期（Component） | BaseView |
| 绑定工具 | UIBinder |
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
| `BaseRenderer.ts` | **skill 模板** | 通用渲染器基类（纯 TS 类，状态机 + 生命周期），配色/分辨率通过 `configure()` 注入 |
| `BaseView.ts` | **skill 模板** | 视图 Component 基类（三层架构），新页面推荐使用 |
| `UIBinder.ts` | **skill 模板** | 运行时节点绑定工具，@property 的动态 fallback |
| `ResourceManager.ts` | **skill 模板** | 纯通用能力，任何 Cocos DNA 项目都能用 |
| `LayerManager.ts` | **skill 模板** | 纯通用能力，层级定义与业务无关 |
| `EventBus.ts` | **skill 模板** | 纯通用事件总线，项目特定事件常量（GameEvents）另外维护 |
| `DebugLogger.ts` | **skill 模板** | 零依赖调试日志，window.__DEBUG_LOG__ 支持 E2E 自动化 |
| `RendererConfig.ts` | **项目自有** | 项目特定的配色方案和设计分辨率（调用 `BaseRenderer.configure()`） |
| `XxxView.generated.ts` | **AI 生成** | 由生成器自动生成的 @property 声明层（可安全覆盖） |
| `XxxView.ts` | **项目自有** | 业务逻辑层（extends Generated，永不覆盖） |
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

## BaseView 三层架构（v1.2 新增）

BaseView 是新页面的推荐基类，采用三层代码隔离架构：

```
Layer 1: BaseView.ts          ← runtime（skill 维护，sync 覆盖）
Layer 2: XxxView.generated.ts ← AI 生成（@property 声明，可安全覆盖）
Layer 3: XxxView.ts           ← 业务逻辑（人写，永不覆盖）
```

### 三层示例

```ts
// Layer 2: AI-generated (auto-overwrite safe)
// file: HomeView.generated.ts
import { _decorator, Node, Label, Sprite, SpriteFrame } from 'cc';
import { BaseView } from '../runtime/views/BaseView';
const { ccclass, property } = _decorator;

@ccclass('HomeViewGenerated')
export class HomeViewGenerated extends BaseView {
    protected get viewName() { return 'HomeView'; }
    protected get prefabPath() { return 'prefabs/pages/HomePage'; }
    protected get resourceGroup() { return 'home-page'; }

    @property(Node) btnStart: Node = null!;
    @property(Label) txtTitle: Label = null!;
    @property(Sprite) bgSprite: Sprite = null!;
    @property(SpriteFrame) bgSpriteFrame: SpriteFrame = null!;
}

// Layer 3: Business logic (human-written, never overwritten)
// file: HomeView.ts
import { _decorator, Node } from 'cc';
import { HomeViewGenerated } from './HomeView.generated';
const { ccclass } = _decorator;

@ccclass('HomeView')
export class HomeView extends HomeViewGenerated {
    protected onBind(): void {
        this.btnStart.on(Node.EventType.TOUCH_END, this._onStart, this);
    }
    protected onRefresh(data?: any): void {
        this.txtTitle.string = data?.title ?? 'Welcome';
    }
    private _onStart(): void {
        // business logic
    }
}
```

### Asset Manifest 绑定（v1.4 新增）

BaseView 支持通过 `assetManifest` getter 传入 `asset-manifest.json` 数据，自动加载 `loadType: 'dynamic'` 的资源并绑定到节点：

```
asset-manifest.json (设计时唯一数据源)
        ↓ Agent 读取 JSON，生成 TypeScript 字面量
Layer 2: XxxView.generated.ts
        ↓ override get assetManifest()
Layer 1: BaseView.onLoad()
        ↓ _bindManifestAssets() 自动加载 + 绑定
Prefab 节点上的 Sprite 组件
```

**数据流**：
- `asset-manifest.json` 是唯一数据源（设计时文件，不进入运行时）
- Agent 在生成 Layer 2 时读取 JSON，转为 `IAssetManifest` TypeScript 字面量
- BaseView 在 `onLoad()` 中自动处理 dynamic 资源的加载和节点绑定
- 业务代码通过 `this.getManifestAsset('asset_id')` 访问已加载的资源

**Layer 2 示例**：

```ts
import { BaseView, IAssetManifest } from '../runtime/views/BaseView';

@ccclass('BattleViewGenerated')
export class BattleViewGenerated extends BaseView {
    protected get assetManifest(): IAssetManifest {
        return {
            page: 'battle',
            assets: [
                {
                    id: 'card_bg_attack',
                    assetPath: 'assets/resources/textures/pages/battle/card_bg_attack.png',
                    loadType: 'dynamic',
                    type: 'sprite-frame',
                    sliceMode: 'sliced',
                    nineSlice: { top: 8, bottom: 8, left: 8, right: 8 },
                    boundToNodes: ['CardSlot'],
                    status: 'ready',
                    size: { w: 130, h: 180 },
                },
            ],
        };
    }
}
```

**Layer 3 使用**：

```ts
// 在业务代码中按 id 获取已加载的资源
const attackBg = this.getManifestAsset('card_bg_attack');
if (attackBg) {
    someSprite.spriteFrame = attackBg;
}
```

**处理规则**：
- 只处理 `loadType: 'dynamic'` + `status: 'ready'` + `type: 'sprite-frame'` 的条目
- `loadType: 'static'` 的资源仍通过 `@property` 在 Prefab 编辑器中绑定
- 自动将 `assetPath` 转换为 `resources/` 相对路径（去掉 `assets/resources/` 前缀和文件扩展名）
- 自动应用 `sliceMode`（simple / sliced / tiled）到 Sprite 组件
- 所有加载的资源归入 `resourceGroup`，dispose 时自动释放

### BaseView vs BaseRenderer

| 维度 | BaseRenderer | BaseView |
|------|-------------|----------|
| 继承 | 纯 TypeScript 类 | cc.Component |
| @property | ❌ 不支持 | ✅ 支持 |
| 生命周期驱动 | GameEntry 手动调用 | Cocos 引擎 + open()/close() |
| 代码隔离 | 无（Renderer 整体人写） | 三层（runtime → generated → business） |
| 适用场景 | 已有页面（向后兼容） | **新页面（推荐）** |
| 状态 | 不废弃，继续维护 | v1.2 新增 |

### UIBinder 使用

UIBinder 是 @property 的运行时 fallback，用于动态绑定节点引用：

```ts
import { UIBinder } from '../runtime/core/UIBinder';

// Auto mode: match camelCase field names
UIBinder.autoBind(this.node, this);

// Map mode: explicit mapping
UIBinder.bind(this.node, this, {
    'NewGameBtn': '_startBtnNode',
    'BG': { field: '_bgSprite', component: Sprite },
});
```

## 变更日志

### v1.4.0 (2026-04-09)
- **Asset Manifest 绑定**: BaseView 新增 `assetManifest` getter + `_bindManifestAssets()` 自动绑定
  - 新增 `IAssetManifest` / `IManifestAssetEntry` 接口（从 BaseView 导出）
  - Layer 2 override `get assetManifest()` 传入 manifest 数据
  - `onLoad()` 自动加载 `loadType: 'dynamic'` + `status: 'ready'` 的 sprite-frame 资源
  - 自动绑定到 `boundToNodes` 指定的节点 Sprite 组件
  - 自动应用 `sliceMode`（simple / sliced / tiled）
  - `getManifestAsset(id)` / `manifestAssets` 供业务代码按 id 查询已加载资源
  - `_assetPathToResourcePath()` 自动转换 manifest 路径为 resources 相对路径
  - dispose 时自动清理 `_manifestAssets` 缓存

### v1.3.0 (2026-04-09)
- **目录结构统一**: skill 侧从扁平结构改为 `core/` + `views/` 分层结构
  - 与项目侧 `assets/scripts/runtime/` 完全镜像
  - import 路径两侧一致，sync 为纯镜像复制，无需路径转换
  - `sync-runtime.js` 更新为从子目录读取源文件
  - 删除旧的扁平文件

### v1.2.0 (2026-04-09)
- **三层架构**: 5 文件 → 7 文件
- `BaseView.ts`: 新增统一视图 Component 基类
  - 合并 BaseRenderer 状态机 + Component @property 能力
  - 三层代码隔离：runtime → generated → business
  - 状态机：None → Ready → Visible ⇄ Hidden → Disposed
  - 双层生命周期：open/close/refresh/dispose + onBind/onShow/onHide/onRefresh/onDispose
  - 资源组自动释放（dispose 时调用 ResourceManager.releaseGroup）
- `UIBinder.ts`: 新增运行时节点绑定工具
  - Auto mode: camelCase 名称匹配
  - Map mode: 显式 { nodeName → fieldName } 映射
  - Component mode: 自动提取节点上的组件
  - 作为 @property 的动态 fallback
- `sync-runtime.js`: 更新同步清单（+2 文件）

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
