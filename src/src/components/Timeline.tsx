import React, { useRef } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { formatTime } from '../utils/time';

const Timeline: React.FC = () => {
    const {
        videoMetadata,
        currentTime,
        isPlaying,
        setCurrentTime,
        setIsPlaying
    } = useProjectStore();

    const timelineRef = useRef<HTMLDivElement>(null);

    // Handle Play/Pause
    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    // Handle Scrubbing
    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoMetadata || !timelineRef.current) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const newTime = percentage * videoMetadata.duration;

        setCurrentTime(newTime);
    };

    const currentPercent = videoMetadata ? (currentTime / videoMetadata.duration) * 100 : 0;

    return (
        <footer className="h-24 bg-gray-900 border-t border-gray-800 flex flex-col">
            {/* Controls Bar */}
            <div className="h-10 flex items-center justify-between px-4 bg-gray-850 border-b border-gray-800">
                <div className="flex items-center gap-4">
                    <button
                        className="p-1 hover:text-blue-400 disabled:opacity-50"
                        onClick={() => setCurrentTime(0)}
                        disabled={!videoMetadata}
                    >
                        <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                        className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-50 disabled:bg-gray-700"
                        onClick={togglePlay}
                        disabled={!videoMetadata}
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 pl-0.5" />}
                    </button>

                    <button
                        className="p-1 hover:text-blue-400 disabled:opacity-50"
                        onClick={() => videoMetadata && setCurrentTime(videoMetadata.duration)}
                        disabled={!videoMetadata}
                    >
                        <SkipForward className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-mono text-gray-400">
                        {formatTime(currentTime)} / {videoMetadata ? formatTime(videoMetadata.duration) : "00:00:00"}
                    </span>
                </div>
            </div>

            {/* Timeline Track */}
            <div className="flex-1 p-4 relative flex items-center">
                <div
                    ref={timelineRef}
                    className="relative w-full h-8 bg-gray-800 rounded cursor-pointer group"
                    onClick={handleScrub}
                // Add drag handling logic here for smoother scrubbing
                >
                    {/* Buffered/Loaded progress (placeholder) */}

                    {/* Playhead Position */}
                    <div
                        className="absolute top-0 bottom-0 bg-blue-500/30 border-r-2 border-blue-500 w-full origin-left pointer-events-none"
                        style={{ transform: `scaleX(${currentPercent / 100})` }}
                    />

                    {/* Hover Indicator */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-0.5 h-full bg-white/50 absolute top-0" style={{ left: '50%' /* Would track mouse */ }}></div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Timeline;
