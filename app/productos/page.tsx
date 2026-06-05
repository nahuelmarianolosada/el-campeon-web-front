"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Search, Filter, X, Package, Plus, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ProductCard } from "@/components/product-card"
import { ProductFormModal } from "@/components/product-form-modal"
import { DeleteProductDialog } from "@/components/delete-product-dialog"
import { ImportProductsModal } from "@/components/import-products-modal"
import { getProducts, getProductsByCategory, type Product } from "@/lib/api"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"

function ProductsContent() {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("categoria")
  const importParam = searchParams.get("import")

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam)
  const { fetchCart } = useCart()
  const { token, user } = useAuth()

  // Admin state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const isAdmin = user?.role === "ADMIN"

  const categories = ["Libros", "Juguetes", "Arte", "Escolar"]

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      let response
      if (selectedCategory) {
        response = await getProductsByCategory(selectedCategory, 50)
      } else {
        response = await getProducts(50, 0)
      }
      setProducts(response.data || [])
    } catch (error) {
      console.error("Error loading products:", error)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    if (token) {
      fetchCart()
    }
  }, [token, fetchCart])

  useEffect(() => {
    setSelectedCategory(categoryParam)
  }, [categoryParam])

  const isAdminForImport = user?.role === "ADMIN"
  useEffect(() => {
    if (importParam === "1" && isAdminForImport) {
      setIsImportModalOpen(true)
    }
  }, [importParam, isAdminForImport])

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCategoryClick = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null)
      window.history.pushState({}, "", "/productos")
    } else {
      setSelectedCategory(category)
      window.history.pushState({}, "", `/productos?categoria=${encodeURIComponent(category)}`)
    }
  }

  const clearFilters = () => {
    setSelectedCategory(null)
    setSearchQuery("")
    window.history.pushState({}, "", "/productos")
  }

  // Admin handlers
  const handleAddProduct = () => {
    setSelectedProduct(null)
    setIsFormModalOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsFormModalOpen(true)
  }

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteDialogOpen(true)
  }

  const handleProductSuccess = () => {
    loadProducts()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 bg-background">
        {/* Hero Section */}
        <section className="bg-secondary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              {selectedCategory ? selectedCategory : "Todos los Productos"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {selectedCategory
                ? `Explorá nuestra selección de ${selectedCategory.toLowerCase()}`
                : "Encontrá todo lo que necesitás"}
            </p>
            {isAdmin && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button onClick={handleAddProduct} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Producto
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsImportModalOpen(true)}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Importar Excel/CSV
                </Button>
              </div>
            )}
          </div>
        </section>

        <div className="container mx-auto px-4 py-8">
          {/* Filters Section */}
          <div className="mb-8 space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Categorías:</span>
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground"
                  onClick={() => handleCategoryClick(category)}
                >
                  {category}
                </Badge>
              ))}
              {(selectedCategory || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="ml-2 text-muted-foreground"
                >
                  <X className="mr-1 h-3 w-3" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""} encontrado{filteredProducts.length !== 1 ? "s" : ""}
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={isAdmin ? handleEditProduct : undefined}
                    onDelete={isAdmin ? handleDeleteProduct : undefined}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <Package className="mx-auto h-16 w-16 text-muted-foreground/40" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                No se encontraron productos
              </h2>
              <p className="mt-2 text-muted-foreground">
                Probá con otros términos de búsqueda o filtros
              </p>
              <Button onClick={clearFilters} variant="outline" className="mt-4">
                Ver todos los productos
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Admin Modals */}
      {isAdmin && (
        <>
          <ProductFormModal
            open={isFormModalOpen}
            onOpenChange={setIsFormModalOpen}
            product={selectedProduct}
            onSuccess={handleProductSuccess}
          />
          <DeleteProductDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            product={selectedProduct}
            onSuccess={handleProductSuccess}
          />
          <ImportProductsModal
            open={isImportModalOpen}
            onOpenChange={setIsImportModalOpen}
            onSuccess={handleProductSuccess}
          />
        </>
      )}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Cargando...</div>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}
