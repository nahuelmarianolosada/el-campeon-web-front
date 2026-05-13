"use client"

import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Package, Pencil, Trash2, Plus, Minus, Check, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import type { Product } from "@/lib/api"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface ProductCardProps {
  product: Product
  onEdit?: (product: Product) => void
  onDelete?: (product: Product) => void
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const { addToCart } = useCart()
  const { user } = useAuth()
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [showSuccess, setShowSuccess] = useState(false)

  const isAdmin = user?.role === "ADMIN"

  // Reset success state after animation
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [showSuccess])

  const handleAddToCart = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    setIsAdding(true)
    try {
      await addToCart(product.sku, quantity)
      setShowSuccess(true)
      setQuantity(1) // Reset quantity after adding
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setIsAdding(false)
    }
  }

  const incrementQuantity = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (product.stock === undefined || quantity < product.stock) {
      setQuantity((q) => q + 1)
    }
  }

  const decrementQuantity = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (quantity > 1) {
      setQuantity((q) => q - 1)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  const isOutOfStock = !product.has_variants && product.stock !== undefined && product.stock <= 0

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <Link href={`/productos/${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}
          {product.category && (
            <Badge
              variant="secondary"
              className="absolute left-2 top-2"
            >
              {product.category}
            </Badge>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Badge variant="destructive">Sin Stock</Badge>
            </div>
          )}
          {/* Admin actions */}
          {isAdmin && (
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onEdit?.(product)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDelete?.(product)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Link>

      <CardContent className="p-4">
        <Link href={`/productos/${product.id}`}>
          <h3 className="font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        {product.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">
            {formatPrice(product.price_retail)}
          </span>
          {product.price_wholesale && product.min_bulk_quantity && (
            <span className="text-xs text-muted-foreground">
              {formatPrice(product.price_wholesale)} x{product.min_bulk_quantity}+
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        {product.has_variants ? (
          <Button asChild className="w-full gap-2" variant="outline">
            <Link href={`/productos/${product.id}`}>
              <Layers className="h-4 w-4" />
              Ver opciones
            </Link>
          </Button>
        ) : isOutOfStock ? (
          <Button disabled className="w-full" variant="secondary">
            Sin Stock
          </Button>
        ) : !isAdmin ? (
          <div className="flex w-full" role="group">
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0 rounded-r-none border-r-0"
              onClick={decrementQuantity}
              disabled={quantity <= 1}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleAddToCart()
              }}
              disabled={isAdding}
              className={cn(
                "flex-1 gap-2 rounded-none transition-all duration-300",
                showSuccess && "bg-green-600 hover:bg-green-600"
              )}
            >
              {showSuccess ? (
                <>
                  <Check className="h-4 w-4 animate-in zoom-in duration-200" />
                  <span className="animate-in fade-in duration-200">Agregado</span>
                </>
              ) : isAdding ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Agregando...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  {quantity > 1 ? `Agregar (${quantity})` : "Agregar"}
                </>
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0 rounded-l-none border-l-0"
              onClick={incrementQuantity}
              disabled={product.stock !== undefined && quantity >= product.stock}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ) : null}
      </CardFooter>
    </Card>
  )
}
