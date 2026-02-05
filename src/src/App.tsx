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
      const output = await save({
        filters: [{
          name: 'Video',
          extensions: ['mp4']
        }],
        defaultPath: 'pixel_art_output.mp4',
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
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500/30">
      {/* Left Sidebar - Control Panel */}
      <ControlPanel />

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-dotted-spacing-4 bg-dotted-zinc-800/30 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950/80 via-transparent to-zinc-950/50 pointer-events-none" />

        {/* Header / Toolbar */}
        <header className="h-16 flex items-center justify-between px-6 z-10 border-b border-white/5 backdrop-blur-md bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent tracking-tight">PixelForge</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">v0.1.0 Beta</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Progress Bar (Visible only when exporting) */}
            {isExporting && (
              <div className="flex items-center gap-3 w-64 bg-zinc-800/50 rounded-full px-4 py-1.5 border border-white/5">
                <span className="text-xs text-cyan-400 font-mono whitespace-nowrap">{Math.round(exportProgress)}%</span>
                <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleExport}
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-sm transition-all hover:shadow-lg hover:shadow-cyan-500/25 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100"
              disabled={!videoMetadata || isExporting}
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileVideo className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />}
              {isExporting ? '处理中 (Processing)...' : '导出视频 (Export)'}
            </button>
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
