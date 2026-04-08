/**
 * LayerManager — 统一 UI 层级管理器
 * 
 * 来源：cocos-dna skill templates/runtime/ (v1.0.0)
 * 由 sync-runtime.js 自动同步到项目 assets/scripts/core/
 * 
 * ⚠️ 本文件由 skill 统一维护，项目中请勿直接修改。
 * 如需定制，请在 skill 模板中修改后重新同步。
 * 
 * 核心职责：
 *  通过 Node 的子节点顺序（Cocos 天然 child order = 渲染顺序）实现层级隔离。
 *  后添加的子节点渲染在上层，无需手动管理 zIndex。
 * 
 * 层级定义（从底到顶）：
 *  ┌─────────────────────────┐  ← 最顶层
 *  │  guide   — 引导遮罩层   │  （新手引导、聚光灯高亮）
 *  ├─────────────────────────┤
 *  │  effect  — 全局特效层   │  （Toast、全屏转场、粒子特效）
 *  ├─────────────────────────┤
 *  │  popup   — 弹窗/对话层  │  （奖励弹窗、确认对话框、物品详情）
 *  ├─────────────────────────┤
 *  │  page    — 全屏页面层   │  （MainMenu、CharSelect、Battle、Map）
 *  └─────────────────────────┘  ← 最底层
 * 
 * 使用方式：
 *  // GameEntry.onLoad 中创建
 *  this._layers = new LayerManager(this.node);  // this.node 是 Canvas
 * 
 *  // 渲染器初始化时挂载到 page 层
 *  renderer.init(this._layers.page);
 * 
 *  // 弹窗挂载到 popup 层
 *  rewardPopup.init(this._layers.popup);
 * 
 *  // 全局 Toast 挂载到 effect 层
 *  toastNode.parent = this._layers.effect;
 * 
 * 当前阶段刻意不做的事：
 *  - zIndex 复杂化 — Cocos child order 天然足够
 *  - 层级开关/可见性控制 — 直接 node.active 即可
 *  - 弹窗栈管理 — 等 ModuleRenderer 做了再加
 */

import { Node, UITransform, Widget } from 'cc';

// ==================== LayerManager ====================

export class LayerManager {
    /** 全屏页面层（渲染器挂载点） */
    public readonly page: Node;
    /** 弹窗/对话框层 */
    public readonly popup: Node;
    /** 全局特效层（Toast / 粒子 / 转场） */
    public readonly effect: Node;
    /** 引导遮罩层（新手引导） */
    public readonly guide: Node;

    /**
     * 创建层级管理器
     * 
     * @param root 根节点（通常是 Canvas），所有层级节点将作为其子节点创建。
     *             层级节点按渲染顺序从底到顶添加：page → popup → effect → guide。
     */
    constructor(root: Node) {
        this.page   = this._createLayer(root, 'LayerPage');
        this.popup  = this._createLayer(root, 'LayerPopup');
        this.effect = this._createLayer(root, 'LayerEffect');
        this.guide  = this._createLayer(root, 'LayerGuide');
    }

    /**
     * 创建一个全屏铺满的层级节点
     * 
     * 每个层级节点都添加 Widget(LRTB=0) 确保全屏覆盖，
     * 这样挂载在该层下的子节点可以正确使用 Widget 对齐。
     */
    private _createLayer(parent: Node, name: string): Node {
        const node = new Node(name);
        parent.addChild(node);

        // UITransform — 继承父节点尺寸
        const ut = node.addComponent(UITransform);
        const parentUT = parent.getComponent(UITransform);
        if (parentUT) {
            ut.setContentSize(parentUT.contentSize);
            ut.setAnchorPoint(parentUT.anchorPoint);
        }

        // Widget — 四边=0 全屏铺满
        const widget = node.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.top = 0;
        widget.bottom = 0;
        widget.left = 0;
        widget.right = 0;
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;

        return node;
    }
}
