"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import {
  CheckCircle,
  Clock,
  Package,
  Banknote,
  MapPin,
  Truck,
  Store,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { type Order, type Payment, type GuestContactInfo, deliveryMethodLabels } from "@/lib/api"

interface GuestOrderConfirmation {
  order: Order & { guest_token?: string }
  payment: Payment
  guestInfo: GuestContactInfo
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  MP_SAVED: "Mercado Pago",
  MP_INSTALLMENTS: "Cuotas Mercado Pago",
  MP_CARD: "Tarjeta via Mercado Pago",
  CASH: "Efectivo (Pago Fácil / Rapipago)",
}

const DELIVERY_ICONS: Record<string, React.ReactNode> = {
  shipping: <Truck className="h-5 w-5 shrink-0" />,
  "pickup-libreria": <Store className="h-5 w-5 shrink-0" />,
  "pickup-jugueteria": <Store className="h-5 w-5 shrink-0" />,
}

function PedidoConfirmadoContent() {
  const searchParams = useSearchParams()
  const [confirmation, setConfirmation] = useState<GuestOrderConfirmation | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("guest_order_confirmation")
      if (!raw) { setNotFound(true); return }
      setConfirmation(JSON.parse(raw))
    } catch {
      setNotFound(true)
    }
  }, [searchParams])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price)

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <Package className="h-16 w-16 text-muted-foreground/40" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">No encontramos tu pedido</h1>
          <p className="mt-2 text-muted-foreground">
            No hay información de confirmación disponible.
          </p>
          <Button asChild className="mt-6">
            <Link href="/productos">Ver productos</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  if (!confirmation) return null

  const { order, payment, guestInfo } = confirmation
  const items = order.items ?? []
  const isCash = payment.payment_method === "CASH"
  const isMpPending = payment.payment_method !== "CASH" && payment.status === "PENDING"

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            href="/productos"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Seguir comprando
          </Link>

          {/* Success / payment banners */}
          {isCash ? (
            <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <Banknote className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">¡Pedido confirmado! Pagá en efectivo</p>
                <p className="mt-1 text-sm text-amber-700">
                  Presentá este código en cualquier sucursal de{" "}
                  <span className="font-semibold">Pago Fácil</span> o{" "}
                  <span className="font-semibold">Rapipago</span>:
                </p>
                <p className="mt-2 font-mono text-lg font-bold tracking-widest text-amber-900 bg-amber-100 rounded px-3 py-1 inline-block">
                  {payment.transaction_id}
                </p>
              </div>
            </div>
          ) : isMpPending ? (
            <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-blue-800">¡Pedido recibido!</p>
                <p className="text-sm text-blue-700">
                  Completá el pago en la ventana de Mercado Pago. Te enviaremos la confirmación a{" "}
                  <span className="font-semibold">{guestInfo.email}</span>.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">¡Pedido confirmado con éxito!</p>
                <p className="text-sm text-green-700">
                  Te enviamos los detalles a <span className="font-semibold">{guestInfo.email}</span>.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              Pedido #{order.order_number}
            </h1>
            <Badge variant="secondary" className="text-sm">
              {order.status}
            </Badge>
          </div>

          <div className="space-y-6">
            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle>Productos ({items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item) => (
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
                      <p className="font-medium">{formatPrice(item.subtotal)}</p>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IVA (21%)</span>
                    <span>{formatPrice(order.tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Delivery */}
              <Card>
                <CardHeader>
                  <CardTitle>Entrega</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    {DELIVERY_ICONS[order.delivery_method]}
                    <span>{deliveryMethodLabels[order.delivery_method] ?? order.delivery_method}</span>
                  </div>
                  {order.delivery_method === "shipping" && order.shipping_address && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        {order.shipping_address.street}, {order.shipping_address.city},{" "}
                        {order.shipping_address.postal_code}, {order.shipping_address.country}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment */}
              <Card>
                <CardHeader>
                  <CardTitle>Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">
                    {PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method}
                  </p>
                  <p className="text-muted-foreground">{formatPrice(payment.amount)}</p>
                  {isCash && (
                    <p className="font-mono font-bold text-amber-800 bg-amber-50 rounded px-2 py-0.5 inline-block">
                      {payment.transaction_id}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Contact info */}
            <Card>
              <CardHeader>
                <CardTitle>Datos de contacto</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1 text-muted-foreground">
                <p><span className="font-medium text-foreground">Nombre:</span> {guestInfo.name}</p>
                <p><span className="font-medium text-foreground">Email:</span> {guestInfo.email}</p>
                {guestInfo.phone && (
                  <p><span className="font-medium text-foreground">Teléfono:</span> {guestInfo.phone}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link href="/productos">Seguir comprando</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function PedidoConfirmadoPage() {
  return (
    <Suspense fallback={null}>
      <PedidoConfirmadoContent />
    </Suspense>
  )
}
