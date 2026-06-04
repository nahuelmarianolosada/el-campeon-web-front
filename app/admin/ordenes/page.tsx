"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Loader2,
  Search,
  RefreshCw,
  ExternalLink,
  ClipboardList,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import {
  getOrdersReport,
  getPaymentByOrderId,
  updateOrderStatus,
  updatePaymentStatus,
  orderStatusLabels,
  paymentStatusLabels,
  paymentStatusTransitions,
  paymentMethodLabels,
  type OrderReport,
  type Payment,
} from "@/lib/api"

interface OrderWithPayment {
  order: OrderReport
  payment: Payment | null
}

const ORDER_STATUS_LIST = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]

const orderStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  SHIPPED: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
}

const paymentStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  APPROVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
  REFUNDED: "bg-purple-100 text-purple-800 border-purple-200",
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n)

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

export default function AdminOrdenesPage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading } = useAuth()

  const [data, setData] = useState<OrderWithPayment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL")
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [updatingPaymentId, setUpdatingPaymentId] = useState<number | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const isAdmin = user?.role === "ADMIN"

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push("/")
    }
  }, [user, isAdmin, authLoading, router])

  async function loadData() {
    if (!token) return
    setIsLoading(true)
    try {
      const orders = await getOrdersReport(token)
      const paymentResults = await Promise.allSettled(
        orders.map((o) => getPaymentByOrderId(token, o.id))
      )
      setData(
        orders.map((order, i) => ({
          order,
          payment:
            paymentResults[i].status === "fulfilled"
              ? (paymentResults[i] as PromiseFulfilledResult<Payment>).value
              : null,
        }))
      )
    } catch (err) {
      console.error("Error loading admin orders:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token && isAdmin) loadData()
  }, [token, isAdmin])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return data.filter(({ order, payment }) => {
      const matchesSearch =
        !q ||
        order.order_number.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q) ||
        order.productos.toLowerCase().includes(q)
      const matchesOrderStatus =
        orderStatusFilter === "ALL" || order.status === orderStatusFilter
      const matchesPaymentStatus =
        paymentStatusFilter === "ALL" || payment?.status === paymentStatusFilter
      return matchesSearch && matchesOrderStatus && matchesPaymentStatus
    })
  }, [data, searchQuery, orderStatusFilter, paymentStatusFilter])

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    if (!token) return
    setUpdatingId(orderId)
    setUpdateError(null)
    try {
      await updateOrderStatus(token, orderId, newStatus)
      setData((prev) =>
        prev.map(({ order, payment }) =>
          order.id === orderId
            ? { order: { ...order, status: newStatus }, payment }
            : { order, payment }
        )
      )
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Error al actualizar")
    } finally {
      setUpdatingId(null)
    }
  }

  const handlePaymentStatusUpdate = async (
    orderId: number,
    paymentId: number,
    newStatus: string
  ) => {
    if (!token) return
    setUpdatingPaymentId(paymentId)
    setUpdateError(null)
    try {
      const updated = await updatePaymentStatus(token, paymentId, newStatus)
      setData((prev) =>
        prev.map(({ order, payment }) => {
          if (order.id !== orderId) return { order, payment }
          const nextOrder =
            newStatus === "APPROVED" ? { ...order, status: "CONFIRMED" } : order
          return { order: nextOrder, payment: updated }
        })
      )
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Error al actualizar el pago")
    } finally {
      setUpdatingPaymentId(null)
    }
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

  if (!isAdmin) return null

  const totalRevenue = data.reduce((s, { order }) => s + order.total, 0)
  const approvedCount = data.filter(({ payment }) => payment?.status === "APPROVED").length
  const pendingPaymentCount = data.filter(({ payment }) => payment?.status === "PENDING").length

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4">
          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestión de Órdenes y Pagos</h1>
                <p className="text-sm text-muted-foreground">{data.length} órdenes en total</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>

          {/* KPI summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total facturado</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{formatPrice(totalRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pagos aprobados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pagos pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-600">{pendingPaymentCount}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por # orden, cliente o producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado de orden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                {ORDER_STATUS_LIST.map((s) => (
                  <SelectItem key={s} value={s}>
                    {orderStatusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los pagos</SelectItem>
                {Object.entries(paymentStatusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {updateError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {updateError}
            </div>
          )}

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  No se encontraron órdenes con los filtros aplicados.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead># Orden</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado Orden</TableHead>
                      <TableHead>Estado Pago</TableHead>
                      <TableHead>Método Pago</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(({ order, payment }) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell className="max-w-[140px]">
                          <span className="block truncate text-sm">{order.email}</span>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <span className="block truncate text-sm text-muted-foreground">
                            {order.productos}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {order.cantidad_items} ítem{order.cantidad_items !== 1 ? "s" : ""}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatPrice(order.total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-xs ${orderStatusColors[order.status] || ""}`}
                            >
                              {orderStatusLabels[order.status] || order.status}
                            </Badge>
                            <Select
                              value={order.status}
                              onValueChange={(val) => handleStatusUpdate(order.id, val)}
                              disabled={updatingId === order.id}
                            >
                              <SelectTrigger className="h-7 text-xs w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ORDER_STATUS_LIST.map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs">
                                    {orderStatusLabels[s]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment ? (
                            (() => {
                              const allowed = paymentStatusTransitions[payment.status] ?? []
                              const canEdit = allowed.length > 0
                              return (
                                <div className="flex flex-col gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${paymentStatusColors[payment.status] || ""}`}
                                  >
                                    {paymentStatusLabels[payment.status] || payment.status}
                                  </Badge>
                                  {canEdit && (
                                    <Select
                                      value={payment.status}
                                      onValueChange={(val) =>
                                        val !== payment.status &&
                                        handlePaymentStatusUpdate(order.id, payment.id, val)
                                      }
                                      disabled={updatingPaymentId === payment.id}
                                    >
                                      <SelectTrigger className="h-7 text-xs w-36">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem
                                          value={payment.status}
                                          className="text-xs"
                                          disabled
                                        >
                                          {paymentStatusLabels[payment.status] || payment.status}
                                        </SelectItem>
                                        {allowed.map((s) => (
                                          <SelectItem key={s} value={s} className="text-xs">
                                            {paymentStatusLabels[s] || s}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              )
                            })()
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {payment
                            ? paymentMethodLabels[payment.payment_method] || payment.payment_method
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(order.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <Link href={`/mis-ordenes/${order.id}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span className="sr-only">Ver orden</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <p className="mt-3 text-xs text-muted-foreground text-right">
            Mostrando {filtered.length} de {data.length} órdenes
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
