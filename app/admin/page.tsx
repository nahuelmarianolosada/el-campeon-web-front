"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Loader2,
  ClipboardList,
  Store,
  Truck,
  FileSpreadsheet,
  Package,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"

interface AdminSection {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
}

const SECTIONS: AdminSection[] = [
  {
    title: "Gestión de Órdenes",
    description: "Ver, filtrar y actualizar el estado de las órdenes y pagos.",
    href: "/admin/ordenes",
    icon: ClipboardList,
    accent: "bg-blue-50 text-blue-700",
  },
  {
    title: "Sucursales",
    description: "Alta y edición de sucursales, marca de puntos de retiro.",
    href: "/admin/sucursales",
    icon: Store,
    accent: "bg-amber-50 text-amber-700",
  },
  {
    title: "Zonas y tarifas de envío",
    description: "Configurá zonas, códigos postales y tarifas (costo, ETA, envío gratis) por sucursal origen.",
    href: "/admin/envios",
    icon: Truck,
    accent: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Importar Productos",
    description: "Carga masiva de productos desde Excel o CSV.",
    href: "/productos?import=1",
    icon: FileSpreadsheet,
    accent: "bg-rose-50 text-rose-700",
  },
  {
    title: "Stock por sucursal",
    description: "Editá el stock de un producto puntual desde Productos → ⋮ → Stock por sucursal.",
    href: "/productos",
    icon: Package,
    accent: "bg-slate-50 text-slate-700",
  },
]

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!user || user.role !== "ADMIN") router.push("/")
  }, [isLoading, user, router])

  if (isLoading || !user) {
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
        <div className="container mx-auto px-4 max-w-5xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Panel de administración</h1>
            <p className="text-muted-foreground mt-1">
              Configurá las opciones operativas de la tienda: órdenes, sucursales y envíos.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              return (
                <Link key={s.href} href={s.href}>
                  <Card className="transition-colors hover:border-primary cursor-pointer group h-full">
                    <CardContent className="flex items-start gap-4 p-5">
                      <div className={`shrink-0 rounded-md p-2.5 ${s.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-foreground flex items-center justify-between">
                          {s.title}
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
