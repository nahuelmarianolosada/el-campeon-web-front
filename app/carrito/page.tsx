"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Package,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"

export default function CartPage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading } = useAuth()
  const { cart, isLoading, fetchCart, updateQuantity, removeFromCart, clearCart } = useCart()
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set())
  const [isClearing, setIsClearing] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (token) {
      fetchCart()
    }
  }, [token, fetchCart])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return

    setUpdatingItems((prev) => new Set(prev).add(itemId))
    try {
      await updateQuantity(itemId, newQuantity)
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleRemoveItem = async (itemId: number) => {
    setUpdatingItems((prev) => new Set(prev).add(itemId))
    try {
      await removeFromCart(itemId)
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const handleClearCart = async () => {
    setIsClearing(true)
    try {
      await clearCart()
    } finally {
      setIsClearing(false)
    }
  }

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    )
  }

  const hasItems = cart && cart.items && cart.items.length > 0

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          <Link
            href="/productos"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Seguir comprando
          </Link>

          <h1 className="text-3xl font-bold text-foreground mb-8">Mi Carrito</h1>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !hasItems ? (
            <div className="py-16 text-center">
              <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground/40" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                Tu carrito está vacío
              </h2>
              <p className="mt-2 text-muted-foreground">
                Agregá productos para comenzar tu compra
              </p>
              <Button asChild className="mt-6">
                <Link href="/productos">Ver productos</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cart.items.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {item.product.image_url ? (
                            <Image
                              src={item.product.image_url}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <Link
                              href={`/productos/${item.product_id}`}
                              className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                            >
                              {item.product.name}
                            </Link>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatPrice(item.price)} c/u
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={updatingItems.has(item.id) || item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {updatingItems.has(item.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                ) : (
                                  item.quantity
                                )}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={updatingItems.has(item.id)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            {/* Subtotal and Remove */}
                            <div className="flex items-center gap-4">
                              <span className="font-semibold text-primary">
                                {formatPrice(item.subtotal)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={updatingItems.has(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCart}
                    disabled={isClearing}
                    className="text-destructive hover:text-destructive"
                  >
                    {isClearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Vaciar carrito
                  </Button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Resumen del Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Subtotal ({cart.items.reduce((sum, item) => sum + item.quantity, 0)} productos)
                      </span>
                      <span>{formatPrice(cart.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Envío</span>
                      <span className="text-muted-foreground">Calculado en checkout</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(cart.total)}</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" size="lg" asChild>
                      <Link href="/checkout">Finalizar Compra</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
