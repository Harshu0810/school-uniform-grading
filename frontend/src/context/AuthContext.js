// context/AuthContext.js
// Global state for authentication across the app

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/authService';

// Create context
const AuthContext = createContext(null);

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          setLoading(false);
          return;
        }

        if (authUser) {
          setUser(authUser);
          
          // Determine user type
          let foundUserType = null;
          let foundUserData = null;

          // Check if admin
          const { data: adminData, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('user_id', authUser.id)
            .single();

          if (!adminError && adminData) {
            foundUserType = 'admin';
            foundUserData = adminData;
          } else {
            // Check if student
            const { data: studentData, error: studentError } = await supabase
              .from('students')
              .select('*')
              .eq('user_id', authUser.id)
              .single();

            if (!studentError && studentData) {
              foundUserType = 'student';
              foundUserData = studentData;
            } else {
              // User exists but no profile
              foundUserType = 'student';
              foundUserData = null;
            }
          }

          setUserType(foundUserType);
          setUserData(foundUserData);
        }
      } catch (err) {
        console.error('Error checking auth:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);

          // Get user type
          let foundUserType = null;
          let foundUserData = null;

          const { data: adminData } = await supabase
            .from('admin_users')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          if (adminData) {
            foundUserType = 'admin';
            foundUserData = adminData;
          } else {
            const { data: studentData } = await supabase
              .from('students')
              .select('*')
              .eq('user_id', session.user.id)
              .single();

            if (studentData) {
              foundUserType = 'student';
              foundUserData = studentData;
            } else {
              foundUserType = 'student';
              foundUserData = null;
            }
          }

          setUserType(foundUserType);
          setUserData(foundUserData);
          setError(null);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserType(null);
          setUserData(null);
        }
      }
    );

    // Cleanup
    return () => {
      subscription?.unsubscribe();
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
