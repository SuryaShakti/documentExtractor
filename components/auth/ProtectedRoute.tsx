"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect while loading
    if (loading) return;

    // Check if user is authenticated
    if (!user || !token) {
      // Redirect to login with current path as return URL
      const returnUrl = encodeURIComponent(pathname);
      router.push(`${redirectTo}?from=${returnUrl}`);
      return;
    }

    // Check admin requirement
    if (requireAdmin && user.role !== 'admin') {
      router.push('/dashboard'); // Redirect non-admin users to dashboard
      return;
    }
  }, [user, loading, token, router, pathname, requireAdmin, redirectTo]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!user || !token) {
    return null;
  }

  // Don't render if admin required but user is not admin
  if (requireAdmin && user.role !== 'admin') {
    return null;
  }

  // Render children if all checks pass
  return <>{children}</>;
}

export default ProtectedRoute;
