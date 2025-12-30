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

    const initAuth = async () => {
      try {
        // Check if there's an active session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && isMounted) {
          setUser(session.user);
          
          // Try to get user type, but don't block if it fails
          try {
            // Check admin first
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('id, email, full_name, role')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (adminData) {
              setUserType('admin');
              setUserData(adminData);
              setLoading(false);
              return;
            }

            // Check student
            const { data: studentData } = await supabase
              .from('students')
              .select('id, user_id, full_name, class, section, roll_number')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (studentData) {
              setUserType('student');
              setUserData(studentData);
            } else {
              // Student with no profile yet
              setUserType('student');
              setUserData(null);
            }
          } catch (dbErr) {
            console.error('Database error:', dbErr);
            // Don't block - set as student by default
            setUserType('student');
            setUserData(null);
          }
        } else {
          // No session - user is logged out
          setUser(null);
          setUserType(null);
          setUserData(null);
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('Auth event:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);

          try {
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('id, email, full_name, role')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (adminData) {
              setUserType('admin');
              setUserData(adminData);
              return;
            }

            const { data: studentData } = await supabase
              .from('students')
              .select('id, user_id, full_name, class, section, roll_number')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (studentData) {
              setUserType('student');
              setUserData(studentData);
            } else {
              setUserType('student');
              setUserData(null);
            }
          } catch (dbErr) {
            console.error('Error fetching user data:', dbErr);
            setUserType('student');
            setUserData(null);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserType(null);
          setUserData(null);
        }
      }
    );

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
