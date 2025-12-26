// components/Student/PhotoUpload.jsx
// Upload uniform photo and get instant grading
// Integrates: imageProcessing, gradingLogic, gradingService

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/authService';
import { saveGradingResult } from '../../services/gradingService';
import { analyzeUniform } from '../../utils/gradingLogic';
import {
  validateImageFile,
  fileToDataUrl,
  isFullBodyPhoto,
  analyzeImageQuality,
  formatFileSize,
} from '../../utils/imageProcessing';
import LoadingSpinner from '../Common/LoadingSpinner';
import Navbar from '../Common/Navbar';

export default function PhotoUpload() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const fileInputRef = useRef(null);

  // State
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('upload'); // 'upload', 'analyzing', 'result'
  const [gradingResult, setGradingResult] = useState(null);
  const [imageQuality, setImageQuality] = useState(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  // Process selected file
  const processFile = async (selectedFile) => {
    setError('');

    // Step 1: Validate file
    const validation = validateImageFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setFile(selectedFile);

    // Step 2: Create preview
    try {
      const dataUrl = await fileToDataUrl(selectedFile);
      setPreview(dataUrl);

      // Step 3: Analyze image quality
      const quality = await analyzeImageQuality(dataUrl);
      setImageQuality(quality);

      // Step 4: Check if full-body photo
      const fullBody = await isFullBodyPhoto(dataUrl);
      if (!fullBody.isFullBody && fullBody.confidence < 50) {
        setError(
          `⚠️ Warning: Photo may not show full body (${fullBody.confidence}% confidence). Grading may be less accurate.`
        );
      }
    } catch (err) {
      setError('Failed to process image');
      console.error(err);
    }
  };

  // Handle drag and drop
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

  // Main grading function
  const handleUploadAndGrade = async () => {
    if (!file || !user || !userData) {
      setError('Missing required information');
      return;
    }

    setLoading(true);
    setError('');
    setStep('analyzing');

    try {
      // Step 1: Upload photo to Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uniform-photos')
        .upload(fileName, file);

      if (uploadError) throw new Error(uploadError.message);

      // Step 2: Get public URL
      const { data: urlData } = supabase.storage
        .from('uniform-photos')
        .getPublicUrl(fileName);

      const photoUrl = urlData.publicUrl;

      // Step 3: Analyze uniform using rule-based logic
      const gradingData = await analyzeUniform(preview);

      if (!gradingData) {
        throw new Error('Failed to analyze uniform');
      }

      // Step 4: Save grade to database
      const dbResult = await saveGradingResult(userData.id, gradingData, photoUrl);

      if (!dbResult.success) {
        throw new Error(dbResult.error);
      }

      // Step 5: Display result
      setGradingResult({
        ...gradingData,
        gradeId: dbResult.gradeId,
        photoUrl: photoUrl,
      });

      setStep('result');
    } catch (err) {
      setError(err.message || 'Failed to upload and grade');
      setStep('upload');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
          <div className={`mb-6 p-4 rounded-lg border ${
            error.includes('Warning')
              ? 'bg-yellow-50 border-yellow-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <p className={error.includes('Warning') ? 'text-yellow-700' : 'text-red-700'}>
              {error}
            </p>
          </div>
        )}

        {/* UPLOAD STEP */}
        {step === 'upload' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Drag and Drop Area */}
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

            {/* Preview and Quality Check */}
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
                      <p className={`text-lg font-bold ${
                        imageQuality.qualityScore >= 75 ? 'text-green-600' : 
                        imageQuality.qualityScore >= 50 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
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

        {/* RESULT STEP */}
        {step === 'result' && gradingResult && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            {/* Grade Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Grade</h2>
              <div className={`inline-block p-8 rounded-lg border-4 ${getGradeColor(gradingResult.grade)}`}>
                <div className="text-7xl font-bold">{gradingResult.grade}</div>
                <div className="text-3xl font-semibold mt-2">{gradingResult.score}/100</div>
              </div>
            </div>

            {/* Photo Preview */}
            <div className="mb-8">
              <img
                src={gradingResult.photoUrl}
                alt="Uploaded uniform"
                className="w-full max-h-96 object-cover rounded-lg"
              />
            </div>

            {/* Score Breakdown */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-800 mb-4 text-lg">Score Breakdown</h3>
              <div className="space-y-4">
                {/* Shirt */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">👕 Shirt</span>
                    <span className={`text-lg font-bold px-3 py-1 rounded-full ${getScoreColor(gradingResult.breakdown.shirt)}`}>
                      {gradingResult.breakdown.shirt}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full ${getProgressColor(gradingResult.breakdown.shirt)}`}
                      style={{ width: `${gradingResult.breakdown.shirt}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{gradingResult.feedback.shirt}</p>
                </div>

                {/* Pants */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">👖 Pants</span>
                    <span className={`text-lg font-bold px-3 py-1 rounded-full ${getScoreColor(gradingResult.breakdown.pant)}`}>
                      {gradingResult.breakdown.pant}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full ${getProgressColor(gradingResult.breakdown.pant)}`}
                      style={{ width: `${gradingResult.breakdown.pant}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{gradingResult.feedback.pant}</p>
                </div>

                {/* Shoes */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">👞 Shoes</span>
                    <span className={`text-lg font-bold px-3 py-1 rounded-full ${getScoreColor(gradingResult.breakdown.shoes)}`}>
                      {gradingResult.breakdown.shoes}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full ${getProgressColor(gradingResult.breakdown.shoes)}`}
                      style={{ width: `${gradingResult.breakdown.shoes}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{gradingResult.feedback.shoes}</p>
                </div>

                {/* Grooming */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">💇 Grooming</span>
                    <span className={`text-lg font-bold px-3 py-1 rounded-full ${getScoreColor(gradingResult.breakdown.grooming)}`}>
                      {gradingResult.breakdown.grooming}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full ${getProgressColor(gradingResult.breakdown.grooming)}`}
                      style={{ width: `${gradingResult.breakdown.grooming}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{gradingResult.feedback.grooming}</p>
                </div>

                {/* Cleanliness */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800">✨ Cleanliness</span>
                    <span className={`text-lg font-bold px-3 py-1 rounded-full ${getScoreColor(gradingResult.breakdown.cleanliness)}`}>
                      {gradingResult.breakdown.cleanliness}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full ${getProgressColor(gradingResult.breakdown.cleanliness)}`}
                      style={{ width: `${gradingResult.breakdown.cleanliness}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{gradingResult.feedback.cleanliness}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setGradingResult(null);
                  setPreview(null);
                  setFile(null);
                  setStep('upload');
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
