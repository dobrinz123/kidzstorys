// Deterministic Story Recommendation Engine
// No AI - pure scoring algorithm

export interface Story {
  _id: string;
  storyKey: string;
  categoryId: string;
  ageMin: number;
  ageMax: number;
  durationMin: number;
  tags_en: string[];
  tags_ro: string[];
  tags_it: string[];
  publishedAt?: number;
  readCount: number;
  favoriteCount: number;
  locales: {
    en: { title: string; text: string; parentQuestions: string[] };
    ro: { title: string; text: string; parentQuestions: string[] };
    it: { title: string; text: string; parentQuestions: string[] };
  };
}

export interface RecommendationContext {
  childAge?: number;
  categoryId?: string;
  durationMin?: number;
  childState?: "calm" | "normal" | "agitated";
  recentStoryKeys: string[];
  locale: "en" | "ro" | "it";
}

export function calculateRecommendationScore(
  story: Story,
  context: RecommendationContext
): number {
  let score = 0;

  // 1. Category match (+50)
  if (context.categoryId && story.categoryId === context.categoryId) {
    score += 50;
  }

  // 2. Age bracket match (+40 for perfect match, scaled down for edges)
  if (context.childAge) {
    if (
      context.childAge >= story.ageMin &&
      context.childAge <= story.ageMax
    ) {
      const rangeCenter = (story.ageMin + story.ageMax) / 2;
      const distanceFromCenter = Math.abs(context.childAge - rangeCenter);
      const rangeWidth = Math.max(story.ageMax - story.ageMin, 1);
      score += 40 - (distanceFromCenter / rangeWidth) * 20;
    } else {
      const distance = Math.min(
        Math.abs(context.childAge - story.ageMin),
        Math.abs(context.childAge - story.ageMax)
      );
      score -= distance * 5;
    }
  }

  // 3. Duration proximity (+20 for close match)
  if (context.durationMin) {
    const durationDiff = Math.abs(story.durationMin - context.durationMin);
    if (durationDiff === 0) {
      score += 20;
    } else if (durationDiff <= 2) {
      score += 15;
    } else if (durationDiff <= 5) {
      score += 10;
    } else {
      score += 5;
    }
  }

  // 4. Child state boosting
  if (context.childState === "agitated") {
    const tags =
      context.locale === "en"
        ? story.tags_en
        : context.locale === "ro"
          ? story.tags_ro
          : story.tags_it;

    const calmingKeywords = ["calm", "calmare", "calma", "breathing", "respirare", "respiro"];
    const hasCalmingTag = tags.some((tag) =>
      calmingKeywords.some((keyword) => tag.toLowerCase().includes(keyword))
    );

    if (hasCalmingTag) {
      score += 30;
    }
  }

  // 5. Freshness penalty for recently read
  if (context.recentStoryKeys.includes(story.storyKey)) {
    const recencyIndex = context.recentStoryKeys.indexOf(story.storyKey);
    score -= 20 - recencyIndex;
  }

  // 6. Popularity bonus (soft)
  score += Math.min(story.favoriteCount * 0.1, 10);
  score += Math.min(story.readCount * 0.05, 5);

  return Math.round(score);
}

export function sortStoriesByScore(
  stories: Story[],
  context: RecommendationContext
): Story[] {
  const scoredStories = stories.map((story) => ({
    story,
    score: calculateRecommendationScore(story, context),
  }));

  scoredStories.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-breaker: newer first
    return (b.story.publishedAt || 0) - (a.story.publishedAt || 0);
  });

  return scoredStories.map((s) => s.story);
}
