'use client';

import { X } from 'lucide-react';
import { STORY_STATUSES, LANGUAGES } from '@/domain/constants';
import GenrePicker from '@/components/GenrePicker';

type GenreMode = 'and' | 'or';

export interface StoryFilterState {
    q: string;
    genres: string[];
    excludeGenres: string[];
    genreMode: GenreMode;
    mediums: string[];
    status?: string | null;
    language?: string | null;
}

interface StoryFilterProps {
    value: StoryFilterState;
    onChange: (next: StoryFilterState) => void;
    availableMediums: string[];
}

export default function StoryFilter({
    value,
    onChange,
    availableMediums,
}: StoryFilterProps) {

    const toggleMedium = (medium: string) => {
        const next = value.mediums.includes(medium)
            ? value.mediums.filter(m => m !== medium)
            : [...value.mediums, medium];

        onChange({ ...value, mediums: next });
    };

    const toggleStatus = (status: string) => {
        const next = value.status === status ? null : status;
        onChange({ ...value, status: next });
    };

    return (
        <div className="bg-surface border border-border rounded-xl p-4 space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-4">Filters</h3>

                {/* GENRE MODE */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-text-secondary">Genre match</span>
                    <div className="flex bg-background border border-border rounded-lg overflow-hidden">
                        {(['or', 'and'] as GenreMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => onChange({ ...value, genreMode: mode })}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${value.genreMode === mode
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-text-tertiary hover:text-text-primary'
                                    }`}
                            >
                                {mode.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {/* INCLUDE GENRES */}
                <div>
                    <h4 className="text-sm font-medium mb-2">Include Genres</h4>
                    <GenrePicker
                        selected={value.genres}
                        onChange={(genres) => onChange({ ...value, genres })}
                    />
                </div>

                {/* EXCLUDE GENRES */}
                <div>
                    <h4 className="text-sm font-medium mb-2">Exclude Genres</h4>
                    <GenrePicker
                        selected={value.excludeGenres}
                        onChange={(genres) => onChange({ ...value, excludeGenres: genres })}
                    />
                </div>

                {/* STATUS */}
                <div>
                    <h4 className="text-sm font-medium mb-2">Status</h4>
                    <div className="flex flex-wrap gap-2">
                        {STORY_STATUSES.map(status => (
                            <button
                                key={status}
                                onClick={() => toggleStatus(status)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${value.status === status
                                    ? 'bg-accent text-accent-foreground border-accent'
                                    : 'border-border text-text-tertiary hover:text-text-primary hover:border-text-secondary'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* MEDIUM */}
                <div>
                    <h4 className="text-sm font-medium mb-2">Medium</h4>
                    <div className="flex flex-wrap gap-2">
                        {availableMediums.map(medium => (
                            <button
                                key={medium}
                                onClick={() => toggleMedium(medium)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${value.mediums.includes(medium)
                                    ? 'bg-accent text-accent-foreground border-accent'
                                    : 'border-border text-text-tertiary hover:text-text-primary hover:border-text-secondary'
                                    }`}
                            >
                                {medium}
                            </button>
                        ))}
                    </div>
                </div>

                {/* LANGUAGE */}
                <div>
                    <h4 className="text-sm font-medium mb-2">Language</h4>
                    <select
                        value={value.language || ''}
                        onChange={(e) => onChange({ ...value, language: e.target.value || null })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-accent outline-none"
                    >
                        <option value="">Any Language</option>
                        {LANGUAGES.map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Reset Filters */}
            <button
                onClick={() => onChange({
                    q: value.q,
                    genres: [],
                    excludeGenres: [],
                    genreMode: 'or',
                    mediums: [],
                    status: null,
                    language: null
                })}
                className="w-full py-2 text-sm text-text-tertiary hover:text-text-primary transition-colors border-t border-border mt-2"
            >
                Reset Filters
            </button>
        </div>
    );
}
