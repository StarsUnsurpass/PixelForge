# PixelForge

PixelForge 是一款高性能桌面应用程序，旨在将视频转换为 8-bit 复古风格的杰作。它利用现代技术栈，将强大的后端处理与流畅直观的用户界面相结合。

## 🌟 主要功能

*   **实时 8-bit 预览**: 实时查看视频应用 8-bit 效果，并随参数调整立即更新。
*   **高性能渲染**: 利用 Rust 和 FFmpeg 实现快速高效的视频处理。
*   **高级参数控制**: 精细调整视频外观，包括：
    *   分辨率缩放 (Resolution Scaling)
    *   色彩深度量化 (Color Depth Quantization)
    *   抖动算法 (Dithering Algorithms)
*   **自定义调色板**:
    *   内置经典游戏机配色（如 GameBoy, NES）。
    *   从源视频自动提取调色板。
    *   支持从图片导入调色板。
*   **音频降维处理 (Audio Bit-Crushing)**: 通过降低采样率和位深，为音频轨道添加复古效果。
*   **对比滑块 (Comparison Slider)**: 通过可拖动滑块，直观对比原始视频与像素化效果。
*   **纹理叠加 (Texture Overlays)**: 添加 CRT 扫描线或其他复古纹理。
*   **离线运行**: 所有处理均在本地机器上进行，无需网络连接，保护用户隐私。

## 🛠️ 技术栈

*   **后端**: [Rust](https://www.rust-lang.org/)
    *   **框架**: [Tauri](https://tauri.app/) (v2) 用于窗口管理和原生 API 访问。
    *   **并行计算**: [Rayon](https://github.com/rayon-rs/rayon) 用于多核视频帧并行处理。
    *   **视频编解码**: [FFmpeg](https://ffmpeg.org/) (通过 Sidecar 模式) 用于健壮的视频处理。
    *   **图像算法**: [image-rs](https://github.com/image-rs/image) 和 [color_quant](https://crates.io/crates/color_quant) 用于像素艺术算法。
*   **前端**: [React](https://reactjs.org/)
    *   **UI 库**: [Shadcn/UI](https://ui.shadcn.com/) 用于高度可定制的现代化组件集。
    *   **样式**: [Tailwind CSS](https://tailwindcss.com/) 用于原子化 CSS 工作流。
    *   **状态管理**: [Zustand](https://github.com/pmndrs/zustand) 用于轻量级全局状态管理。
    *   **动画库**: [Framer Motion](https://www.framer.com/motion/) 用于流畅的 UI 动画。
    *   **构建工具**: [Vite](https://vitejs.dev/) 提供快速开发体验。

## 🏗️ 架构设计

PixelForge 采用混合架构，UI (前端) 和核心逻辑 (后端) 在独立的进程中运行，通过 Tauri 的 IPC 通道进行通信。

1.  **前端 (React 进程)**: 运行在 Tauri 管理的 WebView2 (Windows Edge 内核) 中，负责渲染界面、处理用户交互和展示预览。
2.  **后端 (Rust 进程)**: 原生 Rust 进程，负责文件 I/O、FFmpeg 调用、图像算法计算和系统级操作。这确保了接近原生的性能，对视频处理至关重要。

这种分离确保了即使后端执行 CPU 密集型任务时，UI 也能保持响应。

## 📋 开发进度日志

### 2026年2月5日

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

---
**后续计划:**
*   解决 Shadcn/UI 的网络安装问题，并集成 UI 组件。
*   完善 `process_frame` 中的抖动算法（如 Floyd-Steinberg）。
*   在 `export_video` 命令中实现 FFmpeg 的实际执行、帧的流式处理和进度报告。
*   连接前端 UI 与后端 `extract_frame`、`process_frame` 和 `export_video` 命令，实现视频加载、实时预览和导出功能。
*   实现高级调色板系统、音频降维、纹理叠加等增强功能。