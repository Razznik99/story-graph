"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";

type Theme =
    | "light-neutral"
    | "light-warm"
    | "light-cool"
    | "dark-neutral"
    | "dark-warm"
    | "dark-cool";

type Accent =
    | "blue"
    | "indigo"
    | "teal"
    | "amber"
    | "terracotta"
    | "olive"
    | "cyan"
    | "sky"
    | "violet"
    | "emerald"
    | "copper"
    | "rose"
    | "lime";

interface ThemeContextType {
    theme: Theme;
    accent: Accent;
    setTheme: (theme: Theme) => void;
    setAccent: (accent: Accent) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
    children,
    defaultTheme = "light-neutral",
    defaultAccent = "blue",
}: {
    children: React.ReactNode;
    defaultTheme?: Theme;
    defaultAccent?: Accent;
}) {
    const [theme, _setTheme] = useState<Theme>(defaultTheme);
    const [accent, _setAccent] = useState<Accent>(defaultAccent);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedTheme = Cookies.get("theme") as Theme;
        const savedAccent = Cookies.get("accent") as Accent;

        if (savedTheme) {
            _setTheme(savedTheme);
            updateTheme(savedTheme);
        } else {
            updateTheme(defaultTheme);
        }

        if (savedAccent) {
            _setAccent(savedAccent);
            updateAccent(savedAccent);
        } else {
            updateAccent(defaultAccent);
        }
    }, [defaultTheme, defaultAccent]);

    const updateTheme = (newTheme: Theme) => {
        document.documentElement.setAttribute("data-theme", newTheme);

        // Also handle semantic light/dark classes if needed by Tailwind or other tools
        if (newTheme.includes("dark")) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    };

    const updateAccent = (newAccent: Accent) => {
        document.documentElement.setAttribute("data-accent", newAccent);
    };

    const setTheme = (newTheme: Theme) => {
        _setTheme(newTheme);
        Cookies.set("theme", newTheme, { expires: 365 });
        updateTheme(newTheme);
    };

    const setAccent = (newAccent: Accent) => {
        _setAccent(newAccent);
        Cookies.set("accent", newAccent, { expires: 365 });
        updateAccent(newAccent);
    };

    // Prevent hydration mismatch by rendering children only after mount, 
    // OR rely on server-side stored cookies passing initial values (checking that next).
    // For now, let's render children immediately but we rely on script/cookies for initial paint to avoid FOUC.
    // Actually, to avoid FOUC with cookies, it's best handled in layout.tsx via cookies() from next/headers.
    // If we pass initial values, we don't need to wait for mount to show content, but we might need to sync state.

    return (
        <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
