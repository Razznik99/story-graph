'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    MessageSquare,
    GitPullRequest,
    UserPlus,
    Mail,
    Check,
    X,
    Calendar,
    Layers,
    Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StoryCard from '@/components/stories/StoryCard';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useStoryStore } from '@/store/useStoryStore';
import { COLLABORATION_ROLES } from '@/domain/constants';

interface DashboardData {
    story: {
        title: string;
        abbreviation: string;
        synopsis: string | null;
        coverUrl: string | null;
        owner?: {
            name: string | null;
            email: string;
            // username might be null based on schema, handle gracefully
            username?: string | null;
        };
        updatedAt: string;
    };
    stats: {
        cards: number;
        events: number;
        level5: number;
        collaborators: number;
        level5Name: string;
    };
    comments: any[];
    suggestions: any[];
    requests: any[];
    invites: any[];
    isOwner: boolean;
}

export default function DashboardPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const urlStoryId = searchParams.get('storyId');
    const { selectedStoryId, setSelectedStoryId } = useStoryStore();

    const storyId = urlStoryId || selectedStoryId;

    const [loading, setLoading] = useState(false);
    const [stories, setStories] = useState<any[]>([]);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    // Invite State
    const [inviteSearch, setInviteSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [selectedRole, setSelectedRole] = useState<string>('View');
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [sendingInvite, setSendingInvite] = useState(false);

    // Sync Store with URL
    useEffect(() => {
        if (urlStoryId && urlStoryId !== selectedStoryId) {
            setSelectedStoryId(urlStoryId);
        }
    }, [urlStoryId, selectedStoryId, setSelectedStoryId]);

    // Fetch Stories for Selection
    useEffect(() => {
        if (!storyId) {
            setLoading(true);
            fetch('/api/stories?variant=my-stories')
                .then(res => res.json())
                .then(data => {
                    setStories(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [storyId]);

    // Fetch Dashboard Data
    useEffect(() => {
        if (storyId) {
            setLoading(true);
            fetchDashboardData();
        }
    }, [storyId]);

    const fetchDashboardData = async () => {
        if (!storyId) return;
        try {
            const res = await fetch(`/api/stories/${storyId}/dashboard`);
            if (!res.ok) throw new Error('Failed to fetch dashboard');
            const data = await res.json();
            setDashboardData(data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load dashboard data');
            setLoading(false);
        }
    };

    const handleStorySelect = (id: string) => {
        setSelectedStoryId(id);
        router.push(`/dashboard?storyId=${id}`);
    };

    const handleCommentSubmit = async () => {
        if (!commentText.trim() || !storyId) return;
        setSubmittingComment(true);
        try {
            const res = await fetch(`/api/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, message: commentText })
            });
            if (!res.ok) throw new Error('Failed to post comment');

            toast.success('Comment posted');
            setCommentText('');
            fetchDashboardData();
        } catch (error) {
            toast.error('Failed to post comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    // User Search for Invite
    useEffect(() => {
        if (inviteSearch.length < 2) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setSearchingUsers(true);
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(inviteSearch)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data);
                }
            } catch (error) {
                console.error('Search failed', error);
            } finally {
                setSearchingUsers(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [inviteSearch]);

    const handleSendInvite = async () => {
        if (!selectedUser || !storyId) return;
        setSendingInvite(true);
        try {
            const res = await fetch(`/api/stories/${storyId}/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUser.id, role: selectedRole })
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || 'Failed to send invite');
            }

            toast.success(`Invite sent to ${selectedUser.username}`);
            setSelectedUser(null);
            setInviteSearch('');
            setSearchResults([]);
            fetchDashboardData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSendingInvite(false);
        }
    };




    if (loading && !dashboardData && stories.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // 1. Story Selection View
    if (!storyId) {
        return (
            <div className="container mx-auto py-10 px-4 max-w-7xl">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {stories.map(story => (
                            <StoryCard
                                key={story.id}
                                story={story}
                                variant="my-stories"
                                onClick={() => handleStorySelect(story.id)}
                            />
                        ))}
                    </div>
                    {stories.length === 0 && !loading && (
                        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
                            <p className="text-muted-foreground">No stories found.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. Dashboard View
    if (!dashboardData) return null;

    const { story, stats, isOwner } = dashboardData;
    const ownerName = story.owner?.username || story.owner?.name || story.owner?.email || 'Unknown';
    const hasPendingRequests = dashboardData.requests.length > 0;

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex flex-col gap-4">
                    <Button variant="ghost" onClick={() => router.push('/stories')} className="mb-4 md:mb-0">
                        ← Back to Stories
                    </Button>
                    <div className="relative w-full md:w-48 aspect-[3/4] rounded-lg overflow-hidden border shadow-sm shrink-0">
                        {story.coverUrl ? (
                            <Image src={story.coverUrl} alt={story.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                            <div className="absolute inset-0 bg-muted flex items-center justify-center flex-col p-4">
                                <BookOpen className="w-12 h-12 text-text-primary opacity-20" />
                                <span className="text-4xl font-serif opacity-20 select-none">
                                    {story.abbreviation.toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 space-y-4 w-full">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Info */}
                        <div className="space-y-4 flex-1 flex-col">
                            <div>
                                <div>
                                    <h1 className="text-3xl font-bold">{story.title}</h1>
                                    <span className="truncate max-w-[120px]">
                                        by <span className="text-text-secondary">{ownerName}</span>
                                    </span>
                                    {/* <p className="text-sm text-muted-foreground mt-1">
                                        Last updated {new Date(story.updatedAt).toLocaleDateString()}
                                    </p> */}
                                </div>
                                {story.synopsis && (
                                    <p className="text-muted-foreground max-w-2xl leading-relaxed">
                                        {story.synopsis}
                                    </p>
                                )}
                            </div>
                            {/* Quick Stats Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 mt-auto">
                                <StatsCard
                                    icon={Layers}
                                    label="Cards"
                                    value={stats.cards}
                                    className="bg-blue-500/10 text-blue-500"
                                />
                                <StatsCard
                                    icon={Calendar}
                                    label="Events"
                                    value={stats.events}
                                    className="bg-purple-500/10 text-purple-500"
                                />
                                <StatsCard
                                    icon={BookOpen}
                                    label={stats.level5Name + 's'}
                                    value={stats.level5}
                                    className="bg-amber-500/10 text-amber-500"
                                />
                                <StatsCard
                                    icon={Users}
                                    label="Collaborators"
                                    value={stats.collaborators}
                                    className="bg-green-500/10 text-green-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-muted/50">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-background">Overview</TabsTrigger>
                    <TabsTrigger value="comments" className="data-[state=active]:bg-background">Comments</TabsTrigger>
                    <TabsTrigger value="collaboration" className="relative data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                        Collaboration
                        {hasPendingRequests && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5" />
                                    Recent Comments
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[300px] pr-4">
                                    <div className="space-y-4">
                                        {dashboardData.comments.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-8">No comments yet.</p>
                                        ) : (
                                            dashboardData.comments.map((comment: any) => (
                                                <CommentItem key={comment.id} comment={comment} />
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GitPullRequest className="w-5 h-5" />
                                    Pending Suggestions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[300px] pr-4">
                                    <div className="space-y-4">
                                        {dashboardData.suggestions.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-8">No pending suggestions.</p>
                                        ) : (
                                            dashboardData.suggestions.map((suggestion: any) => (
                                                <div key={suggestion.id} className="p-3 bg-muted/50 rounded-lg text-sm">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Avatar className="w-5 h-5">
                                                            <AvatarImage src={suggestion.user.image} />
                                                            <AvatarFallback>{suggestion.user.username?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-semibold">{suggestion.user.username}</span>
                                                    </div>
                                                    <p>{suggestion.message || 'No message'}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="comments" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Discussion</CardTitle>
                            <CardDescription>Share your thoughts with the team.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-4">
                                <Textarea
                                    placeholder="Type your comment here..."
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    className="min-h-[100px] focus-within:ring-accent"
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleCommentSubmit} disabled={submittingComment}>
                                    {submittingComment ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                    Post Comment
                                </Button>
                            </div>
                            <Separator />
                            <div className="space-y-6">
                                {dashboardData.comments.map((comment: any) => (
                                    <CommentItem key={comment.id} comment={comment} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="collaboration" className="space-y-6">
                    {!isOwner ? (
                        <div className="flex flex-col items-center justify-center p-10 bg-muted/20 rounded-xl border border-dashed">
                            <Users className="w-10 h-10 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">Collaboration Management</h3>
                            <p className="text-muted-foreground text-center max-w-md mt-2">
                                Only the story owner can manage invites and requests. You are a collaborator on this story.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Invite New User */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <UserPlus className="w-5 h-5" />
                                        Invite Collaborator
                                    </CardTitle>
                                    <CardDescription>Search for users to invite to your story.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col md:flex-row gap-4 items-start">
                                        <div className="flex-1 w-full space-y-2 relative">
                                            <Label>User Search</Label>
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search by name, email, or username..."
                                                    className="pl-9 focus-within:ring-accent"
                                                    value={inviteSearch}
                                                    onChange={(e) => {
                                                        setInviteSearch(e.target.value);
                                                        setSelectedUser(null);
                                                    }}
                                                />
                                            </div>
                                            {/* Search Results Dropdown */}
                                            {inviteSearch.length >= 2 && !selectedUser && (
                                                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-surface text-popover-foreground rounded-md border shadow-md max-h-[200px] overflow-auto">
                                                    {searchingUsers ? (
                                                        <div className="p-4 text-center text-xs text-muted-foreground">Searching...</div>
                                                    ) : searchResults.length === 0 ? (
                                                        <div className="p-4 text-center text-xs text-muted-foreground">No users found</div>
                                                    ) : (
                                                        searchResults.map(user => (
                                                            <div
                                                                key={user.id}
                                                                className="flex items-center gap-3 p-2 hover:bg-accent cursor-pointer"
                                                                onClick={() => {
                                                                    setSelectedUser(user);
                                                                    setInviteSearch(user.username || user.email);
                                                                    setSearchResults([]);
                                                                }}
                                                            >
                                                                <Avatar className="w-8 h-8">
                                                                    <AvatarImage src={user.image} />
                                                                    <AvatarFallback>{user.username?.[0]}</AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="text-sm font-medium">{user.username}</p>
                                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                            {selectedUser && (
                                                <div className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                                                    <Check className="w-3 h-3" /> Selected: {selectedUser.username}
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-full md:w-[200px] space-y-2">
                                            <Label>Role</Label>
                                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {COLLABORATION_ROLES.map(role => (
                                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="pt-8">
                                            <Button onClick={handleSendInvite} disabled={!selectedUser || sendingInvite}>
                                                {sendingInvite && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                                Send Invite
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Invites List */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Mail className="w-5 h-5" />
                                            Pending Invites
                                        </CardTitle>
                                        <CardDescription>People you have invited to this story.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {dashboardData.invites.length === 0 ? (
                                            <p className="text-muted-foreground text-sm">No pending invites.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {dashboardData.invites.map((invite: any) => (
                                                    <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                                <span className="text-xs font-bold">{invite.user.username?.[0] || '?'}</span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium">{invite.user.username || invite.user.email}</p>
                                                                <p className="text-xs text-muted-foreground">Role: {invite.role}</p>
                                                            </div>
                                                        </div>
                                                        <Button variant="outline" size="sm">Cancel</Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Requests */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <UserPlus className="w-5 h-5" />
                                            Join Requests
                                        </CardTitle>
                                        <CardDescription>People who want to join this story.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {dashboardData.requests.length === 0 ? (
                                            <p className="text-muted-foreground text-sm">No pending requests.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {dashboardData.requests.map((request: any) => (
                                                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="w-8 h-8">
                                                                <AvatarImage src={request.user.image} />
                                                                <AvatarFallback>{request.user.username?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="text-sm font-medium">{request.user.username}</p>
                                                                <p className="text-xs text-muted-foreground">{request.message || 'No message'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-50">
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StatsCard({ icon: Icon, label, value, className }: { icon: any, label: string, value: number, className?: string }) {
    return (
        <div className={`flex flex-col items-center justify-center p-4 rounded-xl ${className}`}>
            <Icon className="w-6 h-6 mb-2 opacity-80" />
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</span>
        </div>
    );
}

function CommentItem({ comment }: { comment: any }) {
    return (
        <div className="flex gap-4">
            <Avatar>
                <AvatarImage src={comment.user.image} />
                <AvatarFallback>{comment.user.username?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{comment.user.username}</span>
                    <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                    {comment.message}
                </p>
            </div>
        </div>
    );
}
