'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIChat } from '@/types/ai';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ChatHistoryProps {
    currentChatId: string | null;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void; // Kept for deletion logic relying on it
    isExpanded: boolean;
}

export function ChatHistory({ currentChatId, onSelectChat, onNewChat, isExpanded }: ChatHistoryProps) {
    const [chats, setChats] = useState<AIChat[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchChats = async () => {
        try {
            const response = await fetch('/api/ai/chats');
            if (response.ok) {
                const data = await response.json();
                setChats(data);
            }
        } catch (error) {
            console.error('Failed to fetch chats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchChats();
    }, [currentChatId]); // Refetch when chat changes to update order/titles

    const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation();
        try {
            const response = await fetch(`/api/ai/chats/${chatId}`, { method: 'DELETE' });
            if (response.ok) {
                setChats(prev => prev.filter(c => c.id !== chatId));
                if (currentChatId === chatId) {
                    onNewChat();
                }
                toast.success('Chat deleted');
            } else {
                toast.error('Failed to delete chat');
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
            toast.error('Failed to delete chat');
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-transparent overflow-hidden">

            <div className="flex-1 flex flex-col gap-1 overflow-y-auto px-2 py-2">

                {isLoading ? (
                    isExpanded && <div className="p-4 text-center text-xs text-muted-foreground italic">Loading...</div>
                ) : chats.length === 0 ? (
                    isExpanded && <div className="p-4 text-center text-xs text-muted-foreground italic">No history yet</div>
                ) : (
                    chats.map(chat => (
                        <div
                            key={chat.id}
                            className={cn(
                                "group flex items-center rounded-lg cursor-pointer transition-all duration-200 relative border border-transparent",
                                isExpanded ? "gap-3 p-2.5" : "justify-center p-2",
                                currentChatId === chat.id
                                    ? "bg-accent/10 border-accent/20 text-accent-foreground shadow-sm"
                                    : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => onSelectChat(chat.id)}
                            title={!isExpanded ? chat.title : undefined}
                        >
                            <MessageSquare className={cn(
                                "shrink-0 transition-colors",
                                isExpanded ? "h-4 w-4" : "h-5 w-5",
                                currentChatId === chat.id ? "text-primary" : "opacity-50 group-hover:opacity-80"
                            )} />

                            {isExpanded && (
                                <div className="flex flex-col items-start overflow-hidden flex-1 min-w-0 gap-0.5 animate-in fade-in duration-300">
                                    <span className="text-sm font-medium truncate w-full leading-tight">{chat.title}</span>
                                    <span className="text-[10px] opacity-60 truncate w-full">
                                        {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                            )}

                            {isExpanded && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all absolute right-1 top-2 hover:bg-destructive/20 hover:text-destructive scale-90 hover:scale-100"
                                    onClick={(e) => handleDeleteChat(e, chat.id)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
