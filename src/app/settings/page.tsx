'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
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
    // { id: 'analysis', name: 'Analysis' },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('story');

    return (
        <div className="min-h-screen bg-background p-8">
            <h1 className="text-2xl font-bold mb-6 text-text-primary">Settings</h1>

            {/* Tabs */}
            <div className="border-b border-border mb-6">
                <nav className="-mb-px flex space-x-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
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
            <div className="max-w-3xl">
                {activeTab === 'story' && (
                    <StoryTab />
                )}

                {activeTab === 'theme' && (
                    <ThemeTab />
                )}

                {activeTab === 'cards' && (
                    <CardsTab />
                )}

                {activeTab === 'events' && (
                    <EventsTab />
                )}

                {activeTab === 'timeline' && (
                    <TimelineTab />
                )}

                {activeTab !== 'story' && activeTab !== 'theme' && activeTab !== 'cards' && activeTab !== 'events' && activeTab !== 'timeline' && (
                    <div className="bg-surface p-6 rounded-lg border border-border">
                        <h2 className="text-lg font-semibold mb-2 text-text-primary">
                            {tabs.find((t) => t.id === activeTab)?.name} Settings
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
