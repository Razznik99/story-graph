import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listTLNodes, TLNode } from '@/lib/timeline-api';
import { buildIndex, getNodeOrder } from '../timeline/timeline-explorer-helpers';

interface TimelinePathProps {
    storyId: string;
    timelineId: string | null;
    className?: string;
}

export default function TimelinePath({ storyId, timelineId, className = '' }: TimelinePathProps) {
    // Fetch data (cached)
    const { data: nodes = [] } = useQuery({
        queryKey: ['tl', 'nodes', storyId],
        queryFn: () => listTLNodes(storyId),
        enabled: !!storyId,
        staleTime: 60 * 1000, // 1 minute
    });

    // Build map and index
    const { nodeMap, byParent } = useMemo(() => {
        const map = new Map<string, TLNode>();
        nodes.forEach(n => map.set(n.id, n));
        return { nodeMap: map, byParent: buildIndex(nodes) };
    }, [nodes]);

    // Construct path
    const pathString = useMemo(() => {
        if (!timelineId) return null;

        const path: TLNode[] = [];
        let curr = nodeMap.get(timelineId);

        while (curr) {
            path.unshift(curr);
            if (curr.parentId) {
                curr = nodeMap.get(curr.parentId);
            } else {
                curr = undefined;
            }
        }

        if (path.length === 0) return null;

        return path.map((node, index) => {
            const order = getNodeOrder(node.id, byParent, nodes);
            const nameWithOrder = `${node.name} ${order}`;

            // Only the current position (last item) displays the title
            if (index === path.length - 1) {
                return node.title ? `${nameWithOrder} - ${node.title}` : nameWithOrder;
            }

            // Ancestors display only the node name
            return nameWithOrder;
        }).join('  >  ');
    }, [timelineId, nodeMap, byParent, nodes]);

    if (!pathString) return null;

    return (
        <span className={`text-xs font-medium text-muted-foreground ${className}`}>
            {pathString}
        </span>
    );
}
