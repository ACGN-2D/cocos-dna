# Runtime 集成规范

本文档定义如何将 cocos-dna skill 提供的 runtime 模板集成到 Cocos Creator 项目中。

---

## 一、架构概览

```
skill 层（通用，skill 维护）          项目层（特有，项目维护）
┌────────────────────────┐          ┌──────────────────────────┐
│ templates/runtime/     │  sync →  │ assets/scripts/runtime/  │  ← ⚠️ 禁止手动修改
│   core/                │          │   core/                  │
│     ResourceManager.ts │  ─────→  │     ResourceManager.ts   │
│     LayerManager.ts    │  ─────→  │     LayerManager.ts      │
│     EventBus.ts        │  ─────→  │     EventBus.ts          │
│     DebugLogger.ts     │  ─────→  │     DebugLogger.ts       │
│     UIBinder.ts        │  ─────→  │     UIBinder.ts          │
│   views/               │          │   views/                 │
│     BaseView.ts        │  ─────→  │     BaseView.ts          │
└────────────────────────┘          └──────────────────────────┘
                                    ┌──────────────────────────┐
                                    │ assets/scripts/core/     │  ← 项目自有 + 桥接文件
                                    │   EventBus.ts            │  ← 桥接：重导出 runtime + 项目 GameEvents
                                    │   DebugLogger.ts         │  ← 桥接：纯重导出 runtime
                                    │   GameFlowFSM.ts         │
                                    │   I18n.ts                │
                                    │   DataProvider.ts        │
                                    │   RendererConfig.ts      │
                                    └──────────────────────────┘
                                    ┌──────────────────────────┐
                                    │ assets/scripts/views/    │  ← 三层架构产物
                                    │   XxxView.generated.ts   │  ← Layer 2: AI 生成（可覆盖）
                                    │   XxxPageView.ts         │  ← Layer 3: 业务逻辑（永不覆盖）
                                    └──────────────────────────┘
```

### 为什么这样分

| 文件 | 放 skill | 放项目 | 理由 |
|------|---------|--------|------|
| ResourceManager | ✅ | ❌ | 纯通用：cache + group release，与项目无关 |
| LayerManager | ✅ | ❌ | 纯通用：层级定义与业务无关 |
| **BaseView** | ✅ | ❌ | 通用 Component 基类：三层架构的 Layer 1，状态机 + 资源管理 + asset-manifest 绑定 |
| **UIBinder** | ✅ | ❌ | 通用绑定工具：auto/map/component 三种模式，@property 的动态 fallback |
| EventBus | ✅ | 桥接 | 通用事件总线（on/off/emit/once + 单例）。项目侧通过桥接文件重导出并追加 GameEvents 常量 |
| DebugLogger | ✅ | 桥接 | 通用结构化日志（module/tag/level）。项目侧通过桥接文件纯重导出 |
| GameFlowFSM | ❌ | ✅ | 项目特有：状态列表与游戏流深度绑定 |
| XxxView.generated.ts | ❌ | **AI 生成** | Layer 2：@property 声明 + assetManifest（AI 可安全覆盖） |
| XxxPageView.ts | ❌ | ✅ | Layer 3：业务逻辑（人写，AI **永不覆盖**） |

### 判断标准

> **能不能直接在另一个 Cocos DNA 项目里用？**
> - 能 → 放 skill templates
> - 不能 → 放项目

---

## 二、同步流程

### 首次集成

Agent 在以下时机自动触发同步：
1. **Phase 3 首次执行时** — 发现项目缺少 runtime 模板文件（ResourceManager / LayerManager / EventBus / DebugLogger / UIBinder / BaseView，共 6 文件）
2. **用户显式请求** — "同步 runtime 模板"、"更新 runtime"

```bash
# 预览变更
node .codebuddy/skills/cocos-dna/scripts/sync-runtime.js --project <path>

# 执行同步
node .codebuddy/skills/cocos-dna/scripts/sync-runtime.js --project <path> --apply
```

### 更新策略

| 场景 | 行为 |
|------|------|
| 项目中无该文件 | 直接复制 |
| 项目中已有且内容相同 | 跳过 |
| 项目中已有但内容不同 | 提示冲突，`--force` 覆盖 |
| 项目自有文件（EventBus 桥接等） | **永远不动** |

---

## 三、ResourceManager 集成指南

### 3.1 BaseView 中的资源加载

BaseView 已内置 `loadPrefab()` 和 `loadImageToSprite()` 方法，内部走 ResourceManager：

```typescript
// BaseView 内部实现（无需手动改造）
protected async loadPrefab(path: string): Promise<Prefab> {
    return ResourceManager.load<Prefab>(path, Prefab, this.resourceGroup);
}

protected loadImageToSprite(resPath: string, sprite: Sprite, options?: { callback?: () => void }): void {
    const sfPath = `${resPath}/spriteFrame`;
    ResourceManager.load<SpriteFrame>(sfPath, SpriteFrame, this.resourceGroup)
        .then(spriteFrame => {
            sprite.spriteFrame = spriteFrame;
            options?.callback?.();
        })
        .catch(err => {
            console.warn(`[${this.viewName}] Failed to load image: ${sfPath}`, err?.message);
        });
}
```

### 3.2 资源释放

BaseView 的 `close()` 流程自动调用 `onDispose()` → `ResourceManager.releaseGroup()`，子类无需手动释放：

```typescript
// BaseView 自动释放（子类只需在 onDispose() 中清理自己的引用）
protected onDispose(): void {
    // 子类清理逻辑：置空引用、销毁动态节点等
    this._enemyNodes = [];
    this._cardSlotPrefab = null;
}
// ResourceManager.releaseGroup() 在 onDispose() 之后由 BaseView 自动调用
```

### 3.3 直接使用 ResourceManager

非 BaseView 场景（如工具类）中直接使用：

```typescript
import { ResourceManager } from '../runtime/core/ResourceManager';

const sf = await ResourceManager.load<SpriteFrame>(
    'textures/route-map/node_glow/spriteFrame', SpriteFrame, 'RouteMapPageView'
);
```

---

## 四、LayerManager 集成指南

### 4.1 GameEntry 中创建

```typescript
import { LayerManager } from './runtime/core/LayerManager';

@ccclass('GameEntry')
export class GameEntry extends Component {
    private _layers!: LayerManager;

    async onLoad() {
        this._layers = new LayerManager(this.node);
        // ...
    }
}
```

### 4.2 BaseView 页面挂载到 page 层

```typescript
private async _initBattleView(pageLayer: Node): Promise<void> {
    const prefab = await ResourceManager.load<Prefab>(
        'prefabs/pages/BattlePage', Prefab, 'GameEntry'
    );
    const node = instantiate(prefab);
    node.parent = pageLayer;  // ← this._layers.page
    const view = node.addComponent(BattlePageView);  // ← Layer 3
    this._views.set('BattlePageView', view);
}
```

### 4.3 层级用途

| 层级 | 用途 | 示例 |
|------|------|------|
| `page` | 全屏页面 | BattlePageView, RouteMapPageView |
| `popup` | 弹窗/面板 | 设置面板、确认对话框 |
| `effect` | 全局特效 | Toast、飘字、全屏闪烁 |
| `guide` | 新手引导 | 遮罩、高亮提示 |

---

## 五、BaseView 三层架构集成指南

### 5.1 GameEntry 中注册

```typescript
import { BaseView } from './runtime/views/BaseView';

@ccclass('GameEntry')
export class GameEntry extends Component {
    private _views: Map<string, BaseView> = new Map();
    private _activeView: BaseView | null = null;

    async onLoad() {
        BaseView.configure({ designWidth: DESIGN_WIDTH, designHeight: DESIGN_HEIGHT });
        // ...初始化各页面
    }
}
```

### 5.2 页面切换

```typescript
private async _switchToView(name: string, data?: any): Promise<void> {
    if (this._activeView) {
        await this._activeView.close();
    }
    const view = this._views.get(name);
    if (view) {
        view.open(data);
        this._activeView = view;
    }
}
```

### 5.3 清理

```typescript
onDestroy(): void {
    this._views.forEach(v => {
        if (v.node) v.node.destroy();
    });
}
```

---

## 六、EventBus 事件使用规约

### 适用范围

EventBus 仅用于**跨系统 / 跨层**通信，即发送方和接收方之间无直接引用关系。

| 分类 | 事件流向 | 示例 | 可用 EventBus |
|------|---------|------|:------------:|
| 系统级广播 | System → 全局 | `GAME_STATE_CHANGED`, `LANG_CHANGED` | ✅ |
| Model→View 推送 | Manager → PageView | `BATTLE_START`, `HAND_UPDATED`, `MAP_GENERATED` | ✅ |
| View→Controller 命令 | PageView → Bootstrap | `UI_END_TURN_CLICKED`, `UI_NODE_CLICKED` | ✅ |
| 同节点树父子通信 | 父 Node → 子 Node | 按钮点击、列表滚动 | ❌ 用 `node.emit()` |
| 同组件内状态变更 | Component 内部 | @property 更新 | ❌ 直接调用 |
| 纯 UI 内部交互 | Widget 内部 | 拖拽开始/结束（无外部消费者） | ❌ 用 `node.on()` |

### 判断标准

```
发送方和接收方有直接引用？
  有 → 直接方法调用 或 node.emit()（Cocos 原生事件）
  无 → EventBus（必须用 GameEvents 常量）
```

参考：https://docs.cocos.com/creator/3.8/manual/zh/engine/event/event-emit.html

### ⚠️ 关于 UI_* 前缀事件的特别说明

`UI_*` 事件 **≠** "纯 UI 内部交互"。不要看到 `UI_` 前缀就认为它不该走 EventBus。

在三层架构中，PageView（Layer 3）与 Bootstrap/Controller（GameEntry）之间**没有直接引用关系**，需要通过 EventBus 解耦：

```
PageView (Layer 3) ──emit(UI_*)──→ EventBus ──→ GameEntry ──route──→ System/Controller
```

这属于 **View → Controller 的跨层命令上报**，是 EventBus 的合法用途。

| 事件 | 发射方 | 经由 | 最终处理方 | 性质 |
|------|--------|------|-----------|------|
| `UI_END_TURN_CLICKED` | BattlePageView | GameEntry | BattleView.onEndTurnClicked() | View→Controller ✅ |
| `UI_NODE_CLICKED` | RouteMapPageView | GameEntry | MapView.onNodeClicked() | View→Controller ✅ |
| `UI_CARD_PLAY_ATTEMPT` | BattlePageView | GameEntry | BattleView.onCardPlayAttempt() | View→Controller ✅ |
| `UI_DIALOGUE_ADVANCE` | DialoguePageView | GameEntry | DialogueRunner.advance() | View→Controller ✅ |

**真正不该用 EventBus 的"纯 UI 内部交互"**是指：同一节点树内的父子组件通信，发送方可以直接拿到接收方的引用。例如：子按钮通知父面板关闭 → 用 `node.emit()` 冒泡即可。

### Cocos 原生事件 vs EventBus 对比

| | `node.on() / node.emit()` | `EventBus.instance.on()` |
|---|---|---|
| 作用域 | 节点树内（支持冒泡） | 全局单例 |
| 生命周期 | `node.destroy()` 自动清理 | 必须手动 `off()` |
| 追踪性 | 通过节点树可追溯 | 全局广播，需靠命名规范 |
| 适用场景 | UI 交互、父子通信 | 跨系统、跨层解耦 |

### 事件命名规约

所有事件名必须定义在项目的 `GameEvents` 常量中，**禁止硬编码字符串**。

格式：`模块:动作_过去时/状态`

```typescript
// ✅ 正确
EventBus.instance.emit(GameEvents.BATTLE_START, data);

// ❌ 禁止 — 硬编码字符串
EventBus.instance.emit('boss:special_mechanic', data);
```

### 生命周期清理规则

```typescript
// ✅ 推荐模式：on/off 配对
protected onBind(): void {
    EventBus.instance.on(GameEvents.XXX, this._onXxx, this);
}
protected onDispose(): void {
    EventBus.instance.off(GameEvents.XXX, this._onXxx, this);
}

// ✅ node.on 自动清理，无需手动 off
this.someButton.on(Node.EventType.TOUCH_END, this._onClick, this);
// node.destroy() 时自动移除
```

### 死代码检查

每个 EventBus 事件必须有 emit 和 on 配对。如果一个事件只有 emit 没有 listener（或反之），属于死代码，应清理或补全。

---

## 七、Agent 执行检查清单

Agent 在执行 runtime 集成时自检：

### Runtime 模板同步（6 文件）
- [ ] ResourceManager.ts 已同步到 `assets/scripts/runtime/core/`
- [ ] LayerManager.ts 已同步到 `assets/scripts/runtime/core/`
- [ ] EventBus.ts 已同步到 `assets/scripts/runtime/core/`
- [ ] DebugLogger.ts 已同步到 `assets/scripts/runtime/core/`
- [ ] UIBinder.ts 已同步到 `assets/scripts/runtime/core/`
- [ ] BaseView.ts 已同步到 `assets/scripts/runtime/views/`

### 项目侧桥接与配置
- [ ] 项目侧桥接文件存在：`assets/scripts/core/EventBus.ts`（重导出 + GameEvents）
- [ ] 项目侧桥接文件存在：`assets/scripts/core/DebugLogger.ts`（纯重导出）
- [ ] `RendererConfig.ts` 导出 DESIGN_WIDTH / DESIGN_HEIGHT
- [ ] `ThemeConfig.ts` 导出 SteamColors（颜色 SSOT）
- [ ] GameEntry.onLoad() 调用 `BaseView.configure({ designWidth, designHeight })`

### BaseView 三层架构
- [ ] Layer 2 文件命名 `<Page>View.generated.ts`，@ccclass 装饰器名称含 `Generated`
- [ ] Layer 3 文件命名 `<Page>PageView.ts`，继承 Layer 2
- [ ] Layer 2 override `viewName` / `resourceGroup` getter
- [ ] Layer 3 override `onBind()` / `onRefresh()` 等业务钩子
- [ ] GameEntry `_views` Map 注册了 BaseView 页面
- [ ] GameEntry `_switchToView()` 页面切换正常
- [ ] Prefab 根节点挂载 Layer 3 组件（非 Layer 2）

### Import 规范检查
- [ ] **SteamColors** 从 `ThemeConfig.ts` 导入
- [ ] **DESIGN_WIDTH / DESIGN_HEIGHT** 从 `RendererConfig.ts` 导入
- [ ] 无重复 import（同一模块只从一个路径导入）

### 验证
- [ ] 编译无错误
- [ ] 各页面正常显示和切换
- [ ] E2E 测试全部通过
