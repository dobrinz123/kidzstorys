import { View, Text, FlatList, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "../../src/hooks/useAuth";
import { useStoryAccess } from "../../src/hooks/useStoryAccess";

export default function FavoritesScreen() {
  const { t, i18n } = useTranslation();
  const { userId } = useAuth();
  const { canAccess } = useStoryAccess(userId);

  const favorites = useQuery(
    api.favorites.getFavorites,
    userId && canAccess ? { userId, locale: i18n.language as any } : "skip"
  );

  if (!canAccess) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{t("favorites.requiresSubscription")}</Text>
        <Text style={styles.emptyText}>{t("favorites.emptyDescription")}</Text>
      </View>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{t("favorites.empty")}</Text>
        <Text style={styles.emptyText}>{t("favorites.emptyDescription")}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={favorites}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <View style={styles.storyCard}>
          <Text style={styles.storyTitle}>
            {item.locales[i18n.language as "en" | "ro" | "it"]?.title}
          </Text>
          <Text style={styles.storyMeta}>
            {item.durationMin} min • {item.ageMin}-{item.ageMax} years
          </Text>
        </View>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  storyCard: {
    padding: 16,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    marginBottom: 12,
  },
  storyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  storyMeta: {
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
