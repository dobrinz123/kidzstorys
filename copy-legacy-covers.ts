import fs from 'fs';
import path from 'path';

const MOBILE_DATA_PATH = path.join(process.cwd(), 'apps/mobile/src/data/coverImages.ts');
const MOBILE_ASSETS_PATH = path.join(process.cwd(), 'apps/mobile/assets/covers');
const ADMIN_PUBLIC_PATH = path.join(process.cwd(), 'apps/admin/public/legacy-covers');

function extractMapping(content: string): Record<string, string> {
    const mapping: Record<string, string> = {};
    // Match lines like: "key": require("../../assets/covers/filename.png"),
    const regex = /"([^"]+)":\s*require\("\.\.\/\.\.\/assets\/covers\/([^"]+)"\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        mapping[match[1]] = match[2];
    }
    return mapping;
}

async function main() {
    console.log("📂 processing cover images...");

    // Ensure target directory exists
    if (!fs.existsSync(ADMIN_PUBLIC_PATH)) {
        fs.mkdirSync(ADMIN_PUBLIC_PATH, { recursive: true });
    }

    // Read mapping file
    const content = fs.readFileSync(MOBILE_DATA_PATH, 'utf-8');
    const mapping = extractMapping(content);

    console.log(`Found ${Object.keys(mapping).length} mappings.`);

    let copied = 0;
    let skipped = 0;

    for (const [key, filename] of Object.entries(mapping)) {
        const srcPath = path.join(MOBILE_ASSETS_PATH, filename);
        // Rename to [key].png (assuming source is png, which most seem to be)
        // Check extension just in case
        const ext = path.extname(filename);
        const destFilename = `${key}${ext}`;
        const destPath = path.join(ADMIN_PUBLIC_PATH, destFilename);

        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            copied++;
        } else {
            console.warn(`⚠️ Source file not found: ${filename} (for key: ${key})`);
            skipped++;
        }
    }

    console.log(`✅ Copied ${copied} images. Skipped ${skipped}.`);
    console.log(`📁 Images available at /legacy-covers/[key].png`);
}

main();
