import React from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { Sliders, Monitor, Palette, Grid, Upload } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

const ControlPanel = () => {
    const {
        processingParams,
        updateProcessingParams,
        setVideoMetadata,
        setBlobUrl,
        videoMetadata
    } = useProjectStore();

    const handleFileSelect = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'Video',
                    extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm']
                }]
            });

            if (selected && typeof selected === 'string') {
                setVideoMetadata(null);
                setBlobUrl(null);
            }
        } catch (err) {
            console.error("Failed to open file dialog", err);
        }
    };

    return (
        <aside className="w-96 bg-zinc-900/80 border-r border-white/5 flex flex-col backdrop-blur-xl z-20 shadow-xl shadow-black/20">
            <div className="p-6 border-b border-white/5">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sliders className="w-3 h-3" />
                    项目设置 (Project)
                </h2>
                <button
                    onClick={handleFileSelect}
                    className="w-full h-20 border border-zinc-700/50 bg-zinc-800/20 hover:bg-zinc-800/50 rounded-xl flex items-center justify-center gap-3 text-zinc-400 hover:text-cyan-400 transition-all group hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10"
                >
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:bg-cyan-500/20 group-hover:text-cyan-400">
                        <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{videoMetadata ? '重置 / 更改视频' : '导入视频'}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">

                {/* Pixelation Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-cyan-400">
                        <Grid className="w-4 h-4" />
                        <h3 className="text-sm font-bold uppercase tracking-wider">像素化 (Pixelation)</h3>
                    </div>

                    <div className="space-y-5 bg-zinc-800/30 p-5 rounded-xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="space-y-3 relative">
                            <div className="flex justify-between text-xs items-center">
                                <span className="text-zinc-400 font-medium">缩放比例 (Scale)</span>
                                <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-mono border border-cyan-500/20">{processingParams.scaleFactor.toFixed(2)}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.05"
                                max="1.0"
                                step="0.05"
                                value={processingParams.scaleFactor}
                                onChange={(e) => updateProcessingParams({ scaleFactor: parseFloat(e.target.value) })}
                                className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
                            />
                            <p className="text-[10px] text-zinc-500">数值越小，像素颗粒越大。</p>
                        </div>
                    </div>
                </section>

                {/* Color Palette Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-purple-400">
                        <Palette className="w-4 h-4" />
                        <h3 className="text-sm font-bold uppercase tracking-wider">色彩与抖动 (Color)</h3>
                    </div>

                    <div className="space-y-5 bg-zinc-800/30 p-5 rounded-xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-zinc-400 block font-medium">调色板 (Palette)</label>
                                <select
                                    value={processingParams.paletteName}
                                    onChange={(e) => updateProcessingParams({ paletteName: e.target.value as any })}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all appearance-none"
                                >
                                    <option value="None">自适应 (Auto)</option>
                                    <option value="GameBoy">GameBoy (4色 绿调)</option>
                                    <option value="NES">NES (红白机经典)</option>
                                    <option value="Pico8">PICO-8 (16色幻想)</option>
                                    <option value="CGA">CGA (复古16色)</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-zinc-400 block font-medium">抖动算法 (Dither)</label>
                                <select
                                    value={processingParams.ditherAlgorithm}
                                    onChange={(e) => updateProcessingParams({ ditherAlgorithm: e.target.value as any })}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all appearance-none"
                                >
                                    <option value="None">无抖动 (None)</option>
                                    <option value="Ordered">有序抖动 (Bayer)</option>
                                    <option value="FloydSteinberg">Floyd-Steinberg (扩散)</option>
                                </select>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex justify-between text-xs items-center">
                                    <span className="text-zinc-400 font-medium">色彩数量 (Colors)</span>
                                    <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded text-[10px] font-mono border border-purple-500/20">{processingParams.colorCount}</span>
                                </div>
                                <input
                                    type="range"
                                    min="2"
                                    max="64"
                                    step="1"
                                    value={processingParams.colorCount}
                                    onChange={(e) => updateProcessingParams({ colorCount: parseInt(e.target.value) })}
                                    className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* CRT Effects Section */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-emerald-400">
                        <Monitor className="w-4 h-4" />
                        <h3 className="text-sm font-bold uppercase tracking-wider">CRT 特效 (Effects)</h3>
                    </div>

                    <div className="space-y-5 bg-zinc-800/30 p-5 rounded-xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative space-y-3">
                            <div className="flex justify-between text-xs items-center">
                                <span className="text-zinc-400 font-medium">扫描线 (Scanlines)</span>
                                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-500/20">{Math.round(processingParams.scanlineIntensity * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={processingParams.scanlineIntensity}
                                onChange={(e) => updateProcessingParams({ scanlineIntensity: parseFloat(e.target.value) })}
                                className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
                            />
                        </div>
                    </div>
                </section>

            </div>

            <div className="p-4 border-t border-white/5 bg-zinc-950/30 text-[10px] text-zinc-600 text-center flex justify-between px-6">
                <span>PixelForge Engine</span>
                <span className="font-mono opacity-50">DEV.BUILD</span>
            </div>
        </aside>
    );
};

export default ControlPanel;
