"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface RouteGuardProps {
  children: React.ReactNode
  requiredRoles?: string[]
  requiredPermissions?: string[]
}

const publicRoutes = ['/login', '/signup']

export function RouteGuard({ children, requiredRoles, requiredPermissions }: RouteGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Don't redirect if still loading or on public routes
    if (loading || publicRoutes.includes(pathname)) {
      return
    }

    // Redirect to login if not authenticated
    if (!user) {
      const loginUrl = new URL('/login', window.location.origin)
      loginUrl.searchParams.set('redirectTo', pathname)
      router.push(loginUrl.toString())
      return
    }

    // Check role requirements
    if (requiredRoles && requiredRoles.length > 0) {
      if (!user.role || !requiredRoles.includes(user.role)) {
        router.push('/login?error=insufficient_permissions')
        return
      }
    }

    // Check permission requirements
    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!user.permissions) {
        router.push('/login?error=insufficient_permissions')
        return
      }

      const hasRequiredPermissions = requiredPermissions.every(
        permission => user.permissions?.[permission as keyof typeof user.permissions]
      )

      if (!hasRequiredPermissions) {
        router.push('/login?error=insufficient_permissions')
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
  if (user && !publicRoutes.includes(pathname)) {
    return <>{children}</>
  }

  // Show children for public routes
  if (publicRoutes.includes(pathname)) {
    return <>{children}</>
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}