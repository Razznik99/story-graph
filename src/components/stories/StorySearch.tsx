import { Search, Hash, SearchX, Tag as TagIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface GlobalTag {
    id: string;
    name: string;
    usageCount: number;
}

interface StorySearchProps {
    search: string;
    onSearchChange: (val: string) => void;
    placeholder?: string;
}

export default function StorySearch({ search, onSearchChange, placeholder }: StorySearchProps) {
    const [tags, setTags] = useState<GlobalTag[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/api/global-tags')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setTags(data);
            })
            .catch(err => console.error('Failed to load tags', err));
    }, []);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchTerm = search.replace(/^#/, '').toLowerCase();

    // Filter tags: match name, exclude if already exact match (optional)
    // If search is empty, maybe show top tags? Or none? "recommend tags based on popularity"
    const filteredTags = searchTerm
        ? tags.filter(t => t.name.toLowerCase().includes(searchTerm))
        : tags.slice(0, 10); // Show top 10 if empty

    const handleSelectTag = (tagName: string) => {
        onSearchChange('#' + tagName);
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && isOpen && filteredTags.length > 0) {
            e.preventDefault();
            handleSelectTag(filteredTags[0].name);
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6 focus-within:ring-accent" ref={wrapperRef}>
            <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
                    {search.startsWith('#') ? <Hash className="w-4 h-4 text-accent" /> : <Search className="w-4 h-4 text-accent" />}
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        onSearchChange(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || "Search stories, #tags, or paste UUID..."}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                />
                {search && (
                    <button
                        onClick={() => {
                            onSearchChange('');
                            setIsOpen(false);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-text-primary"
                    >
                        <SearchX className="w-4 h-4 text-accent" />
                    </button>
                )}

                {/* Tag Autocomplete Dropdown */}
                {isOpen && search.startsWith('#') && filteredTags.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-xl shadow-lg max-h-[300px] overflow-y-auto">
                        <div className="px-3 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wider bg-surface-hover/50 sticky top-0 backdrop-blur-sm">
                            Suggested Tags
                        </div>
                        {filteredTags.map((tag, idx) => (
                            <button
                                key={tag.name}
                                onClick={() => handleSelectTag(tag.name)}
                                className={`w-full text-left px-4 py-2 hover:bg-surface-hover flex justify-between items-center group transition-colors
                                    ${idx === 0 ? 'bg-accent/5' : ''}
                                `}
                            >
                                <span className="flex items-center gap-2">
                                    <Hash className="w-3.5 h-3.5 text-accent/70" />
                                    <span className="text-sm font-medium text-text-primary">
                                        {tag.name}
                                    </span>
                                </span>
                                <span className="text-xs text-text-tertiary flex items-center gap-1">
                                    {tag.usageCount} uses
                                    {idx === 0 && <span className="hidden group-hover:inline-block ml-2 text-[10px] border border-border px-1 rounded">Enter</span>}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
