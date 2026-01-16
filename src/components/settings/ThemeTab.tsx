'use client';

import { useTheme } from '@/providers/ThemeProvider'; // Corrected import
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { accents } from '@/lib/colors';

const temps = ['warm', 'neutral', 'cool'] as const;
const modes = ['light', 'dark'] as const;

export default function ThemeTab() {
    const { theme, setTheme, accent, setAccent } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Derived state
    const currentMode = theme.includes('dark') ? 'dark' : 'light';
    const currentTemp = theme.split('-')[1] as 'warm' | 'neutral' | 'cool' || 'neutral';

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const handleModeChange = (mode: 'light' | 'dark' | 'system') => {
        let targetMode = mode;
        if (mode === 'system') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            targetMode = isDark ? 'dark' : 'light';
        }
        const newTheme = `${targetMode}-${currentTemp}` as any;
        setTheme(newTheme);
    };

    const handleTempChange = (temp: 'warm' | 'neutral' | 'cool') => {
        const newTheme = `${currentMode}-${temp}` as any;
        setTheme(newTheme);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Mode Selection */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-text-primary">Mode</h2>
                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => handleModeChange('light')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${currentMode === 'light'
                                ? 'border-accent bg-accent/5'
                                : 'border-border hover:border-text-secondary bg-surface'
                            }`}
                    >
                        <Sun className={`w-8 h-8 mb-3 ${currentMode === 'light' ? 'text-accent' : 'text-text-secondary'}`} />
                        <span className={`font-medium ${currentMode === 'light' ? 'text-text-primary' : 'text-text-secondary'}`}>Light</span>
                    </button>

                    <button
                        onClick={() => handleModeChange('dark')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${currentMode === 'dark'
                                ? 'border-accent bg-accent/5'
                                : 'border-border hover:border-text-secondary bg-surface'
                            }`}
                    >
                        <Moon className={`w-8 h-8 mb-3 ${currentMode === 'dark' ? 'text-accent' : 'text-text-secondary'}`} />
                        <span className={`font-medium ${currentMode === 'dark' ? 'text-text-primary' : 'text-text-secondary'}`}>Dark</span>
                    </button>

                    <button
                        onClick={() => handleModeChange('system')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 border-border hover:border-text-secondary bg-surface`}
                        title="Sync with system preference"
                    >
                        <Monitor className="w-8 h-8 mb-3 text-text-secondary" />
                        <span className="font-medium text-text-secondary">System</span>
                    </button>
                </div>
            </section>

            {/* Temperature Slider */}
            <section className="space-y-4">
                <div className="flex justify-between items-end">
                    <h2 className="text-lg font-semibold text-text-primary">Temperature</h2>
                    <span className="text-sm text-text-secondary font-medium capitalize">{currentTemp}</span>
                </div>

                <div className="bg-surface p-6 rounded-xl border border-border">
                    <div className="relative">
                        {/* Track */}
                        <div className="absolute top-1/2 left-0 right-0 h-2 bg-surface-2 rounded-full -translate-y-1/2" />

                        {/* Steps */}
                        <div className="relative flex justify-between z-10 pointer-events-none">
                            {temps.map((t) => (
                                <div key={t} className={`w-4 h-4 rounded-full transition-colors duration-300 ${currentTemp === t ? 'bg-accent' : 'bg-border'}`} />
                            ))}
                        </div>

                        {/* Input */}
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="1"
                            value={temps.indexOf(currentTemp)}
                            onChange={(e) => handleTempChange(temps[parseInt(e.target.value)])}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                    </div>
                    <div className="flex justify-between mt-4 text-sm font-medium text-text-tertiary">
                        <span>Warm</span>
                        <span>Neutral</span>
                        <span>Cool</span>
                    </div>
                </div>
            </section>

            {/* Accent Color */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-text-primary">Accent Color</h2>
                <div className="bg-surface p-6 rounded-xl border border-border grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-4">
                    {(Object.keys(accents) as Array<keyof typeof accents>).map((acc) => {
                        const colorValue = accents[acc].base; // e.g. "221 83% 53%"
                        // We need to convert HSL string to CSS supported format for inline styles if we want preview
                        // Or just use the class if we had utility classes. But we only have CSS variables.
                        // We'll use inline style with hsl()
                        return (
                            <button
                                key={acc}
                                onClick={() => setAccent(acc)}
                                className={`group relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface ${accent === acc ? 'ring-2 ring-offset-2 ring-offset-surface ring-text-primary scale-110' : ''
                                    }`}
                                title={acc.charAt(0).toUpperCase() + acc.slice(1)}
                            >
                                <div
                                    className="w-full h-full rounded-full border border-black/10 dark:border-white/10"
                                    style={{ backgroundColor: `hsl(${colorValue})` }}
                                />
                                {accent === acc && (
                                    <Check className="absolute w-5 h-5 text-white drop-shadow-md" strokeWidth={3} />
                                )}
                            </button>
                        )
                    })}
                </div>
            </section>

        </div>
    );
}
