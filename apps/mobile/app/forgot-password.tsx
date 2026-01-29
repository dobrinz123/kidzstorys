import { useState } from "react";
// @ts-ignore
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
// @ts-ignore
import { useRouter } from "expo-router";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguageStore } from "../src/store/languageStore";

// Translations
const TRANSLATIONS = {
    ro: {
        title: "Resetare Parolă",
        subtitle: "Introdu email-ul pentru a primi codul de resetare",
        email: "Email",
        sendLink: "Trimite codul",
        back: "← Înapoi la autentificare",
        emailPlaceholder: "email@exemplu.com",
        success: "Cod trimis!",
        successDesc: "Verifică inbox-ul (și spam) pentru codul de resetare.",
        error: "Eroare",
        invalidEmail: "Email invalid",
        fillAll: "Completează câmpul",
    },
    en: {
        title: "Reset Password",
        subtitle: "Enter your email to receive the reset code",
        email: "Email",
        sendLink: "Send Code",
        back: "← Back to Sign In",
        emailPlaceholder: "email@example.com",
        success: "Code Sent!",
        successDesc: "Check your inbox (and spam) for the reset code.",
        error: "Error",
        invalidEmail: "Invalid email",
        fillAll: "Please fill the field",
    },
    it: {
        title: "Reimposta Password",
        subtitle: "Inserisci la tua email per ricevere il codice",
        email: "Email",
        sendLink: "Invia Codice",
        back: "← Torna all'accesso",
        emailPlaceholder: "email@esempio.com",
        success: "Codice Inviato!",
        successDesc: "Controlla la tua casella di posta (e spam) per il codice.",
        error: "Errore",
        invalidEmail: "Email non valida",
        fillAll: "Compila il campo",
    },
};

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const language = useLanguageStore((state: any) => state.language);
    const t = (TRANSLATIONS as any)[language] || TRANSLATIONS.ro;

    const [method] = useState<'email'>('email');
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Convex actions
    const requestReset = useAction(api.users.requestPasswordReset);

    async function handleSend() {
        if (!email) {
            Alert.alert(t.error, t.fillAll);
            return;
        }

        // Basic email validation
        if (!email.includes("@")) {
            Alert.alert(t.error, t.invalidEmail);
            return;
        }

        setLoading(true);
        setSuccess(false);

        try {
            const result = await requestReset({
                email,
                sendVia: method
            });

            if (result.success) {
                setSuccess(true);
            }
        } catch (error: any) {
            Alert.alert(t.error, error.message || "A apărut o eroare.");
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
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backText}>{t.back}</Text>
                </TouchableOpacity>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.lockIconContainer}>
                        <View style={styles.lockIcon}>
                            <View style={styles.lockTop} />
                            <View style={styles.lockBody}>
                                <View style={styles.lockKeyhole} />
                            </View>
                        </View>
                    </View>
                    <Text style={styles.title}>{t.title}</Text>
                    <Text style={styles.subtitle}>{t.subtitle}</Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t.email}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={t.emailPlaceholder}
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSend}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>{t.sendLink}</Text>
                        )}
                    </TouchableOpacity>

                    {/* Success Message UI */}
                    {success && (
                        <View style={styles.successContainer}>
                            <View style={styles.successIcon}>
                                <Text style={styles.successCheckmark}>✓</Text>
                            </View>
                            <Text style={styles.successTitle}>{t.success}</Text>

                            <Text style={styles.successDesc}>{t.successDesc}</Text>

                            <TouchableOpacity
                                style={styles.continueButton}
                                onPress={() => router.push({
                                    pathname: "/reset-password",
                                    params: { email }
                                })}
                            >
                                <Text style={styles.continueButtonText}>Introdu Codul →</Text>
                            </TouchableOpacity>
                        </View>
                    )}
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
    lockIconContainer: {
        marginBottom: 20,
    },
    lockIcon: {
        alignItems: "center",
    },
    lockTop: {
        width: 28,
        height: 20,
        borderWidth: 4,
        borderColor: "#FFA500",
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        borderBottomWidth: 0,
        marginBottom: -2,
    },
    lockBody: {
        width: 44,
        height: 32,
        backgroundColor: "#FFA500",
        borderRadius: 6,
        justifyContent: "center",
        alignItems: "center",
    },
    lockKeyhole: {
        width: 8,
        height: 12,
        backgroundColor: "#1a1a3e",
        borderRadius: 4,
    },
    title: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 16,
        color: "rgba(255,255,255,0.7)",
        textAlign: "center",
        paddingHorizontal: 20,
    },
    form: {
        flex: 1,
    },
    inputContainer: {
        marginBottom: 24,
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
        marginTop: 8,
        alignItems: "center",
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    successContainer: {
        marginTop: 30,
        padding: 24,
        backgroundColor: "rgba(0, 200, 100, 0.1)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(0, 200, 100, 0.3)",
        alignItems: "center",
    },
    successIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#4ADE80",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    successCheckmark: {
        color: "#fff",
        fontSize: 28,
        fontWeight: "bold",
    },
    successTitle: {
        color: "#4ADE80",
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 12,
    },
    successDesc: {
        color: "rgba(255,255,255,0.8)",
        textAlign: "center",
        marginBottom: 20,
        fontSize: 14,
        lineHeight: 20,
    },
    continueButton: {
        backgroundColor: "#fff",
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 24,
    },
    continueButtonText: {
        color: "#000",
        fontWeight: "bold",
        fontSize: 16,
    },
});
