// components/Common/ProtectedRoute.jsx
// Handles role-based routing and access control

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
 * - fallback: Route to redirect if not authorized (default: '/login')
 */
export const ProtectedRoute = ({
  element,
  requiredRole = 'authenticated',
  fallback = '/login',
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

  // Check role
  switch (requiredRole) {
    case 'student':
      if (!isStudent) {
        // Student trying to access admin route → redirect
        return <Navigate to="/admin-denied" replace />;
      }
      break;

    case 'admin':
      if (!isAdmin) {
        // Admin trying to access student route or non-admin → redirect
        return <Navigate to="/admin-denied" replace />;
      }
      break;

    case 'authenticated':
      // Any authenticated user is fine
      break;

    default:
      break;
  }

  // All checks passed → render component
  return element;
};

/**
 * Alternative: useProtectedRoute hook
 * Use this if you prefer a hook-based approach
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
