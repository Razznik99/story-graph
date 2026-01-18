import { Share2, Users, Eye } from 'lucide-react';
import Image from 'next/image';

interface StoryCardProps {
    story: {
        id: string;
        title: string;
        abbreviation: string;
        coverUrl?: string | null;
        owner?: {
            name: string | null;
            email: string;
            // username might be null based on schema, handle gracefully
            username?: string | null;
        };
        collaborators?: {
            role: 'Edit' | 'Comment' | 'View';
        }[];
        _count?: {
            collaborators: number;
        };
    };
    variant: 'my-stories' | 'public';
    onClick: () => void;
}

export default function StoryCard({ story, variant, onClick }: StoryCardProps) {
    const role = variant === 'my-stories'
        ? (story.collaborators && story.collaborators.length > 0 ? story.collaborators[0].role : 'Owner')
        : null;

    const ownerName = story.owner?.username || story.owner?.email || 'Unknown';

    return (
        <div
            onClick={onClick}
            className="group relative flex flex-col bg-surface border border-border rounded-xl overflow-hidden hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5 transition-all cursor-pointer"
        >
            {/* Aspect Ratio 3:4 Container */}
            <div className="relative w-full aspect-[3/4] bg-surface-hover overflow-hidden">
                {story.coverUrl ? (
                    <Image
                        src={story.coverUrl}
                        alt={story.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-hover to-background text-text-tertiary">
                        <span className="text-4xl font-serif opacity-20 select-none">
                            {story.abbreviation.toUpperCase()}
                        </span>
                    </div>
                )}

                {/* Badges Overlay */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {variant === 'my-stories' && (
                        <span className={`px-2 py-1 text-xs font-bold rounded-lg shadow-sm backdrop-blur-md
                            ${role === 'Owner' ? 'bg-primary text-primary-foreground' :
                                role === 'Edit' ? 'bg-blue-500/90 text-white' :
                                    role === 'Comment' ? 'bg-yellow-500/90 text-white' :
                                        'bg-zinc-500/90 text-white'
                            }
                        `}>
                            {role}
                        </span>
                    )}
                </div>
            </div>

            <div className="p-4 flex flex-col gap-2 flex-1">
                <h3 className="font-semibold text-lg text-text-primary line-clamp-1 group-hover:text-accent transition-colors">
                    {story.title}
                </h3>

                {variant === 'public' && (
                    <div className="flex items-center gap-2 text-xs text-text-tertiary mt-auto">
                        <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {story._count?.collaborators || 0}
                        </span>
                        <span>•</span>
                        <span className="truncate max-w-[120px]">
                            by <span className="text-text-secondary">{ownerName}</span>
                        </span>
                    </div>
                )}
                {variant === 'my-stories' && (
                    <div className="flex items-center gap-2 text-xs text-text-tertiary mt-auto">
                        {role === 'Owner' ? (
                            <span className="text-text-secondary">You are the owner</span>
                        ) : (
                            <span className="truncate">
                                by <span className="text-text-secondary">{ownerName}</span>
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
