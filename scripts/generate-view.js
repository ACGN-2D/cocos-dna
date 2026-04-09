#!/usr/bin/env node
/**
 * generate-view.js — Codegen script for Layer 2 (XxxView.generated.ts)
 *
 * [cocos-dna skill script]
 *
 * Reads asset-manifest.json for a given page and generates the corresponding
 * XxxView.generated.ts file with:
 *   - viewName / resourceGroup getters
 *   - assetManifest getter (dynamic + ready entries)
 *   - @property declarations for static entries (optional, requires --with-properties)
 *
 * Usage:
 *   node generate-view.js <page> [options]
 *
 * Examples:
 *   node generate-view.js battle
 *   node generate-view.js battle --dry-run
 *   node generate-view.js battle --out ./custom/path/
 *   node generate-view.js all                          # Generate for all pages
 *
 * Options:
 *   --dry-run       Print generated code to stdout without writing files
 *   --out <dir>     Override output directory (default: assets/scripts/views/)
 *   --verbose       Show detailed processing info
 *
 * Data flow:
 *   cocos-dna/components/<page>/asset-manifest.json
 *       ↓ this script reads JSON
 *   assets/scripts/views/<PageName>View.generated.ts
 *       ↓ TypeScript literal (IAssetManifest)
 *   BaseView.onLoad() → _bindManifestAssets() auto-loads dynamic resources
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ==================== Configuration ====================

/** Project root (workspace root) */
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');

/** cocos-dna components directory */
const COMPONENTS_DIR = path.join(PROJECT_ROOT, 'cocos-dna', 'components');

/** Default output directory for generated files */
const DEFAULT_OUT_DIR = path.join(PROJECT_ROOT, 'assets', 'scripts', 'views');

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
 * Read and parse asset-manifest.json for a page.
 * @param {string} page - Page identifier (e.g. 'battle', 'char-select')
 * @returns {object} Parsed manifest JSON
 */
function readManifest(page) {
    const manifestPath = path.join(COMPONENTS_DIR, page, 'asset-manifest.json');
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Manifest not found: ${manifestPath}`);
    }
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw);
}

/**
 * Filter dynamic + ready sprite-frame entries from manifest.
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
 * Filter static entries from manifest.
 * These would be declared as @property in the generated file.
 */
function getStaticEntries(manifest) {
    return (manifest.assets || []).filter(a =>
        a.loadType === 'static' &&
        a.type === 'sprite-frame'
    );
}

/**
 * Format a single IManifestAssetEntry as a TypeScript object literal.
 * @param {object} entry - Asset entry from manifest
 * @param {string} indent - Indentation string
 * @returns {string} TypeScript object literal
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

    // boundToNodes
    if (entry.boundToNodes && entry.boundToNodes.length > 0) {
        // Strip path prefixes — only keep the leaf node name
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

// ==================== Code Generation ====================

/**
 * Generate the full XxxView.generated.ts content.
 * @param {string} page - Page identifier
 * @param {object} manifest - Parsed manifest JSON
 * @param {object} options - Generation options
 * @returns {string} Generated TypeScript source code
 */
function generateViewCode(page, manifest, options = {}) {
    const className = `${toPascalCase(page)}ViewGenerated`;
    const viewName = `${toPascalCase(page)}View`;
    const resourceGroup = toResourceGroup(page);
    const manifestSourceFile = `cocos-dna/components/${page}/asset-manifest.json`;

    const dynamicEntries = getDynamicReadyEntries(manifest);
    const staticEntries = getStaticEntries(manifest);

    // Determine imports
    const imports = ['_decorator'];
    const ccImports = new Set();
    if (staticEntries.length > 0) {
        ccImports.add('SpriteFrame');
        ccImports.add('Sprite');
        ccImports.add('Node');
    }
    // Always need BaseView
    const baseViewImports = ['BaseView'];
    if (dynamicEntries.length > 0) {
        baseViewImports.push('IAssetManifest');
    }

    // Build the file
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
    lines.push(` * Source: ${manifestSourceFile}`);
    lines.push(` * Generated at: ${new Date().toISOString()}`);
    lines.push(` *`);
    lines.push(` * This file declares:`);
    lines.push(` *   - viewName / resourceGroup abstract property implementations`);
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
    const ccImportList = [...ccImports];
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

    // Asset Manifest getter (only if there are dynamic entries)
    if (dynamicEntries.length > 0) {
        lines.push(`    // ===== Asset Manifest (from ${manifestSourceFile}) =====`);
        lines.push(``);
        lines.push(`    /**`);
        lines.push(`     * Dynamic asset manifest — sourced from:`);
        lines.push(`     *   ${manifestSourceFile}`);
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
        lines.push(`            sourceFile: '${manifestSourceFile}',`);
        lines.push(`            assets: [`);

        for (const entry of dynamicEntries) {
            lines.push(formatAssetEntry(entry));
        }

        lines.push(`            ],`);
        lines.push(`        };`);
        lines.push(`    }`);
        lines.push(``);
    }

    // Static @property declarations (informational — actual binding is in Prefab editor)
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
Usage: node generate-view.js <page|all> [options]

Arguments:
  page        Page identifier (e.g. 'battle', 'char-select', 'main-menu', 'route-map')
              Use 'all' to generate for all pages with asset-manifest.json

Options:
  --dry-run   Print generated code to stdout without writing files
  --out <dir> Override output directory (default: assets/scripts/views/)
  --verbose   Show detailed processing info
  --help      Show this help message

Examples:
  node generate-view.js battle
  node generate-view.js battle --dry-run
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
    let outDir = DEFAULT_OUT_DIR;

    const outIdx = args.indexOf('--out');
    if (outIdx !== -1 && args[outIdx + 1]) {
        outDir = path.resolve(args[outIdx + 1]);
    }

    // Get page argument (first non-option arg)
    const pageArg = args.find(a => !a.startsWith('--') && (args.indexOf(a) === 0 || args[args.indexOf(a) - 1] !== '--out'));

    if (!pageArg) {
        console.error('Error: No page specified');
        printUsage();
        process.exit(1);
    }

    // Determine pages to process
    let pages;
    if (pageArg === 'all') {
        // Discover all pages with asset-manifest.json
        if (!fs.existsSync(COMPONENTS_DIR)) {
            console.error(`Error: Components directory not found: ${COMPONENTS_DIR}`);
            process.exit(1);
        }
        pages = fs.readdirSync(COMPONENTS_DIR).filter(dir => {
            const manifestPath = path.join(COMPONENTS_DIR, dir, 'asset-manifest.json');
            return fs.existsSync(manifestPath);
        });
        if (pages.length === 0) {
            console.error('Error: No pages with asset-manifest.json found');
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

            // Read manifest
            const manifest = readManifest(page);
            if (verbose) {
                const dynamicCount = getDynamicReadyEntries(manifest).length;
                const staticCount = getStaticEntries(manifest).length;
                console.log(`  Manifest: ${manifest.assets.length} total assets`);
                console.log(`  Dynamic (ready): ${dynamicCount}`);
                console.log(`  Static: ${staticCount}`);
            }

            // Generate code
            const code = generateViewCode(page, manifest);
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
                    const lines = code.split('\n').length;
                    console.log(`   ${lines} lines, ${Buffer.byteLength(code, 'utf-8')} bytes`);
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
