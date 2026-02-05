# 更新日志 (Changelog)

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
