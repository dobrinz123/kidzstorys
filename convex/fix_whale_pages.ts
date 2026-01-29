import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const fixWhaleBookPages = mutation({
    args: {
        // No args needed, hardcoded for this specific fix
    },
    handler: async (ctx) => {
        const bookKey = "bedtime-025-whale-song";

        // 1. Get the book
        const book = await ctx.db
            .query("books")
            .withIndex("by_bookKey", (q) => q.eq("bookKey", bookKey))
            .first();

        if (!book) {
            return { status: "error", message: "Book not found" };
        }

        // 2. Get the original story to access raw text
        const story = await ctx.db
            .query("stories")
            .withIndex("by_storyKey", (q) => q.eq("storyKey", bookKey))
            .first();

        if (!story) {
            return { status: "error", message: "Original story not found" };
        }

        // 3. Define the manual text chunks to force 6 pages (matching the image count in migration.ts)
        // There are 6 images mapped in migration.ts: 
        // ["bedtime_025_whale_night_1.png", "bedtime_025_whale_night_1.png", 
        //  "bedtime_025_whale_night_2.png", "bedtime_025_whale_night_2.png", 
        //  "bedtime_025_whale_night_3.png", "bedtime_025_whale_night_3.png"]

        // English Text Breakdown (Manual for 6 pages)
        const enPages = [
            "In the deep, blue ocean, where the moonlight shimmers on the waves, lives a gentle giant named Willow the Whale.",
            "Willow loves to sing. Her songs are low and rumbly, like a cello playing underwater. 'Huuuummm... Ooooooh...', she sings.",
            "Every evening, as the sun sets and the stars come out, Willow prepares for her bedtime concert.",
            "The little fish gather around. The crabs pause their scuttling. Everyone loves Willow's evening song.",
            "Tonight, the ocean is calm. Willow's song travels far, comforting all the sea creatures as they drift off to sleep.",
            "Goodnight, Willow. Goodnight, ocean friends. Sweet dreams in the deep blue sea."
        ];

        // Romanian Text Breakdown (Manual for 6 pages)
        const roPages = [
            "În oceanul adânc și albastru, unde lumina lunii strălucește pe valuri, trăiește un uriaș blând pe nume Willow Balena.",
            "Lui Willow îi place să cânte. Cântecele ei sunt joase și vibrante, ca un violoncel cântând sub apă. 'Huuuummm... Ooooooh...', cântă ea.",
            "În fiecare seară, când soarele apune și stelele apar, Willow se pregătește pentru concertul ei de culcare.",
            "Peștișorii se adună în jur. Crabii se opresc din forfota lor. Toată lumea iubește cântecul de seară al lui Willow.",
            "În seara aceasta, oceanul este liniștit. Cântecul lui Willow călătorește departe, liniștind toate creaturile mării în timp ce adorm.",
            "Noapte bună, Willow. Noapte bună, prieteni din ocean. Vise plăcute în marea adâncă și albastră."
        ];

        // Italian Text Breakdown (Manual for 6 pages)
        const itPages = [
            "Nell'oceano profondo e blu, dove il chiaro di luna brilla sulle onde, vive un gigante gentile di nome Willow la Balena.",
            "A Willow piace cantare. Le sue canzoni sono basse e rimbombanti, come un violoncello che suona sott'acqua. 'Huuuummm... Ooooooh...', canta.",
            "Ogni sera, quando il sole tramonta e spuntano le stelle, Willow si prepara per il suo concerto della buonanotte.",
            "I pesciolini si radunano intorno. I granchi smettono di correre. Tutti amano la canzone della sera di Willow.",
            "Stasera l'oceano è calmo. La canzone di Willow viaggia lontano, confortando tutte le creature marine mentre si addormentano.",
            "Buonanotte, Willow. Buonanotte, amici dell'oceano. Sogni d'oro nel profondo mare blu."
        ];

        // 4. Update the pages
        const newPages = [];
        for (let i = 0; i < 6; i++) {
            // Map images: 1, 1, 2, 2, 3, 3 like in migration.ts mapping logic (index / 2 + 1)
            const assetIndex = Math.floor(i / 2) + 1;
            const legacyAssetKey = `${bookKey}_page_${assetIndex}`; // e.g. bedtime-025-whale-song_page_1

            newPages.push({
                pageNumber: i + 1,
                legacyAssetKey: legacyAssetKey,
                text_en: enPages[i] || "...",
                text_ro: roPages[i] || "...",
                text_it: itPages[i] || "...",
                imageId: undefined // Keep using legacy key for now
            });
        }

        // 5. Save changes
        await ctx.db.patch(book._id, {
            pages: newPages,
            updatedAt: Date.now()
        });

        return {
            status: "success",
            message: "Updated 'The Whale's Evening Song' to 6 aligned pages",
            bookId: book._id
        };
    }
});
