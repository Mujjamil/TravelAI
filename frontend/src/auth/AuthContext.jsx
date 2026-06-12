import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401 && !String(error?.config?.url || '').includes('/api/auth/')) {
          setUser(null)
        }
        return Promise.reject(error)
      }
    )
    return () => axios.interceptors.response.eject(interceptor)
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [])

  const refreshUser = async () => {
    try {
      const { data } = await axios.get('/api/auth/me')
      setUser(data.user || null)
      return data.user || null
    } catch {
      setUser(null)
      return null
    }
  }

  const login = async ({ email, password, rememberMe }) => {
    const { data } = await axios.post('/api/auth/login', { email, password, rememberMe: !!rememberMe })
    setUser(data.user)
    return data.user
  }

  const register = async ({ name, email, password, rememberMe }) => {
    const { data } = await axios.post('/api/auth/register', { name, email, password, rememberMe: !!rememberMe })
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout')
    } finally {
      setUser(null)
    }
  }

  const forgotPassword = async (email) => {
    const { data } = await axios.post('/api/auth/forgot-password', { email })
    return data
  }

  const resetPassword = async (token, password) => {
    const { data } = await axios.post('/api/auth/reset-password', { token, password })
    return data
  }

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
    forgotPassword,
    resetPassword
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
