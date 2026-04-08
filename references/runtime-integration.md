# Runtime 集成规范

本文档定义如何将 cocos-dna skill 提供的 runtime 模板集成到 Cocos Creator 项目中。

---

## 一、架构概览

```
skill 层（通用，skill 维护）          项目层（特有，项目维护）
┌────────────────────────┐          ┌──────────────────────────┐
│ templates/runtime/     │  sync →  │ assets/scripts/runtime/  │  ← ⚠️ 禁止手动修改
│   ResourceManager.ts   │  ─────→  │   core/ResourceManager.ts│
│   LayerManager.ts      │  ─────→  │   core/LayerManager.ts   │
│   BaseRenderer.ts      │  ─────→  │   views/BaseRenderer.ts  │
└────────────────────────┘          └──────────────────────────┘
                                    ┌──────────────────────────┐
                                    │ assets/scripts/core/     │  ← 项目自有
                                    │   EventBus.ts            │
                                    │   GameFlowFSM.ts         │
                                    │   I18n.ts                │
                                    │   DataProvider.ts        │
                                    │   DebugLogger.ts         │
                                    │   RendererConfig.ts      │
                                    └──────────────────────────┘
```

### 为什么这样分

| 文件 | 放 skill | 放项目 | 理由 |
|------|---------|--------|------|
| ResourceManager | ✅ | ❌ | 纯通用：cache + group release，与项目无关 |
| LayerManager | ✅ | ❌ | 纯通用：层级定义与业务无关 |
| BaseRenderer | ✅ | ❌ | 通用基类：配色和分辨率通过 configure() 外部注入，不含项目硬编码 |
| EventBus | ❌ | ✅ | 项目特有：事件命名、接口设计各不相同 |
| GameFlowFSM | ❌ | ✅ | 项目特有：状态列表与游戏流深度绑定 |

### 判断标准

> **能不能直接在另一个 Cocos DNA 项目里用？**
> - 能 → 放 skill templates
> - 不能 → 放项目

---

## 二、同步流程

### 首次集成

Agent 在以下时机自动触发同步：
1. **Phase 3 首次执行时** — 发现项目缺少 `scripts/runtime/core/ResourceManager.ts` / `scripts/runtime/core/LayerManager.ts` / `scripts/runtime/views/BaseRenderer.ts`
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
| 项目自有文件（EventBus 等） | **永远不动** |

---

## 三、ResourceManager 集成指南

### 3.1 改造 BaseRenderer.loadPrefab()

**Before**（直接裸调 `resources.load`）：

```typescript
protected loadPrefab(path: string): Promise<Prefab> {
    const cached = this._prefabCache.get(path);
    if (cached) return Promise.resolve(cached);
    return new Promise<Prefab>((resolve, reject) => {
        resources.load(path, Prefab, (err, prefab) => { ... });
    });
}
```

**After**（走 ResourceManager，自动 cache + group）：

```typescript
import { ResourceManager } from '../runtime/core/ResourceManager';

protected async loadPrefab(path: string): Promise<Prefab> {
    return ResourceManager.load<Prefab>(path, Prefab, this._name);
}
```

### 3.2 改造 BaseRenderer.loadImageToSprite()

在 `loadImageToSprite` 内部将 `resources.load` 替换为 `ResourceManager.load`：

```typescript
protected loadImageToSprite(resPath: string, sprite: Sprite, ...): void {
    const sfPath = `${resPath}/spriteFrame`;
    ResourceManager.load<SpriteFrame>(sfPath, SpriteFrame, this._name)
        .then(spriteFrame => {
            sprite.spriteFrame = spriteFrame;
            // ... 适配逻辑不变
        })
        .catch(err => {
            console.warn(`[${this._name}] Failed to load image: ${sfPath}`, err?.message);
        });
}
```

### 3.3 改造 Renderer.onDispose()

每个渲染器的 `onDispose()` 末尾加一行：

```typescript
protected onDispose(): void {
    // ... 子类清理逻辑 ...
    ResourceManager.releaseGroup(this._name);
}
```

BaseRenderer 的 `dispose()` 驱动层也可以自动调用，这样子类无需手动：

```typescript
// BaseRenderer.dispose() 中，onDispose() 之后
this.onDispose();
ResourceManager.releaseGroup(this._name);  // ← 自动释放
```

### 3.4 改造 MapRenderer 裸 resources.load

MapRenderer 中的 3 个直接 `resources.load` 调用改为：

```typescript
const sf = await ResourceManager.load<SpriteFrame>(
    'textures/route-map/node_glow/spriteFrame', SpriteFrame, this._name
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
        // 在初始化渲染器之前创建层级
        this._layers = new LayerManager(this.node);
        // ...
    }
}
```

### 4.2 渲染器挂载到 page 层

**Before**：

```typescript
renderer.init(this.node);  // 直接挂 Canvas
```

**After**：

```typescript
renderer.init(this._layers.page);  // 挂到 page 层
```

### 4.3 未来扩展

- 弹窗组件 → `popup.init(this._layers.popup)`
- 全局 Toast → `toastNode.parent = this._layers.effect`
- 新手引导 → `guideNode.parent = this._layers.guide`

---

## 五、渐进式改造路径

**原则：不一步到位，每步都可独立提交。**

| 步骤 | 改动范围 | 风险 | 验证方式 |
|------|---------|------|---------|
| **Step 1** | 同步 ResourceManager.ts 到项目 | 零（新增文件，不改现有代码） | 编译通过 |
| **Step 2** | BaseRenderer 的 `loadPrefab()` 内部改走 ResourceManager | 低（行为完全兼容） | 所有页面正常加载 |
| **Step 3** | BaseRenderer 的 `loadImageToSprite()` 内部改走 ResourceManager | 低 | 所有图片正常显示 |
| **Step 4** | BaseRenderer.dispose() 自动调 `releaseGroup()` | 低 | 内存监控：切页面后内存回落 |
| **Step 5** | MapRenderer 3 个裸 `resources.load` 改走 ResourceManager | 低 | 地图节点图标正常 |
| **Step 6** | 同步 LayerManager.ts 到项目 | 零 | 编译通过 |
| **Step 7** | GameEntry 创建 LayerManager，渲染器改挂 `layers.page` | 中（需测试全屏适配） | 所有页面正常显示 |

---

## 六、Agent 执行检查清单

Agent 在执行 runtime 集成时自检：

- [ ] ResourceManager.ts 已同步到 `assets/scripts/runtime/core/`
- [ ] LayerManager.ts 已同步到 `assets/scripts/runtime/core/`
- [ ] BaseRenderer.ts 已同步到 `assets/scripts/runtime/views/`
- [ ] BaseRenderer 的 `loadPrefab()` 已改走 ResourceManager
- [ ] BaseRenderer 的 `loadImageToSprite()` 已改走 ResourceManager
- [ ] BaseRenderer 的 `dispose()` 已自动调用 `ResourceManager.releaseGroup()`
- [ ] MapRenderer 的裸 `resources.load` 已改走 ResourceManager
- [ ] GameEntry 已创建 LayerManager
- [ ] 所有 `renderer.init(this.node)` 已改为 `renderer.init(this._layers.page)`
- [ ] 编译无错误
- [ ] 各页面正常显示和切换
