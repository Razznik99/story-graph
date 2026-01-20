"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface Option {
    label: string;
    value: string;
    [key: string]: any;
}

interface SearchableSelectProps {
    options: Option[];
    value?: string | null;
    onChange: (value: string | null) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    className?: string;
    emptyMessage?: string;
    /** If true, clears selection after change (useful for "Add" actions) */
    resetAfterSelect?: boolean;
    /** If true, the trigger button takes full width */
    fullWidth?: boolean;
    /** Custom trigger content */
    trigger?: React.ReactNode;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select option...",
    searchPlaceholder = "Search...",
    disabled = false,
    className,
    emptyMessage = "No options found.",
    resetAfterSelect = false,
    fullWidth = false,
    trigger,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);

    const filteredOptions = React.useMemo(() => {
        if (!searchQuery) return options;
        return options.filter((option) =>
            option.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [options, searchQuery]);

    const selectedOption = options.find((opt) => opt.value === value);

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        if (resetAfterSelect) {
            onChange(null);
        }
        setOpen(false);
        setSearchQuery("");
    };

    return (
        <div className={cn("relative", fullWidth ? "w-full" : "w-[200px]", className)} ref={containerRef}>
            <div onClick={() => !disabled && setOpen(!open)}>
                {trigger ? (
                    trigger
                ) : (
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn("w-full justify-between", !value && "text-muted-foreground")}
                        disabled={disabled}
                        type="button"
                    >
                        {selectedOption ? selectedOption.label : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                )}
            </div>

            {open && (
                <div className="absolute top-[calc(100%+4px)] z-50 w-full min-w-[200px] rounded-md border border-border bg-background text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={cn(
                                "flex h-11 w-full rounded-md bg-background py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                            )}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={cn(
                                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                        value === option.value && "bg-accent text-accent-foreground"
                                    )}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
