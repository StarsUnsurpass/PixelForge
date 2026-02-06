# 更新日志 (Changelog)

## [v0.2.0] - 2026-02-06

### ✨ 新增功能 (New Features)
- **视频调速 (Video Speed)**: 支持 0.1x (慢动作) 到 4.0x (快进) 的无级变速，音频同步处理。
- **智能插帧 (AI Interpolation)**: 引入了 `minterpolate` 运动补帧技术，支持将低帧率视频转换为 30fps 或 60fps 的流畅动画。
    - **性能优化**: 采用 "先缩放后插帧" (Downscale-First) 策略，性能提升 20倍+，确保像素艺术风格的清晰度。
- **现代化 "浮动卡片" UI**:
    - 全新设计的界面布局，采用浮动卡片、圆角和阴影，视觉效果更现代。
    - 优化了控制面板宽度 (320px) 和内部组件的圆润度。
- **智能导出**:
    - 自动生成 `pixel_[文件名]` 格式的默认导出文件名。
    - 进度条移至顶部导出按钮下方，更简洁直观。
    - 修复了进度条 0% 卡顿问题，支持实时精确进度显示。

### 🔧 改进 (Improvements)
- **FFmpeg 滤镜链重构**: 优化了滤镜执行顺序 `Speed -> Interpolation -> Downscale -> Dither -> Upscale`，确保画面质量和处理速度的最佳平衡。
- **标题优化**: 将 "PixelForge" 标题颜色统一为白色，提升可读性。

## [v0.1.0 Beta] - 2026-02-05

### ✨ 新增功能 (New Features)
- **8-bit 视频导出**: 实现了完整的视频导出流水线，支持像素化、色彩量化和抖动处理。
- **现代化 UI 重构**: 采用了 "Cyber/Dark" 风格的全新界面，包含玻璃拟态效果和流畅的动画。
- **全中文界面**: 应用程序现已完全本地化为中文。
- **导出进度条**: 导出视频时，顶部栏会显示实时的进度条。
- **视频封面支持**: 导入视频时自动加载第一帧作为封面。

### 🔧 改进 (Improvements)
- **侧边栏优化**: 将侧边栏宽度调整为 384px (w-96)，提供更舒适的操作空间。
- **播放性能**: 重写了 `VideoCanvas` 的播放逻辑，解决了播放卡顿和同步问题。
- **错误处理**: 增强了 FFmpeg 路径检测和导出时的错误提示。

---

## 📅 历史日志 (History)

### 2026年2月5日 (Initialization)
*   **项目初始化**:
    *   创建了 `PixelForge` 项目骨架。
    *   生成了项目的 `README.md` 文档。
*   **后端设置 (Rust + Tauri)**:
    *   配置了根目录的 `Cargo.toml` 为工作区，包含 `src-tauri`。
    *   `src-tauri/Cargo.toml` 中添加了所有后端依赖，包括 `ffmpeg-next`, `rayon`, `image`, `color_quant`, `base64`。
    *   将 `src-tauri/Cargo.toml` 中的包名从 `app` 修改为 `PixelForge`，以匹配项目主名称。
    *   配置 `src-tauri/tauri.conf.json` 以将 FFmpeg 可执行文件打包到资源中，并创建了占位符文件。
    *   实现了 Rust 后端命令 `greet`，用于基本的问候功能。
    *   实现了 Rust 后端命令 `extract_frame`，用于从视频中提取帧并返回 Base64 编码的图像。
    *   实现了 Rust 后端命令 `process_frame`，用于对图像进行下采样、色彩量化（基本最近邻映射）和上采样，并返回 Base64 编码的图像。
    *   实现了 Rust 后端命令 `export_video` 的初始结构，用于调用 FFmpeg 进行视频导出，目前仅打印命令字符串。
*   **前端设置 (React)**:
    *   使用 Vite 创建了基于 React + TypeScript 的前端项目 (`src/src` 目录)。
    *   安装了 Tailwind CSS 并进行了配置。
    *   配置了 `tsconfig.json` 和 `tsconfig.app.json` 中的路径别名 (`@/*`)。
    *   由于网络问题，Shadcn/UI 的初始化被取消，待后续解决。
    *   安装了 `zustand` 和 `framer-motion`。
    *   在 `App.tsx` 中创建了基本的应用布局，包括侧边栏、主内容区和底部时间轴。
    *   实现了可拖动的分割预览画布，用于展示原始视频和处理后的 8-bit 效果。
    *   实现了时间轴的初步 UI 结构，包含轨道、播放头和修剪手柄的占位符。
    *   在前端添加了调用 Rust `greet` 命令的按钮，验证前后端通信。
