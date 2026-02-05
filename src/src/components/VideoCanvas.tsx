import React, { useEffect, useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { useProjectStore } from '../store/useProjectStore';
import { Upload, FileVideo, Play, Pause, Loader2 } from 'lucide-react';

const VideoCanvas: React.FC = () => {
    const {
        videoMetadata,
        setVideoMetadata,
        processingParams,
        currentTime,
        isPlaying,
        setIsPlaying,
        setCurrentTime,
        isProcessing,
        setIsProcessing,
        blobUrl,
        setBlobUrl
    } = useProjectStore();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const requestRef = useRef<number | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Load Video
    const handleLoadVideo = async () => {
        try {
            setIsLoading(true);
            setErrorMessage(null);
            console.log("Opening file dialog...");
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'Video',
                    extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm']
                }]
            });
            console.log("Selected file:", selected);

            if (selected && typeof selected === 'string') {
                console.log("Reading file content...");
                const fileContents = await readFile(selected);
                const blob = new Blob([fileContents], { type: 'video/mp4' });
                const newBlobUrl = URL.createObjectURL(blob);

                console.log("Created Blob URL:", newBlobUrl);
                setBlobUrl(newBlobUrl);

                setVideoMetadata({
                    path: selected,
                    duration: 0,
                    width: 0,
                    height: 0,
                    fps: 30,
                });

                // Set time to slightly >0 to encourage frame rendering e.g. cover
                // But generally 0 is fine if the video starts there.
                setCurrentTime(0.0);
                setIsPlaying(false);
            }
        } catch (err) {
            console.error('Failed to open video:', err);
            setErrorMessage(`Failed to load video: ${err}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Metadata Handler
    const handleLoadedMetadata = () => {
        const video = videoRef.current;
        if (!video || !videoMetadata) return;

        console.log("Video metadata loaded from element:", video.duration, video.videoWidth);
        setVideoMetadata({
            ...videoMetadata,
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
        });
        setIsLoading(false);

        // Force a seek to current time (usually 0) to render the first frame
        video.currentTime = currentTime;
    };

    // Sync Playback State: Store -> Video Element
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.play().catch(e => {
                console.error("Play failed:", e);
                setIsPlaying(false);
            });
        } else {
            video.pause();
        }
    }, [isPlaying, setIsPlaying]);

    // Sync Seek: Store -> Video Element
    useEffect(() => {
        const video = videoRef.current;
        if (!video || isPlaying) return;

        if (Math.abs(video.currentTime - currentTime) > 0.1) {
            video.currentTime = currentTime;
        }

        // Manual Draw on Seek (or initial load)
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx && video.readyState >= 2) {
                if (canvasRef.current.width !== video.videoWidth || canvasRef.current.height !== video.videoHeight) {
                    canvasRef.current.width = video.videoWidth;
                    canvasRef.current.height = video.videoHeight;
                }
                ctx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
    }, [currentTime, isPlaying]);


    // Animation / Drawing Loop
    const drawLoop = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && canvas && videoMetadata) {
            // Update Time State (if playing)
            if (!video.paused && !video.ended) {
                setCurrentTime(video.currentTime);
            }

            // Draw Original Frame continuously
            const ctx = canvas.getContext('2d');
            if (ctx && video.readyState >= 2) {
                if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                }
                ctx.drawImage(video, 0, 0);
            }
        }
        requestRef.current = requestAnimationFrame(drawLoop);
    }, [videoMetadata, setCurrentTime]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(drawLoop);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [drawLoop]);

    const togglePlay = () => setIsPlaying(!isPlaying);

    if (!videoMetadata && !blobUrl) {
        return (
            <div className="relative w-full max-w-5xl aspect-video bg-zinc-900/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5 ring-1 ring-white/10 flex flex-col items-center justify-center text-zinc-500 gap-4 group hover:border-cyan-500/30 transition-colors">
                <div className="w-24 h-24 rounded-2xl bg-zinc-800/50 flex items-center justify-center border border-dashed border-zinc-700 group-hover:scale-105 transition-transform duration-300">
                    <FileVideo className="w-10 h-10 opacity-50 group-hover:text-cyan-400 group-hover:opacity-100 transition-all" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-medium text-zinc-300">未加载视频 (No Video)</p>
                    <p className="text-xs text-zinc-600 mt-1">导入视频以开始制作像素艺术</p>
                </div>
                <button
                    onClick={handleLoadVideo}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-cyan-900/20 active:scale-95 flex items-center gap-2"
                >
                    <Upload className="w-4 h-4" />
                    导入视频 (Import)
                </button>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-5xl aspect-video bg-zinc-900/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5 ring-1 ring-white/10 group">
            {/* Main Canvas */}
            <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
            />

            {/* Overlay Controls */}
            {videoMetadata && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex justify-between items-start">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300 border border-white/10">
                            原视频: {videoMetadata.width}x{videoMetadata.height}px
                        </div>
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-mono text-cyan-400 border border-white/10 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                            预览模式 (Preview)
                        </div>
                    </div>

                    <div className="flex justify-center pointer-events-auto">
                        <button
                            onClick={togglePlay}
                            className="w-16 h-16 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 border border-white/10"
                        >
                            {isPlaying ? (
                                <Pause className="w-8 h-8 fill-current" />
                            ) : (
                                <Play className="w-8 h-8 fill-current ml-1" />
                            )}
                        </button>
                    </div>

                    <div className="flex justify-end">
                    </div>
                </div>
            )}

            {/* Error Message */}
            {errorMessage && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4 z-50 p-8 text-center">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-2">
                        <span className="text-2xl font-bold">!</span>
                    </div>
                    <h3 className="text-red-400 font-bold">视频加载失败</h3>
                    <p className="text-zinc-500 text-sm max-w-md">{errorMessage}</p>
                    <button
                        onClick={handleLoadVideo}
                        className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-sm transition-colors border border-white/5"
                    >
                        重试 (Retry)
                    </button>
                </div>
            )}

            {/* Hidden Stats/Overlays */}
            {isProcessing && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-cyan-400 px-4 py-1.5 rounded-full text-xs flex items-center gap-2 border border-cyan-500/30 shadow-lg shadow-cyan-900/20 z-50">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                    处理中 (Processing)...
                </div>
            )}

            {/* Hidden Video Element for Playback Source */}
            {blobUrl && (
                <video
                    ref={videoRef}
                    src={blobUrl}
                    className="hidden"
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                    onError={(e) => {
                        console.error("Video element error:", e);
                        setErrorMessage("Playback Engine Error");
                    }}
                />
            )}
        </div>
    );
};

export default VideoCanvas;
