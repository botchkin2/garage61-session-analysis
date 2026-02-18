/**
 * Generates favicon.png, icon.png, and related app icons from assets/images/logo-source.svg
 * Requires: npm install sharp --save-dev
 * Run from project root: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

const ASSETS = path.join(process.cwd(), 'assets', 'images');
const SVG_PATH = path.join(ASSETS, 'logo-source.svg');

const sizes = {
  'favicon.png': 48,
  'icon.png': 1024,
  'splash-icon.png': 200,
  'android-icon-foreground.png': 1024,
};

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error(
      'Missing "sharp". Install it with: npm install sharp --save-dev',
    );
    process.exit(1);
  }

  if (!fs.existsSync(SVG_PATH)) {
    console.error('SVG not found:', SVG_PATH);
    process.exit(1);
  }

  const svg = fs.readFileSync(SVG_PATH);

  for (const [filename, size] of Object.entries(sizes)) {
    const outPath = path.join(ASSETS, filename);
    await sharp(svg).resize(size, size).png().toFile(outPath);
    console.log('Wrote', outPath, `(${size}x${size})`);
  }

  // Android adaptive icon background (solid #0a0a0a to match RacingTheme)
  const bgPath = path.join(ASSETS, 'android-icon-background.png');
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: {r: 10, g: 10, b: 10},
    },
  })
    .png()
    .toFile(bgPath);
  console.log('Wrote', bgPath, '(1024x1024 background)');

  // Android monochrome (same logo, single color for themed icons)
  const monoPath = path.join(ASSETS, 'android-icon-monochrome.png');
  await sharp(svg).resize(1024, 1024).png().toFile(monoPath);
  console.log('Wrote', monoPath, '(1024x1024)');

  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
