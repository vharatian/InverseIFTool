import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext(undefined)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const storedToken = localStorage.getItem('auth_token')
        const storedUser = localStorage.getItem('auth_user')

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser)
          setToken(storedToken)
          setUser(parsedUser)
        }
      } catch (error) {
        console.error('Error loading auth state:', error)
        // Clear corrupted data
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      } finally {
        setIsLoading(false)
      }
    }

    loadAuthState()
  }, [])

  const login = (newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)

    // Persist to localStorage
    localStorage.setItem('auth_token', newToken)
    localStorage.setItem('auth_user', JSON.stringify(newUser))

    // Navigate to main app
    navigate('/')
  }

  const register = (newToken, newUser) => {
    // Same as login for now
    login(newToken, newUser)
  }

  const logout = () => {
    setToken(null)
    setUser(null)

    // Clear localStorage
    localStorage.removeItem('auth_token')
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
