import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export function AuthGuard({ children }: { children: ReactNode }) {
  const session = useAuthStore(s => s.session);
  const loading = useAuthStore(s => s.loading);

  if (loading) return null;
  if (!session) return <Navigate to="/" replace />;
  return <>{children}</>;
}
