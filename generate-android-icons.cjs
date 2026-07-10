/**
 * Generate properly sized Android launcher icons from the source logo.
 * 
 * Android adaptive icons require:
 * - Foreground layer: 108dp with logo in inner 72dp safe zone (66.67%)
 * - Background layer: 108dp solid color or image
 * - Legacy icons (ic_launcher.png): square icons at each density
 * - Round icons (ic_launcher_round.png): circular masked icons at each density
 * 
 * Density buckets and sizes:
 *   mdpi:    48x48 (legacy), 108x108 (adaptive layers)
 *   hdpi:    72x72 (legacy), 162x162 (adaptive layers)
 *   xhdpi:   96x96 (legacy), 216x216 (adaptive layers)
 *   xxhdpi:  144x144 (legacy), 324x324 (adaptive layers)
 *   xxxhdpi: 192x192 (legacy), 432x432 (adaptive layers)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE_LOGO = path.join(__dirname, 'assets', 'icon-mark.png');
const RES_DIR = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// Background color (white to match logo background)
const BG_COLOR = { r: 255, g: 255, b: 255, alpha: 1 };

const densities = [
  { name: 'ldpi',    legacy: 36,  adaptive: 81 },
  { name: 'mdpi',    legacy: 48,  adaptive: 108 },
  { name: 'hdpi',    legacy: 72,  adaptive: 162 },
  { name: 'xhdpi',   legacy: 96,  adaptive: 216 },
  { name: 'xxhdpi',  legacy: 144, adaptive: 324 },
  { name: 'xxxhdpi', legacy: 192, adaptive: 432 },
];

async function generateIcons() {
  console.log('Reading source logo:', SOURCE_LOGO);
  
  // Read the source image and convert to PNG with alpha
  const sourceBuffer = await sharp(SOURCE_LOGO)
    .png()
    .toBuffer();

  const metadata = await sharp(sourceBuffer).metadata();
  console.log(`Source logo: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

  for (const density of densities) {
    const mipmapDir = path.join(RES_DIR, `mipmap-${density.name}`);
    
    if (!fs.existsSync(mipmapDir)) {
      fs.mkdirSync(mipmapDir, { recursive: true });
    }

    console.log(`\nGenerating ${density.name} icons...`);

    // ==========================================
    // 1. Generate ic_launcher_foreground.png
    //    The logo should be placed in the inner 66.67% (safe zone) of the adaptive layer
    //    Total canvas = adaptive size, logo fills ~62% to give a little breathing room
    // ==========================================
    const adaptiveSize = density.adaptive;
    const safeZoneSize = Math.round(adaptiveSize * 0.62); // Logo within safe zone with slight padding
    const offset = Math.round((adaptiveSize - safeZoneSize) / 2);

    const logoResized = await sharp(sourceBuffer)
      .resize(safeZoneSize, safeZoneSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();

    // Create transparent canvas and composite the logo centered
    const foreground = await sharp({
      create: {
        width: adaptiveSize,
        height: adaptiveSize,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      }
    })
      .composite([{
        input: logoResized,
        left: offset,
        top: offset
      }])
      .png()
      .toBuffer();

    const fgPath = path.join(mipmapDir, 'ic_launcher_foreground.png');
    fs.writeFileSync(fgPath, foreground);
    console.log(`  ✓ ic_launcher_foreground.png (${adaptiveSize}x${adaptiveSize})`);

    // ==========================================
    // 2. Generate ic_launcher_background.png
    //    Solid white background
    // ==========================================
    const background = await sharp({
      create: {
        width: adaptiveSize,
        height: adaptiveSize,
        channels: 4,
        background: BG_COLOR
      }
    })
      .png()
      .toBuffer();

    const bgPath = path.join(mipmapDir, 'ic_launcher_background.png');
    fs.writeFileSync(bgPath, background);
    console.log(`  ✓ ic_launcher_background.png (${adaptiveSize}x${adaptiveSize})`);

    // ==========================================
    // 3. Generate ic_launcher.png (legacy square icon)
    //    Logo fills most of the icon with a small margin and white bg
    // ==========================================
    const legacySize = density.legacy;
    const legacyLogoSize = Math.round(legacySize * 0.80); // 80% of icon area
    const legacyOffset = Math.round((legacySize - legacyLogoSize) / 2);

    const legacyLogo = await sharp(sourceBuffer)
      .resize(legacyLogoSize, legacyLogoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toBuffer();

    const legacyIcon = await sharp({
      create: {
        width: legacySize,
        height: legacySize,
        channels: 4,
        background: BG_COLOR
      }
    })
      .composite([{
        input: legacyLogo,
        left: legacyOffset,
        top: legacyOffset
      }])
      .png()
      .toBuffer();

    const legacyPath = path.join(mipmapDir, 'ic_launcher.png');
    fs.writeFileSync(legacyPath, legacyIcon);
    console.log(`  ✓ ic_launcher.png (${legacySize}x${legacySize})`);

    // ==========================================
    // 4. Generate ic_launcher_round.png (circular icon)
    //    Create a circular mask and apply it
    // ==========================================
    const roundRadius = Math.round(legacySize / 2);
    const circleSvg = Buffer.from(
      `<svg width="${legacySize}" height="${legacySize}">
        <circle cx="${roundRadius}" cy="${roundRadius}" r="${roundRadius}" fill="white"/>
      </svg>`
    );

    const roundIcon = await sharp(legacyIcon)
      .composite([{
        input: circleSvg,
        blend: 'dest-in'
      }])
      .png()
      .toBuffer();

    const roundPath = path.join(mipmapDir, 'ic_launcher_round.png');
    fs.writeFileSync(roundPath, roundIcon);
    console.log(`  ✓ ic_launcher_round.png (${legacySize}x${legacySize} circular)`);
  }

  // ==========================================
  // 5. Fix adaptive icon XML - remove the inset that causes extra shrinking
  // ==========================================
  const anydpiDir = path.join(RES_DIR, 'mipmap-anydpi-v26');
  
  const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>`;

  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), adaptiveIconXml);
  fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), adaptiveIconXml);
  console.log('\n  ✓ Updated ic_launcher.xml (removed inset)');
  console.log('  ✓ Updated ic_launcher_round.xml (removed inset)');

  // Remove the large foreground PNG from anydpi-v26 (it's not needed there - XML references mipmap resources)
  const anydpiFgPng = path.join(anydpiDir, 'ic_launcher_foreground.png');
  if (fs.existsSync(anydpiFgPng)) {
    fs.unlinkSync(anydpiFgPng);
    console.log('  ✓ Removed unnecessary ic_launcher_foreground.png from mipmap-anydpi-v26');
  }

  console.log('\n✅ All Android icons generated successfully!');
  console.log('Now rebuild your Android app to see the crisp icons.');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
