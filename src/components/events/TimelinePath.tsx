import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listTLNodes, TLNode } from '@/lib/timeline-api';

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

    // Build map
    const nodeMap = useMemo(() => {
        const map = new Map<string, TLNode>();
        nodes.forEach(n => map.set(n.id, n));
        return map;
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
            // Only the current position (last item) displays the title
            if (index === path.length - 1) {
                return node.title ? `${node.name} - ${node.title}` : node.name;
            }

            // Ancestors display only the node name
            return node.name;
        }).join('  >  ');
    }, [timelineId, nodeMap]);

    if (!pathString) return null;

    return (
        <span className={`text-xs font-medium text-muted-foreground ${className}`}>
            {pathString}
        </span>
    );
}
