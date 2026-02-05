import { Timeline, Event } from './timeline-api';

export type LayoutItemType = 'event' | 'divider' | 'levelName' | 'label' | 'subLevel' | 'navigation';

export interface LayoutItem {
    id: string;
    type: LayoutItemType;
    x: number;
    y: number;
    className?: string; // For customized styling if needed
    data?: any; // Event or Timeline node
    label?: string;
    subLabel?: string;
    dividerType?: 'primary' | 'secondary';
    isPlaceholder?: boolean; // For navigation nodes
    navDirection?: 'prev' | 'next'
}

export const LANES = {
    MAIN: 0,
    LEVEL: -40,  // Visually above in SVG (negative Y)
    LABEL: 50,   // Visually below (positive Y)
};

const CONSTANTS = {
    GAP: 120,    // Unified Gap
    SECTION_PADDING: 120, // Padding for Nav
};

interface TreeNode extends Timeline {
    children: TreeNode[];
    events: Event[];
}

/**
 * Calculates the layout for a SINGLE level view.
 * 
 * Layout Principles:
 * - Center (0) is the pivot.
 * - Spacing (GAP) is consistent (120px) between all elements.
 * - Events grow Left (Negative X).
 * - Sublevels grow Right (Positive X).
 * - Edge Dividers (Left/Right) always exist.
 * - Center Divider exists ONLY if both Events and Sublevels exist.
 * - Navigation nodes are outside the Edge Dividers.
 */
export function calculateSingleLevelLayout(
    currentLevelId: string | null,
    nodes: Timeline[],
    events: Event[]
): LayoutItem[] {
    if (!currentLevelId) return [];

    const items: LayoutItem[] = [];

    // 1. Build Helpers
    const nodeMap = new Map<string, TreeNode>();
    nodes.forEach(node => nodeMap.set(node.id, { ...node, children: [], events: [] }));

    // Populate events/children
    events.forEach(event => {
        if (event.timelineId && nodeMap.has(event.timelineId)) {
            nodeMap.get(event.timelineId)!.events.push(event);
        }
    });
    nodes.forEach(node => {
        if (node.parentId && nodeMap.has(node.parentId)) {
            nodeMap.get(node.parentId)!.children.push(nodeMap.get(node.id)!);
        }
    });

    const sortNodes = (n: TreeNode[]) => n.sort((a, b) => {
        const len = Math.min(a.position.length, b.position.length);
        for (let i = 0; i < len; i++) {
            if ((a.position[i] ?? 0) !== (b.position[i] ?? 0)) return (a.position[i] ?? 0) - (b.position[i] ?? 0);
        }
        return a.position.length - b.position.length;
    });

    // 2. Identify Current Context
    const currentNode = nodeMap.get(currentLevelId);
    if (!currentNode) return [];

    // Identify Siblings
    let prevSibling: TreeNode | null = null;
    let nextSibling: TreeNode | null = null;

    if (currentNode.parentId) {
        const parent = nodeMap.get(currentNode.parentId);
        if (parent) {
            const siblings = sortNodes([...parent.children]);
            const idx = siblings.findIndex(s => s.id === currentNode.id);
            if (idx > 0) prevSibling = siblings[idx - 1] ?? null;
            if (idx < siblings.length - 1) nextSibling = siblings[idx + 1] ?? null;
        }
    } else {
        const allNodes = Array.from(nodeMap.values());
        const roots = sortNodes(allNodes.filter(n => !n.parentId));
        const idx = roots.findIndex(r => r.id === currentNode.id);
        if (idx > 0) prevSibling = roots[idx - 1] ?? null;
        if (idx < roots.length - 1) nextSibling = roots[idx + 1] ?? null;
    }

    // 3. Layout Construction

    // Sort Content
    currentNode.events.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); // Order 1..N
    sortNodes(currentNode.children); // 1..N

    const hasEvents = currentNode.events.length > 0;
    const hasLevels = currentNode.children.length > 0;

    // --- POSITIONS ---
    let leftBoundary = 0;
    let rightBoundary = 0;

    // Events (Negative X)
    // Closest to center is Index N-1 (Last Event) -> Position -GAP
    // Furthest is Index 0 (First Event) -> Position -(N * GAP)
    // Wait, "even spacing".
    // Event(Last) @ -120.
    // Event(Last-1) @ -240.
    if (hasEvents) {
        const count = currentNode.events.length;
        currentNode.events.forEach((ev, idx) => {
            // Index 0 is the "First" visually (Leftmost).
            // Distance from CenterPivot (0)?
            // Last Event (idx = count-1) should be at -GAP.
            // First Event (idx = 0) should be at something.
            // Let's iterate backwards from -GAP.
            // Pos(i) = -GAP - ((count - 1 - i) * GAP)
            // if i = count-1 (Last): -GAP - 0 = -120. Correct.
            // if i = 0 (First): -GAP - (N-1)*GAP = -N*GAP. Correct.

            const distFromCenter = count - 1 - idx;
            const xPos = -CONSTANTS.GAP - (distFromCenter * CONSTANTS.GAP);

            items.push({
                id: ev.id,
                type: 'event',
                x: xPos,
                y: LANES.MAIN,
                label: ev.title,
                data: ev
            });

            if (idx === 0) leftBoundary = xPos;
        });
    } else {
        leftBoundary = 0; // Will adjust divider relative to this
    }

    // Sublevels (Positive X)
    // First Level (Index 0) @ +GAP.
    // Secondary Divider @ +2*GAP.
    // Second Level (Index 1) @ +3*GAP.
    // Pos(i) = GAP + (i * 2 * GAP).
    if (hasLevels) {
        currentNode.children.forEach((child, idx) => {
            const xPos = CONSTANTS.GAP + (idx * 2 * CONSTANTS.GAP);

            // Secondary Divider BEFORE this level? No, "in between".
            // So logic: Item ... Div ... Item.
            // If idx > 0, insert divider at xPos - GAP.
            if (idx > 0) {
                items.push({
                    id: `div-sec-${currentNode.id}-${idx}`,
                    type: 'divider',
                    x: xPos - CONSTANTS.GAP,
                    y: LANES.MAIN,
                    dividerType: 'secondary',
                    label: ''
                });
            }

            items.push({
                id: child.id,
                type: 'subLevel',
                x: xPos,
                y: LANES.LEVEL,
                label: `${idx + 1}`,
                subLabel: child.title || child.name,
                data: child
            });

            rightBoundary = xPos;
        });
    }
    else {
        rightBoundary = 0;
    }


    // --- DIVIDERS ---

    // Center Divider (Only if Both exist)
    if (hasEvents && hasLevels) {
        items.push({
            id: 'center-divider',
            type: 'divider',
            x: 0,
            y: LANES.MAIN,
            dividerType: 'primary',
            label: ''
        });
    }

    // Left Edge Divider
    // If hasEvents: Left of FirstEvent @ leftBoundary - GAP.
    // If !hasEvents: Left of Center @ -GAP.
    const divLeftX = hasEvents ? (leftBoundary - CONSTANTS.GAP) : -CONSTANTS.GAP;
    items.push({
        id: 'left-divider',
        type: 'divider',
        x: divLeftX,
        y: LANES.MAIN,
        dividerType: 'primary',
        label: ''
    });

    // Right Edge Divider
    // If hasLevels: Right of LastLevel @ rightBoundary + GAP.
    // If !hasLevels: Right of Center @ +GAP.
    const divRightX = hasLevels ? (rightBoundary + CONSTANTS.GAP) : 0;
    items.push({
        id: 'right-divider',
        type: 'divider',
        x: divRightX,
        y: LANES.MAIN,
        dividerType: 'primary',
        label: ''
    });


    // --- NAVIGATION ---

    // Nav Start (Left of Left Divider)
    items.push({
        id: prevSibling ? prevSibling.id : 'nav-start',
        type: 'navigation',
        navDirection: 'prev',
        x: divLeftX - CONSTANTS.GAP,
        y: LANES.LEVEL,
        label: prevSibling ? (prevSibling.title || prevSibling.name) : 'Start',
        data: prevSibling,
        isPlaceholder: !prevSibling
    });

    // Nav End (Right of Right Divider)
    items.push({
        id: nextSibling ? nextSibling.id : 'nav-end',
        type: 'navigation',
        navDirection: 'next',
        x: divRightX + CONSTANTS.GAP,
        y: LANES.LEVEL,
        label: nextSibling ? (nextSibling.title || nextSibling.name) : 'End',
        data: nextSibling,
        isPlaceholder: !nextSibling
    });

    return items;
}

export interface WorldBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export function computeWorldBounds(items: LayoutItem[]): WorldBounds {
    if (items.length === 0) {
        return { minX: -600, maxX: 600, minY: -300, maxY: 300 };
    }

    let minX = Infinity;
    let maxX = -Infinity;

    items.forEach(i => {
        minX = Math.min(minX, i.x);
        maxX = Math.max(maxX, i.x);
    });

    const paddingX = 300;
    const paddingY = 300;

    return {
        minX: minX - paddingX,
        maxX: maxX + paddingX,
        minY: -paddingY,
        maxY: paddingY,
    };
}
