// @ts-ignore
import { useState } from "react";
// @ts-ignore
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
// @ts-ignore
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../src/hooks/useAuth";
import { loginRevenueCatUser } from "../src/lib/revenuecat";
import { useLanguageStore } from "../src/store/languageStore";

// Translations
const TRANSLATIONS = {
    ro: {
        title: "Bine ai revenit!",
        subtitle: "Conectează-te pentru a continua",
        email: "Email",
        password: "Parolă",
        signIn: "Conectează-te",
        noAccount: "Nu ai cont? Creează unul",
        forgotPassword: "Ai uitat parola?",
        loading: "Se încarcă...",
        error: "Eroare",
        userNotFound: "Utilizatorul nu a fost găsit",
        invalidPassword: "Parolă incorectă",
        fillFields: "Completează email și parola",
        back: "← Înapoi",
    },
    en: {
        title: "Welcome back!",
        subtitle: "Sign in to continue",
        email: "Email",
        password: "Password",
        signIn: "Sign In",
        noAccount: "Don't have an account? Create one",
        forgotPassword: "Forgot password?",
        loading: "Loading...",
        error: "Error",
        userNotFound: "User not found",
        invalidPassword: "Invalid password",
        fillFields: "Please enter email and password",
        back: "← Back",
    },
    it: {
        title: "Bentornato!",
        subtitle: "Accedi per continuare",
        email: "Email",
        password: "Password",
        signIn: "Accedi",
        noAccount: "Non hai un account? Creane uno",
        forgotPassword: "Hai dimenticato la password?",
        loading: "Caricamento...",
        error: "Errore",
        userNotFound: "Utente non trovato",
        invalidPassword: "Password non valida",
        fillFields: "Inserisci email e password",
        back: "← Indietro",
    },
};

export default function SignInScreen() {
    const router = useRouter();
    const { setAuthUser } = useAuth();
    const language = useLanguageStore((state: any) => state.language);
    const t = (TRANSLATIONS as any)[language] || TRANSLATIONS.ro;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const signIn = useMutation(api.users.signIn);
    const ensureRevenueCatId = useMutation(api.subscriptions.ensureRevenueCatId);

    async function handleSignIn() {
        setError("");

        if (!email || !password) {
            setError(t.fillFields);
            return;
        }

        setLoading(true);
        try {
            const user = await signIn({ email, password });

            if (!user) {
                setError(t.invalidPassword); // Generic "Invalid credentials"
                return;
            }

            await setAuthUser({
                userId: user.userId,
                sessionToken: user.sessionToken,
                expiresAt: user.expiresAt,
            });

            if (Platform.OS !== "web") {
                await ensureRevenueCatId({ userId: user.userId });
                await loginRevenueCatUser(user.userId);
            }

            router.replace("/");
        } catch (err: any) {
            setError(err.message || t.error);
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
                    <Text style={styles.emoji}>👋</Text>
                    <Text style={styles.title}>{t.title}</Text>
                    <Text style={styles.subtitle}>{t.subtitle}</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
                        <TouchableOpacity
                            style={styles.forgotButton}
                            onPress={() => router.push("/forgot-password")}
                        >
                            <Text style={styles.forgotText}>{t.forgotPassword}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSignIn}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? t.loading : t.signIn}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => router.push("/sign-up")}
                    >
                        <Text style={styles.linkText}>{t.noAccount}</Text>
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
    forgotButton: {
        alignSelf: "flex-end",
        marginTop: 8,
    },
    forgotText: {
        color: "rgba(255,255,255,0.5)",
        fontSize: 13,
    },
    errorText: {
        color: "#ff4d4d",
        backgroundColor: "rgba(255, 77, 77, 0.1)",
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
        textAlign: "center",
        overflow: "hidden",
    },
});
