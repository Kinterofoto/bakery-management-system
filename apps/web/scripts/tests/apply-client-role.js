// Script to apply client role migration directly via Supabase client
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('Applying client role migration...')

  try {
    // First, drop the constraint
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;'
    })

    if (dropError) {
      console.log('Note: Could not drop constraint (may not exist):', dropError.message)
    }

    // Add the new constraint with client role
    const { error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE users ADD CONSTRAINT users_role_check
            CHECK (role IN ('admin', 'reviewer_area1', 'reviewer_area2', 'dispatcher', 'driver', 'commercial', 'client'));`
    })

    if (constraintError) {
      console.error('Error adding constraint:', constraintError)
      throw constraintError
    }

    console.log('✓ Role constraint updated')

    // Update existing users to add ecommerce permission
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, permissions')

    if (fetchError) {
      console.error('Error fetching users:', fetchError)
      throw fetchError
    }

    console.log(`Found ${users.length} users to update`)

    // Update each user with ecommerce permission
    for (const user of users) {
      const permissions = user.permissions || {}

      // Only update if ecommerce permission doesn't exist
      if (!('ecommerce' in permissions)) {
        const updatedPermissions = { ...permissions, ecommerce: false }

        const { error: updateError } = await supabase
          .from('users')
          .update({ permissions: updatedPermissions })
          .eq('id', user.id)

        if (updateError) {
          console.error(`Error updating user ${user.id}:`, updateError)
        } else {
          console.log(`✓ Updated user ${user.id}`)
        }
      }
    }

    console.log('\n✅ Migration completed successfully!')
    console.log('\nYou can now:')
    console.log('1. Create users with role "client"')
    console.log('2. Set ecommerce permission to true for client users')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyMigration()
