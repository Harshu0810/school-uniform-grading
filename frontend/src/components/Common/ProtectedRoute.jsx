FILE 2: components/Common/ProtectedRoute.jsx - COMPLETE REPLACEMENT
// ============================================================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProtectedRoute: Protects routes based on authentication and role
 * 
 * Props:
 * - element: Component to render if authorized
 * - requiredRole: 'student', 'admin', or 'authenticated' (any logged-in user)
 */
export const ProtectedRoute = ({
  element,
  requiredRole = 'authenticated',
}) => {
  const { isAuthenticated, isStudent, isAdmin, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return <LoadingSpinner />;
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access
  switch (requiredRole) {
    case 'student':
      // Only students can access student routes
      if (isStudent) {
        return element;
      }
      // If they're admin, redirect to admin dashboard
      if (isAdmin) {
        return <Navigate to="/admin" replace />;
      }
      // Otherwise redirect to login
      return <Navigate to="/login" replace />;

    case 'admin':
      // Only admins can access admin routes
      if (isAdmin) {
        return element;
      }
      // If they're student, redirect to student dashboard
      if (isStudent) {
        return <Navigate to="/dashboard" replace />;
      }
      // Otherwise redirect to login
      return <Navigate to="/login" replace />;

    case 'authenticated':
      // Any authenticated user can access
      return element;

    default:
      return element;
  }
};

/**
 * Hook for checking authorization inside components
 */
export const useProtectedRoute = (requiredRole = 'authenticated') => {
  const { isAuthenticated, isStudent, isAdmin, loading } = useAuth();

  const isAuthorized = () => {
    if (!isAuthenticated) return false;

    switch (requiredRole) {
      case 'student':
        return isStudent;
      case 'admin':
        return isAdmin;
      case 'authenticated':
        return true;
      default:
        return false;
    }
  };

  return {
    isAuthorized: isAuthorized(),
    loading,
    isStudent,
    isAdmin,
  };
};
