"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-context"

interface Product {
  id: number
  sku: string
  name: string
  description?: string
  category?: string
  price_retail: number
  price_wholesale?: number
  stock?: number
  image_url?: string | null
}

interface CartItem {
  id: number
  product_id: number
  product: Product
  quantity: number
  price: number
  subtotal: number
}

interface Cart {
  id: number
  user_id: number
  items: CartItem[]
  total: number
}

interface CartContextType {
  cart: Cart | null
  isLoading: boolean
  fetchCart: () => Promise<void>
  addToCart: (productId: number, quantity: number, variantCombinationId?: number) => Promise<void>
  updateQuantity: (itemId: number, quantity: number) => Promise<void>
  removeFromCart: (itemId: number) => Promise<void>
  clearCart: () => Promise<void>
  cartItemCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export function CartProvider({ children }: { children: ReactNode }) {
  const { token, isTokenExpired, logout } = useAuth()
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkAuth = useCallback(() => {
    if (!token || isTokenExpired()) {
      logout()
      router.push("/login?expired=true")
      return false
    }
    return true
  }, [token, isTokenExpired, logout, router])

  const fetchCart = useCallback(async () => {
    if (!token) {
      setCart(null)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setCart(data)
      }
    } catch (error) {
      console.error("Error fetching cart:", error)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const addToCart = async (productId: number, quantity: number, variantCombinationId?: number) => {
    if (!token) throw new Error("Debes iniciar sesión para agregar al carrito")
    if (!checkAuth()) throw new Error("Tu sesión ha expirado")

    const body: Record<string, unknown> = { product_id: productId, quantity }
    if (variantCombinationId !== undefined) body.variant_combination_id = variantCombinationId

    const response = await fetch(`${API_URL}/api/cart/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Error al agregar al carrito")
    }

    await fetchCart()
  }

  const updateQuantity = async (itemId: number, quantity: number) => {
    if (!token || !checkAuth()) return

    const response = await fetch(`${API_URL}/api/cart/items/${itemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quantity }),
    })

    if (response.ok) {
      await fetchCart()
    }
  }

  const removeFromCart = async (itemId: number) => {
    if (!token || !checkAuth()) return

    const response = await fetch(`${API_URL}/api/cart/items/${itemId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.ok) {
      await fetchCart()
    }
  }

  const clearCart = async () => {
    if (!token || !checkAuth()) return

    const response = await fetch(`${API_URL}/api/cart`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.ok) {
      setCart(null)
    }
  }

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        fetchCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
