import { Search, Hash, SearchX } from 'lucide-react';

interface StoryFiltersProps {
    search: string;
    onSearchChange: (val: string) => void;
    // genres: string[];
    // onGenreToggle: (genre: string) => void;
    placeholder?: string;
}

export default function StoryFilters({ search, onSearchChange, placeholder }: StoryFiltersProps) {
    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6 focus-within:ring-accent">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
                    {search.startsWith('#') ? <Hash className="w-4 h-4 text-accent" /> : <Search className="w-4 h-4 text-accent" />}
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={placeholder || "Search stories, #tags, or paste UUID..."}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                />
                {search && (
                    <button
                        onClick={() => onSearchChange('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-text-primary"
                    >
                        <SearchX className="w-4 h-4 text-accent" />
                    </button>
                )}
            </div>

            {/* Future: Genre filters could go here as a dropdown or horizontal scroll list */}
        </div>
    );
}
