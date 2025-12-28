import { supabase } from './authService';

export const getStudentProfile = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (error) throw error;

    return { success: true, student: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateStudentProfile = async (studentId, updates) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, student: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
