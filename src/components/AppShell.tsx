'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useStoryStore } from '@/store/useStoryStore';
import {
    LayoutDashboard,
    Layers,
    CalendarDays,
    TrendingUp,
    NotebookText,
    ChartPie,
    UserRound,
    Settings,
    ChevronLeft,
    ChevronRight,
    BookOpen
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils'; // Assuming this utility exists, typical in shadcn

const TOP_NAV = [
    { name: 'Stories', href: '/stories', icon: BookOpen },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Cards', href: '/cards', icon: Layers },
    { name: 'Events', href: '/events', icon: CalendarDays },
    { name: 'Timeline', href: '/timeline', icon: TrendingUp },
    { name: 'Notes', href: '/note', icon: NotebookText },
    { name: 'Analysis', href: '/analysis', icon: ChartPie },
];

const BOTTOM_NAV = [
    { name: 'Account', href: '/account', icon: UserRound },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = useState(false);

    if (['/login', '/signup'].includes(pathname)) {
        return <>{children}</>;
    }

    return (
        <div className="flex bg-background min-h-screen">
            {/* Sidebar */}
            <aside
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => setIsExpanded(false)}
                className={cn(
                    "fixed left-0 top-0 h-full z-50 flex flex-col border-r border-border bg-surface transition-all duration-300 ease-in-out shadow-lg",
                    isExpanded ? "w-64" : "w-16"
                )}
            >
                {/* Logo Area */}
                <div className="h-16 shrink-0 flex items-center justify-center border-b border-border bg-background/50 backdrop-blur-sm overflow-hidden">
                    <div className={cn("relative transition-all duration-300", isExpanded ? "w-10 h-10" : "w-8 h-8")}>
                        <Image
                            src="/logo-light.svg"
                            alt="Story Graph"
                            fill
                            className="dark:hidden object-contain"
                        />
                        <Image
                            src="/logo-dark.svg"
                            alt="Story Graph"
                            fill
                            className="hidden dark:block object-contain"
                        />
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 flex flex-col justify-between py-4 overflow-y-auto overflow-x-hidden">
                    <nav className="px-2 space-y-1">
                        {TOP_NAV.map((item) => {
                            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center px-3 py-2 rounded-lg transition-all duration-200 group relative whitespace-nowrap",
                                        isActive
                                            ? "bg-accent text-accent-foreground shadow-sm"
                                            : "text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5 min-w-[20px]", isActive ? "text-accent-foreground" : "group-hover:text-accent")} />
                                    <span className={cn(
                                        "ml-3 font-medium transition-opacity duration-300",
                                        isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                                    )}>
                                        {item.name}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    <nav className="px-2 space-y-1">
                        {BOTTOM_NAV.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center px-3 py-2 rounded-lg transition-all duration-200 group relative whitespace-nowrap",
                                        isActive
                                            ? "bg-accent text-accent-foreground shadow-sm"
                                            : "text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5 min-w-[20px]", isActive ? "text-accent-foreground" : "group-hover:text-accent")} />
                                    <span className={cn(
                                        "ml-3 font-medium transition-opacity duration-300",
                                        isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                                    )}>
                                        {item.name}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Main Content Area */}
            {/* Added ml-16 to offset the fixed collapsed sidebar width */}
            <main className="flex-1 ml-16 bg-background/50 relative min-h-screen">
                {children}
            </main>
        </div>
    );
}
