const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debugOrders() {
  console.log('🔍 Debugging order states...\n')
  
  try {
    // Check all ready_dispatch orders
    const { data: allReady, error: error1 } = await supabase
      .from('orders')
      .select('id, order_number, status, assigned_route_id, is_invoiced')
      .eq('status', 'ready_dispatch')
    
    if (error1) {
      console.error('Error fetching ready_dispatch orders:', error1)
      return
    }
    
    console.log('📋 All ready_dispatch orders:')
    allReady.forEach(order => {
      console.log(`  - ${order.order_number}: assigned_route_id=${order.assigned_route_id}, is_invoiced=${order.is_invoiced}`)
    })
    console.log(`Total ready_dispatch: ${allReady.length}\n`)
    
    // Check orders with NULL assigned_route_id
    const { data: unassigned, error: error2 } = await supabase
      .from('orders')
      .select('id, order_number, status, assigned_route_id, is_invoiced')
      .eq('status', 'ready_dispatch')
      .is('assigned_route_id', null)
    
    if (error2) {
      console.error('Error fetching unassigned orders:', error2)
      return
    }
    
    console.log('🚫 Ready_dispatch orders with NULL assigned_route_id:')
    unassigned.forEach(order => {
      console.log(`  - ${order.order_number}: is_invoiced=${order.is_invoiced}`)
    })
    console.log(`Total unassigned: ${unassigned.length}\n`)
    
    // Check orders that should be available (all 3 conditions)
    const { data: available, error: error3 } = await supabase
      .from('orders')
      .select('id, order_number, status, assigned_route_id, is_invoiced')
      .eq('status', 'ready_dispatch')
      .is('assigned_route_id', null)
      .eq('is_invoiced', false)
    
    if (error3) {
      console.error('Error fetching available orders:', error3)
      return
    }
    
    console.log('✅ Orders that should be available for assignment:')
    available.forEach(order => {
      console.log(`  - ${order.order_number}`)
    })
    console.log(`Total available: ${available.length}\n`)
    
    // Check if is_invoiced column exists and has correct default
    const { data: schema, error: error4 } = await supabase
      .from('orders')
      .select('is_invoiced')
      .limit(1)
    
    if (error4) {
      console.error('⚠️  is_invoiced column might not exist:', error4.message)
    } else {
      console.log('✅ is_invoiced column exists and is accessible')
    }
    
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

debugOrders()