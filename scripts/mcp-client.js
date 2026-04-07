/**
 * mcp-client.js — 通用 Cocos Creator MCP 通信层
 * 
 * 封装 JSON-RPC over HTTP 与 Cocos CLI MCP Server 的通信，
 * 提供场景操作、节点创建、组件管理、Prefab 导出等高层 API。
 * 
 * 使用方式:
 *   const mcp = require('<skill-path>/scripts/mcp-client');
 *   await mcp.init({ port: 9527 });
 *   await mcp.sceneOpen('db://assets/scenes/main.scene');
 *   await mcp.createNode('Canvas', 'MyNode', 'Sprite', '2d', { x: 0, y: 0, z: 0 });
 *   await mcp.sceneSave();
 * 
 * 也可直接运行做连通性测试:
 *   node scripts/mcp-client.js [port]
 */

const http = require('http');

// ==================== 状态 ====================

let sessionId = null;
let jsonrpcId = 0;
let mcpPort = 9527;

// ==================== 底层 JSON-RPC ====================

function nextId() { return ++jsonrpcId; }

function mcpCall(method, params) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            jsonrpc: '2.0',
            id: nextId(),
            method,
            params: params || {},
        });

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'Content-Length': Buffer.byteLength(body),
        };
        if (sessionId) {
            headers['Mcp-Session-Id'] = sessionId;
        }

        const req = http.request({
            hostname: '127.0.0.1',
            port: mcpPort,
            path: '/mcp',
            method: 'POST',
            headers,
        }, (res) => {
            const sid = res.headers['mcp-session-id'];
            if (sid) sessionId = sid;

            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    // SSE 格式兼容
                    if (res.headers['content-type']?.includes('text/event-stream')) {
                        const lines = data.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const jsonStr = line.substring(6).trim();
                                if (jsonStr) {
                                    resolve(JSON.parse(jsonStr));
                                    return;
                                }
                            }
                        }
                    }
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`MCP parse error: ${e.message}\nRaw: ${data.substring(0, 500)}`));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function callTool(name, args) {
    const resp = await mcpCall('tools/call', { name, arguments: args });
    if (resp.error) {
        throw new Error(`MCP error [${name}]: ${JSON.stringify(resp.error)}`);
    }
    const content = resp.result?.content;
    if (content && content.length > 0) {
        const text = content[0].text;
        try { return JSON.parse(text); } catch { return text; }
    }
    return resp.result;
}

// ==================== 初始化 ====================

async function init(opts = {}) {
    mcpPort = opts.port || 9527;
    sessionId = null;
    jsonrpcId = 0;

    const resp = await mcpCall('initialize', {
        protocolVersion: '2024-11-05',
        clientInfo: { name: opts.clientName || 'cocos-dna-mcp-client', version: '1.0' },
        capabilities: {},
    });
    console.log(`[MCP] Connected to: ${resp.result?.serverInfo?.name || 'unknown'} @ port ${mcpPort}`);
    await mcpCall('notifications/initialized', {});
    return resp;
}

// ==================== 场景操作 ====================

async function sceneOpen(dbURL) {
    console.log(`  [Scene] Opening: ${dbURL}`);
    const result = await callTool('scene-open', { dbURLOrUUID: dbURL });
    if (result.code && result.code >= 400) throw new Error(`Failed to open scene: ${result.reason}`);
    return result;
}

async function sceneSave() {
    console.log(`  [Scene] Saving...`);
    return callTool('scene-save', {});
}

async function sceneClose() {
    return callTool('scene-close', {});
}

async function sceneCurrent() {
    return callTool('scene-query-current', {});
}

// ==================== 节点操作 ====================

async function createNode(parentPath, name, nodeType, workMode, position) {
    const opts = { path: parentPath, name, nodeType, workMode: workMode || '2d' };
    if (position) opts.position = position;
    const result = await callTool('scene-create-node-by-type', { options: opts });
    if (result.code && result.code >= 400) {
        throw new Error(`Failed to create node ${name} at ${parentPath}: ${result.reason}`);
    }
    return result;
}

async function deleteNode(nodePath) {
    try {
        return await callTool('scene-delete-node', { options: { path: nodePath } });
    } catch (e) { /* ignore if not found */ }
}

async function updateNode(nodePath, properties) {
    return callTool('scene-update-node', { options: { path: nodePath, properties } });
}

async function queryNode(nodePath, queryChildren, queryComponent) {
    return callTool('scene-query-node', {
        options: { path: nodePath, queryChildren: !!queryChildren, queryComponent: !!queryComponent }
    });
}

// ==================== 组件操作 ====================

async function addComponent(nodePath, component) {
    const result = await callTool('scene-add-component', {
        addComponentInfo: { nodePath, component }
    });
    if (result.code && result.code >= 400) {
        console.warn(`  [Warn] addComponent ${component} to ${nodePath}: ${result.reason}`);
    }
    return result;
}

async function setProperty(componentPath, properties) {
    return callTool('scene-set-component-property', {
        setPropertyOptions: { componentPath, properties }
    });
}

// ==================== 快捷方法 ====================

async function setUITransform(nodePath, width, height, anchorX, anchorY) {
    const props = { contentSize: { x: width, y: height } };
    if (anchorX !== undefined && anchorY !== undefined) {
        props.anchorPoint = { x: anchorX, y: anchorY };
    }
    return setProperty(`${nodePath}/cc.UITransform`, props);
}

async function setSize(nodePath, w, h) {
    return setProperty(`${nodePath}/cc.UITransform`, { _contentSize: { width: w, height: h } });
}

async function setSpriteColor(nodePath, color) {
    return setProperty(`${nodePath}/cc.Sprite`, { color });
}

async function setSpriteFrame(nodePath, spriteFrameUuid) {
    return setProperty(`${nodePath}/cc.Sprite`, { spriteFrame: spriteFrameUuid });
}

async function setLabel(nodePath, props) {
    return setProperty(`${nodePath}/cc.Label`, props);
}

async function setLabelFull(nodePath, text, fontSize, color, opts = {}) {
    const props = {};
    if (text !== undefined) props.string = text;
    if (fontSize !== undefined) props.fontSize = fontSize;
    if (opts.lineHeight !== undefined) props.lineHeight = opts.lineHeight;
    if (opts.hAlign !== undefined) props.horizontalAlign = opts.hAlign;
    if (opts.vAlign !== undefined) props.verticalAlign = opts.vAlign;
    if (opts.overflow !== undefined) props.overflow = opts.overflow;
    if (opts.bold !== undefined) props.isBold = opts.bold;
    if (opts.cacheMode !== undefined) props.cacheMode = opts.cacheMode;
    await setProperty(`${nodePath}/cc.Label`, props);
    if (color) {
        await setProperty(`${nodePath}/cc.Label`, { color });
    }
    if (opts.outline) {
        await setProperty(`${nodePath}/cc.Label`, {
            enableOutline: true, outlineColor: opts.outline.color, outlineWidth: opts.outline.width
        });
    }
    if (opts.shadow) {
        await setProperty(`${nodePath}/cc.Label`, {
            enableShadow: true, shadowColor: opts.shadow.color, shadowBlur: opts.shadow.blur,
            shadowOffsetX: opts.shadow.offsetX || 0, shadowOffsetY: opts.shadow.offsetY || 0
        });
    }
}

// ==================== Prefab / Asset ====================

async function createPrefab(nodePath, dbURL, overwrite) {
    console.log(`  [Prefab] Creating: ${dbURL}`);
    const result = await callTool('create-prefab-from-node', {
        options: { nodePath, dbURL, overwrite: overwrite !== false }
    });
    if (result.code && result.code >= 400) throw new Error(`Failed to create prefab: ${result.reason}`);
    return result;
}

async function createScene(baseName, dbURL) {
    return callTool('scene-create', { options: { baseName, templateType: '2d', dbURL } });
}

async function deleteAsset(dbPath) {
    return callTool('assets-delete-asset', { dbPath });
}

// ==================== 工具函数 ====================

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ==================== 导出 ====================

module.exports = {
    // 初始化
    init,
    // 底层
    mcpCall,
    callTool,
    // 场景
    sceneOpen,
    sceneSave,
    sceneClose,
    sceneCurrent,
    // 节点
    createNode,
    deleteNode,
    updateNode,
    queryNode,
    // 组件
    addComponent,
    setProperty,
    // 快捷
    setUITransform,
    setSize,
    setSpriteColor,
    setSpriteFrame,
    setLabel,
    setLabelFull,
    // Prefab/Asset
    createPrefab,
    createScene,
    deleteAsset,
    // 工具
    sleep,
};

// ==================== CLI 直接运行：连通性测试 ====================

if (require.main === module) {
    const port = parseInt(process.argv[2]) || 9527;
    (async () => {
        try {
            await init({ port });
            console.log('[OK] MCP connection test passed');
            const info = await sceneCurrent();
            console.log('[OK] Current scene:', JSON.stringify(info).substring(0, 200));
        } catch (e) {
            console.error('[FAIL]', e.message);
            process.exit(1);
        }
    })();
}
