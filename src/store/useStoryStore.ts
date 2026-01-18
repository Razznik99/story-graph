import { create } from 'zustand';

type StoryStore = {
    selectedStoryId: string | null;
    currentUserRole: string | null;
    setSelectedStoryId: (id: string, role?: string | null) => void;
    clearSelectedStory: () => void;
};

export const useStoryStore = create<StoryStore>((set) => ({
    selectedStoryId: typeof window !== 'undefined' ? localStorage.getItem('selectedStoryId') : null,
    currentUserRole: null, // 'Owner' | 'Edit' | 'Comment' | 'View' | null
    setSelectedStoryId: (id, role = null) => {
        localStorage.setItem('selectedStoryId', id);
        set({ selectedStoryId: id, currentUserRole: role });
    },
    clearSelectedStory: () => {
        localStorage.removeItem('selectedStoryId');
        set({ selectedStoryId: null, currentUserRole: null });
    },
}));
