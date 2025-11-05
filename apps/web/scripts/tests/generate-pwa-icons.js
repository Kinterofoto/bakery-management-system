/**
 * Script to generate PWA icons from Logo_Pastry-06 2.jpg
 *
 * Usage:
 * 1. Install sharp: pnpm add -D sharp
 * 2. Run: node scripts/generate-pwa-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_IMAGE = path.join(__dirname, '../public/Logo_Pastry-06 2.jpg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

// Icon sizes needed for PWA
const SIZES = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 180, name: 'icon-180x180.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  // Check if input image exists
  if (!fs.existsSync(INPUT_IMAGE)) {
    console.error('❌ Error: Logo_Pastry-06 2.jpg not found in public directory');
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate each icon size
  for (const { size, name } of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, name);

    try {
      await sharp(INPUT_IMAGE)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Error generating ${name}:`, error.message);
    }
  }

  console.log('\n✨ Done! All icons generated successfully.');
  console.log(`📁 Icons saved to: ${OUTPUT_DIR}`);
  console.log('\n💡 Next steps:');
  console.log('1. Build the app: pnpm build');
  console.log('2. Start production server: pnpm start');
  console.log('3. Test PWA in Chrome DevTools > Application tab');
}

// Run the script
generateIcons().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
