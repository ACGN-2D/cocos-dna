/**
 * prefab-builder.js — 离线 Prefab JSON 生成器
 *
 * 提供 PrefabBuilder 类及辅助函数，用于以编程方式生成 Cocos Creator
 * .prefab 文件的 JSON 内容（无需运行编辑器）。
 *
 * 与 mcp-client.js 互补：
 *   - mcp-client.js: 在线创建（需编辑器 MCP Server 运行）
 *   - prefab-builder.js: 离线生成 JSON（无需编辑器）
 *
 * 使用方式:
 *   const { PrefabBuilder, ref, vec3, vec2, quat, size, color } =
 *     require('<skill-path>/scripts/prefab-builder');
 *
 *   const b = new PrefabBuilder('MyPage');
 *   b.addPrefabRoot();
 *   const rootIdx = b.addNode('MyPage', null, [...childIdxs], [...compIdxs]);
 *   b.addUITransform(rootIdx, 1280, 720);
 *   // ... 构建节点树 ...
 *   const json = b.build();
 *   fs.writeFileSync('MyPage.prefab', JSON.stringify(json, null, 2));
 *
 * 独立运行做自测:
 *   node scripts/prefab-builder.js
 */

// ─── Helpers ───

function ref(id) { return { __id__: id }; }

function vec3(x, y, z) { return { __type__: 'cc.Vec3', x, y, z: z || 0 }; }
function vec2(x, y) { return { __type__: 'cc.Vec2', x, y }; }
function quat() { return { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 }; }
function size(w, h) { return { __type__: 'cc.Size', width: w, height: h }; }
function color(r, g, b, a) { return { __type__: 'cc.Color', r, g, b, a: a !== undefined ? a : 255 }; }

// ─── PrefabBuilder ───

class PrefabBuilder {
    constructor(name) {
        this.objects = [];
        this.name = name;
        this.fileIdCounter = 0;
    }

    _fid(prefix) { return `${prefix || 'fid'}_${++this.fileIdCounter}`; }

    _add(obj) {
        const idx = this.objects.length;
        this.objects.push(obj);
        return idx;
    }

    addPrefabRoot() {
        return this._add({
            __type__: 'cc.Prefab',
            _name: this.name,
            _objFlags: 0,
            __editorExtras__: {},
            _native: '',
            data: ref(1),
            optimizationPolicy: 0,
            persistent: false
        });
    }

    addNode(name, parentIdx, childrenIdxs, componentIdxs, pos, prefabFileId) {
        const idx = this._add({
            __type__: 'cc.Node',
            _name: name,
            _objFlags: 0,
            __editorExtras__: {},
            _parent: parentIdx !== null ? ref(parentIdx) : null,
            _children: childrenIdxs.map(ref),
            _active: true,
            _components: componentIdxs.map(ref),
            _prefab: null,
            _lpos: pos || vec3(0, 0, 0),
            _lrot: quat(),
            _lscale: vec3(1, 1, 1),
            _mobility: 0,
            _layer: 33554432,
            _euler: vec3(0, 0, 0),
            _id: ''
        });
        return idx;
    }

    addUITransform(nodeIdx, w, h, anchorX, anchorY) {
        return this._add({
            __type__: 'cc.UITransform',
            _name: '',
            _objFlags: 0,
            __editorExtras__: {},
            node: ref(nodeIdx),
            _enabled: true,
            __prefab: null,
            _contentSize: size(w, h),
            _anchorPoint: vec2(anchorX || 0.5, anchorY || 0.5),
            _id: ''
        });
    }

    addSprite(nodeIdx, r, g, b, a, sizeMode, spriteFrameUuid) {
        // spriteFrameUuid: 可选，格式如 "uuid@f9941"，传入后生成 __uuid__ 引用
        const sfRef = spriteFrameUuid ? {
            __uuid__: spriteFrameUuid,
            __expectedType__: 'cc.SpriteFrame',
        } : null;
        return this._add({
            __type__: 'cc.Sprite',
            _name: '',
            _objFlags: 0,
            __editorExtras__: {},
            node: ref(nodeIdx),
            _enabled: true,
            __prefab: null,
            _customMaterial: null,
            _srcBlendFactor: 2,
            _dstBlendFactor: 4,
            _color: color(r, g, b, a),
            _spriteFrame: sfRef,
            _type: 0,
            _fillType: 0,
            _sizeMode: sizeMode !== undefined ? sizeMode : 0,
            _fillCenter: vec2(0, 0),
            _fillStart: 0,
            _fillRange: 0,
            _isTrimmedMode: true,
            _useGrayscale: false,
            _atlas: null,
            _id: ''
        });
    }

    addLabel(nodeIdx, text, fontSize, hAlign, vAlign, col, opts) {
        opts = opts || {};
        return this._add({
            __type__: 'cc.Label',
            _name: '',
            _objFlags: 0,
            __editorExtras__: {},
            node: ref(nodeIdx),
            _enabled: true,
            __prefab: null,
            _customMaterial: null,
            _srcBlendFactor: 2,
            _dstBlendFactor: 4,
            _color: col || color(255, 255, 255),
            _string: text,
            _horizontalAlign: hAlign || 0,
            _verticalAlign: vAlign || 0,
            _actualFontSize: fontSize,
            _fontSize: fontSize,
            _fontFamily: 'Arial',
            _lineHeight: Math.round(fontSize * 1.2),
            _overflow: opts.overflow || 0,
            _enableWrapText: opts.wrapText || false,
            _font: null,
            _isSystemFontUsed: true,
            _spacingX: 0,
            _isItalic: false,
            _isBold: opts.bold || false,
            _isUnderline: false,
            _underlineHeight: 2,
            _cacheMode: opts.cacheMode || 0,
            _enableOutline: false,
            _outlineColor: color(0, 0, 0),
            _outlineWidth: 2,
            _enableShadow: opts.enableShadow || false,
            _shadowColor: opts.shadowColor || color(0, 0, 0),
            _shadowOffset: vec2(opts.shadowOffsetX || 0, opts.shadowOffsetY || 0),
            _shadowBlur: opts.shadowBlur || 2,
            _id: ''
        });
    }

    addWidget(nodeIdx, flags, top, bottom, left, right) {
        return this._add({
            __type__: 'cc.Widget',
            _name: '',
            _objFlags: 0,
            __editorExtras__: {},
            node: ref(nodeIdx),
            _enabled: true,
            __prefab: null,
            _top: top || 0,
            _bottom: bottom || 0,
            _left: left || 0,
            _right: right || 0,
            _horizontalCenter: 0,
            _verticalCenter: 0,
            _isAbsLeft: true,
            _isAbsRight: true,
            _isAbsTop: true,
            _isAbsBottom: true,
            _isAbsHorizontalCenter: true,
            _isAbsVerticalCenter: true,
            _originalWidth: 0,
            _originalHeight: 0,
            _alignFlags: flags,
            _target: null,
            _id: ''
        });
    }

    addLayout(nodeIdx, layoutType, spacingX, spacingY, resizeMode) {
        return this._add({
            __type__: 'cc.Layout',
            _name: '',
            _objFlags: 0,
            __editorExtras__: {},
            node: ref(nodeIdx),
            _enabled: true,
            __prefab: null,
            _resizeMode: resizeMode || 0,
            _layoutType: layoutType,
            _cellSize: size(40, 40),
            _startAxis: 0,
            _paddingLeft: 0,
            _paddingRight: 0,
            _paddingTop: 0,
            _paddingBottom: 0,
            _spacingX: spacingX || 0,
            _spacingY: spacingY || 0,
            _verticalDirection: 1,
            _horizontalDirection: 0,
            _constraint: 0,
            _constraintNum: 2,
            _affectedByScale: false,
            _id: ''
        });
    }

    addButton(nodeIdx) {
        return this._add({
            __type__: 'cc.Button',
            _name: '',
            _objFlags: 0,
            __editorExtras__: {},
            node: ref(nodeIdx),
            _enabled: true,
            __prefab: null,
            _interactable: true,
            _transition: 2,
            _normalColor: color(255, 255, 255),
            _hoverColor: color(211, 211, 211),
            _pressedColor: color(200, 200, 200),
            _disabledColor: color(124, 124, 124),
            _duration: 0.1,
            _zoomScale: 1.05,
            _target: null,
            _id: ''
        });
    }

    build() { return this.objects; }
}

// ─── 导出 ───

module.exports = { PrefabBuilder, ref, vec3, vec2, quat, size, color };

// ─── 自测 ───

if (require.main === module) {
    console.log('[prefab-builder] Self-test...');
    const b = new PrefabBuilder('TestPage');
    b.addPrefabRoot();
    const root = b.addNode('TestPage', null, [], []);
    b.addUITransform(root, 1280, 720);
    const result = b.build();
    console.log(`[prefab-builder] OK — generated ${result.length} objects`);
    console.log(`[prefab-builder] Root type: ${result[0].__type__}, Node name: ${result[1]._name}`);
}
