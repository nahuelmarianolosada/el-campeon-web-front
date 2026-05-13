"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Package, ChevronRight, Loader2, ShoppingBag, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import { getMyOrders, orderStatusLabels, type Order } from "@/lib/api"

const PAGE_SIZE = 5

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  SHIPPED: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
}

const ALL_STATUSES = "ALL"

function buildPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | "ellipsis")[] = [1]

  if (current > 3) pages.push("ellipsis")

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push("ellipsis")

  pages.push(total)
  return pages
}

export default function OrdersPage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function loadOrders() {
      if (!token) return
      try {
        const response = await getMyOrders(token, 100, 0)
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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === ALL_STATUSES || order.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  function clearFilters() {
    setSearchQuery("")
    setStatusFilter(ALL_STATUSES)
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== ALL_STATUSES

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

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
            <>
              {/* Search & filters */}
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Buscar por número de orden…"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={statusFilter} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_STATUSES}>Todos los estados</SelectItem>
                    {Object.entries(orderStatusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
                    <X className="h-3.5 w-3.5" />
                    Limpiar
                  </Button>
                )}
              </div>

              {/* Result count */}
              <p className="mb-4 text-sm text-muted-foreground">
                {filteredOrders.length === orders.length
                  ? `${orders.length} orden${orders.length !== 1 ? "es" : ""}`
                  : `${filteredOrders.length} de ${orders.length} órdenes`}
              </p>

              {filteredOrders.length === 0 ? (
                <div className="py-16 text-center">
                  <Search className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <h2 className="mt-4 text-base font-semibold text-foreground">
                    Sin resultados
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Probá ajustando el filtro o la búsqueda
                  </p>
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Limpiar filtros
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {paginatedOrders.map((order) => (
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                if (safePage > 1) setCurrentPage(safePage - 1)
                              }}
                              aria-disabled={safePage === 1}
                              className={safePage === 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>

                          {buildPageNumbers(safePage, totalPages).map((page, idx) =>
                            page === "ellipsis" ? (
                              <PaginationItem key={`ellipsis-${idx}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            ) : (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  href="#"
                                  isActive={page === safePage}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    setCurrentPage(page)
                                  }}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            )
                          )}

                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                if (safePage < totalPages) setCurrentPage(safePage + 1)
                              }}
                              aria-disabled={safePage === totalPages}
                              className={safePage === totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>

                      <p className="mt-2 text-center text-xs text-muted-foreground">
                        Página {safePage} de {totalPages}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
