import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { useRouter, useSegments, SplashScreen } from "expo-router";
import { useAuth } from "./useAuth";
import { initializeRevenueCat } from "../lib/revenuecat";

export function AuthGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const segments = useSegments();
    const { isAuthenticated, isLoading } = useAuth();

    // Initialize RevenueCat (only on native platforms)
    useEffect(() => {
        if (Platform.OS !== "web") {
            initializeRevenueCat().catch(console.error);
        }
    }, []);

    // Hide splash screen when loading is complete
    useEffect(() => {
        if (!isLoading) {
            SplashScreen.hideAsync();
        }
    }, [isLoading]);

    // Handle routing based on auth status ONLY
    // Subscription checks are handled at the page level (story/[id].tsx)
    useEffect(() => {
        if (isLoading) return;

        const currentSegment = segments[0];

        // Route detection
        const inAuthGroup = currentSegment === "(auth)";
        const inWelcome = currentSegment === "welcome";
        const inSignIn = currentSegment === "sign-in";
        const inSignUp = currentSegment === "sign-up";

        // Public routes that don't require authentication
        const isPublicRoute = inWelcome || inAuthGroup || inSignIn || inSignUp;

        console.log("[AuthGate] Auth check:", {
            currentSegment,
            isAuthenticated,
            isPublicRoute
        });

        if (!isAuthenticated) {
            // Not logged in - redirect to welcome if not on a public route
            if (!isPublicRoute) {
                console.log("[AuthGate] Not authenticated, redirecting to /welcome");
                router.replace("/welcome");
            }
        } else {
            // Logged in - redirect away from auth pages
            if (isPublicRoute) {
                console.log("[AuthGate] Authenticated, on public route, redirecting to /");
                router.replace("/");
            }
        }
    }, [isLoading, isAuthenticated, segments]);

    // Show loading screen while checking auth
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C4DFF" />
            </View>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a3e",
    },
});
