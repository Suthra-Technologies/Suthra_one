
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Android mipmap icon sizes
const androidIcons = [
  { folder: 'mipmap-ldpi',    size: 36  },
  { folder: 'mipmap-mdpi',    size: 48  },
  { folder: 'mipmap-hdpi',    size: 72  },
  { folder: 'mipmap-xhdpi',   size: 96  },
  { folder: 'mipmap-xxhdpi',  size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const sourceImage = path.join(__dirname, 'assets', 'mythri_logo.png');

async function generateIcons() {
  if (!fs.existsSync(sourceImage)) {
    console.error('ERROR: Logo not found at', sourceImage);
    process.exit(1);
  }
  console.log('Using logo:', sourceImage);

  console.log('\nGenerating Android icons...\n');

  for (const icon of androidIcons) {
    const folderPath = path.join(resDir, icon.folder);
    
    // ic_launcher.png
    await sharp(sourceImage)
      .resize(icon.size, icon.size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(folderPath, 'ic_launcher.png'));

    // ic_launcher_round.png (same as launcher but with circular clip via composition)
    await sharp(sourceImage)
      .resize(icon.size, icon.size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(folderPath, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png (used for adaptive icons)
    await sharp(sourceImage)
      .resize(icon.size, icon.size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(folderPath, 'ic_launcher_foreground.png'));

    // ic_launcher_background.png (white background)
    await sharp({
      create: {
        width: icon.size,
        height: icon.size,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
      .png()
      .toFile(path.join(folderPath, 'ic_launcher_background.png'));

    console.log(`✓ ${icon.folder} (${icon.size}x${icon.size}px)`);
  }

  console.log('\n✅ All Android icons generated successfully!');
  console.log('\nIcon locations:');
  androidIcons.forEach(i => {
    console.log(`  android/app/src/main/res/${i.folder}/ic_launcher.png`);
  });
}

generateIcons().catch(console.error);
