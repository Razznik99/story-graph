'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { STORY_GENRES } from '@/domain/constants';

interface GenrePickerProps {
    selected: string[];
    onChange: (genres: string[]) => void;
}

export default function GenrePicker({ selected, onChange }: GenrePickerProps) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredGenres = STORY_GENRES.filter(g =>
        g.toLowerCase().includes(search.toLowerCase()) &&
        !selected.includes(g)
    );

    const addGenre = (genre: string) => {
        onChange([...selected, genre]);
        setSearch('');
        setIsOpen(false);
    };

    const removeGenre = (genre: string) => {
        onChange(selected.filter(g => g !== genre));
    };

    return (
        <div className="space-y-3" ref={wrapperRef}>
            {/* Selected Chips */}
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {selected.map(genre => (
                        <span key={genre} className="px-3 py-1 bg-accent/10 text-accent border border-accent/20 rounded-full flex items-center gap-1 text-sm font-medium animate-in fade-in zoom-in duration-200">
                            {genre}
                            <button
                                type="button"
                                onClick={() => removeGenre(genre)}
                                className="hover:text-accent-foreground transition-colors p-0.5 rounded-full hover:bg-accent/20"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Input & Dropdown */}
            <div className="relative">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
                        <Search className="h-4 w-4" />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder="Search genres..."
                        className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                    />
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-xl shadow-lg max-h-[200px] overflow-y-auto">
                        {filteredGenres.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-text-tertiary text-center">
                                No matching genres
                            </div>
                        ) : (
                            filteredGenres.map(genre => (
                                <button
                                    key={genre}
                                    type="button"
                                    onClick={() => addGenre(genre)}
                                    className="w-full text-left px-4 py-2 hover:bg-surface-hover flex justify-between items-center group transition-colors"
                                >
                                    <span className="text-sm font-medium text-text-primary">{genre}</span>
                                </button>
                            ))
                        )}
                        {/* Show already selected in grey/disabled at bottom? No, simpler to just hide them from list as implemented. */}
                    </div>
                )}
            </div>
        </div>
    );
}
