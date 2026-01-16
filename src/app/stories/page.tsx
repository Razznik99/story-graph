'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import StoryList from '@/components/stories/StoryList';
import StoryFilters from '@/components/stories/StoryFilters';
import StoryViewer from '@/components/stories/StoryViewer';
import CreateStoryModal from '@/components/stories/CreateStoryModal';
import StoryFilterPanel from '@/components/stories/StoryFilterPanel';
import { StoryFilterState } from '@/components/stories/StoryFilterPanel';
import { STORY_GENRES, STORY_MEDIUM } from '@/domain/constants';

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export default function StoriesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('my-stories');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 500);

    const [stories, setStories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedStory, setSelectedStory] = useState<any | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isViewerOpen, setIsViewerOpen] = useState(false);

    const [filters, setFilters] = useState<StoryFilterState>({
        q: '',
        genres: [],
        excludeGenres: [],
        genreMode: 'or' as 'and' | 'or',
        mediums: [],
    });

    // Initial load handling (e.g. redirected from login)
    useEffect(() => {
        const newStoryId = searchParams.get('new');
        if (newStoryId) {
            router.replace('/stories');
        }
    }, [searchParams, router]);

    // Data Fetching
    useEffect(() => {
        const fetchStories = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.set('variant', activeTab);
                if (debouncedSearch) params.set('q', debouncedSearch);

                const res = await fetch(`/api/stories?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setStories(data);
                }
            } catch (error) {
                console.error('Failed to fetch stories', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStories();
    }, [activeTab, debouncedSearch]);

    const handleStoryClick = (story: any) => {
        setSelectedStory(story);
        setIsViewerOpen(true);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">Stories</h1>
                    <p className="text-text-secondary mt-1">Manage your narratives and discover new worlds.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-surface border border-border rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('my-stories')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'my-stories'
                                ? 'bg-accent text-accent-foreground shadow-sm'
                                : 'text-text-tertiary hover:text-text-primary'
                                }`}
                        >
                            My Stories
                        </button>
                        <button
                            onClick={() => setActiveTab('public')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'public'
                                ? 'bg-accent text-accent-foreground shadow-sm'
                                : 'text-text-tertiary hover:text-text-primary'
                                }`}
                        >
                            Find Stories
                        </button>
                    </div>
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="group bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-1.5 h-auto"
                    >
                        <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                        Create Story
                    </Button>
                </div>
            </div>

            <StoryFilters
                search={search}
                onSearchChange={setSearch}
                placeholder={activeTab === 'public' ? "Search by title, synopsis, #tag, or UUID..." : "Search your stories..."}
            />

            <StoryList
                stories={stories}
                isLoading={loading}
                variant={activeTab === 'my-stories' ? 'my-stories' : 'public'}
                onStoryClick={handleStoryClick}
            />

            <CreateStoryModal
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />

            <StoryViewer
                story={selectedStory}
                open={isViewerOpen}
                onOpenChange={setIsViewerOpen}
            />
            {activeTab === 'public' && (
                <StoryFilterPanel
                    value={filters}
                    onChange={setFilters}
                    availableGenres={[...STORY_GENRES]}
                    availableMediums={[...STORY_MEDIUM]}
                />
            )}
        </div>


    );

}
