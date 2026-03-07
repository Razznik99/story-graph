import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimelineStore {
    currentLevelId: string | null;
    setCurrentLevelId: (id: string | null) => void;
    focusEventId: string | null;
    setFocusEventId: (id: string | null) => void;
    activeTimelineId: string | null;
    setActiveTimelineId: (id: string | null) => void;
}

export const useTimelineStore = create<TimelineStore>()(
    persist(
        (set) => ({
            currentLevelId: null,
            setCurrentLevelId: (id) => set({ currentLevelId: id }),
            focusEventId: null,
            setFocusEventId: (id) => set({ focusEventId: id }),
            activeTimelineId: null,
            setActiveTimelineId: (id) => set({ activeTimelineId: id }),
        }),
        {
            name: 'timeline-store',
        }
    )
);
