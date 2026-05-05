"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ArrowLeft, Package, Loader2, ShieldCheck, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { createOrder, createPayment } from "@/lib/api"

export default function CheckoutPage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading } = useAuth()
  const { cart, isLoading: cartLoading, fetchCart, clearCart } = useCart()

  const [shippingAddress, setShippingAddress] = useState({
    street: "",
    city: "",
    postal_code: "",
    country: "Argentina",
  })
  const [notes, setNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !cart) return

    setError("")
    setIsProcessing(true)

    try {
      // Create order
      const order = await createOrder(token, shippingAddress, notes || undefined)

      // Create payment
      await createPayment(token, order.id, order.total)

      // Clear cart after successful order
      await clearCart()

      // Redirect to success page
      router.push(`/mis-ordenes/${order.id}?success=true`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el pedido")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }))
  }

  if (authLoading || cartLoading) {
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

  if (!hasItems) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <Package className="h-16 w-16 text-muted-foreground/40" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Tu carrito está vacío
          </h1>
          <p className="mt-2 text-muted-foreground">
            Agregá productos para poder realizar tu compra
          </p>
          <Button asChild className="mt-6">
            <Link href="/productos">Ver productos</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  // Calculate tax (21% IVA)
  const subtotal = cart.total
  const tax = subtotal * 0.21
  const total = subtotal + tax

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          <Link
            href="/carrito"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al carrito
          </Link>

          <h1 className="text-3xl font-bold text-foreground mb-8">Finalizar Compra</h1>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Shipping Form */}
              <div className="lg:col-span-2 space-y-6">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Dirección de Envío</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="street">Dirección *</Label>
                      <Input
                        id="street"
                        placeholder="Calle y número"
                        value={shippingAddress.street}
                        onChange={(e) => handleInputChange("street", e.target.value)}
                        required
                        disabled={isProcessing}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="city">Ciudad *</Label>
                        <Input
                          id="city"
                          placeholder="Buenos Aires"
                          value={shippingAddress.city}
                          onChange={(e) => handleInputChange("city", e.target.value)}
                          required
                          disabled={isProcessing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postal_code">Código Postal *</Label>
                        <Input
                          id="postal_code"
                          placeholder="1425"
                          value={shippingAddress.postal_code}
                          onChange={(e) => handleInputChange("postal_code", e.target.value)}
                          required
                          disabled={isProcessing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">País</Label>
                      <Input
                        id="country"
                        value={shippingAddress.country}
                        onChange={(e) => handleInputChange("country", e.target.value)}
                        disabled={isProcessing}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notas del Pedido</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Instrucciones especiales para la entrega (opcional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={isProcessing}
                      rows={3}
                    />
                  </CardContent>
                </Card>

                {/* Products Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Productos ({cart.items.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {cart.items.map((item) => (
                        <div key={item.id} className="flex gap-4">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                            {item.product.image_url ? (
                              <Image
                                src={item.product.image_url}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground line-clamp-1">
                              {item.product.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} x {formatPrice(item.price)}
                            </p>
                          </div>
                          <p className="font-medium text-foreground">
                            {formatPrice(item.subtotal)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Resumen del Pedido</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA (21%)</span>
                      <span>{formatPrice(tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Envío</span>
                      <span className="text-muted-foreground">Gratis</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(total)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span>Pago seguro con MercadoPago</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      className="w-full gap-2"
                      size="lg"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <CreditCard className="h-5 w-5" />
                      )}
                      {isProcessing ? "Procesando..." : "Confirmar Pedido"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Al confirmar, aceptás nuestros términos y condiciones
                    </p>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  )
}
