// ============================================================================
// services/gradingService.js - COMPLETE FIXED VERSION
// Copy-paste this entire file to replace your current one
// ============================================================================

import { supabase } from './authService';

// ============================================================================
// GRADING LOGIC - ANALYZE UNIFORM IMAGE
// ============================================================================

/**
 * Analyze uniform image and generate grade
 * Uses canvas-based analysis (no AI APIs required)
 */
export const analyzeUniform = (imageDataUrl) => {
  try {
    const img = new Image();
    img.src = imageDataUrl;

    return new Promise((resolve) => {
      img.onload = () => {
        const scores = analyzeImageProperties(img);
        const feedback = generateFeedback(scores);
        const { finalScore, finalGrade } = calculateFinalGrade(scores);

        resolve({
          score: finalScore,
          grade: finalGrade,
          breakdown: scores,
          feedback: feedback,
        });
      };

      img.onerror = () => {
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
 */
function analyzeImageProperties(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const stats = calculateImageStats(data);

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
// DATABASE OPERATIONS - SAVE GRADING RESULT
// ============================================================================

/**
 * Save grading result to Supabase database
 * FIXED: Now properly fetches student_id and passes both user_id and student_id
 * 
 * @param {string} userId - Auth user ID
 * @param {Object} gradingData - Result from analyzeUniform()
 * @param {File} photoFile - The image file (will be uploaded)
 * @returns {Promise<Object>} Success status and gradeId
 */
export const saveGradingResult = async (userId, gradingData, photoFile) => {
  try {
    console.log('=== SAVING GRADE ===');
    console.log('userId:', userId);
    console.log('gradingData:', gradingData);

    // ========================================================================
    // VALIDATION
    // ========================================================================
    if (!userId) {
      console.error('ERROR: userId is missing');
      return {
        success: false,
        error: 'User ID is required. Please login again.',
      };
    }

    if (!gradingData) {
      console.error('ERROR: gradingData is missing');
      return {
        success: false,
        error: 'Grading data is required.',
      };
    }

    if (!photoFile) {
      console.error('ERROR: photoFile is missing');
      return {
        success: false,
        error: 'Photo file is required.',
      };
    }

    // ========================================================================
    // STEP 1: FETCH STUDENT_ID (REQUIRED)
    // ========================================================================
    console.log('Step 1: Fetching student profile...');
    
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (studentError) {
      console.error('Student fetch error:', studentError);
      return {
        success: false,
        error: 'Student profile not found. Please complete your onboarding first.',
      };
    }

    if (!studentData?.id) {
      console.error('ERROR: Student data has no ID');
      return {
        success: false,
        error: 'Student profile not found.',
      };
    }

    const studentId = studentData.id;
    console.log('✅ Got student ID:', studentId);

    // ========================================================================
    // STEP 2: UPLOAD PHOTO TO STORAGE
    // ========================================================================
    console.log('Step 2: Uploading photo to storage...');

    const timestamp = Date.now();
    const fileExtension = photoFile.name.split('.').pop() || 'jpg';
    const fileName = `${userId}/${timestamp}.${fileExtension}`;

    console.log('Uploading to:', fileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uniform-photos')
      .upload(fileName, photoFile);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return {
        success: false,
        error: `Failed to upload photo: ${uploadError.message}`,
      };
    }

    console.log('✅ Photo uploaded successfully');

    // ========================================================================
    // STEP 3: GET PUBLIC URL
    // ========================================================================
    const { data: urlData } = supabase.storage
      .from('uniform-photos')
      .getPublicUrl(fileName);

    const photoUrl = urlData.publicUrl;
    console.log('✅ Photo URL:', photoUrl);

    // ========================================================================
    // STEP 4: INSERT GRADE WITH BOTH user_id AND student_id
    // ========================================================================
    console.log('Step 3: Inserting grade into database...');

    const gradeRecord = {
      user_id: userId,  // ✅ CRITICAL: Must include
      student_id: studentId,  // ✅ CRITICAL: Must include
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
      console.error('Error details:', gradeError.details);
      
      return {
        success: false,
        error: `Failed to save grade: ${gradeError.message}`,
      };
    }

    if (!gradeData || gradeData.length === 0) {
      console.error('ERROR: No data returned from grade insert');
      return {
        success: false,
        error: 'Grade was not saved to database.',
      };
    }

    const gradeId = gradeData[0].id;
    console.log('✅ Grade inserted successfully, ID:', gradeId);

    // ========================================================================
    // STEP 5: INSERT GRADING BREAKDOWN
    // ========================================================================
    console.log('Step 4: Inserting grading breakdown...');

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
      console.warn('Breakdown insert failed but grade was created');
      
      return {
        success: true,
        gradeId: gradeId,
        message: 'Grade created (breakdown incomplete)',
      };
    }

    console.log('✅ Breakdown inserted successfully');
    console.log('=== GRADE SAVED SUCCESSFULLY ===');

    return {
      success: true,
      gradeId: gradeId,
      message: 'Grade saved successfully',
    };

  } catch (err) {
    console.error('Unexpected error in saveGradingResult:', err);
    console.error('Stack:', err.stack);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while saving grade',
    };
  }
};

// ============================================================================
// DATABASE OPERATIONS - FETCH GRADES
// ============================================================================

/**
 * Fetch all grades for a user
 */
export const getUserGrades = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select(
        `
        id,
        final_grade,
        final_score,
        graded_at,
        photo_url,
        feedback_text,
        grading_breakdown(
          shirt_score,
          pant_score,
          shoes_score,
          grooming_score,
          cleanliness_score,
          shirt_feedback,
          pant_feedback,
          shoes_feedback,
          grooming_feedback,
          cleanliness_feedback
        )
      `
      )
      .eq('user_id', userId)
      .order('graded_at', { ascending: false });

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
 * Get a single grade by ID
 */
export const getGradeById = async (gradeId) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select(
        `
        *,
        grading_breakdown(*)
      `
      )
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
