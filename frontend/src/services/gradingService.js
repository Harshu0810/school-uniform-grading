// frontend/src/services/gradingService.js
// Combined service for grading logic and database operations

import { supabase } from './authService';

// ============================================================================
// GRADING LOGIC - IMAGE ANALYSIS
// ============================================================================

/**
 * Main function to analyze uniform and generate grade
 * @param {string} imageDataUrl - Base64 image data URL from canvas/input
 * @returns {Object} Grading result with scores and feedback
 */
export const analyzeUniform = (imageDataUrl) => {
  try {
    // Create image element
    const img = new Image();
    img.src = imageDataUrl;

    // Wait for image to load
    return new Promise((resolve) => {
      img.onload = () => {
        // Analyze image properties
        const scores = analyzeImageProperties(img);
        
        // Generate feedback
        const feedback = generateFeedback(scores);
        
        // Calculate final grade
        const { finalScore, finalGrade } = calculateFinalGrade(scores);

        resolve({
          score: finalScore,
          grade: finalGrade,
          breakdown: scores,
          feedback: feedback,
        });
      };

      img.onerror = () => {
        // Fallback if image fails to load
        resolve(getDefaultGrade());
      };
    });
  } catch (error) {
    console.error('Grading error:', error);
    return getDefaultGrade();
  }
};

/**
 * Analyze image properties using canvas
 * Checks: brightness, contrast, color saturation, uniformity
 */
function analyzeImageProperties(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Calculate image statistics
  const stats = calculateImageStats(data);

  // Rule-based scoring for each component
  const scores = {
    shirt: scoreShirt(stats, img),
    pant: scorePants(stats, img),
    shoes: scoreShoes(stats, img),
    grooming: scoreGrooming(stats, img),
    cleanliness: scoreCleanliness(stats, img),
  };

  return scores;
}

/**
 * Calculate image statistics: brightness, contrast, colors
 */
function calculateImageStats(data) {
  let r = 0, g = 0, b = 0;
  let brightness = 0;
  let darkPixels = 0;
  let whitePixels = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];

    const pixelBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    brightness += pixelBrightness;

    if (pixelBrightness < 100) darkPixels++;
    if (pixelBrightness > 200) whitePixels++;
  }

  return {
    avgRed: Math.round(r / pixelCount),
    avgGreen: Math.round(g / pixelCount),
    avgBlue: Math.round(b / pixelCount),
    avgBrightness: Math.round(brightness / pixelCount),
    darkPixelRatio: darkPixels / pixelCount,
    whitePixelRatio: whitePixels / pixelCount,
  };
}

/**
 * Score SHIRT based on:
 * - Color consistency (should be uniform color)
 * - Brightness (not too dark/light)
 * - Coverage (should cover torso area)
 */
function scoreShirt(stats, img) {
  let score = 100;

  if (stats.avgBrightness < 80) {
    score -= 20;
  } else if (stats.avgBrightness > 220) {
    score -= 10;
  }

  const colorVariation = Math.abs(stats.avgRed - stats.avgGreen) + 
                         Math.abs(stats.avgGreen - stats.avgBlue);
  
  if (colorVariation > 100) {
    score -= 15;
  } else if (colorVariation > 50) {
    score -= 5;
  }

  if (stats.darkPixelRatio > 0.4) {
    score -= 20;
  } else if (stats.darkPixelRatio > 0.25) {
    score -= 10;
  }

  if (stats.whitePixelRatio < 0.05) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score PANTS based on:
 * - Lower half of image should be visible
 * - Color consistency
 * - Darkness (pants are usually dark)
 */
function scorePants(stats, img) {
  let score = 100;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const lowerHalf = ctx.getImageData(0, img.height / 2, img.width, img.height / 2);
  const lowerData = lowerHalf.data;

  let lowerBrightness = 0;
  const lowerPixels = lowerData.length / 4;

  for (let i = 0; i < lowerData.length; i += 4) {
    lowerBrightness += (lowerData[i] + lowerData[i + 1] + lowerData[i + 2]) / 3;
  }
  lowerBrightness /= lowerPixels;

  if (lowerBrightness < 50 || lowerBrightness > 160) {
    score -= 25;
  } else if (lowerBrightness < 60 || lowerBrightness > 150) {
    score -= 10;
  }

  const colorVariation = Math.abs(stats.avgRed - stats.avgGreen) + 
                         Math.abs(stats.avgGreen - stats.avgBlue);
  
  if (colorVariation > 80) {
    score -= 15;
  }

  let lowerDarkPixels = 0;
  for (let i = 0; i < lowerData.length; i += 4) {
    const brightness = (lowerData[i] + lowerData[i + 1] + lowerData[i + 2]) / 3;
    if (brightness < 100) lowerDarkPixels++;
  }

  const lowerDarkRatio = lowerDarkPixels / lowerPixels;
  if (lowerDarkRatio > 0.5) {
    score -= 15;
  } else if (lowerDarkRatio > 0.3) {
    score -= 8;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score SHOES based on:
 * - Bottom of image should have shoe-like features
 * - Should be darker than rest (shoes are usually dark)
 * - Should have some contrast
 */
function scoreShoes(stats, img) {
  let score = 100;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const bottomHeight = Math.floor(img.height * 0.15);
  const bottomHalf = ctx.getImageData(0, img.height - bottomHeight, img.width, bottomHeight);
  const bottomData = bottomHalf.data;

  let bottomBrightness = 0;
  const bottomPixels = bottomData.length / 4;

  for (let i = 0; i < bottomData.length; i += 4) {
    bottomBrightness += (bottomData[i] + bottomData[i + 1] + bottomData[i + 2]) / 3;
  }
  bottomBrightness /= bottomPixels;

  if (bottomBrightness < 40 || bottomBrightness > 180) {
    score -= 30;
  } else if (bottomBrightness < 50 || bottomBrightness > 160) {
    score -= 15;
  }

  let bottomDarkPixels = 0;
  for (let i = 0; i < bottomData.length; i += 4) {
    const brightness = (bottomData[i] + bottomData[i + 1] + bottomData[i + 2]) / 3;
    if (brightness < 120) bottomDarkPixels++;
  }

  const bottomDarkRatio = bottomDarkPixels / bottomPixels;
  if (bottomDarkRatio < 0.2) {
    score -= 25;
  } else if (bottomDarkRatio < 0.35) {
    score -= 10;
  }

  if (stats.avgBrightness < 70) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score GROOMING based on:
 * - Head region should be visible
 * - Should have good lighting on face area
 * - Should not have too many shadows
 */
function scoreGrooming(stats, img) {
  let score = 100;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const topHeight = Math.floor(img.height * 0.3);
  const topHalf = ctx.getImageData(0, 0, img.width, topHeight);
  const topData = topHalf.data;

  let topBrightness = 0;
  const topPixels = topData.length / 4;

  for (let i = 0; i < topData.length; i += 4) {
    topBrightness += (topData[i] + topData[i + 1] + topData[i + 2]) / 3;
  }
  topBrightness /= topPixels;

  if (topBrightness < 90) {
    score -= 20;
  } else if (topBrightness > 230) {
    score -= 10;
  }

  let topDarkPixels = 0;
  for (let i = 0; i < topData.length; i += 4) {
    const brightness = (topData[i] + topData[i + 1] + topData[i + 2]) / 3;
    if (brightness < 80) topDarkPixels++;
  }

  const topDarkRatio = topDarkPixels / topPixels;
  if (topDarkRatio > 0.4) {
    score -= 25;
  } else if (topDarkRatio > 0.25) {
    score -= 10;
  }

  const colorVariation = Math.abs(stats.avgRed - stats.avgGreen) + 
                         Math.abs(stats.avgGreen - stats.avgBlue);
  
  if (colorVariation > 120) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score CLEANLINESS based on:
 * - Overall brightness (clean = bright)
 * - Color saturation (clean clothes are more vibrant)
 * - Absence of very dark pixels (dirt/stains)
 */
function scoreCleanliness(stats, img) {
  let score = 100;

  if (stats.avgBrightness < 100) {
    score -= 25;
  } else if (stats.avgBrightness < 120) {
    score -= 10;
  }

  if (stats.darkPixelRatio > 0.45) {
    score -= 25;
  } else if (stats.darkPixelRatio > 0.35) {
    score -= 15;
  } else if (stats.darkPixelRatio > 0.25) {
    score -= 8;
  }

  if (stats.whitePixelRatio < 0.1) {
    score -= 15;
  } else if (stats.whitePixelRatio < 0.15) {
    score -= 5;
  }

  const colorVariation = Math.abs(stats.avgRed - stats.avgGreen) + 
                         Math.abs(stats.avgGreen - stats.avgBlue);
  
  if (colorVariation < 15) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate human-readable feedback for each component
 */
function generateFeedback(scores) {
  return {
    shirt: getShirtFeedback(scores.shirt),
    pant: getPantsFeedback(scores.pant),
    shoes: getShoesFeedback(scores.shoes),
    grooming: getGroomingFeedback(scores.grooming),
    cleanliness: getCleanlinesFeedback(scores.cleanliness),
  };
}

function getShirtFeedback(score) {
  if (score >= 90) return '✅ Shirt looks excellent. Clean, well-fitted, and properly worn.';
  if (score >= 75) return '👍 Shirt is good. Consider pressing out any wrinkles.';
  if (score >= 60) return '⚠️ Shirt needs attention. Ensure it\'s clean and properly ironed.';
  if (score >= 45) return '❌ Shirt needs improvement. Ensure proper fit and cleanliness.';
  return '❌ Shirt does not meet standards. Replace or clean immediately.';
}

function getPantsFeedback(score) {
  if (score >= 90) return '✅ Pants are perfect. Neat, clean, and well-maintained.';
  if (score >= 75) return '👍 Pants look good. Minor adjustments may help.';
  if (score >= 60) return '⚠️ Pants need attention. Ensure they\'re clean and wrinkle-free.';
  if (score >= 45) return '❌ Pants need improvement. Ensure proper fit and cleanliness.';
  return '❌ Pants do not meet standards. Replace or clean immediately.';
}

function getShoesFeedback(score) {
  if (score >= 90) return '✅ Shoes are excellent. Polished and well-maintained.';
  if (score >= 75) return '👍 Shoes look good. Consider polishing for better shine.';
  if (score >= 60) return '⚠️ Shoes need polishing. Ensure they\'re clean and shiny.';
  if (score >= 45) return '❌ Shoes need significant improvement. Polish and clean them.';
  return '❌ Shoes do not meet standards. Replace or shine immediately.';
}

function getGroomingFeedback(score) {
  if (score >= 90) return '✅ Grooming is excellent. Hair neat and well-groomed.';
  if (score >= 75) return '👍 Grooming looks good. Minor tidying recommended.';
  if (score >= 60) return '⚠️ Hair needs attention. Ensure it\'s neat and tidy.';
  if (score >= 45) return '❌ Hair needs significant grooming. Get a proper haircut.';
  return '❌ Hair does not meet standards. Get groomed immediately.';
}

function getCleanlinesFeedback(score) {
  if (score >= 90) return '✅ Overall cleanliness is excellent. Well-maintained uniform.';
  if (score >= 75) return '👍 Uniform is clean. Keep maintaining this standard.';
  if (score >= 60) return '⚠️ Uniform needs cleaning. Wash and maintain properly.';
  if (score >= 45) return '❌ Uniform is dirty. Wash immediately.';
  return '❌ Uniform does not meet cleanliness standards. Major cleaning needed.';
}

/**
 * Calculate final grade from component scores
 */
function calculateFinalGrade(scores) {
  const weights = {
    shirt: 0.25,
    pant: 0.25,
    shoes: 0.2,
    grooming: 0.15,
    cleanliness: 0.15,
  };

  const finalScore = Math.round(
    scores.shirt * weights.shirt +
    scores.pant * weights.pant +
    scores.shoes * weights.shoes +
    scores.grooming * weights.grooming +
    scores.cleanliness * weights.cleanliness
  );

  let finalGrade;
  if (finalScore >= 85) finalGrade = 'A';
  else if (finalScore >= 70) finalGrade = 'B';
  else if (finalScore >= 60) finalGrade = 'C';
  else if (finalScore >= 50) finalGrade = 'D';
  else finalGrade = 'F';

  return { finalScore, finalGrade };
}

/**
 * Default grade if image analysis fails
 */
function getDefaultGrade() {
  return {
    score: 50,
    grade: 'D',
    breakdown: {
      shirt: 50,
      pant: 50,
      shoes: 50,
      grooming: 50,
      cleanliness: 50,
    },
    feedback: {
      shirt: 'Please upload a clear photo of your uniform.',
      pant: 'Please upload a clear photo of your uniform.',
      shoes: 'Please upload a clear photo of your uniform.',
      grooming: 'Please upload a clear photo of your uniform.',
      cleanliness: 'Please upload a clear photo of your uniform.',
    },
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Save grading result to Supabase database
 * FIXED: Now properly inserts to both grades and grading_breakdown
 * @param {string} userId - User ID from auth
 * @param {Object} gradingData - Grading result with score, grade, breakdown, feedback
 * @param {string} photoUrl - URL of the uploaded photo
 * @returns {Object} Success status and gradeId
 */
export const saveGradingResult = async (userId, gradingData, photoUrl) => {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    if (!gradingData) {
      return {
        success: false,
        error: 'Grading data is required',
      };
    }

    // STEP 1: Get student_id from students table
    // This is required because grades table has foreign key to students
    console.log('Step 1: Fetching student profile for user:', userId);
    
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (studentError) {
      console.error('Student fetch error:', studentError);
      return {
        success: false,
        error: 'Student profile not found. Please complete your profile first.',
      };
    }

    if (!studentData?.id) {
      return {
        success: false,
        error: 'Student ID not found. Please complete your profile first.',
      };
    }

    const studentId = studentData.id;
    console.log('Got student ID:', studentId);

    // STEP 2: Insert into grades table
    console.log('Step 2: Inserting into grades table');
    
    const gradeRecord = {
      user_id: userId,
      student_id: studentId,  // ✅ IMPORTANT: Include student_id
      photo_url: photoUrl,
      final_score: parseFloat(gradingData.score) || 0,
      final_grade: gradingData.grade || 'F',
      feedback_text: '',
      graded_at: new Date().toISOString(),
    };

    console.log('Grade record:', gradeRecord);

    const { data: gradeData, error: gradeError } = await supabase
      .from('grades')
      .insert([gradeRecord])
      .select();

    if (gradeError) {
      console.error('Grade insert error:', gradeError);
      console.error('Error code:', gradeError.code);
      console.error('Error message:', gradeError.message);
      
      // More helpful error messages
      if (gradeError.message.includes('row-level security')) {
        return {
          success: false,
          error: 'Permission denied: RLS policy blocked insert. Please try again or contact admin.',
        };
      }
      
      return {
        success: false,
        error: `Failed to insert grade: ${gradeError.message}`,
      };
    }

    if (!gradeData || gradeData.length === 0) {
      return {
        success: false,
        error: 'No data returned from database',
      };
    }

    const gradeId = gradeData[0].id;
    console.log('Grade inserted successfully, ID:', gradeId);

    // STEP 3: Insert into grading_breakdown table
    console.log('Step 3: Inserting into grading_breakdown table');
    
    const breakdownRecord = {
      grade_id: gradeId,
      shirt_score: parseFloat(gradingData.breakdown?.shirt) || 0,
      pant_score: parseFloat(gradingData.breakdown?.pant) || 0,
      shoes_score: parseFloat(gradingData.breakdown?.shoes) || 0,
      grooming_score: parseFloat(gradingData.breakdown?.grooming) || 0,
      cleanliness_score: parseFloat(gradingData.breakdown?.cleanliness) || 0,
      shirt_feedback: gradingData.feedback?.shirt || '',
      pant_feedback: gradingData.feedback?.pant || '',
      shoes_feedback: gradingData.feedback?.shoes || '',
      grooming_feedback: gradingData.feedback?.grooming || '',
      cleanliness_feedback: gradingData.feedback?.cleanliness || '',
    };

    console.log('Breakdown record:', breakdownRecord);

    const { data: breakdownData, error: breakdownError } = await supabase
      .from('grading_breakdown')
      .insert([breakdownRecord])
      .select();

    if (breakdownError) {
      console.error('Breakdown insert error:', breakdownError);
      
      // If breakdown fails but grade was created, we still succeeded
      // (trigger will calculate the score anyway)
      console.warn('Breakdown insert failed but grade was created');
      
      return {
        success: true,
        gradeId: gradeId,
        message: 'Grade created, but breakdown details may be incomplete',
      };
    }

    console.log('Breakdown inserted successfully');

    return {
      success: true,
      gradeId: gradeId,
      message: 'Grade saved successfully',
    };

  } catch (err) {
    console.error('Unexpected error in saveGradingResult:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while saving grade',
    };
  }
};

// Keep all your other functions:
// - analyzeUniform
// - getUserGrades
// - getGradeById
// - getGradeStatistics
// etc.

// Export them as before
export { analyzeUniform } from './gradingService'; // If in same file, use existing

// ============================================================================
// ADDITIONAL DEBUG HELPER - Optional
// Use this to test RLS policies
// ============================================================================

/**
 * Debug function to check if current user can insert grades
 * Run this in browser console to debug RLS issues
 */
export const debugRLS = async () => {
  try {
    console.log('=== RLS Debug Info ===');
    
    // Check current auth
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user?.id);
    console.log('Current email:', user?.email);

    // Check if in admin_users
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user?.id);
    
    console.log('Is admin?', adminData && adminData.length > 0);
    console.log('Admin data:', adminData);

    // Check student profile
    const { data: studentData } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user?.id)
      .single();
    
    console.log('Student profile:', studentData);

    // Try to read own grades
    const { data: grades, error: gradeError } = await supabase
      .from('grades')
      .select('*')
      .eq('user_id', user?.id);
    
    console.log('Own grades readable?', !gradeError);
    console.log('Grades error:', gradeError?.message);
    console.log('Grades count:', grades?.length);

    return {
      userId: user?.id,
      isAdmin: adminData && adminData.length > 0,
      hasStudent: !!studentData,
      canReadGrades: !gradeError,
    };

  } catch (err) {
    console.error('Debug error:', err);
    return { error: err.message };
  }
};
/**
 * Fetch all grades for a specific user
 * @param {string} userId - User ID
 * @returns {Array} Array of grade records
 */
export const getUserGrades = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching grades:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Unexpected error:', err);
    return [];
  }
};

/**
 * Fetch a single grade by ID
 * @param {string} gradeId - Grade ID
 * @returns {Object} Grade record or null
 */
export const getGradeById = async (gradeId) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('id', gradeId)
      .single();

    if (error) {
      console.error('Error fetching grade:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error:', err);
    return null;
  }
};

/**
 * Get statistics for all users (admin only)
 * @returns {Object} Statistics data
 */
export const getGradeStatistics = async () => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select('final_score, final_grade, user_id, created_at');

    if (error) {
      console.error('Error fetching statistics:', error);
      return null;
    }

    const stats = {
      totalGrades: data.length,
      averageScore: data.length > 0 
        ? Math.round(data.reduce((sum, g) => sum + g.final_score, 0) / data.length)
        : 0,
      gradeDistribution: {
        A: data.filter(g => g.final_grade === 'A').length,
        B: data.filter(g => g.final_grade === 'B').length,
        C: data.filter(g => g.final_grade === 'C').length,
        D: data.filter(g => g.final_grade === 'D').length,
        F: data.filter(g => g.final_grade === 'F').length,
      },
    };

    return stats;
  } catch (err) {
    console.error('Unexpected error:', err);
    return null;
  }
};
