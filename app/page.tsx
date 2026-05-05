"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight, BookOpen, Puzzle, Truck, ShieldCheck,
  TrendingUp, ShoppingBag, AlertTriangle, Loader2, DollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import {
  getProducts, getOrdersReport, getLowStockReport, getRevenueReport,
  orderStatusLabels,
  type Product, type OrderReport, type LowStockItem, type RevenueReport,
} from "@/lib/api"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"

const STATUS_COLORS: Record<string, string> = {
  PENDING:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  SHIPPED:   "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })

export default function HomePage() {
  const { fetchCart } = useCart()
  const { user, token, isLoading: authLoading } = useAuth()

  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

  const [orders, setOrders] = useState<OrderReport[]>([])
  const [lowStock, setLowStock] = useState<LowStockItem[]>([])
  const [revenue, setRevenue] = useState<RevenueReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)

  const isAdmin = user?.role === "ADMIN"

  useEffect(() => {
    if (authLoading) return
    if (isAdmin && token) {
      setReportsLoading(true)
      Promise.all([
        getOrdersReport(token),
        getLowStockReport(token, 100),
        getRevenueReport(token),
      ])
        .then(([ordersData, lowStockData, revenueData]) => {
          setOrders(ordersData)
          setLowStock(lowStockData)
          setRevenue(revenueData)
        })
        .catch(console.error)
        .finally(() => setReportsLoading(false))
    } else if (!isAdmin) {
      setProductsLoading(true)
      getProducts(8, 0)
        .then((res) => setFeaturedProducts(res.data || []))
        .catch(console.error)
        .finally(() => setProductsLoading(false))
    }
  }, [isAdmin, authLoading, token])

  useEffect(() => {
    if (token) fetchCart()
  }, [token, fetchCart])

  const totalRevenue = revenue.reduce((sum, r) => sum + r.ingresos, 0)
  const totalOrders = revenue.reduce((sum, r) => sum + r.cantidad_ordenes, 0)

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

  // ── Admin Dashboard ──────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 bg-background py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl font-bold text-foreground mb-8">Panel de Administración</h1>

            {reportsLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-8">
                {/* KPI Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <DollarSign className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                        <p className="text-2xl font-bold text-foreground">{formatPrice(totalRevenue)}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Órdenes Totales</p>
                        <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Productos Bajo Stock</p>
                        <p className="text-2xl font-bold text-foreground">{lowStock.length}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Revenue + Low Stock */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Ingresos por Fecha
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-72 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 border-b border-border bg-card">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fecha</th>
                              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Órdenes</th>
                              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Ingresos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...revenue]
                              .sort((a, b) => b.fecha.localeCompare(a.fecha))
                              .map((row, i) => (
                                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/40">
                                  <td className="px-4 py-2.5 tabular-nums">{formatDate(row.fecha)}</td>
                                  <td className="px-4 py-2.5 text-right tabular-nums">{row.cantidad_ordenes}</td>
                                  <td className="px-4 py-2.5 text-right font-medium text-primary tabular-nums">
                                    {formatPrice(row.ingresos)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Productos con Bajo Stock
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-72 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 border-b border-border bg-card">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Producto</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Categoría</th>
                              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Stock</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...lowStock]
                              .sort((a, b) => a.stock - b.stock)
                              .map((item) => (
                                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                                  <td className="px-4 py-2.5">
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-xs text-muted-foreground">{item.sku}</div>
                                  </td>
                                  <td className="px-4 py-2.5 text-muted-foreground">{item.category || "—"}</td>
                                  <td className="px-4 py-2.5 text-right">
                                    <span
                                      className={`font-bold ${
                                        item.stock === 0
                                          ? "text-red-600"
                                          : item.stock <= 10
                                          ? "text-amber-600"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {item.stock}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Orders Table */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                      Órdenes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Número</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Productos</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Items</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...orders]
                            .sort((a, b) => b.created_at.localeCompare(a.created_at))
                            .map((order) => (
                              <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{order.order_number}</td>
                                <td className="px-4 py-3 text-muted-foreground">{order.email}</td>
                                <td className="px-4 py-3 max-w-[180px] truncate" title={order.productos}>{order.productos}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{order.cantidad_items}</td>
                                <td className="px-4 py-3 text-right font-medium text-primary tabular-nums">{formatPrice(order.total)}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                      STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {orderStatusLabels[order.status] ?? order.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                                  {formatDate(order.created_at)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // ── Client Homepage ──────────────────────────────────────────────────────
  const features = [
    { icon: BookOpen, title: "Gran Variedad", description: "Miles de libros y juguetes para todas las edades" },
    { icon: Truck, title: "Envío Rápido", description: "Entrega en todo el país" },
    { icon: ShieldCheck, title: "Compra Segura", description: "Pagos protegidos con MercadoPago" },
    { icon: Puzzle, title: "Calidad Garantizada", description: "Productos originales de las mejores marcas" },
  ]

  const categories = [
    { name: "Librería", description: "Literatura, educación y más", href: "/productos?categoria=Libreria", color: "bg-secondary" },
    { name: "Juguetería", description: "Diversión para todas las edades", href: "/productos?categoria=Jugueteria", color: "bg-accent" },
    { name: "Regalería", description: "El regalo perfecto para cada ocasión", href: "/productos?categoria=Regaleria", color: "bg-primary/10" },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-secondary py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
              <div className="max-w-xl text-center md:text-left">
                <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl text-balance">
                  Bienvenido a{" "}
                  <span className="text-primary">El Campeón</span>
                </h1>
                <p className="mt-4 text-lg text-muted-foreground text-pretty">
                  Tu librería y juguetería de confianza. Encontrá los mejores libros
                  y juguetes para toda la familia con los mejores precios.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
                  <Button size="lg" asChild>
                    <Link href="/productos">
                      Ver Productos
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/registro">Crear Cuenta</Link>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Image
                  src="/images/el-campeon-logo.png"
                  alt="El Campeón Logo"
                  width={320}
                  height={320}
                  className="drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex flex-col items-center text-center p-6 rounded-lg bg-background border border-border"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground">Nuestras Categorías</h2>
              <p className="mt-2 text-muted-foreground">Explorá nuestra amplia selección de productos</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={category.href}
                  className={`group relative overflow-hidden rounded-2xl ${category.color} p-8 transition-transform hover:scale-[1.02]`}
                >
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-secondary-foreground">{category.name}</h3>
                    <p className="mt-2 text-secondary-foreground/80">{category.description}</p>
                    <div className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                      Ver productos
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-16 bg-muted">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-foreground">Productos Destacados</h2>
                <p className="mt-2 text-muted-foreground">Los favoritos de nuestros clientes</p>
              </div>
              <Button variant="outline" asChild className="hidden sm:flex">
                <Link href="/productos">
                  Ver todos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {productsLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-card animate-pulse" />
                ))}
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {featuredProducts.slice(0, 4).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No hay productos disponibles en este momento.</p>
              </div>
            )}

            <div className="mt-8 text-center sm:hidden">
              <Button variant="outline" asChild>
                <Link href="/productos">
                  Ver todos los productos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold">¿Listo para comprar?</h2>
            <p className="mt-4 text-primary-foreground/80 max-w-2xl mx-auto">
              Registrate ahora y obtené acceso a ofertas exclusivas, precios mayoristas
              y envío gratis en tu primera compra.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/registro">Crear Cuenta Gratis</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link href="/productos">Explorar Productos</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
