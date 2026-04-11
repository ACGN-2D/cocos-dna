#!/usr/bin/env node
/**
 * generate-view.js — Codegen script for Layer 2 (XxxView.generated.ts)
 *
 * [cocos-dna skill script]
 *
 * Reads TWO manifest files for a given page and generates the corresponding
 * XxxView.generated.ts file with:
 *   - viewName / resourceGroup getters
 *   - @autoNode / @autoLabel / @autoSprite declarations (from view-manifest.json)
 *   - assetManifest getter (from asset-manifest.json, dynamic + ready entries)
 *   - @property(SpriteFrame) declarations (from asset-manifest.json, static entries)
 *
 * Data flow:
 *   design.md @property 映射表 ──[AI 提取]──→ view-manifest.json (结构化 JSON)
 *   asset-manifest.json ──────────────────→ 资源清单
 *   generate-view.js reads both ──────────→ XxxView.generated.ts (Layer 2)
 *
 * Usage:
 *   node generate-view.js <page> [options]
 *   node generate-view.js --project <dir> <page> [options]
 *
 * Examples:
 *   node generate-view.js battle
 *   node generate-view.js battle --dry-run
 *   node generate-view.js battle --out ./custom/path/
 *   node generate-view.js --project /path/to/workspace/clocktower battle
 *   node generate-view.js all                          # Generate for all pages
 *
 * Options:
 *   --project <dir> Project root directory (default: auto-detect from CWD upwards)
 *   --dry-run       Print generated code to stdout without writing files
 *   --out <dir>     Override output directory (default: assets/scripts/views/)
 *   --verbose       Show detailed processing info
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ==================== Project Root Detection ====================

/**
 * Auto-detect project root by walking up from startDir looking for cocos-dna/.
 * Returns null if not found.
 */
function findProjectRoot(startDir) {
    let dir = startDir || process.cwd();
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, 'cocos-dna'))) return dir;
        dir = path.dirname(dir);
    }
    return null;
}

/**
 * Resolve project root from --project flag or auto-detection.
 */
function resolveProjectRoot(explicitPath) {
    if (explicitPath) {
        const resolved = path.resolve(explicitPath);
        if (!fs.existsSync(path.join(resolved, 'cocos-dna'))) {
            console.error(`Error: --project path does not contain cocos-dna/: ${resolved}`);
            process.exit(1);
        }
        return resolved;
    }
    const detected = findProjectRoot(process.cwd());
    if (!detected) {
        console.error(
            'Error: Cannot detect project root (no cocos-dna/ found).\n' +
            'Run from inside the project directory, or pass --project <dir>.'
        );
        process.exit(1);
    }
    return detected;
}

// ==================== Helpers ====================

/**
 * Convert kebab-case page name to PascalCase class name.
 * e.g. 'char-select' → 'CharSelect', 'main-menu' → 'MainMenu', 'route-map' → 'RouteMap'
 */
function toPascalCase(kebab) {
    return kebab
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

/**
 * Convert page name to resource group name.
 * e.g. 'battle' → 'battle-page', 'char-select' → 'char-select-page'
 */
function toResourceGroup(page) {
    return `${page}-page`;
}

/**
 * Read and parse a JSON file. Returns null if not found.
 */
function readJsonFile(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Filter dynamic + ready sprite-frame entries from asset manifest.
 * These are the entries that BaseView._bindManifestAssets() will auto-load.
 */
function getDynamicReadyEntries(manifest) {
    return (manifest.assets || []).filter(a =>
        a.loadType === 'dynamic' &&
        (a.status === 'ready' || a.status === 'size_mismatch') &&
        a.type === 'sprite-frame'
    );
}

/**
 * Filter static entries from asset manifest.
 * These would be declared as @property(SpriteFrame) in the generated file.
 */
function getStaticEntries(manifest) {
    return (manifest.assets || []).filter(a =>
        a.loadType === 'static' &&
        a.type === 'sprite-frame'
    );
}

/**
 * Format a single IManifestAssetEntry as a TypeScript object literal.
 */
function formatAssetEntry(entry, indent = '                ') {
    const lines = [];
    lines.push(`${indent}{`);
    lines.push(`${indent}    id: '${entry.id}',`);
    lines.push(`${indent}    assetPath: '${entry.assetPath}',`);
    lines.push(`${indent}    loadType: '${entry.loadType}',`);
    lines.push(`${indent}    type: '${entry.type}',`);

    if (entry.sliceMode) {
        lines.push(`${indent}    sliceMode: '${entry.sliceMode}',`);
    }

    if (entry.meta && entry.meta.nineSlice) {
        const ns = entry.meta.nineSlice;
        lines.push(`${indent}    nineSlice: { top: ${ns.top}, bottom: ${ns.bottom}, left: ${ns.left}, right: ${ns.right} },`);
    }

    if (entry.boundToNodes && entry.boundToNodes.length > 0) {
        const leafNames = entry.boundToNodes.map(n => {
            const parts = n.split('/');
            return parts[parts.length - 1];
        });
        const uniqueNames = [...new Set(leafNames)];
        lines.push(`${indent}    boundToNodes: [${uniqueNames.map(n => `'${n}'`).join(', ')}],`);
    } else {
        lines.push(`${indent}    boundToNodes: [],`);
    }

    lines.push(`${indent}    status: '${entry.status}',`);

    if (entry.meta && entry.meta.size) {
        lines.push(`${indent}    size: { w: ${entry.meta.size.w}, h: ${entry.meta.size.h} },`);
    }

    lines.push(`${indent}},`);
    return lines.join('\n');
}

/**
 * Determine the auto-bind decorator for a given type.
 * @param {string} type - 'Node', 'Label', 'Sprite'
 * @returns {string} '@autoNode', '@autoLabel', '@autoSprite'
 */
function getAutoBindDecorator(type) {
    switch (type) {
        case 'Label':  return '@autoLabel';
        case 'Sprite': return '@autoSprite';
        case 'Node':
        default:       return '@autoNode';
    }
}

/**
 * Determine the TypeScript type for a binding.
 * @param {string} type - 'Node', 'Label', 'Sprite'
 * @returns {string} cc type name
 */
function getCCType(type) {
    switch (type) {
        case 'Label':  return 'Label';
        case 'Sprite': return 'Sprite';
        case 'Node':
        default:       return 'Node';
    }
}

/**
 * Group bindings by semantic category for readable code generation.
 * Groups consecutive entries by their node name prefix / purpose pattern.
 */
function groupBindings(bindings) {
    // Simple approach: group consecutive bindings that share a common prefix
    // or just output them as-is with comments based on purpose
    return bindings;
}

// ==================== Code Generation ====================

/**
 * Generate the full XxxView.generated.ts content.
 * @param {string} page - Page identifier
 * @param {object|null} viewManifest - Parsed view-manifest.json (or null)
 * @param {object|null} assetManifest - Parsed asset-manifest.json (or null)
 * @returns {string} Generated TypeScript source code
 */
function generateViewCode(page, viewManifest, assetManifest) {
    const className = `${toPascalCase(page)}ViewGenerated`;
    const viewName = `${toPascalCase(page)}View`;
    const resourceGroup = toResourceGroup(page);

    const bindings = viewManifest ? (viewManifest.bindings || []) : [];
    const dynamicEntries = assetManifest ? getDynamicReadyEntries(assetManifest) : [];
    const staticEntries = assetManifest ? getStaticEntries(assetManifest) : [];

    const assetManifestSource = `cocos-dna/components/${page}/asset-manifest.json`;
    const viewManifestSource = `cocos-dna/components/${page}/view-manifest.json`;

    // ---- Determine imports ----
    const ccTypes = new Set();
    ccTypes.add('_decorator');

    // From view-manifest bindings
    const needAutoNode = bindings.some(b => b.type === 'Node');
    const needAutoLabel = bindings.some(b => b.type === 'Label');
    const needAutoSprite = bindings.some(b => b.type === 'Sprite');

    if (needAutoNode || bindings.some(b => !['Label', 'Sprite'].includes(b.type))) {
        ccTypes.add('Node');
    }
    if (needAutoLabel) ccTypes.add('Label');
    if (needAutoSprite) ccTypes.add('Sprite');

    // From static asset entries
    if (staticEntries.length > 0) {
        ccTypes.add('SpriteFrame');
        ccTypes.add('Sprite');
        ccTypes.add('Node');
    }

    // BaseView imports
    const baseViewImports = ['BaseView'];
    if (dynamicEntries.length > 0) baseViewImports.push('IAssetManifest');
    if (needAutoNode || bindings.some(b => !['Label', 'Sprite'].includes(b.type))) {
        baseViewImports.push('autoNode');
    }
    if (needAutoLabel) baseViewImports.push('autoLabel');
    if (needAutoSprite) baseViewImports.push('autoSprite');

    // ---- Build the file ----
    const lines = [];

    // Header comment
    lines.push(`/**`);
    lines.push(` * ${viewName}.generated.ts — Layer 2: AI-generated (safe to overwrite)`);
    lines.push(` *`);
    lines.push(` * Three-layer architecture:`);
    lines.push(` *   Layer 1 — BaseView.ts (runtime, skill-maintained)`);
    lines.push(` *   Layer 2 — ${viewName}.generated.ts (AI-generated, safe to overwrite) ← THIS FILE`);
    lines.push(` *   Layer 3 — ${toPascalCase(page)}PageView.ts (business logic, never overwritten)`);
    lines.push(` *`);
    lines.push(` * Auto-generated by: .codebuddy/skills/cocos-dna/scripts/generate-view.js`);
    lines.push(` * Sources:`);
    if (bindings.length > 0) {
        lines.push(` *   UI bindings: ${viewManifestSource} (${bindings.length} bindings)`);
    }
    if (dynamicEntries.length > 0 || staticEntries.length > 0) {
        lines.push(` *   Assets: ${assetManifestSource} (${dynamicEntries.length} dynamic, ${staticEntries.length} static)`);
    }
    lines.push(` * Generated at: ${new Date().toISOString()}`);
    lines.push(` *`);
    lines.push(` * This file declares:`);
    lines.push(` *   - viewName / resourceGroup abstract property implementations`);
    if (bindings.length > 0) {
        lines.push(` *   - ${bindings.length} UI node bindings (@autoNode/@autoLabel/@autoSprite from view-manifest.json)`);
    }
    if (dynamicEntries.length > 0) {
        lines.push(` *   - assetManifest getter (${dynamicEntries.length} dynamic entries from asset-manifest.json)`);
    }
    if (staticEntries.length > 0) {
        lines.push(` *   - ${staticEntries.length} static @property declarations`);
    }
    lines.push(` *`);
    lines.push(` * ⚠️ DO NOT hand-edit. Regenerate with:`);
    lines.push(` *    node .codebuddy/skills/cocos-dna/scripts/generate-view.js ${page}`);
    lines.push(` *    Put business logic in ${toPascalCase(page)}PageView.ts (Layer 3).`);
    lines.push(` */`);
    lines.push(``);

    // Imports
    const ccImportList = [...ccTypes].filter(t => t !== '_decorator');
    if (ccImportList.length > 0) {
        lines.push(`import { ${['_decorator', ...ccImportList].join(', ')} } from 'cc';`);
    } else {
        lines.push(`import { _decorator } from 'cc';`);
    }
    lines.push(`import { ${baseViewImports.join(', ')} } from '../runtime/views/BaseView';`);
    lines.push(``);
    lines.push(`const { ccclass, property } = _decorator;`);
    lines.push(``);

    // Class declaration
    lines.push(`@ccclass('${className}')`);
    lines.push(`export class ${className} extends BaseView {`);
    lines.push(``);

    // Abstract property implementations
    lines.push(`    // ===== Abstract property implementations =====`);
    lines.push(``);
    lines.push(`    protected get viewName(): string { return '${viewName}'; }`);
    lines.push(`    protected get resourceGroup(): string { return '${resourceGroup}'; }`);
    lines.push(``);

    // UI Node bindings (from view-manifest.json)
    if (bindings.length > 0) {
        lines.push(`    // ===== UI Node references (auto-bind from Prefab node tree) =====`);
        lines.push(`    // Source: ${viewManifestSource}`);
        lines.push(``);

        // Calculate alignment padding for clean formatting
        const maxDecoratorLen = Math.max(...bindings.map(b => {
            const dec = getAutoBindDecorator(b.type);
            return `${dec}('${b.node}')`.length;
        }));
        const maxPropLen = Math.max(...bindings.map(b => `${b.property}:`.length));

        for (const binding of bindings) {
            const decorator = getAutoBindDecorator(binding.type);
            const ccType = getCCType(binding.type);
            const decoratorStr = `${decorator}('${binding.node}')`;
            const propStr = `${binding.property}:`;

            // Pad for alignment
            const decPad = ' '.repeat(Math.max(1, maxDecoratorLen - decoratorStr.length + 1));
            const propPad = ' '.repeat(Math.max(1, maxPropLen - propStr.length + 1));

            const comment = binding.purpose ? ` // ${binding.purpose}` : '';
            lines.push(`    ${decoratorStr}${decPad}${propStr}${propPad}${ccType} = null!;${comment}`);
        }
        lines.push(``);
    }

    // Asset Manifest getter (only if there are dynamic entries)
    if (dynamicEntries.length > 0) {
        lines.push(`    // ===== Asset Manifest (from ${assetManifestSource}) =====`);
        lines.push(``);
        lines.push(`    /**`);
        lines.push(`     * Dynamic asset manifest — sourced from:`);
        lines.push(`     *   ${assetManifestSource}`);
        lines.push(`     *`);
        lines.push(`     * Only dynamic (loadType: 'dynamic') + ready entries are included.`);
        lines.push(`     * Static entries are bound via @property in the Prefab editor.`);
        lines.push(`     *`);
        lines.push(`     * BaseView.onLoad() auto-loads these and binds to boundToNodes.`);
        lines.push(`     * Business code can access them via this.getManifestAsset('<asset_id>').`);
        lines.push(`     */`);
        lines.push(`    protected get assetManifest(): IAssetManifest {`);
        lines.push(`        return {`);
        lines.push(`            page: '${page}',`);
        lines.push(`            sourceFile: '${assetManifestSource}',`);
        lines.push(`            assets: [`);

        for (const entry of dynamicEntries) {
            lines.push(formatAssetEntry(entry));
        }

        lines.push(`            ],`);
        lines.push(`        };`);
        lines.push(`    }`);
        lines.push(``);
    }

    // Static @property declarations
    if (staticEntries.length > 0) {
        lines.push(`    // ===== Static resources (bound via @property in Prefab editor) =====`);
        lines.push(`    // These are declared here for reference. Actual binding is done in the Prefab editor.`);
        lines.push(``);
        for (const entry of staticEntries) {
            const propName = entry.id.replace(/-/g, '_');
            const nodes = (entry.boundToNodes || []).map(n => n.split('/').pop()).join(', ');
            lines.push(`    /** ${entry.meta?.notes || entry.designRef || entry.id} → [${nodes}] */`);
            lines.push(`    @property(SpriteFrame) ${propName}: SpriteFrame = null!;`);
            lines.push(``);
        }
    }

    // Close class
    lines.push(`}`);
    lines.push(``);

    return lines.join('\n');
}

// ==================== CLI ====================

function printUsage() {
    console.log(`
Usage: node generate-view.js [--project <dir>] <page|all> [options]

Arguments:
  page        Page identifier (e.g. 'battle', 'char-select', 'main-menu', 'route-map')
              Use 'all' to generate for all pages with view-manifest.json or asset-manifest.json

Options:
  --project <dir>  Project root directory (default: auto-detect from CWD upwards)
  --dry-run        Print generated code to stdout without writing files
  --out <dir>      Override output directory (default: assets/scripts/views/)
  --verbose        Show detailed processing info
  --help           Show this help message

Data sources (per page):
  cocos-dna/components/<page>/view-manifest.json   → @autoNode/@autoLabel/@autoSprite declarations
  cocos-dna/components/<page>/asset-manifest.json  → assetManifest getter + @property(SpriteFrame)

Examples:
  node generate-view.js battle
  node generate-view.js battle --dry-run
  node generate-view.js --project /path/to/project battle
  node generate-view.js all --verbose
`);
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help')) {
        printUsage();
        process.exit(0);
    }

    // Parse options
    const dryRun = args.includes('--dry-run');
    const verbose = args.includes('--verbose');

    // Parse --project
    let explicitProject = null;
    const projIdx = args.indexOf('--project');
    if (projIdx !== -1 && args[projIdx + 1]) {
        explicitProject = args[projIdx + 1];
    }

    // Resolve project root
    const PROJECT_ROOT = resolveProjectRoot(explicitProject);
    const COMPONENTS_DIR = path.join(PROJECT_ROOT, 'cocos-dna', 'components');
    const DEFAULT_OUT_DIR = path.join(PROJECT_ROOT, 'assets', 'scripts', 'views');

    if (verbose) {
        console.log(`Project root: ${PROJECT_ROOT}`);
    }

    // Parse --out
    let outDir = DEFAULT_OUT_DIR;
    const outIdx = args.indexOf('--out');
    if (outIdx !== -1 && args[outIdx + 1]) {
        outDir = path.resolve(args[outIdx + 1]);
    }

    // Get page argument (first non-option arg, skip values of --project and --out)
    const skipNextSet = new Set();
    for (let i = 0; i < args.length; i++) {
        if ((args[i] === '--project' || args[i] === '--out') && i + 1 < args.length) {
            skipNextSet.add(i + 1);
        }
    }
    const pageArg = args.find((a, i) => !a.startsWith('--') && !skipNextSet.has(i));

    if (!pageArg) {
        console.error('Error: No page specified');
        printUsage();
        process.exit(1);
    }

    // Determine pages to process
    let pages;
    if (pageArg === 'all') {
        // Discover all pages with either view-manifest.json or asset-manifest.json
        if (!fs.existsSync(COMPONENTS_DIR)) {
            console.error(`Error: Components directory not found: ${COMPONENTS_DIR}`);
            process.exit(1);
        }
        pages = fs.readdirSync(COMPONENTS_DIR).filter(dir => {
            const viewManifestPath = path.join(COMPONENTS_DIR, dir, 'view-manifest.json');
            const assetManifestPath = path.join(COMPONENTS_DIR, dir, 'asset-manifest.json');
            return fs.existsSync(viewManifestPath) || fs.existsSync(assetManifestPath);
        });
        if (pages.length === 0) {
            console.error('Error: No pages with view-manifest.json or asset-manifest.json found');
            process.exit(1);
        }
        console.log(`Found ${pages.length} pages: ${pages.join(', ')}`);
    } else {
        pages = [pageArg];
    }

    // Process each page
    let successCount = 0;
    let errorCount = 0;

    for (const page of pages) {
        try {
            if (verbose) console.log(`\n--- Processing: ${page} ---`);

            // Read both manifests (either can be null)
            const viewManifestPath = path.join(COMPONENTS_DIR, page, 'view-manifest.json');
            const assetManifestPath = path.join(COMPONENTS_DIR, page, 'asset-manifest.json');

            const viewManifest = readJsonFile(viewManifestPath);
            const assetManifest = readJsonFile(assetManifestPath);

            if (!viewManifest && !assetManifest) {
                throw new Error(`Neither view-manifest.json nor asset-manifest.json found for page '${page}'`);
            }

            if (verbose) {
                const bindingCount = viewManifest ? (viewManifest.bindings || []).length : 0;
                const dynamicCount = assetManifest ? getDynamicReadyEntries(assetManifest).length : 0;
                const staticCount = assetManifest ? getStaticEntries(assetManifest).length : 0;
                console.log(`  view-manifest: ${viewManifest ? `${bindingCount} bindings` : '(not found)'}`);
                console.log(`  asset-manifest: ${assetManifest ? `${dynamicCount} dynamic, ${staticCount} static` : '(not found)'}`);
            }

            // Generate code
            const code = generateViewCode(page, viewManifest, assetManifest);
            const className = `${toPascalCase(page)}View`;
            const fileName = `${className}.generated.ts`;

            if (dryRun) {
                console.log(`\n========== ${fileName} ==========\n`);
                console.log(code);
                console.log(`\n========== END ${fileName} ==========\n`);
            } else {
                // Ensure output directory exists
                if (!fs.existsSync(outDir)) {
                    fs.mkdirSync(outDir, { recursive: true });
                }

                const outPath = path.join(outDir, fileName);
                fs.writeFileSync(outPath, code, 'utf-8');
                console.log(`✅ Generated: ${outPath}`);

                if (verbose) {
                    const lineCount = code.split('\n').length;
                    console.log(`   ${lineCount} lines, ${Buffer.byteLength(code, 'utf-8')} bytes`);
                }
            }

            successCount++;
        } catch (err) {
            console.error(`❌ Error processing ${page}: ${err.message}`);
            if (verbose) console.error(err.stack);
            errorCount++;
        }
    }

    // Summary
    console.log(`\nDone: ${successCount} succeeded, ${errorCount} failed`);
    if (errorCount > 0) process.exit(1);
}

main();
