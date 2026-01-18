'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import StoryList from '@/components/stories/StoryList';
import StorySearch from '@/components/stories/StorySearch';
import StoryViewer from '@/components/stories/StoryViewer';
import CreateStoryModal from '@/components/stories/CreateStoryModal';
import StoryFilter from '@/components/stories/StoryFilter';
import { StoryFilterState } from '@/components/stories/StoryFilter';
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

    const { data: session } = useSession();
    const [selectedStoryForEdit, setSelectedStoryForEdit] = useState<any | null>(null);

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

                // Apply Filters
                if (filters.genres.length > 0) {
                    filters.genres.forEach(g => params.append('genre', g));
                }
                if (filters.excludeGenres.length > 0) {
                    filters.excludeGenres.forEach(g => params.append('excludeGenre', g));
                }
                if (filters.mediums.length > 0) {
                    filters.mediums.forEach(m => params.append('medium', m));
                }
                if (filters.status) params.set('status', filters.status);
                if (filters.language) params.set('language', filters.language);
                if (filters.genreMode) params.set('genreMode', filters.genreMode);

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
    }, [activeTab, debouncedSearch, filters]);

    const handleStoryClick = (story: any) => {
        setSelectedStory(story);
        setIsViewerOpen(true);
    };

    const handleEditStory = (story: any) => {
        setSelectedStoryForEdit(story);
        setIsViewerOpen(false); // Close viewer
        setIsCreateOpen(true);
    };

    // Reset edit story when modal closes
    useEffect(() => {
        if (!isCreateOpen) setSelectedStoryForEdit(null);
    }, [isCreateOpen]);

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
                        onClick={() => {
                            setSelectedStoryForEdit(null);
                            setIsCreateOpen(true);
                        }}
                        className="group bg-accent hover:bg-accent/90 text-accent-foreground px-4 py-1.5 h-auto"
                    >
                        <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                        Create Story
                    </Button>
                </div>
            </div>

            {activeTab === 'public' ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-3 order-2 lg:order-1">
                        <StorySearch
                            search={search}
                            onSearchChange={setSearch}
                            placeholder="Search by title, synopsis, #tag, or UUID..."
                        />
                        <StoryList
                            stories={stories}
                            isLoading={loading}
                            variant="public"
                            onStoryClick={handleStoryClick}
                        />
                    </div>
                    <div className="lg:col-span-1 order-1 lg:order-2">
                        <div className="sticky top-4">
                            <StoryFilter
                                value={filters}
                                onChange={setFilters}
                                availableMediums={[...STORY_MEDIUM]}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <StorySearch
                        search={search}
                        onSearchChange={setSearch}
                        placeholder="Search your stories..."
                    />
                    <StoryList
                        stories={stories}
                        isLoading={loading}
                        variant="my-stories"
                        onStoryClick={handleStoryClick}
                    />
                </>
            )}

            <CreateStoryModal
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                story={selectedStoryForEdit}
                key={selectedStoryForEdit?.id || 'new'}
            />

            <StoryViewer
                story={selectedStory}
                open={isViewerOpen}
                onOpenChange={setIsViewerOpen}
                currentUserId={session?.user?.id}
                onEdit={handleEditStory}
            />
        </div>
    );
}
