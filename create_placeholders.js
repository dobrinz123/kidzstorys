const fs = require('fs');
const path = require('path');

const coversDir = path.join(__dirname, 'apps/mobile/assets/covers');
const coverImagesPath = path.join(__dirname, 'apps/mobile/src/data/coverImages.ts');
const placeholderSource = path.join(coversDir, 'bedtime_008.png'); // Assuming this exists

if (!fs.existsSync(placeholderSource)) {
    console.error('Placeholder source not found:', placeholderSource);
    process.exit(1);
}

const content = fs.readFileSync(coverImagesPath, 'utf8');
const requireRegex = /require\("\.\.\/\.\.\/assets\/covers\/([^"]+)"\)/g;

let match;
let createdCount = 0;

while ((match = requireRegex.exec(content)) !== null) {
    const filename = match[1];
    const filePath = path.join(coversDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log('Creating placeholder for:', filename);
        fs.copyFileSync(placeholderSource, filePath);
        createdCount++;
    }
}

console.log(`Created ${createdCount} placeholder images.`);
