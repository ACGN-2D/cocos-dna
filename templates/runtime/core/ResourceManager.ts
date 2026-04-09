/**
 * ResourceManager — 统一资源加载与释放管理器
 * 
 * [cocos-dna skill template — v1.0.0]
 * 
 * 核心职责：
 *  1. cache  — 避免重复加载同一资源
 *  2. group  — 按分组名（通常是渲染器名称）追踪资源归属
 *  3. batch release — 渲染器 dispose 时一键释放整组资源
 *  4. Promise 化 — 统一 load 接口为 async/await
 * 
 * 使用方式：
 *  // 加载
 *  const sf = await ResourceManager.load<SpriteFrame>('textures/bg', SpriteFrame, 'battle');
 *  // 释放单个
 *  ResourceManager.release('textures/bg');
 *  // 释放整组（在 Renderer.onDispose 中调用）
 *  ResourceManager.releaseGroup('battle');
 * 
 * 与 BaseView 集成：
 *  - loadPrefab() / loadImageToSprite() 内部调用 ResourceManager.load()
 *  - onDispose() 中调用 ResourceManager.releaseGroup(groupName)
 * 
 * 当前阶段刻意不做的事（避免过度设计）：
 *  - 引用计数（ref-count）— 当前项目资源归属清晰，group release 足够
 *  - 自动 release policy — 容易误杀，等项目规模更大时再考虑
 *  - Asset Bundle 抽象 — 先把 resources 跑稳
 */

import { resources, Asset, SpriteFrame, Prefab } from 'cc';

// ==================== 类型定义 ====================

/** 缓存条目 */
interface ICacheEntry {
    /** 已加载的资源引用 */
    asset: Asset;
    /** 所属分组名（通常是渲染器名称，如 'battle'、'main-menu'） */
    groups: Set<string>;
}

// ==================== ResourceManager ====================

export class ResourceManager {
    /** 资源缓存：path → 缓存条目 */
    private static _cache: Map<string, ICacheEntry> = new Map();

    /** 分组索引：groupName → Set<path>，用于快速批量释放 */
    private static _groups: Map<string, Set<string>> = new Map();

    /** 正在加载中的 Promise（防止同一资源并发加载） */
    private static _loading: Map<string, Promise<Asset>> = new Map();

    // ==================== 加载 ====================

    /**
     * 加载资源（Promise 化，带缓存 + 分组）
     * 
     * @param path  相对于 resources/ 的路径，不含后缀
     *              例：'textures/battle/card_bg_attack/spriteFrame'
     * @param type  Cocos 资源类型构造函数（SpriteFrame, Prefab, JsonAsset 等）
     * @param group 分组名（可选），通常传渲染器名称。
     *              同一资源可属于多个分组（如 common 资源被多个渲染器引用）。
     *              releaseGroup 只在资源不属于任何其他分组时才真正释放。
     * @returns Promise<T> 已加载的资源
     */
    public static async load<T extends Asset>(
        path: string,
        type: { new(...args: any[]): T },
        group?: string,
    ): Promise<T> {
        // 命中缓存
        const cached = this._cache.get(path);
        if (cached) {
            if (group) {
                cached.groups.add(group);
                this._addToGroupIndex(group, path);
            }
            return cached.asset as T;
        }

        // 防止并发加载同一资源
        const existing = this._loading.get(path);
        if (existing) {
            const asset = await existing;
            // 加载完成后补充分组信息
            if (group) {
                const entry = this._cache.get(path);
                if (entry) {
                    entry.groups.add(group);
                    this._addToGroupIndex(group, path);
                }
            }
            return asset as T;
        }

        // 发起新加载
        const promise = new Promise<Asset>((resolve, reject) => {
            resources.load(path, type as any, (err: Error | null, asset: Asset) => {
                this._loading.delete(path);

                if (err || !asset) {
                    reject(err || new Error(`[ResourceManager] Asset not found: ${path}`));
                    return;
                }

                // 写入缓存
                const groups = new Set<string>();
                if (group) {
                    groups.add(group);
                    this._addToGroupIndex(group, path);
                }
                this._cache.set(path, { asset, groups });

                resolve(asset);
            });
        });

        this._loading.set(path, promise);
        return promise as Promise<T>;
    }

    // ==================== 释放 ====================

    /**
     * 释放单个资源
     * 
     * @param path 资源路径（与 load 时一致）
     * @param force 强制释放，即使还属于其他分组（默认 false）
     */
    public static release(path: string, force: boolean = false): void {
        const entry = this._cache.get(path);
        if (!entry) return;

        if (!force && entry.groups.size > 0) {
            // 还有分组引用，不释放
            return;
        }

        // 从引擎释放
        try {
            resources.release(entry.asset);
        } catch (e) {
            console.warn(`[ResourceManager] release error for ${path}:`, e);
        }

        // 清理缓存和索引
        this._cache.delete(path);
        for (const g of entry.groups) {
            const groupPaths = this._groups.get(g);
            if (groupPaths) {
                groupPaths.delete(path);
                if (groupPaths.size === 0) {
                    this._groups.delete(g);
                }
            }
        }
    }

    /**
     * 释放整组资源（通常在渲染器 onDispose 中调用）
     * 
     * 逻辑：
     *  1. 从该分组中移除所有资源的分组标记
     *  2. 如果某资源不再属于任何分组，则真正释放
     *  3. 如果某资源仍属于其他分组（如 common 资源被 battle 和 map 共享），保留不释放
     * 
     * @param group 分组名（渲染器名称）
     */
    public static releaseGroup(group: string): void {
        const paths = this._groups.get(group);
        if (!paths) return;

        // 复制一份，因为释放过程中会修改 paths
        const pathList = Array.from(paths);

        for (const path of pathList) {
            const entry = this._cache.get(path);
            if (!entry) continue;

            // 从该分组中移除
            entry.groups.delete(group);

            // 如果不属于任何分组了，真正释放
            if (entry.groups.size === 0) {
                try {
                    resources.release(entry.asset);
                } catch (e) {
                    console.warn(`[ResourceManager] release error for ${path}:`, e);
                }
                this._cache.delete(path);
            }
        }

        this._groups.delete(group);
    }

    /**
     * 释放所有缓存资源（通常在游戏退出或热重载时调用）
     */
    public static clear(): void {
        for (const [path, entry] of this._cache) {
            try {
                resources.release(entry.asset);
            } catch (e) {
                // 静默忽略
            }
        }
        this._cache.clear();
        this._groups.clear();
        this._loading.clear();
    }

    // ==================== 查询 ====================

    /**
     * 检查资源是否已缓存
     */
    public static has(path: string): boolean {
        return this._cache.has(path);
    }

    /**
     * 获取已缓存的资源（不触发加载）
     */
    public static get<T extends Asset>(path: string): T | null {
        const entry = this._cache.get(path);
        return entry ? entry.asset as T : null;
    }

    /**
     * 获取缓存统计信息（调试用）
     */
    public static getStats(): {
        totalCached: number;
        groups: Record<string, number>;
        loading: number;
    } {
        const groups: Record<string, number> = {};
        for (const [name, paths] of this._groups) {
            groups[name] = paths.size;
        }
        return {
            totalCached: this._cache.size,
            groups,
            loading: this._loading.size,
        };
    }

    // ==================== 内部方法 ====================

    private static _addToGroupIndex(group: string, path: string): void {
        let paths = this._groups.get(group);
        if (!paths) {
            paths = new Set();
            this._groups.set(group, paths);
        }
        paths.add(path);
    }
}
