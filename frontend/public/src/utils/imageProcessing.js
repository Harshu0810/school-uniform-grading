// utils/imageProcessing.js
// Image validation, compression, and processing utilities

/**
 * Validate image file before upload
 * @param {File} file - Image file from input
 * @returns {Object} Validation result { valid, error }
 */
export const validateImageFile = (file) => {
  const errors = [];

  // Check file exists
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Only image files (JPG, PNG, GIF, WebP) are allowed');
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    errors.push(`File size must be less than 5MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  }

  // Check minimum file size (at least 10KB)
  const minSize = 10 * 1024; // 10KB
  if (file.size < minSize) {
    errors.push('File size must be at least 10KB');
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join('. ') };
  }

  return { valid: true, error: null };
};

/**
 * Convert file to base64 data URL for preview and analysis
 * @param {File} file - Image file
 * @returns {Promise<string>} Base64 data URL
 */
export const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Compress image to reduce file size
 * @param {string} dataUrl - Base64 image data URL
 * @param {number} quality - Compression quality (0-1), default 0.8
 * @returns {Promise<Blob>} Compressed image blob
 */
export const compressImage = (dataUrl, quality = 0.8) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Convert to blob with compression
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => resolve(null);
  });
};

/**
 * Resize image to max width/height
 * @param {string} dataUrl - Base64 image
 * @param {number} maxWidth - Max width in pixels
 * @param {number} maxHeight - Max height in pixels
 * @returns {Promise<string>} Resized data URL
 */
export const resizeImage = (dataUrl, maxWidth = 1200, maxHeight = 800) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Return as data URL
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    img.onerror = () => resolve(dataUrl);
  });
};

/**
 * Check if photo appears to be full-body (required for grading)
 * @param {string} dataUrl - Base64 image
 * @returns {Promise<Object>} { isFullBody, confidence }
 */
export const isFullBodyPhoto = (dataUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
      // Check aspect ratio (full body should be portrait-ish)
      const aspectRatio = img.width / img.height;

      // Full body photos typically have 0.5-0.8 width/height ratio (portrait)
      let confidence = 0;

      if (aspectRatio > 0.4 && aspectRatio < 0.9) {
        confidence = 85;
      } else if (aspectRatio > 0.3 && aspectRatio < 1.0) {
        confidence = 65;
      } else {
        confidence = 30; // Too wide or too tall
      }

      // Check minimum size
      if (img.width < 300 || img.height < 400) {
        confidence -= 20;
      }

      confidence = Math.max(0, Math.min(100, confidence));

      resolve({
        isFullBody: confidence > 50,
        confidence: Math.round(confidence),
        width: img.width,
        height: img.height,
        aspectRatio: aspectRatio.toFixed(2),
      });
    };

    img.onerror = () => {
      resolve({
        isFullBody: false,
        confidence: 0,
        width: 0,
        height: 0,
        aspectRatio: 0,
      });
    };
  });
};

/**
 * Get image quality metrics
 * @param {string} dataUrl - Base64 image
 * @returns {Promise<Object>} Quality metrics
 */
export const analyzeImageQuality = (dataUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Calculate metrics
      let brightness = 0;
      let contrast = 0;
      let saturation = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Brightness
        brightness += (r + g + b) / 3;

        // Contrast (standard deviation)
        contrast += Math.abs(r - g) + Math.abs(g - b);

        // Saturation
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max > 0) {
          saturation += (max - min) / max;
        }
      }

      const pixelCount = data.length / 4;
      brightness = Math.round(brightness / pixelCount);
      contrast = Math.round(contrast / pixelCount / 2);
      saturation = Math.round((saturation / pixelCount) * 100);

      // Determine quality
      let qualityScore = 100;
      let qualityLevel = 'Good';

      if (brightness < 80 || brightness > 230) {
        qualityScore -= 15;
        qualityLevel = 'Poor lighting';
      }

      if (contrast < 30) {
        qualityScore -= 15;
        qualityLevel = 'Low contrast';
      }

      if (saturation < 20) {
        qualityScore -= 15;
        qualityLevel = 'Low saturation';
      }

      if (qualityScore >= 75) {
        qualityLevel = 'Excellent';
      } else if (qualityScore >= 60) {
        qualityLevel = 'Good';
      } else if (qualityScore >= 45) {
        qualityLevel = 'Fair';
      } else {
        qualityLevel = 'Poor';
      }

      resolve({
        brightness,
        contrast,
        saturation,
        qualityScore: Math.max(0, Math.min(100, qualityScore)),
        qualityLevel,
        width: img.width,
        height: img.height,
      });
    };

    img.onerror = () => {
      resolve({
        brightness: 0,
        contrast: 0,
        saturation: 0,
        qualityScore: 0,
        qualityLevel: 'Error',
        width: 0,
        height: 0,
      });
    };
  });
};

/**
 * Capture image from camera/video element
 * @param {HTMLVideoElement} videoElement - Video element
 * @returns {string} Base64 data URL of captured image
 */
export const captureImageFromVideo = (videoElement) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.9);
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
