const { normalizeLocale } = require('../i18n')

function parseAcceptLanguage(header) {
  const value = String(header || '').trim()
  if (!value) return ''
  const first = value.split(',')[0] || ''
  return first.split(';')[0].trim()
}

function guessLocale(raw) {
  const lang = String(raw || '').toLowerCase()
  if (lang.startsWith('fr')) return 'fr'
  if (lang.startsWith('en')) return 'en'
  if (lang.startsWith('hi')) return 'hi'
  if (lang.startsWith('mr')) return 'mr'
  if (lang.startsWith('kn')) return 'kn'
  return ''
}

function localeMiddleware(req, _res, next) {
  const explicit = req.get('x-locale') || req.get('X-Locale') || ''
  const headerLocale = explicit ? String(explicit).trim() : ''
  const accept = parseAcceptLanguage(req.get('accept-language'))
  const guessed = headerLocale ? headerLocale : guessLocale(accept)
  req.locale = normalizeLocale(guessed || 'en')
  next()
}

module.exports = { localeMiddleware }
