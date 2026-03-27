import React, { useEffect } from "react";
import { Stack, SplashScreen } from "expo-router";
import { ConvexProvider } from "convex/react";
import { Audio } from "expo-av";
import { convex } from "../src/lib/convex";
import { AuthGate } from "../src/hooks/AuthGate";
import { useFonts, PatrickHand_400Regular } from "@expo-google-fonts/patrick-hand";
import {
  ComicNeue_400Regular,
  ComicNeue_700Bold,
} from "@expo-google-fonts/comic-neue";

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PatrickHand_400Regular,
    ComicNeue_400Regular,
    ComicNeue_700Bold,
  });

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // if (!fontsLoaded) return null; // Don't block UI on fonts to allow web to render even if fonts fail

  return (
    <ConvexProvider client={convex}>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGate>
    </ConvexProvider>
  );
}
