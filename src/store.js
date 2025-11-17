import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAppStore = create(
    persist(
        (set) => ({
            autoplay: true,
            toggleAutoplay: () => set((state) => ({ autoplay: !state.autoplay })),

            sponsorBlockEnabled: true,
            toggleSponsorBlock: () => set((state) => ({ sponsorBlockEnabled: !state.sponsorBlockEnabled })),

            currentVideoId: null,
            isAudioMode: false,
            videoInfo: null,

            playVideo: (videoId, audioOnly = false) => set({
                currentVideoId: videoId,
                isAudioMode: audioOnly,
                videoInfo: null
            }),

            setVideoInfo: (info) => set({ videoInfo: info }),
            closeVideo: () => set({ currentVideoId: null, videoInfo: null }),

            pipElement: null,
            setPipElement: (el) => set({ pipElement: el }),
            clearPipElement: () => set({ pipElement: null }),
        }),
        {
            name: 'vitube-app-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ autoplay: state.autoplay, sponsorBlockEnabled: state.sponsorBlockEnabled }),
        }
    )
);