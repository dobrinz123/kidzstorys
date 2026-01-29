import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../src/hooks/useAuth";
import { loginRevenueCatUser } from "../src/lib/revenuecat";
import { useLanguageStore } from "../src/store/languageStore";

// Translations
const TRANSLATIONS = {
    ro: {
        title: "Creează cont",
        subtitle: "Alătură-te aventurii!",
        name: "Numele tău",
        email: "Email",
        password: "Parolă",
        signUp: "Creează cont",
        hasAccount: "Ai deja cont? Conectează-te",
        loading: "Se creează...",
        error: "Eroare",
        fillFields: "Completează toate câmpurile",
        back: "← Înapoi",
        success: "Succes",
        accountCreated: "Contul a fost creat cu succes!",
    },
    en: {
        title: "Create account",
        subtitle: "Join the adventure!",
        name: "Your name",
        email: "Email",
        password: "Password",
        signUp: "Create account",
        hasAccount: "Already have an account? Sign in",
        loading: "Creating...",
        error: "Error",
        fillFields: "Please fill in all fields",
        back: "← Back",
        success: "Success",
        accountCreated: "Account created successfully!",
    },
    it: {
        title: "Crea account",
        subtitle: "Unisciti all'avventura!",
        name: "Il tuo nome",
        email: "Email",
        password: "Password",
        signUp: "Crea account",
        hasAccount: "Hai già un account? Accedi",
        loading: "Creazione...",
        error: "Errore",
        fillFields: "Compila tutti i campi",
        back: "← Indietro",
        success: "Successo",
        accountCreated: "Account creato con successo!",
    },
};

export default function SignUpScreen() {
    const router = useRouter();
    const { setAuthUser } = useAuth();
    const language = useLanguageStore((state) => state.language);
    const t = TRANSLATIONS[language] || TRANSLATIONS.ro;

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const signUp = useMutation(api.users.signUp);
    const ensureRevenueCatId = useMutation(api.subscriptions.ensureRevenueCatId);

    async function handleSignUp() {
        if (!email || !password) {
            Alert.alert(t.error, t.fillFields);
            return;
        }

        setLoading(true);
        try {
            const { userId } = await signUp({
                email,
                passwordHash: password, // In production, hash this!
                name,
                preferredLanguage: language,
            });

            await setAuthUser(userId);

            if (Platform.OS !== "web") {
                await ensureRevenueCatId({ userId });
                await loginRevenueCatUser(userId);
            }

            Alert.alert(t.success, t.accountCreated);
            setTimeout(() => {
                router.replace("/");
            }, 1000);
        } catch (error: any) {
            if (error.message.includes("User already exists")) {
                Alert.alert(t.error, t.hasAccount); // "Ai deja cont?" suggestion
            } else {
                Alert.alert(t.error, error.message);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Back Button */}
                <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/welcome")}>
                    <Text style={styles.backText}>{t.back}</Text>
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.emoji}>🚀</Text>
                    <Text style={styles.title}>{t.title}</Text>
                    <Text style={styles.subtitle}>{t.subtitle}</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t.name}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Maria"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t.email}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="email@example.com"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t.password}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSignUp}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? t.loading : t.signUp}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => router.push("/sign-in")}
                    >
                        <Text style={styles.linkText}>{t.hasAccount}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#1a1a3e",
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 60,
    },
    backButton: {
        alignSelf: "flex-start",
        marginBottom: 20,
    },
    backText: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 16,
    },
    header: {
        alignItems: "center",
        marginBottom: 40,
    },
    emoji: {
        fontSize: 60,
        marginBottom: 16,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "rgba(255,255,255,0.7)",
    },
    form: {
        flex: 1,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 14,
        marginBottom: 8,
        fontWeight: "500",
    },
    input: {
        backgroundColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.2)",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: "#fff",
    },
    button: {
        backgroundColor: "#7C4DFF",
        padding: 18,
        borderRadius: 30,
        marginTop: 20,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
        textAlign: "center",
    },
    linkButton: {
        padding: 16,
        alignItems: "center",
        marginTop: 16,
    },
    linkText: {
        color: "#7C4DFF",
        fontSize: 15,
    },
});
