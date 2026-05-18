"use client"

import Image from "next/image"
import Link from "next/link"
import {
  ShoppingCart, Package, Pencil, Trash2, Plus, Minus, Check,
  ChevronLeft, ChevronRight, Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { getVariantCombinations, type Product, type VariantCombination } from "@/lib/api"
import { useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"

interface ProductCardProps {
  product: Product
  onEdit?: (product: Product) => void
  onDelete?: (product: Product) => void
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const { addToCart } = useCart()
  const { user } = useAuth()
  const [isAdding, setIsAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [showSuccess, setShowSuccess] = useState(false)

  const [combinations, setCombinations] = useState<VariantCombination[]>([])
  const [comboIndex, setComboIndex] = useState(0)
  const [isLoadingCombos, setIsLoadingCombos] = useState(false)

  const [isHovered, setIsHovered] = useState(false)
  const [imageIndex, setImageIndex] = useState(0)

  const isAdmin = user?.role === "ADMIN"
  const currentCombo = combinations[comboIndex] ?? null

  const sortedImages = useMemo(
    () => [...(product.images ?? [])].sort((a, b) => a.display_order - b.display_order),
    [product.images]
  )
  // Only show carousel for non-variant products with multiple images
  const showImageCarousel = sortedImages.length > 1 && !product.has_variants

  useEffect(() => {
    if (!isHovered) setImageIndex(0)
  }, [isHovered])

  useEffect(() => {
    if (!product.has_variants) return
    setIsLoadingCombos(true)
    getVariantCombinations(product.id, 100)
      .then((res) => setCombinations(res.data.filter((c) => c.is_active)))
      .catch(() => setCombinations([]))
      .finally(() => setIsLoadingCombos(false))
  }, [product.id, product.has_variants])

  useEffect(() => {
    setQuantity(1)
    setShowSuccess(false)
  }, [comboIndex])

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [showSuccess])

  const handleAddToCart = async () => {
    setIsAdding(true)
    try {
      await addToCart(product.sku, quantity, {
        productId: product.id,
        productName: product.name,
        productImage: product.image_url ?? null,
        price: product.price_retail,
        hasVariants: false,
      })
      setShowSuccess(true)
      setQuantity(1)
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddVariantToCart = async (combo: VariantCombination) => {
    setIsAdding(true)
    try {
      await addToCart(combo.sku, quantity, {
        productId: product.id,
        productName: product.name,
        productImage: combo.image_url ?? product.image_url ?? null,
        price: combo.final_price,
        hasVariants: true,
      })
      setShowSuccess(true)
      setQuantity(1)
    } catch (error) {
      console.error("Error adding variant to cart:", error)
    } finally {
      setIsAdding(false)
    }
  }

  const prevCombo = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setComboIndex((i) => Math.max(0, i - 1))
  }

  const nextCombo = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setComboIndex((i) => Math.min(combinations.length - 1, i + 1))
  }

  const incrementQuantity = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const maxStock = currentCombo ? currentCombo.stock : product.stock
    if (maxStock === undefined || quantity < maxStock) {
      setQuantity((q) => q + 1)
    }
  }

  const decrementQuantity = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (quantity > 1) setQuantity((q) => q - 1)
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price)

  const isOutOfStock = !product.has_variants && product.stock !== undefined && product.stock <= 0
  const displayImage = (product.has_variants && currentCombo?.image_url)
    || sortedImages[imageIndex]?.image_url
    || product.image_url

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg flex flex-col">
      <Link href={`/productos/${product.id}`}>
        {/* group/img scopes the hover overlay to the image area only */}
        <div
          className="relative aspect-square overflow-hidden bg-muted group/img"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {showImageCarousel ? (
            <>
              {sortedImages.map((img, i) => (
                <Image
                  key={img.id}
                  src={img.image_url}
                  alt={product.name}
                  fill
                  className={cn(
                    "object-cover transition-opacity duration-400",
                    i === imageIndex ? "opacity-100" : "opacity-0"
                  )}
                />
              ))}

              {/* Left arrow */}
              <button
                className={cn(
                  "absolute left-1.5 top-1/2 z-20 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 shadow transition-opacity duration-150",
                  isHovered && imageIndex > 0 ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImageIndex((i) => Math.max(0, i - 1)) }}
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="h-4 w-4 text-foreground" />
              </button>

              {/* Right arrow */}
              <button
                className={cn(
                  "absolute right-1.5 top-1/2 z-20 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 shadow transition-opacity duration-150",
                  isHovered && imageIndex < sortedImages.length - 1 ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImageIndex((i) => Math.min(sortedImages.length - 1, i + 1)) }}
                aria-label="Imagen siguiente"
              >
                <ChevronRight className="h-4 w-4 text-foreground" />
              </button>

              {/* Dot indicators */}
              <div className={cn(
                "absolute bottom-2 left-0 right-0 z-20 flex justify-center gap-1 transition-opacity duration-150",
                isHovered ? "opacity-100" : "opacity-0"
              )}>
                {sortedImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImageIndex(i) }}
                    className={cn(
                      "h-1.5 rounded-full drop-shadow transition-all duration-200",
                      i === imageIndex ? "w-4 bg-white" : "w-1.5 bg-white/65"
                    )}
                    aria-label={`Ir a imagen ${i + 1}`}
                  />
                ))}
              </div>
            </>
          ) : displayImage ? (
            <Image
              src={displayImage}
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
            <Badge variant="secondary" className="absolute left-2 top-2">
              {product.category}
            </Badge>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Badge variant="destructive">Sin Stock</Badge>
            </div>
          )}

          {/* Variant hover overlay — slides up from below on image hover */}
          {!isAdmin && !isLoadingCombos && combinations.length > 0 && currentCombo && (
            <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover/img:translate-y-0 transition-transform duration-300 ease-out bg-background/95 backdrop-blur-sm border-t border-border">
              <div className="flex items-center gap-1 px-2 pt-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={prevCombo}
                  disabled={comboIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0 text-center">
                  <div className="flex flex-wrap justify-center gap-1">
                    {Object.entries(currentCombo.variant_combination).map(([k, v]) => (
                      <Badge key={k} variant="secondary" className="text-xs font-normal">
                        {k}: {v}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={nextCombo}
                  disabled={comboIndex === combinations.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {combinations.length > 1 && (
                <div className="flex justify-center gap-1 py-2">
                  {combinations.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.preventDefault(); setComboIndex(i) }}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-200",
                        i === comboIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/40"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {isAdmin && (
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit?.(product) }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(product) }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </Link>

      <CardContent className="p-4 flex-1">
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
            {formatPrice(
              product.has_variants && currentCombo
                ? currentCombo.final_price
                : product.price_retail
            )}
          </span>
          {!product.has_variants && product.price_wholesale && product.min_bulk_quantity && (
            <span className="text-xs text-muted-foreground">
              {formatPrice(product.price_wholesale)} x{product.min_bulk_quantity}+
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        {product.has_variants ? (
          isLoadingCombos ? (
            <div className="flex w-full items-center justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : combinations.length > 0 && currentCombo ? (
            <div className="w-full space-y-2">
              {/* Carousel row */}
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={prevCombo}
                  disabled={comboIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex-1 min-w-0 text-center space-y-1">
                  <div className="flex flex-wrap justify-center gap-1">
                    {Object.entries(currentCombo.variant_combination).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="text-xs font-normal">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                  {currentCombo.stock > 0 ? (
                    <p className="text-xs text-muted-foreground">Stock: {currentCombo.stock}</p>
                  ) : (
                    <p className="text-xs text-destructive font-medium">Sin stock</p>
                  )}
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={nextCombo}
                  disabled={comboIndex === combinations.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {combinations.length > 1 && (
                <div className="flex justify-center gap-1">
                  {combinations.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.preventDefault(); setComboIndex(i) }}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-200",
                        i === comboIndex ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
              )}

              {currentCombo.stock <= 0 ? (
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
                      handleAddVariantToCart(currentCombo)
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
                    disabled={quantity >= currentCombo.stock}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <Button asChild className="w-full gap-2" variant="outline">
              <Link href={`/productos/${product.id}`}>Ver opciones</Link>
            </Button>
          )
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
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToCart() }}
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
