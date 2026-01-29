'use client';

import React from 'react';
import { create } from 'zustand';
import EventViewer from '@/components/events/EventViewer';
import EventEditor from '@/components/events/EventEditor';
import CardViewer from '@/components/cards/CardViewer';
import CardEditor from '@/components/cards/CardEditor';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type TabKind = 'event' | 'card' | 'editor';

interface DockTab {
    id: string; // unique tab id (e.g. event-<id>, card-<id>, editor-<id>)
    kind: TabKind;
    entityId: string; // the event or card id
    title: string;
    content: React.ReactNode;
}

interface DockStore {
    tabs: DockTab[];
    activeTab: string | null;
    addTab: (tab: DockTab) => void;
    removeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    updateTab: (id: string, patch: Partial<DockTab>) => void;
}

const useDockStore = create<DockStore>((set, get) => ({
    tabs: [],
    activeTab: null,
    addTab: (tab) => set((s) => {
        if (s.tabs.some(t => t.id === tab.id)) {
            return { activeTab: tab.id }; // just Switch to it
        }
        return { tabs: [...s.tabs, tab], activeTab: tab.id };
    }),
    removeTab: (id) => {
        set((s) => {
            const tabs = s.tabs.filter((t) => t.id !== id);
            const activeTab = s.activeTab === id ? (tabs[tabs.length - 1]?.id ?? null) : s.activeTab;
            return { tabs, activeTab };
        });
    },
    setActiveTab: (id) => set(() => ({ activeTab: id })),
    updateTab: (id, patch) => set((s) => ({ tabs: s.tabs.map(t => t.id === id ? { ...t, ...patch } : t) })),
}));

// Simple fetch helpers that tolerate array or single-object responses
async function fetchSingle<T = any>(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) return data[0] as T;
    return data as T;
}

export const useTimelineDock = (storyId?: string) => {
    const { tabs, addTab, setActiveTab, updateTab, removeTab } = useDockStore();
    const [allCards, setAllCards] = React.useState<any[]>([]);
    const [allEvents, setAllEvents] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (storyId) {
            fetch(`/api/cards?storyId=${storyId}`).then(res => res.json()).then(setAllCards).catch(console.error);
            fetch(`/api/events?storyId=${storyId}`).then(res => res.json()).then(setAllEvents).catch(console.error);
        }
    }, [storyId]);

    const openEventById = async (id: string) => {
        const tabId = `event-${id}`;
        const existing = tabs.find((t) => t.id === tabId);
        if (existing) {
            setActiveTab(tabId);
            return;
        }

        // Add placeholder tab
        addTab({ id: tabId, kind: 'event', entityId: id, title: `Event...`, content: <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div> });

        try {
            const base = `/api/events?id=${encodeURIComponent(id)}`;
            // Always fetch fresh
            const url = storyId ? `${base}&storyId=${encodeURIComponent(storyId)}` : base;
            const event = await fetchSingle(url);

            // Render EventViewer inline inside the dock
            updateTab(tabId, {
                title: event?.title ?? `Event`,
                content: (
                    <div className="h-full w-full" key={tabId}>
                        <EventViewer
                            event={event}
                            onClose={() => removeTab(tabId)}
                            onEdit={() => openEventEditorById(id)}
                            onOpenEvent={(eventId) => openEventById(eventId)}
                            onOpenCard={(cardId) => openCardById(cardId)}
                            inline={true}
                        />
                    </div>
                ),
            });
        } catch (err) {
            updateTab(tabId, { content: <div className="p-4 text-error" key={tabId}>Failed to load event</div>, title: `Error` });
        }
    };

    const openCardById = async (id: string) => {
        const tabId = `card-${id}`;
        const existing = tabs.find((t) => t.id === tabId);
        if (existing) {
            setActiveTab(tabId);
            return;
        }

        addTab({ id: tabId, kind: 'card', entityId: id, title: `Card...`, content: <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div> });

        try {
            const baseC = `/api/cards?id=${encodeURIComponent(id)}`;
            const urlC = storyId ? `${baseC}&storyId=${encodeURIComponent(storyId)}` : baseC;
            const card = await fetchSingle(urlC);
            updateTab(tabId, {
                title: card?.name ?? `Card`,
                content: (
                    <div className="h-full w-full" key={tabId}>
                        <CardViewer
                            card={card}
                            onEdit={() => openCardEditorById(id)}
                            onClose={() => removeTab(tabId)}
                            inline={true}
                            onSwitchVersion={(newId) => openCardById(newId)}
                        />
                    </div>
                ),
            });
        } catch (err) {
            updateTab(tabId, { content: <div className="p-4 text-error" key={tabId}>Failed to load card</div>, title: `Error` });
        }
    };

    const openEventEditorById = async (id: string) => {
        const tabId = `editor-${id}`;
        addTab({ id: tabId, kind: 'editor', entityId: id, title: `Edit Event...`, content: <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div> });

        try {
            const baseE = `/api/events?id=${encodeURIComponent(id)}`;
            const urlE = storyId ? `${baseE}&storyId=${encodeURIComponent(storyId)}` : baseE;
            const ev = await fetchSingle(urlE);
            updateTab(tabId, {
                title: ev?.title ? `Edit ${ev.title}` : `Edit Event`,
                content: (
                    <EventEditor
                        key={tabId}
                        storyId={ev.storyId ?? storyId ?? ''}
                        event={ev}
                        onClose={() => removeTab(tabId)}
                        onDelete={() => removeTab(tabId)}
                        inline={true}
                    />
                ),
            });
        } catch (err) {
            updateTab(tabId, { content: <div className="p-4 text-error" key={tabId}>Failed to load editor</div>, title: `Error` });
        }
    };

    const openCardEditorById = async (id: string) => {
        const tabId = `editor-card-${id}`;
        addTab({ id: tabId, kind: 'editor', entityId: id, title: `Edit Card...`, content: <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div> });

        try {
            const baseC = `/api/cards?id=${encodeURIComponent(id)}`;
            const urlC = storyId ? `${baseC}&storyId=${encodeURIComponent(storyId)}` : baseC;
            const card = await fetchSingle(urlC);
            updateTab(tabId, {
                title: card?.name ? `Edit ${card.name}` : `Edit Card`,
                content: (
                    <CardEditor
                        key={tabId}
                        storyId={card.storyId ?? storyId ?? ''}
                        card={card}
                        onClose={() => removeTab(tabId)}
                        inline={true}
                        onDelete={() => removeTab(tabId)}
                    />
                ),
            });
        } catch (err) {
            updateTab(tabId, { content: <div className="p-4 text-error" key={tabId}>Failed to load editor</div>, title: `Error` });
        }
    };

    return { openEventById, openCardById, openEventEditorById, openCardEditorById };
};

export function TimelineDock() {
    const { tabs, activeTab, removeTab, setActiveTab } = useDockStore();

    if (!tabs || tabs.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-sm text-text-muted bg-surface/50">
                <div className="text-center p-6">
                    <h3 className="font-semibold text-text-primary mb-1">Timeline Dock</h3>
                    <p>Select an event or card to manage it here.</p>
                </div>
            </div>
        );
    }

    const activeContent = tabs.find((t) => t.id === activeTab)?.content;

    return (
        <div className="flex flex-col h-full bg-surface border-l border-border shadow-inner">
            <div className="flex flex-nowrap overflow-x-auto border-b border-border bg-surface-2/50 shrink-0">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={cn(
                            "group flex items-center px-4 py-2 text-sm border-r border-border/50 cursor-pointer min-w-[120px] max-w-[200px] select-none transition-colors",
                            activeTab === tab.id
                                ? "bg-surface text-accent font-medium shadow-sm ring-1 ring-inset ring-border/0 border-b-transparent -mb-px z-10"
                                : "hover:bg-surface-2 text-text-secondary hover:text-text-primary"
                        )}
                        onClick={() => setActiveTab(tab.id)}
                        title={tab.title}
                    >
                        <span className="truncate flex-1 mr-2">{tab.title}</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTab(tab.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-all"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex overflow-y-auto bg-surface">
                {activeContent}
            </div>
        </div>
    );
}
