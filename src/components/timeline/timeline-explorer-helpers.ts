
import { TimelineConfig, TLNode, Timeline } from "@/lib/timeline-api";

export type NodeIndex = Map<string | null, TLNode[]>;

export interface ApiEvent {
    id: string;
    title: string;
    description: string | null;
    eventTypeId: string;
    timelineId: string | null;
    order?: number;
}

export function buildIndex(nodes: TLNode[]): NodeIndex {
    const map = new Map<string | null, TLNode[]>();
    for (const node of nodes) {
        const pid = node.parentId ?? null;
        const arr = map.get(pid) || [];
        arr.push(node);
        map.set(pid, arr);
    }

    map.forEach((list) => {
        list.sort((a, b) => {
            const pA = Number(a.orderKey ?? 0);
            const pB = Number(b.orderKey ?? 0);
            return pA - pB;
        });
    });

    return map;
}

export function getNodeOrder(nodeId: string, byParent: NodeIndex, nodes: TLNode[]): number {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return 0;
    const siblings = byParent.get(node.parentId ?? null) || [];
    const idx = siblings.findIndex(s => s.id === nodeId);
    return idx + 1;
}

// Helper to get nodes in tree order (linearized)
function getLinearizedNodes(allNodes: Timeline[]): Timeline[] {
    const byParent = new Map<string | null, Timeline[]>();
    allNodes.forEach(n => {
        const pid = n.parentId || null;
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid)!.push(n);
    });

    // Sort siblings
    byParent.forEach(list => {
        list.sort((a, b) => Number(a.orderKey ?? 0) - Number(b.orderKey ?? 0));
    });

    const results: Timeline[] = [];

    function traverse(pid: string | null) {
        const children = byParent.get(pid);
        if (children) {
            for (const child of children) {
                results.push(child);
                traverse(child.id);
            }
        }
    }

    // Start with roots (null parent)
    traverse(null);
    return results;
}


export function getDerivedNumber(node: Timeline, nodes: Timeline[], cfg: TimelineConfig): number {
    // Check persistence
    const isPersist = (
        (node.level === 3 && cfg.level3Persist) ||
        (node.level === 4 && cfg.level4Persist) ||
        (node.level === 5 && cfg.level5Persist)
    );

    if (isPersist) {
        // Global numbering for this level BUT respecting Tree Order
        // 1. Get all nodes in tree order
        const linearNodes = getLinearizedNodes(nodes);
        // 2. Filter for just this level
        const sameLevel = linearNodes.filter(n => n.level === node.level);
        // 3. Find index
        const idx = sameLevel.findIndex(n => n.id === node.id);
        return idx + 1;
    } else {
        // Sibling numbering
        const siblings = nodes.filter(n => n.parentId === node.parentId);
        siblings.sort((a, b) => Number(a.orderKey ?? 0) - Number(b.orderKey ?? 0));
        const idx = siblings.findIndex(n => n.id === node.id);
        return idx + 1;
    }
}

export function getLevelName(level: number, cfg: TimelineConfig): string {
    switch (level) {
        case 1: return cfg.level1Name;
        case 2: return cfg.level2Name || "Level 2";
        case 3: return cfg.level3Name || "Level 3";
        case 4: return cfg.level4Name || "Level 4";
        case 5: return cfg.level5Name; // "Chapter"
        default: return `Level ${level}`;
    }
}

export function nextLevels(currentLevel: number, cfg: TimelineConfig): number[] {
    const candidates: number[] = [];
    // Find the NEXT available level (skip unconfigured ones)
    for (let l = currentLevel + 1; l <= 5; l++) {
        let valid = false;
        // Level 1 is always valid but we are looking > currentLevel.
        if (l === 2 && cfg.level2Name) valid = true;
        if (l === 3 && cfg.level3Name) valid = true;
        if (l === 4 && cfg.level4Name) valid = true;
        if (l === 5 && cfg.level5Name) valid = true;

        if (valid) {
            candidates.push(l);
            break; // Only return the immediate next configured level
        }
    }
    return candidates;
}
