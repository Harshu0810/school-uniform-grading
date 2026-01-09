// ============================================================================
// FILE: components/Student/PhotoUpload.jsx - SYNTAX FIXES ONLY
// ============================================================================
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';
import { saveGradingResult } from '../../services/gradingService';
import { analyzeUniform } from '../../services/gradingService';
import {
  validateImageFile,
  fileToDataUrl,
  isFullBodyPhoto,
  analyzeImageQuality,
  formatFileSize,
} from '../../utils/imageProcessing';
import LoadingSpinner from '../Common/LoadingSpinner';
import Navbar from '../Common/Navbar';

// ============================================================================
// UTILITY: Sanitize filename for Supabase
// ============================================================================
const sanitizeFileName = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
    .substring(0, 100);
};

// ============================================================================
// SUB-COMPONENT: GradeBreakdown
// Shows detailed breakdown of grades with progress bars and feedback
// ============================================================================
function GradeBreakdown({
  breakdown,
  feedback,
  showPhoto = false,
  photoUrl = null,
  compact = false,
}) {
  const getScoreColor = (score) => {
    if (score >= 85) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-blue-100 text-blue-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    if (score >= 50) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getProgressColor = (score) => {
    if (score >= 85) return 'bg-green-600';
    if (score >= 70) return 'bg-blue-600';
    if (score >= 60) return 'bg-yellow-600';
    if (score >= 50) return 'bg-orange-600';
    return 'bg-red-600';
  };

  const components = [
    {
      icon: '👕',
      label: 'Shirt',
      score: breakdown?.shirt || 0,
      feedback: feedback?.shirt || 'No feedback',
    },
    {
      icon: '👖',
      label: 'Pants',
      score: breakdown?.pant || 0,
      feedback: feedback?.pant || 'No feedback',
    },
    {
      icon: '👞',
      label: 'Shoes',
      score: breakdown?.shoes || 0,
      feedback: feedback?.shoes || 'No feedback',
    },
    {
      icon: '💇',
      label: 'Grooming',
      score: breakdown?.grooming || 0,
      feedback: feedback?.grooming || 'No feedback',
    },
    {
      icon: '✨',
      label: 'Cleanliness',
      score: breakdown?.cleanliness || 0,
      feedback: feedback?.cleanliness || 'No feedback',
    },
  ];

  if (compact) {
    return (
      <div className="space-y-2">
        {components.map((comp) => (
          <div key={comp.label} className="flex justify-between items-center">
            <span className="text-sm text-gray-700">{comp.icon} {comp.label}</span>
            <span className={`text-sm font-semibold px-2 py-1 rounded ${getScoreColor(comp.score)}`}>
              {comp.score}/100
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showPhoto && photoUrl && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Uniform Photo</h3>
          <img
            src={photoUrl}
            alt="Uniform"
            className="w-full max-h-96 object-cover rounded-lg"
          />
        </div>
      )}

      <div>
        <h3 className="font-semibold text-gray-800 mb-4">Score Breakdown</h3>
        <div className="space-y-4">
          {components.map((comp) => (
            <div key={comp.label} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-800">
                  {comp.icon} {comp.label}
                </span>
                <span className={`text-lg font-bold px-3 py-1 rounded-full ${getScoreColor(comp.score)}`}>
                  {comp.score}/100
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(comp.score)}`}
                  style={{ width: `${comp.score}%` }}
                />
              </div>

              <p className="text-sm text-gray-600">{comp.feedback}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: PhotoUpload
// Handles file upload, grading, and result display
// ============================================================================
export default function PhotoUpload() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const fileInputRef = useRef(null);

  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('upload');
  const [gradingResult, setGradingResult] = useState(null);
  const [imageQuality, setImageQuality] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ========================================================================
  // FILE HANDLING
  // ========================================================================

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile) => {
    setError('');
    setUploadProgress(0);

    const validation = validateImageFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setFile(selectedFile);
    setUploadProgress(20);

    try {
      const dataUrl = await fileToDataUrl(selectedFile);
      setPreview(dataUrl);
      setUploadProgress(40);

      const quality = await analyzeImageQuality(dataUrl);
      setImageQuality(quality);
      setUploadProgress(60);

      const fullBody = await isFullBodyPhoto(dataUrl);
      setUploadProgress(80);

      if (!fullBody.isFullBody && fullBody.confidence < 50) {
        setError(
          `⚠️ Warning: Photo may not show full body (${fullBody.confidence}% confidence). Grading may be less accurate.`
        );
      }

      setUploadProgress(100);
    } catch (err) {
      setError('Failed to process image');
      console.error(err);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  // ========================================================================
  // GRADING & UPLOAD - FIXED SYNTAX ERRORS
  // ========================================================================

  const handleUploadAndGrade = async () => {
    // ✅ FIX: Better validation and error messages
    if (!file) {
      setError('Please select a photo first');
      return;
    }

    // Check if user is authenticated
    if (!user?.id) {
      setError('You need to be logged in to upload photos. Please login again.');
      navigate('/login');
      return;
    }

    // Get the user ID
    const userId = user.id;
    console.log('Upload starting. User ID:', userId);
    console.log('User Data:', userData);

    setLoading(true);
    setError('');
    setStep('analyzing');

    try {
      setUploadProgress(10);

      // Step 1: Sanitize and upload photo to Supabase Storage
      const sanitizedName = sanitizeFileName(file.name);
      const timestamp = Date.now();
      const fileName = `${userId}/${timestamp}-${sanitizedName}`;
      
      console.log('Uploading to:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uniform-photos')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // FIX: Corrected template literal syntax
        throw new Error(`Failed to upload photo: ${uploadError.message}`);
      }

      console.log('Photo uploaded successfully');
      setUploadProgress(40);

      // Step 2: Get public URL
      const { data: urlData } = supabase.storage
        .from('uniform-photos')
        .getPublicUrl(fileName);

      const photoUrl = urlData.publicUrl;
      console.log('Photo URL:', photoUrl);
      setUploadProgress(50);

      // Step 3: Analyze uniform
      console.log('Analyzing uniform...');
      const gradingData = await analyzeUniform(preview);

      if (!gradingData) {
        throw new Error('Failed to analyze uniform. Please try again.');
      }

      console.log('Grading data:', gradingData);
      setUploadProgress(70);

      // Step 4: Save grade to database
      console.log('Saving to database...');
      const dbResult = await saveGradingResult(userId, gradingData, file);

      console.log('Save result:', dbResult);

      if (!dbResult.success) {
        throw new Error(dbResult.error || 'Failed to save grade to database');
      }

      setUploadProgress(90);

      // Step 5: Display result
      setGradingResult({
        ...gradingData,
        gradeId: dbResult.gradeId,
        photoUrl: photoUrl,
      });

      console.log('Upload and grading complete!');
      setUploadProgress(100);
      setStep('result');
    } catch (err) {
      console.error('Complete error:', err);
      setError(err.message || 'Failed to upload and grade photo');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================

  const getGradeColor = (grade) => {
    const colors = {
      A: 'text-green-600 bg-green-50 border-green-300',
      B: 'text-blue-600 bg-blue-50 border-blue-300',
      C: 'text-yellow-600 bg-yellow-50 border-yellow-300',
      D: 'text-orange-600 bg-orange-50 border-orange-300',
      F: 'text-red-600 bg-red-50 border-red-300',
    };
    return colors[grade] || 'text-gray-600 bg-gray-50 border-gray-300';
  };

  const getGradeMessage = (grade) => {
    const messages = {
      A: 'Excellent! Keep up the great work! 🎉',
      B: 'Very good! You can do even better.',
      C: 'Good effort. Keep improving! 💪',
      D: 'You need to improve your uniform standards.',
      F: 'Please correct your uniform and try again.',
    };
    return messages[grade] || 'Check your grade';
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  if (loading && step === 'analyzing') {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Upload Uniform Photo</h1>
        <p className="text-gray-600 mb-8">
          Take or upload a photo of your uniform to get instant grading
        </p>

        {/* Error Message */}
        {error && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              error.includes('Warning')
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <p className={error.includes('Warning') ? 'text-yellow-700' : 'text-red-700'}>
              {error}
            </p>
          </div>
        )}

        {/* ====== UPLOAD STEP ====== */}
        {step === 'upload' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Drag & Drop Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-indigo-300 rounded-lg p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition"
            >
              <div className="text-5xl mb-4">📸</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Click to upload or drag and drop
              </h3>
              <p className="text-gray-600 mb-4">PNG, JPG, GIF up to 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Preview & Analysis */}
            {preview && (
              <div className="mt-8">
                <h3 className="font-semibold text-gray-800 mb-4">Preview</h3>
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full max-h-96 object-cover rounded-lg mb-6"
                />

                {/* Image Quality Metrics */}
                {imageQuality && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-600">Brightness</p>
                      <p className="text-lg font-bold text-gray-800">{imageQuality.brightness}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-600">Contrast</p>
                      <p className="text-lg font-bold text-gray-800">{imageQuality.contrast}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-600">Saturation</p>
                      <p className="text-lg font-bold text-gray-800">{imageQuality.saturation}%</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs text-gray-600">Quality</p>
                      <p
                        className={`text-lg font-bold ${
                          imageQuality.qualityScore >= 75
                            ? 'text-green-600'
                            : imageQuality.qualityScore >= 50
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        {imageQuality.qualityLevel}
                      </p>
                    </div>
                  </div>
                )}

                {/* File Info */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-gray-700">
                    <strong>File:</strong> {file?.name}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Size:</strong> {formatFileSize(file?.size || 0)}
                  </p>
                  {imageQuality && (
                    <p className="text-sm text-gray-700">
                      <strong>Dimensions:</strong> {imageQuality.width} × {imageQuality.height}px
                    </p>
                  )}
                </div>

                {/* Progress Bar */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Processing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleUploadAndGrade}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition"
                  >
                    {loading ? 'Processing...' : '✓ Get Grade'}
                  </button>
                  <button
                    onClick={() => {
                      setPreview(null);
                      setFile(null);
                      setImageQuality(null);
                      setUploadProgress(0);
                    }}
                    className="flex-1 px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white font-medium rounded-lg transition"
                  >
                    Upload Different Photo
                  </button>
                </div>
              </div>
            )}

            {/* Guidelines */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3">📋 Photo Guidelines</h4>
              <ul className="text-blue-800 text-sm space-y-2">
                <li>✓ Take a full-body photo in good lighting</li>
                <li>✓ Make sure your entire uniform is visible</li>
                <li>✓ Face should be clearly visible</li>
                <li>✓ No filters or heavy editing</li>
                <li>✓ Use a plain background if possible</li>
                <li>✓ Ensure shoes are visible at the bottom</li>
              </ul>
            </div>
          </div>
        )}

        {/* ====== RESULT STEP ====== */}
        {step === 'result' && gradingResult && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Grade Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Grade</h2>
              <div className={`inline-block p-8 rounded-lg border-4 ${getGradeColor(gradingResult.grade)}`}>
                <div className="text-7xl font-bold">{gradingResult.grade}</div>
                <div className="text-3xl font-semibold mt-2">{gradingResult.score}/100</div>
                <p className="text-center mt-2">{getGradeMessage(gradingResult.grade)}</p>
              </div>
            </div>

            {/* Use GradeBreakdown Component */}
            <GradeBreakdown
              breakdown={gradingResult.breakdown}
              feedback={gradingResult.feedback}
              showPhoto={true}
              photoUrl={gradingResult.photoUrl}
              compact={false}
            />

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => {
                  setGradingResult(null);
                  setPreview(null);
                  setFile(null);
                  setStep('upload');
                  setUploadProgress(0);
                }}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
              >
                Upload Another Photo
              </button>
              <button
                onClick={() => navigate('/grade-history')}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition"
              >
                View All Grades
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
