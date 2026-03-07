'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ThemeTab from '@/components/settings/ThemeTab';
import CardsTab from '@/components/settings/CardsTab';
import StoryTab from '@/components/settings/StoryTab';
import EventsTab from '@/components/settings/EventsTab';
import TimelineTab from '@/components/settings/TimelineTab';

const tabs = [
    { id: 'story', name: 'Story' },
    { id: 'theme', name: 'Theme' },
    { id: 'cards', name: 'Cards' },
    { id: 'events', name: 'Events' },
    { id: 'timeline', name: 'Timeline' },
];

function SettingsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('story');

    useEffect(() => {
        const tab = searchParams?.get('tab');
        if (tab && tabs.some(t => t.id === tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        router.replace(`?tab=${tabId}`);
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <h1 className="text-2xl font-bold mb-6 text-text-primary">Settings</h1>

            {/* Tabs */}
            <div className="border-b border-border mb-6">
                <nav className="-mb-px flex space-x-6 overflow-x-auto scroller-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`py-2 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id
                                ? 'text-accent border-accent'
                                : 'text-text-secondary border-transparent hover:text-text-primary hover:border-text-secondary'
                                }`}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-300">
                {activeTab === 'story' && <StoryTab />}
                {activeTab === 'theme' && <ThemeTab />}
                {activeTab === 'cards' && <CardsTab />}
                {activeTab === 'events' && <EventsTab />}
                {activeTab === 'timeline' && <TimelineTab />}

                {!tabs.some(t => t.id === activeTab) && (
                    <div className="bg-surface p-6 rounded-lg border border-border">
                        <h2 className="text-lg font-semibold mb-2 text-text-primary">
                            Feature Not Available
                        </h2>
                        <p className="text-text-secondary">
                            This section will be implemented in a future update.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background p-8 opacity-50"><h1 className="text-2xl font-bold mb-6 text-text-primary">Settings</h1></div>}>
            <SettingsContent />
        </Suspense>
    );
}
