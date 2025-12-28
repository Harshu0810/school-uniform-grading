// utils/gradingLogic.js
// Rule-based uniform grading algorithm
// Analyzes image properties without paid AI APIs

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

  // Check if image has proper lighting (not too dark)
  if (stats.avgBrightness < 80) {
    score -= 20; // Poor lighting
  } else if (stats.avgBrightness > 220) {
    score -= 10; // Overexposed
  }

  // Check color consistency (low variation = uniform color)
  const colorVariation = Math.abs(stats.avgRed - stats.avgGreen) + 
                         Math.abs(stats.avgGreen - stats.avgBlue);
  
  if (colorVariation > 100) {
    score -= 15; // Too much color variation
  } else if (colorVariation > 50) {
    score -= 5;
  }

  // Check for dark areas (wrinkles, shadows = bad)
  if (stats.darkPixelRatio > 0.4) {
    score -= 20; // Too many dark pixels (wrinkled/dirty)
  } else if (stats.darkPixelRatio > 0.25) {
    score -= 10;
  }

  // Ensure at least some white (for contrast/visibility)
  if (stats.whitePixelRatio < 0.05) {
    score -= 15; // Possibly not wearing shirt or all dark
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

  // Extract lower half of image (where pants would be)
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

  // Pants should be darker (typically 60-150 brightness)
  if (lowerBrightness < 50 || lowerBrightness > 160) {
    score -= 25; // Too light or too dark
  } else if (lowerBrightness < 60 || lowerBrightness > 150) {
    score -= 10;
  }

  // Check for uniformity in lower half
  const colorVariation = Math.abs(stats.avgRed - stats.avgGreen) + 
                         Math.abs(stats.avgGreen - stats.avgBlue);
  
  if (colorVariation > 80) {
    score -= 15; // Not uniform color
  }

  // Check dark pixel ratio in lower half
  let lowerDarkPixels = 0;
  for (let i = 0; i < lowerData.length; i += 4) {
    const brightness = (lowerData[i] + lowerData[i + 1] + lowerData[i + 2]) / 3;
    if (brightness < 100) lowerDarkPixels++;
  }

  const lowerDarkRatio = lowerDarkPixels / lowerPixels;
  if (lowerDarkRatio > 0.5) {
    score -= 15; // Too many dark/wrinkled areas
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

  // Extract bottom 15% of image (where shoes would be)
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

  // Shoes should be relatively dark (50-140 brightness)
  if (bottomBrightness < 40 || bottomBrightness > 180) {
    score -= 30; // Shoes not visible or very light
  } else if (bottomBrightness < 50 || bottomBrightness > 160) {
    score -= 15;
  }

  // Check for shoe visibility (should have some dark areas)
  let bottomDarkPixels = 0;
  for (let i = 0; i < bottomData.length; i += 4) {
    const brightness = (bottomData[i] + bottomData[i + 1] + bottomData[i + 2]) / 3;
    if (brightness < 120) bottomDarkPixels++;
  }

  const bottomDarkRatio = bottomDarkPixels / bottomPixels;
  if (bottomDarkRatio < 0.2) {
    score -= 25; // Shoes not visible enough
  } else if (bottomDarkRatio < 0.35) {
    score -= 10;
  }

  // Overall image brightness affects shoe visibility
  if (stats.avgBrightness < 70) {
    score -= 10; // Too dark overall
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

  // Extract top 30% of image (where head/grooming would be)
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

  // Face should be well-lit (brightness > 100)
  if (topBrightness < 90) {
    score -= 20; // Poor lighting on face
  } else if (topBrightness > 230) {
    score -= 10; // Overexposed face
  }

  // Check for shadows (too many dark pixels on face)
  let topDarkPixels = 0;
  for (let i = 0; i < topData.length; i += 4) {
    const brightness = (topData[i] + topData[i + 1] + topData[i + 2]) / 3;
    if (brightness < 80) topDarkPixels++;
  }

  const topDarkRatio = topDarkPixels / topPixels;
  if (topDarkRatio > 0.4) {
    score -= 25; // Too many shadows (messy hair/grooming)
  } else if (topDarkRatio > 0.25) {
    score -= 10;
  }

  // Check overall image quality
  const colorVariation = Math.abs(stats.avgRed - stats.avgGreen) + 
                         Math.abs(stats.avgGreen - stats.avgBlue);
  
  if (colorVariation > 120) {
    score -= 15; // Poor photo quality
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

  // Check overall brightness (clean clothes should be relatively bright)
  if (stats.avgBrightness < 100) {
    score -= 25; // Too dark (dirty/stained)
  } else if (stats.avgBrightness < 120) {
    score -= 10;
  }

  // Check dark pixel ratio (stains/dirt = dark pixels)
  if (stats.darkPixelRatio > 0.45) {
    score -= 25; // Too many dark areas (very dirty)
  } else if (stats.darkPixelRatio > 0.35) {
    score -= 15;
  } else if (stats.darkPixelRatio > 0.25) {
    score -= 8;
  }

  // Check white pixel ratio (clean clothes have more white/light areas)
  if (stats.whitePixelRatio < 0.1) {
    score -= 15; // Not bright enough
  } else if (stats.whitePixelRatio < 0.15) {
    score -= 5;
  }

  // Check color saturation (vibrant colors = clean)
  const colorVariation = Math.abs(stats.avgRed - stats.avgGreen) + 
                         Math.abs(stats.avgGreen - stats.avgBlue);
  
  if (colorVariation < 15) {
    score -= 10; // Too gray/washed out (looks dirty)
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
  // Weighted average
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

  // Convert to letter grade
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
