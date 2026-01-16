'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type GenreMode = 'and' | 'or';

export interface StoryFilterState {
    q: string;
    genres: string[];
    excludeGenres: string[];
    genreMode: GenreMode;
    mediums: string[];
}

interface StoryFilterPanelProps {
    value: StoryFilterState;
    onChange: (next: StoryFilterState) => void;
    availableGenres: string[];
    availableMediums: string[];
}

export default function StoryFilterPanel({
    value,
    onChange,
    availableGenres,
    availableMediums,
}: StoryFilterPanelProps) {

    const toggleIncludeGenre = (genre: string) => {
        if (value.excludeGenres.includes(genre)) return;

        const next = value.genres.includes(genre)
            ? value.genres.filter(g => g !== genre)
            : [...value.genres, genre];

        onChange({ ...value, genres: next });
    };

    const toggleExcludeGenre = (genre: string) => {
        const isExcluded = value.excludeGenres.includes(genre);

        const nextExclude = isExcluded
            ? value.excludeGenres.filter(g => g !== genre)
            : [...value.excludeGenres, genre];

        const nextInclude = value.genres.filter(g => g !== genre);

        onChange({
            ...value,
            excludeGenres: nextExclude,
            genres: nextInclude,
        });
    };
    const toggleMedium = (medium: string) => {
        const next = value.mediums.includes(medium)
            ? value.mediums.filter(m => m !== medium)
            : [...value.mediums, medium];

        onChange({ ...value, mediums: next });
    };



    return (
        <div className="bg-surface border border-border rounded-xl p-4 mb-6 space-y-5">

            {/* SEARCH */}
            <input
                value={value.q}
                onChange={e => onChange({ ...value, q: e.target.value })}
                placeholder="Search title, synopsis, #tag, or UUID"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent outline-none"
            />

            {/* GENRE MODE */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Genre match</span>
                <div className="flex bg-background border border-border rounded-lg overflow-hidden">
                    {(['or', 'and'] as GenreMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => onChange({ ...value, genreMode: mode })}
                            className={`px-3 py-1.5 text-sm font-medium ${value.genreMode === mode
                                ? 'bg-accent text-accent-foreground'
                                : 'text-text-tertiary'
                                }`}
                        >
                            {mode.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* INCLUDE GENRES */}
            <FilterGroup
                title="Include genres"
                items={availableGenres}
                active={value.genres}
                disabledItems={value.excludeGenres}
                onToggle={toggleIncludeGenre}
            />

            {/* EXCLUDE GENRES */}
            <FilterGroup
                title="Exclude genres"
                items={availableGenres}
                active={value.excludeGenres}
                onToggle={toggleExcludeGenre}
                variant="danger"
            />

            {/* MEDIUM */}
            <FilterGroup
                title="Medium"
                items={availableMediums}
                active={value.mediums}
                onToggle={toggleMedium}
            />
        </div>
    );
}

function FilterGroup({
    title,
    items,
    active,
    disabledItems = [],
    onToggle,
    variant = 'default',
}: {
    title: string;
    items: string[];
    active: string[];
    disabledItems?: string[];
    onToggle: (item: string) => void;
    variant?: 'default' | 'danger';
}) {
    return (
        <div>
            <h4 className="text-sm font-medium mb-2">{title}</h4>
            <div className="flex flex-wrap gap-2">
                {items.map(item => {
                    const isActive = active.includes(item);
                    const isDisabled = disabledItems.includes(item);

                    return (
                        <button
                            key={item}
                            disabled={isDisabled}
                            onClick={() => !isDisabled && onToggle(item)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition
                                ${isDisabled
                                    ? 'opacity-40 cursor-not-allowed border-border'
                                    : isActive
                                        ? variant === 'danger'
                                            ? 'bg-red-500 text-white border-red-500'
                                            : 'bg-accent text-accent-foreground border-accent'
                                        : 'border-border text-text-tertiary hover:text-text-primary'
                                }`}
                        >
                            {item}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
