const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

// --- Configuration ---
const INPUT_FILE = path.resolve(__dirname, '../extracted_stories.txt');
const OUTPUT_FILE = path.resolve(__dirname, '../image_prompts/all_books_prompts.json');
const MODEL_NAME = 'gemini-1.5-flash'; // Or 'gemini-2.0-flash' if available/preferred
const CONCURRENCY = 5;

// --- Prompt Style Template ---
const STYLE_INSTRUCTION = `
Style: "Nano Banana illustration style". 
Children's bedtime story illustration with soft pastel colors. 
Cozy, calm, magical atmosphere. Rounded shapes, cute characters. 
Flat to semi-flat illustration. Soft moonlight and gentle studio lighting. 
NOT photorealistic. Child-friendly, warm, and inviting.
`;

const SYSTEM_INSTRUCTION = `
You are an expert art director for children's books.
Your task is to generate image generation prompts for a story.
Return ONLY a JSON object representing the book's image prompts.

Output Format:
{
  "book_id": "string",
  "book_title": "string",
  "cover": {
    "filename": "cover.png",
    "prompt": "string"
  },
  "pages": [
    {
      "page": number,
      "filename": "string", // e.g., "page_001.png"
      "prompt": "string"
    }
  ]
}

Prompt Requirements:
1.  **Structure**: Each prompt string must contain these sections:
    STYLE: [The Nano Banana style text]
    SCENE: [Description of the scene]
    CHARACTERS: [Description of characters]
    ENVIRONMENT: [Description of the setting]
    CAMERA & COMPOSITION: [Camera angle and layout]
    LIGHTING & MOOD: [Lighting and emotional tone]
    NEGATIVE PROMPT: [Things to avoid]

2.  **Cover Prompt**:
    -   SCENE MUST start with: Book cover featuring the title "EXACT_BOOK_TITLE" ...
    -   You MUST include the exact English title of the book in double quotes in the SCENE description.
    -   Negative Prompt must end with "no inconsistent style." (Do NOT add "no text" to cover negative prompt).

3.  **Page Prompts**:
    -   Negative Prompt must end with "no inconsistent style, no text."

4.  **Content**:
    -   Use the provided story text for context.
    -   Keep descriptions cozy, magical, and strictly adhering to the "Nano Banana" style.
`;

// --- Helpers ---

// Parse the extracted stories text file
function parseStories(text) {
    const books = [];
    const blocks = text.split('-'.repeat(30));

    for (const block of blocks) {
        if (!block.trim()) continue;

        const book = {
            title: '',
            id: '',
            pages: []
        };

        const lines = block.split('\n').map(l => l.trim());
        let parsingPages = false;

        for (const line of lines) {
            if (!line) continue;

            if (line.startsWith('BOOK:')) {
                book.title = line.substring(5).trim();
            } else if (line.startsWith('ID:')) {
                book.id = line.substring(3).trim();
            } else if (line.startsWith('PAGES:')) {
                parsingPages = true;
            } else if (parsingPages && line.match(/^Page \d+:/)) {
                const match = line.match(/^Page (\d+): (.*)/);
                if (match) {
                    book.pages.push({
                        number: parseInt(match[1]),
                        text: match[2]
                    });
                }
            }
        }

        if (book.id && book.title) {
            books.push(book);
        }
    }
    return books;
}

async function generatePromptsForBook(ai, book) {
    const prompt = `
Generate image prompts for the following book:
Title: ${book.title}
ID: ${book.id}

Pages:
${book.pages.map(p => `Page ${p.number}: ${p.text}`).join('\n')}
  `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                temperature: 0.7,
            },
        });

        const jsonText = response.candidates[0].content.parts[0].text;
        const json = JSON.parse(jsonText);

        // Safety Force IDs to match
        json.book_id = book.id;
        json.book_title = book.title;

        return json;

    } catch (err) {
        console.error(`Error generating for book ${book.id}:`, err);
        return null;
    }
}

async function main() {
    if (!process.env.GEMINI_API_KEY) {
        console.error('Error: GEMINI_API_KEY not set');
        process.exit(1);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    console.log('Reading stories from:', INPUT_FILE);
    const text = await fsp.readFile(INPUT_FILE, 'utf8');
    const books = parseStories(text);
    console.log(`Found ${books.length} books.`);

    const results = [];

    // Limiting concurrency
    for (let i = 0; i < books.length; i += CONCURRENCY) {
        const batch = books.slice(i, i + CONCURRENCY);
        console.log(`Processing batch ${i / CONCURRENCY + 1} / ${Math.ceil(books.length / CONCURRENCY)}...`);

        const promises = batch.map(book => generatePromptsForBook(ai, book));
        const batchResults = await Promise.all(promises);

        for (const res of batchResults) {
            if (res) results.push(res);
        }
    }

    console.log(`Generated prompts for ${results.length} books.`);

    await fsp.writeFile(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf8');
    console.log('Saved to:', OUTPUT_FILE);
}

main();
