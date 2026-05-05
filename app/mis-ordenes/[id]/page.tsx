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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { getOrderById, orderStatusLabels, type Order } from "@/lib/api"

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  SHIPPED: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
}

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-5 w-5" />,
  CONFIRMED: <CheckCircle className="h-5 w-5" />,
  SHIPPED: <Truck className="h-5 w-5" />,
  DELIVERED: <Home className="h-5 w-5" />,
  CANCELLED: <XCircle className="h-5 w-5" />,
}

function OrderDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = Number(params.id)
  const isSuccess = searchParams.get("success") === "true"

  const { user, token, isLoading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function loadOrder() {
      if (!token || !orderId) return

      try {
        const data = await getOrderById(token, orderId)
        setOrder(data)
      } catch (err) {
        setError("No se pudo cargar la orden")
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      loadOrder()
    }
  }, [token, orderId])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

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

          {isSuccess && (
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800">
                  ¡Pedido realizado con éxito!
                </p>
                <p className="text-sm text-green-700">
                  Te enviamos un email con los detalles de tu compra.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 mb-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {order.order_number}
              </h1>
              <p className="text-muted-foreground">
                {formatDate(order.created_at)}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`${statusColors[order.status] || ""} flex items-center gap-2 px-3 py-1.5`}
            >
              {statusIcons[order.status]}
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
                          <p className="font-medium text-foreground">
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

            {/* Order Details */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Dirección de Envío
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground">{order.shipping_address.street}</p>
                  <p className="text-muted-foreground">
                    {order.shipping_address.city}, {order.shipping_address.postal_code}
                  </p>
                  <p className="text-muted-foreground">{order.shipping_address.country}</p>
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

              {/* Actions */}
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
