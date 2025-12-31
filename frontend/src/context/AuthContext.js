// context/AuthContext.js

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && isMounted) {
          setUser(session.user);
          
          // Get user type and data
          try {
            // Check admin first
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('id, email, full_name, role')
              .eq('user_id', session.user.id)
              .single();

            if (adminData && isMounted) {
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
              .single();

            if (studentData && isMounted) {
              setUserType('student');
              setUserData(studentData);
            } else {
              // Student exists but no profile
              setUserType('student');
              setUserData(null);
            }
          } catch (dbErr) {
            console.error('Error fetching user data:', dbErr);
            // Don't break - set as student by default
            setUserType('student');
            setUserData(null);
          }
        } else {
          // No session
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

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('Auth event:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);

          try {
            // Check admin first
            const { data: adminData } = await supabase
              .from('admin_users')
              .select('id, email, full_name, role')
              .eq('user_id', session.user.id)
              .single();

            if (adminData) {
              setUserType('admin');
              setUserData(adminData);
              return;
            }

            // Check student
            const { data: studentData } = await supabase
              .from('students')
              .select('id, user_id, full_name, class, section, roll_number')
              .eq('user_id', session.user.id)
              .single();

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
