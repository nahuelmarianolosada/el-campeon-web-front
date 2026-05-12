"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Package,
  Loader2,
  MapPin,
  CheckCircle,
  Clock,
  Truck,
  Home,
  XCircle,
  Store,
  Banknote,
  CreditCard,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import {
  getOrderById,
  getPaymentByOrderId,
  orderStatusLabels,
  paymentStatusLabels,
  paymentMethodLabels,
  deliveryMethodLabels,
  type Order,
  type Payment,
} from "@/lib/api"

const orderStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  SHIPPED: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
}

const orderStatusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-5 w-5" />,
  CONFIRMED: <CheckCircle className="h-5 w-5" />,
  SHIPPED: <Truck className="h-5 w-5" />,
  DELIVERED: <Home className="h-5 w-5" />,
  CANCELLED: <XCircle className="h-5 w-5" />,
}

const paymentStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
  REFUNDED: "bg-purple-100 text-purple-800 border-purple-200",
}

function OrderDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = Number(params.id)
  const isNew = searchParams.get("success") === "true"

  const { user, token, isLoading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function load() {
      if (!token || !orderId) return
      try {
        const [orderData, paymentData] = await Promise.all([
          getOrderById(token, orderId),
          getPaymentByOrderId(token, orderId).catch(() => null),
        ])
        setOrder(orderData)
        setPayment(paymentData)
      } catch {
        setError("No se pudo cargar la orden")
      } finally {
        setIsLoading(false)
      }
    }
    if (token) load()
  }, [token, orderId])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  if (authLoading || isLoading) {
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

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <Package className="h-16 w-16 text-muted-foreground/40" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            {error || "Orden no encontrada"}
          </h1>
          <Button asChild className="mt-6">
            <Link href="/mis-ordenes">Ver mis órdenes</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  const isCashPending = payment?.payment_method === "CASH" && payment?.status === "PENDING"
  const isMpPending =
    payment?.payment_method !== "CASH" &&
    payment?.status === "PENDING"
  const isApproved = payment?.status === "APPROVED"
  const isRejected = payment?.status === "REJECTED"

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          <Link
            href="/mis-ordenes"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a mis órdenes
          </Link>

          {/* Payment-status-aware banners */}
          {isApproved && (
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800">¡Pedido realizado con éxito!</p>
                <p className="text-sm text-green-700">
                  El pago fue aprobado. Te enviamos un email con los detalles de tu compra.
                </p>
              </div>
            </div>
          )}

          {isCashPending && payment && (
            <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <Banknote className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Pagá en efectivo con este código</p>
                <p className="mt-1 text-sm text-amber-700">
                  Presentá el siguiente código en cualquier sucursal de{" "}
                  <span className="font-semibold">Pago Fácil</span> o{" "}
                  <span className="font-semibold">Rapipago</span>:
                </p>
                <p className="mt-2 font-mono text-lg font-bold tracking-widest text-amber-900 bg-amber-100 rounded px-3 py-1 inline-block">
                  {payment.transaction_id}
                </p>
              </div>
            </div>
          )}

          {isMpPending && isNew && (
            <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-600 shrink-0" />
              <div>
                <p className="font-semibold text-blue-800">Tu pedido fue recibido</p>
                <p className="text-sm text-blue-700">
                  Completá el pago en Mercado Pago para confirmar tu compra. El pedido se procesará una vez aprobado el pago.
                </p>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
              <div>
                <p className="font-semibold text-red-800">El pago fue rechazado</p>
                <p className="text-sm text-red-700">
                  {payment?.rejected_reason || "Por favor contactanos o intentá con otro método de pago."}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 mb-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{order.order_number}</h1>
              <p className="text-muted-foreground">{formatDate(order.created_at)}</p>
            </div>
            <Badge
              variant="outline"
              className={`${orderStatusColors[order.status] || ""} flex items-center gap-2 px-3 py-1.5`}
            >
              {orderStatusIcons[order.status]}
              {orderStatusLabels[order.status] || order.status}
            </Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Order Items */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Productos ({order.items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
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
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} x {formatPrice(item.price)}
                          </p>
                        </div>
                        <p className="font-medium text-foreground">{formatPrice(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA</span>
                      <span>{formatPrice(order.tax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Payment info */}
              {payment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Estado</span>
                      <Badge
                        variant="outline"
                        className={paymentStatusColors[payment.status] || ""}
                      >
                        {paymentStatusLabels[payment.status] || payment.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Método</span>
                      <span className="text-sm font-medium text-right max-w-[60%]">
                        {paymentMethodLabels[payment.payment_method] || payment.payment_method}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Monto</span>
                      <span className="text-sm font-semibold text-primary">
                        {formatPrice(payment.amount)}
                      </span>
                    </div>
                    {payment.approved_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Aprobado</span>
                        <span className="text-sm">{formatDate(payment.approved_at)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">ID transacción</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {payment.transaction_id}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Delivery info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {order.delivery_method === "shipping" ? (
                      <Truck className="h-5 w-5" />
                    ) : (
                      <Store className="h-5 w-5" />
                    )}
                    {order.delivery_method
                      ? deliveryMethodLabels[order.delivery_method]
                      : "Dirección de Envío"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {order.shipping_address.street}
                  </p>
                  <p className="text-muted-foreground pl-5">
                    {order.shipping_address.city}, {order.shipping_address.postal_code}
                  </p>
                  <p className="text-muted-foreground pl-5">{order.shipping_address.country}</p>
                </CardContent>
              </Card>

              {/* Notes */}
              {order.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{order.notes}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col gap-3">
                <Button variant="outline" asChild>
                  <Link href="/productos">Seguir comprando</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    }>
      <OrderDetailContent />
    </Suspense>
  )
}
