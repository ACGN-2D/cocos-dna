/**
 * resolve-asset-uuids.js — 通用 Cocos Creator 资产 UUID 解析工具 (v2.0)
 * 
 * 连接 cocos-dna asset-manifest.json 与 Cocos .meta 文件的桥梁。
 * 
 * v2.0 新特性：Smart Discovery — 当 assetPath 指定的路径找不到资源时，
 * 自动按 filename 在整个 assets/ 目录递归搜索，根据 loadType 优先级选择
 * 最佳匹配，并自动修正 assetPath。
 * 
 * 工作流程:
 *   1. 美术/AI 生成切图 → 放入 assets/ 任意合理目录
 *   2. Cocos 编辑器自动生成 .meta 文件
 *   3. 运行本脚本 → Smart Discovery 查找 + 读取 .meta + 提取 UUID
 *   4. 尺寸校验: 对比 .meta 中的实际像素尺寸与 manifest 预设
 *   5. 写回 asset-manifest.json, status 变为 'ready' 或 'size_mismatch'
 *   6. Agent/MCP 读取 manifest → 精准绑定资源到 Prefab 节点
 * 
 * 用法:
 *   node resolve-asset-uuids.js --project <project-root>                    # 处理所有页面
 *   node resolve-asset-uuids.js --project <project-root> --page main-menu   # 只处理主菜单
 *   node resolve-asset-uuids.js --project <project-root> --check            # 仅检查，不写入
 *   node resolve-asset-uuids.js --project <project-root> --verbose          # 详细输出
 *   node resolve-asset-uuids.js --project <project-root> --no-discover      # 禁用 Smart Discovery
 * 
 * 如果不提供 --project，默认从 CWD 向上查找包含 cocos-dna/ 的目录。
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

// ==================== 辅助函数 ====================

/**
 * 从 manifest asset entry 中提取预设尺寸（兼容两种格式）
 * - 新格式: meta.size = { w: 64, h: 64 }
 * - 旧格式: size = "64x64"
 */
function getExpectedSize(asset) {
    if (asset.meta && asset.meta.size && typeof asset.meta.size.w === 'number') {
        return { w: asset.meta.size.w, h: asset.meta.size.h };
    }
    if (typeof asset.size === 'string') {
        const match = asset.size.match(/^(\d+)\s*x\s*(\d+)$/i);
        if (match) return { w: parseInt(match[1], 10), h: parseInt(match[2], 10) };
    }
    return null;
}

// ==================== Smart Discovery ====================

/**
 * 构建项目 assets/ 目录下所有图片文件的索引
 * 返回: Map<lowercaseFilename, Array<{relPath, fullPath}>>
 * 
 * 排除目录（优先级低，仅在无其他候选时使用）:
 *   - NanoBanana (AI 原始生成目录)
 *   - cocos-dna (设计文档目录)
 *   - raw (原始资产目录)
 */
function buildAssetIndex(projectRoot, verbose) {
    const assetsDir = path.join(projectRoot, 'assets');
    if (!fs.existsSync(assetsDir)) return new Map();

    const index = new Map(); // lowercaseFilename -> [{relPath, fullPath, priority}]
    const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);
    
    // 低优先级目录模式（仍会索引，但排序靠后）
    const LOW_PRIORITY_PATTERNS = [
        /[/\\]NanoBanana/i,
        /[/\\]raw[/\\]/,
        /[/\\]cocos-dna[/\\]/,
    ];

    function walk(dir) {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
        catch { return; }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                // 跳过 .xxx 隐藏目录和 node_modules
                if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
                walk(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (!IMAGE_EXTS.has(ext)) continue;

                const relPath = path.relative(projectRoot, fullPath).replace(/\\/g, '/');
                const key = entry.name.toLowerCase();

                // 计算优先级 (数字越小越优先)
                let priority = 10; // 默认
                if (relPath.includes('textures/common/')) priority = 5;
                if (relPath.includes('textures/pages/')) priority = 4;
                if (relPath.includes('resources/textures/')) priority = 3;
                if (relPath.match(/textures\/[^/]+\//)) priority = Math.min(priority, 6);
                // 低优先级
                for (const pat of LOW_PRIORITY_PATTERNS) {
                    if (pat.test(relPath)) { priority = 50; break; }
                }

                if (!index.has(key)) index.set(key, []);
                index.get(key).push({ relPath, fullPath, priority });
            }
        }
    }

    walk(assetsDir);

    // 每个文件名的候选列表按优先级排序
    for (const [, candidates] of index) {
        candidates.sort((a, b) => a.priority - b.priority);
    }

    if (verbose) {
        console.log(`  📂 资产索引: ${index.size} 个唯一文件名, 共 ${[...index.values()].reduce((s, v) => s + v.length, 0)} 个文件`);
    }

    return index;
}

/**
 * 根据 loadType 和候选列表选择最佳匹配
 * 
 * loadType 路径偏好:
 *   static  → 优先 assets/textures/ (非 resources)
 *   dynamic → 优先 assets/resources/textures/
 */
function selectBestCandidate(candidates, loadType) {
    if (!candidates || candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // 根据 loadType 调整优先级（权重 -5 确保 loadType 匹配优先于基础 priority 差异）
    const scored = candidates.map(c => {
        let score = c.priority;
        const isResources = c.relPath.includes('resources/');

        if (loadType === 'static' && !isResources) {
            score -= 5; // 优先非 resources
        } else if (loadType === 'dynamic' && isResources) {
            score -= 5; // 优先 resources
        }

        return { ...c, score };
    });

    scored.sort((a, b) => a.score - b.score);
    return scored[0];
}

// ==================== 核心逻辑 ====================

/**
 * 从 Cocos .meta 文件中提取资源 UUID + 实际图片尺寸
 * 
 * Cocos 4.x .meta 结构:
 *   subMetas["6c48a"] → importer: "texture"  (纹理 UUID)
 *   subMetas["f9941"] → importer: "sprite-frame" (SpriteFrame UUID)
 *     └─ userData.rawWidth / rawHeight  ← 原始图片像素尺寸
 */
function extractUuidsFromMeta(metaPath) {
    try {
        const content = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const result = {
            uuid: content.uuid || null,
            spriteFrameUuid: null,
            textureUuid: null,
            rawWidth: null,
            rawHeight: null,
        };

        if (content.subMetas) {
            for (const [subId, subMeta] of Object.entries(content.subMetas)) {
                if (subMeta.importer === 'sprite-frame') {
                    result.spriteFrameUuid = subMeta.uuid;
                    if (subMeta.userData) {
                        result.rawWidth = subMeta.userData.rawWidth ?? null;
                        result.rawHeight = subMeta.userData.rawHeight ?? null;
                    }
                }
                if (subMeta.importer === 'texture') {
                    result.textureUuid = subMeta.uuid;
                }
            }
        }

        return result;
    } catch (err) {
        console.error(`  ✗ 读取 .meta 失败: ${metaPath} — ${err.message}`);
        return null;
    }
}

/**
 * 尝试解析单个资产: 精确路径 → Smart Discovery fallback
 * 
 * @returns {{ found: boolean, assetFullPath: string|null, metaFullPath: string|null, discovered: boolean, discoveredRelPath: string|null, duplicates: Array|null }}
 */
function locateAsset(projectRoot, asset, assetIndex, options) {
    const result = {
        found: false,
        assetFullPath: null,
        metaFullPath: null,
        discovered: false,
        discoveredRelPath: null,
        duplicates: null,
    };

    // Step 1: 精确路径查找
    const assetRelPath = asset.assetPath || (asset.dir && asset.file ? path.join(asset.dir, asset.file).replace(/\\/g, '/') : null);
    let exactFound = false;
    let exactInLowPriority = false;

    if (assetRelPath) {
        const fullPath = path.join(projectRoot, assetRelPath);
        const metaPath = fullPath + '.meta';
        if (fs.existsSync(fullPath)) {
            exactFound = true;
            result.found = true;
            result.assetFullPath = fullPath;
            result.metaFullPath = fs.existsSync(metaPath) ? metaPath : null;

            // 检查精确路径是否在低优先级目录
            const LOW_PRIORITY_PATTERNS = [/NanoBanana/i, /[/\\]raw[/\\]/, /[/\\]cocos-dna[/\\]/];
            const relNorm = assetRelPath.replace(/\\/g, '/');
            exactInLowPriority = LOW_PRIORITY_PATTERNS.some(p => p.test(relNorm));

            // 如果不在低优先级目录，直接返回（最佳情况）
            if (!exactInLowPriority) {
                return result;
            }
            // 否则继续走 Discovery，看有没有更好的候选
        }
    }

    // Step 2: Smart Discovery (如果启用)
    if (!options.discover || !assetIndex) return result;

    const filename = asset.filename || (asset.file ? path.basename(asset.file) : null);

    // Step 2a: 按精确 filename 匹配
    let candidates = null;
    if (filename) {
        const key = filename.toLowerCase();
        const exactCandidates = assetIndex.get(key);
        // 过滤掉低优先级候选（pri>=50），如果全部是低优先级则视为未匹配
        if (exactCandidates && exactCandidates.length > 0) {
            const goodCandidates = exactCandidates.filter(c => c.priority < 50);
            if (goodCandidates.length > 0) {
                candidates = exactCandidates; // 保留全部（含低优先级），selectBest 会排序
            }
            // 如果全部是低优先级，candidates 保持 null → 继续 Step 2b
        }
    }

    // Step 2b: 如果精确 filename 匹配失败或全是低优先级，按 id 模糊匹配
    // 例: id="bg_main_menu" 匹配 "main_menu_bg.png"（包含 "main_menu" 关键词）
    if ((!candidates || candidates.length === 0) && asset.id) {
        // 从 id 中提取关键词 (去掉常见前缀 bg_/icon_/btn_/fx_)
        const idClean = asset.id
            .replace(/^(bg|icon|btn|fx)_/, '')
            .toLowerCase();
        const idKeywords = idClean.split('_').filter(k => k.length >= 3);

        if (idKeywords.length > 0) {
            const fuzzyMatches = [];
            for (const [fname, entries] of assetIndex) {
                // 文件名必须包含 id 的所有关键词
                const fnameClean = fname.replace(/\.[^.]+$/, '').toLowerCase();
                const allMatch = idKeywords.every(kw => fnameClean.includes(kw));
                if (allMatch) {
                    fuzzyMatches.push(...entries.map(e => ({ ...e, fuzzy: true })));
                }
            }
            if (fuzzyMatches.length > 0) {
                candidates = fuzzyMatches;
            }
        }
    }

    // 如果按 filename 和 id 都找不到候选，就用精确路径的结果（即使在低优先级目录）
    if (!candidates || candidates.length === 0) {
        return result;
    }

    // 记录重复
    if (candidates.length > 1) {
        result.duplicates = candidates.map(c => c.relPath);
    }

    const best = selectBestCandidate(candidates, asset.loadType);
    if (best) {
        // 如果精确路径已找到但在低优先级目录，只在发现更优候选时才替换
        if (exactFound && exactInLowPriority && best.priority >= 50) {
            // Discovery 找到的也是低优先级，不替换
            return result;
        }

        const metaPath = best.fullPath + '.meta';
        result.found = true;
        result.assetFullPath = best.fullPath;
        result.metaFullPath = fs.existsSync(metaPath) ? metaPath : null;
        result.discovered = true;
        result.discoveredRelPath = best.relPath;
    }

    return result;
}

/**
 * 解析单个页面的 asset-manifest.json
 */
function resolvePageManifest(projectRoot, pageName, options = {}) {
    const designDnaDir = path.join(projectRoot, 'cocos-dna', 'components');
    const manifestPath = path.join(designDnaDir, pageName, 'asset-manifest.json');

    if (!fs.existsSync(manifestPath)) {
        console.log(`  ⚠ 跳过 ${pageName} — 未找到 asset-manifest.json`);
        return { total: 0, resolved: 0, missing: 0, sizeMismatch: 0, discovered: 0, errors: [] };
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const stats = { total: 0, resolved: 0, missing: 0, sizeMismatch: 0, discovered: 0, errors: [] };

    // 构建资产索引 (如果启用 discover)
    const assetIndex = options.discover ? buildAssetIndex(projectRoot, options.verbose) : null;

    console.log(`\n📦 处理: ${pageName} (${manifest.assets.length} 项资源)`);
    console.log('─'.repeat(60));

    for (const asset of manifest.assets) {
        stats.total++;

        if (options.verbose) {
            console.log(`  [${asset.id}] ${asset.filename || asset.file || '(unknown)'}`);
        }

        // 定位资产（精确路径 + Smart Discovery）
        const loc = locateAsset(projectRoot, asset, assetIndex, options);

        // 报告重复
        if (loc.duplicates && options.verbose) {
            console.log(`    ⚠ 发现 ${loc.duplicates.length} 个同名文件:`);
            for (const dup of loc.duplicates) {
                console.log(`      - ${dup}`);
            }
        }

        if (!loc.found) {
            if (asset.status !== 'missing') {
                asset.status = 'missing';
                asset.uuid = null;
                asset.spriteFrameUuid = null;
            }
            stats.missing++;
            const relPath = asset.assetPath || asset.filename || '(unknown)';
            console.log(`  ❌ ${asset.id}: 文件不存在 → ${relPath}`);
            continue;
        }

        // 如果是 Smart Discovery 发现的，更新 assetPath
        if (loc.discovered) {
            const oldPath = asset.assetPath;
            asset.assetPath = loc.discoveredRelPath;
            if (asset.sourceFile === oldPath || !asset.sourceFile) {
                asset.sourceFile = loc.discoveredRelPath;
            }
            stats.discovered++;
            console.log(`  🔍 ${asset.id}: Smart Discovery!`);
            console.log(`      旧路径: ${oldPath || '(无)'}`);
            console.log(`      发现于: ${loc.discoveredRelPath}`);
        }

        if (!loc.metaFullPath) {
            asset.status = 'exists';
            asset.uuid = null;
            asset.spriteFrameUuid = null;
            stats.errors.push(`${asset.id}: 文件存在但缺少 .meta`);
            console.log(`  ⚠ ${asset.id}: 文件存在但无 .meta — 请在 Cocos 编辑器中刷新`);
            continue;
        }

        const uuids = extractUuidsFromMeta(loc.metaFullPath);
        if (!uuids || !uuids.spriteFrameUuid) {
            asset.status = 'exists';
            stats.errors.push(`${asset.id}: .meta 中未找到 sprite-frame UUID`);
            console.log(`  ⚠ ${asset.id}: .meta 解析异常`);
            continue;
        }

        asset.uuid = uuids.uuid;
        asset.spriteFrameUuid = uuids.spriteFrameUuid;

        const expectedSize = getExpectedSize(asset);
        if (expectedSize && uuids.rawWidth != null && uuids.rawHeight != null) {
            if (uuids.rawWidth !== expectedSize.w || uuids.rawHeight !== expectedSize.h) {
                asset.status = 'size_mismatch';
                stats.sizeMismatch++;
                const errMsg = `${asset.id}: 尺寸不匹配! 预设 ${expectedSize.w}×${expectedSize.h}, 实际 ${uuids.rawWidth}×${uuids.rawHeight}`;
                stats.errors.push(errMsg);
                console.log(`  ⚠ ${errMsg}`);
                // size_mismatch 不再 continue — UUID 仍然填充，方便后续使用
                // 用户可根据 status 决定是否忽略尺寸差异
            } else {
                if (options.verbose) {
                    console.log(`    📐 尺寸校验通过: ${uuids.rawWidth}×${uuids.rawHeight}`);
                }
            }
        }

        if (asset.status !== 'size_mismatch') {
            asset.status = 'ready';
        }
        stats.resolved++;

        if (options.verbose) {
            console.log(`  ✅ ${asset.id}: ${uuids.spriteFrameUuid}`);
        } else {
            console.log(`  ✅ ${asset.id} → ${uuids.spriteFrameUuid.substring(0, 12)}...`);
        }
    }

    if (!options.checkOnly) {
        manifest.generatedAt = new Date().toISOString();
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
        console.log(`  💾 已写入: ${manifestPath}`);
    }

    return stats;
}

// ==================== 入口 ====================

function main() {
    const args = process.argv.slice(2);
    const checkOnly = args.includes('--check');
    const verbose = args.includes('--verbose');
    const noDiscover = args.includes('--no-discover');
    const discover = !noDiscover; // 默认启用

    // 解析 --project
    const projIdx = args.indexOf('--project');
    let projectRoot = projIdx >= 0 && args[projIdx + 1] ? path.resolve(args[projIdx + 1]) : null;
    if (!projectRoot) projectRoot = findProjectRoot();
    if (!projectRoot) {
        console.error('❌ 无法定位项目根目录，请使用 --project <path> 指定');
        process.exit(1);
    }

    // 解析 --page
    const pageIdx = args.indexOf('--page');
    const pageFilter = pageIdx >= 0 && args[pageIdx + 1] ? args[pageIdx + 1] : null;

    const designDnaDir = path.join(projectRoot, 'cocos-dna', 'components');

    console.log('═══════════════════════════════════════════════');
    console.log('  🔧 Cocos 资产 UUID 解析工具 (v2.0)');
    console.log(`  项目: ${projectRoot}`);
    console.log(`  Smart Discovery: ${discover ? '✅ 启用' : '❌ 禁用'}`);
    console.log('═══════════════════════════════════════════════');
    if (checkOnly) console.log('  模式: 仅检查 (不写入)');

    let pages;
    if (pageFilter) {
        pages = [pageFilter];
    } else {
        if (!fs.existsSync(designDnaDir)) {
            console.log('\n⚠ 未找到 cocos-dna/components/ 目录');
            process.exit(0);
        }
        pages = fs.readdirSync(designDnaDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name)
            .filter(name => fs.existsSync(path.join(designDnaDir, name, 'asset-manifest.json')));
    }

    if (pages.length === 0) {
        console.log('\n⚠ 未找到任何 asset-manifest.json');
        process.exit(0);
    }

    let totalStats = { total: 0, resolved: 0, missing: 0, sizeMismatch: 0, discovered: 0, errors: [] };
    for (const page of pages) {
        const stats = resolvePageManifest(projectRoot, page, { checkOnly, verbose, discover });
        totalStats.total += stats.total;
        totalStats.resolved += stats.resolved;
        totalStats.missing += stats.missing;
        totalStats.sizeMismatch += stats.sizeMismatch;
        totalStats.discovered += stats.discovered;
        totalStats.errors.push(...stats.errors);
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('  📊 汇总');
    console.log('═══════════════════════════════════════════════');
    console.log(`  资源总数:    ${totalStats.total}`);
    console.log(`  ✅ 已就绪:   ${totalStats.resolved}`);
    console.log(`  🔍 发现修正: ${totalStats.discovered}`);
    console.log(`  ❌ 缺失:     ${totalStats.missing}`);
    console.log(`  📐 尺寸不符: ${totalStats.sizeMismatch}`);
    console.log(`  ⚠ 异常:     ${totalStats.errors.length}`);

    if (totalStats.errors.length > 0) {
        console.log('\n  异常详情:');
        for (const err of totalStats.errors) console.log(`    - ${err}`);
    }

    if (totalStats.discovered > 0) {
        console.log(`\n  💡 Smart Discovery 自动修正了 ${totalStats.discovered} 个资产路径`);
    }

    process.exit((totalStats.missing > 0 || totalStats.sizeMismatch > 0) ? 1 : 0);
}

// 同时导出供程序化调用
module.exports = { extractUuidsFromMeta, resolvePageManifest, findProjectRoot, buildAssetIndex, locateAsset };

if (require.main === module) main();
