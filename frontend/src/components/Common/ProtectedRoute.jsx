// components/Common/ProtectedRoute.jsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

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

  // Check role and redirect appropriately
  switch (requiredRole) {
    case 'student':
      // Only students can access
      if (!isStudent) {
        // If admin, redirect to admin dashboard
        if (isAdmin) {
          return <Navigate to="/admin" replace />;
        }
        // Otherwise, redirect to login
        return <Navigate to="/login" replace />;
      }
      break;

    case 'admin':
      // Only admins can access
      if (!isAdmin) {
        // If student, redirect to student dashboard
        if (isStudent) {
          return <Navigate to="/dashboard" replace />;
        }
        // Otherwise, redirect to login
        return <Navigate to="/login" replace />;
      }
      break;

    case 'authenticated':
      // Any authenticated user
      break;

    default:
      break;
  }

  // All checks passed → render component
  return element;
};

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
