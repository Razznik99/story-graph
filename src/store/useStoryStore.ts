import { create } from 'zustand';

type StoryStore = {
    selectedStoryId: string | null;
    setSelectedStoryId: (id: string) => void;
    clearSelectedStory: () => void;
};

export const useStoryStore = create<StoryStore>((set) => ({
    selectedStoryId: typeof window !== 'undefined' ? localStorage.getItem('selectedStoryId') : null,
    setSelectedStoryId: (id) => {
        localStorage.setItem('selectedStoryId', id);
        set({ selectedStoryId: id });
    },
    clearSelectedStory: () => {
        localStorage.removeItem('selectedStoryId');
        set({ selectedStoryId: null });
    },
}));
