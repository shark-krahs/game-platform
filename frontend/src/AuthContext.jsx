import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

const backendHost = import.meta.env.VITE_BACKEND_HOST || 'localhost'
const backendPort = import.meta.env.VITE_BACKEND_PORT || 8000
const API_BASE = `${location.protocol}//${backendHost}:${backendPort}`

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (token) {
      fetchUserInfo()
    }
  }, [token])

  const fetchUserInfo = async () => {
    if (!token) return
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        logout()
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err)
      logout()
    }
  }

  const login = async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
      const data = await response.json()
      if (response.ok) {
        const { access_token } = data
        setToken(access_token)
        localStorage.setItem('token', access_token)
      } else {
        setError(data.detail || 'Login failed')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const register = async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })
      const data = await response.json()
      if (response.ok) {
        const { access_token } = data
        setToken(access_token)
        localStorage.setItem('token', access_token)
      } else {
        setError(data.detail || 'Registration failed')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    setError(null)
  }

  const updateProfile = async (updates) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })
      const data = await response.json()
      if (response.ok) {
        setUser(data)
        return data
      } else {
        setError(data.detail || 'Update failed')
        throw new Error(data.detail)
      }
    } catch (err) {
      setError('Network error')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
