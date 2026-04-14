/**
 * extract-verify-spec.js — cocos-dna 验证规格提取器
 * 
 * 从 cocos-dna 产物（view-manifest.json + asset-manifest.json + design.md）
 * 提取标准化的 verify-spec.json，供 cocos-test 的 generate-verify.js 消费。
 * 
 * 设计原则（方案 C — 职责分离）：
 *   cocos-dna 负责"该验什么"（数据提取） → verify-spec.json
 *   cocos-test 负责"怎么验"（测试生成）  → verify-{page}.js
 * 
 * 用法:
 *   node extract-verify-spec.js --project <project-root> <page-name>
 *   node extract-verify-spec.js --project <project-root> --all
 *   node extract-verify-spec.js --project <project-root> <page-name> --output <path>
 * 
 * 输出:
 *   cocos-dna/components/<page>/verify-spec.json
 * 
 * verify-spec.json Schema (v1.0):
 * {
 *   "$schema": "verify-spec",
 *   "version": "1.0.0",
 *   "page": "main-menu",
 *   "generatedAt": "ISO timestamp",
 *   "generatedBy": "extract-verify-spec.js",
 *   "sourceManifests": {
 *     "viewManifest": "cocos-dna/components/main-menu/view-manifest.json",
 *     "assetManifest": "cocos-dna/components/main-menu/asset-manifest.json"
 *   },
 *   "designDoc": {
 *     "exists": true,
 *     "path": "cocos-dna/components/main-menu/design.md",
 *     "requiredSections": ["整体布局", "节点树", ...]
 *   },
 *   "nodes": [
 *     { "name": "BG", "bindings": [{ "property": "background", "type": "Node" }] },
 *     ...
 *   ],
 *   "labels": [
 *     { "name": "GameTitle", "property": "gameTitle", "purpose": "修改标题文字/样式" },
 *     ...
 *   ],
 *   "sprites": [
 *     { "name": "BG", "property": "backgroundSprite", "purpose": "加载/替换背景图片" },
 *     ...
 *   ],
 *   "assets": {
 *     "total": 10,
 *     "withUuid": 2,
 *     "missing": 8,
 *     "items": [
 *       { "id": "bg_main_menu", "filename": "4.1 主菜单背景.png", "status": "size_mismatch", "hasUuid": true, "boundToNodes": ["MainMenuPage/BG"] },
 *       ...
 *     ]
 *   },
 *   "prefab": {
 *     "expectedPath": "assets/resources/prefabs/pages/MainMenuPage.prefab",
 *     "expectedNodes": ["BG", "GameTitle", "StartBtn", ...],
 *     "pageName": "MainMenuPage"
 *   },
 *   "code": {
 *     "viewGenerated": "assets/scripts/views/MainMenuView.generated.ts",
 *     "pageView": "assets/scripts/views/MainMenuPageView.ts",
 *     "renderer": "assets/scripts/views/MainMenuRenderer.ts",
 *     "pageComp": "assets/scripts/prefab-components/MainMenuPageComp.ts"
 *   },
 *   "checkPrefabDupes": {
 *     "enabled": true,
 *     "prefabPath": "assets/resources/prefabs/pages/MainMenuPage.prefab"
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

// ==================== 项目根目录检测 ====================

function findProjectRoot(startDir) {
    let dir = startDir || process.cwd();
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, 'cocos-dna'))) return dir;
        dir = path.dirname(dir);
    }
    return null;
}

// ==================== 名称转换 ====================

function toPascal(kebab) {
    return kebab.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

/**
 * 历史页面别名映射表
 * key: page-id (kebab-case)
 * value: 实际 Prefab 文件名前缀（不含 .prefab 后缀）
 */
const PREFAB_ALIAS_MAP = {
    'route-map': 'MapPage',
};

function getNames(uiName) {
    const pascal = toPascal(uiName);
    const prefabAlias = PREFAB_ALIAS_MAP[uiName];
    const prefabName = prefabAlias || `${pascal}Page`;
    return {
        kebab: uiName,
        pascal,
        prefabName,
        prefabPath: `assets/resources/prefabs/pages/${prefabName}.prefab`,
        viewGenerated: `assets/scripts/views/${pascal}View.generated.ts`,
        pageView: `assets/scripts/views/${pascal}PageView.ts`,
        renderer: `assets/scripts/views/${pascal}Renderer.ts`,
        pageComp: `assets/scripts/prefab-components/${pascal}PageComp.ts`,
    };
}

// ==================== design.md 分析 ====================

/**
 * 从 design.md 提取可验证的章节列表
 */
function analyzeDesignDoc(designPath, projectRoot) {
    const relativePath = path.relative(projectRoot, designPath).replace(/\\/g, '/');
    const result = {
        exists: false,
        path: relativePath,
        requiredSections: [],
        foundSections: [],
    };

    if (!fs.existsSync(designPath)) return result;
    result.exists = true;

    const content = fs.readFileSync(designPath, 'utf-8');
    
    // 提取所有 ## 和 ### 标题
    const headings = [];
    const headingRegex = /^(#{2,3})\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
        headings.push(match[2].trim());
    }
    result.foundSections = headings;

    // 标准 design.md 应包含的核心章节
    const standardSections = [
        '整体布局',
        '节点树',
        '资源清单',
    ];
    result.requiredSections = standardSections.filter(s => 
        headings.some(h => h.includes(s))
    );

    return result;
}

// ==================== 核心提取逻辑 ====================

function extractVerifySpec(projectRoot, pageName, outputPath) {
    const names = getNames(pageName);
    const dnaDir = path.join(projectRoot, 'cocos-dna', 'components', pageName);
    
    // 1. 读取 view-manifest.json
    const vmPath = path.join(dnaDir, 'view-manifest.json');
    let viewManifest = null;
    if (fs.existsSync(vmPath)) {
        viewManifest = JSON.parse(fs.readFileSync(vmPath, 'utf-8'));
    }

    // 2. 读取 asset-manifest.json
    const amPath = path.join(dnaDir, 'asset-manifest.json');
    let assetManifest = null;
    if (fs.existsSync(amPath)) {
        assetManifest = JSON.parse(fs.readFileSync(amPath, 'utf-8'));
    }

    // 3. 分析 design.md
    const designDoc = analyzeDesignDoc(path.join(dnaDir, 'design.md'), projectRoot);

    // 4. 从 view-manifest 提取节点、Label、Sprite 绑定信息
    const nodes = [];
    const labels = [];
    const sprites = [];
    const allExpectedNodes = new Set();

    if (viewManifest && viewManifest.bindings) {
        for (const binding of viewManifest.bindings) {
            allExpectedNodes.add(binding.node);

            if (binding.type === 'Label') {
                labels.push({
                    name: binding.node,
                    property: binding.property,
                    purpose: binding.purpose,
                });
            } else if (binding.type === 'Sprite') {
                sprites.push({
                    name: binding.node,
                    property: binding.property,
                    purpose: binding.purpose,
                });
            }
            
            // 所有绑定都记录到 nodes
            const existingNode = nodes.find(n => n.name === binding.node);
            if (existingNode) {
                existingNode.bindings.push({
                    property: binding.property,
                    type: binding.type,
                });
            } else {
                nodes.push({
                    name: binding.node,
                    bindings: [{
                        property: binding.property,
                        type: binding.type,
                    }],
                });
            }
        }
    }

    // 5. 从 asset-manifest 提取资源信息
    const assets = { total: 0, withUuid: 0, missing: 0, items: [] };
    if (assetManifest && assetManifest.assets) {
        assets.total = assetManifest.assets.length;
        for (const asset of assetManifest.assets) {
            const hasUuid = !!(asset.uuid || asset.spriteFrameUuid);
            if (hasUuid) assets.withUuid++;
            if (asset.status === 'missing') assets.missing++;

            assets.items.push({
                id: asset.id,
                filename: asset.filename,
                status: asset.status,
                hasUuid,
                category: asset.category,
                boundToNodes: asset.boundToNodes || [],
            });

            // 资源绑定的节点也加入预期节点集
            if (asset.boundToNodes) {
                for (const nodePath of asset.boundToNodes) {
                    // 取最后一段作为节点名
                    const leafNode = nodePath.split('/').pop();
                    allExpectedNodes.add(leafNode);
                }
            }
        }
    }

    // 6. 构建 verify-spec
    const spec = {
        $schema: 'verify-spec',
        version: '1.0.0',
        page: pageName,
        generatedAt: new Date().toISOString(),
        generatedBy: 'extract-verify-spec.js',
        sourceManifests: {
            viewManifest: viewManifest ? `cocos-dna/components/${pageName}/view-manifest.json` : null,
            assetManifest: assetManifest ? `cocos-dna/components/${pageName}/asset-manifest.json` : null,
        },
        designDoc,
        nodes,
        labels,
        sprites,
        assets,
        prefab: {
            expectedPath: names.prefabPath,
            expectedNodes: [...allExpectedNodes].sort(),
            pageName: names.prefabName,
        },
        code: {
            viewGenerated: names.viewGenerated,
            pageView: names.pageView,
            renderer: names.renderer,
            pageComp: names.pageComp,
        },
        checkPrefabDupes: {
            enabled: true,
            prefabPath: names.prefabPath,
        },
    };

    // 7. 写入
    const outPath = outputPath || path.join(dnaDir, 'verify-spec.json');
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(spec, null, 2) + '\n', 'utf-8');

    return { spec, outPath };
}

// ==================== 获取所有页面 ====================

function getAllPages(projectRoot) {
    const componentsDir = path.join(projectRoot, 'cocos-dna', 'components');
    if (!fs.existsSync(componentsDir)) return [];
    return fs.readdirSync(componentsDir).filter(d => {
        const vmPath = path.join(componentsDir, d, 'view-manifest.json');
        return fs.existsSync(vmPath);
    });
}

// ==================== CLI ====================

function main() {
    const args = process.argv.slice(2);
    
    // 解析参数
    let projectRoot = null;
    let pageName = null;
    let outputPath = null;
    let doAll = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--project' && args[i + 1]) {
            projectRoot = path.resolve(args[++i]);
        } else if (args[i] === '--output' && args[i + 1]) {
            outputPath = path.resolve(args[++i]);
        } else if (args[i] === '--all') {
            doAll = true;
        } else if (!args[i].startsWith('--')) {
            pageName = args[i];
        }
    }

    // 自动查找项目根
    if (!projectRoot) {
        projectRoot = findProjectRoot(process.cwd());
    }
    if (!projectRoot) {
        console.error('❌ 找不到项目根目录（需包含 cocos-dna/ 目录）');
        console.error('   用法: node extract-verify-spec.js --project <project-root> <page-name>');
        process.exit(1);
    }

    console.log('═'.repeat(60));
    console.log('  cocos-dna — 验证规格提取器 (extract-verify-spec.js)');
    console.log('═'.repeat(60));
    console.log(`  项目: ${projectRoot}`);

    if (doAll) {
        const pages = getAllPages(projectRoot);
        if (pages.length === 0) {
            console.error('❌ 未找到任何 cocos-dna 页面组件');
            process.exit(1);
        }
        console.log(`  模式: 全部页面 (${pages.length} 个)`);
        console.log('─'.repeat(60));

        let success = 0;
        let failed = 0;
        for (const page of pages) {
            try {
                const { outPath } = extractVerifySpec(projectRoot, page);
                console.log(`  ✅ ${page} → ${path.relative(projectRoot, outPath)}`);
                success++;
            } catch (e) {
                console.error(`  ❌ ${page}: ${e.message}`);
                failed++;
            }
        }

        console.log('─'.repeat(60));
        console.log(`  完成: ${success} 成功, ${failed} 失败`);
        process.exit(failed > 0 ? 1 : 0);

    } else if (pageName) {
        console.log(`  页面: ${pageName}`);
        console.log('─'.repeat(60));

        try {
            const { spec, outPath } = extractVerifySpec(projectRoot, pageName, outputPath);
            console.log(`  ✅ verify-spec.json 已生成`);
            console.log(`     路径: ${path.relative(projectRoot, outPath)}`);
            console.log(`     节点: ${spec.nodes.length} | Labels: ${spec.labels.length} | Sprites: ${spec.sprites.length}`);
            console.log(`     资源: ${spec.assets.total} (UUID: ${spec.assets.withUuid}, 缺失: ${spec.assets.missing})`);
            console.log(`     Prefab 预期节点: ${spec.prefab.expectedNodes.length}`);
        } catch (e) {
            console.error(`  ❌ 提取失败: ${e.message}`);
            process.exit(1);
        }

    } else {
        console.error('❌ 缺少页面名称');
        console.error('   用法: node extract-verify-spec.js --project <project-root> <page-name>');
        console.error('         node extract-verify-spec.js --project <project-root> --all');
        process.exit(1);
    }
}

// 同时导出为模块供其他脚本调用
module.exports = { extractVerifySpec, getAllPages, getNames, toPascal };

if (require.main === module) {
    main();
}
