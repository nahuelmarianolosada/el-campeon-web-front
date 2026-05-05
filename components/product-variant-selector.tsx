"use client"

import Image from "next/image"
import { Package, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ProductVariant, VariantCombination } from "@/lib/api"

interface Props {
  variants: ProductVariant[]
  combinations: VariantCombination[]
  selected: Record<string, string>
  onChange: (key: string, value: string) => void
  activeCombination: VariantCombination | null
  basePrice: number
}

export function ProductVariantSelector({
  variants,
  combinations,
  selected,
  onChange,
  activeCombination,
  basePrice,
}: Props) {
  const isValueAvailable = (variantName: string, value: string): boolean => {
    const hypothetical = { ...selected, [variantName]: value }
    return combinations.some(
      (c) =>
        c.is_active &&
        Object.entries(hypothetical).every(([k, v]) => c.variant_combination[k] === v)
    )
  }

  const allSelected = variants.length > 0 && variants.every((v) => selected[v.name])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price)

  return (
    <div className="space-y-5">
      {/* Variant option groups */}
      {variants.map((variant) => (
        <div key={variant.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{variant.name}</p>
            {selected[variant.name] ? (
              <span className="text-sm text-muted-foreground">— {selected[variant.name]}</span>
            ) : (
              <span className="text-sm text-destructive/70">Requerido</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {variant.values.map(({ value }) => {
              const isSelected = selected[variant.name] === value
              const available = isValueAvailable(variant.name, value)
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!available}
                  onClick={() => onChange(variant.name, value)}
                  className={cn(
                    "relative rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all duration-150",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : available
                      ? "border-border bg-background hover:border-primary/60 hover:bg-accent hover:text-accent-foreground"
                      : "border-border bg-muted text-muted-foreground opacity-40 cursor-not-allowed line-through"
                  )}
                >
                  {value}
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Combination summary — shows once all variants are selected */}
      {allSelected && (
        <div
          className={cn(
            "rounded-xl border-2 p-4 transition-all duration-200",
            activeCombination
              ? activeCombination.stock > 0
                ? "border-green-500/40 bg-green-50/50 dark:bg-green-950/20"
                : "border-destructive/40 bg-destructive/5"
              : "border-muted bg-muted/30"
          )}
        >
          {activeCombination ? (
            <div className="flex gap-4">
              {/* Combination image */}
              {activeCombination.image_url && (
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={activeCombination.image_url}
                    alt={activeCombination.sku}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                {/* Selected combination labels */}
                <div className="flex flex-wrap gap-1">
                  {Object.entries(activeCombination.variant_combination).map(([k, v]) => (
                    <Badge key={k} variant="secondary" className="text-xs font-normal">
                      <span className="text-muted-foreground">{k}:</span>&nbsp;{v}
                    </Badge>
                  ))}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(activeCombination.final_price)}
                  </span>
                  {activeCombination.price_adjustment !== 0 && (
                    <span className="text-xs text-muted-foreground">
                      {formatPrice(basePrice)}{" "}
                      <span
                        className={
                          activeCombination.price_adjustment > 0
                            ? "text-amber-600"
                            : "text-green-600"
                        }
                      >
                        {activeCombination.price_adjustment > 0 ? "+" : ""}
                        {formatPrice(activeCombination.price_adjustment)}
                      </span>
                    </span>
                  )}
                </div>

                {/* Stock */}
                {activeCombination.stock > 0 ? (
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    {activeCombination.stock} unidades disponibles
                  </p>
                ) : (
                  <p className="text-sm font-medium text-destructive">Sin stock para esta combinación</p>
                )}

                {/* SKU */}
                <p className="text-xs text-muted-foreground font-mono">SKU: {activeCombination.sku}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Package className="h-5 w-5 shrink-0" />
              <p className="text-sm">Esta combinación no está disponible.</p>
            </div>
          )}
        </div>
      )}

      {/* Prompt when not all variants are selected yet */}
      {!allSelected && variants.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Seleccioná{" "}
          {variants
            .filter((v) => !selected[v.name])
            .map((v) => v.name)
            .join(" y ")}{" "}
          para ver el precio y disponibilidad.
        </p>
      )}
    </div>
  )
}
