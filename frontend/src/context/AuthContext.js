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

    const initAuth = async () => {
      try {
        console.log('🔵 AuthContext: Starting initialization');
        console.log('🔵 Supabase available:', !!supabase);
        console.log('🔵 Auth available:', !!supabase?.auth);

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get session
        console.log('🔵 Calling getSession...');
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        console.log('🔵 getSession result:', { 
          hasSession: !!data?.session, 
          userId: data?.session?.user?.id,
          sessionError 
        });

        if (sessionError) {
          throw sessionError;
        }

        if (data?.session?.user && isMounted) {
          const userId = data.session.user.id;
          console.log('🔵 User logged in:', userId);
          setUser(data.session.user);

          try {
            // Check admin
            console.log('🔵 Checking if admin...');
            const { data: adminData, error: adminError } = await supabase
              .from('admin_users')
              .select('id, email, full_name, role')
              .eq('user_id', userId)
              .single();

            console.log('🔵 Admin check result:', { found: !!adminData, error: adminError?.message });

            if (!adminError && adminData && isMounted) {
              console.log('🔵 User is ADMIN');
              setUserType('admin');
              setUserData(adminData);
              return;
            }

            // Check student
            console.log('🔵 Checking if student...');
            const { data: studentData, error: studentError } = await supabase
              .from('students')
              .select('id, user_id, full_name, class, section, roll_number')
              .eq('user_id', userId)
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
          } catch (dbErr) {
            console.error('🔵 Database lookup error:', dbErr.message);
            setUserType('student');
            setUserData(null);
          }
        } else {
          console.log('🔵 No user session');
          setUser(null);
          setUserType(null);
          setUserData(null);
        }
      } catch (err) {
        console.error('🔵 CRITICAL ERROR:', err.message);
        setError(err.message);
        setUser(null);
        setUserType(null);
        setUserData(null);
      } finally {
        if (isMounted) {
          console.log('🔵 Auth complete, setting loading=false');
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('🔵 Auth event:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);

          try {
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
            console.error('DB error:', dbErr);
            setUserType('student');
            setUserData(null);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🔵 User signed out');
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
