import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isPublicRoute } from '@/lib/permissions'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''

  // Skip middleware for static files and API routes that don't need protection
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_') ||
    pathname.includes('favicon.ico') ||
    pathname.startsWith('/public/')
  ) {
    return NextResponse.next()
  }

  try {
    // Domain-based routing: soypastry.app goes directly to login
    if (pathname === '/' && hostname.includes('soypastry.app')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Solo manejar rutas públicas y algunas protecciones básicas
    // La validación completa la hace el RouteGuard del lado del cliente

    // Permitir rutas públicas siempre
    if (isPublicRoute(pathname)) {
      return NextResponse.next()
    }

    // Para rutas protegidas, solo verificar que no sea un intento obvio de acceso directo
    // sin sesión activa, pero sin hacer validación compleja server-side

    // Permitir acceso y dejar que RouteGuard maneje la validación
    return NextResponse.next()

  } catch (error) {
    console.error('Error in middleware:', error)

    // En caso de error, siempre permitir el acceso
    // RouteGuard se encargará de la validación
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}