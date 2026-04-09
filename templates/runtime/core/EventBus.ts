/**
 * EventBus — 全局事件总线
 * [cocos-dna skill template — v1.1.0]
 *
 * 解耦跨系统/跨层模块间通信的事件总线。
 * 支持 on / off / emit / once，单例模式，支持 context 绑定。
 *
 * ═══════════════════════════════════════════════════════════════
 *  使用范围规约（何时该用 EventBus，何时该用 node 事件）
 * ═══════════════════════════════════════════════════════════════
 *
 * EventBus 适用场景（跨系统 / 跨层通信）：
 *   - 系统级状态广播：GAME_STATE_CHANGED, LANG_CHANGED, NETWORK_RECONNECT
 *   - Model → View 数据推送：BATTLE_START, HAND_UPDATED, MAP_GENERATED
 *   - View → Controller 命令上报：UI_END_TURN_CLICKED, UI_NODE_CLICKED
 *     （PageView 与 Bootstrap/Controller 无直接引用时）
 *
 * 禁止使用 EventBus 的场景（应使用 Cocos 原生事件）：
 *   - 同节点树内的父子通信 → node.emit() + 冒泡，或直接引用
 *   - 同组件内的状态变更 → @property / 方法调用
 *   - 纯 UI 内部交互（如列表项点击、滚动）→ node.on(Node.EventType.*)
 *   参考：https://docs.cocos.com/creator/3.8/manual/zh/engine/event/event-emit.html
 *
 * 判断标准：
 *   发送方和接收方是否有直接引用？
 *     有 → 直接调用方法 或 node.emit()
 *     无 → EventBus（但必须用 GameEvents 常量，禁止硬编码字符串）
 *
 * ⚠️ 关于 UI_* 前缀事件的特别说明：
 *   UI_* 事件 ≠ "纯 UI 内部交互"。
 *   在三层架构中，PageView（Layer 3）与 Bootstrap/Controller（GameEntry）
 *   之间没有直接引用关系，需要通过 EventBus 解耦：
 *
 *     PageView ──emit(UI_*)──→ EventBus ──→ GameEntry ──route──→ System/Controller
 *
 *   这属于 View → Controller 的跨层命令上报，是 EventBus 的合法用途。
 *   例如：UI_END_TURN_CLICKED, UI_NODE_CLICKED, UI_CARD_PLAY_ATTEMPT
 *
 *   真正不该用 EventBus 的"纯 UI 内部交互"是指：
 *   同一节点树内的父子组件通信，发送方可以直接拿到接收方的引用。
 *   例如：子按钮通知父面板关闭 → 用 node.emit() 冒泡即可。
 *
 * ═══════════════════════════════════════════════════════════════
 *  事件命名规约
 * ═══════════════════════════════════════════════════════════════
 *
 * 格式：模块:动作_过去时/状态
 *   - 系统事件（Model/System 发出）：battle:start, hand:updated, map:generated
 *   - UI 命令事件（View 发出）：ui:end_turn_clicked, ui:node_clicked
 *
 * 所有事件名必须定义在项目的 GameEvents 常量中，禁止硬编码字符串。
 * GameEvents 不在本文件中定义，应由项目在自有代码中维护。
 *
 * ═══════════════════════════════════════════════════════════════
 *  生命周期与清理规则
 * ═══════════════════════════════════════════════════════════════
 *
 * node.on(node, ...) 在 node.destroy() 时自动清理。
 * EventBus.on() 不会自动清理 —— 必须在 onDispose() / onDestroy() 中手动 off()。
 * 遗漏 off() 会导致：回调指向已销毁对象 → 崩溃或内存泄漏。
 *
 * 推荐模式：
 *   onBind()    { EventBus.instance.on(GameEvents.XXX, this._onXxx, this);  }
 *   onDispose() { EventBus.instance.off(GameEvents.XXX, this._onXxx, this); }
 *
 * ═══════════════════════════════════════════════════════════════
 *  设计决策：为何不 extends cc.EventTarget
 * ═══════════════════════════════════════════════════════════════
 *
 * 1. cc.EventTarget 不会因节点销毁自动清理——全局单例不挂在任何节点上
 * 2. 零依赖纯 TS 实现，可脱离引擎独立测试
 * 3. API 更精简，不暴露 targetOff / hasEventListener 等多余接口
 *
 * ═══════════════════════════════════════════════════════════════
 *
 * 用法：
 *   import { EventBus } from '../runtime/core/EventBus';
 *   EventBus.instance.on('battle:start', this.onBattleStart, this);
 *   EventBus.instance.emit('battle:start', { enemyId: 'boss_01' });
 *   EventBus.instance.off('battle:start', this.onBattleStart, this);
 */

type EventCallback = (...args: any[]) => void;

interface IEventEntry {
    callback: EventCallback;
    context: any;
    once: boolean;
}

export class EventBus {
    private static _instance: EventBus | null = null;
    private _listeners: Map<string, IEventEntry[]> = new Map();

    public static get instance(): EventBus {
        if (!EventBus._instance) {
            EventBus._instance = new EventBus();
        }
        return EventBus._instance;
    }

    /** 重置单例（仅用于测试） */
    public static resetInstance(): void {
        if (EventBus._instance) {
            EventBus._instance.clear();
            EventBus._instance = null;
        }
    }

    /**
     * 注册事件监听器
     * @param event 事件名称
     * @param callback 回调函数
     * @param context 回调执行上下文（可选，用于 this 绑定）
     */
    public on(event: string, callback: EventCallback, context?: any): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event)!.push({
            callback,
            context: context || null,
            once: false,
        });
    }

    /**
     * 注册一次性事件监听器（触发后自动移除）
     */
    public once(event: string, callback: EventCallback, context?: any): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event)!.push({
            callback,
            context: context || null,
            once: true,
        });
    }

    /**
     * 移除事件监听器
     * - 不传 callback：移除该事件的所有监听器
     * - 传 callback + context：精确匹配移除
     */
    public off(event: string, callback?: EventCallback, context?: any): void {
        if (!this._listeners.has(event)) return;

        if (!callback) {
            this._listeners.delete(event);
            return;
        }

        const entries = this._listeners.get(event)!;
        const filtered = entries.filter(
            (entry) => entry.callback !== callback || (context && entry.context !== context)
        );

        if (filtered.length === 0) {
            this._listeners.delete(event);
        } else {
            this._listeners.set(event, filtered);
        }
    }

    /**
     * 触发事件
     * @param event 事件名称
     * @param args 传递给监听器的参数
     */
    public emit(event: string, ...args: any[]): void {
        if (!this._listeners.has(event)) return;

        const entries = this._listeners.get(event)!;
        const toRemove: IEventEntry[] = [];

        for (const entry of entries) {
            entry.callback.apply(entry.context, args);
            if (entry.once) {
                toRemove.push(entry);
            }
        }

        // 清理一次性监听器
        if (toRemove.length > 0) {
            const remaining = entries.filter((e) => !toRemove.includes(e));
            if (remaining.length === 0) {
                this._listeners.delete(event);
            } else {
                this._listeners.set(event, remaining);
            }
        }
    }

    /**
     * 清除所有事件监听器
     */
    public clear(): void {
        this._listeners.clear();
    }

    /**
     * 获取指定事件的监听器数量（调试用）
     */
    public listenerCount(event: string): number {
        return this._listeners.has(event) ? this._listeners.get(event)!.length : 0;
    }

    /**
     * 获取所有已注册事件名（调试用）
     */
    public eventNames(): string[] {
        return Array.from(this._listeners.keys());
    }
}
