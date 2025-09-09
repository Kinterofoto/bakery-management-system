"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { hasRouteAccess, isPublicRoute, getAccessDeniedMessage } from '@/lib/permissions'

interface RouteGuardProps {
  children: React.ReactNode
  requiredRoles?: string[]
  requiredPermissions?: string[]
}

export function RouteGuard({ children, requiredRoles, requiredPermissions }: RouteGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect if still loading or on public routes
    if (loading || isPublicRoute(pathname)) {
      return
    }

    // Check access using the centralized permission system
    const hasAccess = hasRouteAccess(user, pathname)

    if (!hasAccess) {
      if (!user) {
        // Redirect to login if not authenticated
        const loginUrl = new URL('/login', window.location.origin)
        loginUrl.searchParams.set('redirectTo', pathname)
        router.push(loginUrl.toString())
        return
      } else {
        // Redirect to 403 if authenticated but no permissions
        const errorMessage = getAccessDeniedMessage(pathname, user)
        const forbiddenUrl = new URL('/403', window.location.origin)
        forbiddenUrl.searchParams.set('message', encodeURIComponent(errorMessage))
        router.push(forbiddenUrl.toString())
        return
      }
    }

    // Legacy support: Check specific role requirements passed as props
    if (requiredRoles && requiredRoles.length > 0) {
      if (!user?.role || !requiredRoles.includes(user.role)) {
        const errorMessage = `Esta página requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`
        const forbiddenUrl = new URL('/403', window.location.origin)
        forbiddenUrl.searchParams.set('message', encodeURIComponent(errorMessage))
        router.push(forbiddenUrl.toString())
        return
      }
    }

    // Legacy support: Check specific permission requirements passed as props
    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!user?.permissions) {
        router.push('/403')
        return
      }

      const hasRequiredPermissions = requiredPermissions.every(
        permission => user.permissions?.[permission as keyof typeof user.permissions]
      )

      if (!hasRequiredPermissions) {
        const errorMessage = `Te faltan los siguientes permisos: ${requiredPermissions.join(', ')}`
        const forbiddenUrl = new URL('/403', window.location.origin)
        forbiddenUrl.searchParams.set('message', encodeURIComponent(errorMessage))
        router.push(forbiddenUrl.toString())
        return
      }
    }
  }, [user, loading, pathname, router, requiredRoles, requiredPermissions])

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show children if authenticated and authorized
  if (user && !isPublicRoute(pathname)) {
    return <>{children}</>
  }

  // Show children for public routes
  if (isPublicRoute(pathname)) {
    return <>{children}</>
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}