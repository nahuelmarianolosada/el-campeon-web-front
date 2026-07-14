const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export interface ProductImage {
  id: number
  image_url: string
  display_order: number
}

export interface Product {
  id: number
  sku: string
  name: string
  description?: string
  category?: string
  price_retail: number
  price_wholesale?: number
  stock?: number
  min_bulk_quantity?: number
  image_url?: string | null
  images?: ProductImage[]
  is_active?: boolean
  created_at?: string
  has_variants?: boolean
}

export interface ProductsResponse {
  data: Product[]
  limit: number
  offset: number
}

// 'pickup' es el método nuevo y genérico — la sucursal vive en origin_branch_id.
// Los valores 'pickup-libreria' y 'pickup-jugueteria' se conservan por
// compatibilidad con órdenes históricas.
export type DeliveryMethod = "shipping" | "pickup" | "pickup-libreria" | "pickup-jugueteria"
export type ApiPaymentMethod = "MP_SAVED" | "MP_INSTALLMENTS" | "MP_CARD" | "CASH"

export interface Order {
  id: number
  order_number: string
  user_id: number
  items: OrderItem[]
  status: string
  subtotal: number
  tax: number
  total: number
  shipping_cost: number
  shipping_address: ShippingAddress
  delivery_method: DeliveryMethod
  origin_branch_id?: number
  delivery_zone_id?: number
  notes?: string
  created_at: string
  updated_at: string
}

// ===== Shipping / sucursales / zonas =====

export interface Branch {
  id: number
  code: string
  name: string
  address: string
  lat?: number
  lng?: number
  is_pickup_point: boolean
  is_active: boolean
}

export type ZoneKind = "provincial" | "regional" | "departamental" | "barrial"

export interface DeliveryZone {
  id: number
  name: string
  kind: ZoneKind
  parent_zone_id?: number
  is_active: boolean
}

export interface DeliveryRate {
  id: number
  zone_id: number
  origin_branch_id: number
  cost: number
  eta_min_days: number
  eta_max_days: number
  free_shipping_threshold?: number | null
  is_active: boolean
}

export interface PostalCodeZone {
  postal_code: string
  zone_id: number
}

export interface BranchStock {
  product_id: number
  branch_id: number
  branch_code?: string
  branch_name?: string
  stock: number
  reserved: number
  available: number
}

export interface ShippingQuote {
  zone: { id: number; name: string; kind: ZoneKind }
  origin_branch_id: number
  origin_branch_name: string
  cost: number
  eta_min_days: number
  eta_max_days: number
  free_shipping_applied: boolean
  amount_for_free?: number | null
  in_stock: boolean
  out_of_stock_items: number[]
}

export type ShippingQuoteError =
  | "POSTAL_CODE_NOT_COVERED"
  | "NO_BRANCH_HAS_STOCK"
  | "NO_RATE_FOR_ZONE"

export interface OrderItem {
  id: number
  product_id: number
  product: Product
  quantity: number
  price: number
  subtotal: number
}

export interface ShippingAddress {
  street: string
  city: string
  postal_code: string
  country: string
}

export interface Payment {
  id: number
  transaction_id: string
  order_id: number
  user_id: number
  amount: number
  currency: string
  status: string
  payment_method: ApiPaymentMethod
  mercadopago_preference_id?: string
  mercadopago_data?: Record<string, unknown>
  approved_at?: string
  rejected_reason?: string
  created_at: string
  updated_at: string
}

// Products API
export async function getProducts(limit = 20, offset = 0): Promise<ProductsResponse> {
  const response = await fetch(`${API_URL}/api/products?limit=${limit}&offset=${offset}`)
  if (!response.ok) throw new Error("Error al obtener productos")
  return response.json()
}

export async function getProductById(id: number): Promise<Product> {
  const response = await fetch(`${API_URL}/api/products/${id}`)
  if (!response.ok) throw new Error("Producto no encontrado")
  return response.json()
}

export async function getProductsByCategory(category: string, limit = 20): Promise<ProductsResponse> {
  const response = await fetch(`${API_URL}/api/products/category/${encodeURIComponent(category)}?limit=${limit}`)
  if (!response.ok) throw new Error("Error al obtener productos por categoría")
  return response.json()
}

// Admin Products API
export interface CreateProductData {
  sku: string
  name: string
  description?: string
  category?: string
  price_retail: number
  price_wholesale?: number
  stock?: number
  min_bulk_quantity?: number
  image_urls?: Array<{ image_url: string; display_order: number }>
  is_active?: boolean
}

export async function createProduct(token: string, data: CreateProductData): Promise<Product> {
  const response = await fetch(`${API_URL}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear el producto")
  }
  return response.json()
}

export async function updateProduct(token: string, id: number, data: Partial<CreateProductData>): Promise<Product> {
  const response = await fetch(`${API_URL}/api/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al actualizar el producto")
  }
  return response.json()
}

export type ImportAction = "create" | "update" | "error"

export interface ImportRow {
  line_number: number
  action: ImportAction
  sku: string
  name?: string
  description?: string
  category?: string
  price_retail?: number
  price_wholesale?: number
  stock?: number
  min_bulk_quantity?: number
  image_urls?: string[]
  is_active?: boolean
  existing_id?: number
  errors?: string[]
}

export interface ImportResult {
  dry_run: boolean
  total: number
  to_create: number
  to_update: number
  errors: number
  created?: number
  updated?: number
  skipped?: number
  rows: ImportRow[]
}

export async function importProducts(
  token: string,
  file: File,
  dryRun: boolean
): Promise<ImportResult> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("dry_run", dryRun ? "true" : "false")

  const response = await fetch(`${API_URL}/api/products/import`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || error.message || "Error al importar productos")
  }
  return response.json()
}

export async function deleteProduct(token: string, id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/products/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al eliminar el producto")
  }
}

// Orders API
export interface CreateOrderOptions {
  originBranchId?: number
  deliveryZoneId?: number
  shippingCost?: number
  notes?: string
}

export async function createOrder(
  token: string,
  shippingAddress: ShippingAddress,
  deliveryMethod: DeliveryMethod,
  options: CreateOrderOptions = {}
): Promise<Order> {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      shipping_address: shippingAddress,
      delivery_method: deliveryMethod,
      origin_branch_id: options.originBranchId,
      delivery_zone_id: options.deliveryZoneId,
      shipping_cost: options.shippingCost ?? 0,
      notes: options.notes,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear la orden")
  }
  return response.json()
}

export async function getMyOrders(token: string, limit = 10, offset = 0): Promise<{ data: Order[] }> {
  const response = await fetch(`${API_URL}/api/orders/my?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al obtener órdenes")
  return response.json()
}

export async function getOrderById(token: string, orderId: number): Promise<Order> {
  const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Orden no encontrada")
  return response.json()
}

// Payments API
export async function createPayment(
  token: string,
  orderId: number,
  amount: number,
  paymentMethod: ApiPaymentMethod
): Promise<Payment> {
  const response = await fetch(`${API_URL}/api/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ order_id: orderId, amount, payment_method: paymentMethod }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear el pago")
  }
  return response.json()
}

// Guest checkout API
export interface GuestContactInfo {
  name: string
  email: string
  phone?: string
}

export interface GuestOrderItem {
  sku: string
  quantity: number
  price: number
}

export interface GuestOrder extends Order {
  guest_token: string
}

export interface GuestSession {
  guest_token: string
  email: string
  expires_at: string
}

export async function verifyGuestEmail(email: string): Promise<boolean> {
  const response = await fetch(`${API_URL}/api/guest/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al enviar el código de verificación")
  }
  // 202 = sesión ya verificada, 200 = código enviado
  return response.status === 202
}

export async function confirmGuestEmail(email: string, verificationCode: string): Promise<GuestSession> {
  const response = await fetch(`${API_URL}/api/guest/confirm-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, verification_code: verificationCode }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Código incorrecto o expirado")
  }
  return response.json()
}

export async function createGuestOrder(
  contactInfo: GuestContactInfo,
  items: GuestOrderItem[],
  shippingAddress: ShippingAddress,
  deliveryMethod: DeliveryMethod,
  guestToken: string,
  options: CreateOrderOptions = {}
): Promise<GuestOrder> {
  const response = await fetch(`${API_URL}/api/orders/guest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Guest-Token": guestToken,
    },
    body: JSON.stringify({
      guest_name: contactInfo.name,
      guest_email: contactInfo.email,
      guest_phone: contactInfo.phone || undefined,
      items,
      shipping_address: shippingAddress,
      delivery_method: deliveryMethod,
      origin_branch_id: options.originBranchId,
      delivery_zone_id: options.deliveryZoneId,
      shipping_cost: options.shippingCost ?? 0,
      notes: options.notes,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear la orden")
  }
  return response.json()
}

export type GuestApiPaymentMethod = Exclude<ApiPaymentMethod, "MP_SAVED">

export async function createGuestPayment(
  orderId: number,
  email: string,
  amount: number,
  paymentMethod: GuestApiPaymentMethod,
  guestToken: string
): Promise<Payment> {
  const response = await fetch(`${API_URL}/api/payments/guest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Guest-Token": guestToken,
    },
    body: JSON.stringify({
      order_id: orderId,
      email,
      amount,
      payment_method: paymentMethod,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al procesar el pago")
  }
  return response.json()
}

export async function getPaymentByOrderId(token: string, orderId: number): Promise<Payment> {
  const response = await fetch(`${API_URL}/api/payments/order/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al obtener el pago")
  }
  return response.json()
}

export async function getMyPayments(token: string, limit = 10): Promise<{ data: Payment[] }> {
  const response = await fetch(`${API_URL}/api/payments/my?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al obtener pagos")
  return response.json()
}

export async function updateOrderStatus(token: string, orderId: number, status: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || "Error al actualizar estado de la orden")
  }
}

export async function updatePaymentStatus(token: string, paymentId: number, status: string): Promise<Payment> {
  const response = await fetch(`${API_URL}/api/payments/${paymentId}/status`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || error.message || "Error al actualizar estado del pago")
  }
  return response.json()
}

export async function cancelPayment(token: string, paymentId: number): Promise<Payment> {
  const response = await fetch(`${API_URL}/api/payments/${paymentId}/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || error.message || "Error al cancelar el pago")
  }
  return response.json()
}

// Valid payment status transitions (mirrors backend rules in
// internal/services/payment/status). Used to gate the admin UI.
export const paymentStatusTransitions: Record<string, string[]> = {
  PENDING: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["CANCELLED", "REFUNDED"],
  REJECTED: [],
  CANCELLED: [],
  REFUNDED: [],
}

// Reports
export interface OrderReport {
  id: number
  order_number: string
  email: string
  productos: string
  cantidad_items: number
  total: number
  status: string
  created_at: string
}

export interface LowStockItem {
  id: number
  sku: string
  name: string
  stock: number
  category: string
}

export interface RevenueReport {
  fecha: string
  cantidad_ordenes: number
  ingresos: number
}

export async function getOrdersReport(token: string): Promise<OrderReport[]> {
  const response = await fetch(`${API_URL}/api/reports/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al obtener reporte de órdenes")
  return response.json().then((data) => data ?? [])
}

export async function getLowStockReport(token: string, limit = 100): Promise<LowStockItem[]> {
  const response = await fetch(`${API_URL}/api/reports/low-stock?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al obtener reporte de stock")
  return response.json().then((data) => data ?? [])
}

export async function getRevenueReport(token: string): Promise<RevenueReport[]> {
  const response = await fetch(`${API_URL}/api/reports/revenue`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al obtener reporte de ingresos")
  return response.json().then((data) => data ?? [])
}

export interface ProductVariant {
  id: number
  name: string
  type: string
  values: { value: string }[]
}

export interface VariantCombination {
  id: number
  sku: string
  variant_combination: Record<string, string>
  stock: number
  price_adjustment: number
  image_url?: string | null
  final_price: number
  is_active: boolean
  created_at: string
}

export interface VariantCombinationsResponse {
  data: VariantCombination[]
  limit: number
  offset: number
}

export async function getProductVariants(productId: number): Promise<ProductVariant[]> {
  const response = await fetch(`${API_URL}/api/products/${productId}/variants`)
  if (!response.ok) throw new Error("Error al obtener variantes")
  return response.json()
}

export async function createVariant(
  token: string,
  productId: number,
  data: { name: string; type: string; values: string[] }
): Promise<ProductVariant> {
  const response = await fetch(`${API_URL}/api/products/${productId}/variants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear variante")
  }
  return response.json()
}

export async function updateVariant(
  token: string,
  variantId: number,
  data: { name?: string; values?: string[] }
): Promise<ProductVariant> {
  const response = await fetch(`${API_URL}/api/variants/${variantId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al actualizar variante")
  }
  return response.json()
}

export async function deleteVariant(token: string, variantId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/variants/${variantId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al eliminar variante")
  }
}

export async function getVariantCombinations(
  productId: number,
  limit = 100,
  offset = 0
): Promise<VariantCombinationsResponse> {
  const response = await fetch(
    `${API_URL}/api/products/${productId}/variant-combinations?limit=${limit}&offset=${offset}`
  )
  if (!response.ok) throw new Error("Error al obtener combinaciones")
  return response.json()
}

export async function createVariantCombination(
  token: string,
  productId: number,
  data: {
    sku: string
    variant_combination: Record<string, string>
    stock: number
    price_adjustment?: number
    image_url?: string
  }
): Promise<VariantCombination> {
  const response = await fetch(`${API_URL}/api/products/${productId}/variant-combinations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al crear combinación")
  }
  return response.json()
}

export async function updateVariantCombination(
  token: string,
  combinationId: number,
  data: {
    stock?: number
    price_adjustment?: number
    image_url?: string
    is_active?: boolean
  }
): Promise<VariantCombination> {
  const response = await fetch(`${API_URL}/api/variant-combinations/${combinationId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al actualizar combinación")
  }
  return response.json()
}

export async function deleteVariantCombination(token: string, combinationId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/variant-combinations/${combinationId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Error al eliminar combinación")
  }
}

export async function getVariantCombinationById(id: number): Promise<VariantCombination> {
  const response = await fetch(`${API_URL}/api/variant-combinations/${id}`)
  if (!response.ok) throw new Error("Combinación no encontrada")
  return response.json()
}

export async function getVariantCombinationBySku(sku: string): Promise<VariantCombination> {
  const response = await fetch(`${API_URL}/api/variant-combinations/sku?sku=${encodeURIComponent(sku)}`)
  if (!response.ok) throw new Error("Combinación no encontrada")
  return response.json()
}

// Status translations
export const orderStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
}

export const paymentStatusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
}

export const deliveryMethodLabels: Record<DeliveryMethod, string> = {
  shipping: "Envío a domicilio",
  pickup: "Retiro en sucursal",
  "pickup-libreria": "Retiro en Librería El Campeón",
  "pickup-jugueteria": "Retiro en Juguetería El Campeón",
}

// ===== Shipping API =====

export async function listBranches(opts: { onlyPickup?: boolean; onlyActive?: boolean } = {}): Promise<Branch[]> {
  const params = new URLSearchParams()
  if (opts.onlyPickup) params.set("is_pickup_point", "true")
  if (opts.onlyActive) params.set("active", "true")
  const qs = params.toString()
  const response = await fetch(`${API_URL}/api/branches${qs ? `?${qs}` : ""}`)
  if (!response.ok) throw new Error("Error al obtener sucursales")
  const json = await response.json()
  return json.data ?? []
}

export async function getShippingQuote(
  postalCode: string,
  subtotal: number,
  items: Array<{ product_id: number; quantity: number }>
): Promise<ShippingQuote> {
  const response = await fetch(`${API_URL}/api/shipping/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postal_code: postalCode, subtotal, items }),
  })
  if (response.status === 422) {
    const body = await response.json().catch(() => ({}))
    const code = (body?.error as ShippingQuoteError) ?? "POSTAL_CODE_NOT_COVERED"
    const err = new Error(code) as Error & { code: ShippingQuoteError }
    err.code = code
    throw err
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error || "Error al cotizar el envío")
  }
  return response.json()
}

// ---- Admin shipping (zonas, tarifas, CPs) ----

export async function listDeliveryZones(token: string, onlyActive = false): Promise<DeliveryZone[]> {
  const qs = onlyActive ? "?active=true" : ""
  const response = await fetch(`${API_URL}/api/admin/delivery-zones${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al obtener zonas")
  const json = await response.json()
  return json.data ?? []
}

export async function createDeliveryZone(token: string, data: Omit<DeliveryZone, "id" | "is_active"> & { is_active?: boolean }): Promise<DeliveryZone> {
  const response = await fetch(`${API_URL}/api/admin/delivery-zones`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Error al crear zona")
  return response.json()
}

export async function updateDeliveryZone(token: string, id: number, data: Partial<DeliveryZone>): Promise<DeliveryZone> {
  const response = await fetch(`${API_URL}/api/admin/delivery-zones/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Error al actualizar zona")
  return response.json()
}

export async function deleteDeliveryZone(token: string, id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/delivery-zones/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al eliminar zona")
}

export async function listDeliveryRates(token: string, params: { zoneId?: number; branchId?: number } = {}): Promise<DeliveryRate[]> {
  const qs = new URLSearchParams()
  if (params.zoneId) qs.set("zone_id", String(params.zoneId))
  if (params.branchId) qs.set("branch_id", String(params.branchId))
  const url = `${API_URL}/api/admin/delivery-rates${qs.toString() ? `?${qs}` : ""}`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error("Error al obtener tarifas")
  const json = await response.json()
  return json.data ?? []
}

export async function createDeliveryRate(token: string, data: Omit<DeliveryRate, "id" | "is_active"> & { is_active?: boolean }): Promise<DeliveryRate> {
  const response = await fetch(`${API_URL}/api/admin/delivery-rates`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Error al crear tarifa")
  return response.json()
}

export async function updateDeliveryRate(token: string, id: number, data: Partial<DeliveryRate>): Promise<DeliveryRate> {
  const response = await fetch(`${API_URL}/api/admin/delivery-rates/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Error al actualizar tarifa")
  return response.json()
}

export async function deleteDeliveryRate(token: string, id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/delivery-rates/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al eliminar tarifa")
}

export async function listPostalCodes(token: string, zoneId?: number): Promise<PostalCodeZone[]> {
  const qs = zoneId ? `?zone_id=${zoneId}` : ""
  const response = await fetch(`${API_URL}/api/admin/postal-codes${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al obtener códigos postales")
  const json = await response.json()
  return json.data ?? []
}

export async function upsertPostalCode(token: string, postalCode: string, zoneId: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/postal-codes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ postal_code: postalCode, zone_id: zoneId }),
  })
  if (!response.ok) throw new Error("Error al guardar el código postal")
}

export async function deletePostalCode(token: string, postalCode: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/postal-codes/${encodeURIComponent(postalCode)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al eliminar el código postal")
}

// ---- Admin branches ----

export async function listBranchesAdmin(token: string): Promise<Branch[]> {
  const response = await fetch(`${API_URL}/api/admin/branches`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al obtener sucursales")
  const json = await response.json()
  return json.data ?? []
}

export async function createBranch(token: string, data: Omit<Branch, "id">): Promise<Branch> {
  const response = await fetch(`${API_URL}/api/admin/branches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Error al crear la sucursal")
  return response.json()
}

export async function updateBranch(token: string, id: number, data: Partial<Branch>): Promise<Branch> {
  const response = await fetch(`${API_URL}/api/admin/branches/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error("Error al actualizar la sucursal")
  return response.json()
}

export async function deleteBranch(token: string, id: number): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/branches/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al eliminar la sucursal")
}

// ---- Stock por sucursal ----

export async function getProductBranchStock(token: string, productId: number): Promise<BranchStock[]> {
  const response = await fetch(`${API_URL}/api/admin/products/${productId}/stock`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al obtener el stock por sucursal")
  const json = await response.json()
  return json.data ?? []
}

export async function setProductBranchStock(
  token: string,
  productId: number,
  branchId: number,
  stock: number
): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/products/${productId}/stock`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ branch_id: branchId, stock }),
  })
  if (!response.ok) throw new Error("Error al guardar el stock")
}

export const paymentMethodLabels: Record<ApiPaymentMethod, string> = {
  MP_SAVED: "Tarjetas guardadas o saldo en Mercado Pago",
  MP_INSTALLMENTS: "Hasta 12 pagos sin tarjeta",
  MP_CARD: "Débito o Crédito",
  CASH: "Efectivo (Pago Fácil / Rapipago)",
}
