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
import { cancelPayment, type Payment } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface CancelPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: Payment | null
  onSuccess: (payment: Payment) => void
}

export function CancelPaymentDialog({ open, onOpenChange, payment, onSuccess }: CancelPaymentDialogProps) {
  const { token } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const isConfirmed = payment?.status === "APPROVED"

  const handleCancel = async () => {
    if (!token || !payment) return

    setIsLoading(true)
    setError("")

    try {
      const updated = await cancelPayment(token, payment.id)
      onSuccess(updated)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cancelar el pago")
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
            {isConfirmed ? "Solicitar reembolso" : "Cancelar pago"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isConfirmed
              ? "Tu pago ya fue aprobado. Al confirmar, solicitaremos el reembolso a MercadoPago. Esta acción no se puede deshacer."
              : "¿Estás seguro de que querés cancelar este pago? Esta acción no se puede deshacer."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Volver
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isConfirmed ? "Solicitar reembolso" : "Cancelar pago"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
