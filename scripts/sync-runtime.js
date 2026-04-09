/**
 * sync-runtime.js — cocos-dna Runtime 模板同步工具
 * 
 * 将 skill 的 templates/runtime/ 下的 TypeScript 模板文件
 * 镜像同步到项目的 assets/scripts/runtime/ 目录中。
 * 
 * Skill 侧与项目侧目录结构完全一致（镜像复制）：
 *   templates/runtime/core/   → assets/scripts/runtime/core/
 *     ResourceManager.ts   （资源加载/缓存/分组释放）
 *     LayerManager.ts       （UI 层级隔离）
 *     EventBus.ts           （全局事件总线）
 *     DebugLogger.ts        （结构化调试日志）
 *     UIBinder.ts           （运行时节点绑定工具）
 *   templates/runtime/views/  → assets/scripts/runtime/views/
 *     BaseRenderer.ts       （渲染器基类）
 *     BaseView.ts           （视图 Component 基类）
 * 
 * 同步策略：
 *  - 新文件：直接复制
 *  - 已存在且内容相同：跳过
 *  - 已存在但内容不同：提示差异，--force 时覆盖
 *  - 项目自有文件（GameEvents.ts 等）：永远不覆盖
 * 
 * 用法：
 *   node sync-runtime.js --project <project-root>           # 预览模式（仅显示变更）
 *   node sync-runtime.js --project <project-root> --apply   # 执行同步
 *   node sync-runtime.js --project <project-root> --force   # 强制覆盖（慎用）
 * 
 * 如果不提供 --project，自动从 CWD 向上查找含 cocos-dna/ 的目录。
 */

const fs = require('fs');
const path = require('path');

// ==================== 配置 ====================

/**
 * skill 模板文件清单（只同步这些文件，不会意外覆盖项目自有代码）
 * 
 * srcSubdir:    相对于 templates/runtime/ 的源子目录（skill 侧）
 * targetSubdir: 相对于 assets/scripts/ 的目标子目录（项目侧）
 * 
 * 两侧结构完全一致（镜像复制），import 路径无需转换。
 */
const TEMPLATE_FILES = [
    { name: 'ResourceManager.ts', srcSubdir: 'core',  targetSubdir: 'runtime/core' },
    { name: 'LayerManager.ts',    srcSubdir: 'core',  targetSubdir: 'runtime/core' },
    { name: 'EventBus.ts',        srcSubdir: 'core',  targetSubdir: 'runtime/core' },
    { name: 'DebugLogger.ts',     srcSubdir: 'core',  targetSubdir: 'runtime/core' },
    { name: 'UIBinder.ts',        srcSubdir: 'core',  targetSubdir: 'runtime/core' },
    { name: 'BaseRenderer.ts',    srcSubdir: 'views', targetSubdir: 'runtime/views' },
    { name: 'BaseView.ts',        srcSubdir: 'views', targetSubdir: 'runtime/views' },
];

/** 版本标识（从模板文件头部注释中提取） */
const VERSION_PATTERN = /templates\/runtime\/\s*\(v([\d.]+)\)/;

// ==================== 工具函数 ====================

function findProjectRoot(startDir) {
    let dir = startDir || process.cwd();
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, 'cocos-dna'))) return dir;
        dir = path.dirname(dir);
    }
    return null;
}

function findSkillRoot(startDir) {
    let dir = startDir || process.cwd();
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, '.codebuddy', 'skills', 'cocos-dna', 'templates', 'runtime'))) {
            return path.join(dir, '.codebuddy', 'skills', 'cocos-dna');
        }
        dir = path.dirname(dir);
    }
    return null;
}

function filesEqual(pathA, pathB) {
    try {
        const a = fs.readFileSync(pathA, 'utf-8');
        const b = fs.readFileSync(pathB, 'utf-8');
        return a === b;
    } catch {
        return false;
    }
}

function extractVersion(content) {
    const match = content.match(VERSION_PATTERN);
    return match ? match[1] : 'unknown';
}

// ==================== 核心逻辑 ====================

function syncRuntime(projectRoot, skillRoot, options = {}) {
    const templateDir = path.join(skillRoot, 'templates', 'runtime');
    const scriptsDir = path.join(projectRoot, 'assets', 'scripts');

    console.log('═══════════════════════════════════════════════');
    console.log('  🔄 cocos-dna Runtime 同步工具');
    console.log(`  模板目录: ${templateDir}`);
    console.log(`  项目脚本: ${scriptsDir}`);
    console.log(`  模式: ${options.apply ? (options.force ? '强制覆盖' : '执行同步') : '预览模式'}`);
    console.log('═══════════════════════════════════════════════');

    if (!fs.existsSync(templateDir)) {
        console.error('❌ 模板目录不存在:', templateDir);
        process.exit(1);
    }

    const results = { synced: 0, skipped: 0, conflicts: 0, errors: 0 };

    for (const entry of TEMPLATE_FILES) {
        const filename = entry.name;
        const targetDir = path.join(scriptsDir, entry.targetSubdir);
        const srcPath = path.join(templateDir, entry.srcSubdir, filename);
        const dstPath = path.join(targetDir, filename);

        // 确保目标目录存在
        if (options.apply && !fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            console.log(`  📁 创建目录: ${targetDir}`);
        }

        if (!fs.existsSync(srcPath)) {
            console.log(`  ⚠ 模板文件不存在: ${filename}`);
            results.errors++;
            continue;
        }

        const srcContent = fs.readFileSync(srcPath, 'utf-8');
        const srcVersion = extractVersion(srcContent);

        if (!fs.existsSync(dstPath)) {
            // 新文件
            console.log(`  ✨ 新增: ${entry.targetSubdir}/${filename} (v${srcVersion})`);
            if (options.apply) {
                fs.writeFileSync(dstPath, srcContent, 'utf-8');
                console.log(`     → 已复制到 ${dstPath}`);
            }
            results.synced++;
        } else if (filesEqual(srcPath, dstPath)) {
            // 内容相同
            console.log(`  ✅ 已同步: ${entry.targetSubdir}/${filename} (无变更)`);
            results.skipped++;
        } else {
            // 内容不同
            const dstContent = fs.readFileSync(dstPath, 'utf-8');
            const dstVersion = extractVersion(dstContent);
            console.log(`  ⚠ 冲突: ${entry.targetSubdir}/${filename} (项目 v${dstVersion} ≠ 模板 v${srcVersion})`);

            if (options.force) {
                console.log(`     → 强制覆盖`);
                if (options.apply) {
                    fs.writeFileSync(dstPath, srcContent, 'utf-8');
                }
                results.synced++;
            } else {
                console.log(`     → 跳过（使用 --force 覆盖）`);
                results.conflicts++;
            }
        }
    }

    // 汇总
    console.log('\n═══════════════════════════════════════════════');
    console.log('  📊 同步结果');
    console.log('═══════════════════════════════════════════════');
    console.log(`  ✨ 新增/更新: ${results.synced}`);
    console.log(`  ✅ 已同步:    ${results.skipped}`);
    console.log(`  ⚠ 冲突:      ${results.conflicts}`);
    console.log(`  ❌ 错误:      ${results.errors}`);

    if (!options.apply && (results.synced > 0 || results.conflicts > 0)) {
        console.log('\n  💡 这是预览模式。加 --apply 执行实际同步。');
    }

    return results;
}

// ==================== 入口 ====================

function main() {
    const args = process.argv.slice(2);
    const apply = args.includes('--apply');
    const force = args.includes('--force');

    // 解析 --project
    const projIdx = args.indexOf('--project');
    let projectRoot = projIdx >= 0 && args[projIdx + 1] ? path.resolve(args[projIdx + 1]) : null;
    if (!projectRoot) projectRoot = findProjectRoot();
    if (!projectRoot) {
        console.error('❌ 无法定位项目根目录，请使用 --project <path>');
        process.exit(1);
    }

    const skillRoot = findSkillRoot(projectRoot);
    if (!skillRoot) {
        console.error('❌ 无法找到 cocos-dna skill 目录');
        process.exit(1);
    }

    const results = syncRuntime(projectRoot, skillRoot, { apply, force });
    process.exit(results.errors > 0 ? 1 : 0);
}

// 导出供程序化调用
module.exports = { syncRuntime, findProjectRoot, findSkillRoot };

if (require.main === module) main();
