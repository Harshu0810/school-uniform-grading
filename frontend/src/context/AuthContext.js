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
    let isMounted = true;

    // Check initial auth state on mount
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        if (session?.user && isMounted) {
          setUser(session.user);
          
          // Determine user type
          let foundUserType = null;
          let foundUserData = null;

          try {
            // Check if admin
            const { data: adminData, error: adminError } = await supabase
              .from('admin_users')
              .select('*')
              .eq('user_id', session.user.id)
              .single();

            if (!adminError && adminData) {
              foundUserType = 'admin';
              foundUserData = adminData;
            } else {
              // Check if student
              const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

              if (!studentError && studentData) {
                foundUserType = 'student';
                foundUserData = studentData;
              } else {
                // User exists but no profile yet
                foundUserType = 'student';
                foundUserData = null;
              }
            }
          } catch (err) {
            console.error('Error fetching user type:', err);
            foundUserType = 'student';
            foundUserData = null;
          }

          if (isMounted) {
            setUserType(foundUserType);
            setUserData(foundUserData);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);

          let foundUserType = null;
          let foundUserData = null;

          try {
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
          } catch (err) {
            console.error('Error fetching user type:', err);
            foundUserType = 'student';
            foundUserData = null;
          }

          if (isMounted) {
            setUserType(foundUserType);
            setUserData(foundUserData);
            setError(null);
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
            setUserType(null);
            setUserData(null);
          }
        }
      }
    );

    // Cleanup
    return () => {
      isMounted = false;
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
