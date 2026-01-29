import { useState } from "react";
// @ts-ignore
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
// @ts-ignore
import { useRouter, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useLanguageStore } from "../src/store/languageStore";

const TRANSLATIONS = {
    ro: {
        title: "Parolă Nouă",
        subtitle: "Introdu codul primit și noua parolă",
        code: "Cod Resetare",
        newPassword: "Parolă Nouă",
        confirmPassword: "Confirmă Parola",
        resetBtn: "Schimbă Parola",
        success: "Succes!",
        successDesc: "Parola a fost schimbată cu succes. Te poți autentifica.",
        error: "Eroare",
        passwordsMismatch: "Parolele nu coincid",
        invalidCode: "Cod invalid sau expirat",
        fillAll: "Completează toate câmpurile",
    },
    en: {
        title: "New Password",
        subtitle: "Enter the code and your new password",
        code: "Reset Code",
        newPassword: "New Password",
        confirmPassword: "Confirm Password",
        resetBtn: "Reset Password",
        success: "Success!",
        successDesc: "Password changed successfully. You can now sign in.",
        error: "Error",
        passwordsMismatch: "Passwords do not match",
        invalidCode: "Invalid or expired code",
        fillAll: "Fill all fields",
    },
    it: {
        title: "Nuova Password",
        subtitle: "Inserisci il codice e la nuova password",
        code: "Codice Reset",
        newPassword: "Nuova Password",
        confirmPassword: "Conferma Password",
        resetBtn: "Reimposta Password",
        success: "Successo!",
        successDesc: "Password cambiata con successo. Ora puoi accedere.",
        error: "Errore",
        passwordsMismatch: "Le password non coincidono",
        invalidCode: "Codice non valido o scaduto",
        fillAll: "Compila tutti i campi",
    },
};

export default function ResetPasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email: string }>();
    const email = params.email || "";

    const language = useLanguageStore((state: any) => state.language);
    const t = (TRANSLATIONS as any)[language] || TRANSLATIONS.ro;

    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const resetPassword = useMutation(api.users.resetPassword);

    // Ensure we have an email
    if (!email) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff', marginBottom: 20 }}>Eroare: Email lipsă.</Text>
                <TouchableOpacity onPress={() => router.replace("/sign-in")} style={styles.button}>
                    <Text style={styles.buttonText}>Înapoi la Login</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (success) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Text style={{ fontSize: 60, marginBottom: 20 }}>✅</Text>
                <Text style={{ color: '#4ADE80', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>{t.success}</Text>
                <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 30 }}>{t.successDesc}</Text>

                <TouchableOpacity onPress={() => router.replace("/sign-in")} style={styles.button}>
                    <Text style={styles.buttonText}>Mergi la Autentificare</Text>
                </TouchableOpacity>
            </View>
        );
    }

    async function handleReset() {
        setError("");

        if (!code || !password || !confirm) {
            setError(t.fillAll);
            return;
        }

        if (password !== confirm) {
            setError(t.passwordsMismatch);
            return;
        }

        if (password.length < 6) {
            setError("Parola trebuie să aibă minim 6 caractere");
            return;
        }

        setLoading(true);
        try {
            await resetPassword({
                email,
                token: code,
                newPassword: password,
            });

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Eroare la resetare.");
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
                <View style={styles.header}>
                    <Text style={styles.emoji}>🔑</Text>
                    <Text style={styles.title}>{t.title}</Text>
                    <Text style={styles.subtitle}>{t.subtitle}</Text>
                    <View style={styles.emailBadge}>
                        <Text style={styles.emailText}>{email}</Text>
                    </View>
                </View>

                <View style={styles.form}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t.code}</Text>
                        <TextInput
                            style={[styles.input, styles.codeInput]}
                            placeholder="XXXXXX"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={code}
                            onChangeText={(text: string) => setCode(text.toUpperCase())}
                            autoCapitalize="characters"
                            maxLength={6}
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t.newPassword}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t.confirmPassword}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={confirm}
                            onChangeText={setConfirm}
                            secureTextEntry
                            returnKeyType="done"
                            onSubmitEditing={handleReset}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleReset}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>{t.resetBtn}</Text>
                        )}
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
        textAlign: "center",
        marginBottom: 16,
    },
    emailBadge: {
        backgroundColor: "rgba(255,255,255,0.1)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    emailText: {
        color: "#fff",
        fontWeight: "600",
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
    codeInput: {
        textAlign: "center",
        fontSize: 24,
        letterSpacing: 4,
        fontWeight: "bold",
    },
    button: {
        backgroundColor: "#7C4DFF",
        padding: 18,
        borderRadius: 30,
        marginTop: 20,
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
    errorText: {
        color: "#ff4d4d",
        backgroundColor: "rgba(255, 77, 77, 0.1)",
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
        textAlign: "center",
        overflow: "hidden", // Fixes borderRadius on some platforms
    },
});
