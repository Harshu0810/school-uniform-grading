import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let authInitialized = false;

    // ========================================================================
    // FIXED: Use onAuthStateChange instead of getSession to avoid race condition
    // ========================================================================
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('🔵 Auth event:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔵 User signed in:', session.user.id);
          setUser(session.user);
          authInitialized = true;

          try {
            // Check admin
            console.log('🔵 Checking if admin...');
            const { data: adminData, error: adminError } = await supabase
              .from('admin_users')
              .select('id, email, full_name, role')
              .eq('user_id', session.user.id)
              .single();

            console.log('🔵 Admin check result:', { found: !!adminData, error: adminError?.message });

            if (!adminError && adminData && isMounted) {
              console.log('🔵 User is ADMIN');
              setUserType('admin');
              setUserData(adminData);
              setLoading(false);
              return;
            }

            // Check student
            console.log('🔵 Checking if student...');
            const { data: studentData, error: studentError } = await supabase
              .from('students')
              .select('id, user_id, full_name, class, section, roll_number')
              .eq('user_id', session.user.id)
              .single();

            console.log('🔵 Student check result:', { found: !!studentData, error: studentError?.message });

            if (!studentError && studentData && isMounted) {
              console.log('🔵 User is STUDENT with profile');
              setUserType('student');
              setUserData(studentData);
            } else if (isMounted) {
              console.log('🔵 User is STUDENT without profile');
              setUserType('student');
              setUserData(null);
            }
            
            if (isMounted) {
              setLoading(false);
            }
          } catch (dbErr) {
            console.error('🔵 Database lookup error:', dbErr.message);
            setUserType('student');
            setUserData(null);
            if (isMounted) {
              setLoading(false);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🔵 User signed out');
          setUser(null);
          setUserType(null);
          setUserData(null);
          setLoading(false);
          authInitialized = true;
        } else if (event === 'INITIAL_SESSION') {
          // This event fires when checking initial session on mount
          console.log('🔵 Checking initial session');
          if (!session?.user) {
            console.log('🔵 No initial session found');
            setLoading(false);
            authInitialized = true;
          }
        }
      }
    );

    // Timeout: if auth doesn't complete after 5 seconds, stop loading anyway
    const timeout = setTimeout(() => {
      if (!authInitialized && isMounted) {
        console.warn('🔵 Auth timeout - stopping loading spinner');
        setLoading(false);
        authInitialized = true;
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
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
