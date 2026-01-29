export const STORY_SCENES: Record<string, any[]> = {
    "bedtime-001-sleepy-cloud": [
        require("../../assets/story_scenes/bedtime_001_1.png"), // Day
        require("../../assets/story_scenes/bedtime_001_1.png"), // Day
        require("../../assets/story_scenes/bedtime_001_2.png"), // Sunset (Page 3 approx)
        require("../../assets/story_scenes/bedtime_001_2.png"), // Sunset
        require("../../assets/story_scenes/bedtime_001_3.png"), // Night
        require("../../assets/story_scenes/bedtime_001_3.png"), // Night
        require("../../assets/story_scenes/bedtime_001_3.png"), // Night
        require("../../assets/story_scenes/bedtime_001_3.png"), // Night
    ]
};

export const getStoryScene = (storyId: string, pageIndex: number): any | null => {
    const scenes = STORY_SCENES[storyId];
    if (!scenes || scenes.length === 0) return null;

    // Use the specific image for the page, or the last available image if we run out
    // This prevents looping back to "Day" images at the end of a "Night" story
    const index = Math.min(pageIndex, scenes.length - 1);
    return scenes[index];
};
