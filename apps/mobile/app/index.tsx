import { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, useWindowDimensions, LayoutChangeEvent, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getCoverImage, COVER_IMAGES, AVATARS } from "../src/data/coverImages";
import { useLanguageStore } from "../src/store/languageStore";
import { useUserStore } from "../src/store/userStore";

// Multilingual translations
const TRANSLATIONS = {
  ro: {
    searchPlaceholder: "Caută titluri, personaje...",
    searchResults: "rezultate",
    seeAll: "Vezi toate",
    back: "Înapoi",
    stories: "povești",
    footerText: "povești în 3 limbi",
    noResults: "Nu am găsit povești pentru căutarea ta.",
    readNow: "Citește acum",
    recommended: "Recomandat",
    min: "ani",
    minutes: "min",
    filters: {
      all: "Toate",
      age35: "3-5 ani",
      age57: "5-7 ani",
      short: "Scurte (< 5min)",
      long: "Lungi (> 5min)",
      sleep: "Pentru somn",
      day: "De zi"
    },
    categories: {
      "top-books": "Top Povești",
      "continue-reading": "Continuă lectura",
      "my-list": "Lista mea",
      bedtime: "Povești de seară",
      "calm-down": "Relaxare",
      emotions: "Emoții",
      "leo-penny": "Leo și Penny",
      "milo-rubina-fini": "Milo, Rubina și Fini",
      "learn-to-read": "Învață să citești",
      curiosities: "Curiozități"
    }
  },
  en: {
    searchPlaceholder: "Search titles, characters...",
    searchResults: "results",
    seeAll: "See all",
    back: "Back",
    stories: "stories",
    footerText: "stories in 3 languages",
    noResults: "No stories found matching your search.",
    readNow: "Read Now",
    recommended: "Recommended",
    min: "years",
    minutes: "min",
    filters: {
      all: "All",
      age35: "3-5 years",
      age57: "5-7 years",
      short: "Short (< 5min)",
      long: "Long (> 5min)",
      sleep: "Sleep",
      day: "Daytime"
    },
    categories: {
      "top-books": "Top Stories",
      "continue-reading": "Continue Reading",
      "my-list": "My List",
      bedtime: "Bedtime Stories",
      "calm-down": "Calm Down",
      emotions: "Emotions",
      "leo-penny": "Leo & Penny",
      "milo-rubina-fini": "Milo, Rubina & Fini",
      "learn-to-read": "Learn to Read",
      curiosities: "Curiosities"
    }
  },
  it: {
    searchPlaceholder: "Cerca titoli, personaggi...",
    searchResults: "risultati",
    seeAll: "Vedi tutti",
    back: "Indietro",
    stories: "storie",
    footerText: "storie in 3 lingue",
    noResults: "Nessuna storia trovata.",
    readNow: "Leggi ora",
    recommended: "Consigliato",
    min: "anni",
    minutes: "min",
    filters: {
      all: "Tutti",
      age35: "3-5 anni",
      age57: "5-7 anni",
      short: "Brevi (< 5min)",
      long: "Lunghe (> 5min)",
      sleep: "Per dormire",
      day: "Giorno"
    },
    categories: {
      "top-books": "Top Storie",
      "continue-reading": "Continua a leggere",
      "my-list": "La mia lista",
      bedtime: "Storie della buonanotte",
      "calm-down": "Rilassamento",
      emotions: "Emozioni",
      "leo-penny": "Leo e Penny",
      "milo-rubina-fini": "Milo, Rubina e Fini",
      "learn-to-read": "Impara a leggere",
      curiosities: "Curiosità"
    }
  }
};

// Categories metadata
const CATEGORIES_META = [
  { id: "bedtime", emoji: "🌙", color: "#8b5cf6" },
  { id: "calm-down", emoji: "🧘", color: "#06b6d4" },
  { id: "emotions", emoji: "💖", color: "#ec4899" },
  { id: "leo-penny", emoji: "🦁", color: "#f59e0b" },
  { id: "milo-rubina-fini", emoji: "🦊", color: "#22c55e" },
  { id: "learn-to-read", emoji: "📖", color: "#10b981" },
  { id: "curiosities", emoji: "🔬", color: "#3b82f6" },
];

const LANGUAGES = [
  { id: "ro", name: "🇷🇴 RO", flag: "🇷🇴" },
  { id: "en", name: "🇬🇧 EN", flag: "🇬🇧" },
  { id: "it", name: "🇮🇹 IT", flag: "🇮🇹" },
];

export default function Index() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(windowWidth);
  const [searchQuery, setSearchQuery] = useState("");
  const { language: selectedLanguage, setLanguage: setSelectedLanguage } = useLanguageStore();
  const { myList, readingProgress, storyViews, avatarId } = useUserStore();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Fetch books dynamically from Convex
  const rawBooks = useQuery(api.books.getPublishedBooksForApp, {});

  const getGridDimensions = () => {
    // Basic logic for responsiveness
    // On web, windowWidth can be large, we want to limit max width or cards
    const availableWidth = containerWidth || windowWidth;

    // Min card width
    const minCardWidth = 220; // Increased from 160
    const gap = 12;
    const padding = 32; // 16 left + 16 right

    let numColumns = Math.floor((availableWidth - padding + gap) / (minCardWidth + gap));
    if (numColumns < 2) numColumns = 2; // Min 2 columns for grid
    if (numColumns > 4) numColumns = 4; // Cap at 4 columns to keep them big

    const gridCardWidth = (availableWidth - padding - ((numColumns - 1) * gap)) / numColumns;

    // For horizontal scrolls, fixed width - much larger now
    const navCardWidth = availableWidth < 600 ? 200 : 240;

    return { numColumns, gridCardWidth, navCardWidth };
  };

  const { numColumns, gridCardWidth, navCardWidth } = getGridDimensions();
  const isSmallScreen = windowWidth < 600;
  const FEATURED_HEIGHT = isSmallScreen ? 250 : 380;

  const t = TRANSLATIONS[selectedLanguage as keyof typeof TRANSLATIONS];

  // Map Backend Data to UI Structure
  const allStories = useMemo(() => {
    if (!rawBooks) return [];

    return rawBooks.map(book => ({
      id: book.bookKey,
      title: book.cover.title_ro || "Untitled", // Default RO
      titleEn: book.cover.title_en,
      titleIt: book.cover.title_it,
      titleRo: book.cover.title_ro,
      category: book.category?.slug || "bedtime", // Fallback
      ageMin: book.ageMin,
      ageMax: book.ageMax,
      duration: book.durationMin,
      coverUrl: book.cover.imageUrl, // New dynamic URL
      legacyAssetKey: book.cover.legacyAssetKey, // New legacy key
      // Keep legacy structure support if needed for other components
      readCount: book.readCount || 0,
      favoriteCount: book.favoriteCount || 0,
    }));
  }, [rawBooks]);

  // Get stories by category
  const storiesByCategory = useMemo(() => {
    const result: Record<string, typeof allStories> = {};
    CATEGORIES_META.forEach(cat => {
      result[cat.id] = allStories.filter(s => s.category === cat.id);
    });
    return result;
  }, [allStories]);

  // Get story title based on language
  const getTitle = (story: any) => {
    if (selectedLanguage === "en") return story.titleEn;
    if (selectedLanguage === "it") return story.titleIt;
    if (selectedLanguage === "ro") return story.titleRo;
    return story.title;
  };

  // Featured story (most popular or random)
  const featuredStory = useMemo(() => {
    if (allStories.length === 0) return null;

    // Sort by readCount from backend instead of local views
    // If we have views, pick the top one
    const sortedByPopularity = [...allStories].sort((a, b) => (b.readCount || 0) - (a.readCount || 0));

    // Attempt to find one with a nice cover
    return sortedByPopularity[0];
  }, [allStories]);

  // Derived Lists
  const topBooks = useMemo(() => {
    return [...allStories]
      .sort((a, b) => (b.readCount || 0) - (a.readCount || 0));
  }, [allStories]);

  const continueReadingStories = useMemo(() => {
    const progressMap = readingProgress || {};
    return allStories.filter(s => {
      const progress = progressMap[s.id] || 0;
      // User asked for > 2 pages to show in continue reading
      return progress >= 1;
    });
  }, [readingProgress, allStories]);

  const myListStories = useMemo(() => {
    const list = myList || [];
    return allStories.filter(s => list.includes(s.id));
  }, [myList, allStories]);

  // Filter Logic
  const filteredStories = useMemo(() => {
    let results = allStories;

    // 1. Text Search
    if (searchQuery.trim()) {
      results = results.filter(s => {
        const title = getTitle(s) || "";
        return title.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    // 2. Filter Pills
    if (activeFilter) {
      if (activeFilter === 'age35') results = results.filter(s => s.ageMin <= 3 && s.ageMax >= 3);
      if (activeFilter === 'age57') results = results.filter(s => s.ageMin >= 5);
      if (activeFilter === 'short') results = results.filter(s => s.duration <= 5);
      if (activeFilter === 'long') results = results.filter(s => s.duration > 5);
      if (activeFilter === 'bedtime') results = results.filter(s => s.category === 'bedtime');
    }

    return results;
  }, [searchQuery, activeFilter, selectedLanguage, allStories]);

  const selectedAvatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];

  // View State logic
  const isSearchActive = searchQuery.length > 0 || activeFilter !== null;

  // Show Hero if not searching, and not viewing specific category
  const showHero = !isSearchActive && !selectedCategory && featuredStory;
  const showCategories = !isSearchActive && !selectedCategory;
  const showSearchResults = isSearchActive && !selectedCategory;
  const showCategoryView = !!selectedCategory;

  const navigateToStory = (id: string) => {
    router.push(`/story/${id}`);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const renderStoryCard = (story: any, index: number, isGrid: boolean = false, section?: string) => {
    // Determine image source:
    // 1. Convex URL (new)
    // 2. Local Require (legacy fallback)
    let imageSource;
    if (story.coverUrl) {
      imageSource = { uri: story.coverUrl };
    } else {
      // Fallback to legacy
      // Try mapping by ID or legacyAssetKey
      const legacyKey = story.legacyAssetKey || story.id;
      imageSource = getCoverImage(legacyKey, story.category);
    }

    const hasUniqueImage = !!story.coverUrl || !!COVER_IMAGES[story.id];

    // Dimensions
    const width = isGrid ? gridCardWidth : navCardWidth;
    const height = width * 1; // Square aspect ratio to show full cover

    const isInList = (myList || []).includes(story.id);

    return (
      <View key={story.id} style={{ position: 'relative' }}>
        <TouchableOpacity
          style={[styles.storyCard, { width, height, marginBottom: isGrid ? 16 : 0 }]}
          onPress={() => navigateToStory(story.id)}
          activeOpacity={0.8}
        >
          <Image
            source={imageSource}
            style={styles.cardImage}
          />
          <View style={styles.cardGradient}>
            <Text style={[styles.cardTitle, { fontSize: width < 140 ? 12 : 14 }]} numberOfLines={2}>
              {getTitle(story)}
            </Text>
            <Text style={styles.cardMeta}>{story.ageMin}-{story.ageMax} {t.min} • {story.duration}m</Text>
          </View>
          {!hasUniqueImage && !story.coverUrl && (
            <View style={styles.coverBadge}>
              <Text style={styles.coverBadgeText}>{story.category.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Action Overlay Button */}
        {section === 'continue-reading' ? (
          <TouchableOpacity
            style={[styles.removeBtn]}
            onPress={(e: any) => {
              e.stopPropagation();
              useUserStore.getState().removeProgress(story.id);
            }}
          >
            <Text style={styles.removeIcon}>—</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addListBtn}
            onPress={(e: any) => {
              e.stopPropagation(); // Prevent opening story
              if (isInList) useUserStore.getState().removeFromMyList(story.id);
              else useUserStore.getState().addToMyList(story.id);
            }}
          >
            <Text style={styles.addListIcon}>{isInList ? "❤️" : "🤍"}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const Filters = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
      {[
        { id: null, label: t.filters.all },
        { id: 'age35', label: t.filters.age35 },
        { id: 'age57', label: t.filters.age57 },
        { id: 'short', label: t.filters.short },
        { id: 'long', label: t.filters.long },
        { id: 'bedtime', label: t.filters.sleep },
      ].map(f => (
        <TouchableOpacity
          key={f.id || 'all'}
          style={[styles.filterPill, activeFilter === f.id && styles.filterPillActive]}
          onPress={() => setActiveFilter(f.id === activeFilter ? null : f.id as string)}
        >
          <Text style={[styles.filterText, activeFilter === f.id && styles.filterTextActive]}>{f.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (rawBooks === undefined) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#7C4DFF" />
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>

        {/* TOP BAR */}
        <View style={styles.topBar}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.langBtn}
              onPress={() => setShowLanguageMenu(!showLanguageMenu)}
            >
              <Text style={styles.langBtnText}>
                {LANGUAGES.find(l => l.id === selectedLanguage)?.flag}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => router.push("/account")}
            >
              <View style={styles.profileIconAvatar}>
                <Image source={selectedAvatar.img} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* SEARCH BAR & FILTERS (Sticky) */}
        <View style={styles.stickyHeader}>
          {showLanguageMenu && (
            <View style={styles.langMenu}>
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.id}
                  style={[styles.langOption, selectedLanguage === lang.id && styles.langOptionActive]}
                  onPress={() => {
                    setSelectedLanguage(lang.id as "ro" | "en" | "it");
                    setShowLanguageMenu(false);
                  }}
                >
                  <Text style={styles.langOptionText}>{lang.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, isSearchActive && styles.searchBarActive]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={t.searchPlaceholder}
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onFocus={() => {
                  if (!activeFilter) setActiveFilter(null); // Just activate search mode
                }}
                onChangeText={(e: any) => setSearchQuery(e)}
              />
              {(searchQuery.length > 0 || activeFilter) && (
                <TouchableOpacity onPress={() => {
                  setSearchQuery("");
                  setActiveFilter(null);
                  setSelectedCategory(null);
                }}>
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Show filters if searching or just on homepage */}
          {!selectedCategory && <Filters />}
        </View>

        {/* HERO SECTION */}
        {showHero && featuredStory && (
          <TouchableOpacity
            style={[styles.featured, { height: FEATURED_HEIGHT }]}
            onPress={() => navigateToStory(featuredStory.id)}
            activeOpacity={0.95}
          >
            <Image
              source={
                featuredStory.coverUrl
                  ? { uri: featuredStory.coverUrl }
                  : getCoverImage(featuredStory.legacyAssetKey || featuredStory.id, featuredStory.category)
              }
              style={styles.featuredImage}
            />
            <View style={styles.featuredOverlay}>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>⭐ {t.recommended}</Text>
              </View>
              <Text style={styles.featuredTitle}>{getTitle(featuredStory)}</Text>
              <Text style={styles.featuredMeta}>
                {featuredStory.ageMin}-{featuredStory.ageMax} {t.min} • {featuredStory.duration} {t.minutes}
              </Text>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => navigateToStory(featuredStory.id)}
              >
                <Text style={styles.playButtonText}>▶ {t.readNow}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* SEARCH RESULTS GRID */}
        {showSearchResults && (
          <View style={styles.categorySection}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? `🔍 "${searchQuery}"` : "📑"} • {filteredStories.length} {t.searchResults}
            </Text>
            <View style={styles.gridContainer}>
              {filteredStories.map((story: any, i: any) => renderStoryCard(story, i, true))}
              {filteredStories.length === 0 && (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>{t.noResults}</Text>
                  <TouchableOpacity onPress={() => { setSearchQuery(""); setActiveFilter(null); }}>
                    <Text style={styles.resetBtn}>{t.seeAll}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* NEW SECTIONS: Top Books, Continue Reading, My List */}
        {!selectedCategory && !isSearchActive && (
          <>
            {/* Top Books */}
            <View style={styles.categorySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🏆 {t.categories["top-books"]}</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rowScrollContent}
              >
                {topBooks.slice(0, 10).map((story: any, i: any) => renderStoryCard(story, i))}
              </ScrollView>
            </View>

            {/* Continue Reading */}
            {continueReadingStories.length > 0 && (
              <View style={styles.categorySection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>📖 {t.categories["continue-reading"]}</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rowScrollContent}
                >
                  {continueReadingStories.map((story: any, i: any) => renderStoryCard(story, i, false, 'continue-reading'))}
                </ScrollView>
              </View>
            )}

            {/* My List */}
            {myListStories.length > 0 && (
              <View style={styles.categorySection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>❤️ {t.categories["my-list"]}</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.rowScrollContent}
                >
                  {myListStories.map((story: any, i: any) => renderStoryCard(story, i))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* CATEGORY ROWS (Netflix Style) */}
        {showCategories && CATEGORIES_META.map(categoryMeta => (
          <View key={categoryMeta.id} style={styles.categorySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {categoryMeta.emoji} {t.categories[categoryMeta.id as keyof typeof t.categories]}
              </Text>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => setSelectedCategory(categoryMeta.id)}
              >
                <Text style={styles.seeAllText}>{t.seeAll} ›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rowScrollContent}
            >
              {storiesByCategory[categoryMeta.id]?.slice(0, 10).map((story: any, i: any) => renderStoryCard(story, i))}
            </ScrollView>
          </View>
        ))}

        {/* SELECTED CATEGORY VIEW (Grid) */}
        {showCategoryView && (
          <View style={styles.categorySection}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← {t.back}</Text>
              </TouchableOpacity>
              <Text style={styles.categoryHeaderTitle}>
                {t.categories[selectedCategory as keyof typeof t.categories]}
              </Text>
            </View>
            <View style={styles.gridContainer}>
              {storiesByCategory[selectedCategory!]?.map((story: any, i: any) => renderStoryCard(story, i, true))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a3e", // Cosmic Dark Blue
  },
  scrollView: {
    flex: 1,
  },
  stickyHeader: {
    backgroundColor: "#1a1a3e",
    paddingBottom: 10,
    zIndex: 10,
    elevation: 5,
  },

  // Top Bar
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: "#1a1a3e",
  },
  logo: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  logoImage: {
    width: 120,
    height: 40,
  },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  langBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginLeft: 8,
  },
  profileIconAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#7C4DFF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  profileIconText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  langMenu: {
    backgroundColor: "#2a2a5e",
    position: "absolute",
    top: 0,
    right: 16,
    zIndex: 100,
    width: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  langOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  langOptionActive: {
    backgroundColor: "rgba(124, 77, 255, 0.2)",
  },
  langOptionText: {
    color: "#fff",
    fontSize: 14,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 48,
  },
  searchBarActive: {
    borderColor: "#7C4DFF",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.7,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#fff",
    height: "100%",
  },
  clearIcon: {
    fontSize: 18,
    color: "#ccc",
    padding: 4,
  },

  // Filters
  filtersScroll: {
    paddingLeft: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: "#7C4DFF",
    borderColor: "#7C4DFF",
  },
  filterText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "bold",
  },

  // Hero
  featured: {
    marginBottom: 32,
    position: "relative",
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 10,
    elevation: 8,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  featuredOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 16,
    // Note: Simple gradient overlay simulation
    backgroundColor: "rgba(26, 26, 62, 0.5)",
  },
  featuredBadge: {
    backgroundColor: "#7C4DFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  featuredMeta: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    marginBottom: 12,
    fontWeight: "500",
  },
  playButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  playButtonText: {
    color: "#1a1a3e",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Sections
  categorySection: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    color: "#7C4DFF",
    fontSize: 14,
    fontWeight: "bold",
  },

  rowScrollContent: {
    paddingLeft: 20,
    paddingRight: 20, // Adjusted to match left
    gap: 12, // Use gap for horizontal lists too
  },

  // Cards
  storyCard: {
    // marginRight removed, handled by gap
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#2a2a5e",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    paddingTop: 20,
    backgroundColor: "rgba(26, 26, 62, 0.5)",
  },
  cardTitle: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  cardMeta: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "600",
  },
  coverBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  coverBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  addListBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  addListIcon: {
    fontSize: 16,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  removeIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: -2,
  },

  // Grid
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12, // Unified gap
    // justifyContent: "space-between", // Removed this to fix the 2-item spread issue
  },
  noResults: {
    width: "100%",
    padding: 20,
    alignItems: "center",
  },
  noResultsText: {
    color: "#aaa",
    marginBottom: 16,
    fontSize: 16,
  },
  resetBtn: {
    color: "#7C4DFF",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Category View
  backBtn: {
    marginRight: 10,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 16,
  },
  categoryHeaderTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },

  // Footer
  footer: {
    padding: 40,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
  },
});
