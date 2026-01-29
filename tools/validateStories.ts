#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { join } from "path";

interface Story {
  storyKey: string;
  categorySlug: string;
  ageMin: number;
  ageMax: number;
  durationMin: number;
  tags_en: string[];
  tags_ro: string[];
  tags_it: string[];
  seriesId?: string;
  episodeNo?: number;
  locales: {
    en: { title: string; text: string; parentQuestions: string[] };
    ro: { title: string; text: string; parentQuestions: string[] };
    it: { title: string; text: string; parentQuestions: string[] };
  };
  isPublished: boolean;
}

const DURATION_WORD_COUNTS = {
  3: { min: 320, max: 450 },
  5: { min: 520, max: 720 },
  8: { min: 820, max: 1150 },
  12: { min: 1250, max: 1700 },
};

const LEARN_TO_READ_WORD_COUNTS = {
  3: { min: 120, max: 260 },
  5: { min: 120, max: 260 },
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

function validateStory(story: Story, index: number): string[] {
  const errors: string[] = [];

  // Check storyKey is unique and present
  if (!story.storyKey) {
    errors.push(`Story ${index}: Missing storyKey`);
  }

  // Check all locales are present
  const locales = ["en", "ro", "it"] as const;
  for (const locale of locales) {
    if (!story.locales[locale]) {
      errors.push(`Story ${index} (${story.storyKey}): Missing ${locale} locale`);
      continue;
    }

    const loc = story.locales[locale];

    // Check title
    if (!loc.title || loc.title.trim().length === 0) {
      errors.push(`Story ${index} (${story.storyKey}): Empty ${locale} title`);
    }

    // Check text
    if (!loc.text || loc.text.trim().length === 0) {
      errors.push(`Story ${index} (${story.storyKey}): Empty ${locale} text`);
    } else {
      // Check word count
      const wordCount = countWords(loc.text);
      const isLearnToRead = story.categorySlug === "learn-to-read";
      const expectedRange = isLearnToRead
        ? LEARN_TO_READ_WORD_COUNTS[story.durationMin as 3 | 5]
        : DURATION_WORD_COUNTS[story.durationMin as 3 | 5 | 8 | 12];

      if (expectedRange) {
        if (wordCount < expectedRange.min || wordCount > expectedRange.max) {
          errors.push(
            `Story ${index} (${story.storyKey}): ${locale} word count ${wordCount} outside expected range ${expectedRange.min}-${expectedRange.max} for ${story.durationMin}min`
          );
        }
      }
    }

    // Check parent questions
    if (!loc.parentQuestions || loc.parentQuestions.length !== 3) {
      errors.push(
        `Story ${index} (${story.storyKey}): ${locale} must have exactly 3 parent questions, has ${
          loc.parentQuestions?.length || 0
        }`
      );
    } else {
      loc.parentQuestions.forEach((q, qi) => {
        if (!q || q.trim().length === 0) {
          errors.push(
            `Story ${index} (${story.storyKey}): ${locale} parent question ${qi + 1} is empty`
          );
        }
      });
    }
  }

  // Check tags
  if (!story.tags_en || story.tags_en.length === 0) {
    errors.push(`Story ${index} (${story.storyKey}): Missing en tags`);
  }
  if (!story.tags_ro || story.tags_ro.length === 0) {
    errors.push(`Story ${index} (${story.storyKey}): Missing ro tags`);
  }
  if (!story.tags_it || story.tags_it.length === 0) {
    errors.push(`Story ${index} (${story.storyKey}): Missing it tags`);
  }

  // Check series categories
  const isSeriesCategory = ["leo-penny", "milo-rubina-fini"].includes(
    story.categorySlug
  );
  if (isSeriesCategory) {
    if (!story.seriesId) {
      errors.push(
        `Story ${index} (${story.storyKey}): Series story missing seriesId`
      );
    }
    if (story.episodeNo === undefined || story.episodeNo < 1) {
      errors.push(
        `Story ${index} (${story.storyKey}): Series story missing valid episodeNo`
      );
    }
  } else {
    if (story.seriesId) {
      errors.push(`Story ${index} (${story.storyKey}): Non-series story has seriesId`);
    }
    if (story.episodeNo) {
      errors.push(`Story ${index} (${story.storyKey}): Non-series story has episodeNo`);
    }
  }

  return errors;
}

function main() {
  console.log("🔍 Validating stories...\n");

  const storiesPath = join(__dirname, "../seed/stories.seed.json");
  const storiesData = readFileSync(storiesPath, "utf-8");
  const stories: Story[] = JSON.parse(storiesData);

  console.log(`Found ${stories.length} stories`);

  // Check total count
  if (stories.length !== 100) {
    console.error(`❌ ERROR: Expected exactly 100 stories, found ${stories.length}`);
    process.exit(1);
  }

  // Check for unique story keys
  const storyKeys = new Set<string>();
  const duplicates: string[] = [];
  stories.forEach((story) => {
    if (storyKeys.has(story.storyKey)) {
      duplicates.push(story.storyKey);
    }
    storyKeys.add(story.storyKey);
  });

  if (duplicates.length > 0) {
    console.error(`❌ ERROR: Duplicate story keys found: ${duplicates.join(", ")}`);
    process.exit(1);
  }

  // Check category distribution
  const categoryCount: Record<string, number> = {};
  stories.forEach((story) => {
    categoryCount[story.categorySlug] = (categoryCount[story.categorySlug] || 0) + 1;
  });

  console.log("\nCategory distribution:");
  console.log(`  bedtime: ${categoryCount["bedtime"] || 0} (expected 25)`);
  console.log(`  calm-down: ${categoryCount["calm-down"] || 0} (expected 15)`);
  console.log(`  emotions: ${categoryCount["emotions"] || 0} (expected 15)`);
  console.log(`  leo-penny: ${categoryCount["leo-penny"] || 0} (expected 10)`);
  console.log(
    `  milo-rubina-fini: ${categoryCount["milo-rubina-fini"] || 0} (expected 10)`
  );
  console.log(`  learn-to-read: ${categoryCount["learn-to-read"] || 0} (expected 15)`);
  console.log(`  curiosities: ${categoryCount["curiosities"] || 0} (expected 10)`);

  const expectedDistribution: Record<string, number> = {
    bedtime: 25,
    "calm-down": 15,
    emotions: 15,
    "leo-penny": 10,
    "milo-rubina-fini": 10,
    "learn-to-read": 15,
    curiosities: 10,
  };

  const distributionErrors: string[] = [];
  Object.entries(expectedDistribution).forEach(([category, expected]) => {
    const actual = categoryCount[category] || 0;
    if (actual !== expected) {
      distributionErrors.push(
        `Category ${category}: expected ${expected}, got ${actual}`
      );
    }
  });

  if (distributionErrors.length > 0) {
    console.error("\n❌ Distribution errors:");
    distributionErrors.forEach((err) => console.error(`  ${err}`));
  }

  // Validate each story
  const allErrors: string[] = [];
  stories.forEach((story, index) => {
    const errors = validateStory(story, index + 1);
    allErrors.push(...errors);
  });

  if (allErrors.length > 0) {
    console.error(`\n❌ Found ${allErrors.length} validation errors:\n`);
    allErrors.forEach((err) => console.error(`  ${err}`));
    process.exit(1);
  }

  console.log("\n✅ All validations passed!");
  console.log(`✅ ${stories.length} stories are valid and ready to seed`);
}

main();
