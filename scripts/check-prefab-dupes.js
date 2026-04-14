/**
 * check-prefab-dupes.js — Prefab 节点重名检测（通用版）
 * 
 * 检查指定页面（或所有页面）的 Prefab 文件中是否存在重名节点。
 * 重名节点会导致 auto-bind 装饰器绑定到错误的节点。
 * 
 * 用法:
 *   node check-prefab-dupes.js --project <project-root> <page-name>
 *   node check-prefab-dupes.js --project <project-root> --all
 *   node check-prefab-dupes.js --project <project-root> --all --verbose
 * 
 * 退出码:
 *   0 = 无重名节点
 *   1 = 发现重名节点
 */

const fs = require('fs');
const path = require('path');

// 复用 extract-verify-spec 的命名逻辑
const { getNames, getAllPages } = require('./extract-verify-spec');

function findProjectRoot(startDir) {
    let dir = startDir || process.cwd();
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, 'cocos-dna'))) return dir;
        dir = path.dirname(dir);
    }
    return null;
}

/**
 * 检查单个 Prefab 文件的重名节点
 * @returns {{ dupes: Array, totalNodes: number, totalElements: number, labels: Array }}
 */
function checkPrefab(prefabPath, verbose) {
    if (!fs.existsSync(prefabPath)) {
        return { error: `文件不存在: ${prefabPath}`, dupes: [], totalNodes: 0, totalElements: 0, labels: [] };
    }

    const data = JSON.parse(fs.readFileSync(prefabPath, 'utf-8'));
    
    // 收集所有节点
    const nodes = [];
    data.forEach((item, i) => {
        if (item.__type__ === 'cc.Node' && item._name) {
            nodes.push({ idx: i, name: item._name, children: item._children });
        }
    });

    // 检查重名
    const counts = {};
    nodes.forEach(n => {
        if (!counts[n.name]) counts[n.name] = [];
        counts[n.name].push(n.idx);
    });
    
    const dupes = [];
    Object.entries(counts).forEach(([name, indices]) => {
        if (indices.length > 1) {
            dupes.push({ name, count: indices.length, indices });
        }
    });

    // 收集 Label 信息（verbose 模式）
    const labels = [];
    if (verbose) {
        data.forEach((item, i) => {
            if (item.__type__ === 'cc.Label' && item._string) {
                labels.push({
                    idx: i,
                    text: item._string,
                    fontSize: item._fontSize,
                    nodeId: item.node ? item.node.__id__ : null,
                });
            }
        });
    }

    return {
        dupes,
        totalNodes: nodes.length,
        totalElements: data.length,
        labels,
    };
}

// ==================== CLI ====================

function main() {
    const args = process.argv.slice(2);
    
    let projectRoot = null;
    let pageName = null;
    let doAll = false;
    let verbose = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--project' && args[i + 1]) {
            projectRoot = path.resolve(args[++i]);
        } else if (args[i] === '--all') {
            doAll = true;
        } else if (args[i] === '--verbose') {
            verbose = true;
        } else if (!args[i].startsWith('--')) {
            pageName = args[i];
        }
    }

    if (!projectRoot) {
        projectRoot = findProjectRoot(process.cwd());
    }
    if (!projectRoot) {
        console.error('❌ 找不到项目根目录');
        process.exit(1);
    }

    console.log('═'.repeat(56));
    console.log('  cocos-dna — Prefab 节点重名检测');
    console.log('═'.repeat(56));

    let pages = [];
    if (doAll) {
        pages = getAllPages(projectRoot);
    } else if (pageName) {
        pages = [pageName];
    } else {
        console.error('❌ 缺少页面名称');
        console.error('   用法: node check-prefab-dupes.js --project <path> <page>');
        process.exit(1);
    }

    let totalDupes = 0;
    
    for (const page of pages) {
        const names = getNames(page);
        const prefabPath = path.join(projectRoot, names.prefabPath);
        
        console.log(`\n  📦 ${page} → ${names.prefabPath}`);
        
        const result = checkPrefab(prefabPath, verbose);
        
        if (result.error) {
            console.log(`     ⏭️  ${result.error}`);
            continue;
        }

        console.log(`     节点: ${result.totalNodes} | 总元素: ${result.totalElements}`);

        if (result.dupes.length > 0) {
            totalDupes += result.dupes.length;
            for (const dupe of result.dupes) {
                console.log(`     ❌ 重名: "${dupe.name}" 出现 ${dupe.count} 次 (indices: ${dupe.indices.join(', ')})`);
            }
        } else {
            console.log(`     ✅ 无重名节点`);
        }

        if (verbose && result.labels.length > 0) {
            console.log(`     Labels:`);
            for (const label of result.labels) {
                console.log(`       [${label.idx}] "${label.text}" (fontSize: ${label.fontSize})`);
            }
        }
    }

    console.log('\n' + '═'.repeat(56));
    if (totalDupes > 0) {
        console.log(`  ❌ 发现 ${totalDupes} 组重名节点`);
        process.exit(1);
    } else {
        console.log(`  ✅ 所有 Prefab 无重名节点`);
        process.exit(0);
    }
}

module.exports = { checkPrefab };

if (require.main === module) {
    main();
}
