"use client"

import { useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { importProducts, type ImportResult, type ImportRow } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface ImportProductsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type Stage = "idle" | "previewing" | "preview" | "applying" | "done"

const TEMPLATE_HEADERS = [
  "sku",
  "name",
  "description",
  "category",
  "price_retail",
  "price_wholesale",
  "stock",
  "min_bulk_quantity",
  "images",
  "is_active",
]

const TEMPLATE_EXAMPLE = [
  "ABC-001",
  "Producto de Ejemplo",
  "Descripcion corta",
  "Libros",
  "1500.00",
  "1200.00",
  "50",
  "10",
  "https://ejemplo.com/img1.jpg|https://ejemplo.com/img2.jpg",
  "true",
]

const actionLabels: Record<string, { label: string; className: string }> = {
  create: { label: "Crear", className: "bg-green-100 text-green-800 border-green-200" },
  update: { label: "Actualizar", className: "bg-blue-100 text-blue-800 border-blue-200" },
  error: { label: "Error", className: "bg-red-100 text-red-800 border-red-200" },
}

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(","), TEMPLATE_EXAMPLE.map(csvEscape).join(",")].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "plantilla-productos.csv"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function csvEscape(s: string) {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function ImportProductsModal({ open, onOpenChange, onSuccess }: ImportProductsModalProps) {
  const { token } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<Stage>("idle")
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setStage("idle")
    setFile(null)
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handlePreview = async (picked: File) => {
    if (!token) return
    setFile(picked)
    setError(null)
    setStage("previewing")
    try {
      const res = await importProducts(token, picked, true)
      setResult(res)
      setStage("preview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al validar el archivo")
      setStage("idle")
    }
  }

  const handleConfirm = async () => {
    if (!token || !file) return
    setError(null)
    setStage("applying")
    try {
      const res = await importProducts(token, file, false)
      setResult(res)
      setStage("done")
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aplicar los cambios")
      setStage("preview")
    }
  }

  const summary = result
    ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryStat label="Total" value={result.total} />
          <SummaryStat label="Crear" value={result.to_create} tone="green" />
          <SummaryStat label="Actualizar" value={result.to_update} tone="blue" />
          <SummaryStat label="Errores" value={result.errors} tone="red" />
        </div>
      )
    : null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[92vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar productos (Excel/CSV)
          </DialogTitle>
          <DialogDescription>
            Subí un archivo .xlsx o .csv. Cada fila debe tener un <code>sku</code>: si existe se
            actualizará, si no, se creará.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {stage === "idle" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-foreground">
                Seleccioná un archivo .xlsx o .csv para previsualizar los cambios.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handlePreview(f)
                }}
              />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button onClick={() => inputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Seleccionar archivo
                </Button>
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Descargar plantilla CSV
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Columnas aceptadas:</p>
              <p>
                <code>sku</code> (obligatorio), <code>name</code>, <code>description</code>,{" "}
                <code>category</code>, <code>price_retail</code>, <code>price_wholesale</code>,{" "}
                <code>stock</code>, <code>min_bulk_quantity</code>, <code>images</code>{" "}
                (URLs separadas por <code>|</code>), <code>is_active</code>.
              </p>
              <p>
                Para <strong>crear</strong> un producto nuevo: <code>name</code>,{" "}
                <code>category</code>, <code>price_retail</code> y <code>price_wholesale</code>{" "}
                son obligatorios.
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </p>
            )}
          </div>
        )}

        {stage === "previewing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Validando archivo…</p>
          </div>
        )}

        {(stage === "preview" || stage === "applying") && result && (
          <div className="space-y-4">
            {summary}

            {stage === "applying" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aplicando cambios…
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            <PreviewTable rows={result.rows} />
          </div>
        )}

        {stage === "done" && result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-900">Importación finalizada</p>
                <p className="text-green-800">
                  {result.created ?? 0} creados · {result.updated ?? 0} actualizados ·{" "}
                  {result.skipped ?? 0} omitidos.
                </p>
              </div>
            </div>
            {result.errors > 0 && <PreviewTable rows={result.rows.filter((r) => r.action === "error")} />}
          </div>
        )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border gap-2 sm:gap-0">
          {stage === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>
                Cambiar archivo
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={result === null || result.to_create + result.to_update === 0}
              >
                Aplicar {result ? result.to_create + result.to_update : 0} cambios
              </Button>
            </>
          )}
          {stage === "done" && <Button onClick={() => handleClose(false)}>Cerrar</Button>}
          {stage !== "preview" && stage !== "done" && (
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "green" | "blue" | "red"
}) {
  const toneClass =
    tone === "green"
      ? "text-green-600"
      : tone === "blue"
        ? "text-blue-600"
        : tone === "red"
          ? "text-red-600"
          : "text-foreground"
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}

function PreviewTable({ rows }: { rows: ImportRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No hay filas para mostrar.
      </p>
    )
  }
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="max-h-[60vh] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card">
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">P. Minorista</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const meta = actionLabels[row.action] ?? actionLabels.error
              return (
                <TableRow key={row.line_number}>
                  <TableCell className="text-xs text-muted-foreground">{row.line_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${meta.className}`}>
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.sku || "—"}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{row.name || "—"}</TableCell>
                  <TableCell className="text-right text-xs">
                    {typeof row.price_retail === "number"
                      ? row.price_retail.toLocaleString("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs">{row.stock ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {row.errors && row.errors.length > 0 ? (
                      <span className="text-red-700">{row.errors.join(" · ")}</span>
                    ) : row.action === "update" ? (
                      <span className="text-muted-foreground">ID #{row.existing_id}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
