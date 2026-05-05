"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getProductVariants,
  getVariantCombinations,
  createVariant,
  updateVariant,
  deleteVariant,
  createVariantCombination,
  updateVariantCombination,
  deleteVariantCombination,
  type ProductVariant,
  type VariantCombination,
} from "@/lib/api"

interface VariantFormDialogProps {
  open: boolean
  editing: ProductVariant | null
  onClose: () => void
  productId: number
  token: string
  onSuccess: () => void
}

function VariantFormDialog({ open, editing, onClose, productId, token, onSuccess }: VariantFormDialogProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [values, setValues] = useState<string[]>([])
  const [valueInput, setValueInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name)
        setType(editing.type)
        setValues(editing.values.map((v) => v.value))
      } else {
        setName("")
        setType("")
        setValues([])
      }
      setValueInput("")
      setError("")
    }
  }, [open, editing])

  const addValue = () => {
    const trimmed = valueInput.trim()
    if (trimmed && !values.includes(trimmed)) {
      setValues((prev) => [...prev, trimmed])
    }
    setValueInput("")
  }

  const removeValue = (val: string) => {
    setValues((prev) => prev.filter((v) => v !== val))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addValue()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("El nombre es obligatorio")
      return
    }
    if (values.length === 0) {
      setError("Agregá al menos un valor")
      return
    }

    setIsLoading(true)
    try {
      if (editing) {
        await updateVariant(token, editing.id, { name, values })
      } else {
        await createVariant(token, productId, { name, type, values })
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la variante")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Tipo de Variante" : "Nuevo Tipo de Variante"}</DialogTitle>
          <DialogDescription>
            {editing ? "Modificá los datos del tipo de variante" : "Completá los datos para crear un nuevo tipo de variante"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="variant-name">Nombre *</Label>
            <Input
              id="variant-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Color, Talle"
              required
            />
          </div>

          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="variant-type">Tipo</Label>
              <Input
                id="variant-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="Ej: color, size"
              />
            </div>
          )}

          {editing && (
            <div className="space-y-1">
              <Label>Tipo</Label>
              <p className="text-sm text-muted-foreground">{editing.type}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Valores *</Label>
            <div className="flex gap-2">
              <Input
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej: Rojo, XL"
              />
              <Button type="button" variant="outline" size="icon" onClick={addValue}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {values.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {values.map((val) => (
                  <Badge key={val} variant="secondary" className="gap-1">
                    {val}
                    <button
                      type="button"
                      onClick={() => removeValue(val)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Guardar Cambios" : "Crear Tipo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CombinationFormDialogProps {
  open: boolean
  editing: VariantCombination | null
  onClose: () => void
  productId: number
  token: string
  variants: ProductVariant[]
  onSuccess: () => void
}

function CombinationFormDialog({
  open,
  editing,
  onClose,
  productId,
  token,
  variants,
  onSuccess,
}: CombinationFormDialogProps) {
  const [sku, setSku] = useState("")
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({})
  const [stock, setStock] = useState(0)
  const [priceAdjustment, setPriceAdjustment] = useState(0)
  const [imageUrl, setImageUrl] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (open) {
      if (editing) {
        setSku(editing.sku)
        setVariantSelections(editing.variant_combination)
        setStock(editing.stock)
        setPriceAdjustment(editing.price_adjustment)
        setImageUrl(editing.image_url || "")
        setIsActive(editing.is_active)
      } else {
        setSku("")
        setVariantSelections({})
        setStock(0)
        setPriceAdjustment(0)
        setImageUrl("")
        setIsActive(true)
      }
      setError("")
    }
  }, [open, editing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!editing) {
      if (!sku.trim()) {
        setError("El SKU es obligatorio")
        return
      }
      const allSelected = variants.every((v) => variantSelections[v.name])
      if (!allSelected) {
        setError("Seleccioná un valor para cada variante")
        return
      }
    }

    setIsLoading(true)
    try {
      if (editing) {
        await updateVariantCombination(token, editing.id, {
          stock,
          price_adjustment: priceAdjustment,
          image_url: imageUrl || undefined,
          is_active: isActive,
        })
      } else {
        await createVariantCombination(token, productId, {
          sku,
          variant_combination: variantSelections,
          stock,
          price_adjustment: priceAdjustment,
          image_url: imageUrl || undefined,
        })
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la combinación")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Combinación" : "Nueva Combinación"}</DialogTitle>
          <DialogDescription>
            {editing ? "Modificá los datos de la combinación" : "Completá los datos para crear una nueva combinación"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {editing ? (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/40">
              <div className="space-y-1">
                <Label>SKU</Label>
                <p className="text-sm font-mono">{editing.sku}</p>
              </div>
              <div className="space-y-1">
                <Label>Variante</Label>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(editing.variant_combination).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-xs">
                      {k}: {v}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="combo-sku">SKU *</Label>
                <Input
                  id="combo-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ej: PROD-ROJO-XL"
                  required
                />
              </div>

              {variants.map((variant) => (
                <div key={variant.id} className="space-y-2">
                  <Label>{variant.name} *</Label>
                  <Select
                    value={variantSelections[variant.name] || ""}
                    onValueChange={(val) =>
                      setVariantSelections((prev) => ({ ...prev, [variant.name]: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Seleccioná ${variant.name}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {variant.values.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          {v.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="combo-stock">Stock</Label>
            <Input
              id="combo-stock"
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="combo-price-adj">Ajuste de Precio</Label>
            <Input
              id="combo-price-adj"
              type="number"
              step="0.01"
              value={priceAdjustment}
              onChange={(e) => setPriceAdjustment(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="combo-image">URL de Imagen</Label>
            <Input
              id="combo-image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>

          {editing && (
            <div className="flex items-center gap-3">
              <Switch
                id="combo-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="combo-active">Activo</Label>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Guardar Cambios" : "Crear Combinación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ProductVariantsManagerProps {
  productId: number
  token: string
  basePrice: number
}

export function ProductVariantsManager({ productId, token, basePrice }: ProductVariantsManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [combinations, setCombinations] = useState<VariantCombination[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [variantFormOpen, setVariantFormOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [deleteVariantConfirm, setDeleteVariantConfirm] = useState<ProductVariant | null>(null)
  const [isDeletingVariant, setIsDeletingVariant] = useState(false)
  const [deleteVariantError, setDeleteVariantError] = useState("")

  const [combinationFormOpen, setCombinationFormOpen] = useState(false)
  const [editingCombination, setEditingCombination] = useState<VariantCombination | null>(null)
  const [deleteCombinationConfirm, setDeleteCombinationConfirm] = useState<VariantCombination | null>(null)
  const [isDeletingCombination, setIsDeletingCombination] = useState(false)
  const [deleteCombinationError, setDeleteCombinationError] = useState("")

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price)

  const reload = async () => {
    try {
      const [variantsData, combosData] = await Promise.all([
        getProductVariants(productId),
        getVariantCombinations(productId, 100),
      ])
      setVariants(variantsData ?? [])
      setCombinations(combosData?.data ?? [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    setIsLoading(true)
    reload().finally(() => setIsLoading(false))
  }, [productId])

  const handleDeleteVariant = async () => {
    if (!deleteVariantConfirm) return
    setIsDeletingVariant(true)
    setDeleteVariantError("")
    try {
      await deleteVariant(token, deleteVariantConfirm.id)
      setDeleteVariantConfirm(null)
      await reload()
    } catch (err) {
      setDeleteVariantError(err instanceof Error ? err.message : "Error al eliminar")
    } finally {
      setIsDeletingVariant(false)
    }
  }

  const handleDeleteCombination = async () => {
    if (!deleteCombinationConfirm) return
    setIsDeletingCombination(true)
    setDeleteCombinationError("")
    try {
      await deleteVariantCombination(token, deleteCombinationConfirm.id)
      setDeleteCombinationConfirm(null)
      await reload()
    } catch (err) {
      setDeleteCombinationError(err instanceof Error ? err.message : "Error al eliminar")
    } finally {
      setIsDeletingCombination(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Variant Types Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tipos de Variante</CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingVariant(null)
              setVariantFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Tipo
          </Button>
        </CardHeader>
        <CardContent>
          {variants.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              No hay tipos de variante. Agregá uno para empezar.
            </p>
          ) : (
            <div className="space-y-3">
              {variants.map((variant) => (
                <div
                  key={variant.id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{variant.name}</span>
                      <Badge variant="outline">{variant.type}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {variant.values.map((v) => (
                        <Badge key={v.value} variant="secondary">
                          {v.value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingVariant(variant)
                        setVariantFormOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeleteVariantError("")
                        setDeleteVariantConfirm(variant)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Combinations Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Combinaciones</CardTitle>
          <Button
            size="sm"
            disabled={variants.length === 0}
            onClick={() => {
              setEditingCombination(null)
              setCombinationFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Combinación
          </Button>
        </CardHeader>
        <CardContent>
          {combinations.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              No hay combinaciones. Agregá tipos de variante primero y luego creá combinaciones.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">SKU</th>
                    <th className="pb-2 pr-4 font-medium">Variante</th>
                    <th className="pb-2 pr-4 font-medium">Stock</th>
                    <th className="pb-2 pr-4 font-medium">Ajuste</th>
                    <th className="pb-2 pr-4 font-medium">Precio Final</th>
                    <th className="pb-2 pr-4 font-medium">Activo</th>
                    <th className="pb-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {combinations.map((combo) => (
                    <tr key={combo.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono">{combo.sku}</td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(combo.variant_combination).map(([k, v]) => (
                            <span key={k} className="text-xs">
                              <span className="text-muted-foreground">{k}:</span> {v}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-4">{combo.stock}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            combo.price_adjustment < 0
                              ? "text-green-600"
                              : combo.price_adjustment > 0
                              ? "text-amber-600"
                              : "text-muted-foreground"
                          }
                        >
                          {combo.price_adjustment !== 0
                            ? formatPrice(combo.price_adjustment)
                            : "—"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-primary font-medium">
                        {formatPrice(combo.final_price)}
                      </td>
                      <td className="py-2 pr-4">
                        {combo.is_active ? (
                          <Badge className="bg-green-600 text-white border-transparent">Sí</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingCombination(combo)
                              setCombinationFormOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeleteCombinationError("")
                              setDeleteCombinationConfirm(combo)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variant Form Dialog */}
      <VariantFormDialog
        open={variantFormOpen}
        editing={editingVariant}
        onClose={() => setVariantFormOpen(false)}
        productId={productId}
        token={token}
        onSuccess={reload}
      />

      {/* Combination Form Dialog */}
      <CombinationFormDialog
        open={combinationFormOpen}
        editing={editingCombination}
        onClose={() => setCombinationFormOpen(false)}
        productId={productId}
        token={token}
        variants={variants}
        onSuccess={reload}
      />

      {/* Delete Variant AlertDialog */}
      <AlertDialog
        open={!!deleteVariantConfirm}
        onOpenChange={(v) => { if (!v) setDeleteVariantConfirm(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar Tipo de Variante
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteVariantConfirm && (
                <>
                  ¿Estás seguro de que querés eliminar el tipo{" "}
                  <span className="font-semibold text-foreground">{deleteVariantConfirm.name}</span>?
                  <br />
                  Esto eliminará también todas las combinaciones relacionadas. Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteVariantError && (
            <p className="text-sm text-destructive">{deleteVariantError}</p>
          )}
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteVariantConfirm(null)}
              disabled={isDeletingVariant}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteVariant} disabled={isDeletingVariant}>
              {isDeletingVariant && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Combination AlertDialog */}
      <AlertDialog
        open={!!deleteCombinationConfirm}
        onOpenChange={(v) => { if (!v) setDeleteCombinationConfirm(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar Combinación
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCombinationConfirm && (
                <>
                  ¿Estás seguro de que querés eliminar la combinación{" "}
                  <span className="font-semibold text-foreground font-mono">{deleteCombinationConfirm.sku}</span>?
                  <br />
                  Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteCombinationError && (
            <p className="text-sm text-destructive">{deleteCombinationError}</p>
          )}
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCombinationConfirm(null)}
              disabled={isDeletingCombination}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCombination}
              disabled={isDeletingCombination}
            >
              {isDeletingCombination && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
