/**
 * UIBinder — Runtime dynamic node binding utility
 *
 * [cocos-dna skill template — v1.0.0]
 *
 * Provides automatic node-to-field binding by traversing the node tree
 * and matching node names to target object fields.
 *
 * Three binding modes:
 *   1. Auto mode   — node name (camelCase) matches field name on target
 *   2. Map mode    — explicit { nodeName → fieldName } mapping
 *   3. Component mode — { nodeName → { field, component } } extracts component
 *
 * Usage in BaseView subclass:
 *   // Auto mode: binds nodes whose camelCase names match declared fields
 *   UIBinder.autoBind(this.node, this);
 *
 *   // Map mode: explicit mapping
 *   UIBinder.bind(this.node, this, {
 *       'NewGameBtn': '_startBtnNode',
 *       'BG': { field: '_bgSprite', component: Sprite },
 *   });
 *
 * Naming convention (node-spec.md):
 *   Node name: "NewGameBtn"  → camelCase field: "newGameBtn"
 *   Node name: "BG"          → camelCase field: "bg"
 *   Node name: "GameTitle"   → camelCase field: "gameTitle"
 *
 * This utility is a FALLBACK for dynamic binding. For static resources
 * and editor-visible bindings, use @property in the generated layer.
 */

import { Node, Component } from 'cc';

// ==================== Binding rule types ====================

/** Simple field mapping: node name → target field name */
type SimpleRule = string;

/** Component extraction rule: node name → { field, component } */
interface ComponentRule {
    /** Target field name on the binding target */
    field: string;
    /** Component type to extract from the node (optional, defaults to Node) */
    component?: typeof Component;
}

/** A single binding rule */
type BindingRule = SimpleRule | ComponentRule;

/** Binding map: node name → rule */
export type BindingMap = Record<string, BindingRule>;

// ==================== UIBinder ====================

export class UIBinder {

    /**
     * Bind nodes to target fields using an explicit mapping.
     *
     * Recursively walks the node tree. When a node's name matches
     * a key in the mapping, the corresponding field on target is set.
     *
     * @param root    Root node to start traversal from
     * @param target  Object to bind fields onto (usually `this`)
     * @param mapping Explicit node-name → field mapping
     */
    public static bind(root: Node, target: any, mapping: BindingMap): void {
        const pendingKeys = new Set(Object.keys(mapping));
        if (pendingKeys.size === 0) return;

        UIBinder._walk(root, (node) => {
            if (pendingKeys.size === 0) return false; // Early exit

            const name = node.name;
            if (!name || !pendingKeys.has(name)) return true; // Continue

            const rule = mapping[name];
            if (typeof rule === 'string') {
                // Simple rule: assign Node
                target[rule] = node;
            } else if (rule) {
                // Component rule: extract component or assign Node
                if (rule.component) {
                    const comp = node.getComponent(rule.component as any);
                    if (comp) {
                        target[rule.field] = comp;
                    } else {
                        console.warn(
                            `[UIBinder] Component ${rule.component.name} not found on node "${name}"`
                        );
                        target[rule.field] = node;
                    }
                } else {
                    target[rule.field] = node;
                }
            }

            pendingKeys.delete(name);
            return true; // Continue (other nodes may still need binding)
        });

        // Warn about unresolved bindings
        if (pendingKeys.size > 0) {
            console.warn(
                `[UIBinder] Unresolved bindings: ${Array.from(pendingKeys).join(', ')}`
            );
        }
    }

    /**
     * Auto-bind nodes to target fields by matching camelCase names.
     *
     * For each node in the tree, converts its name to camelCase and
     * checks if the target object has a field with that name.
     * If the field exists and is currently null/undefined, it's bound.
     *
     * @param root   Root node to start traversal from
     * @param target Object to bind fields onto (usually `this`)
     * @param options Optional configuration
     */
    public static autoBind(root: Node, target: any, options?: {
        /** Only bind fields that are currently null or undefined (default: true) */
        onlyNull?: boolean;
        /** Log bound fields for debugging (default: false) */
        debug?: boolean;
    }): void {
        const onlyNull = options?.onlyNull !== false;
        const debug = options?.debug === true;
        const bound: string[] = [];

        UIBinder._walk(root, (node) => {
            const name = node.name;
            if (!name) return true;

            const fieldName = UIBinder.toCamelCase(name);

            if (fieldName in target) {
                if (onlyNull && target[fieldName] != null) {
                    return true; // Skip: already bound (e.g., by @property)
                }
                target[fieldName] = node;
                if (debug) bound.push(`${name} → ${fieldName}`);
            }

            return true;
        });

        if (debug && bound.length > 0) {
            console.log(`[UIBinder] Auto-bound ${bound.length} nodes: ${bound.join(', ')}`);
        }
    }

    /**
     * Convert a PascalCase or UPPER_SNAKE_CASE node name to camelCase.
     *
     * Examples:
     *   "NewGameBtn"    → "newGameBtn"
     *   "BG"            → "bg"
     *   "GameTitle"     → "gameTitle"
     *   "DecoGear_TL"   → "decoGearTL"
     *   "btn_start"     → "btnStart"
     *   "HINT_LABEL"    → "hintLabel"
     */
    public static toCamelCase(name: string): string {
        if (!name) return name;

        // Handle underscore-separated names (e.g., "DecoGear_TL", "btn_start")
        if (name.includes('_')) {
            return name
                .split('_')
                .map((part, index) => {
                    if (index === 0) {
                        return part.toLowerCase();
                    }
                    // Keep short uppercase segments as-is (TL, BR, etc.)
                    if (part.length <= 2 && part === part.toUpperCase()) {
                        return part;
                    }
                    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
                })
                .join('');
        }

        // Handle PascalCase (e.g., "NewGameBtn" → "newGameBtn")
        // Handle all-uppercase (e.g., "BG" → "bg")
        if (name === name.toUpperCase()) {
            return name.toLowerCase();
        }

        return name.charAt(0).toLowerCase() + name.slice(1);
    }

    // ===== Internal =====

    /**
     * Recursively walk the node tree, calling visitor for each node.
     * Visitor returns false to stop traversal entirely.
     */
    private static _walk(
        node: Node,
        visitor: (node: Node) => boolean
    ): boolean {
        for (const child of node.children) {
            const shouldContinue = visitor(child);
            if (!shouldContinue) return false;
            if (!UIBinder._walk(child, visitor)) return false;
        }
        return true;
    }
}
