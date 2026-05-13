"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ShoppingCart, Package, Minus, Plus, Loader2, Pencil, Trash2, Check, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductFormModal } from "@/components/product-form-modal"
import { DeleteProductDialog } from "@/components/delete-product-dialog"
import { ProductVariantsManager } from "@/components/product-variants-manager"
import { ProductVariantSelector } from "@/components/product-variant-selector"
import {
  getProductById,
  getProductVariants,
  getVariantCombinations,
  type Product,
  type ProductVariant,
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
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [combinations, setCombinations] = useState<VariantCombination[]>([])
  const [combinationQuantities, setCombinationQuantities] = useState<Record<number, number>>({})

  const { addToCart, fetchCart } = useCart()
  const { user, token } = useAuth()

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const isAdmin = user?.role === "ADMIN"

  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await getProductById(productId)
        setProduct(data)
      } catch (err) {
        setError("Producto no encontrado")
      } finally {
        setIsLoading(false)
      }
    }

    if (productId) {
      loadProduct()
    }
  }, [productId])

  useEffect(() => {
    if (token) {
      fetchCart()
    }
  }, [token, fetchCart])

  useEffect(() => {
    if (!product) return
    Promise.all([
      getProductVariants(product.id),
      getVariantCombinations(product.id, 100),
    ])
      .then(([variantsData, combosData]) => {
        setVariants(variantsData ?? [])
        setCombinations(combosData?.data ?? [])
      })
      .catch(console.error)
  }, [product])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price)
  }

  const hasVariants = (product?.has_variants ?? false) || variants.length > 0

  const selectedCombinationEntries = useMemo(
    () => Object.entries(combinationQuantities).filter(([, qty]) => qty > 0),
    [combinationQuantities]
  )
  const hasSelectedCombinations = selectedCombinationEntries.length > 0

  const totalSelectedPrice = useMemo(
    () =>
      selectedCombinationEntries.reduce((sum, [comboId, qty]) => {
        const combo = combinations.find((c) => c.id === Number(comboId))
        return sum + (combo?.final_price ?? 0) * qty
      }, 0),
    [selectedCombinationEntries, combinations]
  )

  const displayPrice = product?.price_retail ?? 0
  const effectiveIsOutOfStock = hasVariants
    ? combinations.filter((c) => c.is_active).every((c) => c.stock <= 0)
    : product?.stock !== undefined && product.stock <= 0
  const effectiveStock = hasVariants ? null : product?.stock ?? null

  const handleQuantityChange = (combinationId: number, quantity: number) => {
    setCombinationQuantities((prev) => {
      if (quantity <= 0) {
        const next = { ...prev }
        delete next[combinationId]
        return next
      }
      return { ...prev, [combinationId]: quantity }
    })
  }

  const handleAddToCart = async () => {
    if (!user) {
      router.push("/login")
      return
    }

    if (!product) return

    setIsAddingToCart(true)
    try {
      if (hasVariants) {
        for (const [comboId, qty] of selectedCombinationEntries) {
          const combo = combinations.find((c) => c.id === Number(comboId))
          if (combo) await addToCart(combo.sku, qty)
        }
      } else {
        await addToCart(product.sku, quantity)
      }
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        router.push("/carrito")
      }, 1000)
    } catch (error) {
      console.error("Error adding to cart:", error)
    } finally {
      setIsAddingToCart(false)
    }
  }

  const incrementQuantity = () => {
    if (effectiveStock !== null && quantity < effectiveStock) {
      setQuantity((q) => q + 1)
    } else if (effectiveStock === null) {
      setQuantity((q) => q + 1)
    }
  }

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1)
    }
  }

  const handleProductUpdate = async () => {
    if (productId) {
      const data = await getProductById(productId)
      setProduct(data)
    }
  }

  const handleProductDelete = () => {
    router.push("/productos")
  }

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
          {/* Back button */}
          <Link
            href="/productos"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a productos
          </Link>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Product Image */}
            <Card className="overflow-hidden">
              <div className="relative aspect-square bg-muted">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
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
              </div>
            </Card>

            {/* Product Info */}
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
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsFormModalOpen(true)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
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
                      {formatPrice(displayPrice)}
                    </span>
                    {product.price_wholesale && product.min_bulk_quantity && (
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

              {/* Variant Selector (clients only) */}
              {!isAdmin && hasVariants && (
                <div className="mt-6">
                  <ProductVariantSelector
                    combinations={combinations}
                    quantities={combinationQuantities}
                    onQuantityChange={handleQuantityChange}
                    formatPrice={formatPrice}
                  />
                </div>
              )}

              {/* Add to Cart */}
              {!isAdmin && (
                <div className="mt-6">
                  {hasVariants ? (
                    !hasSelectedCombinations ? (
                      <Button size="lg" className="w-full" disabled>
                        Seleccioná las combinaciones deseadas
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <Button
                          size="lg"
                          className={cn(
                            "w-full gap-2 transition-all duration-300",
                            showSuccess && "bg-green-600 hover:bg-green-600"
                          )}
                          onClick={handleAddToCart}
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
                              {selectedCombinationEntries.length > 1
                                ? `Agregar ${selectedCombinationEntries.length} combinaciones al carrito`
                                : "Agregar al Carrito"}
                            </>
                          )}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                          Total: {formatPrice(totalSelectedPrice)}
                        </p>
                      </div>
                    )
                  ) : effectiveIsOutOfStock ? (
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
                            onClick={decrementQuantity}
                            disabled={quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-medium">{quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={incrementQuantity}
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
                        onClick={handleAddToCart}
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

      {/* Admin Modals */}
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
