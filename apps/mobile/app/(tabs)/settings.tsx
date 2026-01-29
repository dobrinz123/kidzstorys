import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import { useSubscription } from "../../src/hooks/useSubscription";
import { restorePurchases } from "../../src/lib/revenuecat";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useLanguageStore } from "../../src/store/languageStore";

const TRANSLATIONS = {
  ro: {
    language: "Limbă",
    languages: {
      ro: "Română",
      en: "Engleză",
      it: "Italiană",
    },
    subscription: "Abonament",
    status: "Status",
    active: "Activ",
    inactive: "Inactiv",
    expiresOn: "Expiră la {date}",
    manageSubscription: "Gestionează abonament",
    restorePurchases: "Restaurează cumpărături",
    logout: "Deconectare",
    success: "Succes",
    restored: "Cumpărăturile au fost restaurate",
    error: "Eroare",
    restoreError: "Nu s-au putut restaura cumpărăturile",
    confirmLogout: "Ești sigur că vrei să te deconectezi?",
    yes: "Da",
    no: "Nu",
  },
  en: {
    language: "Language",
    languages: {
      ro: "Romanian",
      en: "English",
      it: "Italian",
    },
    subscription: "Subscription",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    expiresOn: "Expires on {date}",
    manageSubscription: "Manage Subscription",
    restorePurchases: "Restore Purchases",
    logout: "Sign Out",
    success: "Success",
    restored: "Purchases restored",
    error: "Error",
    restoreError: "Could not restore purchases",
    confirmLogout: "Are you sure you want to sign out?",
    yes: "Yes",
    no: "No",
  },
  it: {
    language: "Lingua",
    languages: {
      ro: "Rumeno",
      en: "Inglese",
      it: "Italiano",
    },
    subscription: "Abbonamento",
    status: "Stato",
    active: "Attivo",
    inactive: "Inattivo",
    expiresOn: "Scade il {date}",
    manageSubscription: "Gestisci abbonamento",
    restorePurchases: "Ripristina acquisti",
    logout: "Disconnetti",
    success: "Successo",
    restored: "Acquisti ripristinati",
    error: "Errore",
    restoreError: "Impossibile ripristinare gli acquisti",
    confirmLogout: "Sei sicuro di voler uscire?",
    yes: "Sì",
    no: "No",
  },
};

export default function SettingsScreen() {
  const router = useRouter();
  const { userId, signOut } = useAuth();
  const { hasAccess, expiresAt } = useSubscription(userId);
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const t = TRANSLATIONS[language] || TRANSLATIONS.ro;

  const updatePreferences = useMutation(api.users.updatePreferences);

  async function handleChangeLanguage(lang: "en" | "ro" | "it") {
    setLanguage(lang);
    if (userId) {
      await updatePreferences({ userId, preferredLanguage: lang });
    }
  }

  async function handleRestore() {
    try {
      await restorePurchases();
      Alert.alert(t.success, t.restored);
    } catch (error) {
      Alert.alert(t.error, t.restoreError);
    }
  }

  async function handleSignOut() {
    Alert.alert(
      t.logout,
      t.confirmLogout,
      [
        { text: t.no, style: "cancel" },
        {
          text: t.yes,
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/welcome");
          }
        }
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Language Section */}
      <Text style={styles.sectionTitle}>{t.language}</Text>
      <View style={styles.card}>
        {(["ro", "en", "it"] as const).map((lang, index, arr) => (
          <TouchableOpacity
            key={lang}
            style={[
              styles.langRow,
              index !== arr.length - 1 && styles.borderBottom
            ]}
            onPress={() => handleChangeLanguage(lang)}
          >
            <Text style={styles.langText}>
              {lang === "ro" ? "🇷🇴" : lang === "en" ? "🇬🇧" : "🇮🇹"} {t.languages[lang]}
            </Text>
            {language === lang && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Subscription Section */}
      <Text style={styles.sectionTitle}>{t.subscription}</Text>
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <Text style={styles.label}>{t.status}</Text>
          <View style={[styles.statusBadge, hasAccess ? styles.statusActive : styles.statusInactive]}>
            <Text style={styles.statusText}>
              {hasAccess ? t.active : t.inactive}
            </Text>
          </View>
        </View>

        {expiresAt && (
          <Text style={styles.expiresText}>
            {t.expiresOn.replace("{date}", new Date(expiresAt).toLocaleDateString())}
          </Text>
        )}

        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/paywall")}>
          <Text style={styles.actionButtonText}>{t.manageSubscription}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.textButton} onPress={handleRestore}>
          <Text style={styles.textButtonText}>{t.restorePurchases}</Text>
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.logoutText}>{t.logout}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a3e", // Dark theme background
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    marginTop: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  langRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  langText: {
    fontSize: 16,
    color: "#fff",
  },
  checkmark: {
    color: "#7C4DFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  label: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: "rgba(52, 199, 89, 0.2)",
  },
  statusInactive: {
    backgroundColor: "rgba(255, 59, 48, 0.2)",
  },
  statusText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#fff",
  },
  expiresText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: "#7C4DFF",
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  textButton: {
    padding: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  textButtonText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
  },
  logoutText: {
    color: "#FF453A",
    fontSize: 16,
    fontWeight: "600",
  },
  version: {
    textAlign: "center",
    color: "rgba(255,255,255,0.3)",
    marginTop: 30,
    fontSize: 12,
  }
});
