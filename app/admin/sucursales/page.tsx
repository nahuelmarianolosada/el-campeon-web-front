"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2, Store, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  listBranchesAdmin,
  createBranch,
  updateBranch,
  deleteBranch,
  type Branch,
} from "@/lib/api"

const EMPTY_FORM: Omit<Branch, "id"> = {
  code: "",
  name: "",
  address: "",
  is_pickup_point: true,
  is_active: true,
}

export default function AdminBranchesPage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Branch, "id">>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role !== "ADMIN") {
      router.push("/")
      return
    }
    load()
  }, [authLoading, user, router])

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      const data = await listBranchesAdmin(token)
      setBranches(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar sucursales")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!token) return
    if (!form.code.trim() || !form.name.trim() || !form.address.trim()) {
      setError("Completá código, nombre y dirección")
      return
    }
    setCreating(true)
    setError(null)
    try {
      await createBranch(token, form)
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear sucursal")
    } finally {
      setCreating(false)
    }
  }

  async function handleUpdate(branch: Branch, patch: Partial<Branch>) {
    if (!token) return
    try {
      await updateBranch(token, branch.id, patch)
      setBranches((prev) => prev.map((b) => (b.id === branch.id ? { ...b, ...patch } : b)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar")
    }
  }

  async function handleDelete(branch: Branch) {
    if (!token) return
    if (!confirm(`¿Eliminar la sucursal "${branch.name}"?`)) return
    try {
      await deleteBranch(token, branch.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar")
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
        <div className="container mx-auto px-4 max-w-5xl space-y-6">
          <div className="flex items-center gap-3">
            <Store className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Sucursales</h1>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          {/* Listado */}
          <Card>
            <CardHeader>
              <CardTitle>Sucursales registradas ({branches.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead>Activa</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs">{b.code}</TableCell>
                      <TableCell>
                        <Input
                          value={b.name}
                          onChange={(e) =>
                            setBranches((prev) => prev.map((x) => (x.id === b.id ? { ...x, name: e.target.value } : x)))
                          }
                          onBlur={() => handleUpdate(b, { name: b.name })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={b.address}
                          onChange={(e) =>
                            setBranches((prev) => prev.map((x) => (x.id === b.id ? { ...x, address: e.target.value } : x)))
                          }
                          onBlur={() => handleUpdate(b, { address: b.address })}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={b.is_pickup_point}
                          onCheckedChange={(v) => handleUpdate(b, { is_pickup_point: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={b.is_active}
                          onCheckedChange={(v) => handleUpdate(b, { is_active: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(b)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Alta */}
          <Card>
            <CardHeader>
              <CardTitle>Nueva sucursal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    placeholder="libreria-2"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    placeholder="Librería El Campeón — Centro"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  placeholder="Belgrano 500, San Salvador de Jujuy"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_pickup_point}
                    onCheckedChange={(v) => setForm({ ...form, is_pickup_point: v })}
                  />
                  <Label>Punto de retiro</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <Label>Activa</Label>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={creating} className="gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crear sucursal
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
