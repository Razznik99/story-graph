'use client';

import { Card, CardType } from '@/domain/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useStoryStore } from '@/store/useStoryStore';
import CardGrid from '@/components/cards/CardGrid';
import CardList from '@/components/cards/CardList';
import CardViewer from '@/components/cards/CardViewer';
import CardEditor from '@/components/cards/CardEditor';
import {
    LayoutGrid,
    List,
    Plus,
    ChevronDown,
    Search,
    EyeOff,
    Eye,
    ArrowUpDown
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Loader } from 'lucide-react';

type SortOption = 'name' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

export default function CardsPage() {
    const router = useRouter();
    const storyId = useStoryStore((state) => state.selectedStoryId);
    const [cards, setCards] = useState<(Card & { cardType?: CardType })[]>([]);
    const [cardTypes, setCardTypes] = useState<CardType[]>([]);
    const [selectedCard, setSelectedCard] = useState<(Card & { cardType?: CardType }) | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [loading, setLoading] = useState(true);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [showHidden, setShowHidden] = useState(false);

    // Sort States
    const [sortBy, setSortBy] = useState<SortOption>('updatedAt');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Dynamic Type Bar States
    const [visibleCount, setVisibleCount] = useState(5);
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (storyId === undefined) return;

        if (!storyId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        fetchCards();
    }, [storyId, router]);

    const fetchCards = () => {
        if (!storyId) return;
        Promise.all([
            fetch(`/api/cards?storyId=${storyId}`).then(res => res.json()),
            fetch(`/api/card-types?storyId=${storyId}`).then(res => res.ok ? res.json() : [])
        ]).then(([cardsData, typesData]) => {
            const loadedCards = Array.isArray(cardsData) ? cardsData : cardsData.cards || [];
            setCards(loadedCards);
            setCardTypes(typesData);
        }).catch(console.error)
            .finally(() => setLoading(false));
    };

    // Derived Data: Card Types with Counts
    const typeStats = useMemo(() => {
        const stats = new Map<string, { id: string; name: string; count: number }>();

        // Initialize stats with all known card types, setting their counts to 0
        cardTypes.forEach(type => {
            stats.set(type.id, { id: type.id, name: type.name, count: 0 });
        });

        // Then, iterate through actual cards to update counts
        cards.forEach(card => {
            if (card.cardType?.id && stats.has(card.cardType.id)) {
                stats.get(card.cardType.id)!.count++;
            } else if (card.cardType && !stats.has(card.cardType.id)) {
                stats.set(card.cardType.id, { id: card.cardType.id, name: card.cardType.name, count: 1 });
            }
        });

        return Array.from(stats.values()).sort((a, b) => b.count - a.count);
    }, [cards, cardTypes]);

    // Filter and Sort Logic
    const filteredAndSortedCards = useMemo(() => {
        let result = [...cards];

        // 1. Filter by Hidden
        if (!showHidden) {
            result = result.filter(c => !c.hidden);
        }

        // 2. Filter by Type
        if (selectedType !== 'all') {
            result = result.filter(c => c.cardType?.id === selectedType);
        }

        // 3. Filter by Search (Name, Tags, Description, Attributes)
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(lowerTerm) ||
                c.description?.toLowerCase().includes(lowerTerm) ||
                c.tags?.some(t => t.toLowerCase().includes(lowerTerm)) ||
                c.attributes?.some((a: any) => {
                    if (typeof a.value === 'string') return a.value.toLowerCase().includes(lowerTerm);
                    if (typeof a.value === 'number') return a.value.toString().includes(lowerTerm);
                    if (Array.isArray(a.value)) return a.value.some((v: any) => String(v).toLowerCase().includes(lowerTerm));
                    if (typeof a.value === 'object' && a.value !== null) {
                        const val = (a.value as any).value;
                        const unit = (a.value as any).unit;
                        return String(val).includes(lowerTerm) || String(unit).toLowerCase().includes(lowerTerm);
                    }
                    return false;
                })
            );
        }

        // 4. Sort
        result.sort((a, b) => {
            let cmp = 0;
            switch (sortBy) {
                case 'name':
                    cmp = a.name.localeCompare(b.name);
                    break;
                case 'createdAt':
                    cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    break;
                case 'updatedAt':
                    cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
                    break;
            }
            return sortOrder === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [cards, showHidden, selectedType, searchTerm, sortBy, sortOrder]);

    const handleCreate = () => {
        setSelectedCard(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (card: Card) => {
        setSelectedCard(card);
        setIsEditorOpen(true);
    };

    const handleEditorClose = () => {
        setIsEditorOpen(false);
        setSelectedCard(null);
        fetchCards();
    };

    // Dynamic Type Bar Measurement
    useEffect(() => {
        const calculateVisible = () => {
            if (!containerRef.current || !measureRef.current) return;

            const containerWidth = containerRef.current.offsetWidth;
            const children = Array.from(measureRef.current.children) as HTMLElement[];

            if (children.length < 2) {
                setVisibleCount(typeStats.length);
                return;
            }

            let currentWidth = 0;
            const gap = 8; // gap-2 is 0.5rem = 8px

            const allCardsWidth = children[0].offsetWidth;
            currentWidth += allCardsWidth;

            const moreBtnWidth = children[children.length - 1].offsetWidth;

            let count = 0;
            for (let i = 0; i < typeStats.length; i++) {
                const childIndex = i + 1;
                if (childIndex >= children.length - 1) break;

                const itemWidth = children[childIndex].offsetWidth;
                const isLastItem = i === typeStats.length - 1;
                const widthWithItem = currentWidth + gap + itemWidth;
                const widthWithItemAndMore = widthWithItem + gap + moreBtnWidth;

                if (isLastItem) {
                    if (widthWithItem <= containerWidth) {
                        count++;
                        currentWidth += gap + itemWidth;
                    } else {
                        break;
                    }
                } else {
                    if (widthWithItemAndMore <= containerWidth) {
                        count++;
                        currentWidth += gap + itemWidth;
                    } else {
                        break;
                    }
                }
            }
            setVisibleCount(count);
        };

        calculateVisible();
        window.addEventListener('resize', calculateVisible);
        return () => window.removeEventListener('resize', calculateVisible);
    }, [typeStats]);

    // Type Bar Logic
    const visibleTypes = typeStats.slice(0, visibleCount);
    const hiddenTypes = typeStats.slice(visibleCount);

    if (!storyId) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Select a story to view cards</div>;
    if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader className="animate-spin mr-2" /> Loading Cards...</div>;

    return (
        <div className="min-h-screen bg-background p-6 md:p-8">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <Input
                        type="text"
                        placeholder="Search cards..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-surface border-border focus:ring-accent"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {/* Sort Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="justify-between min-w-[180px]">
                                <span className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Sort:</span>
                                    <span className="text-foreground font-medium">
                                        {sortBy === 'name' && (sortOrder === 'asc' ? 'Name (A-Z)' : 'Name (Z-A)')}
                                        {sortBy === 'createdAt' && (sortOrder === 'desc' ? 'Newest Created' : 'Oldest Created')}
                                        {sortBy === 'updatedAt' && (sortOrder === 'desc' ? 'Recently Updated' : 'Oldest Updated')}
                                    </span>
                                </span>
                                <ArrowUpDown className="w-4 h-4 ml-2 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end">
                            {[
                                { label: 'Name (A-Z)', sort: 'name', order: 'asc' },
                                { label: 'Name (Z-A)', sort: 'name', order: 'desc' },
                                { label: 'Newest Created', sort: 'createdAt', order: 'desc' },
                                { label: 'Oldest Created', sort: 'createdAt', order: 'asc' },
                                { label: 'Recently Updated', sort: 'updatedAt', order: 'desc' },
                                { label: 'Oldest Updated', sort: 'updatedAt', order: 'asc' },
                            ].map((opt: any) => (
                                <DropdownMenuItem
                                    key={opt.label}
                                    onClick={() => { setSortBy(opt.sort); setSortOrder(opt.order); }}
                                    className={cn("cursor-pointer", (sortBy === opt.sort && sortOrder === opt.order) ? 'bg-accent/10 text-accent' : '')}
                                >
                                    {opt.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* View Toggle */}
                    <div className="flex bg-surface border border-border rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? 'bg-accent text-accent-foreground shadow-md' : 'text-muted-foreground hover:text-foreground')}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? 'bg-accent text-accent-foreground shadow-md' : 'text-muted-foreground hover:text-foreground')}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Hidden Toggle */}
                    <Button
                        variant={showHidden ? 'secondary' : 'outline'}
                        onClick={() => setShowHidden(!showHidden)}
                        className={cn("px-3", showHidden && "bg-accent/10 text-accent border-accent/20 hover:bg-accent/20")}
                        title="Toggle Hidden Cards"
                    >
                        {showHidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </Button>

                    {/* Create Button */}
                    <Button onClick={handleCreate} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg">
                        <Plus className="w-5 h-5 mr-2" />
                        <span className="hidden sm:inline">New Card</span>
                    </Button>
                </div>
            </div>

            {/* Hidden Measurement Container - Keep invisible but present for calc */}
            <div
                ref={measureRef}
                className="fixed top-0 left-0 flex items-center gap-2 invisible pointer-events-none"
                aria-hidden="true"
            >
                <div className="px-4 py-2 border">All Cards {cards.length}</div>
                {typeStats.map(type => (
                    <div key={type.id} className="px-4 py-2 border">{type.name} {type.count}</div>
                ))}
                <div className="px-4 py-2 border flex items-center gap-1">More <ChevronDown className="w-3 h-3" /></div>
            </div>

            {/* Type Filter Bar */}
            <div
                ref={containerRef}
                className="flex items-center gap-2 mb-8 overflow-hidden"
            >
                <button
                    onClick={() => setSelectedType('all')}
                    className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                        selectedType === 'all'
                            ? 'bg-accent text-text-primary border-foreground'
                            : 'bg-surface text-muted-foreground border-border hover:border-accent'
                    )}
                >
                    All Cards <span className="ml-1 opacity-60 text-xs">{cards.length}</span>
                </button>

                {visibleTypes.map(type => (
                    <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                            selectedType === type.id
                                ? 'bg-accent text-text-primary border-foreground'
                                : 'bg-surface text-muted-foreground border-border hover:border-accent'
                        )}
                    >
                        {type.name} <span className="ml-1 opacity-60 text-xs">{type.count}</span>
                    </button>
                ))}

                {hiddenTypes.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="px-4 py-2 rounded-full text-sm font-medium bg-surface border border-border text-muted-foreground hover:border-foreground/50 flex items-center gap-1 whitespace-nowrap">
                                More <ChevronDown className="w-3 h-3" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48" align="start">
                            {hiddenTypes.map(type => (
                                <DropdownMenuItem
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className="flex justify-between cursor-pointer"
                                >
                                    <span>{type.name}</span>
                                    <span className="opacity-60 text-xs bg-muted px-1.5 py-0.5 rounded-full">{type.count}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Content Area */}
            {filteredAndSortedCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4 shadow-sm border border-border">
                        <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">No cards found</h3>
                    <p className="text-muted-foreground max-w-md">
                        Try adjusting your filters or search terms, or create a new card to get started.
                    </p>
                    <Button
                        variant="link"
                        onClick={() => { setSearchTerm(''); setSelectedType('all'); setShowHidden(false); }}
                        className="mt-6 text-accent"
                    >
                        Clear all filters
                    </Button>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <CardGrid
                            cards={filteredAndSortedCards}
                            onCardClick={setSelectedCard}
                        />
                    ) : (
                        <CardList
                            cards={filteredAndSortedCards}
                            onCardClick={setSelectedCard}
                            onEdit={handleEdit}
                        />
                    )}
                </>
            )}

            {/* Card Editor Modal */}
            {isEditorOpen && (
                <CardEditor
                    card={selectedCard}
                    onClose={handleEditorClose}
                    storyId={storyId}
                />
            )}

            {/* Card Viewer Modal */}
            {selectedCard && !isEditorOpen && (
                <CardViewer
                    card={selectedCard}
                    onClose={() => setSelectedCard(null)}
                    onEdit={() => handleEdit(selectedCard)}
                />
            )}
        </div>
    );
}
