import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// 1. SIGNUP (Student)
// ============================================================================

export const signupStudent = async (email, password, admissionNumber) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    localStorage.setItem('temp_admission_number', admissionNumber);

    return {
      success: true,
      message: 'Signup successful! Please check your email to verify.',
      userId: authData.user.id,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================================================
// 2. LOGIN (Student + Admin unified)
// ============================================================================

export const login = async (email, password) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    const user = authData.user;

    if (!user.email_confirmed_at) {
      return {
        success: false,
        error: 'Please verify your email first. Check your inbox for the verification link.',
      };
    }

    // Check if user is admin
    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!adminError && adminData) {
      return {
        success: true,
        userType: 'admin',
        user,
        userData: adminData,
      };
    }

    // Check if user is student
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!studentError && studentData) {
      return {
        success: true,
        userType: 'student',
        user,
        userData: studentData,
      };
    }

    // User is student but profile not completed (first login)
    return {
      success: true,
      userType: 'student',
      user,
      userData: null,
      needsOnboarding: true,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================================================
// 3. CREATE STUDENT PROFILE (During onboarding)
// ============================================================================

export const createStudentProfile = async (userId, profileData) => {
  try {
    const { fullName, class: className, section, rollNumber } = profileData;

    const { data, error } = await supabase
      .from('students')
      .insert([
        {
          user_id: userId,
          full_name: fullName,
          class: className,
          section,
          roll_number: rollNumber,
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    localStorage.removeItem('temp_admission_number');

    return { success: true, userData: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================================================
// 4. GET CURRENT USER
// ============================================================================

export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { success: false, user: null, userType: null, userData: null };
    }

    let userType = null;
    let userData = null;

    // Check if admin
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (adminData) {
      userType = 'admin';
      userData = adminData;
    } else {
      // Check if student
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (studentData) {
        userType = 'student';
        userData = studentData;
      }
    }

    return {
      success: true,
      user,
      userType,
      userData,
    };
  } catch (error) {
    return { success: false, error: error.message, user: null, userType: null, userData: null };
  }
};

// ============================================================================
// 5. LOGOUT
// ============================================================================

export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    localStorage.removeItem('temp_admission_number');

    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================================================
// 6. LISTEN TO AUTH STATE CHANGES (Real-time)
// ============================================================================

export const onAuthStateChange = (callback) => {
  const { data: listener } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN') {
        const userInfo = await getCurrentUser();
        callback({
          event,
          user: session.user,
          userType: userInfo.userType,
          userData: userInfo.userData,
          success: userInfo.success,
        });
      } else if (event === 'SIGNED_OUT') {
        callback({ event, user: null, userType: null, userData: null });
      } else if (event === 'USER_UPDATED') {
        const userInfo = await getCurrentUser();
        callback({
          event,
          user: session.user,
          userType: userInfo.userType,
          userData: userInfo.userData,
          success: userInfo.success,
        });
      }
    }
  );

  return listener?.subscription?.unsubscribe || (() => {});
};

// ============================================================================
// 7. PASSWORD RESET
// ============================================================================

export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'Password reset link sent to your email',
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================================================
// 8. UPDATE PASSWORD
// ============================================================================

export const updatePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Password updated successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ============================================================================
// 9. CHECK IF USER IS ADMIN
// ============================================================================

export const isUserAdmin = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return false;
    }

    return !!data;
  } catch (error) {
    return false;
  }
};

// ============================================================================
// 10. CHECK IF USER IS STUDENT
// ============================================================================

export const isUserStudent = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return false;
    }

    return !!data;
  } catch (error) {
    return false;
  }
};

// ============================================================================
// 11. GET SESSION
// ============================================================================

export const getSession = async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      return { success: false, session: null };
    }

    return { success: true, session };
  } catch (error) {
    return { success: false, error: error.message, session: null };
  }
};

// ============================================================================
// 12. VERIFY EMAIL TOKEN (When user clicks link in email)
// ============================================================================

export const verifyEmailToken = async (token) => {
  try {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Email verified successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
