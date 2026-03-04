'use client';

import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function AccountPage() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [planData, setPlanData] = useState<any>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        image: '',
    });

    useEffect(() => {
        if (session?.user) {
            setFormData({
                name: session.user.name || '',
                username: (session.user as any).username || '',
                image: session.user.image || '',
            });

            const fetchPlan = async () => {
                try {
                    const res = await fetch('/api/user/plan');
                    if (res.ok) {
                        const data = await res.json();
                        setPlanData(data);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoadingPlan(false);
                }
            };
            fetchPlan();
        }
    }, [session]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success("Profile updated successfully");
                await update(formData); // Update session client-side
                setIsEditing(false);
            } else {
                toast.error("Failed to update profile");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm("Are you sure you want to delete your account? This action cannot be undone and will delete all your stories.")) {
            return;
        }

        setIsDeleting(true);
        try {
            const res = await fetch('/api/account', {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success("Account deleted successfully");
                signOut({ callbackUrl: '/' });
            } else {
                toast.error("Failed to delete account");
                setIsDeleting(false);
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
            setIsDeleting(false);
        }
    };

    if (!session?.user) {
        return (
            <div className="flex items-center justify-center h-full">
                <p>Please sign in to view your account.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-2xl p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-text-primary">Account Settings</h1>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Edit Profile
                    </button>
                )}
            </div>

            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm mb-8">
                <div className="flex flex-col gap-6 mb-6">
                    <div className="flex items-center gap-6">
                        {formData.image ? (
                            <img
                                src={formData.image}
                                alt={formData.name || 'User'}
                                className="w-20 h-20 rounded-full border-2 border-border object-cover"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border-2 border-border">
                                {(formData.name || session.user.email || 'U').charAt(0).toUpperCase()}
                            </div>
                        )}

                        {isEditing && (
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-text-secondary mb-1">Avatar URL</label>
                                <input
                                    type="text"
                                    name="image"
                                    value={formData.image}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            ) : (
                                <p className="text-text-primary py-2">{session.user.name || 'No Name'}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Username</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            ) : (
                                <p className="text-text-primary py-2">{(session.user as any).username ? `@${(session.user as any).username}` : 'Not set'}</p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                            <p className="text-text-primary py-2">{session.user.email}</p>
                        </div>
                    </div>
                </div>

                {isEditing ? (
                    <div className="flex items-center gap-3 border-t border-border pt-6">
                        <button
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                // Reset form
                                setFormData({
                                    name: session.user.name || '',
                                    username: (session.user as any).username || '',
                                    image: session.user.image || '',
                                });
                            }}
                            className="px-4 py-2 bg-surface-hover border border-border rounded-lg text-text-primary hover:bg-surface-active transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="border-t border-border pt-6">
                        <h3 className="text-lg font-medium text-text-primary mb-4">Session</h3>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="px-4 py-2 bg-surface border border-border rounded-lg text-text-primary hover:bg-accent transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-text-primary">Current Plan</h3>
                    <button
                        onClick={() => router.push('/pricing')}
                        className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                    >
                        {planData?.plan === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
                    </button>
                </div>

                {isLoadingPlan ? (
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                            <div className="h-4 bg-border rounded w-1/4"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-border rounded"></div>
                                <div className="h-4 bg-border rounded w-5/6"></div>
                            </div>
                        </div>
                    </div>
                ) : planData ? (
                    <div className="space-y-6">
                        <div>
                            <p className="text-sm text-text-secondary uppercase tracking-wider font-semibold mb-1">Active Tier</p>
                            <p className="text-2xl font-bold text-primary capitalize">{planData.plan}</p>
                            {planData.subscription.isActive && planData.subscription.currentPeriodEnd && (
                                <p className="text-xs text-text-secondary mt-1">
                                    Renews on {new Date(planData.subscription.currentPeriodEnd).toLocaleDateString()}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-background border border-border rounded-lg p-4">
                                <p className="text-sm font-medium text-text-secondary mb-2">AI Tokens (Monthly)</p>
                                <div className="flex items-end justify-between mb-2">
                                    <span className="text-2xl font-bold text-text-primary w-full truncate">
                                        {planData.usage.tokensRemaining.toLocaleString()}
                                    </span>
                                    <span className="text-sm text-text-secondary min-w-[max-content] ml-2">
                                        / {planData.limits.tokens === Infinity ? 'Unlimited' : planData.limits.tokens.toLocaleString()}
                                    </span>
                                </div>
                                {planData.limits.tokens !== Infinity && (
                                    <div className="w-full bg-border rounded-full h-2">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, (planData.usage.tokensRemaining / planData.limits.tokens) * 100)}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-background border border-border rounded-lg p-4">
                                <p className="text-sm font-medium text-text-secondary mb-2">Image Generations</p>
                                <div className="flex items-end justify-between mb-2">
                                    <span className="text-2xl font-bold text-text-primary w-full truncate">
                                        {planData.usage.imgGenRemaining.toLocaleString()}
                                    </span>
                                    <span className="text-sm text-text-secondary min-w-[max-content] ml-2">
                                        / {planData.limits.img_gen === Infinity ? 'Unlimited' : planData.limits.img_gen.toLocaleString()}
                                    </span>
                                </div>
                                {planData.limits.img_gen !== Infinity && (
                                    <div className="w-full bg-border rounded-full h-2">
                                        <div
                                            className="bg-accent h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, (planData.usage.imgGenRemaining / planData.limits.img_gen) * 100)}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-text-secondary">Failed to load plan details.</p>
                )}
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                <h3 className="text-lg font-medium text-red-500 mb-2">Danger Zone</h3>
                <p className="text-text-secondary text-sm mb-6">
                    Deleting your account is permanent. All your stories, data, and settings will be wiped immediately.
                </p>
                <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
            </div>
        </div>
    );
}
