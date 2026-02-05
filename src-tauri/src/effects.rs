
use image::{Rgb, RgbImage};

// ... (skipping context match, just replace whole file or specific chunks?)
// I'll replace the import first


#[derive(Clone, Copy, Debug)]
pub struct CRTEffectsConfig {
    pub scanline_intensity: f32, // 0.0 to 1.0
    pub curvature_strength: f32, // 0.0 to 1.0 (0.0 = flat, 1.0 = heavy curve)
    pub vignette_strength: f32,  // 0.0 to 1.0
}

impl Default for CRTEffectsConfig {
    fn default() -> Self {
        Self {
            scanline_intensity: 0.0,
            curvature_strength: 0.0,
            vignette_strength: 0.0,
        }
    }
}

pub fn apply_crt_effects(img: &RgbImage, config: CRTEffectsConfig) -> RgbImage {
    let (width, height) = img.dimensions();
    
    // If no effects, return original
    if config.scanline_intensity <= 0.0 && config.curvature_strength <= 0.0 && config.vignette_strength <= 0.0 {
        return img.clone();
    }

    let mut output = RgbImage::new(width, height);

    for y in 0..height {
        for x in 0..width {
            // Curvature Distortion
            let (src_x, src_y) = if config.curvature_strength > 0.0 {
                // Normalize coordinates to -1.0 to 1.0
                let nx = (x as f32 / width as f32) * 2.0 - 1.0;
                let ny = (y as f32 / height as f32) * 2.0 - 1.0;
                
                // Calculate distance from center
                let dist = nx * nx + ny * ny;
                let distortion = 1.0 + dist * (config.curvature_strength * 0.2); // Scale strength
                
                let dn_x = nx * distortion;
                let dn_y = ny * distortion;
                
                // Map back to pixel coordinates
                let map_x = (dn_x + 1.0) / 2.0 * width as f32;
                let map_y = (dn_y + 1.0) / 2.0 * height as f32;
                
                (map_x, map_y)
            } else {
                (x as f32, y as f32)
            };

            // Check bounds
            if src_x < 0.0 || src_x >= width as f32 || src_y < 0.0 || src_y >= height as f32 {
                output.put_pixel(x, y, Rgb([0, 0, 0])); // Black outside bounds
                continue;
            }

            // Sample original pixel (Nearest Neighbor for retro look)
            let pixel = img.get_pixel(src_x as u32, src_y as u32);
            let mut r = pixel[0] as f32;
            let mut g = pixel[1] as f32;
            let mut b = pixel[2] as f32;

            // Apply Scanlines
            if config.scanline_intensity > 0.0 {
                if y % 2 == 0 {
                    let factor = 1.0 - config.scanline_intensity;
                    r *= factor;
                    g *= factor;
                    b *= factor;
                }
            }
            
            // Apply Vignette
            if config.vignette_strength > 0.0 {
                let nx = (x as f32 / width as f32) * 2.0 - 1.0;
                let ny = (y as f32 / height as f32) * 2.0 - 1.0;
                let dist = (nx * nx + ny * ny).sqrt();
                
                // Vignette falloff
                let radius = 1.0 - config.vignette_strength * 0.5;
                let softness = 0.4;
                
                let vig = 1.0 - ((dist - radius) / softness).clamp(0.0, 1.0);
                
                r *= vig;
                g *= vig;
                b *= vig;
            }

            output.put_pixel(x, y, Rgb([
                r.clamp(0.0, 255.0) as u8,
                g.clamp(0.0, 255.0) as u8,
                b.clamp(0.0, 255.0) as u8
            ]));
        }
    }

    output
}
