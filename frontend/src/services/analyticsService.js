// services/analyticsService.js
// Fetch analytics data from Supabase for charts and reports

import { supabase } from './authService';

/**
 * Get grade distribution (A, B, C, D, F counts)
 * @param {string} classFilter - Optional: filter by class (e.g., "10A")
 * @returns {Promise<Object>} Grade distribution data
 */
export const getGradeDistribution = async (classFilter = null) => {
  try {
    let query = supabase.from('grades').select('final_grade, students(class)');

    if (classFilter) {
      query = query.eq('students.class', classFilter);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Count by grade
    const distribution = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };

    (data || []).forEach((grade) => {
      if (distribution.hasOwnProperty(grade.final_grade)) {
        distribution[grade.final_grade]++;
      }
    });

    // Format for chart
    const chartData = Object.entries(distribution).map(([grade, count]) => ({
      grade,
      count,
      percentage: data.length > 0 ? Math.round((count / data.length) * 100) : 0,
    }));

    return {
      success: true,
      distribution,
      chartData,
      total: data.length,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      distribution: null,
      chartData: [],
      total: 0,
    };
  }
};

/**
 * Get daily grading statistics for the last N days
 * @param {number} days - Number of days to fetch (default 30)
 * @returns {Promise<Array>} Daily stats with date, count, avg score
 */
export const getDailyStats = async (days = 30) => {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('grades')
      .select('final_score, graded_at')
      .gte('graded_at', startDate.toISOString())
      .lte('graded_at', endDate.toISOString())
      .order('graded_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const dateMap = {};

    (data || []).forEach((grade) => {
      const date = new Date(grade.graded_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      if (!dateMap[date]) {
        dateMap[date] = { scores: [], count: 0 };
      }

      dateMap[date].scores.push(grade.final_score);
      dateMap[date].count++;
    });

    // Calculate daily stats
    const chartData = Object.entries(dateMap)
      .map(([date, data]) => ({
        date,
        count: data.count,
        avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.count),
        maxScore: Math.max(...data.scores),
        minScore: Math.min(...data.scores),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      success: true,
      chartData,
      days,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      chartData: [],
      days: 0,
    };
  }
};

/**
 * Get class-wise grade distribution
 * @returns {Promise<Array>} Grade distribution by class
 */
export const getClassWiseDistribution = async () => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select('final_score, final_grade, students(class)');

    if (error) throw error;

    // Group by class
    const classMap = {};

    (data || []).forEach((grade) => {
      const className = grade.students?.class || 'Unknown';

      if (!classMap[className]) {
        classMap[className] = {
          scores: [],
          gradeCount: { A: 0, B: 0, C: 0, D: 0, F: 0 },
        };
      }

      classMap[className].scores.push(grade.final_score);
      if (classMap[className].gradeCount.hasOwnProperty(grade.final_grade)) {
        classMap[className].gradeCount[grade.final_grade]++;
      }
    });

    // Calculate stats per class
    const chartData = Object.entries(classMap)
      .map(([className, data]) => ({
        class: className,
        avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        studentCount: data.scores.length,
        gradeA: data.gradeCount.A,
        gradeB: data.gradeCount.B,
        gradeC: data.gradeCount.C,
        gradeD: data.gradeCount.D,
        gradeF: data.gradeCount.F,
      }))
      .sort((a, b) => a.class.localeCompare(b.class));

    return {
      success: true,
      chartData,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      chartData: [],
    };
  }
};

/**
 * Get overall statistics
 * @returns {Promise<Object>} Overall stats
 */
export const getOverallStats = async () => {
  try {
    // Total students
    const { count: totalStudents, error: studentsError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (studentsError) throw studentsError;

    // Total grades
    const { data: gradesData, error: gradesError } = await supabase
      .from('grades')
      .select('final_score');

    if (gradesError) throw gradesError;

    const totalGrades = gradesData?.length || 0;
    const gradedStudents = new Set(
      (await supabase.from('grades').select('student_id')).data?.map((g) => g.student_id)
    ).size;

    // Calculate averages
    let avgScore = 0;
    let highestScore = 0;
    let lowestScore = 100;

    if (gradesData && gradesData.length > 0) {
      const scores = gradesData.map((g) => g.final_score);
      avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      highestScore = Math.max(...scores);
      lowestScore = Math.min(...scores);
    }

    // Grade distribution
    const gradeCount = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    (gradesData || []).forEach((grade) => {
      let letterGrade;
      if (grade.final_score >= 85) letterGrade = 'A';
      else if (grade.final_score >= 70) letterGrade = 'B';
      else if (grade.final_score >= 60) letterGrade = 'C';
      else if (grade.final_score >= 50) letterGrade = 'D';
      else letterGrade = 'F';

      gradeCount[letterGrade]++;
    });

    return {
      success: true,
      stats: {
        totalStudents: totalStudents || 0,
        gradedStudents,
        ungradedStudents: (totalStudents || 0) - gradedStudents,
        totalGrades,
        avgScore,
        highestScore,
        lowestScore,
        gradingRate: totalStudents > 0 ? Math.round((gradedStudents / totalStudents) * 100) : 0,
        gradeCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stats: null,
    };
  }
};

/**
 * Get top performing students
 * @param {number} limit - Number of students to fetch (default 10)
 * @returns {Promise<Array>} Top students by average score
 */
export const getTopStudents = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, class, grades(final_score)')
      .limit(limit);

    if (error) throw error;

    // Calculate average score per student
    const topStudents = (data || [])
      .map((student) => {
        const scores = student.grades.map((g) => g.final_score);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const latestScore = scores.length > 0 ? scores[0] : 0;

        return {
          name: student.full_name,
          class: student.class,
          avgScore,
          latestScore,
          gradeCount: scores.length,
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, limit);

    return {
      success: true,
      students: topStudents,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      students: [],
    };
  }
};

/**
 * Get students needing improvement (lowest average)
 * @param {number} limit - Number of students to fetch (default 10)
 * @returns {Promise<Array>} Students with lowest average scores
 */
export const getStudentsNeedingHelp = async (limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, class, grades(final_score)');

    if (error) throw error;

    // Calculate average score per student
    const needsHelp = (data || [])
      .filter((student) => student.grades && student.grades.length > 0)
      .map((student) => {
        const scores = student.grades.map((g) => g.final_score);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        return {
          name: student.full_name,
          class: student.class,
          avgScore,
          gradeCount: scores.length,
        };
      })
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, limit);

    return {
      success: true,
      students: needsHelp,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      students: [],
    };
  }
};

/**
 * Get weekly statistics
 * @param {number} weeks - Number of weeks to fetch (default 12)
 * @returns {Promise<Array>} Weekly stats
 */
export const getWeeklyStats = async (weeks = 12) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const { data, error } = await supabase
      .from('grades')
      .select('final_score, graded_at')
      .gte('graded_at', startDate.toISOString())
      .lte('graded_at', endDate.toISOString());

    if (error) throw error;

    // Group by week
    const weekMap = {};

    (data || []).forEach((grade) => {
      const date = new Date(grade.graded_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (!weekMap[weekKey]) {
        weekMap[weekKey] = { scores: [], count: 0 };
      }

      weekMap[weekKey].scores.push(grade.final_score);
      weekMap[weekKey].count++;
    });

    // Calculate weekly stats
    const chartData = Object.entries(weekMap)
      .map(([week, data]) => ({
        week,
        count: data.count,
        avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.count),
      }))
      .slice(-weeks);

    return {
      success: true,
      chartData,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      chartData: [],
    };
  }
};
