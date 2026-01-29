import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { getOfferings, purchasePackage, restorePurchases } from "../src/lib/revenuecat";
import { useLanguageStore } from "../src/store/languageStore";

// Translations for paywall
const TRANSLATIONS = {
  ro: {
    title: "Deblochează Toate Poveștile",
    subtitle: "Acces nelimitat la peste 99+ povești magice pentru copilul tău",
    feature1: "Peste 99+ povești în română, engleză și italiană",
    feature2: "Povești noi adăugate săptămânal",
    feature3: "Povești pentru somn, relaxare și aventuri",
    feature4: "Fără reclame, experiență sigură pentru copii",
    feature5: "Acces offline - citește oriunde, oricând",
    monthly: "Lunar",
    yearly: "Anual",
    monthPrice: "/lună",
    yearPrice: "/an",
    bestValue: "ECONOMISEȘTI 33%",
    mostPopular: "CEL MAI POPULAR",
    freeTrial: "15 zile gratuit",
    thenPrice: "apoi",
    startTrial: "Începe Perioada Gratuită",
    subscribe: "Abonează-te Acum",
    restore: "Restaurează Achiziția",
    terms: "Prin continuare, accepți Termenii și Condițiile noastre.",
    termsLink: "Termeni și Condiții",
    privacyLink: "Politica de Confidențialitate",
    cancel: "Anulezi oricând",
    secure: "Plată securizată",
    back: "← Înapoi",
    purchaseError: "Eroare la achiziție",
    purchaseErrorDesc: "A apărut o eroare la procesarea plății. Te rugăm să încerci din nou.",
    restoreError: "Eroare la restaurare",
    restoreErrorDesc: "Nu am găsit nicio achiziție anterioară pentru acest cont.",
    restoreSuccess: "Achiziție restaurată!",
    restoreSuccessDesc: "Abonamentul tău a fost restaurat cu succes.",
    configError: "RevenueCat nu este configurat. Contactează suportul.",
    perMonth: "/lună",
    perYear: "/an",
    billed: "Facturat",
    billedMonthly: "lunar",
    billedYearly: "anual",
  },
  en: {
    title: "Unlock All Stories",
    subtitle: "Unlimited access to 99+ magical stories for your child",
    feature1: "99+ stories in Romanian, English, and Italian",
    feature2: "New stories added weekly",
    feature3: "Bedtime, calm-down, and adventure stories",
    feature4: "Ad-free, safe experience for kids",
    feature5: "Offline access - read anywhere, anytime",
    monthly: "Monthly",
    yearly: "Yearly",
    monthPrice: "/month",
    yearPrice: "/year",
    bestValue: "SAVE 33%",
    mostPopular: "MOST POPULAR",
    freeTrial: "15 days free",
    thenPrice: "then",
    startTrial: "Start Free Trial",
    subscribe: "Subscribe Now",
    restore: "Restore Purchase",
    terms: "By continuing, you accept our Terms and Conditions.",
    termsLink: "Terms & Conditions",
    privacyLink: "Privacy Policy",
    cancel: "Cancel anytime",
    secure: "Secure payment",
    back: "← Back",
    purchaseError: "Purchase Error",
    purchaseErrorDesc: "An error occurred while processing your payment. Please try again.",
    restoreError: "Restore Error",
    restoreErrorDesc: "No previous purchases found for this account.",
    restoreSuccess: "Purchase Restored!",
    restoreSuccessDesc: "Your subscription has been successfully restored.",
    configError: "RevenueCat is not configured. Contact support.",
    perMonth: "/month",
    perYear: "/year",
    billed: "Billed",
    billedMonthly: "monthly",
    billedYearly: "yearly",
  },
  it: {
    title: "Sblocca Tutte le Storie",
    subtitle: "Accesso illimitato a oltre 99 storie magiche per il tuo bambino",
    feature1: "99+ storie in rumeno, inglese e italiano",
    feature2: "Nuove storie aggiunte ogni settimana",
    feature3: "Storie per dormire, rilassarsi e avventure",
    feature4: "Senza pubblicità, esperienza sicura per i bambini",
    feature5: "Accesso offline - leggi ovunque, in qualsiasi momento",
    monthly: "Mensile",
    yearly: "Annuale",
    monthPrice: "/mese",
    yearPrice: "/anno",
    bestValue: "RISPARMIA 33%",
    mostPopular: "PIÙ POPOLARE",
    freeTrial: "15 giorni gratis",
    thenPrice: "poi",
    startTrial: "Inizia Prova Gratuita",
    subscribe: "Abbonati Ora",
    restore: "Ripristina Acquisto",
    terms: "Continuando, accetti i nostri Termini e Condizioni.",
    termsLink: "Termini e Condizioni",
    privacyLink: "Privacy Policy",
    cancel: "Disdici quando vuoi",
    secure: "Pagamento sicuro",
    back: "← Indietro",
    purchaseError: "Errore acquisto",
    purchaseErrorDesc: "Si è verificato un errore durante l'elaborazione del pagamento. Riprova.",
    restoreError: "Errore ripristino",
    restoreErrorDesc: "Nessun acquisto precedente trovato per questo account.",
    restoreSuccess: "Acquisto ripristinato!",
    restoreSuccessDesc: "Il tuo abbonamento è stato ripristinato con successo.",
    configError: "RevenueCat non è configurato. Contatta l'assistenza.",
    perMonth: "/mese",
    perYear: "/anno",
    billed: "Fatturato",
    billedMonthly: "mensilmente",
    billedYearly: "annualmente",
  },
};

export default function PaywallScreen() {
  const router = useRouter();
  const language = useLanguageStore((state: any) => state.language);
  const t = TRANSLATIONS[language as keyof typeof TRANSLATIONS] || TRANSLATIONS.ro;

  const [offering, setOffering] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

  useEffect(() => {
    loadOfferings();
  }, []);

  async function loadOfferings() {
    try {
      const offers = await getOfferings();
      setOffering(offers);
    } catch (error) {
      console.error("Error loading offerings:", error);
    } finally {
      setLoading(false);
    }
  }

  // Get package based on selection
  const getSelectedPackage = () => {
    if (!offering?.availablePackages) return null;

    const packages = offering.availablePackages;

    if (selectedPlan === "yearly") {
      return packages.find((p: any) =>
        p.identifier.includes("annual") || p.identifier.includes("yearly")
      ) || packages[0];
    } else {
      return packages.find((p: any) =>
        p.identifier.includes("month") && !p.identifier.includes("annual")
      ) || packages[0];
    }
  };

  // Get price strings from packages
  const getMonthlyPrice = () => {
    if (!offering?.availablePackages) return "4.99 €";
    const monthly = offering.availablePackages.find((p: any) =>
      p.identifier.includes("month") && !p.identifier.includes("annual")
    );
    return monthly?.product?.priceString || "4.99 €";
  };

  const getYearlyPrice = () => {
    if (!offering?.availablePackages) return "39.99 €";
    const yearly = offering.availablePackages.find((p: any) =>
      p.identifier.includes("annual") || p.identifier.includes("yearly")
    );
    return yearly?.product?.priceString || "39.99 €";
  };

  const getYearlyMonthlyEquivalent = () => {
    if (!offering?.availablePackages) return "3.33 €";
    const yearly = offering.availablePackages.find((p: any) =>
      p.identifier.includes("annual") || p.identifier.includes("yearly")
    );
    if (yearly?.product?.price) {
      const monthlyPrice = (yearly.product.price / 12).toFixed(2);
      return `${monthlyPrice} ${yearly.product.currencyCode || '€'}`;
    }
    return "3.33 €";
  };

  async function handlePurchase() {
    console.log("[Paywall] handlePurchase called");
    const pkg = getSelectedPackage();
    console.log("[Paywall] Selected package:", pkg);

    try {
      setPurchasing(true);
      console.log("[Paywall] Calling purchasePackage...");
      // Pass package or null - purchasePackage handles mock mode internally
      const customerInfo = await purchasePackage(pkg);
      console.log("[Paywall] purchasePackage result:", customerInfo);

      if (customerInfo?.entitlements.active["premium"]) {
        console.log("[Paywall] Premium entitlement found, navigating to home");
        // Success! Navigate to home
        router.replace("/");
      } else if (customerInfo === null) {
        console.log("[Paywall] User cancelled or null result");
        // User cancelled - do nothing
      }
    } catch (error: any) {
      console.error("[Paywall] Purchase error:", error);
      Alert.alert(t.purchaseError, t.purchaseErrorDesc);
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    try {
      setPurchasing(true);
      const customerInfo = await restorePurchases();

      if (customerInfo?.entitlements.active["premium"]) {
        Alert.alert(t.restoreSuccess, t.restoreSuccessDesc, [
          { text: "OK", onPress: () => router.replace("/") }
        ]);
      } else {
        Alert.alert(t.restoreError, t.restoreErrorDesc);
      }
    } catch (error) {
      console.error("Restore error:", error);
      Alert.alert(t.restoreError, t.restoreErrorDesc);
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C4DFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back Button - Fixed at top */}
      <View style={styles.backButtonContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>{t.back}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureRow}>
            <View style={styles.checkIcon}>
              <Text style={styles.checkText}>✓</Text>
            </View>
            <Text style={styles.featureText}>{t.feature1}</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.checkIcon}>
              <Text style={styles.checkText}>✓</Text>
            </View>
            <Text style={styles.featureText}>{t.feature2}</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.checkIcon}>
              <Text style={styles.checkText}>✓</Text>
            </View>
            <Text style={styles.featureText}>{t.feature3}</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.checkIcon}>
              <Text style={styles.checkText}>✓</Text>
            </View>
            <Text style={styles.featureText}>{t.feature4}</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.checkIcon}>
              <Text style={styles.checkText}>✓</Text>
            </View>
            <Text style={styles.featureText}>{t.feature5}</Text>
          </View>
        </View>

        {/* Plan Selection */}
        <View style={styles.plansContainer}>
          {/* Yearly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === "yearly" && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan("yearly")}
            activeOpacity={0.8}
          >
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>{t.bestValue}</Text>
            </View>

            <View style={styles.planHeader}>
              <View style={styles.radioOuter}>
                {selectedPlan === "yearly" && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.planTitle}>{t.yearly}</Text>
            </View>

            <View style={styles.planPricing}>
              <Text style={styles.planPrice}>{getYearlyPrice()}</Text>
              <Text style={styles.planPeriod}>{t.perYear}</Text>
            </View>

            <Text style={styles.planEquivalent}>
              {getYearlyMonthlyEquivalent()}{t.perMonth}
            </Text>

            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>{t.freeTrial}</Text>
            </View>
          </TouchableOpacity>

          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === "monthly" && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan("monthly")}
            activeOpacity={0.8}
          >
            <View style={styles.planHeader}>
              <View style={styles.radioOuter}>
                {selectedPlan === "monthly" && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.planTitle}>{t.monthly}</Text>
            </View>

            <View style={styles.planPricing}>
              <Text style={styles.planPrice}>{getMonthlyPrice()}</Text>
              <Text style={styles.planPeriod}>{t.perMonth}</Text>
            </View>

            <Text style={styles.planBilled}>
              {t.billed} {t.billedMonthly}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[styles.subscribeButton, purchasing && styles.buttonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.8}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {selectedPlan === "yearly" ? t.startTrial : t.subscribe}
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel info */}
        <Text style={styles.cancelText}>{t.cancel}</Text>

        {/* Restore */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={purchasing}
          style={styles.restoreButton}
        >
          <Text style={styles.restoreText}>{t.restore}</Text>
        </TouchableOpacity>

        {/* Terms */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>{t.terms}</Text>
          <View style={styles.termsLinks}>
            <TouchableOpacity onPress={() => router.push("/terms")}>
              <Text style={styles.termsLink}>{t.termsLink}</Text>
            </TouchableOpacity>
            <Text style={styles.termsDivider}>•</Text>
            <TouchableOpacity onPress={() => router.push("/privacy")}>
              <Text style={styles.termsLink}>{t.privacyLink}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Secure payment */}
        <View style={styles.secureContainer}>
          <Text style={styles.secureText}>🔒 {t.secure}</Text>
        </View>
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
  content: {
    padding: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a3e",
  },
  backButtonContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  features: {
    marginBottom: 32,
    backgroundColor: "#2a2a5e", // Lighter Cosmic Blue
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#7C4DFF", // Purple
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  checkText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  featureText: {
    fontSize: 15,
    color: "#fff",
    flex: 1,
    lineHeight: 22,
  },
  plansContainer: {
    marginBottom: 24,
    gap: 16,
  },
  planCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    position: "relative",
  },
  planCardSelected: {
    borderColor: "#7C4DFF",
    backgroundColor: "rgba(124, 77, 255, 0.1)",
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    right: 24,
    backgroundColor: "#7C4DFF",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#7C4DFF",
  },
  planTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  planPricing: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
    marginLeft: 40,
  },
  planPrice: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },
  planPeriod: {
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    marginLeft: 4,
  },
  planEquivalent: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginLeft: 40,
    marginBottom: 16,
  },
  planBilled: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginLeft: 40,
  },
  trialBadge: {
    backgroundColor: "rgba(124, 77, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginLeft: 40,
  },
  trialBadgeText: {
    color: "#b388ff", // Lighter purple for text
    fontSize: 13,
    fontWeight: "bold",
  },
  subscribeButton: {
    backgroundColor: "#7C4DFF",
    paddingVertical: 20,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#7C4DFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  subscribeButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  cancelText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  restoreButton: {
    padding: 12,
    alignItems: "center",
    marginBottom: 32,
  },
  restoreText: {
    color: "#b388ff",
    fontSize: 15,
    fontWeight: "600",
  },
  termsContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  termsText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 18,
  },
  termsLinks: {
    flexDirection: "row",
    alignItems: "center",
  },
  termsLink: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  termsDivider: {
    color: "rgba(255,255,255,0.3)",
    marginHorizontal: 8,
  },
  secureContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    opacity: 0.6,
  },
  secureText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
