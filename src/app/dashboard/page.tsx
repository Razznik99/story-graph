'use client';

import { useStoryStore } from '@/store/useStoryStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
    const router = useRouter();
    const selectedStoryId = useStoryStore((state) => state.selectedStoryId);
    const [story, setStory] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!selectedStoryId) {
            // No story selected, redirect to stories
            router.replace('/stories');
            return;
        }

        // Fetch story details? Or we trust it exists.
        // Let's fetch to show title.
        fetch(`/api/stories?medium=my-stories`) // This fetches all my stories. Ideally we have GET /api/stories/[id]
            .then(res => res.json())
            .then(data => {
                // Find ours
                const found = data.find((s: any) => s.id === selectedStoryId);
                if (found) {
                    setStory(found);
                } else {
                    // Try public/lookup via q=ID?
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));

    }, [selectedStoryId, router]);

    return (
        <div className="container mx-auto p-8">
            {loading ? (
                <div>Loading dashboard...</div>
            ) : story ? (
                <div>
                    <h1 className="text-4xl font-bold text-text-primary mb-2">{story.title}</h1>
                    <p className="text-text-secondary">{story.synopsis || "No synopsis"}</p>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Dashboard Widgets Placeholder */}
                        <div className="bg-surface border border-border p-6 rounded-xl shadow-sm">
                            <h3 className="font-semibold mb-2">Recent Activity</h3>
                            <p className="text-sm text-text-tertiary">No recent changes.</p>
                        </div>
                        <div className="bg-surface border border-border p-6 rounded-xl shadow-sm">
                            <h3 className="font-semibold mb-2">Story Stats</h3>
                            <p className="text-sm text-text-tertiary">0 Cards • 0 Events</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div>Story not found or loading...</div>
            )}
        </div>
    );
}
