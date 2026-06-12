import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import axios from 'axios'
import en from './locales/en.json'
import fr from './locales/fr.json'
import hi from './locales/hi.json'
import mr from './locales/mr.json'
import kn from './locales/kn.json'

const SUPPORTED_LOCALES = ['en', 'fr', 'hi', 'mr', 'kn']
const DEFAULT_LOCALE = 'en'

function resolveInitialLocale() {
  const saved = localStorage.getItem('tp_locale')
  if (saved && SUPPORTED_LOCALES.includes(saved)) return saved
  return DEFAULT_LOCALE
}

function normalizeLocale(locale) {
  if (SUPPORTED_LOCALES.includes(locale)) return locale
  return DEFAULT_LOCALE
}

const initialLocale = resolveInitialLocale()
axios.defaults.headers.common['X-Locale'] = initialLocale

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      hi: { translation: hi },
      mr: { translation: mr },
      kn: { translation: kn },
    },
    lng: initialLocale,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (lng) => {
  const locale = normalizeLocale(lng)
  localStorage.setItem('tp_locale', locale)
  axios.defaults.headers.common['X-Locale'] = locale
})

export { SUPPORTED_LOCALES, DEFAULT_LOCALE }
export default i18n
