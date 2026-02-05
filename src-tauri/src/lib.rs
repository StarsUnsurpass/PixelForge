#[cfg_attr(mobile, tauri::mobile_entry_point)]

mod palettes;
mod dithering;
mod effects;

// use std::path::Path;
use image::{ImageFormat, DynamicImage, imageops};
use base64::{engine::general_purpose, Engine as _};
use color_quant::NeuQuant;
use std::io::Cursor;
use tauri::path::BaseDirectory;
use tauri::Manager;
use dithering::{DitheringAlgorithm, apply_dithering};
use palettes::{PaletteName, get_palette};
use effects::{CRTEffectsConfig, apply_crt_effects};
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use tauri::Emitter;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn extract_frame(app: tauri::AppHandle, video_path: String, frame_time_ms: u64) -> Result<String, String> {
    // Resolve the bundled ffmpeg path
    #[cfg(target_os = "windows")]
    let binary_name = "resources/ffmpeg.exe";
    #[cfg(not(target_os = "windows"))]
    let binary_name = "resources/ffmpeg";

    let ffmpeg_path = app.path().resolve(binary_name, BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve resource path: {}", e))?;
    let ffmpeg_str = ffmpeg_path.to_string_lossy().to_string();

    // Debug logging
    match std::fs::metadata(&ffmpeg_path) {
        Ok(meta) => println!("DEBUG: Resolved FFmpeg path: '{}', Size: {} bytes", ffmpeg_str, meta.len()),
        Err(e) => println!("DEBUG: Resolved FFmpeg path: '{}', Error reading metadata: {}", ffmpeg_str, e),
    }

    // Convert ms to seconds for -ss argument
    let timestamp_secs = frame_time_ms as f64 / 1000.0;

    let timestamp_str = timestamp_secs.to_string();

    // Construct FFmpeg command to extract a single frame at the specific timestamp
    // -ss: seek to position
    // -i: input file
    // -frames:v 1: extract 1 frame
    // -c:v png: encode as PNG
    // -f image2: force image format
    // pipe:1: output to stdout
    let args = vec![
        "-ss", &timestamp_str,
        "-i", &video_path,
        "-frames:v", "1",
        "-c:v", "png",
        "-f", "image2",
        "pipe:1"
    ];

    println!("Executing FFmpeg extraction: {} {}", ffmpeg_str, args.join(" "));

    let output = Command::new(&ffmpeg_str)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

    if !output.status.success() {
        return Err(format!("FFmpeg failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    // output.stdout contains the PNG image data
    let buf = output.stdout;
    
    if buf.is_empty() {
        return Err("FFmpeg returned empty output".to_string());
    }

    Ok(general_purpose::STANDARD.encode(&buf))
}

#[tauri::command]
async fn process_frame(
    base64_image: String,
    scale_factor: f32,
    color_count: usize,
    dither_algorithm: String,
    palette_name: String,
    dither_strength: f32,
    scanline_intensity: f32,
    curvature_strength: f32,
    vignette_strength: f32,
) -> Result<String, String> {
    let decoded_bytes = general_purpose::STANDARD.decode(&base64_image)
        .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

    let img = image::load_from_memory(&decoded_bytes)
        .map_err(|e| format!("Failed to load image from memory: {}", e))?
        .to_rgb8();

    let (width, height) = img.dimensions();

    // 1. Downscaling
    let scaled_width = (width as f32 * scale_factor).max(1.0) as u32;
    let scaled_height = (height as f32 * scale_factor).max(1.0) as u32;
    // resize returns an ImageBuffer, which we can use directly as RgbImage (since img is Rgb8)
    let resized_img = imageops::resize(&img, scaled_width, scaled_height, imageops::FilterType::Nearest);
    // resized_buffer is RgbImage (ImageBuffer<Rgb<u8>, Vec<u8>>)
    let mut rgb_img = resized_img; // logic flows better if we just use it

    // 2. Color Quantization & Dithering
    let dither_algo = match dither_algorithm.as_str() {
        "Ordered" => DitheringAlgorithm::Ordered,
        "FloydSteinberg" => DitheringAlgorithm::FloydSteinberg,
        _ => DitheringAlgorithm::None,
    };

    let palette = if palette_name != "None" {
        match palette_name.as_str() {
            "GameBoy" => get_palette(PaletteName::GameBoy),
            "NES" => get_palette(PaletteName::NES),
            "CGA" => get_palette(PaletteName::CGA),
            "Pico8" => get_palette(PaletteName::Pico8),
            _ => vec![] 
        }
    } else {
        // Dynamic quantization if no preset palette
        let pixels = rgb_img.as_raw();
        // NeuQuant requires a flat slice of RGBA (usually) or RGB? 
        // color_quant 1.1.0 NeuQuant takes (samplefac, colors, pixels)
        // pixels must be R,G,B,A (4 bytes) per pixel? 
        // "pixels should be a slice of RGBA, 4 bytes per pixel" according to some docs, 
        // but let's check if it accepts RGB. 
        // Actually color_quant expects RGBA usually. Image crate RgbImage is RGB.
        // We might need to convert to RGBA for quantization if using NeuQuant.
        
        // Let's create a temporary RGBA buffer for quantization
        let rgba_pixels: Vec<u8> = pixels.chunks(3)
            .flat_map(|c| vec![c[0], c[1], c[2], 255])
            .collect();

        let nq = NeuQuant::new(10, color_count, &rgba_pixels);
        let color_map = nq.color_map_rgba();
        
        let mut p = Vec::new();
        // color_map is [r, g, b, a, r, g, b, a, ...]
        for i in 0..color_map.len() / 4 {
             p.push(image::Rgb([
                 color_map[i*4],
                 color_map[i*4+1],
                 color_map[i*4+2]
             ]));
        }
        p
    };

    if !palette.is_empty() {
        rgb_img = apply_dithering(&rgb_img, &palette, dither_algo, dither_strength);
    }
    
    // 3. Upscaling (to original size)
    let upscaled_img = imageops::resize(&rgb_img, width, height, imageops::FilterType::Nearest);
    
    // 4. Effects (CRT, etc.) applied on upscaled image
    let effects_config = CRTEffectsConfig {
        scanline_intensity,
        curvature_strength,
        vignette_strength,
    };
    
    // upscaled_img is ImageBuffer, compatible with RgbImage
    let final_img = apply_crt_effects(&upscaled_img, effects_config);

    let mut buf = Vec::new();
    let mut cursor = Cursor::new(&mut buf);
    DynamicImage::ImageRgb8(final_img).write_to(&mut cursor, ImageFormat::Png)
        .map_err(|e| format!("Failed to write processed image to buffer: {}", e))?;

    Ok(general_purpose::STANDARD.encode(&buf))
}



#[tauri::command]
async fn export_video(
    app: tauri::AppHandle,
    input_video_path: String,
    output_video_path: String,
    scale_factor: f32,
    width: u32,
    height: u32,
    total_duration_sec: f64, // Added parameter
) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    let binary_name = "resources/ffmpeg.exe";
    #[cfg(not(target_os = "windows"))]
    let binary_name = "resources/ffmpeg";

    let ffmpeg_path = app.path().resolve(binary_name, BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve resource path: {}", e))?;
        
    let ffmpeg_str = ffmpeg_path.to_string_lossy().to_string();

    // Debug logging
    match std::fs::metadata(&ffmpeg_path) {
        Ok(meta) => println!("DEBUG: Resolved FFmpeg path: '{}', Size: {} bytes", ffmpeg_str, meta.len()),
        Err(e) => println!("DEBUG: Resolved FFmpeg path: '{}', Error reading metadata: {}", ffmpeg_str, e),
    }

    let filter = format!(
        "scale=iw*{scale}:ih*{scale}:flags=neighbor,split[s0][s1];[s0]palettegen=max_colors=32[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5,scale={width}:{height}:flags=neighbor", 
        scale = scale_factor,
        width = width,
        height = height
    );

    let args = vec![
        "-y",
        "-i", &input_video_path,
        "-vf", &filter,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-pix_fmt", "yuv420p", 
        &output_video_path,
    ];

    println!("Executing FFmpeg: {} {}", ffmpeg_str, args.join(" "));

    let mut child = Command::new(&ffmpeg_str)
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn FFmpeg: {}", e))?;

    // Monitor stderr for progress
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;
    let reader = BufReader::new(stderr);
    let app_handle = app.clone();

    std::thread::spawn(move || {
        for line in reader.lines() {
            if let Ok(line) = line {
                // Parse "time=HH:MM:SS.mm"
                if line.contains("time=") {
                    if let Some(time_str) = line.split("time=").nth(1).and_then(|s| s.split_whitespace().next()) {
                        let parts: Vec<&str> = time_str.split(':').collect();
                        if parts.len() == 3 {
                            if let (Ok(h), Ok(m), Ok(s)) = (parts[0].parse::<f64>(), parts[1].parse::<f64>(), parts[2].parse::<f64>()) {
                                let current_sec = h * 3600.0 + m * 60.0 + s;
                                let progress = (current_sec / total_duration_sec * 100.0).min(99.0); // Cap at 99% until done
                                
                                let _ = app_handle.emit("export-progress", progress);
                            }
                        }
                    }
                }
            }
        }
    });

    let output = child.wait_with_output()
        .map_err(|e| format!("Failed to wait on FFmpeg: {}", e))?;

    if output.status.success() {
        let _ = app.emit("export-progress", 100.0); // Ensure 100% on success
        Ok(format!("Export successful at {}", output_video_path))
    } else {
        Err(format!("FFmpeg failed: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

pub fn run() {
  tauri::Builder::default()

    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_log::Builder::default().build())
    .invoke_handler(tauri::generate_handler![
        greet, 
        extract_frame, 
        process_frame, 
        export_video
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
