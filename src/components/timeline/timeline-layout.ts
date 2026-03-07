import { Node, Edge, Position } from '@xyflow/react';

const nodeWidth = 80;
const nodeHeight = 80;

const GAP_X = 120;
const LANE_GAP = 70;

const MIN_LEAF_WIDTH = 300;
const LEAF_PADDING_X = 80;
const LEAF_PADDING_Y = 80;

/*
Lane order rule

0
+50
-50
+100
-100
*/

function laneIndexToY(index: number) {
    if (index === 0) return 0;

    const step = Math.ceil(index / 2);
    const sign = index % 2 === 1 ? 1 : -1;

    return step * LANE_GAP * sign;
}

export function getLaneLayoutedElements(nodes: Node[], edges: Edge[]) {

    const standardNodes = nodes.filter(n => n.type !== 'leafGroupNode');

    /*
    ------------------------
    1. Build adjacency
    ------------------------
    */

    const incomingCount = new Map<string, number>();
    const outgoingEdges = new Map<string, string[]>();

    standardNodes.forEach(n => {
        incomingCount.set(n.id, 0);
        outgoingEdges.set(n.id, []);
    });

    edges.forEach(e => {

        if (incomingCount.has(e.target)) {
            incomingCount.set(e.target, incomingCount.get(e.target)! + 1);
        }

        if (outgoingEdges.has(e.source)) {
            outgoingEdges.get(e.source)!.push(e.target);
        }

    });

    /*
    ------------------------
    2. Depth (X)
    ------------------------
    */

    const roots = standardNodes
        .filter(n => incomingCount.get(n.id) === 0)
        .map(n => n.id);

    const depths = new Map<string, number>();

    roots.forEach(r => depths.set(r, 0));

    const queue = [...roots];

    while (queue.length) {

        const current = queue.shift()!;
        const depth = depths.get(current)!;

        const children = outgoingEdges.get(current) || [];

        for (const child of children) {

            const nextDepth = Math.max(depths.get(child) ?? 0, depth + 1);

            depths.set(child, nextDepth);

            if (!queue.includes(child)) {
                queue.push(child);
            }

        }

    }

    standardNodes.forEach(n => {

        const d = depths.get(n.id) ?? 0;

        n.position = {
            x: d * GAP_X,
            y: 0
        };

    });

    /*
    ------------------------
    3. Longest path memo
    ------------------------
    */

    const memo = new Map<string, number>();

    function getMaxPath(nodeId: string): number {

        if (memo.has(nodeId)) return memo.get(nodeId)!;

        const children = outgoingEdges.get(nodeId) || [];

        if (children.length === 0) {
            memo.set(nodeId, 1);
            return 1;
        }

        const val = 1 + Math.max(...children.map(getMaxPath));

        memo.set(nodeId, val);

        return val;
    }

    standardNodes.forEach(n => getMaxPath(n.id));

    /*
    ------------------------
    4. Extract paths
    ------------------------
    */

    const unvisited = new Set(standardNodes.map(n => n.id));

    interface Path {
        nodes: string[];
        startDepth: number;
        endDepth: number;
        length: number;
    }

    const paths: Path[] = [];

    while (unvisited.size) {

        let start = Array.from(unvisited)
            .sort((a, b) => getMaxPath(b) - getMaxPath(a))[0];

        let current = start;

        const path: string[] = [];

        while (current && unvisited.has(current)) {

            path.push(current);

            unvisited.delete(current);

            const children = outgoingEdges.get(current) || [];

            const valid = children.filter(c => unvisited.has(c));

            if (valid.length) {

                current = valid
                    .sort((a, b) => getMaxPath(b) - getMaxPath(a))[0];

            } else break;

        }

        if (path.length) {

            paths.push({
                nodes: path,
                startDepth: depths.get(path[0]!)!,
                endDepth: depths.get(path[path.length - 1]!)!,
                length: path.length
            });

        }

    }

    /*
    ------------------------
    5. Lane allocation
    ------------------------
    */

    paths.sort((a, b) => b.length - a.length);

    const occupied = new Map<number, Set<number>>();
    const nodeLane = new Map<string, number>();

    paths.forEach(path => {

        let laneIndex = 0;

        while (true) {

            let free = true;

            for (let d = path.startDepth; d <= path.endDepth; d++) {

                if (occupied.get(d)?.has(laneIndex)) {
                    free = false;
                    break;
                }

            }

            if (free) break;

            laneIndex++;

        }

        for (let d = path.startDepth; d <= path.endDepth; d++) {

            if (!occupied.has(d)) occupied.set(d, new Set());

            occupied.get(d)!.add(laneIndex);

        }

        path.nodes.forEach(id => nodeLane.set(id, laneIndex));

    });

    standardNodes.forEach(n => {

        const lane = nodeLane.get(n.id) ?? 0;

        n.position.y = laneIndexToY(lane);

        n.sourcePosition = Position.Right;
        n.targetPosition = Position.Left;

    });

    /*
    ------------------------
    6. Leaf bounds
    ------------------------
    */

    let globalMinY = 0;
    let globalMaxY = 0;

    const leafBounds: Record<string, { minX: number, maxX: number }> = {};

    standardNodes.forEach(node => {

        if (!node.parentId) return;

        const x = node.position.x;
        const y = node.position.y;

        globalMinY = Math.min(globalMinY, y);
        globalMaxY = Math.max(globalMaxY, y + nodeHeight);

        if (!leafBounds[node.parentId]) {

            leafBounds[node.parentId] = {
                minX: x,
                maxX: x + nodeWidth
            };

        } else {

            const b = leafBounds[node.parentId]!;

            b.minX = Math.min(b.minX, x);
            b.maxX = Math.max(b.maxX, x + nodeWidth);

        }

    });

    const leafY = globalMinY - LEAF_PADDING_Y - 50;
    const leafHeight = Math.max((globalMaxY - globalMinY) + LEAF_PADDING_Y * 2 + 100, 600);

    /*
    ------------------------
    7. Leaf positioning
    ------------------------
    */

    nodes.forEach(node => {

        if (node.type !== "leafGroupNode") return;

        const bounds = leafBounds[node.id];

        if (bounds) {

            let width = (bounds.maxX - bounds.minX) + LEAF_PADDING_X * 2;

            if (width < MIN_LEAF_WIDTH) width = MIN_LEAF_WIDTH;

            node.position = {
                x: bounds.minX - LEAF_PADDING_X,
                y: leafY
            };

            node.style = {
                width,
                height: leafHeight
            };

        } else {

            node.position = { x: 0, y: leafY };

            node.style = {
                width: MIN_LEAF_WIDTH,
                height: leafHeight
            };

        }

    });

    /*
    ------------------------
    8. Pack leaves
    ------------------------
    */

    const leafNodes = nodes.filter(n => n.type === 'leafGroupNode');

    leafNodes.sort((a, b) => {
        const aOrder = a.data?.orderKey as number | undefined;
        const bOrder = b.data?.orderKey as number | undefined;
        if (aOrder !== undefined && bOrder !== undefined) {
            return aOrder - bOrder;
        }
        return a.position.x - b.position.x;
    });

    let currentX = 0;

    leafNodes.forEach(leaf => {

        leaf.position.x = currentX;

        currentX += Number(leaf.style?.width ?? MIN_LEAF_WIDTH);

    });

    /*
    ------------------------
    9. Convert child positions
    ------------------------
    */

    nodes.forEach(node => {

        if (!node.parentId || node.type === 'leafGroupNode') return;

        const parent = nodes.find(n => n.id === node.parentId);

        if (!parent) return;

        const bounds = leafBounds[parent.id];

        const px = bounds ? bounds.minX - LEAF_PADDING_X : 0;

        node.position.x -= px;
        node.position.y -= leafY;

    });

    return { nodes, edges };
}