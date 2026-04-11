/**
 * BaseView — Unified Component base class for all page views
 *
 * [cocos-dna skill template — v1.1.0]
 *
 * Three-layer architecture (code isolation):
 *   Layer 1 — BaseView (runtime, skill-maintained, never hand-edit in project)
 *   Layer 2 — XxxView.generated.ts (AI-generated, safe to overwrite)
 *   Layer 3 — XxxView.ts (business logic, never overwritten by AI)
 *
 * Auto-bind decorators (v1.1 — replaces @property + _bindNodeProperties):
 *   @autoNode('NodeName')   → resolves to Node from Prefab tree
 *   @autoLabel('NodeName')  → resolves to Label component on that node
 *   @autoSprite('NodeName') → resolves to Sprite component on that node
 *
 *   These decorators work regardless of how the component is mounted:
 *     - Editor serialization (@property in Prefab) → field already set, decorator skips
 *     - Dynamic addComponent() → decorator resolves from _nodeRefs cache
 *
 * Example:
 *   // Layer 2: AI-generated (auto-overwrite safe)
 *   // file: HomeView.generated.ts
 *   @ccclass('HomeViewGenerated')
 *   export class HomeViewGenerated extends BaseView {
 *       @autoNode('StartBtn') btnStart: Node = null!;
 *       @autoLabel('Title')   txtTitle: Label = null!;
 *       protected get viewName() { return 'HomeView'; }
 *       protected get resourceGroup() { return 'home-page'; }
 *   }
 *
 *   // Layer 3: Business logic (human-written, never overwritten)
 *   // file: HomeView.ts
 *   @ccclass('HomeView')
 *   export class HomeView extends HomeViewGenerated {
 *       protected onBind(): void {
 *           this.btnStart.on(Node.EventType.TOUCH_END, this._onStart, this);
 *       }
 *       protected onRefresh(data?: any): void {
 *           this.txtTitle.string = 'Hello World';
 *       }
 *   }
 *
 * State machine:
 *   None → Ready → Visible ⇄ Hidden → Disposed
 *
 * Lifecycle (dual-layer):
 *   Driver layer (public):  open() / close() / refresh() / dispose()
 *   Hook layer (protected): onBind() / onShow() / onHide() / onRefresh() / onDispose()
 *
 * Key features:
 *   - Extends cc.Component → supports @property serialization
 *   - Auto-bind decorators for addComponent() compatibility
 *   - Mounted on Prefab root node → Cocos engine drives lifecycle
 *   - No need for separate PageComp class → one class does both binding + logic
 *   - Resource group auto-release on dispose
 *   - Three-layer code isolation: runtime → generated → business
 */

import {
    _decorator, Component, Node, Sprite, SpriteFrame, Label,
    UITransform, Color, Prefab, instantiate, Widget, Tween
} from 'cc';
import { ResourceManager } from '../core/ResourceManager';

const { ccclass, property } = _decorator;

// ==================== Auto-Bind Decorators ====================

/**
 * Metadata key for auto-bind entries stored on the class prototype.
 * Each entry describes one property that should be resolved from _nodeRefs at onLoad.
 */
const AUTO_BIND_META_KEY = '__autoBind__';

/**
 * Describes a single auto-bind entry.
 *
 * - 'node': resolve to `getNode(nodeName)`
 * - 'label': resolve to `getNode(nodeName)?.getComponent(Label)`
 * - 'sprite': resolve to `getNode(nodeName)?.getComponent(Sprite)`
 */
interface IAutoBindEntry {
    /** The class property name to fill */
    propertyKey: string;
    /** The Prefab node name to look up in _nodeRefs */
    nodeName: string;
    /** What kind of reference to resolve */
    type: 'node' | 'label' | 'sprite';
}

/**
 * Internal helper — register an auto-bind entry on the class prototype.
 * Called by each decorator factory.
 */
function _registerAutoBind(
    prototype: any,
    propertyKey: string,
    nodeName: string,
    type: IAutoBindEntry['type']
): void {
    // Ensure each class in the inheritance chain has its own list
    if (!prototype.hasOwnProperty(AUTO_BIND_META_KEY)) {
        // Copy parent entries (if any) to support inheritance
        const parent: IAutoBindEntry[] = prototype[AUTO_BIND_META_KEY] || [];
        prototype[AUTO_BIND_META_KEY] = [...parent];
    }
    (prototype[AUTO_BIND_META_KEY] as IAutoBindEntry[]).push({
        propertyKey,
        nodeName,
        type,
    });
}

/**
 * Decorator: auto-bind a Node reference from the Prefab node tree.
 *
 * Works both with editor serialization (@property) and dynamic addComponent().
 * If the field is already set (e.g. by Cocos @property deserialization), it is NOT overwritten.
 * If null, it resolves from _nodeRefs (populated in onLoad via _registerChildNodes).
 *
 * Usage (Layer 2):
 *   @autoNode('BattleBG')
 *   background: Node = null!;
 *
 * Equivalent to:
 *   @property(Node) background: Node = null!;
 *   // + in _bindNodeProperties: if (!this.background) this.background = this.getNode('BattleBG')!;
 */
export function autoNode(nodeName: string): PropertyDecorator {
    return (target: any, propertyKey: string | symbol) => {
        _registerAutoBind(target, propertyKey as string, nodeName, 'node');
    };
}

/**
 * Decorator: auto-bind a Label component from the Prefab node tree.
 *
 * Usage (Layer 2):
 *   @autoLabel('PlayerHPText')
 *   playerHPText: Label = null!;
 */
export function autoLabel(nodeName: string): PropertyDecorator {
    return (target: any, propertyKey: string | symbol) => {
        _registerAutoBind(target, propertyKey as string, nodeName, 'label');
    };
}

/**
 * Decorator: auto-bind a Sprite component from the Prefab node tree.
 *
 * Usage (Layer 2):
 *   @autoSprite('PlayerPortrait')
 *   playerPortrait: Sprite = null!;
 */
export function autoSprite(nodeName: string): PropertyDecorator {
    return (target: any, propertyKey: string | symbol) => {
        _registerAutoBind(target, propertyKey as string, nodeName, 'sprite');
    };
}

// ==================== View State ====================

export enum ViewState {
    /** Not yet initialized */
    None     = 'None',
    /** Component loaded, onLoad/start completed, ready to show */
    Ready    = 'Ready',
    /** Currently visible and active */
    Visible  = 'Visible',
    /** Hidden (can be re-shown) */
    Hidden   = 'Hidden',
    /** Destroyed (terminal state) */
    Disposed = 'Disposed',
}

// ==================== View Config ====================

/**
 * View configuration interface — project-side implements this
 * to inject design resolution and color scheme.
 *
 * Usage:
 *   BaseView.configure({ designWidth: 1280, designHeight: 720 });
 */
export interface IViewConfig {
    /** Design resolution width */
    designWidth: number;
    /** Design resolution height */
    designHeight: number;
}

const DEFAULT_VIEW_CONFIG: IViewConfig = {
    designWidth: 1280,
    designHeight: 720,
};

// ==================== Asset Manifest ====================

/**
 * A single asset entry from asset-manifest.json.
 *
 * Layer 2 (generated) converts the JSON file into an array of these entries
 * and returns them via the `assetManifest` getter. BaseView then uses this
 * data to automatically load dynamic resources and bind them to nodes.
 *
 * Only `loadType: 'dynamic'` entries are processed at runtime.
 * `loadType: 'static'` entries are handled by @property in the editor.
 */
export interface IManifestAssetEntry {
    /** Unique asset identifier (snake_case), e.g. 'card_bg_attack' */
    id: string;
    /** Path relative to project root, e.g. 'assets/resources/textures/pages/battle/card_bg_attack.png' */
    assetPath: string;
    /** Loading strategy: 'static' = @property in editor, 'dynamic' = resources.load at runtime */
    loadType: 'static' | 'dynamic';
    /** Resource type in Cocos */
    type: 'sprite-frame' | 'texture' | 'spine' | 'particle';
    /** Sprite render mode */
    sliceMode?: 'simple' | 'sliced' | 'tiled';
    /** Nine-slice border (required when sliceMode = 'sliced') */
    nineSlice?: { top: number; bottom: number; left: number; right: number };
    /** Prefab node names that reference this asset */
    boundToNodes: string[];
    /** Asset status: only 'ready' entries are loaded */
    status: 'missing' | 'exists' | 'ready' | 'deprecated' | 'size_mismatch';
    /** Original size from design */
    size?: { w: number; h: number };
}

/**
 * Asset manifest data structure — mirrors asset-manifest.json.
 *
 * Subclasses (Layer 2) override `get assetManifest()` to provide this data.
 * BaseView uses it to auto-bind dynamic resources to nodes during onLoad.
 */
export interface IAssetManifest {
    /** Page identifier, e.g. 'battle' */
    page: string;
    /**
     * Path to the source asset-manifest.json (relative to project root).
     *
     * This is NOT used at runtime — it serves as a traceability marker so that:
     *   1. Agent knows where to re-read the JSON when regenerating Layer 2
     *   2. Validation scripts can diff generated code vs source JSON
     *
     * Example: 'cocos-dna/components/battle/asset-manifest.json'
     */
    sourceFile: string;
    /** Asset entries */
    assets: IManifestAssetEntry[];
}

// ==================== BaseView ====================

@ccclass('BaseView')
export abstract class BaseView extends Component {

    // ===== Abstract properties (must be defined in generated layer) =====

    /** View name for logging and resource group identification */
    protected abstract get viewName(): string;

    /** Resource group name for ResourceManager (defaults to viewName) */
    protected get resourceGroup(): string {
        return this.viewName;
    }

    // ===== State machine =====

    private _viewState: ViewState = ViewState.None;

    /** Current view state (read-only) */
    public get viewState(): ViewState {
        return this._viewState;
    }

    /** Whether the view is currently visible */
    public get isVisible(): boolean {
        return this._viewState === ViewState.Visible;
    }

    // ===== Global config =====

    private static _config: IViewConfig = DEFAULT_VIEW_CONFIG;

    /**
     * Inject project-specific configuration.
     * Call once at app startup, before any view is opened.
     */
    public static configure(config: IViewConfig): void {
        BaseView._config = config;
    }

    public static get config(): Readonly<IViewConfig> {
        return BaseView._config;
    }

    public static get designWidth(): number {
        return BaseView._config.designWidth;
    }

    public static get designHeight(): number {
        return BaseView._config.designHeight;
    }

    // ===== Node reference cache (for UIBinder / dynamic lookup) =====

    private _nodeRefs: Map<string, Node> = new Map();

    /** Cache of loaded manifest assets: assetId → SpriteFrame */
    private _manifestAssets: Map<string, SpriteFrame> = new Map();

    // ===== Asset Manifest (subclass override) =====

    /**
     * Override in Layer 2 (generated) to provide asset manifest data.
     *
     * The manifest is sourced from cocos-dna/components/<page>/asset-manifest.json.
     * Agent reads the JSON at code-generation time and produces a TypeScript literal.
     *
     * Only `loadType: 'dynamic'` + `status: 'ready'` entries are auto-loaded.
     * `loadType: 'static'` entries are bound via @property in the Prefab editor.
     *
     * Example (in Layer 2):
     *   protected get assetManifest(): IAssetManifest {
     *       return {
     *           page: 'battle',
     *           sourceFile: 'cocos-dna/components/battle/asset-manifest.json',
     *           assets: [
     *               {
     *                   id: 'card_bg_attack',
     *                   assetPath: 'assets/resources/textures/pages/battle/card_bg_attack.png',
     *                   loadType: 'dynamic',
     *                   type: 'sprite-frame',
     *                   sliceMode: 'sliced',
     *                   nineSlice: { top: 8, bottom: 8, left: 8, right: 8 },
     *                   boundToNodes: ['CardSlot'],
     *                   status: 'ready',
     *                   size: { w: 130, h: 180 },
     *               },
     *               // ... more entries from asset-manifest.json
     *           ],
     *       };
     *   }
     *
     * @returns null if no manifest is provided (default)
     */
    protected get assetManifest(): IAssetManifest | null {
        return null;
    }

    // ===== Cocos Component lifecycle =====

    /**
     * Cocos onLoad — called when the component is first loaded.
     * Transitions: None → Ready
     *
     * Subclasses should NOT override onLoad. Use onBind() instead.
     */
    protected onLoad(): void {
        if (this._viewState !== ViewState.None) {
            console.warn(`[${this.viewName}] onLoad called in state ${this._viewState}`);
            return;
        }

        // Register all child nodes for dynamic lookup
        this._registerChildNodes(this.node);

        // Auto-bind decorated properties (@autoNode, @autoLabel, @autoSprite)
        this._autoBindDecoratedProperties();

        // Auto-bind dynamic assets from manifest (fire-and-forget)
        this._bindManifestAssets();

        // Call subclass hook: bind events, setup references
        try {
            this.onBind();
        } catch (e) {
            console.error(`[${this.viewName}] onBind error:`, e);
        }

        this._viewState = ViewState.Ready;
        this.node.active = false; // Start hidden, open() will activate
        console.log(`[${this.viewName}] Ready (state: ${this._viewState})`);
    }

    // ===== Public API (driver layer) =====

    /**
     * Open the view (make it visible).
     * Transitions: Ready/Hidden → Visible
     *
     * @param data Optional data to pass to onShow/onRefresh
     */
    public open(data?: any): void {
        if (this._viewState === ViewState.Disposed) {
            console.error(`[${this.viewName}] open() called after dispose, BLOCKED`);
            return;
        }
        if (this._viewState === ViewState.None) {
            console.error(`[${this.viewName}] open() called before onLoad, BLOCKED`);
            return;
        }

        this.node.active = true;

        if (this._viewState === ViewState.Visible) {
            // Already visible — just refresh
            this.onRefresh(data);
            return;
        }

        this._viewState = ViewState.Visible;
        this.onShow(data);
        this.onRefresh(data);
        console.log(`[${this.viewName}] Opened (state: ${this._viewState})`);
    }

    /**
     * Close the view (hide it, supports async exit animation).
     * Transitions: Visible → Hidden
     */
    public async close(): Promise<void> {
        if (this._viewState !== ViewState.Visible) {
            return; // Safe noop
        }

        this._viewState = ViewState.Hidden;

        // Subclass hook: exit animation
        await this.onHide();

        if (this.node && this.node.isValid) {
            this.node.active = false;
        }
        console.log(`[${this.viewName}] Closed (state: ${this._viewState})`);
    }

    /**
     * Refresh the view with new data (without close/open cycle).
     * Only works when Visible.
     */
    public refresh(data?: any): void {
        if (this._viewState !== ViewState.Visible) return;
        this.onRefresh(data);
    }

    /**
     * Dispose the view — release all resources and destroy.
     * Transitions: any non-Disposed → Disposed
     */
    public dispose(): void {
        if (this._viewState === ViewState.Disposed) {
            console.warn(`[${this.viewName}] dispose() on already Disposed, skipping`);
            return;
        }
        if (this._viewState === ViewState.None) {
            console.warn(`[${this.viewName}] dispose() on uninitialized, skipping`);
            return;
        }

        // ① Stop all tweens recursively
        if (this.node && this.node.isValid) {
            this._stopTweensRecursive(this.node);
        }

        // ② Subclass cleanup
        try {
            this.onDispose();
        } catch (e) {
            console.warn(`[${this.viewName}] onDispose error:`, e);
        }

        // ③ Release resource group
        ResourceManager.releaseGroup(this.resourceGroup);

        // ④ Clear caches
        this._nodeRefs.clear();
        this._manifestAssets.clear();

        this._viewState = ViewState.Disposed;
        console.log(`[${this.viewName}] Disposed (state: ${this._viewState})`);

        // ⑤ Destroy the node (which also destroys this component)
        if (this.node && this.node.isValid) {
            this.node.destroy();
        }
    }

    // ===== Hook layer (subclass overrides) =====

    /**
     * Called once during onLoad. Bind events, setup initial references.
     * This is where business logic connects to @property nodes.
     *
     * Defined in Layer 3 (business code, never overwritten).
     */
    protected onBind(): void {}

    /**
     * Called when the view becomes visible (open() transitions to Visible).
     * Use for enter animations, one-time setup per show.
     */
    protected onShow(data?: any): void {}

    /**
     * Called when the view is hidden (close() transitions to Hidden).
     * Use for exit animations. Supports async (return a Promise).
     */
    protected async onHide(): Promise<void> {}

    /**
     * Called to refresh the view with new data.
     * Invoked by open() and refresh(). This is the primary data-binding hook.
     *
     * Defined in Layer 3 (business code, never overwritten).
     */
    protected onRefresh(data?: any): void {}

    /**
     * Called during dispose, before resource release.
     * Clean up custom references, timers, etc.
     */
    protected onDispose(): void {}

    // ===== Dynamic node lookup =====

    /**
     * Get a cached child node by name (recursive lookup done at onLoad).
     * Use this as a fallback when @property binding is not available.
     */
    protected getNode(name: string): Node | null {
        return this._nodeRefs.get(name) || null;
    }

    /**
     * Get a component from a cached child node.
     */
    protected getNodeComponent<T extends Component>(
        nodeName: string,
        type: { new(...args: any[]): T } & typeof Component
    ): T | null {
        const node = this._nodeRefs.get(nodeName);
        return node ? node.getComponent(type as any) as T | null : null;
    }

    // ===== Manifest asset lookup =====

    /**
     * Get a loaded manifest asset (SpriteFrame) by asset id.
     *
     * Use this in Layer 3 business code to access dynamically loaded
     * resources that were declared in the asset manifest.
     *
     * @param assetId The asset id from asset-manifest.json (e.g. 'card_bg_attack')
     * @returns The loaded SpriteFrame, or null if not yet loaded / not found
     */
    protected getManifestAsset(assetId: string): SpriteFrame | null {
        return this._manifestAssets.get(assetId) || null;
    }

    /**
     * Get all loaded manifest assets as a Map (assetId → SpriteFrame).
     * Useful for batch operations in business code.
     */
    protected get manifestAssets(): ReadonlyMap<string, SpriteFrame> {
        return this._manifestAssets;
    }

    // ===== Resource loading helpers =====

    /**
     * Load a Prefab from resources (with ResourceManager caching + group).
     */
    protected async loadPrefab(path: string): Promise<Prefab> {
        return ResourceManager.load<Prefab>(path, Prefab, this.resourceGroup);
    }

    /**
     * Load an image and apply to a Sprite node.
     *
     * @param resPath Path relative to resources/ (without /spriteFrame suffix)
     * @param sprite  Target Sprite component
     * @param options Optional fit mode and bounds
     */
    protected loadImageToSprite(
        resPath: string,
        sprite: Sprite,
        options?: {
            fitMode?: 'none' | 'contain' | 'cover';
            boundsWidth?: number;
            boundsHeight?: number;
            callback?: () => void;
        }
    ): void {
        const sfPath = `${resPath}/spriteFrame`;
        ResourceManager.load<SpriteFrame>(sfPath, SpriteFrame, this.resourceGroup)
            .then(spriteFrame => {
                sprite.spriteFrame = spriteFrame;
                sprite.color = new Color(255, 255, 255, 255);
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;

                if (options?.fitMode && options.fitMode !== 'none'
                    && options.boundsWidth && options.boundsHeight) {
                    this._fitSpriteInBounds(
                        sprite,
                        options.boundsWidth,
                        options.boundsHeight,
                        options.fitMode
                    );
                }

                options?.callback?.();
            })
            .catch(err => {
                console.warn(`[${this.viewName}] Failed to load image: ${sfPath}`, err?.message);
                options?.callback?.();
            });
    }

    // ===== Widget helpers =====

    /**
     * Setup Widget component for full-screen stretch (all edges = 0).
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
     * Setup Widget component with specific edge margins.
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

    // ===== Internal helpers =====

    /**
     * Recursively register all child nodes into _nodeRefs cache.
     */
    private _registerChildNodes(node: Node): void {
        for (const child of node.children) {
            if (child.name) {
                this._nodeRefs.set(child.name, child);
            }
            this._registerChildNodes(child);
        }
    }

    /**
     * Auto-bind all properties decorated with @autoNode, @autoLabel, @autoSprite.
     *
     * For each decorated property:
     *   1. If already non-null (e.g. from @property editor serialization) → skip
     *   2. Otherwise look up the node from _nodeRefs by nodeName
     *   3. For 'node' type → assign the Node directly
     *   4. For 'label' type → getComponent(Label) from the node
     *   5. For 'sprite' type → getComponent(Sprite) from the node
     *
     * This makes Layer 2 code work identically whether the component is:
     *   - Mounted in the Prefab editor (Cocos @property deserialization fills fields)
     *   - Added dynamically via addComponent() (decorators fill fields from node tree)
     */
    private _autoBindDecoratedProperties(): void {
        const entries: IAutoBindEntry[] | undefined = (this as any)[AUTO_BIND_META_KEY];
        if (!entries || entries.length === 0) return;

        let boundCount = 0;
        let failCount = 0;

        for (const entry of entries) {
            // Skip if already bound (e.g. by Cocos @property serialization)
            if ((this as any)[entry.propertyKey] != null) continue;

            const node = this._nodeRefs.get(entry.nodeName);
            if (!node) {
                failCount++;
                console.warn(`[${this.viewName}] autoBind: node '${entry.nodeName}' not found for property '${entry.propertyKey}'`);
                continue;
            }

            switch (entry.type) {
                case 'node':
                    (this as any)[entry.propertyKey] = node;
                    boundCount++;
                    break;
                case 'label': {
                    const label = node.getComponent(Label);
                    if (label) {
                        (this as any)[entry.propertyKey] = label;
                        boundCount++;
                    } else {
                        failCount++;
                        console.warn(`[${this.viewName}] autoBind: Label not found on node '${entry.nodeName}' for property '${entry.propertyKey}'`);
                    }
                    break;
                }
                case 'sprite': {
                    const sprite = node.getComponent(Sprite);
                    if (sprite) {
                        (this as any)[entry.propertyKey] = sprite;
                        boundCount++;
                    } else {
                        failCount++;
                        console.warn(`[${this.viewName}] autoBind: Sprite not found on node '${entry.nodeName}' for property '${entry.propertyKey}'`);
                    }
                    break;
                }
            }
        }

        if (boundCount > 0 || failCount > 0) {
            console.log(`[${this.viewName}] autoBind: ${boundCount} bound, ${failCount} failed (total ${entries.length} entries)`);
        }
    }

    /**
     * Recursively stop all Tweens on a node and its children.
     */
    private _stopTweensRecursive(node: Node): void {
        Tween.stopAllByTarget(node);
        for (const child of node.children) {
            this._stopTweensRecursive(child);
        }
    }

    /**
     * Fit a Sprite into bounds with contain/cover mode.
     */
    private _fitSpriteInBounds(
        sprite: Sprite,
        boundsW: number,
        boundsH: number,
        mode: 'contain' | 'cover'
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

        const ut = sprite.node.getComponent(UITransform);
        if (ut) {
            ut.setContentSize(Math.round(origW * scale), Math.round(origH * scale));
        }
    }

    /**
     * Auto-bind dynamic assets from the asset manifest.
     *
     * For each `loadType: 'dynamic'` + `status: 'ready'` entry:
     *   1. Convert assetPath to resources-relative path
     *   2. Load the SpriteFrame via ResourceManager
     *   3. Cache it in _manifestAssets for getManifestAsset() lookup
     *   4. Auto-apply to boundToNodes if the node has a Sprite component
     *   5. Apply sliceMode / nineSlice if specified
     *
     * This is fire-and-forget (non-blocking). Assets load asynchronously
     * and are applied to nodes as they become available.
     */
    private _bindManifestAssets(): void {
        const manifest = this.assetManifest;
        if (!manifest || !manifest.assets || manifest.assets.length === 0) {
            return;
        }

        const dynamicEntries = manifest.assets.filter(
            a => a.loadType === 'dynamic' && a.status === 'ready' && a.type === 'sprite-frame'
        );

        if (dynamicEntries.length === 0) return;

        console.log(`[${this.viewName}] Binding ${dynamicEntries.length} manifest assets...`);

        for (const entry of dynamicEntries) {
            const resPath = this._assetPathToResourcePath(entry.assetPath);
            if (!resPath) {
                console.warn(`[${this.viewName}] Cannot resolve resource path for: ${entry.assetPath}`);
                continue;
            }

            const sfPath = `${resPath}/spriteFrame`;
            ResourceManager.load<SpriteFrame>(sfPath, SpriteFrame, this.resourceGroup)
                .then(spriteFrame => {
                    // Cache for getManifestAsset() lookup
                    this._manifestAssets.set(entry.id, spriteFrame);

                    // Auto-apply to bound nodes
                    for (const nodeName of entry.boundToNodes) {
                        const targetNode = this._nodeRefs.get(nodeName);
                        if (!targetNode) continue;

                        const sprite = targetNode.getComponent(Sprite);
                        if (!sprite) continue;

                        sprite.spriteFrame = spriteFrame;
                        sprite.color = new Color(255, 255, 255, 255);

                        // Apply slice mode
                        if (entry.sliceMode === 'sliced') {
                            sprite.type = Sprite.Type.SLICED;
                            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                        } else if (entry.sliceMode === 'tiled') {
                            sprite.type = Sprite.Type.TILED;
                            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                        } else {
                            sprite.type = Sprite.Type.SIMPLE;
                            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                        }
                    }

                    console.log(`[${this.viewName}] Manifest asset bound: ${entry.id} → [${entry.boundToNodes.join(', ')}]`);
                })
                .catch(err => {
                    console.warn(`[${this.viewName}] Failed to load manifest asset: ${entry.id} (${sfPath})`, err?.message);
                });
        }
    }

    /**
     * Convert an assetPath from asset-manifest.json to a resources-relative path.
     *
     * asset-manifest.json paths are relative to project root:
     *   'assets/resources/textures/pages/battle/card_bg_attack.png'
     *
     * ResourceManager.load() expects paths relative to resources/:
     *   'textures/pages/battle/card_bg_attack'
     *
     * Rules:
     *   - Must start with 'assets/resources/' (dynamic resources only)
     *   - Strip the 'assets/resources/' prefix
     *   - Strip the file extension (.png, .jpg, etc.)
     *   - Returns null for non-dynamic paths (e.g. 'assets/textures/...')
     */
    private _assetPathToResourcePath(assetPath: string): string | null {
        const prefix = 'assets/resources/';
        if (!assetPath.startsWith(prefix)) {
            return null; // Not a dynamic resource path
        }

        let resPath = assetPath.substring(prefix.length);

        // Strip file extension
        const dotIndex = resPath.lastIndexOf('.');
        if (dotIndex > 0) {
            resPath = resPath.substring(0, dotIndex);
        }

        return resPath;
    }
}
