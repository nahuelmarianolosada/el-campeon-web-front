"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: number
  email: string
  first_name: string
  last_name?: string
  role: string
  is_active: boolean
  is_bulk_buyer: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  isTokenExpired: () => boolean
}

// Decode JWT to get expiration time
function decodeToken(token: string): { exp?: number } | null {
  try {
    const base64Url = token.split(".")[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

function isTokenExpiredCheck(token: string | null): boolean {
  if (!token) return true
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true
  // Check if token expires within 30 seconds (buffer)
  return decoded.exp * 1000 < Date.now() + 30000
}

interface RegisterData {
  email: string
  first_name: string
  last_name: string
  password: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearAuth = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
  }, [])

  const isTokenExpired = useCallback(() => {
    return isTokenExpiredCheck(token)
  }, [token])

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("access_token")
    const savedUser = localStorage.getItem("user")
    
    if (savedToken && savedUser) {
      // Check if token is expired
      if (isTokenExpiredCheck(savedToken)) {
        clearAuth()
      } else {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      }
    }
    setIsLoading(false)
  }, [clearAuth])

  // Check token expiration periodically
  useEffect(() => {
    if (!token) return

    const checkExpiration = () => {
      if (isTokenExpiredCheck(token)) {
        clearAuth()
        router.push("/login?expired=true")
      }
    }

    // Check every 30 seconds
    const interval = setInterval(checkExpiration, 30000)
    
    return () => clearInterval(interval)
  }, [token, clearAuth, router])

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Error al iniciar sesión")
    }

    const data = await response.json()
    setToken(data.access_token)
    setUser(data.user)
    localStorage.setItem("access_token", data.access_token)
    localStorage.setItem("refresh_token", data.refresh_token)
    localStorage.setItem("user", JSON.stringify(data.user))
  }

  const register = async (registerData: RegisterData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Error al registrarse")
    }

    const data = await response.json()
    setToken(data.access_token)
    setUser(data.user)
    localStorage.setItem("access_token", data.access_token)
    localStorage.setItem("refresh_token", data.refresh_token)
    localStorage.setItem("user", JSON.stringify(data.user))
  }

  const logout = () => {
    clearAuth()
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, isTokenExpired }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
