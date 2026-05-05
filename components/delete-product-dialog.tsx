"use client"

import { useState } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteProduct, type Product } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface DeleteProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onSuccess: () => void
}

export function DeleteProductDialog({ open, onOpenChange, product, onSuccess }: DeleteProductDialogProps) {
  const { token } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleDelete = async () => {
    if (!token || !product) return

    setIsLoading(true)
    setError("")

    try {
      await deleteProduct(token, product.id)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el producto")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Eliminar Producto
          </AlertDialogTitle>
          <AlertDialogDescription>
            {product && (
              <>
                ¿Estas seguro de que queres eliminar{" "}
                <span className="font-semibold text-foreground">{product.name}</span>?
                <br />
                Esta accion no se puede deshacer.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
