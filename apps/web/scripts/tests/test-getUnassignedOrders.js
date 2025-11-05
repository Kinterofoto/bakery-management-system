const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testGetUnassignedOrders() {
  console.log('🧪 Testing getUnassignedOrders function...\n')
  
  try {
    // Simulate the exact same query from the hook
    const { data: allOrders, error } = await supabase
      .from("orders")
      .select(`
        *,
        clients(*),
        branches(*),
        order_items(
          *,
          products(*)
        )
      `)
      .eq("status", "ready_dispatch")
      .is("assigned_route_id", null)
      .eq("is_invoiced", false)
      .order("created_at", { ascending: true })

    if (error) {
      console.error('❌ Error from Supabase:', error)
      return
    }

    console.log(`✅ Query successful! Found ${allOrders.length} orders`)
    
    if (allOrders.length > 0) {
      console.log('\n📋 Order details:')
      allOrders.forEach(order => {
        console.log(`  - Order: ${order.order_number}`)
        console.log(`    ID: ${order.id}`)
        console.log(`    Status: ${order.status}`)
        console.log(`    Assigned Route ID: ${order.assigned_route_id}`)
        console.log(`    Is Invoiced: ${order.is_invoiced}`)
        console.log(`    Client: ${order.clients?.name || 'No client'}`)
        console.log(`    Items: ${order.order_items?.length || 0}`)
        console.log('')
      })
    } else {
      console.log('📋 No orders found matching criteria')
    }
    
  } catch (err) {
    console.error('💥 Unexpected error:', err)
  }
}

testGetUnassignedOrders()