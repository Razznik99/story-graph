'use client';

import { Loader } from "@/components/ui/Loader";

export default function TestLoading() {
    return (
        <div className="p-8 space-y-8 min-h-screen bg-background text-text-primary transition-colors duration-300">
            <h1 className="text-2xl font-bold mb-4">Loader Gallery</h1>
            <p className="mb-8 opacity-70">
                This page demonstrates the loaders adapting to the current theme (try toggling dark/light mode in the sidebar/settings if available, or manually).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* GET Action */}
                <div className="flex flex-col items-center gap-4 p-6 border border-border rounded-xl bg-surface">
                    <h2 className="text-lg font-semibold">GET Action</h2>
                    <Loader action="get" text="Loading..." />
                    <div className="p-4 bg-gray-900 rounded-lg inline-block">
                        <Loader action="get" theme="Dark" text="Loading..." />
                    </div>
                </div>

                {/* WRITE Action */}
                <div className="flex flex-col items-center gap-4 p-6 border border-border rounded-xl bg-surface">
                    <h2 className="text-lg font-semibold">WRITE Action</h2>
                    <Loader action="write" text="Saving..." />
                    <div className="p-4 bg-gray-900 rounded-lg inline-block">
                        <Loader action="write" theme="Dark" text="Saving..." />
                    </div>
                </div>

                {/* DELETE Action */}
                <div className="flex flex-col items-center gap-4 p-6 border border-border rounded-xl bg-surface">
                    <h2 className="text-lg font-semibold">DELETE Action</h2>
                    <Loader action="delete" text="Deleting..." />
                    <div className="p-4 bg-gray-900 rounded-lg inline-block">
                        <Loader action="delete" theme="Dark" text="Deleting..." />
                    </div>
                </div>
            </div>
        </div>
    )
}