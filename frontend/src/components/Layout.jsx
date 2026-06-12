/**
 * Layout — app shell with:
 *  - Sticky top nav (desktop: full links, mobile: hamburger)
 *  - Language selector (desktop inline, mobile inside hamburger menu)
 *  - ToastContainer + ConfirmDialog mounted here so they're always available
 *  - Footer
 */

import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { useTranslation } from 'react-i18next'
import ToastContainer from './common/Toast.jsx'
import ConfirmDialog from './common/ConfirmDialog.jsx'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const NAV_LINKS = [
    { to: '/chat',    label: t('nav.chat') },
    { to: '/explore', label: t('nav.explore') },
    { to: '/trips',   label: t('nav.trips') },
  ]

  const LOCALES = ['en', 'fr', 'hi', 'mr', 'kn']

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── Top nav ───────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-blue-100/70 bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between gap-3">

          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg shadow-sm">
              ✈️
            </div>
            <div className="font-bold text-lg text-blue-700 hidden sm:block">{t('app.name')}</div>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-sm'
                      : 'text-slate-600 border-transparent hover:border-blue-100 hover:bg-blue-50/80 hover:text-blue-700'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Desktop right: locale + user + logout */}
          <div className="hidden md:flex items-center gap-2">
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="px-2.5 py-2 rounded-xl text-sm border border-transparent bg-white text-slate-600 hover:bg-blue-50/80 hover:text-blue-700 hover:border-blue-100 transition-all"
              aria-label={t('nav.language')}
            >
              {LOCALES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
            <span className="text-xs text-blue-700 bg-blue-50/80 border border-blue-100 px-2.5 py-1 rounded-full">
              {user?.name}
            </span>
            <button
              onClick={onLogout}
              className="px-3 py-2 rounded-xl text-sm font-medium text-red-600 border border-transparent hover:bg-red-50 hover:border-red-100 transition-all"
            >
              {t('nav.logout')}
            </button>
          </div>

          {/* Mobile right: hamburger */}
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pb-4 pt-2 space-y-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

            {/* Mobile locale + user info + logout */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  value={i18n.language}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-2 py-1.5"
                  aria-label={t('nav.language')}
                >
                  {LOCALES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                </select>
                <span className="text-xs text-slate-500">{user?.name}</span>
              </div>
              <button
                onClick={onLogout}
                className="text-sm text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                {t('nav.logout')}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Page content ──────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="text-center text-xs text-gray-400 py-3 border-t border-gray-100">
        {t('footer.tagline')}
      </footer>

      {/* ── Global UI overlays ────────────────────────────── */}
      <ToastContainer />
      <ConfirmDialog />
    </div>
  )
}
