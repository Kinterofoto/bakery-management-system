export interface ProductionOrder {
  id: string
  orderNumber: string
  productName: string
  sku: string
  quantity: number
  startDate: string
  endDate: string
  status: 'planned' | 'in-progress' | 'completed' | 'delayed'
  resourceId: string
  progress: number
}

export interface Product {
  id: string
  name: string
  unit: string
  currentStock: number
  pendingOrders: number
  suggestedProduction: number
}

export interface Resource {
  id: string
  name: string
  type: 'machine' | 'human' | 'station'
  capacity: number
  products?: Product[] // Products produced by this resource
}

export const mockProducts: Product[] = [
  { id: 'p1', name: 'Pan Francés', unit: 'und', currentStock: 500, pendingOrders: 1200, suggestedProduction: 700 },
  { id: 'p2', name: 'Croissant', unit: 'und', currentStock: 200, pendingOrders: 150, suggestedProduction: 0 },
  { id: 'p3', name: 'Pan de Bono', unit: 'und', currentStock: 50, pendingOrders: 300, suggestedProduction: 250 },
  { id: 'p4', name: 'Baguette', unit: 'und', currentStock: 100, pendingOrders: 100, suggestedProduction: 0 },
  { id: 'p5', name: 'Pastel de Pollo', unit: 'und', currentStock: 0, pendingOrders: 50, suggestedProduction: 50 },
]

export const mockResources: Resource[] = [
  {
    id: 'r1',
    name: 'Horno Rotatorio 1',
    type: 'machine',
    capacity: 100,
    products: [mockProducts[0], mockProducts[3]]
  },
  {
    id: 'r2',
    name: 'Amasadora Industrial',
    type: 'machine',
    capacity: 200,
    products: [mockProducts[1], mockProducts[2]]
  },
  {
    id: 'r3',
    name: 'Mesa de Trabajo A',
    type: 'human',
    capacity: 50,
    products: [mockProducts[4]]
  },
  {
    id: 'r4',
    name: 'Horno de Piso',
    type: 'machine',
    capacity: 80,
    products: [mockProducts[0], mockProducts[2]]
  },
]

export const mockOrders: ProductionOrder[] = [
  {
    id: 'ord-001',
    orderNumber: 'ORD-1001',
    productName: 'Pan Artesanal Masa Madre',
    sku: 'PAN-MM-001',
    quantity: 500,
    startDate: '2023-11-20T06:00:00',
    endDate: '2023-11-20T10:00:00',
    status: 'in-progress',
    resourceId: 'res-2',
    progress: 65
  },
  {
    id: 'ord-002',
    orderNumber: 'ORD-1002',
    productName: 'Croissants de Mantequilla',
    sku: 'CRO-MAN-002',
    quantity: 1200,
    startDate: '2023-11-20T08:00:00',
    endDate: '2023-11-20T14:00:00',
    status: 'planned',
    resourceId: 'res-1',
    progress: 0
  },
  {
    id: 'ord-003',
    orderNumber: 'ORD-1003',
    productName: 'Pastel de Chocolate',
    sku: 'PAS-CHO-003',
    quantity: 50,
    startDate: '2023-11-20T10:00:00',
    endDate: '2023-11-20T16:00:00',
    status: 'delayed',
    resourceId: 'res-4',
    progress: 30
  },
  {
    id: 'ord-004',
    orderNumber: 'ORD-1004',
    productName: 'Empaque Surtido',
    sku: 'EMP-SUR-004',
    quantity: 2000,
    startDate: '2023-11-20T13:00:00',
    endDate: '2023-11-20T18:00:00',
    status: 'planned',
    resourceId: 'res-3',
    progress: 0
  },
  {
    id: 'ord-005',
    orderNumber: 'ORD-1005',
    productName: 'Baguettes Tradicionales',
    sku: 'BAG-TRA-005',
    quantity: 800,
    startDate: '2023-11-21T05:00:00',
    endDate: '2023-11-21T09:00:00',
    status: 'planned',
    resourceId: 'res-2',
    progress: 0
  }
]
