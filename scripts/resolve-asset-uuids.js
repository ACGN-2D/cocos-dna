/**
 * resolve-asset-uuids.js — 通用 Cocos Creator 资产 UUID 解析工具
 * 
 * 连接 cocos-dna asset-manifest.json 与 Cocos .meta 文件的桥梁。
 * 
 * 工作流程:
 *   1. 美术/AI 生成切图 → 放入 assets/ 指定目录
 *   2. Cocos 编辑器自动生成 .meta 文件
 *   3. 运行本脚本 → 读取 .meta, 提取 uuid + spriteFrameUuid + rawWidth/rawHeight
 *   4. 尺寸校验: 对比 .meta 中的实际像素尺寸与 manifest 预设
 *   5. 写回 asset-manifest.json, status 变为 'ready' 或 'size_mismatch'
 *   6. Agent/MCP 读取 manifest → 精准绑定资源到 Prefab 节点
 * 
 * 用法:
 *   node resolve-asset-uuids.js --project <project-root>                    # 处理所有页面
 *   node resolve-asset-uuids.js --project <project-root> --page main-menu   # 只处理主菜单
 *   node resolve-asset-uuids.js --project <project-root> --check            # 仅检查，不写入
 *   node resolve-asset-uuids.js --project <project-root> --verbose          # 详细输出
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
 * 解析单个页面的 asset-manifest.json
 */
function resolvePageManifest(projectRoot, pageName, options = {}) {
    const designDnaDir = path.join(projectRoot, 'cocos-dna', 'components');
    const manifestPath = path.join(designDnaDir, pageName, 'asset-manifest.json');

    if (!fs.existsSync(manifestPath)) {
        console.log(`  ⚠ 跳过 ${pageName} — 未找到 asset-manifest.json`);
        return { total: 0, resolved: 0, missing: 0, sizeMismatch: 0, errors: [] };
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const stats = { total: 0, resolved: 0, missing: 0, sizeMismatch: 0, errors: [] };

    console.log(`\n📦 处理: ${pageName} (${manifest.assets.length} 项资源)`);
    console.log('─'.repeat(60));

    for (const asset of manifest.assets) {
        stats.total++;
        const assetRelPath = asset.assetPath || (asset.dir && asset.file ? path.join(asset.dir, asset.file) : null);
        if (!assetRelPath) {
            stats.errors.push(`${asset.id}: 缺少 assetPath 或 dir/file 字段`);
            console.log(`  ⚠ ${asset.id}: 无法确定资源路径`);
            continue;
        }
        const assetFullPath = path.join(projectRoot, assetRelPath);
        const metaFullPath = assetFullPath + '.meta';

        if (options.verbose) {
            console.log(`  [${asset.id}] ${asset.filename || asset.file || '(unknown)'}`);
        }

        if (!fs.existsSync(assetFullPath)) {
            if (asset.status !== 'missing') {
                asset.status = 'missing';
                asset.uuid = null;
                asset.spriteFrameUuid = null;
            }
            stats.missing++;
            console.log(`  ❌ ${asset.id}: 文件不存在 → ${assetRelPath}`);
            continue;
        }

        if (!fs.existsSync(metaFullPath)) {
            asset.status = 'exists';
            asset.uuid = null;
            asset.spriteFrameUuid = null;
            stats.errors.push(`${asset.id}: 文件存在但缺少 .meta`);
            console.log(`  ⚠ ${asset.id}: 文件存在但无 .meta — 请在 Cocos 编辑器中刷新`);
            continue;
        }

        const uuids = extractUuidsFromMeta(metaFullPath);
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
                console.log(`  ❌ ${errMsg}`);
                continue;
            }
            if (options.verbose) {
                console.log(`    📐 尺寸校验通过: ${uuids.rawWidth}×${uuids.rawHeight}`);
            }
        }

        asset.status = 'ready';
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
    console.log('  🔧 Cocos 资产 UUID 解析工具 (通用版)');
    console.log(`  项目: ${projectRoot}`);
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

    let totalStats = { total: 0, resolved: 0, missing: 0, sizeMismatch: 0, errors: [] };
    for (const page of pages) {
        const stats = resolvePageManifest(projectRoot, page, { checkOnly, verbose });
        totalStats.total += stats.total;
        totalStats.resolved += stats.resolved;
        totalStats.missing += stats.missing;
        totalStats.sizeMismatch += stats.sizeMismatch;
        totalStats.errors.push(...stats.errors);
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('  📊 汇总');
    console.log('═══════════════════════════════════════════════');
    console.log(`  资源总数:    ${totalStats.total}`);
    console.log(`  ✅ 已就绪:   ${totalStats.resolved}`);
    console.log(`  ❌ 缺失:     ${totalStats.missing}`);
    console.log(`  📐 尺寸不符: ${totalStats.sizeMismatch}`);
    console.log(`  ⚠ 异常:     ${totalStats.errors.length}`);

    if (totalStats.errors.length > 0) {
        console.log('\n  异常详情:');
        for (const err of totalStats.errors) console.log(`    - ${err}`);
    }

    process.exit((totalStats.missing > 0 || totalStats.sizeMismatch > 0) ? 1 : 0);
}

// 同时导出供程序化调用
module.exports = { extractUuidsFromMeta, resolvePageManifest, findProjectRoot };

if (require.main === module) main();
