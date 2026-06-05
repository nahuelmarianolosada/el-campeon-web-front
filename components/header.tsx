"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { ShoppingCart, User, Menu, X, LogOut, Package, Search, ClipboardList, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"

export function Header() {
  const { user, logout } = useAuth()
  const { cart, cartItemCount } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const cartTotal = cart?.total ?? 0
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price)

  const navLinks = [
    { href: "/productos", label: "Productos" },
    { href: "/productos?categoria=Libreria", label: "Librería" },
    { href: "/productos?categoria=Jugueteria", label: "Juguetería" },
    { href: "/productos?categoria=Regaleria", label: "Regalería" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/el-campeon-logo.png"
            alt="El Campeón - Librería y Juguetería"
            width={48}
            height={48}
            className="rounded-full"
          />
          <span className="hidden font-bold text-lg text-primary sm:inline-block">
            El Campeón
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Search button */}
          <Button variant="ghost" size="icon" className="hidden sm:flex" asChild>
            <Link href="/productos">
              <Search className="h-5 w-5" />
              <span className="sr-only">Buscar</span>
            </Link>
          </Button>

          {/* Cart */}
          {cartItemCount > 0 ? (
            <Button variant="ghost" className="relative h-10 px-2 gap-1.5" asChild>
              <Link href="/carrito">
                <ShoppingCart className="h-5 w-5 shrink-0" />
                <span className="text-xs font-semibold tabular-nums">{formatPrice(cartTotal)}</span>
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-accent text-accent-foreground">
                  {cartItemCount}
                </Badge>
                <span className="sr-only">Carrito</span>
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link href="/carrito">
                <ShoppingCart className="h-5 w-5" />
                <span className="sr-only">Carrito</span>
              </Link>
            </Button>
          )}

          {/* User menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Menú de usuario</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.first_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/mis-ordenes" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Mis Órdenes
                  </Link>
                </DropdownMenuItem>
                {user?.role === "ADMIN" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin/ordenes" className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Gestión de Órdenes
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/productos?import=1" className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Importar Productos
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" size="sm" asChild>
              <Link href="/login">Ingresar</Link>
            </Button>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Menú</span>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-border bg-card p-4">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
