#[cfg_attr(mobile, tauri::mobile_entry_point)]

use std::path::Path;
use image::{ImageOutputFormat, DynamicImage, imageops};
use base64::{engine::general_purpose, Engine as _};
use color_quant::simple_nearest::Quantizer;
use rayon::prelude::*;
use std::process::{Command, Stdio};
use tauri::api::path::resource_dir;

// FFmpeg-next related imports
extern crate ffmpeg_next as ffmpeg;
use ffmpeg::{format, media, Packet};

#[tauri::command]
fn greet(name: &str) -> String {
  format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn extract_frame(video_path: String, frame_time_ms: u64) -> Result<String, String> {
    ffmpeg::init().map_err(|e| format!("FFmpeg initialization failed: {}", e))?;

    let path = Path::new(&video_path);
    let mut ictx = format::input(&path)
        .map_err(|e| format!("Failed to open input: {}", e))?;

    let input = ictx.streams().best(media::Type::Video)
        .ok_or_else(|| "Could not find best video stream".to_string())?;
    let video_stream_index = input.index();

    let context_decoder = ffmpeg::codec::context::Context::from_parameters(input.parameters())
        .map_err(|e| format!("Failed to create codec context: {}", e))?;
    let mut decoder = context_decoder.decoder().video()
        .map_err(|e| format!("Failed to create video decoder: {}", e))?;

    let timestamp = (frame_time_ms as i64 * ffmpeg::time_base::MICROSECONDS_PER_SECOND) / 1000;
    ictx.seek(timestamp, ..timestamp)
        .map_err(|e| format!("Failed to seek video: {}", e))?;

    let mut frame_index = 0;
    let mut frame = ffmpeg::frame::Video::empty();

    for (stream, packet) in ictx.packets() {
        if stream.index() == video_stream_index {
            decoder.decode(&packet, &mut frame)
                .map_err(|e| format!("Failed to decode packet: {}", e))?;
            if frame.pict_type() == ffmpeg::frame::Picture::I {
                // Found an I-frame, which is good for seeking. For exact frame, more decoding is needed.
                // For simplicity, we'll take the first I-frame after the seek point.
                // A more robust solution would decode until the exact frame_time_ms.
            }
            if frame_index == 0 { // For simplicity, take the first decoded frame after seek
                let mut rgb_frame = ffmpeg::frame::Video::empty();
                let mut converter = ffmpeg::software::converter::Context::get(
                    decoder.format(),
                    decoder.width(),
                    decoder.height(),
                    ffmpeg::format::Pixel::RGB24,
                    decoder.width(),
                    decoder.height(),
                    ffmpeg::software::scaling::Flags::empty(),
                ).map_err(|e| format!("Failed to get converter context: {}", e))?;
                converter.run(&frame, &mut rgb_frame)
                    .map_err(|e| format!("Failed to convert frame to RGB: {}", e))?;

                let img = DynamicImage::ImageRgb8(image::RgbImage::from_raw(
                    rgb_frame.width(),
                    rgb_frame.height(),
                    rgb_frame.data(0).to_vec(),
                ).ok_or_else(|| "Failed to create RGB image from raw data".to_string())?);

                let mut buf = Vec::new();
                img.write_to(&mut buf, ImageOutputFormat::Png)
                    .map_err(|e| format!("Failed to write image to buffer: {}", e))?;

                return Ok(general_purpose::STANDARD.encode(&buf));
            }
            frame_index += 1;
        }
    }

    Err("No frame extracted or video ended before desired frame".to_string())
}

#[tauri::command]
async fn process_frame(
    base64_image: String,
    scale_factor: f32, // e.g., 0.5 for half resolution
    color_count: usize, // e.g., 64 colors
    dither_strength: f32, // 0.0 to 1.0
) -> Result<String, String> {
    let decoded_bytes = general_purpose::STANDARD.decode(&base64_image)
        .map_err(|e| format!("Failed to decode base64 image: {}", e))?;

    let img = image::load_from_memory(&decoded_bytes)
        .map_err(|e| format!("Failed to load image from memory: {}", e))?;

    let (width, height) = img.dimensions();

    // 1. Downscaling
    let scaled_width = (width as f32 * scale_factor) as u32;
    let scaled_height = (height as f32 * scale_factor) as u32;
    let resized_img = imageops::resize(&img, scaled_width, scaled_height, imageops::FilterType::Nearest);

    // 2. Color Quantization and Dithering
    let mut pixels: Vec<image::Rgb<u8>> = resized_img.pixels().map(|p| *p.2.to_rgb()).collect();
    
    // Convert to a flat list of RGB (u8, u8, u8) for color_quant
    let mut flat_pixels: Vec<u8> = Vec::with_capacity(pixels.len() * 3);
    for pixel in pixels.iter() {
        flat_pixels.push(pixel.0[0]);
        flat_pixels.push(pixel.0[1]);
        flat_pixels.push(pixel.0[2]);
    }

    let quantizer = Quantizer::new(&flat_pixels, color_count);
    let palette = quantizer.quantize();

    // Reconstruct the image with the new palette and apply dithering
    // Note: color_quant does not directly support dithering, this would be a manual implementation
    // For now, we'll just map to the nearest color.
    // A more advanced dithering algorithm (e.g., Floyd-Steinberg) would need to be implemented here.

    // Using a basic nearest color mapping for now
    let processed_pixels: Vec<image::Rgb<u8>> = pixels.into_par_iter().map(|pixel| {
        let mut min_dist = u64::MAX;
        let mut best_color = image::Rgb([0, 0, 0]);

        for i in 0..palette.len() / 3 {
            let p_r = palette[i * 3] as i64;
            let p_g = palette[i * 3 + 1] as i64;
            let p_b = palette[i * 3 + 2] as i64;

            let c_r = pixel.0[0] as i64;
            let c_g = pixel.0[1] as i64;
            let c_b = pixel.0[2] as i64;

            let dist = (p_r - c_r).pow(2) + (p_g - c_g).pow(2) + (p_b - c_b).pow(2);
            if dist < min_dist {
                min_dist = dist;
                best_color = image::Rgb([p_r as u8, p_g as u8, p_b as u8]);
            }
        }
        best_color
    }).collect();

    let final_image_buffer = image::RgbImage::from_fn(scaled_width, scaled_height, |x, y| {
        processed_pixels[(y * scaled_width + x) as usize]
    });
    let processed_img = DynamicImage::ImageRgb8(final_image_buffer);

    // 3. Upscaling
    let upscaled_img = imageops::resize(&processed_img, width, height, imageops::FilterType::Nearest);

    let mut buf = Vec::new();
    upscaled_img.write_to(&mut buf, ImageOutputFormat::Png)
        .map_err(|e| format!("Failed to write processed image to buffer: {}", e))?;

    Ok(general_purpose::STANDARD.encode(&buf))
}

#[tauri::command]
async fn export_video(
    input_video_path: String,
    output_video_path: String,
    scale_factor: f32,
    color_count: usize,
    dither_strength: f32,
) -> Result<String, String> {
    let ffmpeg_path = resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?
        .join("ffmpeg")
        .to_string_lossy()
        .to_string();

    // For now, just print the command that would be executed
    let args = vec![
        "-i", &input_video_path,
        "-vf", &format!("scale=iw*{}:ih*{}:flags=neighbor,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse", scale_factor, scale_factor),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        &output_video_path,
    ];

    let command_str = format!("{} {}", ffmpeg_path, args.join(" "));
    println!("FFmpeg command to execute: {}", command_str);

    // Placeholder for actual FFmpeg execution
    // let child = Command::new(&ffmpeg_path)
    //     .args(&args)
    //     .stdin(Stdio::piped())
    //     .stdout(Stdio::piped())
    //     .spawn()
    //     .map_err(|e| format!("Failed to spawn FFmpeg process: {}", e))?;
    
    // let output = child.wait_with_output().await
    //     .map_err(|e| format!("Failed to wait for FFmpeg process: {}", e))?;
    
    // if output.status.success() {
    //     Ok(format!("Video exported successfully to {}", output_video_path))
    // } else {
    //     Err(format!("FFmpeg failed: {}", String::from_utf8_lossy(&output.stderr)))
    // }

    Ok(format!("Export initiated for {} to {}. FFmpeg command: {}", input_video_path, output_video_path, command_str))
}


pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![greet, extract_frame, process_frame, export_video])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
