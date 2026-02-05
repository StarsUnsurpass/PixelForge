import { useState, useRef, useEffect, useCallback } from 'react'
import { invoke } from "@tauri-apps/api/tauri";
import './App.css'

function App() {
  const [dividerPosition, setDividerPosition] = useState(50); // 0-100 percentage
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [greetingMessage, setGreetingMessage] = useState("");

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Clamp the position to be within 10% and 90%
    setDividerPosition(Math.max(10, Math.min(90, newPosition)));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetingMessage(await invoke("greet", { name: "World" }));
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Sidebar (Control Inspector) */}
      <aside className="w-64 bg-gray-800 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Control Inspector</h2>
        {/* Placeholder for controls */}
        <div className="space-y-4 flex-grow">
          <div className="bg-gray-700 p-3 rounded">Resolution Scale</div>
          <div className="bg-gray-700 p-3 rounded">Color Depth</div>
          <div className="bg-gray-700 p-3 rounded">Dithering Algorithm</div>
        </div>
        <div className="mt-auto pt-4 border-t border-gray-700">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Export Video
          </button>
        </div>
      </aside>

      {/* Main Content Area (Split Preview Canvas) */}
      <main className="flex-1 flex flex-col">
        {/* Top bar for potential controls or title */}
        <header className="bg-gray-800 p-4 shadow-md flex items-center justify-between">
          <h1 className="text-2xl font-bold">PixelForge</h1>
          <div className="flex items-center space-x-4">
            <input type="file" className="hidden" id="video-upload" accept="video/*" />
            <label htmlFor="video-upload" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded cursor-pointer">
              Upload Video
            </label>
            <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded" onClick={greet}>
              Greet Backend
            </button>
            {greetingMessage && <p>{greetingMessage}</p>}
            <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
              Play/Pause
            </button>
          </div>
        </header>

        {/* Preview Area with Split Canvas */}
        <div ref={containerRef} className="relative flex-1 bg-gray-900 overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-black" style={{ width: `${dividerPosition}%` }}>
            <canvas id="original-canvas" className="w-full h-full object-contain"></canvas>
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">Original</div>
          </div>
          <div className="absolute top-0 right-0 h-full bg-black" style={{ width: `${100 - dividerPosition}%` }}>
            <canvas id="pixelated-canvas" className="w-full h-full object-contain"></canvas>
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">8-bit</div>
          </div>

          {/* Divider */}
          <div
            className="absolute top-0 bottom-0 w-2 bg-blue-500 cursor-ew-resize opacity-50 hover:opacity-100 transition-opacity"
            style={{ left: `calc(${dividerPosition}% - 4px)` }} // Adjust for divider width
            onMouseDown={handleMouseDown}
          ></div>
        </div>

        {/* Bottom Panel (Timeline) */}
        <footer className="h-32 bg-gray-800 p-4 shadow-inner flex flex-col">
          <h2 className="text-lg font-bold mb-2">Timeline</h2>
          <div className="relative flex-grow bg-gray-700 rounded-md">
            {/* Timeline Track */}
            <div className="absolute inset-0 bg-gray-600 rounded-md"></div>
            {/* Playhead */}
            <div className="absolute top-0 bottom-0 w-1 bg-red-500" style={{ left: '10%' }}></div>
            {/* Trim Handles */}
            <div className="absolute top-0 bottom-0 w-3 bg-green-500 cursor-col-resize rounded-l" style={{ left: '5%' }}></div>
            <div className="absolute top-0 bottom-0 w-3 bg-green-500 cursor-col-resize rounded-r" style={{ right: '5%' }}></div>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default App
