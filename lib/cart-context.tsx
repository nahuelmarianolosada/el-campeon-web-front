"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-context"

// Passed by callers so the guest cart can display product info without an extra fetch
export interface GuestCartItemData {
  productId: number
  productName: string
  productImage: string | null
  price: number
  hasVariants?: boolean
}

interface GuestStoredItem {
  sku: string
  quantity: number
  productId: number
  productName: string
  productImage: string | null
  price: number
  hasVariants: boolean
}

const GUEST_CART_KEY = "guest_cart"

function readGuestCart(): GuestStoredItem[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]")
  } catch {
    return []
  }
}

function writeGuestCart(items: GuestStoredItem[]): void {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items))
}

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
  has_variants?: boolean
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
  addToCart: (sku: string, quantity: number, guestData?: GuestCartItemData) => Promise<void>
  updateQuantity: (itemId: number, quantity: number) => Promise<void>
  removeFromCart: (itemId: number) => Promise<void>
  clearCart: () => Promise<void>
  cartItemCount: number
}

function buildCartFromGuest(items: GuestStoredItem[]): Cart {
  const cartItems: CartItem[] = items.map((item, i) => ({
    id: -(i + 1),
    product_id: item.productId,
    product: {
      id: item.productId,
      sku: item.sku,
      name: item.productName,
      image_url: item.productImage,
      price_retail: item.price,
      has_variants: item.hasVariants,
    },
    quantity: item.quantity,
    price: item.price,
    subtotal: item.price * item.quantity,
  }))
  return {
    id: 0,
    user_id: 0,
    items: cartItems,
    total: cartItems.reduce((sum, i) => sum + i.subtotal, 0),
  }
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export function CartProvider({ children }: { children: ReactNode }) {
  const { token, isTokenExpired, logout } = useAuth()
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Track whether we have passed the initial auth-restoration render so we
  // don't accidentally merge the guest cart every time the page loads with a
  // saved token.
  const isInitializedRef = useRef(false)
  const prevTokenRef = useRef<string | null>(null)

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
      const guestItems = readGuestCart()
      setCart(guestItems.length > 0 ? buildCartFromGuest(guestItems) : null)
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

  // When the user logs in during this session, push any guest cart items to
  // the server cart and then reload.
  useEffect(() => {
    if (!isInitializedRef.current) {
      prevTokenRef.current = token
      isInitializedRef.current = true
      return
    }

    const prev = prevTokenRef.current
    prevTokenRef.current = token

    if (token && !prev) {
      const merge = async () => {
        const guestItems = readGuestCart()
        for (const item of guestItems) {
          try {
            await fetch(`${API_URL}/api/cart/items`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ sku: item.sku, quantity: item.quantity }),
            })
          } catch {
            // best-effort: skip items that fail
          }
        }
        localStorage.removeItem(GUEST_CART_KEY)
        await fetchCart()
      }
      merge()
    }
  }, [token, fetchCart])

  const addToCart = useCallback(
    async (sku: string, quantity: number, guestData?: GuestCartItemData) => {
      if (!token) {
        if (!guestData) throw new Error("Product data required for guest cart")
        const items = readGuestCart()
        const existing = items.find((i) => i.sku === sku)
        if (existing) {
          existing.quantity += quantity
        } else {
          items.push({
            sku,
            quantity,
            productId: guestData.productId,
            productName: guestData.productName,
            productImage: guestData.productImage,
            price: guestData.price,
            hasVariants: guestData.hasVariants ?? false,
          })
        }
        writeGuestCart(items)
        setCart(buildCartFromGuest(items))
        return
      }

      if (!checkAuth()) throw new Error("Tu sesión ha expirado")

      const response = await fetch(`${API_URL}/api/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sku, quantity }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Error al agregar al carrito")
      }

      await fetchCart()
    },
    [token, checkAuth, fetchCart]
  )

  const updateQuantity = useCallback(
    async (itemId: number, quantity: number) => {
      if (!token) {
        // Guest item IDs are -(index + 1)
        const items = readGuestCart()
        const idx = -itemId - 1
        if (idx >= 0 && idx < items.length) {
          if (quantity <= 0) {
            items.splice(idx, 1)
          } else {
            items[idx].quantity = quantity
          }
          writeGuestCart(items)
          setCart(items.length > 0 ? buildCartFromGuest(items) : null)
        }
        return
      }

      if (!checkAuth()) return

      const response = await fetch(`${API_URL}/api/cart/items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      })

      if (response.ok) await fetchCart()
    },
    [token, checkAuth, fetchCart]
  )

  const removeFromCart = useCallback(
    async (itemId: number) => {
      if (!token) {
        const items = readGuestCart()
        const idx = -itemId - 1
        if (idx >= 0 && idx < items.length) {
          items.splice(idx, 1)
          writeGuestCart(items)
          setCart(items.length > 0 ? buildCartFromGuest(items) : null)
        }
        return
      }

      if (!checkAuth()) return

      const response = await fetch(`${API_URL}/api/cart/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) await fetchCart()
    },
    [token, checkAuth, fetchCart]
  )

  const clearCart = useCallback(async () => {
    if (!token) {
      localStorage.removeItem(GUEST_CART_KEY)
      setCart(null)
      return
    }

    if (!checkAuth()) return

    const response = await fetch(`${API_URL}/api/cart`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })

    if (response.ok) setCart(null)
  }, [token, checkAuth])

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0

  return (
    <CartContext.Provider
      value={{ cart, isLoading, fetchCart, addToCart, updateQuantity, removeFromCart, clearCart, cartItemCount }}
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
