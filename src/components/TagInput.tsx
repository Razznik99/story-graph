'use client';

import { useState, useEffect, useRef } from 'react';
import { Hash, X } from 'lucide-react';

type TagInputProps = {
    value: string[];
    onChange: (tags: string[]) => void;
    storyId?: string; // If provided, fetches story tags. If not, fetches global tags.
    placeholder?: string;
};

export default function TagInput({ value, onChange, storyId, placeholder = "Add a tag..." }: TagInputProps) {
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState<{ name: string; usageCount: number }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchTags = async () => {
            const url = storyId
                ? `/api/tags?storyId=${storyId}`
                : `/api/global-tags`;

            try {
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setSuggestions(data);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch tags', error);
            }
        };

        fetchTags();
    }, [storyId]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addTag = (tagToAdd: string) => {
        let tag = tagToAdd.trim();
        if (!tag) return;

        // Ensure starts with # and lowercase
        if (!tag.startsWith('#')) tag = `#${tag}`;
        tag = tag.toLowerCase();

        if (!value.includes(tag)) {
            onChange([...value, tag]);
        }
        setInput('');
        setShowSuggestions(false);
    };

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter(t => t !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(input);
        }
    };

    const filteredSuggestions = suggestions
        .filter(s => s.name.toLowerCase().includes(input.toLowerCase()) && !value.includes(s.name))
        .slice(0, 5); // Limit limit for UI

    return (
        <div className="space-y-3" ref={wrapperRef}>
            <div className="flex gap-2 relative">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Hash className="h-4 w-4 text-text-tertiary" />
                    </div>
                    <input
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                    />

                    {showSuggestions && input && filteredSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-surface border border-border rounded-xl shadow-lg overflow-hidden">
                            {filteredSuggestions.map(suggestion => (
                                <button
                                    key={suggestion.name}
                                    type="button"
                                    onClick={() => addTag(suggestion.name)}
                                    className="w-full text-left px-4 py-2 hover:bg-surface-hover flex justify-between items-center group transition-colors"
                                >
                                    <span className="text-sm font-medium text-text-primary">{suggestion.name}</span>
                                    <span className="text-xs text-text-tertiary group-hover:text-text-secondary">{suggestion.usageCount} uses</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => addTag(input)}
                    disabled={!input.trim()}
                    className="px-4 py-2.5 bg-surface-hover text-text-primary border border-border rounded-xl hover:bg-border transition-colors font-medium disabled:opacity-50"
                >
                    Add
                </button>
            </div>

            {value.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {value.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-accent/10 text-accent border border-accent/20 rounded-full flex items-center gap-1 text-sm font-medium animate-in fade-in zoom-in duration-200">
                            {tag}
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="hover:text-accent-foreground transition-colors p-0.5 rounded-full hover:bg-accent/20"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
