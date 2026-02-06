import ControlPanel from './components/ControlPanel';
import VideoCanvas from './components/VideoCanvas';
import Timeline from './components/Timeline';
import { useProjectStore } from './store/useProjectStore';
import { FileVideo, Loader2, PlayCircle, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event'; // Import listen
import { useState, useEffect } from 'react';

function App() {
  const { videoMetadata, processingParams } = useProjectStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0); // Progress state

  // Listen for export progress
  useEffect(() => {
    const unlistenPromise = listen<number>('export-progress', (event) => {
      setExportProgress(event.payload);
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  const handleExport = async () => {
    if (!videoMetadata) return;

    try {
      // Extract filename from path
      const pathParts = videoMetadata.path.split(/[\\/]/);
      const fileName = pathParts.pop() || 'video.mp4';
      const defaultName = `pixel_${fileName}`;

      const output = await save({
        filters: [{
          name: 'Video',
          extensions: ['mp4']
        }],
        defaultPath: defaultName,
      });

      if (output) {
        setIsExporting(true);
        setExportProgress(0); // Reset progress
        console.log("Starting export to:", output);

        // Call backend export with new parameters
        const result = await invoke('export_video', {
          inputVideoPath: videoMetadata.path,
          outputVideoPath: output,
          scaleFactor: processingParams.scaleFactor,
          width: videoMetadata.width,
          height: videoMetadata.height,
          totalDurationSec: videoMetadata.duration, // Pass duration
          videoSpeed: processingParams.videoSpeed,
          interpolationFps: processingParams.interpolationFps,
        });

        console.log("Export result:", result);
        alert(`导出成功 (Success)!\n文件保存在: ${output}`);
      }
    } catch (e) {
      console.error("Export failed:", e);
      alert(`导出失败 (Failed): ${e}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500/30 p-6 gap-6 relative overflow-hidden">
      {/* Background - kept on a separate layer or on body, but here we can put it absolute behind the cards */}
      <div className="absolute inset-0 bg-dotted-spacing-4 bg-dotted-zinc-800/30 pointer-events-none -z-10" />
      <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950/80 via-transparent to-zinc-950/50 pointer-events-none -z-10" />

      {/* Left Sidebar - Control Panel */}
      <ControlPanel />

      {/* Main Area - Right Card */}
      <main className="flex-1 flex flex-col min-w-0 rounded-3xl overflow-hidden border border-white/5 shadow-2xl bg-zinc-900/50 backdrop-blur-sm relative transition-all duration-300">

        {/* Header / Toolbar */}
        <header className="h-16 flex items-center justify-between px-6 z-10 border-b border-white/5 backdrop-blur-md bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">PixelForge</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">v0.1.0 Beta</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleExport}
              className="group relative inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-sm transition-all hover:shadow-lg hover:shadow-cyan-500/25 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100"
              disabled={!videoMetadata || isExporting}
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileVideo className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />}
              {isExporting ? '处理中...' : '导出视频'}
            </button>

            {/* Progress Bar moved below button */}
            {isExporting && (
              <div className="w-full flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex-1 h-1 bg-zinc-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-cyan-400 font-mono whitespace-nowrap min-w-[24px] text-right">
                  {Math.round(exportProgress)}%
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-0">
          {/* Canvas Section */}
          <div className="flex-1 flex items-center justify-center p-6">
            <VideoCanvas />
          </div>

          {/* Timeline Section */}
          <div className="h-48 border-t border-white/5 bg-zinc-900/80 backdrop-blur-xl">
            <Timeline />
          </div>
        </div>
      </main>

    </div>
  )
}

export default App
