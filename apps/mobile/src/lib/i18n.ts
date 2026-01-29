import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

import en from "../../locales/en/translation.json";
import ro from "../../locales/ro/translation.json";
import it from "../../locales/it/translation.json";

const LANGUAGE_KEY = "@app:language";

async function getStoredLanguage() {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

export async function initI18n() {
  const storedLanguage = await getStoredLanguage();
  const deviceLanguage = Localization.locale.split("-")[0];

  const supportedLanguages = ["en", "ro", "it"];
  const fallbackLanguage = supportedLanguages.includes(deviceLanguage)
    ? deviceLanguage
    : "en";

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ro: { translation: ro },
      it: { translation: it },
    },
    lng: storedLanguage || fallbackLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

  // Persist language changes
  i18n.on("languageChanged", async (lng) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  });
}

export default i18n;
