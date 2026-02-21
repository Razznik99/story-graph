export interface AIChat {
    id: string;
    title: string;
    userId: string;
    storyId?: string | null;
    createdAt: string;
    updatedAt: string;
    _count?: {
        messages: number;
    }
}

export interface AIMessage {
    id: string;
    chatId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: any;
    createdAt: string;
}

export interface ContextReference {
    id: string;
    type: 'card' | 'event' | 'note' | 'timeline';
    name: string;
    subtitle?: string;
}
