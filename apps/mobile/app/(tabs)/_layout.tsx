import { Tabs } from "expo-router";
import { View, Text } from "react-native";
import { useLanguageStore } from "../../src/store/languageStore";

const TRANSLATIONS = {
  ro: {
    home: "Acasă",
    favorites: "Favorite",
    routines: "Rutine",
    settings: "Profil",
  },
  en: {
    home: "Home",
    favorites: "Favorites",
    routines: "Routines",
    settings: "Profile",
  },
  it: {
    home: "Home",
    favorites: "Preferiti",
    routines: "Routine",
    settings: "Profilo",
  },
};

export default function TabsLayout() {
  const language = useLanguageStore((state) => state.language);
  const t = TRANSLATIONS[language] || TRANSLATIONS.ro;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#7C4DFF",
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
        headerShown: false, // Hide default header to let screens handle their own
        tabBarStyle: {
          backgroundColor: "#12122a", // Dark nav bar
          borderTopColor: "rgba(255,255,255,0.1)",
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        }
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.home,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t.favorites,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>❤️</Text>,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: t.routines,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📅</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.settings,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
