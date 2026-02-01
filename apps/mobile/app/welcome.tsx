import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
    Dimensions,
    ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useLanguageStore } from "../src/store/languageStore";
import { getCoverImage } from "../src/data/coverImages";
import { ALL_STORIES } from "../src/data/stories";

const { width, height } = Dimensions.get("window");

// Translations
const TRANSLATIONS = {
    ro: {
        welcome: "Bun venit la",
        appName: "KidStoryz",
        tagline: "Povești magice pentru copii curioși",
        features: [
            "🌙 Povești de somn, aventuri, emoții",
            "👶 Potrivite pentru 3-7 ani",
        ],
        signIn: "Am deja cont",
        signUp: "Creează cont gratuit",
        trial: "15 zile gratuit • Anulează oricând",
    },
    en: {
        welcome: "Welcome to",
        appName: "KidStoryz",
        tagline: "Magical stories for curious kids",
        features: [
            "🌙 Bedtime, adventure, emotions",
            "👶 Perfect for ages 3-7",
        ],
        signIn: "I already have an account",
        signUp: "Create free account",
        trial: "15 days free • Cancel anytime",
    },
    it: {
        welcome: "Benvenuto su",
        appName: "KidStoryz",
        tagline: "Storie magiche per bambini curiosi",
        features: [
            "🌙 Storie per dormire, avventure, emozioni",
            "👶 Perfette per 3-7 anni",
        ],
        signIn: "Ho già un account",
        signUp: "Crea account gratuito",
        trial: "15 giorni gratis • Annulla quando vuoi",
    },
};

export default function WelcomeScreen() {
    const router = useRouter();
    const language = useLanguageStore((state) => state.language);
    const setLanguage = useLanguageStore((state) => state.setLanguage);
    const t = TRANSLATIONS[language] || TRANSLATIONS.ro;

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const bookAnims = useRef(
        ALL_STORIES.slice(0, 6).map(() => new Animated.Value(0))
    ).current;

    useEffect(() => {
        // Title animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();

        // Book covers animation (staggered)
        bookAnims.forEach((anim, index) => {
            Animated.timing(anim, {
                toValue: 1,
                duration: 600,
                delay: 300 + index * 100,
                useNativeDriver: true,
            }).start();
        });
    }, []);

    // Get first 6 stories for covers
    const featuredStories = ALL_STORIES.slice(0, 6);

    return (
        <View style={styles.container}>
            {/* Background gradient effect */}
            <View style={styles.gradientTop} />
            <View style={styles.gradientBottom} />

            {/* Language Selector */}
            <View style={styles.languageSelector}>
                <TouchableOpacity
                    style={[styles.langButton, language === "ro" && styles.langButtonActive]}
                    onPress={() => setLanguage("ro")}
                >
                    <Text style={styles.langText}>🇷🇴 RO</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.langButton, language === "en" && styles.langButtonActive]}
                    onPress={() => setLanguage("en")}
                >
                    <Text style={styles.langText}>🇬🇧 EN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.langButton, language === "it" && styles.langButtonActive]}
                    onPress={() => setLanguage("it")}
                >
                    <Text style={styles.langText}>🇮🇹 IT</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Logo & Title */}
                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <Image
                        source={require("../assets/logo.png")}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.tagline}>{t.tagline}</Text>
                </Animated.View>

                {/* Book Covers Grid */}
                <View style={styles.booksContainer}>
                    <View style={styles.booksRow}>
                        {featuredStories.slice(0, 3).map((story, index) => {
                            const cover = getCoverImage(story.id);
                            return (
                                <Animated.View
                                    key={story.id}
                                    style={[
                                        styles.bookWrapper,
                                        {
                                            opacity: bookAnims[index],
                                            transform: [
                                                {
                                                    scale: bookAnims[index].interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.8, 1],
                                                    }),
                                                },
                                                {
                                                    rotate: `${(index - 1) * 5}deg`,
                                                },
                                            ],
                                        },
                                    ]}
                                >
                                    {cover ? (
                                        <Image source={cover} style={styles.bookCover} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.bookCover, styles.bookPlaceholder]}>
                                            <Text style={styles.bookEmoji}>📚</Text>
                                        </View>
                                    )}
                                </Animated.View>
                            );
                        })}
                    </View>
                    <View style={[styles.booksRow, styles.booksRowSecond]}>
                        {featuredStories.slice(3, 6).map((story, index) => {
                            const cover = getCoverImage(story.id);
                            return (
                                <Animated.View
                                    key={story.id}
                                    style={[
                                        styles.bookWrapper,
                                        {
                                            opacity: bookAnims[index + 3],
                                            transform: [
                                                {
                                                    scale: bookAnims[index + 3].interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.8, 1],
                                                    }),
                                                },
                                                {
                                                    rotate: `${(index - 1) * -5}deg`,
                                                },
                                            ],
                                        },
                                    ]}
                                >
                                    {cover ? (
                                        <Image source={cover} style={styles.bookCover} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.bookCover, styles.bookPlaceholder]}>
                                            <Text style={styles.bookEmoji}>📖</Text>
                                        </View>
                                    )}
                                </Animated.View>
                            );
                        })}
                    </View>
                </View>

                {/* Features */}
                <View style={styles.features}>
                    {t.features.map((feature, index) => (
                        <Text key={index} style={styles.featureText}>
                            {feature}
                        </Text>
                    ))}
                </View>

                {/* CTA Buttons */}
                <View style={styles.buttons}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push("/sign-up")}
                    >
                        <Text style={styles.primaryButtonText}>{t.signUp}</Text>
                    </TouchableOpacity>

                    <Text style={styles.trialText}>{t.trial}</Text>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push("/sign-in")}
                    >
                        <Text style={styles.secondaryButtonText}>{t.signIn}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1a1a3e",
    },
    gradientTop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.4,
        backgroundColor: "#2a2a5e",
        opacity: 0.5,
    },
    gradientBottom: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.3,
        backgroundColor: "#0f0f2e",
        opacity: 0.5,
    },
    scrollContent: {
        flexGrow: 1,
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 24,
    },
    header: {
        alignItems: "center",
        marginBottom: 30,
    },
    welcomeText: {
        fontSize: 18,
        color: "rgba(255,255,255,0.7)",
        marginBottom: 8,
    },
    appName: {
        fontSize: 42,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 12,
    },
    logoImage: {
        width: 200,
        height: 80,
        marginBottom: 16,
    },
    tagline: {
        fontSize: 16,
        color: "rgba(255,255,255,0.8)",
        textAlign: "center",
    },
    booksContainer: {
        alignItems: "center",
        marginVertical: 30,
    },
    booksRow: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: -20,
    },
    booksRowSecond: {
        marginTop: 0,
    },
    bookWrapper: {
        marginHorizontal: -10,
    },
    bookCover: {
        width: 100,
        height: 140,
        borderRadius: 12,
        overflow: "hidden",
    },
    bookPlaceholder: {
        backgroundColor: "rgba(124, 77, 255, 0.3)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.2)",
    },
    bookEmoji: {
        fontSize: 40,
    },
    features: {
        alignItems: "center",
        marginVertical: 24,
        gap: 12,
    },
    featureText: {
        fontSize: 16,
        color: "rgba(255,255,255,0.9)",
    },
    buttons: {
        marginTop: 20,
        gap: 12,
    },
    primaryButton: {
        backgroundColor: "#7C4DFF",
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: "center",
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    trialText: {
        textAlign: "center",
        color: "rgba(255,255,255,0.6)",
        fontSize: 14,
        marginVertical: 8,
    },
    secondaryButton: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.3)",
    },
    secondaryButtonText: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 16,
    },
    languageSelector: {
        position: "absolute",
        top: 50,
        right: 20,
        flexDirection: "row",
        gap: 8,
        zIndex: 10,
    },
    langButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    langButtonActive: {
        backgroundColor: "#7C4DFF",
    },
    langText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
});
