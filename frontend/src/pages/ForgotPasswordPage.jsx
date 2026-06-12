import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useTranslation } from 'react-i18next'

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const data = await forgotPassword(email)
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.error || t('auth.forgot.errorFallback'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div className="hidden md:flex md:w-[45%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg viewBox="0 0 800 600" className="w-full h-full" fill="none">
            <circle cx="400" cy="300" r="280" stroke="white" strokeWidth="1"/>
            <circle cx="400" cy="300" r="200" stroke="white" strokeWidth="0.5"/>
            <circle cx="400" cy="300" r="120" stroke="white" strokeWidth="0.5"/>
            <line x1="120" y1="300" x2="680" y2="300" stroke="white" strokeWidth="0.5"/>
            <line x1="400" y1="20" x2="400" y2="580" stroke="white" strokeWidth="0.5"/>
            <ellipse cx="400" cy="300" rx="280" ry="140" stroke="white" strokeWidth="0.5"/>
          </svg>
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">✈</div>
            <span className="text-white text-xl font-bold">TravelAI</span>
          </div>
          <p className="text-blue-200 text-sm">Your AI-powered travel companion</p>
        </div>
        <div className="relative space-y-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl">🔑</div>
          <h2 className="text-white text-3xl font-bold leading-snug">Forgot your<br/>password?</h2>
          <p className="text-blue-200 text-sm leading-relaxed">
            No worries — it happens! Enter your email and we&apos;ll send you a reset link within seconds.
          </p>
        </div>
        <p className="relative text-blue-300 text-xs">Travel Planner AI v2</p>
      </div>

      {/* Right — form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 md:hidden">
              <span className="text-blue-600 text-2xl">✈</span>
              <span className="font-bold text-gray-900 text-lg">TravelAI</span>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-4">🔑</div>
            <h1 className="text-2xl font-bold text-gray-900">{t('auth.forgot.title')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('auth.forgot.subtitle')}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {result ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto">✉️</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Check your inbox</h3>
                  <p className="text-gray-500 text-sm mt-1">{result.message}</p>
                </div>

                {result.devResetToken && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left">
                    <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                      Dev mode — reset link ready
                    </p>
                    <Link
                      to={`/reset-password?token=${result.devResetToken}`}
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2"
                    >
                      Click here to reset your password →
                    </Link>
                    {result.devResetExpiresAt && (
                      <p className="text-xs text-amber-600 mt-2">
                        Expires: {new Date(result.devResetExpiresAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={() => { setResult(null); setEmail('') }}
                  className="w-full mt-2 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition-colors text-sm"
                >
                  Send to a different email
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.forgot.email')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      autoFocus
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder={t('auth.forgot.emailPlaceholder')}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2.5">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {loading && (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  )}
                  {loading ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-gray-500">
              Remember it?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                {t('auth.forgot.backToLogin')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
