"use client"

import Image from "next/image"
import { Package, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { VariantCombination } from "@/lib/api"

interface Props {
  combinations: VariantCombination[]
  quantities: Record<number, number>
  onQuantityChange: (combinationId: number, quantity: number) => void
  formatPrice: (price: number) => string
}

export function ProductVariantSelector({ combinations, quantities, onQuantityChange, formatPrice }: Props) {
  const activeCombinations = combinations.filter((c) => c.is_active)

  if (activeCombinations.length === 0) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground rounded-xl border p-4">
        <Package className="h-5 w-5 shrink-0" />
        <p className="text-sm">No hay combinaciones disponibles para este producto.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activeCombinations.map((combo) => {
        const qty = quantities[combo.id] ?? 0
        const outOfStock = combo.stock <= 0

        return (
          <div
            key={combo.id}
            className={cn(
              "flex items-center gap-4 rounded-xl border-2 p-4 transition-all duration-150",
              qty > 0
                ? "border-primary/60 bg-primary/5"
                : outOfStock
                ? "border-border bg-muted/30 opacity-60"
                : "border-border bg-background hover:border-primary/30"
            )}
          >
            {combo.image_url && (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image src={combo.image_url} alt={combo.sku} fill className="object-cover" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1 mb-1">
                {Object.entries(combo.variant_combination).map(([k, v]) => (
                  <Badge key={k} variant="secondary" className="text-xs font-normal">
                    <span className="text-muted-foreground">{k}:</span>&nbsp;{v}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">{formatPrice(combo.final_price)}</span>
                {outOfStock ? (
                  <span className="text-xs text-destructive font-medium">Sin stock</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{combo.stock} disponibles</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={qty <= 0}
                onClick={() => onQuantityChange(combo.id, qty - 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-sm font-medium">{qty}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={outOfStock || qty >= combo.stock}
                onClick={() => onQuantityChange(combo.id, qty + 1)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
