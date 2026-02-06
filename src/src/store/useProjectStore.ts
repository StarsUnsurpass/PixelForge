import { create } from 'zustand';

export interface VideoMetadata {
    path: string;
    duration: number; // in seconds
    width: number;
    height: number;
    fps: number;
}

export interface ProcessingParams {
    scaleFactor: number; // 0.1 to 1.0
    colorCount: number; // 2 to 256
    ditherAlgorithm: 'None' | 'Ordered' | 'FloydSteinberg';
    paletteName: 'None' | 'GameBoy' | 'NES' | 'CGA' | 'Pico8';
    ditherStrength: number; // 0.0 to 1.0
    scanlineIntensity: number; // 0.0 to 1.0
    curvatureStrength: number; // 0.0 to 1.0
    vignetteStrength: number; // 0.0 to 1.0
    videoSpeed: number; // 0.1 to 4.0 (1.0 = normal)
    interpolationFps: number; // 0 = native, 30, 60
}

interface ProjectState {
    videoMetadata: VideoMetadata | null;
    processingParams: ProcessingParams;
    isPlaying: boolean;
    currentTime: number; // current playback time in seconds
    isProcessing: boolean;
    blobUrl: string | null;

    setVideoMetadata: (metadata: VideoMetadata | null) => void;
    updateProcessingParams: (params: Partial<ProcessingParams>) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentTime: (time: number | ((prev: number) => number)) => void;
    setIsProcessing: (isProcessing: boolean) => void;
    setBlobUrl: (url: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
    videoMetadata: null,
    processingParams: {
        scaleFactor: 0.5,
        colorCount: 16,
        ditherAlgorithm: 'None',
        paletteName: 'None',
        ditherStrength: 0.5,
        scanlineIntensity: 0.0,
        curvatureStrength: 0.0,
        vignetteStrength: 0.0,
        videoSpeed: 1.0,
        interpolationFps: 0,
    },
    isPlaying: false,
    currentTime: 0,
    isProcessing: false,
    blobUrl: null, // Add blobUrl state

    setVideoMetadata: (metadata) => set({ videoMetadata: metadata }),
    updateProcessingParams: (params) => set((state) => ({
        processingParams: { ...state.processingParams, ...params }
    })),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setCurrentTime: (time) => set((state) => ({
        currentTime: typeof time === 'function' ? time(state.currentTime) : time
    })),
    setIsProcessing: (isProcessing) => set({ isProcessing }),
    setBlobUrl: (url: string | null) => set({ blobUrl: url }), // Add setter
}));
