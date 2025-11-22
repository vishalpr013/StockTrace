import { useAuth } from './AuthContext';

/**
 * RoleGuard component for conditional rendering based on user role
 * 
 * Usage:
 * <RoleGuard roles={['ADMIN']}>
 *   <button>Admin Only Button</button>
 * </RoleGuard>
 * 
 * <RoleGuard roles={['ADMIN', 'STAFF']}>
 *   <button>Staff and Admin Button</button>
 * </RoleGuard>
 */

export const RoleGuard = ({ roles, children, fallback = null }) => {
  const { user } = useAuth();
  
  if (!user) return fallback;
  
  const hasAccess = roles.includes(user.role);
  
  return hasAccess ? children : fallback;
};

/**
 * Hook to check if user has specific role(s)
 * 
 * Usage:
 * const isAdmin = useRole('ADMIN');
 * const canEdit = useRole(['ADMIN', 'STAFF']);
 */
export const useRole = (roles) => {
  const { user } = useAuth();
  
  if (!user) return false;
  
  if (Array.isArray(roles)) {
    return roles.includes(user.role);
  }
  
  return user.role === roles;
};

/**
 * AdminOnly component - shorthand for admin-only features
 */
export const AdminOnly = ({ children, fallback = null }) => {
  return <RoleGuard roles={['ADMIN']} fallback={fallback}>{children}</RoleGuard>;
};

/**
 * StaffAndAdmin component - shorthand for staff + admin features
 */
export const StaffAndAdmin = ({ children, fallback = null }) => {
  return <RoleGuard roles={['ADMIN', 'STAFF']} fallback={fallback}>{children}</RoleGuard>;
};
