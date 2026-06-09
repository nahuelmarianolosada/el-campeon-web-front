"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Package, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import {
  getProductById,
  getProductBranchStock,
  setProductBranchStock,
  listBranchesAdmin,
  type Product,
  type Branch,
  type BranchStock,
} from "@/lib/api"

interface Row {
  branchId: number
  branchName: string
  stock: number
  reserved: number
}

export default function ProductStockPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const productId = Number(params.id)
  const { user, token, isLoading: authLoading } = useAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingBranch, setSavingBranch] = useState<number | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== "ADMIN") {
      router.push("/")
      return
    }
    load()
  }, [authLoading, user, productId, router])

  async function load() {
    if (!token || !Number.isFinite(productId)) return
    setLoading(true)
    try {
      const [p, stock, branches] = await Promise.all([
        getProductById(productId),
        getProductBranchStock(token, productId),
        listBranchesAdmin(token),
      ])
      setProduct(p)
      // Construyo filas por sucursal (incluso sin stock cargado, mostramos 0 editable)
      const stockMap = new Map<number, BranchStock>()
      stock.forEach((s) => stockMap.set(s.branch_id, s))
      const merged: Row[] = branches.map((b: Branch) => {
        const s = stockMap.get(b.id)
        return {
          branchId: b.id,
          branchName: b.name,
          stock: s?.stock ?? 0,
          reserved: s?.reserved ?? 0,
        }
      })
      setRows(merged)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar stock")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(row: Row) {
    if (!token) return
    setSavingBranch(row.branchId)
    try {
      await setProductBranchStock(token, productId, row.branchId, row.stock)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSavingBranch(null)
    }
  }

  if (authLoading || loading) {
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4 max-w-4xl space-y-6">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Stock por sucursal</h1>
              {product && (
                <p className="text-sm text-muted-foreground">
                  {product.sku} · {product.name}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Distribución de stock</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sucursal</TableHead>
                    <TableHead className="w-32">Stock</TableHead>
                    <TableHead className="w-32">Reservado</TableHead>
                    <TableHead className="w-32">Disponible</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={row.branchId}>
                      <TableCell>{row.branchName}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={row.stock}
                          onChange={(e) => {
                            const v = Math.max(0, parseInt(e.target.value) || 0)
                            setRows((prev) => prev.map((x, i) => (i === idx ? { ...x, stock: v } : x)))
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.reserved}</TableCell>
                      <TableCell className={row.stock - row.reserved <= 0 ? "text-destructive" : ""}>
                        {row.stock - row.reserved}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSave(row)}
                          disabled={savingBranch === row.branchId}
                        >
                          {savingBranch === row.branchId
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Save className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
