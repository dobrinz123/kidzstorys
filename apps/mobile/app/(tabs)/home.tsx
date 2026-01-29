import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../src/hooks/useAuth";
import { usePublishedBooks } from "../../src/hooks/useBooks";
import { useState } from "react";
import { getCoverImage } from "../../src/data/coverImages";

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { userId } = useAuth();

  const [ageFilter, setAgeFilter] = useState<number | null>(null);
  const [durationFilter, setDurationFilter] = useState<number | null>(null);
  const [stateFilter, setStateFilter] = useState<"calm" | "normal" | "agitated" | null>(null);

  const categories = useQuery(api.categories.getActiveCategories, {
    locale: i18n.language as any,
  });

  const recommendations = useQuery(
    api.stories.getRecommendedStories,
    userId
      ? {
        userId,
        locale: i18n.language as any,
        limit: 3,
        childState: stateFilter ?? undefined,
        durationMin: durationFilter ?? undefined,
      }
      : "skip"
  );

  // Get published books from Convex (new system)
  const { books: publishedBooks, isLoading: isBooksLoading } = usePublishedBooks(undefined, 20);

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filters}>
        <Text style={styles.filterLabel}>{t("home.filters.age")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[null, 3, 5, 7, 9].map((age) => (
            <TouchableOpacity
              key={age || "all"}
              style={[styles.filterChip, ageFilter === age && styles.filterChipActive]}
              onPress={() => setAgeFilter(age)}
            >
              <Text style={[styles.filterText, ageFilter === age && styles.filterTextActive]}>
                {age ? `${age}-${age + 1}` : t("common.all")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {/* Pick One Now */}
        {recommendations && recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("home.pickOneNow")}</Text>
            <TouchableOpacity
              style={styles.recommendationCard}
              onPress={() => router.push(`/story/${recommendations[0]._id}`)}
            >
              <Image
                source={getCoverImage(recommendations[0].storyKey)}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.cardOverlay}>
                <Text style={styles.cardTitle}>
                  {recommendations[0].locales[i18n.language as "en" | "ro" | "it"]?.title}
                </Text>
                <Text style={styles.cardMeta}>
                  {recommendations[0].durationMin} {t("common.min")} • {recommendations[0].ageMin}-
                  {recommendations[0].ageMax} {t("home.ageBrackets.years")}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Published Books from Convex */}
        {publishedBooks && publishedBooks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("home.newStories", "New Stories")}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {publishedBooks.map((book) => (
                <TouchableOpacity
                  key={book._id}
                  style={styles.bookCard}
                  onPress={() => router.push(`/story/${book.bookKey}`)}
                >
                  {book.cover.imageUrl ? (
                    <Image
                      source={{ uri: book.cover.imageUrl }}
                      style={styles.bookCover}
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={getCoverImage(book.bookKey)}
                      style={styles.bookCover}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {book.cover[`title_${i18n.language}` as keyof typeof book.cover] || book.cover.title_en}
                  </Text>
                  <Text style={styles.bookMeta}>
                    {book.durationMin} {t("common.min")} • {book.ageMin}-{book.ageMax} {t("home.ageBrackets.years", "ani")}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Category Aisles */}
        {categories?.map((category) => (
          <View key={category._id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {category[`name_${i18n.language}` as keyof typeof category] || category.name_en}
              </Text>
              <TouchableOpacity onPress={() => router.push(`/aisle/${category._id}`)}>
                <Text style={styles.seeAllText}>{t("home.seeAll")}</Text>
              </TouchableOpacity>
            </View>
            {/* Story cards would go here - simplified for now */}
            <Text style={styles.placeholder}>Stories from {category.slug}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  filters: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#007AFF",
  },
  filterText: {
    fontSize: 14,
    color: "#333",
  },
  filterTextActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  seeAllText: {
    fontSize: 14,
    color: "#007AFF",
  },
  recommendationCard: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    overflow: "hidden",
    height: 200,
    justifyContent: "flex-end",
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 14,
    color: "#eee",
  },
  placeholder: {
    padding: 20,
    textAlign: "center",
    color: "#999",
  },
  bookCard: {
    width: 140,
    marginRight: 12,
  },
  bookCover: {
    width: 140,
    height: 180,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    color: "#333",
  },
  bookMeta: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
});
