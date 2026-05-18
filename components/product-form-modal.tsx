"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { createProduct, updateProduct, type Product, type CreateProductData } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface ProductFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSuccess: () => void
}

const categories = ["Libros", "Juguetes", "Arte", "Escolar"]

export function ProductFormModal({ open, onOpenChange, product, onSuccess }: ProductFormModalProps) {
  const { token } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState<Omit<CreateProductData, "image_urls">>({
    sku: "",
    name: "",
    description: "",
    category: "",
    price_retail: 0,
    price_wholesale: undefined,
    stock: undefined,
    min_bulk_quantity: undefined,
    is_active: true,
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || "",
        category: product.category || "",
        price_retail: product.price_retail,
        price_wholesale: product.price_wholesale,
        stock: product.stock,
        min_bulk_quantity: product.min_bulk_quantity,
        is_active: product.is_active ?? true,
      })
      const existing =
        product.images && product.images.length > 0
          ? [...product.images].sort((a, b) => a.display_order - b.display_order).map((img) => img.image_url)
          : product.image_url
            ? [product.image_url]
            : []
      setImageUrls(existing)
    } else {
      setFormData({
        sku: "",
        name: "",
        description: "",
        category: "",
        price_retail: 0,
        price_wholesale: undefined,
        stock: undefined,
        min_bulk_quantity: undefined,
        is_active: true,
      })
      setImageUrls([])
    }
    setError("")
  }, [product, open])

  const updateImageUrl = (index: number, value: string) => {
    setImageUrls((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const addImageUrl = () => setImageUrls((prev) => [...prev, ""])

  const removeImageUrl = (index: number) => setImageUrls((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setIsLoading(true)
    setError("")

    try {
      const dataToSend: CreateProductData = {
        ...formData,
        price_wholesale: formData.price_wholesale || undefined,
        stock: formData.stock ?? undefined,
        min_bulk_quantity: formData.min_bulk_quantity || undefined,
        image_urls: imageUrls
          .map((url) => url.trim())
          .filter(Boolean)
          .map((url, i) => ({ image_url: url, display_order: i })),
      }

      if (product) {
        await updateProduct(token, product.id, dataToSend)
      } else {
        await createProduct(token, dataToSend)
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el producto")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Modificá los datos del producto"
              : "Completá los datos para crear un nuevo producto"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup className="grid gap-4 py-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="sku">SKU *</FieldLabel>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
                placeholder="ABC-123"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="name">Nombre *</FieldLabel>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Nombre del producto"
              />
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="description">Descripcion</FieldLabel>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripcion del producto"
                rows={3}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="category">Categoria</FieldLabel>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="price_retail">Precio Minorista *</FieldLabel>
              <Input
                id="price_retail"
                type="number"
                step="0.01"
                min="0"
                value={formData.price_retail || ""}
                onChange={(e) => setFormData({ ...formData, price_retail: parseFloat(e.target.value) || 0 })}
                required
                placeholder="0.00"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="price_wholesale">Precio Mayorista</FieldLabel>
              <Input
                id="price_wholesale"
                type="number"
                step="0.01"
                min="0"
                value={formData.price_wholesale || ""}
                onChange={(e) => setFormData({ ...formData, price_wholesale: parseFloat(e.target.value) || undefined })}
                placeholder="0.00"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="min_bulk_quantity">Cantidad Minima Mayorista</FieldLabel>
              <Input
                id="min_bulk_quantity"
                type="number"
                min="1"
                value={formData.min_bulk_quantity || ""}
                onChange={(e) => setFormData({ ...formData, min_bulk_quantity: parseInt(e.target.value) || undefined })}
                placeholder="10"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="stock">Stock</FieldLabel>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock ?? ""}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value === "" ? undefined : parseInt(e.target.value) })}
                placeholder="100"
              />
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel>Imágenes del Producto</FieldLabel>
              <div className="flex flex-col gap-2">
                {imageUrls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => updateImageUrl(index, e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => removeImageUrl(index)}
                      aria-label="Quitar imagen"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit gap-2"
                  onClick={addImageUrl}
                >
                  <Plus className="h-4 w-4" />
                  Agregar imagen
                </Button>
                {imageUrls.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Sin imágenes. La primera imagen se usa como miniatura.
                  </p>
                )}
              </div>
            </Field>
          </FieldGroup>

          {error && (
            <p className="text-sm text-destructive mb-4">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? "Guardar Cambios" : "Crear Producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
