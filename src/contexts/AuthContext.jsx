import { createContext, useContext, useMemo, useState } from 'react'
import {
  clearSession,
  getStoredToken,
  getStoredUser,
  loginApi,
  persistSession,
  registerApi,
} from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken())
  const [user, setUser] = useState(() => getStoredUser())

  const login = async (credentials) => {
    const session = await loginApi(credentials)
    setToken(session.token)
    setUser(session.user)
    return session
  }

  const register = async (payload) => {
    await registerApi(payload)
  }

  const logout = () => {
    clearSession()
    setToken(null)
    setUser(null)
  }

  const setBackendUserId = (backendUserId) => {
    const nextUser = {
      ...(user || {}),
      id: backendUserId ? Number(backendUserId) : null,
    }

    setUser(nextUser)
    if (token) {
      persistSession(token, nextUser)
    }
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isAdmin: (user?.role || '').toUpperCase() === 'ADMIN',
      login,
      register,
      logout,
      setBackendUserId,
    }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth precisa estar dentro de AuthProvider')
  }
  return context
}
