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
  // ← ADD THIS DEBUG CODE
  try {
    console.log('🔵 AuthContext: Initializing...');
    console.log('🔵 Supabase client:', supabase);
    console.log('🔵 Auth instance:', supabase.auth);
        
        // Small delay to ensure Supabase is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session?.user && isMounted) {
          console.log('🔵 AuthContext: User found:', session.user.id);
          setUser(session.user);
          
          try {
            // Check admin first
            const { data: adminData, error: adminError } = await supabase
              .from('admin_users')
              .select('id, email, full_name, role')
              .eq('user_id', session.user.id)
              .single();

            if (!adminError && adminData && isMounted) {
              console.log('🔵 AuthContext: User is ADMIN');
              setUserType('admin');
              setUserData(adminData);
              setLoading(false);
              return;
            }

            // Check student
            const { data: studentData, error: studentError } = await supabase
              .from('students')
              .select('id, user_id, full_name, class, section, roll_number')
              .eq('user_id', session.user.id)
              .single();

            if (!studentError && studentData && isMounted) {
              console.log('🔵 AuthContext: User is STUDENT with profile');
              setUserType('student');
              setUserData(studentData);
            } else if (isMounted) {
              console.log('🔵 AuthContext: User is STUDENT without profile (needs onboarding)');
              setUserType('student');
              setUserData(null);
            }
          } catch (dbErr) {
            console.error('🔵 AuthContext: DB error (not critical):', dbErr.message);
            // Not critical - user exists, just incomplete profile
            setUserType('student');
            setUserData(null);
          }
        } else {
          console.log('🔵 AuthContext: No session found');
          setUser(null);
          setUserType(null);
          setUserData(null);
        }
      } catch (err) {
        console.error('🔵 AuthContext: CRITICAL ERROR:', err);
        setError(err.message);
        setUser(null);
        setUserType(null);
        setUserData(null);
      } finally {
        // ← CRITICAL: ALWAYS set loading to false
        if (isMounted) {
          console.log('🔵 AuthContext: Finished initializing, setting loading=false');
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('🔵 AuthContext: Auth event:', event);

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
