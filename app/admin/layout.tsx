"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requireAdmin redirectTo="/dashboard">
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
