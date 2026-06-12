import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useTranslation } from 'react-i18next'

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
    </svg>
  )
}

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const presetToken = useMemo(() => params.get('token') || '', [params])
  const [token, setToken] = useState(presetToken)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (password !== confirm) {
      setError(t('auth.reset.passwordMismatch'))
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, password)
      setSuccess(t('auth.reset.success'))
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (err) {
      setError(err?.response?.data?.error || t('auth.reset.errorFallback'))
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
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl">🔒</div>
          <h2 className="text-white text-3xl font-bold leading-snug">Set a new<br/>password</h2>
          <p className="text-blue-200 text-sm leading-relaxed">
            Choose a strong password with at least 8 characters, including an uppercase letter and a number.
          </p>
          <div className="space-y-2 text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <span className="text-green-300">✓</span> At least 8 characters
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-300">✓</span> One uppercase letter
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-300">✓</span> One number
            </div>
          </div>
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
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900">{t('auth.reset.title')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('auth.reset.subtitle')}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {success ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto">✅</div>
                <div>
                  <h3 className="font-semibold text-gray-900">Password reset!</h3>
                  <p className="text-gray-500 text-sm mt-1">{success}</p>
                  <p className="text-gray-400 text-xs mt-2">Redirecting you to login…</p>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                {!presetToken && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.reset.token')}</label>
                    <input
                      type="text"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono text-xs"
                      placeholder={t('auth.reset.tokenPlaceholder')}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.reset.password')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder={t('auth.reset.passwordPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.reset.confirmPassword')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                    </span>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      autoComplete="new-password"
                      className={`w-full pl-9 pr-10 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${confirm && confirm !== password ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
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
                  {loading ? t('auth.reset.submitting') : t('auth.reset.submit')}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-gray-500">
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                ← {t('auth.reset.backToLogin')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
