"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2, Plus, Trash2, Save, MapPin, Truck, Tag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth-context"
import {
  listDeliveryZones, createDeliveryZone, updateDeliveryZone, deleteDeliveryZone,
  listDeliveryRates, createDeliveryRate, updateDeliveryRate, deleteDeliveryRate,
  listPostalCodes, upsertPostalCode, deletePostalCode,
  listBranchesAdmin,
  type DeliveryZone, type DeliveryRate, type PostalCodeZone, type Branch, type ZoneKind,
} from "@/lib/api"

const ZONE_KINDS: ZoneKind[] = ["provincial", "regional", "departamental", "barrial"]

const formatPrice = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n)

export default function AdminEnviosPage() {
  const router = useRouter()
  const { user, token, isLoading: authLoading } = useAuth()

  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [rates, setRates] = useState<DeliveryRate[]>([])
  const [postalCodes, setPostalCodes] = useState<PostalCodeZone[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selección
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null)

  // Form nueva zona
  const [newZoneName, setNewZoneName] = useState("")
  const [newZoneKind, setNewZoneKind] = useState<ZoneKind>("departamental")

  // Form nuevo CP (asociado a la zona seleccionada)
  const [newPostalCode, setNewPostalCode] = useState("")

  // Form nueva tarifa (asociada a la zona seleccionada)
  const [newRateBranchId, setNewRateBranchId] = useState<number | null>(null)
  const [newRateCost, setNewRateCost] = useState(0)
  const [newRateEtaMin, setNewRateEtaMin] = useState(1)
  const [newRateEtaMax, setNewRateEtaMax] = useState(3)
  const [newRateFree, setNewRateFree] = useState<number | null>(null)

  // Persistencia inline
  const [savingRateId, setSavingRateId] = useState<number | null>(null)

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
    setError(null)
    try {
      const [zs, rs, pcs, bs] = await Promise.all([
        listDeliveryZones(token),
        listDeliveryRates(token),
        listPostalCodes(token),
        listBranchesAdmin(token),
      ])
      setZones(zs)
      setRates(rs)
      setPostalCodes(pcs)
      setBranches(bs)
      if (selectedZoneId == null && zs.length > 0) setSelectedZoneId(zs[0].id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar")
    } finally {
      setLoading(false)
    }
  }

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) ?? null,
    [zones, selectedZoneId],
  )

  const zoneRates = useMemo(
    () => rates.filter((r) => r.zone_id === selectedZoneId),
    [rates, selectedZoneId],
  )

  const zonePostalCodes = useMemo(
    () => postalCodes.filter((pc) => pc.zone_id === selectedZoneId),
    [postalCodes, selectedZoneId],
  )

  const branchesWithoutRate = useMemo(() => {
    const covered = new Set(zoneRates.map((r) => r.origin_branch_id))
    return branches.filter((b) => !covered.has(b.id) && b.is_active)
  }, [branches, zoneRates])

  const branchById = useMemo(
    () => new Map(branches.map((b) => [b.id, b])),
    [branches],
  )

  // ===== Zonas =====

  async function handleCreateZone() {
    if (!token || !newZoneName.trim()) {
      setError("El nombre de la zona es obligatorio")
      return
    }
    try {
      const z = await createDeliveryZone(token, {
        name: newZoneName.trim(),
        kind: newZoneKind,
      })
      setNewZoneName("")
      setSelectedZoneId(z.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear zona")
    }
  }

  async function handleToggleZone(z: DeliveryZone, value: boolean) {
    if (!token) return
    try {
      await updateDeliveryZone(token, z.id, { is_active: value })
      setZones((prev) => prev.map((x) => (x.id === z.id ? { ...x, is_active: value } : x)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar zona")
    }
  }

  async function handleRenameZone(z: DeliveryZone, name: string) {
    if (!token) return
    setZones((prev) => prev.map((x) => (x.id === z.id ? { ...x, name } : x)))
    try {
      await updateDeliveryZone(token, z.id, { name })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al renombrar zona")
    }
  }

  async function handleChangeZoneKind(z: DeliveryZone, kind: ZoneKind) {
    if (!token) return
    setZones((prev) => prev.map((x) => (x.id === z.id ? { ...x, kind } : x)))
    try {
      await updateDeliveryZone(token, z.id, { kind })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar tipo de zona")
    }
  }

  async function handleDeleteZone(z: DeliveryZone) {
    if (!token) return
    if (!confirm(`¿Eliminar la zona "${z.name}"? Se eliminan también sus tarifas asociadas.`)) return
    try {
      await deleteDeliveryZone(token, z.id)
      if (selectedZoneId === z.id) setSelectedZoneId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar zona")
    }
  }

  // ===== Códigos postales =====

  async function handleAddPostalCode() {
    if (!token || !selectedZoneId || !newPostalCode.trim()) return
    try {
      await upsertPostalCode(token, newPostalCode.trim(), selectedZoneId)
      setNewPostalCode("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el CP")
    }
  }

  async function handleDeletePostalCode(pc: string) {
    if (!token) return
    if (!confirm(`¿Quitar el CP ${pc} de esta zona?`)) return
    try {
      await deletePostalCode(token, pc)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el CP")
    }
  }

  // ===== Tarifas =====

  function updateRateField<K extends keyof DeliveryRate>(rateId: number, field: K, value: DeliveryRate[K]) {
    setRates((prev) => prev.map((r) => (r.id === rateId ? { ...r, [field]: value } : r)))
  }

  async function handleSaveRate(rate: DeliveryRate) {
    if (!token) return
    setSavingRateId(rate.id)
    try {
      await updateDeliveryRate(token, rate.id, {
        cost: rate.cost,
        eta_min_days: rate.eta_min_days,
        eta_max_days: rate.eta_max_days,
        free_shipping_threshold: rate.free_shipping_threshold,
        is_active: rate.is_active,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar tarifa")
    } finally {
      setSavingRateId(null)
    }
  }

  async function handleDeleteRate(rate: DeliveryRate) {
    if (!token) return
    if (!confirm("¿Eliminar esta tarifa?")) return
    try {
      await deleteDeliveryRate(token, rate.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la tarifa")
    }
  }

  async function handleAddRate() {
    if (!token || !selectedZoneId || !newRateBranchId) {
      setError("Seleccioná una sucursal origen para la tarifa")
      return
    }
    if (newRateEtaMax < newRateEtaMin) {
      setError("ETA máximo debe ser mayor o igual al mínimo")
      return
    }
    try {
      await createDeliveryRate(token, {
        zone_id: selectedZoneId,
        origin_branch_id: newRateBranchId,
        cost: newRateCost,
        eta_min_days: newRateEtaMin,
        eta_max_days: newRateEtaMax,
        free_shipping_threshold: newRateFree,
      })
      setNewRateBranchId(null)
      setNewRateCost(0)
      setNewRateEtaMin(1)
      setNewRateEtaMax(3)
      setNewRateFree(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear tarifa")
    }
  }

  // Pre-seleccionar la primera sucursal sin tarifa cuando cambia la zona
  useEffect(() => {
    if (branchesWithoutRate.length > 0) {
      setNewRateBranchId(branchesWithoutRate[0].id)
    } else {
      setNewRateBranchId(null)
    }
  }, [selectedZoneId, branchesWithoutRate])

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
        <div className="container mx-auto px-4 max-w-6xl space-y-6">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Zonas y tarifas de envío</h1>
              <p className="text-sm text-muted-foreground">
                Definí las zonas de cobertura, los códigos postales que las componen y las tarifas
                por sucursal origen.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            {/* ===== Lista de zonas + alta ===== */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  Zonas ({zones.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  {zones.map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setSelectedZoneId(z.id)}
                      className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
                        selectedZoneId === z.id
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{z.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{z.kind}</p>
                      </div>
                      {!z.is_active && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">inactiva</Badge>
                      )}
                    </button>
                  ))}
                  {zones.length === 0 && (
                    <p className="text-sm text-muted-foreground italic px-1">
                      Todavía no hay zonas. Creá la primera abajo.
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="new_zone_name" className="text-xs">Nueva zona</Label>
                  <Input
                    id="new_zone_name"
                    placeholder="Tilcara"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                  />
                  <Select value={newZoneKind} onValueChange={(v) => setNewZoneKind(v as ZoneKind)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ZONE_KINDS.map((k) => (
                        <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleCreateZone} className="w-full gap-2" size="sm">
                    <Plus className="h-4 w-4" /> Crear zona
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ===== Detalle de la zona seleccionada ===== */}
            <div className="space-y-6">
              {!selectedZone ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Seleccioná una zona a la izquierda o creá una nueva.
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Header de la zona */}
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[200px] space-y-1">
                          <Label htmlFor="zone_name">Nombre de la zona</Label>
                          <Input
                            id="zone_name"
                            value={selectedZone.name}
                            onChange={(e) => setZones((prev) =>
                              prev.map((x) => (x.id === selectedZone.id ? { ...x, name: e.target.value } : x)))
                            }
                            onBlur={(e) => handleRenameZone(selectedZone, e.target.value)}
                          />
                        </div>
                        <div className="w-44 space-y-1">
                          <Label>Tipo</Label>
                          <Select
                            value={selectedZone.kind}
                            onValueChange={(v) => handleChangeZoneKind(selectedZone, v as ZoneKind)}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ZONE_KINDS.map((k) => (
                                <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 pb-2">
                          <Switch
                            checked={selectedZone.is_active}
                            onCheckedChange={(v) => handleToggleZone(selectedZone, v)}
                          />
                          <Label className="text-sm">Activa</Label>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteZone(selectedZone)}
                          title="Eliminar zona"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Códigos postales */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Tag className="h-4 w-4" />
                        Códigos postales ({zonePostalCodes.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {zonePostalCodes.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">
                            Sin códigos postales asignados.
                          </p>
                        )}
                        {zonePostalCodes.map((pc) => (
                          <Badge
                            key={pc.postal_code}
                            variant="secondary"
                            className="gap-1 pr-1 font-mono text-xs"
                          >
                            {pc.postal_code}
                            <button
                              type="button"
                              onClick={() => handleDeletePostalCode(pc.postal_code)}
                              className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                              title="Quitar"
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Y4600"
                          value={newPostalCode}
                          onChange={(e) => setNewPostalCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddPostalCode() } }}
                          className="max-w-[180px] font-mono"
                        />
                        <Button onClick={handleAddPostalCode} className="gap-2" size="sm">
                          <Plus className="h-4 w-4" /> Agregar CP
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tarifas por sucursal */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Truck className="h-4 w-4" />
                        Tarifas por sucursal origen ({zoneRates.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {zoneRates.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">
                          No hay tarifas configuradas para esta zona.
                        </p>
                      )}
                      {zoneRates.map((rate) => {
                        const branch = branchById.get(rate.origin_branch_id)
                        return (
                          <div
                            key={rate.id}
                            className="rounded-md border p-4 space-y-3 bg-card"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-medium text-foreground">
                                  {branch?.name ?? `Sucursal #${rate.origin_branch_id}`}
                                </p>
                                <p className="text-xs text-muted-foreground">{branch?.address}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={rate.is_active}
                                  onCheckedChange={(v) => {
                                    updateRateField(rate.id, "is_active", v)
                                    handleSaveRate({ ...rate, is_active: v })
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteRate(rate)}
                                  title="Eliminar tarifa"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-4">
                              <div className="space-y-1">
                                <Label className="text-xs">Costo (ARS)</Label>
                                <Input
                                  type="number" min={0} step="0.01"
                                  value={rate.cost}
                                  onChange={(e) => updateRateField(rate.id, "cost", parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">ETA min (días)</Label>
                                <Input
                                  type="number" min={0}
                                  value={rate.eta_min_days}
                                  onChange={(e) => updateRateField(rate.id, "eta_min_days", parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">ETA max (días)</Label>
                                <Input
                                  type="number" min={0}
                                  value={rate.eta_max_days}
                                  onChange={(e) => updateRateField(rate.id, "eta_max_days", parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Envío gratis desde</Label>
                                <Input
                                  type="number" min={0} step="0.01"
                                  placeholder="(sin gratis)"
                                  value={rate.free_shipping_threshold ?? ""}
                                  onChange={(e) => {
                                    const raw = e.target.value
                                    const v = raw === "" ? null : parseFloat(raw) || 0
                                    updateRateField(rate.id, "free_shipping_threshold", v)
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                Vista previa: {formatPrice(rate.cost)} · llega en {rate.eta_min_days}–{rate.eta_max_days} días
                                {rate.free_shipping_threshold ? ` · gratis desde ${formatPrice(rate.free_shipping_threshold)}` : ""}
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleSaveRate(rate)}
                                disabled={savingRateId === rate.id}
                                className="gap-2"
                              >
                                {savingRateId === rate.id
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Save className="h-3 w-3" />}
                                Guardar
                              </Button>
                            </div>
                          </div>
                        )
                      })}

                      {/* Alta de tarifa */}
                      {branchesWithoutRate.length > 0 && (
                        <div className="rounded-md border border-dashed p-4 space-y-3">
                          <p className="text-sm font-medium text-foreground">
                            Agregar tarifa para otra sucursal
                          </p>
                          <div className="grid gap-3 sm:grid-cols-5">
                            <div className="sm:col-span-2 space-y-1">
                              <Label className="text-xs">Sucursal origen</Label>
                              <Select
                                value={newRateBranchId ? String(newRateBranchId) : ""}
                                onValueChange={(v) => setNewRateBranchId(Number(v))}
                              >
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                <SelectContent>
                                  {branchesWithoutRate.map((b) => (
                                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Costo</Label>
                              <Input
                                type="number" min={0} step="0.01"
                                value={newRateCost}
                                onChange={(e) => setNewRateCost(parseFloat(e.target.value) || 0)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">ETA min</Label>
                              <Input
                                type="number" min={0}
                                value={newRateEtaMin}
                                onChange={(e) => setNewRateEtaMin(parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">ETA max</Label>
                              <Input
                                type="number" min={0}
                                value={newRateEtaMax}
                                onChange={(e) => setNewRateEtaMax(parseInt(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                            <div className="space-y-1">
                              <Label className="text-xs">Envío gratis desde (opcional)</Label>
                              <Input
                                type="number" min={0} step="0.01"
                                placeholder="(sin gratis)"
                                value={newRateFree ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  setNewRateFree(raw === "" ? null : parseFloat(raw) || 0)
                                }}
                              />
                            </div>
                            <Button onClick={handleAddRate} className="gap-2">
                              <Plus className="h-4 w-4" /> Agregar tarifa
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
