import { TimelineGraph, Branch, Leaf, Timeline } from "@/lib/timeline-api";

export function flattenBranches(branches: any[]): any[] {
    const result: any[] = [];
    for (const b of branches) {
        result.push(b);
        if (b.childBranches) {
            result.push(...flattenBranches(b.childBranches));
        }
    }
    return result;
}

export function calculateBranchNumbers(timeline: TimelineGraph, config: Timeline): Map<string, number> {
    const numbers = new Map<string, number>();
    const allBranches = flattenBranches(timeline.branches || []);

    // Separate by level
    const level1 = allBranches.filter(b => b.level === 1);
    const level2 = allBranches.filter(b => b.level === 2);
    const level3 = allBranches.filter(b => b.level === 3);

    // Level 1: always per timeline (which means global for this timeline)
    level1.sort((a, b) => Number(a.orderKey) - Number(b.orderKey));
    level1.forEach((b, idx) => numbers.set(b.id, idx + 1));

    // Level 2: depending on branch2Persist
    if (config.branch2Persist) {
        level2.sort((a, b) => Number(a.orderKey) - Number(b.orderKey));
        level2.forEach((b, idx) => numbers.set(b.id, idx + 1));
    } else {
        const byParent = new Map<string | null, any[]>();
        level2.forEach(b => {
            const pid = b.parentBranchId || null;
            if (!byParent.has(pid)) byParent.set(pid, []);
            byParent.get(pid)!.push(b);
        });
        byParent.forEach(siblings => {
            siblings.sort((a, b) => Number(a.orderKey) - Number(b.orderKey));
            siblings.forEach((b, idx) => numbers.set(b.id, idx + 1));
        });
    }

    // Level 3: depending on branch3Persist
    if (config.branch3Persist) {
        level3.sort((a, b) => Number(a.orderKey) - Number(b.orderKey));
        level3.forEach((b, idx) => numbers.set(b.id, idx + 1));
    } else {
        const byParent = new Map<string | null, any[]>();
        level3.forEach(b => {
            const pid = b.parentBranchId || null;
            if (!byParent.has(pid)) byParent.set(pid, []);
            byParent.get(pid)!.push(b);
        });
        byParent.forEach(siblings => {
            siblings.sort((a, b) => Number(a.orderKey) - Number(b.orderKey));
            siblings.forEach((b, idx) => numbers.set(b.id, idx + 1));
        });
    }

    return numbers;
}

export function calculateLeafNumbers(timeline: TimelineGraph, config: Timeline): Map<string, number> {
    const numbers = new Map<string, number>();
    const allBranches = flattenBranches(timeline.branches || []);

    const allLeaves: any[] = [];
    allBranches.forEach(b => {
        if (b.leaves) {
            allLeaves.push(...b.leaves);
        }
    });

    if (config.leafPersist) {
        allLeaves.sort((a, b) => Number(a.orderKey) - Number(b.orderKey));
        let globalIndex = 1;
        allLeaves.forEach(l => numbers.set(l.id, globalIndex++));
    } else {
        const byBranch = new Map<string, any[]>();
        allLeaves.forEach(l => {
            if (!byBranch.has(l.branchId)) byBranch.set(l.branchId, []);
            byBranch.get(l.branchId)!.push(l);
        });

        byBranch.forEach(siblings => {
            siblings.sort((a, b) => Number(a.orderKey) - Number(b.orderKey));
            siblings.forEach((l, idx) => numbers.set(l.id, idx + 1));
        });
    }

    return numbers;
}
