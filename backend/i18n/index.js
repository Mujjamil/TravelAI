const DEFAULT_LOCALE = 'en'
const SUPPORTED_LOCALES = new Set(['en', 'fr', 'hi', 'mr', 'kn'])

const MESSAGES = {
  en: {
    errors: {
      authRequired: 'Authentication required.',
      internalServer: 'Internal server error'
    },
    auth: {
      loggedOut: 'Logged out.',
      loggedOutAll: 'Logged out from all sessions.',
      resetLinkSent: 'If that email exists, a reset link has been sent.',
      passwordResetSuccess: 'Password has been reset.'
    },
    authErrors: {
      nameLength: 'Name must be between 2 and 80 characters.',
      nameChars: 'Name contains invalid characters.',
      emailRequired: 'Email is required.',
      emailInvalid: 'Invalid email format.',
      passwordLength: 'Password must be between 8 and 128 characters.',
      passwordRules: 'Password must include uppercase, lowercase, and a number.',
      emailExists: 'Email already registered.',
      invalidCredentials: 'Invalid credentials.',
      passwordRequired: 'Password is required.',
      resetTokenInvalid: 'Invalid reset token.',
      resetTokenUsed: 'Reset token is invalid or already used.',
      resetTokenExpired: 'Reset token has expired.'
    },
    chat: {
      slotPrompts: {
        destination: 'Where would you like to go?',
        'trip-duration': 'How many days is your trip? (e.g., 5 days / 1 week)',
        'budget-range': "What's your budget? (Budget / Mid-range / Luxury)",
        'travel-month': 'Which month are you planning to travel?',
        'trip-type': 'What type of trip is this? (Adventure / Beach / Cultural / Honeymoon / Business)',
        'place-type': 'Which type of places do you prefer? (Hill station / Beach / Adventure / Historical)',
        'companion': 'With whom are you going? (Solo / Friends / Family / Partner)'
      }
    }
  },
  fr: {
    errors: {
      authRequired: 'Authentification requise.',
      internalServer: 'Erreur interne du serveur'
    },
    auth: {
      loggedOut: 'Déconnecté.',
      loggedOutAll: 'Déconnecté de toutes les sessions.',
      resetLinkSent: 'Si cet e-mail existe, un lien de réinitialisation a été envoyé.',
      passwordResetSuccess: 'Le mot de passe a été réinitialisé.'
    },
    authErrors: {
      nameLength: 'Le nom doit contenir entre 2 et 80 caractères.',
      nameChars: 'Le nom contient des caractères invalides.',
      emailRequired: 'L’e-mail est requis.',
      emailInvalid: 'Format d’e-mail invalide.',
      passwordLength: 'Le mot de passe doit contenir entre 8 et 128 caractères.',
      passwordRules: 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre.',
      emailExists: 'Cet e-mail est déjà enregistré.',
      invalidCredentials: 'Identifiants invalides.',
      passwordRequired: 'Le mot de passe est requis.',
      resetTokenInvalid: 'Jeton de réinitialisation invalide.',
      resetTokenUsed: 'Le jeton est invalide ou a déjà été utilisé.',
      resetTokenExpired: 'Le jeton de réinitialisation a expiré.'
    },
    chat: {
      slotPrompts: {
        destination: 'Où souhaitez-vous aller ?',
        'trip-duration': 'Combien de jours dure votre voyage ? (ex : 5 jours / 1 semaine)',
        'budget-range': 'Quel est votre budget ? (Budget / Intermédiaire / Luxe)',
        'travel-month': 'Quel mois prévoyez-vous de voyager ?',
        'trip-type': 'Quel type de voyage ? (Aventure / Plage / Culturel / Lune de miel / Affaires)',
        'place-type': 'Quel type de lieux préférez-vous ? (Station de montagne / Plage / Aventure / Historique)',
        'companion': 'Avec qui voyagez-vous ? (Solo / Amis / Famille / Partenaire)'
      }
    }
  },
  hi: {
    errors: {
      authRequired: 'प्रमाणीकरण आवश्यक है।',
      internalServer: 'सर्वर में आंतरिक त्रुटि'
    },
    auth: {
      loggedOut: 'लॉगआउट हो गया।',
      loggedOutAll: 'सभी सेशन्स से लॉगआउट हो गया।',
      resetLinkSent: 'यदि यह ईमेल मौजूद है, तो रीसेट लिंक भेज दिया गया है।',
      passwordResetSuccess: 'पासवर्ड रीसेट हो गया है।'
    },
    authErrors: {
      nameLength: 'नाम 2 से 80 अक्षरों के बीच होना चाहिए।',
      nameChars: 'नाम में अमान्य अक्षर हैं।',
      emailRequired: 'ईमेल आवश्यक है।',
      emailInvalid: 'ईमेल फ़ॉर्मेट अमान्य है।',
      passwordLength: 'पासवर्ड 8 से 128 अक्षरों के बीच होना चाहिए।',
      passwordRules: 'पासवर्ड में uppercase, lowercase और एक नंबर होना चाहिए।',
      emailExists: 'यह ईमेल पहले से रजिस्टर्ड है।',
      invalidCredentials: 'क्रेडेंशियल्स अमान्य हैं।',
      passwordRequired: 'पासवर्ड आवश्यक है।',
      resetTokenInvalid: 'रीसेट टोकन अमान्य है।',
      resetTokenUsed: 'रीसेट टोकन अमान्य है या पहले से उपयोग हो चुका है।',
      resetTokenExpired: 'रीसेट टोकन की समय-सीमा समाप्त हो गई है।'
    },
    chat: {
      slotPrompts: {
        destination: 'आप कहाँ जाना चाहते हैं?',
        'trip-duration': 'आपकी ट्रिप कितने दिनों की है? (जैसे: 5 दिन / 1 हफ्ता)',
        'budget-range': 'आपका बजट क्या है? (Budget / Mid-range / Luxury)',
        'travel-month': 'आप किस महीने में यात्रा करने की योजना बना रहे हैं?',
        'trip-type': 'यह कैसी ट्रिप है? (Adventure / Beach / Cultural / Honeymoon / Business)',
        'place-type': 'आप किस प्रकार के स्थानों को पसंद करते हैं? (Hill station / Beach / Adventure / Historical)',
        'companion': 'आप किसके साथ जा रहे हैं? (Solo / Friends / Family / Partner)'
      }
    }
  },
  mr: {
    errors: {
      authRequired: 'प्रमाणीकरण आवश्यक आहे.',
      internalServer: 'सर्व्हरमध्ये अंतर्गत त्रुटी'
    },
    auth: {
      loggedOut: 'लॉगआउट झाले.',
      loggedOutAll: 'सर्व सेशन्समधून लॉगआउट झाले.',
      resetLinkSent: 'तो ईमेल अस्तित्वात असल्यास, रीसेट लिंक पाठवली आहे.',
      passwordResetSuccess: 'पासवर्ड रीसेट झाला आहे.'
    },
    authErrors: {
      nameLength: 'नाव 2 ते 80 अक्षरांदरम्यान असावे.',
      nameChars: 'नावात अवैध अक्षरे आहेत.',
      emailRequired: 'ईमेल आवश्यक आहे.',
      emailInvalid: 'ईमेल फॉरमॅट अवैध आहे.',
      passwordLength: 'पासवर्ड 8 ते 128 अक्षरांदरम्यान असावा.',
      passwordRules: 'पासवर्डमध्ये uppercase, lowercase आणि एक नंबर असावा.',
      emailExists: 'हा ईमेल आधीच नोंदणीकृत आहे.',
      invalidCredentials: 'क्रेडेन्शियल्स अवैध आहेत.',
      passwordRequired: 'पासवर्ड आवश्यक आहे.',
      resetTokenInvalid: 'रीसेट टोकन अवैध आहे.',
      resetTokenUsed: 'रीसेट टोकन अवैध आहे किंवा आधीच वापरलेले आहे.',
      resetTokenExpired: 'रीसेट टोकनची मुदत संपली आहे.'
    },
    chat: {
      slotPrompts: {
        destination: 'तुम्हाला कुठे जायचं आहे?',
        'trip-duration': 'तुमची ट्रिप किती दिवसांची आहे? (उदा.: 5 दिवस / 1 आठवडा)',
        'budget-range': 'तुमचा बजेट काय आहे? (Budget / Mid-range / Luxury)',
        'travel-month': 'तुम्ही कोणत्या महिन्यात प्रवास करणार आहात?',
        'trip-type': 'हा कोणता प्रकारचा ट्रिप आहे? (Adventure / Beach / Cultural / Honeymoon / Business)',
        'place-type': 'तुम्हाला कोणत्या प्रकारचे ठिकाण आवडतात? (Hill station / Beach / Adventure / Historical)',
        'companion': 'तुम्ही कोणासोबत जात आहात? (Solo / Friends / Family / Partner)'
      }
    }
  },
  kn: {
    errors: {
      authRequired: 'ದೃಢೀಕರಣ ಅಗತ್ಯವಿದೆ.',
      internalServer: 'ಸರ್ವರ್ ಒಳಗಿನ ದೋಷ'
    },
    auth: {
      loggedOut: 'ಲಾಗ್‌ಔಟ್ ಆಯಿತು.',
      loggedOutAll: 'ಎಲ್ಲಾ ಸೆಷನ್‌ಗಳಿಂದ ಲಾಗ್‌ಔಟ್ ಆಯಿತು.',
      resetLinkSent: 'ಆ ಇಮೇಲ್ ಇದ್ದರೆ, ರೀಸೆಟ್ ಲಿಂಕ್ ಕಳುಹಿಸಲಾಗಿದೆ.',
      passwordResetSuccess: 'ಪಾಸ್ವರ್ಡ್ ರೀಸೆಟ್ ಆಯಿತು.'
    },
    authErrors: {
      nameLength: 'ಹೆಸರು 2 ರಿಂದ 80 ಅಕ್ಷರಗಳ ನಡುವೆ ಇರಬೇಕು.',
      nameChars: 'ಹೆಸರಿನಲ್ಲಿ ಅಮಾನ್ಯ ಅಕ್ಷರಗಳಿವೆ.',
      emailRequired: 'ಇಮೇಲ್ ಅಗತ್ಯವಿದೆ.',
      emailInvalid: 'ಇಮೇಲ್ ಫಾರ್ಮಾಟ್ ಅಮಾನ್ಯವಾಗಿದೆ.',
      passwordLength: 'ಪಾಸ್ವರ್ಡ್ 8 ರಿಂದ 128 ಅಕ್ಷರಗಳ ನಡುವೆ ಇರಬೇಕು.',
      passwordRules: 'ಪಾಸ್ವರ್ಡ್‌ನಲ್ಲಿ uppercase, lowercase ಮತ್ತು ಒಂದು ಸಂಖ್ಯೆ ಇರಬೇಕು.',
      emailExists: 'ಈ ಇಮೇಲ್ ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಲಾಗಿದೆ.',
      invalidCredentials: 'ಕ್ರೆಡೆನ್ಶಿಯಲ್ಸ್ ಅಮಾನ್ಯವಾಗಿದೆ.',
      passwordRequired: 'ಪಾಸ್ವರ್ಡ್ ಅಗತ್ಯವಿದೆ.',
      resetTokenInvalid: 'ರೀಸೆಟ್ ಟೋಕನ್ ಅಮಾನ್ಯವಾಗಿದೆ.',
      resetTokenUsed: 'ರೀಸೆಟ್ ಟೋಕನ್ ಅಮಾನ್ಯವಾಗಿದೆ ಅಥವಾ ಈಗಾಗಲೇ ಬಳಸಲಾಗಿದೆ.',
      resetTokenExpired: 'ರೀಸೆಟ್ ಟೋಕನ್ ಅವಧಿ ಮುಗಿದಿದೆ.'
    },
    chat: {
      slotPrompts: {
        destination: 'ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗಲು ಬಯಸುತ್ತೀರಿ?',
        'trip-duration': 'ನಿಮ್ಮ ಟ್ರಿಪ್ ಎಷ್ಟು ದಿನಗಳದು? (ಉದಾ: 5 ದಿನ / 1 ವಾರ)',
        'budget-range': 'ನಿಮ್ಮ ಬಜೆಟ್ ಏನು? (Budget / Mid-range / Luxury)',
        'travel-month': 'ಯಾವ ತಿಂಗಳಲ್ಲಿ ನೀವು ಪ್ರಯಾಣ ಮಾಡಲು ಯೋಜಿಸುತ್ತಿದ್ದೀರಿ?',
        'trip-type': 'ಇದು ಯಾವ ರೀತಿಯ ಟ್ರಿಪ್? (Adventure / Beach / Cultural / Honeymoon / Business)',
        'place-type': 'ನೀವು ಯಾವ ರೀತಿಯ ಸ್ಥಳಗಳನ್ನು ಇಷ್ಟಪಡುತ್ತೀರಿ? (Hill station / Beach / Adventure / Historical)',
        'companion': 'ನೀವು ಯಾರೊಂದಿಗೆ ಹೋಗುತ್ತಿದ್ದೀರಿ? (Solo / Friends / Family / Partner)'
      }
    }
  }
}

function normalizeLocale(locale) {
  const value = String(locale || '').toLowerCase().trim()
  if (SUPPORTED_LOCALES.has(value)) return value
  return DEFAULT_LOCALE
}

function getValue(obj, keyPath) {
  const parts = String(keyPath || '').split('.').filter(Boolean)
  let cur = obj
  for (const p of parts) {
    if (!cur || typeof cur !== 'object' || !(p in cur)) return undefined
    cur = cur[p]
  }
  return cur
}

function interpolate(template, params) {
  const map = params && typeof params === 'object' ? params : {}
  return String(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => (map[k] ?? ''))
}

function t(locale, key, params) {
  const lang = normalizeLocale(locale)
  const value = getValue(MESSAGES[lang], key) ?? getValue(MESSAGES[DEFAULT_LOCALE], key)
  if (value === undefined) return String(key)
  if (typeof value !== 'string') return value
  return interpolate(value, params)
}

module.exports = { t, normalizeLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES }
