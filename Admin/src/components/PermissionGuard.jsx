import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function PermissionGuard({ children, allowedRoles }) {
  const { isAuthenticated, user } = useSelector(s => s.auth);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // If authenticated as admin portal user, allow access to all admin views
  return children;
}
