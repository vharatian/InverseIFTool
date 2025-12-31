import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SocketProvider } from './SocketContext'
import { isTokenExpired, getTokenExpiration } from '../utils/tools'

const AuthContext = createContext(undefined)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()



  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const storedToken = localStorage.getItem('auth_token')
        const storedRefreshToken = localStorage.getItem('refresh_token')
        const storedUser = localStorage.getItem('auth_user')

        if (storedToken && storedUser) {
          // Check if token is expired
          if (isTokenExpired(storedToken)) {
            console.log('Stored token is expired, clearing auth state')
            clearAuthState()
            return
          }

          const parsedUser = JSON.parse(storedUser)
          setToken(storedToken)
          setRefreshToken(storedRefreshToken)
          setUser(parsedUser)
        }
      } catch (error) {
        console.error('Error loading auth state:', error)
        clearAuthState()
      } finally {
        setIsLoading(false)
      }
    }

    const clearAuthState = () => {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('auth_user')
    }

    loadAuthState()
  }, [])

  // Listen for token refresh events from API interceptor
  useEffect(() => {
    const handleTokenRefresh = (event) => {
      const { access_token, refresh_token } = event.detail
      console.log('AuthContext: Received token refresh event, updating state')
      setToken(access_token)
      setRefreshToken(refresh_token)
    }

    console.log('AuthContext: Setting up token refresh event listener')
    window.addEventListener('auth:tokenRefreshed', handleTokenRefresh)

    return () => {
      console.log('AuthContext: Removing token refresh event listener')
      window.removeEventListener('auth:tokenRefreshed', handleTokenRefresh)
    }
  }, [])

  // Periodic token validation
  useEffect(() => {
    if (!token) return

    const checkTokenExpiration = () => {
      if (isTokenExpired(token)) {
        console.log('Token expired during session, logging out')
        logout()
        return
      }

      // Schedule next check (check every 5 minutes)
      const timeoutId = setTimeout(checkTokenExpiration, 5 * 60 * 1000)
      return () => clearTimeout(timeoutId)
    }

    // Start periodic checking
    const cleanup = checkTokenExpiration()
    return cleanup
  }, [token])

  const login = (newToken, newRefreshToken, newUser) => {
    setToken(newToken)
    setRefreshToken(newRefreshToken)
    setUser(newUser)

    // Persist to localStorage
    localStorage.setItem('auth_token', newToken)
    localStorage.setItem('refresh_token', newRefreshToken)
    localStorage.setItem('auth_user', JSON.stringify(newUser))

    // Navigate to main app
    navigate('/')
  }

  const register = (newToken, newRefreshToken, newUser) => {
    // Same as login for now
    login(newToken, newRefreshToken, newUser)
  }

  const logout = async () => {
    try {
      // Call logout endpoint to revoke refresh token
      if (token) {
        await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      }
    } catch (error) {
      console.error('Logout API call failed:', error)
    }

    // Clear local state
    setToken(null)
    setRefreshToken(null)
    setUser(null)

    // Clear localStorage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_user')

    // Navigate to login
    navigate('/login')
  }

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    register,
  }

  return (
    <AuthContext.Provider value={value}>
      <SocketProvider token={token}>
        {children}
      </SocketProvider>
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
