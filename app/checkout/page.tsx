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
import {
  createOrder, createPayment, createGuestOrder, createGuestPayment,
  verifyGuestEmail, confirmGuestEmail,
  listBranches, getShippingQuote,
  type ApiPaymentMethod, type GuestApiPaymentMethod, type GuestContactInfo,
  type GuestSession, type Branch, type ShippingQuote,
} from "@/lib/api"

type DeliveryMethod = "shipping" | "pickup"
type PaymentMethod = "mp-saved" | "mp-installments" | "mp-card" | "cash"

const PAYMENT_METHOD_MAP: Record<PaymentMethod, ApiPaymentMethod> = {
  "mp-saved": "MP_SAVED",
  "mp-installments": "MP_INSTALLMENTS",
  "mp-card": "MP_CARD",
  cash: "CASH",
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
  const [guestInfo, setGuestInfo] = useState<GuestContactInfo>({ name: "", email: "", phone: "" })
  const [verificationStep, setVerificationStep] = useState<"form" | "verify">("form")
  const [verificationCode, setVerificationCode] = useState("")
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null)

  // Sucursales para retiro y cotización de envío
  const [branches, setBranches] = useState<Branch[]>([])
  const [pickupBranchId, setPickupBranchId] = useState<number | null>(null)
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  // Cargar sucursales una vez
  useEffect(() => {
    listBranches({ onlyActive: true })
      .then((bs) => {
        setBranches(bs)
        const firstPickup = bs.find((b) => b.is_pickup_point)
        if (firstPickup) setPickupBranchId(firstPickup.id)
      })
      .catch(() => { /* silent — pickup queda sin opciones, el front muestra fallback */ })
  }, [])

  // Cotizar envío al cambiar el CP / items / método (debounced)
  useEffect(() => {
    if (deliveryMethod !== "shipping") {
      setShippingQuote(null)
      setQuoteError(null)
      return
    }
    const cp = shippingAddress.postal_code.trim()
    if (!cp || !cart || cart.items.length === 0) {
      setShippingQuote(null)
      setQuoteError(null)
      return
    }
    const subtotal = cart.total
    const items = cart.items.map((it) => ({ product_id: it.product.id, quantity: it.quantity }))
    const handle = setTimeout(() => {
      setQuoteLoading(true)
      setQuoteError(null)
      getShippingQuote(cp, subtotal, items)
        .then((q) => setShippingQuote(q))
        .catch((err: Error & { code?: string }) => {
          setShippingQuote(null)
          setQuoteError(err.code ?? err.message)
        })
        .finally(() => setQuoteLoading(false))
    }, 500)
    return () => clearTimeout(handle)
  }, [deliveryMethod, shippingAddress.postal_code, cart])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  const selectedPickupBranch = branches.find((b) => b.id === pickupBranchId) ?? null

  const getEffectiveAddress = () => {
    if (deliveryMethod === "shipping") return shippingAddress
    if (selectedPickupBranch) {
      return {
        street: selectedPickupBranch.address,
        city: "San Salvador de Jujuy",
        postal_code: "4600",
        country: "Argentina",
      }
    }
    return shippingAddress
  }

  const checkoutOptions = () => {
    if (deliveryMethod === "shipping" && shippingQuote) {
      return {
        originBranchId: shippingQuote.origin_branch_id,
        deliveryZoneId: shippingQuote.zone.id,
        shippingCost: shippingQuote.cost,
        notes: notes || undefined,
      }
    }
    if (deliveryMethod === "pickup" && pickupBranchId) {
      return {
        originBranchId: pickupBranchId,
        shippingCost: 0,
        notes: notes || undefined,
      }
    }
    return { notes: notes || undefined }
  }

  const runGuestCheckout = async (session: GuestSession) => {
    const guestItems = cart!.items.map((item) => ({
      sku: item.product.sku,
      quantity: item.quantity,
      price: item.price,
    }))
    const guestOrder = await createGuestOrder(
      guestInfo,
      guestItems,
      getEffectiveAddress(),
      deliveryMethod,
      session.guest_token,
      checkoutOptions()
    )
    const payment = await createGuestPayment(
      guestOrder.id,
      session.email,
      total,
      PAYMENT_METHOD_MAP[paymentMethod] as GuestApiPaymentMethod,
      session.guest_token
    )
    localStorage.setItem(
      "guest_order_confirmation",
      JSON.stringify({ order: guestOrder, payment, guestInfo })
    )
    await clearCart()
    if (payment.mercadopago_preference_id) {
      window.open(
        `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${payment.mercadopago_preference_id}`,
        "_blank",
        "noopener,noreferrer"
      )
    }
    router.push("/pedido-confirmado")
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!cart) return

    // ── Authenticated flow ──────────────────────────────────────────────────
    if (token) {
      setError("")
      setIsProcessing(true)
      try {
        const order = await createOrder(token, getEffectiveAddress(), deliveryMethod, checkoutOptions())
        const payment = await createPayment(token, order.id, total, PAYMENT_METHOD_MAP[paymentMethod])
        await clearCart()
        if (paymentMethod === "cash") {
          router.push(`/mis-ordenes/${order.id}?success=true&payment=cash&txn=${payment.transaction_id}`)
        } else {
          if (payment.mercadopago_preference_id) {
            window.open(
              `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${payment.mercadopago_preference_id}`,
              "_blank",
              "noopener,noreferrer"
            )
          }
          router.push(`/mis-ordenes/${order.id}?success=true`)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al procesar el pedido")
      } finally {
        setIsProcessing(false)
      }
      return
    }

    // ── Guest flow — step 1: send verification code ─────────────────────────
    if (verificationStep === "form") {
      if (!guestInfo.name.trim() || !guestInfo.email.trim()) {
        setError("Completá tu nombre y email para continuar")
        return
      }
      setError("")
      setIsProcessing(true)
      try {
        const alreadyVerified = await verifyGuestEmail(guestInfo.email)
        if (alreadyVerified && guestSession) {
          await runGuestCheckout(guestSession)
        } else {
          setVerificationStep("verify")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al enviar el código")
      } finally {
        setIsProcessing(false)
      }
      return
    }

    // ── Guest flow — step 2: confirm code → create order + payment ──────────
    if (verificationCode.length !== 6) {
      setError("Ingresá el código de 6 dígitos que enviamos a tu email")
      return
    }
    setError("")
    setIsProcessing(true)
    try {
      const session = await confirmGuestEmail(guestInfo.email, verificationCode)
      setGuestSession(session)
      await runGuestCheckout(session)
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
  const shippingCost = deliveryMethod === "shipping" ? (shippingQuote?.cost ?? 0) : 0
  const total = subtotal + tax + shippingCost

  // Reglas para habilitar el botón "Confirmar"
  const canSubmit = (() => {
    if (isProcessing) return false
    if (deliveryMethod === "shipping") {
      if (!shippingQuote) return false
      if (!shippingQuote.in_stock) return false
    }
    if (deliveryMethod === "pickup" && !pickupBranchId) return false
    return true
  })()

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

                {/* ── Email verification step (guest only) ─────────────── */}
                {!user && verificationStep === "verify" ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Verificá tu email</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Enviamos un código de 6 dígitos a{" "}
                        <span className="font-semibold text-foreground">{guestInfo.email}</span>.
                        Ingresalo para confirmar tu pedido.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="verification_code">Código de verificación</Label>
                        <Input
                          id="verification_code"
                          placeholder="123456"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                          className="text-center text-2xl tracking-[0.5em] font-mono"
                          disabled={isProcessing}
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground underline"
                          onClick={() => { setVerificationStep("form"); setVerificationCode(""); setError("") }}
                          disabled={isProcessing}
                        >
                          ← Cambiar datos de contacto
                        </button>
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={async () => {
                            try { await verifyGuestEmail(guestInfo.email) } catch { /* silent */ }
                          }}
                          disabled={isProcessing}
                        >
                          Reenviar código
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                {/* Guest contact info */}
                {!user && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Tus datos de contacto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="guest_name">Nombre completo *</Label>
                        <Input
                          id="guest_name"
                          placeholder="Juan Pérez"
                          value={guestInfo.name}
                          onChange={(e) => setGuestInfo((prev) => ({ ...prev, name: e.target.value }))}
                          required
                          disabled={isProcessing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guest_email">Email *</Label>
                        <Input
                          id="guest_email"
                          type="email"
                          placeholder="juan@ejemplo.com"
                          value={guestInfo.email}
                          onChange={(e) => setGuestInfo((prev) => ({ ...prev, email: e.target.value }))}
                          required
                          disabled={isProcessing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guest_phone">Teléfono (opcional)</Label>
                        <Input
                          id="guest_phone"
                          type="tel"
                          placeholder="+54 9 388 123 4567"
                          value={guestInfo.phone ?? ""}
                          onChange={(e) => setGuestInfo((prev) => ({ ...prev, phone: e.target.value }))}
                          disabled={isProcessing}
                        />
                      </div>
                    </CardContent>
                  </Card>
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

                    {/* Pickup genérico — sucursales dinámicas desde el backend */}
                    {branches.filter((b) => b.is_pickup_point).map((branch) => {
                      const isSelected = deliveryMethod === "pickup" && pickupBranchId === branch.id
                      return (
                        <label
                          key={branch.id}
                          className={`flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors ${
                            isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name="deliveryMethod"
                            value={`pickup-${branch.id}`}
                            checked={isSelected}
                            onChange={() => { setDeliveryMethod("pickup"); setPickupBranchId(branch.id) }}
                            className="mt-1 accent-primary"
                            disabled={isProcessing}
                          />
                          <Store className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">Retiro en {branch.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {branch.address}
                            </p>
                            <p className="text-xs text-primary mt-1">Sin costo de envío</p>
                          </div>
                        </label>
                      )
                    })}
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

                      {/* Feedback de cotización de envío */}
                      {quoteLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Cotizando envío...
                        </div>
                      )}
                      {!quoteLoading && quoteError === "POSTAL_CODE_NOT_COVERED" && (
                        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                          No hacemos envíos a ese código postal. Probá con otro CP o elegí retiro en sucursal.
                        </div>
                      )}
                      {!quoteLoading && quoteError && quoteError !== "POSTAL_CODE_NOT_COVERED" && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                          No pudimos cotizar el envío: {quoteError}
                        </div>
                      )}
                      {!quoteLoading && shippingQuote && (
                        <div className={`rounded-md border p-3 text-sm ${
                          shippingQuote.in_stock
                            ? "bg-primary/5 border-primary/20"
                            : "bg-destructive/10 border-destructive/30 text-destructive"
                        }`}>
                          <p className="font-medium text-foreground">
                            Envío a {shippingQuote.zone.name}:{" "}
                            {shippingQuote.free_shipping_applied
                              ? <span className="text-primary">Gratis</span>
                              : formatPrice(shippingQuote.cost)}
                          </p>
                          <p className="text-muted-foreground">
                            Llega en {shippingQuote.eta_min_days}–{shippingQuote.eta_max_days} días hábiles
                            {" · "}sale desde {shippingQuote.origin_branch_name}
                          </p>
                          {shippingQuote.amount_for_free != null && shippingQuote.amount_for_free > 0 && (
                            <p className="mt-1 text-primary">
                              Sumá {formatPrice(shippingQuote.amount_for_free)} más y tu envío es gratis.
                            </p>
                          )}
                          {!shippingQuote.in_stock && (
                            <p className="mt-1">
                              Algunos productos no tienen stock disponible para envío. Probá retiro en sucursal.
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Payment Method */}
                <Card>
                  <CardHeader>
                    <CardTitle>Método de Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {PAYMENT_OPTIONS.filter((o) => user || o.id !== "mp-saved").map((option) => (
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
                  </>
                )}
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
                      <span className={shippingCost === 0 ? "text-primary" : ""}>
                        {deliveryMethod !== "shipping"
                          ? "Retiro en sucursal"
                          : shippingQuote == null
                            ? quoteLoading ? "Cotizando..." : "Ingresá el CP"
                            : shippingQuote.free_shipping_applied
                              ? "Gratis"
                              : formatPrice(shippingQuote.cost)}
                      </span>
                    </div>
                    {deliveryMethod === "shipping" && shippingQuote && (
                      <p className="text-xs text-muted-foreground">
                        Llega en {shippingQuote.eta_min_days}–{shippingQuote.eta_max_days} días hábiles a {shippingQuote.zone.name}
                      </p>
                    )}
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
                    {deliveryMethod === "pickup" && selectedPickupBranch && (
                      <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-0.5">Retiro en</p>
                        <p>{selectedPickupBranch.name}</p>
                        <p className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {selectedPickupBranch.address}
                        </p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button
                      type="submit"
                      className="w-full gap-2"
                      size="lg"
                      disabled={!canSubmit}
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
