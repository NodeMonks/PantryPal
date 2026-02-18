import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en";
import hi from "./locales/hi";
import ta from "./locales/ta";
import te from "./locales/te";
import kn from "./locales/kn";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", nativeLabel: "हिंदी", flag: "🇮🇳" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", flag: "🇮🇳" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు", flag: "🇮🇳" },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", flag: "🇮🇳" },
] as const;

export type SupportedLangCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      te: { translation: te },
      kn: { translation: kn },
    },
    fallbackLng: "en",
    // Only detect from localStorage + navigator; skip URL to avoid breaking React Router
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "pantrypal_lang",
    },
    interpolation: {
      // React already handles XSS
      escapeValue: false,
    },
  });

export default i18n;
