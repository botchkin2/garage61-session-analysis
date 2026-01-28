const fs = require('fs');
const path = require('path');

const sourceDir = 'web-build';
const targetDir = 'public';

const filesToCopy = [
  'bundle.js',
  'bundle.js.map',
  'bundle.js.LICENSE.txt',
  'index.html',
];

console.log('Copying build files to public directory...');

filesToCopy.forEach(file => {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(targetDir, file);

  try {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✓ Copied ${file}`);
  } catch (error) {
    console.error(`✗ Failed to copy ${file}:`, error.message);
    process.exit(1);
  }
});

console.log('Build files copied successfully!');
