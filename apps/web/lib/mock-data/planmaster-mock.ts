// Mock data for PlanMaster module - Production Planning

export interface MockPlan {
  id: string
  plan_name: string
  week_number: number
  year: number
  start_date: string
  end_date: string
  status: 'draft' | 'in_review' | 'firme' | 'completed'
  compliance_percentage: number
  total_ops: number
  created_by: string
  created_at: string
  locked_at: string | null
}

export interface MockProductionOrder {
  id: string
  plan_id: string
  order_number: string
  work_center_id: string
  work_center_name: string
  product_id: string
  product_name: string
  scheduled_date: string
  scheduled_shift: 'morning' | 'afternoon' | 'night'
  quantity_planned: number
  quantity_produced: number
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'conflict'
  priority_level: number
  source: 'firme' | 'forecast' | 'manual' | 'safety_stock' | 'backlog'
}

export interface MockDemand {
  product_id: string
  product_name: string
  firm_orders_qty: number
  forecast_qty: number
  safety_stock_qty: number
  manual_input_qty: number
  backlog_qty: number
  unfulfilled_current_week_qty: number
  total_demand: number
}

export interface MockMaterial {
  id: string
  name: string
  total_required_grams: number
  current_inventory_grams: number
  net_requirement_grams: number
  required_arrival_date: string
  status: 'ok' | 'warning' | 'critical'
  supplier_name: string
  lead_time_days: number
}

export interface MockConflict {
  id: string
  type: 'material' | 'capacity' | 'personnel' | 'equipment'
  resource_name: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggested_solution: string
  affected_ops: string[]
}

export interface MockCapacity {
  work_center_id: string
  work_center_name: string
  date: string
  total_capacity_hours: number
  planned_hours: number
  available_hours: number
  utilization_percentage: number
  status: 'ok' | 'warning' | 'overload'
}

// Mock Plans
export const mockPlans: MockPlan[] = [
  {
    id: 'plan-001',
    plan_name: 'Plan Semana 42 - 2025',
    week_number: 42,
    year: 2025,
    start_date: '2025-10-20',
    end_date: '2025-10-26',
    status: 'firme',
    compliance_percentage: 87,
    total_ops: 12,
    created_by: 'Juan Pérez',
    created_at: '2025-10-15T10:00:00Z',
    locked_at: '2025-10-19T12:00:00Z'
  },
  {
    id: 'plan-002',
    plan_name: 'Plan Semana 43 - 2025',
    week_number: 43,
    year: 2025,
    start_date: '2025-10-27',
    end_date: '2025-11-02',
    status: 'in_review',
    compliance_percentage: 0,
    total_ops: 15,
    created_by: 'María González',
    created_at: '2025-10-18T09:30:00Z',
    locked_at: null
  },
  {
    id: 'plan-003',
    plan_name: 'Plan Semana 41 - 2025',
    week_number: 41,
    year: 2025,
    start_date: '2025-10-13',
    end_date: '2025-10-19',
    status: 'completed',
    compliance_percentage: 94,
    total_ops: 14,
    created_by: 'Juan Pérez',
    created_at: '2025-10-08T14:00:00Z',
    locked_at: '2025-10-12T12:00:00Z'
  }
]

// Mock Production Orders
export const mockProductionOrders: MockProductionOrder[] = [
  // Plan 001 - Semana 42
  {
    id: 'op-001',
    plan_id: 'plan-001',
    order_number: 'OP-2025-001',
    work_center_id: 'wc-001',
    work_center_name: 'Horno Principal',
    product_id: 'prod-001',
    product_name: 'Pan Tajado Integral',
    scheduled_date: '2025-10-20',
    scheduled_shift: 'morning',
    quantity_planned: 500,
    quantity_produced: 480,
    status: 'completed',
    priority_level: 1,
    source: 'firme'
  },
  {
    id: 'op-002',
    plan_id: 'plan-001',
    order_number: 'OP-2025-002',
    work_center_id: 'wc-002',
    work_center_name: 'Línea de Empaque',
    product_id: 'prod-002',
    product_name: 'Croissant',
    scheduled_date: '2025-10-20',
    scheduled_shift: 'afternoon',
    quantity_planned: 300,
    quantity_produced: 310,
    status: 'completed',
    priority_level: 2,
    source: 'firme'
  },
  {
    id: 'op-003',
    plan_id: 'plan-001',
    order_number: 'OP-2025-003',
    work_center_id: 'wc-001',
    work_center_name: 'Horno Principal',
    product_id: 'prod-003',
    product_name: 'Palitos de Queso',
    scheduled_date: '2025-10-21',
    scheduled_shift: 'morning',
    quantity_planned: 800,
    quantity_produced: 650,
    status: 'delayed',
    priority_level: 1,
    source: 'firme'
  },
  {
    id: 'op-004',
    plan_id: 'plan-001',
    order_number: 'OP-2025-004',
    work_center_id: 'wc-003',
    work_center_name: 'Mesa de Trabajo 1',
    product_id: 'prod-004',
    product_name: 'Almojábanas',
    scheduled_date: '2025-10-21',
    scheduled_shift: 'afternoon',
    quantity_planned: 400,
    quantity_produced: 400,
    status: 'completed',
    priority_level: 3,
    source: 'forecast'
  },
  {
    id: 'op-005',
    plan_id: 'plan-001',
    order_number: 'OP-2025-005',
    work_center_id: 'wc-001',
    work_center_name: 'Horno Principal',
    product_id: 'prod-001',
    product_name: 'Pan Tajado Integral',
    scheduled_date: '2025-10-22',
    scheduled_shift: 'morning',
    quantity_planned: 600,
    quantity_produced: 450,
    status: 'in_progress',
    priority_level: 1,
    source: 'firme'
  },
  {
    id: 'op-006',
    plan_id: 'plan-001',
    order_number: 'OP-2025-006',
    work_center_id: 'wc-002',
    work_center_name: 'Línea de Empaque',
    product_id: 'prod-005',
    product_name: 'Pandebono',
    scheduled_date: '2025-10-22',
    scheduled_shift: 'afternoon',
    quantity_planned: 700,
    quantity_produced: 0,
    status: 'conflict',
    priority_level: 2,
    source: 'firme'
  },
  // Plan 002 - Semana 43
  {
    id: 'op-007',
    plan_id: 'plan-002',
    order_number: 'OP-2025-007',
    work_center_id: 'wc-001',
    work_center_name: 'Horno Principal',
    product_id: 'prod-001',
    product_name: 'Pan Tajado Integral',
    scheduled_date: '2025-10-27',
    scheduled_shift: 'morning',
    quantity_planned: 550,
    quantity_produced: 0,
    status: 'pending',
    priority_level: 1,
    source: 'firme'
  },
  {
    id: 'op-008',
    plan_id: 'plan-002',
    order_number: 'OP-2025-008',
    work_center_id: 'wc-001',
    work_center_name: 'Horno Principal',
    product_id: 'prod-002',
    product_name: 'Croissant',
    scheduled_date: '2025-10-27',
    scheduled_shift: 'afternoon',
    quantity_planned: 350,
    quantity_produced: 0,
    status: 'pending',
    priority_level: 1,
    source: 'firme'
  }
]

// Mock Demand
export const mockDemand: MockDemand[] = [
  {
    product_id: 'prod-001',
    product_name: 'Pan Tajado Integral',
    firm_orders_qty: 1200,
    forecast_qty: 300,
    safety_stock_qty: 150,
    manual_input_qty: 50,
    backlog_qty: 100,
    unfulfilled_current_week_qty: 0,
    total_demand: 1800
  },
  {
    product_id: 'prod-002',
    product_name: 'Croissant',
    firm_orders_qty: 800,
    forecast_qty: 200,
    safety_stock_qty: 100,
    manual_input_qty: 0,
    backlog_qty: 50,
    unfulfilled_current_week_qty: 30,
    total_demand: 1180
  },
  {
    product_id: 'prod-003',
    product_name: 'Palitos de Queso',
    firm_orders_qty: 1500,
    forecast_qty: 400,
    safety_stock_qty: 200,
    manual_input_qty: 100,
    backlog_qty: 0,
    unfulfilled_current_week_qty: 150,
    total_demand: 2350
  },
  {
    product_id: 'prod-004',
    product_name: 'Almojábanas',
    firm_orders_qty: 600,
    forecast_qty: 150,
    safety_stock_qty: 80,
    manual_input_qty: 0,
    backlog_qty: 0,
    unfulfilled_current_week_qty: 0,
    total_demand: 830
  },
  {
    product_id: 'prod-005',
    product_name: 'Pandebono',
    firm_orders_qty: 900,
    forecast_qty: 250,
    safety_stock_qty: 120,
    manual_input_qty: 50,
    backlog_qty: 0,
    unfulfilled_current_week_qty: 0,
    total_demand: 1320
  }
]

// Mock Materials
export const mockMaterials: MockMaterial[] = [
  {
    id: 'mat-001',
    name: 'Harina de Trigo',
    total_required_grams: 50000,
    current_inventory_grams: 55000,
    net_requirement_grams: 0,
    required_arrival_date: '2025-10-25',
    status: 'ok',
    supplier_name: 'Molinos SA',
    lead_time_days: 3
  },
  {
    id: 'mat-002',
    name: 'Queso Campesino',
    total_required_grams: 25000,
    current_inventory_grams: 18000,
    net_requirement_grams: 7000,
    required_arrival_date: '2025-10-22',
    status: 'warning',
    supplier_name: 'Lácteos Del Valle',
    lead_time_days: 2
  },
  {
    id: 'mat-003',
    name: 'Mantequilla',
    total_required_grams: 15000,
    current_inventory_grams: 8000,
    net_requirement_grams: 7000,
    required_arrival_date: '2025-10-21',
    status: 'critical',
    supplier_name: 'Lácteos Del Valle',
    lead_time_days: 2
  },
  {
    id: 'mat-004',
    name: 'Levadura',
    total_required_grams: 3000,
    current_inventory_grams: 4500,
    net_requirement_grams: 0,
    required_arrival_date: '2025-10-26',
    status: 'ok',
    supplier_name: 'Insumos Panadería Pro',
    lead_time_days: 1
  },
  {
    id: 'mat-005',
    name: 'Azúcar',
    total_required_grams: 12000,
    current_inventory_grams: 10000,
    net_requirement_grams: 2000,
    required_arrival_date: '2025-10-23',
    status: 'warning',
    supplier_name: 'Distribuidora Central',
    lead_time_days: 2
  }
]

// Mock Conflicts
export const mockConflicts: MockConflict[] = [
  {
    id: 'conflict-001',
    type: 'material',
    resource_name: 'Mantequilla',
    description: 'Inventario insuficiente. Faltan 7000g para cumplir plan de producción.',
    severity: 'critical',
    suggested_solution: 'Adelantar orden de compra a proveedor Lácteos Del Valle. Lead time: 2 días.',
    affected_ops: ['OP-2025-006']
  },
  {
    id: 'conflict-002',
    type: 'capacity',
    resource_name: 'Horno Principal',
    description: 'Capacidad excedida en 25% para el turno de la mañana del 22/10.',
    severity: 'high',
    suggested_solution: 'Mover 150 unidades de Pan Tajado al turno de la tarde o considerar horas extras.',
    affected_ops: ['OP-2025-005']
  },
  {
    id: 'conflict-003',
    type: 'material',
    resource_name: 'Queso Campesino',
    description: 'Inventario por debajo del mínimo requerido. Faltan 7000g.',
    severity: 'medium',
    suggested_solution: 'Programar llegada de MP antes del 22/10. Contactar a proveedor.',
    affected_ops: ['OP-2025-003']
  },
  {
    id: 'conflict-004',
    type: 'personnel',
    resource_name: 'Operarios Mesa de Trabajo',
    description: '2 operarios reportaron permiso médico para el 21/10 turno tarde.',
    severity: 'medium',
    suggested_solution: 'Asignar personal de turno mañana con pago de horas extras o reprogramar producción.',
    affected_ops: ['OP-2025-004']
  }
]

// Mock Capacity
export const mockCapacity: MockCapacity[] = [
  {
    work_center_id: 'wc-001',
    work_center_name: 'Horno Principal',
    date: '2025-10-20',
    total_capacity_hours: 16,
    planned_hours: 14,
    available_hours: 2,
    utilization_percentage: 87.5,
    status: 'ok'
  },
  {
    work_center_id: 'wc-001',
    work_center_name: 'Horno Principal',
    date: '2025-10-21',
    total_capacity_hours: 16,
    planned_hours: 15.5,
    available_hours: 0.5,
    utilization_percentage: 96.9,
    status: 'warning'
  },
  {
    work_center_id: 'wc-001',
    work_center_name: 'Horno Principal',
    date: '2025-10-22',
    total_capacity_hours: 16,
    planned_hours: 20,
    available_hours: -4,
    utilization_percentage: 125,
    status: 'overload'
  },
  {
    work_center_id: 'wc-002',
    work_center_name: 'Línea de Empaque',
    date: '2025-10-20',
    total_capacity_hours: 16,
    planned_hours: 10,
    available_hours: 6,
    utilization_percentage: 62.5,
    status: 'ok'
  },
  {
    work_center_id: 'wc-003',
    work_center_name: 'Mesa de Trabajo 1',
    date: '2025-10-21',
    total_capacity_hours: 16,
    planned_hours: 8,
    available_hours: 8,
    utilization_percentage: 50,
    status: 'ok'
  }
]

// Helper functions
export function getPlanById(id: string): MockPlan | undefined {
  return mockPlans.find(plan => plan.id === id)
}

export function getProductionOrdersByPlanId(planId: string): MockProductionOrder[] {
  return mockProductionOrders.filter(op => op.plan_id === planId)
}

export function getOverallCompliance(): number {
  const activePlan = mockPlans.find(p => p.status === 'firme' || p.status === 'in_review')
  return activePlan?.compliance_percentage || 0
}

export function getActiveAlertsCount(): number {
  return mockConflicts.filter(c => c.severity === 'critical' || c.severity === 'high').length
}

export function getCriticalMaterialsCount(): number {
  return mockMaterials.filter(m => m.status === 'critical').length
}
