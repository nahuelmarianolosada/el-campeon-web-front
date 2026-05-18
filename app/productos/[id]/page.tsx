"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft, ShoppingCart, Package, Minus, Plus, Loader2,
  Pencil, Trash2, Check, Layers, ChevronLeft, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductFormModal } from "@/components/product-form-modal"
import { DeleteProductDialog } from "@/components/delete-product-dialog"
import { ProductVariantsManager } from "@/components/product-variants-manager"
import {
  getProductById,
  getVariantCombinations,
  type Product,
  type VariantCombination,
} from "@/lib/api"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = Number(params.id)

  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const [combinations, setCombinations] = useState<VariantCombination[]>([])
  const [comboIndex, setComboIndex] = useState(0)
  const [variantQuantity, setVariantQuantity] = useState(1)
  const [detailImageIndex, setDetailImageIndex] = useState(0)

  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const { addToCart, fetchCart } = useCart()
  const { user, token } = useAuth()

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const isAdmin = user?.role === "ADMIN"

  useEffect(() => {
    if (!productId) return
    setIsLoading(true)
    getProductById(productId)
      .then(setProduct)
      .catch(() => setError("Producto no encontrado"))
      .finally(() => setIsLoading(false))
  }, [productId])

  useEffect(() => {
    if (token) fetchCart()
  }, [token, fetchCart])

  useEffect(() => {
    if (!product) return
    getVariantCombinations(product.id, 100)
      .then((res) => setCombinations((res?.data ?? []).filter((c) => c.is_active)))
      .catch(console.error)
  }, [product])

  // Reset per-combo quantity when navigating the carousel
  useEffect(() => {
    setVariantQuantity(1)
    setShowSuccess(false)
  }, [comboIndex])

  useEffect(() => {
    if (showSuccess) {
      const t = setTimeout(() => setShowSuccess(false), 1500)
      return () => clearTimeout(t)
    }
  }, [showSuccess])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price)

  const hasVariants = (product?.has_variants ?? false) || combinations.length > 0
  const currentCombo = combinations[comboIndex] ?? null

  const sortedProductImages = useMemo(
    () => [...(product?.images ?? [])].sort((a, b) => a.display_order - b.display_order),
    [product?.images]
  )
  const showProductImageNav = sortedProductImages.length > 1 && !currentCombo?.image_url

  // Variant combo image takes priority; otherwise navigate the product images array
  const displayImage = currentCombo?.image_url
    || sortedProductImages[detailImageIndex]?.image_url
    || product?.image_url

  const effectiveIsOutOfStock = hasVariants
    ? combinations.every((c) => c.stock <= 0)
    : product?.stock !== undefined && product.stock <= 0
  const effectiveStock = hasVariants ? null : product?.stock ?? null

  const handleAddSimpleToCart = async () => {
    if (!product) return
    setIsAddingToCart(true)
    try {
      await addToCart(product.sku, quantity, {
        productId: product.id,
        productName: product.name,
        productImage: product.image_url ?? null,
        price: product.price_retail,
        hasVariants: false,
      })
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        router.push("/carrito")
      }, 1000)
    } catch (err) {
      console.error("Error adding to cart:", err)
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleAddVariantToCart = async () => {
    if (!product || !currentCombo) return
    setIsAddingToCart(true)
    try {
      await addToCart(currentCombo.sku, variantQuantity, {
        productId: product.id,
        productName: product.name,
        productImage: currentCombo.image_url ?? product.image_url ?? null,
        price: currentCombo.final_price,
        hasVariants: true,
      })
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        router.push("/carrito")
      }, 1000)
    } catch (err) {
      console.error("Error adding variant to cart:", err)
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleProductUpdate = async () => {
    if (productId) setProduct(await getProductById(productId))
  }

  const handleProductDelete = () => router.push("/productos")

  if (isLoading) {
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

  if (error || !product) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <Package className="h-16 w-16 text-muted-foreground/40" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            {error || "Producto no encontrado"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            El producto que buscás no existe o fue eliminado
          </p>
          <Button asChild className="mt-6">
            <Link href="/productos">Ver todos los productos</Link>
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
            href="/productos"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a productos
          </Link>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Product / variant image */}
            <div className="flex flex-col gap-3">
              <Card className="overflow-hidden">
                <div className="relative aspect-square bg-muted">
                  {displayImage ? (
                    <Image
                      src={displayImage}
                      alt={product.name}
                      fill
                      className="object-cover transition-opacity duration-300"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-24 w-24 text-muted-foreground/40" />
                    </div>
                  )}
                  {effectiveIsOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                      <Badge variant="destructive" className="text-lg px-4 py-2">
                        Sin Stock
                      </Badge>
                    </div>
                  )}
                  {/* Navigation arrows */}
                  {showProductImageNav && (
                    <>
                      <button
                        onClick={() => setDetailImageIndex((i) => Math.max(0, i - 1))}
                        disabled={detailImageIndex === 0}
                        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md transition-opacity disabled:opacity-25 hover:bg-white"
                        aria-label="Imagen anterior"
                      >
                        <ChevronLeft className="h-5 w-5 text-foreground" />
                      </button>
                      <button
                        onClick={() => setDetailImageIndex((i) => Math.min(sortedProductImages.length - 1, i + 1))}
                        disabled={detailImageIndex === sortedProductImages.length - 1}
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md transition-opacity disabled:opacity-25 hover:bg-white"
                        aria-label="Imagen siguiente"
                      >
                        <ChevronRight className="h-5 w-5 text-foreground" />
                      </button>
                    </>
                  )}
                </div>
              </Card>

              {/* Thumbnail strip */}
              {showProductImageNav && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {sortedProductImages.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setDetailImageIndex(i)}
                      className={cn(
                        "relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                        i === detailImageIndex
                          ? "border-primary shadow-sm"
                          : "border-border opacity-70 hover:opacity-100 hover:border-muted-foreground/50"
                      )}
                      aria-label={`Ver imagen ${i + 1}`}
                    >
                      <Image
                        src={img.image_url}
                        alt={`${product.name} ${i + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="flex flex-col">
              {product.category && (
                <Badge variant="secondary" className="w-fit mb-4">
                  {product.category}
                </Badge>
              )}

              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setIsFormModalOpen(true)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(true)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {product.sku && (
                <p className="mt-2 text-sm text-muted-foreground">SKU: {product.sku}</p>
              )}

              {product.description && (
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              )}

              {/* Pricing */}
              <Card className="mt-6">
                <CardContent className="p-6">
                  <div className="flex items-baseline gap-4">
                    <span className="text-3xl font-bold text-primary">
                      {formatPrice(
                        hasVariants && currentCombo
                          ? currentCombo.final_price
                          : product.price_retail
                      )}
                    </span>
                    {!hasVariants && product.price_wholesale && product.min_bulk_quantity && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-accent">
                          {formatPrice(product.price_wholesale)}
                        </span>
                        {" "}comprando {product.min_bulk_quantity}+ unidades
                      </div>
                    )}
                  </div>
                  {effectiveStock !== null && effectiveStock > 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {effectiveStock} unidades disponibles
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Variant carousel (non-admin) */}
              {!isAdmin && hasVariants && combinations.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border-2 border-border bg-background p-4">
                    {/* Prev arrow */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => setComboIndex((i) => Math.max(0, i - 1))}
                      disabled={comboIndex === 0}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>

                    {/* Combo details */}
                    <div className="flex-1 min-w-0 space-y-2 text-center">
                      {/* Variant attribute badges */}
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {currentCombo && Object.entries(currentCombo.variant_combination).map(([k, v]) => (
                          <Badge key={k} variant="secondary" className="text-sm">
                            <span className="text-muted-foreground">{k}:&nbsp;</span>{v}
                          </Badge>
                        ))}
                      </div>

                      {/* Stock */}
                      {currentCombo && (
                        currentCombo.stock > 0 ? (
                          <p className="text-sm text-muted-foreground">
                            {currentCombo.stock} disponibles
                          </p>
                        ) : (
                          <p className="text-sm text-destructive font-medium">Sin stock</p>
                        )
                      )}
                    </div>

                    {/* Next arrow */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => setComboIndex((i) => Math.min(combinations.length - 1, i + 1))}
                      disabled={comboIndex === combinations.length - 1}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Dot indicators */}
                  {combinations.length > 1 && (
                    <div className="flex justify-center gap-1.5">
                      {combinations.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setComboIndex(i)}
                          className={cn(
                            "h-2 rounded-full transition-all duration-200",
                            i === comboIndex ? "w-5 bg-primary" : "w-2 bg-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {/* Quantity + add to cart for current variant */}
                  {currentCombo && currentCombo.stock > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-foreground">Cantidad:</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setVariantQuantity((q) => Math.max(1, q - 1))}
                            disabled={variantQuantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-medium">{variantQuantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setVariantQuantity((q) => Math.min(currentCombo.stock, q + 1))}
                            disabled={variantQuantity >= currentCombo.stock}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        className={cn(
                          "w-full gap-2 transition-all duration-300",
                          showSuccess && "bg-green-600 hover:bg-green-600"
                        )}
                        onClick={handleAddVariantToCart}
                        disabled={isAddingToCart || showSuccess}
                      >
                        {showSuccess ? (
                          <>
                            <Check className="h-5 w-5 animate-in zoom-in duration-200" />
                            <span className="animate-in fade-in duration-200">Agregado al Carrito</span>
                          </>
                        ) : isAddingToCart ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Agregando...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-5 w-5" />
                            Agregar al Carrito
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {currentCombo && currentCombo.stock <= 0 && (
                    <Button size="lg" className="w-full" disabled variant="secondary">
                      Sin stock para esta variante
                    </Button>
                  )}
                </div>
              )}

              {/* Simple product add-to-cart (non-admin, no variants) */}
              {!isAdmin && !hasVariants && (
                <div className="mt-6">
                  {effectiveIsOutOfStock ? (
                    <Button size="lg" className="w-full" disabled>
                      Producto sin stock
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-foreground">Cantidad:</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-medium">{quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setQuantity((q) => q + 1)}
                            disabled={product.stock !== undefined && quantity >= product.stock}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        className={cn(
                          "w-full gap-2 transition-all duration-300",
                          showSuccess && "bg-green-600 hover:bg-green-600"
                        )}
                        onClick={handleAddSimpleToCart}
                        disabled={isAddingToCart || showSuccess}
                      >
                        {showSuccess ? (
                          <>
                            <Check className="h-5 w-5 animate-in zoom-in duration-200" />
                            <span className="animate-in fade-in duration-200">Agregado al Carrito</span>
                          </>
                        ) : isAddingToCart ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Agregando...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-5 w-5" />
                            Agregar al Carrito
                          </>
                        )}
                      </Button>

                      <p className="text-center text-sm text-muted-foreground">
                        Total: {formatPrice(product.price_retail * quantity)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Admin Variants Manager */}
          {isAdmin && product && (
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Variantes del Producto</h2>
              </div>
              <ProductVariantsManager
                productId={product.id}
                token={token!}
                basePrice={product.price_retail}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />

      {isAdmin && product && (
        <>
          <ProductFormModal
            open={isFormModalOpen}
            onOpenChange={setIsFormModalOpen}
            product={product}
            onSuccess={handleProductUpdate}
          />
          <DeleteProductDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            product={product}
            onSuccess={handleProductDelete}
          />
        </>
      )}
    </div>
  )
}
