/**
 * ui-dev-workflow.js — 通用 cocos-dna UI 开发工作流验证引擎
 * 
 * 验证 cocos-dna 三阶段工作流产出物的完整性：
 *   V1: 设计文档 (design.md) 章节完整性
 *   V2: Prefab 结构与 design.md 节点树一致性
 *   V3: Renderer / Comp 代码模式验证
 *   V4: 测试覆盖验证
 * 
 * 用法:
 *   node ui-dev-workflow.js --project <project-root> <ui-name> [--phase=1|2|3|4]
 *   node ui-dev-workflow.js --project <project-root> --all
 * 
 * 如果不提供 --project，自动从 CWD 向上查找含 cocos-dna/ 的目录。
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

function getNames(uiName) {
    const pascal = toPascal(uiName);
    return {
        prefab: `${pascal}Page`,
        renderer: `${pascal}Renderer`,
        comp: `${pascal}PageComp`,
    };
}

// ==================== V1: 设计文档验证 ====================

function validateDesignDoc(projectRoot, uiName) {
    console.log(`\n📋 V1: 验证设计文档 - ${uiName}`);

    const designFile = path.join(projectRoot, 'cocos-dna', 'components', uiName, 'design.md');

    if (!fs.existsSync(designFile)) {
        console.error(`  ❌ 设计文档不存在: ${designFile}`);
        return { valid: false, errors: ['设计文档不存在'], warnings: [] };
    }

    const content = fs.readFileSync(designFile, 'utf-8');
    const errors = [];
    const warnings = [];

    // 必需章节检查（9章含1.5章）
    const requiredSections = [
        { names: ['设计概述', '第1章'], label: '第1章 设计概述' },
        { names: ['参考图溯源', '第1.5章'], label: '第1.5章 参考图溯源' },
        { names: ['整体布局', '第2章', 'ASCII'], label: '第2章 整体布局' },
        { names: ['视觉规范', '配色方案', '颜色', '第3章'], label: '第3章 视觉规范' },
        { names: ['节点树', '第4章', 'Prefab'], label: '第4章 节点树' },
        { names: ['元素详述', 'UI 元素定义', '设计规范', '第5章'], label: '第5章 元素详述' },
        { names: ['资源切图', '第6章'], label: '第6章 资源切图表' },
        { names: ['资产绑定', '第6.5章', 'asset-manifest'], label: '第6.5章 资产绑定' },
        { names: ['交互逻辑', '第7章'], label: '第7章 交互逻辑' },
    ];

    const optionalSections = [
        { names: ['动态效果', '动画效果', '第8章'], label: '第8章 动态效果' },
    ];

    requiredSections.forEach(section => {
        const found = section.names.some(name => content.includes(name));
        if (!found) errors.push(`缺少必需章节: ${section.label}`);
    });

    optionalSections.forEach(section => {
        const found = section.names.some(name => content.includes(name));
        if (!found) warnings.push(`缺少可选章节: ${section.label}`);
    });

    // 检查 asset-manifest.json 是否存在
    const manifestPath = path.join(projectRoot, 'cocos-dna', 'components', uiName, 'asset-manifest.json');
    if (!fs.existsSync(manifestPath)) {
        warnings.push('asset-manifest.json 不存在');
    }

    if (errors.length > 0) {
        console.error('  ❌ 设计文档验证失败:');
        errors.forEach(err => console.error(`    - ${err}`));
    } else {
        console.log('  ✅ 设计文档验证通过');
    }
    warnings.forEach(w => console.log(`  ⚠️  ${w}`));

    return { valid: errors.length === 0, errors, warnings };
}

// ==================== V2: Prefab 验证 ====================

function validatePrefab(projectRoot, uiName) {
    console.log(`\n🏗️  V2: 验证 Prefab - ${uiName}`);

    const names = getNames(uiName);
    const prefabFile = path.join(projectRoot, 'assets', 'resources', 'prefabs', 'pages', `${names.prefab}.prefab`);

    if (!fs.existsSync(prefabFile)) {
        console.error(`  ❌ Prefab 不存在: ${prefabFile}`);
        return { valid: false, errors: ['Prefab 文件不存在'] };
    }

    const content = fs.readFileSync(prefabFile, 'utf-8');
    const errors = [];

    // 检查 UITransform 组件
    if (!content.includes('cc.UITransform')) {
        errors.push('Prefab 缺少 UITransform 组件');
    }

    // 尝试从 design.md 第4章提取节点名，与 Prefab 交叉验证
    const designFile = path.join(projectRoot, 'cocos-dna', 'components', uiName, 'design.md');
    if (fs.existsSync(designFile)) {
        const designContent = fs.readFileSync(designFile, 'utf-8');
        // 提取类似 `BG [Sprite]` 或 `| BG |` 的节点名
        const nodePattern = /[├└│|]\s*(\w+)\s*[\[|]/g;
        let match;
        const designNodes = new Set();
        while ((match = nodePattern.exec(designContent)) !== null) {
            if (match[1].length > 1 && match[1] !== 'cc' && match[1] !== 'Node') {
                designNodes.add(match[1]);
            }
        }
        if (designNodes.size > 0) {
            const missing = [];
            for (const nodeName of designNodes) {
                if (!content.includes(`"_name": "${nodeName}"`) && !content.includes(`"_name":"${nodeName}"`)) {
                    missing.push(nodeName);
                }
            }
            if (missing.length > 0) {
                errors.push(`Prefab 缺少 design.md 中声明的节点: ${missing.join(', ')}`);
            }
        }
    }

    if (errors.length > 0) {
        console.error('  ❌ Prefab 验证失败:');
        errors.forEach(err => console.error(`    - ${err}`));
    } else {
        console.log('  ✅ Prefab 验证通过');
    }

    return { valid: errors.length === 0, errors };
}

// ==================== V3: Renderer / Comp 验证 ====================

function validateCode(projectRoot, uiName) {
    console.log(`\n💻 V3: 验证代码 - ${uiName}`);

    const names = getNames(uiName);
    const errors = [];

    // 检查 Renderer (views/ 或 ui/ 目录)
    const rendererPaths = [
        path.join(projectRoot, 'assets', 'scripts', 'views', `${names.renderer}.ts`),
        path.join(projectRoot, 'assets', 'scripts', 'ui', uiName, `${names.renderer}.ts`),
    ];
    const rendererFile = rendererPaths.find(p => fs.existsSync(p));

    if (!rendererFile) {
        errors.push(`Renderer 不存在: ${names.renderer}.ts`);
    } else {
        const content = fs.readFileSync(rendererFile, 'utf-8');
        const requiredPatterns = [
            { pattern: '_tryLoadPrefab', label: '_tryLoadPrefab 方法' },
            { pattern: '_setupPrefabUI', label: '_setupPrefabUI 方法' },
            { pattern: '_prefabReady', label: '_prefabReady 状态标记' },
            { pattern: 'resources.load', label: 'resources.load 异步加载' },
        ];
        const recommendedPatterns = [
            { pattern: 'I18n.t', label: 'I18n.t() 国际化' },
            { pattern: 'SteamColors', label: 'SteamColors 常量' },
        ];

        requiredPatterns.forEach(p => {
            if (!content.includes(p.pattern)) errors.push(`Renderer 缺少: ${p.label}`);
        });
        recommendedPatterns.forEach(p => {
            if (!content.includes(p.pattern)) console.log(`  ⚠️  Renderer 建议添加: ${p.label}`);
        });
    }

    // 检查 Comp (prefab-components/ 目录)
    const compPaths = [
        path.join(projectRoot, 'assets', 'scripts', 'prefab-components', `${names.comp}.ts`),
        path.join(projectRoot, 'assets', 'scripts', 'ui', uiName, `${names.comp}.ts`),
    ];
    const compFile = compPaths.find(p => fs.existsSync(p));

    if (!compFile) {
        errors.push(`Comp 不存在: ${names.comp}.ts`);
    } else {
        const content = fs.readFileSync(compFile, 'utf-8');
        if (!content.includes('@ccclass')) errors.push(`Comp 缺少 @ccclass 装饰器`);
        if (!content.includes('@property')) errors.push(`Comp 缺少 @property 声明`);
    }

    if (errors.length > 0) {
        console.error('  ❌ 代码验证失败:');
        errors.forEach(err => console.error(`    - ${err}`));
    } else {
        console.log('  ✅ 代码验证通过');
    }

    return { valid: errors.length === 0, errors };
}

// ==================== V4: 测试验证 ====================

function validateTests(projectRoot, uiName) {
    console.log(`\n🧪 V4: 验证测试 - ${uiName}`);

    const testPatterns = [
        path.join(projectRoot, 'tests', '**', `*${uiName}*`),
        path.join(projectRoot, 'test', '**', `*${uiName}*`),
    ];

    // 简单搜索
    const testDirs = ['tests', 'test'].map(d => path.join(projectRoot, d)).filter(d => fs.existsSync(d));
    let testFound = false;

    for (const dir of testDirs) {
        const files = findFilesRecursive(dir, uiName);
        if (files.length > 0) {
            testFound = true;
            console.log(`  ✅ 找到测试文件: ${files.map(f => path.relative(projectRoot, f)).join(', ')}`);
        }
    }

    if (!testFound) {
        console.log('  ⚠️  未找到测试文件（建议创建）');
        return { valid: true, errors: [], warnings: ['建议创建测试文件'] };
    }

    return { valid: true, errors: [] };
}

function findFilesRecursive(dir, keyword) {
    const results = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...findFilesRecursive(fullPath, keyword));
            } else if (entry.name.includes(keyword)) {
                results.push(fullPath);
            }
        }
    } catch (e) { /* ignore permission errors */ }
    return results;
}

// ==================== 主流程 ====================

function runValidation(projectRoot, uiName, phase) {
    const results = { v1: null, v2: null, v3: null, v4: null };

    if (!phase || phase === 1) results.v1 = validateDesignDoc(projectRoot, uiName);
    if (!phase || phase === 2) results.v2 = validatePrefab(projectRoot, uiName);
    if (!phase || phase === 3) results.v3 = validateCode(projectRoot, uiName);
    if (!phase || phase === 4) results.v4 = validateTests(projectRoot, uiName);

    return results;
}

function printSummary(uiName, results) {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 cocos-dna 验证结果 — ${uiName}`);

    const labels = { v1: '设计文档', v2: 'Prefab  ', v3: '代码    ', v4: '测试    ' };
    let allValid = true;

    Object.entries(results).forEach(([key, result]) => {
        if (result !== null) {
            const status = result.valid ? '✅ 通过' : '❌ 失败';
            console.log(`  ${labels[key]}: ${status}`);
            if (!result.valid) allValid = false;
        }
    });

    return allValid;
}

function main() {
    const args = process.argv.slice(2);

    // 解析参数
    const projIdx = args.indexOf('--project');
    let projectRoot = projIdx >= 0 && args[projIdx + 1] ? path.resolve(args[projIdx + 1]) : null;
    if (!projectRoot) projectRoot = findProjectRoot();
    if (!projectRoot) {
        console.error('❌ 无法定位项目根目录，请使用 --project <path>');
        process.exit(1);
    }

    const phaseArg = args.find(a => a.startsWith('--phase='));
    const phase = phaseArg ? parseInt(phaseArg.split('=')[1]) : null;
    const scanAll = args.includes('--all');

    // 过滤掉 flag 参数，剩余的就是 ui-name
    const positional = args.filter(a =>
        !a.startsWith('--') && (projIdx < 0 || args.indexOf(a) !== projIdx + 1)
    );
    const uiName = positional[0];

    if (!uiName && !scanAll) {
        console.log('cocos-dna UI 开发工作流验证引擎');
        console.log('');
        console.log('用法:');
        console.log('  node ui-dev-workflow.js [--project <path>] <ui-name> [--phase=1|2|3|4]');
        console.log('  node ui-dev-workflow.js [--project <path>] --all');
        console.log('');
        console.log('阶段:');
        console.log('  V1 = 设计文档验证   V2 = Prefab 验证');
        console.log('  V3 = 代码验证       V4 = 测试验证');
        process.exit(0);
    }

    if (scanAll) {
        const designDnaDir = path.join(projectRoot, 'cocos-dna', 'components');
        if (!fs.existsSync(designDnaDir)) {
            console.error('❌ cocos-dna/components/ 不存在');
            process.exit(1);
        }
        const pages = fs.readdirSync(designDnaDir, { withFileTypes: true })
            .filter(d => d.isDirectory()).map(d => d.name);

        let allPassed = true;
        for (const page of pages) {
            console.log(`\n${'═'.repeat(60)}`);
            console.log(`  🔍 ${page}`);
            console.log('═'.repeat(60));
            const results = runValidation(projectRoot, page, phase);
            if (!printSummary(page, results)) allPassed = false;
        }
        process.exit(allPassed ? 0 : 1);
    }

    console.log(`\n🚀 cocos-dna 工作流验证 — ${uiName}`);
    console.log('='.repeat(60));
    const results = runValidation(projectRoot, uiName, phase);
    const allValid = printSummary(uiName, results);
    process.exit(allValid ? 0 : 1);
}

// 导出供程序化调用
module.exports = { validateDesignDoc, validatePrefab, validateCode, validateTests, runValidation };

if (require.main === module) main();
