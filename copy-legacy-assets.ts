import fs from 'fs';
import path from 'path';

const MOBILE_DATA_PATH_COVERS = path.join(process.cwd(), 'apps/mobile/src/data/coverImages.ts');
const MOBILE_DATA_PATH_SCENES = path.join(process.cwd(), 'apps/mobile/src/data/storyScenes.ts');
const MOBILE_ASSETS_PATH = path.join(process.cwd(), 'apps/mobile/assets');
const ADMIN_PUBLIC_PATH = path.join(process.cwd(), 'apps/admin/public/legacy-covers');

function extractMapping(content: string, type: 'covers' | 'scenes'): Record<string, any> {
    const mapping: Record<string, any> = {};

    if (type === 'covers') {
        // Match: "key": require("../../assets/covers/filename.png")
        const regex = /"([^"]+)":\s*require\("\.\.\/\.\.\/assets\/covers\/([^"]+)"\)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            mapping[match[1]] = match[2];
        }
    } else {
        // Match: "key": [ ... ]
        // Then extract requires inside array
        // This is a bit complex with regex only, so we'll do a basic extraction
        const sections = content.split('export const STORY_SCENES: Record<string, any[]> = {')[1].split('};')[0];
        const entries = sections.split('],');

        for (const entry of entries) {
            const keyMatch = entry.match(/"([^"]+)":\s*\[/);
            if (keyMatch) {
                const key = keyMatch[1];
                const files: string[] = [];
                const fileRegex = /require\("\.\.\/\.\.\/assets\/story_scenes\/([^"]+)"\)/g;
                let fileMatch;
                while ((fileMatch = fileRegex.exec(entry)) !== null) {
                    files.push(fileMatch[1]);
                }
                mapping[key] = files;
            }
        }
    }
    return mapping;
}

async function main() {
    console.log("📂 Processing legacy assets...");

    // Ensure target directory exists
    if (!fs.existsSync(ADMIN_PUBLIC_PATH)) {
        fs.mkdirSync(ADMIN_PUBLIC_PATH, { recursive: true });
    }

    // 1. Process Covers
    console.log("\n--- Processing Covers ---");
    const coversContent = fs.readFileSync(MOBILE_DATA_PATH_COVERS, 'utf-8');
    const coversMapping = extractMapping(coversContent, 'covers');
    console.log(`Found ${Object.keys(coversMapping).length} cover mappings.`);

    let copiedCovers = 0;
    for (const [key, filename] of Object.entries(coversMapping)) {
        // Handle explicit any cast from extractMapping
        const fileStr = filename as string;
        const srcPath = path.join(MOBILE_ASSETS_PATH, 'covers', fileStr);
        const ext = path.extname(fileStr);
        const destFilename = `${key}${ext}`;
        const destPath = path.join(ADMIN_PUBLIC_PATH, destFilename);

        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            copiedCovers++;
        } else {
            console.warn(`⚠️ Cover file not found: ${fileStr} (key: ${key})`);
        }
    }
    console.log(`✅ Copied ${copiedCovers} covers.`);

    // 2. Process Scenes
    console.log("\n--- Processing Scenes ---");
    const scenesContent = fs.readFileSync(MOBILE_DATA_PATH_SCENES, 'utf-8');
    const scenesMapping = extractMapping(scenesContent, 'scenes');
    console.log(`Found ${Object.keys(scenesMapping).length} story scene mappings.`);

    let copiedScenes = 0;
    for (const [key, files] of Object.entries(scenesMapping)) {
        const fileList = files as string[];

        // In the migration, we used splitIntoPages. The number of pages might vary.
        // We need to copy distinct scene images for this story so they are available.
        // The admin URL request seen was: bedtime-001-sleepy-cloud_page_4.png
        // This suggests naming convention: [key]_page_[index+1].png

        // HOWEVER, the migration logic assigns images based on page index, looping or clamping.
        // And the user's error shows `_page_4`.
        // Let's dump ALL scenes for the story as `_page_1`, `_page_2`, etc.
        // Note: The mobile app array has duplicates (Day, Day, Sunset, Sunset...).
        // We should copy exactly as indexed in the array to match page numbers.

        fileList.forEach((filename, index) => {
            const srcPath = path.join(MOBILE_ASSETS_PATH, 'story_scenes', filename);
            const ext = path.extname(filename);
            // Construct filename to match likely backend expectation or PageEditor prop
            // The user saw: bedtime-001-sleepy-cloud_page_4.png
            const destFilename = `${key}_page_${index + 1}${ext}`;
            const destPath = path.join(ADMIN_PUBLIC_PATH, destFilename);

            if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, destPath);
                copiedScenes++;
            } else {
                console.warn(`⚠️ Scene file not found: ${filename} (key: ${key}, index: ${index})`);
            }
        });
    }
    console.log(`✅ Copied ${copiedScenes} scene images.`);

    console.log(`\n🎉 DONE. All assets in apps/admin/public/legacy-covers/`);
}

main();
