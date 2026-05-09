"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Package,
  Loader2,
  ShieldCheck,
  CreditCard,
  Truck,
  Store,
  Wallet,
  Banknote,
  MapPin,
} from "lucide-react"
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
import { createOrder, createPayment, type ApiPaymentMethod } from "@/lib/api"

type DeliveryMethod = "shipping" | "pickup-libreria" | "pickup-jugueteria"
type PaymentMethod = "mp-saved" | "mp-installments" | "mp-card" | "cash"

const PAYMENT_METHOD_MAP: Record<PaymentMethod, ApiPaymentMethod> = {
  "mp-saved": "MP_SAVED",
  "mp-installments": "MP_INSTALLMENTS",
  "mp-card": "MP_CARD",
  cash: "CASH",
}

const PICKUP_LOCATIONS: Record<Exclude<DeliveryMethod, "shipping">, { name: string; address: string }> = {
  "pickup-libreria": {
    name: "Librería El Campeón",
    address: "Güemes 901, San Salvador de Jujuy, Jujuy, Argentina",
  },
  "pickup-jugueteria": {
    name: "Juguetería El Campeón",
    address: "Güemes 1045, San Salvador de Jujuy, Jujuy, Argentina",
  },
}

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; description: string; icon: ReactNode }[] = [
  {
    id: "mp-saved",
    label: "Tarjetas guardadas o saldo en Mercado Pago",
    description: "Pagá con tus tarjetas guardadas o dinero disponible sin completar datos",
    icon: <Wallet className="h-5 w-5 text-[#009EE3]" />,
  },
  {
    id: "mp-installments",
    label: "Hasta 12 pagos sin tarjeta",
    description: "Financiación con Mercado Pago — elegí la cantidad de cuotas al continuar",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="#009EE3" strokeWidth="2" />
        <path d="M2 10h20" stroke="#009EE3" strokeWidth="2" />
        <path d="M6 15h4" stroke="#009EE3" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "mp-card",
    label: "Débito o Crédito",
    description: "Ingresá los datos de tu tarjeta a través de Mercado Pago",
    icon: <CreditCard className="h-5 w-5 text-[#009EE3]" />,
  },
  {
    id: "cash",
    label: "Efectivo",
    description: "Pagá en Pago Fácil o Rapipago con el código que recibirás por email",
    icon: <Banknote className="h-5 w-5 text-green-600" />,
  },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading } = useAuth()
  const { cart, isLoading: cartLoading, fetchCart, clearCart } = useCart()

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("shipping")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mp-saved")
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

  const getEffectiveAddress = () => {
    if (deliveryMethod === "shipping") return shippingAddress
    const loc = PICKUP_LOCATIONS[deliveryMethod]
    return {
      street: loc.address,
      city: "San Salvador de Jujuy",
      postal_code: "4600",
      country: "Argentina",
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !cart) return

    setError("")
    setIsProcessing(true)

    try {
      const order = await createOrder(token, getEffectiveAddress(), deliveryMethod, notes || undefined)
      const payment = await createPayment(token, order.id, order.total, PAYMENT_METHOD_MAP[paymentMethod])
      await clearCart()

      if (paymentMethod === "cash") {
        router.push(`/mis-ordenes/${order.id}?success=true&payment=cash&txn=${payment.transaction_id}`)
      } else if (payment.mercadopago_preference_id) {
        window.open(
          `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${payment.mercadopago_preference_id}`,
          "_blank",
          "noopener,noreferrer"
        )
        router.push(`/mis-ordenes/${order.id}?success=true`)
      } else {
        router.push(`/mis-ordenes/${order.id}?success=true`)
      }
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
          <h1 className="mt-4 text-xl font-semibold text-foreground">Tu carrito está vacío</h1>
          <p className="mt-2 text-muted-foreground">Agregá productos para poder realizar tu compra</p>
          <Button asChild className="mt-6">
            <Link href="/productos">Ver productos</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

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
              <div className="lg:col-span-2 space-y-6">
                {error && (
                  <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
                )}

                {/* Delivery Method */}
                <Card>
                  <CardHeader>
                    <CardTitle>Método de entrega</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Shipping option */}
                    <label
                      className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                        deliveryMethod === "shipping"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="shipping"
                        checked={deliveryMethod === "shipping"}
                        onChange={() => setDeliveryMethod("shipping")}
                        className="mt-1 accent-primary"
                        disabled={isProcessing}
                      />
                      <Truck className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">Envío a domicilio</p>
                        <p className="text-sm text-muted-foreground">Completá tu dirección para recibir el pedido</p>
                      </div>
                    </label>

                    {/* Pickup: Librería */}
                    <label
                      className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                        deliveryMethod === "pickup-libreria"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="pickup-libreria"
                        checked={deliveryMethod === "pickup-libreria"}
                        onChange={() => setDeliveryMethod("pickup-libreria")}
                        className="mt-1 accent-primary"
                        disabled={isProcessing}
                      />
                      <Store className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">Retiro en Librería El Campeón</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Güemes 901, San Salvador de Jujuy
                        </p>
                        <p className="text-xs text-primary mt-1">Sin costo de envío</p>
                      </div>
                    </label>

                    {/* Pickup: Juguetería */}
                    <label
                      className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                        deliveryMethod === "pickup-jugueteria"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value="pickup-jugueteria"
                        checked={deliveryMethod === "pickup-jugueteria"}
                        onChange={() => setDeliveryMethod("pickup-jugueteria")}
                        className="mt-1 accent-primary"
                        disabled={isProcessing}
                      />
                      <Store className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">Retiro en Juguetería El Campeón</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Güemes 1045, San Salvador de Jujuy
                        </p>
                        <p className="text-xs text-primary mt-1">Sin costo de envío</p>
                      </div>
                    </label>
                  </CardContent>
                </Card>

                {/* Shipping Address — only when shipping selected */}
                {deliveryMethod === "shipping" && (
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
                )}

                {/* Payment Method */}
                <Card>
                  <CardHeader>
                    <CardTitle>Método de Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {PAYMENT_OPTIONS.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                          paymentMethod === option.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={option.id}
                          checked={paymentMethod === option.id}
                          onChange={() => setPaymentMethod(option.id)}
                          className="mt-1 accent-primary"
                          disabled={isProcessing}
                        />
                        <div className="mt-0.5 shrink-0">{option.icon}</div>
                        <div>
                          <p className="font-medium text-foreground">{option.label}</p>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                      </label>
                    ))}

                    {/* MercadoPago branding */}
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-[#009EE3]" />
                      <span>
                        Pagos procesados de forma segura por{" "}
                        <span className="font-semibold text-[#009EE3]">Mercado Pago</span>
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
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
                            <p className="font-medium text-foreground line-clamp-1">{item.product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} x {formatPrice(item.price)}
                            </p>
                          </div>
                          <p className="font-medium text-foreground">{formatPrice(item.subtotal)}</p>
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
                      <span className="text-muted-foreground">
                        {deliveryMethod === "shipping" ? "Gratis" : "Retiro en local"}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(total)}</span>
                    </div>

                    {/* Selected payment method summary */}
                    <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-0.5">Pago</p>
                      <p>{PAYMENT_OPTIONS.find((o) => o.id === paymentMethod)?.label}</p>
                    </div>

                    {/* Pickup address summary */}
                    {deliveryMethod !== "shipping" && (
                      <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-0.5">Retiro en</p>
                        <p>{PICKUP_LOCATIONS[deliveryMethod].name}</p>
                        <p className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {PICKUP_LOCATIONS[deliveryMethod].address}
                        </p>
                      </div>
                    )}
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
