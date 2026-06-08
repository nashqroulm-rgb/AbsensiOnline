import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
  /** Restrict to admin / super_admin */
  adminOnly?: boolean;
};

export default function ProtectedRoute({ adminOnly }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  if (adminOnly && !isAdmin) {
    return <Navigate to="/app/home" replace />;
  }

  return <Outlet />;
}
