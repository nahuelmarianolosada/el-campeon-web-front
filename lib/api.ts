const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

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
  is_active?: boolean
  created_at?: string
  has_variants?: boolean
}

export interface ProductsResponse {
  data: Product[]
  limit: number
  offset: number
}

export type DeliveryMethod = "shipping" | "pickup-libreria" | "pickup-jugueteria"
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
  shipping_address: ShippingAddress
  delivery_method: DeliveryMethod
  notes?: string
  created_at: string
  updated_at: string
}

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
  image_url?: string
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
export async function createOrder(
  token: string,
  shippingAddress: ShippingAddress,
  deliveryMethod: DeliveryMethod,
  notes?: string
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
      notes,
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
  return response.json()
}

export async function getLowStockReport(token: string, limit = 100): Promise<LowStockItem[]> {
  const response = await fetch(`${API_URL}/api/reports/low-stock?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al obtener reporte de stock")
  return response.json()
}

export async function getRevenueReport(token: string): Promise<RevenueReport[]> {
  const response = await fetch(`${API_URL}/api/reports/revenue`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error("Error al obtener reporte de ingresos")
  return response.json()
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
  "pickup-libreria": "Retiro en Librería El Campeón",
  "pickup-jugueteria": "Retiro en Juguetería El Campeón",
}

export const paymentMethodLabels: Record<ApiPaymentMethod, string> = {
  MP_SAVED: "Tarjetas guardadas o saldo en Mercado Pago",
  MP_INSTALLMENTS: "Hasta 12 pagos sin tarjeta",
  MP_CARD: "Débito o Crédito",
  CASH: "Efectivo (Pago Fácil / Rapipago)",
}
