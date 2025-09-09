import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRoutePermissions, logAccessDenied } from '@/lib/auth-helpers'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

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
    // Verificar permisos de la ruta
    const { allowed, user, redirectUrl, errorMessage } = await checkRoutePermissions(request)

    if (!allowed) {
      // Log del intento de acceso denegado
      await logAccessDenied(
        user,
        pathname,
        errorMessage || 'Access denied',
        request.headers.get('user-agent') || undefined,
        request.ip || request.headers.get('x-forwarded-for') || undefined
      )

      if (redirectUrl) {
        const url = new URL(redirectUrl, request.url)
        
        // Si es redirección a 403, agregar mensaje personalizado
        if (redirectUrl === '/403' && errorMessage) {
          url.searchParams.set('message', encodeURIComponent(errorMessage))
        }
        
        return NextResponse.redirect(url)
      }

      // Fallback: respuesta 403 directa
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Si el acceso está permitido, continuar
    return NextResponse.next()

  } catch (error) {
    console.error('Error in middleware:', error)
    
    // En caso de error, permitir el acceso pero logear el error
    // Esto evita que errores del middleware rompan toda la aplicación
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