'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText, MapPin, User, Tag, Key, LayoutGrid, Calendar, FileType, Check, X, PanelRightClose, PlusCircle } from 'lucide-react';
import { AIMessage } from '@/types/ai';
import { frontendSchemas } from '@/lib/ai/frontend-schemas';
import { CreateEntityPrimitive } from './CreateEntityPrimitive';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProposalMenuProps {
    messages: AIMessage[];
    storyId: string;
    onProposalResolved: () => void;
    onClose: () => void;
}

export function ProposalMenu({ messages, storyId, onProposalResolved, onClose }: ProposalMenuProps) {
    const [selectedProposal, setSelectedProposal] = useState<{ messageId: string, idx: number, proposal: any, type: string } | null>(null);
    const [isResolving, setIsResolving] = useState(false);

    // Flatten all proposals from all messages in the current chat
    const allProposals = useMemo(() => {
        const proposals: { messageId: string, idx: number, proposal: any, type: string }[] = [];
        messages.forEach(msg => {
            if (msg.proposals && Array.isArray(msg.proposals)) {
                msg.proposals.forEach((prop, idx) => {
                    let type = prop.type || 'Card';
                    if (typeof type === 'string') {
                        type = type.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
                    }
                    proposals.push({
                        messageId: msg.id,
                        idx,
                        proposal: prop,
                        type
                    });
                });
            }
        });
        return proposals;
    }, [messages]);

    const handleAccept = async (data: any) => {
        if (!selectedProposal) return;
        setIsResolving(true);
        try {
            const { type, messageId, idx } = selectedProposal;
            let endpoint = '';
            switch (type) {
                case 'Card': endpoint = '/api/cards'; break;
                case 'Event': endpoint = '/api/events'; break;
                case 'Note': endpoint = '/api/notes'; break;
                case 'Story': endpoint = '/api/stories'; break;
                case 'CardRole': endpoint = '/api/card-roles'; break;
                case 'CardType': endpoint = '/api/card-types'; break;
                case 'EventType': endpoint = '/api/event-types'; break;
                case 'Attribute': endpoint = '/api/card-types/attributes'; break;
                default:
                    throw new Error(`Unknown entity type: ${type}`);
            }

            const payload = type === 'Story' ? data : { ...data, storyId };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to create entity');

            // Send request to remove this proposal from the database specifically
            await fetch(`/api/ai/messages/${messageId}/proposals/${idx}`, {
                method: 'DELETE'
            });

            toast.success(`Created ${type} successfully`);
            onProposalResolved(); // Refresh chat messages or internal state
            setSelectedProposal(null);
        } catch (error) {
            console.error(error);
            toast.error('Failed to create entity');
        } finally {
            setIsResolving(false);
        }
    };

    const handleReject = async (messageId: string, idx: number) => {
        try {
            await fetch(`/api/ai/messages/${messageId}/proposals/${idx}`, {
                method: 'DELETE'
            });
            toast.info('Proposal rejected');
            if (selectedProposal?.messageId === messageId && selectedProposal?.idx === idx) {
                setSelectedProposal(null);
            }
            onProposalResolved();
        } catch (error) {
            console.error(error);
            toast.error('Failed to remove proposal');
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'Card': return <User className="h-4 w-4" />;
            case 'Event': return <Calendar className="h-4 w-4" />;
            case 'Note': return <FileText className="h-4 w-4" />;
            case 'Attribute': return <Tag className="h-4 w-4" />;
            case 'CardType': return <LayoutGrid className="h-4 w-4" />;
            case 'EventType': return <FileType className="h-4 w-4" />;
            case 'CardRole': return <Key className="h-4 w-4" />;
            case 'Story': return <MapPin className="h-4 w-4" />;
            default: return <Sparkles className="h-4 w-4" />;
        }
    };

    if (allProposals.length === 0) {
        return null; // Don't render if no proposals exist
    }

    return (
        <div
            className="h-full w-80 border-l bg-surface/50 backdrop-blur-xl flex flex-col pointer-events-auto shadow-xl transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2 font-medium">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span>AI Proposals ({allProposals.length})</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onClose}>
                    <PanelRightClose className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                {selectedProposal ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground mb-2"
                            onClick={() => setSelectedProposal(null)}
                        >
                            &larr; Back to list
                        </Button>
                        <CreateEntityPrimitive
                            type={selectedProposal.type as any}
                            initialData={selectedProposal.proposal || {}}
                            schema={frontendSchemas[selectedProposal.type as keyof typeof frontendSchemas]}
                            onAccept={handleAccept}
                            onReject={() => handleReject(selectedProposal.messageId, selectedProposal.idx)}
                        />
                    </div>
                ) : (
                    <div className="space-y-2">
                        {allProposals.map((item) => (
                            <div
                                key={`${item.messageId}-${item.idx}`}
                                className="group flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-accent/5 hover:border-accent/40 cursor-pointer transition-colors"
                                onClick={() => setSelectedProposal(item)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        {getIconForType(item.type)}
                                        {item.proposal?.name || item.proposal?.title || 'Unnamed Entity'}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-background">
                                        {item.type}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 rounded-full hover:bg-destructive/20 hover:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReject(item.messageId, item.idx);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 rounded-full hover:bg-primary/20 hover:text-primary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProposal(item);
                                        }}
                                    >
                                        <PlusCircle className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
