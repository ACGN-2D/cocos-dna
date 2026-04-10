/**
 * design2prefab.js — design.md → Prefab 通用生成器
 *
 * 从 cocos-dna/components/<page>/design.md 第4章自动解析节点树，
 * 生成 NodeSpec[] 中间表示，再通过 MCP 或 Offline 后端创建 Prefab。
 *
 * 架构:
 *   design.md (Chapter 4) → [parseNodeTree()] → NodeSpec[]
 *     ├→ [MCP 后端]     mcp-client.js → 编辑器创建 → 导出 .prefab
 *     └→ [Offline 后端]  prefab-builder.js → 直接写 .prefab JSON
 *
 * CLI:
 *   # dry-run (仅解析 + 打印)
 *   node design2prefab.js --project <dir> <page-id> --dry-run
 *
 *   # MCP 模式 (需编辑器运行)
 *   node design2prefab.js --project <dir> <page-id>
 *
 *   # Offline 模式 (不需编辑器)
 *   node design2prefab.js --project <dir> <page-id> --offline
 *
 * 编程式使用:
 *   const { parseNodeTree, buildViaMCP, buildFromDesign } = require('./design2prefab');
 */

const fs = require('fs');
const path = require('path');

// ====================================================================
//  1. NodeSpec 中间表示
// ====================================================================

/**
 * @typedef {Object} NodeSpec
 * @property {string}   name       — 节点名 (PascalCase)
 * @property {string[]} types      — 组件类型 ['Sprite','Button'] 等
 * @property {{ w:number, h:number }} [size]   — UITransform 尺寸
 * @property {{ left?:number, right?:number, top?:number, bottom?:number }} [widget]
 * @property {{ x:number, y:number }} [position]
 * @property {{ r:number, g:number, b:number, a:number }} [color]
 * @property {number}   [opacity]
 * @property {{ cn?:string, en?:string }|string} [text]
 * @property {number}   [fontSize]
 * @property {number}   [fontWeight]
 * @property {string}   [hAlign]
 * @property {string}   [vAlign]
 * @property {boolean}  [bold]
 * @property {string}   [overflow]
 * @property {{ color:string, width:number }} [outline]
 * @property {{ color:string, blur:number }} [shadow]
 * @property {string}   [cacheMode]
 * @property {string}   [spriteFrame]
 * @property {string}   [sizeMode]
 * @property {string}   [comp]         — 挂载的自定义脚本组件 (仅 root)
 * @property {boolean}  [active]       — 初始 active 状态
 * @property {NodeSpec[]} children
 */

// ====================================================================
//  2. 解析器 — parseNodeTree(designMdContent)
// ====================================================================

/**
 * 从 design.md 内容中提取第4章节点树并返回 NodeSpec 树。
 * @param {string} content — design.md 完整文本
 * @returns {NodeSpec}     — 根节点 (含递归 children)
 */
function parseNodeTree(content) {
    // ── Step 1: 提取第4章代码块 ──

    const chapter4Lines = _extractChapter4(content);
    if (!chapter4Lines || chapter4Lines.length === 0) {
        throw new Error('[design2prefab] 未找到第4章节点树代码块');
    }

    // 可能有多个代码块 (如 BattlePage + CardSlot + EnemyPanel)
    // 取第一个代码块作为主 Prefab 节点树
    const codeBlocks = _extractCodeBlocks(chapter4Lines);
    if (codeBlocks.length === 0) {
        throw new Error('[design2prefab] 第4章未找到节点树代码块');
    }

    const treeLines = codeBlocks[0];

    // ── Step 2: 解析树结构 ──

    return _parseTreeLines(treeLines);
}

/**
 * 提取所有第4章的代码块（页面级、组件级等）
 */
function parseAllNodeTrees(content) {
    const chapter4Lines = _extractChapter4(content);
    if (!chapter4Lines || chapter4Lines.length === 0) return [];

    const codeBlocks = _extractCodeBlocks(chapter4Lines);
    return codeBlocks.map(block => _parseTreeLines(block));
}

// ── 内部: 提取指定章节的行 ──

/**
 * 章节匹配配置 — 集中管理所有支持的标题模式
 * 每次 design.md 的章节命名规范变化，只需在此处添加模式
 */
const CHAPTER_MATCHERS = {
    4: {
        description: '节点树 / Prefab 结构',
        // 匹配 design.md 第4章的各种标题写法
        patterns: [
            /^##\s+第4章/,           // ## 第4章：Cocos 节点树
            /^##\s+4[\.\s：:]/,      // ## 4. 节点树 / ## 4：节点树
            /^##\s+Prefab\s/i,       // ## Prefab 结构
            /^##\s+Cocos\s.*节点树/, // ## Cocos 节点树
            /^##\s+.*节点树.*Prefab/i,
        ],
    },
    // 未来可扩展其他章节:
    // 6: { description: '资源切图清单', patterns: [...] },
};

/**
 * 从 design.md 中提取指定章节的内容行。
 * 
 * @param {string} content — design.md 完整文本
 * @param {number} chapter — 章节编号 (默认 4)
 * @returns {string[]} — 章节内容行（不含标题行本身）
 */
function _extractChapter(content, chapter) {
    chapter = chapter || 4;
    const matcher = CHAPTER_MATCHERS[chapter];
    if (!matcher) {
        throw new Error(`[design2prefab] 未配置第${chapter}章的匹配规则，请在 CHAPTER_MATCHERS 中添加`);
    }

    const lines = content.split(/\r?\n/);
    let inChapter = false;
    let result = [];

    for (const line of lines) {
        // 检查是否匹配目标章节标题
        if (!inChapter) {
            const isMatch = matcher.patterns.some(p => p.test(line));
            if (isMatch) {
                inChapter = true;
                continue; // 跳过标题行本身
            }
            continue;
        }

        // 已在目标章节内，遇到下一个 ## 标题则结束（### 子标题不结束）
        if (/^##\s+[^#]/.test(line) && !/^###/.test(line)) {
            break;
        }

        result.push(line);
    }

    return result;
}

// 向后兼容 — 旧调用点使用的函数名
function _extractChapter4(content) {
    return _extractChapter(content, 4);
}

// ── 内部: 从第4章行中提取代码块 ──

function _extractCodeBlocks(lines) {
    const blocks = [];
    let inBlock = false;
    let currentBlock = [];

    for (const line of lines) {
        if (/^```/.test(line.trim())) {
            if (inBlock) {
                // 结束代码块
                if (currentBlock.length > 0) {
                    blocks.push([...currentBlock]);
                }
                currentBlock = [];
                inBlock = false;
            } else {
                // 开始代码块
                inBlock = true;
            }
            continue;
        }
        if (inBlock) {
            currentBlock.push(line);
        }
    }

    return blocks;
}

// ── 内部: 解析树行 ──

function _parseTreeLines(treeLines) {
    /**
     * 节点声明行可能的格式:
     *   NodeName (root) [Type] [UITransform: WxH] [Widget: ...]
     *   ├── NodeName [Type1] [Type2] [UITransform: WxH]
     *   │   描述: ...
     *   │   Position: (x, y)
     *   │   Color: #RRGGBB
     *   etc.
     */
    const nodeStack = []; // [{spec, depth}]
    let root = null;
    let currentNode = null;
    let currentDepth = -1;

    for (const rawLine of treeLines) {
        const line = rawLine;

        // 空行跳过
        if (line.trim() === '') continue;

        // 判断是否为节点声明行
        const nodeMatch = _matchNodeLine(line);
        if (nodeMatch) {
            const { name, depth, spec } = nodeMatch;

            // 找父节点
            while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].depth >= depth) {
                nodeStack.pop();
            }

            if (nodeStack.length > 0) {
                const parent = nodeStack[nodeStack.length - 1].spec;
                parent.children.push(spec);
            }

            nodeStack.push({ spec, depth });

            if (!root) root = spec;
            currentNode = spec;
            currentDepth = depth;
            continue;
        }

        // 判断是否为属性行 (属于 currentNode)
        if (currentNode) {
            _parsePropertyLine(line, currentNode);
        }
    }

    if (!root) {
        throw new Error('[design2prefab] 未能解析出节点树根节点');
    }

    return root;
}

// ── 内部: 匹配节点声明行 ──

function _matchNodeLine(line) {
    // 计算树深度: 通过 ├── / └── / │ 前缀
    // 也匹配无前缀的根节点行
    let depth = 0;
    let content = line;

    // 清理树形前缀
    const treeMatch = content.match(/^([│├└─\s]*(?:├──|└──))\s*(.*)/);
    if (treeMatch) {
        const prefix = treeMatch[1];
        content = treeMatch[2];
        // 计算深度: 每个 │ 或缩进块代表一级
        // 粗略: 前缀长度 / 4 (每级大约 4 字符)
        depth = Math.round(prefix.replace(/[─├└]/g, '').length / 4) + 1;
    } else {
        // 可能是根节点 (无树前缀)
        // 必须匹配 "Name (root)" 或 "Name [" 开头
        if (!/^[A-Z]\w*\s*(\(|(\[))/.test(content.trim())) {
            return null;
        }
        content = content.trim();
        depth = 0;
    }

    // 提取节点名: 第一个单词 (可能后跟 (root) 或 [...)
    const nameMatch = content.match(/^(\w+)/);
    if (!nameMatch) return null;

    const name = nameMatch[1];

    // 跳过标注了 "运行时创建" / "runtime" 的节点行 — 这些不属于 Prefab 静态结构
    if (/运行时创建|运行时动态|runtime\s+creat/i.test(content)) {
        return null;
    }

    // 跳过纯属性行 (如 "描述:", "Position:", etc.)
    // 注意: 不能用 /i 标志, 否则会错误匹配节点名 (如 BG, Sprite 等大写名)
    // 属性关键词后面必须跟 ":" 或 "=" 才算属性行
    if (/^(描述|Position|Color|Opacity|String|FontSize|FontWeight|Font|Shadow|Outline|Horizontal|Vertical|Margin|SpriteFrame|SizeMode|Type|Layout|动画|组件|注意|说明|初始|enabled|i18n|胜利|锁点|圆角|子节点|label|Overflow|HorizontalAlign|VerticalAlign|LetterSpacing|CacheMode|EnableBold|Alignment|Margin-Top|Sprite|边框实现):/i.test(content.trim())) {
        return null;
    }
    // 也跳过 bg: 形式的内联属性行 (小写 bg 后跟冒号)
    if (/^bg:/i.test(content.trim()) && !/^BG\s/i.test(content.trim())) {
        return null;
    }

    const spec = {
        name,
        types: [],
        children: [],
    };

    // 提取方括号标记: [Sprite], [Label], [Button], [Node], [UITransform: WxH], [Widget: ...]
    const bracketRegex = /\[([^\]]+)\]/g;
    let bm;
    while ((bm = bracketRegex.exec(content)) !== null) {
        const tag = bm[1].trim();

        // UITransform
        const utMatch = tag.match(/^UITransform:\s*(\d+)[x×](\d+)/i);
        if (utMatch) {
            spec.size = { w: parseInt(utMatch[1]), h: parseInt(utMatch[2]) };
            continue;
        }
        // 仅数字 WxH (简写 e.g. [1280×720])
        const sizeOnly = tag.match(/^(\d+)[x×](\d+)$/i);
        if (sizeOnly) {
            spec.size = { w: parseInt(sizeOnly[1]), h: parseInt(sizeOnly[2]) };
            continue;
        }

        // Widget
        const widgetMatch = tag.match(/^Widget:\s*(.*)/i);
        if (widgetMatch) {
            spec.widget = _parseWidgetSpec(widgetMatch[1]);
            continue;
        }

        // Button
        if (/^Button$/i.test(tag)) {
            spec.types.push('Button');
            continue;
        }

        // Type names: Sprite, Label, Node, etc.
        if (/^(Sprite|Label|Node|Layout|ScrollView|Mask|Graphics)$/i.test(tag)) {
            spec.types.push(tag);
            continue;
        }

        // 复合标记: "Node+Sprite", "Sprite+Button", etc.
        if (tag.includes('+')) {
            tag.split('+').forEach(t => {
                t = t.trim();
                if (/^(Sprite|Label|Node|Button|Layout)$/i.test(t)) {
                    spec.types.push(t);
                }
            });
            continue;
        }
    }

    // 从内容其他部分提取
    // (root) 标记
    if (/\(root\)/i.test(content)) {
        spec._isRoot = true;
    }

    // 组件: 如果行中有组件名提取 (e.g. [BattlePageComp])
    const compMatch = content.match(/\[(\w+Comp)\]/);
    if (compMatch) {
        spec.comp = compMatch[1];
    }

    // 内联 pos(x,y) 格式
    const posMatch = content.match(/pos\((-?[\d.]+)\s*,\s*(-?[\d.]+)\)/);
    if (posMatch) {
        spec.position = { x: parseFloat(posMatch[1]), y: parseFloat(posMatch[2]) };
    }

    // 内联 bg:rgba(...) 或 bg:#...
    const bgRgbaMatch = content.match(/bg:\s*rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\)/);
    if (bgRgbaMatch) {
        const a = parseFloat(bgRgbaMatch[4]);
        spec.color = {
            r: parseInt(bgRgbaMatch[1]),
            g: parseInt(bgRgbaMatch[2]),
            b: parseInt(bgRgbaMatch[3]),
            a: a <= 1 ? Math.round(a * 255) : Math.round(a),
        };
        if (!spec.types.includes('Sprite')) spec.types.push('Sprite');
    }
    const bgHexMatch = content.match(/bg:(#[0-9A-Fa-f]{6})\b/);
    if (bgHexMatch && !spec.color) {
        spec.color = _hexToColor(bgHexMatch[1]);
        if (!spec.types.includes('Sprite')) spec.types.push('Sprite');
    }

    // 内联 active=false
    if (/active\s*=\s*false/i.test(content)) {
        spec.active = false;
    }

    // 内联 radius:N (informational)
    const radiusMatch = content.match(/radius:(\d+)/);
    if (radiusMatch) {
        spec._borderRadius = parseInt(radiusMatch[1]);
    }

    // 内联 text:#... 或 Label 文字
    const inlineLabelMatch = content.match(/(\d+)px\s+(?:w(\d+)\s+)?(#[0-9A-Fa-f]{6})/);
    if (inlineLabelMatch) {
        spec.fontSize = parseInt(inlineLabelMatch[1]);
        if (inlineLabelMatch[2]) spec.fontWeight = parseInt(inlineLabelMatch[2]);
        spec.color = _hexToColor(inlineLabelMatch[3]);
    }

    // 内联 bold
    if (/\bbold\b/i.test(content) && !spec.bold) {
        spec.bold = true;
    }

    // 内联 "string" quotes for text
    const inlineTextMatch = content.match(/"([^"]+)"/);
    if (inlineTextMatch && spec.types.includes('Label')) {
        spec.text = inlineTextMatch[1];
    }

    // 内联 anchor(x,y)
    const anchorMatch = content.match(/anchor\(([\d.]+)\s*,\s*([\d.]+)\)/);
    if (anchorMatch) {
        spec._anchor = { x: parseFloat(anchorMatch[1]), y: parseFloat(anchorMatch[2]) };
    }

    return { name, depth, spec };
}

// ── 内部: 解析属性行 ──

function _parsePropertyLine(line, spec) {
    // 清理树前缀 (│   )
    const clean = line.replace(/^[│\s]+/, '').trim();
    if (!clean) return;

    // Position: (x, y)
    const posMatch = clean.match(/^Position:\s*\((-?[\d.]+)\s*,\s*(-?[\d.]+)\)/i);
    if (posMatch) {
        spec.position = { x: parseFloat(posMatch[1]), y: parseFloat(posMatch[2]) };
        return;
    }

    // Color: #RRGGBB or rgba(r,g,b,a)
    const colorHexMatch = clean.match(/^Color:\s*(#[0-9A-Fa-f]{6})/i);
    if (colorHexMatch) {
        spec.color = _hexToColor(colorHexMatch[1]);
        return;
    }
    const colorRgbaMatch = clean.match(/^Color:\s*rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\)/i);
    if (colorRgbaMatch) {
        const a = parseFloat(colorRgbaMatch[4]);
        spec.color = {
            r: parseInt(colorRgbaMatch[1]),
            g: parseInt(colorRgbaMatch[2]),
            b: parseInt(colorRgbaMatch[3]),
            a: a <= 1 ? Math.round(a * 255) : Math.round(a),
        };
        return;
    }

    // Opacity: N
    const opMatch = clean.match(/^Opacity:\s*(\d+)/i);
    if (opMatch) {
        spec.opacity = parseInt(opMatch[1]);
        return;
    }

    // String: CN="中文" / EN="English" or String: "text"
    const strDualMatch = clean.match(/^String:\s*CN="([^"]*)"\s*\/?\s*EN="([^"]*)"/i);
    if (strDualMatch) {
        spec.text = { cn: strDualMatch[1], en: strDualMatch[2] };
        return;
    }
    const strSingleMatch = clean.match(/^String:\s*"([^"]*)"/i);
    if (strSingleMatch) {
        spec.text = strSingleMatch[1];
        return;
    }
    const strPlain = clean.match(/^String:\s*(.+)/i);
    if (strPlain && !spec.text) {
        const val = strPlain[1].trim();
        if (val && !val.startsWith('(')) {
            spec.text = val;
        }
        return;
    }

    // FontSize: N
    const fsMatch = clean.match(/^FontSize:\s*(\d+)/i);
    if (fsMatch) {
        spec.fontSize = parseInt(fsMatch[1]);
        return;
    }

    // FontWeight: N
    const fwMatch = clean.match(/^FontWeight:\s*(\d+)/i);
    if (fwMatch) {
        spec.fontWeight = parseInt(fwMatch[1]);
        if (spec.fontWeight >= 600) spec.bold = true;
        return;
    }

    // HorizontalAlign: CENTER / LEFT / RIGHT
    const haMatch = clean.match(/^HorizontalAlign:\s*(\w+)/i);
    if (haMatch) {
        spec.hAlign = haMatch[1].toUpperCase();
        return;
    }

    // VerticalAlign
    const vaMatch = clean.match(/^VerticalAlign:\s*(\w+)/i);
    if (vaMatch) {
        spec.vAlign = vaMatch[1].toUpperCase();
        return;
    }

    // SpriteFrame: filename.png
    const sfMatch = clean.match(/^SpriteFrame:\s*(\S+\.png)/i);
    if (sfMatch) {
        spec.spriteFrame = sfMatch[1];
        return;
    }

    // SizeMode: CUSTOM / TRIMMED / RAW
    const smMatch = clean.match(/^SizeMode:\s*(\w+)/i);
    if (smMatch) {
        spec.sizeMode = smMatch[1].toUpperCase();
        return;
    }

    // Overflow: CLAMP / SHRINK / RESIZE_HEIGHT / NONE
    const ofMatch = clean.match(/^Overflow:\s*(\w+)/i);
    if (ofMatch) {
        spec.overflow = ofMatch[1].toUpperCase();
        return;
    }

    // EnableBold: true
    if (/^EnableBold:\s*true/i.test(clean)) {
        spec.bold = true;
        return;
    }

    // CacheMode: BITMAP / CHAR / NONE
    const cmMatch = clean.match(/^CacheMode:\s*(\w+)/i);
    if (cmMatch) {
        spec.cacheMode = cmMatch[1].toUpperCase();
        return;
    }

    // Outline: { color: #xxx, width: N }
    const outlineMatch = clean.match(/^Outline:\s*\{\s*color:\s*(#[0-9A-Fa-f]{6})\s*,\s*width:\s*(\d+)/i);
    if (outlineMatch) {
        spec.outline = { color: outlineMatch[1], width: parseInt(outlineMatch[2]) };
        return;
    }

    // Shadow: { color: rgba(...), blur: N, ... }
    const shadowMatch = clean.match(/^Shadow:\s*\{\s*color:\s*rgba\(([^)]+)\)\s*,\s*blur:\s*(\d+)/i);
    if (shadowMatch) {
        spec.shadow = { color: `rgba(${shadowMatch[1]})`, blur: parseInt(shadowMatch[2]) };
        return;
    }

    // Layout: HORIZONTAL/VERTICAL ...
    const layoutMatch = clean.match(/^Layout:\s*(HORIZONTAL|VERTICAL)/i);
    if (layoutMatch) {
        spec._layout = layoutMatch[1].toUpperCase();
        const spacingMatch = clean.match(/spacing[X]?\s*=?\s*(\d+)/i);
        if (spacingMatch) spec._layoutSpacing = parseInt(spacingMatch[1]);
        return;
    }

    // 组件: CompName
    const compMatch = clean.match(/^组件:\s*(\w+)/);
    if (compMatch) {
        spec.comp = compMatch[1];
        return;
    }
}

// ── 内部: Widget 规格解析 ──

function _parseWidgetSpec(str) {
    const w = {};
    if (/LRTB\s*=\s*0/i.test(str)) {
        return { left: 0, right: 0, top: 0, bottom: 0 };
    }
    // 使用 word boundary 或 comma/space 前缀来避免 "Left=40" 的 "L" 被 Top 的 "T" 错误匹配
    // 优先匹配完整单词 (Left/Right/Top/Bottom)，再 fallback 到单字母缩写
    const leftMatch = str.match(/(?:^|[\s,])Left\s*=?\s*(\d+)/i) || str.match(/(?:^|[\s,])L\s*=\s*(\d+)/i);
    if (leftMatch) w.left = parseInt(leftMatch[1]);
    const rightMatch = str.match(/(?:^|[\s,])Right\s*=?\s*(\d+)/i) || str.match(/(?:^|[\s,])R\s*=\s*(\d+)/i);
    if (rightMatch) w.right = parseInt(rightMatch[1]);
    const topMatch = str.match(/(?:^|[\s,])Top\s*=?\s*(\d+)/i) || str.match(/(?:^|[\s,])T\s*=\s*(\d+)/i);
    if (topMatch) w.top = parseInt(topMatch[1]);
    const bottomMatch = str.match(/(?:^|[\s,])Bottom\s*=?\s*(\d+)/i) || str.match(/(?:^|[\s,])B\s*=\s*(\d+)/i);
    if (bottomMatch) w.bottom = parseInt(bottomMatch[1]);
    return Object.keys(w).length > 0 ? w : null;
}

// ── 内部: 颜色工具 ──

function _hexToColor(hex) {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
        a: 255,
    };
}

// ====================================================================
//  3. MCP 后端 — buildViaMCP(nodeTree, opts)
// ====================================================================

/**
 * 遍历 NodeSpec 树，通过 mcp-client 在编辑器中创建节点。
 * @param {NodeSpec} nodeTree  — 解析后的节点树
 * @param {Object}   opts
 * @param {string}   opts.parentPath   — MCP 父路径 (如 'Canvas')
 * @param {Object}   opts.mcp          — mcp-client 模块实例
 * @param {Object}   [opts.assetManifest] — asset-manifest.json 的 assets 数组
 */
async function buildViaMCP(nodeTree, opts) {
    const { parentPath, mcp, assetManifest } = opts;

    let nodeCount = 0;

    async function createNodeRecursive(spec, parentMcpPath) {
        const nodeType = _mapToMCPNodeType(spec);
        const nodePath = `${parentMcpPath}/${spec.name}`;

        nodeCount++;
        console.log(`  [${nodeCount}] ${spec.name} (${spec.types.join('+') || 'Empty'}) → ${nodePath}`);

        // 创建节点
        await mcp.createNode(
            parentMcpPath,
            spec.name,
            nodeType,
            '2d',
            spec.position ? { x: spec.position.x, y: spec.position.y, z: 0 } : undefined
        );

        // UITransform
        if (spec.size) {
            const ax = spec._anchor ? spec._anchor.x : 0.5;
            const ay = spec._anchor ? spec._anchor.y : 0.5;
            await mcp.setUITransform(nodePath, spec.size.w, spec.size.h, ax, ay);
        }

        // Widget
        if (spec.widget) {
            await mcp.addComponent(nodePath, 'cc.Widget');
            await mcp.sleep(200);
            await mcp.setProperty(`${nodePath}/cc.Widget`, _mapWidgetProps(spec.widget));
        }

        // Sprite color (合并 opacity 到 color.a)
        if (spec.types.includes('Sprite') && spec.color) {
            const c = { ...spec.color };
            if (spec.opacity !== undefined) {
                c.a = spec.opacity;
            }
            await mcp.setSpriteColor(nodePath, c);
        }

        // Label 全套
        if (spec.types.includes('Label')) {
            const text = typeof spec.text === 'object' ? (spec.text?.cn || spec.text?.en || '') : (spec.text || '');
            // 合并 opacity 到 label color
            let labelColor = spec.color ? { ...spec.color } : undefined;
            if (labelColor && spec.opacity !== undefined) {
                labelColor.a = spec.opacity;
            }
            const labelOpts = {};
            if (spec.bold) labelOpts.bold = true;
            if (spec.hAlign) labelOpts.hAlign = _mapAlign(spec.hAlign);
            if (spec.vAlign) labelOpts.vAlign = _mapAlign(spec.vAlign);
            if (spec.overflow) labelOpts.overflow = _mapOverflow(spec.overflow);
            if (spec.cacheMode) labelOpts.cacheMode = _mapCacheMode(spec.cacheMode);
            if (spec.fontSize) labelOpts.lineHeight = Math.round(spec.fontSize * 1.3);
            if (spec.outline) {
                labelOpts.outline = {
                    color: _hexToColor(spec.outline.color),
                    width: spec.outline.width,
                };
            }
            if (spec.shadow) {
                labelOpts.shadow = {
                    color: _parseShadowColor(spec.shadow.color),
                    blur: spec.shadow.blur,
                    offsetX: 0,
                    offsetY: 0,
                };
            }
            await mcp.setLabelFull(nodePath, text, spec.fontSize, labelColor, labelOpts);
        }

        // Button
        if (spec.types.includes('Button')) {
            await mcp.addComponent(nodePath, 'cc.Button');
        }

        // active=false
        if (spec.active === false) {
            await mcp.updateNode(nodePath, { active: false });
        }

        // SpriteFrame UUID 绑定 (从 asset-manifest 查找)
        if (spec.spriteFrame && assetManifest) {
            const entry = assetManifest.find(a =>
                a.filename === spec.spriteFrame && a.status === 'ready' && a.spriteFrameUuid
            );
            if (entry) {
                await mcp.setSpriteFrame(nodePath, entry.spriteFrameUuid);
                console.log(`    → SpriteFrame bound: ${spec.spriteFrame}`);
            }
        }

        // 递归子节点
        for (const child of spec.children || []) {
            await createNodeRecursive(child, nodePath);
        }

        // 挂载自定义组件 (仅 root)
        if (spec.comp) {
            await mcp.addComponent(nodePath, spec.comp);
            await mcp.sleep(300);
        }
    }

    await createNodeRecursive(nodeTree, parentPath);
    console.log(`  [Done] ${nodeCount} nodes created`);
}

// ====================================================================
//  4. Offline 后端 — buildOffline(nodeTree)
// ====================================================================

/**
 * 遍历 NodeSpec 树，使用 PrefabBuilder 生成 .prefab JSON。
 * @param {NodeSpec} nodeTree  — 解析后的节点树
 * @returns {Array}            — Prefab JSON 对象数组
 */
function buildOffline(nodeTree) {
    let PrefabBuilder, ref, vec3, color;
    try {
        const pb = require('./prefab-builder');
        PrefabBuilder = pb.PrefabBuilder;
        ref = pb.ref;
        vec3 = pb.vec3;
        color = pb.color;
    } catch (e) {
        throw new Error('[design2prefab] prefab-builder.js not found. Offline mode requires it.');
    }

    const b = new PrefabBuilder(nodeTree.name);
    b.addPrefabRoot(); // index 0

    // 两遍扫描: 先分配 index，再填 children/component 引用
    // Pass 1: 分配 index
    const nodeIndexMap = new Map(); // spec → { nodeIdx, compIdxs }
    let nextIdx = 1; // 0 is PrefabRoot

    function allocateIndices(spec) {
        const nodeIdx = nextIdx++;
        const compIdxs = [];

        // UITransform (always)
        compIdxs.push(nextIdx++);

        // Sprite
        if (spec.types.includes('Sprite')) compIdxs.push(nextIdx++);

        // Label
        if (spec.types.includes('Label')) compIdxs.push(nextIdx++);

        // Widget
        if (spec.widget) compIdxs.push(nextIdx++);

        // Layout (HORIZONTAL / VERTICAL — 从 design.md 的 Layout: 属性解析)
        if (spec._layout) compIdxs.push(nextIdx++);

        // Button
        if (spec.types.includes('Button')) compIdxs.push(nextIdx++);

        nodeIndexMap.set(spec, { nodeIdx, compIdxs });

        for (const child of spec.children || []) {
            allocateIndices(child);
        }
    }

    allocateIndices(nodeTree);

    // Pass 2: 填充对象
    function buildNode(spec, parentSpec) {
        const info = nodeIndexMap.get(spec);
        const parentInfo = parentSpec ? nodeIndexMap.get(parentSpec) : null;

        const childIdxs = (spec.children || []).map(c => nodeIndexMap.get(c).nodeIdx);

        const pos = spec.position ? vec3(spec.position.x, spec.position.y, 0) : vec3(0, 0, 0);

        b.addNode(
            spec.name,
            parentInfo ? parentInfo.nodeIdx : null,
            childIdxs,
            info.compIdxs,
            pos
        );

        // UITransform
        const w = spec.size ? spec.size.w : 100;
        const h = spec.size ? spec.size.h : 100;
        const ax = spec._anchor ? spec._anchor.x : 0.5;
        const ay = spec._anchor ? spec._anchor.y : 0.5;
        b.addUITransform(info.nodeIdx, w, h, ax, ay);

        // Sprite
        if (spec.types.includes('Sprite')) {
            const c = spec.color || { r: 255, g: 255, b: 255, a: 255 };
            const a = spec.opacity !== undefined ? spec.opacity : c.a;
            b.addSprite(info.nodeIdx, c.r, c.g, c.b, a);
        }

        // Label
        if (spec.types.includes('Label')) {
            const text = typeof spec.text === 'object' ? (spec.text?.cn || '') : (spec.text || '');
            const hAlign = _mapAlign(spec.hAlign || 'CENTER');
            const vAlign = _mapAlign(spec.vAlign || 'CENTER');
            let labelC = spec.color ? { ...spec.color } : undefined;
            if (labelC && spec.opacity !== undefined) labelC.a = spec.opacity;
            const c = labelC ? color(labelC.r, labelC.g, labelC.b, labelC.a) : undefined;
            b.addLabel(info.nodeIdx, text, spec.fontSize || 16, hAlign, vAlign, c, {
                bold: spec.bold,
                overflow: _mapOverflow(spec.overflow),
            });
        }

        // Widget
        if (spec.widget) {
            const flags = _computeWidgetFlags(spec.widget);
            b.addWidget(
                info.nodeIdx,
                flags,
                spec.widget.top,
                spec.widget.bottom,
                spec.widget.left,
                spec.widget.right
            );
        }

        // Layout (HORIZONTAL=1, VERTICAL=2)
        if (spec._layout) {
            const layoutType = spec._layout === 'VERTICAL' ? 2 : 1;
            const spacingX = spec._layoutSpacing || 0;
            const spacingY = spec._layoutSpacingY || spec._layoutSpacing || 0;
            // resizeMode=0 (NONE) — 容器尺寸固定，不随子节点变化
            b.addLayout(info.nodeIdx, layoutType, spacingX, spacingY, 0);
        }

        // Button
        if (spec.types.includes('Button')) {
            b.addButton(info.nodeIdx);
        }

        // 递归子节点
        for (const child of spec.children || []) {
            buildNode(child, spec);
        }
    }

    buildNode(nodeTree, null);

    return b.build();
}

// ====================================================================
//  5. 高级 API — buildFromDesign(pageId, opts)
// ====================================================================

/**
 * 一站式入口: 读取 design.md → 解析 → MCP 创建。
 * @param {string} pageId     — 页面标识 (如 'main-menu', 'battle')
 * @param {Object} opts
 * @param {string} opts.projectRoot — 项目根目录
 * @param {Object} opts.mcp         — mcp-client 模块实例
 * @param {string} opts.parentPath  — MCP 创建的父路径 (如 'Canvas')
 * @param {string} [opts.scene]     — 场景 db URL
 */
async function buildFromDesign(pageId, opts) {
    const { projectRoot, mcp, parentPath } = opts;

    // 读取 design.md
    const designPath = path.join(projectRoot, 'cocos-dna', 'components', pageId, 'design.md');
    if (!fs.existsSync(designPath)) {
        throw new Error(`[design2prefab] design.md not found: ${designPath}`);
    }
    const content = fs.readFileSync(designPath, 'utf-8');
    console.log(`  [design2prefab] Parsing: ${designPath}`);

    // 解析
    const nodeTree = parseNodeTree(content);
    console.log(`  [design2prefab] Root: ${nodeTree.name}, children: ${nodeTree.children.length}`);

    // 读取 asset-manifest (如有)
    let assetManifest = null;
    const manifestPath = path.join(projectRoot, 'cocos-dna', 'components', pageId, 'asset-manifest.json');
    if (fs.existsSync(manifestPath)) {
        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            assetManifest = manifest.assets || [];
            console.log(`  [design2prefab] Asset manifest loaded: ${assetManifest.length} assets`);
        } catch (e) {
            console.warn(`  [design2prefab] Failed to parse asset-manifest.json: ${e.message}`);
        }
    }

    // 清理旧节点
    console.log(`  [design2prefab] Cleaning old node: ${parentPath}/${nodeTree.name}`);
    await mcp.deleteNode(`${parentPath}/${nodeTree.name}`);
    await mcp.sleep(300);

    // 创建
    await buildViaMCP(nodeTree, { parentPath, mcp, assetManifest });

    // 保存为 Prefab
    const pascalName = _toPascalCase(pageId);
    const prefabDbURL = `db://assets/resources/prefabs/pages/${pascalName}Page.prefab`;
    console.log(`  [design2prefab] Saving Prefab: ${prefabDbURL}`);
    await mcp.createPrefab(`${parentPath}/${nodeTree.name}`, prefabDbURL);

    // 清理场景中的临时节点
    await mcp.deleteNode(`${parentPath}/${nodeTree.name}`);

    console.log(`  [design2prefab] ✅ ${pageId} → ${prefabDbURL}`);
}

// ====================================================================
//  6. 映射工具函数
// ====================================================================

function _mapToMCPNodeType(spec) {
    if (spec.types.includes('Sprite')) return 'SpriteSplash';
    if (spec.types.includes('Label')) return 'Label';
    if (spec.types.includes('Layout')) return 'Layout';
    return 'Empty';
}

function _mapWidgetProps(widget) {
    const props = { alignMode: 2 }; // ALWAYS
    if (widget.left !== undefined) { props.isAlignLeft = true; props.left = widget.left; }
    if (widget.right !== undefined) { props.isAlignRight = true; props.right = widget.right; }
    if (widget.top !== undefined) { props.isAlignTop = true; props.top = widget.top; }
    if (widget.bottom !== undefined) { props.isAlignBottom = true; props.bottom = widget.bottom; }
    return props;
}

function _mapAlign(align) {
    if (!align) return 1; // CENTER
    switch (align.toUpperCase()) {
        case 'LEFT': return 0;
        case 'CENTER': return 1;
        case 'RIGHT': return 2;
        case 'TOP': return 0;
        case 'BOTTOM': return 2;
        default: return 1;
    }
}

function _mapOverflow(overflow) {
    if (!overflow) return 0; // NONE
    switch (overflow.toUpperCase()) {
        case 'NONE': return 0;
        case 'CLAMP': return 1;
        case 'SHRINK': return 2;
        case 'RESIZE_HEIGHT': return 3;
        default: return 0;
    }
}

function _mapCacheMode(mode) {
    if (!mode) return 0;
    switch (mode.toUpperCase()) {
        case 'NONE': return 0;
        case 'BITMAP': return 1;
        case 'CHAR': return 2;
        default: return 0;
    }
}

function _computeWidgetFlags(widget) {
    let flags = 0;
    if (widget.top !== undefined) flags |= 1;      // TOP
    if (widget.bottom !== undefined) flags |= 2;    // BOTTOM
    if (widget.left !== undefined) flags |= 4;      // LEFT
    if (widget.right !== undefined) flags |= 8;     // RIGHT
    return flags;
}

function _parseShadowColor(colorStr) {
    const m = colorStr.match(/rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\)/);
    if (m) {
        const a = parseFloat(m[4]);
        return {
            r: parseInt(m[1]),
            g: parseInt(m[2]),
            b: parseInt(m[3]),
            a: a <= 1 ? Math.round(a * 255) : Math.round(a),
        };
    }
    return { r: 0, g: 0, b: 0, a: 128 };
}

function _toPascalCase(str) {
    return str.split(/[-_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

// ====================================================================
//  7. dry-run: 打印 NodeSpec 树
// ====================================================================

function printNodeTree(spec, indent) {
    indent = indent || '';
    const typesStr = spec.types.length > 0 ? ` [${spec.types.join('+')}]` : '';
    const sizeStr = spec.size ? ` ${spec.size.w}×${spec.size.h}` : '';
    const posStr = spec.position ? ` pos(${spec.position.x},${spec.position.y})` : '';
    const widgetStr = spec.widget ? ` Widget:${JSON.stringify(spec.widget)}` : '';
    const compStr = spec.comp ? ` Comp:${spec.comp}` : '';
    const textStr = spec.text ? ` "${typeof spec.text === 'object' ? (spec.text.cn || spec.text.en) : spec.text}"` : '';
    const fsStr = spec.fontSize ? ` ${spec.fontSize}px` : '';
    const colorStr = _effectiveColorHex(spec);
    const activeStr = spec.active === false ? ' [inactive]' : '';
    const boldStr = spec.bold ? ' bold' : '';
    const outlineStr = spec.outline ? ` outline(${spec.outline.color},${spec.outline.width})` : '';
    const shadowStr = spec.shadow ? ` shadow(blur:${spec.shadow.blur})` : '';
    const cacheModeStr = spec.cacheMode ? ` cache:${spec.cacheMode}` : '';

    console.log(`${indent}${spec.name}${typesStr}${sizeStr}${posStr}${widgetStr}${compStr}${textStr}${fsStr}${colorStr}${boldStr}${outlineStr}${shadowStr}${cacheModeStr}${activeStr}`);

    for (let i = 0; i < (spec.children || []).length; i++) {
        const isLast = i === spec.children.length - 1;
        const childIndent = indent + (isLast ? '  └─ ' : '  ├─ ');
        const nextIndent = indent + (isLast ? '     ' : '  │  ');
        printNodeTree(spec.children[i], childIndent);
    }
}

function _colorToHex(c) {
    const hex = (v) => v.toString(16).padStart(2, '0');
    return hex(c.r) + hex(c.g) + hex(c.b) + (c.a !== undefined && c.a !== 255 ? hex(c.a) : '');
}

function _effectiveColorHex(spec) {
    if (!spec.color) return '';
    const c = { ...spec.color };
    if (spec.opacity !== undefined) {
        c.a = spec.opacity;
    }
    return ` #${_colorToHex(c)}`;
}

function countNodes(spec) {
    let count = 1;
    for (const child of spec.children || []) {
        count += countNodes(child);
    }
    return count;
}

// ====================================================================
//  8. CLI 入口
// ====================================================================

if (require.main === module) {
    const args = process.argv.slice(2);
    const flags = {};
    const positional = [];

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--project' && i + 1 < args.length) {
            flags.project = args[++i];
        } else if (args[i] === '--scene' && i + 1 < args.length) {
            flags.scene = args[++i];
        } else if (args[i] === '--canvas' && i + 1 < args.length) {
            flags.canvas = args[++i];
        } else if (args[i] === '--dry-run') {
            flags.dryRun = true;
        } else if (args[i] === '--offline') {
            flags.offline = true;
        } else if (!args[i].startsWith('--')) {
            positional.push(args[i]);
        }
    }

    const pageId = positional[0];
    if (!pageId) {
        console.log('Usage: node design2prefab.js [--project <dir>] <page-id> [--dry-run|--offline]');
        console.log('  page-id: main-menu, char-select, battle, route-map, etc.');
        console.log('  --dry-run : 解析 design.md 并打印 NodeSpec 树（不创建）');
        console.log('  --offline : 离线生成 .prefab JSON（不需编辑器）');
        console.log('  --project : 项目根目录（默认当前目录）');
        process.exit(1);
    }

    const projectRoot = flags.project ? path.resolve(flags.project) : process.cwd();
    const designPath = path.join(projectRoot, 'cocos-dna', 'components', pageId, 'design.md');

    if (!fs.existsSync(designPath)) {
        console.error(`[ERROR] design.md not found: ${designPath}`);
        process.exit(1);
    }

    const content = fs.readFileSync(designPath, 'utf-8');
    const nodeTree = parseNodeTree(content);

    console.log('');
    console.log('==================================================');
    console.log(`  design2prefab — ${pageId}`);
    console.log(`  Source: ${designPath}`);
    console.log(`  Total nodes: ${countNodes(nodeTree)}`);
    console.log('==================================================');
    console.log('');

    if (flags.dryRun) {
        // ── dry-run: 打印节点树 ──
        printNodeTree(nodeTree);
        console.log('');
        console.log('[dry-run] No changes made.');
        process.exit(0);
    }

    if (flags.offline) {
        // ── offline: 生成 .prefab JSON ──
        const json = buildOffline(nodeTree);
        const pascalName = _toPascalCase(pageId);
        const outPath = path.join(projectRoot, 'assets', 'resources', 'prefabs', 'pages', `${pascalName}Page.prefab`);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(json, null, 2));
        console.log(`[offline] Written: ${outPath} (${json.length} objects)`);
        process.exit(0);
    }

    // ── MCP 模式 ──
    (async () => {
        try {
            const mcp = require('./mcp-client');
            const canvasPath = flags.canvas || 'Canvas';
            const scene = flags.scene || 'db://assets/scenes/main.scene';

            console.log('[MCP] Connecting...');
            await mcp.init({ port: 9527, clientName: 'design2prefab' });

            console.log(`[MCP] Opening scene: ${scene}`);
            await mcp.sceneOpen(scene);
            await mcp.sleep(2000);

            await buildFromDesign(pageId, {
                projectRoot,
                mcp,
                parentPath: canvasPath,
            });

            console.log('[MCP] Saving scene...');
            await mcp.sceneSave();

            console.log('');
            console.log('[SUCCESS] Done!');
        } catch (e) {
            console.error(`[ERROR] ${e.message}`);
            console.error(e.stack);
            process.exit(1);
        }
    })();
}

// ====================================================================
//  导出
// ====================================================================

module.exports = {
    parseNodeTree,
    parseAllNodeTrees,
    buildViaMCP,
    buildOffline,
    buildFromDesign,
    printNodeTree,
    countNodes,
    extractChapter: _extractChapter,
    CHAPTER_MATCHERS,
};
