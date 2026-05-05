"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Package, ChevronRight, Loader2, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { getMyOrders, orderStatusLabels, type Order } from "@/lib/api"

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  SHIPPED: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
}

export default function OrdersPage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function loadOrders() {
      if (!token) return

      try {
        const response = await getMyOrders(token)
        setOrders(response.data || [])
      } catch (error) {
        console.error("Error loading orders:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      loadOrders()
    }
  }, [token])

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
    })
  }

  if (authLoading) {
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-foreground mb-8">Mis Órdenes</h1>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground/40" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                No tenés órdenes todavía
              </h2>
              <p className="mt-2 text-muted-foreground">
                Cuando realices una compra, aparecerá aquí
              </p>
              <Button asChild className="mt-6">
                <Link href="/productos">Ver productos</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Link key={order.id} href={`/mis-ordenes/${order.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium">
                          {order.order_number}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={statusColors[order.status] || ""}
                        >
                          {orderStatusLabels[order.status] || order.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            {formatDate(order.created_at)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.items.length} producto{order.items.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-primary">
                            {formatPrice(order.total)}
                          </span>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Products preview */}
                      <div className="mt-4 flex -space-x-2">
                        {order.items.slice(0, 4).map((item, index) => (
                          <div
                            key={item.id}
                            className="relative h-10 w-10 rounded-full bg-muted border-2 border-card flex items-center justify-center overflow-hidden"
                            style={{ zIndex: 4 - index }}
                          >
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                        {order.items.length > 4 && (
                          <div className="relative h-10 w-10 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium text-muted-foreground">
                            +{order.items.length - 4}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
