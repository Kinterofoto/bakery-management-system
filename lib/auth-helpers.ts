import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { hasRouteAccess, getAccessDeniedMessage } from './permissions'
import type { ExtendedUser } from '@/contexts/AuthContext'

// Función para crear cliente Supabase en el servidor
function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      }
    }
  )
}

// Función para obtener el usuario autenticado en el servidor
export async function getServerUser(): Promise<ExtendedUser | null> {
  try {
    const cookieStore = cookies()
    const supabase = createServerSupabaseClient()
    
    // Obtener token de las cookies
    const accessToken = cookieStore.get('sb-access-token')?.value
    const refreshToken = cookieStore.get('sb-refresh-token')?.value
    
    if (!accessToken) {
      return null
    }
    
    // Establecer la sesión
    const { data: { session }, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || ''
    })
    
    if (sessionError || !session?.user) {
      return null
    }

    // Obtener datos extendidos del usuario desde la tabla public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name, role, permissions, status, last_login')
      .eq('id', session.user.id)
      .single()

    if (userError || !userData) {
      // Retornar usuario básico si no se encuentran datos extendidos
      return {
        ...session.user,
        name: session.user.email?.split('@')[0] || 'Usuario',
        role: 'commercial',
        permissions: { crm: true, users: false, orders: true, inventory: true, routes: false, clients: true, returns: false, production: false },
        status: 'active'
      } as ExtendedUser
    }

    // Retornar usuario con datos completos
    return {
      ...session.user,
      name: userData.name || session.user.email?.split('@')[0] || 'Usuario',
      role: userData.role || 'commercial',
      permissions: userData.permissions || { crm: true, users: false, orders: true, inventory: true, routes: false, clients: true, returns: false, production: false },
      status: userData.status || 'active',
      last_login: userData.last_login
    } as ExtendedUser

  } catch (error) {
    console.error('Error getting server user:', error)
    return null
  }
}

// Función para verificar permisos en el middleware
export async function checkRoutePermissions(request: NextRequest): Promise<{
  allowed: boolean
  user: ExtendedUser | null
  redirectUrl?: string
  errorMessage?: string
}> {
  const pathname = request.nextUrl.pathname
  const user = await getServerUser()

  // Verificar acceso usando la función de permisos
  const allowed = hasRouteAccess(user, pathname)
  
  if (!allowed) {
    const errorMessage = getAccessDeniedMessage(pathname, user)
    
    // Si no hay usuario, redirigir a login
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirectTo', pathname)
      return {
        allowed: false,
        user,
        redirectUrl: loginUrl.toString(),
        errorMessage
      }
    }
    
    // Si hay usuario pero no tiene permisos, redirigir a página 403
    return {
      allowed: false,
      user,
      redirectUrl: '/403',
      errorMessage
    }
  }

  return { allowed: true, user }
}

// HOC para proteger API routes
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: ExtendedUser, ...args: T) => Promise<NextResponse>,
  options?: {
    requiredPermissions?: Array<keyof NonNullable<ExtendedUser['permissions']>>
    requiredRoles?: Array<ExtendedUser['role']>
  }
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const user = await getServerUser()
      
      if (!user) {
        return NextResponse.json(
          { error: 'No autorizado. Debes iniciar sesión.' },
          { status: 401 }
        )
      }

      // Verificar permisos específicos si se proporcionan
      if (options?.requiredPermissions) {
        const hasPermissions = options.requiredPermissions.every(
          permission => user.permissions?.[permission] === true
        )
        
        if (!hasPermissions) {
          return NextResponse.json(
            { error: 'No tienes los permisos necesarios para esta operación.' },
            { status: 403 }
          )
        }
      }

      // Verificar roles específicos si se proporcionan
      if (options?.requiredRoles) {
        if (!user.role || !options.requiredRoles.includes(user.role)) {
          return NextResponse.json(
            { error: 'No tienes el rol necesario para esta operación.' },
            { status: 403 }
          )
        }
      }

      // Si todo está bien, ejecutar el handler
      return await handler(request, user, ...args)
      
    } catch (error) {
      console.error('Error in withAuth wrapper:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor.' },
        { status: 500 }
      )
    }
  }
}

// Función para crear respuestas de error estandarizadas
export function createAuthErrorResponse(status: 401 | 403 | 500, message?: string) {
  const messages = {
    401: 'No autorizado. Debes iniciar sesión.',
    403: 'No tienes permisos para realizar esta acción.',
    500: 'Error interno del servidor.'
  }
  
  return NextResponse.json(
    { error: message || messages[status] },
    { status }
  )
}

// Función para log de intentos de acceso denegado
export async function logAccessDenied(
  user: ExtendedUser | null,
  pathname: string,
  reason: string,
  userAgent?: string,
  ip?: string
) {
  try {
    const supabase = createServerSupabaseClient()
    
    await supabase.from('access_logs').insert({
      user_id: user?.id || null,
      user_email: user?.email || null,
      attempted_path: pathname,
      access_denied_reason: reason,
      user_agent: userAgent,
      ip_address: ip,
      attempted_at: new Date().toISOString()
    })
  } catch (error) {
    // Silently fail - logging is not critical
    console.error('Error logging access denied:', error)
  }
}