import { Panel, useReactFlow, useNodes } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Trash2, PlusCircle, GitCommitHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CanvasDock({
    unconnectedNodes,
    onOpenWizard,
    onRemoveNode
}: {
    unconnectedNodes: any[]
    onOpenWizard: (eventId: string) => void
    onRemoveNode: (nodeId: string) => void
}) {

    const { screenToFlowPosition } = useReactFlow();
    const nodes = useNodes();

    const [collapsed, setCollapsed] = useState(false);
    const [activeLeafId, setActiveLeafId] = useState<string | null>(null);

    const leafNodes = useMemo(() => {
        return nodes.filter(n => n.type === "leafGroupNode");
    }, [nodes]);

    useEffect(() => {

        const updateActiveLeaf = () => {
            const flowEl = document.querySelector('.react-flow');
            let screenX = window.innerWidth / 2;
            let screenY = window.innerHeight / 2;

            if (flowEl) {
                const rect = flowEl.getBoundingClientRect();
                screenX = rect.left + rect.width / 2;
                screenY = rect.top + rect.height / 2;
            }

            const world = screenToFlowPosition({ x: screenX, y: screenY });

            const found = leafNodes.find(l => {
                const w = Number(l.style?.width ?? (l as any).measured?.width ?? 0);
                const h = Number(l.style?.height ?? (l as any).measured?.height ?? 0);

                return (
                    world.x >= l.position.x &&
                    world.x <= l.position.x + w &&
                    world.y >= l.position.y &&
                    world.y <= l.position.y + h
                );
            });

            setActiveLeafId(prev => {
                if (found) return found.id;
                if (!prev && leafNodes[0]) return leafNodes[0].id;
                return prev;
            });
        };

        const interval = setInterval(updateActiveLeaf, 120);

        return () => clearInterval(interval);

    }, [leafNodes, screenToFlowPosition]);

    const activeLeaf = leafNodes.find(l => l.id === activeLeafId);

    if (!activeLeaf) return null;

    const leafEvents = unconnectedNodes.filter(
        n => n.leafId === activeLeaf.id
    );

    return (
        <Panel
            position="bottom-center"
            className="z-50 w-[420px] mb-5 rounded-xl border border-border bg-background shadow-xl"
        >

            {/* HEADER */}

            <div
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center justify-between px-4 py-3 cursor-pointer border-b border-border bg-surface hover:bg-surface-hover transition"
            >

                <div className="font-semibold text-sm truncate">

                    {activeLeaf.data?.orderKey
                        ? `${activeLeaf.data.orderKey}. `
                        : ""}

                    {String(activeLeaf.data?.label ?? "Leaf")}

                </div>

                {collapsed
                    ? <ChevronUp size={16} />
                    : <ChevronDown size={16} />}

            </div>

            {!collapsed && (

                <div className="max-h-[220px] overflow-y-auto">

                    {leafEvents.length === 0 && (

                        <div className="p-6 text-xs text-muted-foreground text-center italic">
                            No unplaced events
                        </div>

                    )}

                    {leafEvents.map(node => (

                        <div
                            key={node.id}
                            className="flex items-center justify-between px-3 py-2 border-b border-border hover:bg-surface-hover"
                        >

                            <div className="truncate text-sm font-medium flex-1">
                                {node.event?.title ?? "Untitled Event"}
                            </div>

                            <div className="flex gap-1">

                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    onClick={() => onOpenWizard(node.eventId)}
                                    title="Place in Canvas"
                                >
                                    <GitCommitHorizontal size={16} />
                                </Button>

                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => onRemoveNode(node.id)}
                                    title="Remove from Canvas"
                                >
                                    <Trash2 size={16} />
                                </Button>

                            </div>

                        </div>

                    ))}

                </div>

            )}

        </Panel>
    );
}