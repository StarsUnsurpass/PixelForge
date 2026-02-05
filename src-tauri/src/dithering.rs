use image::{Rgb, RgbImage};

pub enum DitheringAlgorithm {
    None,
    Ordered,        // Bayer 4x4
    FloydSteinberg,
}

// 4x4 Bayer Matrix
const BAYER_MATRIX: [u8; 16] = [
    0,  8,  2, 10,
    12, 4, 14,  6,
    3, 11,  1,  9,
    15, 7, 13,  5,
];

fn find_closest_color(color: Rgb<u8>, palette: &[Rgb<u8>]) -> Rgb<u8> {
    let mut min_dist = f64::MAX;
    let mut best_color = palette[0];

    for p in palette {
        let r_diff = color[0] as f64 - p[0] as f64;
        let g_diff = color[1] as f64 - p[1] as f64;
        let b_diff = color[2] as f64 - p[2] as f64;
        let dist = r_diff * r_diff + g_diff * g_diff + b_diff * b_diff;

        if dist < min_dist {
            min_dist = dist;
            best_color = *p;
        }
    }
    best_color
}

pub fn apply_dithering(
    img: &RgbImage,
    palette: &[Rgb<u8>],
    algo: DitheringAlgorithm,
    strength: f32
) -> RgbImage {
    let (width, height) = img.dimensions();
    let mut output = img.clone();

    match algo {
        DitheringAlgorithm::None => {
            // Simple nearest neighbor mapping
            for y in 0..height {
                for x in 0..width {
                    let pixel = output.get_pixel_mut(x, y);
                    *pixel = find_closest_color(*pixel, palette);
                }
            }
        },
        DitheringAlgorithm::Ordered => {
            // Ordered Dithering (Bayer)
            for y in 0..height {
                for x in 0..width {
                    let pixel = output.get_pixel_mut(x, y);
                    let old_color = *pixel;
                    
                    // Get threshold from Bayer matrix (normalized 0-255)
                    let threshold = BAYER_MATRIX[((y % 4) * 4 + (x % 4)) as usize] as f32 / 16.0;
                    let factor = (threshold - 0.5) * 255.0 * strength;

                    let r = (old_color[0] as f32 + factor).clamp(0.0, 255.0) as u8;
                    let g = (old_color[1] as f32 + factor).clamp(0.0, 255.0) as u8;
                    let b = (old_color[2] as f32 + factor).clamp(0.0, 255.0) as u8;
                    
                    *pixel = find_closest_color(Rgb([r, g, b]), palette);
                }
            }
        },
        DitheringAlgorithm::FloydSteinberg => {
            // Floyd-Steinberg Error Diffusion
            // We need to work with f32 errors, so we'll store them in a buffer
            // Since error propogates right and down, we need to process sequentially
            
            // To implement this efficiently in Rust without unsafe, we can just iterate carefully
            // However, modifying pixels in-place while iterating is tricky with RgbImage if we want to propagate error.
            // We will use a float buffer for intermediate calculations.
            
            let mut error_buffer: Vec<f32> = vec![0.0; (width * height * 3) as usize];
            
            // Initialize error buffer with original image
            for (i, pixel) in img.pixels().enumerate() {
                error_buffer[i * 3] = pixel[0] as f32;
                error_buffer[i * 3 + 1] = pixel[1] as f32;
                error_buffer[i * 3 + 2] = pixel[2] as f32;
            }

            for y in 0..height {
                for x in 0..width {
                    let idx = ((y * width + x) * 3) as usize;
                    
                    let old_r = error_buffer[idx];
                    let old_g = error_buffer[idx + 1];
                    let old_b = error_buffer[idx + 2];
                    
                    let old_color = Rgb([
                        old_r.clamp(0.0, 255.0) as u8,
                        old_g.clamp(0.0, 255.0) as u8,
                        old_b.clamp(0.0, 255.0) as u8,
                    ]);
                    
                    let new_color = find_closest_color(old_color, palette);
                    output.put_pixel(x, y, new_color);
                    
                    let quant_error_r = (old_r - new_color[0] as f32) * strength;
                    let quant_error_g = (old_g - new_color[1] as f32) * strength;
                    let quant_error_b = (old_b - new_color[2] as f32) * strength;
                    
                    // Distribute error
                    // Right: 7/16
                    if x + 1 < width {
                        let n_idx = ((y * width + (x + 1)) * 3) as usize;
                        error_buffer[n_idx] += quant_error_r * 7.0 / 16.0;
                        error_buffer[n_idx + 1] += quant_error_g * 7.0 / 16.0;
                        error_buffer[n_idx + 2] += quant_error_b * 7.0 / 16.0;
                    }
                    
                    // Bottom Left: 3/16
                    if x > 0 && y + 1 < height {
                        let n_idx = (((y + 1) * width + (x - 1)) * 3) as usize;
                        error_buffer[n_idx] += quant_error_r * 3.0 / 16.0;
                        error_buffer[n_idx + 1] += quant_error_g * 3.0 / 16.0;
                        error_buffer[n_idx + 2] += quant_error_b * 3.0 / 16.0;
                    }
                    
                    // Bottom: 5/16
                    if y + 1 < height {
                        let n_idx = (((y + 1) * width + x) * 3) as usize;
                        error_buffer[n_idx] += quant_error_r * 5.0 / 16.0;
                        error_buffer[n_idx + 1] += quant_error_g * 5.0 / 16.0;
                        error_buffer[n_idx + 2] += quant_error_b * 5.0 / 16.0;
                    }
                    
                    // Bottom Right: 1/16
                    if x + 1 < width && y + 1 < height {
                        let n_idx = (((y + 1) * width + (x + 1)) * 3) as usize;
                        error_buffer[n_idx] += quant_error_r * 1.0 / 16.0;
                        error_buffer[n_idx + 1] += quant_error_g * 1.0 / 16.0;
                        error_buffer[n_idx + 2] += quant_error_b * 1.0 / 16.0;
                    }
                }
            }
        }
    }

    output
}
