// context/AuthContext.js
// Global state for authentication across the app

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChange, getCurrentUser } from '../services/authService';

// Create context
const AuthContext = createContext(null);

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null); // 'student', 'admin', or null
  const [userData, setUserData] = useState(null); // Student or Admin object
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen to auth state changes
  useEffect(() => {
    setLoading(true);

    // Unsubscribe function
    const unsubscribe = onAuthStateChange(async (authState) => {
      try {
        if (authState.event === 'SIGNED_IN') {
          setUser(authState.user);
          setUserType(authState.userType);
          setUserData(authState.userData);
          setError(null);
        } else if (authState.event === 'SIGNED_OUT') {
          setUser(null);
          setUserType(null);
          setUserData(null);
        } else if (authState.event === 'USER_UPDATED') {
          setUser(authState.user);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    // Check if user already logged in
    const checkUser = async () => {
      try {
        const result = await getCurrentUser();
        if (result.success && result.user) {
          setUser(result.user);
          setUserType(result.userType);
          setUserData(result.userData);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  const value = {
    user,
    userType,
    userData,
    loading,
    error,
    isAuthenticated: !!user,
    isStudent: userType === 'student',
    isAdmin: userType === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
