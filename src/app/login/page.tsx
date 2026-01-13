'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Loader } from '@/components/ui/Loader';
import { Mail } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleOAuthSignIn = (provider: string) => {
        setIsLoading(true);
        signIn(provider, { callbackUrl: '/dashboard' });
    };

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setIsLoading(true);
        await signIn('email', { email, callbackUrl: '/dashboard' });
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Loader action="get" text="Fetching user data..." />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background gradients for premium feel */}
            <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-accent/20 blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-accent-hover/20 blur-[100px]" />

            <div className="z-10 w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-surface/50 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-border">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-text-primary">
                        Welcome to Story Graph
                    </h2>
                    <p className="mt-2 text-sm text-text-secondary">
                        Sign in or create an account to continue
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => handleOAuthSignIn('google')}
                        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-all hover:bg-gray-50 hover:shadow-lg focus:ring-2 focus:ring-accent-ring focus:outline-none"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continue with Google
                    </button>

                    <button
                        onClick={() => handleOAuthSignIn('facebook')}
                        className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#1864D9] hover:shadow-lg focus:ring-2 focus:ring-accent-ring focus:outline-none"
                    >
                        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                            <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.797 1.603-2.797 4.16v1.957h5.049l-.65 3.665h-4.399v7.98h-5.012z" />
                        </svg>
                        Continue with Facebook
                    </button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-divider" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-transparent px-2 text-text-muted text-xs uppercase bg-background">
                            Or continue with email
                        </span>
                    </div>
                </div>

                <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="sr-only">
                            Email address
                        </label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Mail className="h-5 w-5 text-text-muted" aria-hidden="true" />
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full rounded-xl border border-input bg-surface-2 py-3 pl-10 pr-3 text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent-ring focus:outline-none transition-all sm:text-sm"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!email}
                        className="flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-contrast shadow-lg transition-all hover:bg-accent-hover hover:shadow-xl hover:scale-[1.02] focus:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                    >
                        Continue with Email
                    </button>
                </form>
            </div>
        </div>
    );
}
