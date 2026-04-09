/**
 * EventBus — 全局事件总线
 * [cocos-dna skill template — v1.0.0]
 *
 * 解耦模块间通信的通用事件系统。
 * 支持 on / off / emit / once，单例模式，支持 context 绑定。
 *
 * 项目特定的事件常量（如 GameEvents）不在此文件中定义，
 * 应由项目在自有代码中维护（如 events/GameEvents.ts）。
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
