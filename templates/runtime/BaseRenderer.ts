/**
 * BaseRenderer - 所有渲染器的统一基类（模板方法模式）
 * 
 * [cocos-dna skill template — 通用版本]
 * 
 * UI 构建模式：仅 Prefab 模式
 *  loadPrefab → cc.instantiate → 引用子节点
 * 
 * 双层生命周期：
 *  驱动层 (Public):  init() / show() / hide() / update() / dispose()
 *    — 由 View 层在页面切换时统一调度，包含状态机保护、Tween 自动清理等通用逻辑。
 *  业务层 (Hooks):   onInit(abstract) / onShow / onHide(async) / onUpdate / onDispose
 *    — 子类重写钩子方法实现具体业务逻辑。
 * 
 * 渲染器状态机：
 *  None → Inited → Visible ⇄ Hidden → Disposed
 *  Disposed 为终态，任何操作均被拦截。
 * 
 * 配置注入：
 *  项目特定的配色方案和设计分辨率通过 IRendererConfig 接口传入，
 *  而非硬编码在基类中。项目侧在 RendererConfig.ts 中定义并调用
 *  BaseRenderer.configure() 完成注入。
 * 
 * 所有后续 Renderer（Battle / Map / Dialogue 等）继承此基类。
 */

import { Node, Sprite, SpriteFrame, UITransform,
    Color, Size, Vec2, Texture2D, ImageAsset, Rect,
    Prefab, instantiate, resources, Widget, Layout, Tween } from 'cc';
import { ResourceManager } from './ResourceManager';

// ==================== 渲染器状态枚举 ====================

export enum RendererState {
    /** 尚未初始化 */
    None     = 'None',
    /** 已初始化但未显示（init 完成后、首次 show 前、hide 后） */
    Inited   = 'Inited',
    /** 正在显示 */
    Visible  = 'Visible',
    /** 已隐藏（可重新 show） */
    Hidden   = 'Hidden',
    /** 已销毁（终态，不可恢复） */
    Disposed = 'Disposed',
}

// ==================== 配置接口 ====================

/**
 * 渲染器配置接口 — 项目侧实现此接口注入特定风格
 * 
 * 字段说明：
 * - designWidth / designHeight: 设计分辨率（Prefab 坐标系）
 * - colors: 项目配色方案（键名自由定义，值为 cc.Color）
 * 
 * 示例：
 * ```ts
 * BaseRenderer.configure({
 *     designWidth: 1280,
 *     designHeight: 720,
 *     colors: {
 *         PRIMARY:    new Color(200, 117, 51, 255),
 *         BG_DEEP:    new Color(10, 22, 40, 255),
 *         TEXT_LIGHT: new Color(240, 230, 211, 255),
 *         SUCCESS:    new Color(76, 175, 80, 255),
 *         DANGER:     new Color(244, 67, 54, 255),
 *     }
 * });
 * ```
 */
export interface IRendererConfig {
    /** 设计分辨率宽度 */
    designWidth: number;
    /** 设计分辨率高度 */
    designHeight: number;
    /** 项目配色方案（键名自由定义） */
    colors: Readonly<Record<string, Color>>;
}

// ==================== 默认配置 ====================

/** 默认配置（无配色，使用通用分辨率） */
const DEFAULT_CONFIG: IRendererConfig = {
    designWidth: 1280,
    designHeight: 720,
    colors: {},
};

// ==================== BaseRenderer ====================

export abstract class BaseRenderer {
    /** 渲染器名称（调试用） */
    protected _name: string;
    /** 根节点 */
    protected _root: Node | null = null;
    /** 渲染器状态（显式状态机，替代布尔标志） */
    protected _state: RendererState = RendererState.None;
    /** 子节点引用缓存 */
    protected _nodeRefs: Map<string, Node> = new Map();

    /** 全局配置（通过 configure() 注入） */
    private static _config: IRendererConfig = DEFAULT_CONFIG;

    constructor(name: string) {
        this._name = name;
    }

    // ===== 配置注入 =====

    /**
     * 注入项目特定的配置（配色、分辨率等）
     * 
     * 应在应用启动时、任何渲染器 init() 之前调用一次。
     * 典型调用位置：GameEntry.onLoad() 的最前面。
     * 
     * @param config 项目配置
     */
    public static configure(config: IRendererConfig): void {
        BaseRenderer._config = config;
    }

    /** 获取当前配置 */
    public static get config(): Readonly<IRendererConfig> {
        return BaseRenderer._config;
    }

    /** 获取设计分辨率宽度 */
    public static get designWidth(): number {
        return BaseRenderer._config.designWidth;
    }

    /** 获取设计分辨率高度 */
    public static get designHeight(): number {
        return BaseRenderer._config.designHeight;
    }

    /** 获取配色方案（只读） */
    public static get colors(): Readonly<Record<string, Color>> {
        return BaseRenderer._config.colors;
    }

    // ===== 生命周期 =====

    /**
     * 初始化渲染器，挂载到父节点
     * 状态转换：None → Inited
     * @param parent 父节点 (通常是 LayerManager.page)
     */
    public init(parent: Node): void {
        if (this._state !== RendererState.None) {
            console.warn(`[${this._name}] init() called in state ${this._state}, expected None`);
            return;
        }

        this._root = new Node(this._name);
        this._root.parent = parent;
        this._root.setPosition(0, 0, 0);

        const ut = this._root.addComponent(UITransform);
        ut.setContentSize(BaseRenderer.designWidth, BaseRenderer.designHeight);
        ut.setAnchorPoint(0.5, 0.5);

        // 先将根节点设为 inactive，避免 Prefab 实例化过程中
        // Cocos UIRendererManager 标记 dirty → TTF.updateProcessingData 访问 null.width。
        // show() 时会重新激活。
        this._root.active = false;

        this.onInit();
        this._state = RendererState.Inited;
        console.log(`[${this._name}] Initialized (state: ${this._state})`);
    }

    /** 子类实现：创建所有UI节点 */
    protected abstract onInit(): void;

    /**
     * 显示渲染器
     * 状态转换：Inited/Hidden → Visible
     * 包含防重复保护：Visible 状态下再次 show() 仅刷新 active，不触发 onShow
     */
    public show(data?: any): void {
        if (this._state === RendererState.Disposed) {
            console.error(`[${this._name}] show() called after dispose, BLOCKED`);
            return;
        }
        if (this._state === RendererState.None) {
            console.error(`[${this._name}] show() called before init, BLOCKED`);
            return;
        }
        if (!this._root) return;
        this._root.active = true;
        if (this._state === RendererState.Visible) {
            console.warn(`[${this._name}] show() called while already Visible, skipping onShow()`);
            return;
        }
        this._state = RendererState.Visible;
        this.onShow(data);
    }

    /** 子类可重写 */
    protected onShow(data?: any): void {}

    /**
     * 隐藏渲染器（支持异步退场动画）
     * 状态转换：Visible → Hidden
     * 
     * 流程：先切状态 → await onHide()（子类退场动画） → active=false
     * 安全隐藏策略：deactivate 根节点后 Cocos 自动跳过事件分发，
     * 不需要手动移除触摸事件监听器。
     */
    public async hide(): Promise<void> {
        if (this._state !== RendererState.Visible) {
            // 非 Visible 状态下 hide 是安全的 noop
            return;
        }
        if (!this._root) return;
        this._state = RendererState.Hidden;
        // 先调用钩子：子类可在此播放退场动画
        await this.onHide();
        // 退场完毕后 deactivate 根节点
        if (this._root && this._root.isValid) {
            this._root.active = false;
        }
    }

    /** 子类可重写：支持异步退场动画（如 0.3s 淡出后 resolve） */
    protected async onHide(): Promise<void> {}

    /**
     * 每帧更新（由GameEntry的update驱动）
     * 仅 Visible 状态下执行
     */
    public update(dt: number): void {
        if (this._state !== RendererState.Visible) return;
        this.onUpdate(dt);
    }

    /** 子类可重写 */
    protected onUpdate(dt: number): void {}

    /**
     * 销毁渲染器，释放所有资源
     * 状态转换：任意非 Disposed 状态 → Disposed
     * 包含递归 Tween 清理（覆盖子节点上的动画）
     */
    public dispose(): void {
        if (this._state === RendererState.Disposed) {
            console.warn(`[${this._name}] dispose() called on already Disposed renderer, skipping`);
            return;
        }
        if (this._state === RendererState.None) {
            console.warn(`[${this._name}] dispose() called on uninitialized renderer, skipping`);
            return;
        }

        // ① 先停止所有运动：递归清理根节点及所有子节点上的 Tween
        if (this._root && this._root.isValid) {
            this._stopTweensRecursive(this._root);
        }

        // ② 再释放子类资源
        try {
            this.onDispose();
        } catch (e) {
            console.warn(`[${this._name}] onDispose error:`, e);
        }

        // ②½ 释放 ResourceManager 中该渲染器分组的所有资源
        ResourceManager.releaseGroup(this._name);

        // ③ 最后销毁节点树
        this._nodeRefs.clear();
        this._prefabCache.clear();
        if (this._root && this._root.isValid) {
            this._root.destroy();
        }
        this._root = null;
        this._state = RendererState.Disposed;
        console.log(`[${this._name}] Disposed (state: ${this._state})`);
    }

    /** 子类可重写 */
    protected onDispose(): void {}

    // ===== 公共属性 =====

    public get root(): Node | null { return this._root; }
    public get state(): RendererState { return this._state; }
    /** @deprecated 使用 state === RendererState.Visible 替代 */
    public get isVisible(): boolean { return this._state === RendererState.Visible; }
    /** @deprecated 使用 state !== RendererState.None && state !== RendererState.Disposed 替代 */
    public get isInitialized(): boolean {
        return this._state !== RendererState.None && this._state !== RendererState.Disposed;
    }

    // ===== Tween 递归清理 =====

    /**
     * 递归停止节点及其所有子节点上的 Tween
     */
    private _stopTweensRecursive(node: Node): void {
        Tween.stopAllByTarget(node);
        for (const child of node.children) {
            this._stopTweensRecursive(child);
        }
    }

    // ===== Prefab 支持 =====

    /** 已加载的 Prefab 缓存 */
    protected _prefabCache: Map<string, Prefab> = new Map();

    /**
     * 从 resources 目录异步加载 Prefab
     * 
     * 底层通过 ResourceManager 统一管理缓存和分组释放。
     * _prefabCache 保留为本地快速引用（与 RM 的全局 cache 双写不冲突）。
     * 
     * @param path 相对于 resources/ 的路径，不含 .prefab 后缀
     *             例：'prefabs/pages/MainMenuPage'
     * @returns Promise<Prefab>
     */
    protected async loadPrefab(path: string): Promise<Prefab> {
        // 命中本地缓存
        const cached = this._prefabCache.get(path);
        if (cached) return cached;

        // 走 ResourceManager：自动 cache + group 关联
        const prefab = await ResourceManager.load<Prefab>(path, Prefab, this._name);
        this._prefabCache.set(path, prefab);
        return prefab;
    }

    /**
     * 实例化 Prefab 并挂载到指定父节点
     * @param prefab  Prefab 资源引用
     * @param parent  父节点（默认挂到 _root）
     * @returns 实例化后的节点
     */
    protected instantiatePrefab(prefab: Prefab, parent?: Node): Node {
        const node = instantiate(prefab);
        node.parent = parent || this._root!;
        // 自动将所有有名字的直接子节点注册到 _nodeRefs
        this._registerChildNodes(node);
        return node;
    }

    /**
     * 给节点添加 Widget 组件实现四边=0 全屏铺满
     */
    protected setupWidgetFullScreen(node: Node): Widget {
        let widget = node.getComponent(Widget);
        if (!widget) {
            widget = node.addComponent(Widget);
        }
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.top = 0;
        widget.bottom = 0;
        widget.left = 0;
        widget.right = 0;
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        return widget;
    }

    /**
     * 给节点添加 Widget 组件实现边距对齐
     */
    protected setupWidgetEdges(node: Node, edges: {
        top?: number; bottom?: number; left?: number; right?: number;
    }): Widget {
        let widget = node.getComponent(Widget);
        if (!widget) {
            widget = node.addComponent(Widget);
        }
        if (edges.top !== undefined) {
            widget.isAlignTop = true;
            widget.top = edges.top;
        }
        if (edges.bottom !== undefined) {
            widget.isAlignBottom = true;
            widget.bottom = edges.bottom;
        }
        if (edges.left !== undefined) {
            widget.isAlignLeft = true;
            widget.left = edges.left;
        }
        if (edges.right !== undefined) {
            widget.isAlignRight = true;
            widget.right = edges.right;
        }
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        return widget;
    }

    /**
     * 配置节点上的 Layout 组件
     */
    protected setupLayout(node: Node, type: number, spacing: number = 0, resizeMode: number = 1): Layout {
        let layout = node.getComponent(Layout);
        if (!layout) {
            layout = node.addComponent(Layout);
        }
        layout.type = type;
        layout.spacingX = spacing;
        layout.spacingY = spacing;
        layout.resizeMode = resizeMode;
        return layout;
    }

    /**
     * 递归注册节点及其子节点到 _nodeRefs
     */
    protected _registerChildNodes(node: Node): void {
        if (node.name) {
            this._nodeRefs.set(node.name, node);
        }
        for (const child of node.children) {
            this._registerChildNodes(child);
        }
    }

    /**
     * 获取节点上的 Widget 组件
     */
    protected getWidget(nodeName: string): Widget | null {
        const node = this.getNode(nodeName);
        return node ? node.getComponent(Widget) : null;
    }

    /**
     * 获取节点上的 Layout 组件
     */
    protected getLayout(nodeName: string): Layout | null {
        const node = this.getNode(nodeName);
        return node ? node.getComponent(Layout) : null;
    }

    // ===== 工具方法 =====

    /** 缓存的纯白 1x1 SpriteFrame（用于纯色方块/线条） */
    private static _solidWhiteSF: SpriteFrame | null = null;

    /**
     * 获取或创建一个纯白 1x1 像素 SpriteFrame
     */
    protected getSolidWhiteSpriteFrame(): SpriteFrame {
        if (BaseRenderer._solidWhiteSF && BaseRenderer._solidWhiteSF.isValid) {
            return BaseRenderer._solidWhiteSF;
        }
        // 创建 1x1 纯白像素的 ImageAsset → Texture2D → SpriteFrame
        // 统一使用 Uint8Array，兼容所有 Cocos 运行环境（原生/Web/小游戏）
        const img = new ImageAsset();
        const data = new Uint8Array([255, 255, 255, 255]);
        img.reset({ _data: data, width: 1, height: 1, format: Texture2D.PixelFormat.RGBA8888, _compressed: false } as any);
        const tex = new Texture2D();
        tex.image = img;
        const sf = new SpriteFrame();
        sf.texture = tex;
        sf.rect = new Rect(0, 0, 1, 1);
        sf.originalSize = new Size(1, 1);
        sf.offset = new Vec2(0, 0);
        BaseRenderer._solidWhiteSF = sf;
        return sf;
    }

    /**
     * 图片适配模式
     */
    public static readonly FitMode = {
        NONE: 'none' as const,
        CONTAIN: 'contain' as const,
        COVER: 'cover' as const,
    };

    /**
     * 从 resources 目录加载图片并应用到 Sprite 节点
     */
    protected loadImageToSprite(
        resPath: string,
        sprite: Sprite,
        callbackOrOptions?: (() => void) | {
            fitMode?: 'none' | 'contain' | 'cover';
            boundsWidth?: number;
            boundsHeight?: number;
            callback?: () => void;
        }
    ): void {
        let fitMode: 'none' | 'contain' | 'cover' = 'none';
        let boundsW = 0;
        let boundsH = 0;
        let callback: (() => void) | undefined;

        if (typeof callbackOrOptions === 'function') {
            callback = callbackOrOptions;
        } else if (callbackOrOptions) {
            fitMode = callbackOrOptions.fitMode || 'none';
            boundsW = callbackOrOptions.boundsWidth || 0;
            boundsH = callbackOrOptions.boundsHeight || 0;
            callback = callbackOrOptions.callback;
        }

        const sfPath = `${resPath}/spriteFrame`;
        ResourceManager.load<SpriteFrame>(sfPath, SpriteFrame, this._name)
            .then(spriteFrame => {
                sprite.spriteFrame = spriteFrame;
                sprite.color = new Color(255, 255, 255, 255);
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;

                if (fitMode !== 'none' && boundsW > 0 && boundsH > 0) {
                    this._fitSpriteInBounds(sprite, boundsW, boundsH, fitMode);
                }

                callback?.();
            })
            .catch(err => {
                console.warn(`[${this._name}] Failed to load image: ${sfPath}`, err?.message);
                callback?.();
            });
    }

    /**
     * 将 Sprite 节点的 UITransform 尺寸等比缩放到指定区域内
     */
    protected _fitSpriteInBounds(
        sprite: Sprite,
        boundsW: number,
        boundsH: number,
        mode: 'contain' | 'cover' = 'contain'
    ): void {
        const sf = sprite.spriteFrame;
        if (!sf) return;

        const origW = sf.originalSize.width;
        const origH = sf.originalSize.height;
        if (origW <= 0 || origH <= 0) return;

        const scaleX = boundsW / origW;
        const scaleY = boundsH / origH;

        const scale = mode === 'contain'
            ? Math.min(scaleX, scaleY)
            : Math.max(scaleX, scaleY);

        const finalW = Math.round(origW * scale);
        const finalH = Math.round(origH * scale);

        const ut = sprite.node.getComponent(UITransform);
        if (ut) {
            ut.setContentSize(finalW, finalH);
        }

        console.log(
            `[${this._name}] fitSprite ${mode}: ` +
            `orig=${origW}×${origH} → bounds=${boundsW}×${boundsH} → final=${finalW}×${finalH}`
        );
    }

    /**
     * 获取已缓存的子节点
     */
    protected getNode(name: string): Node | null {
        return this._nodeRefs.get(name) || null;
    }
}
