
import { TimelineConfig, TLNode } from "@/lib/timeline-api";

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
            const pA = a.position?.[0] ?? 0;
            const pB = b.position?.[0] ?? 0;
            return pA - pB;
        });
    });

    return map;
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
