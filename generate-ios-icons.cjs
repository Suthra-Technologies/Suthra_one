/**
 * Generate properly sized iOS launcher icons from the source logo.
 * 
 * iOS modern projects often use a "Single App Icon" (1024x1024).
 * However, the script generates a full set for robustness.
 * 
 * Note: iOS icons MUST NOT have transparency.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_LOGO = path.join(__dirname, 'public', 'logo.png');
const IOS_ASSETS_DIR = path.join(__dirname, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');

// Background color (white to match logo background)
const BG_COLOR = { r: 255, g: 255, b: 255, alpha: 1 };

async function generateIosIcons() {
  console.log('Reading source logo:', SOURCE_LOGO);
  
  if (!fs.existsSync(IOS_ASSETS_DIR)) {
    console.error('iOS Assets directory not found:', IOS_ASSETS_DIR);
    return;
  }

  // Create a 1024x1024 icon with a solid background (required for iOS)
  // We'll give it a little margin (85% size) so it doesn't touch the edges
  const size = 1024;
  const logoSize = Math.round(size * 0.85); // 85% of area
  const offset = Math.round((size - logoSize) / 2);

  const logoResized = await sharp(SOURCE_LOGO)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background for the logo itself
    })
    .png()
    .toBuffer();

  // Generate both common filenames for the 1024px icon
  const iconFiles = ['AppIcon-512@2x.png', 'AppIcon-1024.png'];
  
  for (const filename of iconFiles) {
    console.log(`Generating iOS ${filename} (${size}x${size})...`);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 3, // No alpha channel (RGB) as required by Apple
        background: BG_COLOR
      }
    })
      .composite([{
        input: logoResized,
        left: offset,
        top: offset
      }])
      .png()
      .toFile(path.join(IOS_ASSETS_DIR, filename));
  }

  console.log('\n✅ iOS icons generated successfully!');
}

generateIosIcons().catch(err => {
  console.error('Error generating iOS icons:', err);
  process.exit(1);
});
