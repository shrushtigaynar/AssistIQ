import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  fetchCurrentUser,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  storeToken,
  getStoredToken,
} from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const restore = async () => {
      if (!getStoredToken()) {
        setIsLoading(false)
        return
      }
      try {
        const current = await fetchCurrentUser()
        if (active) setUser(current)
      } catch {
        // Invalid or expired token: clear it silently.
        apiLogout()
      } finally {
        if (active) setIsLoading(false)
      }
    }
    restore()
    return () => { active = false }
  }, [])

  const signIn = useCallback(async (email, password) => {
    setError('')
    try {
      const data = await apiLogin({ email, password })
      storeToken(data.token)
      setUser(data.user)
      return data.user
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in.')
      throw requestError
    }
  }, [])

  const signUp = useCallback(async (name, email, password) => {
    setError('')
    try {
      const data = await apiRegister({ name, email, password })
      storeToken(data.token)
      setUser(data.user)
      return data.user
    } catch (requestError) {
      setError(requestError.message || 'Unable to create your account.')
      throw requestError
    }
  }, [])

  const signOut = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, error, setError, signIn, signUp, signOut }),
    [user, isLoading, error, signIn, signUp, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
