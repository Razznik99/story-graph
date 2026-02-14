import { create } from 'zustand';

interface TimelineStore {
    currentLevelId: string | null;
    setCurrentLevelId: (id: string | null) => void;
}

export const useTimelineStore = create<TimelineStore>((set) => ({
    currentLevelId: null,
    setCurrentLevelId: (id) => set({ currentLevelId: id }),
}));
