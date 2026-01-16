import StoryCard from './StoryCard';
import { Ghost } from 'lucide-react';

interface StoryListProps {
    stories: any[];
    isLoading: boolean;
    variant: 'my-stories' | 'public';
    onStoryClick: (story: any) => void;
}

export default function StoryList({ stories, isLoading, variant, onStoryClick }: StoryListProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="aspect-[3/4] bg-surface border border-border rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (stories.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
                <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mb-4">
                    <Ghost className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-lg font-medium text-text-secondary mb-1">No stories found</h3>
                <p className="max-w-xs text-center text-sm">
                    {variant === 'my-stories'
                        ? "You haven't created or joined any stories yet."
                        : "Try adjusting your search terms or filters."}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {stories.map((story) => (
                <StoryCard
                    key={story.id}
                    story={story}
                    variant={variant}
                    onClick={() => onStoryClick(story)}
                />
            ))}
        </div>
    );
}
